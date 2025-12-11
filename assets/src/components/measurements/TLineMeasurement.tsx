import React from 'react';
import { STONE_RADIUS } from '../../utils/constants';
import { MeasurementIcon } from './MeasurementIcon';

interface TLineMeasurementProps {

    scale: number;
    displaySettings: any;
    opacity: string;
    formatDistance: (cm: number) => string;
    getUnitIcon?: (cm: number) => 'stone' | 'broom' | null;
    isHighlighted: boolean;
    highlightedStone: any;
    shouldShowInToggle: boolean;

    fontSize: string;
    fontWeight: string;
    highVisibilityTextColor: string;
    stonePixelX: number;
    stonePixelY: number;
    teeLinePixelY: number;
    verticalLineStartY: number;
    deltaY: number;
    isAboveTee: boolean;
    displayDistanceToTee: number;
    teeLineLabelHorizontalOffset: number;
    strokeWidth: string;
}

export const TLineMeasurement: React.FC<TLineMeasurementProps> = ({
    scale,
    displaySettings,
    opacity,
    formatDistance,
    getUnitIcon,
    isHighlighted,
    highlightedStone,
    shouldShowInToggle,

    fontSize,
    fontWeight,
    highVisibilityTextColor,
    stonePixelX,
    stonePixelY,
    teeLinePixelY,
    verticalLineStartY,
    deltaY,
    isAboveTee,
    displayDistanceToTee,
    teeLineLabelHorizontalOffset,
    strokeWidth
}) => {
    const shouldShow = (isHighlighted && highlightedStone?.activeTypes?.includes("t-line")) ||
        (!isHighlighted && shouldShowInToggle);

    if (!shouldShow || (!displaySettings.tLine.showLine && !displaySettings.tLine.showDistance)) {
        return null;
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
                zIndex: 10,
            }}
        >
            {displaySettings.tLine.showLine && (() => {
                const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                if (isTLineOverlapping) return null;
                return (
                    <line
                        x1={stonePixelX}
                        y1={verticalLineStartY}
                        x2={stonePixelX}
                        y2={teeLinePixelY}
                        stroke="var(--color-amber-500)"
                        strokeWidth={strokeWidth}
                        strokeDasharray="5,5"
                        opacity={opacity}
                        style={{ transition: "all 0.2s ease" }}
                    />
                );
            })()}
            {/* Distance label for Tee Line */}
            {displaySettings.tLine.showDistance && (() => {
                const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                const displayValue = isTLineOverlapping
                    ? Math.abs(deltaY)
                    : displayDistanceToTee;
                const iconType = getUnitIcon?.(displayValue);
                const distanceText = formatDistance(displayValue);
                const arrow = isAboveTee ? "↓" : "↑";

                return (
                    <g
                        transform={`translate(${stonePixelX + teeLineLabelHorizontalOffset}, ${(stonePixelY + teeLinePixelY) / 2})`}
                        opacity={opacity}
                    >
                        {!iconType ? (
                            // Simple case: just text and arrow together
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
                                {distanceText} {arrow}
                            </text>
                        ) : (
                            // With icon: use foreignObject for natural HTML layout
                            <foreignObject x="-50" y="-10" width="100" height="20" style={{ overflow: "visible" }}>
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "2px",
                                    fontSize,
                                    fontWeight,
                                    color: highVisibilityTextColor,
                                    transition: "all 0.2s ease",
                                    whiteSpace: "nowrap"
                                }}>
                                    <span>{distanceText}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center" }}>
                                        <MeasurementIcon type={iconType} color={highVisibilityTextColor} opacity={opacity} standalone />
                                    </span>
                                    <span>{arrow}</span>
                                </div>
                            </foreignObject>
                        )}
                    </g>
                );
            })()}

            {/* Progress Bar Overlay on Stone for T-Line (when overlapping) - Hover/Select Mode */}
            {(() => {
                const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                if (!isTLineOverlapping) return null;

                const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                const barHeight = 8;
                const offsetDistance = Math.abs(deltaY);
                // Fill represents "amount of stone OFF the line" (Offset).
                // Touch (offset=R) -> Full fill (offset bar). Center (offset=0) -> 0 fill.
                // Wait, original logic: fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2);
                const fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2);

                return (
                    <g
                        transform={`translate(${stonePixelX}, ${stonePixelY}) rotate(90)`}
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
                        <rect
                            x={isAboveTee ? 0 : -fillWidth}
                            y={-barHeight / 2}
                            width={fillWidth}
                            height={barHeight}
                            fill="var(--color-amber-500)"
                            fillOpacity="0.9"
                        />
                    </g>
                );
            })()}
        </svg>
    );
};
