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

export interface BannedZone {
  x: number;
  y: number;
  radius: number;
}

export interface GameState {
  game_id: string;
  game_type: string;
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
  phase: "turn_order" | "ban" | "placement" | "combined" | "measure";
  stones_per_team: number;
  team_colors?: { red: string; yellow: string };
  settings?: Record<string, any>;
  player_ready?: Record<string, boolean>;
  history?: any[]; // Define HistoryRound type if possible
  red: BannedZone | null;
  yellow: BannedZone | null;
  banned_zones?: {
    red: BannedZone | null;
    yellow: BannedZone | null;
  };
  // New Configurable Phase Fields
  stones_count?: number;
  bans_count?: number;
  stones_locked?: boolean;
  bans_locked?: boolean;
  turn_based?: boolean;
  current_turn_id?: string; // Player ID whose turn it is
  turn_number?: number; // Global turn counter for lock tracking
  placements_per_turn?: number; // How many placements per turn
  placements_this_turn?: number; // How many placements made this turn

  // Lock tracking - which turn each item was placed
  my_placed_turns?: {
    stones: (number | null)[];  // Turn number when each stone was placed
    bans: (number | null)[];     // Turn number when each ban was placed
  };

  ban_positions?: {
    red: BannedZone[];
    yellow: BannedZone[];
  };
  ban_radius?: number;

  // First player decision state
  deciding_first_player?: boolean;
  my_vote?: string | null;
  opponent_has_voted?: boolean;
  dice_rolls?: Record<string, number>;
  first_player?: string | null;
}

export interface Stone {
  id: string;
  color: PlayerColor;
  position: { x: number; y: number };
  placed: boolean;
}
