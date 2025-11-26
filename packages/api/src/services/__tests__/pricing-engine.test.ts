/**
 * Tests for pricing-engine.ts
 * Tests the Engagement Rule pricing logic for partner contracts
 */

import { describe, expect, it } from "vitest";
import type { ZoneData } from "../../lib/geo-utils";
import {
	calculatePrice,
	type ContactData,
	type OrganizationPricingSettings,
	type PricingRequest,
} from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultPricingSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

const parisZone: ZoneData = {
	id: "zone-paris",
	name: "Paris Center",
	code: "PAR-CTR",
	zoneType: "POLYGON",
	geometry: {
		type: "Polygon",
		coordinates: [
			[
				[2.3, 48.8],
				[2.4, 48.8],
				[2.4, 48.9],
				[2.3, 48.9],
				[2.3, 48.8],
			],
		],
	},
	centerLatitude: null,
	centerLongitude: null,
	radiusKm: null,
	isActive: true,
};

const cdgZone: ZoneData = {
	id: "zone-cdg",
	name: "CDG Airport",
	code: "CDG",
	zoneType: "RADIUS",
	geometry: null,
	centerLatitude: 49.0097,
	centerLongitude: 2.5479,
	radiusKm: 5,
	isActive: true,
};

const zones: ZoneData[] = [parisZone, cdgZone];

// ============================================================================
// Private Client Tests
// ============================================================================

describe("pricing-engine", () => {
	describe("Private Client (Dynamic Pricing)", () => {
		const privateContact: ContactData = {
			id: "contact-private",
			isPartner: false,
			partnerContract: null,
		};

		it("should use dynamic pricing for private clients", () => {
			const request: PricingRequest = {
				contactId: privateContact.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: privateContact,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.price).toBeGreaterThan(0);
			expect(result.internalCost).toBeGreaterThan(0);
			// Dynamic pricing applies target margin but internal cost is calculated separately
			// so the actual margin may vary
			expect(result.marginPercent).toBeGreaterThanOrEqual(0);
			expect(["green", "orange"]).toContain(result.profitabilityIndicator);
			expect(result.matchedGrid).toBeNull();
			expect(result.appliedRules.some(r => r.type === "DYNAMIC_BASE_PRICE")).toBe(true);
		});

		it("should calculate price based on distance and duration", () => {
			const shortTrip: PricingRequest = {
				contactId: privateContact.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 48.86, lng: 2.36 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 5,
				estimatedDurationMinutes: 15,
			};

			const longTrip: PricingRequest = {
				contactId: privateContact.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 50,
				estimatedDurationMinutes: 60,
			};

			const shortResult = calculatePrice(shortTrip, {
				contact: privateContact,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			const longResult = calculatePrice(longTrip, {
				contact: privateContact,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(longResult.price).toBeGreaterThan(shortResult.price);
		});
	});

	// ============================================================================
	// Partner Client Tests - Zone Routes
	// ============================================================================

	describe("Partner Client - Zone Route Matching", () => {
		const partnerWithZoneRoute: ContactData = {
			id: "contact-partner-1",
			isPartner: true,
			partnerContract: {
				id: "contract-1",
				zoneRoutes: [
					{
						zoneRoute: {
							id: "zone-route-1",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 75.0,
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						},
					},
				],
				excursionPackages: [],
				dispoPackages: [],
			},
		};

		it("should use fixed grid price for matching zone route (A to B)", () => {
			const request: PricingRequest = {
				contactId: partnerWithZoneRoute.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithZoneRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(75.0);
			expect(result.matchedGrid?.id).toBe("zone-route-1");
			expect(result.appliedRules.some(r => r.type === "PARTNER_GRID_MATCH" && r.gridType === "ZoneRoute")).toBe(true);
			expect(result.appliedRules.some(r => r.description?.toString().includes("Engagement Rule"))).toBe(true);
		});

		it("should use fixed grid price for matching zone route (B to A - bidirectional)", () => {
			const request: PricingRequest = {
				contactId: partnerWithZoneRoute.id,
				pickup: { lat: 49.01, lng: 2.55 }, // CDG
				dropoff: { lat: 48.85, lng: 2.35 }, // Paris
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithZoneRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(75.0);
			expect(result.matchedGrid?.id).toBe("zone-route-1");
		});

		it("should fallback to dynamic pricing for non-matching vehicle category", () => {
			const request: PricingRequest = {
				contactId: partnerWithZoneRoute.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-2", // Different category
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithZoneRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.matchedGrid).toBeNull();
			expect(result.appliedRules.some(r => r.type === "DYNAMIC_BASE_PRICE")).toBe(true);
		});

		it("should fallback to dynamic pricing for zones outside contract", () => {
			const request: PricingRequest = {
				contactId: partnerWithZoneRoute.id,
				pickup: { lat: 45.0, lng: 5.0 }, // Outside all zones
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 400,
				estimatedDurationMinutes: 240,
			};

			const result = calculatePrice(request, {
				contact: partnerWithZoneRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.matchedGrid).toBeNull();
		});
	});

	// ============================================================================
	// Partner Client Tests - Excursion Packages
	// ============================================================================

	describe("Partner Client - Excursion Package Matching", () => {
		const normandyZone: ZoneData = {
			id: "zone-normandy",
			name: "Normandy",
			code: "NORMANDY",
			zoneType: "POLYGON",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[-1.0, 49.0],
						[0.5, 49.0],
						[0.5, 49.5],
						[-1.0, 49.5],
						[-1.0, 49.0],
					],
				],
			},
			centerLatitude: null,
			centerLongitude: null,
			radiusKm: null,
			isActive: true,
		};

		const zonesWithNormandy = [...zones, normandyZone];

		const partnerWithExcursion: ContactData = {
			id: "contact-partner-2",
			isPartner: true,
			partnerContract: {
				id: "contract-2",
				zoneRoutes: [],
				excursionPackages: [
					{
						excursionPackage: {
							id: "excursion-1",
							name: "Normandy Day Trip",
							originZoneId: "zone-paris",
							destinationZoneId: "zone-normandy",
							vehicleCategoryId: "vehicle-cat-1",
							price: 450.0,
							isActive: true,
							originZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							destinationZone: { id: "zone-normandy", name: "Normandy", code: "NORMANDY" },
						},
					},
				],
				dispoPackages: [],
			},
		};

		it("should use excursion package price for matching excursion trip", () => {
			const request: PricingRequest = {
				contactId: partnerWithExcursion.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.2, lng: -0.3 }, // Normandy
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "excursion",
				estimatedDistanceKm: 200,
				estimatedDurationMinutes: 480,
			};

			const result = calculatePrice(request, {
				contact: partnerWithExcursion,
				zones: zonesWithNormandy,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(450.0);
			expect(result.matchedGrid?.id).toBe("excursion-1");
			expect(result.appliedRules.some(r => r.type === "PARTNER_GRID_MATCH" && r.gridType === "ExcursionPackage")).toBe(true);
			expect(result.appliedRules.some(r => r.description?.toString().includes("Engagement Rule"))).toBe(true);
		});

		it("should fallback to dynamic for non-excursion trip type", () => {
			const request: PricingRequest = {
				contactId: partnerWithExcursion.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.2, lng: -0.3 }, // Normandy
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer", // Not excursion
				estimatedDistanceKm: 200,
				estimatedDurationMinutes: 480,
			};

			const result = calculatePrice(request, {
				contact: partnerWithExcursion,
				zones: zonesWithNormandy,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
		});
	});

	// ============================================================================
	// Partner Client Tests - Dispo Packages
	// ============================================================================

	describe("Partner Client - Dispo Package Matching", () => {
		const partnerWithDispo: ContactData = {
			id: "contact-partner-3",
			isPartner: true,
			partnerContract: {
				id: "contract-3",
				zoneRoutes: [],
				excursionPackages: [],
				dispoPackages: [
					{
						dispoPackage: {
							id: "dispo-1",
							name: "Half Day Disposal",
							vehicleCategoryId: "vehicle-cat-1",
							basePrice: 350.0,
							isActive: true,
						},
					},
				],
			},
		};

		it("should use dispo package price for matching dispo trip", () => {
			const request: PricingRequest = {
				contactId: partnerWithDispo.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 48.85, lng: 2.35 }, // Same location for dispo
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "dispo",
				estimatedDurationMinutes: 240,
			};

			const result = calculatePrice(request, {
				contact: partnerWithDispo,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(350.0);
			expect(result.matchedGrid?.id).toBe("dispo-1");
			expect(result.appliedRules.some(r => r.type === "PARTNER_GRID_MATCH" && r.gridType === "DispoPackage")).toBe(true);
			expect(result.appliedRules.some(r => r.description?.toString().includes("Engagement Rule"))).toBe(true);
		});

		it("should fallback to dynamic for non-dispo trip type", () => {
			const request: PricingRequest = {
				contactId: partnerWithDispo.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer", // Not dispo
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithDispo,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
		});
	});

	// ============================================================================
	// Profitability Indicator Tests
	// ============================================================================

	describe("Profitability Indicator", () => {
		const partnerWithCheapRoute: ContactData = {
			id: "contact-partner-cheap",
			isPartner: true,
			partnerContract: {
				id: "contract-cheap",
				zoneRoutes: [
					{
						zoneRoute: {
							id: "zone-route-cheap",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 30.0, // Very cheap - below cost
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						},
					},
				],
				excursionPackages: [],
				dispoPackages: [],
			},
		};

		it("should show RED indicator for negative margin", () => {
			const request: PricingRequest = {
				contactId: partnerWithCheapRoute.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithCheapRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			// The fixed price is 30€ but the internal cost is higher
			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(30.0);
			expect(result.marginPercent).toBeLessThan(0);
			expect(result.profitabilityIndicator).toBe("red");
			// Engagement rule still applies even with negative margin
			expect(result.appliedRules.some(r => r.description?.toString().includes("Engagement Rule"))).toBe(true);
		});

		it("should show ORANGE indicator for low margin", () => {
			const partnerWithLowMarginRoute: ContactData = {
				id: "contact-partner-low",
				isPartner: true,
				partnerContract: {
					id: "contract-low",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "zone-route-low",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 85.0, // Low margin (cost is 75€ for 30km at 2.5€/km)
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			const request: PricingRequest = {
				contactId: partnerWithLowMarginRoute.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithLowMarginRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			// With 85€ price and 75€ cost (30km * 2.5€/km), margin is ~11.76% (below 20% target)
			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.marginPercent).toBeGreaterThanOrEqual(0);
			expect(result.marginPercent).toBeLessThan(20);
			expect(result.profitabilityIndicator).toBe("orange");
		});

		it("should show GREEN indicator for good margin", () => {
			const partnerWithGoodRoute: ContactData = {
				id: "contact-partner-good",
				isPartner: true,
				partnerContract: {
					id: "contract-good",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "zone-route-good",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 100.0, // Good margin
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			const request: PricingRequest = {
				contactId: partnerWithGoodRoute.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithGoodRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			// With 100€ price and ~50€ cost, margin is ~50% (above 20% target)
			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.marginPercent).toBeGreaterThanOrEqual(20);
			expect(result.profitabilityIndicator).toBe("green");
		});
	});

	// ============================================================================
	// Direction Tests
	// ============================================================================

	describe("Zone Route Direction", () => {
		const partnerWithOneWayRoute: ContactData = {
			id: "contact-partner-oneway",
			isPartner: true,
			partnerContract: {
				id: "contract-oneway",
				zoneRoutes: [
					{
						zoneRoute: {
							id: "zone-route-oneway",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 75.0,
							direction: "A_TO_B", // One-way only
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						},
					},
				],
				excursionPackages: [],
				dispoPackages: [],
			},
		};

		it("should match A_TO_B route in correct direction", () => {
			const request: PricingRequest = {
				contactId: partnerWithOneWayRoute.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris (A)
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG (B)
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithOneWayRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.price).toBe(75.0);
		});

		it("should NOT match A_TO_B route in reverse direction", () => {
			const request: PricingRequest = {
				contactId: partnerWithOneWayRoute.id,
				pickup: { lat: 49.01, lng: 2.55 }, // CDG (B)
				dropoff: { lat: 48.85, lng: 2.35 }, // Paris (A)
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithOneWayRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.matchedGrid).toBeNull();
		});
	});
});
