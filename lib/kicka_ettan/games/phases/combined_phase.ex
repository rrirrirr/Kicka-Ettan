defmodule KickaEttan.Games.Phases.CombinedPhase do
  @moduledoc """
  Combined Phase: Both players' stones are revealed and collision resolution occurs.
  Players view the result and can start the next round.
  
  Actions handled:
  - :ready_for_next_round - Player is ready to proceed to next round
  """
  @behaviour KickaEttan.Games.Phase

  require Logger

  # Stone dimensions for collision resolution
  @stone_radius 14.5
  @stone_diameter 29.0
  @sheet_width 475.0
  @hog_line_offset 640.0
  @back_line_offset 183.0
  @max_collision_iterations 20

  @impl true
  def init(game_state) do
    # Resolve collisions when entering combined phase (including ban zones)
    resolved_stones = resolve_stone_collisions(game_state.stones, game_state.banned_zones)

    # Track who is ready for next round
    player_ready =
      game_state.players
      |> Enum.map(fn p -> {p.id, false} end)
      |> Map.new()

    {:ok, %{player_ready: player_ready, resolved_stones: resolved_stones}}
  end

  @impl true
  def handles_actions do
    [:ready_for_next_round]
  end

  @impl true
  def handle_action(:ready_for_next_round, args, phase_state, game_state) do
    %{player_id: player_id} = args

    case find_player(game_state, player_id) do
      {:ok, _player} ->
        player_ready = Map.put(phase_state.player_ready, player_id, true)
        Logger.info("Player #{player_id} ready for next round")
        {:ok, %{phase_state | player_ready: player_ready}, game_state}

      error ->
        error
    end
  end

  @impl true
  def check_completion(phase_state, _game_state) do
    # Phase completes when at least one player clicks "next round"
    any_ready = Enum.any?(phase_state.player_ready, fn {_id, ready} -> ready end)

    if any_ready do
      {:complete, :start_next_round}
    else
      :continue
    end
  end

  @impl true
  def client_view(phase_state, game_state, _player_id) do
    base_view = Map.from_struct(game_state)

    # Show all stones (resolved positions)
    Map.merge(base_view, %{
      phase: :combined,
      stones: phase_state.resolved_stones,
      player_ready: phase_state.player_ready
    })
  end

  # Private helpers

  defp find_player(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      nil -> {:error, :player_not_found}
      player -> {:ok, player}
    end
  end

  defp resolve_stone_collisions(stones, banned_zones) do
    red_stones =
      stones.red
      |> Enum.with_index()
      |> Enum.map(fn {pos, idx} ->
        pos |> Map.put(:index, idx) |> Map.put(:color, :red)
      end)

    yellow_stones =
      stones.yellow
      |> Enum.with_index()
      |> Enum.map(fn {pos, idx} ->
        pos |> Map.put(:index, idx) |> Map.put(:color, :yellow)
      end)

    all_stones = red_stones ++ yellow_stones
    resolved = do_resolve_collisions(all_stones, banned_zones)

    # Split back into red and yellow
    {red, yellow} =
      Enum.reduce(resolved, {[], []}, fn stone, {red_acc, yellow_acc} ->
        pos = Map.take(stone, ["x", "y"])

        case stone.color do
          :red -> {red_acc ++ [pos], yellow_acc}
          :yellow -> {red_acc, yellow_acc ++ [pos]}
        end
      end)

    %{red: red, yellow: yellow}
  end

  defp do_resolve_collisions(stones, banned_zones) do
    # Use oscillation-aware iteration that tracks visited states
    resolve_with_oscillation_detection(stones, banned_zones, @max_collision_iterations, MapSet.new())
  end

  # Oscillation-aware collision resolution
  # Tracks visited position sets and detects when stones get stuck oscillating
  defp resolve_with_oscillation_detection(stones, banned_zones, 0, _visited) do
    # Max iterations reached - validate and reset stuck stones
    validate_and_reset_stuck_stones(stones, banned_zones)
  end

  defp resolve_with_oscillation_detection(stones, banned_zones, iterations_left, visited) do
    # Create a position signature for the current state
    current_signature = stones_position_signature(stones)

    # Check for oscillation (returning to a previously visited state)
    if MapSet.member?(visited, current_signature) do
      Logger.warning("Collision oscillation detected, resetting stuck stones")
      validate_and_reset_stuck_stones(stones, banned_zones)
    else
      # Apply one iteration of collision resolution
      new_stones = resolve_one_iteration(stones, banned_zones)

      # Check for convergence
      if new_stones == stones do
        # Converged - do final validation
        validate_and_reset_stuck_stones(new_stones, banned_zones)
      else
        # Continue with updated visited set
        new_visited = MapSet.put(visited, current_signature)
        resolve_with_oscillation_detection(new_stones, banned_zones, iterations_left - 1, new_visited)
      end
    end
  end

  # Create a position signature for the stone set (for oscillation detection)
  defp stones_position_signature(stones) do
    stones
    |> Enum.map(fn stone ->
      # Multiply by 1.0 to ensure float before rounding (handles integer inputs)
      x = (get_coord(stone, "x") * 1.0) |> Float.round(2)
      y = (get_coord(stone, "y") * 1.0) |> Float.round(2)
      {stone.index, stone.color, x, y}
    end)
    |> Enum.sort()
  end

  # Validate final positions and find valid positions for stuck stones
  defp validate_and_reset_stuck_stones(stones, banned_zones) do
    # Process stones one at a time, building up the list of already-placed stones
    # This ensures we don't place two stuck stones in the same position
    {resolved_stones, _} = 
      Enum.reduce(stones, {[], []}, fn stone, {resolved_acc, placed_acc} ->
        resolved_stone = 
          if is_stone_in_valid_position?(stone, banned_zones) and 
             not overlaps_any_stone?(stone, placed_acc) do
            stone
          else
            # Stone is stuck - try to find nearest valid position
            find_nearest_valid_position(stone, placed_acc, banned_zones)
          end
        
        {resolved_acc ++ [resolved_stone], placed_acc ++ [resolved_stone]}
      end)
    
    resolved_stones
  end

  # Check if a stone overlaps with any other stone in the list
  defp overlaps_any_stone?(stone, other_stones) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    
    Enum.any?(other_stones, fn other ->
      # Skip self comparison
      if other.index == stone.index and other.color == stone.color do
        false
      else
        other_x = get_coord(other, "x")
        other_y = get_coord(other, "y")
        dx = x - other_x
        dy = y - other_y
        distance = :math.sqrt(dx * dx + dy * dy)
        distance < @stone_diameter
      end
    end)
  end

  # Find the nearest valid position for a stuck stone using concentric search
  defp find_nearest_valid_position(stone, other_stones, banned_zones) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    
    # First, try the current position after clamping to boundaries
    clamped = clamp_to_boundaries(stone)
    clamped_x = get_coord(clamped, "x")
    clamped_y = get_coord(clamped, "y")
    
    if is_position_valid_for_stone?(clamped_x, clamped_y, stone, other_stones, banned_zones) do
      Logger.info("Stuck stone #{inspect(stone.color)} ##{stone.index} clamped to valid boundary position")
      clamped
    else
      # Try concentric search
      case search_concentric_rings(x, y, stone, other_stones, banned_zones) do
        {:found, new_x, new_y} ->
          Logger.info("Stuck stone #{inspect(stone.color)} ##{stone.index} moved to nearest valid position")
          Map.merge(stone, %{"x" => new_x, "y" => new_y})
        
        :not_found ->
          # Absolute fallback - reset to bar
          Logger.warning("Could not find valid position for stuck stone #{inspect(stone.color)} ##{stone.index}, resetting to bar")
          Map.merge(stone, %{"x" => -100.0, "y" => -100.0, :reset_to_bar => true})
      end
    end
  end

  # Search in expanding rings around the original position
  # Tries 16 directions at increasing distances
  defp search_concentric_rings(x, y, stone, other_stones, banned_zones) do
    # 16 directions (every 22.5 degrees)
    directions = for i <- 0..15 do
      angle = i * :math.pi() / 8
      {:math.cos(angle), :math.sin(angle)}
    end
    
    # Try at stone_diameter intervals up to 5 diameters away
    distances = [@stone_diameter, @stone_diameter * 2, @stone_diameter * 3, 
                 @stone_diameter * 4, @stone_diameter * 5]
    
    # Search in order: closest distance first, then try all directions
    Enum.find_value(distances, :not_found, fn distance ->
      Enum.find_value(directions, nil, fn {dx, dy} ->
        test_x = x + dx * distance
        test_y = y + dy * distance
        
        if is_position_valid_for_stone?(test_x, test_y, stone, other_stones, banned_zones) do
          {:found, test_x, test_y}
        else
          nil
        end
      end)
    end)
  end

  # Check if a position is valid for placing a stone
  # Must be: in bounds, not overlapping ban zone, not overlapping other stones
  defp is_position_valid_for_stone?(x, y, stone, other_stones, banned_zones) do
    color = stone.color
    ban_zone = Map.get(banned_zones || %{}, color)
    
    # Check bounds
    in_bounds = x >= @stone_radius and 
                x <= @sheet_width - @stone_radius and
                y >= @stone_radius and
                y <= @hog_line_offset + @back_line_offset + @stone_radius
    
    # Check ban zone
    not_in_ban = case ban_zone do
      nil -> true
      %{x: ban_x, y: ban_y, radius: ban_radius} ->
        dx = x - ban_x
        dy = y - ban_y
        distance = :math.sqrt(dx * dx + dy * dy)
        distance >= @stone_radius + ban_radius
      _ -> true
    end
    
    # Check other stones
    not_overlapping = not Enum.any?(other_stones, fn other ->
      # Skip self comparison
      if other.index == stone.index and other.color == stone.color do
        false
      else
        other_x = get_coord(other, "x")
        other_y = get_coord(other, "y")
        dx = x - other_x
        dy = y - other_y
        distance = :math.sqrt(dx * dx + dy * dy)
        distance < @stone_diameter
      end
    end)
    
    in_bounds and not_in_ban and not_overlapping
  end

  # Check if a stone is in a valid position (not overlapping ban zone, within bounds)
  defp is_stone_in_valid_position?(stone, banned_zones) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    color = stone.color
    ban_zone = Map.get(banned_zones || %{}, color)

    # Check bounds
    in_bounds = x >= @stone_radius and 
                x <= @sheet_width - @stone_radius and
                y >= @stone_radius and
                y <= @hog_line_offset + @back_line_offset + @stone_radius

    # Check ban zone
    not_in_ban = case ban_zone do
      nil -> true
      %{x: ban_x, y: ban_y, radius: ban_radius} ->
        dx = x - ban_x
        dy = y - ban_y
        distance = :math.sqrt(dx * dx + dy * dy)
        distance >= @stone_radius + ban_radius
      _ -> true
    end

    in_bounds and not_in_ban
  end

  defp resolve_one_iteration(stones, banned_zones) do
    separated = resolve_all_pairwise(stones)
    ban_adjusted = Enum.map(separated, &push_out_of_ban_zone(&1, banned_zones))
    Enum.map(ban_adjusted, &clamp_to_boundaries/1)
  end

  defp resolve_all_pairwise(stones) do
    stone_count = length(stones)

    Enum.reduce(0..(stone_count - 1), stones, fn i, acc ->
      stone1 = Enum.at(acc, i)

      Enum.reduce((i + 1)..(stone_count - 1)//1, acc, fn j, inner_acc ->
        stone2 = Enum.at(inner_acc, j)

        case calculate_overlap(stone1, stone2) do
          {:overlap, overlap, nx, ny} ->
            separate_stones(inner_acc, i, j, overlap, nx, ny)

          :no_overlap ->
            inner_acc
        end
      end)
    end)
  end

  defp calculate_overlap(stone1, stone2) do
    dx = get_coord(stone1, "x") - get_coord(stone2, "x")
    dy = get_coord(stone1, "y") - get_coord(stone2, "y")
    distance = :math.sqrt(dx * dx + dy * dy)

    if distance < @stone_diameter do
      distance = max(distance, 0.001)
      nx = dx / distance
      ny = dy / distance
      overlap = @stone_diameter - distance
      {:overlap, overlap, nx, ny}
    else
      :no_overlap
    end
  end

  defp separate_stones(stones, idx1, idx2, overlap, nx, ny) do
    stone1 = Enum.at(stones, idx1)
    stone2 = Enum.at(stones, idx2)
    move_dist = overlap / 2

    stone1_new = update_position(stone1, move_dist * nx, move_dist * ny)
    stone2_new = update_position(stone2, -move_dist * nx, -move_dist * ny)

    stones
    |> List.replace_at(idx1, stone1_new)
    |> List.replace_at(idx2, stone2_new)
  end

  # Push a stone out of its applicable ban zone if overlapping
  # Red stones are affected by red's banned zone, yellow by yellow's
  defp push_out_of_ban_zone(stone, banned_zones) do
    color = stone.color
    ban_zone = Map.get(banned_zones || %{}, color)
    
    case ban_zone do
      nil -> stone
      %{x: ban_x, y: ban_y, radius: ban_radius} ->
        x = get_coord(stone, "x")
        y = get_coord(stone, "y")
        dx = x - ban_x
        dy = y - ban_y
        distance = :math.sqrt(dx * dx + dy * dy)
        min_distance = @stone_radius + ban_radius
        
        if distance < min_distance and distance > 0 do
          # Push stone out to just touch the ban zone edge
          nx = dx / distance
          ny = dy / distance
          new_x = ban_x + nx * min_distance
          new_y = ban_y + ny * min_distance
          Map.merge(stone, %{"x" => new_x, "y" => new_y})
        else
          stone
        end
      _ -> stone
    end
  end

  defp clamp_to_boundaries(stone) do
    min_x = @stone_radius
    max_x = @sheet_width - @stone_radius
    min_y = @stone_radius
    max_y = @hog_line_offset + @back_line_offset + @stone_radius

    x = get_coord(stone, "x") |> max(min_x) |> min(max_x)
    y = get_coord(stone, "y") |> max(min_y) |> min(max_y)

    Map.merge(stone, %{"x" => x, "y" => y})
  end

  defp update_position(stone, dx, dy) do
    Map.merge(stone, %{
      "x" => get_coord(stone, "x") + dx,
      "y" => get_coord(stone, "y") + dy
    })
  end

  defp get_coord(stone, key) when is_binary(key) do
    stone[key] || stone[String.to_atom(key)] || 0
  end
end
