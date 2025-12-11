import React from 'react';
import { STONE_RADIUS } from '../../utils/constants';
import { MeasurementIcon } from './MeasurementIcon';

interface StoneToStoneMeasurementProps {
    stone: { pos: { x: number; y: number }; color: string; index: number };
    scale: number;
    displaySettings: any;
    opacity: string;
    formatDistance: (cm: number) => string;
    getUnitIcon?: (cm: number) => 'stone' | 'broom' | null;
    isHighlighted: boolean;
    highlightedStone: any;
    allStones: Array<{ pos: { x: number; y: number }; color: string; index: number }>;
}

export const StoneToStoneMeasurement: React.FC<StoneToStoneMeasurementProps> = ({
    stone,
    scale,
    displaySettings,
    opacity,
    formatDistance,
    getUnitIcon,
    isHighlighted,
    highlightedStone,
    allStones
}) => {
    const shouldShow = (isHighlighted && highlightedStone?.activeTypes?.includes("stone-to-stone")) &&
        displaySettings.stoneToStone?.showLine;

    if (!shouldShow) return null;

    const MAX_STONE_DIST_CM = 15; // 15cm threshold

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
            {allStones.map((otherStone) => {
                if (otherStone.color === stone.color && otherStone.index === stone.index) return null;

                const dx = otherStone.pos.x - stone.pos.x;
                const dy = otherStone.pos.y - stone.pos.y;
                const centerDist = Math.sqrt(dx * dx + dy * dy);
                const edgeDist = Math.max(0, centerDist - (STONE_RADIUS * 2));

                if (edgeDist > MAX_STONE_DIST_CM) return null;

                // Calculate line points (edge to edge)
                const angle = Math.atan2(dy, dx);
                const startX = stone.pos.x + Math.cos(angle) * STONE_RADIUS;
                const startY = stone.pos.y + Math.sin(angle) * STONE_RADIUS;
                const endX = otherStone.pos.x - Math.cos(angle) * STONE_RADIUS;
                const endY = otherStone.pos.y - Math.sin(angle) * STONE_RADIUS;

                const lineStartX = startX * scale;
                const lineStartY = startY * scale;
                const lineEndX = endX * scale;
                const lineEndY = endY * scale;

                // Position label above the target stone (otherStone)
                const targetStoneX = otherStone.pos.x * scale;
                const targetStoneY = otherStone.pos.y * scale;
                const labelX = targetStoneX;
                const labelY = targetStoneY; // At center of stone

                return (
                    <React.Fragment key={`sts-${stone.color}-${stone.index}-${otherStone.color}-${otherStone.index}`}>
                        <line
                            x1={lineStartX}
                            y1={lineStartY}
                            x2={lineEndX}
                            y2={lineEndY}
                            stroke="var(--color-lime-600)" // Poison Green (Lime-600)
                            strokeWidth="1"
                            strokeDasharray="4,2"
                            opacity={opacity}
                        />
                        {displaySettings.stoneToStone?.showDistance && (() => {
                            const iconType = getUnitIcon?.(edgeDist);
                            const distanceText = formatDistance(edgeDist);

                            return (
                                <g transform={`translate(${labelX}, ${labelY})`}>
                                    {/* Distance text */}
                                    <text
                                        x={iconType ? "-6" : "0"}
                                        y="4"
                                        textAnchor="middle"
                                        fontSize="10"
                                        fontWeight="bold"
                                        fill="var(--color-lime-600)"
                                        opacity={opacity}
                                    >
                                        {distanceText}
                                    </text>
                                    {/* Icon */}
                                    {iconType && (
                                        <g transform="translate(6, 0)">
                                            <MeasurementIcon type={iconType} color="var(--color-lime-600)" opacity={opacity} />
                                        </g>
                                    )}
                                </g>
                            );
                        })()}
                    </React.Fragment>
                );
            })}
        </svg>
    );
};
