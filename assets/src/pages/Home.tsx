import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History, ChevronDown, ChevronUp, Info, Settings, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { Dialog, Card, Button } from '../components/ui';
import { config } from '../config';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsDialog } from '../components/SettingsDialog';
import { GAME_TYPES, GameType, getDefaultGameType } from '../data/gameTypes';

const Home = () => {
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [selectedGameType, setSelectedGameType] = useState<GameType>(getDefaultGameType());
    const [showGameTypePicker, setShowGameTypePicker] = useState(false);
    const [gameSettings, setGameSettings] = useState<Record<string, number | boolean | string>>(getDefaultGameType().defaultSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Team Color State
    const [team1Color, setTeam1Color] = useState('#D22730'); // Default Red
    const [team2Color, setTeam2Color] = useState('#185494'); // Default Blue
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
                    game_type: selectedGameType.id,
                    stones_per_team: gameSettings.stones_per_team,
                    total_rounds: gameSettings.total_rounds,
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
                <div className="absolute top-0 left-0 w-48 h-48 bg-icy-accent rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-icy-blue-medium rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>

                <GameTitle className="mb-4 relative z-10" />
                <p className="mb-8 text-gray-600 font-medium text-center relative z-10 flex items-center justify-center gap-2">
                    Finally, a game your lead can't mess up.
                    <Button
                        variant="outline"
                        shape="circle"
                        size="sm"
                        onClick={() => setShowInfo(true)}
                        className="!w-6 !h-6 !bg-white/90 hover:!bg-gray-100 backdrop-blur-md !shadow hover:!shadow-md flex-shrink-0 !p-0 !border-gray-200/50"
                        aria-label="About this project"
                    >
                        <Info size={16} className="text-gray-700 group-hover:text-icy-blue-medium transition-colors" />
                    </Button>
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 font-medium rounded-2xl border border-red-100 relative z-10">
                        {error}
                    </div>
                )}

                <div className="mb-8 space-y-6 text-left relative z-10">
                    {/* Game Type Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-gray-800 lowercase tracking-tight">
                                {selectedGameType.name}
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowGameTypePicker(true)}
                                className="!bg-gray-50 hover:!bg-gray-100 !border-0 !shadow-none"
                            >
                                <Repeat size={16} />
                                switch
                            </Button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">{selectedGameType.shortDescription}</p>
                    </div>

                    {/* Dynamic Settings based on Game Type */}
                    {Object.entries(selectedGameType.settingsSchema).map(([key, setting]) => (
                        <div key={key}>
                            <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                                {setting.label.toLowerCase()}
                            </label>
                            {setting.type === 'integer' && (
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                                    <input
                                        type="range"
                                        min={setting.min || 1}
                                        max={setting.max || 10}
                                        value={gameSettings[key] as number}
                                        onChange={(e) => setGameSettings(prev => ({
                                            ...prev,
                                            [key]: parseInt(e.target.value)
                                        }))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-icy-button-bg"
                                    />
                                    <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden">
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            <motion.span
                                                key={gameSettings[key] as number}
                                                initial={{ opacity: 0, scale: 0, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 15,
                                                    mass: 0.5
                                                }}
                                                className="font-bold text-2xl text-icy-button-bg absolute inset-0 flex items-center justify-center"
                                            >
                                                {gameSettings[key] as number}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                            team colors
                        </label>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowColorPicker('team1')}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center gap-3 animate-glow border-0"
                            >
                                <div
                                    className="w-9 h-9 rounded-full shadow-sm border border-black/5 relative overflow-hidden"
                                    style={{ backgroundColor: team1Color }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                </div>
                                <span className="font-bold text-gray-700 lowercase text-base">team 1</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowColorPicker('team2')}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center gap-3 animate-glow border-0"
                            >
                                <div
                                    className="w-9 h-9 rounded-full shadow-sm border border-black/5 relative overflow-hidden"
                                    style={{ backgroundColor: team2Color }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
                                </div>
                                <span className="font-bold text-gray-700 lowercase text-base">team 2</span>
                            </Button>
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
                                                <Button
                                                    key={color}
                                                    shape="circle"
                                                    onClick={() => {
                                                        if (isTaken) return;
                                                        if (showColorPicker === 'team1') setTeam1Color(color);
                                                        else setTeam2Color(color);
                                                        setShowColorPicker(null);
                                                    }}
                                                    className={`w-12 h-12 shadow-md ring-2 animate-glow transition-transform p-0 ${isTaken
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

                <Button
                    onClick={createGame}
                    isLoading={isLoading}
                    shape="pill"
                    size="xl"
                    className="w-full bg-icy-accent hover:bg-icy-accent-hover text-white shadow-none animate-glow relative z-10 mb-4 text-lg py-4"
                >
                    <Play size={20} fill="currentColor" />
                    create game
                </Button>

                <Button
                    onClick={openSettings}
                    variant="outline"
                    shape="pill"
                    size="xl"
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 animate-glow relative z-10 text-lg py-4 shadow-none border-0"
                >
                    <Settings size={20} />
                    settings
                </Button>
            </div>

            {lastGame && (
                <div className="mt-6 w-full max-w-md">
                    <Card className="p-6 z-10">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 lowercase tracking-tight">
                            <History size={20} className="text-icy-button-bg" />
                            recent games
                        </h3>

                        <Button
                            variant="outline"
                            onClick={() => navigate(`/game/${lastGame.gameId}`)}
                            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-gray-200 flex items-center !justify-between group animate-glow mb-4 h-auto"
                            noHoverAnimation
                        >
                            <div className="flex flex-col items-start gap-0">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">last played</span>
                                <span className="text-sm font-mono text-gray-600">#{lastGame.gameId.slice(0, 8)}</span>
                            </div>
                            <div className="bg-icy-blue-light text-black p-2 rounded-full group-hover:scale-110 transition-transform">
                                <Play size={16} fill="currentColor" />
                            </div>
                        </Button>

                        {history.length > 1 && (
                            <div>
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                                >
                                    {showHistory ? 'hide history' : 'show history'}
                                    {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>

                                {showHistory && (
                                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        {history.slice(1).map(game => (
                                            <Button
                                                variant="outline"
                                                key={game.gameId}
                                                onClick={() => navigate(`/game/${game.gameId}`)}
                                                className="w-full bg-white/50 hover:bg-white text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 animate-glow flex items-center !justify-between group h-auto !shadow-none"
                                                noHoverAnimation
                                            >
                                                <span className="font-mono text-xs text-gray-600">#{game.gameId.slice(0, 8)}</span>
                                                <span className="text-[10px] text-gray-400 font-normal">
                                                    {new Date(game.timestamp).toLocaleDateString()}
                                                </span>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            <SettingsDialog />

            {/* Game Type Picker Dialog */}
            <Dialog
                isOpen={showGameTypePicker}
                onClose={() => setShowGameTypePicker(false)}
                title="select game type"
            >
                <div className="space-y-4">
                    {GAME_TYPES.map(gameType => (
                        <button
                            key={gameType.id}
                            onClick={() => {
                                setSelectedGameType(gameType);
                                setGameSettings(gameType.defaultSettings);
                                setShowGameTypePicker(false);
                            }}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedGameType.id === gameType.id
                                    ? 'border-icy-accent bg-icy-blue-light/30'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                        >
                            <h3 className="font-bold text-gray-800">{gameType.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{gameType.shortDescription}</p>
                        </button>
                    ))}
                </div>
            </Dialog>
        </div>
    );
};

export default Home;
