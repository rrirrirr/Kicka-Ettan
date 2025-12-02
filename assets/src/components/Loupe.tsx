import React from 'react';
import { createPortal } from 'react-dom';

interface LoupeProps {
    x: number;
    y: number;
    scale?: number;
    size?: number;
    content: React.ReactNode;
    offsetY?: number;
    fixedPosition?: { x: number; y: number };
    showCrosshair?: boolean;
}

export const Loupe: React.FC<LoupeProps> = ({
    x,
    y,
    scale = 2,
    size = 120,
    content,
    offsetY = 100,
    fixedPosition,
    showCrosshair = true
}) => {
    // Calculate position synchronously to avoid render lag
    const padding = 10;
    const loupeRadius = size / 2;

    // Helper to check bounds
    const isSafe = (cx: number, cy: number) => {
        if (typeof window === 'undefined') return true;
        return (
            cx - loupeRadius >= padding &&
            cx + loupeRadius <= window.innerWidth - padding &&
            cy - loupeRadius >= padding &&
            cy + loupeRadius <= window.innerHeight - padding
        );
    };

    let finalX = x;
    let finalY = y - offsetY;

    if (fixedPosition) {
        finalX = fixedPosition.x;
        finalY = fixedPosition.y;
    } else if (!isSafe(finalX, finalY)) {
        const startAngle = -Math.PI / 2;
        const step = 0.1; // ~5.7 degrees
        const maxAngle = Math.PI; // Max rotation (180 degrees)

        // If on right side, rotate CCW (Left). If on left side, rotate CW (Right).
        const direction = x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 0) ? -1 : 1;

        let found = false;
        for (let i = 1; i <= maxAngle / step; i++) {
            const angle = startAngle + (direction * step * i);
            const checkX = x + offsetY * Math.cos(angle);
            const checkY = y + offsetY * Math.sin(angle);

            if (isSafe(checkX, checkY)) {
                finalX = checkX;
                finalY = checkY;
                found = true;
                break;
            }
        }

        // Fallback: If no safe spot on circle found (e.g. screen too small), clamp to screen
        if (!found && typeof window !== 'undefined') {
            finalX = Math.max(loupeRadius + padding, Math.min(window.innerWidth - loupeRadius - padding, finalX));
            finalY = Math.max(loupeRadius + padding, Math.min(window.innerHeight - loupeRadius - padding, finalY));
        }
    }

    return createPortal(
        <div
            className="fixed pointer-events-none z-[9999] overflow-hidden rounded-full border-4 border-white shadow-2xl bg-white"
            style={{
                left: 0,
                top: 0,
                transform: `translate3d(${finalX - loupeRadius}px, ${finalY - loupeRadius}px, 0)`,
                width: size,
                height: size,
                willChange: 'transform',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-${x * scale}px, -${y * scale}px) scale(${scale})`,
                    transformOrigin: '0 0',
                    width: '100vw', // Ensure enough space for content
                    height: '100vh',
                }}
            >
                {content}
            </div>

            {/* Crosshair for precision */}
            {showCrosshair && (
                <div className="absolute inset-0 flex items-center justify-center opacity-50">
                    <div className="w-4 h-0.5 bg-red-500/50 absolute" />
                    <div className="h-4 w-0.5 bg-red-500/50 absolute" />
                </div>
            )}
        </div>,
        document.body
    );
};
