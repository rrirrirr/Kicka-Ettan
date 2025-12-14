defmodule KickaEttan.Games.Phases.CombinedPhaseTest do
  use ExUnit.Case
  alias KickaEttan.Games.Phases.CombinedPhase

  test "init resolves collisions and returns stones by color" do
    # 1. Setup Game State with overlapping stones
    game_state = %{
      players: [%{id: "p1"}, %{id: "p2"}],
      stones: %{
        red: [%{"x" => 100.0, "y" => 100.0}], 
        yellow: [%{"x" => 105.0, "y" => 105.0}] # Heavy overlap
      },
      banned_zones: %{red: nil, yellow: nil}
    }

    # 2. Initialize CombinedPhase
    {:ok, phase_state} = CombinedPhase.init(game_state)

    # 3. Verify Structure
    assert Map.has_key?(phase_state, :resolved_stones)
    stones = phase_state.resolved_stones
    assert Map.has_key?(stones, :red)
    assert Map.has_key?(stones, :yellow)
    assert is_list(stones.red)
    assert is_list(stones.yellow)

    # 4. Verify Resolution (Check that they moved apart)
    [r1] = stones.red
    [y1] = stones.yellow
    
    dist_sq = :math.pow(r1["x"] - y1["x"], 2) + :math.pow(r1["y"] - y1["y"], 2)
    dist = :math.sqrt(dist_sq)
    
    # Diameter is 29.0. They should be at least diameter apart or close to it.
    assert dist >= 28.9 
  end

  test "client_view returns stones correctly" do
    # 1. Setup Phase State
    phase_state = %{
      resolved_stones: %{
        red: [%{"x" => 50, "y" => 50}],
        yellow: [%{"x" => 200, "y" => 200}]
      },
      player_ready: %{"p1" => false}
    }
    game_state = %KickaEttan.Games.GameState{
      phase: :combined,
      players: [%{id: "p1", color: :red}]
    }

    # 2. Get View
    view = CombinedPhase.client_view(phase_state, game_state, "p1")

    # 3. Verify View
    assert view.phase == :combined
    assert view.stones == phase_state.resolved_stones
    assert view.stones.red |> length() == 1
  end
end
