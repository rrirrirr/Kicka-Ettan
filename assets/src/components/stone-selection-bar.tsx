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

    // Helper to render a static ghost stone
    const renderGhostStone = () => {
        const stoneColor = customColor || (color === 'red' ? '#ff0000' : '#ffdd00');
        // Calculate darker shade (copied from DraggableStone)
        const getBorderColor = (hexColor: string) => {
            const r = parseInt(hexColor.slice(1, 3), 16);
            const g = parseInt(hexColor.slice(3, 5), 16);
            const b = parseInt(hexColor.slice(5, 7), 16);
            const darkerR = Math.floor(r * 0.7);
            const darkerG = Math.floor(g * 0.7);
            const darkerB = Math.floor(b * 0.7);
            return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
        };
        const darkerShade = getBorderColor(stoneColor);

        return (
            <div
                style={{
                    width: stoneSize,
                    height: stoneSize,
                    borderRadius: '50%',
                    backgroundColor: stoneColor,
                    border: `2px solid #777777`,
                    boxShadow: `inset 0 0 0 1px ${darkerShade}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.3, // Ghost opacity
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none'
                }}
            >
                <div
                    style={{
                        width: stoneSize * 2 / 5,
                        height: stoneSize / 7,
                        backgroundColor: darkerShade,
                        borderRadius: stoneSize / 12,
                    }}
                />
            </div>
        );
    };

    return (
        <div className="relative w-full">
            <div
                className="w-full bg-blue-100 p-2 rounded-lg shadow-inner flex flex-nowrap justify-start gap-2 items-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            >
                {unplacedStones.length === 0 ? (
                    <div className="text-gray-500 italic w-full text-center">All stones placed</div>
                ) : (
                    unplacedStones.map(stone => (
                        <div key={`wrapper-${stone.index}`} className="shrink-0 relative">
                            {draggedStoneIndex === stone.index && renderGhostStone()}
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
