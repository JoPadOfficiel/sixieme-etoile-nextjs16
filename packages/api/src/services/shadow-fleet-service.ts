/**
 * Shadow Fleet Service
 * Story 18.9: Shadow Fleet Integration (Subcontractors)
 *
 * Provides functionality to:
 * 1. Get subcontractor candidates for mission assignment (Shadow Fleet)
 * 2. Calculate indicative prices for subcontractors
 * 3. Compare margins between internal fleet and Shadow Fleet
 * 4. Return candidates in format compatible with AssignmentCandidate
 */

import type { PrismaClient } from "@prisma/client";
import {
	findSubcontractorsForMission,
	calculateSubcontractorPrice,
	compareMargins,
	extractTripMetrics,
	type SubcontractorWithMatch,
	type MarginComparison,
} from "./subcontractor-service";

// ============================================================================
// Types
// ============================================================================

/**
 * Shadow Fleet candidate for assignment drawer
 * Compatible with AssignmentCandidate structure
 */
export interface ShadowFleetCandidate {
	/** Unique candidate ID: shadow-{subcontractorId} */
	candidateId: string;
	/** Always true for Shadow Fleet */
	isShadowFleet: true;
	/** Subcontractor profile ID */
	subcontractorId: string;
	/** Partner/company name */
	subcontractorName: string;
	/** Contact email */
	email: string | null;
	/** Contact phone */
	phone: string | null;
	/** Vehicle category offered (from subcontractor's categories) */
	vehicleCategory: {
		id: string;
		name: string;
		code: string;
	} | null;
	/** Indicative price based on rates */
	indicativePrice: number;
	/** Availability status */
	availabilityStatus: "AVAILABLE" | "BUSY" | "OFFLINE";
	/** Availability notes */
	availabilityNotes: string | null;
	/** Zone match information */
	zoneMatch: {
		pickup: boolean;
		dropoff: boolean;
		score: number;
	};
	/** Margin comparison with internal fleet */
	marginComparison: MarginComparison;
	/** Resulting margin if subcontracted */
	marginIfSubcontracted: number;
	/** Resulting margin percent if subcontracted */
	marginPercentIfSubcontracted: number;
}

/**
 * Mission data needed for Shadow Fleet candidate generation
 */
export interface MissionForShadowFleet {
	id: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	vehicleCategoryId: string;
	finalPrice: number;
	internalCost: number | null;
	tripAnalysis: unknown;
}

/**
 * Result of Shadow Fleet candidates query
 */
export interface ShadowFleetCandidatesResult {
	candidates: ShadowFleetCandidate[];
	missionId: string;
	sellingPrice: number;
	internalCost: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate margin percentage
 */
function calculateMarginPercent(sellingPrice: number, cost: number): number {
	if (sellingPrice <= 0) return -100;
	return Math.round(((sellingPrice - cost) / sellingPrice) * 100 * 10) / 10;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get Shadow Fleet candidates for a mission
 *
 * Returns subcontractors as candidates compatible with the assignment drawer,
 * with indicative pricing and margin comparison.
 */
export async function getShadowFleetCandidates(
	mission: MissionForShadowFleet,
	organizationId: string,
	db: PrismaClient
): Promise<ShadowFleetCandidatesResult> {
	const sellingPrice = Number(mission.finalPrice);
	const internalCost = mission.internalCost ? Number(mission.internalCost) : 0;

	// Find matching subcontractors
	const subcontractors = await findSubcontractorsForMission(
		organizationId,
		mission.pickupLatitude ? Number(mission.pickupLatitude) : null,
		mission.pickupLongitude ? Number(mission.pickupLongitude) : null,
		mission.dropoffLatitude ? Number(mission.dropoffLatitude) : null,
		mission.dropoffLongitude ? Number(mission.dropoffLongitude) : null,
		mission.vehicleCategoryId,
		db
	);

	// Get subcontractor profiles with availability status
	const subcontractorProfiles = await db.subcontractorProfile.findMany({
		where: {
			id: { in: subcontractors.map((s) => s.id) },
			organizationId,
		},
		select: {
			id: true,
			availabilityStatus: true,
			availabilityNotes: true,
		},
	});

	const profileMap = new Map(subcontractorProfiles.map((p) => [p.id, p]));

	// Extract trip metrics for price calculation
	const { distanceKm, durationMinutes } = extractTripMetrics(mission.tripAnalysis);

	// Transform to Shadow Fleet candidates
	const candidates: ShadowFleetCandidate[] = [];

	for (const sub of subcontractors) {
		const profile = profileMap.get(sub.id);
		const availabilityStatus = profile?.availabilityStatus ?? "AVAILABLE";

		// Calculate indicative price
		const indicativePrice = calculateSubcontractorPrice(
			sub.ratePerKm,
			sub.ratePerHour,
			sub.minimumFare,
			distanceKm,
			durationMinutes
		);

		// Calculate margin comparison
		const marginComparison = compareMargins(sellingPrice, internalCost, indicativePrice);

		// Calculate resulting margin
		const marginIfSubcontracted = sellingPrice - indicativePrice;
		const marginPercentIfSubcontracted = calculateMarginPercent(sellingPrice, indicativePrice);

		// Get first matching vehicle category (or null if serves all)
		const vehicleCategory =
			sub.vehicleCategories.length > 0
				? sub.vehicleCategories[0]
				: null;

		candidates.push({
			candidateId: `shadow-${sub.id}`,
			isShadowFleet: true,
			subcontractorId: sub.id,
			subcontractorName: sub.companyName || sub.displayName,
			email: sub.email,
			phone: sub.phone,
			vehicleCategory,
			indicativePrice,
			availabilityStatus: availabilityStatus as "AVAILABLE" | "BUSY" | "OFFLINE",
			availabilityNotes: profile?.availabilityNotes ?? null,
			zoneMatch: sub.zoneMatch,
			marginComparison,
			marginIfSubcontracted: Math.round(marginIfSubcontracted * 100) / 100,
			marginPercentIfSubcontracted,
		});
	}

	// Sort by margin (highest first), then by zone match score
	candidates.sort((a, b) => {
		// Available subcontractors first
		if (a.availabilityStatus === "AVAILABLE" && b.availabilityStatus !== "AVAILABLE") return -1;
		if (b.availabilityStatus === "AVAILABLE" && a.availabilityStatus !== "AVAILABLE") return 1;

		// Then by margin
		if (b.marginIfSubcontracted !== a.marginIfSubcontracted) {
			return b.marginIfSubcontracted - a.marginIfSubcontracted;
		}

		// Then by zone match
		return b.zoneMatch.score - a.zoneMatch.score;
	});

	return {
		candidates,
		missionId: mission.id,
		sellingPrice,
		internalCost,
	};
}

/**
 * Transform Shadow Fleet candidate to assignment-compatible format
 *
 * Creates a pseudo-candidate that can be displayed alongside internal fleet
 * in the assignment drawer.
 */
export function transformToAssignmentCandidate(
	shadowCandidate: ShadowFleetCandidate,
	missionInternalCost: number
) {
	return {
		candidateId: shadowCandidate.candidateId,
		isShadowFleet: true as const,
		subcontractorId: shadowCandidate.subcontractorId,
		subcontractorName: shadowCandidate.subcontractorName,
		// Pseudo vehicle info for Shadow Fleet
		vehicleId: `shadow-vehicle-${shadowCandidate.subcontractorId}`,
		vehicleName: `🏢 ${shadowCandidate.subcontractorName}`,
		vehicleCategory: shadowCandidate.vehicleCategory ?? {
			id: "any",
			name: "Flexible",
			code: "FLEX",
		},
		// No physical base for Shadow Fleet
		baseId: `shadow-base-${shadowCandidate.subcontractorId}`,
		baseName: shadowCandidate.subcontractorName,
		baseDistanceKm: 0,
		baseLatitude: 0,
		baseLongitude: 0,
		// No driver for Shadow Fleet
		driverId: null,
		driverName: null,
		driverLicenses: [],
		// Shadow Fleet specific fields
		indicativePrice: shadowCandidate.indicativePrice,
		availabilityStatus: shadowCandidate.availabilityStatus,
		availabilityNotes: shadowCandidate.availabilityNotes,
		zoneMatch: shadowCandidate.zoneMatch,
		marginComparison: shadowCandidate.marginComparison,
		marginIfSubcontracted: shadowCandidate.marginIfSubcontracted,
		marginPercentIfSubcontracted: shadowCandidate.marginPercentIfSubcontracted,
		// Flexibility score based on availability and zone match
		flexibilityScore: calculateShadowFleetScore(shadowCandidate),
		scoreBreakdown: {
			licensesScore: 0,
			availabilityScore: shadowCandidate.availabilityStatus === "AVAILABLE" ? 100 : 0,
			distanceScore: 100, // No approach distance
			rseCapacityScore: 100, // No RSE constraints
		},
		// Compliance always OK for Shadow Fleet (external responsibility)
		compliance: {
			status: "OK" as const,
			warnings: shadowCandidate.availabilityStatus !== "AVAILABLE"
				? [`Subcontractor status: ${shadowCandidate.availabilityStatus}`]
				: [],
		},
		// Cost is the indicative price
		estimatedCost: {
			approach: 0,
			service: shadowCandidate.indicativePrice,
			return: 0,
			total: shadowCandidate.indicativePrice,
		},
		routingSource: "SHADOW_FLEET" as const,
		// No routing segments for Shadow Fleet
		segments: {
			approach: { distanceKm: 0, durationMinutes: 0 },
			service: { distanceKm: 0, durationMinutes: 0 },
			return: { distanceKm: 0, durationMinutes: 0 },
		},
	};
}

/**
 * Calculate a flexibility score for Shadow Fleet candidates
 * Based on availability and zone coverage
 */
function calculateShadowFleetScore(candidate: ShadowFleetCandidate): number {
	let score = 0;

	// Availability (40 points)
	if (candidate.availabilityStatus === "AVAILABLE") {
		score += 40;
	} else if (candidate.availabilityStatus === "BUSY") {
		score += 10;
	}

	// Zone match (40 points)
	score += (candidate.zoneMatch.score / 100) * 40;

	// Margin recommendation (20 points)
	if (candidate.marginComparison.recommendation === "SUBCONTRACT") {
		score += 20;
	} else if (candidate.marginComparison.recommendation === "REVIEW") {
		score += 10;
	}

	return Math.round(score);
}
