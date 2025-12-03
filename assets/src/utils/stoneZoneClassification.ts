import {
  SHEET_WIDTH,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  VIEW_TOP_OFFSET,
} from './constants';

export type StoneZone = 'house' | 'near-house' | 'guard';

export interface StonePosition {
  x: number;
  y: number;
}

export interface ZoneClassificationResult {
  zone: StoneZone;
  distanceToCenter: number;
  distanceToHouse: number;
  isTouchingHouse: boolean;
}

/**
 * Calculates the distance from a stone position to the center of the house (tee line center)
 * @param x - X coordinate of stone center
 * @param y - Y coordinate of stone center
 * @returns Distance in centimeters
 */
export function calculateDistanceToCenter(x: number, y: number): number {
  const centerX = SHEET_WIDTH / 2;
  const teeY = VIEW_TOP_OFFSET;

  return Math.sqrt(
    Math.pow(x - centerX, 2) + Math.pow(y - teeY, 2)
  );
}

/**
 * Calculates the distance from a stone's edge to the outer ring of the house
 * @param x - X coordinate of stone center
 * @param y - Y coordinate of stone center
 * @returns Distance in centimeters (negative if inside house, positive if outside)
 */
export function calculateDistanceToHouse(x: number, y: number): number {
  const distToCenter = calculateDistanceToCenter(x, y);
  // Distance from stone edge to house outer ring
  // If stone is touching house: 0
  // If stone is inside house: negative value
  // If stone is outside house: positive value
  return distToCenter - STONE_RADIUS - HOUSE_RADIUS_12;
}

/**
 * Checks if a stone is touching or inside the house
 * @param x - X coordinate of stone center
 * @param y - Y coordinate of stone center
 * @returns true if stone is touching or inside the house
 */
export function isTouchingHouse(x: number, y: number): boolean {
  const distToCenter = calculateDistanceToCenter(x, y);
  return distToCenter <= (HOUSE_RADIUS_12 + STONE_RADIUS);
}

/**
 * Classifies a stone into one of three zones based on its position
 *
 * Zone definitions:
 * - House Zone: Stone is touching or inside the 12ft house circle
 * - Near House Zone: Stone is NOT touching house, but within 1.5m (150cm) of the outer ring
 * - Guard Zone: Any other position (typically between hog line and top of house)
 *
 * @param x - X coordinate of stone center
 * @param y - Y coordinate of stone center
 * @returns ZoneClassificationResult with zone and measurements
 */
export function classifyStoneZone(x: number, y: number): ZoneClassificationResult {
  const distToCenter = calculateDistanceToCenter(x, y);
  const distToHouse = calculateDistanceToHouse(x, y);
  const touchingHouse = isTouchingHouse(x, y);

  let zone: StoneZone;

  if (touchingHouse) {
    // Stone is touching or inside the house
    zone = 'house';
  } else if (distToCenter <= (HOUSE_RADIUS_12 + STONE_RADIUS + 150)) {
    // Stone is within 150cm (1.5m) of the outer ring but not touching
    zone = 'near-house';
  } else {
    // All other positions (typically guard zone between hog line and house)
    zone = 'guard';
  }

  return {
    zone,
    distanceToCenter: distToCenter,
    distanceToHouse: distToHouse,
    isTouchingHouse: touchingHouse,
  };
}

/**
 * Helper function to get just the zone classification without additional data
 * @param x - X coordinate of stone center
 * @param y - Y coordinate of stone center
 * @returns StoneZone ('house', 'near-house', or 'guard')
 */
export function getStoneZone(x: number, y: number): StoneZone {
  return classifyStoneZone(x, y).zone;
}
