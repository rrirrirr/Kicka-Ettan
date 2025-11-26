import React from 'react';
import { motion } from 'framer-motion';

interface DraggableStoneProps {
    color: 'red' | 'yellow';
    customColor?: string;
    index: number;
    position?: { x: number; y: number };
    onDragEnd: (index: number, position: { x: number; y: number }, offset: { x: number; y: number }) => void;
    isPlaced?: boolean;
    size?: number;
    onClick?: (e: React.MouseEvent) => void;
}

const DraggableStone: React.FC<DraggableStoneProps> = ({
    color,
    customColor,
    index,
    position,
    onDragEnd,
    isPlaced = false,
    size = 40,
    onClick
}) => {
    const stoneColor = customColor || (color === 'red' ? '#ff0000' : '#ffdd00');
    const handleColor = color === 'red' ? '#ffcccc' : '#ffeb99';

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ scale: 1.1, zIndex: 100 }}
            onDragEnd={(_event, info) => {
                const x = info.point.x;
                const y = info.point.y;
                onDragEnd(index, { x, y }, { x: info.offset.x, y: info.offset.y });
            }}
            onClick={onClick}
            className="animate-glow"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: stoneColor,
                border: '2px solid #fff',
                position: isPlaced ? 'absolute' : 'relative',
                left: isPlaced ? position?.x : undefined,
                top: isPlaced ? position?.y : undefined,
                marginLeft: isPlaced ? -size / 2 : 0,
                marginTop: isPlaced ? -size / 2 : 0,
                cursor: 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Stone Handle */}
            <div
                style={{
                    width: size * 0.5,
                    height: size * 0.25,
                    backgroundColor: handleColor,
                    borderRadius: 5
                }}
            />
        </motion.div>
    );
};

export default DraggableStone;
