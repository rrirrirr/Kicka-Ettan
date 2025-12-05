import React from 'react';
import { STONE_RADIUS } from '../../utils/constants';

interface CenterLineMeasurementProps {
    stone: { pos: { x: number; y: number }; color: string; index: number };
    scale: number;
    displaySettings: any;
    opacity: string;
    formatDistance: (cm: number) => string;
    isHighlighted: boolean;
    highlightedStone: any;
    shouldShowInToggle: boolean;
    isTouchingHouse: boolean;
    fontSize: string;
    fontWeight: string;
    highVisibilityTextColor: string;
    stonePixelX: number;
    stonePixelY: number;
    centerLinePixelX: number;
    horizontalLineStartX: number;
    deltaX: number;
    isLeftOfCenter: boolean;
    displayDistanceToCenter: number;
    horizontalLabelOffset: number;
    strokeWidth: string;
    isInGuardZone: boolean;
    shouldShowGuardInToggle: boolean;
    topOfHouseY: number;
    hogLineY: number;
    xPercent: number;
}

export const CenterLineMeasurement: React.FC<CenterLineMeasurementProps> = ({
    stone,
    scale,
    displaySettings,
    opacity,
    formatDistance,
    isHighlighted,
    highlightedStone,
    shouldShowInToggle,
    isTouchingHouse,
    fontSize,
    fontWeight,
    highVisibilityTextColor,
    stonePixelX,
    stonePixelY,
    centerLinePixelX,
    horizontalLineStartX,
    deltaX,
    isLeftOfCenter,
    displayDistanceToCenter,
    horizontalLabelOffset,
    strokeWidth,
    isInGuardZone,
    shouldShowGuardInToggle,
    topOfHouseY,
    hogLineY,
    xPercent
}) => {
    const shouldShow = (isHighlighted && highlightedStone?.activeTypes?.includes("center-line")) ||
        (!isHighlighted && shouldShowInToggle);

    if (!shouldShow || (!displaySettings.centerLine.showLine && !displaySettings.centerLine.showDistance)) {
        return null;
    }

    // Check if guard measurement is also active
    const isGuardActive =
        isInGuardZone &&
        ((isHighlighted &&
            highlightedStone?.activeTypes?.includes("guard")) ||
            (!isHighlighted && shouldShowGuardInToggle));

    // Calculate if stone is in top 20% (closest to hog line)
    // Re-using logic from Guard Zone block
    const totalZoneDist = topOfHouseY - hogLineY;
    const distFromHog = stone.pos.y - hogLineY;
    const percentageFromHog = distFromHog / totalZoneDist;
    const isTop20Percent = percentageFromHog < 0.2;

    // Calculate adjusted line endpoints to avoid overlap with brace
    let adjustedStartX = horizontalLineStartX;
    let adjustedEndX = centerLinePixelX;

    // Only shorten the line if the brace is actually visible (not top 20%)
    if (
        isGuardActive &&
        displaySettings.guard.showBraceLine &&
        !isTop20Percent
    ) {
        // Recalculate brace position (same logic as earlier in the code)
        const braceWidthLocal = 20;
        const braceXOffsetLocal = 40;

        // Determine which side the brace is on
        let placeBraceOnRightLocal;
        if (xPercent < 25) {
            placeBraceOnRightLocal = true;
        } else if (xPercent > 75) {
            placeBraceOnRightLocal = false;
        } else {
            placeBraceOnRightLocal = !isLeftOfCenter;
        }

        const braceXLocal = placeBraceOnRightLocal
            ? stonePixelX + braceXOffsetLocal
            : stonePixelX - braceXOffsetLocal;

        const pointRightLocal = placeBraceOnRightLocal;

        // Calculate brace boundaries (accounting for bulge direction)
        const braceLeft = pointRightLocal
            ? braceXLocal
            : braceXLocal - braceWidthLocal;
        const braceRight = pointRightLocal
            ? braceXLocal + braceWidthLocal
            : braceXLocal;

        const gapSize = 10;

        if (isLeftOfCenter) {
            // Line goes from stone (left) to center (right)
            // If brace is on the right side of stone, start the line after the brace
            if (placeBraceOnRightLocal) {
                adjustedStartX = braceRight + gapSize;
            }
        } else {
            // Line goes from stone (right) to center (left)
            // If brace is on the left side of stone, start the line after the brace
            if (!placeBraceOnRightLocal) {
                adjustedStartX = braceLeft - gapSize;
            }
        }
    }

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
            {displaySettings.centerLine.showLine && (() => {
                const isCenterLineOverlapping = Math.abs(deltaX) < STONE_RADIUS;
                if (isCenterLineOverlapping) return null;
                return (
                    <line
                        x1={adjustedStartX}
                        y1={stonePixelY}
                        x2={adjustedEndX}
                        y2={stonePixelY}
                        stroke="var(--color-amber-400)"
                        strokeWidth={strokeWidth}
                        strokeDasharray="5,5"
                        opacity={opacity}
                        style={{ transition: "all 0.2s ease" }}
                    />
                );
            })()}
            {/* Distance label for Center Line */}
            {displaySettings.centerLine.showDistance && (
                <>
                    <g
                        transform={`translate(${(horizontalLineStartX + centerLinePixelX) / 2}, ${stonePixelY + horizontalLabelOffset})`}
                        opacity={opacity}
                    >
                        {/* Black outline - only for house zone */}
                        {isTouchingHouse && (
                            <text
                                x="0"
                                y="0"
                                fill="black"
                                fillOpacity="0.3"
                                stroke="black"
                                strokeOpacity="0.3"
                                strokeWidth="3"
                                fontSize={fontSize}
                                fontWeight={fontWeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                style={{ transition: "all 0.2s ease" }}
                            >
                                {(() => {
                                    const isCenterLineOverlapping = Math.abs(deltaX) < STONE_RADIUS;
                                    const displayValue = isCenterLineOverlapping
                                        ? Math.abs(deltaX)
                                        : displayDistanceToCenter;
                                    return isLeftOfCenter
                                        ? `${formatDistance(displayValue)} →`
                                        : `← ${formatDistance(displayValue)}`;
                                })()}
                            </text>
                        )}
                        {/* Yellow text on top */}
                        <text
                            x="0"
                            y="0"
                            fill={highVisibilityTextColor}
                            fontSize={fontSize}
                            fontWeight={fontWeight}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ transition: "all 0.2s ease" }}
                        >
                            {(() => {
                                const isCenterLineOverlapping = Math.abs(deltaX) < STONE_RADIUS;
                                const displayValue = isCenterLineOverlapping
                                    ? Math.abs(deltaX)
                                    : displayDistanceToCenter;
                                return isLeftOfCenter
                                    ? `${formatDistance(displayValue)} →`
                                    : `← ${formatDistance(displayValue)}`;
                            })()}
                        </text>
                    </g>
                </>
            )}

            {/* Progress Bar Overlay on Stone for Center Line (when overlapping) - Hover/Select Mode */}
            {(() => {
                const isCenterLineOverlapping = Math.abs(deltaX) < STONE_RADIUS;
                if (!isCenterLineOverlapping) return null;

                const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                const barHeight = 8;
                const offsetDistance = Math.abs(deltaX);
                const fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2); // Half bar represents radius

                return (
                    <g
                        transform={`translate(${stonePixelX}, ${stonePixelY})`}
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
                        {/* Bar Fill - fills from center to show offset */}
                        <rect
                            x={isLeftOfCenter ? 0 : -fillWidth}
                            y={-barHeight / 2}
                            width={fillWidth}
                            height={barHeight}
                            fill="var(--color-amber-400)"
                            fillOpacity="0.9"
                        />
                    </g>
                );
            })()}
        </svg>
    );
};
