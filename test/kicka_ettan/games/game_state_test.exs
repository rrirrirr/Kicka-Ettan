defmodule KickaEttan.Games.GameStateTest do
  use ExUnit.Case, async: true
  alias KickaEttan.Games.GameState

  describe "new/1" do
    test "creates a new game state with default values" do
      state = GameState.new([])
      assert state.current_round == 1
      assert state.total_rounds == 3
      assert state.stones_per_team == 5
      assert state.phase == :placement
      assert state.stones == %{red: [], yellow: []}
    end

    test "creates a new game state with custom values" do
      state = GameState.new(total_rounds: 5, stones_per_team: 8)
      assert state.total_rounds == 5
      assert state.stones_per_team == 8
    end
  end

  describe "join_game/3" do
    test "adds a player to the game" do
      state = GameState.new([])
      {:ok, new_state} = GameState.join_game(state, "player1")
      
      assert length(new_state.players) == 1
      assert hd(new_state.players).id == "player1"
    end

    test "assigns colors correctly" do
      state = GameState.new([])
      {:ok, state1} = GameState.join_game(state, "p1", "red")
      {:ok, state2} = GameState.join_game(state1, "p2")

      p1 = Enum.find(state2.players, & &1.id == "p1")
      p2 = Enum.find(state2.players, & &1.id == "p2")

      assert p1.color == :red
      assert p2.color == :yellow
    end

    test "prevents joining if game is full" do
      state = GameState.new([])
      {:ok, s1} = GameState.join_game(state, "p1")
      {:ok, s2} = GameState.join_game(s1, "p2")
      
      assert {:error, :game_full} = GameState.join_game(s2, "p3")
    end
  end

  describe "place_stone/4" do
    test "places a stone for a valid player" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      pos = %{"x" => 100, "y" => 200}
      {:ok, new_state} = GameState.place_stone(state, "p1", 0, pos)
      
      assert length(new_state.stones.red) == 1
      assert hd(new_state.stones.red) == pos
    end

    test "rejects invalid stone index" do
      state = GameState.new(stones_per_team: 5)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      pos = %{"x" => 100, "y" => 200}
      assert {:error, :invalid_placement} = GameState.place_stone(state, "p1", 99, pos)
    end
  end
end
