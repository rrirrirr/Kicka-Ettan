import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StonePosition } from '../types/game-types';
import { BanPosition } from './BanSelectionBar';
import DraggableStone from './DraggableStone';
import DraggableBan from './DraggableBan';
import SelectionBar, { SelectionBarItem, isPointInSelectionBar } from './SelectionBar';

interface UnifiedSelectionBarProps {
    stones: StonePosition[];
    bans: BanPosition[];
    myColor: 'red' | 'yellow' | null;
    onStoneDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    onStoneDragStart?: (index: number, position: { x: number; y: number }) => void;
    onBanDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    onBanDragStart?: (index: number, position: { x: number; y: number }) => void;
    draggedStoneIndex?: number | null;
    draggedBanIndex?: number | null;
    teamColors?: { red: string; yellow: string };

    // Lock states
    stonesLocked?: boolean;
    bansLocked?: boolean;
    disabled?: boolean;
    waitingMessage?: string;

    // External drag state (for items being dragged from sheet back to bar)
    // When set, shows placeholder and tracks insertion position for sheet-to-bar drops
    externalDragState?: {
        type: 'stone' | 'ban';
        index: number;
        x: number;  // Current drag X position
        isOverBar: boolean;  // Whether hovering over the bar
    } | null;
}

type ItemType = 'stone' | 'ban';

interface OrderedItem {
    type: ItemType;
    originalIndex: number;
}

const UnifiedSelectionBar: React.FC<UnifiedSelectionBarProps> = ({
    stones,
    bans,
    myColor,
    onStoneDragEnd,
    onStoneDragStart,
    onBanDragEnd,
    onBanDragStart,
    draggedStoneIndex = null,
    draggedBanIndex = null,
    teamColors,
    stonesLocked = false,
    bansLocked = false,
    disabled = false,
    waitingMessage,
    externalDragState = null
}) => {
    const [itemOrder, setItemOrder] = useState<OrderedItem[]>([]);
    const [resetKey, setResetKey] = useState(0);
    const [dragState, setDragState] = useState<{
        key: string | null;
        x: number;
        isOverBar: boolean;
    }>({ key: null, x: 0, isOverBar: false });

    // Store last valid insertion index for use at drop time
    const lastInsertionIndexRef = useRef<number>(-1);

    // Store external drag insertion index (for items coming from sheet)
    const externalInsertionIndexRef = useRef<number>(-1);

    // Build initial order when items change
    // When a new item becomes unplaced (returns from sheet), insert it at the
    // external insertion index if available, otherwise append to end
    useEffect(() => {
        const unplacedStones = stones.filter(s => !s.placed);
        const unplacedBans = bans.filter(b => !b.placed);

        const currentItems = new Set([
            ...unplacedBans.map(b => `ban-${b.index}`),
            ...unplacedStones.map(s => `stone-${s.index}`)
        ]);

        const filteredOrder = itemOrder.filter(item => {
            const key = `${item.type}-${item.originalIndex}`;
            return currentItems.has(key);
        });

        const orderedKeys = new Set(filteredOrder.map(i => `${i.type}-${i.originalIndex}`));
        const newBans: OrderedItem[] = unplacedBans
            .filter(b => !orderedKeys.has(`ban-${b.index}`))
            .map(b => ({ type: 'ban' as ItemType, originalIndex: b.index }));
        const newStones: OrderedItem[] = unplacedStones
            .filter(s => !orderedKeys.has(`stone-${s.index}`))
            .map(s => ({ type: 'stone' as ItemType, originalIndex: s.index }));

        // If we have new items and an external insertion index was set, use it
        const newItems = [...newBans, ...newStones];

        if (newItems.length > 0 && externalInsertionIndexRef.current >= 0) {
            // Insert new items at the external insertion position
            const result = [...filteredOrder];
            const insertAt = Math.min(externalInsertionIndexRef.current, result.length);
            result.splice(insertAt, 0, ...newItems);
            externalInsertionIndexRef.current = -1; // Reset after use

            if (JSON.stringify(result) !== JSON.stringify(itemOrder)) {
                setItemOrder(result);
            }
        } else {
            // Default behavior: append new items at the end
            const newOrder = [...filteredOrder, ...newItems];

            if (JSON.stringify(newOrder) !== JSON.stringify(itemOrder)) {
                setItemOrder(newOrder);
            }
        }
    }, [stones, bans]);

    // Reorder items by moving item from fromKey to toIndex
    // Note: toIndex is calculated by SelectionBar with the dragged item already excluded,
    // so we don't need further adjustment - just remove the item and insert at toIndex
    const reorderByIndex = useCallback((fromKey: string, toIndex: number) => {
        setItemOrder(prev => {
            const newOrder = [...prev];
            const fromIndex = newOrder.findIndex(item =>
                `${item.type}-${item.originalIndex}` === fromKey
            );

            if (fromIndex === -1 || toIndex < 0) return prev;
            if (fromIndex === toIndex) return prev;

            const [item] = newOrder.splice(fromIndex, 1);
            // Insert at toIndex directly - no adjustment needed because toIndex
            // was calculated based on the array without the dragged item
            newOrder.splice(toIndex, 0, item);

            return newOrder;
        });
    }, []);

    // Callback from SelectionBar when insertion index changes
    const handleInsertionIndexChange = useCallback((index: number) => {
        lastInsertionIndexRef.current = index;
    }, []);

    // Handle stone drag
    const handleStoneDrag = useCallback((index: number, position: { x: number; y: number }) => {
        const key = `stone-${index}`;
        const isOverBar = isPointInSelectionBar(position.x, position.y);
        setDragState({ key, x: position.x, isOverBar });
        onStoneDragStart?.(index, position);
    }, [onStoneDragStart]);

    // Handle stone drag end
    const handleStoneDragEnd = useCallback((index: number, dropPoint: { x: number; y: number }) => {
        const draggedItemKey = `stone-${index}`;
        const insertionIndex = lastInsertionIndexRef.current;

        // Clear drag state
        setDragState({ key: null, x: 0, isOverBar: false });
        lastInsertionIndexRef.current = -1;

        // Check if dropped on the selection bar
        if (isPointInSelectionBar(dropPoint.x, dropPoint.y) && insertionIndex >= 0) {
            // Use the same insertion index that was shown in preview
            reorderByIndex(draggedItemKey, insertionIndex);
            setResetKey(k => k + 1);
            return;
        }

        // Normal drop on sheet
        onStoneDragEnd(index, dropPoint);
    }, [onStoneDragEnd, reorderByIndex]);

    // Handle ban drag
    const handleBanDrag = useCallback((index: number, position: { x: number; y: number }) => {
        const key = `ban-${index}`;
        const isOverBar = isPointInSelectionBar(position.x, position.y);
        setDragState({ key, x: position.x, isOverBar });
        onBanDragStart?.(index, position);
    }, [onBanDragStart]);

    // Handle ban drag end
    const handleBanDragEnd = useCallback((index: number, dropPoint: { x: number; y: number }) => {
        const draggedItemKey = `ban-${index}`;
        const insertionIndex = lastInsertionIndexRef.current;

        // Clear drag state
        setDragState({ key: null, x: 0, isOverBar: false });
        lastInsertionIndexRef.current = -1;

        // Check if dropped on the selection bar
        if (isPointInSelectionBar(dropPoint.x, dropPoint.y) && insertionIndex >= 0) {
            // Use the same insertion index that was shown in preview
            reorderByIndex(draggedItemKey, insertionIndex);
            setResetKey(k => k + 1);
            return;
        }

        // Normal drop on sheet
        onBanDragEnd(index, dropPoint);
    }, [onBanDragEnd, reorderByIndex]);

    if (!myColor) return null;

    if (disabled && waitingMessage) {
        return (
            <div className="relative">
                <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-surface-200 animate-pulse">
                        {waitingMessage}
                    </span>
                </div>
                <div className="opacity-30 pointer-events-none">
                    <SelectionBar
                        items={[]}
                        emptyMessage="waiting..."
                    />
                </div>
            </div>
        );
    }

    const stoneMap = new Map(stones.filter(s => !s.placed).map(s => [s.index, s]));
    const banMap = new Map(bans.filter(b => !b.placed).map(b => [b.index, b]));

    const items: SelectionBarItem[] = itemOrder
        .map(orderedItem => {
            if (orderedItem.type === 'ban') {
                const ban = banMap.get(orderedItem.originalIndex);
                if (!ban) return null;
                return {
                    key: `ban-${ban.index}`,
                    originalIndex: ban.index,
                    content: (
                        <div className={bansLocked ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : ""}>
                            <DraggableBan
                                index={ban.index}
                                onDragEnd={handleBanDragEnd}
                                onDrag={handleBanDrag}
                                size={44}
                                interactive={!disabled && !bansLocked}
                                opacity={ban.index === draggedBanIndex ? 0.5 : 1}
                                resetKey={resetKey}
                            />
                        </div>
                    ),
                };
            } else {
                const stone = stoneMap.get(orderedItem.originalIndex);
                if (!stone) return null;
                return {
                    key: `stone-${stone.index}`,
                    originalIndex: stone.index,
                    content: (
                        <div className={stonesLocked ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : ""}>
                            <DraggableStone
                                color={myColor}
                                index={stone.index}
                                onDragEnd={handleStoneDragEnd}
                                onDrag={handleStoneDrag}
                                size={44}
                                interactive={!disabled && !stonesLocked}
                                opacity={stone.index === draggedStoneIndex ? 0 : 1}
                                customColor={teamColors ? teamColors[myColor] : undefined}
                                resetKey={resetKey}
                            />
                        </div>
                    ),
                };
            }
        })
        .filter(Boolean) as SelectionBarItem[];

    // Track external drag state and update insertion index
    // This allows items dragged from the sheet to be inserted at the correct position
    useEffect(() => {
        if (externalDragState?.isOverBar && externalDragState.x !== undefined) {
            // External drag is over the bar - capture the insertion index
            externalInsertionIndexRef.current = lastInsertionIndexRef.current;
        } else if (!externalDragState) {
            // External drag ended but externalInsertionIndexRef is preserved
            // It will be used by the stones/bans effect when the item becomes unplaced
        }
    }, [externalDragState?.isOverBar, externalDragState?.x]);

    // Determine the effective drag state for SelectionBar
    // Priority: internal drag (from bar) > external drag (from sheet)
    const effectiveDragKey = (() => {
        if (dragState.isOverBar && dragState.key) return dragState.key;
        if (externalDragState?.isOverBar) return `${externalDragState.type}-${externalDragState.index}`;
        return null;
    })();

    const effectiveDragX = (() => {
        if (dragState.isOverBar) return dragState.x;
        if (externalDragState?.isOverBar) return externalDragState.x;
        return undefined;
    })();

    return (
        <SelectionBar
            items={items}
            emptyMessage={stonesLocked && bansLocked ? "placement locked" : "all items placed"}
            draggingKey={effectiveDragKey}
            dragX={effectiveDragX}
            onInsertionIndexChange={handleInsertionIndexChange}
        />
    );
};

export default React.memo(UnifiedSelectionBar);
