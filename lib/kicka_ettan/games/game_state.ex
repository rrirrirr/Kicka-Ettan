defmodule KickaEttan.Games.GameState do
  @moduledoc """
  Defines the structure and operations for the game state.
  """
  @derive Jason.Encoder
  require Logger
  defstruct [
    game_id: nil,
    players: [],
    current_round: 1,
    total_rounds: 3,
    stones_per_team: 3,
    stones: %{red: [], yellow: []},
    player_ready: %{},
    phase: :placement,
    ready_for_next_round: %{},
    history: [],
    team_colors: %{red: "#cc0000", yellow: "#185494"},
    created_at: nil
  ]

  # Sheet and stone dimensions (matching frontend constants.ts)
  @stone_radius 14.5      # cm - 29cm diameter / 2 (regulation curling stone)
  @stone_diameter 29.0    # cm - regulation curling stone diameter
  @sheet_width 475.0      # cm - sheet width
  @hog_line_offset 640.0  # cm - from tee line (top of playable area)
  @back_line_offset 183.0 # cm - from tee line (bottom of playable area)
  
  # Boundaries for stone centers (accounting for stone radius)
  @min_x @stone_radius
  @max_x @sheet_width - @stone_radius
  # In the frontend view, Y increases downward from hog line
  # minY corresponds to stone just below hog line, maxY to stone just above back line
  @min_y @stone_radius
  @max_y @hog_line_offset + @back_line_offset + @stone_radius
  
  # Max collision resolution iterations
  @max_collision_iterations 20

  @doc """
  Create a new game state with the given options.
  """
  def new(options) do
    team_colors = %{
      red: options[:team1_color] || "#cc0000",
      yellow: options[:team2_color] || "#185494"
    }

    %__MODULE__{
      game_id: options[:game_id] || generate_game_id(),
      total_rounds: options[:total_rounds] || 3,
      stones_per_team: options[:stones_per_team] || 3,
      team_colors: team_colors,
      created_at: DateTime.utc_now()
    }
  end

  @doc """
  Join the game. Handles reconnection and automatic color assignment.
  """
  def join_game(game_state, player_id, requested_color \\ nil) do
    # 1. Check if player is already in the game (Reconnection)
    if Enum.any?(game_state.players, fn p -> p.id == player_id end) do
      {:ok, game_state}
    else
      # 2. Check if game is full
      if length(game_state.players) >= 2 do
        {:error, :game_full}
      else
        # 3. Assign color
        taken_colors = Enum.map(game_state.players, & &1.color)
        
        # Determine color based on request and availability
        color = case requested_color do
          "red" -> if :red in taken_colors, do: :yellow, else: :red
          "yellow" -> if :yellow in taken_colors, do: :red, else: :yellow
          _ -> if :red in taken_colors, do: :yellow, else: :red
        end
        
        player = %{id: player_id, color: color}
        players = [player | game_state.players]
        player_ready = Map.put(game_state.player_ready, player_id, false)
        ready_for_next_round = Map.put(game_state.ready_for_next_round, player_id, false)
        
        {:ok, %{game_state | 
          players: players, 
          player_ready: player_ready,
          ready_for_next_round: ready_for_next_round
        }}
      end
    end
  end

  @doc """
  Place a stone at the specified position.
  """
  def place_stone(game_state, player_id, stone_index, position) do
    # Find player color
    with player when not is_nil(player) <- find_player(game_state, player_id),
         color <- player.color,
         true <- is_valid_stone_index?(stone_index, game_state.stones_per_team),
         true <- is_valid_position?(position) do
      
      # Update stone position
      stones = Map.update!(game_state.stones, color, fn stones ->
        # If the stone already exists in the list, update it
        # Otherwise, add a new stone
        current_stones = stones || []
        
        if stone_index < length(current_stones) do
          List.replace_at(current_stones, stone_index, position)
        else
          current_stones ++ [position]
        end
      end)
      
      {:ok, %{game_state | stones: stones}}
    else
      nil -> {:error, :player_not_found}
      false -> {:error, :invalid_placement}
    end
  end

  @doc """
  Mark a player as ready with their stone placement.
  """
  def confirm_placement(game_state, player_id) do
    with player when not is_nil(player) <- find_player(game_state, player_id),
         color <- player.color,
         true <- has_placed_all_stones?(game_state, color) do
      
      player_ready = Map.put(game_state.player_ready, player_id, true)
      new_state = %{game_state | player_ready: player_ready}
      
      Logger.debug("Player #{player_id} confirmed placement. Ready map: #{inspect(player_ready)}")

      # Check if all players have confirmed
      if all_players_ready?(new_state) do
        Logger.debug("All players ready! Transitioning to combined phase.")
        # Move to combined view - resolve collisions first
        {:ok, resolved_state} = resolve_collisions(new_state)
        {:ok, %{resolved_state | phase: :combined}}
      else
        Logger.debug("Waiting for other players. Ready: #{inspect(player_ready)}")
        {:ok, new_state}
      end
    else
      nil -> {:error, :player_not_found}
      false -> {:error, :not_all_stones_placed}
    end
  end

  @doc """
  Revoke confirmation of stone placement.
  """
  def cancel_placement(game_state, player_id) do
    if game_state.phase == :placement do
      with player when not is_nil(player) <- find_player(game_state, player_id) do
        player_ready = Map.put(game_state.player_ready, player_id, false)
        Logger.debug("Player #{player_id} canceled placement. Ready map: #{inspect(player_ready)}")
        {:ok, %{game_state | player_ready: player_ready}}
      else
        nil -> {:error, :player_not_found}
      end
    else
      {:error, :invalid_phase}
    end
  end

  @doc """
  Check if all players have confirmed their stone placements.
  """
  def all_players_ready?(game_state) do
    Enum.all?(game_state.player_ready, fn {_id, ready} -> ready end)
  end

  @doc """
  Resolve collisions between stones.
  """
  def resolve_collisions(game_state) do
    # Combine all stones
    red_stones = game_state.stones.red |> Enum.with_index() |> Enum.map(fn {pos, idx} -> Map.put(pos, :index, idx) |> Map.put(:color, :red) end)
    yellow_stones = game_state.stones.yellow |> Enum.with_index() |> Enum.map(fn {pos, idx} -> Map.put(pos, :index, idx) |> Map.put(:color, :yellow) end)
    all_stones = red_stones ++ yellow_stones
    
    # Resolve collisions
    resolved_stones = do_resolve_collisions(all_stones)
    
    # Split back into red and yellow
    {red, yellow} = Enum.reduce(resolved_stones, {[], []}, fn stone, {red_acc, yellow_acc} ->
      pos = Map.take(stone, ["x", "y"])
      case stone.color do
        :red -> {red_acc ++ [pos], yellow_acc}
        :yellow -> {red_acc, yellow_acc ++ [pos]}
      end
    end)
    
    # Update the game state
    stones = %{red: red, yellow: yellow}
    {:ok, %{game_state | stones: stones}}
  end

  @doc """
  Mark a player as ready for the next round.
  """
  def ready_for_next_round(game_state, player_id) do
    with player when not is_nil(player) <- find_player(game_state, player_id) do
      # Immediately start next round if we are in the combined phase
      # This prevents race conditions where both players click at the same time
      if game_state.phase == :combined do
        start_next_round(game_state)
      else
        {:ok, game_state}
      end
    else
      nil -> {:error, :player_not_found}
    end
  end

  @doc """
  Check if all players are ready for the next round.
  """
  def all_ready_for_next_round?(game_state) do
    Enum.all?(game_state.ready_for_next_round, fn {_id, ready} -> ready end)
  end

  @doc """
  Start the next round.
  """
  def start_next_round(game_state) do
    # Save current round to history
    history_item = %{
      round: game_state.current_round,
      stones: game_state.stones
    }
    history = [history_item | game_state.history]

    # Reset for next round
    player_ready = Map.new(game_state.player_ready, fn {id, _} -> {id, false} end)
    ready_for_next_round = Map.new(game_state.ready_for_next_round, fn {id, _} -> {id, false} end)
    stones = %{red: [], yellow: []}
    
    {:ok, %{game_state | 
      current_round: game_state.current_round + 1,
      phase: :placement,
      player_ready: player_ready,
      ready_for_next_round: ready_for_next_round,
      stones: stones,
      history: history
    }}
  end

  @doc """
  Create a view of the game state suitable for sending to clients.
  """
  def client_view(game_state, player_id \\ nil) do
    base_view = Map.from_struct(game_state)
    
    # Sanitize the view based on the game phase and player
    case game_state.phase do
      :placement when not is_nil(player_id) ->
        # During placement, only show the player's own stones
        player = find_player(game_state, player_id)
        if player do
          player_color = player.color
          opponent_color = if player_color == :red, do: :yellow, else: :red
          
          # Hide opponent stones
          stones = Map.put(base_view.stones, opponent_color, [])
          Map.put(base_view, :stones, stones)
        else
          base_view
        end
      
      _ ->
        # For other phases, show all stones
        base_view
    end
  end

  # Helper functions
  
  defp find_player(game_state, player_id) do
    Enum.find(game_state.players, fn p -> p.id == player_id end)
  end
  
  defp is_valid_stone_index?(index, max_stones) do
    index >= 0 and index < max_stones
  end
  
  defp is_valid_position?(%{"x" => x, "y" => y}) when is_number(x) and is_number(y) do
    # Validate position is within playable area (with some tolerance for edge cases)
    # Using slightly larger bounds than collision clamping to allow positions near edges
    x >= 0 and x <= @sheet_width and y >= 0 and y <= @max_y + @stone_radius
  end
  
  defp is_valid_position?(%{x: x, y: y}) when is_number(x) and is_number(y) do
    # Handle atom keys too (internal calls)
    x >= 0 and x <= @sheet_width and y >= 0 and y <= @max_y + @stone_radius
  end
  
  defp is_valid_position?(_), do: false
  
  defp has_placed_all_stones?(game_state, color) do
    placed_stones = game_state.stones[color] || []
    Logger.debug("Checking stones for #{color}: placed #{length(placed_stones)} / required #{game_state.stones_per_team}")
    length(placed_stones) >= game_state.stones_per_team
  end
  
  defp do_resolve_collisions(stones) do
    # Resolve stone-to-stone collisions using iterative relaxation.
    # Algorithm:
    # 1. For each pair of overlapping stones, push them apart along their center line
    # 2. Clamp all stones to sheet boundaries after each iteration
    # 3. Repeat until no overlaps remain or max iterations reached
    #
    # This converges for typical curling stone arrangements where overlaps
    # are minor. For pathological cases (many stones in same spot), some
    # overlap may remain after max iterations.
    
    fixed_point_iteration(stones, &resolve_one_iteration/1, @max_collision_iterations)
  end
  
  defp resolve_one_iteration(stones) do
    # Step 1: Resolve all pairwise collisions
    separated = resolve_all_collisions(stones)
    
    # Step 2: Clamp all stones to sheet boundaries
    Enum.map(separated, &clamp_to_boundaries/1)
  end
  
  defp resolve_all_collisions(stones) do
    # Find and resolve all pairwise collisions
    stone_count = length(stones)
    
    Enum.reduce(0..(stone_count - 1), stones, fn i, acc ->
      stone1 = Enum.at(acc, i)
      
      Enum.reduce((i + 1)..(stone_count - 1)//1, acc, fn j, inner_acc ->
        stone2 = Enum.at(inner_acc, j)
        
        case calculate_overlap(stone1, stone2) do
          {:overlap, overlap, nx, ny} ->
            # Push stones apart by half the overlap each, plus small buffer
            separate_overlapping_stones(inner_acc, i, j, overlap, nx, ny)
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
    
    # Stones overlap if distance < diameter
    if distance < @stone_diameter do
      # Avoid division by zero for perfectly overlapping stones
      distance = max(distance, 0.001)
      
      # Unit vector from stone2 to stone1
      nx = dx / distance
      ny = dy / distance
      
      overlap = @stone_diameter - distance
      {:overlap, overlap, nx, ny}
    else
      :no_overlap
    end
  end
  
  defp separate_overlapping_stones(stones, idx1, idx2, overlap, nx, ny) do
    stone1 = Enum.at(stones, idx1)
    stone2 = Enum.at(stones, idx2)
    
    # Move each stone by half the overlap (no buffer - stones will touch exactly)
    move_dist = overlap / 2
    
    # Stone1 moves in direction of normal (away from stone2)
    stone1_new = update_position(stone1, move_dist * nx, move_dist * ny)
    # Stone2 moves in opposite direction
    stone2_new = update_position(stone2, -move_dist * nx, -move_dist * ny)
    
    stones
    |> List.replace_at(idx1, stone1_new)
    |> List.replace_at(idx2, stone2_new)
  end
  
  defp clamp_to_boundaries(stone) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    
    clamped_x = x |> max(@min_x) |> min(@max_x)
    clamped_y = y |> max(@min_y) |> min(@max_y)
    
    Map.merge(stone, %{"x" => clamped_x, "y" => clamped_y})
  end
  
  defp update_position(stone, dx, dy) do
    Map.merge(stone, %{
      "x" => get_coord(stone, "x") + dx,
      "y" => get_coord(stone, "y") + dy
    })
  end
  
  # Helper to get coordinate regardless of string or atom key
  defp get_coord(stone, key) when is_binary(key) do
    stone[key] || stone[String.to_atom(key)] || 0
  end
  
  defp fixed_point_iteration(value, _fun, 0), do: value
  defp fixed_point_iteration(value, fun, max_iterations) do
    new_value = fun.(value)
    if new_value == value do
      new_value
    else
      fixed_point_iteration(new_value, fun, max_iterations - 1)
    end
  end

  defp generate_game_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false) |> binary_part(0, 8)
  end
end
