/**
 * Integration tests for placement storage in CurlingGame
 * 
 * These tests verify the localStorage save/load behavior for ban and stone placements,
 * testing the integration between placementStorage utility and CurlingGame component logic.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    saveStonePlacements,
    saveBanPlacements,
    loadPlacements,
    clearPlacements,
} from './placementStorage';
import { StonePosition } from '../types/game-types';
import { BanPosition } from '../components/BanSelectionBar';

// Mock localStorage with full implementation tracking
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        getStore: () => store,
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((i: number) => Object.keys(store)[i] || null),
    };
};

describe('Placement Storage Integration', () => {
    let localStorageMock: ReturnType<typeof createLocalStorageMock>;

    beforeEach(() => {
        localStorageMock = createLocalStorageMock();
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-12-11T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Simulated Component Flow: Stone Placements', () => {
        const gameId = 'game-abc-123';
        const round = 1;

        it('should simulate initial mount - no saved data returns null', () => {
            // Simulate: Component mounts, checks for saved placements
            const saved = loadPlacements(gameId, round, 'placement');

            expect(saved).toBeNull();
        });

        it('should simulate placing stones and auto-save', () => {
            // Simulate: User places first stone
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
                { index: 1, x: 0, y: 0, placed: false },
                { index: 2, x: 0, y: 0, placed: false },
            ];

            saveStonePlacements(gameId, round, stones);

            // Verify persistence
            expect(localStorageMock.setItem).toHaveBeenCalled();

            // Simulate: User places second stone
            const updatedStones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
                { index: 1, x: 200, y: 350, placed: true },
                { index: 2, x: 0, y: 0, placed: false },
            ];

            saveStonePlacements(gameId, round, updatedStones);

            // Simulate: Page reload - load from localStorage
            const restored = loadPlacements(gameId, round, 'placement');

            expect(restored).not.toBeNull();
            expect(restored?.stones).toEqual(updatedStones);
        });

        it('should simulate confirm placement clears storage', () => {
            // Simulate: User has placed stones
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
                { index: 1, x: 200, y: 350, placed: true },
            ];

            saveStonePlacements(gameId, round, stones);

            // Verify saved
            expect(loadPlacements(gameId, round, 'placement')).not.toBeNull();

            // Simulate: User clicks confirm - server acknowledges
            clearPlacements(gameId);

            // Verify cleared
            expect(loadPlacements(gameId, round, 'placement')).toBeNull();
        });

        it('should not restore placements for different round', () => {
            // Save for round 1
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
            ];
            saveStonePlacements(gameId, 1, stones);

            // Try to load for round 2 (new round started)
            const restored = loadPlacements(gameId, 2, 'placement');

            expect(restored).toBeNull();
        });

        it('should not restore placements for different game', () => {
            // Save for game A
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
            ];
            saveStonePlacements('game-A', round, stones);

            // Try to load for game B (user started new game)
            const restored = loadPlacements('game-B', round, 'placement');

            expect(restored).toBeNull();
        });
    });

    describe('Simulated Component Flow: Ban Placements', () => {
        const gameId = 'game-banpick-456';
        const round = 1;

        it('should simulate ban phase - save and restore ban', () => {
            // Simulate: User places ban circle
            const bans: BanPosition[] = [
                { index: 0, x: 225, y: 150, placed: true },
            ];

            saveBanPlacements(gameId, round, bans);

            // Simulate: Page reload
            const restored = loadPlacements(gameId, round, 'ban');

            expect(restored).not.toBeNull();
            expect(restored?.bans).toEqual(bans);
            expect(restored?.phase).toBe('ban');
        });

        it('should not restore ban data when phase changes to placement', () => {
            // Save ban during ban phase
            const bans: BanPosition[] = [
                { index: 0, x: 225, y: 150, placed: true },
            ];
            saveBanPlacements(gameId, round, bans);

            // After ban is confirmed, phase changes to placement
            // Try to load as placement phase - should not match
            const restored = loadPlacements(gameId, round, 'placement');

            expect(restored).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle storage quota exceeded gracefully', () => {
            // Simulate localStorage.setItem throwing QuotaExceededError
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            localStorageMock.setItem.mockImplementationOnce(() => {
                throw new Error('QuotaExceededError');
            });

            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
            ];

            // Should not throw
            expect(() => saveStonePlacements('game-1', 1, stones)).not.toThrow();
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should handle localStorage being disabled', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            // Mock all operations to throw (like in incognito/private mode)
            localStorageMock.getItem.mockImplementationOnce(() => {
                throw new Error('SecurityError');
            });

            // Should not throw
            expect(() => loadPlacements('game-1', 1, 'placement')).not.toThrow();

            consoleSpy.mockRestore();
        });

        it('should preserve stone metadata like resetCount', () => {
            const gameId = 'game-test';
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true, resetCount: 2 },
                { index: 1, x: 200, y: 350, placed: true, resetCount: 0 },
            ];

            saveStonePlacements(gameId, 1, stones);
            const restored = loadPlacements(gameId, 1, 'placement');

            expect(restored?.stones?.[0].resetCount).toBe(2);
            expect(restored?.stones?.[1].resetCount).toBe(0);
        });
    });

    describe('Lifecycle Simulation', () => {
        it('should simulate full game lifecycle with page reloads', () => {
            const gameId = 'full-lifecycle-game';

            // === Round 1: Ban Phase ===
            // User places ban
            const bans: BanPosition[] = [
                { index: 0, x: 225, y: 150, placed: true },
            ];
            saveBanPlacements(gameId, 1, bans);

            // Page reload - should restore
            expect(loadPlacements(gameId, 1, 'ban')?.bans).toEqual(bans);

            // User confirms ban - clear storage
            clearPlacements(gameId);

            // === Round 1: Placement Phase ===
            // User places stones
            const stones: StonePosition[] = [
                { index: 0, x: 100, y: 300, placed: true },
                { index: 1, x: 150, y: 350, placed: true },
            ];
            saveStonePlacements(gameId, 1, stones);

            // Page reload - should restore
            expect(loadPlacements(gameId, 1, 'placement')?.stones).toEqual(stones);

            // User confirms placement - clear storage
            clearPlacements(gameId);

            // === Round 2: Ban Phase ===
            // New round starts, old data shouldn't interfere
            const round2Bans: BanPosition[] = [
                { index: 0, x: 300, y: 200, placed: true },
            ];
            saveBanPlacements(gameId, 2, round2Bans);

            // Should get round 2 data, not round 1
            const restored = loadPlacements(gameId, 2, 'ban');
            expect(restored?.bans).toEqual(round2Bans);
            expect(restored?.round).toBe(2);
        });
    });
});
