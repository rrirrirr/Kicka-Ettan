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

interface MultiColorBayerDitherProps {
    cellSize?: number;
    speed?: number;
    className?: string;
    children?: React.ReactNode;
}

interface Blob {
    x: number;
    y: number;
    dx: number;
    dy: number;
    color: [number, number, number]; // RGB
    radius: number;
}

export const MultiColorBayerDither: React.FC<MultiColorBayerDitherProps> = ({
    cellSize = 4,
    speed = 0.005,
    className = '',
    children,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const [dimensions, setDimensions] = useState({ width: 320, height: 400 });

    // Initialize blobs with different colors
    // Lavender: [230, 230, 250]
    // Red-ish: [255, 100, 100]
    // Blue-ish: [100, 100, 255]
    // Yellow-ish: [255, 255, 100]
    const blobsRef = useRef<Blob[]>([
        { x: 0.2, y: 0.2, dx: 0.002, dy: 0.003, color: [180, 100, 255], radius: 0.4 },
        { x: 0.8, y: 0.3, dx: -0.003, dy: 0.002, color: [255, 50, 80], radius: 0.45 },
        { x: 0.3, y: 0.8, dx: 0.002, dy: -0.004, color: [0, 180, 255], radius: 0.5 },
        { x: 0.7, y: 0.7, dx: -0.004, dy: -0.002, color: [255, 220, 0], radius: 0.4 },
    ]);

    // Measure container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateDimensions = () => {
            setDimensions({
                width: container.offsetWidth,
                height: container.offsetHeight
            });
        };

        updateDimensions();

        const observer = new ResizeObserver(updateDimensions);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const { width, height } = dimensions;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        timeRef.current += speed;

        // Update blobs
        blobsRef.current.forEach(blob => {
            blob.x += blob.dx;
            blob.y += blob.dy;

            // Bounce off walls
            if (blob.x < -0.2 || blob.x > 1.2) blob.dx *= -1;
            if (blob.y < -0.2 || blob.y > 1.2) blob.dy *= -1;
        });

        // Clear
        ctx.fillStyle = '#f5f5f5'; // light gray base
        ctx.fillRect(0, 0, width, height);

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const nx = x / cols;
                const ny = y / rows;

                // Calculate influence from each blob
                let totalWeight = 0;
                let r = 0, g = 0, b = 0;
                let maxIntensity = 0;

                blobsRef.current.forEach(blob => {
                    const dx = nx - blob.x;
                    const dy = ny - blob.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Inverse distance weight, localized by radius
                    let weight = Math.max(0, 1 - dist / blob.radius);

                    // Add some noise/wave
                    weight += Math.sin(dist * 10 - timeRef.current) * 0.05;
                    weight = Math.max(0, weight);

                    // Power function for sharper blobs
                    weight = Math.pow(weight, 2);

                    totalWeight += weight;
                    r += blob.color[0] * weight;
                    g += blob.color[1] * weight;
                    b += blob.color[2] * weight;

                    maxIntensity = Math.max(maxIntensity, weight);
                });

                if (totalWeight > 0) {
                    r = Math.round(r / totalWeight);
                    g = Math.round(g / totalWeight);
                    b = Math.round(b / totalWeight);
                } else {
                    r = 240; g = 240; b = 240; // Fallback
                }

                // Dither threshold
                const threshold = BAYER_8X8[y % 8][x % 8] / 64;

                // Scale total weight to be "intensity"
                // If intensity > threshold, draw the color
                // We want the blobs to be solid in center and dissolve at edges
                let intensity = Math.min(1, maxIntensity * 1.5);

                if (intensity > threshold) {
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        animationRef.current = requestAnimationFrame(draw);
    }, [width, height, cellSize, cols, rows, speed]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationRef.current);
    }, [draw]);

    return (
        <div ref={containerRef} className={`w-full h-full relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="absolute inset-0 w-full h-full rounded-3xl"
                style={{
                    imageRendering: 'pixelated',
                }}
            />
            {children && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none relative z-10">
                    {children}
                </div>
            )}
        </div>
    );
};
