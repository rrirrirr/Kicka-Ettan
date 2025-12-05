import React, { useEffect } from 'react';
import { useSettings, MeasurementType } from '../contexts/SettingsContext';
import { StonePosition } from '../types/game-types';
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  BUTTON_RADIUS,
  HOUSE_RADIUS_8,
  HOUSE_RADIUS_4,
  VIEW_TOP_OFFSET,
  HOG_LINE_OFFSET,
  NEAR_HOUSE_THRESHOLD,
} from '../utils/constants';
import { classifyStoneZone } from '../utils/stoneZoneClassification';
import { MeasurementStepIndicator } from './measurements/MeasurementStepIndicator';
import { TLineMeasurement } from './measurements/TLineMeasurement';
import { CenterLineMeasurement } from './measurements/CenterLineMeasurement';
import { GuardMeasurement } from './measurements/GuardMeasurement';
import { RingMeasurement } from './measurements/RingMeasurement';
import { StoneToStoneMeasurement } from './measurements/StoneToStoneMeasurement';

interface StoneMeasurementsProps {
  stones: { red: StonePosition[]; yellow: StonePosition[] };
  scale: number;
  highlightedStone: {
    color: "red" | "yellow";
    index: number;
    activeTypes?: MeasurementType[];
    stepIndex: number;
  } | null;
  onHighlightStone: (stone: {
    color: "red" | "yellow";
    index: number;
    activeTypes?: MeasurementType[];
    stepIndex: number;
  } | null) => void;
  onToggleMeasurementType?: (type: MeasurementType) => void;
}

export const StoneMeasurements: React.FC<StoneMeasurementsProps> = ({
  stones,
  scale,
  highlightedStone,
  onHighlightStone,
  onToggleMeasurementType,
}) => {
  const {
    settings,
    displaySettings,
    toggleModeSettings,
    baseUnitSystem,
    unitSystem,
    smartUnits
  } = useSettings();

  // Helper to format distance based on settings
  const formatDistance = (cm: number): string => {
    // Check for Smart Units first
    if (unitSystem === 'smart') {
      // Find the first matching rule
      const rule = smartUnits.find(r => cm <= r.maxDistance);
      if (rule) {
        switch (rule.unit) {
          case 'metric':
            return `${Math.round(cm)}cm`;
          case 'imperial':
            const inches = cm / 2.54;
            const feet = Math.floor(inches / 12);
            const remainingInches = Math.round(inches % 12);
            return feet > 0 ? `${feet}'${remainingInches}"` : `${remainingInches}"`;
          case 'stone':
            const stones = cm / (STONE_RADIUS * 2);
            return `${stones.toFixed(1)} stones`;
          case 'broom':
            const brooms = cm / 120; // Assuming 1.2m broom
            return `${brooms.toFixed(1)} brooms`;
        }
      }
    }

    // Fallback to base unit system
    if (baseUnitSystem === 'imperial') {
      const inches = cm / 2.54;
      const feet = Math.floor(inches / 12);
      const remainingInches = Math.round(inches % 12);
      return feet > 0 ? `${feet}'${remainingInches}"` : `${remainingInches}"`;
    }
    return `${Math.round(cm)}cm`;
  };

  // Combine all stones into a single array for rendering
  const allStones = [
    ...stones.red.map((pos, index) => ({ pos, color: "red", index })),
    ...stones.yellow.map((pos, index) => ({ pos, color: "yellow", index })),
  ];

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = () => {
      // If clicking on a stone (which stops propagation), this won't fire
      // If clicking on the background, this will fire
      if (highlightedStone) {
        onHighlightStone(null);
      }
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [highlightedStone, onHighlightStone]);

  const centerLineX = SHEET_WIDTH / 2;
  const teeLineY = VIEW_TOP_OFFSET;
  const hogLineY = teeLineY - HOG_LINE_OFFSET;
  const topOfHouseY = teeLineY - HOUSE_RADIUS_12;

  // Render measurements for each stone
  return (
    <>
      {allStones.map((stone) => {
        const isHighlighted =
          highlightedStone?.color === stone.color &&
          highlightedStone?.index === stone.index;

        // Use highlighted style if this stone is selected OR if we are in toggle mode (no stone selected)
        // Actually, toggle mode style might be different (less intrusive).
        // But for text visibility, we want high contrast.
        const isSelected = !!highlightedStone;
        const useHighlightedStyle = isHighlighted;

        // Determine opacity based on selection state
        // If a stone is selected:
        // - Selected stone: 1.0
        // - Other stones: 0.1 (dimmed)
        // If no stone selected (Toggle Mode):
        // - All stones: 1.0
        const opacity = isSelected ? (isHighlighted ? "1" : "0.1") : "1";

        // Skip rendering measurements for non-highlighted stones if a stone IS highlighted
        if (isSelected && !isHighlighted) return null;

        const stonePixelX = stone.pos.x * scale;
        const stonePixelY = stone.pos.y * scale;
        const centerLinePixelX = centerLineX * scale;
        const teeLinePixelY = teeLineY * scale;

        // Calculate distances and positions
        const deltaX = stone.pos.x - centerLineX;
        const deltaY = stone.pos.y - teeLineY;
        const distToCenterPoint = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Zone Classification using utility
        const { zone, isTouchingHouse } = classifyStoneZone(stone.pos.x, stone.pos.y);
        const isInGuardZone = zone === 'guard';
        const isInNearHouseZone = zone === 'near-house';

        // Determine which toggle settings to use
        let toggleSettingsForZone;
        if (isInGuardZone) {
          toggleSettingsForZone = toggleModeSettings.guardZone;
        } else if (isInNearHouseZone) {
          toggleSettingsForZone = toggleModeSettings.nearHouseZone;
        } else {
          toggleSettingsForZone = toggleModeSettings.houseZone;
        }

        const shouldShowGuardInToggle = 'showGuard' in toggleSettingsForZone ? (toggleSettingsForZone as any).showGuard : false;
        const shouldShowTLineInToggle = toggleSettingsForZone.showTLine;
        const shouldShowCenterLineInToggle = toggleSettingsForZone.showCenterLine;
        const shouldShowClosestRingInToggle = 'showClosestRing' in toggleSettingsForZone ? (toggleSettingsForZone as any).showClosestRing : true;

        // Closest Ring Logic
        const rings = [BUTTON_RADIUS, HOUSE_RADIUS_4, HOUSE_RADIUS_8, HOUSE_RADIUS_12];
        let closestRingRadius = HOUSE_RADIUS_12;
        let minDistToRingEdge = Infinity;

        // Find closest ring edge
        for (const radius of rings) {
          // Distance to the ring's edge
          // If inside the ring: radius - distToCenterPoint - STONE_RADIUS
          // If outside: distToCenterPoint - radius - STONE_RADIUS
          // We want the distance from the stone's edge to the ring's edge
          const dist = Math.abs(distToCenterPoint - radius) - STONE_RADIUS;

          if (Math.abs(dist) < Math.abs(minDistToRingEdge)) {
            minDistToRingEdge = dist;
            closestRingRadius = radius;
          }
        }

        // Calculate ring edge point for line drawing
        const angle = Math.atan2(deltaY, deltaX);
        const ringEdgeX = centerLineX + Math.cos(angle) * closestRingRadius;
        const ringEdgeY = teeLineY + Math.sin(angle) * closestRingRadius;
        const ringEdgePixelX = ringEdgeX * scale;
        const ringEdgePixelY = ringEdgeY * scale;

        const stoneEdgePixelX = (stone.pos.x - Math.cos(angle) * STONE_RADIUS) * scale;
        const stoneEdgePixelY = (stone.pos.y - Math.sin(angle) * STONE_RADIUS) * scale;


        // Display values
        const displayDistanceToTee = Math.abs(deltaY) - STONE_RADIUS;
        const displayDistanceToCenter = Math.abs(deltaX) - STONE_RADIUS;
        const displayDistanceToRing = Math.abs(minDistToRingEdge);

        // Text styling
        const fontSize = useHighlightedStyle ? "12" : "10";
        const fontWeight = useHighlightedStyle ? "bold" : "normal";
        const highVisibilityTextColor = "var(--color-amber-400)"; // Amber-400

        // T-Line specific
        const isAboveTee = deltaY < 0;
        const teeLineLabelHorizontalOffset = 45;
        const verticalLineStartY = isAboveTee
          ? stonePixelY + STONE_RADIUS * scale
          : stonePixelY - STONE_RADIUS * scale;

        // Center Line specific
        const isLeftOfCenter = deltaX < 0;
        const horizontalLabelOffset = 25;
        const horizontalLineStartX = isLeftOfCenter
          ? stonePixelX + STONE_RADIUS * scale
          : stonePixelX - STONE_RADIUS * scale;

        // Guard specific
        const xPercent = (stone.pos.x / SHEET_WIDTH) * 100;

        // Text Y Offset for Ring Measurement
        const textYOffset = -15;

        return (
          <React.Fragment key={`${stone.color}-${stone.index}`}>
            <GuardMeasurement
              stone={stone}
              scale={scale}
              displaySettings={displaySettings}
              opacity={opacity}
              formatDistance={formatDistance}
              isHighlighted={isHighlighted}
              highlightedStone={highlightedStone}
              shouldShowInToggle={shouldShowGuardInToggle}
              fontSize={fontSize}
              fontWeight={fontWeight}
              stonePixelX={stonePixelX}
              stonePixelY={stonePixelY}
              hogLineY={hogLineY}
              topOfHouseY={topOfHouseY}
              isInGuardZone={isInGuardZone}
              xPercent={xPercent}
              isLeftOfCenter={isLeftOfCenter}
              useHighlightedStyle={useHighlightedStyle}
            />

            <TLineMeasurement
              scale={scale}
              displaySettings={displaySettings}
              opacity={opacity}
              formatDistance={formatDistance}
              isHighlighted={isHighlighted}
              highlightedStone={highlightedStone}
              shouldShowInToggle={shouldShowTLineInToggle}
              isTouchingHouse={isTouchingHouse}
              fontSize={fontSize}
              fontWeight={fontWeight}
              highVisibilityTextColor={highVisibilityTextColor}
              stonePixelX={stonePixelX}
              stonePixelY={stonePixelY}
              teeLinePixelY={teeLinePixelY}
              verticalLineStartY={verticalLineStartY}
              deltaY={deltaY}
              isAboveTee={isAboveTee}
              displayDistanceToTee={displayDistanceToTee}
              teeLineLabelHorizontalOffset={teeLineLabelHorizontalOffset}
              strokeWidth="1"
            />

            <CenterLineMeasurement
              stone={stone}
              scale={scale}
              displaySettings={displaySettings}
              opacity={opacity}
              formatDistance={formatDistance}
              isHighlighted={isHighlighted}
              highlightedStone={highlightedStone}
              shouldShowInToggle={shouldShowCenterLineInToggle}
              isTouchingHouse={isTouchingHouse}
              fontSize={fontSize}
              fontWeight={fontWeight}
              highVisibilityTextColor={highVisibilityTextColor}
              stonePixelX={stonePixelX}
              stonePixelY={stonePixelY}
              centerLinePixelX={centerLinePixelX}
              horizontalLineStartX={horizontalLineStartX}
              deltaX={deltaX}
              isLeftOfCenter={isLeftOfCenter}
              displayDistanceToCenter={displayDistanceToCenter}
              horizontalLabelOffset={horizontalLabelOffset}
              strokeWidth="1"
              isInGuardZone={isInGuardZone}
              shouldShowGuardInToggle={shouldShowGuardInToggle}
              topOfHouseY={topOfHouseY}
              hogLineY={hogLineY}
              xPercent={xPercent}
            />

            <RingMeasurement
              scale={scale}
              displaySettings={displaySettings}
              opacity={opacity}
              formatDistance={formatDistance}
              isHighlighted={isHighlighted}
              highlightedStone={highlightedStone}
              shouldShowInToggle={shouldShowClosestRingInToggle}
              fontSize={fontSize}
              fontWeight={fontWeight}
              stonePixelX={stonePixelX}
              stonePixelY={stonePixelY}
              minDistToRingEdge={minDistToRingEdge}
              closestRingRadius={closestRingRadius}
              distToCenterPoint={distToCenterPoint}
              stoneEdgePixelX={stoneEdgePixelX}
              stoneEdgePixelY={stoneEdgePixelY}
              ringEdgePixelX={ringEdgePixelX}
              ringEdgePixelY={ringEdgePixelY}
              textYOffset={textYOffset}
              displayDistanceToRing={displayDistanceToRing}
            />

            <StoneToStoneMeasurement
              stone={stone}
              scale={scale}
              displaySettings={displaySettings}
              opacity={opacity}
              formatDistance={formatDistance}
              isHighlighted={isHighlighted}
              highlightedStone={highlightedStone}
              allStones={allStones}
            />
          </React.Fragment>
        );
      })}

      {/* Render Step Indicator Once if a stone is selected (not just hovered) */}
      {highlightedStone && (
        <MeasurementStepIndicator
          highlightedStone={highlightedStone}
          settings={settings}
          scale={scale}
          sheetWidth={SHEET_WIDTH}
          nearHouseThreshold={NEAR_HOUSE_THRESHOLD}
          hogLineOffset={HOG_LINE_OFFSET}
          houseRadius12={HOUSE_RADIUS_12}
          stoneRadius={STONE_RADIUS}
          stones={stones}
          onToggleMeasurementType={onToggleMeasurementType}
        />
      )}
    </>
  );
};
