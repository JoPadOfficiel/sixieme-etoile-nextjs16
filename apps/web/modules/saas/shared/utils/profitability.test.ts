/**
 * Profitability Calculation Tests
 * 
 * Story 26.10 - Real-time Profitability Computation
 * Epic 26 - Flexible "Yolo Mode" Billing
 * 
 * Tests for margin calculation and profitability level determination
 */

import { describe, it, expect } from "vitest";
import {
  calculateMarginPercent,
  getProfitabilityLevel,
  computeProfitability,
  formatMarginPercent,
  DEFAULT_GREEN_THRESHOLD,
  DEFAULT_ORANGE_THRESHOLD,
} from "./profitability";

describe("calculateMarginPercent", () => {
  describe("positive margin (profitable)", () => {
    it("should calculate 25% margin when selling at 100 with cost 75", () => {
      expect(calculateMarginPercent(100, 75)).toBe(25);
    });

    it("should calculate 50% margin when selling at 200 with cost 100", () => {
      expect(calculateMarginPercent(200, 100)).toBe(50);
    });

    it("should calculate 100% margin when cost is 0", () => {
      expect(calculateMarginPercent(100, 0)).toBe(100);
    });
  });

  describe("negative margin (loss)", () => {
    it("should calculate -25% margin when selling at 80 with cost 100", () => {
      expect(calculateMarginPercent(80, 100)).toBe(-25);
    });

    it("should calculate -100% margin when selling at 50 with cost 100", () => {
      expect(calculateMarginPercent(50, 100)).toBe(-100);
    });
  });

  describe("zero margin (break-even)", () => {
    it("should calculate 0% margin when selling price equals cost", () => {
      expect(calculateMarginPercent(100, 100)).toBe(0);
    });
  });

  describe("division by zero", () => {
    it("should return null when selling price is 0", () => {
      expect(calculateMarginPercent(0, 50)).toBeNull();
    });

    it("should return null when both values are 0", () => {
      expect(calculateMarginPercent(0, 0)).toBeNull();
    });
  });

  describe("decimal values", () => {
    it("should handle decimal selling price and cost", () => {
      // (150.50 - 120.40) / 150.50 * 100 ≈ 20.0%
      const margin = calculateMarginPercent(150.50, 120.40);
      expect(margin).toBeCloseTo(20.0, 1);
    });

    it("should handle small decimal values", () => {
      const margin = calculateMarginPercent(10.5, 8.4);
      expect(margin).toBeCloseTo(20.0, 1);
    });
  });
});

describe("getProfitabilityLevel", () => {
  describe("green level (profitable)", () => {
    it("should return green for margin >= 20%", () => {
      expect(getProfitabilityLevel(25, 20, 0)).toBe("green");
    });

    it("should return green for margin exactly at threshold", () => {
      expect(getProfitabilityLevel(20, 20, 0)).toBe("green");
    });

    it("should return green for very high margin", () => {
      expect(getProfitabilityLevel(80, 20, 0)).toBe("green");
    });
  });

  describe("orange level (low margin)", () => {
    it("should return orange for margin between 0% and 20%", () => {
      expect(getProfitabilityLevel(15, 20, 0)).toBe("orange");
    });

    it("should return orange for margin exactly at 0%", () => {
      expect(getProfitabilityLevel(0, 20, 0)).toBe("orange");
    });

    it("should return orange for margin just below green threshold", () => {
      expect(getProfitabilityLevel(19.9, 20, 0)).toBe("orange");
    });
  });

  describe("red level (loss)", () => {
    it("should return red for negative margin", () => {
      expect(getProfitabilityLevel(-5, 20, 0)).toBe("red");
    });

    it("should return red for margin just below 0%", () => {
      expect(getProfitabilityLevel(-0.1, 20, 0)).toBe("red");
    });

    it("should return red for very negative margin", () => {
      expect(getProfitabilityLevel(-50, 20, 0)).toBe("red");
    });
  });

  describe("null/undefined margin", () => {
    it("should return orange for null margin (unknown = warning)", () => {
      expect(getProfitabilityLevel(null, 20, 0)).toBe("orange");
    });

    it("should return orange for undefined margin", () => {
      expect(getProfitabilityLevel(undefined, 20, 0)).toBe("orange");
    });
  });

  describe("custom thresholds", () => {
    it("should respect custom green threshold", () => {
      expect(getProfitabilityLevel(25, 30, 0)).toBe("orange");
      expect(getProfitabilityLevel(30, 30, 0)).toBe("green");
    });

    it("should respect custom orange threshold", () => {
      expect(getProfitabilityLevel(-5, 20, -10)).toBe("orange");
      expect(getProfitabilityLevel(-15, 20, -10)).toBe("red");
    });
  });

  describe("default thresholds", () => {
    it("should use default thresholds when not specified", () => {
      expect(DEFAULT_GREEN_THRESHOLD).toBe(20);
      expect(DEFAULT_ORANGE_THRESHOLD).toBe(0);
      expect(getProfitabilityLevel(25)).toBe("green");
      expect(getProfitabilityLevel(10)).toBe("orange");
      expect(getProfitabilityLevel(-5)).toBe("red");
    });
  });
});

describe("computeProfitability", () => {
  it("should return both margin and level for profitable scenario", () => {
    const result = computeProfitability(100, 75);
    expect(result.marginPercent).toBe(25);
    expect(result.level).toBe("green");
  });

  it("should return both margin and level for loss scenario", () => {
    const result = computeProfitability(80, 100);
    expect(result.marginPercent).toBe(-25);
    expect(result.level).toBe("red");
  });

  it("should return null margin and orange level for division by zero", () => {
    const result = computeProfitability(0, 50);
    expect(result.marginPercent).toBeNull();
    expect(result.level).toBe("orange");
  });

  it("should respect custom thresholds", () => {
    const result = computeProfitability(100, 75, 30, 10);
    expect(result.marginPercent).toBe(25);
    expect(result.level).toBe("orange"); // 25% < 30% threshold
  });
});

describe("formatMarginPercent", () => {
  it("should format positive margin with 1 decimal", () => {
    expect(formatMarginPercent(25.5)).toBe("25.5%");
  });

  it("should format negative margin", () => {
    expect(formatMarginPercent(-10.3)).toBe("-10.3%");
  });

  it("should format zero margin", () => {
    expect(formatMarginPercent(0)).toBe("0.0%");
  });

  it("should return dash for null margin", () => {
    expect(formatMarginPercent(null)).toBe("—");
  });

  it("should return dash for undefined margin", () => {
    expect(formatMarginPercent(undefined)).toBe("—");
  });

  it("should respect custom decimal places", () => {
    expect(formatMarginPercent(25.567, 2)).toBe("25.57%");
    expect(formatMarginPercent(25.567, 0)).toBe("26%");
  });
});
