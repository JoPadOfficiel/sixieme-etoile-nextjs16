/**
 * Story 17.9: Time Bucket Pricing Tests
 * Tests for calculateDispoPriceWithBuckets and calculateSmartDispoPrice functions
 */

import { describe, it, expect } from "vitest";
import {
	calculateDispoPriceWithBuckets,
	calculateSmartDispoPrice,
	calculateDispoPrice,
	type OrganizationPricingSettings,
	type MadTimeBucketData,
} from "../pricing-engine";

// ============================================================================
// Test Data
// ============================================================================

const mockSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45,
	targetMarginPercent: 25,
	dispoIncludedKmPerHour: 50,
	dispoOverageRatePerKm: 0.50,
	timeBucketInterpolationStrategy: "ROUND_UP",
	madTimeBuckets: [],
};

const createBuckets = (vehicleCategoryId: string): MadTimeBucketData[] => [
	{ id: "bucket-3h", durationHours: 3, vehicleCategoryId, price: 150, isActive: true },
	{ id: "bucket-4h", durationHours: 4, vehicleCategoryId, price: 180, isActive: true },
	{ id: "bucket-6h", durationHours: 6, vehicleCategoryId, price: 250, isActive: true },
	{ id: "bucket-8h", durationHours: 8, vehicleCategoryId, price: 320, isActive: true },
	{ id: "bucket-10h", durationHours: 10, vehicleCategoryId, price: 400, isActive: true },
];

const VEHICLE_CATEGORY_ID = "cat-sedan";

// ============================================================================
// calculateDispoPriceWithBuckets Tests
// ============================================================================

describe("calculateDispoPriceWithBuckets", () => {
	describe("AC3: ROUND_UP Behavior", () => {
		it("should use next higher bucket when ROUND_UP and duration between buckets", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 5h request should use 6h bucket (250€)
			const result = calculateDispoPriceWithBuckets(
				5 * 60, // 5 hours in minutes
				200,    // distance under included km
				VEHICLE_CATEGORY_ID,
				45,     // ratePerHour
				settings,
			);

			expect(result.price).toBe(250);
			expect(result.rule).not.toBeNull();
			expect(result.rule?.type).toBe("TIME_BUCKET");
			expect(result.rule?.timeBucketUsed?.durationHours).toBe(6);
			expect(result.rule?.timeBucketUsed?.price).toBe(250);
			expect(result.rule?.interpolationStrategy).toBe("ROUND_UP");
		});
	});

	describe("AC4: ROUND_DOWN Behavior", () => {
		it("should use previous lower bucket when ROUND_DOWN and duration between buckets", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_DOWN",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 5h request should use 4h bucket (180€)
			const result = calculateDispoPriceWithBuckets(
				5 * 60, // 5 hours in minutes
				150,    // distance under included km
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(180);
			expect(result.rule?.type).toBe("TIME_BUCKET");
			expect(result.rule?.timeBucketUsed?.durationHours).toBe(4);
			expect(result.rule?.timeBucketUsed?.price).toBe(180);
			expect(result.rule?.interpolationStrategy).toBe("ROUND_DOWN");
		});
	});

	describe("AC5: PROPORTIONAL Behavior", () => {
		it("should interpolate linearly when PROPORTIONAL and duration between buckets", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "PROPORTIONAL",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 5h request between 4h (180€) and 6h (250€)
			// Interpolation: 180 + ((5-4)/(6-4)) * (250-180) = 180 + 0.5 * 70 = 215€
			const result = calculateDispoPriceWithBuckets(
				5 * 60, // 5 hours in minutes
				200,    // distance under included km
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(215);
			expect(result.rule?.type).toBe("TIME_BUCKET");
			expect(result.rule?.interpolationStrategy).toBe("PROPORTIONAL");
			expect(result.rule?.lowerBucket?.durationHours).toBe(4);
			expect(result.rule?.lowerBucket?.price).toBe(180);
			expect(result.rule?.upperBucket?.durationHours).toBe(6);
			expect(result.rule?.upperBucket?.price).toBe(250);
			expect(result.rule?.bucketPrice).toBe(215);
		});

		it("should interpolate correctly for 7h between 6h and 8h", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "PROPORTIONAL",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 7h request between 6h (250€) and 8h (320€)
			// Interpolation: 250 + ((7-6)/(8-6)) * (320-250) = 250 + 0.5 * 70 = 285€
			const result = calculateDispoPriceWithBuckets(
				7 * 60,
				300,
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(285);
			expect(result.rule?.bucketPrice).toBe(285);
		});
	});

	describe("AC6: Below Minimum Bucket", () => {
		it("should fallback to hourly rate when below minimum bucket", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 2h request is below minimum 3h bucket
			const result = calculateDispoPriceWithBuckets(
				2 * 60, // 2 hours
				50,
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			// Should use standard hourly calculation: 2h × 45€ = 90€
			expect(result.price).toBe(90);
			expect(result.rule?.type).toBe("TRIP_TYPE"); // Standard dispo rule
			expect(result.rule?.tripType).toBe("dispo");
		});
	});

	describe("AC7: Above Maximum Bucket", () => {
		it("should use max bucket + hourly for extra when above maximum", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 12h request is above max 10h bucket
			// Price = 10h bucket (400€) + 2h extra × 45€/h = 400 + 90 = 490€
			const result = calculateDispoPriceWithBuckets(
				12 * 60, // 12 hours
				500,     // under included km (12h × 50 = 600km)
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(490);
			expect(result.rule?.type).toBe("TIME_BUCKET");
			expect(result.rule?.timeBucketUsed?.durationHours).toBe(10);
			expect(result.rule?.timeBucketUsed?.price).toBe(400);
			expect(result.rule?.extraHoursCharged).toBe(2);
			expect(result.rule?.extraHoursAmount).toBe(90);
		});
	});

	describe("AC9: Overage Still Applies", () => {
		it("should add overage on top of bucket price", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// 4h bucket = 180€
			// Included km: 4h × 50 = 200km
			// Actual: 300km → overage = 100km × 0.50€ = 50€
			// Total: 180 + 50 = 230€
			const result = calculateDispoPriceWithBuckets(
				4 * 60, // 4 hours
				300,    // 100km over included
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(230);
			expect(result.rule?.includedKm).toBe(200);
			expect(result.rule?.actualKm).toBe(300);
			expect(result.rule?.overageKm).toBe(100);
			expect(result.rule?.overageAmount).toBe(50);
			expect(result.rule?.bucketPrice).toBe(180);
		});
	});

	describe("Exact Bucket Match", () => {
		it("should use exact bucket price when duration matches exactly", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "PROPORTIONAL",
				madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
			};

			// Exactly 6h should use 6h bucket (250€)
			const result = calculateDispoPriceWithBuckets(
				6 * 60,
				250,
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(250);
			expect(result.rule?.timeBucketUsed?.durationHours).toBe(6);
			expect(result.rule?.timeBucketUsed?.price).toBe(250);
		});
	});

	describe("No Buckets Configured", () => {
		it("should fallback to hourly rate when no buckets configured", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: [], // No buckets
			};

			const result = calculateDispoPriceWithBuckets(
				4 * 60,
				150,
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			// Standard hourly: 4h × 45€ = 180€
			expect(result.price).toBe(180);
			expect(result.rule?.type).toBe("TRIP_TYPE");
		});

		it("should fallback when buckets exist but not for this vehicle category", () => {
			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: createBuckets("other-category"),
			};

			const result = calculateDispoPriceWithBuckets(
				4 * 60,
				150,
				VEHICLE_CATEGORY_ID, // Different from bucket category
				45,
				settings,
			);

			// Standard hourly: 4h × 45€ = 180€
			expect(result.price).toBe(180);
			expect(result.rule?.type).toBe("TRIP_TYPE");
		});
	});

	describe("Inactive Buckets", () => {
		it("should ignore inactive buckets", () => {
			const buckets: MadTimeBucketData[] = [
				{ id: "bucket-4h", durationHours: 4, vehicleCategoryId: VEHICLE_CATEGORY_ID, price: 180, isActive: true },
				{ id: "bucket-6h", durationHours: 6, vehicleCategoryId: VEHICLE_CATEGORY_ID, price: 250, isActive: false }, // Inactive
				{ id: "bucket-8h", durationHours: 8, vehicleCategoryId: VEHICLE_CATEGORY_ID, price: 320, isActive: true },
			];

			const settings: OrganizationPricingSettings = {
				...mockSettings,
				timeBucketInterpolationStrategy: "ROUND_UP",
				madTimeBuckets: buckets,
			};

			// 5h should skip inactive 6h and use 8h bucket
			const result = calculateDispoPriceWithBuckets(
				5 * 60,
				200,
				VEHICLE_CATEGORY_ID,
				45,
				settings,
			);

			expect(result.price).toBe(320);
			expect(result.rule?.timeBucketUsed?.durationHours).toBe(8);
		});
	});
});

// ============================================================================
// calculateSmartDispoPrice Tests
// ============================================================================

describe("calculateSmartDispoPrice", () => {
	it("should use bucket pricing when buckets are configured", () => {
		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: "ROUND_UP",
			madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
		};

		const result = calculateSmartDispoPrice(
			5 * 60,
			200,
			VEHICLE_CATEGORY_ID,
			45,
			settings,
		);

		expect(result.rule?.type).toBe("TIME_BUCKET");
	});

	it("should use hourly pricing when no buckets configured", () => {
		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: null,
			madTimeBuckets: [],
		};

		const result = calculateSmartDispoPrice(
			4 * 60,
			150,
			VEHICLE_CATEGORY_ID,
			45,
			settings,
		);

		expect(result.rule?.type).toBe("TRIP_TYPE");
		expect(result.price).toBe(180); // 4h × 45€
	});

	it("should use hourly pricing when strategy is null", () => {
		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: null,
			madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
		};

		const result = calculateSmartDispoPrice(
			4 * 60,
			150,
			VEHICLE_CATEGORY_ID,
			45,
			settings,
		);

		// Even with buckets, null strategy means use hourly
		expect(result.rule?.type).toBe("TRIP_TYPE");
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle zero distance", () => {
		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: "ROUND_UP",
			madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
		};

		const result = calculateDispoPriceWithBuckets(
			4 * 60,
			0, // Zero distance
			VEHICLE_CATEGORY_ID,
			45,
			settings,
		);

		expect(result.price).toBe(180); // Just bucket price, no overage
		expect(result.rule?.overageKm).toBe(0);
		expect(result.rule?.overageAmount).toBe(0);
	});

	it("should handle fractional hours with PROPORTIONAL", () => {
		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: "PROPORTIONAL",
			madTimeBuckets: createBuckets(VEHICLE_CATEGORY_ID),
		};

		// 4.5h between 4h (180€) and 6h (250€)
		// Interpolation: 180 + ((4.5-4)/(6-4)) * (250-180) = 180 + 0.25 * 70 = 197.5€
		const result = calculateDispoPriceWithBuckets(
			4.5 * 60, // 4.5 hours
			200,
			VEHICLE_CATEGORY_ID,
			45,
			settings,
		);

		expect(result.price).toBe(197.5);
	});

	it("should handle single bucket configuration", () => {
		const singleBucket: MadTimeBucketData[] = [
			{ id: "bucket-4h", durationHours: 4, vehicleCategoryId: VEHICLE_CATEGORY_ID, price: 180, isActive: true },
		];

		const settings: OrganizationPricingSettings = {
			...mockSettings,
			timeBucketInterpolationStrategy: "ROUND_UP",
			madTimeBuckets: singleBucket,
		};

		// Exactly 4h
		const result1 = calculateDispoPriceWithBuckets(4 * 60, 150, VEHICLE_CATEGORY_ID, 45, settings);
		expect(result1.price).toBe(180);

		// Below 4h - fallback to hourly
		const result2 = calculateDispoPriceWithBuckets(3 * 60, 100, VEHICLE_CATEGORY_ID, 45, settings);
		expect(result2.price).toBe(135); // 3h × 45€

		// Above 4h - use bucket + extra
		const result3 = calculateDispoPriceWithBuckets(6 * 60, 250, VEHICLE_CATEGORY_ID, 45, settings);
		expect(result3.price).toBe(270); // 180 + 2h × 45€
	});
});
