import { Socket } from 'phoenix';
import { config } from '../config';

const PLAYER_ID_KEY = 'kicka_ettan_player_id';

// Polyfill for browsers that don't support crypto.randomUUID
const generateUUID = () => {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

let playerId = localStorage.getItem(PLAYER_ID_KEY);
if (!playerId) {
    playerId = generateUUID();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
}

export const getPlayerId = () => playerId!;

export const socket = new Socket(config.wsUrl, {
    params: { player_id: playerId }
});

socket.connect();

export const getChannel = (gameId: string, params: object = {}) => {
    return socket.channel(`game:${gameId}`, params);
};
