/**
 * Tests for pricing-engine.ts
 * Tests the Engagement Rule pricing logic for partner contracts
 */

import { describe, expect, it } from "vitest";
import type { ZoneData } from "../../lib/geo-utils";
import {
	calculatePrice,
	calculateFuelCost,
	calculateTollCost,
	calculateWearCost,
	calculateDriverCost,
	calculateCostBreakdown,
	calculateInternalCost,
	DEFAULT_COST_PARAMETERS,
	// Story 4.4: Manual override functions
	validatePriceOverride,
	recalculateProfitability,
	applyPriceOverride,
	// Story 4.7: Profitability indicator functions
	calculateProfitabilityIndicator,
	getProfitabilityIndicatorData,
	getProfitabilityLabel,
	getProfitabilityDescription,
	getThresholdsFromSettings,
	DEFAULT_PROFITABILITY_THRESHOLDS,
	// Story 17.2: Zone multiplier aggregation functions
	applyZoneMultiplier,
	calculateEffectiveZoneMultiplier,
	type ZoneMultiplierAggregationStrategy,
	type AdvancedRateData,
	type AppliedMultiplierRule,
	type AppliedRule,
	type ContactData,
	type DynamicBaseCalculationRule,
	type OrganizationPricingSettings,
	type PricingRequest,
	type PricingResult,
	type ProfitabilityThresholds,
	type SeasonalMultiplierData,
} from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultPricingSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

/**
 * Story 14.5: Helper to create a legacy zone route with all required fields
 * This ensures backward compatibility with existing tests
 */
function createLegacyZoneRoute(config: {
	id: string;
	fromZoneId: string;
	toZoneId: string;
	vehicleCategoryId: string;
	fixedPrice: number;
	direction: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
	isActive: boolean;
	fromZone: { id: string; name: string; code: string };
	toZone: { id: string; name: string; code: string };
}) {
	return {
		id: config.id,
		fromZoneId: config.fromZoneId,
		toZoneId: config.toZoneId,
		// Story 14.5: Required multi-zone fields with legacy defaults
		originType: "ZONES" as const,
		destinationType: "ZONES" as const,
		originZones: [],
		destinationZones: [],
		vehicleCategoryId: config.vehicleCategoryId,
		fixedPrice: config.fixedPrice,
		direction: config.direction,
		isActive: config.isActive,
		fromZone: config.fromZone,
		toZone: config.toZone,
	};
}

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
			expect(result.appliedRules.some(r => r.type === "DYNAMIC_BASE_CALCULATION")).toBe(true);
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
						zoneRoute: createLegacyZoneRoute({
							id: "zone-route-1",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 75.0,
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						}),
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
			// Story 12.2: Changed from PARTNER_GRID_MATCH to CATALOG_PRICE
			expect(result.appliedRules.some(r => r.type === "CATALOG_PRICE" && r.gridType === "ZoneRoute")).toBe(true);
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
			expect(result.appliedRules.some(r => r.type === "DYNAMIC_BASE_CALCULATION")).toBe(true);
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
			// Story 12.2: Changed from PARTNER_GRID_MATCH to CATALOG_PRICE
			expect(result.appliedRules.some(r => r.type === "CATALOG_PRICE" && r.gridType === "ExcursionPackage")).toBe(true);
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
			// Story 12.2: Changed from PARTNER_GRID_MATCH to CATALOG_PRICE
			expect(result.appliedRules.some(r => r.type === "CATALOG_PRICE" && r.gridType === "DispoPackage")).toBe(true);
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
						zoneRoute: createLegacyZoneRoute({
							id: "zone-route-cheap",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 30.0, // Very cheap - below cost
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						}),
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
							zoneRoute: createLegacyZoneRoute({
								id: "zone-route-low",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								// Story 4.2: With new cost calculation (30km, 45min):
								// fuel: 30 × 0.08 × 1.80 = 4.32
								// tolls: 30 × 0.15 = 4.50
								// wear: 30 × 0.10 = 3.00
								// driver: 0.75 × 25 = 18.75
								// Total: 30.57€
								// For 10% margin: price = 30.57 / 0.90 ≈ 34€
								fixedPrice: 34.0, // Low margin (~10%)
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
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

			// With 34€ price and ~30.57€ cost, margin is ~10% (below 20% target)
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
							zoneRoute: createLegacyZoneRoute({
								id: "zone-route-good",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 100.0, // Good margin
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
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
						zoneRoute: createLegacyZoneRoute({
							id: "zone-route-oneway",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 75.0,
							direction: "A_TO_B", // One-way only
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						}),
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

	// ============================================================================
	// Story 3.5: Fallback Reason and Grid Search Details Tests
	// ============================================================================

	describe("Fallback Reason (Story 3.5)", () => {
		const privateContact: ContactData = {
			id: "contact-private",
			isPartner: false,
			partnerContract: null,
		};

		const partnerNoContract: ContactData = {
			id: "contact-partner-no-contract",
			isPartner: true,
			partnerContract: null,
		};

		const partnerWithRoutes: ContactData = {
			id: "contact-partner-routes",
			isPartner: true,
			partnerContract: {
				id: "contract-routes",
				zoneRoutes: [
					{
						zoneRoute: createLegacyZoneRoute({
							id: "route-paris-cdg",
							fromZoneId: "zone-paris",
							toZoneId: "zone-cdg",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 75.0,
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
						}),
					},
					{
						zoneRoute: createLegacyZoneRoute({
							id: "route-paris-orly",
							fromZoneId: "zone-paris",
							toZoneId: "zone-orly",
							vehicleCategoryId: "vehicle-cat-1",
							fixedPrice: 65.0,
							direction: "BIDIRECTIONAL",
							isActive: true,
							fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							toZone: { id: "zone-orly", name: "Orly Airport", code: "ORLY" },
						}),
					},
				],
				excursionPackages: [],
				dispoPackages: [],
			},
		};

		it("should return PRIVATE_CLIENT fallback reason for non-partner", () => {
			const request: PricingRequest = {
				contactId: privateContact.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
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
			expect(result.fallbackReason).toBe("PRIVATE_CLIENT");
			expect(result.gridSearchDetails).toBeNull();
			expect(result.appliedRules.some(r => r.type === "PRIVATE_CLIENT")).toBe(true);
		});

		it("should return NO_CONTRACT fallback reason for partner without contract", () => {
			const request: PricingRequest = {
				contactId: partnerNoContract.id,
				pickup: { lat: 48.85, lng: 2.35 },
				dropoff: { lat: 49.01, lng: 2.55 },
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerNoContract,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.fallbackReason).toBe("NO_CONTRACT");
			expect(result.gridSearchDetails).toBeNull();
			expect(result.appliedRules.some(r => r.type === "NO_CONTRACT")).toBe(true);
		});

		it("should return NO_ZONE_MATCH when pickup is outside all zones", () => {
			const request: PricingRequest = {
				contactId: partnerWithRoutes.id,
				pickup: { lat: 45.0, lng: 5.0 }, // Outside all zones (Lyon area)
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 400,
				estimatedDurationMinutes: 240,
			};

			const result = calculatePrice(request, {
				contact: partnerWithRoutes,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.fallbackReason).toBe("NO_ZONE_MATCH");
			expect(result.gridSearchDetails).not.toBeNull();
			expect(result.gridSearchDetails?.pickupZone).toBeNull();
		});

		it("should return NO_ROUTE_MATCH when zones exist but no matching route", () => {
			// Create a zone that exists but has no route in the contract
			const versaillesZone: ZoneData = {
				id: "zone-versailles",
				name: "Versailles",
				code: "VERS",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8049,
				centerLongitude: 2.1204,
				radiusKm: 5,
				isActive: true,
			};

			const zonesWithVersailles = [...zones, versaillesZone];

			const request: PricingRequest = {
				contactId: partnerWithRoutes.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 48.8049, lng: 2.1204 }, // Versailles
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 25,
				estimatedDurationMinutes: 40,
			};

			const result = calculatePrice(request, {
				contact: partnerWithRoutes,
				zones: zonesWithVersailles,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.fallbackReason).toBe("NO_ROUTE_MATCH");
			expect(result.gridSearchDetails).not.toBeNull();
			expect(result.gridSearchDetails?.pickupZone?.code).toBe("PAR-CTR");
			expect(result.gridSearchDetails?.dropoffZone?.code).toBe("VERS");
		});

		it("should include grid search details with routes checked", () => {
			const versaillesZone: ZoneData = {
				id: "zone-versailles",
				name: "Versailles",
				code: "VERS",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8049,
				centerLongitude: 2.1204,
				radiusKm: 5,
				isActive: true,
			};

			const zonesWithVersailles = [...zones, versaillesZone];

			const request: PricingRequest = {
				contactId: partnerWithRoutes.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 48.8049, lng: 2.1204 }, // Versailles
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 25,
				estimatedDurationMinutes: 40,
			};

			const result = calculatePrice(request, {
				contact: partnerWithRoutes,
				zones: zonesWithVersailles,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.gridSearchDetails).not.toBeNull();
			expect(result.gridSearchDetails?.routesChecked.length).toBe(2);
			expect(result.gridSearchDetails?.routesChecked[0].rejectionReason).toBe("ZONE_MISMATCH");
			expect(result.appliedRules.some(r => r.type === "GRID_SEARCH_ATTEMPTED")).toBe(true);
		});

		it("should return null fallbackReason when grid matches", () => {
			const request: PricingRequest = {
				contactId: partnerWithRoutes.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithRoutes,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("FIXED_GRID");
			expect(result.fallbackReason).toBeNull();
			expect(result.gridSearchDetails).toBeNull();
		});
	});

	// ============================================================================
	// Story 3.5: PRD Scenarios Tests
	// ============================================================================

	describe("PRD Scenarios (Story 3.5)", () => {
		// Scenario 1: Intra-Zone Central (Paris → Paris)
		describe("Intra-Zone Central Scenario", () => {
			const partnerWithIntraZoneRoute: ContactData = {
				id: "contact-intra-zone",
				isPartner: true,
				partnerContract: {
					id: "contract-intra",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-paris-intra",
								fromZoneId: "zone-paris",
								toZoneId: "zone-paris", // Same zone (intra-zone)
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 45.0, // Flat rate for intra-zone
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match intra-zone route when pickup and dropoff are in same zone", () => {
				const request: PricingRequest = {
					contactId: partnerWithIntraZoneRoute.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris center
					dropoff: { lat: 48.86, lng: 2.36 }, // Paris center (different location, same zone)
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 3,
					estimatedDurationMinutes: 15,
				};

				const result = calculatePrice(request, {
					contact: partnerWithIntraZoneRoute,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(45.0);
				expect(result.matchedGrid?.id).toBe("route-paris-intra");
				expect(result.fallbackReason).toBeNull();
			});
		});

		// Scenario 2: Radial Transfer (Paris ↔ CDG)
		describe("Radial Transfer Scenario", () => {
			const partnerWithRadialRoute: ContactData = {
				id: "contact-radial",
				isPartner: true,
				partnerContract: {
					id: "contract-radial",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-paris-cdg-radial",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 75.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match radial route Paris → CDG", () => {
				const request: PricingRequest = {
					contactId: partnerWithRadialRoute.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithRadialRoute,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(75.0);
			});

			it("should match radial route CDG → Paris (bidirectional)", () => {
				const request: PricingRequest = {
					contactId: partnerWithRadialRoute.id,
					pickup: { lat: 49.01, lng: 2.55 }, // CDG
					dropoff: { lat: 48.85, lng: 2.35 }, // Paris
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithRadialRoute,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(75.0);
			});
		});

		// Scenario 3: Circular Suburban (Suburb A → Suburb B)
		describe("Circular Suburban Scenario", () => {
			// Define suburban zones
			const suburbAZone: ZoneData = {
				id: "zone-suburb-a",
				name: "Argenteuil",
				code: "ARG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.95,
				centerLongitude: 2.25,
				radiusKm: 3,
				isActive: true,
			};

			const suburbBZone: ZoneData = {
				id: "zone-suburb-b",
				name: "Bobigny",
				code: "BOB",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.90,
				centerLongitude: 2.45,
				radiusKm: 3,
				isActive: true,
			};

			const zonesWithSuburbs = [...zones, suburbAZone, suburbBZone];

			// Partner with only Paris-CDG route (no suburban routes)
			const partnerWithoutSuburbanRoutes: ContactData = {
				id: "contact-no-suburban",
				isPartner: true,
				partnerContract: {
					id: "contract-no-suburban",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-paris-cdg-only",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 75.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should fallback to dynamic for suburban-to-suburban trip without route", () => {
				const request: PricingRequest = {
					contactId: partnerWithoutSuburbanRoutes.id,
					pickup: { lat: 48.95, lng: 2.25 }, // Argenteuil (Suburb A)
					dropoff: { lat: 48.90, lng: 2.45 }, // Bobigny (Suburb B)
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 20,
					estimatedDurationMinutes: 35,
				};

				const result = calculatePrice(request, {
					contact: partnerWithoutSuburbanRoutes,
					zones: zonesWithSuburbs,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				expect(result.fallbackReason).toBe("NO_ROUTE_MATCH");
				expect(result.gridSearchDetails).not.toBeNull();
				expect(result.gridSearchDetails?.pickupZone?.code).toBe("ARG");
				expect(result.gridSearchDetails?.dropoffZone?.code).toBe("BOB");
				expect(result.gridSearchDetails?.routesChecked.length).toBeGreaterThan(0);
			});
		});

		// Scenario 4: Versailles Exception
		describe("Versailles Exception Scenario", () => {
			const versaillesZone: ZoneData = {
				id: "zone-versailles",
				name: "Versailles",
				code: "VERS",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8049,
				centerLongitude: 2.1204,
				radiusKm: 5,
				isActive: true,
			};

			const zonesWithVersailles = [...zones, versaillesZone];

			const partnerWithVersaillesRoute: ContactData = {
				id: "contact-versailles",
				isPartner: true,
				partnerContract: {
					id: "contract-versailles",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-paris-versailles",
								fromZoneId: "zone-paris",
								toZoneId: "zone-versailles",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 95.0, // Special Versailles rate
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-versailles", name: "Versailles", code: "VERS" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match Versailles route when configured", () => {
				const request: PricingRequest = {
					contactId: partnerWithVersaillesRoute.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris
					dropoff: { lat: 48.8049, lng: 2.1204 }, // Versailles
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 25,
					estimatedDurationMinutes: 40,
				};

				const result = calculatePrice(request, {
					contact: partnerWithVersaillesRoute,
					zones: zonesWithVersailles,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(95.0);
				expect(result.matchedGrid?.id).toBe("route-paris-versailles");
				expect(result.fallbackReason).toBeNull();
			});

			it("should fallback when Versailles route not in contract", () => {
				const partnerWithoutVersailles: ContactData = {
					id: "contact-no-versailles",
					isPartner: true,
					partnerContract: {
						id: "contract-no-versailles",
						zoneRoutes: [
							{
								zoneRoute: createLegacyZoneRoute({
									id: "route-paris-cdg-only",
									fromZoneId: "zone-paris",
									toZoneId: "zone-cdg",
									vehicleCategoryId: "vehicle-cat-1",
									fixedPrice: 75.0,
									direction: "BIDIRECTIONAL",
									isActive: true,
									fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
									toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
								}),
							},
						],
						excursionPackages: [],
						dispoPackages: [],
					},
				};

				const request: PricingRequest = {
					contactId: partnerWithoutVersailles.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris
					dropoff: { lat: 48.8049, lng: 2.1204 }, // Versailles
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 25,
					estimatedDurationMinutes: 40,
				};

				const result = calculatePrice(request, {
					contact: partnerWithoutVersailles,
					zones: zonesWithVersailles,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				expect(result.fallbackReason).toBe("NO_ROUTE_MATCH");
			});
		});
	});

	// ============================================================================
	// Story 3.5: Search Details Rejection Reasons Tests
	// ============================================================================

	describe("Search Details Rejection Reasons (Story 3.5)", () => {
		it("should report CATEGORY_MISMATCH when vehicle category differs", () => {
			const partnerWithRoute: ContactData = {
				id: "contact-cat-mismatch",
				isPartner: true,
				partnerContract: {
					id: "contract-cat",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-berline-only",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-berline",
								fixedPrice: 75.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			const request: PricingRequest = {
				contactId: partnerWithRoute.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-van", // Different category
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.gridSearchDetails?.routesChecked[0].rejectionReason).toBe("CATEGORY_MISMATCH");
		});

		it("should report DIRECTION_MISMATCH for one-way route in wrong direction", () => {
			const partnerWithOneWay: ContactData = {
				id: "contact-direction",
				isPartner: true,
				partnerContract: {
					id: "contract-direction",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-one-way",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 75.0,
								direction: "A_TO_B", // One-way only
								isActive: true,
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			const request: PricingRequest = {
				contactId: partnerWithOneWay.id,
				pickup: { lat: 49.01, lng: 2.55 }, // CDG (trying reverse direction)
				dropoff: { lat: 48.85, lng: 2.35 }, // Paris
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithOneWay,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.gridSearchDetails?.routesChecked[0].rejectionReason).toBe("DIRECTION_MISMATCH");
		});

		it("should report INACTIVE for inactive routes", () => {
			const partnerWithInactiveRoute: ContactData = {
				id: "contact-inactive",
				isPartner: true,
				partnerContract: {
					id: "contract-inactive",
					zoneRoutes: [
						{
							zoneRoute: createLegacyZoneRoute({
								id: "route-inactive",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 75.0,
								direction: "BIDIRECTIONAL",
								isActive: false, // Inactive
								fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
								toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
							}),
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			const request: PricingRequest = {
				contactId: partnerWithInactiveRoute.id,
				pickup: { lat: 48.85, lng: 2.35 }, // Paris
				dropoff: { lat: 49.01, lng: 2.55 }, // CDG
				vehicleCategoryId: "vehicle-cat-1",
				tripType: "transfer",
				estimatedDistanceKm: 30,
				estimatedDurationMinutes: 45,
			};

			const result = calculatePrice(request, {
				contact: partnerWithInactiveRoute,
				zones,
				pricingSettings: defaultPricingSettings,
			});

			expect(result.pricingMode).toBe("DYNAMIC");
			expect(result.gridSearchDetails?.routesChecked[0].rejectionReason).toBe("INACTIVE");
		});
	});

	// ============================================================================
	// Story 4.1: Base Dynamic Price Calculation Tests
	// ============================================================================

	describe("Dynamic Base Price Calculation (Story 4.1)", () => {
		const privateContact: ContactData = {
			id: "contact-private-4-1",
			isPartner: false,
			partnerContract: null,
		};

		describe("AC1: Distance-Based Price Wins", () => {
			it("should use distance-based price when it exceeds duration-based price", () => {
				// 30km, 45min trip
				// distanceBasedPrice = 30 × 2.5 = 75
				// durationBasedPrice = 0.75 × 45 = 33.75
				// basePrice = max(75, 33.75) = 75
				// priceWithMargin = 75 × 1.2 = 90
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
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
				expect(result.price).toBe(90); // 75 × 1.2 = 90

				// Check appliedRules contains DYNAMIC_BASE_CALCULATION with correct details
				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION");
				expect(calcRule).toBeDefined();
				expect(calcRule?.calculation).toEqual({
					distanceBasedPrice: 75,
					durationBasedPrice: 33.75,
					selectedMethod: "distance",
					basePrice: 75,
					priceWithMargin: 90,
				});
				expect(calcRule?.inputs).toEqual({
					distanceKm: 30,
					durationMinutes: 45,
					baseRatePerKm: 2.5,
					baseRatePerHour: 45,
					targetMarginPercent: 20,
				});
			});
		});

		describe("AC2: Duration-Based Price Wins (Traffic)", () => {
			it("should use duration-based price when it exceeds distance-based price", () => {
				// 10km, 2h trip (traffic jam)
				// distanceBasedPrice = 10 × 2.5 = 25
				// durationBasedPrice = 2 × 45 = 90
				// basePrice = max(25, 90) = 90
				// priceWithMargin = 90 × 1.2 = 108
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 48.86, lng: 2.36 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 10,
					estimatedDurationMinutes: 120, // 2 hours in traffic
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				expect(result.price).toBe(108); // 90 × 1.2 = 108

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION") as DynamicBaseCalculationRule | undefined;
				expect(calcRule).toBeDefined();
				expect(calcRule?.calculation.selectedMethod).toBe("duration");
				expect(calcRule?.calculation.distanceBasedPrice).toBe(25);
				expect(calcRule?.calculation.durationBasedPrice).toBe(90);
				expect(calcRule?.calculation.basePrice).toBe(90);
			});
		});

		describe("AC3: Applied Rules Documentation", () => {
			it("should include DYNAMIC_BASE_CALCULATION with all required fields", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 25,
					estimatedDurationMinutes: 40,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION");
				expect(calcRule).toBeDefined();

				// Check inputs are present
				expect(calcRule?.inputs).toHaveProperty("distanceKm");
				expect(calcRule?.inputs).toHaveProperty("durationMinutes");
				expect(calcRule?.inputs).toHaveProperty("baseRatePerKm");
				expect(calcRule?.inputs).toHaveProperty("baseRatePerHour");
				expect(calcRule?.inputs).toHaveProperty("targetMarginPercent");

				// Check calculation details are present
				expect(calcRule?.calculation).toHaveProperty("distanceBasedPrice");
				expect(calcRule?.calculation).toHaveProperty("durationBasedPrice");
				expect(calcRule?.calculation).toHaveProperty("selectedMethod");
				expect(calcRule?.calculation).toHaveProperty("basePrice");
				expect(calcRule?.calculation).toHaveProperty("priceWithMargin");

				// Check description mentions selected method
				expect(calcRule?.description).toContain("max(distance, duration)");
			});
		});

		describe("AC4: Default Rates Fallback", () => {
			it("should use default rates when organization has no pricing settings", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 20,
					estimatedDurationMinutes: 30,
				};

				// Use default settings (same as DEFAULT_PRICING_SETTINGS)
				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: {
						baseRatePerKm: 2.5,
						baseRatePerHour: 45.0,
						targetMarginPercent: 20.0,
					},
				});

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION") as DynamicBaseCalculationRule | undefined;
				expect(calcRule?.inputs.baseRatePerKm).toBe(2.5);
				expect(calcRule?.inputs.baseRatePerHour).toBe(45.0);
			});
		});

		describe("Edge Cases", () => {
			it("should handle equal distance and duration prices (distance wins)", () => {
				// When prices are equal, distance method should be selected
				// 18km, 24min → distance = 18 × 2.5 = 45, duration = 0.4 × 45 = 18
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 18,
					estimatedDurationMinutes: 60, // 1 hour → 45 EUR
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION") as DynamicBaseCalculationRule | undefined;
				// 18 × 2.5 = 45, 1 × 45 = 45 → equal, distance wins
				expect(calcRule?.calculation.distanceBasedPrice).toBe(45);
				expect(calcRule?.calculation.durationBasedPrice).toBe(45);
				expect(calcRule?.calculation.selectedMethod).toBe("distance");
			});

			it("should handle very short trips", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 48.851, lng: 2.351 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 1,
					estimatedDurationMinutes: 5,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				expect(result.price).toBeGreaterThan(0);

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION") as DynamicBaseCalculationRule | undefined;
				// 1 × 2.5 = 2.5, 5/60 × 45 = 3.75 → duration wins
				expect(calcRule?.calculation.distanceBasedPrice).toBe(2.5);
				expect(calcRule?.calculation.durationBasedPrice).toBe(3.75);
				expect(calcRule?.calculation.selectedMethod).toBe("duration");
			});

			it("should handle long highway trips", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 45.76, lng: 4.83 }, // Lyon
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 450,
					estimatedDurationMinutes: 270, // 4.5 hours
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");

				const calcRule = result.appliedRules.find(r => r.type === "DYNAMIC_BASE_CALCULATION") as DynamicBaseCalculationRule | undefined;
				// 450 × 2.5 = 1125, 4.5 × 45 = 202.5 → distance wins
				expect(calcRule?.calculation.distanceBasedPrice).toBe(1125);
				expect(calcRule?.calculation.durationBasedPrice).toBe(202.5);
				expect(calcRule?.calculation.selectedMethod).toBe("distance");
				expect(calcRule?.calculation.basePrice).toBe(1125);
				expect(calcRule?.calculation.priceWithMargin).toBe(1350); // 1125 × 1.2
			});
		});
	});

	// ============================================================================
	// Story 4.2: Operational Cost Components Tests
	// ============================================================================

	describe("Story 4.2: Operational Cost Components", () => {
		describe("Individual Cost Calculations", () => {
			it("should calculate fuel cost correctly", () => {
				// Formula: distanceKm × (consumptionL100km / 100) × pricePerLiter
				// 50km × (8.0 / 100) × 1.789 (DIESEL default) = 50 × 0.08 × 1.789 = 7.16
				const result = calculateFuelCost(50, 8.0, "DIESEL");
				
				expect(result.amount).toBe(7.16);
				expect(result.distanceKm).toBe(50);
				expect(result.consumptionL100km).toBe(8.0);
				expect(result.pricePerLiter).toBe(1.789);
				expect(result.fuelType).toBe("DIESEL");
			});

			it("should calculate toll cost correctly", () => {
				// Formula: distanceKm × ratePerKm
				// 50km × 0.15 = 7.50
				const result = calculateTollCost(50, 0.15);
				
				expect(result.amount).toBe(7.5);
				expect(result.distanceKm).toBe(50);
				expect(result.ratePerKm).toBe(0.15);
			});

			it("should calculate wear cost correctly", () => {
				// Formula: distanceKm × ratePerKm
				// 50km × 0.10 = 5.00
				const result = calculateWearCost(50, 0.10);
				
				expect(result.amount).toBe(5);
				expect(result.distanceKm).toBe(50);
				expect(result.ratePerKm).toBe(0.10);
			});

			it("should calculate driver cost correctly", () => {
				// Formula: (durationMinutes / 60) × hourlyRate
				// 60min × (25.0 / 60) = 1.0 × 25.0 = 25.00
				const result = calculateDriverCost(60, 25.0);
				
				expect(result.amount).toBe(25);
				expect(result.durationMinutes).toBe(60);
				expect(result.hourlyRate).toBe(25.0);
			});

			it("should calculate driver cost for partial hours", () => {
				// 90min = 1.5 hours → 1.5 × 25.0 = 37.50
				const result = calculateDriverCost(90, 25.0);
				
				expect(result.amount).toBe(37.5);
			});
		});

		describe("Complete Cost Breakdown", () => {
			it("should calculate complete cost breakdown with default parameters", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
					// No cost parameters - should use defaults
				};

				const breakdown = calculateCostBreakdown(50, 60, settings);

				// fuel: 50 × 0.08 × 1.80 = 7.20
				expect(breakdown.fuel.amount).toBe(7.2);
				// tolls: 50 × 0.15 = 7.50
				expect(breakdown.tolls.amount).toBe(7.5);
				// wear: 50 × 0.10 = 5.00
				expect(breakdown.wear.amount).toBe(5);
				// driver: 1.0 × 25.0 = 25.00
				expect(breakdown.driver.amount).toBe(25);
				// parking: 0 (default)
				expect(breakdown.parking.amount).toBe(0);
				// total: 7.20 + 7.50 + 5.00 + 25.00 + 0 = 44.70
				expect(breakdown.total).toBe(44.7);
			});

			it("should calculate cost breakdown with custom parameters (AC3)", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
					// Custom cost parameters (e.g., for a van)
					fuelConsumptionL100km: 10.0,
					fuelPricePerLiter: 1.90,
					tollCostPerKm: 0.20,
					wearCostPerKm: 0.15,
					driverHourlyCost: 30.0,
				};

				const breakdown = calculateCostBreakdown(50, 60, settings);

				// fuel: 50 × 0.10 × 1.90 = 9.50
				expect(breakdown.fuel.amount).toBe(9.5);
				// tolls: 50 × 0.20 = 10.00
				expect(breakdown.tolls.amount).toBe(10);
				// wear: 50 × 0.15 = 7.50
				expect(breakdown.wear.amount).toBe(7.5);
				// driver: 1.0 × 30.0 = 30.00
				expect(breakdown.driver.amount).toBe(30);
				// total: 9.50 + 10.00 + 7.50 + 30.00 + 0 = 57.00
				expect(breakdown.total).toBe(57);
			});

			it("should include parking cost when provided", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
				};

				const breakdown = calculateCostBreakdown(50, 60, settings, 40, "Versailles parking");

				expect(breakdown.parking.amount).toBe(40);
				expect(breakdown.parking.description).toBe("Versailles parking");
				// total should include parking
				expect(breakdown.total).toBe(44.7 + 40); // 84.70
			});
		});

		describe("Internal Cost Calculation", () => {
			it("should calculate internal cost using cost breakdown", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
				};

				const internalCost = calculateInternalCost(50, 60, settings);

				// Should match the breakdown total
				expect(internalCost).toBe(44.7);
			});
		});

		describe("TripAnalysis in Pricing Result", () => {
			const privateContact: ContactData = {
				id: "contact-private",
				isPartner: false,
				partnerContract: null,
			};

			it("should include tripAnalysis with costBreakdown in dynamic pricing (AC2)", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 50,
					estimatedDurationMinutes: 60,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				// Check tripAnalysis exists
				expect(result.tripAnalysis).toBeDefined();
				expect(result.tripAnalysis.costBreakdown).toBeDefined();

				// Check cost breakdown components
				const breakdown = result.tripAnalysis.costBreakdown;
				expect(breakdown.fuel.amount).toBe(7.2);
				expect(breakdown.tolls.amount).toBe(7.5);
				expect(breakdown.wear.amount).toBe(5);
				expect(breakdown.driver.amount).toBe(25);
				expect(breakdown.total).toBe(44.7);

				// Check internalCost matches breakdown total
				expect(result.internalCost).toBe(44.7);
			});

			it("should include COST_BREAKDOWN in appliedRules", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 50,
					estimatedDurationMinutes: 60,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				const costRule = result.appliedRules.find(r => r.type === "COST_BREAKDOWN");
				expect(costRule).toBeDefined();
				expect(costRule?.costBreakdown).toBeDefined();
			});
		});

		describe("Margin Calculation (AC4)", () => {
			const privateContact: ContactData = {
				id: "contact-private",
				isPartner: false,
				partnerContract: null,
			};

			it("should calculate margin correctly with new internal cost", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 50,
					estimatedDurationMinutes: 60,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
				});

				// Price = max(50×2.5, 1×45) × 1.2 = 125 × 1.2 = 150
				// Internal cost = 44.70
				// Margin = 150 - 44.70 = 105.30
				// MarginPercent = 105.30 / 150 × 100 = 70.2%
				expect(result.price).toBe(150);
				expect(result.internalCost).toBe(44.7);
				expect(result.margin).toBeCloseTo(105.3, 1);
				expect(result.marginPercent).toBeCloseTo(70.2, 1);
				expect(result.profitabilityIndicator).toBe("green");
			});

			it("should show orange indicator for low margin", () => {
				// Use custom settings to create a low margin scenario
				const lowMarginSettings: OrganizationPricingSettings = {
					baseRatePerKm: 1.0, // Very low rate
					baseRatePerHour: 20.0,
					targetMarginPercent: 0, // No margin added
				};

				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 50,
					estimatedDurationMinutes: 60,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: lowMarginSettings,
				});

				// Price = max(50×1.0, 1×20) = 50
				// Internal cost = 44.70
				// Margin = 50 - 44.70 = 5.30
				// MarginPercent = 5.30 / 50 × 100 = 10.6%
				expect(result.price).toBe(50);
				expect(result.marginPercent).toBeCloseTo(10.6, 1);
				expect(result.profitabilityIndicator).toBe("orange");
			});

			it("should show red indicator for negative margin", () => {
				// Use custom settings to create a loss scenario
				const lossSettings: OrganizationPricingSettings = {
					baseRatePerKm: 0.5, // Very low rate
					baseRatePerHour: 10.0,
					targetMarginPercent: 0,
				};

				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 50,
					estimatedDurationMinutes: 60,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: lossSettings,
				});

				// Price = max(50×0.5, 1×10) = 25
				// Internal cost = 44.70
				// Margin = 25 - 44.70 = -19.70
				expect(result.price).toBe(25);
				expect(result.margin).toBeLessThan(0);
				expect(result.profitabilityIndicator).toBe("red");
			});
		});

		describe("Default Cost Parameters", () => {
			it("should have correct default values", () => {
				expect(DEFAULT_COST_PARAMETERS.fuelConsumptionL100km).toBe(8.0);
				expect(DEFAULT_COST_PARAMETERS.fuelPricePerLiter).toBe(1.80);
				expect(DEFAULT_COST_PARAMETERS.tollCostPerKm).toBe(0.15);
				expect(DEFAULT_COST_PARAMETERS.wearCostPerKm).toBe(0.10);
				expect(DEFAULT_COST_PARAMETERS.driverHourlyCost).toBe(25.0);
			});
		});
	});

	// ============================================================================
	// Story 4.3: Multiplier Tests
	// ============================================================================

	describe("Multipliers (Story 4.3)", () => {
		const privateContact: ContactData = {
			id: "contact-private",
			isPartner: false,
			partnerContract: null,
		};

		// Night rate: 22:00-06:00, +20%
		const nightRate: AdvancedRateData = {
			id: "rate-night",
			name: "Night Surcharge",
			appliesTo: "NIGHT",
			startTime: "22:00",
			endTime: "06:00",
			daysOfWeek: null,
			minDistanceKm: null,
			maxDistanceKm: null,
			zoneId: null,
			adjustmentType: "PERCENTAGE",
			value: 20,
			priority: 10,
			isActive: true,
		};

		// Weekend rate: Saturday/Sunday, +15%
		const weekendRate: AdvancedRateData = {
			id: "rate-weekend",
			name: "Weekend Surcharge",
			appliesTo: "WEEKEND",
			startTime: null,
			endTime: null,
			daysOfWeek: "0,6", // Sunday=0, Saturday=6
			minDistanceKm: null,
			maxDistanceKm: null,
			zoneId: null,
			adjustmentType: "PERCENTAGE",
			value: 15,
			priority: 5,
			isActive: true,
		};

		// Note: LONG_DISTANCE removed in Story 11.4 - distance-based pricing now handled differently
		// This rate is kept for backward compatibility but uses NIGHT type as placeholder
		const longDistanceRate: AdvancedRateData = {
			id: "rate-long-distance",
			name: "Long Distance Discount",
			appliesTo: "NIGHT", // Changed from LONG_DISTANCE (removed in Story 11.4)
			startTime: null,
			endTime: null,
			daysOfWeek: null,
			minDistanceKm: 100,
			maxDistanceKm: null,
			zoneId: null,
			adjustmentType: "PERCENTAGE",
			value: -10,
			priority: 3,
			isActive: true,
		};

		// Seasonal multiplier: Le Bourget Air Show
		const leBourgetMultiplier: SeasonalMultiplierData = {
			id: "seasonal-lebourget",
			name: "Le Bourget Air Show",
			description: "Annual air show at Le Bourget",
			startDate: new Date("2025-06-14"),
			endDate: new Date("2025-06-22"),
			multiplier: 1.3,
			priority: 10,
			isActive: true,
		};

		describe("Night Rate (AC3)", () => {
			it("should apply night rate for pickup at 23:00", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T23:00:00+01:00", // 23:00 Paris time
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate],
					seasonalMultipliers: [],
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				// Base price with margin: 30km × 2.5 = 75 × 1.2 (margin) = 90
				// Night rate: 90 × 1.2 = 108
				expect(result.price).toBe(108);
				expect(result.appliedRules.some(r => r.type === "ADVANCED_RATE" && r.ruleName === "Night Surcharge")).toBe(true);
			});

			it("should NOT apply night rate for pickup at 10:00", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T10:00:00+01:00", // 10:00 Paris time
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate],
					seasonalMultipliers: [],
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				// Base price with margin: 90 (no night rate)
				expect(result.price).toBe(90);
				expect(result.appliedRules.some(r => r.type === "ADVANCED_RATE")).toBe(false);
			});

			it("should apply night rate for early morning pickup at 05:00", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T05:00:00+01:00", // 05:00 Paris time (still night)
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate],
					seasonalMultipliers: [],
				});

				expect(result.price).toBe(108); // Night rate applied
			});
		});

		describe("Weekend Rate (AC4)", () => {
			it("should apply weekend rate for Saturday pickup", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-29T10:00:00+01:00", // Saturday
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [weekendRate],
					seasonalMultipliers: [],
				});

				// Base: 90, Weekend: 90 × 1.15 = 103.5
				expect(result.price).toBe(103.5);
				expect(result.appliedRules.some(r => r.type === "ADVANCED_RATE" && r.ruleName === "Weekend Surcharge")).toBe(true);
			});

			it("should NOT apply weekend rate for Monday pickup", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-24T10:00:00+01:00", // Monday
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [weekendRate],
					seasonalMultipliers: [],
				});

				expect(result.price).toBe(90); // No weekend rate
			});
		});

		// Story 11.4: LONG_DISTANCE type removed - distance-based pricing now handled by zone multipliers
		describe.skip("Long Distance Rate (AC5) - OBSOLETE", () => {
			it("should apply long distance discount for 150km trip", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T10:00:00+01:00",
					estimatedDistanceKm: 150,
					estimatedDurationMinutes: 120,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [longDistanceRate],
					seasonalMultipliers: [],
				});

				// Base: 150 × 2.5 = 375 × 1.2 = 450
				// Long distance: 450 × 0.9 = 405
				expect(result.price).toBe(405);
				expect(result.appliedRules.some(r => r.type === "ADVANCED_RATE" && r.ruleName === "Long Distance Discount")).toBe(true);
			});

			it("should NOT apply long distance discount for 30km trip", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T10:00:00+01:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [longDistanceRate],
					seasonalMultipliers: [],
				});

				expect(result.price).toBe(90); // No discount
			});
		});

		describe("Seasonal Multiplier (AC6)", () => {
			it("should apply seasonal multiplier during Le Bourget Air Show", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-06-15T10:00:00+02:00", // During Le Bourget
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [],
					seasonalMultipliers: [leBourgetMultiplier],
				});

				// Base: 90, Seasonal: 90 × 1.3 = 117
				expect(result.price).toBe(117);
				expect(result.appliedRules.some(r => r.type === "SEASONAL_MULTIPLIER" && r.ruleName === "Le Bourget Air Show")).toBe(true);
			});

			it("should NOT apply seasonal multiplier outside date range", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-07-15T10:00:00+02:00", // After Le Bourget
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [],
					seasonalMultipliers: [leBourgetMultiplier],
				});

				expect(result.price).toBe(90); // No multiplier
			});
		});

		describe("Priority-Based Rule Stacking (AC7)", () => {
			it("should apply rules in priority order (higher first)", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-29T23:00:00+01:00", // Saturday night
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate, weekendRate], // Night has higher priority (10 vs 5)
					seasonalMultipliers: [],
				});

				// Base: 90
				// Night (priority 10): 90 × 1.2 = 108
				// Weekend (priority 5): 108 × 1.15 = 124.2
				expect(result.price).toBe(124.2);

				// Check order in appliedRules
				const advancedRules = result.appliedRules.filter(r => r.type === "ADVANCED_RATE");
				expect(advancedRules.length).toBe(2);
				expect(advancedRules[0].ruleName).toBe("Night Surcharge"); // Higher priority first
				expect(advancedRules[1].ruleName).toBe("Weekend Surcharge");
			});
		});

		describe("Order of Operations (AC1)", () => {
			it("should apply advanced rates before seasonal multipliers", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-06-14T23:00:00+02:00", // Saturday night during Le Bourget
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate, weekendRate],
					seasonalMultipliers: [leBourgetMultiplier],
				});

				// Base: 90
				// Night: 90 × 1.2 = 108
				// Weekend: 108 × 1.15 = 124.2
				// Seasonal: 124.2 × 1.3 = 161.46
				expect(result.price).toBeCloseTo(161.46, 2);

				// Verify order in appliedRules
				const ruleTypes = result.appliedRules
					.filter(r => r.type === "ADVANCED_RATE" || r.type === "SEASONAL_MULTIPLIER")
					.map(r => r.type);
				expect(ruleTypes).toEqual(["ADVANCED_RATE", "ADVANCED_RATE", "SEASONAL_MULTIPLIER"]);
			});
		});

		describe("Applied Rules Transparency (AC2)", () => {
			it("should include all rule details in appliedRules", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T23:00:00+01:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate],
					seasonalMultipliers: [],
				});

				const nightRuleApplied = result.appliedRules.find(
					r => r.type === "ADVANCED_RATE" && r.ruleName === "Night Surcharge"
				) as AppliedMultiplierRule;

				expect(nightRuleApplied).toBeDefined();
				expect(nightRuleApplied.ruleId).toBe("rate-night");
				expect(nightRuleApplied.adjustmentType).toBe("PERCENTAGE");
				expect(nightRuleApplied.adjustmentValue).toBe(20);
				expect(nightRuleApplied.priceBefore).toBe(90);
				expect(nightRuleApplied.priceAfter).toBe(108);
			});
		});

		describe("Idempotent Rule Evaluation (AC8)", () => {
			it("should return identical results for same input", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T23:00:00+01:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const context = {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate, weekendRate],
					seasonalMultipliers: [leBourgetMultiplier],
				};

				const result1 = calculatePrice(request, context);
				const result2 = calculatePrice(request, context);
				const result3 = calculatePrice(request, context);

				expect(result1.price).toBe(result2.price);
				expect(result2.price).toBe(result3.price);
				expect(result1.appliedRules.length).toBe(result2.appliedRules.length);
			});
		});

		describe("Grid Pricing Unaffected (AC9)", () => {
			it("should NOT apply multipliers to FIXED_GRID pricing", () => {
				const partnerWithRoute: ContactData = {
					id: "contact-partner",
					isPartner: true,
					partnerContract: {
						id: "contract-1",
						zoneRoutes: [
							{
								zoneRoute: createLegacyZoneRoute({
									id: "zone-route-1",
									fromZoneId: "zone-paris",
									toZoneId: "zone-cdg",
									vehicleCategoryId: "vehicle-cat-1",
									fixedPrice: 75.0,
									direction: "BIDIRECTIONAL",
									isActive: true,
									fromZone: { id: "zone-paris", name: "Paris Center", code: "PAR-CTR" },
									toZone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" },
								}),
							},
						],
						excursionPackages: [],
						dispoPackages: [],
					},
				};

				const request: PricingRequest = {
					contactId: partnerWithRoute.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-06-14T23:00:00+02:00", // Saturday night during Le Bourget
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithRoute,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate, weekendRate],
					seasonalMultipliers: [leBourgetMultiplier],
				});

				// Grid price should be unchanged (Engagement Rule)
				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(75.0);
				expect(result.appliedRules.some(r => r.type === "ADVANCED_RATE")).toBe(false);
				expect(result.appliedRules.some(r => r.type === "SEASONAL_MULTIPLIER")).toBe(false);
			});
		});

		describe("Inactive Rules", () => {
			it("should NOT apply inactive advanced rates", () => {
				const inactiveNightRate: AdvancedRateData = {
					...nightRate,
					isActive: false,
				};

				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T23:00:00+01:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [inactiveNightRate],
					seasonalMultipliers: [],
				});

				expect(result.price).toBe(90); // No night rate
			});

			it("should NOT apply inactive seasonal multipliers", () => {
				const inactiveMultiplier: SeasonalMultiplierData = {
					...leBourgetMultiplier,
					isActive: false,
				};

				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-06-15T10:00:00+02:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [],
					seasonalMultipliers: [inactiveMultiplier],
				});

				expect(result.price).toBe(90); // No multiplier
			});
		});

		describe("No Applicable Rules", () => {
			it("should return unchanged price when no rules apply", () => {
				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 },
					dropoff: { lat: 49.01, lng: 2.55 },
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T10:00:00+01:00", // Weekday daytime, no event
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [nightRate, weekendRate, longDistanceRate],
					seasonalMultipliers: [leBourgetMultiplier],
				});

				expect(result.price).toBe(90); // Base price unchanged
				expect(result.appliedRules.filter(r => r.type === "ADVANCED_RATE" || r.type === "SEASONAL_MULTIPLIER").length).toBe(0);
			});
		});

		// Story 11.4: ZONE_SCENARIO type removed - zone-based pricing now handled by PricingZone.priceMultiplier
		describe.skip("Fixed Amount Adjustment - OBSOLETE", () => {
			it("should apply fixed amount adjustment correctly", () => {
				const fixedFeeRate: AdvancedRateData = {
					id: "rate-fixed-fee",
					name: "Airport Fee",
					appliesTo: "NIGHT", // Changed from ZONE_SCENARIO (removed in Story 11.4)
					startTime: null,
					endTime: null,
					daysOfWeek: null,
					minDistanceKm: null,
					maxDistanceKm: null,
					zoneId: "zone-cdg",
					adjustmentType: "FIXED_AMOUNT",
					value: 15, // +15 EUR
					priority: 5,
					isActive: true,
				};

				const request: PricingRequest = {
					contactId: privateContact.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					pickupAt: "2025-11-26T10:00:00+01:00",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: privateContact,
					zones,
					pricingSettings: defaultPricingSettings,
					advancedRates: [fixedFeeRate],
					seasonalMultipliers: [],
				});

				// Base: 90, Fixed fee: 90 + 15 = 105
				expect(result.price).toBe(105);
			});
		});
	});

	// ============================================================================
	// Story 4.4: Manual Override Tests
	// ============================================================================

	describe("Story 4.4: Manual Override with Live Profitability Feedback", () => {
		describe("validatePriceOverride", () => {
			it("should validate a valid price override (AC2)", () => {
				const result = validatePriceOverride(75, 44.70);

				expect(result.isValid).toBe(true);
				expect(result.details?.requestedPrice).toBe(75);
				expect(result.details?.internalCost).toBe(44.70);
				expect(result.details?.resultingMargin).toBeCloseTo(30.30, 2);
				expect(result.details?.resultingMarginPercent).toBeCloseTo(40.4, 1);
			});

			it("should reject invalid price (zero or negative) (AC2)", () => {
				const result = validatePriceOverride(0, 44.70);

				expect(result.isValid).toBe(false);
				expect(result.errorCode).toBe("INVALID_PRICE");
				expect(result.errorMessage).toBe("Price must be greater than zero");
			});

			it("should reject negative price (AC2)", () => {
				const result = validatePriceOverride(-10, 44.70);

				expect(result.isValid).toBe(false);
				expect(result.errorCode).toBe("INVALID_PRICE");
			});

			it("should reject price below minimum margin threshold (AC2)", () => {
				// Price 45, cost 44.70 → margin 0.30 → marginPercent 0.67%
				const result = validatePriceOverride(45, 44.70, 10); // 10% minimum

				expect(result.isValid).toBe(false);
				expect(result.errorCode).toBe("BELOW_MINIMUM_MARGIN");
				expect(result.errorMessage).toContain("below minimum threshold");
				expect(result.details?.minimumMarginPercent).toBe(10);
			});

			it("should accept price at exactly minimum margin threshold (AC2)", () => {
				// For 10% margin with cost 44.70: price = 44.70 / 0.90 = 49.67
				const result = validatePriceOverride(50, 44.70, 10);

				expect(result.isValid).toBe(true);
				expect(result.details?.resultingMarginPercent).toBeGreaterThanOrEqual(10);
			});
		});

		describe("recalculateProfitability", () => {
			it("should recalculate margin correctly (AC4)", () => {
				const result = recalculateProfitability({
					newPrice: 75,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				// margin = 75 - 44.70 = 30.30
				// marginPercent = 30.30 / 75 × 100 = 40.4%
				expect(result.price).toBe(75);
				expect(result.margin).toBeCloseTo(30.30, 2);
				expect(result.marginPercent).toBeCloseTo(40.4, 1);
			});

			it("should update profitability indicator to green for high margin (AC4)", () => {
				const result = recalculateProfitability({
					newPrice: 100,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				// margin = 55.30, marginPercent = 55.3% → green
				expect(result.profitabilityIndicator).toBe("green");
			});

			it("should update profitability indicator to orange for low margin (AC4)", () => {
				const result = recalculateProfitability({
					newPrice: 52,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				// margin = 7.30, marginPercent = 14.04% → orange (0-20%)
				expect(result.marginPercent).toBeCloseTo(14.04, 1);
				expect(result.profitabilityIndicator).toBe("orange");
			});

			it("should update profitability indicator to red for negative margin (AC4)", () => {
				const result = recalculateProfitability({
					newPrice: 40,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				// margin = -4.70, marginPercent = -11.75% → red
				expect(result.margin).toBeCloseTo(-4.70, 2);
				expect(result.marginPercent).toBeCloseTo(-11.75, 1);
				expect(result.profitabilityIndicator).toBe("red");
			});

			it("should add MANUAL_OVERRIDE rule to appliedRules (AC3)", () => {
				const result = recalculateProfitability({
					newPrice: 75,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [{ type: "DYNAMIC_BASE_CALCULATION" }],
					reason: "Customer discount",
				});

				const overrideRule = result.appliedRules.find((r: AppliedRule) => r.type === "MANUAL_OVERRIDE");
				expect(overrideRule).toBeDefined();
				expect(overrideRule?.previousPrice).toBe(90);
				expect(overrideRule?.newPrice).toBe(75);
				expect(overrideRule?.priceChange).toBe(-15);
				expect(overrideRule?.priceChangePercent).toBeCloseTo(-16.67, 1);
				expect(overrideRule?.reason).toBe("Customer discount");
				expect(overrideRule?.overriddenAt).toBeDefined();
			});

			it("should calculate price change correctly (AC3)", () => {
				const result = recalculateProfitability({
					newPrice: 120,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				expect(result.priceChange).toBe(30);
				expect(result.priceChangePercent).toBeCloseTo(33.33, 1);
			});

			it("should set overrideApplied flag (AC1)", () => {
				const result = recalculateProfitability({
					newPrice: 75,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [],
				});

				expect(result.overrideApplied).toBe(true);
			});

			it("should replace previous MANUAL_OVERRIDE rule (idempotence)", () => {
				const previousOverrideRule = {
					type: "MANUAL_OVERRIDE",
					previousPrice: 100,
					newPrice: 90,
					priceChange: -10,
					priceChangePercent: -10,
					overriddenAt: "2025-11-26T10:00:00Z",
				};

				const result = recalculateProfitability({
					newPrice: 75,
					internalCost: 44.70,
					previousPrice: 90,
					previousAppliedRules: [
						{ type: "DYNAMIC_BASE_CALCULATION" },
						previousOverrideRule,
					],
				});

				// Should only have one MANUAL_OVERRIDE rule
				const overrideRules = result.appliedRules.filter((r: AppliedRule) => r.type === "MANUAL_OVERRIDE");
				expect(overrideRules.length).toBe(1);
				expect(overrideRules[0]?.newPrice).toBe(75);
			});

			it("should mark contract price override with warning (AC3)", () => {
				const result = recalculateProfitability({
					newPrice: 130,
					internalCost: 44.70,
					previousPrice: 150,
					previousAppliedRules: [],
					isContractPrice: true,
				});

				const overrideRule = result.appliedRules.find((r: AppliedRule) => r.type === "MANUAL_OVERRIDE");
				expect(overrideRule?.description).toContain("Contract price overridden");
				expect(overrideRule?.description).toContain("Engagement Rule bypassed");
				expect(overrideRule?.isContractPriceOverride).toBe(true);
			});
		});

		describe("applyPriceOverride", () => {
			const basePricingResult: PricingResult = {
				pricingMode: "DYNAMIC",
				price: 90,
				currency: "EUR",
				internalCost: 44.70,
				margin: 45.30,
				marginPercent: 50.33,
				profitabilityIndicator: "green",
				// Story 4.7: Add profitabilityData to test fixture
				profitabilityData: {
					indicator: "green",
					marginPercent: 50.33,
					thresholds: DEFAULT_PROFITABILITY_THRESHOLDS,
					label: "Profitable",
					description: "Margin: 50.3% (≥20% target)",
				},
				matchedGrid: null,
				appliedRules: [{ type: "DYNAMIC_BASE_CALCULATION" }],
				isContractPrice: false,
				fallbackReason: "PRIVATE_CLIENT",
				gridSearchDetails: null,
				tripAnalysis: { costBreakdown: { total: 44.70 } } as any,
			};

			it("should apply valid override and return updated PricingResult (AC1)", () => {
				const result = applyPriceOverride(basePricingResult, 75, "Customer discount");

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.result.price).toBe(75);
					expect(result.result.margin).toBeCloseTo(30.30, 2);
					expect(result.result.marginPercent).toBeCloseTo(40.4, 1);
					expect(result.result.profitabilityIndicator).toBe("green");
					expect(result.result.overrideApplied).toBe(true);
					expect(result.result.previousPrice).toBe(90);
				}
			});

			it("should return validation error for invalid price (AC2)", () => {
				const result = applyPriceOverride(basePricingResult, 0);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.errorCode).toBe("INVALID_PRICE");
				}
			});

			it("should return validation error when below minimum margin (AC2)", () => {
				const result = applyPriceOverride(basePricingResult, 45, undefined, 10);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.errorCode).toBe("BELOW_MINIMUM_MARGIN");
				}
			});

			it("should preserve original PricingResult fields (AC1)", () => {
				const result = applyPriceOverride(basePricingResult, 75);

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.result.pricingMode).toBe("DYNAMIC");
					expect(result.result.currency).toBe("EUR");
					expect(result.result.internalCost).toBe(44.70);
					expect(result.result.matchedGrid).toBeNull();
					expect(result.result.fallbackReason).toBe("PRIVATE_CLIENT");
					expect(result.result.tripAnalysis).toBeDefined();
				}
			});

			it("should handle grid pricing override (AC1)", () => {
				const gridPricingResult: PricingResult = {
					...basePricingResult,
					pricingMode: "FIXED_GRID",
					price: 150,
					isContractPrice: true,
					matchedGrid: {
						type: "ZoneRoute",
						id: "route-1",
						name: "Paris → CDG",
					},
				};

				const result = applyPriceOverride(gridPricingResult, 130, "Special discount");

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.result.price).toBe(130);
					expect(result.result.isContractPrice).toBe(true);
					expect(result.result.pricingMode).toBe("FIXED_GRID");
					
					const overrideRule = result.result.appliedRules.find((r: AppliedRule) => r.type === "MANUAL_OVERRIDE");
					expect(overrideRule?.isContractPriceOverride).toBe(true);
				}
			});
		});
	});

	// ============================================================================
	// Story 4.7: Profitability Indicator Tests
	// ============================================================================

	describe("Story 4.7: Profitability Indicator", () => {
		describe("calculateProfitabilityIndicator", () => {
			describe("with default thresholds", () => {
				it("should return 'green' for margin >= 20% (AC1)", () => {
					expect(calculateProfitabilityIndicator(20)).toBe("green");
					expect(calculateProfitabilityIndicator(25)).toBe("green");
					expect(calculateProfitabilityIndicator(50)).toBe("green");
					expect(calculateProfitabilityIndicator(100)).toBe("green");
				});

				it("should return 'orange' for 0% <= margin < 20% (AC1)", () => {
					expect(calculateProfitabilityIndicator(0)).toBe("orange");
					expect(calculateProfitabilityIndicator(10)).toBe("orange");
					expect(calculateProfitabilityIndicator(19)).toBe("orange");
					expect(calculateProfitabilityIndicator(19.99)).toBe("orange");
				});

				it("should return 'red' for margin < 0% (AC1)", () => {
					expect(calculateProfitabilityIndicator(-1)).toBe("red");
					expect(calculateProfitabilityIndicator(-10)).toBe("red");
					expect(calculateProfitabilityIndicator(-50)).toBe("red");
					expect(calculateProfitabilityIndicator(-0.01)).toBe("red");
				});

				it("should handle edge cases at threshold boundaries (AC1)", () => {
					// Exactly at green threshold
					expect(calculateProfitabilityIndicator(20)).toBe("green");
					// Just below green threshold
					expect(calculateProfitabilityIndicator(19.999)).toBe("orange");
					// Exactly at orange threshold
					expect(calculateProfitabilityIndicator(0)).toBe("orange");
					// Just below orange threshold
					expect(calculateProfitabilityIndicator(-0.001)).toBe("red");
				});
			});

			describe("with custom thresholds (AC3)", () => {
				const customThresholds: ProfitabilityThresholds = {
					greenThreshold: 30,
					orangeThreshold: 10,
				};

				it("should use custom green threshold", () => {
					expect(calculateProfitabilityIndicator(30, customThresholds)).toBe("green");
					expect(calculateProfitabilityIndicator(29, customThresholds)).toBe("orange");
					expect(calculateProfitabilityIndicator(50, customThresholds)).toBe("green");
				});

				it("should use custom orange threshold", () => {
					expect(calculateProfitabilityIndicator(10, customThresholds)).toBe("orange");
					expect(calculateProfitabilityIndicator(9, customThresholds)).toBe("red");
					expect(calculateProfitabilityIndicator(20, customThresholds)).toBe("orange");
				});

				it("should classify correctly with custom thresholds", () => {
					// Green: >= 30%
					expect(calculateProfitabilityIndicator(35, customThresholds)).toBe("green");
					// Orange: >= 10% and < 30%
					expect(calculateProfitabilityIndicator(15, customThresholds)).toBe("orange");
					// Red: < 10%
					expect(calculateProfitabilityIndicator(5, customThresholds)).toBe("red");
					expect(calculateProfitabilityIndicator(-5, customThresholds)).toBe("red");
				});
			});
		});

		describe("getProfitabilityLabel", () => {
			it("should return correct labels for each state", () => {
				expect(getProfitabilityLabel("green")).toBe("Profitable");
				expect(getProfitabilityLabel("orange")).toBe("Low margin");
				expect(getProfitabilityLabel("red")).toBe("Loss");
			});
		});

		describe("getProfitabilityDescription", () => {
			it("should return correct description for green state (AC4)", () => {
				const description = getProfitabilityDescription("green", 25.5, DEFAULT_PROFITABILITY_THRESHOLDS);
				expect(description).toContain("25.5%");
				expect(description).toContain("≥20%");
				expect(description).toContain("target");
			});

			it("should return correct description for orange state (AC4)", () => {
				const description = getProfitabilityDescription("orange", 10.0, DEFAULT_PROFITABILITY_THRESHOLDS);
				expect(description).toContain("10.0%");
				expect(description).toContain("below");
				expect(description).toContain("20%");
			});

			it("should return correct description for red state (AC4)", () => {
				const description = getProfitabilityDescription("red", -5.0, DEFAULT_PROFITABILITY_THRESHOLDS);
				expect(description).toContain("-5.0%");
				expect(description).toContain("loss");
			});
		});

		describe("getProfitabilityIndicatorData", () => {
			it("should return complete data structure for UI (AC2, AC4)", () => {
				const data = getProfitabilityIndicatorData(25.5);

				expect(data.indicator).toBe("green");
				expect(data.marginPercent).toBe(25.5);
				expect(data.thresholds).toEqual(DEFAULT_PROFITABILITY_THRESHOLDS);
				expect(data.label).toBe("Profitable");
				expect(data.description).toContain("25.5%");
			});

			it("should use custom thresholds when provided (AC3)", () => {
				const customThresholds: ProfitabilityThresholds = {
					greenThreshold: 30,
					orangeThreshold: 10,
				};

				const data = getProfitabilityIndicatorData(25, customThresholds);

				expect(data.indicator).toBe("orange"); // 25% < 30% green threshold
				expect(data.thresholds).toEqual(customThresholds);
				expect(data.label).toBe("Low margin");
			});

			it("should round marginPercent to 2 decimal places", () => {
				const data = getProfitabilityIndicatorData(25.555555);
				expect(data.marginPercent).toBe(25.56);
			});
		});

		describe("getThresholdsFromSettings", () => {
			it("should extract thresholds from organization settings (AC3)", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
					greenMarginThreshold: 25,
					orangeMarginThreshold: 5,
				};

				const thresholds = getThresholdsFromSettings(settings);

				expect(thresholds.greenThreshold).toBe(25);
				expect(thresholds.orangeThreshold).toBe(5);
			});

			it("should use defaults when thresholds not configured (AC3)", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
					// No threshold fields
				};

				const thresholds = getThresholdsFromSettings(settings);

				expect(thresholds.greenThreshold).toBe(DEFAULT_PROFITABILITY_THRESHOLDS.greenThreshold);
				expect(thresholds.orangeThreshold).toBe(DEFAULT_PROFITABILITY_THRESHOLDS.orangeThreshold);
			});

			it("should handle partial threshold configuration", () => {
				const settings: OrganizationPricingSettings = {
					baseRatePerKm: 2.5,
					baseRatePerHour: 45.0,
					targetMarginPercent: 20.0,
					greenMarginThreshold: 30,
					// orangeMarginThreshold not set
				};

				const thresholds = getThresholdsFromSettings(settings);

				expect(thresholds.greenThreshold).toBe(30);
				expect(thresholds.orangeThreshold).toBe(DEFAULT_PROFITABILITY_THRESHOLDS.orangeThreshold);
			});
		});

		describe("DEFAULT_PROFITABILITY_THRESHOLDS", () => {
			it("should have PRD-compliant default values", () => {
				expect(DEFAULT_PROFITABILITY_THRESHOLDS.greenThreshold).toBe(20);
				expect(DEFAULT_PROFITABILITY_THRESHOLDS.orangeThreshold).toBe(0);
			});
		});
	});

	// ============================================================================
	// Story 14.5: Multi-Zone and Address-Based Route Matching Tests
	// ============================================================================

	describe("Story 14.5 - Multi-Zone Route Matching", () => {
		// Additional zones for multi-zone testing
		const paris1Zone: ZoneData = {
			id: "zone-paris-1",
			name: "Paris 1er",
			code: "PAR-1",
			zoneType: "POLYGON",
			geometry: { type: "Polygon", coordinates: [[[2.33, 48.86], [2.35, 48.86], [2.35, 48.87], [2.33, 48.87], [2.33, 48.86]]] },
			centerLatitude: null,
			centerLongitude: null,
			radiusKm: null,
			isActive: true,
		};

		const paris2Zone: ZoneData = {
			id: "zone-paris-2",
			name: "Paris 2ème",
			code: "PAR-2",
			zoneType: "POLYGON",
			geometry: { type: "Polygon", coordinates: [[[2.33, 48.87], [2.35, 48.87], [2.35, 48.88], [2.33, 48.88], [2.33, 48.87]]] },
			centerLatitude: null,
			centerLongitude: null,
			radiusKm: null,
			isActive: true,
		};

		const orlyZone: ZoneData = {
			id: "zone-orly",
			name: "Orly Airport",
			code: "ORY",
			zoneType: "RADIUS",
			geometry: null,
			centerLatitude: 48.7262,
			centerLongitude: 2.3652,
			radiusKm: 5,
			isActive: true,
		};

		const multiZones: ZoneData[] = [paris1Zone, paris2Zone, cdgZone, orlyZone];

		describe("AC1: Multi-Zone Origin Matching", () => {
			const partnerWithMultiZoneOrigin: ContactData = {
				id: "contact-multizone-origin",
				isPartner: true,
				partnerContract: {
					id: "contract-multizone-1",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "route-multizone-origin",
								fromZoneId: null,
								toZoneId: null,
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [
									{ zone: { id: "zone-paris-1", name: "Paris 1er", code: "PAR-1" } },
									{ zone: { id: "zone-paris-2", name: "Paris 2ème", code: "PAR-2" } },
								],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
								],
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 85.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match route when pickup zone is in originZones array", () => {
				const request: PricingRequest = {
					contactId: partnerWithMultiZoneOrigin.id,
					pickup: { lat: 48.865, lng: 2.34 }, // Paris 1er
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithMultiZoneOrigin,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(85.0);
				expect(result.matchedGrid?.id).toBe("route-multizone-origin");
			});

			it("should match route when pickup zone is second in originZones array", () => {
				const request: PricingRequest = {
					contactId: partnerWithMultiZoneOrigin.id,
					pickup: { lat: 48.875, lng: 2.34 }, // Paris 2ème
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithMultiZoneOrigin,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(85.0);
			});
		});

		describe("AC2: Multi-Zone Destination Matching", () => {
			const partnerWithMultiZoneDest: ContactData = {
				id: "contact-multizone-dest",
				isPartner: true,
				partnerContract: {
					id: "contract-multizone-2",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "route-multizone-dest",
								fromZoneId: null,
								toZoneId: null,
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [
									{ zone: { id: "zone-paris-1", name: "Paris 1er", code: "PAR-1" } },
								],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
									{ zone: { id: "zone-orly", name: "Orly Airport", code: "ORY" } },
								],
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 90.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match route when dropoff zone is in destinationZones array", () => {
				const request: PricingRequest = {
					contactId: partnerWithMultiZoneDest.id,
					pickup: { lat: 48.865, lng: 2.34 }, // Paris 1er
					dropoff: { lat: 48.73, lng: 2.37 }, // Orly
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 20,
					estimatedDurationMinutes: 35,
				};

				const result = calculatePrice(request, {
					contact: partnerWithMultiZoneDest,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(90.0);
				expect(result.matchedGrid?.id).toBe("route-multizone-dest");
			});
		});

		describe("AC3: Address-Based Route Priority", () => {
			// Ritz Hotel coordinates (Place Vendôme, Paris)
			const ritzLat = 48.8683;
			const ritzLng = 2.3293;

			const partnerWithAddressRoute: ContactData = {
				id: "contact-address-route",
				isPartner: true,
				partnerContract: {
					id: "contract-address",
					zoneRoutes: [
						// Address-based route (should have priority)
						{
							zoneRoute: {
								id: "route-address-ritz",
								fromZoneId: null,
								toZoneId: null,
								originType: "ADDRESS",
								destinationType: "ZONES",
								originZones: [],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
								],
								originPlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
								originAddress: "Hôtel Ritz Paris, Place Vendôme",
								originLat: ritzLat,
								originLng: ritzLng,
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 95.0, // Premium price for Ritz
								direction: "A_TO_B",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
						// Zone-based route (lower priority)
						{
							zoneRoute: {
								id: "route-zone-paris-cdg",
								fromZoneId: null,
								toZoneId: null,
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [
									{ zone: { id: "zone-paris-1", name: "Paris 1er", code: "PAR-1" } },
								],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
								],
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 80.0, // Standard price
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should prioritize address-based route over zone-based route", () => {
				const request: PricingRequest = {
					contactId: partnerWithAddressRoute.id,
					pickup: { lat: ritzLat, lng: ritzLng }, // Exact Ritz location
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithAddressRoute,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(95.0); // Address route price, not zone route
				expect(result.matchedGrid?.id).toBe("route-address-ritz");
			});

			it("should match address route within proximity threshold (50m)", () => {
				const request: PricingRequest = {
					contactId: partnerWithAddressRoute.id,
					pickup: { lat: ritzLat + 0.0003, lng: ritzLng + 0.0003 }, // ~50m away
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithAddressRoute,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(95.0);
			});

			it("should fallback to zone route when outside address proximity", () => {
				const request: PricingRequest = {
					contactId: partnerWithAddressRoute.id,
					pickup: { lat: 48.865, lng: 2.34 }, // Paris 1er but not near Ritz
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithAddressRoute,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(80.0); // Zone route price
				expect(result.matchedGrid?.id).toBe("route-zone-paris-cdg");
			});
		});

		describe("AC4: Bidirectional Multi-Zone Routes", () => {
			const partnerWithBidirectionalMultiZone: ContactData = {
				id: "contact-bidir-multizone",
				isPartner: true,
				partnerContract: {
					id: "contract-bidir",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "route-bidir-multizone",
								fromZoneId: null,
								toZoneId: null,
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [
									{ zone: { id: "zone-paris-1", name: "Paris 1er", code: "PAR-1" } },
									{ zone: { id: "zone-paris-2", name: "Paris 2ème", code: "PAR-2" } },
								],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
									{ zone: { id: "zone-orly", name: "Orly Airport", code: "ORY" } },
								],
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 100.0,
								direction: "BIDIRECTIONAL",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should match bidirectional route in forward direction", () => {
				const request: PricingRequest = {
					contactId: partnerWithBidirectionalMultiZone.id,
					pickup: { lat: 48.865, lng: 2.34 }, // Paris 1er
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithBidirectionalMultiZone,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(100.0);
			});

			it("should match bidirectional route in reverse direction", () => {
				const request: PricingRequest = {
					contactId: partnerWithBidirectionalMultiZone.id,
					pickup: { lat: 48.73, lng: 2.37 }, // Orly (in destinationZones)
					dropoff: { lat: 48.875, lng: 2.34 }, // Paris 2ème (in originZones)
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 20,
					estimatedDurationMinutes: 35,
				};

				const result = calculatePrice(request, {
					contact: partnerWithBidirectionalMultiZone,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(100.0);
				expect(result.matchedGrid?.id).toBe("route-bidir-multizone");
			});
		});

		describe("AC5: Backward Compatibility with Legacy Routes", () => {
			const partnerWithLegacyRoute: ContactData = {
				id: "contact-legacy",
				isPartner: true,
				partnerContract: {
					id: "contract-legacy",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "route-legacy",
								fromZoneId: "zone-paris",
								toZoneId: "zone-cdg",
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [], // Empty - using legacy fields
								destinationZones: [], // Empty - using legacy fields
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

			it("should match legacy route using fromZoneId/toZoneId", () => {
				const request: PricingRequest = {
					contactId: partnerWithLegacyRoute.id,
					pickup: { lat: 48.85, lng: 2.35 }, // Paris
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithLegacyRoute,
					zones, // Using original zones array
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("FIXED_GRID");
				expect(result.price).toBe(75.0);
				expect(result.matchedGrid?.id).toBe("route-legacy");
			});
		});

		describe("No Match - Fallback to Dynamic Pricing", () => {
			const partnerWithMultiZoneRoute: ContactData = {
				id: "contact-no-match",
				isPartner: true,
				partnerContract: {
					id: "contract-no-match",
					zoneRoutes: [
						{
							zoneRoute: {
								id: "route-limited",
								fromZoneId: null,
								toZoneId: null,
								originType: "ZONES",
								destinationType: "ZONES",
								originZones: [
									{ zone: { id: "zone-paris-1", name: "Paris 1er", code: "PAR-1" } },
								],
								destinationZones: [
									{ zone: { id: "zone-cdg", name: "CDG Airport", code: "CDG" } },
								],
								vehicleCategoryId: "vehicle-cat-1",
								fixedPrice: 85.0,
								direction: "A_TO_B",
								isActive: true,
								fromZone: null,
								toZone: null,
							},
						},
					],
					excursionPackages: [],
					dispoPackages: [],
				},
			};

			it("should fallback to dynamic when pickup zone not in originZones", () => {
				const request: PricingRequest = {
					contactId: partnerWithMultiZoneRoute.id,
					pickup: { lat: 48.875, lng: 2.34 }, // Paris 2ème (not in originZones)
					dropoff: { lat: 49.01, lng: 2.55 }, // CDG
					vehicleCategoryId: "vehicle-cat-1",
					tripType: "transfer",
					estimatedDistanceKm: 30,
					estimatedDurationMinutes: 45,
				};

				const result = calculatePrice(request, {
					contact: partnerWithMultiZoneRoute,
					zones: multiZones,
					pricingSettings: defaultPricingSettings,
				});

				expect(result.pricingMode).toBe("DYNAMIC");
				expect(result.matchedGrid).toBeNull();
				expect(result.fallbackReason).toBe("NO_ROUTE_MATCH");
			});
		});
	});
});

// ============================================================================
// Story 17.2: Zone Multiplier Aggregation Strategy Tests
// ============================================================================

describe("Story 17.2: Zone Multiplier Aggregation Strategy", () => {
	// Test fixtures for zone multiplier tests
	const pickupZone: ZoneData = {
		id: "zone-paris-20",
		name: "Paris 20km",
		code: "PARIS_20",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 48.8566,
		centerLongitude: 2.3522,
		radiusKm: 20,
		isActive: true,
		priceMultiplier: 1.1,
		priority: 1,
	};

	const dropoffZone: ZoneData = {
		id: "zone-cdg",
		name: "CDG Airport",
		code: "CDG",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 49.0097,
		centerLongitude: 2.5479,
		radiusKm: 5,
		isActive: true,
		priceMultiplier: 1.3,
		priority: 5,
	};

	const basePrice = 100;

	describe("calculateEffectiveZoneMultiplier", () => {
		it("MAX strategy: should use highest multiplier", () => {
			const result = calculateEffectiveZoneMultiplier(1.1, 1.3, "MAX");
			expect(result.multiplier).toBe(1.3);
			expect(result.source).toBe("dropoff");
		});

		it("MAX strategy: should return pickup when pickup is higher", () => {
			const result = calculateEffectiveZoneMultiplier(1.5, 1.2, "MAX");
			expect(result.multiplier).toBe(1.5);
			expect(result.source).toBe("pickup");
		});

		it("PICKUP_ONLY strategy: should use pickup multiplier only", () => {
			const result = calculateEffectiveZoneMultiplier(1.1, 1.3, "PICKUP_ONLY");
			expect(result.multiplier).toBe(1.1);
			expect(result.source).toBe("pickup");
		});

		it("DROPOFF_ONLY strategy: should use dropoff multiplier only", () => {
			const result = calculateEffectiveZoneMultiplier(1.1, 1.3, "DROPOFF_ONLY");
			expect(result.multiplier).toBe(1.3);
			expect(result.source).toBe("dropoff");
		});

		it("AVERAGE strategy: should use average of both multipliers", () => {
			const result = calculateEffectiveZoneMultiplier(1.1, 1.3, "AVERAGE");
			expect(result.multiplier).toBe(1.2);
			expect(result.source).toBe("both");
		});

		it("null strategy: should default to MAX for backward compatibility", () => {
			const result = calculateEffectiveZoneMultiplier(1.1, 1.3, null);
			expect(result.multiplier).toBe(1.3);
			expect(result.source).toBe("dropoff");
		});
	});

	describe("applyZoneMultiplier with aggregation strategy", () => {
		it("MAX: should apply highest multiplier (1.3) to price", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "MAX");
			expect(result.adjustedPrice).toBe(130);
			expect(result.appliedMultiplier).toBe(1.3);
			expect(result.appliedRule.strategy).toBe("MAX");
			expect(result.appliedRule.source).toBe("dropoff");
		});

		it("PICKUP_ONLY: should apply pickup multiplier (1.1) to price", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "PICKUP_ONLY");
			expect(result.adjustedPrice).toBe(110);
			expect(result.appliedMultiplier).toBe(1.1);
			expect(result.appliedRule.strategy).toBe("PICKUP_ONLY");
			expect(result.appliedRule.source).toBe("pickup");
		});

		it("DROPOFF_ONLY: should apply dropoff multiplier (1.3) to price", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "DROPOFF_ONLY");
			expect(result.adjustedPrice).toBe(130);
			expect(result.appliedMultiplier).toBe(1.3);
			expect(result.appliedRule.strategy).toBe("DROPOFF_ONLY");
			expect(result.appliedRule.source).toBe("dropoff");
		});

		it("AVERAGE: should apply average multiplier (1.2) to price", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "AVERAGE");
			expect(result.adjustedPrice).toBe(120);
			expect(result.appliedMultiplier).toBe(1.2);
			expect(result.appliedRule.strategy).toBe("AVERAGE");
			expect(result.appliedRule.source).toBe("both");
		});

		it("null strategy: should default to MAX for backward compatibility", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, null);
			expect(result.adjustedPrice).toBe(130);
			expect(result.appliedMultiplier).toBe(1.3);
			expect(result.appliedRule.strategy).toBe("MAX");
		});

		it("undefined strategy: should default to MAX for backward compatibility", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone);
			expect(result.adjustedPrice).toBe(130);
			expect(result.appliedMultiplier).toBe(1.3);
			expect(result.appliedRule.strategy).toBe("MAX");
		});

		it("should handle null pickup zone gracefully", () => {
			const result = applyZoneMultiplier(basePrice, null, dropoffZone, "PICKUP_ONLY");
			expect(result.adjustedPrice).toBe(100); // pickup multiplier = 1.0 (default)
			expect(result.appliedMultiplier).toBe(1.0);
		});

		it("should handle null dropoff zone gracefully", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, null, "DROPOFF_ONLY");
			expect(result.adjustedPrice).toBe(100); // dropoff multiplier = 1.0 (default)
			expect(result.appliedMultiplier).toBe(1.0);
		});

		it("should handle both zones null gracefully", () => {
			const result = applyZoneMultiplier(basePrice, null, null, "AVERAGE");
			expect(result.adjustedPrice).toBe(100); // (1.0 + 1.0) / 2 = 1.0
			expect(result.appliedMultiplier).toBe(1.0);
		});

		it("should include zone info in applied rule for transparency", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "AVERAGE");
			expect(result.appliedRule.pickupZone).toEqual({
				code: "PARIS_20",
				name: "Paris 20km",
				multiplier: 1.1,
			});
			expect(result.appliedRule.dropoffZone).toEqual({
				code: "CDG",
				name: "CDG Airport",
				multiplier: 1.3,
			});
		});

		it("should include price before and after in applied rule", () => {
			const result = applyZoneMultiplier(basePrice, pickupZone, dropoffZone, "AVERAGE");
			expect(result.appliedRule.priceBefore).toBe(100);
			expect(result.appliedRule.priceAfter).toBe(120);
		});
	});
});

// ============================================================================
// Story 18.10: Hierarchical Pricing Algorithm Tests
// ============================================================================

import {
	evaluateHierarchicalPricing,
	isCentralZone,
	checkSameRing,
	findIntraCentralFlatRate,
	buildHierarchicalPricingRule,
	DEFAULT_HIERARCHICAL_PRICING_CONFIG,
	type HierarchicalPricingConfig,
	type IntraCentralFlatRateData,
	type ZoneDataWithCentralFlag,
} from "../pricing-engine";

describe("Story 18.10: Hierarchical Pricing Algorithm", () => {
	// Test zones - using partial type for test simplicity
	const parisCenter = {
		id: "zone-paris-0",
		name: "Paris Centre",
		code: "PARIS_0",
		zoneType: "RADIUS" as const,
		priceMultiplier: 1.0,
		isCentralZone: true,
	} as ZoneDataWithCentralFlag;

	const paris20 = {
		id: "zone-paris-20",
		name: "Paris 20km",
		code: "PARIS_20",
		zoneType: "RADIUS" as const,
		priceMultiplier: 1.1,
		isCentralZone: false,
	} as ZoneDataWithCentralFlag;

	const paris20bis = {
		id: "zone-paris-20-bis",
		name: "Paris 20km Bis",
		code: "PARIS_20",
		zoneType: "RADIUS" as const,
		priceMultiplier: 1.1,
		isCentralZone: false,
	} as ZoneDataWithCentralFlag;

	const cdgZone = {
		id: "zone-cdg",
		name: "CDG Airport",
		code: "CDG",
		zoneType: "RADIUS" as const,
		priceMultiplier: 1.2,
		isCentralZone: false,
	} as ZoneDataWithCentralFlag;

	const bussyCenter = {
		id: "zone-bussy-0",
		name: "Bussy Centre",
		code: "BUSSY_0",
		zoneType: "RADIUS" as const,
		priceMultiplier: 0.8,
		isCentralZone: true,
	} as ZoneDataWithCentralFlag;

	// Test flat rates
	const flatRates: IntraCentralFlatRateData[] = [
		{
			id: "flat-rate-1",
			vehicleCategoryId: "cat-berline",
			flatRate: 80.0,
			description: "Intra-Paris Berline",
			isActive: true,
		},
		{
			id: "flat-rate-2",
			vehicleCategoryId: "cat-van",
			flatRate: 120.0,
			description: "Intra-Paris Van",
			isActive: true,
		},
		{
			id: "flat-rate-3",
			vehicleCategoryId: "cat-inactive",
			flatRate: 50.0,
			description: "Inactive rate",
			isActive: false,
		},
	];

	const defaultConfig: HierarchicalPricingConfig = {
		enabled: true,
		skipLevel1: false,
		skipLevel2: false,
		skipLevel3: false,
		centralZoneCodes: ["PARIS_0", "BUSSY_0", "Z_0"],
	};

	describe("isCentralZone", () => {
		it("should return true for zone with isCentralZone flag", () => {
			expect(isCentralZone(parisCenter, defaultConfig)).toBe(true);
		});

		it("should return true for zone matching centralZoneCodes", () => {
			const zoneWithoutFlag: ZoneDataWithCentralFlag = {
				...parisCenter,
				isCentralZone: undefined,
			};
			expect(isCentralZone(zoneWithoutFlag, defaultConfig)).toBe(true);
		});

		it("should return false for non-central zone", () => {
			expect(isCentralZone(paris20, defaultConfig)).toBe(false);
		});

		it("should return false for null zone", () => {
			expect(isCentralZone(null, defaultConfig)).toBe(false);
		});

		it("should use default central codes when config has none", () => {
			const configWithoutCodes: HierarchicalPricingConfig = {
				enabled: true,
			};
			expect(isCentralZone(parisCenter, configWithoutCodes)).toBe(true);
		});
	});

	describe("checkSameRing", () => {
		it("should detect same ring for zones with matching codes", () => {
			const result = checkSameRing(paris20, paris20bis);
			expect(result.isSameRing).toBe(true);
			expect(result.ringCode).toBe("PARIS_20");
			expect(result.ringMultiplier).toBe(1.1);
		});

		it("should return false for different rings", () => {
			const result = checkSameRing(paris20, parisCenter);
			expect(result.isSameRing).toBe(false);
			expect(result.ringCode).toBeNull();
		});

		it("should return false for zones without ring pattern", () => {
			const result = checkSameRing(cdgZone, paris20);
			expect(result.isSameRing).toBe(false);
		});

		it("should return false for null zones", () => {
			expect(checkSameRing(null, paris20).isSameRing).toBe(false);
			expect(checkSameRing(paris20, null).isSameRing).toBe(false);
			expect(checkSameRing(null, null).isSameRing).toBe(false);
		});
	});

	describe("findIntraCentralFlatRate", () => {
		it("should find active flat rate for vehicle category", () => {
			const result = findIntraCentralFlatRate("cat-berline", flatRates);
			expect(result).not.toBeNull();
			expect(result?.id).toBe("flat-rate-1");
			expect(result?.flatRate).toBe(80.0);
		});

		it("should return null for non-existent category", () => {
			const result = findIntraCentralFlatRate("cat-unknown", flatRates);
			expect(result).toBeNull();
		});

		it("should not return inactive flat rates", () => {
			const result = findIntraCentralFlatRate("cat-inactive", flatRates);
			expect(result).toBeNull();
		});
	});

	describe("evaluateHierarchicalPricing", () => {
		const dynamicPrice = 100.0;

		describe("Priority 1: Intra-Central Flat Rate", () => {
			it("should apply flat rate for intra-central trip", () => {
				const result = evaluateHierarchicalPricing(
					parisCenter,
					bussyCenter,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(1);
				expect(result.levelName).toBe("INTRA_CENTRAL_FLAT_RATE");
				expect(result.appliedPrice).toBe(80.0);
				expect(result.details?.flatRateId).toBe("flat-rate-1");
				expect(result.skippedLevels).toHaveLength(0);
			});

			it("should skip to level 2 if no flat rate configured", () => {
				const result = evaluateHierarchicalPricing(
					parisCenter,
					bussyCenter,
					"cat-unknown",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(4); // Falls through to horokilometric
				expect(result.skippedLevels.some(s => s.level === 1 && s.reason === "NO_RATE_CONFIGURED")).toBe(true);
			});

			it("should skip level 1 if not intra-central", () => {
				const result = evaluateHierarchicalPricing(
					parisCenter,
					cdgZone,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).not.toBe(1);
				expect(result.skippedLevels.some(s => s.level === 1 && s.reason === "NOT_APPLICABLE")).toBe(true);
			});
		});

		describe("Priority 2: Inter-Zone Forfait", () => {
			it("should apply forfait when matched", () => {
				const matchedForfait = { id: "forfait-1", price: 150.0 };
				const result = evaluateHierarchicalPricing(
					parisCenter,
					cdgZone,
					"cat-berline",
					defaultConfig,
					flatRates,
					matchedForfait,
					dynamicPrice,
				);

				expect(result.level).toBe(2);
				expect(result.levelName).toBe("INTER_ZONE_FORFAIT");
				expect(result.appliedPrice).toBe(150.0);
				expect(result.details?.forfaitId).toBe("forfait-1");
			});

			it("should skip to level 3 if no forfait", () => {
				const result = evaluateHierarchicalPricing(
					paris20,
					cdgZone,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.skippedLevels.some(s => s.level === 2 && s.reason === "NO_RATE_CONFIGURED")).toBe(true);
			});
		});

		describe("Priority 3: Same-Ring Dynamic", () => {
			it("should apply ring multiplier for same-ring trip", () => {
				const result = evaluateHierarchicalPricing(
					paris20,
					paris20bis,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(3);
				expect(result.levelName).toBe("SAME_RING_DYNAMIC");
				expect(result.appliedPrice).toBe(110.0); // 100 * 1.1
				expect(result.details?.ringMultiplier).toBe(1.1);
				expect(result.details?.ringCode).toBe("PARIS_20");
			});

			it("should skip to level 4 if not same ring", () => {
				const result = evaluateHierarchicalPricing(
					paris20,
					cdgZone,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(4);
				expect(result.skippedLevels.some(s => s.level === 3 && s.reason === "ZONE_MISMATCH")).toBe(true);
			});
		});

		describe("Priority 4: Horokilometric Fallback", () => {
			it("should use dynamic price as fallback", () => {
				const result = evaluateHierarchicalPricing(
					paris20,
					cdgZone,
					"cat-berline",
					defaultConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(4);
				expect(result.levelName).toBe("HOROKILOMETRIC_FALLBACK");
				expect(result.appliedPrice).toBe(dynamicPrice);
			});
		});

		describe("Configuration options", () => {
			it("should skip level 1 when disabled by config", () => {
				const configSkipLevel1: HierarchicalPricingConfig = {
					...defaultConfig,
					skipLevel1: true,
				};

				const result = evaluateHierarchicalPricing(
					parisCenter,
					bussyCenter,
					"cat-berline",
					configSkipLevel1,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).not.toBe(1);
				expect(result.skippedLevels.some(s => s.level === 1 && s.reason === "DISABLED_BY_CONFIG")).toBe(true);
			});

			it("should skip level 2 when disabled by config", () => {
				const configSkipLevel2: HierarchicalPricingConfig = {
					...defaultConfig,
					skipLevel2: true,
				};
				const matchedForfait = { id: "forfait-1", price: 150.0 };

				const result = evaluateHierarchicalPricing(
					paris20,
					cdgZone,
					"cat-berline",
					configSkipLevel2,
					flatRates,
					matchedForfait,
					dynamicPrice,
				);

				expect(result.level).not.toBe(2);
				expect(result.skippedLevels.some(s => s.level === 2 && s.reason === "DISABLED_BY_CONFIG")).toBe(true);
			});

			it("should skip level 3 when disabled by config", () => {
				const configSkipLevel3: HierarchicalPricingConfig = {
					...defaultConfig,
					skipLevel3: true,
				};

				const result = evaluateHierarchicalPricing(
					paris20,
					paris20bis,
					"cat-berline",
					configSkipLevel3,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(4);
				expect(result.skippedLevels.some(s => s.level === 3 && s.reason === "DISABLED_BY_CONFIG")).toBe(true);
			});

			it("should go straight to fallback when hierarchical pricing disabled", () => {
				const disabledConfig: HierarchicalPricingConfig = {
					enabled: false,
				};

				const result = evaluateHierarchicalPricing(
					parisCenter,
					bussyCenter,
					"cat-berline",
					disabledConfig,
					flatRates,
					null,
					dynamicPrice,
				);

				expect(result.level).toBe(4);
				expect(result.levelName).toBe("HOROKILOMETRIC_FALLBACK");
				expect(result.skippedLevels).toHaveLength(0);
			});
		});

		describe("Priority order enforcement", () => {
			it("should prefer level 1 over level 2 when both match", () => {
				const matchedForfait = { id: "forfait-1", price: 150.0 };
				const result = evaluateHierarchicalPricing(
					parisCenter,
					bussyCenter,
					"cat-berline",
					defaultConfig,
					flatRates,
					matchedForfait,
					dynamicPrice,
				);

				expect(result.level).toBe(1);
				expect(result.appliedPrice).toBe(80.0); // Flat rate, not forfait
			});

			it("should prefer level 2 over level 3 when both match", () => {
				// Create a scenario where both forfait and same-ring could match
				const matchedForfait = { id: "forfait-1", price: 150.0 };
				const result = evaluateHierarchicalPricing(
					paris20,
					paris20bis,
					"cat-berline",
					defaultConfig,
					flatRates,
					matchedForfait,
					dynamicPrice,
				);

				expect(result.level).toBe(2);
				expect(result.appliedPrice).toBe(150.0); // Forfait, not ring dynamic
			});
		});
	});

	describe("buildHierarchicalPricingRule", () => {
		it("should build applied rule from result", () => {
			const result = evaluateHierarchicalPricing(
				parisCenter,
				bussyCenter,
				"cat-berline",
				defaultConfig,
				flatRates,
				null,
				100.0,
			);

			const rule = buildHierarchicalPricingRule(result);

			expect(rule.type).toBe("HIERARCHICAL_PRICING");
			expect(rule.level).toBe(1);
			expect(rule.levelName).toBe("INTRA_CENTRAL_FLAT_RATE");
			expect(rule.appliedPrice).toBe(80.0);
			expect(rule.description).toContain("Intra-central flat rate");
		});
	});
});
