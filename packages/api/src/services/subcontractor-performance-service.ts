/**
 * Subcontractor Performance Service
 * Story 22.10: Advanced Subcontracting Workflow
 *
 * Provides functionality to:
 * 1. Track subcontractor performance metrics
 * 2. Record and retrieve feedback for subcontracted missions
 * 3. Calculate reliability scores
 * 4. Update availability status
 */

import type { PrismaClient, SubcontractorAvailability, SubcontractorFeedback } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Performance metrics for a subcontractor
 */
export interface SubcontractorPerformanceMetrics {
	subcontractorId: string;
	companyName: string;
	totalMissions: number;
	completedMissions: number;
	successRate: number; // Percentage 0-100
	averageRating: number; // 1-5 stars
	averagePunctuality: number | null;
	averageVehicleCondition: number | null;
	averageDriverProfessionalism: number | null;
	averageCommunication: number | null;
	reliabilityScore: number; // 0-100 composite score
	recentMissions: RecentMission[];
}

/**
 * Recent mission summary
 */
export interface RecentMission {
	id: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	status: string;
	subcontractedPrice: number;
	hasFeedback: boolean;
	rating: number | null;
}

/**
 * Feedback data for creating/updating feedback
 */
export interface SubcontractorFeedbackInput {
	quoteId: string;
	rating: number; // 1-5
	punctuality?: number; // 1-5
	vehicleCondition?: number; // 1-5
	driverProfessionalism?: number; // 1-5
	communication?: number; // 1-5
	comments?: string;
}

/**
 * Feedback record
 */
export interface SubcontractorFeedbackRecord {
	id: string;
	quoteId: string;
	rating: number;
	punctuality: number | null;
	vehicleCondition: number | null;
	driverProfessionalism: number | null;
	communication: number | null;
	comments: string | null;
	createdAt: string;
	createdBy: string;
}

/**
 * Availability update input
 */
export interface AvailabilityUpdateInput {
	status: SubcontractorAvailability;
	notes?: string;
}

/**
 * Match score breakdown for subcontractor matching
 */
export interface SubcontractorMatchScore {
	subcontractorId: string;
	totalScore: number;
	breakdown: {
		zoneMatch: number; // 0-40 (20 pickup + 20 dropoff)
		vehicleMatch: number; // 0-30
		availability: number; // 0-20
		performance: number; // 0-10
	};
}

// ============================================================================
// Constants
// ============================================================================

/** Weight for zone matching in score calculation */
const ZONE_MATCH_WEIGHT = 40;

/** Weight for vehicle category matching */
const VEHICLE_MATCH_WEIGHT = 30;

/** Weight for availability status */
const AVAILABILITY_WEIGHT = 20;

/** Weight for performance rating */
const PERFORMANCE_WEIGHT = 10;

/** Number of recent missions to return */
const RECENT_MISSIONS_LIMIT = 10;

// ============================================================================
// Performance Tracking Functions
// ============================================================================

/**
 * Get performance metrics for a subcontractor
 */
export async function getSubcontractorPerformance(
	subcontractorId: string,
	organizationId: string,
	db: PrismaClient
): Promise<SubcontractorPerformanceMetrics> {
	// Get subcontractor profile
	const subcontractor = await db.subcontractorProfile.findFirst({
		where: {
			id: subcontractorId,
			organizationId,
		},
	});

	if (!subcontractor) {
		throw new Error(`Subcontractor not found: ${subcontractorId}`);
	}

	// Get all subcontracted missions
	const missions = await db.quote.findMany({
		where: {
			organizationId,
			subcontractorId,
			isSubcontracted: true,
		},
		orderBy: {
			pickupAt: "desc",
		},
		take: 100, // Limit for performance
	});

	// Get all feedback for this subcontractor
	const feedbacks = await db.subcontractorFeedback.findMany({
		where: {
			organizationId,
			subcontractorProfileId: subcontractorId,
		},
	});

	// Create a map of quoteId to feedback for quick lookup
	const feedbackMap = new Map<string, SubcontractorFeedback>(feedbacks.map((f) => [f.quoteId, f]));

	// Calculate metrics
	const totalMissions = missions.length;
	const completedMissions = missions.filter(
		(m) => m.status === "ACCEPTED"
	).length;
	const successRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

	// Calculate average ratings
	const ratingsCount = feedbacks.length;
	const averageRating =
		ratingsCount > 0
			? feedbacks.reduce((sum: number, f: SubcontractorFeedback) => sum + f.rating, 0) / ratingsCount
			: 0;

	const punctualityRatings = feedbacks.filter((f: SubcontractorFeedback) => f.punctuality !== null);
	const averagePunctuality =
		punctualityRatings.length > 0
			? punctualityRatings.reduce((sum: number, f: SubcontractorFeedback) => sum + (f.punctuality ?? 0), 0) /
			  punctualityRatings.length
			: null;

	const vehicleRatings = feedbacks.filter((f: SubcontractorFeedback) => f.vehicleCondition !== null);
	const averageVehicleCondition =
		vehicleRatings.length > 0
			? vehicleRatings.reduce((sum: number, f: SubcontractorFeedback) => sum + (f.vehicleCondition ?? 0), 0) /
			  vehicleRatings.length
			: null;

	const professionalismRatings = feedbacks.filter((f: SubcontractorFeedback) => f.driverProfessionalism !== null);
	const averageDriverProfessionalism =
		professionalismRatings.length > 0
			? professionalismRatings.reduce((sum: number, f: SubcontractorFeedback) => sum + (f.driverProfessionalism ?? 0), 0) /
			  professionalismRatings.length
			: null;

	const communicationRatings = feedbacks.filter((f: SubcontractorFeedback) => f.communication !== null);
	const averageCommunication =
		communicationRatings.length > 0
			? communicationRatings.reduce((sum: number, f: SubcontractorFeedback) => sum + (f.communication ?? 0), 0) /
			  communicationRatings.length
			: null;

	// Calculate reliability score (0-100)
	// Weighted: 40% success rate, 40% average rating, 20% number of missions (capped at 20)
	const missionBonus = Math.min(totalMissions, 20) * 1; // Up to 20 points
	const ratingScore = (averageRating / 5) * 40; // Up to 40 points
	const successScore = (successRate / 100) * 40; // Up to 40 points
	const reliabilityScore = Math.round(missionBonus + ratingScore + successScore);

	// Get recent missions
	const recentMissions: RecentMission[] = missions.slice(0, RECENT_MISSIONS_LIMIT).map((m) => {
		const feedback = feedbackMap.get(m.id);
		return {
			id: m.id,
			pickupAt: m.pickupAt?.toISOString() ?? "",
			pickupAddress: m.pickupAddress ?? "",
			dropoffAddress: m.dropoffAddress ?? "",
			status: m.status,
			subcontractedPrice: m.subcontractedPrice ? Number(m.subcontractedPrice) : 0,
			hasFeedback: !!feedback,
			rating: feedback?.rating ?? null,
		};
	});

	return {
		subcontractorId,
		companyName: subcontractor.companyName,
		totalMissions,
		completedMissions,
		successRate: Math.round(successRate * 10) / 10,
		averageRating: Math.round(averageRating * 10) / 10,
		averagePunctuality: averagePunctuality ? Math.round(averagePunctuality * 10) / 10 : null,
		averageVehicleCondition: averageVehicleCondition
			? Math.round(averageVehicleCondition * 10) / 10
			: null,
		averageDriverProfessionalism: averageDriverProfessionalism
			? Math.round(averageDriverProfessionalism * 10) / 10
			: null,
		averageCommunication: averageCommunication
			? Math.round(averageCommunication * 10) / 10
			: null,
		reliabilityScore,
		recentMissions,
	};
}

/**
 * Record feedback for a subcontracted mission
 */
export async function recordSubcontractorFeedback(
	subcontractorId: string,
	organizationId: string,
	userId: string,
	input: SubcontractorFeedbackInput,
	db: PrismaClient
): Promise<SubcontractorFeedbackRecord> {
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

	// Verify quote exists and is subcontracted to this subcontractor
	const quote = await db.quote.findFirst({
		where: {
			id: input.quoteId,
			organizationId,
			subcontractorId,
			isSubcontracted: true,
		},
	});

	if (!quote) {
		throw new Error(`Quote not found or not subcontracted to this subcontractor: ${input.quoteId}`);
	}

	// Check if feedback already exists
	const existingFeedback = await db.subcontractorFeedback.findFirst({
		where: {
			quoteId: input.quoteId,
			subcontractorProfileId: subcontractorId,
		},
	});

	if (existingFeedback) {
		// Update existing feedback
		const updated = await db.subcontractorFeedback.update({
			where: { id: existingFeedback.id },
			data: {
				rating: input.rating,
				punctuality: input.punctuality,
				vehicleCondition: input.vehicleCondition,
				driverProfessionalism: input.driverProfessionalism,
				communication: input.communication,
				comments: input.comments,
			},
		});

		return {
			id: updated.id,
			quoteId: updated.quoteId,
			rating: updated.rating,
			punctuality: updated.punctuality,
			vehicleCondition: updated.vehicleCondition,
			driverProfessionalism: updated.driverProfessionalism,
			communication: updated.communication,
			comments: updated.comments,
			createdAt: updated.createdAt.toISOString(),
			createdBy: updated.createdBy,
		};
	}

	// Create new feedback
	const feedback = await db.subcontractorFeedback.create({
		data: {
			organizationId,
			subcontractorProfileId: subcontractorId,
			quoteId: input.quoteId,
			rating: input.rating,
			punctuality: input.punctuality,
			vehicleCondition: input.vehicleCondition,
			driverProfessionalism: input.driverProfessionalism,
			communication: input.communication,
			comments: input.comments,
			createdBy: userId,
		},
	});

	return {
		id: feedback.id,
		quoteId: feedback.quoteId,
		rating: feedback.rating,
		punctuality: feedback.punctuality,
		vehicleCondition: feedback.vehicleCondition,
		driverProfessionalism: feedback.driverProfessionalism,
		communication: feedback.communication,
		comments: feedback.comments,
		createdAt: feedback.createdAt.toISOString(),
		createdBy: feedback.createdBy,
	};
}

/**
 * Get feedback for a specific mission
 */
export async function getMissionFeedback(
	quoteId: string,
	organizationId: string,
	db: PrismaClient
): Promise<SubcontractorFeedbackRecord | null> {
	const feedback = await db.subcontractorFeedback.findFirst({
		where: {
			quoteId,
			organizationId,
		},
	});

	if (!feedback) {
		return null;
	}

	return {
		id: feedback.id,
		quoteId: feedback.quoteId,
		rating: feedback.rating,
		punctuality: feedback.punctuality,
		vehicleCondition: feedback.vehicleCondition,
		driverProfessionalism: feedback.driverProfessionalism,
		communication: feedback.communication,
		comments: feedback.comments,
		createdAt: feedback.createdAt.toISOString(),
		createdBy: feedback.createdBy,
	};
}

// ============================================================================
// Availability Management Functions
// ============================================================================

/**
 * Update subcontractor availability status
 */
export async function updateSubcontractorAvailability(
	subcontractorId: string,
	organizationId: string,
	input: AvailabilityUpdateInput,
	db: PrismaClient
): Promise<{ id: string; availabilityStatus: SubcontractorAvailability; availabilityNotes: string | null }> {
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

	// Update availability
	const updated = await db.subcontractorProfile.update({
		where: { id: subcontractorId },
		data: {
			availabilityStatus: input.status,
			availabilityNotes: input.notes ?? null,
		},
	});

	return {
		id: updated.id,
		availabilityStatus: updated.availabilityStatus,
		availabilityNotes: updated.availabilityNotes,
	};
}

// ============================================================================
// Matching Algorithm Functions
// ============================================================================

/**
 * Calculate match score for a subcontractor
 */
export function calculateMatchScore(
	subcontractor: {
		id: string;
		availabilityStatus: SubcontractorAvailability;
		vehicleCategories: { vehicleCategoryId: string }[];
		zoneMatch: { pickup: boolean; dropoff: boolean };
	},
	vehicleCategoryId: string,
	performanceRating: number // 0-5
): SubcontractorMatchScore {
	// Zone match: 20 points for pickup, 20 points for dropoff
	const zoneMatch =
		(subcontractor.zoneMatch.pickup ? 20 : 0) + (subcontractor.zoneMatch.dropoff ? 20 : 0);

	// Vehicle match: 30 points if category matches or no restriction
	const vehicleMatch =
		subcontractor.vehicleCategories.length === 0 ||
		subcontractor.vehicleCategories.some((vc) => vc.vehicleCategoryId === vehicleCategoryId)
			? VEHICLE_MATCH_WEIGHT
			: 0;

	// Availability: 20 for AVAILABLE, 10 for BUSY, 0 for OFFLINE
	let availability = 0;
	if (subcontractor.availabilityStatus === "AVAILABLE") {
		availability = AVAILABILITY_WEIGHT;
	} else if (subcontractor.availabilityStatus === "BUSY") {
		availability = AVAILABILITY_WEIGHT / 2;
	}

	// Performance: 0-10 based on rating (0-5)
	const performance = Math.round((performanceRating / 5) * PERFORMANCE_WEIGHT);

	return {
		subcontractorId: subcontractor.id,
		totalScore: zoneMatch + vehicleMatch + availability + performance,
		breakdown: {
			zoneMatch,
			vehicleMatch,
			availability,
			performance,
		},
	};
}

/**
 * Get subcontractors with match scores for a mission
 */
export async function getSubcontractorsWithMatchScores(
	organizationId: string,
	pickupLat: number | null,
	pickupLng: number | null,
	dropoffLat: number | null,
	dropoffLng: number | null,
	vehicleCategoryId: string,
	db: PrismaClient
): Promise<
	Array<{
		subcontractor: {
			id: string;
			companyName: string;
			contactName: string | null;
			email: string | null;
			phone: string | null;
			availabilityStatus: SubcontractorAvailability;
			ratePerKm: number | null;
			ratePerHour: number | null;
			minimumFare: number | null;
		};
		matchScore: SubcontractorMatchScore;
		performanceMetrics: {
			averageRating: number;
			totalMissions: number;
			reliabilityScore: number;
		};
	}>
> {
	// Import the findSubcontractorsForMission function
	const { findSubcontractorsForMission } = await import("./subcontractor-service");

	// Get matching subcontractors
	const subcontractors = await findSubcontractorsForMission(
		organizationId,
		pickupLat,
		pickupLng,
		dropoffLat,
		dropoffLng,
		vehicleCategoryId,
		db
	);

	// Get performance metrics for each subcontractor
	const results = await Promise.all(
		subcontractors.map(async (sub) => {
			// Get performance metrics
			let performanceMetrics = {
				averageRating: 0,
				totalMissions: 0,
				reliabilityScore: 0,
			};

			try {
				const metrics = await getSubcontractorPerformance(sub.id, organizationId, db);
				performanceMetrics = {
					averageRating: metrics.averageRating,
					totalMissions: metrics.totalMissions,
					reliabilityScore: metrics.reliabilityScore,
				};
			} catch {
				// Ignore errors, use default metrics
			}

			// Get full subcontractor data for availability status
			const fullSub = await db.subcontractorProfile.findFirst({
				where: { id: sub.id },
				include: {
					vehicleCategories: true,
				},
			});

			const matchScore = calculateMatchScore(
				{
					id: sub.id,
					availabilityStatus: fullSub?.availabilityStatus ?? "AVAILABLE",
					vehicleCategories: fullSub?.vehicleCategories ?? [],
					zoneMatch: sub.zoneMatch,
				},
				vehicleCategoryId,
				performanceMetrics.averageRating
			);

			return {
				subcontractor: {
					id: sub.id,
					companyName: sub.companyName,
					contactName: sub.contactName,
					email: sub.email,
					phone: sub.phone,
					availabilityStatus: fullSub?.availabilityStatus ?? "AVAILABLE",
					ratePerKm: sub.ratePerKm,
					ratePerHour: sub.ratePerHour,
					minimumFare: sub.minimumFare,
				},
				matchScore,
				performanceMetrics,
			};
		})
	);

	// Sort by total score descending
	results.sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);

	return results;
}
