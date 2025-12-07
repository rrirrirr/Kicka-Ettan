import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChannel, getPlayerId } from '../lib/socket';
import CurlingGame from '../components/CurlingGame';
import GameTitle from '../components/GameTitle';
import { Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import { saveGameToHistory } from '../lib/gameHistory';
import { Button, Card, BayerDither } from '../components/ui';

import { GameState } from '../types/game-types';



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
                <Card className="p-8 text-center max-w-md w-full border border-red-100">
                    <h2 className="text-2xl font-bold text-[var(--icy-accent)] mb-4">Error</h2>
                    <p className="font-medium text-gray-700">{error}</p>
                    <a href="/" className="mt-6 inline-block text-[var(--icy-blue-medium)] font-bold hover:underline">Go Home</a>
                </Card>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl font-bold text-[var(--icy-blue-medium)] animate-pulse">Connecting...</p>
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
            <div className="max-w-md mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-8 card-gradient backdrop-blur-md p-4 rounded-2xl shadow-lg gap-4">
                    <GameTitle size="small" />
                    <div className="flex gap-2 sm:gap-4 items-center">
                        <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-2">
                            {/* My Dot */}
                            <div
                                className="w-6 h-6 rounded-full shadow-inner border border-black/10 relative"
                                style={{ backgroundColor: gameState.team_colors?.[myPlayer?.color!] || (myPlayer?.color === 'red' ? '#D22730' : '#185494') }}
                            >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/10 to-transparent" />
                            </div>

                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">vs</span>

                            {/* Opponent Dot */}
                            <div
                                className="w-6 h-6 rounded-full shadow-inner border border-black/10 relative"
                                style={{ backgroundColor: gameState.team_colors?.[myPlayer?.color === 'red' ? 'yellow' : 'red'] || (myPlayer?.color === 'red' ? '#185494' : '#D22730') }}
                            >
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/10 to-transparent" />
                            </div>
                        </div>

                    </div>
                </header>

                <Card className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-4 text-[var(--icy-accent)] lowercase tracking-tighter">waiting for opponent...</h2>

                    {/* Grabbable dither widget */}
                    <div className="mb-6 rounded-xl overflow-hidden shadow-inner border border-gray-200">
                        <BayerDither
                            cellSize={8}
                            baseColor="#f5f5dc"
                            accentColor="#483d8b"
                            speed={0.015}
                        />
                    </div>

                    <p className="mb-6 text-gray-600 font-medium text-sm">Share the invite link with a friend to start playing.</p>
                    <div className="p-2 pl-4 bg-gray-50 rounded-xl border border-gray-100 font-mono text-sm text-gray-500 relative z-10 flex items-center justify-between gap-4 mb-6">
                        <span className="truncate">{window.location.href}</span>
                        <Button
                            variant="icon"
                            onClick={copyInviteLink}
                            aria-label="Copy link"
                        >
                            {showCopiedToast ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                        </Button>
                    </div>

                    <Button
                        onClick={handleShare}
                        className="w-full py-3 text-base relative z-10"
                    >
                        <Share2 size={18} />
                        invite team
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = '/'}
                        className="w-full mt-4 text-gray-500 hover:text-red-600 hover:bg-red-50 relative z-10 transition-colors duration-200"
                    >
                        <ArrowLeft size={18} />
                        leave lobby
                    </Button>
                </Card>
            </div>

            {/* Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="card-gradient backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-lavender-200 flex items-center gap-3">
                        <svg className="w-5 h-5 text-lavender-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-[var(--icy-black)]">Invite link copied to clipboard!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameRoom;
