export interface SavedGame {
    gameId: string;
    timestamp: number;
}

const STORAGE_KEY = 'kicka_ettan_history';
const MAX_HISTORY = 10;

export const saveGameToHistory = (gameId: string) => {
    try {
        const history = getGameHistory();

        // Remove existing entry if present to move it to top
        const filtered = history.filter(game => game.gameId !== gameId);

        // Add new entry to top
        const newEntry: SavedGame = {
            gameId,
            timestamp: Date.now()
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
