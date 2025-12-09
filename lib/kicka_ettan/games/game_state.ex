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
        nil -> BlindPick
        type_id when is_atom(type_id) -> GameType.get_type(type_id) || BlindPick
        type_id when is_binary(type_id) -> GameType.get_type(type_id) || BlindPick
        module when is_atom(module) -> module
      end

    # Get definition and apply settings
    definition = game_type_module.definition()
    
    # Priority: direct options > settings > defaults
    user_settings = options[:settings] || %{}
    merged_settings = Map.merge(user_settings, %{
      total_rounds: options[:total_rounds],
      stones_per_team: options[:stones_per_team]
    }) |> Enum.reject(fn {_k, v} -> is_nil(v) end) |> Map.new()
    
    {:ok, settings} = game_type_module.apply_settings(merged_settings)

    team_colors = %{
      red: options[:team1_color] || "#cc0000",
      yellow: options[:team2_color] || "#185494"
    }

    # Get first phase
    [first_phase | _] = definition.phases
    first_phase_module = normalize_phase(first_phase)

    game_state = %__MODULE__{
      game_id: options[:game_id] || generate_game_id(),
      game_type_module: game_type_module,
      settings: settings,
      total_rounds: settings[:total_rounds] || 3,
      stones_per_team: settings[:stones_per_team] || 3,
      team_colors: team_colors,
      current_phase_module: first_phase_module,
      current_phase_index: 0,
      created_at: DateTime.utc_now()
    }

    # Initialize first phase
    {:ok, phase_state} = first_phase_module.init(game_state)

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
        {:ok, phase_state} = game_state.current_phase_module.init(%{game_state | players: players})

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
  Confirm stone placement.
  Delegates to current phase.
  """
  def confirm_placement(game_state, player_id) do
    result = handle_phase_action(game_state, :confirm_placement, %{player_id: player_id})

    case result do
      {:ok, new_state} ->
        # Update legacy player_ready for backwards compatibility
        new_player_ready = Map.put(new_state.player_ready, player_id, true)
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

  @doc """
  Mark player as ready for next round.
  """
  def ready_for_next_round(game_state, player_id) do
    with player when not is_nil(player) <- find_player(game_state, player_id) do
      cond do
        game_state.phase == :placement ->
          ready_for_next_round = Map.put(game_state.ready_for_next_round, player_id, true)
          {:ok, %{game_state | ready_for_next_round: ready_for_next_round}}

        game_state.phase == :combined ->
          # Also update the game state's ready_for_next_round map
          updated_ready = Map.put(game_state.ready_for_next_round, player_id, true)
          game_state = %{game_state | ready_for_next_round: updated_ready}
          
          result = handle_phase_action(game_state, :ready_for_next_round, %{player_id: player_id})

          case result do
            {:ok, new_state} ->
              maybe_transition_phase(new_state)

            error ->
              error
          end

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
  Create a view of the game state suitable for sending to clients.
  Handles per-player view during placement phase.
  """
  def client_view(game_state, player_id \\ nil) do
    if game_state.current_phase_module do
      base_view = game_state.current_phase_module.client_view(
        game_state.phase_state,
        game_state,
        player_id
      )

      # Handle the special case where player hasn't started next round yet
      case game_state.phase do
        :placement when not is_nil(player_id) ->
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
  end

  # Private functions

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

  defp advance_to_next_phase(game_state, _result) do
    definition = game_state.game_type_module.definition()
    phases = definition.phases
    next_index = game_state.current_phase_index + 1

    if next_index >= length(phases) do
      handle_round_completion(game_state, definition)
    else
      next_phase = Enum.at(phases, next_index)
      next_phase_module = normalize_phase(next_phase)
      {:ok, phase_state} = next_phase_module.init(game_state)

      Logger.info("Transitioning to phase: #{inspect(next_phase_module)}")

      {:ok,
       %{
         game_state
         | current_phase_module: next_phase_module,
           current_phase_index: next_index,
           phase_state: phase_state,
           phase: phase_to_legacy_atom(next_phase_module)
       }}
    end
  end

  defp handle_round_completion(game_state, definition) do
    should_continue =
      case definition.loop_type do
        :infinite -> true
        {:rounds, max_rounds} -> game_state.current_round < max_rounds
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

    definition = game_state.game_type_module.definition()
    [first_phase | _] = definition.phases
    first_phase_module = normalize_phase(first_phase)

    new_game_state = %{
      game_state
      | current_round: game_state.current_round + 1,
        current_phase_index: 0,
        current_phase_module: first_phase_module,
        player_ready: player_ready,
        stones: %{red: [], yellow: []},
        history: history
    }

    {:ok, phase_state} = first_phase_module.init(new_game_state)

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

  defp normalize_phase({module, _args}), do: module
  defp normalize_phase(module) when is_atom(module), do: module

  defp phase_to_legacy_atom(module) do
    case module do
      KickaEttan.Games.Phases.BlindPickPhase -> :placement
      KickaEttan.Games.Phases.CombinedPhase -> :combined
      _ -> :unknown
    end
  end

  defp generate_game_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false) |> binary_part(0, 8)
  end
end
