/**
 * Story 17.10: Zone Fixed Surcharges (Friction Costs) Tests
 * 
 * Tests for calculateZoneSurcharges function that adds parking fees,
 * access fees, and other friction costs to operational cost.
 */

import { describe, it, expect } from "vitest";
import {
	calculateZoneSurcharges,
	type ZoneSurcharges,
} from "../pricing-engine";
import type { ZoneData } from "../../lib/geo-utils";

// Helper to create a minimal zone for testing
function createTestZone(overrides: Partial<ZoneData> = {}): ZoneData {
	return {
		id: "test-zone-id",
		name: "Test Zone",
		code: "TEST",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 48.8566,
		centerLongitude: 2.3522,
		radiusKm: 5,
		isActive: true,
		priceMultiplier: 1.0,
		priority: 0,
		fixedParkingSurcharge: null,
		fixedAccessFee: null,
		surchargeDescription: null,
		...overrides,
	};
}

describe("calculateZoneSurcharges", () => {
	describe("AC3: Basic surcharge calculation", () => {
		it("should calculate pickup zone parking surcharge", () => {
			const pickupZone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
				surchargeDescription: "Parking château",
			});

			const result = calculateZoneSurcharges(pickupZone, null);

			expect(result.pickup).not.toBeNull();
			expect(result.pickup?.parkingSurcharge).toBe(40);
			expect(result.pickup?.accessFee).toBe(0);
			expect(result.pickup?.total).toBe(40);
			expect(result.pickup?.description).toBe("Parking château");
			expect(result.dropoff).toBeNull();
			expect(result.total).toBe(40);
		});

		it("should calculate pickup zone access fee", () => {
			const pickupZone = createTestZone({
				id: "cdg",
				name: "Aéroport CDG",
				code: "CDG",
				fixedAccessFee: 15,
				surchargeDescription: "Frais d'accès aéroport",
			});

			const result = calculateZoneSurcharges(pickupZone, null);

			expect(result.pickup).not.toBeNull();
			expect(result.pickup?.parkingSurcharge).toBe(0);
			expect(result.pickup?.accessFee).toBe(15);
			expect(result.pickup?.total).toBe(15);
			expect(result.total).toBe(15);
		});

		it("should calculate combined parking and access fees", () => {
			const zone = createTestZone({
				id: "special-zone",
				name: "Special Zone",
				code: "SPECIAL",
				fixedParkingSurcharge: 25,
				fixedAccessFee: 10,
				surchargeDescription: "Combined fees",
			});

			const result = calculateZoneSurcharges(zone, null);

			expect(result.pickup?.parkingSurcharge).toBe(25);
			expect(result.pickup?.accessFee).toBe(10);
			expect(result.pickup?.total).toBe(35);
			expect(result.total).toBe(35);
		});
	});

	describe("AC4: Both pickup and dropoff surcharges", () => {
		it("should combine pickup and dropoff surcharges from different zones", () => {
			const pickupZone = createTestZone({
				id: "cdg",
				name: "Aéroport CDG",
				code: "CDG",
				fixedAccessFee: 15,
			});
			const dropoffZone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
			});

			const result = calculateZoneSurcharges(pickupZone, dropoffZone);

			expect(result.pickup?.total).toBe(15);
			expect(result.dropoff?.total).toBe(40);
			expect(result.total).toBe(55);
		});

		it("should include zone metadata in both components", () => {
			const pickupZone = createTestZone({
				id: "cdg",
				name: "Aéroport CDG",
				code: "CDG",
				fixedAccessFee: 15,
			});
			const dropoffZone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
			});

			const result = calculateZoneSurcharges(pickupZone, dropoffZone);

			expect(result.pickup?.zoneId).toBe("cdg");
			expect(result.pickup?.zoneName).toBe("Aéroport CDG");
			expect(result.pickup?.zoneCode).toBe("CDG");
			expect(result.dropoff?.zoneId).toBe("versailles");
			expect(result.dropoff?.zoneName).toBe("Versailles");
			expect(result.dropoff?.zoneCode).toBe("VERSAILLES");
		});
	});

	describe("AC5: No double-counting for same zone", () => {
		it("should not double-count surcharges when pickup and dropoff are same zone", () => {
			const zone = createTestZone({
				id: "cdg",
				name: "Aéroport CDG",
				code: "CDG",
				fixedAccessFee: 15,
				fixedParkingSurcharge: 10,
			});

			const result = calculateZoneSurcharges(zone, zone);

			expect(result.pickup?.total).toBe(25);
			expect(result.dropoff).toBeNull(); // Should be null to avoid double-counting
			expect(result.total).toBe(25); // Not 50
		});

		it("should apply surcharges once for round-trip in same zone", () => {
			const zone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
			});

			const result = calculateZoneSurcharges(zone, zone);

			expect(result.pickup?.total).toBe(40);
			expect(result.dropoff).toBeNull();
			expect(result.total).toBe(40);
		});
	});

	describe("AC9: Null surcharges handling", () => {
		it("should handle null surcharges gracefully", () => {
			const zone = createTestZone({
				id: "paris",
				name: "Paris Centre",
				code: "PARIS_0",
				fixedParkingSurcharge: null,
				fixedAccessFee: null,
			});

			const result = calculateZoneSurcharges(zone, null);

			expect(result.pickup?.parkingSurcharge).toBe(0);
			expect(result.pickup?.accessFee).toBe(0);
			expect(result.pickup?.total).toBe(0);
			expect(result.total).toBe(0);
		});

		it("should handle null pickup zone", () => {
			const dropoffZone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
			});

			const result = calculateZoneSurcharges(null, dropoffZone);

			expect(result.pickup).toBeNull();
			expect(result.dropoff?.total).toBe(40);
			expect(result.total).toBe(40);
		});

		it("should handle both zones null", () => {
			const result = calculateZoneSurcharges(null, null);

			expect(result.pickup).toBeNull();
			expect(result.dropoff).toBeNull();
			expect(result.total).toBe(0);
		});

		it("should handle undefined surcharge values", () => {
			// Create zone without surcharge properties to simulate undefined
			const zone: ZoneData = {
				id: "test",
				name: "Test",
				code: "TEST",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 5,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 0,
				// Intentionally omit surcharge fields to test undefined handling
			};

			const result = calculateZoneSurcharges(zone, null);

			expect(result.pickup?.total).toBe(0);
			expect(result.total).toBe(0);
		});
	});

	describe("Rounding and precision", () => {
		it("should round totals to 2 decimal places", () => {
			const zone = createTestZone({
				id: "test",
				name: "Test",
				code: "TEST",
				fixedParkingSurcharge: 10.333,
				fixedAccessFee: 5.666,
			});

			const result = calculateZoneSurcharges(zone, null);

			// 10.333 + 5.666 = 15.999, rounded to 16.00
			expect(result.pickup?.total).toBe(16);
			expect(result.total).toBe(16);
		});

		it("should handle decimal surcharges correctly", () => {
			const pickupZone = createTestZone({
				id: "zone1",
				name: "Zone 1",
				code: "Z1",
				fixedAccessFee: 12.50,
			});
			const dropoffZone = createTestZone({
				id: "zone2",
				name: "Zone 2",
				code: "Z2",
				fixedParkingSurcharge: 37.50,
			});

			const result = calculateZoneSurcharges(pickupZone, dropoffZone);

			expect(result.pickup?.total).toBe(12.5);
			expect(result.dropoff?.total).toBe(37.5);
			expect(result.total).toBe(50);
		});
	});

	describe("Zone metadata preservation", () => {
		it("should preserve zone description in surcharge component", () => {
			const zone = createTestZone({
				id: "versailles",
				name: "Versailles",
				code: "VERSAILLES",
				fixedParkingSurcharge: 40,
				surchargeDescription: "Parking obligatoire château de Versailles - 2h minimum",
			});

			const result = calculateZoneSurcharges(zone, null);

			expect(result.pickup?.description).toBe(
				"Parking obligatoire château de Versailles - 2h minimum"
			);
		});

		it("should handle null description", () => {
			const zone = createTestZone({
				id: "test",
				name: "Test",
				code: "TEST",
				fixedParkingSurcharge: 10,
				surchargeDescription: null,
			});

			const result = calculateZoneSurcharges(zone, null);

			expect(result.pickup?.description).toBeNull();
		});
	});
});
