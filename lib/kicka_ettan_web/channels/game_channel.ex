defmodule KickaEttanWeb.GameChannel do
  use Phoenix.Channel
  require Logger
  alias KickaEttan.Games.GameServer

  @impl true
  def join("game:" <> game_id, params, socket) do
    player_id = socket.assigns.player_id
    
    # Assign game_id to socket for future reference
    socket = assign(socket, :game_id, game_id)
    
    # Try to join the game
    color = Map.get(params, "color")
    case GameServer.join_game(game_id, player_id, color) do
      {:ok, game_state} ->
        # Filter the game state for this specific player to hide opponent stones during placement
        client_view = KickaEttan.Games.GameState.client_view(game_state, player_id)
        {:ok, %{game_state: client_view, player_id: player_id}, socket}
      
      {:error, :not_found} ->
        {:error, %{reason: "Game not found"}}
        
      {:error, :game_full} ->
        {:error, %{reason: "Game is full"}}
        
      {:error, reason} ->
        {:error, %{reason: reason}}
    end
  end

  @impl true
  def handle_in("place_stone", %{"stone_index" => index, "position" => position}, socket) do
    game_id = socket.assigns.game_id
    player_id = socket.assigns.player_id
    
    case GameServer.place_stone(game_id, player_id, index, position) do
      {:ok, _state} ->
        {:reply, :ok, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  @impl true
  def handle_in("confirm_placement", _params, socket) do
    game_id = socket.assigns.game_id
    player_id = socket.assigns.player_id
    
    case GameServer.confirm_placement(game_id, player_id) do
      {:ok, _state} ->
        {:reply, :ok, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
    end
  end

  @impl true
  def handle_in("ready_for_next_round", _params, socket) do
    game_id = socket.assigns.game_id
    player_id = socket.assigns.player_id
    
    case GameServer.ready_for_next_round(game_id, player_id) do
      {:ok, _state} ->
        {:reply, :ok, socket}
      
      {:error, reason} ->
        {:reply, {:error, %{reason: reason}}, socket}
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
  def terminate(reason, socket) do
    # Log disconnection
    game_id = Map.get(socket.assigns, :game_id, "unknown")
    player_id = Map.get(socket.assigns, :player_id, "unknown")
    Logger.info("Player #{player_id} disconnected from game #{game_id}: #{inspect(reason)}")
    :ok
  end
end
