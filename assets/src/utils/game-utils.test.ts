import { describe, it, expect } from 'vitest';
import { calculateDistance, areOverlapping } from './game-utils';

describe('game-utils', () => {
    describe('calculateDistance', () => {
        it('should calculate correct distance between two points', () => {
            const p1 = { x: 0, y: 0 };
            const p2 = { x: 3, y: 4 };
            expect(calculateDistance(p1, p2)).toBe(5);
        });

        it('should return 0 for same points', () => {
            const p1 = { x: 10, y: 10 };
            expect(calculateDistance(p1, p1)).toBe(0);
        });
    });

    describe('areOverlapping', () => {
        it('should return true when stones are close enough', () => {
            const s1 = { position: { x: 0, y: 0 } };
            const s2 = { position: { x: 3, y: 0 } }; // Distance 3, minDistance is 5
            expect(areOverlapping(s1, s2)).toBe(true);
        });

        it('should return false when stones are far apart', () => {
            const s1 = { position: { x: 0, y: 0 } };
            const s2 = { position: { x: 10, y: 0 } }; // Distance 10, minDistance is 5
            expect(areOverlapping(s1, s2)).toBe(false);
        });
    });
});
