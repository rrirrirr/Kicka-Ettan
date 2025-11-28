import React from 'react';
import DraggableStone from './draggable-stone';

interface StoneSelectionBarProps {
    stones: Array<{ index: number; placed: boolean }>;
    color: 'red' | 'yellow';
    customColor?: string;
    onStoneDragEnd: (index: number, position: { x: number; y: number }) => void;
    onStoneDrag?: (index: number, position: { x: number; y: number }) => void;
    stoneSize?: number;
    draggedStoneIndex?: number | null;
}

const StoneSelectionBar: React.FC<StoneSelectionBarProps> = ({
    stones,
    color,
    customColor,
    onStoneDragEnd,
    onStoneDrag,
    stoneSize = 40,
    draggedStoneIndex = null
}) => {
    const unplacedStones = stones.filter(s => !s.placed);

    return (
        <div className="relative w-full">
            <div
                className="w-full bg-blue-100 p-2 rounded-lg shadow-inner flex flex-nowrap justify-start gap-2 items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
                {unplacedStones.length === 0 ? (
                    <div className="text-gray-500 italic w-full text-center">All stones placed</div>
                ) : (
                    unplacedStones.map(stone => (
                        <div key={`wrapper-${stone.index}`} className="shrink-0">
                            <DraggableStone
                                key={`bar-${stone.index}-${(stone as any).resetCount || 0}`}
                                color={color}
                                customColor={customColor}
                                index={stone.index}
                                onDragEnd={onStoneDragEnd}
                                onDrag={onStoneDrag}
                                size={stoneSize}
                                opacity={draggedStoneIndex === stone.index ? 0 : 1}
                            />
                        </div>
                    ))
                )}
                {/* Spacer to ensure last item isn't cut off */}
                <div className="w-4 shrink-0" />
            </div>
        </div>
    );
};

export default StoneSelectionBar;
