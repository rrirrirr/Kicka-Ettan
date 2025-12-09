defmodule KickaEttan.Games.GameStateTest do
  use ExUnit.Case, async: true
  alias KickaEttan.Games.GameState

  describe "new/1" do
    test "creates a new game state with default values" do
      state = GameState.new([])
      assert state.current_round == 1
      assert state.total_rounds == 3
      assert state.stones_per_team == 3  # Default is 3
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

  describe "place_stone with banned zones" do
    setup do
      state = GameState.new(stones_per_team: 3)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      
      # Set up banned zone: yellow's ban restricts red at (200, 300) with radius 50
      banned_zones = %{
        red: %{x: 200, y: 300, radius: 50},
        yellow: nil
      }
      state = %{state | banned_zones: banned_zones}
      
      %{state: state}
    end

    test "pushes stone out when partially overlapping ban zone", %{state: state} do
      # Place stone at edge of ban zone - should be pushed out
      # Ban zone center: (200, 300), radius: 50
      # Stone radius: 14.5
      # Min distance for non-overlap: 50 + 14.5 = 64.5
      # Place stone 40 units away from ban center (inside the overlap zone)
      pos = %{"x" => 200, "y" => 340}  # 40 units below ban center
      
      {:ok, new_state} = GameState.place_stone(state, "p1", 0, pos)
      
      placed = hd(new_state.stones.red)
      # Stone should be pushed to min_distance from ban center (64.5)
      distance = :math.sqrt(
        :math.pow(placed["x"] - 200, 2) + :math.pow(placed["y"] - 300, 2)
      )
      assert_in_delta distance, 64.5, 0.1
    end

    test "rejects stone when fully inside ban zone", %{state: state} do
      # Place stone at center of ban zone - fully inside (no part outside)
      # For a stone to be fully inside: distance + stone_radius <= ban_radius
      # Stone radius: 14.5, Ban radius: 50
      # Max distance for fully inside: 50 - 14.5 = 35.5
      pos = %{"x" => 200, "y" => 300}  # Exactly at ban center
      
      assert {:error, :placement_in_banned_zone} = GameState.place_stone(state, "p1", 0, pos)
    end

    test "allows placement when not overlapping ban zone", %{state: state} do
      # Place stone far from ban zone
      pos = %{"x" => 400, "y" => 400}
      
      {:ok, new_state} = GameState.place_stone(state, "p1", 0, pos)
      
      placed = hd(new_state.stones.red)
      assert placed == pos
    end

    test "yellow player is not affected by red's ban zone", %{state: state} do
      # Red has a banned zone, yellow doesn't - yellow should not be restricted
      pos = %{"x" => 200, "y" => 300}  # At the red's ban center
      
      {:ok, new_state} = GameState.place_stone(state, "p2", 0, pos)
      
      placed = hd(new_state.stones.yellow)
      assert placed == pos
    end

    test "rejects placement if pushed position would be out of bounds", %{state: _state} do
      # Create a game with ban zone near the edge of the sheet
      state = GameState.new(stones_per_team: 3)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      
      # Ban zone at left edge - pushing would go out of bounds
      # Ban radius 50 + stone radius 14.5 = 64.5, but only 30 pixels from edge
      banned_zones = %{
        red: %{x: 30, y: 300, radius: 50},  # Ban zone very close to left edge
        yellow: nil
      }
      state = %{state | banned_zones: banned_zones}
      
      # Try to place stone on the left side of ban zone - would push it off the sheet
      pos = %{"x" => 20, "y" => 300}
      
      assert {:error, :placement_in_banned_zone} = GameState.place_stone(state, "p1", 0, pos)
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

  describe "cancel_placement/2" do
    setup do
      state = GameState.new(stones_per_team: 2)
      {:ok, state} = GameState.join_game(state, "p1", "red")
      {:ok, state} = GameState.join_game(state, "p2", "yellow")
      %{state: state}
    end

    test "marks previously ready player as not ready", %{state: state} do
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p1", 1, %{"x" => 150, "y" => 250})
      {:ok, state} = GameState.confirm_placement(state, "p1")
      assert state.player_ready["p1"] == true

      {:ok, new_state} = GameState.cancel_placement(state, "p1")
      assert new_state.player_ready["p1"] == false
    end

    test "returns error if not in placement phase", %{state: state} do
      # Transition to combined phase first
      {:ok, state} = GameState.place_stone(state, "p1", 0, %{"x" => 100, "y" => 200})
      {:ok, state} = GameState.place_stone(state, "p1", 1, %{"x" => 150, "y" => 250})
      {:ok, state} = GameState.confirm_placement(state, "p1")
      
      {:ok, state} = GameState.place_stone(state, "p2", 0, %{"x" => 300, "y" => 400})
      {:ok, state} = GameState.place_stone(state, "p2", 1, %{"x" => 350, "y" => 450})
      {:ok, state} = GameState.confirm_placement(state, "p2")
      
      assert state.phase == :combined
      assert {:error, :invalid_phase} = GameState.cancel_placement(state, "p1")
    end

    test "returns error for unknown player", %{state: state} do
      assert {:error, :player_not_found} = GameState.cancel_placement(state, "unknown")
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

    test "one player clicking immediately starts the next round on server", %{state: state} do
      assert state.phase == :combined
      assert state.current_round == 1
      
      {:ok, new_state} = GameState.ready_for_next_round(state, "p1")
      
      # Round immediately starts on server
      assert new_state.current_round == 2
      assert new_state.phase == :placement
      # Player who clicked is marked as ready for next round
      assert new_state.ready_for_next_round["p1"] == true
    end

    test "second player clicking also marks them as started", %{state: state} do
      {:ok, state} = GameState.ready_for_next_round(state, "p1")
      {:ok, state} = GameState.ready_for_next_round(state, "p2")
      
      assert state.current_round == 2
      assert state.phase == :placement
      assert state.ready_for_next_round["p2"] == true
    end

    test "saves current round to history when first player clicks", %{state: state} do
      {:ok, state} = GameState.ready_for_next_round(state, "p1")
      
      assert length(state.history) == 1
      assert hd(state.history).round == 1
    end

    test "resets stones for next round", %{state: state} do
      {:ok, state} = GameState.ready_for_next_round(state, "p1")
      
      assert state.stones.red == []
      assert state.stones.yellow == []
    end

    test "resets player ready states for next round", %{state: state} do
      {:ok, state} = GameState.ready_for_next_round(state, "p1")
      
      assert state.player_ready["p1"] == false
      assert state.player_ready["p2"] == false
    end

    test "returns error for unknown player" do
      state = GameState.new([])
      assert {:error, :player_not_found} = GameState.ready_for_next_round(state, "unknown")
    end

    test "client_view shows placement phase to player who clicked start", %{state: state} do
      {:ok, state} = GameState.ready_for_next_round(state, "p1")
      
      # P1's view should show placement phase for next round
      p1_view = GameState.client_view(state, "p1")
      assert p1_view.phase == :placement
      assert p1_view.current_round == 2
      
      # P2's view should still show combined phase (previous round from history)
      p2_view = GameState.client_view(state, "p2")
      assert p2_view.phase == :combined
      assert p2_view.current_round == 1
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

    test "hides opponent stones during placement phase for player who started", %{state: state} do
      # Mark player as started (needed for client_view to show placement phase)
      state = %{state | ready_for_next_round: %{"p1" => true, "p2" => false}}
      
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
