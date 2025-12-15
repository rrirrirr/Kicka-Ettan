import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceResultOverlayProps {
    isVisible: boolean;
    myRoll: number;
    opponentRoll: number;
    winnerId: string;
    myPlayerId: string;
    teamColors: { red: string; yellow: string };
    myColor: 'red' | 'yellow';
    onClose: () => void;
}

// Simple dice face component
const DiceFace: React.FC<{ value: number; color: string; delay?: number }> = ({ value, color, delay = 0 }) => {
    const [showValue, setShowValue] = useState(false);
    const [rollingValue, setRollingValue] = useState(1);
    // Store initial delay to prevent animation restart on prop changes
    const initialDelay = React.useRef(delay);

    useEffect(() => {
        // Animate through random values
        const rollInterval = setInterval(() => {
            setRollingValue(Math.floor(Math.random() * 6) + 1);
        }, 80);

        // Stop rolling and show final value
        const timeout = setTimeout(() => {
            clearInterval(rollInterval);
            setShowValue(true);
        }, 1000 + initialDelay.current);

        return () => {
            clearInterval(rollInterval);
            clearTimeout(timeout);
        };
    }, []); // Run only once on mount

    const displayValue = showValue ? value : rollingValue;

    // Dot positions for each dice value
    const dotPositions: Record<number, [number, number][]> = {
        1: [[50, 50]],
        2: [[25, 25], [75, 75]],
        3: [[25, 25], [50, 50], [75, 75]],
        4: [[25, 25], [75, 25], [25, 75], [75, 75]],
        5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
        6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };

    const dots = dotPositions[displayValue] || [];

    return (
        <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{
                scale: 1,
                rotate: showValue ? 0 : [0, 10, -10, 5, -5, 0],
            }}
            transition={{
                scale: { duration: 0.4, delay: delay / 1000 },
                rotate: { duration: 0.1, repeat: showValue ? 0 : Infinity }
            }}
            className="w-20 h-20 rounded-xl shadow-lg flex items-center justify-center relative"
            style={{
                backgroundColor: 'white',
                border: `3px solid ${color}`,
            }}
        >
            {dots.map(([x, y], i) => (
                <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        backgroundColor: color,
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}
        </motion.div>
    );
};

export const DiceResultOverlay: React.FC<DiceResultOverlayProps> = ({
    isVisible,
    myRoll,
    opponentRoll,
    winnerId,
    myPlayerId,
    teamColors,
    myColor,
    onClose,
}) => {
    const [showWinner, setShowWinner] = useState(false);

    const iWon = winnerId === myPlayerId;
    const myTeamColor = teamColors[myColor] || (myColor === 'red' ? '#cc0000' : '#e6b800');
    const opponentColor = myColor === 'red' ? 'yellow' : 'red';
    const opponentTeamColor = teamColors[opponentColor] || (opponentColor === 'red' ? '#cc0000' : '#e6b800');

    useEffect(() => {
        if (isVisible) {
            // Show winner after dice animation completes (about 1.2s per die + 0.5s buffer)
            const timeout = setTimeout(() => {
                setShowWinner(true);
            }, 1800);
            return () => clearTimeout(timeout);
        } else {
            setShowWinner(false);
        }
    }, [isVisible]);

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    data-testid="dice-roll-overlay"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-gradient-to-br from-white to-gray-100 rounded-3xl shadow-2xl p-8 max-w-sm mx-4 text-center"
                        data-testid="dice-roll-dialog"
                    >
                        <h2 className="text-2xl font-bold text-gray-800 mb-6" data-testid="dice-roll-title">Rolling dice...</h2>

                        {/* Dice display */}
                        <div className="flex items-center justify-center gap-8 mb-6">
                            {/* My dice */}
                            <div className="flex flex-col items-center gap-2">
                                <DiceFace value={myRoll} color={myTeamColor} delay={0} />
                                <span className="text-sm font-medium text-gray-600">You</span>
                            </div>

                            <span className="text-2xl font-bold text-gray-400">vs</span>

                            {/* Opponent dice */}
                            <div className="flex flex-col items-center gap-2">
                                <DiceFace value={opponentRoll} color={opponentTeamColor} delay={200} />
                                <span className="text-sm font-medium text-gray-600">Opponent</span>
                            </div>
                        </div>

                        {/* Winner announcement */}
                        <AnimatePresence>
                            {showWinner && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="mt-4"
                                >
                                    <p className="text-lg text-gray-600 mb-2">
                                        {myRoll} vs {opponentRoll}
                                    </p>
                                    <p
                                        className="text-2xl font-black mb-4"
                                        style={{ color: iWon ? myTeamColor : opponentTeamColor }}
                                    >
                                        {iWon ? '🎉 You start!' : 'Opponent starts'}
                                    </p>
                                    <p className="text-sm text-gray-400 mb-6">
                                        Lowest roll wins
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-3 bg-lavender-500 hover:bg-lavender-600 text-white font-semibold rounded-xl transition-colors shadow-md"
                                    >
                                        Continue
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DiceResultOverlay;
