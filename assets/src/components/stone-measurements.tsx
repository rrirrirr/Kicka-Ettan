import React from 'react';
import { SHEET_WIDTH, VIEW_TOP_OFFSET, STONE_RADIUS } from '../utils/constants';

interface StonePosition {
    x: number;
    y: number;
}

interface StoneMeasurementsProps {
    stones: { red: StonePosition[]; yellow: StonePosition[] };
    scale: number;
    highlightedStone?: { color: 'red' | 'yellow'; index: number } | null;
    showMeasurements?: boolean;
}

const StoneMeasurements: React.FC<StoneMeasurementsProps> = ({ stones, scale, highlightedStone, showMeasurements = true }) => {
    const centerLineX = SHEET_WIDTH / 2;
    const teeLineY = VIEW_TOP_OFFSET;

    const allStones: Array<{ pos: StonePosition; color: 'red' | 'yellow'; index: number }> = [
        ...stones.red.map((pos, idx) => ({ pos, color: 'red' as const, index: idx })),
        ...stones.yellow.map((pos, idx) => ({ pos, color: 'yellow' as const, index: idx }))
    ];

    return (
        <>
            {allStones.map((stone) => {
                const stonePixelX = stone.pos.x * scale;
                const stonePixelY = stone.pos.y * scale;
                const centerLinePixelX = centerLineX * scale;
                const teeLinePixelY = teeLineY * scale;

                // Determine which side of reference lines the stone is on
                const isAboveTee = stone.pos.y < teeLineY;
                const isLeftOfCenter = stone.pos.x < centerLineX;

                // Compute signed distance from stone edge to reference lines
                const deltaX = stone.pos.x - centerLineX;
                const deltaY = stone.pos.y - teeLineY;
                const rawDistCenter = Math.abs(deltaX) - STONE_RADIUS;
                const rawDistTee = Math.abs(deltaY) - STONE_RADIUS;
                const displayDistanceToCenter = rawDistCenter === -STONE_RADIUS ? 0 : rawDistCenter;
                const displayDistanceToTee = rawDistTee === -STONE_RADIUS ? 0 : rawDistTee;

                // Calculate vertical line (to Tee Line)
                // - Line should go from stone's near edge toward tee line
                // - If stone overlaps tee line, no line needed (handled by distanceToTee check)
                const verticalLineStartY = isAboveTee
                    ? stonePixelY + (STONE_RADIUS * scale)  // Bottom edge of stone above tee
                    : stonePixelY - (STONE_RADIUS * scale); // Top edge of stone below tee

                // Calculate horizontal line (to Center Line)
                const horizontalLineStartX = isLeftOfCenter
                    ? stonePixelX + (STONE_RADIUS * scale)  // Right edge of stone left of center
                    : stonePixelX - (STONE_RADIUS * scale); // Left edge of stone right of center

                // Check if this stone is highlighted
                const isHighlighted = highlightedStone &&
                    highlightedStone.color === stone.color &&
                    highlightedStone.index === stone.index;

                // Determine styling based on highlight state
                const hasHighlightedStone = highlightedStone !== null && highlightedStone !== undefined;
                const strokeWidth = isHighlighted ? "4" : "2";

                // Opacity logic:
                // - If measurements are toggled off: only show highlighted stone (1.0), hide all others (0)
                // - If measurements are toggled on: show highlighted at 1.0, dim others when one is selected (0.3), or show all normal (0.7)
                let opacity: string;
                if (!showMeasurements) {
                    opacity = isHighlighted ? "1.0" : "0";
                } else {
                    opacity = isHighlighted ? "1.0" : (hasHighlightedStone ? "0.3" : "0.7");
                }

                const fontSize = isHighlighted ? "16" : "12";
                const fontWeight = isHighlighted ? "900" : "bold";
                const strokeColor = stone.color === 'red' ?
                    (isHighlighted ? '#dc2626' : '#ef4444') :
                    (isHighlighted ? '#ca8a04' : '#eab308');
                const textColor = stone.color === 'red' ?
                    (isHighlighted ? '#991b1b' : '#dc2626') :
                    (isHighlighted ? '#a16207' : '#ca8a04');

                // Determine which side of center line the stone is on
                // Edge detection: check if stone is too close to left/right edges
                const edgeThreshold = 60; // pixels of margin to maintain
                const isNearLeftEdge = stonePixelX < edgeThreshold;
                const isNearRightEdge = stonePixelX > (SHEET_WIDTH * scale - edgeThreshold);

                // Offset for vertical label: flip to opposite side if too close to edge
                let verticalLabelOffset: number;
                if (isNearLeftEdge) {
                    // Force to right side
                    verticalLabelOffset = isHighlighted ? 35 : 10;
                } else if (isNearRightEdge) {
                    // Force to left side
                    verticalLabelOffset = isHighlighted ? -35 : -10;
                } else {
                    // Normal logic based on which side of center
                    verticalLabelOffset = isLeftOfCenter
                        ? (isHighlighted ? -35 : -10)
                        : (isHighlighted ? 35 : 10);
                }

                // Offset for horizontal label: adjust if near top edge
                const isNearTopEdge = stonePixelY < edgeThreshold;
                const horizontalLabelOffset = isNearTopEdge
                    ? (isHighlighted ? 25 : 8)  // Push down if near top
                    : (isHighlighted ? -25 : -8); // Normal: push up

                return (
                    <React.Fragment key={`${stone.color}-${stone.index}`}>
                        {/* Vertical line to Tee Line */}
                        <svg
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                transition: 'opacity 0.2s ease'
                            }}
                        >
                            <line
                                x1={stonePixelX}
                                y1={verticalLineStartY}
                                x2={stonePixelX}
                                y2={teeLinePixelY}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray="5,5"
                                opacity={opacity}
                                style={{ transition: 'all 0.2s ease' }}
                            />
                            {/* Distance label for Tee Line */}
                            {isHighlighted && (
                                <rect
                                    x={stonePixelX + verticalLabelOffset - 30}
                                    y={(stonePixelY + teeLinePixelY) / 2 - 12}
                                    width="60"
                                    height="24"
                                    fill="white"
                                    opacity="0.8"
                                    rx="3"
                                    transform={`rotate(-90, ${stonePixelX + verticalLabelOffset}, ${(stonePixelY + teeLinePixelY) / 2})`}
                                />
                            )}
                            <text
                                x={stonePixelX + verticalLabelOffset}
                                y={(stonePixelY + teeLinePixelY) / 2}
                                fill={textColor}
                                fontSize={fontSize}
                                fontWeight={fontWeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(-90, ${stonePixelX + verticalLabelOffset}, ${(stonePixelY + teeLinePixelY) / 2})`}
                                style={{ transition: 'all 0.2s ease' }}
                                opacity={opacity}
                            >
                                {displayDistanceToTee.toFixed(1)}cm
                            </text>
                        </svg>

                        {/* Horizontal line to Center Line */}
                        <svg
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                transition: 'opacity 0.2s ease'
                            }}
                        >
                            <line
                                x1={horizontalLineStartX}
                                y1={stonePixelY}
                                x2={centerLinePixelX}
                                y2={stonePixelY}
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray="5,5"
                                opacity={opacity}
                                style={{ transition: 'all 0.2s ease' }}
                            />
                            {/* Distance label for Center Line */}
                            {isHighlighted && (
                                <rect
                                    x={(horizontalLineStartX + centerLinePixelX) / 2 - 30}
                                    y={stonePixelY + horizontalLabelOffset - 12}
                                    width="60"
                                    height="24"
                                    fill="white"
                                    opacity="0.8"
                                    rx="3"
                                />
                            )}
                            <text
                                x={(horizontalLineStartX + centerLinePixelX) / 2}
                                y={stonePixelY + horizontalLabelOffset}
                                fill={textColor}
                                fontSize={fontSize}
                                fontWeight={fontWeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ transition: 'all 0.2s ease' }}
                                opacity={opacity}
                            >
                                {displayDistanceToCenter.toFixed(1)}cm
                            </text>
                        </svg>
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default StoneMeasurements;
