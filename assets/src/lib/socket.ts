import { Socket } from 'phoenix';
import { config } from '../config';

const PLAYER_ID_KEY = 'kicka_ettan_player_id';

let playerId = localStorage.getItem(PLAYER_ID_KEY);
if (!playerId) {
    playerId = crypto.randomUUID();
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
