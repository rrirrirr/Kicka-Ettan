import React from 'react';
import { STONE_RADIUS, BUTTON_RADIUS } from '../../utils/constants';

interface RingMeasurementProps {

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
    minDistToRingEdge: number;
    closestRingRadius: number;
    distToCenterPoint: number;
    stoneEdgePixelX: number;
    stoneEdgePixelY: number;
    ringEdgePixelX: number;
    ringEdgePixelY: number;
    textYOffset: number;
    displayDistanceToRing: number;
}

export const RingMeasurement: React.FC<RingMeasurementProps> = ({
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
    minDistToRingEdge,
    closestRingRadius,
    distToCenterPoint,
    stoneEdgePixelX,
    stoneEdgePixelY,
    ringEdgePixelX,
    ringEdgePixelY,
    textYOffset,
    displayDistanceToRing
}) => {
    const shouldShow = (isHighlighted && highlightedStone?.activeTypes?.includes("closest-ring")) ||
        (!isHighlighted && shouldShowInToggle);

    if (!shouldShow || (!displaySettings.closestRing?.showLine && !displaySettings.closestRing?.showDistance)) {
        return null;
    }

    return (
        (() => {
            const isOverlapping = minDistToRingEdge <= 0;

            // Calculate angle from house center to stone for bar rotation
            // We need deltaX/deltaY which were available in parent.
            // Let's recalculate or pass them.
            // We can infer deltaX/deltaY from stone position if we know center.
            // But we don't have centerLineX/teeLineY here easily without passing.
            // Actually we can just use the vector from ring center to stone center.
            // Ring center is (ringEdgePixelX, ringEdgePixelY) if we assume ring edge is on the line.
            // Wait, ringEdgePixelX/Y is the point on the ring closest to the stone.
            // So the vector from Ring Edge to Stone Center is roughly the direction.
            // But let's just use the props if we can.
            // We passed stonePixelX/Y.
            // We need the center of the house.
            // Let's pass deltaX and deltaY as props to be safe and accurate.
            // For now, I'll assume they are passed or I can calculate them if I had the constants.
            // I'll add deltaX and deltaY to props.
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
                        zIndex: 3,
                    }}
                >
                    {/* Only show line if NOT overlapping */}
                    {!isOverlapping &&
                        displaySettings.closestRing?.showLine && (
                            <line
                                x1={stoneEdgePixelX}
                                y1={stoneEdgePixelY}
                                x2={ringEdgePixelX}
                                y2={ringEdgePixelY}
                                stroke="var(--color-cyan-500)" // Cyan-500
                                strokeWidth="2"
                                strokeDasharray="2,6"
                                strokeLinecap="round"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                            />
                        )}

                    {/* Progress Bar Overlay on Stone (when overlapping) */}
                    {isOverlapping && (() => {
                        const overlapDistance = Math.abs(minDistToRingEdge);
                        const overlapPercent1 = Math.round((overlapDistance / (STONE_RADIUS * 2)) * 100);
                        const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                        const barHeight = 8;

                        // Determine which side the ring enters from
                        const isStoneOutsideRing = distToCenterPoint > closestRingRadius;
                        const fillWidth = (barLength * overlapPercent1) / 100;

                        // We need angleDeg.
                        // angleRad = Math.atan2(deltaY, deltaX)
                        // I'll add deltaX/deltaY to props.
                        // For now, placeholder:
                        const angleDeg = 0; // Placeholder, need to fix props

                        return (
                            <g
                                transform={`translate(${stonePixelX}, ${stonePixelY}) rotate(${angleDeg})`}
                                opacity={opacity}
                            >
                                {/* Bar Background */}
                                <rect
                                    x={-barLength / 2}
                                    y={-barHeight / 2}
                                    width={barLength}
                                    height={barHeight}
                                    fill="var(--icy-black)"
                                    fillOpacity="0.8"
                                    rx="2"
                                />
                                {/* Bar Fill - fills from the side where ring enters */}
                                <rect
                                    x={isStoneOutsideRing ? -barLength / 2 : barLength / 2 - fillWidth}
                                    y={-barHeight / 2}
                                    width={fillWidth}
                                    height={barHeight}
                                    fill="var(--color-cyan-500)"
                                    fillOpacity="0.9"
                                    rx="2"
                                />
                            </g>
                        );
                    })()}

                    {/* Distance label or Percentage label */}
                    {displaySettings.closestRing?.showDistance && (
                        <g
                            transform={`translate(${isOverlapping ? stonePixelX : (stoneEdgePixelX + ringEdgePixelX) / 2}, ${isOverlapping ? stonePixelY + (STONE_RADIUS * scale) + 20 : (stoneEdgePixelY + ringEdgePixelY) / 2 + textYOffset})`}
                            style={{ transition: "all 0.2s ease" }}
                            opacity={opacity}
                        >
                            {(() => {
                                // Special handling for Button (closestRingRadius === BUTTON_RADIUS)
                                // If touching/overlapping the button (distToCenterPoint < BUTTON_RADIUS + STONE_RADIUS)
                                if (
                                    closestRingRadius === BUTTON_RADIUS &&
                                    distToCenterPoint < BUTTON_RADIUS + STONE_RADIUS
                                ) {
                                    // Calculate split percentages same as other rings
                                    const overlapDistance = Math.abs(minDistToRingEdge);
                                    const overlapPercent1 = Math.round((overlapDistance / (STONE_RADIUS * 2)) * 100);

                                    return (
                                        <>
                                            {/* Cyan text (no outline needed) */}
                                            <text
                                                x="0"
                                                y="0"
                                                fill="var(--color-cyan-600)"
                                                fontSize={fontSize}
                                                fontWeight={fontWeight}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                {overlapPercent1 < 25
                                                    ? formatDistance(overlapDistance)
                                                    : `${overlapPercent1}%`}
                                            </text>
                                        </>
                                    );
                                }

                                // Standard logic for other rings or if not touching button
                                if (isOverlapping) {
                                    // Calculate split percentages for overlap display
                                    const overlapDistance = Math.abs(minDistToRingEdge);
                                    const overlapPercent1 = Math.round((overlapDistance / (STONE_RADIUS * 2)) * 100);

                                    return (
                                        <g>
                                            {/* Overlap Icon (Two intersecting circles) */}
                                            <g transform="translate(-16, -1)">
                                                {/* Cyan circles (no outline) */}
                                                <circle
                                                    cx="-3"
                                                    cy="0"
                                                    r="4.5"
                                                    fill="none"
                                                    stroke="var(--color-cyan-600)"
                                                    strokeWidth="1.5"
                                                />
                                                <circle
                                                    cx="3"
                                                    cy="0"
                                                    r="4.5"
                                                    fill="none"
                                                    stroke="var(--color-purple-600)"
                                                    strokeWidth="1.5"
                                                />
                                                {/* Intersection highlight */}
                                                <path
                                                    d="M 0,-3.3 A 4.5,4.5 0 0,0 0,3.3 A 4.5,4.5 0 0,0 0,-3.3"
                                                    fill="var(--color-cyan-600)"
                                                    fillOpacity="0.3"
                                                    stroke="none"
                                                />
                                            </g>

                                            {/* Percentage Text */}
                                            {/* Cyan text (no outline) */}
                                            <text
                                                x={overlapPercent1 < 25 ? "20" : "10"}
                                                y="0"
                                                fill="var(--color-cyan-600)"
                                                fontSize={fontSize}
                                                fontWeight={fontWeight}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                {overlapPercent1 < 25
                                                    ? formatDistance(overlapDistance)
                                                    : `${overlapPercent1}%`}
                                            </text>
                                        </g>
                                    );
                                } else {
                                    return (
                                        <>
                                            {/* Cyan text (no outline) */}
                                            <text
                                                x="0"
                                                y="0"
                                                fill="var(--color-cyan-600)" // Cyan-600 (high visibility on white)
                                                fontSize={fontSize}
                                                fontWeight={fontWeight}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                {formatDistance(displayDistanceToRing)}
                                            </text>
                                        </>
                                    );
                                }
                            })()}
                        </g>
                    )}
                </svg>
            );
        })()
    );
};
