defmodule KickaEttan.Games.Janitor do
  @moduledoc """
  Process to clean up inactive games.
  """
  use GenServer
  require Logger
  alias KickaEttan.Games.GameSupervisor
  alias KickaEttan.Games.GameServer

  # Clean up games that have been inactive for 24 hours
  @cleanup_interval :timer.hours(1)  # Check every hour


  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Schedule first cleanup
    schedule_cleanup()
    {:ok, %{last_cleanup: DateTime.utc_now()}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    Logger.info("Running game cleanup process")
    
    # Get list of all games
    all_games = GameSupervisor.list_games()
    
    # Check each game for inactivity
    Enum.each(all_games, fn game_id ->
      case GameServer.get_game_state(game_id) do
        {:ok, game_state} ->
          check_and_cleanup_game(game_id, game_state)
        {:error, _} ->
          # If there's an error getting the game state, just clean it up
          GameSupervisor.terminate_game(game_id)
      end
    end)
    
    # Schedule next cleanup
    schedule_cleanup()
    
    {:noreply, %{state | last_cleanup: DateTime.utc_now()}}
  end

  defp check_and_cleanup_game(_game_id, _game_state) do
    # For now, we'll just keep games around
    # In a real implementation, you'd track last activity timestamp
    # and terminate games that have been inactive for too long
    :ok
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end
