import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectionBarItem {
    key: string | number;
    content: ReactNode;
}

interface SelectionBarProps {
    items: SelectionBarItem[];
    emptyMessage?: string;
    className?: string;
}

/**
 * A generic selection bar component that can hold any type of draggable items.
 * Used for stones, ban circles, or any future draggable objects.
 * 
 * @example
 * // With stones
 * <SelectionBar
 *   items={unplacedStones.map(stone => ({
 *     key: stone.index,
 *     content: <DraggableStone ... />
 *   }))}
 *   emptyMessage="all stones placed"
 * />
 * 
 * @example
 * // Mixed items (stones + bans)
 * <SelectionBar
 *   items={[
 *     ...bans.map(ban => ({ key: `ban-${ban.index}`, content: <DraggableBan ... /> })),
 *     ...stones.map(stone => ({ key: `stone-${stone.index}`, content: <DraggableStone ... /> })),
 *   ]}
 *   emptyMessage="all items placed"
 * />
 */
const SelectionBar: React.FC<SelectionBarProps> = ({
    items,
    emptyMessage = "all items placed",
    className = "",
}) => {
    return (
        <motion.div
            className={`bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-white/50 flex gap-4 items-center mx-auto overflow-x-auto scrollbar-hide ${className}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <div className="flex gap-2">
                <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                        <motion.div
                            key={item.key}
                            layout
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            className="relative"
                        >
                            {item.content}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {items.length === 0 && (
                <div className="text-sm font-bold text-gray-400 px-2">
                    {emptyMessage}
                </div>
            )}
        </motion.div>
    );
};

export default React.memo(SelectionBar);
