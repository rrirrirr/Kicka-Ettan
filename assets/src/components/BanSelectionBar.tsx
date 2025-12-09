import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DraggableBan from './DraggableBan';

export interface BanPosition {
    index: number;
    x: number;
    y: number;
    placed: boolean;
}

interface BanSelectionBarProps {
    bans: BanPosition[];
    onDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    onDrag?: (index: number, position: { x: number; y: number }) => void;
    disabled?: boolean;
    draggedBanIndex?: number | null;
}

const BanSelectionBar: React.FC<BanSelectionBarProps> = ({
    bans,
    onDragEnd,
    onDrag,
    disabled = false,
    draggedBanIndex = null,
}) => {
    // Filter for unplaced bans
    const unplacedBans = bans.filter(b => !b.placed);

    return (
        <motion.div
            className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-white/50 flex gap-4 items-center mx-auto overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <div className="flex gap-2">
                <AnimatePresence mode="popLayout">
                    {unplacedBans.map((ban) => (
                        <motion.div
                            key={ban.index}
                            layout
                            className="relative"
                        >
                            <DraggableBan
                                index={ban.index}
                                onDragEnd={onDragEnd}
                                onDrag={(idx, pos) => onDrag?.(idx, pos)}
                                size={44}
                                interactive={!disabled}
                                opacity={ban.index === draggedBanIndex ? 0.5 : 1}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {unplacedBans.length === 0 && (
                <div className="text-sm font-bold text-gray-400 px-2">
                    all bans placed
                </div>
            )}
        </motion.div>
    );
};

export default React.memo(BanSelectionBar);
