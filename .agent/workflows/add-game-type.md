---
description: How to add new game types and game phases to Kicka Ettan
---

# Adding Game Types and Phases

This guide explains how to extend the game system with new phases and game types.

## Architecture Overview

```
GameType (defines which phases to use + visibility)
    └── Phase 1 (e.g., BlindPickPhase)
    └── Phase 2 (e.g., CombinedPhase)
    └── ... more phases

GameState (phase engine - manages transitions)

Frontend fetches game types from /api/game_types
```

---

## Adding a New Game Type

### 1. Create Game Type Module

Create file: `lib/kicka_ettan/games/types/your_type.ex`

```elixir
defmodule KickaEttan.Games.Types.YourType do
  @behaviour KickaEttan.Games.GameType

  @impl true
  def definition do
    %{
      id: :your_type,
      name: "Your Type",
      visibility: :coming_soon,  # Options: :playable, :coming_soon, :hidden
      short_description: "Short description of your game type",
      long_description: """
      Detailed explanation of how this game type works.
      Can be multiple lines.
      """,
      phases: [
        KickaEttan.Games.Phases.YourPhase,
        KickaEttan.Games.Phases.CombinedPhase
      ],
      loop_type: {:rounds, 3},
      settings_schema: %{
        stones_per_team: %{
          type: :integer,
          label: "Stones per Team",
          description: "Number of stones each team places",
          default: 3,
          min: 1,
          max: 8
        },
        your_setting: %{
          type: :boolean,
          label: "Your Setting",
          description: "Description of setting",
          default: false
        }
      },
      default_settings: %{
        stones_per_team: 3,
        your_setting: false
      }
    }
  end

  @impl true
  def apply_settings(user_settings) do
    # Validate and merge with defaults
    defaults = definition().default_settings
    {:ok, Map.merge(defaults, user_settings)}
  end

  @impl true
  def init_game(_settings) do
    {:ok, %{}}
  end
end
```

### 2. Register Game Type

Add to `GameType.list_types/0` in `lib/kicka_ettan/games/types/game_type.ex`:

```elixir
def list_types do
  [
    KickaEttan.Games.Types.BlindPick,
    KickaEttan.Games.Types.BanPick,
    KickaEttan.Games.Types.YourType  # Add your new type here
  ]
end
```

### 3. Visibility Options

| Visibility | Behavior |
|------------|----------|
| `:playable` | Shown in picker, can be selected |
| `:coming_soon` | Shown in picker with badge, cannot be selected |
| `:hidden` | Not shown in picker |

**Tip:** Start with `:coming_soon` while developing, then change to `:playable` when ready.

---

## Adding a New Phase

### 1. Create Phase Module

Create file: `lib/kicka_ettan/games/phases/your_phase.ex`

```elixir
defmodule KickaEttan.Games.Phases.YourPhase do
  @behaviour KickaEttan.Games.Phase

  @impl true
  def init(game_state) do
    # Initialize phase-specific state
    {:ok, %{your_field: initial_value}}
  end

  @impl true
  def handle_action(action, params, phase_state, game_state) do
    case action do
      :your_action ->
        # Handle action, return updated states
        {:ok, %{phase_state | your_field: new_value}, game_state}
      _ ->
        {:error, :unknown_action}
    end
  end

  @impl true
  def check_completion(phase_state, game_state) do
    # Return {:complete, result} when phase should transition
    if phase_state.is_complete do
      {:complete, :success}
    else
      :continue
    end
  end

  @impl true
  def client_view(phase_state, game_state, player_id) do
    # Return map of data visible to this player
    %{
      your_field: phase_state.your_field
    }
  end

  @impl true
  def handles_actions, do: [:your_action, :another_action]
end
```

### 2. Phase Callbacks Reference

| Callback | Purpose |
|----------|---------|
| `init/1` | Initialize phase state when phase starts |
| `handle_action/4` | Process player actions |
| `check_completion/2` | Return `{:complete, result}` when phase is done |
| `client_view/3` | Build player-specific view |
| `handles_actions/0` | List of actions this phase handles |

---

## Frontend Auto-Discovery

**No frontend changes needed!** The frontend automatically fetches game types from `/api/game_types` on page load.

The API endpoint:
- Returns all game types with `visibility` != `:hidden`
- Includes full settings schema and default values
- Converts Elixir atoms/maps to JSON format

### Fallback Behavior

If the API is unavailable, the frontend uses local fallback definitions in `assets/src/data/gameTypes.ts`. Keep these in sync for offline development.

---

## Testing

### Backend Tests

```bash
# Test the API endpoint
mix test test/kicka_ettan_web/controllers/api/game_type_controller_test.exs
```

### Manual Verification

1. Start dev server: `mix phx.server`
2. Visit http://localhost:4000/api/game_types
3. Verify your new game type appears in the JSON response
4. Open the home page and check the game type picker

---

## Example: Turn-Based Phase

A quick example of a turn-based placement phase:

```elixir
defmodule KickaEttan.Games.Phases.TurnBasedPhase do
  @behaviour KickaEttan.Games.Phase

  def init(game_state) do
    {:ok, %{current_turn: :red, placements_remaining: game_state.stones_per_team * 2}}
  end

  def handle_action(:place_stone, %{team: team} = _params, phase_state, game_state) do
    if team == phase_state.current_turn do
      # Allow placement, switch turns
      next_turn = if team == :red, do: :yellow, else: :red
      {:ok, %{phase_state |
        current_turn: next_turn,
        placements_remaining: phase_state.placements_remaining - 1
      }, game_state}
    else
      {:error, :not_your_turn}
    end
  end

  def check_completion(phase_state, _game_state) do
    if phase_state.placements_remaining == 0 do
      {:complete, :all_placed}
    else
      :continue
    end
  end

  def client_view(phase_state, game_state, _player_id) do
    %{
      current_turn: phase_state.current_turn,
      all_stones: game_state.stones  # Stones visible to all
    }
  end

  def handles_actions, do: [:place_stone]
end
```

