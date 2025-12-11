import React from 'react';
import { StonePosition } from '../types/game-types';
import DraggableStone from './DraggableStone';
import SelectionBar from './SelectionBar';

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

    const items = unplacedStones.map((stone) => ({
        key: `${stone.index}-${stone.resetCount || 0}`,
        content: (
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
        ),
    }));

    return (
        <SelectionBar
            items={items}
            emptyMessage="all stones placed"
        />
    );
};

export default React.memo(StoneSelectionBar);
