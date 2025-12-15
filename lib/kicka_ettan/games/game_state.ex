defmodule KickaEttan.Games.GameState do
  @moduledoc """
  Game State Engine
  
  Manages game state and delegates actions to the current phase.
  Handles phase transitions based on the game type's phase flow.
  """
  @derive Jason.Encoder
  require Logger

  alias KickaEttan.Games.GameType
  alias KickaEttan.Games.Types.BlindPick

  defstruct [
    # Core identity
    game_id: nil,
    players: [],
    created_at: nil,

    # Game type configuration
    game_type_module: BlindPick,
    settings: %{},

    # Phase engine state
    current_phase_module: nil,
    current_phase_args: [],
    current_phase_index: 0,
    phase_state: %{},

    # Round tracking
    current_round: 1,
    total_rounds: 3,

    # Shared game data
    stones_per_team: 3,
    stones: %{red: [], yellow: []},
    team_colors: %{red: "#cc0000", yellow: "#185494"},
    history: [],

    # Ban phase data - zones where opponent cannot place stones
    # Each entry is %{x, y, radius} or nil
    banned_zones: %{red: nil, yellow: nil},

    # Legacy fields for backwards compatibility with frontend
    player_ready: %{},
    ready_for_next_round: %{},
    phase: :placement
  ]

  @doc """
  Create a new game state with the given options.
  """
  def new(options) do
    # Determine game type
    game_type_module =
      case options[:game_type] do
        nil ->
          BlindPick

        type_id when is_atom(type_id) ->
          case GameType.get_type(type_id) do
            nil ->
              if Code.ensure_loaded?(type_id), do: type_id, else: BlindPick

            type ->
              type
          end

        type_id when is_binary(type_id) ->
          GameType.get_type(type_id) || BlindPick
      end

    # Get definition and apply settings
    definition = game_type_module.definition()
    
    # Priority: direct options > settings > defaults
    user_settings = options[:settings] || %{}
    merged_settings = Map.merge(user_settings, %{
      total_rounds: options[:total_rounds],
      stones_per_team: options[:stones_per_team],
      ban_circle_radius: options[:ban_circle_radius]
    }) |> Enum.reject(fn {_k, v} -> is_nil(v) end) |> Map.new()
    
    {:ok, settings} = game_type_module.apply_settings(merged_settings)

    team_colors = %{
      red: options[:team1_color] || "#cc0000",
      yellow: options[:team2_color] || "#185494"
    }

    # Get first phase
    [first_phase | _] = definition.phases
    {first_phase_module, first_phase_args} = normalize_phase(first_phase)

    game_state = %__MODULE__{
      game_id: options[:game_id] || generate_game_id(),
      game_type_module: game_type_module,
      settings: settings,
      total_rounds: settings[:total_rounds] || 3,
      stones_per_team: settings[:stones_per_team] || 3,
      team_colors: team_colors,
      current_phase_module: first_phase_module,
      current_phase_args: first_phase_args,
      current_phase_index: 0,
      created_at: DateTime.utc_now()
    }

    # Initialize first phase
    {:ok, phase_state} = first_phase_module.init(game_state, first_phase_args)

    %{game_state | phase_state: phase_state, phase: phase_to_legacy_atom(first_phase_module)}
  end

  @doc """
  Join the game. Handles reconnection and automatic color assignment.
  """
  def join_game(game_state, player_id, requested_color \\ nil) do
    if Enum.any?(game_state.players, fn p -> p.id == player_id end) do
      {:ok, game_state}
    else
      if length(game_state.players) >= 2 do
        {:error, :game_full}
      else
        taken_colors = Enum.map(game_state.players, & &1.color)

        color =
          case requested_color do
            "red" -> if :red in taken_colors, do: :yellow, else: :red
            "yellow" -> if :yellow in taken_colors, do: :red, else: :yellow
            _ -> if :red in taken_colors, do: :yellow, else: :red
          end

        player = %{id: player_id, color: color}
        players = [player | game_state.players]
        player_ready = Map.put(game_state.player_ready, player_id, false)
        ready_for_next_round = Map.put(game_state.ready_for_next_round, player_id, false)

        # Re-initialize phase state with new player
        require Logger
        Logger.debug("join_game: Re-initializing phase with args: #{inspect(game_state.current_phase_args)}")
        {:ok, phase_state} = game_state.current_phase_module.init(%{game_state | players: players}, game_state.current_phase_args)

        {:ok,
         %{
           game_state
           | players: players,
             player_ready: player_ready,
             ready_for_next_round: ready_for_next_round,
             phase_state: phase_state
         }}
      end
    end
  end

  @doc """
  Place a stone at the specified position.
  Delegates to current phase.
  """
  def place_stone(game_state, player_id, stone_index, position) do
    handle_phase_action(game_state, :place_stone, %{
      player_id: player_id,
      stone_index: stone_index,
      position: position
    })
  end

  @doc """
  Vote for who should start first in turn-based placement.
  Delegates to current phase.
  """
  def vote_first_player(game_state, player_id, vote_for_id) do
    result = handle_phase_action(game_state, :vote_first_player, %{
      player_id: player_id,
      vote_for: vote_for_id
    })
    
    case result do
      {:ok, new_state} ->
        # Check for phase transition (when both players agree)
        maybe_transition_phase(new_state)
      error ->
        error
    end
  end

  @doc """
  Remove a stone from the sheet (return to bar).
  Delegates to current phase.
  """
  def remove_stone(game_state, player_id, stone_index) do
    handle_phase_action(game_state, :remove_stone, %{
      player_id: player_id,
      stone_index: stone_index
    })
  end

  @doc """
  Remove a ban zone from the sheet (return to bar).
  Delegates to current phase.
  """
  def remove_ban(game_state, player_id, ban_index) do
    handle_phase_action(game_state, :remove_ban, %{
      player_id: player_id,
      ban_index: ban_index
    })
  end

  @doc """
  Confirm stone placement.
  Delegates to current phase.
  """
  def confirm_placement(game_state, player_id) do
    result = handle_phase_action(game_state, :confirm_placement, %{player_id: player_id})

    case result do
      {:ok, new_state} ->
        # Update legacy player_ready for backwards compatibility
        should_set_ready = should_mark_ready?(new_state, player_id)

        new_player_ready =
          if should_set_ready do
            Map.put(new_state.player_ready, player_id, true)
          else
            new_state.player_ready
          end

        new_state = %{new_state | player_ready: new_player_ready}

        # Check for phase transition
        maybe_transition_phase(new_state)

      error ->
        error
    end
  end

  @doc """
  Cancel stone placement confirmation.
  """
  def cancel_placement(game_state, player_id) do
    with player when not is_nil(player) <- find_player(game_state, player_id) do
      if game_state.phase == :placement do
        result = handle_phase_action(game_state, :cancel_placement, %{player_id: player_id})

        case result do
          {:ok, new_state} ->
            new_player_ready = Map.put(new_state.player_ready, player_id, false)
            {:ok, %{new_state | player_ready: new_player_ready}}

          error ->
            error
        end
      else
        {:error, :invalid_phase}
      end
    else
      nil -> {:error, :player_not_found}
    end
  end

  @doc """
  Check if all players have confirmed their stone placements.
  """
  def all_players_ready?(game_state) do
    Enum.all?(game_state.player_ready, fn {_id, ready} -> ready end)
  end

  def ready_for_next_round(game_state, player_id) do
    with player when not is_nil(player) <- find_player(game_state, player_id) do
      cond do
        game_state.phase == :combined ->
          # Player is clicking "Next Round" from combined phase
          # Update ready_for_next_round and trigger phase transition
          updated_ready = Map.put(game_state.ready_for_next_round, player_id, true)
          game_state = %{game_state | ready_for_next_round: updated_ready}
          
          result = handle_phase_action(game_state, :ready_for_next_round, %{player_id: player_id})

          case result do
            {:ok, new_state} ->
              maybe_transition_phase(new_state)

            error ->
              error
          end

        game_state.phase in [:ban, :placement] ->
          # Server has already moved to next round, but this player was still viewing combined.
          # Just mark them as "started" so they see the current phase.
          updated_ready = Map.put(game_state.ready_for_next_round, player_id, true)
          {:ok, %{game_state | ready_for_next_round: updated_ready}}

        true ->
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
  Resolve collisions between stones.
  This delegates to the CombinedPhase logic.
  """
  def resolve_collisions(game_state) do
    alias KickaEttan.Games.Phases.CombinedPhase
    {:ok, phase_state} = CombinedPhase.init(game_state)
    {:ok, %{game_state | stones: phase_state.resolved_stones}}
  end

  @doc """
  Place a ban zone at the specified position.
  Delegates to the current phase if it handles :place_ban.
  """
  def place_ban(game_state, player_id, ban_index, position) do
    result = handle_phase_action(game_state, :place_ban, %{
      player_id: player_id,
      ban_index: ban_index,
      position: position
    })
    
    case result do
      {:ok, new_state} ->
        maybe_transition_phase(new_state)
        
      error ->
        error
    end
  end

  @doc """
  Confirm ban zone placement.
  Delegates to the current phase if it handles :confirm_ban.
  """
  def confirm_ban(game_state, player_id) do
    result = handle_phase_action(game_state, :confirm_ban, %{player_id: player_id})

    case result do
      {:ok, new_state} ->
        # Update legacy player_ready for backwards compatibility
        new_player_ready = Map.put(new_state.player_ready, player_id, true)
        new_state = %{new_state | player_ready: new_player_ready}
        maybe_transition_phase(new_state)

      error ->
        error
    end
  end

  @doc """
  Cancel ban zone confirmation.
  Delegates to the current phase if it handles :cancel_ban.
  """
  def cancel_ban(game_state, player_id) do
    result = handle_phase_action(game_state, :cancel_ban, %{player_id: player_id})

    case result do
      {:ok, new_state} ->
        new_player_ready = Map.put(new_state.player_ready, player_id, false)
        {:ok, %{new_state | player_ready: new_player_ready}}

      error ->
        error
    end
  end

  @doc """
  Create a view of the game state suitable for sending to clients.
  Handles per-player view during placement phase.
  """
  def client_view(game_state, player_id \\ nil) do
    game_type_id = game_state.game_type_module.definition().id |> Atom.to_string()

    view = 
      if game_state.current_phase_module do
        base_view = game_state.current_phase_module.client_view(
          game_state.phase_state,
          game_state,
          player_id
        )

        # Handle the special case where player hasn't started next round yet
        # This applies to both :ban phase (Ban Pick) and :placement phase (Blind Pick)
        case game_state.phase do
          phase when phase in [:placement, :ban] and not is_nil(player_id) ->
            player_started = Map.get(game_state.ready_for_next_round, player_id, false)

            if not player_started and length(game_state.history) > 0 do
              [last_round | _] = game_state.history
              base_view
              |> Map.put(:phase, :combined)
              |> Map.put(:current_round, last_round.round)
              |> Map.put(:stones, last_round.stones)
            else
              base_view
            end

          _ ->
            base_view
        end
      else
        Map.from_struct(game_state)
      end

    Map.put(view, :game_type, game_type_id)
  end

  # Private functions

  defp should_mark_ready?(game_state, player_id) do
    phase_state = game_state.phase_state

    # Check if phase state has turn_based flag and placements_remaining map
    # This is specific to PlacementPhase logic but handled as generically as possible
    is_turn_based = Map.get(phase_state, :turn_based, false)
    placements_remaining = Map.get(phase_state, :placements_remaining)

    if is_turn_based && is_map(placements_remaining) do
      remaining = Map.get(placements_remaining, player_id, 0)
      remaining <= 0
    else
      # Not turn based or doesn't support tracking - assume ready on confirm
      true
    end
  end

  defp handle_phase_action(game_state, action, args) do
    phase_module = game_state.current_phase_module

    if phase_module && action in phase_module.handles_actions() do
      case phase_module.handle_action(action, args, game_state.phase_state, game_state) do
        {:ok, new_phase_state, new_game_state} ->
          {:ok, %{new_game_state | phase_state: new_phase_state}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      {:error, :action_not_handled_by_phase}
    end
  end

  @doc """
  Public wrapper to trigger phase transition check.
  Used by GameServer for delayed phase transitions (e.g., after dice animation).
  """
  def maybe_transition_phase_public(game_state) do
    maybe_transition_phase(game_state)
  end

  defp maybe_transition_phase(game_state) do
    phase_module = game_state.current_phase_module

    case phase_module.check_completion(game_state.phase_state, game_state) do
      {:complete, result} ->
        Logger.info("Phase #{inspect(phase_module)} completed with result: #{inspect(result)}")
        advance_to_next_phase(game_state, result)

      :continue ->
        {:ok, game_state}
    end
  end

  defp advance_to_next_phase(game_state, result) do
    definition = game_state.game_type_module.definition()
    phases = definition.phases
    next_index = game_state.current_phase_index + 1

    # Apply any phase result data to game state
    game_state = apply_phase_result(game_state, result)

    if next_index >= length(phases) do
      handle_round_completion(game_state, definition)
    else
      next_phase = Enum.at(phases, next_index)
      {next_phase_module, next_phase_args} = normalize_phase(next_phase)
      
      # Merge phase result into next phase args (e.g., first_player from TurnOrderPhase)
      # Only merge if result is a map - some phases return atoms like :all_ready
      merged_args = if is_map(result), do: Map.merge(next_phase_args, result), else: next_phase_args
      
      {:ok, phase_state} = next_phase_module.init(game_state, merged_args)

      Logger.info("Transitioning to phase: #{inspect(next_phase_module)}")

      {:ok,
       %{
         game_state
         | current_phase_module: next_phase_module,
           current_phase_args: merged_args,
           current_phase_index: next_index,
           phase_state: phase_state,
           phase: phase_to_legacy_atom(next_phase_module)
       }}
    end
  end

  # Apply phase completion results to game state
  defp apply_phase_result(game_state, %{banned_zones: banned_zones}) do
    %{game_state | banned_zones: banned_zones}
  end

  defp apply_phase_result(game_state, _result), do: game_state

  defp handle_round_completion(game_state, definition) do
    should_continue =
      case definition.loop_type do
        :infinite -> true
        {:rounds, _max_rounds_def} -> 
           # Use configured total_rounds, defaulting to definition if not set
           # 0 means infinite rounds
           max = game_state.total_rounds
           if max == 0, do: true, else: game_state.current_round < max
        {:until, _condition} -> true
      end

    if should_continue do
      start_next_round(game_state)
    else
      Logger.info("Game completed after #{game_state.current_round} rounds")
      {:ok, %{game_state | phase: :game_over}}
    end
  end

  defp start_next_round(game_state) do
    history_item = %{
      round: game_state.current_round,
      stones: game_state.stones
    }

    history = [history_item | game_state.history]

    player_ready = Map.new(game_state.player_ready, fn {id, _} -> {id, false} end)
    # Keep ready_for_next_round as-is - player who clicked is marked true
    # The other player can still see combined phase until they click next round

    definition = game_state.game_type_module.definition()
    [first_phase | _] = definition.phases
    {first_phase_module, first_phase_args} = normalize_phase(first_phase)

    new_game_state = %{
      game_state
      | current_round: game_state.current_round + 1,
        current_phase_index: 0,
        current_phase_module: first_phase_module,
        current_phase_args: first_phase_args,
        player_ready: player_ready,
        stones: %{red: [], yellow: []},
        banned_zones: %{red: nil, yellow: nil},
        history: history
    }

    {:ok, phase_state} = first_phase_module.init(new_game_state, first_phase_args)

    Logger.info("Starting round #{new_game_state.current_round}")

    {:ok,
     %{
       new_game_state
       | phase_state: phase_state,
         phase: phase_to_legacy_atom(first_phase_module)
     }}
  end

  defp find_player(game_state, player_id) do
    Enum.find(game_state.players, fn p -> p.id == player_id end)
  end

  defp normalize_phase({module, args}) when is_map(args), do: {module, args}
  defp normalize_phase({module, args}) when is_list(args), do: {module, Map.new(args)}
  defp normalize_phase(module) when is_atom(module), do: {module, %{}}

  defp phase_to_legacy_atom(module) do
    case module do
      KickaEttan.Games.Phases.BanPhase -> :ban
      KickaEttan.Games.Phases.BlindPickPhase -> :placement
      KickaEttan.Games.Phases.PlacementPhase -> :placement
      KickaEttan.Games.Phases.CombinedPhase -> :combined
      _ -> :unknown
    end
  end

  defp generate_game_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false) |> binary_part(0, 8)
  end
end
