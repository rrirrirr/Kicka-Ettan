defmodule KickaEttanWeb.API.GameController do
  use KickaEttanWeb, :controller
  alias KickaEttan.Games.GameSupervisor
  alias KickaEttan.Games.GameServer

  @doc """
  Create a new game with specified options
  """
  def create(conn, params) do
    options = %{
      total_rounds: params["total_rounds"] || 3,
      stones_per_player: params["stones_per_player"] || 5
    }
    
    case GameSupervisor.create_game(options) do
      {:ok, game_id} ->
        conn
        |> put_status(:created)
        |> json(%{game_id: game_id})
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: reason})
    end
  end

  @doc """
  Get current state of a game
  """
  def show(conn, %{"id" => game_id}) do
    case GameServer.get_game_state(game_id) do
      {:ok, game_state} ->
        conn |> json(%{game_state: game_state})
      
      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Game not found"})
    end
  end

  @doc """
  Join an existing game
  """
  def join(conn, %{"id" => game_id, "color" => color}) do
    # Generate a new player ID
    player_id = generate_player_id()
    
    # Try to add player to the game
    case GameServer.add_player(game_id, player_id, String.to_atom(color)) do
      {:ok, _} ->
        conn |> json(%{player_id: player_id, game_id: game_id})
      
      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: reason})
    end
  end

  defp generate_player_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64() |> binary_part(0, 8)
  end
end
