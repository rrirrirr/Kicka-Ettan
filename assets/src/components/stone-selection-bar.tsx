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

    const gestureState = React.useRef<{
        type: 'IDLE' | 'PENDING' | 'DRAGGING';
        stoneIndex: number | null;
        startX: number;
        startY: number;
        startTime: number;
    }>({ type: 'IDLE', stoneIndex: null, startX: 0, startY: 0, startTime: 0 });

    React.useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (gestureState.current.type === 'PENDING') {
                const { startX, startY, stoneIndex, startTime } = gestureState.current;
                const moveDist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
                const timeElapsed = Date.now() - startTime;

                if (moveDist > 5 && timeElapsed > 200) { // Drag threshold: >5px AND >200ms
                    gestureState.current = { ...gestureState.current, type: 'DRAGGING' };
                    if (onStoneDrag && stoneIndex !== null) {
                        onStoneDrag(stoneIndex, { x: e.clientX, y: e.clientY });
                    }
                }
            } else if (gestureState.current.type === 'DRAGGING') {
                if (onStoneDrag && gestureState.current.stoneIndex !== null) {
                    onStoneDrag(gestureState.current.stoneIndex, { x: e.clientX, y: e.clientY });
                }
            }
        };

        const handleGlobalPointerUp = (e: PointerEvent) => {
            if (gestureState.current.type === 'DRAGGING') {
                if (onStoneDragEnd && gestureState.current.stoneIndex !== null) {
                    onStoneDragEnd(gestureState.current.stoneIndex, { x: e.clientX, y: e.clientY });
                }
            }
            // If PENDING, it was just a click (no drag), so we do nothing but reset
            gestureState.current = { type: 'IDLE', stoneIndex: null, startX: 0, startY: 0, startTime: 0 };
        };

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);

        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [onStoneDrag, onStoneDragEnd]);

    const handlePointerDown = (e: React.PointerEvent, index: number) => {
        e.preventDefault(); // Prevent default touch actions
        gestureState.current = {
            type: 'PENDING',
            stoneIndex: index,
            startX: e.clientX,
            startY: e.clientY,
            startTime: Date.now()
        };
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
                        <div
                            key={`wrapper-${stone.index}`}
                            className="shrink-0 relative touch-none"
                            onPointerDown={(e) => handlePointerDown(e, stone.index)}
                        >
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
                                interactive={false} // Disable internal drag, handle externally
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
