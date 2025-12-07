import { useState, useEffect } from 'react';
import CurlingGame from '../components/CurlingGame';
import { Channel } from 'phoenix';
import { GameState } from '../types/game-types';
import { LoadingGame } from '../components/ui/LoadingGame';

const Demo = () => {
    // Mock Player ID
    const playerId = "demo-player-1";

    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading for demo purposes
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000); // Show loader for 2 seconds

        return () => clearTimeout(timer);
    }, []);

    // State to track phase and round
    const [phase, setPhase] = useState<'placement' | 'combined'>('placement');
    const [redStones, setRedStones] = useState<Array<{ x: number; y: number }>>([]);
    const [currentRound, setCurrentRound] = useState(1);

    // Mock Game State
    const mockGameState = {
        game_id: "demo-game-123",
        current_round: currentRound,
        total_rounds: 3,
        stones_per_team: 5,
        phase: phase,
        players: [
            { id: "demo-player-1", color: "red" },
            { id: "demo-player-2", color: "yellow" }
        ],
        stones: {
            red: redStones,
            yellow: []
        },
        player_ready: {
            "demo-player-1": phase === 'combined',
            "demo-player-2": phase === 'combined'
        },
        ready_for_next_round: {},
        scores: { red: 0, yellow: 0 },
        status: "playing",
        current_turn: "red"
    } as unknown as GameState;

    // Mock Channel
    const mockChannel = {
        push: (event: string, payload: any) => {
            if (event === "place_stone") {
                // Collect stone placements
                setRedStones(prev => [...prev, payload.position]);
                return {
                    receive: (status: string, callback: (data?: any) => void) => {
                        if (status === 'ok') setTimeout(() => callback(), 0);
                        return { receive: () => ({ receive: () => ({}) }) };
                    }
                };
            }

            if (event === "confirm_placement") {
                setTimeout(() => {
                    setPhase('combined');
                }, 100);
                return {
                    receive: (status: string, callback: (data?: any) => void) => {
                        if (status === 'ok') setTimeout(() => callback(), 0);
                        return { receive: () => ({ receive: () => ({}) }) };
                    }
                };
            }

            if (event === "ready_for_next_round") {
                // Reset to placement phase and clear stones, increment round
                setTimeout(() => {
                    setPhase('placement');
                    setRedStones([]);
                    setCurrentRound(prev => prev + 1);
                }, 100);
                return {
                    receive: (status: string, callback: (data?: any) => void) => {
                        if (status === 'ok') setTimeout(() => callback(), 0);
                        return { receive: () => ({ receive: () => ({}) }) };
                    }
                };
            }

            // Default return for other events
            return {
                receive: (status: string, callback: (data?: any) => void) => {
                    if (status === 'ok') setTimeout(() => callback(), 0);
                    return { receive: () => ({ receive: () => ({}) }) };
                }
            };
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
        <div className="min-h-screen md:px-4 flex items-center md:justify-start justify-center">
            {isLoading ? (
                <div className="w-full h-screen flex items-center justify-center">
                    <LoadingGame />
                </div>
            ) : (
                <CurlingGame
                    gameState={mockGameState}
                    playerId={playerId}
                    channel={mockChannel}
                />
            )}
        </div>
    );
};

export default Demo;
