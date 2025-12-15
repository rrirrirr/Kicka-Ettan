defmodule KickaEttan.Games.GameServer do
  @moduledoc """
  GenServer implementation that manages game state for a single game.
  """
  use GenServer
  require Logger
  alias KickaEttan.Games.GameState
  alias KickaEttan.Analytics.PosthogClient

  @timeout 5000

  # Client API

  @doc """
  Start a new game server process for a game.
  """
  def start_link({game_id, options}) do
    GenServer.start_link(__MODULE__, {game_id, options}, name: via_tuple(game_id))
  end

  @doc """
  Get the current state of the game.
  """
  def get_game_state(game_id) do
    case lookup_game(game_id) do
      {:ok, game_server} ->
        GenServer.call(game_server, :get_game_state, @timeout)
      error ->
        error
    end
  end

  @doc """
  Join the game.
  """
  def join_game(game_id, player_id, color \\ nil) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:join_game, player_id, color}, @timeout)
    end
  end

  @doc """
  Place a stone at the specified position.
  """
  def place_stone(game_id, player_id, stone_index, position) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:place_stone, player_id, stone_index, position}, @timeout)
    end
  end

  @doc """
  Vote for who should start first in turn-based placement.
  """
  def vote_first_player(game_id, player_id, vote_for_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:vote_first_player, player_id, vote_for_id}, @timeout)
    end
  end

  @doc """
  Remove a stone from the sheet (return to bar).
  """
  def remove_stone(game_id, player_id, stone_index) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:remove_stone, player_id, stone_index}, @timeout)
    end
  end

  @doc """
  Remove a ban zone from the sheet (return to bar).
  """
  def remove_ban(game_id, player_id, ban_index) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:remove_ban, player_id, ban_index}, @timeout)
    end
  end

  @doc """
  Confirm stone placement.
  """
  def confirm_placement(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:confirm_placement, player_id}, @timeout)
    end
  end

  @doc """
  Cancel stone placement confirmation.
  """
  def cancel_placement(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:cancel_placement, player_id}, @timeout)
    end
  end

  @doc """
  Mark player as ready for the next round.
  """
  def ready_for_next_round(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:ready_for_next_round, player_id}, @timeout)
    end
  end

  @doc """
  Place a ban zone at the specified position (ban phase).
  """
  def place_ban(game_id, player_id, ban_index, position) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:place_ban, player_id, ban_index, position}, @timeout)
    end
  end

  @doc """
  Confirm ban zone placement.
  """
  def confirm_ban(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:confirm_ban, player_id}, @timeout)
    end
  end

  @doc """
  Cancel ban zone confirmation.
  """
  def cancel_ban(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:cancel_ban, player_id}, @timeout)
    end
  end

  # Server callbacks

  @impl true
  def init({game_id, options}) do
    Logger.metadata(game_id: game_id)
    Logger.info("Starting game server")

    options = Map.put(options, :game_id, game_id)
    game_state = GameState.new(options)

    # Track game creation in PostHog
    game_type = Map.get(options, :game_type, "standard")
    PosthogClient.track_game_created(game_id, game_type)

    {:ok, game_state}
  end

  @impl true
  def handle_call(:get_game_state, _from, game_state) do
    {:reply, {:ok, GameState.client_view(game_state)}, game_state}
  end

  @impl true
  def handle_call({:get_player_view, player_id}, _from, game_state) do
    {:reply, {:ok, GameState.client_view(game_state, player_id)}, game_state}
  end

  @impl true
  def handle_call({:join_game, player_id, color}, _from, game_state) do
    case GameState.join_game(game_state, player_id, color) do
      {:ok, new_state} ->
        Logger.info("Player joined game", player_id: player_id, color: color)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to join player", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:place_stone, player_id, stone_index, position}, _from, game_state) do
    case GameState.place_stone(game_state, player_id, stone_index, position) do
      {:ok, new_state} ->
        Logger.info("Player placed stone", player_id: player_id, stone_index: stone_index, position: position)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to place stone", player_id: player_id, stone_index: stone_index, position: position, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:vote_first_player, player_id, vote_for_id}, _from, game_state) do
    case GameState.vote_first_player(game_state, player_id, vote_for_id) do
      {:ok, new_state} ->
        Logger.info("Player voted for first player", player_id: player_id, vote_for: vote_for_id)
        
        # If dice were rolled, schedule a delayed phase transition check
        # Short delay just to ensure frontend receives the dice data
        if new_state.phase_state && Map.get(new_state.phase_state, :dice_completed_at) do
          Logger.info("Dice rolled, scheduling delayed phase transition check in 0.5 seconds")
          Process.send_after(self(), :check_dice_animation_complete, 500)
        end
        
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to vote for first player", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_info(:check_dice_animation_complete, game_state) do
    # Re-check phase completion after dice animation delay
    Logger.info("Checking phase completion after dice animation delay")
    
    case GameState.maybe_transition_phase_public(game_state) do
      {:ok, new_state} ->
        if new_state.phase != game_state.phase do
          Logger.info("Phase transitioned after dice animation: #{game_state.phase} -> #{new_state.phase}")
        end
        broadcast_update(new_state)
        {:noreply, new_state}
      
      {:error, _reason} ->
        {:noreply, game_state}
    end
  end

  @impl true
  def handle_call({:remove_stone, player_id, stone_index}, _from, game_state) do
    case GameState.remove_stone(game_state, player_id, stone_index) do
      {:ok, new_state} ->
        Logger.info("Player removed stone", player_id: player_id, stone_index: stone_index)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to remove stone", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:remove_ban, player_id, ban_index}, _from, game_state) do
    case GameState.remove_ban(game_state, player_id, ban_index) do
      {:ok, new_state} ->
        Logger.info("Player removed ban", player_id: player_id, ban_index: ban_index)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to remove ban", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end


  @impl true
  def handle_call({:confirm_placement, player_id}, _from, game_state) do
    case GameState.confirm_placement(game_state, player_id) do
      {:ok, new_state} ->
        Logger.info("Player confirmed placement", player_id: player_id)

        # Track stone placement in PostHog
        PosthogClient.track_stone_placed(game_state.game_id, player_id, game_state.current_round)

        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to confirm placement", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:cancel_placement, player_id}, _from, game_state) do
    case GameState.cancel_placement(game_state, player_id) do
      {:ok, new_state} ->
        Logger.info("Player canceled placement", player_id: player_id)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to cancel placement", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:ready_for_next_round, player_id}, _from, game_state) do
    case GameState.ready_for_next_round(game_state, player_id) do
      {:ok, new_state} ->
        Logger.info("Player ready for next round", player_id: player_id)

        # Track round transition if round number changed
        if new_state.current_round != game_state.current_round do
          PosthogClient.track_round_completed(game_state.game_id, game_state.current_round)
          PosthogClient.track_round_started(game_state.game_id, new_state.current_round)
        end

        # Track game completion if game is over
        if new_state.phase == :game_over and game_state.phase != :game_over do
          PosthogClient.track_game_completed(game_state.game_id, new_state.current_round)
        end

        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to mark player ready", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:place_ban, player_id, ban_index, position}, _from, game_state) do
    case GameState.place_ban(game_state, player_id, ban_index, position) do
      {:ok, new_state} ->
        Logger.info("Player placed ban", player_id: player_id, position: position)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to place ban", player_id: player_id, position: position, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:confirm_ban, player_id}, _from, game_state) do
    case GameState.confirm_ban(game_state, player_id) do
      {:ok, new_state} ->
        Logger.info("Player confirmed ban", player_id: player_id)

        # Track ban placement in PostHog
        PosthogClient.track_ban_placed(game_state.game_id, player_id, game_state.current_round)

        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to confirm ban", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:cancel_ban, player_id}, _from, game_state) do
    case GameState.cancel_ban(game_state, player_id) do
      {:ok, new_state} ->
        Logger.info("Player canceled ban", player_id: player_id)
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}

      {:error, reason} = error ->
        Logger.warning("Failed to cancel ban", player_id: player_id, reason: reason)
        {:reply, error, game_state}
    end
  end

  # Private helpers

  defp via_tuple(game_id) do
    {:via, Registry, {KickaEttan.GameRegistry, game_id}}
  end

  defp lookup_game(game_id) do
    case Registry.lookup(KickaEttan.GameRegistry, game_id) do
      [{pid, _}] -> {:ok, pid}
      [] -> {:error, :not_found}
    end
  end

  defp broadcast_update(game_state) do
    # Broadcast game state update to all clients in the game
    KickaEttanWeb.Endpoint.broadcast!(
      "game:#{game_state.game_id}",
      "game_state_update",
      game_state
    )
  end

  defp get_player_color(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      %{color: color} -> color
      _ -> "unknown"
    end
  end
end
