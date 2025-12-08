defmodule KickaEttan.Games.GameServerTest do
  use ExUnit.Case, async: true
  
  alias KickaEttan.Games.GameServer
  alias KickaEttan.Games.GameSupervisor

  # Setup: Start the registry and supervisor before each test
  setup do
    # Generate unique game_id for isolation
    game_id = :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false)
    
    %{game_id: game_id}
  end

  describe "start_link/1" do
    test "starts server with valid game_id and options", %{game_id: game_id} do
      options = %{total_rounds: 3, stones_per_team: 5}
      
      {:ok, game_id} = GameSupervisor.create_game(Map.put(options, :game_id, game_id))
      
      # Verify server is running
      assert {:ok, _state} = GameServer.get_game_state(game_id)
    end
  end

  describe "get_game_state/1" do
    test "returns client view of game state", %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id})
      
      {:ok, state} = GameServer.get_game_state(game_id)
      
      assert state.game_id == game_id
      assert state.phase == :placement
      assert state.current_round == 1
    end

    test "returns :not_found for non-existent game" do
      assert {:error, :not_found} = GameServer.get_game_state("nonexistent_game_id")
    end
  end

  describe "join_game/3" do
    test "returns updated state when player joins", %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id})
      
      {:ok, state} = GameServer.join_game(game_id, "player1")
      
      assert length(state.players) == 1
      assert hd(state.players).id == "player1"
    end

    test "assigns correct colors when joining", %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id})
      
      {:ok, _state1} = GameServer.join_game(game_id, "player1", "red")
      {:ok, state2} = GameServer.join_game(game_id, "player2")
      
      p1 = Enum.find(state2.players, & &1.id == "player1")
      p2 = Enum.find(state2.players, & &1.id == "player2")
      
      assert p1.color == :red
      assert p2.color == :yellow
    end

    test "returns error when game is full", %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id})
      
      {:ok, _} = GameServer.join_game(game_id, "player1")
      {:ok, _} = GameServer.join_game(game_id, "player2")
      
      assert {:error, :game_full} = GameServer.join_game(game_id, "player3")
    end

    test "returns :not_found for non-existent game" do
      assert {:error, :not_found} = GameServer.join_game("nonexistent", "player1")
    end
  end

  describe "place_stone/4" do
    setup %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id, stones_per_team: 2})
      {:ok, _} = GameServer.join_game(game_id, "player1", "red")
      
      %{game_id: game_id}
    end

    test "places stone successfully", %{game_id: game_id} do
      position = %{"x" => 200, "y" => 400}
      
      {:ok, state} = GameServer.place_stone(game_id, "player1", 0, position)
      
      assert length(state.stones.red) == 1
      assert hd(state.stones.red) == position
    end

    test "returns error for invalid placement", %{game_id: game_id} do
      position = %{"x" => 200, "y" => 400}
      
      assert {:error, :invalid_placement} = GameServer.place_stone(game_id, "player1", 99, position)
    end

    test "returns error for unknown player", %{game_id: game_id} do
      position = %{"x" => 200, "y" => 400}
      
      assert {:error, :player_not_found} = GameServer.place_stone(game_id, "unknown", 0, position)
    end
  end

  describe "confirm_placement/2" do
    setup %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id, stones_per_team: 1})
      {:ok, _} = GameServer.join_game(game_id, "player1", "red")
      {:ok, _} = GameServer.join_game(game_id, "player2", "yellow")
      
      %{game_id: game_id}
    end

    test "confirms placement when all stones placed", %{game_id: game_id} do
      {:ok, _} = GameServer.place_stone(game_id, "player1", 0, %{"x" => 200, "y" => 400})
      
      {:ok, state} = GameServer.confirm_placement(game_id, "player1")
      
      assert state.player_ready["player1"] == true
    end

    test "returns error when not all stones placed", %{game_id: game_id} do
      assert {:error, :not_all_stones_placed} = GameServer.confirm_placement(game_id, "player1")
    end

    test "triggers phase transition when both players confirm", %{game_id: game_id} do
      {:ok, _} = GameServer.place_stone(game_id, "player1", 0, %{"x" => 200, "y" => 400})
      {:ok, _} = GameServer.place_stone(game_id, "player2", 0, %{"x" => 300, "y" => 500})
      {:ok, _} = GameServer.confirm_placement(game_id, "player1")
      {:ok, state} = GameServer.confirm_placement(game_id, "player2")
      
      assert state.phase == :combined
    end
  end

  describe "ready_for_next_round/2" do
    setup %{game_id: game_id} do
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: game_id, stones_per_team: 1})
      {:ok, _} = GameServer.join_game(game_id, "player1", "red")
      {:ok, _} = GameServer.join_game(game_id, "player2", "yellow")
      
      # Complete round 1
      {:ok, _} = GameServer.place_stone(game_id, "player1", 0, %{"x" => 200, "y" => 400})
      {:ok, _} = GameServer.place_stone(game_id, "player2", 0, %{"x" => 300, "y" => 500})
      {:ok, _} = GameServer.confirm_placement(game_id, "player1")
      {:ok, _} = GameServer.confirm_placement(game_id, "player2")
      
      %{game_id: game_id}
    end

    test "one player clicking immediately starts the next round", %{game_id: game_id} do
      {:ok, state} = GameServer.ready_for_next_round(game_id, "player1")
      
      # Round immediately starts on server
      assert state.current_round == 2
      assert state.phase == :placement
      # Player is marked as started
      assert state.ready_for_next_round["player1"] == true
    end

    test "second player clicking also marks them started", %{game_id: game_id} do
      {:ok, _} = GameServer.ready_for_next_round(game_id, "player1")
      {:ok, state} = GameServer.ready_for_next_round(game_id, "player2")
      
      assert state.current_round == 2
      assert state.phase == :placement
      assert state.ready_for_next_round["player2"] == true
    end

    test "resets stones for next round", %{game_id: game_id} do
      {:ok, state} = GameServer.ready_for_next_round(game_id, "player1")
      
      assert state.stones.red == []
      assert state.stones.yellow == []
    end
  end
end
