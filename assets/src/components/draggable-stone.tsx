import React from 'react';
import { motion } from 'framer-motion';

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
    opacity = 1
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

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ scale: 1.1, zIndex: 100 }}
            whileHover={{ filter: 'brightness(1.1)', boxShadow: `inset 0 0 0 1px ${darkerShade}` }}
            onDragEnd={(_event, info) => {
                const x = info.point.x;
                const y = info.point.y;
                onDragEnd(index, { x, y });
            }}
            onDrag={(_event, info) => {
                if (onDrag) {
                    onDrag(index, { x: info.point.x, y: info.point.y });
                }
            }}
            onClick={onClick}
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
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: opacity
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

export default DraggableStone;
