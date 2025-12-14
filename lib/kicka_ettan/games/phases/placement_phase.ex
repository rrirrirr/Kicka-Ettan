defmodule KickaEttan.Games.Phases.PlacementPhase do
  @moduledoc """
  A configurable phase for placing game objects (stones and bans).
  
  Can be configured for:
  - Simultaneous (Blind Pick) or Turn-based play
  - Open (visible) or Blind (hidden) placement
  - Mixed content (stones + bans) or single type
  - Locked/Unlocked states per item type
  
  Configuration options:
  - name: String (default "placement")
  - stones: integer | list | map (default 3)
  - bans: integer | list | map (default 0)
  - stones_locked: boolean (default false)
  - bans_locked: boolean (default false)
  - turn_based: false | true | integer (default false) - integer sets placements_per_turn
  - visible: boolean (default false)
  """
  @behaviour KickaEttan.Games.Phase
  require Logger
  
  alias KickaEttan.Games.GameState

  @derive Jason.Encoder
  defstruct [
    name: "placement",
    turn_based: false,
    visible: false,
    
    # State
    stones: %{},        # %{player_id => [positions or nil]}
    bans: %{},          # %{player_id => [positions or nil]}
    current_turn: nil,  # player_id
    turn_number: 0,     # Global turn counter (increments each time turn switches)
    
    # Configuration for this specific round instance
    stones_count: 3,
    bans_count: 0,
    stones_locked: false,
    bans_locked: false,
    
    # Tracking
    placements_remaining: %{}, # %{player_id => count}
    placements_per_turn: 1,    # How many placements before turn switches
    placements_this_turn: 0,   # Counter for current turn
    placed_turns: %{},         # %{player_id => %{stone: [turn_numbers], ban: [turn_numbers]}}
    is_complete: false
  ]

  @impl true
  def init(game_state, opts \\ []) do
    opts = Map.new(opts)
    round = game_state.current_round
    
    stones_count = resolve_per_round(opts[:stones] || 3, round)
    bans_count = resolve_per_round(opts[:bans] || 0, round)
    
    # turn_based can be:
    # - false: simultaneous play (no turns)
    # - true: turn-based with all placements per turn
    # - integer: turn-based with N placements per turn
    turn_based_opt = opts[:turn_based] || false
    Logger.debug("PlacementPhase init: turn_based_opt = #{inspect(turn_based_opt)} (type: #{inspect(is_integer(turn_based_opt))})")
    {is_turn_based, placements_per_turn} = case turn_based_opt do
      false -> {false, nil}
      true -> {true, stones_count + bans_count}  # All at once
      n when is_integer(n) and n > 0 -> {true, n}  # N placements per turn
      _ -> {false, nil}
    end
    Logger.debug("PlacementPhase init: is_turn_based = #{is_turn_based}, placements_per_turn = #{placements_per_turn}")
    
    initial_turn = if is_turn_based, do: get_starting_player(game_state), else: nil
    
    placements_remaining = Enum.map(game_state.players, fn p ->
      # In turn based, count total actions needed. In simultaneous, same.
      # Wait, bans might be optional? No, usually forced.
      {p.id, stones_count + bans_count} 
    end) |> Map.new()


    # Initialize stones/bans as lists of nils for indexed access
    # This allows updating specific indices (repositioning)
    stones = Enum.map(game_state.players, fn p -> 
      {p.id, List.duplicate(nil, stones_count)} 
    end) |> Map.new()

    bans = Enum.map(game_state.players, fn p -> 
      {p.id, List.duplicate(nil, bans_count)} 
    end) |> Map.new()

    # Initialize placed_turns tracking
    placed_turns = Enum.map(game_state.players, fn p ->
      {p.id, %{
        stones: List.duplicate(nil, stones_count),  # nil = not placed, number = turn it was placed
        bans: List.duplicate(nil, bans_count)
      }}
    end) |> Map.new()

    # Get first_player from phase transition (set by TurnOrderPhase) or fallback
    initial_turn = if is_turn_based do
      opts[:first_player] || get_starting_player(game_state)
    else
      nil
    end

    state = %__MODULE__{
      name: opts[:name] || "placement",
      stones_count: stones_count,
      bans_count: bans_count,
      stones_locked: opts[:stones_locked] || false,
      bans_locked: opts[:bans_locked] || (bans_count == 0),
      turn_based: is_turn_based,
      visible: opts[:visible] || false,
      current_turn: initial_turn,
      turn_number: 1,  # Start at turn 1
      placements_remaining: placements_remaining,
      placements_per_turn: placements_per_turn || 999,
      placements_this_turn: 0,
      placed_turns: placed_turns,
      stones: stones,
      bans: bans
    }
    
    {:ok, state}
  end

  @impl true
  def handle_action(action, params, phase_state, game_state) do
    case action do
      :place_stone -> place_stone(params, phase_state, game_state)
      :remove_stone -> remove_stone(params, phase_state, game_state)
      :place_ban -> place_ban(params, phase_state, game_state)
      :remove_ban -> remove_ban(params, phase_state, game_state)
      :confirm_placement -> confirm_placement(params, phase_state, game_state)
      :cancel_placement -> cancel_placement(params, phase_state, game_state)
      _ -> {:error, :unknown_action}
    end
  end

  def remove_stone(%{player_id: player_id, stone_index: idx}, state, game_state) do
    with :ok <- check_turn(state, player_id),
         :ok <- check_unlocked(state, :stones),
         :ok <- check_item_not_locked(state, player_id, :stones, idx) do
         
      current_stones = Map.get(state.stones, player_id)
      is_placed = Enum.at(current_stones, idx) != nil
      
      if !is_placed do
        # It was already nil, nothing to do
        {:ok, state, game_state}
      else
        # It was placed, so we are removing it.
        # We need to increment remaining count and decrement "this turn" counter if it was placed THIS turn?
        # This is tricky. If I placed it this turn, removing it should revert the counter.
        # If I placed it LAST turn, removing it means I have to place it again eventually.
        # So remaining increases.
        # Does "this turn" counter decrease? 
        # If I placed it this turn, yes. If last turn, no?
        
        # Simplified logic: If we remove a stone, we fundamentally undo a placement.
        # So we increment remaining.
        # And we SHOULD decrement "this turn" if it allows us to place again this turn.
        # Since "this turn" caps how many I can place.
        # If I remove one, I should be allowed to place one. So decrementing "this turn" makes sense.
        
        new_stones_list = List.replace_at(current_stones, idx, nil)
        new_stones = Map.put(state.stones, player_id, new_stones_list)
        
        # Also reset placed_turns for this index (Bug fix #2)
        player_placed = Map.get(state.placed_turns, player_id, %{stones: [], bans: []})
        updated_placed_stones = List.replace_at(player_placed.stones, idx, nil)
        new_placed_turns = Map.put(state.placed_turns, player_id, %{player_placed | stones: updated_placed_stones})
        
        new_state = %{state | stones: new_stones, placed_turns: new_placed_turns}
        |> increment_remaining(player_id)
        |> decrement_turn_counter()
        
        Logger.debug("PlacementPhase: Removed stone #{idx}. Remaining: #{new_state.placements_remaining[player_id]}")
        
        # Persist to game_state - use player COLOR as key
        player_color = get_player_color(game_state.players, player_id)
        new_game_stones = Map.put(game_state.stones, player_color, Enum.reject(new_stones_list, &is_nil/1))
        new_game_state = %{game_state | stones: new_game_stones}
        
        {:ok, new_state, new_game_state}
      end
    end
  end

  def place_stone(%{player_id: player_id, position: pos, stone_index: idx}, state, game_state) do
    with :ok <- check_turn(state, player_id),
         :ok <- check_unlocked(state, :stones),
         :ok <- validate_index(idx, state.stones_count),
         :ok <- check_item_not_locked(state, player_id, :stones, idx) do
         
      current_stones = Map.get(state.stones, player_id)
      is_new_placement = Enum.at(current_stones, idx) == nil
      
      new_stones_list = List.replace_at(current_stones, idx, pos)
      new_stones = Map.put(state.stones, player_id, new_stones_list)
      
      # Track which turn this was placed on (only if new placement)
      new_placed_turns = if is_new_placement do
        player_placed = Map.get(state.placed_turns, player_id, %{stones: [], bans: []})
        updated_stones = List.replace_at(player_placed.stones, idx, state.turn_number)
        Map.put(state.placed_turns, player_id, %{player_placed | stones: updated_stones})
      else
        state.placed_turns
      end
      
      new_state = %{state | stones: new_stones, placed_turns: new_placed_turns}
      |> maybe_decrement_remaining(player_id, is_new_placement)
      |> increment_turn_counter(is_new_placement)
      
      Logger.debug("PlacementPhase: Placed stone. is_new: #{is_new_placement}, placements_this_turn: #{new_state.placements_this_turn}, placements_per_turn: #{new_state.placements_per_turn}")
      
      # Persist to game_state (filtered) - use player COLOR as key, not player_id
      player_color = get_player_color(game_state.players, player_id)
      new_game_stones = Map.put(game_state.stones, player_color, Enum.reject(new_stones_list, &is_nil/1))
      new_game_state = %{game_state | stones: new_game_stones}
      
      {:ok, new_state, new_game_state} 
    end
  end

  def place_ban(%{player_id: player_id, position: pos, ban_index: idx}, state, game_state) do
    Logger.debug("PlacementPhase: place_ban called. Player: #{player_id}, Pos: #{inspect(pos)}, Index: #{idx}")
    with :ok <- check_turn(state, player_id),
         :ok <- check_unlocked(state, :bans),
         :ok <- validate_index(idx, state.bans_count),
         :ok <- check_item_not_locked(state, player_id, :bans, idx) do
         
      current_bans = Map.get(state.bans, player_id)
      is_new_placement = Enum.at(current_bans, idx) == nil
      
      new_bans_list = List.replace_at(current_bans, idx, pos)
      new_bans = Map.put(state.bans, player_id, new_bans_list)
      
      # Track which turn this was placed on (only if new placement)
      new_placed_turns = if is_new_placement do
        player_placed = Map.get(state.placed_turns, player_id, %{stones: [], bans: []})
        updated_bans = List.replace_at(player_placed.bans, idx, state.turn_number)
        Map.put(state.placed_turns, player_id, %{player_placed | bans: updated_bans})
      else
        state.placed_turns
      end
      
      new_state = %{state | bans: new_bans, placed_turns: new_placed_turns}
      |> maybe_decrement_remaining(player_id, is_new_placement)
      |> increment_turn_counter(is_new_placement)
      
      # Persist to game_state (filtered) - store under OPPONENT's color
      # The ban restricts the opponent, so if red places a ban, it restricts yellow
      # Therefore we store it under yellow's key
      ban_radius = game_state.settings[:ban_circle_radius] || 50
      player_color = get_player_color(game_state.players, player_id)
      opponent_color = if player_color == :red, do: :yellow, else: :red
      
      # Convert position list to maps with x, y, radius
      bans_with_radius = new_bans_list
        |> Enum.reject(&is_nil/1)
        |> Enum.map(fn ban_pos ->
          Map.merge(ban_pos, %{radius: ban_radius})
        end)
      
      current_game_bans = game_state.banned_zones || %{}
      # Store as nil, single, or list depending on count (Bug fix #3)
      new_ban_value = case bans_with_radius do
        [] -> nil         # No bans placed yet
        [single] -> single
        multiple -> multiple
      end
      # Store under OPPONENT's color - this ban restricts them
      new_game_bans = Map.put(current_game_bans, opponent_color, new_ban_value)
      new_game_state = %{game_state | banned_zones: new_game_bans}
      
      {:ok, new_state, new_game_state}
    end
  end

  def remove_ban(%{player_id: player_id, ban_index: idx}, state, game_state) do
    Logger.debug("PlacementPhase: remove_ban called. Player: #{player_id}, Index: #{idx}")
    with :ok <- check_turn(state, player_id),
         :ok <- check_unlocked(state, :bans),
         :ok <- validate_index(idx, state.bans_count),
         :ok <- check_item_not_locked(state, player_id, :bans, idx) do
         
      current_bans = Map.get(state.bans, player_id)
      is_placed = Enum.at(current_bans, idx) != nil
      
      if is_placed do
        # Remove ban from state
        new_bans_list = List.replace_at(current_bans, idx, nil)
        new_bans = Map.put(state.bans, player_id, new_bans_list)
        
        # Also reset placed_turns for this index (Bug fix #2)
        player_placed = Map.get(state.placed_turns, player_id, %{stones: [], bans: []})
        updated_placed_bans = List.replace_at(player_placed.bans, idx, nil)
        new_placed_turns = Map.put(state.placed_turns, player_id, %{player_placed | bans: updated_placed_bans})
        
        new_state = %{state | bans: new_bans, placed_turns: new_placed_turns}
        |> increment_remaining(player_id)
        |> decrement_turn_counter()
        
        Logger.debug("PlacementPhase: Removed ban #{idx}. Remaining: #{new_state.placements_remaining[player_id]}")
        
        # Rebuild banned_zones from remaining bans (Bug fix #1)
        player_color = get_player_color(game_state.players, player_id)
        opponent_color = if player_color == :red, do: :yellow, else: :red
        ban_radius = game_state.settings[:ban_circle_radius] || 50
        
        # Filter out nils and rebuild with radius
        remaining_bans = new_bans_list
          |> Enum.reject(&is_nil/1)
          |> Enum.map(fn ban_pos -> Map.merge(ban_pos, %{radius: ban_radius}) end)
        
        # Store as nil, single, or list depending on count
        current_game_bans = game_state.banned_zones || %{}
        new_ban_value = case remaining_bans do
          [] -> nil
          [single] -> single
          multiple -> multiple
        end
        
        new_game_bans = Map.put(current_game_bans, opponent_color, new_ban_value)
        new_game_state = %{game_state | banned_zones: new_game_bans}
        
        {:ok, new_state, new_game_state}
      else
        # Ban wasn't placed, nothing to do
        {:ok, state, game_state}
      end
    end
  end

  def confirm_placement(%{player_id: player_id}, state, game_state) do
    Logger.debug("PlacementPhase: confirm_placement called by #{player_id}. Turn based: #{state.turn_based}. Current turn: #{state.current_turn}")
    if state.turn_based do
      # Force switch turn when player confirms (even if they haven't used all placements)
      # First, check if it's actually their turn
      if state.current_turn == player_id do
        # Switch to next player and increment turn number
        # This makes all previously placed items locked
        players = game_state.players
        current_idx = Enum.find_index(players, fn p -> p.id == state.current_turn end)
        next_idx = rem(current_idx + 1, length(players))
        next_player = Enum.at(players, next_idx)
        
        new_state = %{state | 
          current_turn: next_player.id, 
          placements_this_turn: 0,
          turn_number: state.turn_number + 1  # Increment turn number - locks previous placements
        }
        {:ok, new_state, game_state}
      else
        {:error, :not_your_turn}
      end
    else
      # Simultaneous mode - just acknowledge
      {:ok, state, game_state}
    end
  end

  def cancel_placement(%{player_id: player_id}, state, game_state) do
    # This action usually implies "I am not ready".
    # Since readiness is handled by GameState, PlacementPhase just needs to say OK.
    # However, if we want to reset strict turn logic, we might need to do something?
    # In turn based, confirms switch turns. Cancelling readiness after confirm is usually blocked by UI.
    # So this is mostly for simultaneous or before confirm.
    {:ok, state, game_state}
  end

  @impl true
  def check_completion(state, _game_state) do
    all_done = Enum.all?(state.placements_remaining, fn {id, count} -> 
      Logger.debug("PlacementPhase check_completion: Player #{id} remaining: #{count}")
      count == 0 
    end)
    Logger.debug("PlacementPhase check_completion: all_done = #{all_done}")
    if all_done do
      {:complete, %{
        stones: state.stones,
        bans: state.bans
      }}
    else
      :continue
    end
  end

  @impl true
  def client_view(state, game_state, player_id) do
    base_view = Map.from_struct(game_state)
    
    # Transform stones from player_id keys to color keys (red/yellow)
    # Frontend expects gameState.stones.red and gameState.stones.yellow
    # NOTE: Use state.stones (phase state), not game_state.stones
    stones_by_color = transform_to_color_keys(state.stones, game_state.players)
    
    # banned_zones is already keyed by color (:red/:yellow) from place_ban
    # So we use it directly, ensuring it has the expected structure
    bans_by_color = game_state.banned_zones || %{red: nil, yellow: nil}
    
    Logger.debug("PlacementPhase client_view: banned_zones = #{inspect(bans_by_color)}")
    
    view = Map.merge(base_view, %{
      phase_type: "placement",
      name: state.name,
      stones_count: state.stones_count,
      bans_count: state.bans_count,
      stones_locked: state.stones_locked,
      bans_locked: state.bans_locked,
      turn_based: state.turn_based,
      current_turn_id: state.current_turn,
      turn_number: state.turn_number,  # For lock tracking
      placements_per_turn: state.placements_per_turn,
      placements_this_turn: state.placements_this_turn,
      
      # Override stones with color-keyed version
      stones: stones_by_color,
      banned_zones: bans_by_color,
      
      # Lock tracking for frontend - which turn each item was placed
      my_placed_turns: Map.get(state.placed_turns, player_id, %{stones: [], bans: []}),
      
      # Visible state (Legacy compatibility via my_placements if needed)
      my_placements: %{
        stones: Map.get(state.stones, player_id, []) |> Enum.reject(&is_nil/1),
        bans: Map.get(state.bans, player_id, []) |> Enum.reject(&is_nil/1)
      },
      opponent_placements: opponent_view(state, game_state, player_id)
    })
    
    # Handle visibility filtering
    if state.visible do
      view
    else
      # Hide opponent's stones/bans in the view
      my_color = get_player_color(game_state.players, player_id)
      opponent_color = if my_color == :red, do: :yellow, else: :red
      
      filtered_stones = Map.put(view.stones, opponent_color, [])
      filtered_bans = Map.put(view.banned_zones || %{}, opponent_color, [])
        
      view
      |> Map.put(:stones, filtered_stones)
      |> Map.put(:banned_zones, filtered_bans)
    end
  end
  
  defp transform_to_color_keys(data, players) when is_map(data) do
    Enum.reduce(players, %{red: [], yellow: []}, fn player, acc ->
      color = player.color
      values = Map.get(data, player.id, [])
      # Handle both list of positions and single position
      positions = if is_list(values), do: Enum.reject(values, &is_nil/1), else: [values]
      Map.put(acc, color, positions)
    end)
  end
  defp transform_to_color_keys(_, _), do: %{red: [], yellow: []}
  
  defp get_player_color(players, player_id) do
    player = Enum.find(players, fn p -> p.id == player_id end)
    if player, do: player.color, else: :red
  end
  
  @impl true
  def handles_actions, do: [:place_stone, :remove_stone, :place_ban, :remove_ban, :confirm_placement, :cancel_placement]

  # Helpers

  defp resolve_per_round(val, _) when is_integer(val), do: val
  defp resolve_per_round(list, round) when is_list(list) do
    Enum.at(list, round - 1, List.last(list))
  end
  defp resolve_per_round(%{base: b, increment: i}, round), do: b + (round - 1) * i

  defp get_starting_player(game_state) do
    case game_state.players do
      [] -> nil
      [first | _] -> first.id
    end
  end
  
  defp check_turn(%{turn_based: false}, _), do: :ok
  defp check_turn(%{turn_based: true, current_turn: turn}, player_id) do
    if turn == player_id, do: :ok, else: {:error, :not_your_turn}
  end

  defp check_unlocked(%{stones_locked: true}, :stones), do: {:error, :stones_locked}
  defp check_unlocked(%{bans_locked: true}, :bans), do: {:error, :bans_locked}
  defp check_unlocked(_, _), do: :ok

  defp maybe_decrement_remaining(state, _, false), do: state
  defp maybe_decrement_remaining(state, player_id, true) do
    new_rem = Map.update!(state.placements_remaining, player_id, &(&1 - 1))
    %{state | placements_remaining: new_rem}
  end

  defp increment_remaining(state, player_id) do
    new_rem = Map.update!(state.placements_remaining, player_id, &(&1 + 1))
    %{state | placements_remaining: new_rem}
  end

  defp validate_index(idx, max) when is_integer(idx) and idx >= 0 and idx < max, do: :ok
  defp validate_index(_, _), do: {:error, :invalid_index}

  defp maybe_switch_turn(%{turn_based: false} = state, _), do: state
  defp maybe_switch_turn(state, game_state) do
    # Only switch turn when placements_this_turn reaches placements_per_turn
    if state.placements_this_turn >= state.placements_per_turn do
      # Find next player
      players = game_state.players
      current_idx = Enum.find_index(players, fn p -> p.id == state.current_turn end)
      next_idx = rem(current_idx + 1, length(players))
      next_player = Enum.at(players, next_idx)
      
      %{state | current_turn: next_player.id, placements_this_turn: 0}
    else
      state
    end
  end
  
  defp increment_turn_counter(state, false), do: state
  defp increment_turn_counter(state, true) do
    %{state | placements_this_turn: state.placements_this_turn + 1}
  end

  defp decrement_turn_counter(state) do
    if state.placements_this_turn > 0 do
      %{state | placements_this_turn: state.placements_this_turn - 1}
    else
      state
    end
  end

  # Check if an item was placed in a PREVIOUS turn (and is therefore locked)
  # Items can only be edited in the same turn they were placed
  defp check_item_not_locked(state, player_id, item_type, idx) do
    player_placed = Map.get(state.placed_turns, player_id, %{stones: [], bans: []})
    placed_list = if item_type == :stones, do: player_placed.stones, else: player_placed.bans
    placed_turn = Enum.at(placed_list, idx)
    
    cond do
      placed_turn == nil ->
        # Item hasn't been placed yet, so it's not locked
        :ok
      placed_turn == state.turn_number ->
        # Item was placed this turn, so it can be edited
        :ok
      true ->
        # Item was placed in a previous turn, it's locked
        {:error, :item_locked}
    end
  end
  
  defp opponent_view(%{visible: true} = state, game_state, player_id) do
    # Find opponent ID
    opponent = Enum.find(game_state.players, fn p -> p.id != player_id end)
    
    if opponent do
      %{
        stones: Map.get(state.stones, opponent.id, []) |> Enum.reject(&is_nil/1),
        bans: Map.get(state.bans, opponent.id, []) |> Enum.reject(&is_nil/1)
      }
    else
      %{stones: [], bans: []}
    end
  end
  defp opponent_view(%{visible: false}, _, _), do: %{stones: [], bans: []}
end
