import React, { useEffect, useRef, useCallback, useState } from 'react';

// 8x8 Bayer matrix for ordered dithering
const BAYER_8X8 = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21],
];

interface BayerDitherProps {
    aspectRatio?: number; // width / height ratio, default 32/9
    cellSize?: number;
    baseColor?: string;
    accentColor?: string;
    speed?: number;
    className?: string;
    children?: React.ReactNode;
}

export const BayerDither: React.FC<BayerDitherProps> = ({
    aspectRatio = 32 / 9,
    cellSize = 4,
    baseColor = '#f5f5dc', // beige
    accentColor = '#483d8b', // dark lavender
    speed = 0.015,
    className = '',
    children,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const [dimensions, setDimensions] = useState({ width: 320, height: 90 });

    // Physics state for horizontal dragging
    const offsetXRef = useRef<number>(0);
    const velocityRef = useRef<number>(0);
    const isDraggingRef = useRef<boolean>(false);
    const lastPointerXRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    // Measure container and set canvas dimensions
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateDimensions = () => {
            const width = container.offsetWidth;
            const height = Math.round(width / aspectRatio);
            setDimensions({ width, height });
        };

        updateDimensions();

        const observer = new ResizeObserver(updateDimensions);
        observer.observe(container);

        return () => observer.disconnect();
    }, [aspectRatio]);

    const { width, height } = dimensions;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    // Parse hex to RGB
    const parseColor = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
            : [0, 0, 0];
    };

    const baseRGB = parseColor(baseColor);
    const accentRGB = parseColor(accentColor);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        timeRef.current += speed;

        // Apply physics when not dragging
        if (!isDraggingRef.current) {
            offsetXRef.current += velocityRef.current;
            velocityRef.current *= 0.95; // friction

            // Stop if velocity is very small
            if (Math.abs(velocityRef.current) < 0.001) {
                velocityRef.current = 0;
            }
        }

        // Clear with base color
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, width, height);

        // Normalized offset for pattern shift
        const normalizedOffset = offsetXRef.current / width;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Normalized position with horizontal offset
                const nx = ((x / cols) + normalizedOffset) % 1;
                const ny = y / rows;

                // Center for radial effect
                const centerX = 0.5 + Math.sin(timeRef.current * 0.3) * 0.15;
                const centerY = 0.5;

                // Distance from center
                const dx = nx - centerX;
                const dy = ny - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Animated wave patterns
                const wave1 = Math.sin((nx * 12 + normalizedOffset * 4) - timeRef.current * 1.5) * 0.4 + 0.5;
                const wave2 = Math.sin(ny * 8 + timeRef.current * 0.8) * 0.25;
                const wave3 = Math.cos((nx + ny) * 5 + timeRef.current) * 0.2;

                // Radial gradient
                const radial = 1 - Math.min(dist * 2, 1);

                // Combine patterns
                let value = (wave1 + wave2 + wave3) * 0.6 + radial * 0.3;

                // Normalize to 0-1
                value = Math.max(0, Math.min(1, value));

                // Apply Bayer matrix threshold
                const threshold = BAYER_8X8[y % 8][x % 8] / 64;
                const shouldDraw = value > threshold;

                if (shouldDraw) {
                    // Interpolate color based on intensity
                    const intensity = (value - threshold) * 2;
                    const r = Math.round(baseRGB[0] + (accentRGB[0] - baseRGB[0]) * Math.min(intensity, 1));
                    const g = Math.round(baseRGB[1] + (accentRGB[1] - baseRGB[1]) * Math.min(intensity, 1));
                    const b = Math.round(baseRGB[2] + (accentRGB[2] - baseRGB[2]) * Math.min(intensity, 1));

                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        animationRef.current = requestAnimationFrame(draw);
    }, [width, height, cellSize, cols, rows, baseColor, accentColor, baseRGB, accentRGB, speed]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationRef.current);
    }, [draw]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = true;
        lastPointerXRef.current = e.clientX;
        lastTimeRef.current = performance.now();
        velocityRef.current = 0;
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDraggingRef.current) return;

        const deltaX = e.clientX - lastPointerXRef.current;
        const now = performance.now();
        const deltaTime = now - lastTimeRef.current;

        offsetXRef.current += deltaX;

        // Calculate velocity for throwing
        if (deltaTime > 0) {
            velocityRef.current = deltaX / deltaTime * 16; // normalize to ~60fps
        }

        lastPointerXRef.current = e.clientX;
        lastTimeRef.current = now;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = false;
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    };

    return (
        <div ref={containerRef} className={`w-full relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="rounded-xl touch-none select-none w-full"
                style={{
                    imageRendering: 'pixelated',
                    cursor: 'grab',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            />
            {children && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {children}
                </div>
            )}
        </div>
    );
};

export default BayerDither;

