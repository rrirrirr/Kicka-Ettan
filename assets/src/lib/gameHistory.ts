export interface SavedGame {
    gameId: string;
    gameTypeId?: string;
    timestamp: number | string; // Support both old number and new string format
}

const STORAGE_KEY = 'kicka_ettan_history';
const MAX_HISTORY = 10;

export const saveGameToHistory = (gameId: string, gameTypeId?: string) => {
    try {
        const history = getGameHistory();

        // Check if we already have this game in history to preserve metadata
        const existingEntry = history.find(game => game.gameId === gameId);

        // Remove existing entry if present to move it to top
        const filtered = history.filter(game => game.gameId !== gameId);

        // Determine effective gameTypeId:
        // 1. Use passed gameTypeId if available
        // 2. Use existing entry's gameTypeId if available
        // 3. Fallback to undefined
        const effectiveGameTypeId = gameTypeId || existingEntry?.gameTypeId;

        // Add new entry to top
        const newEntry: SavedGame = {
            gameId,
            gameTypeId: effectiveGameTypeId,
            timestamp: new Date().toISOString()
        };

        const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save game history', e);
    }
};

export const getGameHistory = (): SavedGame[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (e) {
        console.error('Failed to load game history', e);
        return [];
    }
};

export const getLastGame = (): SavedGame | null => {
    const history = getGameHistory();
    return history.length > 0 ? history[0] : null;
};
