/**
 * Test Suite for Story 19-15: Modular Architecture Validation
 * 
 * This test validates that the modular decomposition works correctly:
 * - All functions are exported from the index.ts barrel
 * - Backward compatibility is maintained
 * - Each module can be imported independently
 */

import {
	// Types
	type PricingRequest,
	type PricingResult,
	type OrganizationPricingSettings,
	
	// Constants
	DEFAULT_COST_PARAMETERS,
	DEFAULT_FUEL_PRICES,
	
	// Cost Calculator
	calculateFuelCost,
	calculateCostBreakdown,
	calculateInternalCost,
	
	// Zone Resolver
	applyZoneMultiplier,
	calculateEffectiveZoneMultiplier,
	
	// Dynamic Pricing
	calculateDynamicBasePrice,
	resolveRates,
	
	// Multiplier Engine
	applyAllMultipliers,
	applyVehicleCategoryMultiplier,
	
	// Profitability
	calculateProfitabilityIndicator,
	getProfitabilityIndicatorData,
	
	// Shadow Calculator
	calculateShadowSegments,
	
	// Trip Type Pricing
	applyTripTypePricing,
	calculateExcursionPrice,
	calculateDispoPrice,
} from "../pricing";

describe("Story 19-15: Modular Architecture Validation", () => {
	describe("Module Exports", () => {
		it("should export all types from index.ts", () => {
			// Verify types are available (this will fail at compile time if not)
			const request: PricingRequest = {} as PricingRequest;
			const result: PricingResult = {} as PricingResult;
			const settings: OrganizationPricingSettings = {} as OrganizationPricingSettings;
			
			expect(request).toBeDefined();
			expect(result).toBeDefined();
			expect(settings).toBeDefined();
		});

		it("should export all constants", () => {
			expect(DEFAULT_COST_PARAMETERS).toBeDefined();
			expect(DEFAULT_COST_PARAMETERS.fuelConsumptionL100km).toBe(8.0);
			expect(DEFAULT_COST_PARAMETERS.driverHourlyCost).toBe(25.0);
			
			expect(DEFAULT_FUEL_PRICES).toBeDefined();
			expect(DEFAULT_FUEL_PRICES.DIESEL).toBe(1.789);
			expect(DEFAULT_FUEL_PRICES.GASOLINE).toBe(1.899);
		});

		it("should export cost calculator functions", () => {
			const fuelCost = calculateFuelCost(100, 8.0, "DIESEL");
			expect(fuelCost).toBeDefined();
			expect(fuelCost.amount).toBe(14.31);
			expect(fuelCost.distanceKm).toBe(100);
			expect(fuelCost.fuelType).toBe("DIESEL");

			const breakdown = calculateCostBreakdown(100, 60, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
			});
			expect(breakdown).toBeDefined();
			expect(breakdown.total).toBeGreaterThan(0);

			const internalCost = calculateInternalCost(100, 60, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
			});
			expect(internalCost).toBe(breakdown.total);
		});

		it("should export zone resolver functions", () => {
			const { multiplier } = calculateEffectiveZoneMultiplier(1.2, 1.1, "MAX");
			expect(multiplier).toBe(1.2);

			const zoneResult = applyZoneMultiplier(100, {
				id: "zone1",
				name: "Test Zone",
				code: "TEST",
				priceMultiplier: 1.2,
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 10,
				organizationId: "org1",
				isActive: true,
				zoneType: "RADIUS",
				createdAt: new Date(),
				updatedAt: new Date(),
				priceMultiplier: 1.2,
				fixedParkingSurcharge: null,
				fixedAccessFee: null,
				surchargeDescription: null,
				parentZoneId: null,
				corridorBufferMeters: null,
			}, null, "MAX");
			expect(zoneResult.adjustedPrice).toBe(120);
			expect(zoneResult.appliedMultiplier).toBe(1.2);
		});

		it("should export dynamic pricing functions", () => {
			const dynamicResult = calculateDynamicBasePrice(100, 60, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
			});
			expect(dynamicResult).toBeDefined();
			expect(dynamicResult.selectedMethod).toBe("distance");
			expect(dynamicResult.priceWithMargin).toBeGreaterThan(0);

			const rates = resolveRates(undefined, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
			});
			expect(rates.rateSource).toBe("ORGANIZATION");
			expect(rates.usedCategoryRates).toBe(false);
		});

		it("should export multiplier engine functions", () => {
			const multiplierResult = applyAllMultipliers(100, {
				pickupAt: null,
				estimatedEndAt: null,
				distanceKm: 100,
				pickupZoneId: null,
				dropoffZoneId: null,
			}, [], []);
			expect(multiplierResult.adjustedPrice).toBe(100);
			expect(multiplierResult.appliedRules).toEqual([]);

			const categoryResult = applyVehicleCategoryMultiplier(100, {
				id: "cat1",
				code: "LUXURY",
				name: "Luxury Vehicle",
				priceMultiplier: 1.5,
				defaultRatePerKm: null,
				defaultRatePerHour: null,
				fuelType: null,
				regulatoryCategory: null,
			});
			expect(categoryResult.adjustedPrice).toBe(150);
			expect(categoryResult.appliedRule).toBeDefined();
		});

		it("should export profitability functions", () => {
			const indicator = calculateProfitabilityIndicator(25);
			expect(indicator).toBe("green");

			const indicatorData = getProfitabilityIndicatorData(25);
			expect(indicatorData.indicator).toBe("green");
			expect(indicatorData.label).toBe("Profitable");
			expect(indicatorData.marginPercent).toBe(25);
		});

		it("should export shadow calculator functions", () => {
			const shadowResult = calculateShadowSegments(null, 100, 60, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
			});
			expect(shadowResult).toBeDefined();
			expect(shadowResult.segments.service).toBeDefined();
			expect(shadowResult.totalDistanceKm).toBe(100);
			expect(shadowResult.totalDurationMinutes).toBe(60);
		});

		it("should export trip type pricing functions", () => {
			const transferResult = applyTripTypePricing(
				"transfer",
				100,
				60,
				30,
				150,
				{ baseRatePerKm: 1.5, baseRatePerHour: 30, targetMarginPercent: 20 }
			);
			expect(transferResult.price).toBe(150);
			expect(transferResult.rule).toBeNull();

			const excursionResult = calculateExcursionPrice(240, 30, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
				excursionMinimumHours: 4,
				excursionSurchargePercent: 15,
			});
			expect(excursionResult.price).toBeGreaterThan(0);
			expect(excursionResult.rule).toBeDefined();
			expect(excursionResult.rule?.tripType).toBe("excursion");

			const dispoResult = calculateDispoPrice(240, 300, 45, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
				dispoIncludedKmPerHour: 50,
				dispoOverageRatePerKm: 0.5,
			});
			expect(dispoResult.price).toBeGreaterThan(0);
			expect(dispoResult.rule).toBeDefined();
			expect(dispoResult.rule?.tripType).toBe("dispo");
		});
	});

	describe("Backward Compatibility", () => {
		it("should maintain same API as before modularization", () => {
			// Test that all function signatures remain the same
			const fuelCost = calculateFuelCost(100, 8.0, "DIESEL", { DIESEL: 2.0 });
			expect(fuelCost.amount).toBe(16.0);

			const zoneResult = applyZoneMultiplier(100, null, null);
			expect(zoneResult.adjustedPrice).toBe(100);
			expect(zoneResult.appliedMultiplier).toBe(1.0);

			const dynamicResult = calculateDynamicBasePrice(100, 60, {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
			}, {
				ratePerKm: 2.0,
				ratePerHour: 40,
				rateSource: "CATEGORY",
			});
			expect(dynamicResult.inputs.rateSource).toBe("CATEGORY");
		});

		it("should handle edge cases consistently", () => {
			// Zero values
			const zeroFuel = calculateFuelCost(0, 8.0, "DIESEL");
			expect(zeroFuel.amount).toBe(0);

			// Null zones
			const nullZoneResult = applyZoneMultiplier(100, null, null);
			expect(nullZoneResult.adjustedPrice).toBe(100);

			// Empty multipliers
			const emptyMultiplierResult = applyAllMultipliers(100, {
				pickupAt: new Date(),
				estimatedEndAt: null,
				distanceKm: 100,
				pickupZoneId: null,
				dropoffZoneId: null,
			}, [], []);
			expect(emptyMultiplierResult.adjustedPrice).toBe(100);
		});
	});

	describe("Module Independence", () => {
		it("should allow importing individual modules", async () => {
			// Test that individual modules can be imported
			const costCalculator = await import("../pricing/cost-calculator");
			expect(costCalculator.calculateFuelCost).toBeDefined();
			expect(costCalculator.calculateCostBreakdown).toBeDefined();

			const zoneResolver = await import("../pricing/zone-resolver");
			expect(zoneResolver.applyZoneMultiplier).toBeDefined();
			expect(zoneResolver.calculateEffectiveZoneMultiplier).toBeDefined();

			const dynamicPricing = await import("../pricing/dynamic-pricing");
			expect(dynamicPricing.calculateDynamicBasePrice).toBeDefined();
			expect(dynamicPricing.resolveRates).toBeDefined();

			const multiplierEngine = await import("../pricing/multiplier-engine");
			expect(multiplierEngine.applyAllMultipliers).toBeDefined();
			expect(multiplierEngine.applyVehicleCategoryMultiplier).toBeDefined();

			const profitability = await import("../pricing/profitability");
			expect(profitability.calculateProfitabilityIndicator).toBeDefined();
			expect(profitability.getProfitabilityIndicatorData).toBeDefined();

			const shadowCalculator = await import("../pricing/shadow-calculator");
			expect(shadowCalculator.calculateShadowSegments).toBeDefined();

			const tripTypePricing = await import("../pricing/trip-type-pricing");
			expect(tripTypePricing.applyTripTypePricing).toBeDefined();
			expect(tripTypePricing.calculateExcursionPrice).toBeDefined();
		});
	});

	describe("Integration Test", () => {
		it("should work end-to-end with all modules combined", () => {
			// Simulate a complete pricing calculation using all modules
			const settings = {
				baseRatePerKm: 1.5,
				baseRatePerHour: 30,
				targetMarginPercent: 20,
				fuelConsumptionL100km: 8.0,
				fuelPricePerLiter: 1.80,
				tollCostPerKm: 0.15,
				wearCostPerKm: 0.10,
				driverHourlyCost: 25.0,
				greenMarginThreshold: 20,
				orangeMarginThreshold: 0,
			};

			// 1. Calculate dynamic base price
			const dynamicResult = calculateDynamicBasePrice(100, 60, settings);
			expect(dynamicResult.priceWithMargin).toBeGreaterThan(0);

			// 2. Apply zone multiplier
			const zoneResult = applyZoneMultiplier(
				dynamicResult.priceWithMargin,
				{ id: "zone1", name: "Paris", code: "PARIS", priceMultiplier: 1.2, geometry: null, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 10, organizationId: "org1", isActive: true, zoneType: "RADIUS", createdAt: new Date(), updatedAt: new Date(), priceMultiplier: 1.2, fixedParkingSurcharge: null, fixedAccessFee: null, surchargeDescription: null, parentZoneId: null, corridorBufferMeters: null },
				{ id: "zone2", name: "Airport", code: "CDG", priceMultiplier: 1.1, geometry: null, centerLatitude: 49.0097, centerLongitude: 2.5479, radiusKm: 5, organizationId: "org1", isActive: true, zoneType: "RADIUS", createdAt: new Date(), updatedAt: new Date(), priceMultiplier: 1.1, fixedParkingSurcharge: null, fixedAccessFee: null, surchargeDescription: null, parentZoneId: null, corridorBufferMeters: null },
				"MAX"
			);
			expect(zoneResult.adjustedPrice).toBeGreaterThan(dynamicResult.priceWithMargin);

			// 3. Apply vehicle category multiplier
			const categoryResult = applyVehicleCategoryMultiplier(
				zoneResult.adjustedPrice,
				{ id: "cat1", code: "LUXURY", name: "Luxury Vehicle", priceMultiplier: 1.3, defaultRatePerKm: null, defaultRatePerHour: null, fuelType: null, regulatoryCategory: null }
			);
			expect(categoryResult.adjustedPrice).toBeGreaterThan(zoneResult.adjustedPrice);

			// 4. Calculate profitability
			const internalCost = calculateInternalCost(100, 60, settings);
			const margin = categoryResult.adjustedPrice - internalCost;
			const marginPercent = (margin / categoryResult.adjustedPrice) * 100;
			const indicator = calculateProfitabilityIndicator(marginPercent);
			expect(indicator).toBe("green");

			// 5. Create shadow calculation
			const shadowResult = calculateShadowSegments(null, 100, 60, settings);
			expect(shadowResult.totalDistanceKm).toBe(100);
			expect(shadowResult.totalInternalCost).toBe(internalCost);

			// Verify the complete flow works
			expect(categoryResult.adjustedPrice).toBeGreaterThan(0);
			expect(margin).toBeGreaterThan(0);
			expect(marginPercent).toBeGreaterThan(0);
		});
	});
});
