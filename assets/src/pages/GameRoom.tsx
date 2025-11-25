import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChannel, getPlayerId } from '../lib/socket';
import CurlingGame from '../components/curling-game';
import GameTitle from '../components/GameTitle';
import { Share2, Copy, Check } from 'lucide-react';
import { saveGameToHistory } from '../lib/gameHistory';

interface Player {
    id: string;
    color: 'red' | 'yellow';
}

interface GameState {
    game_id: string;
    players: Player[];
    current_round: number;
    phase: string;
    stones: { red: any[], yellow: any[] };
    team_colors?: { red: string; yellow: string };
}

// Helper function to get readable color name from hex
const getColorName = (hexColor: string): string => {
    const colorMap: { [key: string]: string } = {
        '#FF0000': 'red',
        '#CC0000': 'red',        // Default red
        '#FFDD00': 'yellow',
        '#E6B800': 'yellow',     // Default yellow
        '#0066FF': 'blue',
        '#00CC00': 'green',
        '#FF8800': 'orange',
        '#9900FF': 'purple',
        '#FF00AA': 'pink',
        '#1A1A1A': 'black'
    };

    const upperHex = hexColor.toUpperCase();
    return colorMap[upperHex] || hexColor;
};

const GameRoom = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playerId] = useState(getPlayerId());
    const [showCopiedToast, setShowCopiedToast] = useState(false);

    const [channel, setChannel] = useState<any>(null);

    useEffect(() => {
        if (!gameId) return;

        const preferredColor = localStorage.getItem('kicka_ettan_preferred_color');
        const chan = getChannel(gameId, { color: preferredColor });
        setChannel(chan);

        chan.join()
            .receive('ok', (response) => {
                setGameState(response.game_state);
                saveGameToHistory(gameId);
            })
            .receive('error', (resp) => {
                setError(resp.reason || 'Failed to join game');
            });

        chan.on('game_state_update', (newState) => {
            setGameState(newState);
        });

        return () => {
            chan.leave();
        };
    }, [gameId]);

    const copyInviteLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 3000);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join my Curling Game!',
                    text: 'Click to join my game of Kicka Ettan!',
                    url: window.location.href,
                });
            } catch (err) {
                // Ignore abort errors
                if ((err as Error).name !== 'AbortError') {
                    copyInviteLink();
                }
            }
        } else {
            copyInviteLink();
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card-gradient backdrop-blur-sm p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border border-red-100">
                    <h2 className="text-2xl font-bold text-[var(--bauhaus-red)] mb-4">Error</h2>
                    <p className="font-medium text-gray-700">{error}</p>
                    <a href="/" className="mt-6 inline-block text-[var(--bauhaus-blue)] font-bold hover:underline">Go Home</a>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl font-bold text-[var(--bauhaus-blue)] animate-pulse">Connecting...</p>
            </div>
        );
    }

    const myPlayer = gameState.players.find(p => p.id === playerId);
    const isGameFull = gameState.players.length === 2;

    // If game is full/active, render full screen game
    if (isGameFull) {
        return (
            <div className="min-h-screen md:px-4 flex items-center md:justify-start justify-center">
                <CurlingGame
                    gameState={gameState}
                    playerId={playerId}
                    channel={channel}
                    onShare={handleShare}
                />
            </div>
        );
    }

    // Lobby View
    return (
        <div className="min-h-screen p-4">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-8 card-gradient backdrop-blur-md p-4 rounded-2xl shadow-lg gap-4">
                    <GameTitle size="small" />
                    <div className="flex gap-2 sm:gap-4 items-center">
                        <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[var(--bauhaus-yellow)]/20 text-[var(--bauhaus-yellow)] rounded-full border border-[var(--bauhaus-yellow)]/30 flex items-center">
                            <span className="font-bold text-[10px] sm:text-xs mr-1.5 sm:mr-2 uppercase tracking-wider text-gray-600">you:</span>
                            <span
                                className="font-bold lowercase"
                                style={{ color: gameState.team_colors?.[myPlayer?.color!] || (myPlayer?.color === 'red' ? '#D22730' : '#185494') }}
                            >
                                {myPlayer?.color && gameState.team_colors ? getColorName(gameState.team_colors[myPlayer.color]) : (myPlayer?.color || 'spectator')}
                            </span>
                        </div>
                        <button
                            onClick={handleShare}
                            className="bg-[var(--bauhaus-blue)] hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all font-bold text-sm lowercase tracking-tight flex items-center gap-2"
                        >
                            <Share2 size={16} />
                            <span className="hidden sm:inline">share</span>
                        </button>
                    </div>
                </header>

                <div className="card-gradient backdrop-blur-sm p-12 rounded-3xl shadow-2xl text-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-48 h-48 bg-[var(--bauhaus-red)] rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-[var(--bauhaus-blue)] rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>

                    <h2 className="text-3xl font-bold mb-6 text-gray-900 relative z-10 lowercase tracking-tighter">waiting for opponent...</h2>
                    <p className="mb-8 text-gray-600 font-medium relative z-10">Share the invite link with a friend to start playing.</p>
                    <div className="p-2 pl-4 bg-gray-50 rounded-xl border border-gray-100 font-mono text-sm text-gray-500 relative z-10 flex items-center justify-between gap-4">
                        <span className="truncate">{window.location.href}</span>
                        <button
                            onClick={copyInviteLink}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                            aria-label="Copy link"
                        >
                            {showCopiedToast ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="card-gradient backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-green-200 flex items-center gap-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-gray-800">Invite link copied to clipboard!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameRoom;
