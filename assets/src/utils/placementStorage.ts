/**
 * Local Storage Utility for Placement Persistence
 * 
 * Saves and restores ban/stone placements so users can reload or rejoin
 * without losing their work-in-progress placements.
 */

import { StonePosition } from '../types/game-types';
import { BanPosition } from '../components/BanSelectionBar';

const STORAGE_KEY_PREFIX = 'kicka-ettan:placements:';

export interface PlacementStorageData {
    gameId: string;
    round: number;
    phase: 'ban' | 'placement';
    stones?: StonePosition[];
    bans?: BanPosition[];
    timestamp: number;
}

/**
 * Get the storage key for a given game
 */
function getStorageKey(gameId: string): string {
    return `${STORAGE_KEY_PREFIX}${gameId}`;
}

/**
 * Save stone placements during placement phase
 */
export function saveStonePlacements(
    gameId: string,
    round: number,
    stones: StonePosition[]
): void {
    const data: PlacementStorageData = {
        gameId,
        round,
        phase: 'placement',
        stones,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(getStorageKey(gameId), JSON.stringify(data));
    } catch (e) {
        // localStorage might be full or disabled - fail silently
        console.warn('Failed to save stone placements to localStorage:', e);
    }
}

/**
 * Save ban placements during ban phase
 */
export function saveBanPlacements(
    gameId: string,
    round: number,
    bans: BanPosition[]
): void {
    const data: PlacementStorageData = {
        gameId,
        round,
        phase: 'ban',
        bans,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(getStorageKey(gameId), JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save ban placements to localStorage:', e);
    }
}

/**
 * Load placements if they match the current game state.
 * Returns null if no valid data or if game state doesn't match.
 */
export function loadPlacements(
    gameId: string,
    round: number,
    phase: 'ban' | 'placement'
): PlacementStorageData | null {
    try {
        const raw = localStorage.getItem(getStorageKey(gameId));
        if (!raw) {
            return null;
        }

        const data: PlacementStorageData = JSON.parse(raw);

        // Validate that game state matches
        if (data.gameId !== gameId) {
            return null;
        }
        if (data.round !== round) {
            return null;
        }
        if (data.phase !== phase) {
            return null;
        }

        // Optional: Expire after 24 hours
        const age = Date.now() - data.timestamp;
        const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
        if (age > MAX_AGE) {
            clearPlacements(gameId);
            return null;
        }

        return data;
    } catch (e) {
        // JSON parsing might fail if data is corrupted
        console.warn('Failed to load placements from localStorage:', e);
        // Clean up corrupted data
        clearPlacements(gameId);
        return null;
    }
}

/**
 * Clear stored placements for a game
 */
export function clearPlacements(gameId: string): void {
    try {
        localStorage.removeItem(getStorageKey(gameId));
    } catch (e) {
        console.warn('Failed to clear placements from localStorage:', e);
    }
}
