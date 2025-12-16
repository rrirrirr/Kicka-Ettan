import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChannel, getPlayerId } from '../lib/socket';
import CurlingGame from '../components/CurlingGame';
import GameTitle from '../components/GameTitle';
import { Share2, Copy, Check, ArrowLeft, BookOpen } from 'lucide-react';
import { saveGameToHistory } from '../lib/gameHistory';
import { Button, Card, Dialog } from '../components/ui';
import { MultiColorBayerDither } from '../components/ui/MultiColorBayerDither';

import { GameState } from '../types/game-types';



import { GAME_TYPES } from '../data/gameTypes';

const GameRoom = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playerId] = useState(getPlayerId());
    const [showCopiedToast, setShowCopiedToast] = useState(false);
    const [showGameInfo, setShowGameInfo] = useState(false);

    const [channel, setChannel] = useState<any>(null);

    useEffect(() => {
        if (!gameId) return;

        const preferredColor = localStorage.getItem('kicka_ettan_preferred_color');
        const chan = getChannel(gameId, { color: preferredColor });
        setChannel(chan);

        chan.join()
            .receive('ok', (response) => {
                setGameState(response.game_state);
                // Save game type from server response to ensure history is accurate
                saveGameToHistory(gameId, response.game_state.game_type);
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

    const gameType = GAME_TYPES.find(gt => gt.id === gameState.game_type);

    // Lobby View
    return (
        <div className="min-h-screen p-4">
            <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto min-h-[80vh]">
                <div className="card-gradient backdrop-blur-md p-6 rounded-3xl shadow-2xl w-full text-center relative overflow-hidden z-10 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3 opacity-5 blur-3xl"></div>

                    {/* Header - Outside Dither */}
                    <div className="mb-6 relative z-10">
                        <GameTitle size="small" />
                    </div>

                    {/* Dithered Game Card */}
                    <div
                        className="w-full relative overflow-hidden rounded-2xl mb-6 border-[3px] border-icy-black bg-white"
                        style={{ boxShadow: '0px 6px 0px var(--icy-black)' }}
                    >
                        {/* Dither Background Layer */}
                        <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-100/80 via-purple-100/80 to-pink-100/80">
                            {/* Dither with gradient mask to fade out top */}
                            <div
                                className="w-full h-full opacity-30"
                                style={{
                                    maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)'
                                }}
                            >
                                <MultiColorBayerDither speed={0.015} cellSize={6} />
                            </div>
                        </div>

                        {/* Content Layer */}
                        <div className="relative z-10 p-6 flex flex-col items-center text-center gap-5">
                            {/* Game Type info */}
                            <div className="text-3xl font-black text-gray-900 lowercase tracking-tight leading-none mt-2">
                                {gameType ? gameType.name : 'unknown game'}
                            </div>

                            {/* Game Settings */}
                            {gameState.settings && (
                                <div className="text-icy-black text-sm font-bold lowercase tracking-wide mb-1">
                                    {gameState.settings.total_rounds !== undefined && gameState.settings.total_rounds !== 0 && (
                                        <span>{gameState.settings.total_rounds} rounds</span>
                                    )}
                                    {gameState.settings.total_rounds !== undefined && gameState.settings.total_rounds !== 0 && gameState.settings.stones_per_team !== undefined && (
                                        <span className="mx-1.5 text-icy-black/40">•</span>
                                    )}
                                    {gameState.settings.stones_per_team !== undefined && (
                                        <span>{gameState.settings.stones_per_team} {gameState.settings.stones_per_team === 1 ? 'stone' : 'stones'}</span>
                                    )}
                                    {gameState.settings.ban_circle_radius !== undefined && (
                                        <>
                                            <span className="mx-1.5 text-icy-black/40">•</span>
                                            <span>
                                                {(() => {
                                                    // Convert numeric value back to label using game type schema
                                                    const banSetting = gameType?.settingsSchema?.ban_circle_radius;
                                                    if (banSetting?.optionValues) {
                                                        const entry = Object.entries(banSetting.optionValues).find(
                                                            ([, val]) => val === gameState.settings?.ban_circle_radius
                                                        );
                                                        if (entry) return `${entry[0]} ban ring`;
                                                    }
                                                    return `${gameState.settings.ban_circle_radius} ban ring`;
                                                })()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Game Type Short Description */}
                            {gameType?.shortDescription && (
                                <div className="text-icy-black/70 text-sm font-medium lowercase tracking-wide -mt-2 mb-2 max-w-[85%] mx-auto">
                                    {gameType.shortDescription}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowGameInfo(true);
                                        }}
                                        className="ml-1.5 font-bold hover:text-icy-black underline underline-offset-2 decoration-2 decoration-icy-black/20 hover:decoration-icy-black/50 transition-all cursor-pointer relative z-50 pointer-events-auto"
                                    >
                                        more
                                    </button>
                                </div>
                            )}

                            {/* Game Info Dialog */}
                            <Dialog
                                isOpen={showGameInfo}
                                onClose={() => setShowGameInfo(false)}
                                title={gameType?.name || 'Game Info'}
                                variant="info"
                                headerIcon={<BookOpen size={48} className="text-icy-blue-medium" />}
                            >
                                <div className="space-y-4">
                                    <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                                        {gameType?.longDescription}
                                    </div>

                                </div>
                            </Dialog>

                            {/* Team colors - bigger dots */}
                            <div className="flex items-center gap-6 w-fit mx-auto mt-4 mb-2">
                                {/* Player Dot - Flat Effect */}
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center relative transition-transform hover:scale-105"
                                    style={{
                                        backgroundColor: gameState.team_colors?.red || "#cc0000",
                                        border: '3px solid var(--icy-black)',
                                    }}
                                >
                                    <span className="text-xl font-bold text-white lowercase font-outfit z-10 tracking-tight drop-shadow-md pb-1">you</span>
                                </div>

                                <span className="text-3xl font-black text-icy-black italic opacity-60">vs</span>

                                {/* Opponent Dot - Flat Effect */}
                                <div
                                    className="w-20 h-20 rounded-full relative transition-transform hover:scale-105"
                                    style={{
                                        backgroundColor: gameState.team_colors?.yellow || "#e6b800",
                                        border: '3px solid var(--icy-black)',
                                    }}
                                >
                                </div>
                            </div>

                            {/* Waiting text with animated dots */}
                            <div className="text-lg text-gray-700 lowercase tracking-tight font-medium">
                                waiting for opponent
                                <span className="inline-block ml-0.5 animate-pulse">...</span>
                            </div>

                            {/* Share button - Primary Action */}
                            <Button
                                onClick={handleShare}
                                size="lg"
                                shape="pill"
                                className="w-full relative z-10 bg-icy-black hover:bg-icy-black/90 text-white shadow-sm hover:shadow-md border-0 animate-glow mt-2"
                            >
                                <Share2 size={16} className="text-white" />
                                invite team
                            </Button>
                        </div>
                    </div>

                    {/* Footer Actions - Outside Dither */}
                    <div className="w-full space-y-3 flex flex-col items-center relative z-10">
                        {/* Leave lobby button */}
                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/'}
                            className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50/50 relative z-10 transition-colors duration-200 h-10"
                        >
                            <ArrowLeft size={16} />
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
                            className="text-gray-400 hover:text-gray-600 underline h-auto p-0 text-[10px]"
                        >
                            can't invite?
                        </Button>

                        {/* Hidden link bar - revealed when clicked */}
                        <div
                            id="invite-link-bar"
                            className="hidden w-full p-2 bg-white/50 backdrop-blur-sm rounded-lg border border-white/50 shadow-inner mt-2"
                        >
                            <div className="text-[10px] text-gray-500 mb-1 font-medium text-left">
                                Share this link:
                            </div>
                            <div className="p-1.5 pl-3 bg-white/80 rounded-md border border-gray-200 font-mono text-[10px] text-gray-500 flex items-center justify-between gap-2">
                                <span className="truncate">{window.location.href}</span>
                                <Button
                                    variant="icon"
                                    onClick={copyInviteLink}
                                    aria-label="Copy link"
                                    className="hover:bg-gray-100 rounded p-1 w-6 h-6"
                                >
                                    {showCopiedToast ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
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
