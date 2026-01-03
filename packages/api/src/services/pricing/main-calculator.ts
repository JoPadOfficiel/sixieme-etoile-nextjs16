/**
 * Main Calculator Module
 * Story 19-15: Core pricing calculation functions
 * 
 * This module contains the main entry points for pricing calculation:
 * - calculatePrice: Main pricing calculation function
 * - applyPriceOverride: Manual price override with profitability recalculation
 */

import type {
	PricingRequest,
	PricingResult,
	PricingEngineContext,
	ZoneData,
	AppliedRule,
	MatchedGrid,
	GridSearchDetails,
	FallbackReason,
	ManualOverrideRule,
	ZoneRouteAssignment,
	ExcursionPackageAssignment,
	DispoPackageAssignment,
} from "./types";

import { calculateCostBreakdown, calculateCostBreakdownWithTolls, calculateCostBreakdownWithRealCosts, type RealCostConfig } from "./cost-calculator";
import type { TollConfig, FuelPriceSourceInfo } from "./types";
import { calculateDynamicBasePrice, resolveRates } from "./dynamic-pricing";
import { applyAllMultipliers, applyVehicleCategoryMultiplier, applyRoundTripMultiplier } from "./multiplier-engine";
import { applyZoneMultiplier, buildZoneTransparencyInfo } from "./zone-resolver";
import { calculateProfitabilityIndicator, getProfitabilityIndicatorData, getThresholdsFromSettings } from "./profitability";
import { applyTripTypePricing } from "./trip-type-pricing";
import { calculateShadowSegments, calculateTimeAnalysis, calculatePositioningCosts, calculateRoundTripSegments, extendTripAnalysisForRoundTrip } from "./shadow-calculator";
import { isPointInZone, findZonesForPoint, resolveZoneConflict } from "../../lib/geo-utils";
import { validatePricingResult } from "./validation";
import { integrateComplianceIntoPricing } from "../pricing-engine";

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate price for a trip
 * 
 * This is the main entry point for pricing calculation.
 * It handles:
 * 1. Grid matching for partner contracts (FIXED_GRID mode)
 * 2. Dynamic pricing for private clients (DYNAMIC mode)
 * 3. Trip type specific pricing (transfer, excursion, dispo)
 * 4. All multipliers (zone, vehicle category, advanced rates, seasonal)
 */
export function calculatePrice(
	request: PricingRequest,
	context: PricingEngineContext,
): PricingResult {
	const { contact, zones, pricingSettings, advancedRates, seasonalMultipliers, vehicleCategory } = context;
	const appliedRules: AppliedRule[] = [];
	
	// Story 21.8: Find pickup and dropoff zones with candidates for transparency
	const conflictStrategy = pricingSettings.zoneConflictStrategy ?? null;
	const pickupDetection = findZoneForPointWithCandidates(request.pickup, zones, conflictStrategy);
	const dropoffDetection = findZoneForPointWithCandidates(request.dropoff, zones, conflictStrategy);
	const pickupZone = pickupDetection.selectedZone;
	const dropoffZone = dropoffDetection.selectedZone;
	
	// Initialize grid search details
	const gridSearchDetails: GridSearchDetails = {
		pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code } : null,
		dropoffZone: dropoffZone ? { id: dropoffZone.id, name: dropoffZone.name, code: dropoffZone.code } : null,
		vehicleCategoryId: request.vehicleCategoryId,
		tripType: request.tripType,
		routesChecked: [],
		excursionsChecked: [],
		disposChecked: [],
	};
	
	// Try to match a grid for partner contracts
	let matchedGrid: MatchedGrid | null = null;
	let price = 0;
	let pricingMode: "FIXED_GRID" | "DYNAMIC" = "DYNAMIC";
	let fallbackReason: FallbackReason = null;
	let isContractPrice = false;
	
	if (contact.isPartner && contact.partnerContract) {
		const gridMatch = matchGrid(
			request,
			contact.partnerContract,
			pickupZone,
			dropoffZone,
			gridSearchDetails,
		);
		
		if (gridMatch) {
			matchedGrid = gridMatch.matchedGrid;
			price = gridMatch.price;
			pricingMode = "FIXED_GRID";
			isContractPrice = true;
			
			appliedRules.push({
				type: "GRID_MATCH",
				gridType: matchedGrid.type,
				gridId: matchedGrid.id,
				gridName: matchedGrid.name,
				price,
			});
		} else {
			fallbackReason = "NO_ROUTE_MATCH";
		}
	} else if (!contact.isPartner) {
		fallbackReason = "PRIVATE_CLIENT";
	} else {
		fallbackReason = "NO_CONTRACT";
	}
	
	// Calculate distance and duration
	const distanceKm = request.estimatedDistanceKm ?? 10;
	const durationMinutes = request.estimatedDurationMinutes ?? 30;
	
	// Story 20.6: Resolve rates once for use in dynamic pricing and category multiplier check
	const rates = resolveRates(vehicleCategory, pricingSettings);
	
	// If no grid match, use dynamic pricing
	if (pricingMode === "DYNAMIC") {
		const dynamicResult = calculateDynamicBasePrice(
			distanceKm,
			durationMinutes,
			pricingSettings,
			rates.usedCategoryRates ? { ratePerKm: rates.ratePerKm, ratePerHour: rates.ratePerHour, rateSource: rates.rateSource } : null,
		);
		price = dynamicResult.priceWithMargin;
		
		appliedRules.push({
			type: "DYNAMIC_BASE_CALCULATION",
			description: `Dynamic pricing: ${dynamicResult.selectedMethod} method`,
			inputs: dynamicResult.inputs,
			calculation: {
				distanceBasedPrice: dynamicResult.distanceBasedPrice,
				durationBasedPrice: dynamicResult.durationBasedPrice,
				selectedMethod: dynamicResult.selectedMethod,
				basePrice: dynamicResult.basePrice,
				priceWithMargin: dynamicResult.priceWithMargin,
			},
		});
	}
	
	// Apply trip type specific pricing (excursion, dispo)
	if (request.tripType !== "transfer") {
		const ratePerHour = pricingSettings.baseRatePerHour;
		const tripTypeResult = applyTripTypePricing(
			request.tripType,
			distanceKm,
			durationMinutes,
			ratePerHour,
			price, // standardBasePrice
			pricingSettings,
			request.vehicleCategoryId,
		);
		price = tripTypeResult.price;
		if (tripTypeResult.rule) {
			appliedRules.push(tripTypeResult.rule);
		}
	}
	
	// Apply zone multiplier
	// Story 21.8: Capture price before/after for zone transparency
	const priceBeforeZoneMultiplier = price;
	if (pickupZone || dropoffZone) {
		const zoneResult = applyZoneMultiplier(
			price,
			pickupZone,
			dropoffZone,
			pricingSettings.zoneMultiplierAggregationStrategy ?? "MAX",
		);
		price = zoneResult.adjustedPrice;
		if (zoneResult.appliedRule) {
			appliedRules.push(zoneResult.appliedRule);
		}
	}
	const priceAfterZoneMultiplier = price;
	
	// Apply vehicle category multiplier
	// Story 20.6: Pass usedCategoryRates to skip multiplier when category rates already include premium
	if (vehicleCategory && vehicleCategory.priceMultiplier !== 1.0) {
		const categoryResult = applyVehicleCategoryMultiplier(price, vehicleCategory, rates.usedCategoryRates);
		price = categoryResult.adjustedPrice;
		if (categoryResult.appliedRule) {
			appliedRules.push(categoryResult.appliedRule);
		}
	}
	
	// Apply advanced rates and seasonal multipliers
	if ((advancedRates && advancedRates.length > 0) || (seasonalMultipliers && seasonalMultipliers.length > 0)) {
		const pickupAt = request.pickupAt ? new Date(request.pickupAt) : null;
		const multiplierResult = applyAllMultipliers(
			price,
			{
				pickupAt,
				estimatedEndAt: null,
				distanceKm,
				pickupZoneId: pickupZone?.id ?? null,
				dropoffZoneId: dropoffZone?.id ?? null,
			},
			advancedRates ?? [],
			seasonalMultipliers ?? [],
		);
		price = multiplierResult.adjustedPrice;
		appliedRules.push(...multiplierResult.appliedRules);
	}
	
	// Calculate cost breakdown first (needed for round trip)
	const costBreakdown = calculateCostBreakdown(
		distanceKm,
		durationMinutes,
		pricingSettings,
	);
	
	// Calculate internal cost
	let internalCost = costBreakdown.total;
	
	// Calculate segments (shadow calculation)
	// Story 21.6: Use vehicle selection input if available for accurate positioning costs
	let tripAnalysis = calculateShadowSegments(
		context.vehicleSelectionInput ?? null,
		distanceKm,
		durationMinutes,
		pricingSettings,
	);
	
	// Story 22.1: Apply round trip segment-based calculation if applicable
	if (request.isRoundTrip) {
		const roundTripResult = calculateRoundTripSegments(
			price,
			internalCost,
			tripAnalysis,
			pricingSettings,
			undefined, // waitingTimeMinutes - could be passed from request in future
			undefined, // waitOnSiteThresholdMinutes - uses default
		);
		price = roundTripResult.adjustedPrice;
		internalCost = roundTripResult.adjustedInternalCost;
		appliedRules.push(roundTripResult.appliedRule);
		
		// Extend trip analysis with round trip segments
		tripAnalysis = extendTripAnalysisForRoundTrip(tripAnalysis, roundTripResult);
	}
	
	// Story 21.3: Calculate time analysis breakdown
	const pickupAtDate = request.pickupAt ? new Date(request.pickupAt) : null;
	tripAnalysis.timeAnalysis = calculateTimeAnalysis(
		durationMinutes,
		tripAnalysis.routingSource,
		vehicleCategory?.regulatoryCategory ?? null,
		vehicleCategory?.name ?? null,
		pickupAtDate,
	);
	
	// Story 19.2: Integrate RSE compliance for HEAVY vehicles (2 drivers for long trips)
	if (vehicleCategory?.regulatoryCategory === "HEAVY" && pricingSettings.organizationId) {
		const complianceResult = integrateComplianceIntoPricing({
			organizationId: pricingSettings.organizationId,
			vehicleCategoryId: vehicleCategory.id,
			regulatoryCategory: "HEAVY",
			tripAnalysis,
			pickupAt: pickupAtDate ?? new Date(),
			staffingSelectionPolicy: pricingSettings.staffingSelectionPolicy ?? "CHEAPEST",
			costParameters: pricingSettings.staffingCostParameters ?? undefined,
		});
		
		// Update tripAnalysis with compliancePlan
		tripAnalysis = complianceResult.tripAnalysis;
		
		// Add staffing costs to internal cost and price
		if (complianceResult.additionalStaffingCost > 0) {
			internalCost += complianceResult.additionalStaffingCost;
			price += complianceResult.additionalStaffingCost;
			
			if (complianceResult.appliedRule) {
				appliedRules.push(complianceResult.appliedRule);
			}
		}
	}
	
	// Story 21.6: Calculate positioning costs (with estimation when no vehicle selected)
	tripAnalysis.positioningCosts = calculatePositioningCosts({
		tripType: request.tripType,
		segments: tripAnalysis.segments,
		serviceDistanceKm: distanceKm,
		serviceDurationMinutes: durationMinutes,
		pricingSettings,
		durationHours: request.durationHours,
		includedHours: pricingSettings.dispoIncludedKmPerHour ? 4 : undefined,
		availabilityRatePerHour: pricingSettings.baseRatePerHour,
	});
	
	// Story 21.6: Add positioning costs to internal cost
	// Internal cost = service cost + approach cost + empty return cost
	if (tripAnalysis.positioningCosts) {
		internalCost += tripAnalysis.positioningCosts.totalPositioningCost;
	}
	
	// Get profitability thresholds
	const thresholds = getThresholdsFromSettings(pricingSettings);
	
	// Calculate profitability
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent = price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;
	const profitabilityIndicator = calculateProfitabilityIndicator(marginPercent, thresholds);
	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);
	
	// Round price
	price = Math.round(price * 100) / 100;
	
	// Story 21.8: Build zone transparency info
	tripAnalysis.zoneTransparency = buildZoneTransparencyInfo(
		request.pickup,
		request.dropoff,
		pickupZone,
		dropoffZone,
		pickupDetection.candidateZones,
		dropoffDetection.candidateZones,
		conflictStrategy,
		pricingSettings.zoneMultiplierAggregationStrategy ?? null,
		priceBeforeZoneMultiplier,
		priceAfterZoneMultiplier,
	);
	
	return {
		pricingMode,
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator,
		profitabilityData,
		matchedGrid,
		appliedRules,
		isContractPrice,
		fallbackReason,
		gridSearchDetails,
		tripAnalysis,
	};
}

// ============================================================================
// Story 20.3: Async Pricing with Real Toll Costs
// ============================================================================

/**
 * Calculate price with real toll costs from Google Routes API
 * 
 * This is an async version of calculatePrice that fetches real toll costs
 * instead of using flat-rate estimates.
 * 
 * @param request - Pricing request with trip details
 * @param context - Pricing engine context with settings and zones
 * @param tollConfig - Optional toll configuration with API key
 * @returns PricingResult with real toll costs and tollSource indicator
 */
export async function calculatePriceWithRealTolls(
	request: PricingRequest,
	context: PricingEngineContext,
	tollConfig?: TollConfig,
): Promise<PricingResult> {
	const { contact, zones, pricingSettings, advancedRates, seasonalMultipliers, vehicleCategory } = context;
	const appliedRules: AppliedRule[] = [];
	
	// Story 21.8: Find pickup and dropoff zones with candidates for transparency
	const conflictStrategy = pricingSettings.zoneConflictStrategy ?? null;
	const pickupDetection = findZoneForPointWithCandidates(request.pickup, zones, conflictStrategy);
	const dropoffDetection = findZoneForPointWithCandidates(request.dropoff, zones, conflictStrategy);
	const pickupZone = pickupDetection.selectedZone;
	const dropoffZone = dropoffDetection.selectedZone;
	
	// Initialize grid search details
	const gridSearchDetails: GridSearchDetails = {
		pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code } : null,
		dropoffZone: dropoffZone ? { id: dropoffZone.id, name: dropoffZone.name, code: dropoffZone.code } : null,
		vehicleCategoryId: request.vehicleCategoryId,
		tripType: request.tripType,
		routesChecked: [],
		excursionsChecked: [],
		disposChecked: [],
	};
	
	// Try to match a grid for partner contracts
	let matchedGrid: MatchedGrid | null = null;
	let price = 0;
	let pricingMode: "FIXED_GRID" | "DYNAMIC" = "DYNAMIC";
	let fallbackReason: FallbackReason = null;
	let isContractPrice = false;
	
	if (contact.isPartner && contact.partnerContract) {
		const gridMatch = matchGrid(
			request,
			contact.partnerContract,
			pickupZone,
			dropoffZone,
			gridSearchDetails,
		);
		
		if (gridMatch) {
			matchedGrid = gridMatch.matchedGrid;
			price = gridMatch.price;
			pricingMode = "FIXED_GRID";
			isContractPrice = true;
			
			appliedRules.push({
				type: "GRID_MATCH",
				gridType: matchedGrid.type,
				gridId: matchedGrid.id,
				gridName: matchedGrid.name,
				price,
			});
		} else {
			fallbackReason = "NO_ROUTE_MATCH";
		}
	} else if (!contact.isPartner) {
		fallbackReason = "PRIVATE_CLIENT";
	} else {
		fallbackReason = "NO_CONTRACT";
	}
	
	// Calculate distance and duration
	const distanceKm = request.estimatedDistanceKm ?? 10;
	const durationMinutes = request.estimatedDurationMinutes ?? 30;
	
	// Story 20.6: Resolve rates once for use in dynamic pricing and category multiplier check
	const rates = resolveRates(vehicleCategory, pricingSettings);
	
	// If no grid match, use dynamic pricing
	if (pricingMode === "DYNAMIC") {
		const dynamicResult = calculateDynamicBasePrice(
			distanceKm,
			durationMinutes,
			pricingSettings,
			rates.usedCategoryRates ? { ratePerKm: rates.ratePerKm, ratePerHour: rates.ratePerHour, rateSource: rates.rateSource } : null,
		);
		price = dynamicResult.priceWithMargin;
		
		appliedRules.push({
			type: "DYNAMIC_BASE_CALCULATION",
			description: `Dynamic pricing: ${dynamicResult.selectedMethod} method`,
			inputs: dynamicResult.inputs,
			calculation: {
				distanceBasedPrice: dynamicResult.distanceBasedPrice,
				durationBasedPrice: dynamicResult.durationBasedPrice,
				selectedMethod: dynamicResult.selectedMethod,
				basePrice: dynamicResult.basePrice,
				priceWithMargin: dynamicResult.priceWithMargin,
			},
		});
	}
	
	// Apply trip type specific pricing (excursion, dispo)
	if (request.tripType !== "transfer") {
		const ratePerHour = pricingSettings.baseRatePerHour;
		const tripTypeResult = applyTripTypePricing(
			request.tripType,
			distanceKm,
			durationMinutes,
			ratePerHour,
			price,
			pricingSettings,
			request.vehicleCategoryId,
		);
		price = tripTypeResult.price;
		if (tripTypeResult.rule) {
			appliedRules.push(tripTypeResult.rule);
		}
	}
	
	// Apply zone multiplier
	// Story 21.8: Capture price before/after for zone transparency
	const priceBeforeZoneMultiplier = price;
	if (pickupZone || dropoffZone) {
		const zoneResult = applyZoneMultiplier(
			price,
			pickupZone,
			dropoffZone,
			pricingSettings.zoneMultiplierAggregationStrategy ?? "MAX",
		);
		price = zoneResult.adjustedPrice;
		if (zoneResult.appliedRule) {
			appliedRules.push(zoneResult.appliedRule);
		}
	}
	const priceAfterZoneMultiplier = price;
	
	// Apply vehicle category multiplier
	// Story 20.6: Pass usedCategoryRates to skip multiplier when category rates already include premium
	if (vehicleCategory && vehicleCategory.priceMultiplier !== 1.0) {
		const categoryResult = applyVehicleCategoryMultiplier(price, vehicleCategory, rates.usedCategoryRates);
		price = categoryResult.adjustedPrice;
		if (categoryResult.appliedRule) {
			appliedRules.push(categoryResult.appliedRule);
		}
	}
	
	// Apply advanced rates and seasonal multipliers
	if ((advancedRates && advancedRates.length > 0) || (seasonalMultipliers && seasonalMultipliers.length > 0)) {
		const pickupAt = request.pickupAt ? new Date(request.pickupAt) : null;
		const multiplierResult = applyAllMultipliers(
			price,
			{
				pickupAt,
				estimatedEndAt: null,
				distanceKm,
				pickupZoneId: pickupZone?.id ?? null,
				dropoffZoneId: dropoffZone?.id ?? null,
			},
			advancedRates ?? [],
			seasonalMultipliers ?? [],
		);
		price = multiplierResult.adjustedPrice;
		appliedRules.push(...multiplierResult.appliedRules);
	}
	
	// Story 20.5: Calculate cost breakdown with real fuel prices AND real tolls (async)
	const realCostConfig: RealCostConfig = {
		pickup: request.pickup,
		dropoff: request.dropoff,
		organizationId: pricingSettings.organizationId,
		tollApiKey: tollConfig?.apiKey,
	};
	
	// Get fuel type from vehicle category if available
	const fuelType = vehicleCategory?.fuelType ?? "DIESEL";
	
	const { breakdown: costBreakdown, tollSource, fuelPriceSource } = await calculateCostBreakdownWithRealCosts(
		distanceKm,
		durationMinutes,
		pricingSettings,
		realCostConfig,
		0, // parkingCost
		"", // parkingDescription
		fuelType,
	);
	
	// Calculate internal cost
	let internalCost = costBreakdown.total;
	
	// Calculate segments (shadow calculation)
	// Story 21.6: Use vehicle selection input if available for accurate positioning costs
	let tripAnalysis = calculateShadowSegments(
		context.vehicleSelectionInput ?? null,
		distanceKm,
		durationMinutes,
		pricingSettings,
	);
	
	// Story 20.3: Add tollSource to tripAnalysis
	tripAnalysis.tollSource = tollSource;
	// Story 20.5: Add fuelPriceSource to tripAnalysis
	tripAnalysis.fuelPriceSource = fuelPriceSource;
	// Update costBreakdown with real cost data
	tripAnalysis.costBreakdown = costBreakdown;
	
	// Story 22.1: Apply round trip segment-based calculation if applicable
	if (request.isRoundTrip) {
		const roundTripResult = calculateRoundTripSegments(
			price,
			internalCost,
			tripAnalysis,
			pricingSettings,
			undefined, // waitingTimeMinutes - could be passed from request in future
			undefined, // waitOnSiteThresholdMinutes - uses default
		);
		price = roundTripResult.adjustedPrice;
		internalCost = roundTripResult.adjustedInternalCost;
		appliedRules.push(roundTripResult.appliedRule);
		
		// Extend trip analysis with round trip segments
		tripAnalysis = extendTripAnalysisForRoundTrip(tripAnalysis, roundTripResult);
		// Preserve toll and fuel sources after extension
		tripAnalysis.tollSource = tollSource;
		tripAnalysis.fuelPriceSource = fuelPriceSource;
	}
	
	// Story 21.3: Calculate time analysis breakdown
	const pickupAtDate = request.pickupAt ? new Date(request.pickupAt) : null;
	tripAnalysis.timeAnalysis = calculateTimeAnalysis(
		durationMinutes,
		tripAnalysis.routingSource,
		vehicleCategory?.regulatoryCategory ?? null,
		vehicleCategory?.name ?? null,
		pickupAtDate,
	);
	
	// Story 21.6: Calculate positioning costs (with estimation when no vehicle selected)
	tripAnalysis.positioningCosts = calculatePositioningCosts({
		tripType: request.tripType,
		segments: tripAnalysis.segments,
		serviceDistanceKm: distanceKm,
		serviceDurationMinutes: durationMinutes,
		pricingSettings,
		durationHours: request.durationHours,
		includedHours: pricingSettings.dispoIncludedKmPerHour ? 4 : undefined,
		availabilityRatePerHour: pricingSettings.baseRatePerHour,
	});
	
	// Story 21.6: Add positioning costs to internal cost
	// Internal cost = service cost + approach cost + empty return cost
	if (tripAnalysis.positioningCosts) {
		internalCost += tripAnalysis.positioningCosts.totalPositioningCost;
	}
	
	// Get profitability thresholds
	const thresholds = getThresholdsFromSettings(pricingSettings);
	
	// Calculate profitability
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent = price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;
	const profitabilityIndicator = calculateProfitabilityIndicator(marginPercent, thresholds);
	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);
	
	// Round price
	price = Math.round(price * 100) / 100;
	
	// Story 21.8: Build zone transparency info
	tripAnalysis.zoneTransparency = buildZoneTransparencyInfo(
		request.pickup,
		request.dropoff,
		pickupZone,
		dropoffZone,
		pickupDetection.candidateZones,
		dropoffDetection.candidateZones,
		conflictStrategy,
		pricingSettings.zoneMultiplierAggregationStrategy ?? null,
		priceBeforeZoneMultiplier,
		priceAfterZoneMultiplier,
	);
	
	// Build initial result
	const result: PricingResult = {
		pricingMode,
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator,
		profitabilityData,
		matchedGrid,
		appliedRules,
		isContractPrice,
		fallbackReason,
		gridSearchDetails,
		tripAnalysis,
	};
	
	// Story 21.9: Validate pricing result
	result.validation = validatePricingResult(result, pricingSettings);
	
	return result;
}

// ============================================================================
// Grid Matching
// ============================================================================

interface GridMatchResult {
	matchedGrid: MatchedGrid;
	price: number;
}

function matchGrid(
	request: PricingRequest,
	contract: { zoneRoutes: ZoneRouteAssignment[]; excursionPackages: ExcursionPackageAssignment[]; dispoPackages: DispoPackageAssignment[] },
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	gridSearchDetails: GridSearchDetails,
): GridMatchResult | null {
	switch (request.tripType) {
		case "transfer":
			return matchZoneRoute(request, contract.zoneRoutes, pickupZone, dropoffZone, gridSearchDetails);
		case "excursion":
			return matchExcursionPackage(request, contract.excursionPackages, pickupZone, dropoffZone, gridSearchDetails);
		case "dispo":
			return matchDispoPackage(request, contract.dispoPackages, gridSearchDetails);
		default:
			return null;
	}
}

function matchZoneRoute(
	request: PricingRequest,
	zoneRoutes: ZoneRouteAssignment[],
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	gridSearchDetails: GridSearchDetails,
): GridMatchResult | null {
	for (const assignment of zoneRoutes) {
		const route = assignment.zoneRoute;
		
		if (!route.isActive) {
			gridSearchDetails.routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name ?? "",
				toZone: route.toZone?.name ?? "",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}
		
		if (route.vehicleCategoryId !== request.vehicleCategoryId) {
			gridSearchDetails.routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name ?? "",
				toZone: route.toZone?.name ?? "",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}
		
		const matchesForward = matchesZoneRoute(route, pickupZone, dropoffZone, "A_TO_B");
		const matchesReverse = matchesZoneRoute(route, pickupZone, dropoffZone, "B_TO_A");
		
		if (!matchesForward && !matchesReverse) {
			gridSearchDetails.routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name ?? "",
				toZone: route.toZone?.name ?? "",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "ZONE_MISMATCH",
			});
			continue;
		}
		
		if (route.direction === "A_TO_B" && !matchesForward) {
			gridSearchDetails.routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name ?? "",
				toZone: route.toZone?.name ?? "",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "DIRECTION_MISMATCH",
			});
			continue;
		}
		
		if (route.direction === "B_TO_A" && !matchesReverse) {
			gridSearchDetails.routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name ?? "",
				toZone: route.toZone?.name ?? "",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "DIRECTION_MISMATCH",
			});
			continue;
		}
		
		const price = assignment.overridePrice ?? route.fixedPrice;
		return {
			matchedGrid: {
				type: "ZoneRoute",
				id: route.id,
				name: `${route.fromZone?.name ?? "?"} → ${route.toZone?.name ?? "?"}`,
				fromZone: route.fromZone?.name,
				toZone: route.toZone?.name,
			},
			price,
		};
	}
	
	return null;
}

function matchesZoneRoute(
	route: ZoneRouteAssignment["zoneRoute"],
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	direction: "A_TO_B" | "B_TO_A",
): boolean {
	if (route.originZones.length > 0 || route.destinationZones.length > 0) {
		const originZoneIds = route.originZones.map(oz => oz.zone.id);
		const destZoneIds = route.destinationZones.map(dz => dz.zone.id);
		
		if (direction === "A_TO_B") {
			return (
				(originZoneIds.length === 0 || (pickupZone !== null && originZoneIds.includes(pickupZone.id))) &&
				(destZoneIds.length === 0 || (dropoffZone !== null && destZoneIds.includes(dropoffZone.id)))
			);
		} else {
			return (
				(destZoneIds.length === 0 || (pickupZone !== null && destZoneIds.includes(pickupZone.id))) &&
				(originZoneIds.length === 0 || (dropoffZone !== null && originZoneIds.includes(dropoffZone.id)))
			);
		}
	}
	
	if (direction === "A_TO_B") {
		return (
			(!route.fromZoneId || (pickupZone !== null && route.fromZoneId === pickupZone.id)) &&
			(!route.toZoneId || (dropoffZone !== null && route.toZoneId === dropoffZone.id))
		);
	} else {
		return (
			(!route.toZoneId || (pickupZone !== null && route.toZoneId === pickupZone.id)) &&
			(!route.fromZoneId || (dropoffZone !== null && route.fromZoneId === dropoffZone.id))
		);
	}
}

function matchExcursionPackage(
	request: PricingRequest,
	excursionPackages: ExcursionPackageAssignment[],
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	gridSearchDetails: GridSearchDetails,
): GridMatchResult | null {
	for (const assignment of excursionPackages) {
		const pkg = assignment.excursionPackage;
		
		if (!pkg.isActive) {
			gridSearchDetails.excursionsChecked.push({
				excursionId: pkg.id,
				excursionName: pkg.name,
				originZone: pkg.originZone?.name ?? null,
				destinationZone: pkg.destinationZone?.name ?? null,
				vehicleCategory: pkg.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}
		
		if (pkg.vehicleCategoryId !== request.vehicleCategoryId) {
			gridSearchDetails.excursionsChecked.push({
				excursionId: pkg.id,
				excursionName: pkg.name,
				originZone: pkg.originZone?.name ?? null,
				destinationZone: pkg.destinationZone?.name ?? null,
				vehicleCategory: pkg.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}
		
		const originMatch = !pkg.originZoneId || (pickupZone !== null && pkg.originZoneId === pickupZone.id);
		const destMatch = !pkg.destinationZoneId || (dropoffZone !== null && pkg.destinationZoneId === dropoffZone.id);
		
		if (!originMatch || !destMatch) {
			gridSearchDetails.excursionsChecked.push({
				excursionId: pkg.id,
				excursionName: pkg.name,
				originZone: pkg.originZone?.name ?? null,
				destinationZone: pkg.destinationZone?.name ?? null,
				vehicleCategory: pkg.vehicleCategoryId,
				rejectionReason: "ZONE_MISMATCH",
			});
			continue;
		}
		
		const price = assignment.overridePrice ?? pkg.price;
		return {
			matchedGrid: {
				type: "ExcursionPackage",
				id: pkg.id,
				name: pkg.name,
				fromZone: pkg.originZone?.name,
				toZone: pkg.destinationZone?.name,
			},
			price,
		};
	}
	
	return null;
}

function matchDispoPackage(
	request: PricingRequest,
	dispoPackages: DispoPackageAssignment[],
	gridSearchDetails: GridSearchDetails,
): GridMatchResult | null {
	for (const assignment of dispoPackages) {
		const pkg = assignment.dispoPackage;
		
		if (!pkg.isActive) {
			gridSearchDetails.disposChecked.push({
				dispoId: pkg.id,
				dispoName: pkg.name,
				vehicleCategory: pkg.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}
		
		if (pkg.vehicleCategoryId !== request.vehicleCategoryId) {
			gridSearchDetails.disposChecked.push({
				dispoId: pkg.id,
				dispoName: pkg.name,
				vehicleCategory: pkg.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}
		
		const price = assignment.overridePrice ?? pkg.basePrice;
		return {
			matchedGrid: {
				type: "DispoPackage",
				id: pkg.id,
				name: pkg.name,
			},
			price,
		};
	}
	
	return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Story 21.8: Enhanced zone detection that returns both selected zone and candidates
 */
interface ZoneDetectionResult {
	selectedZone: ZoneData | null;
	candidateZones: ZoneData[];
}

function findZoneForPointWithCandidates(
	point: { lat: number; lng: number },
	zones: ZoneData[],
	conflictStrategy: "PRIORITY" | "MOST_EXPENSIVE" | "CLOSEST" | "COMBINED" | null = null,
): ZoneDetectionResult {
	const candidateZones = findZonesForPoint(point, zones);
	const selectedZone = resolveZoneConflict(point, candidateZones, conflictStrategy);
	return { selectedZone, candidateZones };
}

function findZoneForPoint(point: { lat: number; lng: number }, zones: ZoneData[]): ZoneData | null {
	for (const zone of zones) {
		if (isPointInZone(point, zone)) {
			return zone;
		}
	}
	return null;
}

// ============================================================================
// Price Override
// ============================================================================

export type ApplyPriceOverrideResult = 
	| { success: true; result: PricingResult }
	| {
		success: false;
		error: {
			errorCode: string;
			errorMessage: string;
			details: {
				requestedPrice: number;
				internalCost: number;
				resultingMargin: number;
				resultingMarginPercent: number;
				minimumMarginPercent?: number;
			};
		};
	};

/**
 * Apply a manual price override to a pricing result
 */
export function applyPriceOverride(
	pricingResult: PricingResult,
	newPrice: number,
	reason?: string,
	minimumMarginPercent?: number,
): ApplyPriceOverrideResult {
	const { internalCost } = pricingResult;
	
	const newMargin = Math.round((newPrice - internalCost) * 100) / 100;
	const newMarginPercent = newPrice > 0 ? Math.round((newMargin / newPrice) * 100 * 100) / 100 : 0;
	
	if (minimumMarginPercent !== undefined && newMarginPercent < minimumMarginPercent) {
		return {
			success: false,
			error: {
				errorCode: "BELOW_MINIMUM_MARGIN",
				errorMessage: `Price override would result in margin ${newMarginPercent}% which is below minimum ${minimumMarginPercent}%`,
				details: {
					requestedPrice: newPrice,
					internalCost,
					resultingMargin: newMargin,
					resultingMarginPercent: newMarginPercent,
					minimumMarginPercent,
				},
			},
		};
	}
	
	const thresholds = pricingResult.profitabilityData.thresholds;
	const profitabilityIndicator = calculateProfitabilityIndicator(newMarginPercent, thresholds);
	const profitabilityData = getProfitabilityIndicatorData(newMarginPercent, thresholds);
	
	const overrideRule: ManualOverrideRule = {
		type: "MANUAL_OVERRIDE",
		previousPrice: pricingResult.price,
		newPrice,
		priceChange: Math.round((newPrice - pricingResult.price) * 100) / 100,
		priceChangePercent: pricingResult.price > 0
			? Math.round(((newPrice - pricingResult.price) / pricingResult.price) * 100 * 100) / 100
			: 0,
		reason,
		overriddenAt: new Date().toISOString(),
		isContractPriceOverride: pricingResult.isContractPrice,
	};
	
	const newResult: PricingResult = {
		...pricingResult,
		price: newPrice,
		margin: newMargin,
		marginPercent: newMarginPercent,
		profitabilityIndicator,
		profitabilityData,
		appliedRules: [...pricingResult.appliedRules, overrideRule],
		overrideApplied: true,
		previousPrice: pricingResult.price,
	};
	
	return {
		success: true,
		result: newResult,
	};
}
