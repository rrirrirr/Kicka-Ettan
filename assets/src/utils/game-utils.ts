export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

/**
 * Calculates the distance between two positions
 */
export function calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2))
}

/**
 * Checks if two stones are overlapping
 */
export function areOverlapping(
  stone1: { position: { x: number; y: number } },
  stone2: { position: { x: number; y: number } },
): boolean {
  // Stone diameter is approximately 5% of sheet width
  const minDistance = 5
  const distance = calculateDistance(stone1.position, stone2.position)
  return distance < minDistance
}

/**
 * Calculates the distance from a stone to the center of the house
 */
export function distanceToCenter(
  stone: { position: { x: number; y: number } },
  _sheetWidth: number,
  _sheetHeight: number,
): number {
  // Center of the house is at 50% width, 80% height from top
  const centerX = 50
  const centerY = 80

  return calculateDistance(stone.position, { x: centerX, y: centerY })
}

