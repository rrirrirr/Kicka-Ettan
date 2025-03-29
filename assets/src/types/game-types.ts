export type Player = "red" | "yellow"

export interface Position {
  x: number // Percentage from left (0-100)
  y: number // Percentage from top (0-100)
}

export interface Stone {
  id: string
  color: Player
  position: Position
  isInRockBar?: boolean
}

export interface GameState {
  stones: Stone[]
  currentPlayer: Player
  round: number
  totalRounds: number
  scores: Record<Player, number>
}

