defmodule KickaEttan.Games.Types.TurnDoubleBanOpenPick do
  @moduledoc """
  Turn Double Ban Open Pick Game Type

  A strategic variant with:
  - 2 ban zones per player (medium size)
  - 3 rounds with increasing stones (3, 4, 5)
  - Single mixed phase with open turns
  """
  @behaviour KickaEttan.Games.GameType

  alias KickaEttan.Games.Phases.{TurnOrderPhase, PlacementPhase, CombinedPhase}

  @impl true
  def definition do
    %{
      id: :turn_double_ban_open_pick,
      name: "Turn Double Ban Open Pick",
      visibility: :playable,
      short_description: "2 bans + increasing stones (Turn Based)",
      long_description: """
      A strategic game mode with double ban zones and escalating stone counts!

      Players alternate turns placing either a ban zone or a stone.
      Visibility is OPEN - you see what your opponent places.
      
      Stones increase each round:
      - Round 1: 3 stones
      - Round 2: 4 stones
      - Round 3: 5 stones

      Single unified bar controls everything!
      """,
      phases: [
        # First: decide who starts (only for turn-based)
        {TurnOrderPhase, %{name: "Turn Order"}},
        # Then: placement with turn_based enabled
        {PlacementPhase, %{
          name: "Placement Phase",
          stones: [3, 4, 5],
          bans: 2,
          turn_based: 1,
          visible: true,
          stones_locked: false,
          bans_locked: false
        }},
        CombinedPhase
      ],
      loop_type: {:rounds, 3},
      settings_schema: %{},
      default_settings: %{
        stones_per_team: 3, # Base for R1
        total_rounds: 3,
        ban_circle_radius: 60,
        bans_per_team: 2
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
