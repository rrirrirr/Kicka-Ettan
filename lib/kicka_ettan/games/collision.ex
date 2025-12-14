defmodule KickaEttan.Games.Collision do
  @moduledoc """
  Handles collision resolution logic for the game.
  """

  @stone_radius 14.5
  @stone_diameter 29.0
  @sheet_width 475.0
  @hog_line_offset 640.0
  @back_line_offset 183.0
  @max_collision_iterations 20

  @doc """
  Resolves collisions for all stones on the sheet, respecting banned zones and boundaries.
  
  ## Parameters
  - stones: Map with :red and :yellow keys, each containing a list of stone positions (maps with "x" and "y")
  - banned_zones: Map with :red and :yellow keys, each defining a ban zone (map with x, y, radius) OR list of zones
  
  ## Returns
  - A map with :red and :yellow keys containing resolved stone positions
  """
  def resolve_stone_collisions(stones, banned_zones) do
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
    
    {red, yellow} =
      Enum.reduce(resolved, {[], []}, fn stone, {red_acc, yellow_acc} ->
        stone_data = Map.delete(stone, :index) |> Map.delete(:color)
        
        case stone.color do
          :red -> {red_acc ++ [stone_data], yellow_acc}
          :yellow -> {red_acc, yellow_acc ++ [stone_data]}
        end
      end)
      
    %{red: red, yellow: yellow}
  end

  defp do_resolve_collisions(stones, banned_zones) do
    # Use oscillation-aware iteration that tracks visited states
    resolve_with_oscillation_detection(stones, banned_zones, @max_collision_iterations, MapSet.new())
  end

  defp resolve_with_oscillation_detection(stones, banned_zones, 0, _visited) do
    # Max iterations reached - validate and reset stuck stones
    validate_and_reset_stuck_stones(stones, banned_zones)
  end

  defp resolve_with_oscillation_detection(stones, banned_zones, iterations_left, visited) do
    # Create a position signature for the current state
    current_signature = stones_position_signature(stones)

    if MapSet.member?(visited, current_signature) do
      # Detected a loop or repeated state - stop oscillating and force valid positions
      validate_and_reset_stuck_stones(stones, banned_zones)
    else
      new_stones = resolve_one_iteration(stones, banned_zones)

      if new_stones == stones do
        # Stable state reached
        validate_and_reset_stuck_stones(new_stones, banned_zones)
      else
        new_visited = MapSet.put(visited, current_signature)
        resolve_with_oscillation_detection(new_stones, banned_zones, iterations_left - 1, new_visited)
      end
    end
  end

  defp stones_position_signature(stones) do
    stones
    |> Enum.map(fn stone ->
      x = (get_coord(stone, "x") * 1.0) |> Float.round(2)
      y = (get_coord(stone, "y") * 1.0) |> Float.round(2)
      {stone.index, stone.color, x, y}
    end)
    |> Enum.sort()
  end

  # Validate final positions and find valid positions for stuck stones
  defp validate_and_reset_stuck_stones(stones, banned_zones) do
    # Process stones one at a time, building up the list of already-placed stones
    # so that we don't place a stuck stone on top of another logic-resolved stone.
    {resolved_stones, _} = 
      Enum.reduce(stones, {[], []}, fn stone, {resolved_acc, placed_acc} ->
        resolved_stone = 
          if is_stone_in_valid_position?(stone, banned_zones) and 
             not overlaps_any_stone?(stone, placed_acc) do
            stone
          else
            # Stone ended up invalid - try to find nearest valid spot
            find_nearest_valid_position(stone, placed_acc, banned_zones)
          end
        
        {resolved_acc ++ [resolved_stone], placed_acc ++ [resolved_stone]}
      end)
    
    resolved_stones
  end

  defp overlaps_any_stone?(stone, other_stones) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    
    Enum.any?(other_stones, fn other ->
      if other.index == stone.index and other.color == stone.color do
        false # Don't check against self
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
    
    # 1. Try clamping to boundaries first (simplest fix)
    clamped = clamp_to_boundaries(stone)
    clamped_x = get_coord(clamped, "x")
    clamped_y = get_coord(clamped, "y")
    
    if is_position_valid_for_stone?(clamped_x, clamped_y, stone, other_stones, banned_zones) do
      clamped
    else
      # 2. Search in expanding concentric rings
      case search_concentric_rings(x, y, stone, other_stones, banned_zones) do
        {:found, new_x, new_y} ->
          Map.merge(stone, %{"x" => new_x, "y" => new_y})
        
        :not_found ->
          # If absolutely no Valid position found, reset to bar
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
    
    # Expanding search radius: finer grained steps to avoid large jumps
    # Start small (2px) to resolve minor overlaps, then expand to diameters
    distances = [2.0, 5.0, 10.0, 15.0, 20.0, @stone_diameter, 
                 @stone_diameter * 1.5, @stone_diameter * 2, 
                 @stone_diameter * 3, @stone_diameter * 4, @stone_diameter * 5]
    
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
    zones = get_applicable_zones(banned_zones, color)
    
    # Check bounds
    in_bounds = x >= @stone_radius and 
                x <= @sheet_width - @stone_radius and
                y >= @stone_radius and
                y <= @hog_line_offset + @back_line_offset + @stone_radius
    
    # Check ban zone (list compatible)
    not_in_ban = not Enum.any?(zones, fn zone ->
      case zone do
        %{x: ban_x, y: ban_y, radius: ban_radius} ->
          dx = x - ban_x
          dy = y - ban_y
          distance = :math.sqrt(dx * dx + dy * dy)
          distance < @stone_radius + ban_radius
        _ -> false
      end
    end)
    
    # Check overlaps with other ALREADY PLACED/VALIDATED stones
    not_overlapping = not Enum.any?(other_stones, fn other ->
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
  # This doesn't check against other stones because it's used during the iterative phase or initial check
  defp is_stone_in_valid_position?(stone, banned_zones) do
    x = get_coord(stone, "x")
    y = get_coord(stone, "y")
    color = stone.color
    zones = get_applicable_zones(banned_zones, color)

    # Check bounds
    in_bounds = x >= @stone_radius and 
                x <= @sheet_width - @stone_radius and
                y >= @stone_radius and
                y <= @hog_line_offset + @back_line_offset + @stone_radius

    # Check ban zone (list compatible)
    not_in_ban = not Enum.any?(zones, fn zone ->
      case zone do
        %{x: ban_x, y: ban_y, radius: ban_radius} ->
          dx = x - ban_x
          dy = y - ban_y
          distance = :math.sqrt(dx * dx + dy * dy)
          distance < @stone_radius + ban_radius
        _ -> false
      end
    end)

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
      # If perfectly overlapping, push apart in arbitrary direction (x-axis)
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
    # Move each stone half the overlap distance
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
    zones = get_applicable_zones(banned_zones, color)
    
    Enum.reduce(zones, stone, fn zone, current_stone ->
      case zone do
        %{x: ban_x, y: ban_y, radius: ban_radius} ->
          x = get_coord(current_stone, "x")
          y = get_coord(current_stone, "y")
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
            Map.merge(current_stone, %{"x" => new_x, "y" => new_y})
          else
            current_stone
          end
        _ -> current_stone
      end
    end)
  end

  defp clamp_to_boundaries(stone) do
    min_x = @stone_radius
    max_x = @sheet_width - @stone_radius
    min_y = @stone_radius
    # Max Y is View bottom (Back Line + offset)
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

  defp get_applicable_zones(banned_zones, color) do
    case Map.get(banned_zones || %{}, color) do
      nil -> []
      map when is_map(map) -> [map]
      list when is_list(list) -> list
      _ -> []
    end
  end
end
