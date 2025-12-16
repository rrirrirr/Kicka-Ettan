import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { Dialog, Button } from '../components/ui';
import { config } from '../config';
import { SettingsDialog } from '../components/SettingsDialog';
import { GAME_TYPES, GameType, getDefaultGameType, getSelectableGameTypes, fetchGameTypes } from '../data/gameTypes';
import { saveGameToHistory } from '../lib/gameHistory';
import { StoneIcon, BanIcon } from '../components/icons/Icons';
import { Footer } from '../components/Footer';
import { GameTypeCarousel } from '../components/GameTypeCarousel';


const GameTypeSelection = () => {
    const navigate = useNavigate();

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
        // Initialize with defaults for each game type
        const defaults: Record<string, Record<string, number | boolean | string>> = {};
        GAME_TYPES.forEach(gt => {
            defaults[gt.id] = gt.defaultSettings;
        });
        return defaults;
    });

    // Track which game type's info/settings dialogs are open
    const [showInfoForGameType, setShowInfoForGameType] = useState<GameType | null>(null);
    const [showSettingsForGameType, setShowSettingsForGameType] = useState<GameType | null>(null);
    const [showBanSizeInfo, setShowBanSizeInfo] = useState(false);
    const [showStonesInfo, setShowStonesInfo] = useState(false);

    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Team Color State (per game type)
    const [teamColors, setTeamColors] = useState<Record<string, { team1: string; team2: string }>>({});
    const [showColorPicker, setShowColorPicker] = useState<{ gameTypeId: string; team: 'team1' | 'team2' } | null>(null);

    const PRESET_COLORS = [
        '#D22730', '#185494', '#FFDD00', '#00CC00',
        '#FF8800', '#9900FF', '#FF00AA', '#1A1A1A'
    ];



    useEffect(() => {
        localStorage.setItem('kicka_ettan_all_game_settings', JSON.stringify(allGameSettings));
    }, [allGameSettings]);

    // Fetch game types from API
    useEffect(() => {
        fetchGameTypes();
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

    const selectableGameTypes = getSelectableGameTypes();

    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-4 relative">
            <AnimatedBackground />

            <div className="h-10"></div>

            <div className="flex flex-col items-center justify-center w-full max-w-md">
                <div className="card-gradient backdrop-blur-md p-6 rounded-3xl shadow-2xl w-full text-center relative overflow-hidden z-10">
                    <div className="absolute top-0 left-0 w-48 h-48 bg-icy-accent rounded-full -translate-x-1/3 -translate-y-1/3 opacity-10 blur-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-icy-blue-medium rounded-full translate-x-1/4 translate-y-1/4 opacity-10 blur-3xl"></div>



                    <GameTitle className="mb-2 relative z-10" />

                    <p className="mb-4 text-gray-600 font-medium text-center relative z-10">
                        choose your game type
                    </p>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 text-red-600 font-medium rounded-2xl border border-red-100 relative z-10">
                            {error}
                        </div>
                    )}

                    {/* Game Type Carousel */}
                    <div className="relative z-10">
                        <GameTypeCarousel
                            gameTypes={selectableGameTypes}
                            onCreateGame={createGame}
                            onOpenSettings={(gameType) => setShowSettingsForGameType(gameType)}
                            onOpenInfo={(gameType) => setShowInfoForGameType(gameType)}
                            isLoading={isLoading}
                            getGameSettings={getGameSettings}
                            getTeamColors={getTeamColors}
                            onOpenColorPicker={(gameTypeId, team) => setShowColorPicker({ gameTypeId, team })}
                            updateGameSetting={updateGameSetting}
                            onOpenBanInfo={() => setShowBanSizeInfo(true)}
                            onOpenStonesInfo={() => setShowStonesInfo(true)}
                        />
                    </div>

                    {/* Back Button - At bottom of card */}
                    <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                        className="mt-6 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 relative z-10"
                    >
                        <ArrowLeft size={18} />
                        back to home
                    </Button>
                </div>

                <SettingsDialog />

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
                                                            onClick={() => updateGameSetting(showSettingsForGameType.id, key, option)}
                                                            className={`flex-1 h-12 ${isActive
                                                                ? '!bg-active text-white hover:!bg-lavender-600 !border-active'
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
                                );
                            })}
                        </div>
                    </Dialog>
                )}

                {/* Ban Circle Size Info Dialog */}
                <Dialog
                    isOpen={showBanSizeInfo}
                    onClose={() => setShowBanSizeInfo(false)}
                    title="ban circle sizes"
                    variant="info"
                    headerIcon={<BanIcon size={48} className="text-gray-400" />}
                >
                    <div className="space-y-5 px-2">
                        <p className="text-base text-gray-700 leading-relaxed">
                            The ban circle determines how much space you can block from your opponent during the ban phase.
                        </p>
                        <div className="space-y-3">
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">Small</h3>
                                <p className="text-sm text-gray-600">Radius: 30px — Pinpoint denials.</p>
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">Medium</h3>
                                <p className="text-sm text-gray-600">Radius: 60px — Balanced coverage.</p>
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">Large</h3>
                                <p className="text-sm text-gray-600">Radius: 90px — Wider area control.</p>
                            </div>
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">XL</h3>
                                <p className="text-sm text-gray-600">Radius: 120px — Maximum coverage.</p>
                            </div>
                        </div>
                    </div>
                </Dialog>

                {/* Stones Per Team Info Dialog */}
                <Dialog
                    isOpen={showStonesInfo}
                    onClose={() => setShowStonesInfo(false)}
                    title="stones per team"
                    variant="info"
                    headerIcon={<StoneIcon size={48} className="text-gray-400" />}
                >
                    <div className="space-y-5 px-2">
                        <p className="text-base text-gray-700 leading-relaxed">
                            <strong className="text-gray-900">Stones per team</strong> means how many stones you will pre place in the game.
                        </p>
                        <p className="text-base text-gray-700 leading-relaxed">
                            You are still using <strong className="text-gray-900">8</strong> (or more if you like) stones in total.
                        </p>
                    </div>
                </Dialog>
            </div>

            <Footer />
        </div>
    );
};

export default GameTypeSelection;
