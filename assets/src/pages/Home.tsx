import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { getLastGame, getGameHistory, SavedGame } from '../lib/gameHistory';
import { History, ChevronDown, ChevronUp, Play, Info, X } from 'lucide-react';

import { config } from '../config';

const Home = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stonesPerPlayer, setStonesPerPlayer] = useState(2);
    const [team1Color, setTeam1Color] = useState('#ff0000');
    const [team2Color, setTeam2Color] = useState('#ffdd00');
    const [showColorPicker, setShowColorPicker] = useState<'team1' | 'team2' | null>(null);
    const [lastGame, setLastGame] = useState<SavedGame | null>(null);
    const [history, setHistory] = useState<SavedGame[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    useEffect(() => {
        setLastGame(getLastGame());
        setHistory(getGameHistory());
    }, []);

    const PRESET_COLORS = [
        '#ff0000', // Red
        '#ffdd00', // Yellow
        '#0066ff', // Blue
        '#00cc00', // Green
        '#ff8800', // Orange
        '#9900ff', // Purple
        '#ff00aa', // Pink
        '#1a1a1a'  // Black
    ];

    const handleStartGame = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${config.apiUrl}/api/games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    stones_per_team: stonesPerPlayer,
                    team1_color: team1Color,
                    team2_color: team2Color
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create game');
            }

            const data = await response.json();
            navigate(`/game/${data.game_id}`);
        } catch (err) {
            setError('Failed to start game. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
            <AnimatedBackground />

            {/* Info Button - Fixed Position */}
            <button
                onClick={() => setShowInfo(true)}
                className="fixed top-4 right-4 z-20 w-12 h-12 bg-white/90 hover:bg-white backdrop-blur-md rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
                aria-label="About this project"
            >
                <Info size={24} className="text-gray-700 group-hover:text-[var(--bauhaus-blue)] transition-colors" />
            </button>

            {/* Info Dialog */}
            {showInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4" onClick={() => setShowInfo(false)}>
                    <div className="card-gradient rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-3xl font-black lowercase tracking-tighter text-gray-900">about kicka · ettan</h2>
                            <button
                                onClick={() => setShowInfo(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                            <p>
                                <strong className="text-gray-900">Kicka Ettan</strong> (Kick the Lead) is a setup tool for real curling games. It helps teams pre-position their lead stones digitally before playing on the actual ice.
                            </p>

                            <p>
                                Instead of physically playing your lead stones, both teams use this app to strategically place them. Once decided, you set up the real stones on the ice in those positions and continue playing the rest of the end normally.
                            </p>

                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-2 text-xs uppercase tracking-wider">How It Works</h3>
                                <ol className="space-y-2 text-xs">
                                    <li><strong>1.</strong> Both teams digitally place their lead stones during the placement phase</li>
                                    <li><strong>2.</strong> After confirmation, all stone positions are revealed</li>
                                    <li><strong>3.</strong> Go to the rink and physically set up stones in those exact positions</li>
                                    <li><strong>4.</strong> Play the rest of the end with real stones from this setup</li>
                                </ol>
                            </div>

                            <p className="text-xs text-gray-500 italic">
                                This speeds up the game and adds strategic depth by allowing teams to plan their lead stone positions carefully before stepping on the ice.
                            </p>

                            <p className="text-xs text-gray-500">
                                Built with Phoenix (Elixir), React, and TypeScript. Real-time multiplayer powered by Phoenix Channels.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="card-gradient backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md text-center relative overflow-hidden z-10">
                <GameTitle className="mb-4 relative z-10" />
                <p className="mb-8 text-gray-600 font-medium relative z-10">
                    Finally, a game your lead can't mess up.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 font-medium rounded-2xl border border-red-100 relative z-10">
                        {error}
                    </div>
                )}

                <div className="mb-8 space-y-8 text-left relative z-10">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                            stones per team
                        </label>
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                            <input
                                type="range"
                                min="1"
                                max="8"
                                value={stonesPerPlayer}
                                onChange={(e) => setStonesPerPlayer(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--bauhaus-blue)]"
                            />
                            <span className="font-bold text-2xl w-8 text-center text-[var(--bauhaus-blue)]">{stonesPerPlayer}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                            team colors
                        </label>
                        <div className="flex gap-8 justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 lowercase tracking-tight">team 1</span>
                                <button
                                    onClick={() => setShowColorPicker('team1')}
                                    className="group hover:scale-105 transition-transform"
                                >
                                    {/* Flattened irregular sphere */}
                                    <div
                                        className="w-20 h-16 shadow-lg border-3 border-white"
                                        style={{
                                            backgroundColor: team1Color,
                                            borderRadius: '45% 55% 52% 48% / 38% 35% 45% 42%',
                                            borderWidth: '3px',
                                            borderStyle: 'solid',
                                            borderColor: 'white'
                                        }}
                                    ></div>
                                </button>
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 lowercase tracking-tight">team 2</span>
                                <button
                                    onClick={() => setShowColorPicker('team2')}
                                    className="group hover:scale-105 transition-transform"
                                >
                                    {/* Flattened irregular sphere */}
                                    <div
                                        className="w-20 h-16 shadow-lg border-3 border-white"
                                        style={{
                                            backgroundColor: team2Color,
                                            borderRadius: '52% 48% 45% 55% / 42% 45% 35% 38%',
                                            borderWidth: '3px',
                                            borderStyle: 'solid',
                                            borderColor: 'white'
                                        }}
                                    ></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {showColorPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md p-4" onClick={() => setShowColorPicker(null)}>
                        <div className="card-gradient rounded-3xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                            <h3 className="text-lg font-bold mb-6 text-gray-800 text-center">
                                Select Color
                            </h3>
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {PRESET_COLORS.map(color => {
                                    const otherTeamColor = showColorPicker === 'team1' ? team2Color : team1Color;
                                    const isTaken = color.toUpperCase() === otherTeamColor.toUpperCase();

                                    return (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                if (isTaken) return; // Don't allow selecting same color
                                                if (showColorPicker === 'team1') setTeam1Color(color);
                                                else setTeam2Color(color);
                                                setShowColorPicker(null);
                                            }}
                                            className={`w-10 h-10 rounded-full shadow-sm transition-all ring-2 ${isTaken
                                                ? 'ring-red-400 opacity-40 cursor-not-allowed'
                                                : 'ring-transparent hover:ring-gray-200 hover:scale-110'
                                                }`}
                                            style={{ backgroundColor: color }}
                                            disabled={isTaken}
                                            title={isTaken ? 'Already taken by other team' : ''}
                                        />
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setShowColorPicker(null)}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleStartGame}
                    disabled={isLoading}
                    className="w-full bg-[var(--bauhaus-blue)] hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed relative z-10 lowercase tracking-tight"
                >
                    {isLoading ? 'creating...' : 'create game'}
                </button>
            </div>

            {lastGame && (
                <div className="mt-6 w-full max-w-md">
                    <div className="card-gradient backdrop-blur-md p-6 rounded-3xl shadow-xl relative overflow-hidden z-10">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 lowercase tracking-tight">
                            <History size={20} className="text-[var(--bauhaus-blue)]" />
                            recent games
                        </h3>

                        <button
                            onClick={() => navigate(`/game/${lastGame.gameId}`)}
                            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between group transition-all mb-4"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">last played</span>
                                <span className="text-sm font-mono text-gray-600">#{lastGame.gameId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-[var(--bauhaus-yellow)] text-black p-2 rounded-full group-hover:scale-110 transition-transform">
                                <Play size={16} fill="currentColor" />
                            </div>
                        </button>

                        {history.length > 1 && (
                            <div>
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 py-2 transition-colors lowercase tracking-tight"
                                >
                                    {showHistory ? 'hide history' : 'show history'}
                                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showHistory && (
                                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        {history.slice(1).map(game => (
                                            <button
                                                key={game.gameId}
                                                onClick={() => navigate(`/game/${game.gameId}`)}
                                                className="w-full bg-white/50 hover:bg-white text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all flex items-center justify-between group"
                                            >
                                                <span className="font-mono text-xs text-gray-600">#{game.gameId.slice(0, 8)}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(game.timestamp).toLocaleDateString()}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
