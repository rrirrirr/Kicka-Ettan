import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { getChannel, getPlayerId } from '../lib/socket';
import CurlingGame from '../components/CurlingGame';
import { Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import { saveGameToHistory } from '../lib/gameHistory';
import { Button, Card } from '../components/ui';
import { MultiColorBayerDither } from '../components/ui/MultiColorBayerDither';
import { GameState } from '../types/game-types';
import { GAME_TYPES } from '../data/gameTypes';

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
                if ((err as Error).name !== 'AbortError') {
                    copyInviteLink();
                }
            }
        } else {
            copyInviteLink();
        }
    };

    const getPlayerDisplayName = (player: any) => {
        if (!player) return 'waiting...';
        return player.name || `Player ${player.number || '?'}`;
    };

    // Error state
    if (error) {
        return createPortal(
            <div className="fixed inset-0 min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 z-50">
                <Card className="p-8 text-center max-w-md w-full border border-red-100">
                    <h2 className="text-2xl font-bold text-icy-accent mb-4">Error</h2>
                    <p className="font-medium text-gray-700">{error}</p>
                    <a href="/" className="mt-6 inline-block text-icy-blue-medium font-bold hover:underline">Go Home</a>
                </Card>
            </div>,
            document.body
        );
    }

    // Loading state
    if (!gameState) {
        return createPortal(
            <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-50">
                <p className="text-xl font-bold text-icy-blue-medium animate-pulse">Connecting...</p>
            </div>,
            document.body
        );
    }

    const isGameFull = gameState.players.length === 2;

    // Full game - render via portal
    if (isGameFull) {
        return createPortal(
            <div className="fixed inset-0 min-h-screen md:px-4 flex items-center md:justify-start justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-50">
                <CurlingGame
                    gameState={gameState}
                    playerId={playerId}
                    channel={channel}
                    onShare={handleShare}
                />
            </div>,
            document.body
        );
    }

    const gameType = GAME_TYPES.find(gt => gt.id === gameState.game_type);

    // Lobby View
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Single card - no outer container */}
            <div
                className="w-full max-w-md relative overflow-hidden rounded-2xl border-[3px] border-icy-black bg-white z-10"
                style={{ boxShadow: '0px 6px 0px var(--icy-black)' }}
            >
                {/* Dither Background Layer */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-100/80 via-purple-100/80 to-pink-100/80">
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
                <div className="relative z-10 p-6 flex flex-col items-center text-center gap-4">
                    <div className="text-3xl font-black text-gray-900 lowercase tracking-tight leading-none mt-2">
                        {gameType ? gameType.name : 'unknown game'}
                    </div>
                    {gameType && (
                        <p className="text-gray-500 text-sm max-w-xs mt-1">
                            {gameType.shortDescription}
                        </p>
                    )}

                    {/* Game specifics */}
                    <div className="flex flex-wrap justify-center gap-3 text-xs font-semibold text-gray-600 lowercase">
                        {gameState.settings?.stones_per_team && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full">
                                {gameState.settings.stones_per_team} stones/team
                            </span>
                        )}
                        {(gameState.settings?.total_rounds ?? 0) > 0 && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full">
                                {gameState.settings?.total_rounds} rounds
                            </span>
                        )}
                        {gameState.settings?.ban_size && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full">
                                {gameState.settings.ban_size} ban
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-8 mt-4">
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full border-2 border-gray-800 shadow-md ${gameState.players[0] ? 'ring-2 ring-icy-accent ring-offset-2 ring-offset-white' : ''}`}
                                style={{ backgroundColor: gameState.settings?.team1_color || '#D22730' }}
                            />
                            <span className="text-xs font-bold text-gray-700 lowercase">
                                {gameState.players[0] ? getPlayerDisplayName(gameState.players[0]) : 'waiting...'}
                            </span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full border-2 border-gray-800 shadow-md ${gameState.players[1] ? 'ring-2 ring-icy-accent ring-offset-2 ring-offset-white' : ''}`}
                                style={{ backgroundColor: gameState.settings?.team2_color || '#185494' }}
                            />
                            <span className="text-xs font-bold text-gray-700 lowercase">
                                {gameState.players[1] ? getPlayerDisplayName(gameState.players[1]) : 'waiting...'}
                            </span>
                        </div>
                    </div>

                    {gameState.players.length < 2 && (
                        <div className="text-gray-500 text-sm font-medium lowercase tracking-wide animate-pulse">
                            waiting for opponent<span className="animate-pulse">...</span>
                        </div>
                    )}

                    <Button
                        onClick={handleShare}
                        size="lg"
                        shape="pill"
                        className="w-full bg-icy-black hover:bg-icy-black/90 text-white animate-glow mt-2"
                    >
                        <Share2 size={16} />
                        invite team
                    </Button>

                    {/* Can't invite */}
                    <div className="text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => document.getElementById('invite-link-bar')?.classList.toggle('hidden')}
                            className="text-gray-400 hover:text-gray-600 underline h-auto p-0 text-[10px]"
                        >
                            can't invite?
                        </Button>

                        <div id="invite-link-bar" className="hidden w-full p-2 bg-white/80 rounded-lg border border-gray-200 mt-2">
                            <div className="text-[10px] text-gray-500 mb-1 text-left">Share this link:</div>
                            <div className="p-1.5 pl-3 bg-white rounded-md border border-gray-200 font-mono text-[10px] text-gray-500 flex items-center justify-between gap-2">
                                <span className="truncate">{window.location.href}</span>
                                <Button variant="icon" onClick={copyInviteLink} className="w-6 h-6">
                                    {showCopiedToast ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Leave lobby */}
                    <div className="w-full mt-2">
                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/'}
                            className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50/50 h-10"
                        >
                            <ArrowLeft size={16} />
                            leave lobby
                        </Button>
                    </div>
                </div>
            </div>

            {showCopiedToast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
                    <div className="card-gradient backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-lavender-200 flex items-center gap-3">
                        <svg className="w-5 h-5 text-lavender-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium text-icy-black">Invite link copied!</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameRoom;
