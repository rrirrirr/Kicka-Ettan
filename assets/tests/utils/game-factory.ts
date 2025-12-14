
import { APIRequestContext, Page } from '@playwright/test';
import { BackendPlayer } from './backend-player';

// Define GameOptions interface matching your backend params
export interface GameOptions {
    total_rounds?: number;
    stones_per_team?: number;
    ban_circle_radius?: number;
    game_type?: string;
    team1_color?: string;
    team2_color?: string;
}

export class GameFactory {

    static async createGame(request: APIRequestContext, options: GameOptions = {}): Promise<string> {
        const response = await request.post('/api/games', {
            data: options
        });

        if (!response.ok()) {
            const text = await response.text();
            throw new Error(`Failed to create game: ${response.status()} ${text}`);
        }

        const json = await response.json();
        return json.game_id;
    }

    // Helper to start a game: create it, navigate page, and join as P2 (backend)
    static async startGame(
        page: Page,
        request: APIRequestContext,
        gameType: string = 'standard',
        settings: GameOptions = {}
    ): Promise<{ gameId: string, p2: BackendPlayer }> {

        // 1. Create game via API
        const mergedSettings = { ...settings, game_type: gameType };
        const gameId = await this.createGame(request, mergedSettings);

        // 2. Navigate browser (P1) to the game
        await page.goto(`/game/${gameId}`);

        // 2b. Wait for P1 to be connected (lobby is visible with "waiting for opponent")
        // This ensures P1's socket is subscribed to the channel before P2 joins
        await page.waitForSelector('text=waiting for opponent', { timeout: 10000 });

        // 3. Setup P2 (Backend Player)
        // We need a unique ID for P2.
        const p2Id = `p2-${Date.now()}`;
        // Assuming the URL from the page context, or we can construct it
        // The baseURL in playwright config should be http://localhost:4002 for E2E
        // So we can use that for the websocket connection
        const baseURL = request.storageState().then(() => '').catch(() => 'http://localhost:4002'); // fallback or get from config

        // Ideally pass the full URL if needed, but for socket it's usually just host:port
        const p2 = new BackendPlayer(gameId, p2Id, 'ws://127.0.0.1:4002');

        await p2.connect();
        await p2.joinGame();

        return { gameId, p2 };
    }
}
