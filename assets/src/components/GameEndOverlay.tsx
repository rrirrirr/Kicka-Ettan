import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface GameEndOverlayProps {
    isVisible: boolean;
    scores: { red: number; yellow: number };
    myColor?: 'red' | 'yellow' | null;
    teamColors?: { red: string; yellow: string };
    onReturnHome: () => void;
}

export const GameEndOverlay = ({
    isVisible,
    scores,
    myColor,
    teamColors,
    onReturnHome
}: GameEndOverlayProps) => {
    const redScore = scores?.red || 0;
    const yellowScore = scores?.yellow || 0;

    // Determine winner
    let winner: 'red' | 'yellow' | 'tie' = 'tie';
    if (redScore > yellowScore) winner = 'red';
    else if (yellowScore > redScore) winner = 'yellow';

    const isWinner = myColor === winner;
    const isTie = winner === 'tie';

    // Get display names/colors
    const redColorHex = teamColors?.red || '#D22730';
    const yellowColorHex = teamColors?.yellow || '#185494';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25
                        }}
                        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg p-8 text-center relative"
                    >
                        {/* Background Splashes */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200/20 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-200/20 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            {/* Icon / Result Header */}
                            <div className="mb-6 flex justify-center">
                                <div className={`p-4 rounded-full ${isTie ? 'bg-gray-100' : isWinner ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                                    <Trophy
                                        size={48}
                                        className={isTie ? 'text-gray-500' : isWinner ? 'text-yellow-500' : 'text-gray-400'}
                                    />
                                </div>
                            </div>

                            <h2 className="text-4xl font-black text-gray-900 mb-2 lowercase tracking-tight">
                                {isTie ? "it's a draw!" : isWinner ? "victory!" : "game over"}
                            </h2>

                            <p className="text-gray-500 mb-8 font-medium">
                                {isTie
                                    ? "well played both teams"
                                    : winner === 'red'
                                        ? "team 1 takes the win"
                                        : "team 2 takes the win"
                                }
                            </p>

                            {/* Score Display */}
                            <div className="flex items-center justify-center gap-8 mb-10">
                                <div className="text-center">
                                    <div
                                        className="w-4 h-4 rounded-full mx-auto mb-2 shadow-sm"
                                        style={{ backgroundColor: redColorHex }}
                                    />
                                    <span className="block text-5xl font-black text-gray-900 tabular-nums">
                                        {redScore}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Team 1
                                    </span>
                                </div>

                                <div className="text-gray-300 text-4xl font-light">
                                    -
                                </div>

                                <div className="text-center">
                                    <div
                                        className="w-4 h-4 rounded-full mx-auto mb-2 shadow-sm"
                                        style={{ backgroundColor: yellowColorHex }}
                                    />
                                    <span className="block text-5xl font-black text-gray-900 tabular-nums">
                                        {yellowScore}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Team 2
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button
                                    onClick={onReturnHome}
                                    size="lg"
                                    className="w-full justify-center bg-gray-900 hover:bg-gray-800 text-white"
                                >
                                    <Home size={18} className="mr-2" />
                                    return home
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
