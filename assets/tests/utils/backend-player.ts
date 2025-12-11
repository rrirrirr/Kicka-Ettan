
import { Socket } from 'phoenix';
import WebSocket from 'ws';

export class BackendPlayer {
    socket: Socket;
    channel: any; // Type as 'any' or proper Channel type if available
    playerId: string;
    gameId: string;
    gameUrl: string;

    constructor(gameId: string, playerId: string, gameUrl: string) {
        this.gameId = gameId;
        this.playerId = playerId;
        this.gameUrl = gameUrl;

        // Pass the WebSocket constructor from 'ws' package to Phoenix Socket
        this.socket = new Socket(`${gameUrl}/socket`, {
            params: {
                player_id: playerId,
                game_id: gameId
            },
            transport: WebSocket
        });
    }

    async connect() {
        return new Promise<void>((resolve, reject) => {
            this.socket.onOpen(() => resolve());
            this.socket.onError((err: any) => reject(err));
            this.socket.connect();
        });
    }

    async joinGame() {
        this.channel = this.socket.channel(`game:${this.gameId}`, {
            player_id: this.playerId
        });

        return new Promise<void>((resolve, reject) => {
            this.channel.join()
                .receive("ok", (resp: any) => resolve())
                .receive("error", (resp: any) => reject(resp));
        });
    }

    leave() {
        if (this.channel) this.channel.leave();
        if (this.socket) this.socket.disconnect();
    }

    send(event: string, payload: any = {}) {
        return new Promise<void>((resolve, reject) => {
            this.channel.push(event, payload)
                .receive("ok", () => resolve())
                .receive("error", (reasons: any) => reject(reasons))
                .receive("timeout", () => reject("networking issue..."));
        });
    }

    // Determine readiness based on the game state received from the channel
    async setReady() {
        return this.send("confirm_placement", {});
    }

    async placeStone(index: number, x: number, y: number) {
        return this.send("place_stone", {
            stone_index: index,
            position: { x, y }
        });
    }

    async moveStone(idx: number, x: number, y: number) {
        // In many implementations, 'place_stone' might handle moves or there might be a specific event
        // Checking actual implementation might be needed, assuming standard "place_stone" or update
        // Based on usual game logic, we might need to know the stone index if we are moving existing ones
        // or if we are placing new ones. 
        // For now, let's assume we can just send "place_stone" if that's the event name.
        // If there is a separate "move_stone" event or similar, we will add it.
    }

    async placeBan(x: number, y: number) {
        return this.send("place_ban", { position: { x, y } });
    }

    async confirmBan() {
        return this.send("confirm_ban", {});
    }

    on(event: string, callback: (payload: any) => void) {
        this.channel.on(event, callback);
    }
}
