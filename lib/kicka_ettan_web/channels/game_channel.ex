defmodule KickaEttanWeb.GameChannel do
  use Phoenix.Channel
  require Logger
  alias KickaEttan.Games.GameServer

  @impl true
  def join("game:" <> game_id, params, socket) do
    player_id = socket.assigns.player_id

    # Assign game_id to socket for future reference
    socket = assign(socket, :game_id, game_id)

    # Set logger metadata for this process
    Logger.metadata(game_id: game_id, player_id: player_id)

    # Try to join the game
    color = Map.get(params, "color")

    case GameServer.join_game(game_id, player_id, color) do
      {:ok, game_state} ->
        # Filter the game state for this specific player to hide opponent stones during placement
        client_view = KickaEttan.Games.GameState.client_view(game_state, player_id)
        Logger.info("Join successful", player_id: player_id)
        {:ok, %{game_state: client_view, player_id: player_id}, socket}

      {:error, :not_found} ->
        Logger.warning("Join failed: Game not found", game_id: game_id)
        {:error, %{reason: "Game not found"}}

      {:error, :game_full} ->
        Logger.warning("Join failed: Game full", game_id: game_id)
        {:error, %{reason: "Game is full"}}

      {:error, reason} ->
        Logger.error("Join failed: Unknown reason", reason: inspect(reason))
        {:error, %{reason: reason}}
    end
  end

  @impl true
  def handle_in("place_stone", payload, socket) do
    Logger.debug("Received place_stone", payload: payload)
    with :ok <- check_rate_limit(socket),
         %{"stone_index" => index, "position" => position} <- payload do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.place_stone(game_id, player_id, index, position) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} -> 
          Logger.warning("place_stone failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} -> 
        Logger.warning("place_stone rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
      _ -> 
        Logger.warning("place_stone invalid payload", payload: payload)
        {:reply, {:error, %{reason: "Invalid payload"}}, socket}
    end
  end

  @impl true
  def handle_in("confirm_placement", _params, socket) do
    Logger.debug("Received confirm_placement")
    with :ok <- check_rate_limit(socket) do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.confirm_placement(game_id, player_id) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} -> 
          Logger.warning("confirm_placement failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} -> 
        Logger.warning("confirm_placement rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
    end
  end

  @impl true
  def handle_in("cancel_placement", _params, socket) do
    Logger.debug("Received cancel_placement")
    with :ok <- check_rate_limit(socket) do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.cancel_placement(game_id, player_id) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} -> 
          Logger.warning("cancel_placement failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} -> 
        Logger.warning("cancel_placement rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
    end
  end

  @impl true
  def handle_in("ready_for_next_round", _params, socket) do
    Logger.debug("Received ready_for_next_round")
    with :ok <- check_rate_limit(socket) do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.ready_for_next_round(game_id, player_id) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} -> 
          Logger.warning("ready_for_next_round failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} -> 
        Logger.warning("ready_for_next_round rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
    end
  end

  defp check_rate_limit(socket) do
    player_id = socket.assigns.player_id
    # Limit: 60 events per minute per player
    case Hammer.check_rate("socket_player:#{player_id}", 60_000, 60) do
      {:allow, _count} -> :ok
      {:deny, _limit} -> {:error, :rate_limit_exceeded}
    end
  end

  intercept ["game_state_update"]

  @impl true
  def handle_out("game_state_update", game_state, socket) do
    player_id = socket.assigns.player_id

    # Filter the game state for this specific player
    client_view = KickaEttan.Games.GameState.client_view(game_state, player_id)

    push(socket, "game_state_update", client_view)
    {:noreply, socket}
  end

  # Handle disconnects
  @impl true
  def terminate(reason, _socket) do
    # Log disconnection
    Logger.info("Player disconnected", reason: inspect(reason))
    :ok
  end
end
