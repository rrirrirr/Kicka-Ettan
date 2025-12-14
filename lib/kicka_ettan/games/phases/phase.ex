defmodule KickaEttan.Games.Phase do
  @moduledoc """
  Behaviour for game phases.
  
  A Phase is a self-contained unit of game logic that can be composed into Game Types.
  Examples: BlindPickPhase, CombinedPhase, BanPhase, TurnBasedPhase
  """

  @type phase_state :: map()
  @type game_state :: map()
  @type player_id :: String.t()
  @type action :: atom()
  @type action_args :: map()

  @doc """
  Initialize the phase state when entering this phase.
  Called when transitioning into this phase.
  """
  @callback init(game_state(), args :: term()) :: {:ok, phase_state()}

  @doc """
  Handle an action from a player during this phase.
  Returns updated phase state and game state, or an error.
  """
  @callback handle_action(action(), action_args(), phase_state(), game_state()) ::
              {:ok, phase_state(), game_state()} | {:error, term()}

  @doc """
  Check if this phase is complete and should transition to the next phase.
  Returns {:complete, result} if phase is done, or :continue if not.
  """
  @callback check_completion(phase_state(), game_state()) ::
              {:complete, term()} | :continue

  @doc """
  Generate the client view for this phase.
  Controls what each player sees during this phase.
  """
  @callback client_view(phase_state(), game_state(), player_id() | nil) :: map()

  @doc """
  Returns the list of actions this phase handles.
  Used for routing actions to the correct phase.
  """
  @callback handles_actions() :: [action()]
end
