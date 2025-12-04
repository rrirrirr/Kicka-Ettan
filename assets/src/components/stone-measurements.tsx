import React from "react";
import {
  SHEET_WIDTH,
  VIEW_TOP_OFFSET,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  HOUSE_RADIUS_8,
  HOUSE_RADIUS_4,
  BUTTON_RADIUS,
  HOG_LINE_OFFSET,
  NEAR_HOUSE_THRESHOLD,
  BACK_LINE_OFFSET,
} from "../utils/constants";
import { Target, Shield, ArrowLeftRight } from "lucide-react";

interface StonePosition {
  x: number;
  y: number;
}

import { MeasurementType, useSettings } from "../contexts/SettingsContext";

interface StoneMeasurementsProps {
  stones: { red: StonePosition[]; yellow: StonePosition[] };
  scale: number;
  highlightedStone?: {
    color: "red" | "yellow";
    index: number;
    activeTypes?: MeasurementType[];
    stepIndex?: number;
  } | null;
  showMeasurements?: boolean;
  onToggleMeasurementType?: (type: MeasurementType) => void;
  isSelected?: boolean; // true if stone is selected (not just hovered)
}

// Proper curly brace algorithm adapted from D3.js example
// Creates a curly brace between (x1,y1) and (x2,y2), with width w and expressiveness q
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

// --- New Types and Helpers for Grouped Labels ---



const StoneMeasurements: React.FC<StoneMeasurementsProps> = ({
  stones,
  scale,
  highlightedStone,
  showMeasurements = true,
  onToggleMeasurementType,
  isSelected = false,
}) => {
  const { displaySettings, toggleModeSettings, unitSystem, smartUnits, settings } =
    useSettings();

  const centerLineX = SHEET_WIDTH / 2;

  const formatDistance = (cm: number) => {
    if (unitSystem === "smart") {
      const rule = smartUnits.find((r) => cm <= r.maxDistance) || {
        unit: "metric",
      };
      switch (rule.unit) {
        case "imperial":
          return `${(cm / 2.54).toFixed(1)} "`;
        case "stone":
          return `${(cm / (STONE_RADIUS * 2)).toFixed(1)} 🥌`;
        case "broom":
          return `${(cm / 155).toFixed(1)} 🧹`;
        case "metric":
        default:
          return `${cm.toFixed(1)}cm`;
      }
    }
    if (unitSystem === "imperial") {
      return `${(cm / 2.54).toFixed(1)}"`;
    }
    return `${cm.toFixed(1)}cm`;
  };
  const teeLineY = VIEW_TOP_OFFSET;

  const allStones: Array<{
    pos: StonePosition;
    color: "red" | "yellow";
    index: number;
  }> = [
      ...stones.red.map((pos, idx) => ({
        pos,
        color: "red" as const,
        index: idx,
      })),
      ...stones.yellow.map((pos, idx) => ({
        pos,
        color: "yellow" as const,
        index: idx,
      })),
    ];

  // Optimization: If measurements are hidden and no stone is highlighted, render nothing
  if (!showMeasurements && !highlightedStone) return null;

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
        const displayDistanceToCenter =
          rawDistCenter === -STONE_RADIUS ? 0 : rawDistCenter;
        const displayDistanceToTee =
          rawDistTee === -STONE_RADIUS ? 0 : rawDistTee;

        // Calculate vertical line (to Tee Line)
        // - Line should go from stone's near edge toward tee line
        // - If stone overlaps tee line, no line needed (handled by distanceToTee check)
        // Add 2px to account for stone's border
        const verticalLineStartY = isAboveTee
          ? stonePixelY + STONE_RADIUS * scale + 2 // Bottom edge of stone above tee
          : stonePixelY - STONE_RADIUS * scale - 2; // Top edge of stone below tee

        // Calculate horizontal line (to Center Line)
        // Add 2px to account for stone's border
        const horizontalLineStartX = isLeftOfCenter
          ? stonePixelX + STONE_RADIUS * scale + 2 // Right edge of stone left of center
          : stonePixelX - STONE_RADIUS * scale - 2; // Left edge of stone right of center

        // Check if this stone is highlighted
        const isHighlighted =
          highlightedStone &&
          highlightedStone.color === stone.color &&
          highlightedStone.index === stone.index;

        // Determine styling based on highlight state
        const hasHighlightedStone =
          highlightedStone !== null && highlightedStone !== undefined;

        // Use highlighted style if this stone is highlighted OR if we are in toggle mode (showMeasurements) and no stone is specifically highlighted
        const useHighlightedStyle = isHighlighted || (!hasHighlightedStone && showMeasurements);

        const strokeWidth = useHighlightedStyle ? "4" : "2";

        // Opacity logic:
        // - If measurements are toggled off: only show highlighted stone (1.0), hide all others (0)
        // - If measurements are toggled on: show highlighted at 1.0, dim others when one is selected (0.3), or show all normal (0.7)
        let opacity: string;
        if (!showMeasurements) {
          opacity = isHighlighted ? "1.0" : "0";
        } else {
          // If a stone is highlighted, show it fully and hide others (0).
          // If no stone is highlighted, show all with default opacity (1.0 for toggle mode).
          opacity = isHighlighted ? "1.0" : hasHighlightedStone ? "0" : "1.0";
        }

        const fontSize = useHighlightedStyle ? "16" : "12";
        const fontWeight = useHighlightedStyle ? "900" : "bold";
        const highVisibilityTextColor = "#fbbf24"; // Amber-400 (high visibility on white, red, and yellow)

        // Determine which side of center line the stone is on
        // Edge detection: check if stone is too close to left/right edges
        const edgeThreshold = 60; // pixels of margin to maintain

        // Offset for horizontal label: adjust if near top edge, or if below t-line
        const isNearTopEdge = stonePixelY < edgeThreshold;
        const horizontalLabelOffset = (isNearTopEdge || !isAboveTee) ? 25 : -25;

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

        // Zone Classification using radial distance from house center
        const nearHouseThreshold = NEAR_HOUSE_THRESHOLD; // Use shared constant

        // Calculate distance from stone center to house center
        const distToCenterPoint = Math.sqrt(
          Math.pow(deltaX, 2) + Math.pow(deltaY, 2),
        );

        // Determine zone based on radial distance
        const isTouchingHouse =
          distToCenterPoint <= HOUSE_RADIUS_12 + STONE_RADIUS;
        const isInNearHouseZone =
          !isTouchingHouse &&
          distToCenterPoint <=
          HOUSE_RADIUS_12 + STONE_RADIUS + nearHouseThreshold &&
          stone.pos.y > hogLineY;
        const isInGuardZone =
          !isTouchingHouse && !isInNearHouseZone && stone.pos.y > hogLineY;

        // Determine which measurements should be shown based on toggle mode settings
        const shouldShowGuardInToggle =
          isInGuardZone && toggleModeSettings.guardZone.showGuard;
        const shouldShowTLineInToggle = isInGuardZone
          ? toggleModeSettings.guardZone.showTLine
          : isInNearHouseZone
            ? toggleModeSettings.nearHouseZone.showTLine
            : toggleModeSettings.houseZone.showTLine;
        const shouldShowCenterLineInToggle = isInGuardZone
          ? toggleModeSettings.guardZone.showCenterLine
          : isInNearHouseZone
            ? toggleModeSettings.nearHouseZone.showCenterLine
            : toggleModeSettings.houseZone.showCenterLine;

        // Brace Logic - Unused for now, commented out to fix build
        // const isLeftOfCenter = stone.pos.x < centerLineX; // Already defined above
        // const braceWidth = 20;
        // const braceXOffset = 40; // Distance from stone center

        // Determine side based on position (reusing xPercent calculated above)
        // First 25%: Face inward (right side, pointing toward center)
        // 25-75%: Standard behavior (face away from center)
        // Last 25% (75-100%): Face inward (left side, pointing toward center)
        // let placeBraceOnRight;
        // if (xPercent < 25) {
        //     placeBraceOnRight = true; // Right side, facing inward (toward center)
        // } else if (xPercent > 75) {
        //     placeBraceOnRight = false; // Left side, facing inward (toward center)
        // } else {
        //     placeBraceOnRight = !isLeftOfCenter; // Standard: face away from center
        // }

        // const braceX = placeBraceOnRight
        //     ? stonePixelX + braceXOffset
        //     : stonePixelX - braceXOffset;

        // If brace is on right, it points right (bulges right).
        // If brace is on left, it points left (bulges left).
        // const pointRight = placeBraceOnRight;

        // Determine closest reference line
        // Y increases downwards.
        // Hog Line is at top (smaller Y).
        // House is at bottom (larger Y).
        // Stone is in between.

        // const distToHog = Math.abs(stonePixelY - (hogLineY * scale));
        // const distToHouse = Math.abs((topOfHouseY * scale) - stonePixelY);
        // const isCloserToHog = distToHog < distToHouse;

        // Brace spans from reference line to stone.
        // If closer to Hog: Start at Hog (top), End at Stone (bottom).
        // If closer to House: Start at Stone (top), End at House (bottom).

        // Unused for now - commented out to fix build
        // let braceStartY, braceEndY;
        // if (isCloserToHog) {
        //     braceStartY = hogLineY * scale;
        //     braceEndY = stonePixelY;
        // } else {
        //     braceStartY = stonePixelY;
        //     braceEndY = topOfHouseY * scale;
        // }

        // Closest Ring Measurement
        const shouldShowClosestRingInToggle = isInGuardZone
          ? false
          : isInNearHouseZone
            ? toggleModeSettings.nearHouseZone.showClosestRing
            : toggleModeSettings.houseZone.showClosestRing;

        // Calculate distance to closest ring
        // Rings are at (centerLineX, teeLineY) with radii:
        // HOUSE_RADIUS_12 (183cm)
        // HOUSE_RADIUS_8 (122cm)
        // HOUSE_RADIUS_4 (61cm)
        // BUTTON_RADIUS (15cm)
        // Note: distToCenterPoint is already calculated above for zone classification

        // Define ring radii
        const ringRadii = [
          HOUSE_RADIUS_12,
          HOUSE_RADIUS_8,
          HOUSE_RADIUS_4,
          BUTTON_RADIUS,
        ];

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

        const displayDistanceToRing = Math.max(0, minDistToRingEdge);

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

        // Determine if stone is inside the target ring - unused for now
        // const isInsideRing = distToCenterPoint < closestRingRadius;

        // Stone edge point (start)
        // ux, uy points from Center to Stone.
        // If stone is outside ring (distToCenterPoint > closestRingRadius):
        //   Line goes INWARD (toward ring/center), so start at inner edge (stone.pos - u * STONE_RADIUS)
        // If stone is inside ring (distToCenterPoint < closestRingRadius):
        //   Line goes OUTWARD (toward ring/away from center), so start at outer edge (stone.pos + u * STONE_RADIUS)
        const isStoneOutsideRing = distToCenterPoint > closestRingRadius;
        const stoneEdgeX = isStoneOutsideRing
          ? stone.pos.x - ux * STONE_RADIUS // Inner edge (toward center) - line goes inward
          : stone.pos.x + ux * STONE_RADIUS; // Outer edge (away from center) - line goes outward
        const stoneEdgeY = isStoneOutsideRing
          ? stone.pos.y - uy * STONE_RADIUS // Inner edge (toward center) - line goes inward
          : stone.pos.y + uy * STONE_RADIUS; // Outer edge (away from center) - line goes outward

        // Ring edge point (end)
        // Point on ring closest to stone.
        // Vector Center->Stone is (ux, uy).
        // Point on ring is Center + Unit * Radius (moving from center towards stone)
        const ringEdgeX = centerLineX + ux * closestRingRadius;
        const ringEdgeY = teeLineY + uy * closestRingRadius;

        // Convert to pixels and account for 2px border
        // Outside ring (line inward): move 2px more toward center (-ux)
        // Inside ring (line outward): move 2px more away from center (+ux)
        const stoneEdgePixelX =
          stoneEdgeX * scale + (isStoneOutsideRing ? -ux * 2 : ux * 2);
        const stoneEdgePixelY =
          stoneEdgeY * scale + (isStoneOutsideRing ? -uy * 2 : uy * 2);
        const ringEdgePixelX = ringEdgeX * scale;
        const ringEdgePixelY = ringEdgeY * scale;

        // Text positioning logic
        // If line goes upwards (dy < 0), place text further down (+Y)
        // If line goes downwards (dy > 0), place text further up (-Y)
        const lineDy = ringEdgePixelY - stoneEdgePixelY;
        // Use smaller offset for overlapping/percentage (no line), larger for distance (with line)
        const isOverlappingRing = minDistToRingEdge <= 0;
        const offsetAmount = isOverlappingRing ? 20 : 40;
        let textYOffset = lineDy < 0 ? offsetAmount : -offsetAmount;
        // Push label further down for near house zone to avoid overlap with center line label
        if (isInNearHouseZone) {
          textYOffset += 30; // Additional downward offset (positive Y)
        }

        return (
          <React.Fragment key={`${stone.color}-${stone.index}`}>
            {/* Vertical line to Tee Line - Rendered first so guard brace appears on top */}
            {((isHighlighted &&
              highlightedStone?.activeTypes?.includes("t-line")) ||
              (!isHighlighted && shouldShowTLineInToggle)) &&
              (displaySettings.tLine.showLine ||
                displaySettings.tLine.showDistance) && (
                <svg
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                    transition: "opacity 0.2s ease",
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
                        stroke="#fbbf24"
                        strokeWidth={strokeWidth}
                        strokeDasharray="5,5"
                        opacity={opacity}
                        style={{ transition: "all 0.2s ease" }}
                      />
                    );
                  })()}
                  {/* Distance label for Tee Line */}
                  {displaySettings.tLine.showDistance && (
                    <g
                      transform={`translate(${stonePixelX + teeLineLabelHorizontalOffset}, ${(stonePixelY + teeLinePixelY) / 2})`}
                      opacity={opacity}
                    >
                      {/* Black outline */}
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
                          const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                          const displayValue = isTLineOverlapping
                            ? Math.abs(deltaY)
                            : displayDistanceToTee;
                          return `${formatDistance(displayValue)} ${isAboveTee ? "↓" : "↑"}`;
                        })()}
                      </text>
                      {/* Pink text on top */}
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
                          const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                          const displayValue = isTLineOverlapping
                            ? Math.abs(deltaY)
                            : displayDistanceToTee;
                          return `${formatDistance(displayValue)} ${isAboveTee ? "↓" : "↑"}`;
                        })()}
                      </text>
                    </g>
                  )}

                  {/* Progress Bar Overlay on Stone for T-Line (when overlapping) - Hover/Select Mode */}
                  {(() => {
                    const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
                    if (!isTLineOverlapping) return null;

                    const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                    const barHeight = 8;
                    const offsetDistance = Math.abs(deltaY);
                    const fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2); // Half bar represents radius

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
                          fill="#1f2937"
                          fillOpacity="0.8"
                          rx="2"
                        />
                        {/* Bar Fill - fills from center to show offset */}
                        <rect
                          x={isAboveTee ? 0 : -fillWidth}
                          y={-barHeight / 2}
                          width={fillWidth}
                          height={barHeight}
                          fill="#fbbf24"
                          fillOpacity="0.9"
                        />
                      </g>
                    );
                  })()}
                </svg>
              )}

            {/* Guard Zone Measurement (Brace or Direct Line) - Rendered after t-line so it appears on top */}
            {isInGuardZone &&
              ((isHighlighted &&
                highlightedStone?.activeTypes?.includes("guard")) ||
                (!isHighlighted && shouldShowGuardInToggle)) && (
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
                    style={{ transition: "all 0.2s ease" }}
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
                            stroke="#9333ea"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                            opacity={opacity}
                            style={{ transition: "all 0.2s ease" }}
                          />

                          {/* Distance Label (cm) */}
                          {/* Black outline */}
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
                          {/* Purple text on top */}
                          <text
                            x={labelX}
                            y={labelY}
                            fill="#a855f7"
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
                      // const isLeftOfCenter = stone.pos.x < centerLineX; // Already defined above
                      // const braceWidth = 20; // Defined above but not in scope here? No, it was defined in render function scope.
                      // Let's redefine or use values.
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
                              stroke="#9333ea"
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
                            stroke="#9333ea"
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
                            stroke="#9333ea"
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
                            stroke="#9333ea"
                            strokeWidth="1"
                            strokeDasharray="5,5"
                            opacity={parseFloat(opacity) * 0.5} // Slightly more transparent
                            style={{ transition: "all 0.2s ease" }}
                          />

                          {/* Brace Label - Percentage */}
                          {displaySettings.guard.showPercentage && (
                            <>
                              {/* Black outline */}
                              <text
                                x={labelX}
                                y={
                                  midY +
                                  verticalAdjustment -
                                  (useHighlightedStyle ? 8 : 6)
                                }
                                fill="black"
                                fillOpacity="0.3"
                                stroke="black"
                                strokeOpacity="0.3"
                                strokeWidth="3"
                                fontSize={fontSize}
                                fontWeight={fontWeight}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                              >
                                {percentage}%
                              </text>
                              {/* Purple text on top */}
                              <text
                                x={labelX}
                                y={
                                  midY +
                                  verticalAdjustment -
                                  (useHighlightedStyle ? 8 : 6)
                                }
                                fill="#a855f7" // Purple-500
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
                              {/* Black outline */}
                              <text
                                x={labelX}
                                y={
                                  midY +
                                  verticalAdjustment +
                                  (useHighlightedStyle ? 8 : 6)
                                }
                                fill="black"
                                fillOpacity="0.3"
                                stroke="black"
                                strokeOpacity="0.3"
                                strokeWidth="3"
                                fontSize={useHighlightedStyle ? "12" : "10"}
                                fontWeight="600"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                opacity={opacity}
                                style={{ transition: "all 0.2s ease" }}
                              >
                                {formatDistance(braceDistanceCm)}
                              </text>
                              {/* Purple text on top */}
                              <text
                                x={labelX}
                                y={
                                  midY +
                                  verticalAdjustment +
                                  (useHighlightedStyle ? 8 : 6)
                                }
                                fill="#a855f7" // Purple-500
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
                          {/* Black outline */}
                          <text
                            x={extLabelX}
                            y={extMidY}
                            fill="black"
                            fillOpacity="0.3"
                            stroke="black"
                            strokeOpacity="0.3"
                            strokeWidth="3"
                            fontSize={fontSize}
                            fontWeight={fontWeight}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            opacity={opacity}
                            style={{ transition: "all 0.2s ease" }}
                          >
                            {100 - percentage}%
                          </text>
                          {/* Purple text on top */}
                          <text
                            x={extLabelX}
                            y={extMidY}
                            fill="#a855f7" // Purple-500
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
              )}

            {/* Horizontal line to Center Line */}
            {((isHighlighted &&
              highlightedStone?.activeTypes?.includes("center-line")) ||
              (!isHighlighted && shouldShowCenterLineInToggle)) &&
              (displaySettings.centerLine.showLine ||
                displaySettings.centerLine.showDistance) &&
              (() => {
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
                          stroke="#fbbf24"
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
                          {/* Black outline */}
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
                          {/* Purple text on top */}
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
                            fill="#1f2937"
                            fillOpacity="0.8"
                            rx="2"
                          />
                          {/* Bar Fill - fills from center to show offset */}
                          <rect
                            x={isLeftOfCenter ? 0 : -fillWidth}
                            y={-barHeight / 2}
                            width={fillWidth}
                            height={barHeight}
                            fill="#fbbf24"
                            fillOpacity="0.9"
                          />
                        </g>
                      );
                    })()}
                  </svg>
                );
              })()}

            {/* Closest Ring Measurement */}
            {((isHighlighted &&
              highlightedStone?.activeTypes?.includes("closest-ring")) ||
              (!isHighlighted && shouldShowClosestRingInToggle)) &&
              (displaySettings.closestRing?.showLine ||
                displaySettings.closestRing?.showDistance) &&
              (() => {
                const isOverlapping = minDistToRingEdge <= 0;

                // Calculate angle from house center to stone for bar rotation
                const angleRad = Math.atan2(deltaY, deltaX);
                const angleDeg = (angleRad * 180) / Math.PI;

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
                          stroke="#06b6d4" // Cyan-500
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
                            fill="#1f2937"
                            fillOpacity="0.8"
                            rx="2"
                          />
                          {/* Bar Fill - fills from the side where ring enters */}
                          <rect
                            x={isStoneOutsideRing ? -barLength / 2 : barLength / 2 - fillWidth}
                            y={-barHeight / 2}
                            width={fillWidth}
                            height={barHeight}
                            fill="#06b6d4"
                            fillOpacity="0.9"
                            rx="2"
                          />
                        </g>
                      );
                    })()}

                    {/* Distance label or Percentage label */}
                    {displaySettings.closestRing?.showDistance && (
                      <g
                        transform={`translate(${(stoneEdgePixelX + ringEdgePixelX) / 2}, ${(stoneEdgePixelY + ringEdgePixelY) / 2 + textYOffset})`}
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
                                {/* Black outline */}
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
                                >
                                  {overlapPercent1 < 25
                                    ? formatDistance(overlapDistance)
                                    : `${overlapPercent1}%`}
                                </text>
                                {/* Cyan text on top */}
                                <text
                                  x="0"
                                  y="0"
                                  fill="#0891b2"
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
                                  <circle
                                    cx="-3"
                                    cy="0"
                                    r="4.5"
                                    fill="none"
                                    stroke="#0891b2"
                                    strokeWidth="1.5"
                                  />
                                  <circle
                                    cx="3"
                                    cy="0"
                                    r="4.5"
                                    fill="none"
                                    stroke="#0891b2"
                                    strokeWidth="1.5"
                                  />
                                  {/* Intersection highlight */}
                                  <path
                                    d="M 0,-3.3 A 4.5,4.5 0 0,0 0,3.3 A 4.5,4.5 0 0,0 0,-3.3"
                                    fill="#0891b2"
                                    fillOpacity="0.3"
                                    stroke="none"
                                  />
                                </g>

                                {/* Percentage Text */}
                                {/* Black outline */}
                                <text
                                  x={overlapPercent1 < 25 ? "20" : "10"}
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
                                >
                                  {overlapPercent1 < 25
                                    ? formatDistance(overlapDistance)
                                    : `${overlapPercent1}%`}
                                </text>
                                {/* Cyan text on top */}
                                <text
                                  x={overlapPercent1 < 25 ? "20" : "10"}
                                  y="0"
                                  fill="#0891b2"
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
                                {/* Black outline */}
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
                                >
                                  {formatDistance(displayDistanceToRing)}
                                </text>
                                {/* Cyan text on top */}
                                <text
                                  x="0"
                                  y="0"
                                  fill="#0891b2" // Cyan-600 (high visibility on white)
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
              })()}
            {/* Stone to Stone Measurements */}
            {((isHighlighted &&
              highlightedStone?.activeTypes?.includes("stone-to-stone"))) &&
              displaySettings.stoneToStone?.showLine &&
              (() => {
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
                            stroke="#65a30d" // Poison Green (Lime-600)
                            strokeWidth="1"
                            strokeDasharray="4,2"
                            opacity={opacity}
                          />
                          {displaySettings.stoneToStone?.showDistance && (
                            <g transform={`translate(${labelX}, ${labelY})`}>
                              {/* Black outline */}
                              <text
                                x="0"
                                y="4"
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill="black"
                                fillOpacity="0.3"
                                stroke="black"
                                strokeOpacity="0.3"
                                strokeWidth="3"
                                opacity={opacity}
                              >
                                {formatDistance(edgeDist)}
                              </text>
                              {/* Green text on top */}
                              <text
                                x="0"
                                y="4"
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill="#65a30d"
                                opacity={opacity}
                              >
                                {formatDistance(edgeDist)}
                              </text>
                            </g>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </svg>
                );
              })()}
            {/* Step Info Indicator - Selected Stone Mode - Top of Sheet */}
            {/* MOVED OUTSIDE OF LOOP */}
          </React.Fragment>
        );
      })}

      {/* Render Step Indicator Once if a stone is selected (not just hovered) */}
      {highlightedStone && isSelected && (
        <MeasurementStepIndicator
          highlightedStone={highlightedStone}
          settings={settings}
          scale={scale}
          sheetWidth={SHEET_WIDTH}
          nearHouseThreshold={NEAR_HOUSE_THRESHOLD}
          hogLineOffset={HOG_LINE_OFFSET}
          backLineOffset={BACK_LINE_OFFSET}
          houseRadius12={HOUSE_RADIUS_12}
          stoneRadius={STONE_RADIUS}
          stones={stones}
          onToggleMeasurementType={onToggleMeasurementType}
        />
      )}
    </>
  );
};

// --- Helper Component for Step Indicator ---

interface MeasurementStepIndicatorProps {
  highlightedStone: {
    color: "red" | "yellow";
    index: number;
    activeTypes?: MeasurementType[];
    stepIndex?: number;
  };
  settings: any; // Using any for now to match existing usage
  scale: number;
  sheetWidth: number;
  nearHouseThreshold: number;
  hogLineOffset: number;
  backLineOffset: number;
  houseRadius12: number;
  stoneRadius: number;
  stones: { red: StonePosition[]; yellow: StonePosition[] };
  onToggleMeasurementType?: (type: MeasurementType) => void;
}

const MeasurementStepIndicator: React.FC<MeasurementStepIndicatorProps> = ({
  highlightedStone,
  settings,
  scale,
  sheetWidth,
  nearHouseThreshold,
  hogLineOffset,
  backLineOffset,
  houseRadius12,
  stoneRadius,
  stones,
  onToggleMeasurementType,
}) => {
  // Determine Zone
  const stoneList = stones[highlightedStone.color];
  const stonePos = stoneList[highlightedStone.index];

  if (!stonePos) return null;

  const centerLineX = sheetWidth / 2;
  const teeLineY = VIEW_TOP_OFFSET;
  const deltaX = stonePos.x - centerLineX;
  const deltaY = stonePos.y - teeLineY;
  const distToCenterPoint = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  const hogLineY = teeLineY - hogLineOffset;

  const isTouchingHouse = distToCenterPoint <= houseRadius12 + stoneRadius;
  const isInNearHouseZone =
    !isTouchingHouse &&
    distToCenterPoint <= houseRadius12 + stoneRadius + nearHouseThreshold &&
    stonePos.y > hogLineY;
  const isInGuardZone =
    !isTouchingHouse && !isInNearHouseZone && stonePos.y > hogLineY;

  let steps: { types: MeasurementType[] }[] = [];
  if (isInGuardZone) {
    steps = settings.guardZone;
  } else if (isInNearHouseZone) {
    steps = settings.nearHouseZone;
  } else {
    steps = settings.houseZone;
  }

  if (steps.length <= 1) return null;

  const currentStepIndex = highlightedStone.stepIndex || 0;

  const currentStep = steps[currentStepIndex];

  const ALL_MEASUREMENT_TYPES: MeasurementType[] = [
    'guard', 't-line', 'center-line', 'closest-ring', 'stone-to-stone'
  ];

  // Helper to get button content for each measurement type
  const getButtonContent = (type: MeasurementType) => {
    switch (type) {
      case "guard":
        return <Shield size={20} />;
      case "t-line":
        return <span className="text-2xl font-bold">T</span>;
      case "center-line":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18" />
          </svg>
        );
      case "closest-ring":
        return <Target size={20} />;
      case "stone-to-stone":
        return <ArrowLeftRight size={20} />;
    }
  };

  // Helper to render buttons
  const renderButtons = (typesToRender: MeasurementType[], activeTypes: MeasurementType[]) => {
    return (
      <div className="flex items-center gap-2">
        {typesToRender.map((type) => {
          const isActive = activeTypes.includes(type);

          const colorMap: Record<MeasurementType, { active: string; activeHover: string; inactiveHover: string }> = {
            'guard': { active: "#a855f7", activeHover: "#9333ea", inactiveHover: "#f3e8ff" }, // Purple-500 / Purple-600 / Purple-100
            't-line': { active: "#fbbf24", activeHover: "#f59e0b", inactiveHover: "#fef3c7" }, // Amber-400 / Amber-500 / Amber-100
            'center-line': { active: "#fbbf24", activeHover: "#f59e0b", inactiveHover: "#fef3c7" }, // Amber-400 / Amber-500 / Amber-100
            'closest-ring': { active: "#06b6d4", activeHover: "#0891b2", inactiveHover: "#cffafe" }, // Cyan-500 / Cyan-600 / Cyan-100
            'stone-to-stone': { active: "#65a30d", activeHover: "#4d7c0f", inactiveHover: "#ecfccb" }, // Lime-600 / Lime-700 / Lime-100
          };

          const typeColors = colorMap[type];
          const colors = {
            bg: isActive ? typeColors.active : "#ffffff",
            hover: isActive ? typeColors.activeHover : typeColors.inactiveHover,
          };

          return (
            <button
              key={type}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMeasurementType) {
                  onToggleMeasurementType(type);
                }
              }}
              className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 text-[var(--icy-black)]"
              style={{
                backgroundColor: colors.bg,
                pointerEvents: 'auto',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.hover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.bg;
              }}
            >
              {getButtonContent(type)}
            </button>
          );
        })}
      </div>
    );
  };

  const backLineY = teeLineY + backLineOffset;

  // Calculate top position
  // If in guard zone, place it just below the tee line
  // Otherwise, place it at the top of the sheet
  const topPosition = isInGuardZone
    ? (teeLineY * scale) + 20 // 20px below the tee line
    : 10; // 10px from top of container

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: `${topPosition}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50, // Ensure it's above everything
        }}
        className="card-gradient backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 flex items-center justify-center transition-all duration-300"
      >
        {/* Current Step Buttons */}
        {renderButtons(ALL_MEASUREMENT_TYPES, highlightedStone.activeTypes || [])}
      </div>

      {/* Instructional Text - Below buttons */}
      <div
        style={{
          position: 'absolute',
          top: `${topPosition + 60}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}
        className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap"
      >
        Click stone again to cycle measurements
      </div>
    </>
  );
};

export default StoneMeasurements;
