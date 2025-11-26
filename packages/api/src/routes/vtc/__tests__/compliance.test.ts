/**
 * API Tests for Compliance Routes (Story 5.3)
 *
 * Tests the compliance validation API endpoints
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { complianceRouter } from "../compliance";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		organizationLicenseRule: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		vehicleCategory: {
			findFirst: vi.fn(),
		},
	},
}));

// Mock the organization middleware
vi.mock("../../../middleware/organization", () => ({
	organizationMiddleware: vi.fn((c, next) => {
		c.set("organizationId", "test-org-id");
		return next();
	}),
}));

import { db } from "@repo/database";

// ============================================================================
// Test Fixtures
// ============================================================================

const mockLicenseRule = {
	id: "rule-1",
	organizationId: "test-org-id",
	licenseCategoryId: "license-d",
	maxDailyDrivingHours: 10,
	maxDailyAmplitudeHours: 14,
	breakMinutesPerDrivingBlock: 45,
	drivingBlockHoursForBreak: 4.5,
	cappedAverageSpeedKmh: 85,
	createdAt: new Date(),
	updatedAt: new Date(),
	licenseCategory: {
		id: "license-d",
		code: "D",
		name: "Bus License",
		description: "Heavy vehicle license",
		organizationId: "test-org-id",
		createdAt: new Date(),
		updatedAt: new Date(),
	},
};

const mockVehicleCategory = {
	id: "cat-bus",
	organizationId: "test-org-id",
	name: "Bus 49 places",
	code: "BUS_49",
	regulatoryCategory: "HEAVY",
	maxPassengers: 49,
	maxLuggageVolume: 100,
	priceMultiplier: 2.0,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const createTripAnalysisPayload = (
	approachMinutes: number,
	serviceMinutes: number,
	returnMinutes: number,
) => ({
	costBreakdown: {
		fuel: { amount: 0, distanceKm: 0, consumptionL100km: 8, pricePerLiter: 1.8 },
		tolls: { amount: 0, distanceKm: 0, ratePerKm: 0.15 },
		wear: { amount: 0, distanceKm: 0, ratePerKm: 0.1 },
		driver: { amount: 0, durationMinutes: 0, hourlyRate: 25 },
		parking: { amount: 0, description: "" },
		total: 0,
	},
	segments: {
		approach: {
			name: "approach" as const,
			description: "Base to pickup",
			distanceKm: 20,
			durationMinutes: approachMinutes,
			cost: {
				fuel: { amount: 0, distanceKm: 20, consumptionL100km: 8, pricePerLiter: 1.8 },
				tolls: { amount: 0, distanceKm: 20, ratePerKm: 0.15 },
				wear: { amount: 0, distanceKm: 20, ratePerKm: 0.1 },
				driver: { amount: 0, durationMinutes: approachMinutes, hourlyRate: 25 },
				parking: { amount: 0, description: "" },
				total: 0,
			},
			isEstimated: false,
		},
		service: {
			name: "service" as const,
			description: "Pickup to dropoff",
			distanceKm: 100,
			durationMinutes: serviceMinutes,
			cost: {
				fuel: { amount: 0, distanceKm: 100, consumptionL100km: 8, pricePerLiter: 1.8 },
				tolls: { amount: 0, distanceKm: 100, ratePerKm: 0.15 },
				wear: { amount: 0, distanceKm: 100, ratePerKm: 0.1 },
				driver: { amount: 0, durationMinutes: serviceMinutes, hourlyRate: 25 },
				parking: { amount: 0, description: "" },
				total: 0,
			},
			isEstimated: false,
		},
		return: {
			name: "return" as const,
			description: "Dropoff to base",
			distanceKm: 20,
			durationMinutes: returnMinutes,
			cost: {
				fuel: { amount: 0, distanceKm: 20, consumptionL100km: 8, pricePerLiter: 1.8 },
				tolls: { amount: 0, distanceKm: 20, ratePerKm: 0.15 },
				wear: { amount: 0, distanceKm: 20, ratePerKm: 0.1 },
				driver: { amount: 0, durationMinutes: returnMinutes, hourlyRate: 25 },
				parking: { amount: 0, description: "" },
				total: 0,
			},
			isEstimated: false,
		},
	},
	totalDistanceKm: 140,
	totalDurationMinutes: approachMinutes + serviceMinutes + returnMinutes,
	totalInternalCost: 0,
	calculatedAt: new Date().toISOString(),
	routingSource: "HAVERSINE_ESTIMATE" as const,
});

// ============================================================================
// Test Setup
// ============================================================================

describe("Compliance API Routes", () => {
	const app = new Hono().route("/", complianceRouter);
	const client = testClient(app);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ============================================================================
	// POST /compliance/validate
	// ============================================================================

	describe("POST /compliance/validate", () => {
		it("should validate a compliant HEAVY vehicle trip", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(mockLicenseRule as any);

			const response = await client.compliance.validate.$post({
				json: {
					vehicleCategoryId: "cat-bus",
					regulatoryCategory: "HEAVY",
					licenseCategoryId: "license-d",
					tripAnalysis: createTripAnalysisPayload(30, 300, 30), // 6h total
					pickupAt: "2025-11-26T08:00:00.000Z",
				},
			});

			if (response.status !== 200) {
				console.log("Error response:", await response.json());
			}
			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.isCompliant).toBe(true);
			expect(data.violations).toHaveLength(0);
			expect(data.summary.status).toBe("OK");
		});

		it("should return violations for non-compliant trip", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(mockLicenseRule as any);

			const response = await client.compliance.validate.$post({
				json: {
					vehicleCategoryId: "cat-bus",
					regulatoryCategory: "HEAVY",
					licenseCategoryId: "license-d",
					tripAnalysis: createTripAnalysisPayload(60, 600, 60), // 12h total
					pickupAt: "2025-11-26T08:00:00.000Z",
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.isCompliant).toBe(false);
			expect(data.violations.length).toBeGreaterThan(0);
			expect(data.summary.status).toBe("VIOLATION");
		});

		it("should skip validation for LIGHT vehicles", async () => {
			const response = await client.compliance.validate.$post({
				json: {
					vehicleCategoryId: "cat-sedan",
					regulatoryCategory: "LIGHT",
					tripAnalysis: createTripAnalysisPayload(60, 600, 60), // Would fail for HEAVY
					pickupAt: "2025-11-26T08:00:00.000Z",
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.isCompliant).toBe(true);
			expect(data.regulatoryCategory).toBe("LIGHT");
		});

		it("should use default rules when no org rules exist", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(mockVehicleCategory as any);

			const response = await client.compliance.validate.$post({
				json: {
					vehicleCategoryId: "cat-bus",
					regulatoryCategory: "HEAVY",
					tripAnalysis: createTripAnalysisPayload(30, 300, 30),
					pickupAt: "2025-11-26T08:00:00.000Z",
				},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.rulesUsed).not.toBeNull();
			expect(data.rulesUsed.maxDailyDrivingHours).toBe(10); // Default
		});

		it("should include adjusted durations in response", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(mockLicenseRule as any);

			const response = await client.compliance.validate.$post({
				json: {
					vehicleCategoryId: "cat-bus",
					regulatoryCategory: "HEAVY",
					licenseCategoryId: "license-d",
					tripAnalysis: createTripAnalysisPayload(30, 300, 30),
					pickupAt: "2025-11-26T08:00:00.000Z",
				},
			});

			const data = await response.json();
			expect(data.adjustedDurations).toBeDefined();
			expect(data.adjustedDurations.totalDrivingMinutes).toBeDefined();
			expect(data.adjustedDurations.injectedBreakMinutes).toBeDefined();
		});
	});

	// ============================================================================
	// GET /compliance/rules/:licenseCategoryId
	// ============================================================================

	describe("GET /compliance/rules/:licenseCategoryId", () => {
		it("should return RSE rules for a license category", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(mockLicenseRule as any);

			const response = await client.compliance.rules[":licenseCategoryId"].$get({
				param: { licenseCategoryId: "license-d" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.licenseCategoryId).toBe("license-d");
			expect(data.maxDailyDrivingHours).toBe(10);
			expect(data.cappedAverageSpeedKmh).toBe(85);
		});

		it("should return 404 when no rules exist", async () => {
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);

			const response = await client.compliance.rules[":licenseCategoryId"].$get({
				param: { licenseCategoryId: "nonexistent" },
			});

			expect(response.status).toBe(404);
		});
	});

	// ============================================================================
	// GET /compliance/rules/vehicle/:vehicleCategoryId
	// ============================================================================

	describe("GET /compliance/rules/vehicle/:vehicleCategoryId", () => {
		it("should return rules for a HEAVY vehicle category", async () => {
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(mockVehicleCategory as any);
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(mockLicenseRule as any);

			const response = await client.compliance.rules.vehicle[":vehicleCategoryId"].$get({
				param: { vehicleCategoryId: "cat-bus" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.vehicleCategory.regulatoryCategory).toBe("HEAVY");
			expect(data.hasRules).toBe(true);
			expect(data.rules).not.toBeNull();
		});

		it("should return null rules for LIGHT vehicle category", async () => {
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue({
				...mockVehicleCategory,
				regulatoryCategory: "LIGHT",
			} as any);

			const response = await client.compliance.rules.vehicle[":vehicleCategoryId"].$get({
				param: { vehicleCategoryId: "cat-sedan" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.vehicleCategory.regulatoryCategory).toBe("LIGHT");
			expect(data.rules).toBeNull();
		});

		it("should return 404 for nonexistent vehicle category", async () => {
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const response = await client.compliance.rules.vehicle[":vehicleCategoryId"].$get({
				param: { vehicleCategoryId: "nonexistent" },
			});

			expect(response.status).toBe(404);
		});
	});

	// ============================================================================
	// GET /compliance/rules
	// ============================================================================

	describe("GET /compliance/rules", () => {
		it("should list all RSE rules for the organization", async () => {
			vi.mocked(db.organizationLicenseRule.findMany).mockResolvedValue([mockLicenseRule] as any);

			const response = await client.compliance.rules.$get({
				query: {},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.data).toHaveLength(1);
			expect(data.total).toBe(1);
			expect(data.data[0].licenseCategoryCode).toBe("D");
		});

		it("should return empty array when no rules exist", async () => {
			vi.mocked(db.organizationLicenseRule.findMany).mockResolvedValue([]);

			const response = await client.compliance.rules.$get({
				query: {},
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.data).toHaveLength(0);
			expect(data.total).toBe(0);
		});
	});
});
