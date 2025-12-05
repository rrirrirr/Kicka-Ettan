import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, springs } from '../utils/animations';
import { StonePosition } from '../types/game-types';
import DraggableStone from './DraggableStone';

interface StoneSelectionBarProps {
    stones: StonePosition[];
    myColor: 'red' | 'yellow' | null;
    onDragStart?: (index: number, position: { x: number; y: number }) => void;
    onDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    disabled?: boolean;
}

const StoneSelectionBar: React.FC<StoneSelectionBarProps> = ({
    stones,
    myColor,
    onDragStart,
    onDragEnd,
    disabled = false
}) => {
    if (!myColor) return null;

    // Filter for unplaced stones
    const unplacedStones = stones.filter(s => !s.placed);

    return (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center items-end pointer-events-none z-50">
            <motion.div
                className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 pointer-events-auto flex gap-4 items-center"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ ...springs.snappy, delay: 0.2 }}
            >
                <div className="flex gap-2">
                    <AnimatePresence mode="popLayout">
                        {unplacedStones.map((stone) => (
                            <motion.div
                                key={stone.index}
                                layout
                                variants={fadeUp}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="relative"
                            >
                                <DraggableStone
                                    color={myColor}
                                    index={stone.index}
                                    onDragEnd={onDragEnd}
                                    onDrag={(_i, pos) => onDragStart?.(stone.index, pos)}
                                    size={44} // Fixed size for the bar
                                    interactive={!disabled}
                                />
                                {(stone.resetCount || 0) > 0 && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"
                                    />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {unplacedStones.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-sm font-bold text-gray-400 px-2"
                    >
                        all stones placed
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default StoneSelectionBar;
