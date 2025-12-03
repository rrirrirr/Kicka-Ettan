import {
  SHEET_WIDTH,
  VIEW_TOP_OFFSET,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  HOUSE_RADIUS_8,
  HOUSE_RADIUS_4,
  BUTTON_RADIUS,
} from './constants';

export interface RingDistanceResult {
  closestRingRadius: number;
  distanceToRingEdge: number;
  isOverlapping: boolean;
  overlapPercentage: number;
}

/**
 * Calculate the distance from a stone to the closest ring edge
 * @param stoneX - X position of stone center (cm)
 * @param stoneY - Y position of stone center (cm)
 * @returns Information about the closest ring and distance to it
 */
export function calculateClosestRingDistance(
  stoneX: number,
  stoneY: number
): RingDistanceResult {
  const centerLineX = SHEET_WIDTH / 2;
  const teeLineY = VIEW_TOP_OFFSET;

  // Calculate distance from stone center to house center
  const deltaX = stoneX - centerLineX;
  const deltaY = stoneY - teeLineY;
  const distToCenterPoint = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

  // Define ring radii
  const ringRadii = [HOUSE_RADIUS_12, HOUSE_RADIUS_8, HOUSE_RADIUS_4, BUTTON_RADIUS];

  // Find closest ring edge
  let minDistToRingEdge = Infinity;
  let closestRingRadius = 0;

  for (const r of ringRadii) {
    const dist = Math.abs(distToCenterPoint - r) - STONE_RADIUS;
    if (Math.abs(dist) < Math.abs(minDistToRingEdge)) {
      minDistToRingEdge = dist;
      closestRingRadius = r;
    }
  }

  // Special handling for button overlap detection
  // Button is "overlapping" if stone center is within button radius + stone radius
  const isButtonOverlap = closestRingRadius === BUTTON_RADIUS && distToCenterPoint <= (BUTTON_RADIUS + STONE_RADIUS);
  const isOverlapping = minDistToRingEdge < 0 || isButtonOverlap;

  // Calculate overlap percentage
  let overlapPercentage = 0;
  if (isButtonOverlap) {
    // Special handling for button: percentage based on how close to center
    const maxDist = BUTTON_RADIUS + STONE_RADIUS;
    overlapPercentage = Math.max(0, Math.min(100, Math.round((1 - (distToCenterPoint / maxDist)) * 100)));
  } else if (minDistToRingEdge < 0) {
    // For other rings: percentage based on overlap distance
    const overlapDistance = Math.abs(minDistToRingEdge);
    const maxOverlap = STONE_RADIUS;
    overlapPercentage = Math.min(100, Math.round((overlapDistance / maxOverlap) * 100));
  }

  return {
    closestRingRadius,
    distanceToRingEdge: minDistToRingEdge,
    isOverlapping,
    overlapPercentage,
  };
}
