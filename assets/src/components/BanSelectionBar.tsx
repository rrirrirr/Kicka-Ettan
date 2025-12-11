import React from 'react';
import DraggableBan from './DraggableBan';
import SelectionBar from './SelectionBar';

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

    const items = unplacedBans.map((ban) => ({
        key: ban.index,
        content: (
            <DraggableBan
                index={ban.index}
                onDragEnd={onDragEnd}
                onDrag={(idx, pos) => onDrag?.(idx, pos)}
                size={44}
                interactive={!disabled}
                opacity={ban.index === draggedBanIndex ? 0.5 : 1}
            />
        ),
    }));

    return (
        <SelectionBar
            items={items}
            emptyMessage="all bans placed"
        />
    );
};

export default React.memo(BanSelectionBar);
