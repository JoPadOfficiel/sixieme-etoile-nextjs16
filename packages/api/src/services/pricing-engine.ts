/**
 * Pricing Engine Service
 * Implements the Engagement Rule for partner grid pricing (Method 1)
 * and fallback to dynamic pricing (Method 2)
 * Story 4.3: Adds multiplier support (advanced rates + seasonal multipliers)
 */

import type { GeoPoint, ZoneData } from "../lib/geo-utils";
import { findZoneForPoint } from "../lib/geo-utils";

// Europe/Paris timezone constant
const PARIS_TZ = "Europe/Paris";

// ============================================================================
// Types
// ============================================================================

export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type GridType = "ZoneRoute" | "ExcursionPackage" | "DispoPackage";
export type TripType = "transfer" | "excursion" | "dispo";
export type ProfitabilityIndicator = "green" | "orange" | "red";

// Fallback reason for dynamic pricing
export type FallbackReason =
	| "PRIVATE_CLIENT" // Contact is not a partner
	| "NO_CONTRACT" // Partner has no active contract
	| "NO_ZONE_MATCH" // Pickup or dropoff not in any configured zone
	| "NO_ROUTE_MATCH" // No route matches zone pair + vehicle category
	| "NO_EXCURSION_MATCH" // No excursion package matches
	| "NO_DISPO_MATCH" // No dispo package matches
	| null; // Not a fallback (grid matched)

// Rejection reason for grid search
export type RejectionReason =
	| "ZONE_MISMATCH"
	| "CATEGORY_MISMATCH"
	| "DIRECTION_MISMATCH"
	| "INACTIVE";

// Route check result for search details
export interface RouteCheckResult {
	routeId: string;
	routeName: string;
	fromZone: string;
	toZone: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Excursion check result for search details
export interface ExcursionCheckResult {
	excursionId: string;
	excursionName: string;
	originZone: string | null;
	destinationZone: string | null;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Dispo check result for search details
export interface DispoCheckResult {
	dispoId: string;
	dispoName: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Grid search details for transparency
export interface GridSearchDetails {
	pickupZone: { id: string; name: string; code: string } | null;
	dropoffZone: { id: string; name: string; code: string } | null;
	vehicleCategoryId: string;
	tripType: TripType;
	routesChecked: RouteCheckResult[];
	excursionsChecked: ExcursionCheckResult[];
	disposChecked: DispoCheckResult[];
}

export interface PricingRequest {
	contactId: string;
	pickup: GeoPoint;
	dropoff: GeoPoint;
	vehicleCategoryId: string;
	tripType: TripType;
	pickupAt?: string;
	estimatedDurationMinutes?: number;
	estimatedDistanceKm?: number;
}

export interface AppliedRule {
	type: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * Applied rule for dynamic base calculation (Story 4.1)
 */
export interface DynamicBaseCalculationRule extends AppliedRule {
	type: "DYNAMIC_BASE_CALCULATION";
	description: string;
	inputs: {
		distanceKm: number;
		durationMinutes: number;
		baseRatePerKm: number;
		baseRatePerHour: number;
		targetMarginPercent: number;
	};
	calculation: {
		distanceBasedPrice: number;
		durationBasedPrice: number;
		selectedMethod: "distance" | "duration";
		basePrice: number;
		priceWithMargin: number;
	};
	usingDefaultSettings?: boolean;
}

export interface MatchedGrid {
	type: GridType;
	id: string;
	name: string;
	fromZone?: string;
	toZone?: string;
}

export interface PricingResult {
	pricingMode: PricingMode;
	price: number;
	currency: "EUR";
	internalCost: number;
	margin: number;
	marginPercent: number;
	profitabilityIndicator: ProfitabilityIndicator;
	matchedGrid: MatchedGrid | null;
	appliedRules: AppliedRule[];
	isContractPrice: boolean;
	// New fields for Story 3.5
	fallbackReason: FallbackReason;
	gridSearchDetails: GridSearchDetails | null;
	// New field for Story 4.2
	tripAnalysis: TripAnalysis;
	// New fields for Story 4.4 (optional, only present after override)
	overrideApplied?: boolean;
	previousPrice?: number;
}

// ============================================================================
// Story 4.4: Manual Override Types
// ============================================================================

/**
 * Manual override rule for tracking price adjustments (Story 4.4)
 */
export interface ManualOverrideRule extends AppliedRule {
	type: "MANUAL_OVERRIDE";
	previousPrice: number;
	newPrice: number;
	priceChange: number;
	priceChangePercent: number;
	reason?: string;
	overriddenAt: string;
	isContractPriceOverride?: boolean;
}

/**
 * Input for profitability recalculation after price override
 */
export interface RecalculateProfitabilityInput {
	newPrice: number;
	internalCost: number;
	previousPrice: number;
	previousAppliedRules: AppliedRule[];
	reason?: string;
	isContractPrice?: boolean;
}

/**
 * Result of profitability recalculation
 */
export interface RecalculateProfitabilityResult {
	price: number;
	margin: number;
	marginPercent: number;
	profitabilityIndicator: ProfitabilityIndicator;
	appliedRules: AppliedRule[];
	overrideApplied: boolean;
	priceChange: number;
	priceChangePercent: number;
}

/**
 * Override validation error codes
 */
export type OverrideErrorCode = 
	| "BELOW_MINIMUM_MARGIN"
	| "EXCEEDS_ROLE_LIMIT"
	| "INVALID_PRICE"
	| "PRICE_TOO_LOW";

/**
 * Override validation result
 */
export interface OverrideValidationResult {
	isValid: boolean;
	errorCode?: OverrideErrorCode;
	errorMessage?: string;
	details?: {
		requestedPrice: number;
		internalCost: number;
		resultingMargin: number;
		resultingMarginPercent: number;
		minimumMarginPercent?: number;
	};
}

// ============================================================================
// Data Interfaces (from database)
// ============================================================================

export interface ContactData {
	id: string;
	isPartner: boolean;
	partnerContract?: PartnerContractData | null;
}

export interface PartnerContractData {
	id: string;
	zoneRoutes: ZoneRouteAssignment[];
	excursionPackages: ExcursionPackageAssignment[];
	dispoPackages: DispoPackageAssignment[];
}

export interface ZoneRouteAssignment {
	zoneRoute: {
		id: string;
		fromZoneId: string;
		toZoneId: string;
		vehicleCategoryId: string;
		fixedPrice: number;
		direction: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
		isActive: boolean;
		fromZone: { id: string; name: string; code: string };
		toZone: { id: string; name: string; code: string };
	};
}

export interface ExcursionPackageAssignment {
	excursionPackage: {
		id: string;
		name: string;
		originZoneId: string | null;
		destinationZoneId: string | null;
		vehicleCategoryId: string;
		price: number;
		isActive: boolean;
		originZone?: { id: string; name: string; code: string } | null;
		destinationZone?: { id: string; name: string; code: string } | null;
	};
}

export interface DispoPackageAssignment {
	dispoPackage: {
		id: string;
		name: string;
		vehicleCategoryId: string;
		basePrice: number;
		isActive: boolean;
	};
}

export interface OrganizationPricingSettings {
	baseRatePerKm: number;
	baseRatePerHour: number;
	targetMarginPercent: number;
	// Cost parameters (Story 4.2)
	fuelConsumptionL100km?: number;
	fuelPricePerLiter?: number;
	tollCostPerKm?: number;
	wearCostPerKm?: number;
	driverHourlyCost?: number;
}

// ============================================================================
// Multiplier Types (Story 4.3)
// ============================================================================

export type AdvancedRateAppliesTo = "NIGHT" | "WEEKEND" | "LONG_DISTANCE" | "ZONE_SCENARIO" | "HOLIDAY";
export type AdjustmentType = "PERCENTAGE" | "FIXED_AMOUNT";

/**
 * Advanced rate data from database
 */
export interface AdvancedRateData {
	id: string;
	name: string;
	appliesTo: AdvancedRateAppliesTo;
	startTime: string | null;  // HH:MM format
	endTime: string | null;    // HH:MM format
	daysOfWeek: string | null; // e.g. "1,2,3,4,5" for weekdays, "0,6" for weekend
	minDistanceKm: number | null;
	maxDistanceKm: number | null;
	zoneId: string | null;
	adjustmentType: AdjustmentType;
	value: number;  // percentage or fixed amount in EUR
	priority: number;
	isActive: boolean;
}

/**
 * Seasonal multiplier data from database
 */
export interface SeasonalMultiplierData {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	endDate: Date;
	multiplier: number;  // e.g., 1.3 for 30% increase
	priority: number;
	isActive: boolean;
}

/**
 * Context for evaluating multipliers
 */
export interface MultiplierContext {
	pickupAt: Date | null;  // Trip pickup time (Europe/Paris business time)
	distanceKm: number;
	pickupZoneId: string | null;
	dropoffZoneId: string | null;
}

/**
 * Applied multiplier rule for transparency
 */
export interface AppliedMultiplierRule extends AppliedRule {
	type: "ADVANCED_RATE" | "SEASONAL_MULTIPLIER";
	ruleId: string;
	ruleName: string;
	adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT" | "MULTIPLIER";
	adjustmentValue: number;
	priceBefore: number;
	priceAfter: number;
}

/**
 * Result of multiplier evaluation
 */
export interface MultiplierEvaluationResult {
	adjustedPrice: number;
	appliedRules: AppliedMultiplierRule[];
}

// ============================================================================
// Cost Breakdown Types (Story 4.2)
// ============================================================================

export interface FuelCostComponent {
	amount: number;
	distanceKm: number;
	consumptionL100km: number;
	pricePerLiter: number;
}

export interface TollCostComponent {
	amount: number;
	distanceKm: number;
	ratePerKm: number;
}

export interface WearCostComponent {
	amount: number;
	distanceKm: number;
	ratePerKm: number;
}

export interface DriverCostComponent {
	amount: number;
	durationMinutes: number;
	hourlyRate: number;
}

export interface ParkingCostComponent {
	amount: number;
	description: string;
}

export interface CostBreakdown {
	fuel: FuelCostComponent;
	tolls: TollCostComponent;
	wear: WearCostComponent;
	driver: DriverCostComponent;
	parking: ParkingCostComponent;
	total: number;
}

export interface SegmentCost {
	distanceKm: number;
	durationMinutes: number;
	cost: number;
}

export interface TripAnalysis {
	costBreakdown: CostBreakdown;
	// Story 4.5: Vehicle selection info
	vehicleSelection?: VehicleSelectionInfo;
	// Story 4.6: segments for shadow calculation
	segments?: {
		approach?: SegmentCost;
		service?: SegmentCost;
		return?: SegmentCost;
	};
}

/**
 * Story 4.5: Vehicle selection information for transparency
 */
export interface VehicleSelectionInfo {
	selectedVehicle?: {
		vehicleId: string;
		vehicleName: string;
		baseId: string;
		baseName: string;
	};
	candidatesConsidered: number;
	candidatesAfterCapacityFilter: number;
	candidatesAfterHaversineFilter: number;
	candidatesWithRouting: number;
	selectionCriterion: "MINIMAL_COST" | "BEST_MARGIN";
	fallbackUsed: boolean;
	fallbackReason?: string;
	routingSource?: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
}

// ============================================================================
// Profitability Calculation
// ============================================================================

/**
 * Calculate profitability indicator based on margin percentage
 * Green: ≥ 20%, Orange: 0-20%, Red: < 0%
 */
export function calculateProfitabilityIndicator(
	marginPercent: number,
): ProfitabilityIndicator {
	if (marginPercent >= 20) return "green";
	if (marginPercent >= 0) return "orange";
	return "red";
}

/**
 * Default cost parameters for Paris VTC market (Story 4.2)
 */
export const DEFAULT_COST_PARAMETERS = {
	fuelConsumptionL100km: 8.0,    // Liters per 100km (average berline/van)
	fuelPricePerLiter: 1.80,       // EUR per liter (current diesel price)
	tollCostPerKm: 0.15,           // EUR per km (average autoroute)
	wearCostPerKm: 0.10,           // EUR per km (maintenance, tires, depreciation)
	driverHourlyCost: 25.0,        // EUR per hour (gross + charges)
};

/**
 * Calculate fuel cost
 * Formula: distanceKm × (fuelConsumptionL100km / 100) × fuelPricePerLiter
 */
export function calculateFuelCost(
	distanceKm: number,
	consumptionL100km: number,
	pricePerLiter: number,
): FuelCostComponent {
	const amount = Math.round(distanceKm * (consumptionL100km / 100) * pricePerLiter * 100) / 100;
	return {
		amount,
		distanceKm,
		consumptionL100km,
		pricePerLiter,
	};
}

/**
 * Calculate toll cost
 * Formula: distanceKm × tollCostPerKm
 */
export function calculateTollCost(
	distanceKm: number,
	ratePerKm: number,
): TollCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate vehicle wear cost
 * Formula: distanceKm × wearCostPerKm
 */
export function calculateWearCost(
	distanceKm: number,
	ratePerKm: number,
): WearCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate driver cost
 * Formula: (durationMinutes / 60) × driverHourlyCost
 */
export function calculateDriverCost(
	durationMinutes: number,
	hourlyRate: number,
): DriverCostComponent {
	const amount = Math.round((durationMinutes / 60) * hourlyRate * 100) / 100;
	return {
		amount,
		durationMinutes,
		hourlyRate,
	};
}

/**
 * Calculate complete cost breakdown (Story 4.2)
 * Returns all cost components and total internal cost
 */
export function calculateCostBreakdown(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	parkingCost: number = 0,
	parkingDescription: string = "",
): CostBreakdown {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const fuelPricePerLiter = settings.fuelPricePerLiter ?? DEFAULT_COST_PARAMETERS.fuelPricePerLiter;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Calculate each component
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelPricePerLiter);
	const tolls = calculateTollCost(distanceKm, tollCostPerKm);
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	// Calculate total
	const total = Math.round((fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100) / 100;

	return {
		fuel,
		tolls,
		wear,
		driver,
		parking,
		total,
	};
}

/**
 * Estimate internal cost using detailed cost breakdown (Story 4.2)
 * Replaces the simplified estimateInternalCost function
 */
export function calculateInternalCost(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	const breakdown = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	return breakdown.total;
}

/**
 * @deprecated Use calculateInternalCost instead (Story 4.2)
 * Estimate internal cost (simplified - kept for backward compatibility)
 * Uses a rough estimate: cost = distance * 2.5 EUR/km
 */
export function estimateInternalCost(distanceKm: number): number {
	const costPerKm = 2.5; // Rough estimate including fuel, driver, wear
	return Math.round(distanceKm * costPerKm * 100) / 100;
}

// ============================================================================
// Multiplier Evaluation Functions (Story 4.3)
// ============================================================================

/**
 * Parse time string in HH:MM format to hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return { hours: hours ?? 0, minutes: minutes ?? 0 };
}

/**
 * Get hour and minute from a Date in Europe/Paris timezone
 * Since we store business times as-is (no TZ conversion), we just extract the values
 */
function getParisTime(date: Date): { hours: number; minutes: number; dayOfWeek: number } {
	// The date is already in Europe/Paris business time (per Story 1.4)
	// We just need to extract the components
	return {
		hours: date.getHours(),
		minutes: date.getMinutes(),
		dayOfWeek: date.getDay(), // 0 = Sunday, 6 = Saturday
	};
}

/**
 * Check if a time is within a time range (handles overnight ranges like 22:00-06:00)
 * @param hours - Current hour (0-23)
 * @param minutes - Current minutes (0-59)
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 */
export function isTimeInRange(
	hours: number,
	minutes: number,
	startTime: string,
	endTime: string,
): boolean {
	const start = parseTimeString(startTime);
	const end = parseTimeString(endTime);
	
	const currentMinutes = hours * 60 + minutes;
	const startMinutes = start.hours * 60 + start.minutes;
	const endMinutes = end.hours * 60 + end.minutes;
	
	// Handle overnight range (e.g., 22:00 to 06:00)
	if (startMinutes > endMinutes) {
		// Time is in range if it's after start OR before end
		return currentMinutes >= startMinutes || currentMinutes < endMinutes;
	}
	
	// Normal range (e.g., 09:00 to 18:00)
	return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a day of week is in the configured days string
 * @param dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
 * @param daysOfWeek - Comma-separated string of days (e.g., "0,6" for weekend)
 */
export function isDayInRange(dayOfWeek: number, daysOfWeek: string): boolean {
	const days = daysOfWeek.split(",").map(d => parseInt(d.trim(), 10));
	return days.includes(dayOfWeek);
}

/**
 * Check if pickup time qualifies for NIGHT rate
 * Night is typically 22:00-06:00 in Europe/Paris
 */
export function isNightTime(pickupAt: Date, startTime: string, endTime: string): boolean {
	const { hours, minutes } = getParisTime(pickupAt);
	return isTimeInRange(hours, minutes, startTime, endTime);
}

/**
 * Check if pickup time qualifies for WEEKEND rate
 * Weekend is Saturday (6) and Sunday (0)
 */
export function isWeekend(pickupAt: Date, daysOfWeek: string | null): boolean {
	const { dayOfWeek } = getParisTime(pickupAt);
	// Default weekend days if not specified
	const weekendDays = daysOfWeek ?? "0,6";
	return isDayInRange(dayOfWeek, weekendDays);
}

/**
 * Check if distance qualifies for LONG_DISTANCE rate
 */
export function isLongDistance(
	distanceKm: number,
	minDistanceKm: number | null,
	maxDistanceKm: number | null,
): boolean {
	if (minDistanceKm !== null && distanceKm < minDistanceKm) {
		return false;
	}
	if (maxDistanceKm !== null && distanceKm > maxDistanceKm) {
		return false;
	}
	return minDistanceKm !== null; // Only applies if minDistanceKm is set
}

/**
 * Check if a date is within a date range (inclusive)
 */
export function isWithinDateRange(pickupAt: Date, startDate: Date, endDate: Date): boolean {
	const pickup = pickupAt.getTime();
	const start = startDate.getTime();
	// End date is inclusive, so we add one day
	const end = endDate.getTime() + 24 * 60 * 60 * 1000;
	return pickup >= start && pickup < end;
}

/**
 * Evaluate if an advanced rate applies to the given context
 */
export function evaluateAdvancedRate(
	rate: AdvancedRateData,
	context: MultiplierContext,
): boolean {
	// Skip inactive rates
	if (!rate.isActive) {
		return false;
	}

	// Check based on rate type
	switch (rate.appliesTo) {
		case "NIGHT":
			if (!context.pickupAt || !rate.startTime || !rate.endTime) {
				return false;
			}
			return isNightTime(context.pickupAt, rate.startTime, rate.endTime);

		case "WEEKEND":
			if (!context.pickupAt) {
				return false;
			}
			return isWeekend(context.pickupAt, rate.daysOfWeek);

		case "LONG_DISTANCE":
			return isLongDistance(context.distanceKm, rate.minDistanceKm, rate.maxDistanceKm);

		case "ZONE_SCENARIO":
			// Zone-based rate: applies if pickup or dropoff matches the configured zone
			if (!rate.zoneId) {
				return false;
			}
			return context.pickupZoneId === rate.zoneId || context.dropoffZoneId === rate.zoneId;

		case "HOLIDAY":
			// Holiday rates would need a holiday calendar - for now, use time-based check
			if (!context.pickupAt || !rate.startTime || !rate.endTime) {
				return false;
			}
			return isNightTime(context.pickupAt, rate.startTime, rate.endTime);

		default:
			return false;
	}
}

/**
 * Apply an advanced rate adjustment to a price
 */
export function applyAdvancedRateAdjustment(
	price: number,
	rate: AdvancedRateData,
): number {
	if (rate.adjustmentType === "PERCENTAGE") {
		// Percentage adjustment: value is the percentage (e.g., 20 for +20%)
		return Math.round(price * (1 + rate.value / 100) * 100) / 100;
	} else {
		// Fixed amount adjustment
		return Math.round((price + rate.value) * 100) / 100;
	}
}

/**
 * Evaluate and apply all applicable advanced rates
 * Rates are applied in priority order (higher priority first)
 */
export function evaluateAdvancedRates(
	basePrice: number,
	context: MultiplierContext,
	rates: AdvancedRateData[],
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = basePrice;

	// Sort by priority (higher first)
	const sortedRates = [...rates].sort((a, b) => b.priority - a.priority);

	for (const rate of sortedRates) {
		if (evaluateAdvancedRate(rate, context)) {
			const priceBefore = currentPrice;
			currentPrice = applyAdvancedRateAdjustment(currentPrice, rate);

			appliedRules.push({
				type: "ADVANCED_RATE",
				description: `Applied ${rate.appliesTo} rate: ${rate.name}`,
				ruleId: rate.id,
				ruleName: rate.name,
				adjustmentType: rate.adjustmentType,
				adjustmentValue: rate.value,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

/**
 * Evaluate if a seasonal multiplier applies to the given pickup time
 */
export function evaluateSeasonalMultiplier(
	multiplier: SeasonalMultiplierData,
	pickupAt: Date,
): boolean {
	if (!multiplier.isActive) {
		return false;
	}
	return isWithinDateRange(pickupAt, multiplier.startDate, multiplier.endDate);
}

/**
 * Apply a seasonal multiplier to a price
 */
export function applySeasonalMultiplier(
	price: number,
	multiplier: SeasonalMultiplierData,
): number {
	return Math.round(price * multiplier.multiplier * 100) / 100;
}

/**
 * Evaluate and apply all applicable seasonal multipliers
 * Multipliers are applied in priority order (higher priority first)
 */
export function evaluateSeasonalMultipliers(
	price: number,
	pickupAt: Date | null,
	multipliers: SeasonalMultiplierData[],
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = price;

	if (!pickupAt) {
		return { adjustedPrice: currentPrice, appliedRules };
	}

	// Sort by priority (higher first)
	const sortedMultipliers = [...multipliers].sort((a, b) => b.priority - a.priority);

	for (const multiplier of sortedMultipliers) {
		if (evaluateSeasonalMultiplier(multiplier, pickupAt)) {
			const priceBefore = currentPrice;
			currentPrice = applySeasonalMultiplier(currentPrice, multiplier);

			appliedRules.push({
				type: "SEASONAL_MULTIPLIER",
				description: `Applied seasonal multiplier: ${multiplier.name}`,
				ruleId: multiplier.id,
				ruleName: multiplier.name,
				adjustmentType: "MULTIPLIER",
				adjustmentValue: multiplier.multiplier,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

/**
 * Apply all multipliers to a base price (Story 4.3)
 * Order: Advanced Rates → Seasonal Multipliers
 */
export function applyAllMultipliers(
	basePrice: number,
	context: MultiplierContext,
	advancedRates: AdvancedRateData[],
	seasonalMultipliers: SeasonalMultiplierData[],
): MultiplierEvaluationResult {
	const allAppliedRules: AppliedMultiplierRule[] = [];

	// Step 1: Apply advanced rates
	const advancedResult = evaluateAdvancedRates(basePrice, context, advancedRates);
	allAppliedRules.push(...advancedResult.appliedRules);

	// Step 2: Apply seasonal multipliers
	const seasonalResult = evaluateSeasonalMultipliers(
		advancedResult.adjustedPrice,
		context.pickupAt,
		seasonalMultipliers,
	);
	allAppliedRules.push(...seasonalResult.appliedRules);

	return {
		adjustedPrice: seasonalResult.adjustedPrice,
		appliedRules: allAppliedRules,
	};
}

// ============================================================================
// Grid Matching Functions
// ============================================================================

/**
 * Match result with search details
 */
export interface MatchZoneRouteResult {
	matchedRoute: ZoneRouteAssignment["zoneRoute"] | null;
	routesChecked: RouteCheckResult[];
}

/**
 * Match a zone route for a transfer with detailed search results
 */
export function matchZoneRouteWithDetails(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	vehicleCategoryId: string,
	contractRoutes: ZoneRouteAssignment[],
): MatchZoneRouteResult {
	const routesChecked: RouteCheckResult[] = [];

	if (!fromZone || !toZone) {
		// No zones to match against - still record what routes exist
		for (const assignment of contractRoutes) {
			const route = assignment.zoneRoute;
			routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone.name} → ${route.toZone.name}`,
				fromZone: route.fromZone.name,
				toZone: route.toZone.name,
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "ZONE_MISMATCH",
			});
		}
		return { matchedRoute: null, routesChecked };
	}

	for (const assignment of contractRoutes) {
		const route = assignment.zoneRoute;

		// Check if inactive
		if (!route.isActive) {
			routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone.name} → ${route.toZone.name}`,
				fromZone: route.fromZone.name,
				toZone: route.toZone.name,
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (route.vehicleCategoryId !== vehicleCategoryId) {
			routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone.name} → ${route.toZone.name}`,
				fromZone: route.fromZone.name,
				toZone: route.toZone.name,
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Check direction
		const matchesForward =
			route.fromZoneId === fromZone.id && route.toZoneId === toZone.id;
		const matchesReverse =
			route.fromZoneId === toZone.id && route.toZoneId === fromZone.id;

		if (route.direction === "BIDIRECTIONAL") {
			if (matchesForward || matchesReverse) {
				return { matchedRoute: route, routesChecked };
			}
			routesChecked.push({
				routeId: route.id,
				routeName: `${route.fromZone.name} → ${route.toZone.name}`,
				fromZone: route.fromZone.name,
				toZone: route.toZone.name,
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "ZONE_MISMATCH",
			});
		} else if (route.direction === "A_TO_B") {
			if (matchesForward) {
				return { matchedRoute: route, routesChecked };
			}
			if (matchesReverse) {
				// Zones match but wrong direction
				routesChecked.push({
					routeId: route.id,
					routeName: `${route.fromZone.name} → ${route.toZone.name}`,
					fromZone: route.fromZone.name,
					toZone: route.toZone.name,
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "DIRECTION_MISMATCH",
				});
			} else {
				routesChecked.push({
					routeId: route.id,
					routeName: `${route.fromZone.name} → ${route.toZone.name}`,
					fromZone: route.fromZone.name,
					toZone: route.toZone.name,
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
			}
		} else if (route.direction === "B_TO_A") {
			if (matchesReverse) {
				return { matchedRoute: route, routesChecked };
			}
			if (matchesForward) {
				// Zones match but wrong direction
				routesChecked.push({
					routeId: route.id,
					routeName: `${route.fromZone.name} → ${route.toZone.name}`,
					fromZone: route.fromZone.name,
					toZone: route.toZone.name,
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "DIRECTION_MISMATCH",
				});
			} else {
				routesChecked.push({
					routeId: route.id,
					routeName: `${route.fromZone.name} → ${route.toZone.name}`,
					fromZone: route.fromZone.name,
					toZone: route.toZone.name,
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
			}
		}
	}

	return { matchedRoute: null, routesChecked };
}

/**
 * Match a zone route for a transfer (backward compatible)
 */
export function matchZoneRoute(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	vehicleCategoryId: string,
	contractRoutes: ZoneRouteAssignment[],
): ZoneRouteAssignment["zoneRoute"] | null {
	return matchZoneRouteWithDetails(fromZone, toZone, vehicleCategoryId, contractRoutes).matchedRoute;
}

/**
 * Match result with search details for excursions
 */
export interface MatchExcursionResult {
	matchedExcursion: ExcursionPackageAssignment["excursionPackage"] | null;
	excursionsChecked: ExcursionCheckResult[];
}

/**
 * Match an excursion package with detailed search results
 */
export function matchExcursionPackageWithDetails(
	originZone: ZoneData | null,
	destinationZone: ZoneData | null,
	vehicleCategoryId: string,
	contractExcursions: ExcursionPackageAssignment[],
): MatchExcursionResult {
	const excursionsChecked: ExcursionCheckResult[] = [];

	for (const assignment of contractExcursions) {
		const excursion = assignment.excursionPackage;

		// Check if inactive
		if (!excursion.isActive) {
			excursionsChecked.push({
				excursionId: excursion.id,
				excursionName: excursion.name,
				originZone: excursion.originZone?.name ?? null,
				destinationZone: excursion.destinationZone?.name ?? null,
				vehicleCategory: excursion.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (excursion.vehicleCategoryId !== vehicleCategoryId) {
			excursionsChecked.push({
				excursionId: excursion.id,
				excursionName: excursion.name,
				originZone: excursion.originZone?.name ?? null,
				destinationZone: excursion.destinationZone?.name ?? null,
				vehicleCategory: excursion.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Check origin zone match (if specified)
		if (excursion.originZoneId) {
			if (!originZone || excursion.originZoneId !== originZone.id) {
				excursionsChecked.push({
					excursionId: excursion.id,
					excursionName: excursion.name,
					originZone: excursion.originZone?.name ?? null,
					destinationZone: excursion.destinationZone?.name ?? null,
					vehicleCategory: excursion.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
				continue;
			}
		}

		// Check destination zone match (if specified)
		if (excursion.destinationZoneId) {
			if (!destinationZone || excursion.destinationZoneId !== destinationZone.id) {
				excursionsChecked.push({
					excursionId: excursion.id,
					excursionName: excursion.name,
					originZone: excursion.originZone?.name ?? null,
					destinationZone: excursion.destinationZone?.name ?? null,
					vehicleCategory: excursion.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
				continue;
			}
		}

		// If we get here, it's a match
		return { matchedExcursion: excursion, excursionsChecked };
	}

	return { matchedExcursion: null, excursionsChecked };
}

/**
 * Match an excursion package (backward compatible)
 */
export function matchExcursionPackage(
	originZone: ZoneData | null,
	destinationZone: ZoneData | null,
	vehicleCategoryId: string,
	contractExcursions: ExcursionPackageAssignment[],
): ExcursionPackageAssignment["excursionPackage"] | null {
	return matchExcursionPackageWithDetails(originZone, destinationZone, vehicleCategoryId, contractExcursions).matchedExcursion;
}

/**
 * Match result with search details for dispos
 */
export interface MatchDispoResult {
	matchedDispo: DispoPackageAssignment["dispoPackage"] | null;
	disposChecked: DispoCheckResult[];
}

/**
 * Match a dispo package with detailed search results
 */
export function matchDispoPackageWithDetails(
	vehicleCategoryId: string,
	contractDispos: DispoPackageAssignment[],
): MatchDispoResult {
	const disposChecked: DispoCheckResult[] = [];

	for (const assignment of contractDispos) {
		const dispo = assignment.dispoPackage;

		// Check if inactive
		if (!dispo.isActive) {
			disposChecked.push({
				dispoId: dispo.id,
				dispoName: dispo.name,
				vehicleCategory: dispo.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (dispo.vehicleCategoryId !== vehicleCategoryId) {
			disposChecked.push({
				dispoId: dispo.id,
				dispoName: dispo.name,
				vehicleCategory: dispo.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Match found
		return { matchedDispo: dispo, disposChecked };
	}

	return { matchedDispo: null, disposChecked };
}

/**
 * Match a dispo package (backward compatible)
 */
export function matchDispoPackage(
	vehicleCategoryId: string,
	contractDispos: DispoPackageAssignment[],
): DispoPackageAssignment["dispoPackage"] | null {
	return matchDispoPackageWithDetails(vehicleCategoryId, contractDispos).matchedDispo;
}

// ============================================================================
// Dynamic Pricing (Story 4.1 - Base Dynamic Price Calculation)
// ============================================================================

/**
 * Result of dynamic base price calculation with full details
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 */
export interface DynamicBaseCalculationResult {
	distanceBasedPrice: number;
	durationBasedPrice: number;
	selectedMethod: "distance" | "duration";
	basePrice: number;
	priceWithMargin: number;
	inputs: {
		distanceKm: number;
		durationMinutes: number;
		baseRatePerKm: number;
		baseRatePerHour: number;
		targetMarginPercent: number;
	};
}

/**
 * Default pricing settings when organization has none configured
 */
export const DEFAULT_PRICING_SETTINGS: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

/**
 * Calculate dynamic base price with full calculation details
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 * 
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param settings - Organization pricing settings
 * @returns Full calculation result with inputs and intermediate values
 */
export function calculateDynamicBasePrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): DynamicBaseCalculationResult {
	const durationHours = durationMinutes / 60;

	// Calculate both price methods
	const distanceBasedPrice = Math.round(distanceKm * settings.baseRatePerKm * 100) / 100;
	const durationBasedPrice = Math.round(durationHours * settings.baseRatePerHour * 100) / 100;

	// Select the higher price (PRD max formula)
	const selectedMethod: "distance" | "duration" = 
		distanceBasedPrice >= durationBasedPrice ? "distance" : "duration";
	const basePrice = Math.max(distanceBasedPrice, durationBasedPrice);

	// Apply target margin
	const priceWithMargin = Math.round(basePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;

	return {
		distanceBasedPrice,
		durationBasedPrice,
		selectedMethod,
		basePrice,
		priceWithMargin,
		inputs: {
			distanceKm,
			durationMinutes,
			baseRatePerKm: settings.baseRatePerKm,
			baseRatePerHour: settings.baseRatePerHour,
			targetMarginPercent: settings.targetMarginPercent,
		},
	};
}

/**
 * Calculate basic dynamic price (backward compatible)
 * Formula: max(distance * ratePerKm, duration * ratePerHour)
 */
export function calculateDynamicPrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	return calculateDynamicBasePrice(distanceKm, durationMinutes, settings).priceWithMargin;
}

// ============================================================================
// Main Pricing Engine
// ============================================================================

export interface PricingEngineContext {
	contact: ContactData;
	zones: ZoneData[];
	pricingSettings: OrganizationPricingSettings;
	// Story 4.3: Multipliers (optional for backward compatibility)
	advancedRates?: AdvancedRateData[];
	seasonalMultipliers?: SeasonalMultiplierData[];
}

/**
 * Main pricing engine function
 * Implements the Engagement Rule for partners and fallback to dynamic pricing
 */
export function calculatePrice(
	request: PricingRequest,
	context: PricingEngineContext,
): PricingResult {
	const appliedRules: AppliedRule[] = [];
	const { contact, zones, pricingSettings, advancedRates = [], seasonalMultipliers = [] } = context;

	// Default values for distance/duration estimation
	const estimatedDistanceKm = request.estimatedDistanceKm ?? 30;
	const estimatedDurationMinutes = request.estimatedDurationMinutes ?? 45;

	// Initialize search details collector
	let routesChecked: RouteCheckResult[] = [];
	let excursionsChecked: ExcursionCheckResult[] = [];
	let disposChecked: DispoCheckResult[] = [];

	// Build multiplier context (Story 4.3)
	const pickupAt = request.pickupAt ? new Date(request.pickupAt) : null;

	// Map pickup/dropoff to zones early for multiplier context (Story 4.3)
	// This is needed even for private clients to support ZONE_SCENARIO rates
	const pickupZone = findZoneForPoint(request.pickup, zones);
	const dropoffZone = findZoneForPoint(request.dropoff, zones);

	// -------------------------------------------------------------------------
	// Step 1: Check if contact is a partner
	// -------------------------------------------------------------------------
	if (!contact.isPartner) {
		appliedRules.push({
			type: "PRIVATE_CLIENT",
			description: "Private client - grid matching skipped",
		});

		return buildDynamicResult(
			estimatedDistanceKm,
			estimatedDurationMinutes,
			pricingSettings,
			appliedRules,
			"PRIVATE_CLIENT",
			null,
			false,
			// Story 4.3: Pass multiplier context with zone IDs
			{
				pickupAt,
				distanceKm: estimatedDistanceKm,
				pickupZoneId: pickupZone?.id ?? null,
				dropoffZoneId: dropoffZone?.id ?? null,
			},
			advancedRates,
			seasonalMultipliers,
		);
	}

	// -------------------------------------------------------------------------
	// Step 2: Check if partner has a contract with grids
	// -------------------------------------------------------------------------
	const contract = contact.partnerContract;
	if (!contract) {
		appliedRules.push({
			type: "NO_CONTRACT",
			description: "Partner has no active contract with grids",
		});

		return buildDynamicResult(
			estimatedDistanceKm,
			estimatedDurationMinutes,
			pricingSettings,
			appliedRules,
			"NO_CONTRACT",
			null,
			false,
			// Story 4.3: Pass multiplier context
			{
				pickupAt,
				distanceKm: estimatedDistanceKm,
				pickupZoneId: null,
				dropoffZoneId: null,
			},
			advancedRates,
			seasonalMultipliers,
		);
	}

	// -------------------------------------------------------------------------
	// Step 3: Add zone mapping to applied rules (zones already mapped above)
	// -------------------------------------------------------------------------
	appliedRules.push({
		type: "ZONE_MAPPING",
		description: "Mapped coordinates to zones",
		pickupZone: pickupZone?.name ?? "Unknown",
		pickupZoneId: pickupZone?.id ?? null,
		dropoffZone: dropoffZone?.name ?? "Unknown",
		dropoffZoneId: dropoffZone?.id ?? null,
	});

	// Build base search details
	const baseSearchDetails: Omit<GridSearchDetails, "routesChecked" | "excursionsChecked" | "disposChecked"> = {
		pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code } : null,
		dropoffZone: dropoffZone ? { id: dropoffZone.id, name: dropoffZone.name, code: dropoffZone.code } : null,
		vehicleCategoryId: request.vehicleCategoryId,
		tripType: request.tripType,
	};

	// -------------------------------------------------------------------------
	// Step 4: Try to match grids based on trip type
	// -------------------------------------------------------------------------

	// 4a: For transfers, try ZoneRoute first
	if (request.tripType === "transfer") {
		const routeResult = matchZoneRouteWithDetails(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.zoneRoutes,
		);
		routesChecked = routeResult.routesChecked;

		if (routeResult.matchedRoute) {
			const matchedRoute = routeResult.matchedRoute;
			const price = Number(matchedRoute.fixedPrice);

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract grid price applied (Engagement Rule)",
				gridType: "ZoneRoute",
				gridId: matchedRoute.id,
				originalPrice: price,
			});

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "ZoneRoute",
					id: matchedRoute.id,
					name: `${matchedRoute.fromZone.name} → ${matchedRoute.toZone.name}`,
					fromZone: matchedRoute.fromZone.name,
					toZone: matchedRoute.toZone.name,
				},
				appliedRules,
			);
		}
	}

	// 4b: For excursions, try ExcursionPackage
	if (request.tripType === "excursion") {
		const excursionResult = matchExcursionPackageWithDetails(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.excursionPackages,
		);
		excursionsChecked = excursionResult.excursionsChecked;

		if (excursionResult.matchedExcursion) {
			const matchedExcursion = excursionResult.matchedExcursion;
			const price = Number(matchedExcursion.price);

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract excursion package applied (Engagement Rule)",
				gridType: "ExcursionPackage",
				gridId: matchedExcursion.id,
				originalPrice: price,
			});

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "ExcursionPackage",
					id: matchedExcursion.id,
					name: matchedExcursion.name,
					fromZone: matchedExcursion.originZone?.name,
					toZone: matchedExcursion.destinationZone?.name,
				},
				appliedRules,
			);
		}
	}

	// 4c: For dispos, try DispoPackage
	if (request.tripType === "dispo") {
		const dispoResult = matchDispoPackageWithDetails(
			request.vehicleCategoryId,
			contract.dispoPackages,
		);
		disposChecked = dispoResult.disposChecked;

		if (dispoResult.matchedDispo) {
			const matchedDispo = dispoResult.matchedDispo;
			const price = Number(matchedDispo.basePrice);

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract dispo package applied (Engagement Rule)",
				gridType: "DispoPackage",
				gridId: matchedDispo.id,
				originalPrice: price,
			});

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "DispoPackage",
					id: matchedDispo.id,
					name: matchedDispo.name,
				},
				appliedRules,
			);
		}
	}

	// -------------------------------------------------------------------------
	// Step 5: No grid match - fallback to dynamic pricing
	// -------------------------------------------------------------------------

	// Determine fallback reason
	let fallbackReason: FallbackReason;
	if (!pickupZone || !dropoffZone) {
		fallbackReason = "NO_ZONE_MATCH";
	} else if (request.tripType === "transfer") {
		fallbackReason = "NO_ROUTE_MATCH";
	} else if (request.tripType === "excursion") {
		fallbackReason = "NO_EXCURSION_MATCH";
	} else {
		fallbackReason = "NO_DISPO_MATCH";
	}

	// Build complete search details
	const gridSearchDetails: GridSearchDetails = {
		...baseSearchDetails,
		routesChecked,
		excursionsChecked,
		disposChecked,
	};

	// Add search summary to applied rules
	appliedRules.push({
		type: "GRID_SEARCH_ATTEMPTED",
		description: `Searched ${routesChecked.length} routes, ${excursionsChecked.length} excursions, ${disposChecked.length} dispos in partner contract, none matched`,
		routesChecked: routesChecked.length,
		excursionsChecked: excursionsChecked.length,
		disposChecked: disposChecked.length,
	});

	appliedRules.push({
		type: "NO_GRID_MATCH",
		description: "No matching grid found for partner, using dynamic pricing",
		reason: fallbackReason,
		pickupZone: pickupZone?.code ?? "UNKNOWN",
		dropoffZone: dropoffZone?.code ?? "UNKNOWN",
		tripType: request.tripType,
		vehicleCategoryId: request.vehicleCategoryId,
	});

	return buildDynamicResult(
		estimatedDistanceKm,
		estimatedDurationMinutes,
		pricingSettings,
		appliedRules,
		fallbackReason,
		gridSearchDetails,
		false,
		// Story 4.3: Pass multiplier context
		{
			pickupAt,
			distanceKm: estimatedDistanceKm,
			pickupZoneId: pickupZone?.id ?? null,
			dropoffZoneId: dropoffZone?.id ?? null,
		},
		advancedRates,
		seasonalMultipliers,
	);
}

/**
 * Build a dynamic pricing result with enhanced calculation details (Story 4.1 + 4.2 + 4.3)
 * Story 4.3: Now applies multipliers (advanced rates + seasonal) to the base price
 */
function buildDynamicResult(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	appliedRules: AppliedRule[],
	fallbackReason: FallbackReason,
	gridSearchDetails: GridSearchDetails | null,
	usingDefaultSettings: boolean = false,
	// Story 4.3: Multiplier parameters
	multiplierContext: MultiplierContext | null = null,
	advancedRates: AdvancedRateData[] = [],
	seasonalMultipliers: SeasonalMultiplierData[] = [],
): PricingResult {
	// Calculate with full details
	const calculation = calculateDynamicBasePrice(distanceKm, durationMinutes, settings);
	let price = calculation.priceWithMargin;
	
	// Add enhanced calculation rule (Story 4.1 - AC3)
	appliedRules.push({
		type: "DYNAMIC_BASE_CALCULATION",
		description: `Base price calculated using max(distance, duration) formula - ${calculation.selectedMethod} method selected`,
		inputs: calculation.inputs,
		calculation: {
			distanceBasedPrice: calculation.distanceBasedPrice,
			durationBasedPrice: calculation.durationBasedPrice,
			selectedMethod: calculation.selectedMethod,
			basePrice: calculation.basePrice,
			priceWithMargin: calculation.priceWithMargin,
		},
		usingDefaultSettings,
	});

	// Story 4.3: Apply multipliers if context is provided
	if (multiplierContext && (advancedRates.length > 0 || seasonalMultipliers.length > 0)) {
		const multiplierResult = applyAllMultipliers(
			price,
			multiplierContext,
			advancedRates,
			seasonalMultipliers,
		);
		
		// Update price with multiplier-adjusted value
		if (multiplierResult.appliedRules.length > 0) {
			price = multiplierResult.adjustedPrice;
			// Add all multiplier rules to the applied rules list
			appliedRules.push(...multiplierResult.appliedRules);
		}
	}
	
	// Calculate cost breakdown (Story 4.2)
	const costBreakdown = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	const internalCost = costBreakdown.total;
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	// Build tripAnalysis (Story 4.2)
	const tripAnalysis: TripAnalysis = {
		costBreakdown,
	};

	// Add cost breakdown rule (Story 4.2)
	appliedRules.push({
		type: "COST_BREAKDOWN",
		description: "Internal cost calculated with operational components",
		costBreakdown: {
			fuel: costBreakdown.fuel.amount,
			tolls: costBreakdown.tolls.amount,
			wear: costBreakdown.wear.amount,
			driver: costBreakdown.driver.amount,
			parking: costBreakdown.parking.amount,
			total: costBreakdown.total,
		},
	});

	return {
		pricingMode: "DYNAMIC",
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
		matchedGrid: null,
		appliedRules,
		isContractPrice: false,
		fallbackReason,
		gridSearchDetails,
		tripAnalysis,
	};
}

/**
 * Build a FIXED_GRID pricing result with cost analysis (Story 4.2 - AC5)
 */
function buildGridResult(
	price: number,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	matchedGrid: MatchedGrid,
	appliedRules: AppliedRule[],
): PricingResult {
	// Calculate cost breakdown for profitability analysis (Story 4.2 - AC5)
	const costBreakdown = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	const internalCost = costBreakdown.total;
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	// Build tripAnalysis
	const tripAnalysis: TripAnalysis = {
		costBreakdown,
	};

	// Add cost breakdown rule
	appliedRules.push({
		type: "COST_BREAKDOWN",
		description: "Internal cost calculated for profitability analysis",
		costBreakdown: {
			fuel: costBreakdown.fuel.amount,
			tolls: costBreakdown.tolls.amount,
			wear: costBreakdown.wear.amount,
			driver: costBreakdown.driver.amount,
			parking: costBreakdown.parking.amount,
			total: costBreakdown.total,
		},
	});

	return {
		pricingMode: "FIXED_GRID",
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
		matchedGrid,
		appliedRules,
		isContractPrice: true,
		fallbackReason: null,
		gridSearchDetails: null,
		tripAnalysis,
	};
}

// ============================================================================
// Story 4.4: Manual Override Functions
// ============================================================================

/**
 * Validate a price override request
 * Checks minimum margin constraints and price validity
 * 
 * @param newPrice - The new price to validate
 * @param internalCost - The internal cost for margin calculation
 * @param minimumMarginPercent - Optional minimum margin threshold (default: no minimum)
 * @returns Validation result with error details if invalid
 */
export function validatePriceOverride(
	newPrice: number,
	internalCost: number,
	minimumMarginPercent?: number,
): OverrideValidationResult {
	// Check for invalid price
	if (newPrice <= 0) {
		return {
			isValid: false,
			errorCode: "INVALID_PRICE",
			errorMessage: "Price must be greater than zero",
			details: {
				requestedPrice: newPrice,
				internalCost,
				resultingMargin: newPrice - internalCost,
				resultingMarginPercent: 0,
			},
		};
	}

	// Calculate resulting margin
	const resultingMargin = Math.round((newPrice - internalCost) * 100) / 100;
	const resultingMarginPercent = newPrice > 0 
		? Math.round((resultingMargin / newPrice) * 100 * 100) / 100 
		: 0;

	// Check minimum margin constraint if specified
	if (minimumMarginPercent !== undefined && resultingMarginPercent < minimumMarginPercent) {
		return {
			isValid: false,
			errorCode: "BELOW_MINIMUM_MARGIN",
			errorMessage: `Price override rejected: resulting margin (${resultingMarginPercent.toFixed(1)}%) is below minimum threshold (${minimumMarginPercent}%)`,
			details: {
				requestedPrice: newPrice,
				internalCost,
				resultingMargin,
				resultingMarginPercent,
				minimumMarginPercent,
			},
		};
	}

	return {
		isValid: true,
		details: {
			requestedPrice: newPrice,
			internalCost,
			resultingMargin,
			resultingMarginPercent,
			minimumMarginPercent,
		},
	};
}

/**
 * Recalculate profitability after a manual price override
 * Updates margin, marginPercent, profitabilityIndicator and adds MANUAL_OVERRIDE rule
 * 
 * @param input - The recalculation input with new price and context
 * @returns Updated profitability result with override tracking
 */
export function recalculateProfitability(
	input: RecalculateProfitabilityInput,
): RecalculateProfitabilityResult {
	const { newPrice, internalCost, previousPrice, previousAppliedRules, reason, isContractPrice } = input;

	// Calculate new margin
	const margin = Math.round((newPrice - internalCost) * 100) / 100;
	const marginPercent = newPrice > 0 
		? Math.round((margin / newPrice) * 100 * 100) / 100 
		: 0;

	// Calculate price change
	const priceChange = Math.round((newPrice - previousPrice) * 100) / 100;
	const priceChangePercent = previousPrice > 0 
		? Math.round((priceChange / previousPrice) * 100 * 100) / 100 
		: 0;

	// Create MANUAL_OVERRIDE rule
	const overrideRule: ManualOverrideRule = {
		type: "MANUAL_OVERRIDE",
		description: isContractPrice 
			? `Contract price overridden: ${previousPrice.toFixed(2)}€ → ${newPrice.toFixed(2)}€ (Warning: Engagement Rule bypassed)`
			: `Price manually adjusted: ${previousPrice.toFixed(2)}€ → ${newPrice.toFixed(2)}€`,
		previousPrice,
		newPrice,
		priceChange,
		priceChangePercent,
		reason,
		overriddenAt: new Date().toISOString(),
		isContractPriceOverride: isContractPrice,
	};

	// Filter out any previous MANUAL_OVERRIDE rules and add the new one
	const filteredRules = previousAppliedRules.filter(rule => rule.type !== "MANUAL_OVERRIDE");
	const appliedRules: AppliedRule[] = [...filteredRules, overrideRule];

	return {
		price: newPrice,
		margin,
		marginPercent,
		profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
		appliedRules,
		overrideApplied: true,
		priceChange,
		priceChangePercent,
	};
}

/**
 * Apply a price override to a full PricingResult
 * Combines validation and recalculation into a single operation
 * 
 * @param pricingResult - The original pricing result to override
 * @param newPrice - The new price to apply
 * @param reason - Optional reason for the override
 * @param minimumMarginPercent - Optional minimum margin constraint
 * @returns Updated PricingResult or validation error
 */
export function applyPriceOverride(
	pricingResult: PricingResult,
	newPrice: number,
	reason?: string,
	minimumMarginPercent?: number,
): { success: true; result: PricingResult } | { success: false; error: OverrideValidationResult } {
	// Validate the override
	const validation = validatePriceOverride(newPrice, pricingResult.internalCost, minimumMarginPercent);
	
	if (!validation.isValid) {
		return { success: false, error: validation };
	}

	// Recalculate profitability
	const recalcResult = recalculateProfitability({
		newPrice,
		internalCost: pricingResult.internalCost,
		previousPrice: pricingResult.price,
		previousAppliedRules: pricingResult.appliedRules,
		reason,
		isContractPrice: pricingResult.isContractPrice,
	});

	// Build updated PricingResult
	const updatedResult: PricingResult = {
		...pricingResult,
		price: recalcResult.price,
		margin: recalcResult.margin,
		marginPercent: recalcResult.marginPercent,
		profitabilityIndicator: recalcResult.profitabilityIndicator,
		appliedRules: recalcResult.appliedRules,
		overrideApplied: true,
		previousPrice: pricingResult.price,
	};

	return { success: true, result: updatedResult };
}
