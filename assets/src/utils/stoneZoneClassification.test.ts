import { describe, it, expect } from 'vitest';
import {
  classifyStoneZone,
  getStoneZone,
  calculateDistanceToCenter,
  calculateDistanceToHouse,
  isTouchingHouse,
} from './stoneZoneClassification';
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  HOUSE_RADIUS_12,
  VIEW_TOP_OFFSET,
} from './constants';

describe('Stone Zone Classification', () => {
  const centerX = SHEET_WIDTH / 2;
  const teeY = VIEW_TOP_OFFSET;

  describe('calculateDistanceToCenter', () => {
    it('should return 0 for stone at exact center', () => {
      const distance = calculateDistanceToCenter(centerX, teeY);
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for stone offset from center', () => {
      // Stone 100cm to the right
      const distance = calculateDistanceToCenter(centerX + 100, teeY);
      expect(distance).toBe(100);
    });

    it('should calculate correct distance using Pythagorean theorem', () => {
      // 3-4-5 triangle
      const distance = calculateDistanceToCenter(centerX + 3, teeY + 4);
      expect(distance).toBe(5);
    });

    it('should handle negative offsets', () => {
      const distance = calculateDistanceToCenter(centerX - 100, teeY - 100);
      expect(distance).toBeCloseTo(Math.sqrt(20000), 1);
    });
  });

  describe('calculateDistanceToHouse', () => {
    it('should return 0 when stone edge exactly touches house', () => {
      // Stone center at house radius + stone radius from center
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS);

      const distance = calculateDistanceToHouse(x, y);
      expect(distance).toBeCloseTo(0, 5);
    });

    it('should return negative value when stone is inside house', () => {
      // Stone at exact center (inside house)
      const distance = calculateDistanceToHouse(centerX, teeY);
      expect(distance).toBeLessThan(0);
      expect(distance).toBeCloseTo(-(HOUSE_RADIUS_12 + STONE_RADIUS), 5);
    });

    it('should return positive value when stone is outside house', () => {
      // Stone 50cm beyond house edge
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS + 50;
      const x = centerX;
      const y = teeY - distFromCenter;

      const distance = calculateDistanceToHouse(x, y);
      expect(distance).toBeCloseTo(50, 5);
    });
  });

  describe('isTouchingHouse', () => {
    it('should return true when stone edge touches house', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS);

      expect(isTouchingHouse(x, y)).toBe(true);
    });

    it('should return true when stone is inside house', () => {
      expect(isTouchingHouse(centerX, teeY)).toBe(true);
    });

    it('should return true when stone slightly overlaps house', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS - 1);

      expect(isTouchingHouse(x, y)).toBe(true);
    });

    it('should return false when stone is just outside house', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 1);

      expect(isTouchingHouse(x, y)).toBe(false);
    });

    it('should return false when stone is far from house', () => {
      const x = centerX;
      const y = teeY - 500; // Far away

      expect(isTouchingHouse(x, y)).toBe(false);
    });
  });

  describe('House Zone Classification', () => {
    it('should classify stone at center as house zone', () => {
      const result = classifyStoneZone(centerX, teeY);

      expect(result.zone).toBe('house');
      expect(result.isTouchingHouse).toBe(true);
    });

    it('should classify stone on button as house zone', () => {
      // Stone on the button (very center)
      const result = classifyStoneZone(centerX, teeY);

      expect(result.zone).toBe('house');
      expect(result.distanceToCenter).toBe(0);
    });

    it('should classify stone touching 12ft ring as house zone', () => {
      // Stone edge exactly touching outer ring
      const x = centerX + (HOUSE_RADIUS_12 + STONE_RADIUS);
      const y = teeY;

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
      expect(result.isTouchingHouse).toBe(true);
      expect(result.distanceToHouse).toBeCloseTo(0, 5);
    });

    it('should classify stone on 4ft ring as house zone', () => {
      const x = centerX;
      const y = teeY - 61; // 4ft ring

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
      expect(result.isTouchingHouse).toBe(true);
    });

    it('should classify stone on 8ft ring as house zone', () => {
      const x = centerX;
      const y = teeY - 122; // 8ft ring

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
      expect(result.isTouchingHouse).toBe(true);
    });

    it('should classify stone just inside house edge as house zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS - 5); // 5cm inside

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
    });
  });

  describe('Near House Zone Classification', () => {
    it('should classify stone 1cm outside house as near-house zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 1);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('near-house');
      expect(result.isTouchingHouse).toBe(false);
      expect(result.distanceToHouse).toBeCloseTo(1, 5);
    });

    it('should classify stone 30cm outside house as near-house zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 30);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('near-house');
      expect(result.distanceToHouse).toBeCloseTo(30, 5);
    });

    it('should classify stone at exactly 1.5m (150cm) outside house as near-house zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 150);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('near-house');
      expect(result.distanceToHouse).toBeCloseTo(150, 5);
    });

    it('should classify stone just under 1.5m outside house as near-house zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 140);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('near-house');
    });

    it('should classify near-house stone offset to the side', () => {
      // 30cm from house edge, but offset 45 degrees
      const distFromCenter = HOUSE_RADIUS_12 + STONE_RADIUS + 30;
      const angle = Math.PI / 4; // 45 degrees
      const x = centerX + distFromCenter * Math.cos(angle);
      const y = teeY - distFromCenter * Math.sin(angle);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('near-house');
      expect(result.distanceToHouse).toBeCloseTo(30, 1);
    });
  });

  describe('Guard Zone Classification', () => {
    it('should classify stone just over 1.5m outside house as guard zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 151);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
      expect(result.isTouchingHouse).toBe(false);
    });

    it('should classify stone 2m outside house as guard zone', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 200);

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
      expect(result.distanceToHouse).toBeGreaterThan(150);
    });

    it('should classify stone at top of house (hog line area) as guard zone', () => {
      const x = centerX;
      const y = teeY - 500; // Near hog line

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
    });

    it('should classify guard stone offset to the side', () => {
      // Far from house, on the side
      const x = centerX + 100;
      const y = teeY - 400;

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
    });
  });

  describe('Zone Boundaries', () => {
    it('should have house-to-near-house boundary at house edge', () => {
      // Just touching house
      const xTouch = centerX;
      const yTouch = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS);

      // Just not touching house
      const xNotTouch = centerX;
      const yNotTouch = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 0.1);

      expect(getStoneZone(xTouch, yTouch)).toBe('house');
      expect(getStoneZone(xNotTouch, yNotTouch)).toBe('near-house');
    });

    it('should have near-house-to-guard boundary at 150cm from house', () => {
      // Just inside near-house boundary
      const xInside = centerX;
      const yInside = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 150);

      // Just outside near-house boundary
      const xOutside = centerX;
      const yOutside = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 150.1);

      expect(getStoneZone(xInside, yInside)).toBe('near-house');
      expect(getStoneZone(xOutside, yOutside)).toBe('guard');
    });
  });

  describe('getStoneZone helper', () => {
    it('should return zone string for house', () => {
      expect(getStoneZone(centerX, teeY)).toBe('house');
    });

    it('should return zone string for near-house', () => {
      const x = centerX;
      const y = teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 30);
      expect(getStoneZone(x, y)).toBe('near-house');
    });

    it('should return zone string for guard', () => {
      const x = centerX;
      const y = teeY - 500;
      expect(getStoneZone(x, y)).toBe('guard');
    });
  });

  describe('Realistic Game Scenarios', () => {
    it('should correctly classify a stone in the button', () => {
      // Perfect center shot
      const result = classifyStoneZone(centerX, teeY);

      expect(result.zone).toBe('house');
      expect(result.distanceToCenter).toBe(0);
    });

    it('should correctly classify a stone biting the 12ft', () => {
      // "Biter" - stone just touching outer ring
      const x = centerX + HOUSE_RADIUS_12 + STONE_RADIUS;
      const y = teeY;

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
      expect(result.distanceToHouse).toBeCloseTo(0, 1);
    });

    it('should correctly classify a corner guard', () => {
      // Guard stone well in front of house
      const x = centerX + 100; // Offset to side
      const y = teeY - 400; // In front of house

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
    });

    it('should correctly classify a stone around back', () => {
      // Stone behind the tee line but still in house
      const x = centerX;
      const y = teeY + 100; // Behind tee line

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('house');
    });

    it('should correctly classify multiple stones at different positions', () => {
      const positions = [
        { x: centerX, y: teeY, expectedZone: 'house' }, // Button
        { x: centerX + 50, y: teeY - 50, expectedZone: 'house' }, // In house
        { x: centerX, y: teeY - (HOUSE_RADIUS_12 + STONE_RADIUS + 20), expectedZone: 'near-house' }, // Near house
        { x: centerX, y: teeY - 500, expectedZone: 'guard' }, // Guard
      ];

      positions.forEach((pos) => {
        const result = classifyStoneZone(pos.x, pos.y);
        expect(result.zone).toBe(pos.expectedZone);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle stone at extreme X position', () => {
      const x = STONE_RADIUS; // Far left
      const y = teeY;

      const result = classifyStoneZone(x, y);

      // Stone at edge of sheet, on tee line - will be near-house or guard depending on distance
      const distToCenter = calculateDistanceToCenter(x, y);
      if (distToCenter <= HOUSE_RADIUS_12 + STONE_RADIUS + 150) {
        expect(result.zone).toBe('near-house');
      } else {
        expect(result.zone).toBe('guard');
      }
    });

    it('should handle stone at extreme Y position above', () => {
      const x = centerX;
      const y = 0; // Top of view

      const result = classifyStoneZone(x, y);

      expect(result.zone).toBe('guard');
    });

    it('should return consistent results for same position', () => {
      const x = centerX + 50;
      const y = teeY - 100;

      const result1 = classifyStoneZone(x, y);
      const result2 = classifyStoneZone(x, y);

      expect(result1.zone).toBe(result2.zone);
      expect(result1.distanceToCenter).toBe(result2.distanceToCenter);
    });
  });
});
