/**
 * Pricing Engine Service
 * Implements the Engagement Rule for partner grid pricing (Method 1)
 * and fallback to dynamic pricing (Method 2)
 */

import type { GeoPoint, ZoneData } from "../lib/geo-utils";
import { findZoneForPoint } from "../lib/geo-utils";

// ============================================================================
// Types
// ============================================================================

export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type GridType = "ZoneRoute" | "ExcursionPackage" | "DispoPackage";
export type TripType = "transfer" | "excursion" | "dispo";
export type ProfitabilityIndicator = "green" | "orange" | "red";

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
	description: string;
	[key: string]: unknown;
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
 * Estimate internal cost (simplified for now, will be expanded in Epic 4)
 * Uses a rough estimate: cost = distance * 2.5 EUR/km
 */
export function estimateInternalCost(distanceKm: number): number {
	const costPerKm = 2.5; // Rough estimate including fuel, driver, wear
	return Math.round(distanceKm * costPerKm * 100) / 100;
}

// ============================================================================
// Grid Matching Functions
// ============================================================================

/**
 * Match a zone route for a transfer
 */
export function matchZoneRoute(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	vehicleCategoryId: string,
	contractRoutes: ZoneRouteAssignment[],
): ZoneRouteAssignment["zoneRoute"] | null {
	if (!fromZone || !toZone) {
		return null;
	}

	for (const assignment of contractRoutes) {
		const route = assignment.zoneRoute;

		if (!route.isActive) continue;
		if (route.vehicleCategoryId !== vehicleCategoryId) continue;

		// Check direction
		const matchesForward =
			route.fromZoneId === fromZone.id && route.toZoneId === toZone.id;
		const matchesReverse =
			route.fromZoneId === toZone.id && route.toZoneId === fromZone.id;

		if (route.direction === "BIDIRECTIONAL") {
			if (matchesForward || matchesReverse) {
				return route;
			}
		} else if (route.direction === "A_TO_B") {
			if (matchesForward) {
				return route;
			}
		} else if (route.direction === "B_TO_A") {
			if (matchesReverse) {
				return route;
			}
		}
	}

	return null;
}

/**
 * Match an excursion package
 */
export function matchExcursionPackage(
	originZone: ZoneData | null,
	destinationZone: ZoneData | null,
	vehicleCategoryId: string,
	contractExcursions: ExcursionPackageAssignment[],
): ExcursionPackageAssignment["excursionPackage"] | null {
	for (const assignment of contractExcursions) {
		const excursion = assignment.excursionPackage;

		if (!excursion.isActive) continue;
		if (excursion.vehicleCategoryId !== vehicleCategoryId) continue;

		// Check origin zone match (if specified)
		if (excursion.originZoneId) {
			if (!originZone || excursion.originZoneId !== originZone.id) {
				continue;
			}
		}

		// Check destination zone match (if specified)
		if (excursion.destinationZoneId) {
			if (!destinationZone || excursion.destinationZoneId !== destinationZone.id) {
				continue;
			}
		}

		// If we get here, it's a match
		return excursion;
	}

	return null;
}

/**
 * Match a dispo package
 */
export function matchDispoPackage(
	vehicleCategoryId: string,
	contractDispos: DispoPackageAssignment[],
): DispoPackageAssignment["dispoPackage"] | null {
	for (const assignment of contractDispos) {
		const dispo = assignment.dispoPackage;

		if (!dispo.isActive) continue;
		if (dispo.vehicleCategoryId !== vehicleCategoryId) continue;

		return dispo;
	}

	return null;
}

// ============================================================================
// Dynamic Pricing (Basic - will be expanded in Epic 4)
// ============================================================================

/**
 * Calculate basic dynamic price
 * Formula: max(distance * ratePerKm, duration * ratePerHour)
 */
export function calculateDynamicPrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	const durationHours = durationMinutes / 60;

	const priceByDistance = distanceKm * settings.baseRatePerKm;
	const priceByDuration = durationHours * settings.baseRatePerHour;

	const basePrice = Math.max(priceByDistance, priceByDuration);

	// Apply target margin
	const priceWithMargin = basePrice * (1 + settings.targetMarginPercent / 100);

	return Math.round(priceWithMargin * 100) / 100;
}

// ============================================================================
// Main Pricing Engine
// ============================================================================

export interface PricingEngineContext {
	contact: ContactData;
	zones: ZoneData[];
	pricingSettings: OrganizationPricingSettings;
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
	const { contact, zones, pricingSettings } = context;

	// Default values for distance/duration estimation
	const estimatedDistanceKm = request.estimatedDistanceKm ?? 30;
	const estimatedDurationMinutes = request.estimatedDurationMinutes ?? 45;

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
		);
	}

	// -------------------------------------------------------------------------
	// Step 3: Map pickup/dropoff to zones
	// -------------------------------------------------------------------------
	const pickupZone = findZoneForPoint(request.pickup, zones);
	const dropoffZone = findZoneForPoint(request.dropoff, zones);

	appliedRules.push({
		type: "ZONE_MAPPING",
		description: "Mapped coordinates to zones",
		pickupZone: pickupZone?.name ?? "Unknown",
		pickupZoneId: pickupZone?.id ?? null,
		dropoffZone: dropoffZone?.name ?? "Unknown",
		dropoffZoneId: dropoffZone?.id ?? null,
	});

	// -------------------------------------------------------------------------
	// Step 4: Try to match grids based on trip type
	// -------------------------------------------------------------------------

	// 4a: For transfers, try ZoneRoute first
	if (request.tripType === "transfer") {
		const matchedRoute = matchZoneRoute(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.zoneRoutes,
		);

		if (matchedRoute) {
			const price = Number(matchedRoute.fixedPrice);
			const internalCost = estimateInternalCost(estimatedDistanceKm);
			const margin = price - internalCost;
			const marginPercent =
				price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract grid price applied (Engagement Rule)",
				gridType: "ZoneRoute",
				gridId: matchedRoute.id,
				originalPrice: price,
			});

			return {
				pricingMode: "FIXED_GRID",
				price,
				currency: "EUR",
				internalCost,
				margin,
				marginPercent,
				profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
				matchedGrid: {
					type: "ZoneRoute",
					id: matchedRoute.id,
					name: `${matchedRoute.fromZone.name} → ${matchedRoute.toZone.name}`,
					fromZone: matchedRoute.fromZone.name,
					toZone: matchedRoute.toZone.name,
				},
				appliedRules,
				isContractPrice: true,
			};
		}
	}

	// 4b: For excursions, try ExcursionPackage
	if (request.tripType === "excursion") {
		const matchedExcursion = matchExcursionPackage(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.excursionPackages,
		);

		if (matchedExcursion) {
			const price = Number(matchedExcursion.price);
			const internalCost = estimateInternalCost(estimatedDistanceKm);
			const margin = price - internalCost;
			const marginPercent =
				price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract excursion package applied (Engagement Rule)",
				gridType: "ExcursionPackage",
				gridId: matchedExcursion.id,
				originalPrice: price,
			});

			return {
				pricingMode: "FIXED_GRID",
				price,
				currency: "EUR",
				internalCost,
				margin,
				marginPercent,
				profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
				matchedGrid: {
					type: "ExcursionPackage",
					id: matchedExcursion.id,
					name: matchedExcursion.name,
					fromZone: matchedExcursion.originZone?.name,
					toZone: matchedExcursion.destinationZone?.name,
				},
				appliedRules,
				isContractPrice: true,
			};
		}
	}

	// 4c: For dispos, try DispoPackage
	if (request.tripType === "dispo") {
		const matchedDispo = matchDispoPackage(
			request.vehicleCategoryId,
			contract.dispoPackages,
		);

		if (matchedDispo) {
			const price = Number(matchedDispo.basePrice);
			const internalCost = estimateInternalCost(estimatedDistanceKm);
			const margin = price - internalCost;
			const marginPercent =
				price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

			appliedRules.push({
				type: "PARTNER_GRID_MATCH",
				description: "Partner contract dispo package applied (Engagement Rule)",
				gridType: "DispoPackage",
				gridId: matchedDispo.id,
				originalPrice: price,
			});

			return {
				pricingMode: "FIXED_GRID",
				price,
				currency: "EUR",
				internalCost,
				margin,
				marginPercent,
				profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
				matchedGrid: {
					type: "DispoPackage",
					id: matchedDispo.id,
					name: matchedDispo.name,
				},
				appliedRules,
				isContractPrice: true,
			};
		}
	}

	// -------------------------------------------------------------------------
	// Step 5: No grid match - fallback to dynamic pricing
	// -------------------------------------------------------------------------
	appliedRules.push({
		type: "NO_GRID_MATCH",
		description: "No matching grid found for partner, using dynamic pricing",
		checkedGrids: ["ZoneRoute", "ExcursionPackage", "DispoPackage"],
		reason: `No route matches fromZone=${pickupZone?.code ?? "UNKNOWN"} toZone=${dropoffZone?.code ?? "UNKNOWN"}`,
		tripType: request.tripType,
		vehicleCategoryId: request.vehicleCategoryId,
	});

	return buildDynamicResult(
		estimatedDistanceKm,
		estimatedDurationMinutes,
		pricingSettings,
		appliedRules,
	);
}

/**
 * Build a dynamic pricing result
 */
function buildDynamicResult(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	appliedRules: AppliedRule[],
): PricingResult {
	const price = calculateDynamicPrice(distanceKm, durationMinutes, settings);
	const internalCost = estimateInternalCost(distanceKm);
	const margin = price - internalCost;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	appliedRules.push({
		type: "DYNAMIC_BASE_PRICE",
		description: "Base price from distance/duration",
		distanceKm,
		durationMinutes,
		ratePerKm: settings.baseRatePerKm,
		ratePerHour: settings.baseRatePerHour,
		calculatedPrice: price,
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
	};
}
