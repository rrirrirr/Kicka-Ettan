---
description: How to add new game types and game phases to Kicka Ettan
---

# Adding Game Types and Phases

This guide explains how to extend the game system with new phases and game types.

## Architecture Overview

```
GameType (defines which phases to use)
    └── Phase 1 (e.g., BlindPickPhase)
    └── Phase 2 (e.g., CombinedPhase)
    └── ... more phases

GameState (phase engine - manages transitions)
```

---

## Adding a New Phase

### 1. Create Phase Module

Create file: `lib/kicka_ettan/games/phases/your_phase.ex`

```elixir
defmodule KickaEttan.Games.Phases.YourPhase do
  @behaviour KickaEttan.Games.Phase

  @impl true
  def init(game_state, _opts) do
    # Initialize phase-specific state
    %{your_field: initial_value}
  end

  @impl true
  def handle_action(action, params, game_state, phase_state) do
    case action do
      :your_action ->
        # Handle action, return updated states
        {:ok, game_state, %{phase_state | your_field: new_value}}
      _ ->
        {:error, :unknown_action}
    end
  end

  @impl true
  def check_completion(game_state, phase_state) do
    # Return true when phase should transition to next
    phase_state.is_complete
  end

  @impl true
  def client_view(game_state, phase_state, player_id) do
    # Return map of data visible to this player
    %{
      your_field: phase_state.your_field,
      # Hide opponent data if needed
    }
  end

  @impl true
  def handles_actions, do: [:your_action, :another_action]
end
```

### 2. Phase Callbacks Reference

| Callback | Purpose |
|----------|---------|
| `init/2` | Initialize phase state when phase starts |
| `handle_action/4` | Process player actions |
| `check_completion/2` | Return true when phase is done |
| `client_view/3` | Build player-specific view |
| `handles_actions/0` | List of actions this phase handles |

---

## Adding a New Game Type

### 1. Create Game Type Module

Create file: `lib/kicka_ettan/games/types/your_type.ex`

```elixir
defmodule KickaEttan.Games.Types.YourType do
  @behaviour KickaEttan.Games.GameType

  @impl true
  def id, do: "your_type"

  @impl true
  def name, do: "Your Type"

  @impl true
  def description, do: "Short description of your game type"

  @impl true
  def long_description do
    """
    Detailed explanation of how this game type works.
    Can be multiple lines.
    """
  end

  @impl true
  def phases do
    # List of phase modules in order
    [
      KickaEttan.Games.Phases.YourPhase,
      KickaEttan.Games.Phases.CombinedPhase
    ]
  end

  @impl true
  def loop_type, do: :round_loop  # or :single_pass

  @impl true
  def settings_schema do
    %{
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
    }
  end

  @impl true
  def apply_settings(game_state, settings) do
    %{game_state |
      stones_per_team: settings[:stones_per_team] || 3,
      your_field: settings[:your_setting] || false
    }
  end
end
```

### 2. Register Game Type

Add to `GameState.get_game_type_module/1`:

```elixir
def get_game_type_module(type_id) do
  case type_id do
    "blind_pick" -> KickaEttan.Games.Types.BlindPick
    "your_type" -> KickaEttan.Games.Types.YourType
    _ -> KickaEttan.Games.Types.BlindPick
  end
end
```

---

## Frontend Integration

### 1. Add to gameTypes.ts

Edit: `assets/src/data/gameTypes.ts`

```typescript
export const GAME_TYPES: GameType[] = [
    // ... existing types
    {
        id: 'your_type',
        name: 'Your Type',
        shortDescription: 'Short description',
        longDescription: `Detailed description...`,
        settingsSchema: {
            stones_per_team: {
                type: 'integer',
                label: 'Stones per Team',
                description: 'Number of stones each team places',
                min: 1,
                max: 8,
                default: 3,
                important: true
            },
            your_setting: {
                type: 'boolean',
                label: 'Your Setting',
                description: 'Description',
                default: false,
                important: false
            }
        },
        defaultSettings: {
            stones_per_team: 3,
            your_setting: false
        }
    }
];
```

### 2. Handle New Phase in GameRoom

If your phase has unique UI requirements, update `GameRoom.tsx` to handle the new phase name in the view logic.

---

## Testing

### Backend Tests

```elixir
# test/kicka_ettan/games/phases/your_phase_test.exs
defmodule KickaEttan.Games.Phases.YourPhaseTest do
  use ExUnit.Case

  alias KickaEttan.Games.Phases.YourPhase

  test "init creates correct state" do
    state = YourPhase.init(%{}, [])
    assert state.your_field == initial_value
  end

  test "handle_action processes correctly" do
    # ...
  end
end
```

### Frontend Build

```bash
cd assets && npm run build
```

---

## Example: Turn-Based Phase

A quick example of a turn-based placement phase:

```elixir
defmodule KickaEttan.Games.Phases.TurnBasedPhase do
  @behaviour KickaEttan.Games.Phase

  def init(game_state, _opts) do
    %{current_turn: :red, placements_remaining: game_state.stones_per_team * 2}
  end

  def handle_action(:place_stone, %{team: team} = params, game_state, phase_state) do
    if team == phase_state.current_turn do
      # Allow placement, switch turns
      next_turn = if team == :red, do: :yellow, else: :red
      {:ok, updated_game_state, %{phase_state |
        current_turn: next_turn,
        placements_remaining: phase_state.placements_remaining - 1
      }}
    else
      {:error, :not_your_turn}
    end
  end

  def check_completion(_game_state, phase_state) do
    phase_state.placements_remaining == 0
  end

  def client_view(game_state, phase_state, _player_id) do
    %{
      current_turn: phase_state.current_turn,
      all_stones: game_state.stones  # Stones visible to all
    }
  end

  def handles_actions, do: [:place_stone]
end
```
