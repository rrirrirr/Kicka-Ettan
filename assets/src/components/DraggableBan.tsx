import React, { useEffect } from 'react';
import { motion, useMotionValue, useAnimation } from 'framer-motion';
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
    // New: reset key - when this changes, position resets to origin
    resetKey?: number;
}

const DraggableBan: React.FC<DraggableBanProps> = ({
    index,
    position,
    onDragEnd,
    onDrag,
    isPlaced = false,
    size = 44,
    opacity = 1,
    interactive = true,
    resetKey = 0
}) => {
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
            className="draggable-ban-on-sheet"
            style={{
                x,
                y,
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
