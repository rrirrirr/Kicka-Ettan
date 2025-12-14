# Game Architecture Guide

This guide explains how Kicka Ettan's game logic is structured using **Game Types** and **Phases**, and how to extend the game by creating new ones.

## Overview

The game logic is built on a modular system:
1.  **Game Types**: High-level configurations that define the rules, settings, and sequence of phases.
2.  **Phases**: Self-contained units of logic (e.g., placing stones, banning zones, resolving physics) that are composed together to create a game loop.

## Game Types

A `GameType` is a module that implements the `KickaEttan.Games.GameType` behaviour. It defines *what* happens in a game but delegates the *how* to Phases.

### Structure of a Game Type

```elixir
defmodule KickaEttan.Games.Types.MyNewGame do
  @behaviour KickaEttan.Games.GameType

  @impl true
  def definition do
    %{
      id: :my_new_game,
      name: "My New Game",
      visibility: :playable, # :playable, :coming_soon, or :hidden
      short_description: "A brief one-line summary.",
      long_description: "A detailed description of the rules.",
      
      # The sequence of phases that make up one round
      phases: [
        {KickaEttan.Games.Phases.PlacementPhase, %{
          name: "Placement",
          turn_based: 1, # 1 placement per turn
          stones: 3
        }},
        KickaEttan.Games.Phases.CombinedPhase
      ],
      
      # Loop until a condition is met (e.g., 3 rounds)
      loop_type: {:rounds, 3},
      
      # Configurable settings for the lobby
      settings_schema: %{
        stones_per_team: %{type: :integer, min: 1, max: 8, label: "Stones per Team"}
      },
      default_settings: %{
        stones_per_team: 3
      }
    }
  end

  @impl true
  def apply_settings(settings) do
    # Validate and merge settings
    {:ok, settings}
  end
end
```

### How to Create a New Game Type

1.  **Create the Module**: Create a new file in `lib/kicka_ettan/games/types/`.
2.  **Implement Behaviour**: Add `@behaviour KickaEttan.Games.GameType` and implement `definition/0` and `apply_settings/1`.
3.  **Register the Type**: Add your new module to the list in `lib/kicka_ettan/games/types/game_type.ex`:
    ```elixir
    def list_types do
      [
        KickaEttan.Games.Types.BlindPick,
        # ...
        KickaEttan.Games.Types.MyNewGame  # <--- Add this
      ]
    end
    ```

## Phases

A `Phase` is a module that implements the `KickaEttan.Games.Phase` behaviour. It handles distinct game states like placement, simulation, or scoring.

### Structure of a Phase

```elixir
defmodule KickaEttan.Games.Phases.MyPhase do
  @behaviour KickaEttan.Games.Phase

  # 1. Initialize Phase State
  @impl true
  def init(game_state, args) do
    state = %{
      some_counter: args[:start_count] || 0
    }
    {:ok, state}
  end

  # 2. Handle Player Actions
  @impl true
  def handle_action(:my_action, params, phase_state, game_state) do
    # Update logic...
    {:ok, new_phase_state, new_game_state}
  end

  # 3. Check for Completion
  @impl true
  def check_completion(phase_state, _game_state) do
    if phase_state.some_counter > 5 do
      {:complete, %{result: "done"}}
    else
      :continue
    end
  end

  # 4. Generate Client View (JSON sent to frontend)
  @impl true
  def client_view(phase_state, _game_state, player_id) do
    %{
      phase: "my_phase",
      counter: phase_state.some_counter
    }
  end

  # 5. Register Actions
  @impl true
  def handles_actions, do: [:my_action]
end
```

### Configurable Phase: `PlacementPhase`

The `PlacementPhase` is a highly configurable phase used in most game types. It supports:
*   **Stones & Bans**: Configure how many of each to place.
*   **Turn Modes**:
    *   `turn_based: false` - Simultaneous (Blind) play.
    *   `turn_based: true` - Turn-based, place everything before switching.
    *   `turn_based: N` (integer) - Place N items per turn before switching.
*   **Visibility**: `visible: true` (open info) or `visible: false` (hidden until reveal).

**Example Usage in Game Type:**

```elixir
{KickaEttan.Games.Phases.PlacementPhase, %{
  name: "Tactical Placement",
  stones: 4,
  bans: 2,
  turn_based: 2,    # Place 2 items, then switch turn
  visible: true     # Opponent sees placements immediately
}}
```
