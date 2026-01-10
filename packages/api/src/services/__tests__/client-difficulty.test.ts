/**
 * Story 17.15: Client Difficulty Score (Patience Tax) Tests
 * Tests for the applyClientDifficultyMultiplier function
 */

import { describe, it, expect } from "vitest";
import {
	applyClientDifficultyMultiplier,
	resolveDifficultyScore,
} from "../pricing/multiplier-engine";
import { DEFAULT_DIFFICULTY_MULTIPLIERS } from "../pricing/constants";

describe("Story 17.15: Client Difficulty Score (Patience Tax)", () => {
	describe("applyClientDifficultyMultiplier", () => {
		describe("AC6: No adjustment for null/undefined score", () => {
			it("should return unchanged price when difficultyScore is null", () => {
				const result = applyClientDifficultyMultiplier(100, null);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});

			it("should return unchanged price when difficultyScore is undefined", () => {
				const result = applyClientDifficultyMultiplier(100, undefined);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});
		});

		describe("AC3: Apply multiplier based on score", () => {
			it("should apply +2% for score 2 using defaults", () => {
				const result = applyClientDifficultyMultiplier(100, 2);

				expect(result.adjustedPrice).toBe(102);
				expect(result.appliedRule).not.toBeNull();
				expect(result.appliedRule?.type).toBe("CLIENT_DIFFICULTY_MULTIPLIER");
				expect(result.appliedRule?.difficultyScore).toBe(2);
				expect(result.appliedRule?.multiplier).toBe(1.02);
				expect(result.appliedRule?.priceBefore).toBe(100);
				expect(result.appliedRule?.priceAfter).toBe(102);
			});

			it("should apply +5% for score 3 using defaults", () => {
				const result = applyClientDifficultyMultiplier(100, 3);

				expect(result.adjustedPrice).toBe(105);
				expect(result.appliedRule?.multiplier).toBe(1.05);
			});

			it("should apply +8% for score 4 using defaults", () => {
				const result = applyClientDifficultyMultiplier(100, 4);

				expect(result.adjustedPrice).toBe(108);
				expect(result.appliedRule?.multiplier).toBe(1.08);
			});

			it("should apply +10% for score 5 using defaults", () => {
				const result = applyClientDifficultyMultiplier(100, 5);

				expect(result.adjustedPrice).toBe(110);
				expect(result.appliedRule?.multiplier).toBe(1.10);
			});

			it("should not apply multiplier for score 1 (neutral)", () => {
				const result = applyClientDifficultyMultiplier(100, 1);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});
		});

		describe("AC2: Custom configured multipliers", () => {
			it("should use custom multipliers when provided", () => {
				const customMultipliers = {
					"1": 1.00,
					"2": 1.05, // Custom +5% instead of default +2%
					"3": 1.10,
					"4": 1.15,
					"5": 1.20,
				};

				const result = applyClientDifficultyMultiplier(100, 2, customMultipliers);

				expect(result.adjustedPrice).toBe(105);
				expect(result.appliedRule?.multiplier).toBe(1.05);
			});

			it("should fall back to 1.0 for unconfigured score", () => {
				const customMultipliers = {
					"1": 1.00,
					"2": 1.05,
					// Score 3 not configured
				};

				const result = applyClientDifficultyMultiplier(100, 3, customMultipliers);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});
		});

		describe("Edge cases", () => {
			it("should handle invalid score below 1", () => {
				const result = applyClientDifficultyMultiplier(100, 0);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});

			it("should handle invalid score above 5", () => {
				const result = applyClientDifficultyMultiplier(100, 6);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});

			it("should handle negative score", () => {
				const result = applyClientDifficultyMultiplier(100, -1);

				expect(result.adjustedPrice).toBe(100);
				expect(result.appliedRule).toBeNull();
			});

			it("should round price to 2 decimal places", () => {
				const result = applyClientDifficultyMultiplier(99.99, 3);

				// 99.99 * 1.05 = 104.9895, should round to 104.99
				expect(result.adjustedPrice).toBe(104.99);
			});

			it("should handle zero price", () => {
				const result = applyClientDifficultyMultiplier(0, 5);

				expect(result.adjustedPrice).toBe(0);
				expect(result.appliedRule?.priceAfter).toBe(0);
			});
		});

		describe("AC4: Rule description format", () => {
			it("should include correct description format", () => {
				const result = applyClientDifficultyMultiplier(100, 4);

				expect(result.appliedRule?.description).toContain("Client difficulty adjustment");
				expect(result.appliedRule?.description).toContain("+8%");
				expect(result.appliedRule?.description).toContain("score 4/5");
			});
		});
	});

	describe("Story 24.8: Difficulty Score Resolution & Source Tracking", () => {
		describe("resolveDifficultyScore", () => {
			it("should prioritize EndCustomer score when present and valid", () => {
				const result = resolveDifficultyScore(4, 2, "end-cust-123");
				expect(result.score).toBe(4);
				expect(result.source).toBe("END_CUSTOMER");
				expect(result.endCustomerId).toBe("end-cust-123");
			});

			it("should fallback to Contact score when EndCustomer score is null", () => {
				const result = resolveDifficultyScore(null, 3, "end-cust-123");
				expect(result.score).toBe(3);
				expect(result.source).toBe("CONTACT");
				expect(result.endCustomerId).toBeUndefined();
			});

			it("should fallback to Contact score when EndCustomer score is invalid (< 1)", () => {
				const result = resolveDifficultyScore(0, 3, "end-cust-123");
				expect(result.score).toBe(3);
				expect(result.source).toBe("CONTACT");
			});

			it("should fallback to Contact score when EndCustomer score is invalid (> 5)", () => {
				const result = resolveDifficultyScore(6, 3, "end-cust-123");
				expect(result.score).toBe(3);
				expect(result.source).toBe("CONTACT");
			});

			it("should return NONE when no valid score exists", () => {
				const result = resolveDifficultyScore(null, null);
				expect(result.score).toBeNull();
				expect(result.source).toBe("NONE");
			});

			it("should return NONE when both scores are invalid", () => {
				const result = resolveDifficultyScore(6, 0);
				expect(result.score).toBeNull();
				expect(result.source).toBe("NONE");
			});
		});

		describe("applyClientDifficultyMultiplier with source", () => {
			it("should include source info in description for EndCustomer", () => {
				const result = applyClientDifficultyMultiplier(100, 4, null, "END_CUSTOMER", "cust-1");
				expect(result.appliedRule?.description).toContain("end-customer");
				expect(result.appliedRule?.scoreSource).toBe("END_CUSTOMER");
				expect(result.appliedRule?.endCustomerId).toBe("cust-1");
			});

			it("should use generic description when source is CONTACT", () => {
				const result = applyClientDifficultyMultiplier(100, 4, null, "CONTACT");
				expect(result.appliedRule?.description).not.toContain("end-customer");
				expect(result.appliedRule?.description).toContain("score 4/5");
				expect(result.appliedRule?.scoreSource).toBe("CONTACT");
			});

			it("should use generic description when source is implicit (legacy)", () => {
				const result = applyClientDifficultyMultiplier(100, 4);
				expect(result.appliedRule?.description).not.toContain("end-customer");
				expect(result.appliedRule?.description).toContain("score 4/5");
				expect(result.appliedRule?.scoreSource).toBeUndefined();
			});
		});
	});

	describe("DEFAULT_DIFFICULTY_MULTIPLIERS", () => {
		it("should have correct default values", () => {
			expect(DEFAULT_DIFFICULTY_MULTIPLIERS[1]).toBe(1.00);
			expect(DEFAULT_DIFFICULTY_MULTIPLIERS[2]).toBe(1.02);
			expect(DEFAULT_DIFFICULTY_MULTIPLIERS[3]).toBe(1.05);
			expect(DEFAULT_DIFFICULTY_MULTIPLIERS[4]).toBe(1.08);
			expect(DEFAULT_DIFFICULTY_MULTIPLIERS[5]).toBe(1.10);
		});
	});
});
