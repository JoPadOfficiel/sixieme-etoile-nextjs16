import { describe, it, expect } from "vitest";
import {
  hasBlockingViolations,
  hasComplianceWarnings,
  getComplianceStatusLevel,
  type ComplianceValidationResult,
  type ComplianceViolation,
  type ComplianceWarning,
} from "../types";

describe("Compliance Type Helpers", () => {
  const mockViolation: ComplianceViolation = {
    type: "DRIVING_TIME_EXCEEDED",
    message: "Total driving time exceeds maximum",
    actual: 11,
    limit: 10,
    unit: "hours",
    severity: "BLOCKING",
  };

  const mockWarning: ComplianceWarning = {
    type: "APPROACHING_LIMIT",
    message: "Approaching driving time limit",
    actual: 9.5,
    limit: 10,
    percentOfLimit: 95,
  };

  const createComplianceResult = (
    violations: ComplianceViolation[] = [],
    warnings: ComplianceWarning[] = []
  ): ComplianceValidationResult => ({
    isCompliant: violations.length === 0,
    regulatoryCategory: "HEAVY",
    violations,
    warnings,
    adjustedDurations: {
      totalDrivingMinutes: 600,
      totalAmplitudeMinutes: 690,
      injectedBreakMinutes: 90,
      cappedSpeedApplied: false,
      originalDrivingMinutes: 600,
      originalAmplitudeMinutes: 600,
    },
    rulesApplied: [],
  });

  describe("hasBlockingViolations", () => {
    it("should return false when result is null", () => {
      expect(hasBlockingViolations(null)).toBe(false);
    });

    it("should return false when no violations exist", () => {
      const result = createComplianceResult([], [mockWarning]);
      expect(hasBlockingViolations(result)).toBe(false);
    });

    it("should return true when violations exist", () => {
      const result = createComplianceResult([mockViolation], []);
      expect(hasBlockingViolations(result)).toBe(true);
    });

    it("should return true when multiple violations exist", () => {
      const result = createComplianceResult([mockViolation, mockViolation], []);
      expect(hasBlockingViolations(result)).toBe(true);
    });
  });

  describe("hasComplianceWarnings", () => {
    it("should return false when result is null", () => {
      expect(hasComplianceWarnings(null)).toBe(false);
    });

    it("should return false when no warnings exist", () => {
      const result = createComplianceResult([mockViolation], []);
      expect(hasComplianceWarnings(result)).toBe(false);
    });

    it("should return true when warnings exist", () => {
      const result = createComplianceResult([], [mockWarning]);
      expect(hasComplianceWarnings(result)).toBe(true);
    });

    it("should return true when multiple warnings exist", () => {
      const result = createComplianceResult([], [mockWarning, mockWarning]);
      expect(hasComplianceWarnings(result)).toBe(true);
    });
  });

  describe("getComplianceStatusLevel", () => {
    it("should return 'ok' when result is null", () => {
      expect(getComplianceStatusLevel(null)).toBe("ok");
    });

    it("should return 'ok' when no violations or warnings", () => {
      const result = createComplianceResult([], []);
      expect(getComplianceStatusLevel(result)).toBe("ok");
    });

    it("should return 'warning' when only warnings exist", () => {
      const result = createComplianceResult([], [mockWarning]);
      expect(getComplianceStatusLevel(result)).toBe("warning");
    });

    it("should return 'error' when violations exist", () => {
      const result = createComplianceResult([mockViolation], []);
      expect(getComplianceStatusLevel(result)).toBe("error");
    });

    it("should return 'error' when both violations and warnings exist", () => {
      const result = createComplianceResult([mockViolation], [mockWarning]);
      expect(getComplianceStatusLevel(result)).toBe("error");
    });
  });
});
