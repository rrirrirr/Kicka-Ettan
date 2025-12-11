import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    saveStonePlacements,
    saveBanPlacements,
    loadPlacements,
    clearPlacements,
} from './placementStorage';
import { StonePosition } from '../types/game-types';
import { BanPosition } from '../components/BanSelectionBar';

// Mock localStorage
const localStorageMock = (() => {
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
        get length() {
            return Object.keys(store).length;
        },
        key: vi.fn((i: number) => Object.keys(store)[i] || null),
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
});

describe('placementStorage', () => {
    const mockStones: StonePosition[] = [
        { index: 0, x: 100, y: 200, placed: true },
        { index: 1, x: 150, y: 250, placed: true },
        { index: 2, x: 0, y: 0, placed: false },
    ];

    const mockBans: BanPosition[] = [
        { index: 0, x: 200, y: 300, placed: true },
    ];

    const gameId = 'test-game-123';
    const round = 1;

    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('saveStonePlacements', () => {
        it('should save stone placements to localStorage', () => {
            saveStonePlacements(gameId, round, mockStones);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                `kicka-ettan:placements:${gameId}`,
                expect.stringContaining('"phase":"placement"')
            );
        });

        it('should save all stone data', () => {
            saveStonePlacements(gameId, round, mockStones);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.stones).toEqual(mockStones);
            expect(savedData.round).toBe(round);
            expect(savedData.gameId).toBe(gameId);
        });
    });

    describe('saveBanPlacements', () => {
        it('should save ban placements to localStorage', () => {
            saveBanPlacements(gameId, round, mockBans);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                `kicka-ettan:placements:${gameId}`,
                expect.stringContaining('"phase":"ban"')
            );
        });

        it('should save all ban data', () => {
            saveBanPlacements(gameId, round, mockBans);

            const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
            expect(savedData.bans).toEqual(mockBans);
            expect(savedData.round).toBe(round);
            expect(savedData.gameId).toBe(gameId);
        });
    });

    describe('loadPlacements', () => {
        it('should load placements when game state matches (stones)', () => {
            saveStonePlacements(gameId, round, mockStones);

            const result = loadPlacements(gameId, round, 'placement');

            expect(result).not.toBeNull();
            expect(result?.stones).toEqual(mockStones);
            expect(result?.phase).toBe('placement');
        });

        it('should load placements when game state matches (bans)', () => {
            saveBanPlacements(gameId, round, mockBans);

            const result = loadPlacements(gameId, round, 'ban');

            expect(result).not.toBeNull();
            expect(result?.bans).toEqual(mockBans);
            expect(result?.phase).toBe('ban');
        });

        it('should return null when game_id does not match', () => {
            saveStonePlacements(gameId, round, mockStones);

            const result = loadPlacements('different-game', round, 'placement');

            expect(result).toBeNull();
        });

        it('should return null when round does not match', () => {
            saveStonePlacements(gameId, round, mockStones);

            const result = loadPlacements(gameId, 2, 'placement');

            expect(result).toBeNull();
        });

        it('should return null when phase does not match', () => {
            saveStonePlacements(gameId, round, mockStones);

            const result = loadPlacements(gameId, round, 'ban');

            expect(result).toBeNull();
        });

        it('should return null when no data exists', () => {
            const result = loadPlacements(gameId, round, 'placement');

            expect(result).toBeNull();
        });

        it('should return null and clear corrupted data', () => {
            // Save corrupted JSON
            localStorageMock.setItem(`kicka-ettan:placements:${gameId}`, 'not valid json');

            const result = loadPlacements(gameId, round, 'placement');

            expect(result).toBeNull();
            expect(localStorageMock.removeItem).toHaveBeenCalledWith(
                `kicka-ettan:placements:${gameId}`
            );
        });

        it('should return null for expired data (more than 24 hours old)', () => {
            // Save with old timestamp
            const oldData = {
                gameId,
                round,
                phase: 'placement',
                stones: mockStones,
                timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
            };
            localStorageMock.setItem(
                `kicka-ettan:placements:${gameId}`,
                JSON.stringify(oldData)
            );

            const result = loadPlacements(gameId, round, 'placement');

            expect(result).toBeNull();
        });
    });

    describe('clearPlacements', () => {
        it('should remove placements from localStorage', () => {
            saveStonePlacements(gameId, round, mockStones);

            clearPlacements(gameId);

            expect(localStorageMock.removeItem).toHaveBeenCalledWith(
                `kicka-ettan:placements:${gameId}`
            );
        });

        it('should not throw when clearing non-existent data', () => {
            expect(() => clearPlacements('nonexistent-game')).not.toThrow();
        });
    });

    describe('round-trip', () => {
        it('should save and load stones correctly', () => {
            saveStonePlacements(gameId, round, mockStones);
            const result = loadPlacements(gameId, round, 'placement');

            expect(result?.stones).toEqual(mockStones);
        });

        it('should save and load bans correctly', () => {
            saveBanPlacements(gameId, round, mockBans);
            const result = loadPlacements(gameId, round, 'ban');

            expect(result?.bans).toEqual(mockBans);
        });

        it('should update existing placements when saved again', () => {
            const updatedStones: StonePosition[] = [
                { index: 0, x: 300, y: 400, placed: true },
            ];

            saveStonePlacements(gameId, round, mockStones);
            saveStonePlacements(gameId, round, updatedStones);

            const result = loadPlacements(gameId, round, 'placement');
            expect(result?.stones).toEqual(updatedStones);
        });
    });
});
