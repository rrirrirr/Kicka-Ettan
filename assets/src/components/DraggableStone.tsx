import React, { useEffect } from 'react';
import { motion, useMotionValue, useAnimation } from 'framer-motion';

interface DraggableStoneProps {
    color: 'red' | 'yellow';
    customColor?: string;
    index: number;
    position?: { x: number; y: number };
    onDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    onDrag?: (index: number, position: { x: number; y: number }) => void;
    isPlaced?: boolean;
    size?: number;
    onClick?: (e: React.MouseEvent) => void;
    opacity?: number;
    interactive?: boolean;
    // New: reset key - when this changes, position resets to origin
    resetKey?: number;
}

const DraggableStone: React.FC<DraggableStoneProps> = ({
    color,
    customColor,
    index,
    position,
    onDragEnd,
    onDrag,
    isPlaced = false,
    size = 40,
    onClick,
    opacity = 1,
    interactive = true,
    resetKey = 0
}) => {
    const stoneColor = customColor || (color === 'red' ? '#ff0000' : '#ffdd00');
    // Calculate a darker shade for handle and inner border
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

    // Motion values for controlled drag position
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const controls = useAnimation();

    // Reset position when resetKey changes
    useEffect(() => {
        x.set(0);
        y.set(0);
    }, [resetKey, x, y]);

    if (!interactive) {
        return (
            <div
                className="animate-glow"
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: stoneColor,
                    border: `2px solid #777777`,
                    boxShadow: `inset 0 0 0 1px ${darkerShade}`,
                    position: isPlaced ? 'absolute' : 'relative',
                    left: isPlaced ? position?.x : undefined,
                    top: isPlaced ? position?.y : undefined,
                    marginLeft: isPlaced ? -size / 2 : 0,
                    marginTop: isPlaced ? -size / 2 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: opacity,
                    pointerEvents: 'none' // Allow clicks to pass through to sheet
                }}
            >
                <div
                    style={{
                        width: size * 2 / 5,
                        height: size / 7,
                        backgroundColor: darkerShade,
                        borderRadius: size / 12,
                    }}
                />
            </div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            animate={controls}
            whileDrag={{ scale: 1.1, zIndex: 100 }}
            onDragEnd={(_event, info) => {
                const dropX = info.point.x;
                const dropY = info.point.y;
                onDragEnd(index, { x: dropX, y: dropY });
            }}
            onDrag={(_event, info) => {
                if (onDrag) {
                    onDrag(index, { x: info.point.x, y: info.point.y });
                }
            }}
            onClick={onClick}
            className="animate-glow draggable-on-sheet"
            style={{
                x,
                y,
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: stoneColor,
                border: `2px solid #777777`,
                boxShadow: `inset 0 0 0 1px ${darkerShade}`,
                position: isPlaced ? 'absolute' : 'relative',
                left: isPlaced ? position?.x : undefined,
                top: isPlaced ? position?.y : undefined,
                marginLeft: isPlaced ? -size / 2 : 0,
                marginTop: isPlaced ? -size / 2 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: opacity,
                touchAction: 'none'
            }}
        >
            {/* Small handle */}
            <div
                style={{
                    width: size * 2 / 5,
                    height: size / 7,
                    backgroundColor: darkerShade,
                    borderRadius: size / 12,
                }}
            />
        </motion.div>
    );
};

export default React.memo(DraggableStone);
