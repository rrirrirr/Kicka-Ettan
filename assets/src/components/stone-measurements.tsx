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
} from "../utils/constants";

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
  } | null;
  showMeasurements?: boolean;
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

interface MeasurementValues {
  tLine?: {
    dist: number;
    isAbove: boolean;
    isOverlapping: boolean;
    offsetFromCenter: number; // Distance from stone center to t-line (signed)
    lineStart: { x: number; y: number };
    lineEnd: { x: number; y: number };
  };
  centerLine?: {
    dist: number;
    isLeft: boolean;
    isOverlapping: boolean;
    offsetFromCenter: number; // Distance from stone center to center line (signed)
    lineStart: { x: number; y: number };
    lineEnd: { x: number; y: number };
  };
  guard?: {
    distToHog: number;
    distToHouse: number;
    isCloserToHog: boolean;
    percentage: number;
    braceDist: number;
    // Geometry
    top20Line?: {
      start: { x: number; y: number };
      end: { x: number; y: number };
    };
    brace?: {
      x: number;
      startY: number;
      endY: number;
      width: number;
      pointRight: boolean;
      stoneEdgeX: number;
      refLineY: number; // Y position of the reference line (Hog or House)
      verticalExtX: number; // X position for the vertical extension line
    };
    hogLineY: number;
    topOfHouseY: number;
  };
  closestRing?: {
    dist: number;
    radius: number;
    isOverlapping: boolean;
    overlapPercent: number;
    overlapPercent1: number; // Percentage through stone
    overlapPercent2: number; // Percentage remaining
    overlapDistance: number; // Actual overlap distance in cm
    lineStart: { x: number; y: number };
    lineEnd: { x: number; y: number };
  };
  stoneToStone?: {
    closestStoneIndex: number;
    closestStoneColor: "red" | "yellow";
    dist: number; // Edge to edge distance in cm
    centerDist: number; // Center to center distance in cm
    lineStart: { x: number; y: number };
    lineEnd: { x: number; y: number };
  }[];
  isInGuardZone: boolean;
  isInNearHouseZone: boolean;
  isTop20Percent: boolean;
}

interface LabelBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stoneX: number;
  stoneY: number;
  measurements: MeasurementValues;
  stoneColor: "red" | "yellow";
  stoneIndex: number;
}

const LABEL_ITEM_HEIGHT = 24; // Increased from 20
const LABEL_PADDING_X = 16; // Increased from 10
const LABEL_PADDING_Y = 12; // Increased from 8
const LABEL_ICON_WIDTH = 20;
const MAX_DIST_FROM_STONE = 100;

// Estimate text width for label sizing (rough approximation: 7px per char for 12px font)
const estimateTextWidth = (text: string, fontSize: number = 12): number => {
  return text.length * (fontSize * 0.58);
};

const calculateMeasurements = (
  stone: StonePosition,
  scale: number,
  centerLineX: number,
  teeLineY: number,
  topOfHouseY: number,
  hogLineY: number,
  allStones: Array<{ pos: StonePosition; color: "red" | "yellow"; index: number }> = [],
  currentStoneIndex: number = -1,
  currentStoneColor: "red" | "yellow" = "red"
): MeasurementValues => {
  const stonePixelX = stone.x * scale;
  const stonePixelY = stone.y * scale;

  // Stone to Stone Measurements
  const stoneToStoneMeasurements: MeasurementValues["stoneToStone"] = [];
  const MAX_STONE_DIST_CM = 15; // 15cm threshold

  if (currentStoneIndex !== -1) {
    allStones.forEach((otherStone) => {
      if (otherStone.color === currentStoneColor && otherStone.index === currentStoneIndex) return;

      const dx = otherStone.pos.x - stone.x;
      const dy = otherStone.pos.y - stone.y;
      const centerDist = Math.sqrt(dx * dx + dy * dy);
      const edgeDist = Math.max(0, centerDist - (STONE_RADIUS * 2));

      if (edgeDist <= MAX_STONE_DIST_CM) {
        // Calculate line points (edge to edge)
        const angle = Math.atan2(dy, dx);
        const startX = stone.x + Math.cos(angle) * STONE_RADIUS;
        const startY = stone.y + Math.sin(angle) * STONE_RADIUS;
        const endX = otherStone.pos.x - Math.cos(angle) * STONE_RADIUS;
        const endY = otherStone.pos.y - Math.sin(angle) * STONE_RADIUS;

        stoneToStoneMeasurements.push({
          closestStoneIndex: otherStone.index,
          closestStoneColor: otherStone.color,
          dist: edgeDist,
          centerDist: centerDist,
          lineStart: { x: startX * scale, y: startY * scale },
          lineEnd: { x: endX * scale, y: endY * scale }
        });
      }
    });
  }

  // T-Line
  const deltaY = stone.y - teeLineY;
  const rawDistTee = Math.abs(deltaY) - STONE_RADIUS;
  const distTee = rawDistTee; // Allow negative numbers
  const isAboveTee = stone.y < teeLineY;
  const isTLineOverlapping = Math.abs(deltaY) < STONE_RADIUS;
  const offsetFromTLine = deltaY; // Signed distance from stone center to t-line

  const tLineStartY = isAboveTee
    ? stonePixelY + STONE_RADIUS * scale + 2
    : stonePixelY - STONE_RADIUS * scale - 2;
  const tLineEndY = teeLineY * scale;

  // Center Line
  const deltaX = stone.x - centerLineX;
  const rawDistCenter = Math.abs(deltaX) - STONE_RADIUS;
  const distCenter = rawDistCenter; // Allow negative numbers
  const isLeftOfCenter = stone.x < centerLineX;
  const isCenterLineOverlapping = Math.abs(deltaX) < STONE_RADIUS;
  const offsetFromCenter = deltaX; // Signed distance from stone center to center line

  const cLineStartX = isLeftOfCenter
    ? stonePixelX + STONE_RADIUS * scale + 2
    : stonePixelX - STONE_RADIUS * scale - 2;
  const cLineEndX = centerLineX * scale;

  // Zone Classification using radial distance from house center
  const nearHouseThreshold = NEAR_HOUSE_THRESHOLD; // Use shared constant

  // Calculate distance from stone center to house center
  const distToCenter = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

  // Determine zone based on radial distance
  const isTouchingHouse = distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS;
  const isInNearHouseZone =
    !isTouchingHouse &&
    distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS + nearHouseThreshold &&
    stone.y > hogLineY;
  const isInGuardZone =
    !isTouchingHouse && !isInNearHouseZone && stone.y > hogLineY;

  let guard: MeasurementValues["guard"];
  let isTop20Percent = false;

  if (isInGuardZone) {
    const totalZoneDist = topOfHouseY - hogLineY;
    const distFromHog = stone.y - hogLineY;
    const percentageFromHog = distFromHog / totalZoneDist;
    isTop20Percent = percentageFromHog < 0.2;

    const distToHog = Math.abs(stonePixelY - hogLineY * scale);
    const distToHouse = Math.abs(topOfHouseY * scale - stonePixelY);
    const isCloserToHog = distToHog < distToHouse;

    // Calculate percentage
    let percentage;
    let braceDistanceCm;
    if (isCloserToHog) {
      percentage = Math.round((distFromHog / totalZoneDist) * 100);
      braceDistanceCm = distFromHog;
    } else {
      const distFromHouse = topOfHouseY - stone.y;
      percentage = Math.round((distFromHouse / totalZoneDist) * 100);
      braceDistanceCm = distFromHouse;
    }

    let top20Line;
    let brace;

    if (isTop20Percent) {
      top20Line = {
        start: { x: stonePixelX, y: stonePixelY - STONE_RADIUS * scale - 2 },
        end: { x: stonePixelX, y: hogLineY * scale },
      };
    } else {
      // Brace Geometry
      const braceWidth = 20;
      const braceXOffset = 40;
      const xPercent = (stone.x / SHEET_WIDTH) * 100;

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

      let braceStartY, braceEndY;
      if (isCloserToHog) {
        braceStartY = hogLineY * scale;
        braceEndY = stonePixelY;
      } else {
        braceStartY = stonePixelY;
        braceEndY = topOfHouseY * scale;
      }

      brace = {
        x: braceX,
        startY: braceStartY,
        endY: braceEndY,
        width: pointRight ? -braceWidth : braceWidth,
        pointRight,
        stoneEdgeX: placeBraceOnRight
          ? stonePixelX + STONE_RADIUS * scale + 2
          : stonePixelX - STONE_RADIUS * scale - 2,
        refLineY: isCloserToHog ? hogLineY * scale : topOfHouseY * scale,
        verticalExtX: placeBraceOnRight
          ? stonePixelX + STONE_RADIUS * scale + 2
          : stonePixelX - STONE_RADIUS * scale - 2,
      };
    }

    guard = {
      distToHog,
      distToHouse,
      isCloserToHog,
      percentage,
      braceDist: braceDistanceCm,
      top20Line,
      brace,
      hogLineY: hogLineY * scale,
      topOfHouseY: topOfHouseY * scale,
    };
  }

  // Closest Ring
  let closestRing: MeasurementValues["closestRing"];
  if (!isInGuardZone) {
    const distToCenterPoint = Math.sqrt(
      Math.pow(deltaX, 2) + Math.pow(deltaY, 2),
    );
    const ringRadii = [
      HOUSE_RADIUS_12,
      HOUSE_RADIUS_8,
      HOUSE_RADIUS_4,
      BUTTON_RADIUS,
    ];
    let minDistToRingEdge = Infinity;
    let closestRingRadius = 0;

    for (const r of ringRadii) {
      const dist = Math.abs(distToCenterPoint - r) - STONE_RADIUS;
      if (Math.abs(dist) < Math.abs(minDistToRingEdge)) {
        minDistToRingEdge = dist;
        closestRingRadius = r;
      }
    }

    const isOverlapping = minDistToRingEdge <= 0;
    const overlapDistance = Math.abs(minDistToRingEdge);
    const maxOverlap = STONE_RADIUS;
    const overlapPercent = Math.min(
      100,
      Math.round((overlapDistance / maxOverlap) * 100),
    );
    // Calculate split percentages for overlap display
    const overlapPercent1 = Math.round((overlapDistance / (STONE_RADIUS * 2)) * 100);
    const overlapPercent2 = 100 - overlapPercent1;

    // Geometry
    let ux = 0;
    let uy = 0;
    if (distToCenterPoint > 0.1) {
      ux = deltaX / distToCenterPoint;
      uy = deltaY / distToCenterPoint;
    } else {
      ux = 1;
      uy = 0;
    }

    const isStoneOutsideRing = distToCenterPoint > closestRingRadius;
    const stoneEdgeX = isStoneOutsideRing
      ? stone.x - ux * STONE_RADIUS
      : stone.x + ux * STONE_RADIUS;
    const stoneEdgeY = isStoneOutsideRing
      ? stone.y - uy * STONE_RADIUS
      : stone.y + uy * STONE_RADIUS;

    const ringEdgeX = centerLineX + ux * closestRingRadius;
    const ringEdgeY = teeLineY + uy * closestRingRadius;

    const stoneEdgePixelX =
      stoneEdgeX * scale + (isStoneOutsideRing ? -ux * 2 : ux * 2);
    const stoneEdgePixelY =
      stoneEdgeY * scale + (isStoneOutsideRing ? -uy * 2 : uy * 2);
    const ringEdgePixelX = ringEdgeX * scale;
    const ringEdgePixelY = ringEdgeY * scale;

    closestRing = {
      dist: Math.max(0, minDistToRingEdge),
      radius: closestRingRadius,
      isOverlapping,
      overlapPercent,
      overlapPercent1,
      overlapPercent2,
      overlapDistance,
      lineStart: { x: stoneEdgePixelX, y: stoneEdgePixelY },
      lineEnd: { x: ringEdgePixelX, y: ringEdgePixelY },
    };
  }

  return {
    tLine: {
      dist: distTee,
      isAbove: isAboveTee,
      isOverlapping: isTLineOverlapping,
      offsetFromCenter: offsetFromTLine,
      lineStart: { x: stonePixelX, y: tLineStartY },
      lineEnd: { x: stonePixelX, y: tLineEndY },
    },
    centerLine: {
      dist: distCenter,
      isLeft: isLeftOfCenter,
      isOverlapping: isCenterLineOverlapping,
      offsetFromCenter: offsetFromCenter,
      lineStart: { x: cLineStartX, y: stonePixelY },
      lineEnd: { x: cLineEndX, y: stonePixelY },
    },
    guard,
    closestRing,
    stoneToStone: stoneToStoneMeasurements,
    isInGuardZone,
    isInNearHouseZone,
    isTop20Percent,
  };
};

const solveLabelCollisions = (
  labels: LabelBox[],
  stones: { x: number; y: number }[],
  sheetWidth: number,
  scale: number,
  maxY: number,
) => {
  const iterations = 10;
  const stoneRadiusPx = STONE_RADIUS * scale;

  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < labels.length; j++) {
      const labelA = labels[j];

      // Attraction to stone (keep it close)
      const dx = labelA.stoneX - labelA.x;
      const dy = labelA.stoneY - labelA.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MAX_DIST_FROM_STONE) {
        const angle = Math.atan2(dy, dx);
        labelA.x = labelA.stoneX - Math.cos(angle) * MAX_DIST_FROM_STONE;
        labelA.y = labelA.stoneY - Math.sin(angle) * MAX_DIST_FROM_STONE;
      } else if (dist > 50) {
        // Gentle pull towards stone if getting far
        labelA.x += dx * 0.05;
        labelA.y += dy * 0.05;
      }

      // Repulsion from other labels
      for (let k = 0; k < labels.length; k++) {
        if (j === k) continue;
        const labelB = labels[k];

        const overlapX =
          Math.min(labelA.x + labelA.width / 2, labelB.x + labelB.width / 2) -
          Math.max(labelA.x - labelA.width / 2, labelB.x - labelB.width / 2);
        const overlapY =
          Math.min(labelA.y + labelA.height / 2, labelB.y + labelB.height / 2) -
          Math.max(labelA.y - labelA.height / 2, labelB.y - labelB.height / 2);

        if (overlapX > -10 && overlapY > -10) {
          // Add some padding
          // Push apart
          const diffX = labelA.x - labelB.x;
          const diffY = labelA.y - labelB.y;
          const len = Math.sqrt(diffX * diffX + diffY * diffY) || 1;

          const pushX = (diffX / len) * 5;
          const pushY = (diffY / len) * 5;

          labelA.x += pushX;
          labelA.y += pushY;
        }
      }

      // Repulsion from ALL stones (prevent overlap)
      for (const stone of stones) {
        // Simple circle-rectangle collision check/response
        // Find closest point on rectangle to circle center
        const closestX = Math.max(
          labelA.x - labelA.width / 2,
          Math.min(stone.x, labelA.x + labelA.width / 2),
        );
        const closestY = Math.max(
          labelA.y - labelA.height / 2,
          Math.min(stone.y, labelA.y + labelA.height / 2),
        );

        const distX = stone.x - closestX;
        const distY = stone.y - closestY;
        const distanceSquared = distX * distX + distY * distY;
        const minDistance = stoneRadiusPx + 10; // Stone radius + padding

        if (distanceSquared < minDistance * minDistance) {
          // Collision detected
          const distance = Math.sqrt(distanceSquared) || 1;
          const overlap = minDistance - distance;

          // Push label away from stone center
          // Vector from stone to closest point on label
          let pushX = closestX - stone.x;
          let pushY = closestY - stone.y;

          // If center is inside, push out based on center diff
          if (distance < 0.1) {
            pushX = labelA.x - stone.x;
            pushY = labelA.y - stone.y;
            if (Math.abs(pushX) < 0.1 && Math.abs(pushY) < 0.1) {
              pushX = 1; // Arbitrary push if exactly centered
              pushY = 0;
            }
          }

          const pushLen = Math.sqrt(pushX * pushX + pushY * pushY) || 1;

          // Strong push to clear the stone
          labelA.x += (pushX / pushLen) * overlap * 1.2;
          labelA.y += (pushY / pushLen) * overlap * 1.2;
        }
      }

      // Clamp to screen edges
      const minX = labelA.width / 2 + 10;
      const maxX = sheetWidth - labelA.width / 2 - 10;
      labelA.x = Math.max(minX, Math.min(maxX, labelA.x));

      // Clamp Y to avoid backline (stone bar area)
      // Ensure bottom of label is above maxY
      const labelBottom = labelA.y + labelA.height / 2;
      if (labelBottom > maxY) {
        labelA.y = maxY - labelA.height / 2;
      }
    }
  }
};

const getWavyPath = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 5) return `M ${x1} ${y1} L ${x2} ${y2} `;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  // Perpendicular vector
  const normalX = -dy / dist;
  const normalY = dx / dist;

  const amp = 10; // Amplitude of the wave

  // Control point for first half
  const cp1x = x1 + dx * 0.25 + normalX * amp;
  const cp1y = y1 + dy * 0.25 + normalY * amp;

  return `M ${x1} ${y1} Q ${cp1x} ${cp1y} ${midX} ${midY} T ${x2} ${y2} `;
};

const StoneMeasurements: React.FC<StoneMeasurementsProps> = ({
  stones,
  scale,
  highlightedStone,
  showMeasurements = true,
}) => {
  const { displaySettings, toggleModeSettings, unitSystem, smartUnits } =
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

  // --- New Toggle Mode Logic ---
  const isToggleMode = !highlightedStone && showMeasurements;

  if (isToggleMode) {
    const topOfHouseY = teeLineY - HOUSE_RADIUS_12;
    const hogLineY = teeLineY - HOG_LINE_OFFSET;

    // 1. Calculate measurements for all stones
    const labels: LabelBox[] = allStones.map((stone) => {
      const measurements = calculateMeasurements(
        stone.pos,
        scale,
        centerLineX,
        teeLineY,
        topOfHouseY,
        hogLineY,
        allStones,
        stone.index,
        stone.color
      );

      // Calculate which items will be displayed to determine width
      const items = [];
      if (measurements.isInGuardZone) {
        if (toggleModeSettings.guardZone.showGuard && measurements.guard) {
          items.push(
            `${measurements.guard.percentage}% (${formatDistance(measurements.guard.braceDist - STONE_RADIUS)})`,
          );
        }
        if (toggleModeSettings.guardZone.showTLine && measurements.tLine) {
          items.push(
            measurements.tLine.isOverlapping
              ? `tline:${formatDistance(Math.abs(measurements.tLine.offsetFromCenter))}`
              : `${formatDistance(measurements.tLine.dist)} ${measurements.tLine.isAbove ? "↓" : "↑"}`
          );
        }
        if (
          toggleModeSettings.guardZone.showCenterLine &&
          measurements.centerLine
        ) {
          items.push(
            measurements.centerLine.isOverlapping
              ? `centerline:${formatDistance(Math.abs(measurements.centerLine.offsetFromCenter))}`
              : `│ ${formatDistance(measurements.centerLine.dist)}`
          );
        }
      } else if (measurements.isInNearHouseZone) {
        if (
          toggleModeSettings.nearHouseZone.showClosestRing &&
          measurements.closestRing
        ) {
          items.push(
            measurements.closestRing.isOverlapping
              ? (measurements.closestRing.overlapPercent1 < 25
                ? `overlap-dist:${formatDistance(measurements.closestRing.overlapDistance)}`
                : `overlap:${measurements.closestRing.overlapPercent1}`)
              : formatDistance(measurements.closestRing.dist),
          );
        }
        if (toggleModeSettings.nearHouseZone.showTLine && measurements.tLine) {
          items.push(
            measurements.tLine.isOverlapping
              ? `tline:${formatDistance(Math.abs(measurements.tLine.offsetFromCenter))}`
              : `${formatDistance(measurements.tLine.dist)} ${measurements.tLine.isAbove ? "↓" : "↑"}`
          );
        }
        if (
          toggleModeSettings.nearHouseZone.showCenterLine &&
          measurements.centerLine
        ) {
          items.push(
            measurements.centerLine.isOverlapping
              ? `centerline:${formatDistance(Math.abs(measurements.centerLine.offsetFromCenter))}`
              : `│ ${formatDistance(measurements.centerLine.dist)}`
          );
        }
      } else {
        if (
          toggleModeSettings.houseZone.showClosestRing &&
          measurements.closestRing
        ) {
          items.push(
            measurements.closestRing.isOverlapping
              ? (measurements.closestRing.overlapPercent1 < 25
                ? `overlap-dist:${formatDistance(measurements.closestRing.overlapDistance)}`
                : `overlap:${measurements.closestRing.overlapPercent1}`)
              : formatDistance(measurements.closestRing.dist),
          );
        }
        if (toggleModeSettings.houseZone.showTLine && measurements.tLine) {
          items.push(
            measurements.tLine.isOverlapping
              ? `tline:${formatDistance(Math.abs(measurements.tLine.offsetFromCenter))}`
              : `${formatDistance(measurements.tLine.dist)} ${measurements.tLine.isAbove ? "↓" : "↑"}`
          );
        }
        if (
          toggleModeSettings.houseZone.showCenterLine &&
          measurements.centerLine
        ) {
          items.push(
            measurements.centerLine.isOverlapping
              ? `centerline:${formatDistance(Math.abs(measurements.centerLine.offsetFromCenter))}`
              : `│ ${formatDistance(measurements.centerLine.dist)}`
          );
        }
      }

      // Calculate width based on longest text
      let maxTextWidth = 0;
      for (const itemText of items) {
        const textWidth = estimateTextWidth(itemText, 12);
        maxTextWidth = Math.max(maxTextWidth, textWidth);
      }
      // Width = left padding + icon width + right padding + text width + right padding
      const width = Math.max(
        80,
        LABEL_PADDING_X + LABEL_ICON_WIDTH + maxTextWidth + LABEL_PADDING_X,
      );

      const height = items.length * LABEL_ITEM_HEIGHT + LABEL_PADDING_Y * 2;

      // Positioning Logic
      const isLeftOfCenter = stone.pos.x < centerLineX;
      const isBelowTeeLine = stone.pos.y > teeLineY;

      const xOffset = isLeftOfCenter ? -70 : 70;
      const yOffset = isBelowTeeLine ? 90 : -90;

      let initialX = stone.pos.x * scale + xOffset;
      let initialY = stone.pos.y * scale + yOffset;

      // Clamp to screen edges
      const minX = width / 2 + 10;
      const maxX = SHEET_WIDTH * scale - width / 2 - 10;
      initialX = Math.max(minX, Math.min(maxX, initialX));

      return {
        id: `${stone.color}-${stone.index}`,
        x: initialX,
        y: initialY,
        width: width,
        height: height,
        stoneX: stone.pos.x * scale,
        stoneY: stone.pos.y * scale,
        measurements,
        stoneColor: stone.color,
        stoneIndex: stone.index,
      };
    });

    // 2. Resolve Collisions
    const allStonePositions = allStones.map((s) => ({
      x: s.pos.x * scale,
      y: s.pos.y * scale,
    }));
    const backLineY = (teeLineY + HOUSE_RADIUS_12) * scale;
    // Allow labels to go slightly past backline but not too far (e.g. 20px padding)
    const maxLabelY = backLineY - 20;
    solveLabelCollisions(
      labels,
      allStonePositions,
      SHEET_WIDTH * scale,
      scale,
      maxLabelY,
    );

    // 3. Render Grouped Labels
    return (
      <svg
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "visible",
          zIndex: 10,
        }}
      >
        {/* Pass 1: Render all lines (Measurement lines and Leader lines) */}
        {labels.map((label) => {
          const { measurements } = label;
          const showTLine = measurements.isInGuardZone
            ? toggleModeSettings.guardZone.showTLine
            : toggleModeSettings.houseZone.showTLine;
          const showCenterLine = measurements.isInGuardZone
            ? toggleModeSettings.guardZone.showCenterLine
            : toggleModeSettings.houseZone.showCenterLine;
          const showGuard =
            measurements.isInGuardZone &&
            toggleModeSettings.guardZone.showGuard;
          const showClosestRing =
            !measurements.isInGuardZone &&
            toggleModeSettings.houseZone.showClosestRing;

          return (
            <React.Fragment key={`lines-${label.id}`}>
              {/* Measurement Lines */}
              {showTLine &&
                measurements.tLine &&
                displaySettings.tLine.showLine &&
                !measurements.tLine.isOverlapping && (
                  <line
                    x1={measurements.tLine.lineStart.x}
                    y1={measurements.tLine.lineStart.y}
                    x2={measurements.tLine.lineEnd.x}
                    y2={measurements.tLine.lineEnd.y}
                    stroke="#be185d"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.7"
                  />
                )}

              {/* Stone to Stone Lines */}
              {measurements.stoneToStone && displaySettings.stoneToStone?.showLine &&
                measurements.stoneToStone.map((sts, idx) => {
                  const dx = sts.lineEnd.x - sts.lineStart.x;
                  const dy = sts.lineEnd.y - sts.lineStart.y;
                  const len = Math.sqrt(dx * dx + dy * dy) || 1;
                  const ux = dx / len;
                  const uy = dy / len;
                  // Perpendicular offset (25px)
                  const offsetX = -uy * 25;
                  const offsetY = ux * 25;
                  const midX = (sts.lineStart.x + sts.lineEnd.x) / 2;
                  const midY = (sts.lineStart.y + sts.lineEnd.y) / 2;

                  return (
                    <React.Fragment key={`sts-line-${label.id}-${idx}`}>
                      <line
                        x1={sts.lineStart.x}
                        y1={sts.lineStart.y}
                        x2={sts.lineEnd.x}
                        y2={sts.lineEnd.y}
                        stroke="#65a30d" // Poison Green (Lime-600)
                        strokeWidth="2"
                        strokeDasharray="4,2"
                      />
                      {displaySettings.stoneToStone?.showDistance && (
                        <g transform={`translate(${midX + offsetX}, ${midY + offsetY})`}>
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill="#65a30d"
                          >
                            {formatDistance(sts.dist)}
                          </text>
                        </g>
                      )}
                    </React.Fragment>
                  )
                })}

              {/* Progress Bar Overlay on Stone for T-Line (when overlapping) - Toggle Mode */}
              {showTLine &&
                measurements.tLine &&
                measurements.tLine.isOverlapping && (() => {
                  const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                  const barHeight = 8;
                  const offsetDistance = Math.abs(measurements.tLine.offsetFromCenter);
                  const fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2); // Half bar represents radius

                  return (
                    <g
                      key={`tline-bar-${label.id}`}
                      transform={`translate(${label.stoneX}, ${label.stoneY}) rotate(90)`}
                      opacity="0.9"
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
                        x={measurements.tLine.isAbove ? 0 : -fillWidth}
                        y={-barHeight / 2}
                        width={fillWidth}
                        height={barHeight}
                        fill="#db2777"
                        fillOpacity="0.9"
                      />
                    </g>
                  );
                })()}
              {showCenterLine &&
                measurements.centerLine &&
                displaySettings.centerLine.showLine &&
                !measurements.centerLine.isOverlapping && (
                  <line
                    x1={measurements.centerLine.lineStart.x}
                    y1={measurements.centerLine.lineStart.y}
                    x2={measurements.centerLine.lineEnd.x}
                    y2={measurements.centerLine.lineEnd.y}
                    stroke="#be185d"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.7"
                  />
                )}
              {/* Progress Bar Overlay on Stone for Center Line (when overlapping) - Toggle Mode */}
              {showCenterLine &&
                measurements.centerLine &&
                measurements.centerLine.isOverlapping && (() => {
                  const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                  const barHeight = 8;
                  const offsetDistance = Math.abs(measurements.centerLine.offsetFromCenter);
                  const fillWidth = (offsetDistance / STONE_RADIUS) * (barLength / 2); // Half bar represents radius

                  return (
                    <g
                      key={`centerline-bar-${label.id}`}
                      transform={`translate(${label.stoneX}, ${label.stoneY})`}
                      opacity="0.9"
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
                        x={measurements.centerLine.isLeft ? 0 : -fillWidth}
                        y={-barHeight / 2}
                        width={fillWidth}
                        height={barHeight}
                        fill="#db2777"
                        fillOpacity="0.9"
                      />
                    </g>
                  );
                })()}
              {showClosestRing &&
                measurements.closestRing &&
                displaySettings.closestRing?.showLine &&
                !measurements.closestRing.isOverlapping && (
                  <line
                    x1={measurements.closestRing.lineStart.x}
                    y1={measurements.closestRing.lineStart.y}
                    x2={measurements.closestRing.lineEnd.x}
                    y2={measurements.closestRing.lineEnd.y}
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeDasharray="1,4"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                )}
              {/* Progress Bar Overlay on Stone (when overlapping) - Toggle Mode */}
              {showClosestRing &&
                measurements.closestRing &&
                measurements.closestRing.isOverlapping && (() => {
                  const barLength = STONE_RADIUS * 2 * scale; // Stone diameter in pixels
                  const barHeight = 8;
                  const fillWidth = (barLength * measurements.closestRing.overlapPercent1) / 100;

                  // Calculate angle from house center to stone
                  const deltaX = label.stoneX / scale - centerLineX;
                  const deltaY = label.stoneY / scale - teeLineY;
                  const distToCenterPoint = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                  const angleRad = Math.atan2(deltaY, deltaX);
                  const angleDeg = (angleRad * 180) / Math.PI;

                  // Determine which side the ring enters from
                  const isStoneOutsideRing = distToCenterPoint > measurements.closestRing.radius;

                  return (
                    <g
                      key={`overlap-bar-${label.id}`}
                      transform={`translate(${label.stoneX}, ${label.stoneY}) rotate(${angleDeg})`}
                      opacity="0.9"
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
              {showGuard && measurements.guard && (
                <>
                  {measurements.isTop20Percent &&
                    measurements.guard.top20Line && (
                      <line
                        x1={measurements.guard.top20Line.start.x}
                        y1={measurements.guard.top20Line.start.y}
                        x2={measurements.guard.top20Line.end.x}
                        y2={measurements.guard.top20Line.end.y}
                        stroke="#9333ea"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.7"
                      />
                    )}
                  {!measurements.isTop20Percent &&
                    measurements.guard.brace &&
                    displaySettings.guard.showBraceLine && (
                      <>
                        {/* Hog Line Reference */}
                        <line
                          x1={0}
                          y1={measurements.guard.hogLineY}
                          x2={SHEET_WIDTH * scale}
                          y2={measurements.guard.hogLineY}
                          stroke="#9333ea"
                          strokeWidth="1"
                          opacity="0.7"
                        />
                        {/* Top of House Reference */}
                        <line
                          x1={0}
                          y1={measurements.guard.topOfHouseY}
                          x2={SHEET_WIDTH * scale}
                          y2={measurements.guard.topOfHouseY}
                          stroke="#9333ea"
                          strokeWidth="1"
                          opacity="0.7"
                        />

                        {/* Brace */}
                        <path
                          d={getBracePath(
                            measurements.guard.brace.x,
                            measurements.guard.brace.startY,
                            measurements.guard.brace.x,
                            measurements.guard.brace.endY,
                            measurements.guard.brace.width,
                            0.6,
                          )}
                          stroke="#9333ea"
                          strokeWidth="2"
                          fill="none"
                          opacity="0.7"
                        />
                        {/* Connector to stone */}
                        <line
                          x1={measurements.guard.brace.x}
                          y1={label.stoneY}
                          x2={measurements.guard.brace.stoneEdgeX}
                          y2={label.stoneY}
                          stroke="#9333ea"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.7"
                        />
                        {/* Connector to reference line */}
                        <line
                          x1={measurements.guard.brace.x}
                          y1={measurements.guard.brace.refLineY}
                          x2={measurements.guard.brace.stoneEdgeX}
                          y2={measurements.guard.brace.refLineY}
                          stroke="#9333ea"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.7"
                        />
                        {/* Vertical extension line */}
                        <line
                          x1={measurements.guard.brace.verticalExtX}
                          y1={measurements.guard.topOfHouseY}
                          x2={measurements.guard.brace.verticalExtX}
                          y2={measurements.guard.hogLineY}
                          stroke="#9333ea"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                          opacity="0.35"
                        />
                      </>
                    )}
                </>
              )}

              {/* Leader Line if far */}
              <path
                d={getWavyPath(
                  label.stoneX,
                  label.stoneY,
                  label.x,
                  label.y + label.height / 2,
                )}
                stroke="#1a1a1a"
                strokeOpacity="0.6"
                strokeWidth="1.5"
                fill="none"
              />
            </React.Fragment>
          );
        })}

        {/* Pass 2: Render all Label Boxes (on top of lines) */}
        {labels.map((label) => {
          const { measurements } = label;
          const showTLine = measurements.isInGuardZone
            ? toggleModeSettings.guardZone.showTLine
            : toggleModeSettings.houseZone.showTLine;
          const showCenterLine = measurements.isInGuardZone
            ? toggleModeSettings.guardZone.showCenterLine
            : toggleModeSettings.houseZone.showCenterLine;
          const showGuard =
            measurements.isInGuardZone &&
            toggleModeSettings.guardZone.showGuard;
          const showClosestRing =
            !measurements.isInGuardZone &&
            toggleModeSettings.houseZone.showClosestRing;

          // Filter active items to render
          const items = [];
          if (showGuard && measurements.guard) {
            items.push({
              label: `${measurements.guard.percentage}% (${formatDistance(measurements.guard.braceDist - STONE_RADIUS)})`,
              icon: "{",
              color: "text-purple-500", // Purple
              iconType: "text",
            });
          }
          if (showClosestRing && measurements.closestRing) {
            items.push({
              label: measurements.closestRing.isOverlapping
                ? (measurements.closestRing.overlapPercent1 < 25
                  ? `overlap-dist:${formatDistance(measurements.closestRing.overlapDistance)}`
                  : `overlap:${measurements.closestRing.overlapPercent1}`)
                : formatDistance(measurements.closestRing.dist),
              icon: measurements.closestRing.isOverlapping ? "overlap" : "dots",
              color: "text-cyan-500", // Cyan
              iconType: "svg",
              strokeColor: "#06b6d4",
              isOverlap: measurements.closestRing.isOverlapping,
            });
          }
          if (showTLine && measurements.tLine) {
            items.push({
              label: `${formatDistance(measurements.tLine.dist)} ${measurements.tLine.isAbove ? "↓" : "↑"}`,
              icon: "T",
              color: "text-pink-500", // Pink
              iconType: "text",
            });
          }
          if (showCenterLine && measurements.centerLine) {
            items.push({
              label: formatDistance(measurements.centerLine.dist),
              icon: "│",
              color: "text-pink-500", // Pink
              iconType: "text",
            });
          }

          if (items.length === 0) return null;

          return (
            <foreignObject
              key={`box-${label.id}`}
              x={label.x - label.width / 2}
              y={label.y - label.height / 2}
              width={label.width}
              height={label.height}
              style={{ overflow: "visible" }}
            >
              <div
                className="flex flex-col justify-center w-full h-full bg-gray-900/60 border border-white/10 rounded-md shadow-lg backdrop-blur-md"
                style={{ padding: `${LABEL_PADDING_Y}px 0` }}
              >
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center w-full px-2"
                    style={{ height: LABEL_ITEM_HEIGHT }}
                  >
                    {/* Icon Container */}
                    <div className="w-5 flex items-center justify-center mr-1 shrink-0">
                      {item.iconType === "text" ? (
                        <span className={`text-xs font-bold ${item.color}`}>
                          {item.icon}
                        </span>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="-5 -5 10 10"
                          className="overflow-visible"
                        >
                          {item.icon === "overlap" ? (
                            <g>
                              <circle
                                cx="-2.5"
                                cy="0"
                                r="4"
                                fill="none"
                                stroke={item.strokeColor}
                                strokeWidth="1.2"
                              />
                              <circle
                                cx="2.5"
                                cy="0"
                                r="4"
                                fill="none"
                                stroke={item.strokeColor}
                                strokeWidth="1.2"
                              />
                              <path
                                d="M 0,-2.8 A 4,4 0 0,0 0,2.8 A 4,4 0 0,0 0,-2.8"
                                fill={item.strokeColor}
                                fillOpacity="0.3"
                                stroke="none"
                              />
                            </g>
                          ) : (
                            <g>
                              <circle
                                cx="-4"
                                cy="0"
                                r="1.5"
                                fill={item.strokeColor}
                              />
                              <circle
                                cx="0"
                                cy="0"
                                r="1.5"
                                fill={item.strokeColor}
                              />
                              <circle
                                cx="4"
                                cy="0"
                                r="1.5"
                                fill={item.strokeColor}
                              />
                            </g>
                          )}
                        </svg>
                      )}
                    </div>

                    {/* Label Text */}
                    {(() => {
                      const isOverlapBar = item.label.startsWith('overlap:');
                      const isOverlapDistBar = item.label.startsWith('overlap-dist:');
                      const isCenterLineBar = item.label.startsWith('centerline:');
                      const isTLineBar = item.label.startsWith('tline:');
                      if (isOverlapBar) {
                        const percent = parseInt(item.label.split(':')[1]);
                        return (
                          <span className={`text-xs font-medium ${item.color}`}>
                            {percent}%
                          </span>
                        );
                      }
                      if (isOverlapDistBar) {
                        const distance = item.label.split(':')[1];
                        return (
                          <span className={`text-xs font-medium ${item.color}`}>
                            {distance}
                          </span>
                        );
                      }
                      if (isCenterLineBar) {
                        const distance = item.label.split(':')[1];
                        return (
                          <span className={`text-xs font-medium ${item.color}`}>
                            {distance}
                          </span>
                        );
                      }
                      if (isTLineBar) {
                        const distance = item.label.split(':')[1];
                        return (
                          <span className={`text-xs font-medium ${item.color}`}>
                            {distance}
                          </span>
                        );
                      }
                      return (
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${item.color}`}
                        >
                          {item.label}
                        </span>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </foreignObject>
          );
        })}
      </svg>
    );
  }

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
        const strokeWidth = isHighlighted ? "4" : "2";

        // Opacity logic:
        // - If measurements are toggled off: only show highlighted stone (1.0), hide all others (0)
        // - If measurements are toggled on: show highlighted at 1.0, dim others when one is selected (0.3), or show all normal (0.7)
        let opacity: string;
        if (!showMeasurements) {
          opacity = isHighlighted ? "1.0" : "0";
        } else {
          // If a stone is highlighted, show it fully and hide others (0).
          // If no stone is highlighted, show all with default opacity (0.7).
          opacity = isHighlighted ? "1.0" : hasHighlightedStone ? "0" : "0.7";
        }

        const fontSize = isHighlighted ? "16" : "12";
        const fontWeight = isHighlighted ? "900" : "bold";
        const strokeColor = isHighlighted ? "#9f1239" : "#be185d"; // Pink-800 : Pink-700
        const textColor = isHighlighted ? "#831843" : "#9f1239"; // Pink-900 : Pink-800
        const highVisibilityTextColor = isHighlighted ? "#be185d" : "#db2777"; // Pink-700 : Pink-600 (high visibility on white)

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
                        stroke={highVisibilityTextColor}
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
                          fill="#db2777"
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
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity={opacity}
                            style={{ transition: "all 0.2s ease" }}
                          />

                          {/* Distance Label (cm) */}
                          <text
                            x={labelX}
                            y={labelY}
                            fill="#7e22ce"
                            fontSize={isHighlighted ? "12" : "10"}
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
                              strokeWidth="2"
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
                            strokeWidth="2"
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
                            strokeWidth="2"
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
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            opacity={parseFloat(opacity) * 0.5} // Slightly more transparent
                            style={{ transition: "all 0.2s ease" }}
                          />

                          {/* Brace Label - Percentage */}
                          {displaySettings.guard.showPercentage && (
                            <text
                              x={labelX}
                              y={
                                midY +
                                verticalAdjustment -
                                (isHighlighted ? 8 : 6)
                              }
                              fill="#7e22ce" // Purple-700
                              fontSize={fontSize}
                              fontWeight={fontWeight}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              opacity={opacity}
                              style={{ transition: "all 0.2s ease" }}
                            >
                              {percentage}%
                            </text>
                          )}

                          {/* Brace Label - Distance in cm */}
                          {displaySettings.guard.showDistance && (
                            <>
                              <text
                                x={labelX}
                                y={
                                  midY +
                                  verticalAdjustment +
                                  (isHighlighted ? 8 : 6)
                                }
                                fill="#7e22ce" // Purple-700
                                fontSize={isHighlighted ? "12" : "10"}
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
                          <text
                            x={extLabelX}
                            y={extMidY}
                            fill="#7e22ce" // Purple-700
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
                          stroke={highVisibilityTextColor}
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
                            fill="#db2777"
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
                          strokeWidth="3"
                          strokeDasharray="1,4"
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
              highlightedStone?.activeTypes?.includes("stone-to-stone")) ||
              (!isHighlighted && displaySettings.stoneToStone?.showLine)) &&
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

                      const lDx = lineEndX - lineStartX;
                      const lDy = lineEndY - lineStartY;
                      const len = Math.sqrt(lDx * lDx + lDy * lDy) || 1;
                      const ux = lDx / len;
                      const uy = lDy / len;
                      // Perpendicular offset (25px)
                      const offsetX = -uy * 25;
                      const offsetY = ux * 25;
                      const midX = (lineStartX + lineEndX) / 2;
                      const midY = (lineStartY + lineEndY) / 2;

                      return (
                        <React.Fragment key={`sts-${stone.color}-${stone.index}-${otherStone.color}-${otherStone.index}`}>
                          <line
                            x1={lineStartX}
                            y1={lineStartY}
                            x2={lineEndX}
                            y2={lineEndY}
                            stroke="#65a30d" // Poison Green (Lime-600)
                            strokeWidth="2"
                            strokeDasharray="4,2"
                            opacity={opacity}
                          />
                          {displaySettings.stoneToStone?.showDistance && (
                            <g transform={`translate(${midX + offsetX}, ${midY + offsetY})`}>
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
          </React.Fragment>
        );
      })}
    </>
  );
};

export default StoneMeasurements;
