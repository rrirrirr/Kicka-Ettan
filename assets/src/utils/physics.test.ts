import { describe, it, expect } from 'vitest';
import { resolveCollisions } from './physics';
import { StonePosition } from '../types/game-types';
import { STONE_RADIUS, SHEET_WIDTH, VIEW_TOP_OFFSET, HOG_LINE_OFFSET, HOG_LINE_WIDTH, BACK_LINE_OFFSET } from './constants';

describe('resolveCollisions', () => {
    const mockStones: StonePosition[] = [
        { id: '1', index: 0, x: 100, y: 100, color: 'red', placed: true, rotation: 0 },
        { id: '2', index: 1, x: 200, y: 200, color: 'yellow', placed: true, rotation: 0 },
    ];

    it('should return same position if no collision', () => {
        const currentX = 300;
        const currentY = 300;
        const result = resolveCollisions(2, currentX, currentY, mockStones);

        expect(result).toEqual({ x: currentX, y: currentY });
    });

    it('should resolve collision when overlapping with another stone', () => {
        // Place a stone very close to stone 1 (at 100, 100)
        // Distance < STONE_RADIUS * 2
        const currentX = 100 + STONE_RADIUS;
        const currentY = 100; // Same Y, offset X

        const result = resolveCollisions(2, currentX, currentY, mockStones);

        // Should be pushed away to at least STONE_RADIUS * 2 distance
        const dx = result.x - mockStones[0].x;
        const dy = result.y - mockStones[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.01); // Allow small float error
    });

    it('should clamp position within sheet boundaries', () => {
        // Try to place outside left boundary
        const leftResult = resolveCollisions(2, -100, 500, mockStones);
        expect(leftResult.x).toBeGreaterThanOrEqual(STONE_RADIUS);

        // Try to place outside right boundary
        const rightResult = resolveCollisions(2, SHEET_WIDTH + 100, 500, mockStones);
        expect(rightResult.x).toBeLessThanOrEqual(SHEET_WIDTH - STONE_RADIUS);
    });

    it('should clamp position within Y boundaries (Hog line to Back line)', () => {
        const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
        const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
        const minY = hogLineBottomEdge + STONE_RADIUS;

        // Try to place above hog line
        const topResult = resolveCollisions(2, 100, 0, mockStones);
        expect(topResult.y).toBeGreaterThanOrEqual(minY);

        const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
        const maxY = backLineY + STONE_RADIUS;

        // Try to place below back line
        const bottomResult = resolveCollisions(2, 100, 9999, mockStones);
        expect(bottomResult.y).toBeLessThanOrEqual(maxY);
    });
});
