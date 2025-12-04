import { describe, it, expect } from 'vitest';
import { calculateClosestRingDistance } from './ringDistanceCalculation';
import {
  SHEET_WIDTH,
  VIEW_TOP_OFFSET,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  HOUSE_RADIUS_8,
  HOUSE_RADIUS_4,
  BUTTON_RADIUS,
} from './constants';

describe('Ring Distance Calculation', () => {
  const centerX = SHEET_WIDTH / 2;
  const teeY = VIEW_TOP_OFFSET;

  describe('Button Coverage', () => {
    it('should give 100% coverage when stone is perfectly centered on button', () => {
      const result = calculateClosestRingDistance(centerX, teeY);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
      expect(result.isOverlapping).toBe(true);
      expect(result.overlapPercentage).toBe(100);
      // Distance calculation for button special case is not the main metric
    });

    it('should give ~50% coverage when stone edge touches button edge', () => {
      // Stone center at button radius from center
      const result = calculateClosestRingDistance(centerX + BUTTON_RADIUS, teeY);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
      expect(result.isOverlapping).toBe(true);
      // At button edge, distance from center = BUTTON_RADIUS
      // Percentage = (1 - BUTTON_RADIUS / (BUTTON_RADIUS + STONE_RADIUS)) * 100
      // = (1 - 15 / (15 + 14.5)) * 100 = ~49%
      expect(result.overlapPercentage).toBeGreaterThanOrEqual(49);
      expect(result.overlapPercentage).toBeLessThanOrEqual(52);
    });

    it('should give 0% coverage when stone edge just touches button edge from outside', () => {
      // Stone center at button radius + stone radius from center
      const distFromCenter = BUTTON_RADIUS + STONE_RADIUS;
      const result = calculateClosestRingDistance(centerX + distFromCenter, teeY);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
      expect(result.overlapPercentage).toBe(0);
      expect(result.distanceToRingEdge).toBeCloseTo(0, 1);
    });

    it('should give increasing percentage as stone moves toward center', () => {
      // Test at different distances from center
      const distances = [
        BUTTON_RADIUS + STONE_RADIUS, // Just touching
        BUTTON_RADIUS + STONE_RADIUS / 2, // Halfway
        BUTTON_RADIUS, // Center on button edge
        BUTTON_RADIUS / 2, // Halfway to center
        0, // Perfect center
      ];

      const percentages = distances.map(d => {
        const result = calculateClosestRingDistance(centerX + d, teeY);
        return result.overlapPercentage;
      });

      // Each percentage should be >= the previous one (moving toward center)
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeGreaterThanOrEqual(percentages[i - 1]);
      }

      // Last one (center) should be 100%
      expect(percentages[percentages.length - 1]).toBe(100);
    });
  });

  describe('4ft Ring', () => {
    it('should identify 4ft ring as closest when stone is on it', () => {
      const result = calculateClosestRingDistance(centerX, teeY - HOUSE_RADIUS_4);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_4);
      expect(result.isOverlapping).toBe(true);
    });

    it('should give ~0 distance when stone edge exactly touches 4ft ring from outside', () => {
      const distFromCenter = HOUSE_RADIUS_4 + STONE_RADIUS;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_4);
      // At exactly touching distance, distanceToRingEdge should be ~0
      expect(Math.abs(result.distanceToRingEdge)).toBeLessThan(0.1);
    });

    it('should calculate correct overlap percentage when stone overlaps 4ft ring', () => {
      // Stone center on the ring edge
      const result = calculateClosestRingDistance(centerX, teeY - HOUSE_RADIUS_4);

      expect(result.isOverlapping).toBe(true);
      expect(result.overlapPercentage).toBeGreaterThan(0);
      expect(result.overlapPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('8ft Ring', () => {
    it('should identify 8ft ring as closest when stone is on it', () => {
      const result = calculateClosestRingDistance(centerX, teeY - HOUSE_RADIUS_8);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_8);
      expect(result.isOverlapping).toBe(true);
    });

    it('should give ~0 distance when stone edge exactly touches 8ft ring from outside', () => {
      const distFromCenter = HOUSE_RADIUS_8 + STONE_RADIUS;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_8);
      // At exactly touching distance, distanceToRingEdge should be ~0
      expect(Math.abs(result.distanceToRingEdge)).toBeLessThan(0.1);
    });
  });

  describe('12ft Ring', () => {
    it('should identify 12ft ring as closest when stone is on it', () => {
      const result = calculateClosestRingDistance(centerX, teeY - HOUSE_RADIUS_12);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      expect(result.isOverlapping).toBe(true);
    });

    it('should give ~0 distance when stone edge exactly touches 12ft ring from outside', () => {
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      // At exactly touching distance, distanceToRingEdge should be ~0
      expect(Math.abs(result.distanceToRingEdge)).toBeLessThan(0.1);
    });

    it('should calculate positive distance when stone is outside 12ft ring', () => {
      // Stone 10cm outside the ring
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS + 10;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      expect(result.distanceToRingEdge).toBeCloseTo(10, 1);
      expect(result.isOverlapping).toBe(false);
    });
  });

  describe('Closest Ring Selection', () => {
    it('should select button as closest when stone is very close to center', () => {
      const result = calculateClosestRingDistance(centerX + 5, teeY + 5);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
    });

    it('should select appropriate ring when stone is between rings', () => {
      // Halfway between button and 4ft ring
      const distFromCenter = (BUTTON_RADIUS + HOUSE_RADIUS_4) / 2;
      const result = calculateClosestRingDistance(centerX + distFromCenter, teeY);

      // Should choose the closer one
      expect([BUTTON_RADIUS, HOUSE_RADIUS_4]).toContain(result.closestRingRadius);
    });

    it('should select 12ft ring when stone is far from center', () => {
      const distFromCenter = HOUSE_RADIUS_12 + 50;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
    });
  });

  describe('Distance Calculations', () => {
    it('should calculate correct distance when stone is 30cm outside 12ft ring', () => {
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS + 30;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      // The closest ring should be 12ft, and distance should be 30cm
      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      expect(result.distanceToRingEdge).toBeCloseTo(30, 1);
      expect(result.isOverlapping).toBe(false);
    });

    it('should handle diagonal positions correctly', () => {
      // Stone at 45 degrees, 50cm from center
      const dist = 50;
      const angle = Math.PI / 4;
      const x = centerX + dist * Math.cos(angle);
      const y = teeY + dist * Math.sin(angle);

      const result = calculateClosestRingDistance(x, y);

      // Distance from center should be approximately 50cm
      expect(result.closestRingRadius).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle stone exactly at center', () => {
      const result = calculateClosestRingDistance(centerX, teeY);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
      expect(result.overlapPercentage).toBe(100);
      expect(result.isOverlapping).toBe(true);
    });

    it('should handle stone far from any ring', () => {
      const farX = centerX;
      const farY = teeY - 500; // Very far from center

      const result = calculateClosestRingDistance(farX, farY);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      expect(result.isOverlapping).toBe(false);
      expect(result.distanceToRingEdge).toBeGreaterThan(0);
    });

    it('should handle stone offset in X direction only', () => {
      const result = calculateClosestRingDistance(centerX + 30, teeY);

      expect(result.closestRingRadius).toBeGreaterThan(0);
    });

    it('should handle stone offset in Y direction only', () => {
      const result = calculateClosestRingDistance(centerX, teeY + 30);

      expect(result.closestRingRadius).toBeGreaterThan(0);
    });
  });

  describe('Realistic Game Scenarios', () => {
    it('should correctly measure a perfect draw to the button', () => {
      // Perfect center shot
      const result = calculateClosestRingDistance(centerX, teeY);

      expect(result.closestRingRadius).toBe(BUTTON_RADIUS);
      expect(result.overlapPercentage).toBe(100);
      expect(result.isOverlapping).toBe(true);
    });

    it('should correctly measure a shot on the 4ft ring', () => {
      // Stone center on 4ft ring
      const result = calculateClosestRingDistance(centerX + HOUSE_RADIUS_4, teeY);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_4);
      expect(result.isOverlapping).toBe(true);
    });

    it('should correctly measure a shot biting the 12ft', () => {
      // Stone just touching the outer ring (edge case at boundary)
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS;
      const result = calculateClosestRingDistance(centerX + distFromCenter, teeY);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      // At exactly touching distance, distanceToRingEdge should be ~0
      expect(Math.abs(result.distanceToRingEdge)).toBeLessThan(0.1);
    });

    it('should correctly measure a shot just outside the house', () => {
      // Stone 5cm outside the 12ft ring
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS + 5;
      const result = calculateClosestRingDistance(centerX, teeY - distFromCenter);

      expect(result.closestRingRadius).toBe(HOUSE_RADIUS_12);
      expect(result.distanceToRingEdge).toBeCloseTo(5, 1);
      expect(result.isOverlapping).toBe(false);
    });
  });
});
