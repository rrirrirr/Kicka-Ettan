import React, { ReactNode, useRef, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectionBarItem {
    key: string | number;
    content: ReactNode;
    originalIndex?: number;
}

interface SelectionBarProps {
    items: SelectionBarItem[];
    emptyMessage?: string;
    className?: string;
    // Drag state for preview
    draggingKey?: string | null;
    dragX?: number;
    // Callback when insertion index changes (for syncing with parent)
    onInsertionIndexChange?: (index: number) => void;
}

/**
 * A generic selection bar component that can hold any type of draggable items.
 * Supports visual preview of reorder by showing gaps where items would be placed.
 */
const SelectionBar: React.FC<SelectionBarProps> = ({
    items,
    emptyMessage = "all items placed",
    className = "",
    draggingKey = null,
    dragX,
    onInsertionIndexChange,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    // Track stable item positions (captured when drag starts, before placeholder is added)
    const stablePositionsRef = useRef<Map<string, number>>(new Map());
    const [, forceUpdate] = useState(0);

    // Capture positions when items change (but not during drag)
    useEffect(() => {
        if (draggingKey) return; // Don't update during drag

        // Use a small delay to ensure layout is settled
        const timer = setTimeout(() => {
            if (!containerRef.current) return;

            const newPositions = new Map<string, number>();
            const itemElements = containerRef.current.querySelectorAll('[data-item-key]');

            for (const element of itemElements) {
                const key = element.getAttribute('data-item-key');
                if (key) {
                    const rect = element.getBoundingClientRect();
                    newPositions.set(key, rect.left + rect.width / 2);
                }
            }

            stablePositionsRef.current = newPositions;
        }, 50);

        return () => clearTimeout(timer);
    }, [items, draggingKey]);

    // Capture positions when drag starts
    useEffect(() => {
        if (!draggingKey) return;

        // Capture current positions at drag start
        if (!containerRef.current) return;

        const newPositions = new Map<string, number>();
        const itemElements = containerRef.current.querySelectorAll('[data-item-key]');

        for (const element of itemElements) {
            const key = element.getAttribute('data-item-key');
            if (key && key !== draggingKey) {
                const rect = element.getBoundingClientRect();
                newPositions.set(key, rect.left + rect.width / 2);
            }
        }

        stablePositionsRef.current = newPositions;
        forceUpdate(n => n + 1);
    }, [draggingKey]); // Only when drag starts

    // Calculate insertion index based on drag X position using stable positions
    const insertionIndex = useMemo(() => {
        if (!draggingKey || dragX === undefined) return -1;

        // Check if dragX is within bar bounds
        if (containerRef.current) {
            const barRect = containerRef.current.getBoundingClientRect();
            if (dragX < barRect.left || dragX > barRect.right) return -1;
        }

        // Get sorted positions (excluding dragged item)
        const positions: { key: string; centerX: number }[] = [];

        for (const item of items) {
            const key = String(item.key);
            if (key === draggingKey) continue;

            const centerX = stablePositionsRef.current.get(key);
            if (centerX !== undefined) {
                positions.push({ key, centerX });
            }
        }

        positions.sort((a, b) => a.centerX - b.centerX);

        // Find insertion point
        for (let i = 0; i < positions.length; i++) {
            if (dragX < positions[i].centerX) {
                return i;
            }
        }
        return positions.length;
    }, [draggingKey, dragX, items]);

    // Notify parent when insertion index changes
    useEffect(() => {
        onInsertionIndexChange?.(insertionIndex);
    }, [insertionIndex, onInsertionIndexChange]);

    // Build items with gap for preview
    const displayItems = useMemo(() => {
        if (!draggingKey || insertionIndex < 0) {
            return items;
        }

        // Filter out the dragged item
        const filtered = items.filter(item => String(item.key) !== draggingKey);

        // Insert a placeholder at the insertion index
        const result: (SelectionBarItem | { key: string; isPlaceholder: true })[] = [...filtered];
        result.splice(insertionIndex, 0, { key: 'drag-placeholder', isPlaceholder: true });

        return result;
    }, [items, draggingKey, insertionIndex]);

    return (
        <motion.div
            ref={containerRef}
            data-testid="selection-bar"
            className={`bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-white/50 flex gap-4 items-center mx-auto overflow-x-auto scrollbar-hide ${className}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <div className="flex gap-2 items-center">
                <AnimatePresence mode="popLayout">
                    {displayItems.map((item) => {
                        // Placeholder for drag preview
                        if ('isPlaceholder' in item && item.isPlaceholder) {
                            return (
                                <motion.div
                                    key="drag-placeholder"
                                    layout
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 44, opacity: 0.4 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="h-11 rounded-full bg-gray-300 border-2 border-dashed border-gray-400"
                                />
                            );
                        }

                        // Regular item
                        const regularItem = item as SelectionBarItem;
                        const isDragging = String(regularItem.key) === draggingKey;

                        return (
                            <motion.div
                                key={regularItem.key}
                                layout
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: isDragging ? 0.3 : 1,
                                }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="relative"
                                data-item-key={regularItem.key}
                            >
                                {regularItem.content}
                            </motion.div>
                        );
                    })}
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

// Export helper to check if a point is inside the selection bar
export function isPointInSelectionBar(x: number, y: number): boolean {
    const bar = document.querySelector('[data-testid="selection-bar"]');
    if (!bar) return false;
    const rect = bar.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// Get the insertion index at a specific x position in the selection bar
export function getInsertionIndexAtPoint(x: number, excludeKey?: string): number {
    const bar = document.querySelector('[data-testid="selection-bar"]');
    if (!bar) return -1;

    const items = bar.querySelectorAll('[data-item-key]');
    const positions: { centerX: number }[] = [];

    for (const item of items) {
        const key = item.getAttribute('data-item-key');
        if (key === excludeKey) continue;
        const rect = item.getBoundingClientRect();
        positions.push({ centerX: rect.left + rect.width / 2 });
    }

    positions.sort((a, b) => a.centerX - b.centerX);

    for (let i = 0; i < positions.length; i++) {
        if (x < positions[i].centerX) {
            return i;
        }
    }
    return positions.length;
}
