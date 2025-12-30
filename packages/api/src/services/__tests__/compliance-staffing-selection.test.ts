/**
 * Story 17.3: Staffing Selection Policy Tests
 * Tests the automatic selection of staffing plans based on configured policies
 */

import { describe, it, expect } from "vitest";
import {
	selectBestStaffingPlan,
	type AlternativesGenerationResult,
	type AlternativeOption,
	type StaffingSelectionPolicy,
} from "../compliance-validator";

// Helper to create a mock alternatives result
function mockAlternativesResult(
	alternatives: AlternativeOption[],
): AlternativesGenerationResult {
	return {
		hasAlternatives: alternatives.length > 0,
		alternatives,
		originalViolations: alternatives.length > 0 ? [{
			type: "AMPLITUDE_EXCEEDED" as const,
			message: "Amplitude exceeded 14h limit",
			actual: 16,
			limit: 14,
			unit: "hours" as const,
			severity: "BLOCKING" as const,
		}] : [],
		recommendedAlternative: alternatives.find(a => a.isFeasible && a.wouldBeCompliant)?.type,
		message: alternatives.length > 0 ? `${alternatives.length} alternatives available` : "No alternatives",
	};
}

// Helper to create a mock alternative option
function mockAlternative(
	type: "DOUBLE_CREW" | "RELAY_DRIVER" | "MULTI_DAY",
	cost: number,
	isFeasible: boolean,
	wouldBeCompliant: boolean,
	daysRequired: number = 1,
): AlternativeOption {
	return {
		type,
		title: `${type} Option`,
		description: `${type} staffing alternative`,
		isFeasible,
		wouldBeCompliant,
		additionalCost: {
			total: cost,
			currency: "EUR",
			breakdown: {
				extraDriverCost: cost * 0.7,
				hotelCost: cost * 0.2,
				mealAllowance: cost * 0.1,
				otherCosts: 0,
			},
		},
		adjustedSchedule: {
			totalDrivingMinutes: 600,
			totalAmplitudeMinutes: 840,
			daysRequired,
			driversRequired: type === "DOUBLE_CREW" || type === "RELAY_DRIVER" ? 2 : 1,
			hotelNightsRequired: type === "MULTI_DAY" ? daysRequired - 1 : 0,
		},
		remainingViolations: wouldBeCompliant ? [] : [{
			type: "AMPLITUDE_EXCEEDED" as const,
			message: "Still exceeds limit",
			actual: 18,
			limit: 14,
			unit: "hours" as const,
			severity: "BLOCKING" as const,
		}],
	};
}

describe("Story 17.3: Staffing Selection Policy - selectBestStaffingPlan", () => {
	describe("AC3: Automatic Best Plan Selection", () => {
		it("should return null when no alternatives (compliant trip)", () => {
			const result = selectBestStaffingPlan(
				mockAlternativesResult([]),
				"CHEAPEST",
			);

			expect(result.selectedPlan).toBeNull();
			expect(result.isRequired).toBe(false);
			expect(result.selectionReason).toContain("No staffing plan required");
		});

		it("should select CHEAPEST plan when policy is CHEAPEST", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 300, true, true),
				mockAlternative("RELAY_DRIVER", 200, true, true),
				mockAlternative("MULTI_DAY", 400, true, true, 2),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.selectedPlan).not.toBeNull();
			expect(result.selectedPlan?.type).toBe("RELAY_DRIVER");
			expect(result.selectedPlan?.additionalCost.total).toBe(200);
			expect(result.selectionReason).toContain("lowest cost");
		});

		it("should select FASTEST plan when policy is FASTEST", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 300, true, true, 1),
				mockAlternative("MULTI_DAY", 200, true, true, 2),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"FASTEST",
			);

			expect(result.selectedPlan).not.toBeNull();
			expect(result.selectedPlan?.type).toBe("DOUBLE_CREW");
			expect(result.selectedPlan?.adjustedSchedule.daysRequired).toBe(1);
			expect(result.selectionReason).toContain("fastest");
		});

		it("should prefer DOUBLE_CREW over RELAY when policy is PREFER_INTERNAL", () => {
			const alternatives = [
				mockAlternative("RELAY_DRIVER", 200, true, true),
				mockAlternative("DOUBLE_CREW", 300, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"PREFER_INTERNAL",
			);

			expect(result.selectedPlan).not.toBeNull();
			expect(result.selectedPlan?.type).toBe("DOUBLE_CREW");
			expect(result.selectionReason).toContain("preferred internal");
		});

		it("should filter out non-feasible alternatives", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 100, false, false),
				mockAlternative("RELAY_DRIVER", 300, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.selectedPlan?.type).toBe("RELAY_DRIVER");
		});

		it("should filter out non-compliant alternatives", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 100, true, false),
				mockAlternative("MULTI_DAY", 300, true, true, 2),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.selectedPlan?.type).toBe("MULTI_DAY");
		});

		it("should handle case with no feasible alternatives", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 100, false, false),
				mockAlternative("RELAY_DRIVER", 200, false, false),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.isRequired).toBe(true);
			expect(result.selectionReason).toContain("manual intervention required");
		});

		it("should default to CHEAPEST for unknown policy", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 300, true, true),
				mockAlternative("RELAY_DRIVER", 200, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"UNKNOWN" as StaffingSelectionPolicy,
			);

			expect(result.selectedPlan?.type).toBe("RELAY_DRIVER");
		});

		it("should include all alternatives in result", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 300, true, true),
				mockAlternative("RELAY_DRIVER", 200, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.alternativesConsidered.length).toBe(2);
		});

		it("should include original violations in result", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 300, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			expect(result.originalViolations.length).toBeGreaterThan(0);
			expect(result.originalViolations[0].type).toBe("AMPLITUDE_EXCEEDED");
		});

		it("should select cheapest when multiple policies have same top option", () => {
			const alternatives = [
				mockAlternative("DOUBLE_CREW", 250, true, true, 1),
				mockAlternative("RELAY_DRIVER", 250, true, true, 1),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"CHEAPEST",
			);

			// Both have same cost, should pick first in sorted order
			expect(result.selectedPlan).not.toBeNull();
			expect(result.selectedPlan?.additionalCost.total).toBe(250);
		});

		it("should respect FASTEST policy with multiple day options", () => {
			const alternatives = [
				mockAlternative("MULTI_DAY", 150, true, true, 3),
				mockAlternative("DOUBLE_CREW", 300, true, true, 1),
				mockAlternative("MULTI_DAY", 200, true, true, 2),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"FASTEST",
			);

			expect(result.selectedPlan?.type).toBe("DOUBLE_CREW");
			expect(result.selectedPlan?.adjustedSchedule.daysRequired).toBe(1);
		});

		it("should respect PREFER_INTERNAL policy order", () => {
			const alternatives = [
				mockAlternative("RELAY_DRIVER", 100, true, true),
				mockAlternative("MULTI_DAY", 150, true, true, 2),
				mockAlternative("DOUBLE_CREW", 200, true, true),
			];

			const result = selectBestStaffingPlan(
				mockAlternativesResult(alternatives),
				"PREFER_INTERNAL",
			);

			// PREFER_INTERNAL priority: DOUBLE_CREW > MULTI_DAY > RELAY_DRIVER
			expect(result.selectedPlan?.type).toBe("DOUBLE_CREW");
		});
	});
});
