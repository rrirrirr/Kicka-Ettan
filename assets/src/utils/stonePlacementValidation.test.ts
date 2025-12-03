import { describe, it, expect } from 'vitest';
import {
  validateStonePlacement,
  isValidStonePlacement,
  getPlacementBoundaries,
} from './stonePlacementValidation';
import {
  SHEET_WIDTH,
  STONE_RADIUS,
  HOG_LINE_OFFSET,
  BACK_LINE_OFFSET,
  VIEW_TOP_OFFSET,
} from './constants';

describe('Stone Placement Validation', () => {
  const boundaries = getPlacementBoundaries();

  describe('getPlacementBoundaries', () => {
    it('should return correct boundary values', () => {
      expect(boundaries.minX).toBe(STONE_RADIUS);
      expect(boundaries.maxX).toBe(SHEET_WIDTH - STONE_RADIUS);
      expect(boundaries.minY).toBe(VIEW_TOP_OFFSET - HOG_LINE_OFFSET + STONE_RADIUS);
      expect(boundaries.maxY).toBe(VIEW_TOP_OFFSET + BACK_LINE_OFFSET + STONE_RADIUS);
    });
  });

  describe('Hog Line Boundary Tests', () => {
    it('should reject stone placement above hog line (Y too small)', () => {
      const x = SHEET_WIDTH / 2; // Center
      const y = boundaries.minY - 1; // Just above hog line

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Stone placement violates hog line boundary (too far up)');
    });

    it('should accept stone placement exactly at hog line boundary', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.minY; // Exactly at boundary

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should clamp stone placed above hog line to minimum Y', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.minY - 50; // Way above hog line

      const result = validateStonePlacement(x, y);

      expect(result.clampedY).toBe(boundaries.minY);
      expect(result.clampedX).toBe(x); // X should remain unchanged
    });

    it('should reject stone when edge would cross hog line', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.hogLineY + STONE_RADIUS - 0.1; // Edge would cross

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Back Line Boundary Tests', () => {
    it('should reject stone placement below back line (Y too large)', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.maxY + 1; // Just below back line

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Stone placement violates back line boundary (too far down)');
    });

    it('should accept stone placement exactly at back line boundary', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.maxY; // Exactly at boundary

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should clamp stone placed below back line to maximum Y', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.maxY + 100; // Way below back line

      const result = validateStonePlacement(x, y);

      expect(result.clampedY).toBe(boundaries.maxY);
      expect(result.clampedX).toBe(x); // X should remain unchanged
    });

    it('should accept stone when edge touches back line', () => {
      const x = SHEET_WIDTH / 2;
      const y = boundaries.backLineY + STONE_RADIUS; // Edge touches back line

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Sideline Boundary Tests - Left Side', () => {
    it('should reject stone placement beyond left sideline (X too small)', () => {
      const x = boundaries.minX - 1; // Just past left sideline
      const y = VIEW_TOP_OFFSET; // Valid Y (tee line)

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Stone placement violates left sideline boundary');
    });

    it('should accept stone placement exactly at left sideline boundary', () => {
      const x = boundaries.minX; // Exactly at boundary
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should clamp stone placed beyond left sideline to minimum X', () => {
      const x = -10; // Way past left sideline
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.clampedX).toBe(boundaries.minX);
      expect(result.clampedY).toBe(y); // Y should remain unchanged
    });

    it('should reject stone when edge would cross left sideline', () => {
      const x = STONE_RADIUS - 0.1; // Edge would cross
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Sideline Boundary Tests - Right Side', () => {
    it('should reject stone placement beyond right sideline (X too large)', () => {
      const x = boundaries.maxX + 1; // Just past right sideline
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Stone placement violates right sideline boundary');
    });

    it('should accept stone placement exactly at right sideline boundary', () => {
      const x = boundaries.maxX; // Exactly at boundary
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should clamp stone placed beyond right sideline to maximum X', () => {
      const x = SHEET_WIDTH + 100; // Way past right sideline
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.clampedX).toBe(boundaries.maxX);
      expect(result.clampedY).toBe(y); // Y should remain unchanged
    });

    it('should reject stone when edge would cross right sideline', () => {
      const x = SHEET_WIDTH - STONE_RADIUS + 0.1; // Edge would cross
      const y = VIEW_TOP_OFFSET;

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Multiple Boundary Violations', () => {
    it('should detect multiple violations at once', () => {
      const x = -10; // Past left sideline
      const y = boundaries.minY - 10; // Above hog line

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations).toContain('Stone placement violates left sideline boundary');
      expect(result.violations).toContain('Stone placement violates hog line boundary (too far up)');
    });

    it('should clamp to valid range when violating multiple boundaries', () => {
      const x = SHEET_WIDTH + 50; // Past right sideline
      const y = boundaries.maxY + 50; // Below back line

      const result = validateStonePlacement(x, y);

      expect(result.clampedX).toBe(boundaries.maxX);
      expect(result.clampedY).toBe(boundaries.maxY);
    });
  });

  describe('Valid Placement Areas', () => {
    it('should accept stone at center of sheet', () => {
      const x = SHEET_WIDTH / 2;
      const y = VIEW_TOP_OFFSET; // Tee line

      const result = validateStonePlacement(x, y);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should accept stone in valid playing area', () => {
      const testPositions = [
        { x: SHEET_WIDTH / 2, y: VIEW_TOP_OFFSET }, // Center (tee line)
        { x: boundaries.minX + 10, y: boundaries.minY + 10 }, // Near hog line, left side
        { x: boundaries.maxX - 10, y: boundaries.maxY - 10 }, // Near back line, right side
        { x: SHEET_WIDTH / 4, y: (boundaries.minY + boundaries.maxY) / 2 }, // Quarter way across
      ];

      testPositions.forEach((pos) => {
        const result = validateStonePlacement(pos.x, pos.y);
        expect(result.isValid).toBe(true);
        expect(result.clampedX).toBe(pos.x);
        expect(result.clampedY).toBe(pos.y);
      });
    });
  });

  describe('isValidStonePlacement helper', () => {
    it('should return true for valid placements', () => {
      expect(isValidStonePlacement(SHEET_WIDTH / 2, VIEW_TOP_OFFSET)).toBe(true);
    });

    it('should return false for invalid placements', () => {
      expect(isValidStonePlacement(0, 0)).toBe(false);
      expect(isValidStonePlacement(SHEET_WIDTH, VIEW_TOP_OFFSET)).toBe(false);
      expect(isValidStonePlacement(SHEET_WIDTH / 2, 0)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme negative values', () => {
      const result = validateStonePlacement(-1000, -1000);

      expect(result.isValid).toBe(false);
      expect(result.clampedX).toBe(boundaries.minX);
      expect(result.clampedY).toBe(boundaries.minY);
    });

    it('should handle extreme positive values', () => {
      const result = validateStonePlacement(10000, 10000);

      expect(result.isValid).toBe(false);
      expect(result.clampedX).toBe(boundaries.maxX);
      expect(result.clampedY).toBe(boundaries.maxY);
    });

    it('should handle zero values', () => {
      const result = validateStonePlacement(0, 0);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });
});
