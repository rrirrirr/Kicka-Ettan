defmodule KickaEttan.Games.Types.TurnBasedTest do
  @moduledoc """
  Simple Turn Based Test Game Type

  A minimal turn-based variant for testing:
  - 1-2 bans per player (round 1: 1, round 2: 2)
  - 1-2 stones per player (round 1: 1, round 2: 2)
  - 2 rounds total
  - NO first-player voting (player 1 always starts first for predictable testing)
  - Open visibility (see opponent placements)
  """
  @behaviour KickaEttan.Games.GameType

  alias KickaEttan.Games.Phases.{TurnOrderPhase, PlacementPhase, CombinedPhase}

  @impl true
  def definition do
    %{
      id: :turn_based_test,
      name: "Turn Based Test",
      visibility: :playable,  # Visible in game type menu
      short_description: "Simple turn-based test mode (1-2 bans/stones, 2 rounds)",
      long_description: """
      A minimal turn-based game mode for testing:
      - Vote or roll dice to decide who starts
      - Round 1: 1 ban + 1 stone each
      - Round 2: 2 bans + 2 stones each
      - Open visibility - see opponent placements
      """,
      phases: [
        # First: decide who starts
        {TurnOrderPhase, %{name: "Turn Order"}},
        # Then: placement with turn_based enabled
        {PlacementPhase, %{
          name: "Placement Phase",
          stones: [1, 2],  # 1 stone in R1, 2 in R2
          bans: [1, 2],     # 1 ban in R1, 2 in R2
          turn_based: 1,    # Each player places 1 item per turn
          visible: true,    # See opponent placements
          stones_locked: false,
          bans_locked: false
        }},
        CombinedPhase
      ],
      loop_type: {:rounds, 2},
      settings_schema: %{},
      default_settings: %{
        stones_per_team: 1,  # Base for R1
        total_rounds: 2,
        ban_circle_radius: 60,
        bans_per_team: 1
      }
    }
  end

  @impl true
  def apply_settings(_user_settings) do
    {:ok, definition().default_settings}
  end

  @impl true
  def init_game(_settings) do
    {:ok, %{}}
  end
end
