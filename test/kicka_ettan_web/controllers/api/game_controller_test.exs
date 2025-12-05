defmodule KickaEttanWeb.API.GameControllerTest do
  use KickaEttanWeb.ConnCase

  describe "create/2" do
    test "creates a game with valid params", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{
        "total_rounds" => 5,
        "stones_per_team" => 8,
        "team1_color" => "red",
        "team2_color" => "yellow"
      })

      assert %{"game_id" => _id} = json_response(conn, 201)
    end

    test "creates a game with default params", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{})
      assert %{"game_id" => _id} = json_response(conn, 201)
    end

    test "rejects invalid total_rounds (too low)", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{"total_rounds" => 0})
      assert %{"error" => "total_rounds must be between 1 and 1000"} = json_response(conn, 422)
    end

    test "rejects invalid total_rounds (too high)", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{"total_rounds" => 1001})
      assert %{"error" => "total_rounds must be between 1 and 1000"} = json_response(conn, 422)
    end

    test "rejects invalid stones_per_team (too low)", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{"stones_per_team" => 0})
      assert %{"error" => "stones_per_team must be between 1 and 100"} = json_response(conn, 422)
    end
  end

  describe "show/2" do
    test "returns game state for existing game", %{conn: conn} do
      # Create game first
      conn = post(conn, ~p"/api/games", %{})
      %{"game_id" => game_id} = json_response(conn, 201)

      # Fetch it
      conn = get(conn, ~p"/api/games/#{game_id}")
      assert %{"game_state" => %{"game_id" => ^game_id}} = json_response(conn, 200)
    end

    test "returns 404 for non-existent game", %{conn: conn} do
      conn = get(conn, ~p"/api/games/nonexistent")
      assert %{"error" => "Game not found"} = json_response(conn, 404)
    end
  end

  describe "join/2" do
    test "joins a game successfully", %{conn: conn} do
      # Create game
      conn = post(conn, ~p"/api/games", %{})
      %{"game_id" => game_id} = json_response(conn, 201)

      # Join it
      conn = post(conn, ~p"/api/games/#{game_id}/join")
      assert %{"player_id" => _, "game_id" => ^game_id} = json_response(conn, 200)
    end

    test "returns error for non-existent game", %{conn: conn} do
      conn = post(conn, ~p"/api/games/nonexistent/join")
      assert %{"error" => "not_found"} = json_response(conn, 422)
    end

    test "returns error when joining full game", %{conn: conn} do
      # Create game
      conn = post(conn, ~p"/api/games", %{})
      %{"game_id" => game_id} = json_response(conn, 201)

      # Join twice (fill game)
      post(conn, ~p"/api/games/#{game_id}/join")
      post(conn, ~p"/api/games/#{game_id}/join")

      # Third join should fail
      conn = post(conn, ~p"/api/games/#{game_id}/join")
      assert %{"error" => "game_full"} = json_response(conn, 422)
    end
  end

  describe "create/2 edge cases" do
    test "handles string values for numeric params", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{
        "total_rounds" => "5",
        "stones_per_team" => "8"
      })

      assert %{"game_id" => _id} = json_response(conn, 201)
    end

    test "accepts custom team colors", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{
        "team1_color" => "#ff0000",
        "team2_color" => "#0000ff"
      })

      assert %{"game_id" => _id} = json_response(conn, 201)
    end

    test "rejects invalid stones_per_team (too high)", %{conn: conn} do
      conn = post(conn, ~p"/api/games", %{"stones_per_team" => 101})
      assert %{"error" => "stones_per_team must be between 1 and 100"} = json_response(conn, 422)
    end
  end
end
