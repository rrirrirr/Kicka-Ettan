defmodule KickaEttan.Games.Janitor do
  @moduledoc """
  Process to clean up inactive games.
  """
  use GenServer
  require Logger
  alias KickaEttan.Games.GameSupervisor
  alias KickaEttan.Games.GameServer

  # Clean up games that are older than 4 weeks
  @cleanup_interval :timer.hours(24)  # Check once per day
  @max_game_age_days 28  # 4 weeks


  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    # Schedule first cleanup (but don't run immediately)
    schedule_cleanup()
    {:ok, %{last_cleanup: nil}}
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

  defp check_and_cleanup_game(game_id, game_state) do
    case game_state do
      %{created_at: nil} ->
        # Game doesn't have a created_at timestamp, skip cleanup
        :ok

      %{created_at: created_at} ->
        now = DateTime.utc_now()
        age_in_days = DateTime.diff(now, created_at, :day)

        if age_in_days >= @max_game_age_days do
          Logger.info("Cleaning up game #{game_id} (age: #{age_in_days} days)")
          GameSupervisor.terminate_game(game_id)
        else
          :ok
        end

      _ ->
        :ok
    end
  end

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval)
  end
end
