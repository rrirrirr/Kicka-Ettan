import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface DraggableBanProps {
    index: number;
    position?: { x: number; y: number };
    onDragEnd: (index: number, dropPoint: { x: number; y: number }) => void;
    onDrag?: (index: number, position: { x: number; y: number }) => void;
    isPlaced?: boolean;
    size?: number;
    opacity?: number;
    interactive?: boolean;
}

const DraggableBan: React.FC<DraggableBanProps> = ({
    index,
    position,
    onDragEnd,
    onDrag,
    isPlaced = false,
    size = 44,
    opacity = 1,
    interactive = true
}) => {
    if (!interactive) {
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    border: '4px dashed #FB923C',
                    backgroundColor: 'rgba(251, 146, 60, 0.25)',
                    position: isPlaced ? 'absolute' : 'relative',
                    left: isPlaced ? position?.x : undefined,
                    top: isPlaced ? position?.y : undefined,
                    marginLeft: isPlaced ? -size / 2 : 0,
                    marginTop: isPlaced ? -size / 2 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: opacity,
                    pointerEvents: 'none'
                }}
            >
                <X size={size * 0.5} color="#FB923C" strokeWidth={3} />
            </div>
        );
    }

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0}
            whileDrag={{ scale: 1.1, zIndex: 100 }}
            whileDrag={{ scale: 1.1, zIndex: 100 }}
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
            className="draggable-ban-on-sheet"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: '4px dashed #FB923C',
                backgroundColor: 'rgba(251, 146, 60, 0.25)',
                position: isPlaced ? 'absolute' : 'relative',
                left: isPlaced ? position?.x : undefined,
                top: isPlaced ? position?.y : undefined,
                marginLeft: isPlaced ? -size / 2 : 0,
                marginTop: isPlaced ? -size / 2 : 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: opacity,
                touchAction: 'none',
            }}
        >
            <X size={size * 0.5} color="#FB923C" strokeWidth={3} />
        </motion.div>
    );
};

export default React.memo(DraggableBan);
