defmodule KickaEttan.Games.GameState do
  @moduledoc """
  Defines the structure and operations for the game state.
  """
  @derive Jason.Encoder
  defstruct [
    game_id: nil,
    players: [],
    current_round: 1,
    total_rounds: 3,
    stones_per_team: 5,
    stones: %{red: [], yellow: []},
    player_ready: %{},
    phase: :placement,
    ready_for_next_round: %{},
    history: [],
    team_colors: %{red: "#cc0000", yellow: "#e6b800"}
  ]

  @doc """
  Create a new game state with the given options.
  """
  def new(options) do
    team_colors = %{
      red: options[:team1_color] || "#cc0000",
      yellow: options[:team2_color] || "#e6b800"
    }
    
    %__MODULE__{
      game_id: options[:game_id] || generate_game_id(),
      total_rounds: options[:total_rounds] || 3,
      stones_per_team: options[:stones_per_team] || 5,
      team_colors: team_colors
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
      
      require Logger
      Logger.info("Player #{player_id} confirmed placement. Ready map: #{inspect(player_ready)}")

      # Check if all players have confirmed
      if all_players_ready?(new_state) do
        Logger.info("All players ready! Transitioning to combined phase.")
        # Move to combined view - resolve collisions first
        {:ok, resolved_state} = resolve_collisions(new_state)
        {:ok, %{resolved_state | phase: :combined}}
      else
        Logger.info("Waiting for other players. Ready: #{inspect(player_ready)}")
        {:ok, new_state}
      end
    else
      nil -> {:error, :player_not_found}
      false -> {:error, :not_all_stones_placed}
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
    # Add any additional position validation logic here
    # e.g., must be within the playing field boundaries
    # Sheet width is 475, total view height is approx 852. Using safe bounds.
    x >= 0 and x <= 500 and y >= 0 and y <= 1000
  end
  
  defp is_valid_position?(%{x: x, y: y}) when is_number(x) and is_number(y) do
    # Handle atom keys too (internal calls)
    x >= 0 and x <= 500 and y >= 0 and y <= 1000
  end
  
  defp is_valid_position?(_), do: false
  
  defp has_placed_all_stones?(game_state, color) do
    placed_stones = game_state.stones[color] || []
    require Logger
    Logger.info("Checking stones for #{color}: placed #{length(placed_stones)} / required #{game_state.stones_per_team}")
    length(placed_stones) >= game_state.stones_per_team
  end
  
  defp do_resolve_collisions(stones) do
    # This is a placeholder for a more sophisticated collision resolution algorithm
    # For now, we'll just make a small adjustment to overlapping stones
    
    # Detect and fix collisions repeatedly until no more are found
    fixed_point_iteration(stones, &resolve_one_iteration/1, 10)
  end
  
  defp resolve_one_iteration(stones) do
    # Find and resolve all pairwise collisions
    Enum.reduce(0..(length(stones) - 1), stones, fn i, acc ->
      stone1 = Enum.at(acc, i)
      
      Enum.reduce(0..(length(acc) - 1), acc, fn j, inner_acc ->
        if i != j do
          stone2 = Enum.at(inner_acc, j)
          
          if stones_overlap?(stone1, stone2) do
            # Move stones apart slightly
            separate_stones(inner_acc, i, j)
          else
            inner_acc
          end
        else
          inner_acc
        end
      end)
    end)
  end
  
  defp stones_overlap?(stone1, stone2) do
    # Stone radius (14.5cm to match frontend)
    radius = 14.5
    
    # Calculate distance between stone centers
    dx = stone1["x"] - stone2["x"]
    dy = stone1["y"] - stone2["y"]
    distance = :math.sqrt(dx * dx + dy * dy)
    
    # Stones overlap if distance is less than twice the radius
    distance < 2 * radius
  end
  
  defp separate_stones(stones, idx1, idx2) do
    stone1 = Enum.at(stones, idx1)
    stone2 = Enum.at(stones, idx2)
    
    # Calculate vector between stones
    dx = stone1["x"] - stone2["x"]
    dy = stone1["y"] - stone2["y"]
    
    # Normalize the vector (make it length 1)
    distance = max(:math.sqrt(dx * dx + dy * dy), 0.001)
    nx = dx / distance
    ny = dy / distance
    
    # Move stones apart by half the overlap
    radius = 14.5
    overlap = 2 * radius - distance
    move_dist = overlap / 2 + 1  # Add a bit extra to prevent immediate re-collision
    
    # Update positions
    stone1_new = Map.merge(stone1, %{"x" => stone1["x"] + nx * move_dist, "y" => stone1["y"] + ny * move_dist})
    stone2_new = Map.merge(stone2, %{"x" => stone2["x"] - nx * move_dist, "y" => stone2["y"] - ny * move_dist})
    
    # Replace in list
    stones
    |> List.replace_at(idx1, stone1_new)
    |> List.replace_at(idx2, stone2_new)
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
