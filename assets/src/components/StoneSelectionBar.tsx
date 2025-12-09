import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StonePosition } from '../types/game-types';
import DraggableStone from './DraggableStone';

interface StoneSelectionBarProps {
    stones: StonePosition[];
    myColor: 'red' | 'yellow' | null;
    onDragStart?: (index: number, position: { x: number; y: number }) => void;
    onDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    disabled?: boolean;
    draggedStoneIndex?: number | null;
    teamColors?: { red: string; yellow: string };
}

const StoneSelectionBar: React.FC<StoneSelectionBarProps> = ({
    stones,
    myColor,
    onDragStart,
    onDragEnd,
    disabled = false,
    draggedStoneIndex = null,
    teamColors
}) => {
    if (!myColor) return null;

    // Filter for unplaced stones
    const unplacedStones = stones.filter(s => !s.placed);

    return (
        <motion.div
            className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-white/50 flex gap-4 items-center mx-auto overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <div className="flex gap-2">
                <AnimatePresence mode="popLayout">
                    {unplacedStones.map((stone) => (
                        <motion.div
                            key={`${stone.index}-${stone.resetCount || 0}`}
                            layout
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="relative"
                        >
                            <DraggableStone
                                color={myColor}
                                index={stone.index}
                                onDragEnd={onDragEnd}
                                onDrag={(_i, pos) => onDragStart?.(stone.index, pos)}
                                size={44} // Fixed size for the bar
                                interactive={!disabled}
                                opacity={stone.index === draggedStoneIndex ? 0 : 1}
                                customColor={teamColors ? teamColors[myColor] : undefined}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {unplacedStones.length === 0 && (
                <div
                    className="text-sm font-bold text-gray-400 px-2"
                >
                    all stones placed
                </div>
            )}
        </motion.div>
    );
};

export default React.memo(StoneSelectionBar);
