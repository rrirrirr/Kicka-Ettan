import React from 'react';
import DraggableStone from './draggable-stone';

interface StoneSelectionBarProps {
    stones: Array<{ index: number; placed: boolean }>;
    color: 'red' | 'yellow';
    customColor?: string;
    onStoneDragEnd: (index: number, position: { x: number; y: number }, offset: { x: number; y: number }) => void;
    stoneSize?: number;
}

const StoneSelectionBar: React.FC<StoneSelectionBarProps> = ({
    stones,
    color,
    customColor,
    onStoneDragEnd,
    stoneSize = 40
}) => {
    const unplacedStones = stones.filter(s => !s.placed);

    return (
        <div className="w-full bg-blue-100 p-4 rounded-lg shadow-inner flex flex-wrap justify-center gap-4 items-center">
            {unplacedStones.length === 0 ? (
                <div className="text-gray-500 italic w-full text-center">All stones placed</div>
            ) : (
                unplacedStones.map(stone => (
                    <DraggableStone
                        key={`bar-${stone.index}-${(stone as any).resetCount || 0}`}
                        color={color}
                        customColor={customColor}
                        index={stone.index}
                        onDragEnd={onStoneDragEnd}
                        size={stoneSize}
                    />
                ))
            )}
        </div>
    );
};

export default StoneSelectionBar;
