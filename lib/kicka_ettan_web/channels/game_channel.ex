defmodule KickaEttanWeb.GameChannel do
  use Phoenix.Channel
  require Logger
  alias KickaEttan.Games.GameServer

  @impl true
  def join("game:" <> game_id, params, socket) do
    player_id = socket.assigns.player_id
    
    # Assign game_id to socket for future reference
    socket = assign(socket, :game_id, game_id)
    
    # Try to get the current game state
    case GameServer.get_game_state(game_id) do
      {:ok, game_state} ->
        {:ok, %{game_state: game_state, player_id: player_id}, socket}
      
      {:error, :not_found} ->
        # If game doesn't exist yet, we might want to create it
        # For now, just return an error
        {:error, %{reason: "Game not found"}}
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

  # Handle disconnects
  @impl true
  def terminate(reason, socket) do
    # Log disconnection
    Logger.info("Player #{socket.assigns.player_id} disconnected from game #{socket.assigns.game_id}: #{inspect(reason)}")
    :ok
  end
end
