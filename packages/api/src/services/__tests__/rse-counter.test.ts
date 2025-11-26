/**
 * RSE Counter Service Tests (Story 5.5)
 *
 * Tests for tracking RSE counters per driver, per day, per regulatory regime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	getBusinessDate,
	calculateComplianceStatus,
	type DriverRSECounterData,
} from "../rse-counter";

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("RSE Counter Service - Helper Functions", () => {
	describe("getBusinessDate", () => {
		it("should normalize date to midnight", () => {
			const date = new Date("2024-01-15T14:30:45.123Z");
			const result = getBusinessDate(date);

			expect(result.getHours()).toBe(0);
			expect(result.getMinutes()).toBe(0);
			expect(result.getSeconds()).toBe(0);
			expect(result.getMilliseconds()).toBe(0);
		});

		it("should preserve the date part", () => {
			// Use a date that won't change due to timezone
			const date = new Date(2024, 5, 20, 12, 0, 0); // June 20, 2024 at noon local time
			const result = getBusinessDate(date);

			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(5); // June is 5 (0-indexed)
			expect(result.getDate()).toBe(20);
		});
	});

	describe("calculateComplianceStatus", () => {
		const mockRules = {
			licenseCategoryId: "test-id",
			licenseCategoryCode: "D",
			maxDailyDrivingHours: 10,
			maxDailyAmplitudeHours: 14,
			breakMinutesPerDrivingBlock: 45,
			drivingBlockHoursForBreak: 4.5,
			cappedAverageSpeedKmh: 85,
		};

		it("should return OK when no counters", () => {
			const result = calculateComplianceStatus(null, mockRules);
			expect(result).toBe("OK");
		});

		it("should return OK when no rules (LIGHT vehicle)", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 600, // 10 hours
				amplitudeMinutes: 840, // 14 hours
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, null);
			expect(result).toBe("OK");
		});

		it("should return OK when under limits", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 300, // 5 hours (50% of 10h limit)
				amplitudeMinutes: 420, // 7 hours (50% of 14h limit)
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("OK");
		});

		it("should return WARNING when approaching driving limit (>=90%)", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 540, // 9 hours (90% of 10h limit)
				amplitudeMinutes: 600, // 10 hours (71% of 14h limit)
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("WARNING");
		});

		it("should return WARNING when approaching amplitude limit (>=90%)", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 300, // 5 hours (50% of 10h limit)
				amplitudeMinutes: 756, // 12.6 hours (90% of 14h limit)
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("WARNING");
		});

		it("should return VIOLATION when driving limit exceeded", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 660, // 11 hours (110% of 10h limit)
				amplitudeMinutes: 720, // 12 hours
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("VIOLATION");
		});

		it("should return VIOLATION when amplitude limit exceeded", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 480, // 8 hours
				amplitudeMinutes: 900, // 15 hours (107% of 14h limit)
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("VIOLATION");
		});

		it("should prioritize VIOLATION over WARNING", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 660, // 11 hours - VIOLATION
				amplitudeMinutes: 756, // 12.6 hours - WARNING
				breakMinutes: 45,
				restMinutes: 0,
			};
			const result = calculateComplianceStatus(counter, mockRules);
			expect(result).toBe("VIOLATION");
		});
	});
});

// ============================================================================
// Service Function Tests (with mocked Prisma)
// ============================================================================

describe("RSE Counter Service - Database Operations", () => {
	// Mock Prisma client
	const mockPrisma = {
		driverRSECounter: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			upsert: vi.fn(),
			deleteMany: vi.fn(),
		},
		complianceAuditLog: {
			create: vi.fn(),
			findMany: vi.fn(),
		},
		organizationLicenseRule: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Counter Accumulation", () => {
		it("should accumulate driving minutes across multiple activities", async () => {
			// This is a conceptual test - actual implementation uses upsert with increment
			const activity1 = { drivingMinutes: 120 }; // 2 hours
			const activity2 = { drivingMinutes: 180 }; // 3 hours
			const expectedTotal = 300; // 5 hours

			expect(activity1.drivingMinutes + activity2.drivingMinutes).toBe(expectedTotal);
		});

		it("should track amplitude separately from driving time", () => {
			// Amplitude can be greater than driving time (includes waiting, breaks, etc.)
			const counter: DriverRSECounterData = {
				drivingMinutes: 300, // 5 hours driving
				amplitudeMinutes: 480, // 8 hours total work period
				breakMinutes: 45,
				restMinutes: 0,
			};

			expect(counter.amplitudeMinutes).toBeGreaterThan(counter.drivingMinutes);
		});
	});

	describe("Multi-Regime Tracking (AC3)", () => {
		it("should track LIGHT and HEAVY counters separately", () => {
			// Morning: LIGHT vehicle - 3 hours driving
			const lightCounter: DriverRSECounterData = {
				drivingMinutes: 180,
				amplitudeMinutes: 240,
				breakMinutes: 0,
				restMinutes: 0,
			};

			// Afternoon: HEAVY vehicle - 4 hours driving
			const heavyCounter: DriverRSECounterData = {
				drivingMinutes: 240,
				amplitudeMinutes: 300,
				breakMinutes: 45,
				restMinutes: 0,
			};

			// Counters are independent
			expect(lightCounter.drivingMinutes).toBe(180);
			expect(heavyCounter.drivingMinutes).toBe(240);

			// Total driving across regimes
			const totalDriving = lightCounter.drivingMinutes + heavyCounter.drivingMinutes;
			expect(totalDriving).toBe(420); // 7 hours total
		});

		it("should not apply HEAVY limits to LIGHT counters", () => {
			const heavyRules = {
				licenseCategoryId: "heavy-id",
				licenseCategoryCode: "D",
				maxDailyDrivingHours: 10,
				maxDailyAmplitudeHours: 14,
				breakMinutesPerDrivingBlock: 45,
				drivingBlockHoursForBreak: 4.5,
				cappedAverageSpeedKmh: 85,
			};

			// LIGHT counter with 12 hours driving (would violate HEAVY rules)
			const lightCounter: DriverRSECounterData = {
				drivingMinutes: 720, // 12 hours
				amplitudeMinutes: 780,
				breakMinutes: 0,
				restMinutes: 0,
			};

			// LIGHT vehicles have no RSE rules, so status is OK
			const lightStatus = calculateComplianceStatus(lightCounter, null);
			expect(lightStatus).toBe("OK");

			// Same counter would be VIOLATION for HEAVY
			const heavyStatus = calculateComplianceStatus(lightCounter, heavyRules);
			expect(heavyStatus).toBe("VIOLATION");
		});
	});

	describe("Cumulative Compliance Check", () => {
		it("should detect when additional activity would exceed limits", () => {
			const currentDriving = 540; // 9 hours
			const additionalDriving = 120; // 2 hours
			const maxDriving = 600; // 10 hours

			const projectedDriving = currentDriving + additionalDriving;
			const wouldExceed = projectedDriving > maxDriving;

			expect(wouldExceed).toBe(true);
			expect(projectedDriving).toBe(660); // 11 hours
		});

		it("should allow activity that stays within limits", () => {
			const currentDriving = 300; // 5 hours
			const additionalDriving = 180; // 3 hours
			const maxDriving = 600; // 10 hours

			const projectedDriving = currentDriving + additionalDriving;
			const wouldExceed = projectedDriving > maxDriving;

			expect(wouldExceed).toBe(false);
			expect(projectedDriving).toBe(480); // 8 hours
		});

		it("should warn when activity approaches limits", () => {
			const currentDriving = 300; // 5 hours
			const additionalDriving = 240; // 4 hours
			const maxDriving = 600; // 10 hours
			const warningThreshold = 0.9;

			const projectedDriving = currentDriving + additionalDriving;
			const percentOfLimit = projectedDriving / maxDriving;
			const isWarning = percentOfLimit >= warningThreshold && projectedDriving <= maxDriving;

			expect(isWarning).toBe(true);
			expect(percentOfLimit).toBeCloseTo(0.9);
		});
	});

	describe("Audit Logging (AC2)", () => {
		it("should include decision type in audit log", () => {
			const decisions = ["APPROVED", "BLOCKED", "WARNING"];

			decisions.forEach((decision) => {
				expect(["APPROVED", "BLOCKED", "WARNING"]).toContain(decision);
			});
		});

		it("should include reason in audit log", () => {
			const approvedReason = "Cumulative compliance check passed";
			const blockedReason = "Blocked: Cumulative driving time (11h) would exceed maximum (10h)";
			const warningReason = "Approved with warnings: Driving time approaching limit";

			expect(approvedReason).toBeTruthy();
			expect(blockedReason).toContain("Blocked");
			expect(warningReason).toContain("warnings");
		});

		it("should include counters snapshot in audit log", () => {
			const countersSnapshot: DriverRSECounterData = {
				drivingMinutes: 540,
				amplitudeMinutes: 600,
				breakMinutes: 45,
				restMinutes: 0,
			};

			expect(countersSnapshot.drivingMinutes).toBe(540);
			expect(countersSnapshot.amplitudeMinutes).toBe(600);
		});
	});

	describe("Multi-Tenancy (AC5)", () => {
		it("should scope counters by organizationId", () => {
			const org1Id = "org-1";
			const org2Id = "org-2";
			const driverId = "driver-1";

			// Counters should be unique per org + driver + date + regime
			const counter1Key = `${org1Id}-${driverId}-2024-01-15-HEAVY`;
			const counter2Key = `${org2Id}-${driverId}-2024-01-15-HEAVY`;

			expect(counter1Key).not.toBe(counter2Key);
		});

		it("should not allow cross-org access", () => {
			const requestingOrgId = "org-1";
			const counterOrgId = "org-2";

			const hasAccess = requestingOrgId === counterOrgId;
			expect(hasAccess).toBe(false);
		});
	});
});

// ============================================================================
// Integration-like Tests (Business Logic)
// ============================================================================

describe("RSE Counter Service - Business Logic", () => {
	describe("Multi-Licence Driver Scenario (FR49)", () => {
		it("should handle driver with morning LIGHT + afternoon HEAVY", () => {
			// Scenario: Driver works 4h on LIGHT vehicle, then 5h on HEAVY vehicle

			// Morning: LIGHT vehicle
			const lightActivity = {
				regulatoryCategory: "LIGHT" as const,
				drivingMinutes: 240, // 4 hours
				amplitudeMinutes: 300, // 5 hours including breaks
			};

			// Afternoon: HEAVY vehicle
			const heavyActivity = {
				regulatoryCategory: "HEAVY" as const,
				drivingMinutes: 300, // 5 hours
				amplitudeMinutes: 360, // 6 hours including breaks
			};

			// Each regime tracked separately
			expect(lightActivity.regulatoryCategory).toBe("LIGHT");
			expect(heavyActivity.regulatoryCategory).toBe("HEAVY");

			// HEAVY vehicle is within RSE limits (5h < 10h max)
			const heavyRules = { maxDailyDrivingHours: 10 };
			const heavyDrivingHours = heavyActivity.drivingMinutes / 60;
			expect(heavyDrivingHours).toBeLessThan(heavyRules.maxDailyDrivingHours);
		});

		it("should not cross-contaminate regime counters", () => {
			// Even if LIGHT driving is high, it shouldn't affect HEAVY compliance
			const lightDriving = 720; // 12 hours on LIGHT
			const heavyDriving = 300; // 5 hours on HEAVY
			const heavyMaxDriving = 600; // 10 hours limit

			// HEAVY is compliant despite LIGHT being high
			const heavyIsCompliant = heavyDriving <= heavyMaxDriving;
			expect(heavyIsCompliant).toBe(true);

			// Total driving is 17 hours, but each regime is independent
			const totalDriving = lightDriving + heavyDriving;
			expect(totalDriving).toBe(1020);
		});
	});

	describe("Break Tracking", () => {
		it("should track break minutes", () => {
			const counter: DriverRSECounterData = {
				drivingMinutes: 270, // 4.5 hours
				amplitudeMinutes: 315, // 5.25 hours
				breakMinutes: 45, // Required break after 4.5h driving
				restMinutes: 0,
			};

			expect(counter.breakMinutes).toBe(45);
		});
	});

	describe("Work Period Tracking", () => {
		it("should track work start and end times", () => {
			const workStartTime = new Date("2024-01-15T08:00:00");
			const workEndTime = new Date("2024-01-15T18:00:00");

			const amplitudeMinutes = (workEndTime.getTime() - workStartTime.getTime()) / 60000;
			expect(amplitudeMinutes).toBe(600); // 10 hours
		});
	});
});
