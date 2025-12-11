# "Kicka ettan" - Project Development Guide

## Project Overview

"Kicka ettan" is a helper application for a real curling game with alternative rules. This app allows two players to place stones on a virtual curling sheet, with the positions then being replicated in a physical game. This document outlines the coding principles, guidelines, and architecture to make the development process maintainable.

## Game Concept

1. **Setup**:
   - Players connect to a shared game session
   - Host selects number of rounds and number of stones per player
   - Host gets a unique link to share with opponent
   - Players are assigned red or yellow stones

2. **Gameplay**:
   - Each player sees a curling sheet view (back line to hog line)
   - Players simultaneously place their stones on their view, without seeing the opponent's placements
   - **Important**: Players place all stones and then click a "Finish" button to submit their placements
   - After both players have completed their placements, a combined view shows all stones
   - Overlapping stones are automatically repositioned to prevent collisions

3. **Round Management**:
   - Both players must click "Start New Round" to proceed
   - The app facilitates multiple rounds of play
   - No scoring functionality - scoring happens in the real physical game

## UI Layout & Interaction

1. **Playing Field View**:
   - Top-down view of the curling sheet
   - House (target rings) positioned at the bottom of the screen
   - Guard zone visible above the house
   - Clear visual indication of hog line, back line, and center line

2. **Stone Selection Bar**:
   - Horizontal bar at the bottom of the screen
   - Contains all unplaced stones of the player's color
   - Number of stones based on game setup configuration

3. **Stone Interaction**:
   - Stones are draggable using mouse/touch
   - Drag from selection bar onto the playing field to place
   - Drag placed stones to reposition them
   - Drag stones back to selection bar to unplace them

4. **Placement Confirmation**:
   - "Finish Rock Placement" button appears when all stones are placed on the field
   - Button disappears if any stone is dragged back to the selection bar
   - Players can continue to adjust stone positions even after the button appears
   - Clicking the button confirms placement and waits for opponent

5. **Combined View**:
   - After both players confirm placements, the combined view shows all stones
   - Overlapping stones are automatically repositioned
   - "Start New Round" button appears for both players

## Technology Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Elixir, Phoenix Framework
- **Communication**: Hybrid approach using both REST API and WebSockets (Phoenix Channels)
- **Language**: TypeScript (frontend), Elixir (backend)

## Communication Architecture

The application uses a hybrid approach for client-server communication:

### REST API (HTTP endpoints)

Used for stateless, request-response interactions:

1. **Game Creation** (`POST /api/games`)
   - Creates a new game session
   - Returns game ID and configuration

2. **Game Joining** (`POST /api/games/:id/join`)
   - Joins an existing game
   - Assigns player color (red/yellow)
   - Returns player ID

3. **Game Status** (`GET /api/games/:id`)
   - Gets current game state
   - Used when initially connecting or reconnecting

### WebSockets (Phoenix Channels)

Used for real-time, bidirectional communication during gameplay:

1. **Connection** (`game:{game_id}` channel)
   - Player connects with their player ID
   - Server sends current game state

2. **Stone Placement Confirmation** (`confirm_placement` event)
   - Player submits all stone positions at once after clicking "Finish" button
   - Server validates and confirms successful placement

3. **Game State Updates** (`game_state_update` event)
   - Server broadcasts game state changes to all players
   - Filters what each player can see during placement phase

4. **Round Transition** (`ready_for_next_round` event)
   - Player indicates readiness for next round
   - **IMPORTANT**: When the first player clicks "Next Round", the server immediately advances to the next round internally
   - However, each player's `client_view` remains on the **combined phase** until they individually click "Next Round"
   - This allows the second player to review the combined view before proceeding
   - The `ready_for_next_round` map tracks which player has acknowledged the transition
   - Do NOT change this logic to require both players before advancing - the async per-player view is intentional

## Elixir/Phoenix Backend Architecture

### Core Components

1. **GameState Module**
   - Pure functional data structure representing game state
   - Functions for game state transitions and validation
   - Handles stone collision detection and resolution

2. **GameServer (GenServer)**
   - Maintains state for a single game
   - Handles client requests and broadcasts updates
   - One server process per active game

3. **GameSupervisor**
   - Dynamically supervises GameServer processes
   - Provides fault tolerance for game sessions

4. **GameChannel**
   - Handles WebSocket connections
   - Routes client events to appropriate GameServer
   - Broadcasts updates to connected clients

### Data Flow

1. REST API controller creates a new GameServer process
2. Players connect to game-specific channel
3. Player interactions are sent through the channel to the GameServer
4. GameServer updates its state and broadcasts changes to all players
5. Clients render game state according to current game phase

## AI-Friendly Coding Principles

### 1. Architecture & Organization

- **Component-Based Structure**: Break down the UI into small, focused components
- **Maximum File Size**: 400 lines per file (aim for 200-300)
- **Clear Directory Structure**:
  ```
  /assets              # Frontend React application
    /src
      /components      # UI components 
      /hooks           # Custom React hooks
      /services        # API/Socket services
      /utils           # Utility functions
      /types           # TypeScript type definitions
  /lib                 # Elixir backend code
    /kicka_ettan       # Core business logic
      /games           # Game state and management
      /players         # Player management
      /stones          # Stone position logic
    /kicka_ettan_web   # Web interface
      /channels        # Phoenix WebSocket channels
      /controllers     # REST API endpoints
  ```

### 2. Clean Code Practices

- **SOLID Principles**:
  - **S**: Single Responsibility - Each component does one thing well
  - **O**: Open-Closed - Open for extension, closed for modification
  - **L**: Liskov Substitution - Subtypes must be substitutable for base types
  - **I**: Interface Segregation - Specific interfaces over general ones
  - **D**: Dependency Inversion - Depend on abstractions, not concretions

- **YAGNI (You Aren't Gonna Need It)**: Don't build features until necessary
- **DRY (Don't Repeat Yourself)**: Avoid code duplication

### 3. Naming Conventions

#### Frontend (React/TypeScript)
TODO

#### Backend (Elixir)
- **Modules**: PascalCase (e.g., `GameState`)
- **Functions/Variables**: snake_case (e.g., `place_stone()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_STONES`)
- **Files**: snake_case (e.g., `game_state.ex`)

### 4. Component Design

- **Functional Components**: Use React functional components with hooks
- **Props Interface**: Define TypeScript interfaces for all component props
- **Segregate Logic**: Extract business logic from UI components

### 5. State Management

- **Centralized Game State**: Use custom hooks for frontend state management
- **Immutable Updates**: Always create new state objects, don't mutate existing ones
- **State Selectors**: Use selectors to access specific parts of state
- **Action Creators**: Define clear action creators for state changes

### 6. Documentation

- **JSDoc Comments**: For complex functions/components
- **README Files**: For each major directory explaining purpose
- **Type Definitions**: Clear TypeScript interfaces for all data structures
- **Comment Complex Logic**: Explain non-obvious implementation decisions

### 7. WebSocket Implementation

- **Connection Management**: Centralize in a custom hook
- **Event Handling**: Clearly named event handlers
- **Reconnection Logic**: Handle disconnects gracefully
- **Room Management**: Clear functions for joining/leaving game rooms

### 8. Canvas/SVG Guidelines

- **Separation of Concerns**: Split drawing code from interaction logic
- **Utility Functions**: Create helper functions for common drawing operations
- **Responsive Design**: Scale canvas based on container size
- **Performance**: Optimize render cycles, especially for animations

### 9. Error Handling

- **Graceful Failures**: Handle errors without breaking the application
- **User Feedback**: Provide clear error messages to users
- **Logging**: Include mechanisms for capturing errors
- **Recovery Strategy**: Define how to recover from network issues

### 10. Testing Considerations

- **Component Testing**: Design components to be testable in isolation
- **Mock Services**: Abstract external dependencies for easier mocking
- **Test Coverage**: Aim for good coverage of core game logic

### 11. Animation Guidelines

- **Library**: Use `framer-motion` for all UI animations.
- **Consistency**: Import shared configurations from `src/utils/animations.ts`.
  - Use `springs.snappy` for interactive elements (buttons, toggles).
  - Use `springs.smooth` for larger transitions (panels, modals).
- **Patterns**:
  - **Page Transitions**: Wrap pages in `AnimatePresence` and use `pageTransition` variants.
  - **Exits**: Always use `AnimatePresence` when components unmount to ensure smooth exit animations.
  - **Layout**: Use the `layout` prop for automatic reordering animations (e.g., lists, grids).
- **Philosophy**: Animations should be "snappy" and "fun" but not overwhelming. Avoid linear easings for UI elements; prefer springs.

## Implementation Specifics for "Kicka ettan"

### Game State Structure

```elixir
defmodule KickaEttan.Games.GameState do
  defstruct [
    game_id: nil,
    players: [],
    current_round: 1,
    total_rounds: 3,
    stones_per_player: 5,  # Configurable number of stones per player
    stones: %{red: [], yellow: []},
    player_ready: %{},  # Tracks if player has confirmed their stone placements
    phase: :placement | :combined | :between_rounds | :game_over,
    ready_for_next_round: %{}  # Tracks if player is ready for next round
  ]
  
  # Game state manipulation functions
  # ...
end
```

### Core Components

1. **GameSetup**: Initial game configuration screen (rounds, stones per player, sheet dimenions, house dimensions)
2. **CurlingSheet**: Canvas/SVG representation of curling sheet
3. **StoneSelectionBar**: Bar containing unplaced stones
4. **DraggableStone**: Interactive stone component with drag functionality
5. **PlacementConfirmButton**: Button to confirm stone placement
6. **CombinedView**: Display of all placed stones
7. **GameControls**: Buttons for game flow control
8. **RoundIndicator**: Display of current round number

### REST API Endpoints

- `POST /api/games` - Create a new game
- `GET /api/games/:id` - Get game state
- `POST /api/games/:id/join` - Join a game with a specific color

### WebSocket Events

- `confirm_placement` - Player confirms stone positions (client → server)
- `game_state_update` - Server pushes updated game state (server → client)
- `ready_for_next_round` - Player indicates readiness (client → server)
- `start_next_round` - Server starts the next round (server → client)

## Performance Considerations

- Throttle UI updates for smooth rendering
- Batch state updates to minimize render cycles
- Use memoization for expensive calculations
- Handle reconnections gracefully
- Implement cleanup for inactive game sessions

---
