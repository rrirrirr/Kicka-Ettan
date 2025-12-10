import { StonePosition, BannedZone } from '../types/game-types';
import {
    SHEET_WIDTH,
    STONE_RADIUS,
    VIEW_TOP_OFFSET,
    HOG_LINE_OFFSET,
    HOG_LINE_WIDTH,
    BACK_LINE_OFFSET
} from './constants';
import {
    isStoneFullyInsideBanZone,
    isStoneOverlappingBanZone,
    pushStoneOutOfBanZone,
    isPositionWithinBounds
} from './banZoneUtils';

export const resolveCollisions = (
    currentIndex: number,
    currentX: number,
    currentY: number,
    allStones: StonePosition[]
) => {
    const MIN_DISTANCE = STONE_RADIUS * 2;
    let resolvedX = currentX;
    let resolvedY = currentY;

    // Iterative collision resolution
    for (let i = 0; i < 3; i++) { // Limit iterations to prevent infinite loops
        let collisionFound = false;

        allStones.forEach(otherStone => {
            if (otherStone.index === currentIndex || !otherStone.placed) return;

            const dx = resolvedX - otherStone.x;
            const dy = resolvedY - otherStone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < MIN_DISTANCE) {
                collisionFound = true;
                // Calculate push vector
                let nx = dx / distance;
                let ny = dy / distance;

                // Handle exact overlap
                if (distance === 0) {
                    nx = Math.random() * 2 - 1; // Random direction
                    ny = Math.random() * 2 - 1;
                    const len = Math.sqrt(nx * nx + ny * ny);
                    nx /= len;
                    ny /= len;
                }

                // Move dropped stone to just touch the other stone (no gap)
                resolvedX = otherStone.x + nx * MIN_DISTANCE;
                resolvedY = otherStone.y + ny * MIN_DISTANCE;
            }
        });

        if (!collisionFound) break;
    }

    // Ensure we stay within bounds after collision resolution
    // Valid Y range:
    // Min: Hog Line bottom edge (VIEW_TOP_OFFSET - HOG_LINE_OFFSET + HOG_LINE_WIDTH/2)
    // Max: Back Line (VIEW_TOP_OFFSET + BACK_LINE_OFFSET)
    // We allow stones to touch/overlap the back line, so we clamp center to [minY + radius, maxY + radius]
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET; // Should be 0 if offsets match
    const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
    const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

    const minY = hogLineBottomEdge + STONE_RADIUS;
    const maxY = backLineY + STONE_RADIUS;

    resolvedX = Math.max(STONE_RADIUS, Math.min(SHEET_WIDTH - STONE_RADIUS, resolvedX));
    resolvedY = Math.max(minY, Math.min(maxY, resolvedY));

    return { x: resolvedX, y: resolvedY };
};

/**
 * Result of unified collision resolution
 */
export interface CollisionResolutionResult {
    x: number;
    y: number;
    /** True if stone should be reset to bar (fully inside ban zone) */
    resetToBar: boolean;
}

/**
 * Helper: Separate current stone from all other stones (stone-to-stone collision)
 * Returns the new position after pushing away from all overlapping stones
 */
const separateFromStones = (
    currentX: number,
    currentY: number,
    allStones: StonePosition[],
    currentIndex: number
): { x: number; y: number; collisionFound: boolean } => {
    const MIN_DISTANCE = STONE_RADIUS * 2;
    let resolvedX = currentX;
    let resolvedY = currentY;
    let collisionFound = false;

    allStones.forEach(otherStone => {
        if (otherStone.index === currentIndex || !otherStone.placed) return;

        const dx = resolvedX - otherStone.x;
        const dy = resolvedY - otherStone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MIN_DISTANCE) {
            collisionFound = true;
            // Calculate push vector
            let nx = dx / distance;
            let ny = dy / distance;

            // Handle exact overlap
            if (distance === 0) {
                // Use deterministic direction (up-left) instead of random for consistency
                nx = -0.707;
                ny = -0.707;
            }

            // Move dropped stone to just touch the other stone (no gap)
            resolvedX = otherStone.x + nx * MIN_DISTANCE;
            resolvedY = otherStone.y + ny * MIN_DISTANCE;
        }
    });

    return { x: resolvedX, y: resolvedY, collisionFound };
};

/**
 * Helper: Clamp position to valid sheet boundaries
 */
const clampToBoundaries = (x: number, y: number): { x: number; y: number } => {
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
    const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
    const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

    const minY = hogLineBottomEdge + STONE_RADIUS;
    const maxY = backLineY + STONE_RADIUS;

    const clampedX = Math.max(STONE_RADIUS, Math.min(SHEET_WIDTH - STONE_RADIUS, x));
    const clampedY = Math.max(minY, Math.min(maxY, y));

    return { x: clampedX, y: clampedY };
};

/**
 * Unified collision resolution that handles all collision types iteratively.
 * 
 * This resolves cascading collisions where:
 * - Stone pushed out of ban zone might overlap another stone
 * - Stone pushed by another stone might land in ban zone or out of bounds
 * 
 * Order of resolution per iteration:
 * 1. Stone-to-stone separation
 * 2. Ban zone push-out (check fully inside first)
 * 3. Boundary clamping
 * 
 * The loop continues until position stabilizes or max iterations reached.
 */
/**
 * Helper: Create a position key for tracking visited positions
 * Uses fixed precision to handle floating point comparisons
 */
const positionKey = (x: number, y: number): string => {
    return `${x.toFixed(2)},${y.toFixed(2)}`;
};

export const resolveAllCollisions = (
    currentIndex: number,
    currentX: number,
    currentY: number,
    allStones: StonePosition[],
    banZone: BannedZone | null | undefined
): CollisionResolutionResult => {
    const MAX_ITERATIONS = 10;
    let x = currentX;
    let y = currentY;

    // Track visited positions to detect oscillation
    const visitedPositions = new Set<string>();
    visitedPositions.add(positionKey(x, y));

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const prevX = x;
        const prevY = y;

        // 1. Stone-to-stone separation
        const stoneResult = separateFromStones(x, y, allStones, currentIndex);
        x = stoneResult.x;
        y = stoneResult.y;

        // 2. Check if fully inside ban zone (should reset to bar)
        if (isStoneFullyInsideBanZone(x, y, banZone)) {
            return { x, y, resetToBar: true };
        }

        // 3. Push out of ban zone if overlapping
        if (isStoneOverlappingBanZone(x, y, banZone)) {
            const pushed = pushStoneOutOfBanZone(x, y, banZone);
            x = pushed.x;
            y = pushed.y;
        }

        // 4. Clamp to boundaries
        const clamped = clampToBoundaries(x, y);
        x = clamped.x;
        y = clamped.y;

        // Check for convergence (position stabilized)
        if (x === prevX && y === prevY) {
            break;
        }

        // Check for oscillation (returning to a previously visited position)
        const currentKey = positionKey(x, y);
        if (visitedPositions.has(currentKey)) {
            // Oscillation detected - stone is stuck between constraints
            // Reset to bar to avoid invalid placement
            return { x, y, resetToBar: true };
        }
        visitedPositions.add(currentKey);
    }

    // Final validation: check if position is still in an invalid state
    // (still overlapping ban zone or out of bounds after max iterations)
    if (!isPositionWithinBounds(x, y)) {
        return { x, y, resetToBar: true };
    }

    // Check if still overlapping ban zone after all iterations
    if (isStoneOverlappingBanZone(x, y, banZone)) {
        return { x, y, resetToBar: true };
    }

    return { x, y, resetToBar: false };
};
