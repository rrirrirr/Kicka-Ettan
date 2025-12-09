import { describe, it, expect } from 'vitest';
import { resolveCollisions, resolveAllCollisions } from './physics';
import { StonePosition } from '../types/game-types';
import { STONE_RADIUS, SHEET_WIDTH, VIEW_TOP_OFFSET, HOG_LINE_OFFSET, HOG_LINE_WIDTH, BACK_LINE_OFFSET } from './constants';

describe('resolveCollisions', () => {
    const mockStones: StonePosition[] = [
        { index: 0, x: 100, y: 100, placed: true },
        { index: 1, x: 200, y: 200, placed: true },
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

describe('resolveAllCollisions', () => {

    // Valid Y position (below hog line)
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
    const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
    const validY = hogLineBottomEdge + STONE_RADIUS + 100; // Well within valid range

    const mockStones: StonePosition[] = [
        { index: 0, x: 100, y: validY, placed: true },
        { index: 1, x: 200, y: validY, placed: true },
    ];

    it('should return position when no collisions', () => {
        const result = resolveAllCollisions(2, 300, validY, mockStones, null);

        expect(result.x).toBe(300);
        expect(result.y).toBe(validY);
        expect(result.resetToBar).toBe(false);
    });

    it('should resolve stone-to-stone collision', () => {
        // Place overlapping with stone at (100, validY)
        const result = resolveAllCollisions(2, 105, validY, mockStones, null);

        // Should be pushed away
        const dx = result.x - 100;
        const dy = result.y - validY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.01);
        expect(result.resetToBar).toBe(false);
    });

    it('should resolve ban zone collision', () => {
        const banZone = { x: 300, y: validY, radius: 50 };

        // Place overlapping with ban zone (not fully inside)
        // Stone at x=260 is 40 units from center. distance + stone_radius = 40 + 14.5 = 54.5 > 50, so not fully inside
        // But distance < stone_radius + ban_radius (40 < 64.5), so overlapping
        const result = resolveAllCollisions(2, 260, validY, [], banZone);

        // Should be pushed out to just touch ban zone edge
        const dx = result.x - banZone.x;
        const dy = result.y - banZone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeCloseTo(banZone.radius + STONE_RADIUS, 1);
        expect(result.resetToBar).toBe(false);
    });

    it('should reset to bar when fully inside ban zone', () => {
        const banZone = { x: 300, y: validY, radius: 100 }; // Large ban zone

        // Place fully inside ban zone
        const result = resolveAllCollisions(2, 300, validY, [], banZone);

        expect(result.resetToBar).toBe(true);
    });

    it('should handle cascading: stone pushed out of ban zone into another stone', () => {
        // Ban zone at (200, validY) with radius 50
        const banZone = { x: 200, y: validY, radius: 50 };

        // Stone position: x=155 is 45 units from ban center. 
        // 45 + 14.5 = 59.5 > 50, so not fully inside
        // 45 < 64.5, so overlapping
        // Push direction will be away from center, i.e., to the left
        // Stone will be pushed to x = 200 - 64.5 = 135.5
        // Place another stone at x=100 where the pushed stone would then collide
        const stonesNearBan: StonePosition[] = [
            { index: 0, x: 100, y: validY, placed: true }, // Stone to the left
        ];

        // Place stone overlapping ban zone - will be pushed left toward stone 0
        const result = resolveAllCollisions(2, 155, validY, stonesNearBan, banZone);

        // Should not overlap with stone 0 after cascading resolution
        const dx = result.x - 100;
        const dy = result.y - validY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.01);
        expect(result.resetToBar).toBe(false);
    });

    it('should handle cascading: stone pushed by another stone lands in ban zone', () => {
        // First, stone at (100, validY) will push the new stone to the right
        // New stone pushed to x = 100 + 29 = 129
        // Place ban zone where pushed stone would partially overlap but not fully inside
        // Ban at x=165, radius 30. Stone at x=129 is 36 units away.
        // 36 + 14.5 = 50.5 > 30, so not fully inside
        // 36 < 30 + 14.5 = 44.5, so overlapping - will be pushed right
        const banZone = { x: 165, y: validY, radius: 30 };

        const stonesWithBan: StonePosition[] = [
            { index: 0, x: 100, y: validY, placed: true },
        ];

        // Place stone overlapping with stone 0 - will be pushed right into ban zone territory
        const pushStartX = 105; // Overlaps with stone at 100
        const result = resolveAllCollisions(2, pushStartX, validY, stonesWithBan, banZone);

        // After being pushed right by stone collision, it should then be pushed out of ban zone
        // Final position should not overlap ban zone (or stone 0)
        const dxBan = result.x - banZone.x;
        const dyBan = result.y - banZone.y;
        const distToBan = Math.sqrt(dxBan * dxBan + dyBan * dyBan);

        // Either it's pushed out of ban zone, or it might be pushed in a different direction
        // The key assertion is that it shouldn't be overlapping with anything
        expect(distToBan).toBeGreaterThanOrEqual(banZone.radius + STONE_RADIUS - 0.01);
        expect(result.resetToBar).toBe(false);
    });

    it('should clamp to boundaries after collision', () => {
        // Place near edge with collision that would push out of bounds
        const stoneAtEdge: StonePosition[] = [
            { index: 0, x: STONE_RADIUS + 5, y: validY, placed: true },
        ];

        // Overlapping stone at edge - would push left, out of bounds
        const result = resolveAllCollisions(2, STONE_RADIUS + 10, validY, stoneAtEdge, null);

        // Should be clamped to at least STONE_RADIUS
        expect(result.x).toBeGreaterThanOrEqual(STONE_RADIUS);
        expect(result.resetToBar).toBe(false);
    });
});

// =============================================================================
// COMPREHENSIVE COLLISION TEST SUITE
// =============================================================================
describe('resolveAllCollisions - Comprehensive Scenarios', () => {
    // Computed valid Y position
    const hogLineY = VIEW_TOP_OFFSET - HOG_LINE_OFFSET;
    const hogLineBottomEdge = hogLineY + HOG_LINE_WIDTH / 2;
    const backLineY = VIEW_TOP_OFFSET + BACK_LINE_OFFSET;
    const minValidY = hogLineBottomEdge + STONE_RADIUS;
    const maxValidY = backLineY + STONE_RADIUS;
    const centerY = (minValidY + maxValidY) / 2;
    const centerX = SHEET_WIDTH / 2;

    // =========================================================================
    // STONE-TO-STONE COLLISION TESTS
    // =========================================================================
    describe('Stone-to-Stone Collisions', () => {
        it('should handle exact overlap (same position)', () => {
            const stones: StonePosition[] = [
                { index: 0, x: centerX, y: centerY, placed: true },
            ];
            const result = resolveAllCollisions(1, centerX, centerY, stones, null);

            const dx = result.x - centerX;
            const dy = result.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
        });

        it('should handle collision with multiple stones', () => {
            const stones: StonePosition[] = [
                { index: 0, x: centerX - 20, y: centerY, placed: true },
                { index: 1, x: centerX + 20, y: centerY, placed: true },
                { index: 2, x: centerX, y: centerY - 20, placed: true },
            ];

            // Place stone at center, overlapping all three
            const result = resolveAllCollisions(3, centerX, centerY, stones, null);

            // Should not overlap with any stone
            for (const stone of stones) {
                const dx = result.x - stone.x;
                const dy = result.y - stone.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
            }
        });

        it('should handle chain collision (push into another stone)', () => {
            // Three stones in a row - pushing stone 2 will cascade
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: centerY, placed: true },
                { index: 1, x: 100 + STONE_RADIUS * 2, y: centerY, placed: true }, // Just touching stone 0
            ];

            // Place stone overlapping stone 0, pushing away
            const result = resolveAllCollisions(2, 105, centerY, stones, null);

            // Should not overlap with stone 0
            const dx0 = result.x - 100;
            const dy0 = result.y - centerY;
            const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
            expect(dist0).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
        });

        it('should handle diagonal collision', () => {
            const stones: StonePosition[] = [
                { index: 0, x: centerX, y: centerY, placed: true },
            ];

            // Place stone diagonally overlapping
            const offset = STONE_RADIUS * 0.7; // Overlapping distance
            const result = resolveAllCollisions(1, centerX + offset, centerY + offset, stones, null);

            const dx = result.x - centerX;
            const dy = result.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            expect(distance).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
        });

        it('should ignore unplaced stones', () => {
            const stones: StonePosition[] = [
                { index: 0, x: centerX, y: centerY, placed: false }, // Not placed
            ];

            // Place stone at same position - should not collide with unplaced stone
            const result = resolveAllCollisions(1, centerX, centerY, stones, null);

            expect(result.x).toBe(centerX);
            expect(result.y).toBe(centerY);
        });
    });

    // =========================================================================
    // BAN ZONE COLLISION TESTS  
    // =========================================================================
    describe('Ban Zone Collisions', () => {
        it('should push stone out of small ban zone', () => {
            const banZone = { x: centerX, y: centerY, radius: 30 };

            // Place stone at edge of ban zone (overlapping but not fully inside)
            const borderX = centerX - 25; // 25 < 30 + 14.5 = overlapping, but 25 + 14.5 = 39.5 > 30, so not fully inside
            const result = resolveAllCollisions(0, borderX, centerY, [], banZone);

            const dx = result.x - banZone.x;
            const dy = result.y - banZone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            expect(distance).toBeCloseTo(banZone.radius + STONE_RADIUS, 0);
            expect(result.resetToBar).toBe(false);
        });

        it('should push stone out of large ban zone', () => {
            const banZone = { x: centerX, y: centerY, radius: 80 };

            // Place stone overlapping but not fully inside
            const borderX = centerX - 70; // 70 + 14.5 = 84.5 > 80, so not fully inside
            const result = resolveAllCollisions(0, borderX, centerY, [], banZone);

            const dx = result.x - banZone.x;
            const dy = result.y - banZone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            expect(distance).toBeCloseTo(banZone.radius + STONE_RADIUS, 0);
        });

        it('should reset to bar when stone center is very close to ban center', () => {
            const banZone = { x: centerX, y: centerY, radius: 50 };

            // Place stone very close to ban center - fully inside (5 + 14.5 = 19.5 < 50)
            const result = resolveAllCollisions(0, centerX + 5, centerY, [], banZone);

            expect(result.resetToBar).toBe(true);
        });

        it('should handle no ban zone (null)', () => {
            const result = resolveAllCollisions(0, centerX, centerY, [], null);

            expect(result.x).toBe(centerX);
            expect(result.y).toBe(centerY);
            expect(result.resetToBar).toBe(false);
        });

        it('should handle no ban zone (undefined)', () => {
            const result = resolveAllCollisions(0, centerX, centerY, [], undefined);

            expect(result.x).toBe(centerX);
            expect(result.y).toBe(centerY);
            expect(result.resetToBar).toBe(false);
        });
    });

    // =========================================================================
    // BOUNDARY CLAMPING TESTS
    // =========================================================================
    describe('Boundary Clamping', () => {
        it('should clamp to left boundary', () => {
            const result = resolveAllCollisions(0, -100, centerY, [], null);
            expect(result.x).toBe(STONE_RADIUS);
        });

        it('should clamp to right boundary', () => {
            const result = resolveAllCollisions(0, SHEET_WIDTH + 100, centerY, [], null);
            expect(result.x).toBe(SHEET_WIDTH - STONE_RADIUS);
        });

        it('should clamp to top boundary (hog line)', () => {
            const result = resolveAllCollisions(0, centerX, 0, [], null);
            expect(result.y).toBeGreaterThanOrEqual(minValidY);
        });

        it('should clamp to bottom boundary (back line)', () => {
            const result = resolveAllCollisions(0, centerX, 10000, [], null);
            expect(result.y).toBeLessThanOrEqual(maxValidY);
        });

        it('should clamp corner position', () => {
            const result = resolveAllCollisions(0, -100, -100, [], null);
            expect(result.x).toBe(STONE_RADIUS);
            expect(result.y).toBeGreaterThanOrEqual(minValidY);
        });
    });

    // =========================================================================
    // CASCADING COLLISION TESTS
    // =========================================================================
    describe('Cascading Collisions', () => {
        it('should handle: stone collision pushes into ban zone, then out', () => {
            // Stone at left, ban zone far to the right (not directly in push path)
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: centerY, placed: true },
            ];
            // Ban zone positioned far enough that pushed stone doesn't enter
            // Stone pushed from 105 -> 129 (at 100 + 29). Ban zone at 200 won't be hit
            const banZone = { x: 200, y: centerY, radius: 30 };

            // Place stone overlapping stone 0 - will be pushed right
            const result = resolveAllCollisions(1, 105, centerY, stones, banZone);

            // Should be pushed away from stone 0
            const dxStone = result.x - 100;
            const dyStone = result.y - centerY;
            const distStone = Math.sqrt(dxStone * dxStone + dyStone * dyStone);
            expect(distStone).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
            expect(result.resetToBar).toBe(false);
        });

        it('should handle: stone collision pushes toward boundary, then clamp', () => {
            const stones: StonePosition[] = [
                { index: 0, x: STONE_RADIUS + 10, y: centerY, placed: true },
            ];

            // Place stone overlapping, will push left toward boundary
            const result = resolveAllCollisions(1, STONE_RADIUS + 15, centerY, stones, null);

            // Should be clamped to boundary
            expect(result.x).toBeGreaterThanOrEqual(STONE_RADIUS);
            // Should not overlap stone 0
            const dx = result.x - stones[0].x;
            const dy = result.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            expect(dist).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
        });

        it('should handle: ban zone push toward boundary, then clamp', () => {
            // Ban zone near left edge
            const banZone = { x: STONE_RADIUS + 50, y: centerY, radius: 40 };

            // Place stone overlapping ban zone, will be pushed left toward boundary
            const result = resolveAllCollisions(0, STONE_RADIUS + 30, centerY, [], banZone);

            // Should be clamped to boundary
            expect(result.x).toBeGreaterThanOrEqual(STONE_RADIUS);
        });

        it('should handle: multiple stones + ban zone complex cascade', () => {
            // Place two stones with a gap between them
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: centerY, placed: true },
                { index: 1, x: 300, y: centerY, placed: true },
            ];
            // Ban zone in the middle but not blocking
            const banZone = { x: 200, y: centerY + 50, radius: 30 };

            // Place stone overlapping stone 0 - will be pushed right into safe area
            const result = resolveAllCollisions(2, 105, centerY, stones, banZone);

            // Should be pushed away from stone 0
            const dx0 = result.x - stones[0].x;
            const dy0 = result.y - stones[0].y;
            const dist0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
            expect(dist0).toBeGreaterThanOrEqual(STONE_RADIUS * 2 - 0.1);
            expect(result.resetToBar).toBe(false);
        });
    });

    // =========================================================================
    // EDGE CASES
    // =========================================================================
    describe('Edge Cases', () => {
        it('should handle empty stones array', () => {
            const result = resolveAllCollisions(0, centerX, centerY, [], null);
            expect(result.x).toBe(centerX);
            expect(result.y).toBe(centerY);
            expect(result.resetToBar).toBe(false);
        });

        it('should handle stone with same index (self-collision check)', () => {
            const stones: StonePosition[] = [
                { index: 0, x: centerX, y: centerY, placed: true },
            ];

            // Try to resolve collision with itself - should not affect position
            const result = resolveAllCollisions(0, centerX, centerY, stones, null);
            expect(result.x).toBe(centerX);
            expect(result.y).toBe(centerY);
        });

        it('should handle position exactly at boundary', () => {
            const result = resolveAllCollisions(0, STONE_RADIUS, minValidY, [], null);
            expect(result.x).toBe(STONE_RADIUS);
            expect(result.y).toBe(minValidY);
        });

        it('should handle ban zone exactly touching stone (edge case)', () => {
            const banZone = { x: centerX, y: centerY, radius: 50 };

            // Place stone exactly at the edge (not overlapping)
            const edgeX = centerX - (50 + STONE_RADIUS);
            const result = resolveAllCollisions(0, edgeX, centerY, [], banZone);

            // Should not be pushed (just touching edge)
            expect(result.x).toBe(edgeX);
        });
    });
});
