import { StonePosition } from '../types/game-types';
import {
    SHEET_WIDTH,
    STONE_RADIUS,
    VIEW_TOP_OFFSET,
    HOG_LINE_OFFSET,
    HOG_LINE_WIDTH,
    BACK_LINE_OFFSET
} from './constants';

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
