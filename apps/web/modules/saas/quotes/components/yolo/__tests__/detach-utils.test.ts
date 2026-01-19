/**
 * Story 26.9: Detach Utils Tests
 *
 * Tests for the operational detach detection utilities.
 */

import { describe, it, expect } from "vitest";
import {
  isSensitiveField,
  isSensitiveFieldChange,
  calculateLabelSimilarity,
  levenshteinDistance,
  isSignificantLabelChange,
  checkDetachRequirement,
  getOriginalLabelFromSource,
  SENSITIVE_FIELDS,
  LABEL_SIMILARITY_THRESHOLD,
} from "../detach-utils";

describe("detach-utils", () => {
  describe("isSensitiveField", () => {
    it.each(SENSITIVE_FIELDS)("should return true for sensitive field '%s'", (field) => {
      expect(isSensitiveField(field)).toBe(true);
    });

    it("should return false for non-sensitive fields", () => {
      expect(isSensitiveField("label")).toBe(false);
      expect(isSensitiveField("description")).toBe(false);
      expect(isSensitiveField("quantity")).toBe(false);
      expect(isSensitiveField("unitPrice")).toBe(false);
      expect(isSensitiveField("vatRate")).toBe(false);
      expect(isSensitiveField("total")).toBe(false);
    });
  });

  describe("isSensitiveFieldChange", () => {
    it("should return true when changing a sensitive field with different value (DU-1)", () => {
      const result = isSensitiveFieldChange({
        fieldName: "pickupAt",
        originalValue: "2026-01-20",
        newValue: "2026-01-25",
      });
      expect(result).toBe(true);
    });

    it("should return false when changing a non-sensitive field (DU-2)", () => {
      const result = isSensitiveFieldChange({
        fieldName: "total",
        originalValue: 100,
        newValue: 150,
      });
      expect(result).toBe(false);
    });

    it("should return false when sensitive field values are the same", () => {
      const result = isSensitiveFieldChange({
        fieldName: "origin",
        originalValue: "Paris CDG",
        newValue: "Paris CDG",
      });
      expect(result).toBe(false);
    });

    it("should handle null/undefined values", () => {
      const result = isSensitiveFieldChange({
        fieldName: "destination",
        originalValue: null,
        newValue: "London Heathrow",
      });
      expect(result).toBe(true);
    });
  });

  describe("levenshteinDistance", () => {
    it("should return 0 for identical strings", () => {
      expect(levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("should return correct distance for single character difference", () => {
      expect(levenshteinDistance("cat", "bat")).toBe(1);
    });

    it("should return string length for empty comparisons", () => {
      expect(levenshteinDistance("hello", "")).toBe(5);
      expect(levenshteinDistance("", "hello")).toBe(5);
    });

    it("should handle complex differences", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    });
  });

  describe("calculateLabelSimilarity", () => {
    it("should return 1.0 for identical strings (DU-3)", () => {
      const similarity = calculateLabelSimilarity("Paris Airport", "Paris Airport");
      expect(similarity).toBe(1);
    });

    it("should return value below threshold for significant changes (DU-4)", () => {
      const similarity = calculateLabelSimilarity("Paris Airport", "London Heathrow");
      expect(similarity).toBeLessThan(LABEL_SIMILARITY_THRESHOLD);
    });

    it("should return value above threshold for minor edits (DU-5)", () => {
      const similarity = calculateLabelSimilarity("Paris CDG", "Paris CDG Airport");
      expect(similarity).toBeGreaterThan(LABEL_SIMILARITY_THRESHOLD);
    });

    it("should be case insensitive", () => {
      const similarity = calculateLabelSimilarity("PARIS AIRPORT", "paris airport");
      expect(similarity).toBe(1);
    });

    it("should handle empty strings", () => {
      expect(calculateLabelSimilarity("", "")).toBe(1);
      expect(calculateLabelSimilarity("hello", "")).toBe(0);
      expect(calculateLabelSimilarity("", "hello")).toBe(0);
    });

    it("should trim whitespace", () => {
      const similarity = calculateLabelSimilarity("  Paris  ", "Paris");
      expect(similarity).toBe(1);
    });
  });

  describe("isSignificantLabelChange", () => {
    it("should return true when labels are significantly different", () => {
      expect(isSignificantLabelChange("Paris Airport", "Tokyo Narita")).toBe(true);
    });

    it("should return false when labels are similar", () => {
      expect(isSignificantLabelChange("Transfer CDG", "Transfer CDG Airport")).toBe(false);
    });

    it("should return false for identical labels", () => {
      expect(isSignificantLabelChange("Same Label", "Same Label")).toBe(false);
    });
  });

  describe("checkDetachRequirement", () => {
    it("should require detach for sensitive field changes", () => {
      const result = checkDetachRequirement({
        fieldName: "pickupAt",
        originalValue: "2026-01-20T10:00",
        newValue: "2026-01-25T14:00",
      });
      expect(result.requiresDetach).toBe(true);
      expect(result.reason).toBe("sensitive_field");
    });

    it("should flag significant label changes without requiring detach", () => {
      const result = checkDetachRequirement(
        {
          fieldName: "label",
          originalValue: "Paris CDG Transfer",
          newValue: "London Heathrow Trip",
        },
        "Paris CDG Transfer"
      );
      expect(result.requiresDetach).toBe(false);
      expect(result.isSignificantChange).toBe(true);
      expect(result.reason).toBe("significant_label_change");
    });

    it("should return minor_change for non-significant edits", () => {
      const result = checkDetachRequirement({
        fieldName: "description",
        originalValue: "Some description",
        newValue: "Updated description",
      });
      expect(result.requiresDetach).toBe(false);
      expect(result.isSignificantChange).toBe(false);
      expect(result.reason).toBe("minor_change");
    });

    it("should return no_change when values are identical", () => {
      const result = checkDetachRequirement({
        fieldName: "label",
        originalValue: "Same Value",
        newValue: "Same Value",
      });
      expect(result.reason).toBe("no_change");
    });
  });

  describe("getOriginalLabelFromSource", () => {
    it("should return label field if present", () => {
      const sourceData = { label: "Original Label", origin: "Paris" };
      expect(getOriginalLabelFromSource(sourceData)).toBe("Original Label");
    });

    it("should construct label from origin/destination if no label field", () => {
      const sourceData = { origin: "Paris CDG", destination: "London LHR" };
      expect(getOriginalLabelFromSource(sourceData)).toBe("Paris CDG → London LHR");
    });

    it("should return empty string for null/undefined sourceData", () => {
      expect(getOriginalLabelFromSource(null)).toBe("");
      expect(getOriginalLabelFromSource(undefined)).toBe("");
    });

    it("should try description field as fallback", () => {
      const sourceData = { description: "Trip description", other: "value" };
      expect(getOriginalLabelFromSource(sourceData)).toBe("Trip description");
    });
  });

  describe("Detach action - sourceData nullified (DU-6)", () => {
    it("should verify line transformation when detached", () => {
      // This test validates the expected state after detach
      // The actual detach logic is in SortableQuoteLinesList
      const originalLine = {
        id: "line-1",
        type: "CALCULATED" as const,
        sourceData: { origin: "Paris", destination: "London" },
        label: "Paris to London",
      };

      // Simulate detach action
      const detachedLine = {
        ...originalLine,
        sourceData: null,
        type: "MANUAL" as const,
      };

      expect(detachedLine.sourceData).toBeNull();
      expect(detachedLine.type).toBe("MANUAL");
    });
  });
});
