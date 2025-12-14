defmodule KickaEttan.Games.TurnBasedGameStateTest do
  use ExUnit.Case
  alias KickaEttan.Games.GameState
  alias KickaEttan.Games.Phases.PlacementPhase
  alias KickaEttan.Games.Phases.CombinedPhase

  defmodule TurnBasedTestType do
    @behaviour KickaEttan.Games.GameType
    def definition do
      %{
        id: :turn_based_test,
        name: "Turn Based Test",
        phases: [
          {PlacementPhase, [turn_based: 1, stones: 2, bans: 0]},
          CombinedPhase
        ],
        settings_schema: %{},
        default_settings: %{}
      }
    end
    def apply_settings(_), do: {:ok, %{}}
    def init_game(_), do: {:ok, %{}}
  end

  test "full game flow" do
    # 1. New Game
    state = GameState.new(game_type: TurnBasedTestType)
    
    # 2. Add Players
    {:ok, state} = GameState.join_game(state, "p1", "red")
    {:ok, state} = GameState.join_game(state, "p2", "yellow")
    
    # Init Check: P2 starts because players list is [p2, p1] and we take head
    assert state.phase_state.current_turn == "p2"

    # --- ROUND 1 ---
    
    # P2 places stone 1
    IO.puts("P2 placing stone 1...")
    {:ok, state} = GameState.place_stone(state, "p2", 0, %{x: 90, y: 10})
    assert state.phase_state.placements_remaining["p2"] == 1
    
    # P2 confirms -> Switch to P1
    IO.puts("P2 confirming...")
    {:ok, state} = GameState.confirm_placement(state, "p2")
    assert state.phase_state.current_turn == "p1"

    # P1 places stone 1
    IO.puts("P1 placing stone 1...")
    {:ok, state} = GameState.place_stone(state, "p1", 0, %{x: 10, y: 10})
    assert state.phase_state.placements_remaining["p1"] == 1
    
    # P1 confirms -> Switch to P2
    IO.puts("P1 confirming...")
    {:ok, state} = GameState.confirm_placement(state, "p1")
    assert state.phase_state.current_turn == "p2"
    
    # --- ROUND 2 ---

    # P2 places stone 2 (Last stone)
    IO.puts("P2 placing stone 2...")
    {:ok, state} = GameState.place_stone(state, "p2", 1, %{x: 80, y: 20})
    assert state.phase_state.placements_remaining["p2"] == 0
    
    # P2 confirms -> Switch to P1
    IO.puts("P2 confirming...")
    {:ok, state} = GameState.confirm_placement(state, "p2")
    assert state.phase_state.current_turn == "p1"
    # P2 should be ready
    assert state.player_ready["p2"] == true

    # P1 places stone 2 (Last stone)
    IO.puts("P1 placing stone 2...")
    {:ok, state} = GameState.place_stone(state, "p1", 1, %{x: 20, y: 20})
    assert state.phase_state.placements_remaining["p1"] == 0
    
    # P1 confirms -> Should trigger transition
    IO.puts("P1 confirming...")
    {:ok, state} = GameState.confirm_placement(state, "p1")
    
    # Verify Transition
    IO.puts("Phase module after P1 confirm: #{inspect(state.current_phase_module)}")
    assert state.current_phase_module == CombinedPhase
  end
end
