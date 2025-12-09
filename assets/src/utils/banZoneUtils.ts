import { BannedZone } from '../types/game-types';
import {
    STONE_RADIUS,
    SHEET_WIDTH,
    VIEW_TOP_OFFSET,
    HOG_LINE_OFFSET,
    HOG_LINE_WIDTH,
    BACK_LINE_OFFSET,
} from './constants';

/**
 * Check if a stone position is within valid placement bounds
 */
export const isPositionWithinBounds = (
    x: number,
    y: number
): boolean => {
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
    const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
    const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;

    const minX = STONE_RADIUS;
    const maxX = SHEET_WIDTH - STONE_RADIUS;
    const minY = hogLineBottomEdge + STONE_RADIUS;
    const maxY = backLineY + STONE_RADIUS;

    return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

/**
 * Check if a stone overlaps (touches or intersects) a ban zone
 */
export const isStoneOverlappingBanZone = (
    stoneX: number,
    stoneY: number,
    banZone: BannedZone | null | undefined
): boolean => {
    if (!banZone) return false;

    const dx = stoneX - banZone.x;
    const dy = stoneY - banZone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Stone overlaps if distance between centers < stone_radius + ban_radius
    return distance < STONE_RADIUS + banZone.radius;
};

/**
 * Check if a stone is fully inside a ban zone (no part of the stone is outside)
 * This happens when: distance + stone_radius <= ban_radius
 */
export const isStoneFullyInsideBanZone = (
    stoneX: number,
    stoneY: number,
    banZone: BannedZone | null | undefined
): boolean => {
    if (!banZone) return false;

    const dx = stoneX - banZone.x;
    const dy = stoneY - banZone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Stone is fully inside if its furthest edge is still within the ban zone
    return distance + STONE_RADIUS <= banZone.radius;
};

/**
 * Push a stone out of a ban zone to just touch its edge
 * Returns the new position, or the original position if not overlapping
 */
export const pushStoneOutOfBanZone = (
    stoneX: number,
    stoneY: number,
    banZone: BannedZone | null | undefined
): { x: number; y: number } => {
    if (!banZone) return { x: stoneX, y: stoneY };

    const dx = stoneX - banZone.x;
    const dy = stoneY - banZone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If not overlapping, return original position
    if (distance >= STONE_RADIUS + banZone.radius) {
        return { x: stoneX, y: stoneY };
    }

    // Calculate direction from ban center to stone center
    let nx = dx / distance;
    let ny = dy / distance;

    // Handle case where stone is exactly at ban center
    if (distance === 0) {
        // Push in a random direction (or use up direction as default)
        nx = 0;
        ny = -1;
    }

    // Push stone so it just touches the ban zone edge
    // New distance = ban_radius + stone_radius
    const newDistance = banZone.radius + STONE_RADIUS;
    const newX = banZone.x + nx * newDistance;
    const newY = banZone.y + ny * newDistance;

    return { x: newX, y: newY };
};

/**
 * Adjust stone position based on ban zone:
 * - If fully inside: returns { pushed: false, resetToBar: true }
 * - If partially inside and pushed position is valid: returns { pushed: true, position: { x, y }, resetToBar: false }
 * - If partially inside but pushed position is out of bounds: returns { pushed: false, resetToBar: true }
 * - If not overlapping: returns { pushed: false, resetToBar: false, position: { x, y } }
 */
export const adjustStoneForBanZone = (
    stoneX: number,
    stoneY: number,
    banZone: BannedZone | null | undefined
): {
    pushed: boolean;
    resetToBar: boolean;
    position: { x: number; y: number };
} => {
    if (!banZone) {
        return { pushed: false, resetToBar: false, position: { x: stoneX, y: stoneY } };
    }

    // Check if fully inside (should reset to bar)
    if (isStoneFullyInsideBanZone(stoneX, stoneY, banZone)) {
        return { pushed: false, resetToBar: true, position: { x: stoneX, y: stoneY } };
    }

    // Check if overlapping (should push out)
    if (isStoneOverlappingBanZone(stoneX, stoneY, banZone)) {
        const newPos = pushStoneOutOfBanZone(stoneX, stoneY, banZone);

        // After pushing, check if the new position is within valid bounds
        if (!isPositionWithinBounds(newPos.x, newPos.y)) {
            // Pushed position is out of bounds - reset to bar
            return { pushed: false, resetToBar: true, position: { x: stoneX, y: stoneY } };
        }

        return { pushed: true, resetToBar: false, position: newPos };
    }

    // Not overlapping at all
    return { pushed: false, resetToBar: false, position: { x: stoneX, y: stoneY } };
};
