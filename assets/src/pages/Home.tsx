import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, History, ChevronDown, ChevronUp, Info, Settings } from 'lucide-react';
import { AnimatedBackground } from '../components/AnimatedBackground';
import GameTitle from '../components/GameTitle';
import { Dialog, Button } from '../components/ui';
import { useSettings } from '../contexts/SettingsContext';
import { SettingsDialog } from '../components/SettingsDialog';
import { GAME_TYPES } from '../data/gameTypes';
import { Footer } from '../components/Footer';

const Home = () => {
    const navigate = useNavigate();
    const { openSettings } = useSettings();
    const [showHistory, setShowHistory] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

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

    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-4 relative">
            <AnimatedBackground />

            {/* Spacer for vertical centering balance */}
            <div className="h-10"></div>

            <div className="flex flex-col items-center justify-center w-full max-w-md">
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

                        <p className="text-base text-gray-700 leading-relaxed">
                            Instead of physically playing your lead stones, both teams use this app to strategically place them. Once decided, you set up the real stones on the ice in those positions and continue playing the rest of the end normally.
                        </p>

                        <div className="bg-white/50 p-5 rounded-xl border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">How It Works</h3>
                            <ol className="space-y-2.5 text-sm text-gray-700">
                                <li><strong className="text-gray-900">1.</strong> Both teams digitally place their lead stones during the placement phase</li>
                                <li><strong className="text-gray-900">2.</strong> After confirmation, all stone positions are revealed</li>
                                <li><strong className="text-gray-900">3.</strong> Go to the rink and physically set up stones in those exact positions</li>
                                <li><strong className="text-gray-900">4.</strong> Play the rest of the end with real stones from this setup</li>
                            </ol>
                        </div>

                        <p className="text-sm text-gray-500 italic text-center">
                            Skip the stones everyone forgets about anyway and get to the good part.
                        </p>
                    </div>
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

                    {/* Play Button */}
                    <Button
                        onClick={() => navigate('/play')}
                        shape="pill"
                        size="xl"
                        className="w-full bg-icy-accent hover:bg-icy-accent-hover text-white shadow-none animate-glow relative z-10 text-lg py-4 mb-4"
                    >
                        <Play size={20} fill="currentColor" />
                        play
                    </Button>

                    {/* Settings Button */}
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

                    {/* Last Played & Browse History */}
                    {history.length > 0 && (
                        <div className="relative z-10 border-t border-gray-200/50 pt-6 mt-6">
                            {/* Last Played Button */}
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/game/${history[0].gameId}`)}
                                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-gray-200 flex items-center !justify-between group animate-glow mb-4 h-auto"
                                noHoverAnimation
                            >
                                <div className="flex flex-col items-start gap-0">
                                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">last played</span>
                                    <span className="text-sm font-mono text-gray-600">
                                        {(() => {
                                            const gameType = history[0].gameTypeId ? GAME_TYPES.find(t => t.id === history[0].gameTypeId) : null;
                                            return gameType ? (
                                                <span className="font-bold text-periwinkle-600 mr-2">{gameType.name.toLowerCase()}</span>
                                            ) : null;
                                        })()}
                                        #{history[0].gameId.slice(0, 8)}
                                    </span>
                                </div>
                                <div className="bg-icy-blue-light text-black p-2 rounded-full group-hover:scale-110 transition-transform">
                                    <Play size={16} fill="currentColor" />
                                </div>
                            </Button>

                            {/* Browse History - Shows up to 9 games */}
                            {history.length > 1 && (
                                <div>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                                    >
                                        <History size={16} />
                                        {showHistory ? 'hide history' : 'browse history'}
                                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </Button>

                                    {showHistory && (
                                        <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                                            {history.slice(1, 10).map(game => {
                                                const gameType = game.gameTypeId ? GAME_TYPES.find(t => t.id === game.gameTypeId) : null;
                                                return (
                                                    <Button
                                                        variant="outline"
                                                        key={game.gameId}
                                                        onClick={() => navigate(`/game/${game.gameId}`)}
                                                        className="w-full bg-white/50 hover:bg-white text-left p-3 rounded-xl border border-gray-100 hover:border-gray-200 flex items-center !justify-between group h-auto !shadow-none"
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
                        </div>
                    )}
                </div>

                <SettingsDialog />
            </div>

            <Footer />
        </div>
    );
};

export default Home;
