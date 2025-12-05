import React from 'react';
import { SHEET_WIDTH, STONE_RADIUS } from '../../utils/constants';

interface GuardMeasurementProps {
    stone: { pos: { x: number; y: number }; color: string; index: number };
    scale: number;
    displaySettings: any;
    opacity: string;
    formatDistance: (cm: number) => string;
    isHighlighted: boolean;
    highlightedStone: any;
    shouldShowInToggle: boolean;
    fontSize: string;
    fontWeight: string;
    stonePixelX: number;
    stonePixelY: number;
    hogLineY: number;
    topOfHouseY: number;
    isInGuardZone: boolean;
    xPercent: number;
    isLeftOfCenter: boolean;
    useHighlightedStyle: boolean;
}

// Proper curly brace algorithm adapted from D3.js example
const getBracePath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    w: number,
    q: number,
) => {
    // Calculate unit vector
    let dx = x1 - x2;
    let dy = y1 - y2;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx = dx / len;
    dy = dy / len;

    // Calculate Control Points of path
    const qx1 = x1 + q * w * dy;
    const qy1 = y1 - q * w * dx;
    const qx2 = x1 - 0.25 * len * dx + (1 - q) * w * dy;
    const qy2 = y1 - 0.25 * len * dy - (1 - q) * w * dx;
    const tx1 = x1 - 0.5 * len * dx + w * dy;
    const ty1 = y1 - 0.5 * len * dy - w * dx;
    const qx3 = x2 + q * w * dy;
    const qy3 = y2 - q * w * dx;
    const qx4 = x1 - 0.75 * len * dx + (1 - q) * w * dy;
    const qy4 = y1 - 0.75 * len * dy - (1 - q) * w * dx;

    return `M ${x1} ${y1} Q ${qx1} ${qy1} ${qx2} ${qy2} T ${tx1} ${ty1} M ${x2} ${y2} Q ${qx3} ${qy3} ${qx4} ${qy4} T ${tx1} ${ty1} `;
};

export const GuardMeasurement: React.FC<GuardMeasurementProps> = ({
    stone,
    scale,
    displaySettings,
    opacity,
    formatDistance,
    isHighlighted,
    highlightedStone,
    shouldShowInToggle,
    fontSize,
    fontWeight,
    stonePixelX,
    stonePixelY,
    hogLineY,
    topOfHouseY,
    isInGuardZone,
    xPercent,
    isLeftOfCenter,
    useHighlightedStyle
}) => {
    const shouldShow = isInGuardZone &&
        ((isHighlighted &&
            highlightedStone?.activeTypes?.includes("guard")) ||
            (!isHighlighted && shouldShowInToggle));

    if (!shouldShow) return null;

    return (
        <svg
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                transition: "opacity 0.2s ease",
                overflow: "visible",
                zIndex: 3,
            }}
        >
            {/* Hog Line Reference Line */}
            <line
                x1={0}
                y1={hogLineY * scale}
                x2={SHEET_WIDTH * scale}
                y2={hogLineY * scale}
                stroke="var(--color-purple-600)"
                strokeWidth="1"
                opacity={opacity}
                style={{ transition: "all 0.2s ease" }}
            />

            {/* Top of House Reference Line */}
            <line
                x1={0}
                y1={topOfHouseY * scale}
                x2={SHEET_WIDTH * scale}
                y2={topOfHouseY * scale}
                stroke="var(--color-purple-600)"
                strokeWidth="1"
                opacity={opacity}
                style={{ transition: "all 0.2s ease" }}
            />

            {(() => {
                // Calculate percentage based on closest reference line
                const totalZoneDist = topOfHouseY - hogLineY;
                const distFromHog = stone.pos.y - hogLineY;
                const percentageFromHog = distFromHog / totalZoneDist;
                const isTop20Percent = percentageFromHog < 0.2;

                if (isTop20Percent) {
                    // --- Top 20% Logic: Direct Line to Hog Line ---
                    const lineStartX = stonePixelX;
                    const lineStartY = stonePixelY - STONE_RADIUS * scale - 2; // Top of stone (including border)
                    const lineEndY = hogLineY * scale;
                    const distanceCm = distFromHog - STONE_RADIUS; // Distance from stone top to hog line

                    // Label Position (midpoint of line)
                    const labelX = lineStartX + 15; // Offset to right
                    const labelY = (lineStartY + lineEndY) / 2;

                    return (
                        <>
                            {/* Dashed Line to Hog Line */}
                            <line
                                x1={lineStartX}
                                y1={lineStartY}
                                x2={lineStartX}
                                y2={lineEndY}
                                stroke="var(--color-purple-600)"
                                strokeWidth="1"
                                strokeDasharray="5,5"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            />

                            {/* Distance Label (cm) */}
                            {/* Black outline - only for house zone */}
                            {!isInGuardZone && (
                                <text
                                    x={labelX}
                                    y={labelY}
                                    fill="black"
                                    fillOpacity="0.3"
                                    stroke="black"
                                    strokeOpacity="0.3"
                                    strokeWidth="3"
                                    fontSize={useHighlightedStyle ? "12" : "10"}
                                    fontWeight="600"
                                    textAnchor="start"
                                    dominantBaseline="middle"
                                    opacity={opacity}
                                    style={{ transition: "all 0.2s ease" }}
                                >
                                    {formatDistance(distanceCm)}
                                </text>
                            )}
                            {/* Purple text on top */}
                            <text
                                x={labelX}
                                y={labelY}
                                fill="var(--color-purple-500)"
                                fontSize={useHighlightedStyle ? "12" : "10"}
                                fontWeight="600"
                                textAnchor="start"
                                dominantBaseline="middle"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            >
                                {formatDistance(distanceCm)}
                            </text>
                        </>
                    );
                } else {
                    // --- Standard Logic: Brace and Percentage ---

                    // Brace Logic
                    const braceWidth = 20;
                    const braceXOffset = 40;

                    // Determine side based on position (reusing xPercent calculated above)
                    let placeBraceOnRight;
                    if (xPercent < 25) {
                        placeBraceOnRight = true;
                    } else if (xPercent > 75) {
                        placeBraceOnRight = false;
                    } else {
                        placeBraceOnRight = !isLeftOfCenter;
                    }

                    const braceX = placeBraceOnRight
                        ? stonePixelX + braceXOffset
                        : stonePixelX - braceXOffset;

                    const pointRight = placeBraceOnRight;

                    // Determine closest reference line
                    const distToHog = Math.abs(
                        stonePixelY - hogLineY * scale,
                    );
                    const distToHouse = Math.abs(
                        topOfHouseY * scale - stonePixelY,
                    );
                    const isCloserToHog = distToHog < distToHouse;

                    let braceStartY, braceEndY;
                    if (isCloserToHog) {
                        braceStartY = hogLineY * scale;
                        braceEndY = stonePixelY;
                    } else {
                        braceStartY = stonePixelY;
                        braceEndY = topOfHouseY * scale;
                    }

                    // Calculate percentage
                    let percentage;
                    let braceDistanceCm;
                    if (isCloserToHog) {
                        percentage = Math.round(
                            (distFromHog / totalZoneDist) * 100,
                        );
                        braceDistanceCm = distFromHog;
                    } else {
                        const distFromHouse = topOfHouseY - stone.pos.y;
                        percentage = Math.round(
                            (distFromHouse / totalZoneDist) * 100,
                        );
                        braceDistanceCm = distFromHouse;
                    }

                    // Label Position (Brace)
                    const midY = (braceStartY + braceEndY) / 2;
                    const verticalAdjustment = pointRight ? 3 : 0;
                    const labelX = pointRight
                        ? braceX + braceWidth + 20
                        : braceX - braceWidth - 20;

                    // Label Position (Extension Line)
                    const extLineStartY = topOfHouseY * scale;
                    const extLineEndY = hogLineY * scale;
                    const extMidY = (extLineStartY + extLineEndY) / 2;
                    const extLabelX = placeBraceOnRight
                        ? stonePixelX + STONE_RADIUS * scale + 35
                        : stonePixelX - STONE_RADIUS * scale - 35;

                    return (
                        <>
                            {/* Brace */}
                            {displaySettings.guard.showBraceLine && (
                                <path
                                    d={getBracePath(
                                        braceX,
                                        braceStartY,
                                        braceX,
                                        braceEndY,
                                        pointRight ? -braceWidth : braceWidth,
                                        0.6,
                                    )}
                                    stroke="var(--color-purple-600)"
                                    strokeWidth="1"
                                    fill="none"
                                    opacity={opacity}
                                    style={{ transition: "all 0.2s ease" }}
                                />
                            )}

                            {/* Dashed connector line from brace to stone edge (Stone End) */}
                            <line
                                x1={braceX}
                                y1={stonePixelY}
                                x2={
                                    placeBraceOnRight
                                        ? stonePixelX + STONE_RADIUS * scale + 2
                                        : stonePixelX - STONE_RADIUS * scale - 2
                                }
                                y2={stonePixelY}
                                stroke="var(--color-purple-600)"
                                strokeWidth="1"
                                strokeDasharray="5,5"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            />

                            {/* Dashed connector line from brace to stone edge (Reference End) */}
                            <line
                                x1={braceX}
                                y1={
                                    isCloserToHog
                                        ? hogLineY * scale
                                        : topOfHouseY * scale
                                }
                                x2={
                                    placeBraceOnRight
                                        ? stonePixelX + STONE_RADIUS * scale + 2
                                        : stonePixelX - STONE_RADIUS * scale - 2
                                }
                                y2={
                                    isCloserToHog
                                        ? hogLineY * scale
                                        : topOfHouseY * scale
                                }
                                stroke="var(--color-purple-600)"
                                strokeWidth="1"
                                strokeDasharray="5,5"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            />

                            {/* Vertical extension line (from Top of House to Hog Line) */}
                            <line
                                x1={
                                    placeBraceOnRight
                                        ? stonePixelX + STONE_RADIUS * scale + 2
                                        : stonePixelX - STONE_RADIUS * scale - 2
                                }
                                y1={topOfHouseY * scale}
                                x2={
                                    placeBraceOnRight
                                        ? stonePixelX + STONE_RADIUS * scale + 2
                                        : stonePixelX - STONE_RADIUS * scale - 2
                                }
                                y2={hogLineY * scale}
                                stroke="var(--color-purple-600)"
                                strokeWidth="1"
                                strokeDasharray="5,5"
                                opacity={parseFloat(opacity) * 0.5} // Slightly more transparent
                                style={{ transition: "all 0.2s ease" }}
                            />

                            {/* Brace Label - Percentage */}
                            {displaySettings.guard.showPercentage && (
                                <>
                                    {/* Purple text (no outline for guard zone) */}
                                    <text
                                        x={labelX}
                                        y={
                                            midY +
                                            verticalAdjustment -
                                            (useHighlightedStyle ? 8 : 6)
                                        }
                                        fill="var(--color-purple-500)" // Purple-500
                                        fontSize={fontSize}
                                        fontWeight={fontWeight}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        opacity={opacity}
                                        style={{ transition: "all 0.2s ease" }}
                                    >
                                        {percentage}%
                                    </text>
                                </>
                            )}

                            {/* Brace Label - Distance in cm */}
                            {displaySettings.guard.showDistance && (
                                <>
                                    {/* Purple text (no outline for guard zone) */}
                                    <text
                                        x={labelX}
                                        y={
                                            midY +
                                            verticalAdjustment +
                                            (useHighlightedStyle ? 8 : 6)
                                        }
                                        fill="var(--color-purple-500)" // Purple-500
                                        fontSize={useHighlightedStyle ? "12" : "10"}
                                        fontWeight="600"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        opacity={opacity}
                                        style={{ transition: "all 0.2s ease" }}
                                    >
                                        {formatDistance(braceDistanceCm)}
                                    </text>
                                </>
                            )}

                            {/* Extension Line Label */}
                            {/* Purple text (no outline for guard zone) */}
                            <text
                                x={extLabelX}
                                y={extMidY}
                                fill="var(--color-purple-500)" // Purple-500
                                fontSize={fontSize}
                                fontWeight={fontWeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            >
                                {100 - percentage}%
                            </text>
                        </>
                    );
                }
            })()}
        </svg>
    );
};
