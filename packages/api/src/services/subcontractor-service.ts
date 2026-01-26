/**
 * Subcontractor Service
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 *
 * Provides functionality to:
 * 1. Detect structurally unprofitable missions
 * 2. Find subcontractors that can serve specific zones
 * 3. Calculate estimated subcontractor prices
 * 4. Generate subcontracting suggestions with margin comparison
 * 5. Log subcontracting decisions
 */

import type { Prisma, PrismaClient } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for subcontracting suggestions
 */
export interface SubcontractorConfig {
	/** Margin threshold below which mission is considered unprofitable (default: 0) */
	unprofitableThresholdPercent: number;
	/** Maximum number of suggestions to return (default: 5) */
	maxSuggestions: number;
}

/**
 * Default subcontractor configuration
 */
export const DEFAULT_SUBCONTRACTOR_CONFIG: SubcontractorConfig = {
	unprofitableThresholdPercent: 0,
	maxSuggestions: 5,
};

/**
 * Subcontractor with zone match information
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export interface SubcontractorWithMatch {
	id: string;
	companyName: string;
	contactName: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	allZones: boolean;
	ratePerKm: number | null;
	ratePerHour: number | null;
	minimumFare: number | null;
	isActive: boolean;
	operatingZones: { id: string; name: string; code: string }[];
	vehicleCategories: { id: string; name: string; code: string }[];
	zoneMatch: {
		pickup: boolean;
		dropoff: boolean;
		score: number; // 0-100
	};
}

/**
 * Margin comparison between internal and subcontractor execution
 */
export interface MarginComparison {
	internalCost: number;
	subcontractorCost: number;
	savings: number;
	savingsPercent: number;
	recommendation: "SUBCONTRACT" | "INTERNAL" | "REVIEW";
}

/**
 * Subcontracting suggestion for a mission
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export interface SubcontractingSuggestion {
	subcontractorId: string;
	subcontractor: {
		id: string;
		companyName: string;
		contactName: string | null;
		email: string | null;
		phone: string | null;
	};
	estimatedPrice: number;
	marginIfSubcontracted: number;
	marginPercentIfSubcontracted: number;
	comparison: MarginComparison;
	zoneMatch: {
		pickup: boolean;
		dropoff: boolean;
		score: number;
	};
}

/**
 * Mission data needed for subcontracting analysis
 */
export interface MissionForSubcontracting {
	id: string;
	sellingPrice: number;
	internalCost: number;
	marginPercent: number;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	vehicleCategoryId: string;
	// Estimated distance and duration
	distanceKm?: number;
	durationMinutes?: number;
}

/**
 * Result of subcontracting suggestions query
 */
export interface SubcontractingSuggestionsResult {
	mission: {
		id: string;
		sellingPrice: number;
		internalCost: number;
		marginPercent: number;
	};
	isUnprofitable: boolean;
	unprofitableThreshold: number;
	unprofitableReason: string | null;
	suggestions: SubcontractingSuggestion[];
}

// ============================================================================
// Constants
// ============================================================================

/** Default rate per km if subcontractor has no rate configured */
const DEFAULT_RATE_PER_KM = 2.0;

/** Default rate per hour if subcontractor has no rate configured */
const DEFAULT_RATE_PER_HOUR = 40.0;

/** Threshold for "close" margin comparison (within 5%) */
const REVIEW_THRESHOLD_PERCENT = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a mission is structurally unprofitable
 */
export function isStructurallyUnprofitable(
	sellingPrice: number,
	internalCost: number,
	thresholdPercent = 0,
): boolean {
	if (sellingPrice <= 0) return true;
	const marginPercent = ((sellingPrice - internalCost) / sellingPrice) * 100;
	return marginPercent <= thresholdPercent;
}

/**
 * Calculate margin percentage
 */
export function calculateMarginPercent(
	sellingPrice: number,
	cost: number,
): number {
	if (sellingPrice <= 0) return -100;
	return Math.round(((sellingPrice - cost) / sellingPrice) * 100 * 10) / 10;
}

/**
 * Calculate estimated subcontractor price for a mission
 *
 * Uses MAX(distance × ratePerKm, duration × ratePerHour) with minimumFare floor
 */
export function calculateSubcontractorPrice(
	ratePerKm: number | null,
	ratePerHour: number | null,
	minimumFare: number | null,
	distanceKm: number,
	durationMinutes: number,
): number {
	const effectiveRatePerKm = ratePerKm ?? DEFAULT_RATE_PER_KM;
	const effectiveRatePerHour = ratePerHour ?? DEFAULT_RATE_PER_HOUR;
	const effectiveMinimumFare = minimumFare ?? 0;

	const distancePrice = distanceKm * effectiveRatePerKm;
	const durationPrice = (durationMinutes / 60) * effectiveRatePerHour;

	const calculatedPrice = Math.max(distancePrice, durationPrice);
	const finalPrice = Math.max(calculatedPrice, effectiveMinimumFare);

	return Math.round(finalPrice * 100) / 100;
}

/**
 * Compare margins between internal and subcontractor execution
 */
export function compareMargins(
	sellingPrice: number,
	internalCost: number,
	subcontractorCost: number,
): MarginComparison {
	const savings = internalCost - subcontractorCost;
	const savingsPercent = internalCost > 0 ? (savings / internalCost) * 100 : 0;

	const internalMargin = sellingPrice - internalCost;
	const subcontractorMargin = sellingPrice - subcontractorCost;

	let recommendation: "SUBCONTRACT" | "INTERNAL" | "REVIEW";

	if (
		subcontractorMargin >
		internalMargin + (sellingPrice * REVIEW_THRESHOLD_PERCENT) / 100
	) {
		recommendation = "SUBCONTRACT";
	} else if (
		internalMargin >
		subcontractorMargin + (sellingPrice * REVIEW_THRESHOLD_PERCENT) / 100
	) {
		recommendation = "INTERNAL";
	} else {
		recommendation = "REVIEW";
	}

	return {
		internalCost: Math.round(internalCost * 100) / 100,
		subcontractorCost: Math.round(subcontractorCost * 100) / 100,
		savings: Math.round(savings * 100) / 100,
		savingsPercent: Math.round(savingsPercent * 10) / 10,
		recommendation,
	};
}

/**
 * Calculate zone match score (0-100)
 * - 100: Both pickup and dropoff match
 * - 50: Only pickup or only dropoff matches
 * - 0: No match
 */
export function calculateZoneMatchScore(
	pickupMatch: boolean,
	dropoffMatch: boolean,
): number {
	if (pickupMatch && dropoffMatch) return 100;
	if (pickupMatch || dropoffMatch) return 50;
	return 0;
}

/**
 * Check if a point is within a zone
 * Simplified implementation - checks if point is within radius of zone center
 */
export function isPointInZone(
	pointLat: number,
	pointLng: number,
	zone: {
		centerLatitude: number | null;
		centerLongitude: number | null;
		radiusKm: number | null;
	},
): boolean {
	if (!zone.centerLatitude || !zone.centerLongitude) return false;

	const radiusKm = zone.radiusKm ? Number(zone.radiusKm) : 20; // Default 20km radius
	const distance = haversineDistance(
		pointLat,
		pointLng,
		Number(zone.centerLatitude),
		Number(zone.centerLongitude),
	);

	return distance <= radiusKm;
}

/**
 * Calculate Haversine distance between two points in km
 */
function haversineDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
			Math.cos(toRad(lat2)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

/**
 * Extract distance and duration from tripAnalysis JSON
 */
export function extractTripMetrics(tripAnalysis: unknown): {
	distanceKm: number;
	durationMinutes: number;
} {
	const defaultResult = { distanceKm: 0, durationMinutes: 0 };

	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return defaultResult;
	}

	const analysis = tripAnalysis as Record<string, unknown>;

	return {
		distanceKm: Number(analysis.totalDistanceKm) || 0,
		durationMinutes: Number(analysis.totalDurationMinutes) || 0,
	};
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Find subcontractors that can serve a mission based on zones
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function findSubcontractorsForMission(
	organizationId: string,
	pickupLat: number | null,
	pickupLng: number | null,
	dropoffLat: number | null,
	dropoffLng: number | null,
	vehicleCategoryId: string,
	db: PrismaClient,
): Promise<SubcontractorWithMatch[]> {
	// Get all active subcontractors for the organization
	const subcontractors = await db.subcontractorProfile.findMany({
		where: {
			organizationId,
			isActive: true,
		},
		include: {
			operatingZones: {
				include: {
					pricingZone: true,
				},
			},
			vehicleCategories: {
				include: {
					vehicleCategory: true,
				},
			},
		},
	});

	const results: SubcontractorWithMatch[] = [];

	for (const sub of subcontractors) {
		// Check vehicle category compatibility
		const hasVehicleCategory =
			sub.vehicleCategories.length === 0 || // No restriction = all categories
			sub.vehicleCategories.some(
				(vc) => vc.vehicleCategoryId === vehicleCategoryId,
			);

		if (!hasVehicleCategory) continue;

		// Check zone match
		let pickupMatch = false;
		let dropoffMatch = false;

		if (pickupLat && pickupLng) {
			for (const sz of sub.operatingZones) {
				if (
					isPointInZone(pickupLat, pickupLng, {
						centerLatitude: sz.pricingZone.centerLatitude
							? Number(sz.pricingZone.centerLatitude)
							: null,
						centerLongitude: sz.pricingZone.centerLongitude
							? Number(sz.pricingZone.centerLongitude)
							: null,
						radiusKm: sz.pricingZone.radiusKm
							? Number(sz.pricingZone.radiusKm)
							: null,
					})
				) {
					pickupMatch = true;
					break;
				}
			}
		}

		if (dropoffLat && dropoffLng) {
			for (const sz of sub.operatingZones) {
				if (
					isPointInZone(dropoffLat, dropoffLng, {
						centerLatitude: sz.pricingZone.centerLatitude
							? Number(sz.pricingZone.centerLatitude)
							: null,
						centerLongitude: sz.pricingZone.centerLongitude
							? Number(sz.pricingZone.centerLongitude)
							: null,
						radiusKm: sz.pricingZone.radiusKm
							? Number(sz.pricingZone.radiusKm)
							: null,
					})
				) {
					dropoffMatch = true;
					break;
				}
			}
		}

		// If allZones=true or no zones configured, consider it a match (subcontractor serves all areas)
		if (sub.allZones || sub.operatingZones.length === 0) {
			pickupMatch = true;
			dropoffMatch = true;
		}

		// Only include if at least one zone matches
		if (!pickupMatch && !dropoffMatch) continue;

		results.push({
			id: sub.id,
			companyName: sub.companyName,
			contactName: sub.contactName,
			email: sub.email,
			phone: sub.phone,
			address: sub.address,
			allZones: sub.allZones,
			ratePerKm: sub.ratePerKm ? Number(sub.ratePerKm) : null,
			ratePerHour: sub.ratePerHour ? Number(sub.ratePerHour) : null,
			minimumFare: sub.minimumFare ? Number(sub.minimumFare) : null,
			isActive: sub.isActive,
			operatingZones: sub.operatingZones.map((sz) => ({
				id: sz.pricingZone.id,
				name: sz.pricingZone.name,
				code: sz.pricingZone.code,
			})),
			vehicleCategories: sub.vehicleCategories.map((vc) => ({
				id: vc.vehicleCategory.id,
				name: vc.vehicleCategory.name,
				code: vc.vehicleCategory.code,
			})),
			zoneMatch: {
				pickup: pickupMatch,
				dropoff: dropoffMatch,
				score: calculateZoneMatchScore(pickupMatch, dropoffMatch),
			},
		});
	}

	// Sort by zone match score (highest first)
	results.sort((a, b) => b.zoneMatch.score - a.zoneMatch.score);

	return results;
}

/**
 * Generate subcontracting suggestions for a mission
 */
export async function generateSubcontractingSuggestions(
	missionId: string,
	organizationId: string,
	db: PrismaClient,
	config: SubcontractorConfig = DEFAULT_SUBCONTRACTOR_CONFIG,
): Promise<SubcontractingSuggestionsResult> {
	// Get mission data
	const mission = await db.quote.findFirst({
		where: {
			id: missionId,
			organizationId,
		},
	});

	if (!mission) {
		throw new Error(`Mission not found: ${missionId}`);
	}

	const sellingPrice = Number(mission.finalPrice);
	const internalCost = mission.internalCost ? Number(mission.internalCost) : 0;
	const marginPercent = mission.marginPercent
		? Number(mission.marginPercent)
		: calculateMarginPercent(sellingPrice, internalCost);

	const isUnprofitable = isStructurallyUnprofitable(
		sellingPrice,
		internalCost,
		config.unprofitableThresholdPercent,
	);

	const result: SubcontractingSuggestionsResult = {
		mission: {
			id: mission.id,
			sellingPrice,
			internalCost,
			marginPercent,
		},
		isUnprofitable,
		unprofitableThreshold: config.unprofitableThresholdPercent,
		unprofitableReason: isUnprofitable
			? `Margin ${marginPercent.toFixed(1)}% is below threshold ${config.unprofitableThresholdPercent}%`
			: null,
		suggestions: [],
	};

	// Find matching subcontractors
	const subcontractors = await findSubcontractorsForMission(
		organizationId,
		mission.pickupLatitude ? Number(mission.pickupLatitude) : null,
		mission.pickupLongitude ? Number(mission.pickupLongitude) : null,
		mission.dropoffLatitude ? Number(mission.dropoffLatitude) : null,
		mission.dropoffLongitude ? Number(mission.dropoffLongitude) : null,
		mission.vehicleCategoryId,
		db,
	);

	// Extract trip metrics
	const { distanceKm, durationMinutes } = extractTripMetrics(
		mission.tripAnalysis,
	);

	// Generate suggestions
	for (const sub of subcontractors) {
		const estimatedPrice = calculateSubcontractorPrice(
			sub.ratePerKm,
			sub.ratePerHour,
			sub.minimumFare,
			distanceKm,
			durationMinutes,
		);

		const marginIfSubcontracted = sellingPrice - estimatedPrice;
		const marginPercentIfSubcontracted = calculateMarginPercent(
			sellingPrice,
			estimatedPrice,
		);

		const comparison = compareMargins(
			sellingPrice,
			internalCost,
			estimatedPrice,
		);

		result.suggestions.push({
			subcontractorId: sub.id,
			subcontractor: {
				id: sub.id,
				companyName: sub.companyName,
				contactName: sub.contactName,
				email: sub.email,
				phone: sub.phone,
			},
			estimatedPrice,
			marginIfSubcontracted: Math.round(marginIfSubcontracted * 100) / 100,
			marginPercentIfSubcontracted,
			comparison,
			zoneMatch: sub.zoneMatch,
		});
	}

	// Sort by resulting margin (highest first)
	result.suggestions.sort(
		(a, b) => b.marginIfSubcontracted - a.marginIfSubcontracted,
	);

	// Limit suggestions
	result.suggestions = result.suggestions.slice(0, config.maxSuggestions);

	return result;
}

/**
 * Mark a mission as subcontracted
 */
export async function subcontractMission(
	missionId: string,
	subcontractorId: string,
	agreedPrice: number,
	notes: string | null,
	operatorId: string,
	organizationId: string,
	db: PrismaClient,
): Promise<{
	mission: {
		id: string;
		isSubcontracted: boolean;
		subcontractorId: string;
		subcontractedPrice: number;
	};
}> {
	// Verify mission exists (lookup by Mission ID)
	const mission = await db.mission.findFirst({
		where: {
			id: missionId,
			organizationId,
		},
		include: {
			quote: true,
		},
	});

	if (!mission || !mission.quote) {
		throw new Error(`Mission not found: ${missionId}`);
	}

	const quote = mission.quote;

	// Verify subcontractor exists
	const subcontractor = await db.subcontractorProfile.findFirst({
		where: {
			id: subcontractorId,
			organizationId,
		},
	});

	if (!subcontractor) {
		throw new Error(`Subcontractor not found: ${subcontractorId}`);
	}

	// Update mission - release internal drivers/vehicles when subcontracting
	// Story 22.12: When subcontracting, internal resources must be freed
	// Also clear tripAnalysis.assignment to prevent fallback display
	let updatedTripAnalysis: Prisma.InputJsonValue | undefined = undefined;
	if (
		quote.tripAnalysis &&
		typeof quote.tripAnalysis === "object" &&
		!Array.isArray(quote.tripAnalysis)
	) {
		const tripAnalysisObj = { ...(quote.tripAnalysis as object) } as Record<
			string,
			unknown
		>;
		// Remove assignment from tripAnalysis - subcontractor handles the mission
		delete tripAnalysisObj.assignment;
		updatedTripAnalysis = tripAnalysisObj as Prisma.InputJsonValue;
	}

	// Update Quote logic
	const updatedQuote = await db.quote.update({
		where: { id: quote.id },
		data: {
			isSubcontracted: true,
			subcontractorId,
			subcontractedPrice: agreedPrice,
			subcontractedAt: new Date(),
			subcontractingNotes: notes,
			// Release internal assignment - subcontractor handles the mission
			assignedVehicleId: null,
			assignedDriverId: null,
			secondDriverId: null,
			assignedAt: null,
			// Clear tripAnalysis.assignment to prevent fallback display
			...(updatedTripAnalysis && { tripAnalysis: updatedTripAnalysis }),
		},
	});

	// CRITICAL: Also update the Mission table to clear internal assignment
	await db.mission.update({
		where: { id: missionId },
		data: {
			vehicleId: null,
			driverId: null,
		},
	});

	// Create audit log entry
	await db.quoteStatusAuditLog.create({
		data: {
			organizationId,
			quoteId: quote.id,
			previousStatus: quote.status,
			newStatus: quote.status, // Status doesn't change, just subcontracting flag
			userId: operatorId,
			reason: `Subcontracted to ${subcontractor.id} for €${agreedPrice}`,
		},
	});

	return {
		mission: {
			id: mission.id,
			isSubcontracted: updatedQuote.isSubcontracted,
			subcontractorId: updatedQuote.subcontractorId!,
			subcontractedPrice: Number(updatedQuote.subcontractedPrice),
		},
	};
}

/**
 * Remove subcontracting from a mission (allow normal assignment again)
 */
export async function removeSubcontracting(
	missionId: string,
	operatorId: string,
	organizationId: string,
	db: PrismaClient,
): Promise<{ mission: { id: string; isSubcontracted: boolean } }> {
	// Verify mission exists (lookup by Mission ID)
	const mission = await db.mission.findFirst({
		where: {
			id: missionId,
			organizationId,
		},
		include: {
			quote: true,
		},
	});

	if (!mission || !mission.quote) {
		throw new Error(`Mission not found: ${missionId}`);
	}

	const quote = mission.quote;

	// Update mission - remove subcontracting and allow normal assignment
	const updatedQuote = await db.quote.update({
		where: { id: quote.id },
		data: {
			isSubcontracted: false,
			subcontractorId: null,
			subcontractedPrice: null,
			subcontractedAt: null,
			subcontractingNotes: null,
			// Clear internal assignment (will be set by normal assignment process)
			assignedVehicleId: null,
			assignedDriverId: null,
			secondDriverId: null,
			assignedAt: null,
		},
	});

	// Ensure Mission table is consistent (should already be null if previously subcontracted, but good to ensure)
	await db.mission.update({
		where: { id: missionId },
		data: {
			vehicleId: null,
			driverId: null,
		},
	});

	// Create audit log entry
	await db.quoteStatusAuditLog.create({
		data: {
			organizationId,
			quoteId: quote.id,
			previousStatus: quote.status,
			newStatus: quote.status, // Status doesn't change, just subcontracting flag
			userId: operatorId,
			reason:
				"Subcontracting removed - mission available for normal assignment",
		},
	});

	return {
		mission: {
			id: mission.id,
			isSubcontracted: updatedQuote.isSubcontracted,
		},
	};
}

/**
 * Get subcontractor by ID
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function getSubcontractorById(
	subcontractorId: string,
	organizationId: string,
	db: PrismaClient,
) {
	return db.subcontractorProfile.findFirst({
		where: {
			id: subcontractorId,
			organizationId,
		},
		include: {
			operatingZones: {
				include: {
					pricingZone: true,
				},
			},
			vehicleCategories: {
				include: {
					vehicleCategory: true,
				},
			},
		},
	});
}

/**
 * List all subcontractors for an organization
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function listSubcontractors(
	organizationId: string,
	db: PrismaClient,
	options?: {
		includeInactive?: boolean;
	},
) {
	const where: { organizationId: string; isActive?: boolean } = {
		organizationId,
	};
	if (!options?.includeInactive) {
		where.isActive = true;
	}

	const subcontractors = await db.subcontractorProfile.findMany({
		where,
		include: {
			operatingZones: {
				include: {
					pricingZone: true,
				},
			},
			vehicleCategories: {
				include: {
					vehicleCategory: true,
				},
			},
		},
		orderBy: {
			companyName: "asc",
		},
	});

	return subcontractors.map((sub) => ({
		id: sub.id,
		companyName: sub.companyName,
		siret: sub.siret,
		vatNumber: sub.vatNumber,
		contactName: sub.contactName,
		email: sub.email,
		phone: sub.phone,
		address: sub.address,
		allZones: sub.allZones,
		operatingZones: sub.operatingZones.map((sz) => ({
			id: sz.pricingZone.id,
			name: sz.pricingZone.name,
			code: sz.pricingZone.code,
		})),
		vehicleCategories: sub.vehicleCategories.map((vc) => ({
			id: vc.vehicleCategory.id,
			name: vc.vehicleCategory.name,
			code: vc.vehicleCategory.code,
		})),
		ratePerKm: sub.ratePerKm ? Number(sub.ratePerKm) : null,
		ratePerHour: sub.ratePerHour ? Number(sub.ratePerHour) : null,
		minimumFare: sub.minimumFare ? Number(sub.minimumFare) : null,
		isActive: sub.isActive,
		notes: sub.notes,
		createdAt: sub.createdAt.toISOString(),
		updatedAt: sub.updatedAt.toISOString(),
	}));
}

/**
 * Create a new subcontractor profile
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function createSubcontractor(
	organizationId: string,
	data: {
		companyName: string;
		siret?: string;
		vatNumber?: string;
		contactName?: string;
		email?: string;
		phone?: string;
		address?: string;
		allZones?: boolean;
		operatingZoneIds?: string[];
		vehicleCategoryIds?: string[];
		ratePerKm?: number;
		ratePerHour?: number;
		minimumFare?: number;
		notes?: string;
	},
	db: PrismaClient,
) {
	// Create subcontractor profile
	const subcontractor = await db.subcontractorProfile.create({
		data: {
			organizationId,
			companyName: data.companyName,
			siret: data.siret,
			vatNumber: data.vatNumber,
			contactName: data.contactName,
			email: data.email,
			phone: data.phone,
			address: data.address,
			allZones: data.allZones ?? false,
			ratePerKm: data.ratePerKm,
			ratePerHour: data.ratePerHour,
			minimumFare: data.minimumFare,
			notes: data.notes,
			operatingZones: data.operatingZoneIds?.length
				? {
						create: data.operatingZoneIds.map((zoneId) => ({
							pricingZoneId: zoneId,
						})),
					}
				: undefined,
			vehicleCategories: data.vehicleCategoryIds?.length
				? {
						create: data.vehicleCategoryIds.map((catId) => ({
							vehicleCategoryId: catId,
						})),
					}
				: undefined,
		},
		include: {
			operatingZones: {
				include: {
					pricingZone: true,
				},
			},
			vehicleCategories: {
				include: {
					vehicleCategory: true,
				},
			},
		},
	});

	return subcontractor;
}

/**
 * Update a subcontractor profile
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function updateSubcontractor(
	subcontractorId: string,
	organizationId: string,
	data: {
		companyName?: string;
		siret?: string | null;
		vatNumber?: string | null;
		contactName?: string | null;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
		allZones?: boolean;
		operatingZoneIds?: string[];
		vehicleCategoryIds?: string[];
		ratePerKm?: number | null;
		ratePerHour?: number | null;
		minimumFare?: number | null;
		notes?: string | null;
		isActive?: boolean;
	},
	db: PrismaClient,
) {
	// Verify subcontractor exists
	const existing = await db.subcontractorProfile.findFirst({
		where: {
			id: subcontractorId,
			organizationId,
		},
	});

	if (!existing) {
		throw new Error(`Subcontractor not found: ${subcontractorId}`);
	}

	// Update zones if provided
	if (data.operatingZoneIds !== undefined) {
		// Delete existing zones
		await db.subcontractorZone.deleteMany({
			where: { subcontractorProfileId: subcontractorId },
		});

		// Create new zones
		if (data.operatingZoneIds.length > 0) {
			await db.subcontractorZone.createMany({
				data: data.operatingZoneIds.map((zoneId) => ({
					subcontractorProfileId: subcontractorId,
					pricingZoneId: zoneId,
				})),
			});
		}
	}

	// Update vehicle categories if provided
	if (data.vehicleCategoryIds !== undefined) {
		// Delete existing categories
		await db.subcontractorVehicleCategory.deleteMany({
			where: { subcontractorProfileId: subcontractorId },
		});

		// Create new categories
		if (data.vehicleCategoryIds.length > 0) {
			await db.subcontractorVehicleCategory.createMany({
				data: data.vehicleCategoryIds.map((catId) => ({
					subcontractorProfileId: subcontractorId,
					vehicleCategoryId: catId,
				})),
			});
		}
	}

	// Update profile
	const updated = await db.subcontractorProfile.update({
		where: { id: subcontractorId },
		data: {
			companyName: data.companyName,
			siret: data.siret,
			vatNumber: data.vatNumber,
			contactName: data.contactName,
			email: data.email,
			phone: data.phone,
			address: data.address,
			allZones: data.allZones,
			ratePerKm: data.ratePerKm,
			ratePerHour: data.ratePerHour,
			minimumFare: data.minimumFare,
			notes: data.notes,
			isActive: data.isActive,
		},
		include: {
			operatingZones: {
				include: {
					pricingZone: true,
				},
			},
			vehicleCategories: {
				include: {
					vehicleCategory: true,
				},
			},
		},
	});

	return updated;
}

/**
 * Delete a subcontractor profile
 * Story 22.4: Refactored - Subcontractor is now an independent company entity
 */
export async function deleteSubcontractor(
	subcontractorId: string,
	organizationId: string,
	db: PrismaClient,
) {
	// Verify subcontractor exists
	const existing = await db.subcontractorProfile.findFirst({
		where: {
			id: subcontractorId,
			organizationId,
		},
	});

	if (!existing) {
		throw new Error(`Subcontractor not found: ${subcontractorId}`);
	}

	// Delete subcontractor profile (cascades to zones and categories)
	await db.subcontractorProfile.delete({
		where: { id: subcontractorId },
	});

	return { success: true };
}
