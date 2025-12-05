defmodule KickaEttan.Games.GameSupervisorTest do
  use ExUnit.Case, async: true
  
  alias KickaEttan.Games.GameSupervisor
  alias KickaEttan.Games.GameServer

  describe "create_game/1" do
    test "creates game with auto-generated ID" do
      {:ok, game_id} = GameSupervisor.create_game(%{})
      
      assert is_binary(game_id)
      assert String.length(game_id) == 8
      
      # Verify game exists
      assert {:ok, _state} = GameServer.get_game_state(game_id)
    end

    test "creates game with custom ID" do
      custom_id = "custom_test_id"
      {:ok, game_id} = GameSupervisor.create_game(%{game_id: custom_id})
      
      assert game_id == custom_id
    end

    test "creates game with custom options" do
      {:ok, game_id} = GameSupervisor.create_game(%{total_rounds: 5, stones_per_team: 8})
      
      {:ok, state} = GameServer.get_game_state(game_id)
      
      assert state.total_rounds == 5
      assert state.stones_per_team == 8
    end

    test "returns :already_exists for duplicate ID" do
      game_id = "duplicate_test_#{System.unique_integer()}"
      
      {:ok, ^game_id} = GameSupervisor.create_game(%{game_id: game_id})
      
      assert {:error, :already_exists} = GameSupervisor.create_game(%{game_id: game_id})
    end
  end

  describe "terminate_game/1" do
    test "terminates existing game" do
      {:ok, game_id} = GameSupervisor.create_game(%{})
      
      # Verify game exists
      assert {:ok, _state} = GameServer.get_game_state(game_id)
      
      # Terminate
      assert :ok = GameSupervisor.terminate_game(game_id)
      
      # Verify game is gone using Registry lookup (get_game_state will crash)
      assert [] = Registry.lookup(KickaEttan.GameRegistry, game_id)
    end

    test "returns :not_found for non-existent game" do
      assert {:error, :not_found} = GameSupervisor.terminate_game("nonexistent_game")
    end
  end

  describe "list_games/0" do
    test "lists all active game IDs" do
      # Create a few games
      {:ok, game_id1} = GameSupervisor.create_game(%{})
      {:ok, game_id2} = GameSupervisor.create_game(%{})
      
      games = GameSupervisor.list_games()
      
      assert game_id1 in games
      assert game_id2 in games
    end

    test "excludes terminated games" do
      {:ok, game_id} = GameSupervisor.create_game(%{})
      GameSupervisor.terminate_game(game_id)
      
      games = GameSupervisor.list_games()
      
      refute game_id in games
    end
  end
end
