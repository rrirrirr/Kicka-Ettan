defmodule KickaEttanWeb.GameChannel do
  use Phoenix.Channel
  require Logger
  alias KickaEttan.Games.GameServer
  alias KickaEttan.Analytics.PosthogClient

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

        # Track player join in PostHog (PostHog will automatically add country from IP)
        actual_color = get_player_color(game_state, player_id)
        PosthogClient.track_player_joined(game_id, player_id, actual_color)

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
        {:ok, _state} -> 
          Logger.info("Channel: place_stone success")
          {:reply, :ok, socket}
        {:error, reason} -> 
          Logger.error("Channel: place_stone failed: #{inspect(reason)}")
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

  @impl true
  def handle_in("place_ban", payload, socket) do
    Logger.debug("Received place_ban", payload: payload)
    with :ok <- check_rate_limit(socket),
         %{"position" => position} <- payload do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.place_ban(game_id, player_id, position) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} ->
          Logger.warning("place_ban failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} ->
        Logger.warning("place_ban rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
      _ ->
        Logger.warning("place_ban invalid payload", payload: payload)
        {:reply, {:error, %{reason: "Invalid payload"}}, socket}
    end
  end

  @impl true
  def handle_in("confirm_ban", _params, socket) do
    Logger.debug("Received confirm_ban")
    with :ok <- check_rate_limit(socket) do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.confirm_ban(game_id, player_id) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} ->
          Logger.warning("confirm_ban failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} ->
        Logger.warning("confirm_ban rate limited")
        {:reply, {:error, %{reason: "Rate limit exceeded"}}, socket}
    end
  end

  @impl true
  def handle_in("cancel_ban", _params, socket) do
    Logger.debug("Received cancel_ban")
    with :ok <- check_rate_limit(socket) do
      game_id = socket.assigns.game_id
      player_id = socket.assigns.player_id

      case GameServer.cancel_ban(game_id, player_id) do
        {:ok, _state} -> {:reply, :ok, socket}
        {:error, reason} ->
          Logger.warning("cancel_ban failed", reason: reason)
          {:reply, {:error, %{reason: reason}}, socket}
      end
    else
      {:error, :rate_limit_exceeded} ->
        Logger.warning("cancel_ban rate limited")
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

  defp get_player_color(game_state, player_id) do
    case Enum.find(game_state.players, fn p -> p.id == player_id end) do
      %{color: color} -> color
      _ -> "unknown"
    end
  end
end
