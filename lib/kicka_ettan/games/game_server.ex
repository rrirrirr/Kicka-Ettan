defmodule KickaEttan.Games.GameServer do
  @moduledoc """
  GenServer implementation that manages game state for a single game.
  """
  use GenServer
  require Logger
  alias KickaEttan.Games.GameState

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
        GenServer.call(game_server, :get_game_state)
      error ->
        error
    end
  end

  @doc """
  Join the game.
  """
  def join_game(game_id, player_id, color \\ nil) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:join_game, player_id, color})
    end
  end

  @doc """
  Place a stone at the specified position.
  """
  def place_stone(game_id, player_id, stone_index, position) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:place_stone, player_id, stone_index, position})
    end
  end

  @doc """
  Confirm stone placement.
  """
  def confirm_placement(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:confirm_placement, player_id})
    end
  end

  @doc """
  Mark player as ready for the next round.
  """
  def ready_for_next_round(game_id, player_id) do
    with {:ok, game_server} <- lookup_game(game_id) do
      GenServer.call(game_server, {:ready_for_next_round, player_id})
    end
  end

  # Server callbacks

  @impl true
  def init({game_id, options}) do
    Logger.info("Starting game server for game #{game_id}")
    
    options = Map.put(options, :game_id, game_id)
    game_state = GameState.new(options)
    
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
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to join player #{player_id} to game #{game_state.game_id}: #{reason}")
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:place_stone, player_id, stone_index, position}, _from, game_state) do
    case GameState.place_stone(game_state, player_id, stone_index, position) do
      {:ok, new_state} ->
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to place stone for player #{player_id} in game #{game_state.game_id}: #{reason}")
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:confirm_placement, player_id}, _from, game_state) do
    case GameState.confirm_placement(game_state, player_id) do
      {:ok, new_state} ->
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to confirm placement for player #{player_id} in game #{game_state.game_id}: #{reason}")
        {:reply, error, game_state}
    end
  end

  @impl true
  def handle_call({:ready_for_next_round, player_id}, _from, game_state) do
    case GameState.ready_for_next_round(game_state, player_id) do
      {:ok, new_state} ->
        broadcast_update(new_state)
        {:reply, {:ok, new_state}, new_state}
      
      {:error, reason} = error ->
        Logger.warning("Failed to mark player #{player_id} as ready for next round in game #{game_state.game_id}: #{reason}")
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
end
