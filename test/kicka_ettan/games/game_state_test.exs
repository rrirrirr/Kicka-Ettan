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

    test "rejects placement for unknown player" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      pos = %{"x" => 100, "y" => 200}
      assert {:error, :player_not_found} = GameState.place_stone(state, "unknown", 0, pos)
    end

    test "rejects invalid position (out of bounds)" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      pos = %{"x" => -50, "y" => 200}
      assert {:error, :invalid_placement} = GameState.place_stone(state, "p1", 0, pos)
    end

    test "updates existing stone position" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      pos1 = %{"x" => 100, "y" => 200}
      pos2 = %{"x" => 150, "y" => 250}
      {:ok, state} = GameState.place_stone(state, "p1", 0, pos1)
      {:ok, state} = GameState.place_stone(state, "p1", 0, pos2)
      
      assert length(state.stones.red) == 1
      assert hd(state.stones.red) == pos2
    end
  end

  describe "confirm_placement/2" do
    setup do
      state = GameState.new(stones_per_team: 2)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      %{state: state}
    end

    test "marks player as ready when all stones placed", %{state: state} do
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p1", 1, %{"x" => 150, "y" => 250})
      
      {:ok, new_state} = GameState.confirm_placement(state, "p1")
      
      assert new_state.player_ready["p1"] == true
      assert new_state.phase == :placement
    end

    test "returns error when not all stones placed", %{state: state} do
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      
      assert {:error, :not_all_stones_placed} = GameState.confirm_placement(state, "p1")
    end

    test "returns error for unknown player", %{state: state} do
      assert {:error, :player_not_found} = GameState.confirm_placement(state, "unknown")
    end

    test "transitions to combined phase when both players ready", %{state: state} do
      # P1 places stones
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p1", 1, %{"x" => 150, "y" => 250})
      {:ok, state} = GameState.confirm_placement(state, "p1")
      
      # P2 places stones
      {:ok, state} = GameState.place_stone(state, "p2", 0, %{"x" => 300, "y" => 400})
      {:ok, state} = GameState.place_stone(state, "p2", 1, %{"x" => 350, "y" => 450})
      {:ok, state} = GameState.confirm_placement(state, "p2")
      
      assert state.phase == :combined
    end
  end

  describe "resolve_collisions/1" do
    test "separates overlapping stones" do
      state = GameState.new(stones_per_team: 2)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      # Place two stones at nearly the same position
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 200, "y" => 400})
      {:ok, state} = GameState.place_stone(state, "p1", 1, %{"x" => 205, "y" => 400})
      
      {:ok, resolved} = GameState.resolve_collisions(state)
      
      [stone1, stone2] = resolved.stones.red
      dx = abs(stone1["x"] - stone2["x"])
      dy = abs(stone1["y"] - stone2["y"])
      distance = :math.sqrt(dx * dx + dy * dy)
      
      # Stones should be at least 29cm apart (stone diameter)
      assert distance >= 28.5
    end

    test "handles stones at boundaries" do
      state = GameState.new(stones_per_team: 1)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      
      # Place stone near edge
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 10, "y" => 200})
      
      {:ok, resolved} = GameState.resolve_collisions(state)
      
      stone = hd(resolved.stones.red)
      # Stone should be clamped to valid boundaries
      assert stone["x"] >= 14.5  # stone_radius
    end

    test "preserves stone colors after resolution" do
      state = GameState.new(stones_per_team: 1)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 200, "y" => 400})
      {:ok, state} = GameState.place_stone(state, "p2", 0, %{"x" => 205, "y" => 400})
      
      {:ok, resolved} = GameState.resolve_collisions(state)
      
      assert length(resolved.stones.red) == 1
      assert length(resolved.stones.yellow) == 1
    end
  end

  describe "ready_for_next_round/2" do
    setup do
      state = GameState.new(stones_per_team: 1)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      
      # Place stones and confirm
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p2", 0, %{"x" => 300, "y" => 400})
      {:ok, state} = GameState.confirm_placement(state, "p1")
      {:ok, state} = GameState.confirm_placement(state, "p2")
      
      %{state: state}
    end

    test "transitions to next round from combined phase", %{state: state} do
      assert state.phase == :combined
      assert state.current_round == 1
      
      {:ok, new_state} = GameState.ready_for_next_round(state, "p1")
      
      assert new_state.current_round == 2
      assert new_state.phase == :placement
    end

    test "saves current round to history", %{state: state} do
      {:ok, new_state} = GameState.ready_for_next_round(state, "p1")
      
      assert length(new_state.history) == 1
      assert hd(new_state.history).round == 1
    end

    test "resets stones for next round", %{state: state} do
      {:ok, new_state} = GameState.ready_for_next_round(state, "p1")
      
      assert new_state.stones.red == []
      assert new_state.stones.yellow == []
    end

    test "resets ready states for next round", %{state: state} do
      {:ok, new_state} = GameState.ready_for_next_round(state, "p1")
      
      assert new_state.player_ready["p1"] == false
      assert new_state.player_ready["p2"] == false
    end

    test "returns error for unknown player" do
      state = GameState.new([])
      assert {:error, :player_not_found} = GameState.ready_for_next_round(state, "unknown")
    end
  end

  describe "client_view/2" do
    setup do
      state = GameState.new(stones_per_team: 1)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p2", 0, %{"x" => 300, "y" => 400})
      %{state: state}
    end

    test "hides opponent stones during placement phase", %{state: state} do
      view = GameState.client_view(state, "p1")
      
      assert length(view.stones.red) == 1
      assert view.stones.yellow == []
    end

    test "shows all stones during combined phase", %{state: state} do
      {:ok, state} = GameState.confirm_placement(state, "p1")
      {:ok, state} = GameState.confirm_placement(state, "p2")
      
      view = GameState.client_view(state, "p1")
      
      assert length(view.stones.red) == 1
      assert length(view.stones.yellow) == 1
    end

    test "returns full view for nil player_id", %{state: state} do
      view = GameState.client_view(state, nil)
      
      assert length(view.stones.red) == 1
      assert length(view.stones.yellow) == 1
    end
  end

  describe "all_players_ready?/1" do
    test "returns true when all players ready" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      state = %{state | player_ready: %{"p1" => true}}
      
      assert GameState.all_players_ready?(state)
    end

    test "returns false when some players not ready" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      state = %{state | player_ready: %{"p1" => true, "p2" => false}}
      
      refute GameState.all_players_ready?(state)
    end

    test "returns true for empty player list" do
      state = GameState.new([])
      assert GameState.all_players_ready?(state)
    end
  end

  describe "join_game/3 edge cases" do
    test "handles reconnection (same player_id)" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state2} = GameState.join_game(state, "p1", "red")
      
      # Should return same state without adding duplicate
      assert length(state2.players) == 1
    end

    test "handles yellow color request when red taken" do
      state = GameState.new([])
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "red")
      
      p2 = Enum.find(state.players, & &1.id == "p2")
      assert p2.color == :yellow
    end
  end
end
