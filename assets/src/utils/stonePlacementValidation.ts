import {
  SHEET_WIDTH,
  STONE_RADIUS,
  HOG_LINE_OFFSET,
  BACK_LINE_OFFSET,
  VIEW_TOP_OFFSET,
  HOG_LINE_WIDTH,
} from './constants';

export interface ValidationResult {
  isValid: boolean;
  clampedX: number;
  clampedY: number;
  violations: string[];
}

/**
 * Validates and clamps stone placement coordinates
 * @param x - X coordinate in logical units (0 to SHEET_WIDTH)
 * @param y - Y coordinate in logical units (SVG coordinate system)
 * @returns ValidationResult with clamped coordinates and any violations
 */
export function validateStonePlacement(x: number, y: number): ValidationResult {
  const violations: string[] = [];
  let clampedX = x;
  let clampedY = y;

  // Calculate boundary positions
  const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
  const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

  // Y boundaries: stone center must be between hog line (bottom edge) and back line (accounting for radius)
  // The hog line has width, so we use the bottom edge (center + half width) as the boundary
  const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
  const minY = hogLineBottomEdge + STONE_RADIUS;
  const maxY = backLineY + STONE_RADIUS;

  // X boundaries: stone center must not exceed sidelines (accounting for radius)
  const minX = STONE_RADIUS;
  const maxX = SHEET_WIDTH - STONE_RADIUS;

  // Check violations before clamping
  if (x < minX) {
    violations.push('Stone placement violates left sideline boundary');
  }
  if (x > maxX) {
    violations.push('Stone placement violates right sideline boundary');
  }
  if (y < minY) {
    violations.push('Stone placement violates hog line boundary (too far up)');
  }
  if (y > maxY) {
    violations.push('Stone placement violates back line boundary (too far down)');
  }

  // Clamp to valid range
  clampedX = Math.max(minX, Math.min(maxX, x));
  clampedY = Math.max(minY, Math.min(maxY, y));

  return {
    isValid: violations.length === 0,
    clampedX,
    clampedY,
    violations,
  };
}

/**
 * Checks if a stone position is valid (within all boundaries)
 * @param x - X coordinate in logical units
 * @param y - Y coordinate in logical units
 * @returns true if position is valid, false otherwise
 */
export function isValidStonePlacement(x: number, y: number): boolean {
  const result = validateStonePlacement(x, y);
  return result.isValid;
}

/**
 * Gets the valid placement boundaries
 * @returns Object containing min/max X and Y values for valid stone placement
 */
export function getPlacementBoundaries() {
  const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
  const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
  const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;

  return {
    minX: STONE_RADIUS,
    maxX: SHEET_WIDTH - STONE_RADIUS,
    minY: hogLineBottomEdge + STONE_RADIUS,
    maxY: backLineY + STONE_RADIUS,
    hogLineY,
    backLineY,
  };
}
