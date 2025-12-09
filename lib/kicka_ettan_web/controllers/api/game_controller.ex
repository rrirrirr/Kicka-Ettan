defmodule KickaEttanWeb.API.GameController do
  use KickaEttanWeb, :controller
  alias KickaEttan.Games.GameSupervisor
  alias KickaEttan.Games.GameServer

  @doc """
  Create a new game with specified options
  """
  def create(conn, params) do
    total_rounds = parse_int(params["total_rounds"] || 3)
    stones_per_team = parse_int(params["stones_per_team"] || 3)
    ban_circle_radius = parse_int(params["ban_circle_radius"] || 50)
    game_type = params["game_type"]

    with :ok <- validate_bounds(total_rounds, 1, 1000, "total_rounds"),
         :ok <- validate_bounds(stones_per_team, 1, 100, "stones_per_team"),
         :ok <- validate_bounds(ban_circle_radius, 20, 100, "ban_circle_radius") do
      game_options = %{
        game_type: game_type,
        total_rounds: total_rounds,
        stones_per_team: stones_per_team,
        ban_circle_radius: ban_circle_radius,
        team1_color: params["team1_color"],
        team2_color: params["team2_color"]
      }

      case GameSupervisor.create_game(game_options) do
        {:ok, game_id} ->
          conn
          |> put_status(:created)
          |> json(%{game_id: game_id})

        {:error, reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: reason})
      end
    else
      {:error, msg} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: msg})
    end
  end

  defp parse_int(val) when is_integer(val), do: val
  defp parse_int(val) when is_binary(val) do
    case Integer.parse(val) do
      {int, _} -> int
      :error -> 0
    end
  end
  defp parse_int(_), do: 0

  defp validate_bounds(val, min, max, name) do
    if val >= min and val <= max do
      :ok
    else
      {:error, "#{name} must be between #{min} and #{max}"}
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
  def join(conn, %{"id" => game_id}) do
    # Generate a new player ID
    player_id = generate_player_id()
    
    # Try to add player to the game
    case GameServer.join_game(game_id, player_id) do
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
