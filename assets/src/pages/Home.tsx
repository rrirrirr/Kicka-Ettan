import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Settings, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { Dialog, Button } from '../components/ui';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsDialog } from '../components/SettingsDialog';
import { GAME_TYPES, GameType, getDefaultGameType, getSelectableGameTypes, fetchGameTypes } from '../data/gameTypes';
import { saveGameToHistory } from '../lib/gameHistory';
import { StoneIcon, BanIcon } from '../components/icons/Icons';
import { GameTypeCarousel } from '../components/GameTypeCarousel';
import { config } from '../config';

const Home = () => {
    const navigate = useNavigate();
    const { openSettings } = useSettings();

    // Local state to track game types changes
    const [availableGameTypes, setAvailableGameTypes] = useState<GameType[]>(getSelectableGameTypes());

    // Per-game-type settings storage
    const [allGameSettings, setAllGameSettings] = useState<Record<string, Record<string, number | boolean | string>>>(() => {
        const saved = localStorage.getItem('kicka_ettan_all_game_settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved settings', e);
            }
        }
        const defaults: Record<string, Record<string, number | boolean | string>> = {};
        GAME_TYPES.forEach(gt => {
            defaults[gt.id] = gt.defaultSettings;
        });
        return defaults;
    });

    // UI states
    const [showHistory, setShowHistory] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showInfoForGameType, setShowInfoForGameType] = useState<GameType | null>(null);
    const [showSettingsForGameType, setShowSettingsForGameType] = useState<GameType | null>(null);
    const [showBanSizeInfo, setShowBanSizeInfo] = useState(false);
    const [showStonesInfo, setShowStonesInfo] = useState(false);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    // Team colors
    const [teamColors, setTeamColors] = useState<Record<string, { team1: string; team2: string }>>({});
    const [showColorPicker, setShowColorPicker] = useState<{ gameTypeId: string; team: 'team1' | 'team2' } | null>(null);

    const PRESET_COLORS = [
        '#D22730', '#185494', '#FFDD00', '#00CC00',
        '#FF8800', '#9900FF', '#FF00AA', '#1A1A1A'
    ];

    useEffect(() => {
        localStorage.setItem('kicka_ettan_all_game_settings', JSON.stringify(allGameSettings));
    }, [allGameSettings]);

    useEffect(() => {
        fetchGameTypes().then(() => {
            setAvailableGameTypes(getSelectableGameTypes());
        });
        const savedHistory = localStorage.getItem('kicka_ettan_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('Failed to parse history', e);
            }
        }
    }, []);

    const getTeamColors = (gameTypeId: string) => {
        return teamColors[gameTypeId] || { team1: '#D22730', team2: '#185494' };
    };

    const setTeamColor = (gameTypeId: string, team: 'team1' | 'team2', color: string) => {
        setTeamColors(prev => ({
            ...prev,
            [gameTypeId]: {
                ...getTeamColors(gameTypeId),
                [team]: color
            }
        }));
    };

    const getGameSettings = (gameTypeId: string) => {
        return allGameSettings[gameTypeId] || getDefaultGameType().defaultSettings;
    };

    const updateGameSetting = (gameTypeId: string, key: string, value: number | boolean | string) => {
        setAllGameSettings(prev => ({
            ...prev,
            [gameTypeId]: {
                ...prev[gameTypeId],
                [key]: value
            }
        }));
    };

    const createGame = async (gameType: GameType) => {
        setIsLoading(gameType.id);
        setError(null);
        try {
            const gameSettings = getGameSettings(gameType.id);
            const colors = getTeamColors(gameType.id);
            const processedSettings: Record<string, any> = {
                game_type: gameType.id,
                team1_color: colors.team1,
                team2_color: colors.team2
            };

            Object.entries(gameSettings).forEach(([key, value]) => {
                const settingDef = gameType.settingsSchema[key];
                if (settingDef?.type === 'select' && typeof value === 'string' && settingDef.optionValues) {
                    processedSettings[key] = settingDef.optionValues[value];
                } else {
                    processedSettings[key] = value;
                }
            });

            const response = await fetch(`${config.apiUrl}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processedSettings),
            });

            if (!response.ok) throw new Error('Failed to create game');

            const data = await response.json();
            saveGameToHistory(data.game_id, gameType.id);
            localStorage.setItem('kicka_ettan_game_type_id', gameType.id);
            navigate(`/game/${data.game_id}`);
        } catch (err) {
            console.error('Create game error:', err);
            setError('Failed to create game. Please try again.');
            setIsLoading(null);
        }
    };



    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 30
            }
        },
        exit: { opacity: 0, y: 10 }
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col items-center py-4 px-4 relative overflow-x-hidden"
            initial="hidden"
            animate="visible"
        >
            <AnimatedBackground />

            {/* Container that grows with content */}
            <motion.div
                className="w-full max-w-md flex flex-col"
                variants={containerVariants}
            >
                <div className="card-gradient backdrop-blur-md p-6 rounded-3xl shadow-2xl w-full text-center relative overflow-hidden z-10 flex flex-col">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-icy-accent rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-icy-blue-medium rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>

                    {/* Header */}
                    <motion.div className="flex-shrink-0 relative z-10" variants={itemVariants}>
                        <GameTitle size="large" className="mb-2" />
                        <p className="mb-4 text-gray-600 font-medium text-center flex items-center justify-center gap-2">
                            Finally, a game your lead can't mess up.
                            <Button
                                variant="outline"
                                shape="circle"
                                size="sm"
                                onClick={() => setShowInfo(true)}
                                className="!w-6 !h-6 !bg-white/90 hover:!bg-gray-100 backdrop-blur-md !shadow hover:!shadow-md flex-shrink-0 !p-0 !border-gray-200/50"
                                aria-label="About this project"
                            >
                                <Info size={16} className="text-gray-700" />
                            </Button>
                        </p>
                    </motion.div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-600 font-medium rounded-2xl border border-red-100 relative z-10 flex-shrink-0">
                            {error}
                        </div>
                    )}

                    {/* Carousel - main content */}
                    <motion.div className="flex-grow flex items-center relative z-20 overflow-visible" variants={itemVariants}>
                        <GameTypeCarousel
                            gameTypes={availableGameTypes}
                            onCreateGame={createGame}
                            onOpenSettings={(gameType) => setShowSettingsForGameType(gameType)}
                            onOpenInfo={(gameType) => setShowInfoForGameType(gameType)}
                            isLoading={isLoading}
                            getTeamColors={getTeamColors}
                            onOpenColorPicker={(gameTypeId, team) => setShowColorPicker({ gameTypeId, team })}
                        />
                    </motion.div>

                    {/* Footer buttons */}
                    <motion.div className="flex-shrink-0 mt-4 space-y-3 relative z-10" variants={itemVariants}>
                        <Button
                            onClick={openSettings}
                            variant="outline"
                            shape="pill"
                            size="lg"
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 active:scale-95 transition-transform py-4"
                        >
                            <Settings size={22} />
                            settings
                        </Button>

                        {/* History section */}
                        {history.length > 0 && (
                            <div
                                className="rounded-2xl p-5 border border-white/30 shadow-lg"
                                style={{ background: 'linear-gradient(135deg, #fecaca 0%, #fda4af 50%, #c4b5fd 100%)' }}
                            >
                                {/* Last Played Card */}
                                <button
                                    onClick={() => navigate(`/game/${history[0].gameId}`)}
                                    className="w-full flex items-center justify-between group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-0.5">click to reconnect</span>
                                        <span className="text-xl font-black text-gray-900 uppercase tracking-tight">last played</span>
                                        <span className="text-sm font-bold text-gray-800 lowercase">
                                            {(() => {
                                                const gameType = history[0].gameTypeId ? GAME_TYPES.find(t => t.id === history[0].gameTypeId) : null;
                                                return gameType ? gameType.name.toLowerCase() : 'unknown';
                                            })()}
                                        </span>
                                        <span className="text-xs font-mono text-gray-600 mt-0.5">
                                            #{history[0].gameId.slice(0, 8)}
                                        </span>
                                    </div>
                                    <div className="bg-gray-900 text-white p-3 rounded-full group-hover:scale-110 transition-transform shadow-md">
                                        <Play size={18} fill="currentColor" />
                                    </div>
                                </button>

                                {/* Browse History */}
                                {history.length > 1 && (
                                    <div className="flex justify-center mt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowHistory(true)}
                                            className="bg-white/60 hover:bg-white/80 text-gray-700 text-sm px-6 py-2 rounded-full border border-white/50 shadow-sm"
                                        >
                                            Browse History
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            </motion.div>

            {/* Dialogs */}
            <Dialog
                isOpen={showInfo}
                onClose={() => setShowInfo(false)}
                title="about kicka · ettan"
                variant="info"
                headerIcon={<Info size={48} className="text-gray-400" />}
            >
                <div className="space-y-5 px-2">
                    <p className="text-base text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">Kicka Ettan</strong> (Kick the Lead) is a setup tool for real curling games. It helps teams pre-position their lead stones digitally before playing on the actual ice.
                    </p>
                    <div className="bg-white/50 p-5 rounded-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">How It Works</h3>
                        <ol className="space-y-2.5 text-sm text-gray-700">
                            <li><strong className="text-gray-900">1.</strong> Both teams digitally place their lead stones</li>
                            <li><strong className="text-gray-900">2.</strong> After confirmation, all positions are revealed</li>
                            <li><strong className="text-gray-900">3.</strong> Set up real stones on the ice in those positions</li>
                            <li><strong className="text-gray-900">4.</strong> Play the rest of the end normally</li>
                        </ol>
                    </div>
                </div>
            </Dialog>

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
                                const colors = getTeamColors(showColorPicker.gameTypeId);
                                const otherTeamColor = showColorPicker.team === 'team1' ? colors.team2 : colors.team1;
                                const isTaken = color.toUpperCase() === otherTeamColor.toUpperCase();
                                return (
                                    <Button
                                        key={color}
                                        shape="circle"
                                        onClick={() => {
                                            if (isTaken) return;
                                            setTeamColor(showColorPicker.gameTypeId, showColorPicker.team, color);
                                            setShowColorPicker(null);
                                        }}
                                        className={`w-12 h-12 shadow-md ring-2 transition-transform p-0 ${isTaken
                                            ? 'ring-red-400 opacity-40 cursor-not-allowed'
                                            : 'ring-transparent hover:ring-gray-400 hover:scale-110'
                                            }`}
                                        style={{ backgroundColor: color }}
                                        disabled={isTaken}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </Dialog>
            )}

            {/* Game Type Info Dialog */}
            {showInfoForGameType && (
                <Dialog
                    isOpen={true}
                    onClose={() => setShowInfoForGameType(null)}
                    title={`about · ${showInfoForGameType.name.toLowerCase()}`}
                    variant="info"
                    headerIcon={<BookOpen size={48} className="text-gray-400" />}
                >
                    <div className="space-y-4 px-2">
                        {showInfoForGameType.longDescription.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="text-base text-gray-700 leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </Dialog>
            )}

            {/* Game Settings Dialog */}
            {showSettingsForGameType && (
                <Dialog
                    isOpen={true}
                    onClose={() => setShowSettingsForGameType(null)}
                    title={`${showSettingsForGameType.name.toLowerCase()} settings`}
                >
                    <div className="space-y-6">
                        {Object.entries(showSettingsForGameType.settingsSchema).map(([key, setting]) => {
                            const gameSettings = getGameSettings(showSettingsForGameType.id);
                            return (
                                <div key={key}>
                                    <label className="block text-sm font-bold text-gray-700 mb-3 lowercase tracking-tight">
                                        {setting.label.toLowerCase()}
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                                    {setting.type === 'integer' && (
                                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl shadow-md">
                                            <input
                                                type="range"
                                                min={setting.min ?? 1}
                                                max={setting.max || 10}
                                                value={gameSettings[key] as number}
                                                onChange={(e) => updateGameSetting(showSettingsForGameType.id, key, parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-icy-button-bg"
                                            />
                                            <div className="w-8 h-8 relative flex items-center justify-center overflow-hidden">
                                                <AnimatePresence mode="popLayout" initial={false}>
                                                    <motion.span
                                                        key={gameSettings[key] as number}
                                                        initial={{ opacity: 0, scale: 0, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.5, y: -10 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 15, mass: 0.5 }}
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
                                                        onClick={() => updateGameSetting(showSettingsForGameType.id, key, option)}
                                                        className={`flex-1 h-12 ${isActive
                                                            ? '!bg-active text-white hover:!bg-lavender-600 !border-active'
                                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                                                            }`}
                                                    >
                                                        {option}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Dialog>
            )}

            {/* Ban Size Info Dialog */}
            <Dialog
                isOpen={showBanSizeInfo}
                onClose={() => setShowBanSizeInfo(false)}
                title="ban circle sizes"
                variant="info"
                headerIcon={<BanIcon size={48} className="text-gray-400" />}
            >
                <div className="space-y-5 px-2">
                    <p className="text-base text-gray-700 leading-relaxed">
                        The ban circle determines how much space you can block from your opponent.
                    </p>
                    <div className="space-y-3">
                        {[{ name: 'Small', desc: '30px — Pinpoint denials' }, { name: 'Medium', desc: '60px — Balanced' }, { name: 'Large', desc: '90px — Wide' }, { name: 'XL', desc: '120px — Maximum' }].map(item => (
                            <div key={item.name} className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{item.name}</h3>
                                <p className="text-sm text-gray-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Dialog>

            {/* Stones Info Dialog */}
            <Dialog
                isOpen={showStonesInfo}
                onClose={() => setShowStonesInfo(false)}
                title="stones per team"
                variant="info"
                headerIcon={<StoneIcon size={48} className="text-gray-400" />}
            >
                <div className="space-y-5 px-2">
                    <p className="text-base text-gray-700 leading-relaxed">
                        <strong className="text-gray-900">Stones per team</strong> means how many stones you will pre-place in the game.
                    </p>
                    <p className="text-base text-gray-700 leading-relaxed">
                        You are still using <strong className="text-gray-900">8</strong> (or more) stones total.
                    </p>
                </div>
            </Dialog>

            {/* History BottomSheet */}
            <BottomSheet
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                title="game history"
            >
                <div className="space-y-3">
                    {history.slice(1, 20).map(game => {
                        const gameType = game.gameTypeId ? GAME_TYPES.find(t => t.id === game.gameTypeId) : null;
                        return (
                            <Button
                                variant="outline"
                                key={game.gameId}
                                onClick={() => {
                                    setShowHistory(false);
                                    navigate(`/game/${game.gameId}`);
                                }}
                                className="w-full bg-white hover:bg-gray-50 text-left p-3 rounded-xl border border-gray-200 flex items-center !justify-between h-auto shadow-sm active:scale-[0.98] transition-transform"
                                noHoverAnimation
                            >
                                <div className="flex flex-col items-start">
                                    <span className="font-mono text-sm text-gray-700">
                                        {gameType && (
                                            <span className="font-bold text-periwinkle-600 mr-2">{gameType.name.toLowerCase()}</span>
                                        )}
                                        #{game.gameId.slice(0, 8)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {new Date(game.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <Play size={14} className="text-gray-400" />
                            </Button>
                        );
                    })}
                </div>
            </BottomSheet>

            <SettingsDialog />
        </motion.div>
    );
};

export default Home;
