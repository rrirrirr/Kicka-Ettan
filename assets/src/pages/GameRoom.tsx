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
                    <h2 className="text-2xl font-bold text-icy-accent mb-4">Error</h2>
                    <p className="font-medium text-gray-700">{error}</p>
                    <a href="/" className="mt-6 inline-block text-icy-blue-medium font-bold hover:underline">Go Home</a>
                </Card>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-xl font-bold text-icy-blue-medium animate-pulse">Connecting...</p>
            </div>
        );
    }

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
                </header>

                <Card className="p-8 text-center flex flex-col items-center gap-6">
                    {/* Blind pick info */}
                    <div className="text-4xl font-black text-gray-900 lowercase tracking-tight">
                        Blind pick {gameState.stones_per_team}
                    </div>

                    {/* Team colors - bigger dots */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-600 lowercase font-outfit">you</span>
                            <div
                                className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-md"
                                style={{
                                    backgroundColor: gameState.team_colors?.red || "#cc0000",
                                }}
                            />
                        </div>
                        <span className="text-2xl font-bold text-gray-700">vs</span>
                        <div
                            className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-md"
                            style={{
                                backgroundColor: gameState.team_colors?.yellow || "#e6b800",
                            }}
                        />
                    </div>

                    {/* Waiting text with animated dots */}
                    <div className="text-xl text-gray-700 lowercase tracking-tight">
                        waiting for opponent
                        <span className="inline-block ml-1 animate-pulse">...</span>
                    </div>

                    {/* Dither animation */}
                    <div className="w-full rounded-xl overflow-hidden shadow-inner border border-gray-200">
                        <BayerDither
                            cellSize={8}
                            baseColor="#f5f5dc"
                            accentColor="#483d8b"
                            speed={0.015}
                        />
                    </div>

                    {/* Share button */}
                    <Button
                        onClick={handleShare}
                        size="xl"
                        className="w-full relative z-10"
                    >
                        <Share2 size={18} />
                        invite team
                    </Button>

                    {/* Leave lobby button */}
                    <Button
                        variant="ghost"
                        onClick={() => window.location.href = '/'}
                        className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 relative z-10 transition-colors duration-200"
                    >
                        <ArrowLeft size={18} />
                        leave lobby
                    </Button>

                    {/* Can't invite link */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const linkEl = document.getElementById('invite-link-bar');
                            if (linkEl) {
                                linkEl.classList.toggle('hidden');
                            }
                        }}
                        className="text-gray-500 hover:text-gray-700 underline h-auto p-1"
                    >
                        can't invite?
                    </Button>

                    {/* Hidden link bar - revealed when clicked */}
                    <div
                        id="invite-link-bar"
                        className="hidden w-full p-3 bg-gray-100 rounded-lg border border-gray-200"
                    >
                        <div className="text-xs text-gray-600 mb-2">
                            Share this link:
                        </div>
                        <div className="p-2 pl-4 bg-white rounded-lg border border-gray-300 font-mono text-sm text-gray-500 flex items-center justify-between gap-4">
                            <span className="truncate">{window.location.href}</span>
                            <Button
                                variant="icon"
                                onClick={copyInviteLink}
                                aria-label="Copy link"
                            >
                                {showCopiedToast ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Toast Notification */}
            {showCopiedToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="card-gradient backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-lavender-200 flex items-center gap-3">
                        <svg className="w-5 h-5 text-lavender-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-icy-black">Invite link copied to clipboard!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameRoom;
