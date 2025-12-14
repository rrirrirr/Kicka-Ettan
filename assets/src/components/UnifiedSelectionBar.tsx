import React from 'react';
import { StonePosition } from '../types/game-types';
import { BanPosition } from './BanSelectionBar'; // Ref imports or redefine
import DraggableStone from './DraggableStone';
import DraggableBan from './DraggableBan';
import SelectionBar from './SelectionBar';

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
    disabled?: boolean; // Global disable (e.g. not my turn)
    waitingMessage?: string; // Message to show when waiting (e.g., "Waiting for opponent...")
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
    waitingMessage
}) => {
    if (!myColor) return null;

    // Show waiting message if disabled and message provided
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

    const unplacedStones = stones.filter(s => !s.placed);
    const unplacedBans = bans.filter(b => !b.placed);

    const stoneItems = unplacedStones.map((stone) => ({
        key: `stone-${stone.index}-${stone.resetCount || 0}`,
        content: (
            <div className={stonesLocked ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : ""}>
                <DraggableStone
                    color={myColor}
                    index={stone.index}
                    onDragEnd={onStoneDragEnd}
                    onDrag={(_i, pos) => onStoneDragStart?.(stone.index, pos)}
                    size={44}
                    interactive={!disabled && !stonesLocked}
                    opacity={stone.index === draggedStoneIndex ? 0 : 1}
                    customColor={teamColors ? teamColors[myColor] : undefined}
                />
            </div>
        ),
    }));

    const banItems = unplacedBans.map((ban) => ({
        key: `ban-${ban.index}`,
        content: (
            <div className={bansLocked ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : ""}>
                <DraggableBan
                    index={ban.index}
                    onDragEnd={onBanDragEnd}
                    onDrag={(idx, pos) => onBanDragStart?.(idx, pos)}
                    size={44}
                    interactive={!disabled && !bansLocked}
                    opacity={ban.index === draggedBanIndex ? 0.5 : 1}
                />
            </div>
        ),
    }));

    // Combine items
    // Order: Bans first? Or mixed?
    // Usually Ban phase comes first, so Bans first makes sense.
    // Or if mixed, maybe Bans first too.
    const items = [...banItems, ...stoneItems];

    return (
        <SelectionBar
            items={items}
            emptyMessage={stonesLocked && bansLocked ? "placement locked" : "all items placed"}
        />
    );
};

export default React.memo(UnifiedSelectionBar);
