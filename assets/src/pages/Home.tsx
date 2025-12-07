import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History, ChevronDown, ChevronUp, Info, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { Dialog, Card } from '../components/ui';
import { config } from '../config';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsDialog } from '../components/SettingsDialog';

const Home = () => {
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [stonesPerPlayer, setStonesPerPlayer] = useState(2);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Team Color State
    const [team1Color, setTeam1Color] = useState('#D22730'); // Default Red
    const [team2Color, setTeam2Color] = useState('#FFDD00'); // Default Yellow
    const [showColorPicker, setShowColorPicker] = useState<'team1' | 'team2' | null>(null);

    const PRESET_COLORS = [
        '#D22730', // Red
        '#185494', // Blue
        '#FFDD00', // Yellow
        '#00CC00', // Green
        '#FF8800', // Orange
        '#9900FF', // Purple
        '#FF00AA', // Pink
        '#1A1A1A'  // Black
    ];

    useEffect(() => {
        const savedHistory = localStorage.getItem('kicka_ettan_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    const createGame = async () => {
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

            // Save to history
            const newHistory = [{
                gameId: data.game_id,
                timestamp: new Date().toISOString()
            }, ...history].slice(0, 10); // Keep last 10

            localStorage.setItem('kicka_ettan_history', JSON.stringify(newHistory));

            navigate(`/game/${data.game_id}`);
        } catch (err) {
            setError('Failed to create game. Please try again.');
            setIsLoading(false);
        }
    };

    const lastGame = history[0];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
            <AnimatedBackground />

            {/* Info Dialog */}
            <Dialog
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                title="about kicka · ettan"
            >
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
                    Skip the stones everyone forgets about anyway and get to the good part.
                </p>
            </Dialog>

            <div className="card-gradient backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md text-center relative overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-48 h-48 bg-[var(--icy-accent)] rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-[var(--icy-blue-medium)] rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>

                <GameTitle className="mb-4 relative z-10" />
                <p className="mb-8 text-gray-600 font-medium text-center relative z-10 flex items-center justify-center gap-2">
                    Finally, a game your lead can't mess up.
                    <button
                        onClick={() => setShowInfo(true)}
                        className="w-6 h-6 bg-white/90 hover:bg-white backdrop-blur-md rounded-full shadow animate-glow flex items-center justify-center group flex-shrink-0"
                        aria-label="About this project"
                    >
                        <Info size={14} className="text-gray-700 group-hover:text-[var(--icy-blue-medium)] transition-colors" />
                    </button>
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
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--icy-button-bg)]"
                            />
                            <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden">
                                <AnimatePresence mode="popLayout" initial={false}>
                                    <motion.span
                                        key={stonesPerPlayer}
                                        initial={{ opacity: 0, scale: 0, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 15,
                                            mass: 0.5
                                        }}
                                        className="font-bold text-2xl text-[var(--icy-button-bg)] absolute inset-0 flex items-center justify-center"
                                    >
                                        {stonesPerPlayer}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                            team colors
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowColorPicker('team1')}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl flex items-center justify-center gap-3 animate-glow"
                            >
                                <div
                                    className="w-8 h-8 rounded-full shadow-sm border border-black/5 relative overflow-hidden"
                                    style={{ backgroundColor: team1Color }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                </div>
                                <span className="font-bold text-gray-700 lowercase">team 1</span>
                            </button>
                            <button
                                onClick={() => setShowColorPicker('team2')}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl flex items-center justify-center gap-3 animate-glow"
                            >
                                <div
                                    className="w-8 h-8 rounded-full shadow-sm border border-black/5 relative overflow-hidden"
                                    style={{ backgroundColor: team2Color }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                </div>
                                <span className="font-bold text-gray-700 lowercase">team 2</span>
                            </button>
                        </div>

                        {/* Color Picker Dialog */}
                        {showColorPicker && (
                            <Dialog
                                isOpen={true}
                                onClose={() => setShowColorPicker(null)}
                                title="select color"
                            >
                                <div className="p-4">
                                    <div className="grid grid-cols-4 gap-4 place-items-center w-fit mx-auto">
                                        {PRESET_COLORS.map(color => {
                                            const otherTeamColor = showColorPicker === 'team1' ? team2Color : team1Color;
                                            const isTaken = color.toUpperCase() === otherTeamColor.toUpperCase();

                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => {
                                                        if (isTaken) return;
                                                        if (showColorPicker === 'team1') setTeam1Color(color);
                                                        else setTeam2Color(color);
                                                        setShowColorPicker(null);
                                                    }}
                                                    className={`w-12 h-12 rounded-full shadow-md ring-2 animate-glow transition-transform ${isTaken
                                                        ? 'ring-red-400 opacity-40 cursor-not-allowed'
                                                        : 'ring-transparent hover:ring-gray-400 hover:scale-110'
                                                        }`}
                                                    style={{ backgroundColor: color }}
                                                    disabled={isTaken}
                                                    title={isTaken ? 'Already taken by other team' : ''}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </Dialog>
                        )}
                    </div>
                </div>

                <button
                    onClick={createGame}
                    disabled={isLoading}
                    className="w-full bg-[var(--icy-accent)] hover:bg-[var(--icy-accent-hover)] text-white font-bold py-4 px-4 rounded-full flex items-center justify-center gap-2 animate-glow relative z-10 lowercase tracking-tight text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            creating...
                        </>
                    ) : (
                        <>
                            <Play size={20} fill="currentColor" />
                            create game
                        </>
                    )}
                </button>

                <button
                    onClick={openSettings}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold py-4 px-4 rounded-full flex items-center justify-center gap-2 animate-glow relative z-10 lowercase tracking-tight text-lg"
                >
                    <Settings size={20} />
                    settings
                </button>
            </div>

            {lastGame && (
                <div className="mt-6 w-full max-w-md">
                    <Card className="p-6 z-10">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 lowercase tracking-tight">
                            <History size={20} className="text-[var(--icy-button-bg)]" />
                            recent games
                        </h3>

                        <button
                            onClick={() => navigate(`/game/${lastGame.gameId}`)}
                            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between group animate-glow mb-4"
                        >
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-500 uppercase tracking-wider">last played</span>
                                <span className="text-sm font-mono text-gray-600">#{lastGame.gameId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-[var(--icy-blue-light)] text-black p-2 rounded-full group-hover:scale-110 transition-transform">
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
                                                className="w-full bg-white/50 hover:bg-white text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 animate-glow flex items-center justify-between group"
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
                    </Card>
                </div>
            )}

            <SettingsDialog />
        </div>
    );
};

export default Home;
