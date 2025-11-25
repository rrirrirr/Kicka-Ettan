import { useState } from 'react';
import CurlingGame from '../components/curling-game';
import { Channel } from 'phoenix';

const Demo = () => {
    // Mock Player ID
    const playerId = "demo-player-1";

    // State to track phase
    const [phase, setPhase] = useState<'placement' | 'combined'>('placement');
    const [redStones, setRedStones] = useState<Array<{ x: number; y: number }>>([]);

    // Mock Game State
    const mockGameState = {
        game_id: "demo-game-123",
        current_round: 1,
        total_rounds: 3,
        stones_per_team: 5,
        phase: phase,
        players: [
            { id: "demo-player-1", color: "red" },
            { id: "demo-player-2", color: "yellow" }
        ],
        stones: {
            red: redStones,
            yellow: [
                // Add some dummy opponent stones for visual testing
                { x: 220, y: 680 },
                { x: 250, y: 720 }
            ]
        },
        player_ready: {
            "demo-player-1": phase === 'combined',
            "demo-player-2": phase === 'combined'
        },
        ready_for_next_round: {}
    };

    // Mock Channel
    const mockChannel = {
        push: (event: string, payload: any) => {
            if (event === "confirm_placement") {
                // Collect stone placements
                setRedStones(prev => [...prev, payload.position]);
            }

            if (event === "confirm_placement") {
                setTimeout(() => {
                    setPhase('combined');
                }, 500);
            }
        },
        on: (_event: string, _callback: (data: any) => void) => {
        },
        join: () => ({
            receive: (status: string, callback: () => void) => {
                if (status === 'ok') callback();
                return { receive: () => { } };
            }
        })
    } as unknown as Channel;

    return (
        <div className="min-h-screen bg-gray-100">
            <CurlingGame
                gameState={mockGameState}
                playerId={playerId}
                channel={mockChannel}
            />
        </div>
    );
};

export default Demo;
