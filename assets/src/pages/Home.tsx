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
import { DialogBackButton } from '../components/ui/DialogBackButton';
import { GAME_TYPES, GameType, getDefaultGameType } from '../data/gameTypes';
import { saveGameToHistory, getGameHistory } from '../lib/gameHistory';

const Home = () => {
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [selectedGameType, setSelectedGameType] = useState<GameType>(() => {
        const saved = localStorage.getItem('kicka_ettan_game_type_id');
        if (saved) {
            const found = GAME_TYPES.find(t => t.id === saved);
            if (found) return found;
        }
        return getDefaultGameType();
    });
    const [showGameTypePicker, setShowGameTypePicker] = useState(false);
    const [pickerView, setPickerView] = useState<'list' | 'settings' | 'info'>('list');
    const [pickerGameType, setPickerGameType] = useState<GameType>(getDefaultGameType());
    const [showGameTypeInfo, setShowGameTypeInfo] = useState(false);
    const [showGameSettings, setShowGameSettings] = useState(false);
    const [gameSettings, setGameSettings] = useState<Record<string, number | boolean | string>>(() => {
        const saved = localStorage.getItem('kicka_ettan_game_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved settings', e);
            }
        }
        return getDefaultGameType().defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('kicka_ettan_game_type_id', selectedGameType.id);
    }, [selectedGameType.id]);

    useEffect(() => {
        localStorage.setItem('kicka_ettan_game_settings', JSON.stringify(gameSettings));
    }, [gameSettings]);
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
            // Convert ban_circle_radius from string label to numeric value if needed
            // Process all settings to convert option labels to values if needed
            const processedSettings: Record<string, any> = {
                game_type: selectedGameType.id,
                team1_color: team1Color,
                team2_color: team2Color
            };

            // Copy all current settings, transforming values if optionValues exists
            Object.entries(gameSettings).forEach(([key, value]) => {
                const settingDef = selectedGameType.settingsSchema[key];
                if (settingDef?.type === 'select' && typeof value === 'string' && settingDef.optionValues) {
                    processedSettings[key] = settingDef.optionValues[value];
                } else {
                    processedSettings[key] = value;
                }
            });

            const response = await fetch(`${config.apiUrl}/api/games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(processedSettings),
            });

            if (!response.ok) {
                throw new Error('Failed to create game');
            }

            const data = await response.json();

            // Save to history using utility
            saveGameToHistory(data.game_id, selectedGameType.id);

            // Update local state immediately for UI responsiveness
            const newHistory = getGameHistory();
            setHistory(newHistory);

            navigate(`/game/${data.game_id}`);
        } catch (err) {
            console.error('Create game error:', err);
            setError('Failed to create game. Please try again.');
            setIsLoading(false);
        }
    };

    const lastGame = history[0];
    const lastGameType = lastGame?.gameTypeId ? GAME_TYPES.find(t => t.id === lastGame.gameTypeId) : null;

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

                    {/* Game Type Selector - styled like team color buttons */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                            game type
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowGameTypePicker(true)}
                                className="flex-1 bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center gap-3 animate-glow border-0"
                            >
                                <Repeat size={20} className="text-icy-accent" />
                                <span className="font-bold text-gray-700 lowercase text-base">{selectedGameType.name}</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowGameSettings(true)}
                                className="bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center animate-glow border-0"
                            >
                                <Settings size={20} className="text-gray-500" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowGameTypeInfo(true)}
                                className="bg-gray-50 hover:bg-gray-100 !p-4 h-auto !rounded-2xl flex items-center justify-center animate-glow border-0"
                            >
                                <Info size={20} className="text-gray-500" />
                            </Button>
                        </div>
                    </div>

                    {/* Important Settings - Always shown */}
                    {Object.entries(selectedGameType.settingsSchema)
                        .filter(([_, setting]) => setting.important)
                        .map(([key, setting]) => (
                            <div key={key}>
                                <label className="block text-sm font-bold text-gray-700 mb-3 ml-1 lowercase tracking-tight">
                                    {setting.label.toLowerCase()}
                                </label>
                                {setting.type === 'integer' && (
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                                        <input
                                            type="range"
                                            min={setting.min ?? 1}
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
                                                    {setting.valueLabels && setting.valueLabels[gameSettings[key] as number]
                                                        ? setting.valueLabels[gameSettings[key] as number]
                                                        : gameSettings[key] as number}
                                                </motion.span>
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                                {setting.type === 'select' && setting.options && (
                                    <div className="flex gap-2">
                                        {setting.options.map((option) => {
                                            const isActive = gameSettings[key] === option;
                                            return (
                                                <Button
                                                    key={option}
                                                    variant="outline"
                                                    onClick={() => setGameSettings(prev => ({
                                                        ...prev,
                                                        [key]: option
                                                    }))}
                                                    className={`flex-1 h-12 ${isActive
                                                        ? 'bg-active text-white hover:bg-lavender-600 border-active'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                                                        } transition-colors`}
                                                >
                                                    {option}
                                                </Button>
                                            );
                                        })}
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
                                <span className="text-sm font-mono text-gray-600">
                                    {lastGameType && (
                                        <span className="font-bold text-periwinkle-600 mr-2">{lastGameType.name.toLowerCase()}</span>
                                    )}
                                    #{lastGame.gameId.slice(0, 8)}
                                </span>
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
                                        {history.slice(1).map(game => {
                                            const gameType = game.gameTypeId ? GAME_TYPES.find(t => t.id === game.gameTypeId) : null;
                                            return (
                                                <Button
                                                    variant="outline"
                                                    key={game.gameId}
                                                    onClick={() => navigate(`/game/${game.gameId}`)}
                                                    className="w-full bg-white/50 hover:bg-white text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 animate-glow flex items-center !justify-between group h-auto !shadow-none"
                                                    noHoverAnimation
                                                >
                                                    <span className="font-mono text-xs text-gray-600">
                                                        {gameType && (
                                                            <span className="font-bold text-periwinkle-600 mr-2">{gameType.name.toLowerCase()}</span>
                                                        )}
                                                        #{game.gameId.slice(0, 8)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-normal">
                                                        {new Date(game.timestamp).toLocaleDateString()}
                                                    </span>
                                                </Button>
                                            );
                                        })}
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
                onClose={() => {
                    setShowGameTypePicker(false);
                    setPickerView('list');
                }}
                title={pickerView === 'list' ? 'select game type' : pickerView === 'settings' ? 'game settings' : pickerGameType.name.toLowerCase()}
                backButton={pickerView !== 'list' ? (
                    <DialogBackButton onClick={() => setPickerView('list')} />
                ) : undefined}
            >
                {pickerView === 'list' ? (
                    <div className="space-y-4">
                        {GAME_TYPES.map(gameType => (
                            <div
                                key={gameType.id}
                                className={`w-full p-4 rounded-2xl border-2 transition-all ${selectedGameType.id === gameType.id
                                    ? 'border-active bg-active/10'
                                    : 'border-gray-200 bg-white'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedGameType(gameType);
                                            setGameSettings(gameType.defaultSettings);
                                            setShowGameTypePicker(false);
                                            setPickerView('list');
                                        }}
                                        className="flex-1 text-left"
                                    >
                                        <h3 className="font-bold text-gray-800">{gameType.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{gameType.shortDescription}</p>
                                    </button>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPickerGameType(gameType);
                                                setPickerView('settings');
                                            }}
                                            className="bg-gray-50 hover:bg-gray-100 !p-2 h-auto !rounded-xl flex items-center justify-center border-0"
                                        >
                                            <Settings size={18} className="text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPickerGameType(gameType);
                                                setPickerView('info');
                                            }}
                                            className="bg-gray-50 hover:bg-gray-100 !p-2 h-auto !rounded-xl flex items-center justify-center border-0"
                                        >
                                            <Info size={18} className="text-gray-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : pickerView === 'settings' ? (
                    <div>
                        <div className="space-y-6">
                            {Object.entries(pickerGameType.settingsSchema).map(([key, setting]) => (
                                <div key={key}>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 lowercase tracking-tight">
                                        {setting.label.toLowerCase()}
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                                    {setting.type === 'integer' && (
                                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                                            <input
                                                type="range"
                                                min={setting.min ?? 1}
                                                max={setting.max || 10}
                                                value={gameSettings[key] as number}
                                                onChange={(e) => setGameSettings(prev => ({
                                                    ...prev,
                                                    [key]: parseInt(e.target.value)
                                                }))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-icy-button-bg"
                                            />
                                            <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden">
                                                <span className="font-bold text-2xl text-icy-button-bg">
                                                    {setting.valueLabels && setting.valueLabels[gameSettings[key] as number]
                                                        ? setting.valueLabels[gameSettings[key] as number]
                                                        : gameSettings[key] as number}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {setting.type === 'select' && setting.options && (
                                        <div className="flex gap-2">
                                            {setting.options.map((option) => {
                                                const isActive = gameSettings[key] === option;
                                                return (
                                                    <Button
                                                        key={option}
                                                        variant="outline"
                                                        onClick={() => setGameSettings(prev => ({
                                                            ...prev,
                                                            [key]: option
                                                        }))}
                                                        className={`flex-1 h-12 ${isActive
                                                            ? 'bg-active text-white hover:bg-lavender-600 border-active'
                                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                                                            } transition-colors`}
                                                    >
                                                        {option}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            onClick={() => {
                                setSelectedGameType(pickerGameType);
                                setShowGameTypePicker(false);
                                setPickerView('list');
                            }}
                            className="w-full mt-6"
                        >
                            select {pickerGameType.name.toLowerCase()}
                        </Button>
                    </div>
                ) : (
                    <div>
                        <div className="text-gray-600 whitespace-pre-line">
                            {pickerGameType.longDescription}
                        </div>
                        <Button
                            onClick={() => {
                                setSelectedGameType(pickerGameType);
                                setGameSettings(pickerGameType.defaultSettings);
                                setShowGameTypePicker(false);
                                setPickerView('list');
                            }}
                            className="w-full mt-6"
                        >
                            select {pickerGameType.name.toLowerCase()}
                        </Button>
                    </div>
                )}
            </Dialog>

            {/* Game Type Info Dialog */}
            <Dialog
                isOpen={showGameTypeInfo}
                onClose={() => setShowGameTypeInfo(false)}
                title={selectedGameType.name.toLowerCase()}
            >
                <div className="text-gray-600 whitespace-pre-line">
                    {selectedGameType.longDescription}
                </div>
            </Dialog>

            {/* Game Settings Dialog */}
            <Dialog
                isOpen={showGameSettings}
                onClose={() => setShowGameSettings(false)}
                title="game settings"
            >
                <div className="space-y-6">
                    {Object.entries(selectedGameType.settingsSchema).map(([key, setting]) => (
                        <div key={key}>
                            <label className="block text-sm font-bold text-gray-700 mb-3 lowercase tracking-tight">
                                {setting.label.toLowerCase()}
                            </label>
                            <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                            {setting.type === 'integer' && (
                                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                                    <input
                                        type="range"
                                        min={setting.min ?? 1}
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
                                                {setting.valueLabels && setting.valueLabels[gameSettings[key] as number]
                                                    ? setting.valueLabels[gameSettings[key] as number]
                                                    : gameSettings[key] as number}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                            {setting.type === 'select' && setting.options && (
                                <div className="flex gap-2">
                                    {setting.options.map((option) => {
                                        const isActive = gameSettings[key] === option;
                                        return (
                                            <Button
                                                key={option}
                                                variant="outline"
                                                onClick={() => setGameSettings(prev => ({
                                                    ...prev,
                                                    [key]: option
                                                }))}
                                                className={`flex-1 h-12 ${isActive
                                                    ? 'bg-active text-white hover:bg-lavender-600 border-active'
                                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                                                    } transition-colors`}
                                            >
                                                {option}
                                            </Button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Dialog>
        </div>
    );
};

export default Home;
