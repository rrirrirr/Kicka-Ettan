export type PlayerColor = "red" | "yellow";

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  connected: boolean;
}

export interface StonePosition {
  index: number;
  x: number;
  y: number;
  placed: boolean;
  resetCount?: number;
  // For compatibility if needed, though 'color' is usually determined by the array it's in
  color?: PlayerColor;
}

export interface GameState {
  game_id: string;
  players: Player[];
  stones: {
    red: StonePosition[];
    yellow: StonePosition[];
  };
  current_turn: PlayerColor;
  current_round: number;
  total_rounds: number;
  scores: {
    red: number;
    yellow: number;
  };
  status: "waiting" | "playing" | "finished";
  phase: "placement" | "combined" | "measure";
  stones_per_team: number;
  team_colors?: { red: string; yellow: string };
  player_ready?: Record<string, boolean>;
  history?: any[]; // Define HistoryRound type if possible
}

export interface Stone {
  id: string;
  color: PlayerColor;
  position: { x: number; y: number };
  placed: boolean;
}
