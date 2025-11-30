import React from 'react';
import { SHEET_WIDTH, VIEW_TOP_OFFSET, STONE_RADIUS, HOUSE_RADIUS_12, HOUSE_RADIUS_8, HOUSE_RADIUS_4, BUTTON_RADIUS, HOG_LINE_OFFSET } from '../utils/constants';

interface StonePosition {
    x: number;
    y: number;
}

import { MeasurementType, useSettings } from '../contexts/SettingsContext';

interface StoneMeasurementsProps {
    stones: { red: StonePosition[]; yellow: StonePosition[] };
    scale: number;
    highlightedStone?: { color: 'red' | 'yellow'; index: number; activeTypes?: MeasurementType[] } | null;
    showMeasurements?: boolean;
}

// Proper curly brace algorithm adapted from D3.js example
// Creates a curly brace between (x1,y1) and (x2,y2), with width w and expressiveness q
const getBracePath = (x1: number, y1: number, x2: number, y2: number, w: number, q: number) => {
    // Calculate unit vector
    let dx = x1 - x2;
    let dy = y1 - y2;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx = dx / len;
    dy = dy / len;

    // Calculate Control Points of path
    const qx1 = x1 + q * w * dy;
    const qy1 = y1 - q * w * dx;
    const qx2 = (x1 - 0.25 * len * dx) + (1 - q) * w * dy;
    const qy2 = (y1 - 0.25 * len * dy) - (1 - q) * w * dx;
    const tx1 = (x1 - 0.5 * len * dx) + w * dy;
    const ty1 = (y1 - 0.5 * len * dy) - w * dx;
    const qx3 = x2 + q * w * dy;
    const qy3 = y2 - q * w * dx;
    const qx4 = (x1 - 0.75 * len * dx) + (1 - q) * w * dy;
    const qy4 = (y1 - 0.75 * len * dy) - (1 - q) * w * dx;

    return `M ${x1} ${y1} Q ${qx1} ${qy1} ${qx2} ${qy2} T ${tx1} ${ty1} M ${x2} ${y2} Q ${qx3} ${qy3} ${qx4} ${qy4} T ${tx1} ${ty1}`;
};

const StoneMeasurements: React.FC<StoneMeasurementsProps> = ({ stones, scale, highlightedStone, showMeasurements = true }) => {
    const { displaySettings, toggleModeSettings } = useSettings();
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

                // Offset for horizontal label: adjust if near top edge
                const isNearTopEdge = stonePixelY < edgeThreshold;
                const horizontalLabelOffset = isNearTopEdge ? 25 : -25;

                // Horizontal offset for tee line label based on quadrant (0-25%: right, 25-50%: left, 50-75%: right, 75-100%: left)
                const xPercent = (stone.pos.x / SHEET_WIDTH) * 100;
                let teeLineLabelOnRight: boolean;
                if (xPercent < 25) {
                    teeLineLabelOnRight = true;
                } else if (xPercent < 50) {
                    teeLineLabelOnRight = false;
                } else if (xPercent < 75) {
                    teeLineLabelOnRight = true;
                } else {
                    teeLineLabelOnRight = false;
                }
                const teeLineLabelHorizontalOffset = teeLineLabelOnRight ? 50 : -50;

                // Guard Zone Measurement
                // Zone is between Top of House (Tee Line - 12ft radius) and Hog Line (Tee Line - HOG_LINE_OFFSET)
                // Note: In our coordinate system:
                // Tee Line Y = teeLineY
                // Top of House Y = teeLineY - HOUSE_RADIUS_12
                // Hog Line Y = teeLineY - HOG_LINE_OFFSET
                // Since Y goes DOWN in SVG (0 at top), and we are looking at the area ABOVE the Tee Line (smaller Y values):
                // Top of House is at Y = teeLineY - HOUSE_RADIUS_12
                // Hog Line is at Y = teeLineY - HOG_LINE_OFFSET
                // So the zone is Y values between [teeLineY - HOG_LINE_OFFSET, teeLineY - HOUSE_RADIUS_12]

                const topOfHouseY = teeLineY - HOUSE_RADIUS_12;
                const hogLineY = teeLineY - HOG_LINE_OFFSET;

                // Check if the whole stone is in the guard zone
                // A stone is a guard if its bottom edge (center + radius) is above (less than) the top of house line
                // In our coordinate system, Y increases downwards, so "above" means smaller Y value
                // Guard zone: between Hog Line and Top of House
                // The stone's bottom edge should be above (less than) the top of house Y
                const stoneBottomEdgeY = stone.pos.y + STONE_RADIUS;
                const isInGuardZone = stoneBottomEdgeY < topOfHouseY && stone.pos.y > hogLineY;

                // Determine which measurements should be shown based on toggle mode settings
                const shouldShowGuardInToggle = isInGuardZone && toggleModeSettings.guardZone.showGuard;
                const shouldShowTLineInToggle = isInGuardZone
                    ? toggleModeSettings.guardZone.showTLine
                    : toggleModeSettings.houseZone.showTLine;
                const shouldShowCenterLineInToggle = isInGuardZone
                    ? toggleModeSettings.guardZone.showCenterLine
                    : toggleModeSettings.houseZone.showCenterLine;

                // Brace Logic
                // const isLeftOfCenter = stone.pos.x < centerLineX; // Already defined above
                const braceWidth = 20;
                const braceXOffset = 40; // Distance from stone center

                // Determine side based on position (reusing xPercent calculated above)
                // First 25%: Face inward (right side, pointing toward center)
                // 25-75%: Standard behavior (face away from center)
                // Last 25% (75-100%): Face inward (left side, pointing toward center)
                let placeBraceOnRight;
                if (xPercent < 25) {
                    placeBraceOnRight = true; // Right side, facing inward (toward center)
                } else if (xPercent > 75) {
                    placeBraceOnRight = false; // Left side, facing inward (toward center)
                } else {
                    placeBraceOnRight = !isLeftOfCenter; // Standard: face away from center
                }

                const braceX = placeBraceOnRight
                    ? stonePixelX + braceXOffset
                    : stonePixelX - braceXOffset;

                // If brace is on right, it points right (bulges right).
                // If brace is on left, it points left (bulges left).
                const pointRight = placeBraceOnRight;

                // Determine closest reference line
                // Y increases downwards.
                // Hog Line is at top (smaller Y).
                // House is at bottom (larger Y).
                // Stone is in between.

                const distToHog = Math.abs(stonePixelY - (hogLineY * scale));
                const distToHouse = Math.abs((topOfHouseY * scale) - stonePixelY);

                const isCloserToHog = distToHog < distToHouse;

                // Brace spans from reference line to stone.
                // If closer to Hog: Start at Hog (top), End at Stone (bottom).
                // If closer to House: Start at Stone (top), End at House (bottom).

                let braceStartY, braceEndY;

                if (isCloserToHog) {
                    braceStartY = hogLineY * scale;
                    braceEndY = stonePixelY;
                } else {
                    braceStartY = stonePixelY;
                    braceEndY = topOfHouseY * scale;
                }

                // Closest Ring Measurement
                const shouldShowClosestRingInToggle = !isInGuardZone && toggleModeSettings.houseZone.showClosestRing;

                // Calculate distance to closest ring
                // Rings are at (centerLineX, teeLineY) with radii:
                // HOUSE_RADIUS_12 (183cm)
                // HOUSE_RADIUS_8 (122cm)
                // HOUSE_RADIUS_4 (61cm)
                // BUTTON_RADIUS (15cm)

                const distToCenterPoint = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

                // Define ring radii
                const ringRadii = [HOUSE_RADIUS_12, HOUSE_RADIUS_8, HOUSE_RADIUS_4, BUTTON_RADIUS];

                // Find closest ring edge
                let minDistToRingEdge = Infinity;
                let closestRingRadius = 0;

                // Distance from stone center to ring edge is |distToCenterPoint - ringRadius|
                // But we want distance from STONE EDGE to ring edge.
                // Stone edge is at distToCenterPoint +/- STONE_RADIUS along the radial line.
                // Actually, the simplest way is:
                // Distance between stone center and ring center is distToCenterPoint.
                // The ring edge is at distance R from ring center.
                // The stone edge closest to the ring edge depends on whether the stone is inside or outside the ring.
                // If stone is outside ring (distToCenterPoint > R): distance is distToCenterPoint - R - STONE_RADIUS
                // If stone is inside ring (distToCenterPoint < R): distance is R - distToCenterPoint - STONE_RADIUS
                // In both cases, it's |distToCenterPoint - R| - STONE_RADIUS.
                // If result is negative, stone overlaps the ring edge.

                for (const r of ringRadii) {
                    const dist = Math.abs(distToCenterPoint - r) - STONE_RADIUS;
                    if (Math.abs(dist) < Math.abs(minDistToRingEdge)) {
                        minDistToRingEdge = dist;
                        closestRingRadius = r;
                    }
                }

                const displayDistanceToRing = minDistToRingEdge < 0 ? 0 : minDistToRingEdge;

                // Calculate start and end points for the line
                // Line goes from stone center to ring center, clipped to stone edge and ring edge.

                // Handle case where stone is exactly at center to avoid division by zero
                let ux = 0;
                let uy = 0;
                if (distToCenterPoint > 0.1) {
                    ux = deltaX / distToCenterPoint;
                    uy = deltaY / distToCenterPoint;
                } else {
                    ux = 1; // Default direction if at center
                    uy = 0;
                }

                // Determine if stone is inside the target ring
                const isInsideRing = distToCenterPoint < closestRingRadius;

                // Stone edge point (start)
                // ux points from Center to Stone.
                // If outside: closest point is towards center (pos - u * R)
                // If inside: closest point is away from center (pos + u * R)
                const stoneEdgeX = stone.pos.x + (isInsideRing ? ux : -ux) * STONE_RADIUS;
                const stoneEdgeY = stone.pos.y + (isInsideRing ? uy : -uy) * STONE_RADIUS;

                // Ring edge point (end)
                // Point on ring closest to stone.
                // Vector Center->Stone is (ux, uy).
                // Point on ring is Center + Unit * Radius (moving from center towards stone)
                const ringEdgeX = centerLineX + ux * closestRingRadius;
                const ringEdgeY = teeLineY + uy * closestRingRadius;

                // Convert to pixels
                const stoneEdgePixelX = stoneEdgeX * scale;
                const stoneEdgePixelY = stoneEdgeY * scale;
                const ringEdgePixelX = ringEdgeX * scale;
                const ringEdgePixelY = ringEdgeY * scale;

                // Text positioning logic
                // If line goes upwards (dy < 0), place text further down (+Y)
                // If line goes downwards (dy > 0), place text further up (-Y)
                const lineDy = ringEdgePixelY - stoneEdgePixelY;
                const textYOffset = lineDy < 0 ? 20 : -20;

                return (
                    <React.Fragment key={`${stone.color}-${stone.index}`}>
                        {/* Vertical line to Tee Line - Rendered first so guard brace appears on top */}
                        {(
                            (isHighlighted && highlightedStone?.activeTypes?.includes('t-line')) ||
                            (!isHighlighted && shouldShowTLineInToggle)
                        ) && (displaySettings.tLine.showLine || displaySettings.tLine.showDistance) && (
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
                                    {displaySettings.tLine.showLine && (
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
                                    )}
                                    {/* Distance label for Tee Line */}
                                    {displaySettings.tLine.showDistance && (
                                        <text
                                            x={stonePixelX + teeLineLabelHorizontalOffset}
                                            y={(stonePixelY + teeLinePixelY) / 2}
                                            fill={textColor}
                                            fontSize={fontSize}
                                            fontWeight={fontWeight}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            style={{ transition: 'all 0.2s ease' }}
                                            opacity={opacity}
                                        >
                                            {displayDistanceToTee.toFixed(1)}cm {isAboveTee ? '↓' : '↑'}
                                        </text>
                                    )}
                                </svg>

                            )}

                        {/* Guard Zone Measurement (Brace) - Rendered after t-line so it appears on top */}
                        {isInGuardZone && (
                            (isHighlighted && highlightedStone?.activeTypes?.includes('guard')) ||
                            (!isHighlighted && shouldShowGuardInToggle)
                        ) && (
                                <svg
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        transition: 'opacity 0.2s ease',
                                        overflow: 'visible'
                                    }}
                                >
                                    {/* Hog Line Reference Line */}
                                    <line
                                        x1={0}
                                        y1={hogLineY * scale}
                                        x2={SHEET_WIDTH * scale}
                                        y2={hogLineY * scale}
                                        stroke="#9333ea"
                                        strokeWidth="1"
                                        opacity={opacity}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Top of House Reference Line */}
                                    <line
                                        x1={0}
                                        y1={topOfHouseY * scale}
                                        x2={SHEET_WIDTH * scale}
                                        y2={topOfHouseY * scale}
                                        stroke="#9333ea"
                                        strokeWidth="1"
                                        opacity={opacity}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Brace */}
                                    {displaySettings.guard.showBraceLine && (
                                        <path
                                            d={getBracePath(
                                                braceX,
                                                braceStartY,
                                                braceX,
                                                braceEndY,
                                                pointRight ? -braceWidth : braceWidth,
                                                0.6
                                            )}
                                            stroke="#9333ea"
                                            strokeWidth="2"
                                            fill="none"
                                            opacity={opacity}
                                            style={{ transition: 'all 0.2s ease' }}
                                        />
                                    )}

                                    {/* Dashed connector line from brace to stone edge (Stone End) */}
                                    <line
                                        x1={braceX}
                                        y1={stonePixelY}
                                        x2={placeBraceOnRight ? stonePixelX + (STONE_RADIUS * scale) : stonePixelX - (STONE_RADIUS * scale)}
                                        y2={stonePixelY}
                                        stroke="#9333ea"
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                        opacity={opacity}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Dashed connector line from brace to stone edge (Reference End) */}
                                    <line
                                        x1={braceX}
                                        y1={isCloserToHog ? hogLineY * scale : topOfHouseY * scale}
                                        x2={placeBraceOnRight ? stonePixelX + (STONE_RADIUS * scale) : stonePixelX - (STONE_RADIUS * scale)}
                                        y2={isCloserToHog ? hogLineY * scale : topOfHouseY * scale}
                                        stroke="#9333ea"
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                        opacity={opacity}
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Vertical extension line (from Top of House to Hog Line) */}
                                    <line
                                        x1={placeBraceOnRight ? stonePixelX + (STONE_RADIUS * scale) : stonePixelX - (STONE_RADIUS * scale)}
                                        y1={topOfHouseY * scale}
                                        x2={placeBraceOnRight ? stonePixelX + (STONE_RADIUS * scale) : stonePixelX - (STONE_RADIUS * scale)}
                                        y2={hogLineY * scale}
                                        stroke="#9333ea"
                                        strokeWidth="2"
                                        strokeDasharray="5,5"
                                        opacity={parseFloat(opacity) * 0.5} // Slightly more transparent
                                        style={{ transition: 'all 0.2s ease' }}
                                    />

                                    {/* Percentage Label */}
                                    {(() => {
                                        // Calculate percentage based on closest reference line
                                        let percentage;
                                        const totalZoneDist = topOfHouseY - hogLineY;

                                        // Calculate actual distance in cm for the brace segment
                                        let braceDistanceCm;
                                        if (isCloserToHog) {
                                            // Distance from Hog Line to Top of House
                                            const distFromHog = stone.pos.y - hogLineY;
                                            percentage = Math.round((distFromHog / totalZoneDist) * 100);
                                            braceDistanceCm = distFromHog;
                                        } else {
                                            // Distance from Top of House to Hog Line (original calculation)
                                            const distFromHouse = topOfHouseY - stone.pos.y;
                                            percentage = Math.round((distFromHouse / totalZoneDist) * 100);
                                            braceDistanceCm = distFromHouse;
                                        }

                                        // Label Position (Brace)
                                        // At the "point" of the brace (midY of the brace segment)
                                        // Offset further by braceWidth
                                        const midY = (braceStartY + braceEndY) / 2;
                                        // Adjust vertical position when brace is on right to align with left-side labels
                                        const verticalAdjustment = pointRight ? 3 : 0;
                                        const labelX = pointRight
                                            ? braceX + braceWidth + 20
                                            : braceX - braceWidth - 20;

                                        // Label Position (Extension Line)
                                        // Now spans entire guard zone, so center it there
                                        const extLineStartY = topOfHouseY * scale;
                                        const extLineEndY = hogLineY * scale;
                                        const extMidY = (extLineStartY + extLineEndY) / 2;
                                        const extLabelX = placeBraceOnRight
                                            ? stonePixelX + (STONE_RADIUS * scale) + 35
                                            : stonePixelX - (STONE_RADIUS * scale) - 35;

                                        return (
                                            <>
                                                {/* Brace Label - Percentage */}
                                                {displaySettings.guard.showPercentage && (
                                                    <text
                                                        x={labelX}
                                                        y={midY + verticalAdjustment - (isHighlighted ? 8 : 6)}
                                                        fill="#7e22ce" // Purple-700
                                                        fontSize={fontSize}
                                                        fontWeight={fontWeight}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        opacity={opacity}
                                                        style={{ transition: 'all 0.2s ease' }}
                                                    >
                                                        {percentage}%
                                                    </text>
                                                )}

                                                {/* Brace Label - Distance in cm */}
                                                {displaySettings.guard.showDistance && (
                                                    <>
                                                        <text
                                                            x={labelX}
                                                            y={midY + verticalAdjustment + (isHighlighted ? 8 : 6)}
                                                            fill="#7e22ce" // Purple-700
                                                            fontSize={isHighlighted ? "12" : "10"}
                                                            fontWeight="600"
                                                            textAnchor="middle"
                                                            dominantBaseline="middle"
                                                            opacity={opacity}
                                                            style={{ transition: 'all 0.2s ease' }}
                                                        >
                                                            {braceDistanceCm.toFixed(1)}cm
                                                        </text>
                                                        {/* Broom/Rock Length Label */}
                                                        {displaySettings.guard.showBroomLength && (
                                                            braceDistanceCm < STONE_RADIUS * 2 * 2 ? (
                                                                // Rock lengths (< 2 stone diameters)
                                                                <g>
                                                                    <text
                                                                        x={labelX - (isHighlighted ? 8 : 6)}
                                                                        y={midY + verticalAdjustment + (isHighlighted ? 20 : 16)}
                                                                        fill="#7e22ce"
                                                                        fontSize={isHighlighted ? "10" : "8"}
                                                                        fontWeight="500"
                                                                        textAnchor="end"
                                                                        dominantBaseline="middle"
                                                                        opacity={opacity}
                                                                        style={{ transition: 'all 0.2s ease' }}
                                                                    >
                                                                        {(braceDistanceCm / (STONE_RADIUS * 2)).toFixed(2)}
                                                                    </text>
                                                                    {/* Curling stone icon */}
                                                                    <g transform={`translate(${labelX + (isHighlighted ? 3 : 2)}, ${midY + verticalAdjustment + (isHighlighted ? 20 : 16)})`} opacity={opacity}>
                                                                        {/* Stone body (circle) */}
                                                                        <circle cx="0" cy="0" r={isHighlighted ? "4" : "3"} fill="none" stroke="#7e22ce" strokeWidth="0.8" />
                                                                        {/* Handle */}
                                                                        <rect x="-1.5" y="-1" width="3" height="2" rx="0.5" fill="#7e22ce" />
                                                                    </g>
                                                                </g>
                                                            ) : (
                                                                // Broom lengths (>= 2 stone diameters)
                                                                <text
                                                                    x={labelX}
                                                                    y={midY + verticalAdjustment + (isHighlighted ? 20 : 16)}
                                                                    fill="#7e22ce"
                                                                    fontSize={isHighlighted ? "10" : "8"}
                                                                    fontWeight="500"
                                                                    textAnchor="middle"
                                                                    dominantBaseline="middle"
                                                                    opacity={opacity}
                                                                    style={{ transition: 'all 0.2s ease' }}
                                                                >
                                                                    {(braceDistanceCm / 155).toFixed(2)} 🧹
                                                                </text>
                                                            )
                                                        )}
                                                    </>
                                                )}

                                                {/* Extension Line Label */}
                                                <text
                                                    x={extLabelX}
                                                    y={extMidY}
                                                    fill="#7e22ce" // Purple-700
                                                    fontSize={fontSize}
                                                    fontWeight={fontWeight}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    opacity={opacity}
                                                    style={{ transition: 'all 0.2s ease' }}
                                                >
                                                    {100 - percentage}%
                                                </text>
                                            </>
                                        );
                                    })()}
                                </svg>
                            )}

                        {/* Horizontal line to Center Line */}
                        {(
                            (isHighlighted && highlightedStone?.activeTypes?.includes('center-line')) ||
                            (!isHighlighted && shouldShowCenterLineInToggle)
                        ) && (displaySettings.centerLine.showLine || displaySettings.centerLine.showDistance) && (() => {
                            // Check if guard measurement is also active
                            const isGuardActive = isInGuardZone && (
                                (isHighlighted && highlightedStone?.activeTypes?.includes('guard')) ||
                                (!isHighlighted && shouldShowGuardInToggle)
                            );

                            // Calculate adjusted line endpoints to avoid overlap with brace
                            let adjustedStartX = horizontalLineStartX;
                            let adjustedEndX = centerLinePixelX;

                            if (isGuardActive && displaySettings.guard.showBraceLine) {
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
                                const braceLeft = pointRightLocal ? braceXLocal : braceXLocal - braceWidthLocal;
                                const braceRight = pointRightLocal ? braceXLocal + braceWidthLocal : braceXLocal;

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
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        width: '100%',
                                        height: '100%',
                                        pointerEvents: 'none',
                                        transition: 'opacity 0.2s ease'
                                    }}
                                >
                                    {displaySettings.centerLine.showLine && (
                                        <line
                                            x1={adjustedStartX}
                                            y1={stonePixelY}
                                            x2={adjustedEndX}
                                            y2={stonePixelY}
                                            stroke={strokeColor}
                                            strokeWidth={strokeWidth}
                                            strokeDasharray="5,5"
                                            opacity={opacity}
                                            style={{ transition: 'all 0.2s ease' }}
                                        />
                                    )}
                                    {/* Distance label for Center Line */}
                                    {displaySettings.centerLine.showDistance && (
                                        <>
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
                                                {isLeftOfCenter ? `${displayDistanceToCenter.toFixed(1)}cm →` : `← ${displayDistanceToCenter.toFixed(1)}cm`}
                                            </text>
                                            {/* Broom/Stone Length Label for Guard Zone */}
                                            {isInGuardZone && displaySettings.guard.showBroomLength && (
                                                displayDistanceToCenter < STONE_RADIUS * 2 * 2 ? (
                                                    // Rock lengths (< 2 stone diameters)
                                                    <g>
                                                        <text
                                                            x={(horizontalLineStartX + centerLinePixelX) / 2 - (isHighlighted ? 8 : 6)}
                                                            y={stonePixelY + horizontalLabelOffset + (isHighlighted ? 14 : 12)}
                                                            fill={textColor}
                                                            fontSize={isHighlighted ? "10" : "8"}
                                                            fontWeight="500"
                                                            textAnchor="end"
                                                            dominantBaseline="middle"
                                                            opacity={opacity}
                                                            style={{ transition: 'all 0.2s ease' }}
                                                        >
                                                            {(displayDistanceToCenter / (STONE_RADIUS * 2)).toFixed(2)}
                                                        </text>
                                                        {/* Curling stone icon */}
                                                        <g transform={`translate(${(horizontalLineStartX + centerLinePixelX) / 2 + (isHighlighted ? 3 : 2)}, ${stonePixelY + horizontalLabelOffset + (isHighlighted ? 14 : 12)})`} opacity={opacity}>
                                                            {/* Stone body (circle) */}
                                                            <circle cx="0" cy="0" r={isHighlighted ? "4" : "3"} fill="none" stroke={textColor} strokeWidth="0.8" />
                                                            {/* Handle */}
                                                            <rect x="-1.5" y="-1" width="3" height="2" rx="0.5" fill={textColor} />
                                                        </g>
                                                    </g>
                                                ) : (
                                                    // Broom lengths (>= 2 stone diameters)
                                                    <text
                                                        x={(horizontalLineStartX + centerLinePixelX) / 2}
                                                        y={stonePixelY + horizontalLabelOffset + (isHighlighted ? 14 : 12)}
                                                        fill={textColor}
                                                        fontSize={isHighlighted ? "10" : "8"}
                                                        fontWeight="500"
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        opacity={opacity}
                                                        style={{ transition: 'all 0.2s ease' }}
                                                    >
                                                        {(displayDistanceToCenter / 155).toFixed(2)} 🧹
                                                    </text>
                                                )
                                            )}
                                        </>
                                    )}
                                </svg>
                            );
                        })()}

                        {/* Closest Ring Measurement */}
                        {(
                            (isHighlighted && highlightedStone?.activeTypes?.includes('closest-ring')) ||
                            (!isHighlighted && shouldShowClosestRingInToggle)
                        ) && (displaySettings.closestRing?.showLine || displaySettings.closestRing?.showDistance) && (
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
                                    {displaySettings.closestRing?.showLine && (
                                        <line
                                            x1={stoneEdgePixelX}
                                            y1={stoneEdgePixelY}
                                            x2={ringEdgePixelX}
                                            y2={ringEdgePixelY}
                                            stroke="#06b6d4" // Cyan-500
                                            strokeWidth="3"
                                            opacity={opacity}
                                            style={{ transition: 'all 0.2s ease' }}
                                        />
                                    )}
                                    {/* Distance label for Closest Ring */}
                                    {displaySettings.closestRing?.showDistance && (
                                        <text
                                            x={(stoneEdgePixelX + ringEdgePixelX) / 2}
                                            y={((stoneEdgePixelY + ringEdgePixelY) / 2) + textYOffset}
                                            fill="#0891b2" // Cyan-600
                                            fontSize={fontSize}
                                            fontWeight={fontWeight}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            style={{
                                                transition: 'all 0.2s ease',
                                                textShadow: '0 0 4px white' // Add shadow for better visibility over rings
                                            }}
                                            opacity={opacity}
                                        >
                                            {displayDistanceToRing.toFixed(1)}cm
                                        </text>
                                    )}
                                </svg>
                            )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default StoneMeasurements;
