/**
 * Driver Availability Service
 * Story 17.7: Driver Availability Overlap Detection
 *
 * Checks driver availability based on:
 * 1. Existing missions (quotes with status ACCEPTED/CONFIRMED/IN_PROGRESS, pickupAt/estimatedEndAt)
 * 2. Calendar events (DriverCalendarEvent startAt/endAt)
 *
 * Related FRs:
 * - FR69: Dispatch and vehicle selection modules shall exclude drivers whose existing
 *   missions or calendar events overlap with the proposed mission window.
 */

import type { PrismaClient } from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

/**
 * Mission window defined by start and end times
 */
export interface MissionWindow {
	start: Date;
	end: Date;
}

/**
 * Reason why a driver is unavailable
 */
export type UnavailabilityReason = "MISSION_OVERLAP" | "CALENDAR_EVENT";

/**
 * Details about the conflict causing unavailability
 */
export interface ConflictDetails {
	type: "mission" | "calendar";
	startAt: Date;
	endAt: Date;
	description?: string; // Mission ID or event title/type
}

/**
 * Information about an unavailable driver
 */
export interface UnavailableDriver {
	driverId: string;
	reason: UnavailabilityReason;
	conflictDetails: ConflictDetails;
}

/**
 * Result of driver availability check
 */
export interface DriverAvailabilityResult {
	availableDriverIds: string[];
	unavailableDrivers: UnavailableDriver[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default mission duration in minutes when estimatedEndAt is null
 */
export const DEFAULT_MISSION_DURATION_MINUTES = 120; // 2 hours

/**
 * Quote statuses that indicate an active/scheduled mission
 */
export const ACTIVE_MISSION_STATUSES = [
	"ACCEPTED",
	"CONFIRMED",
	"IN_PROGRESS",
] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if two time ranges overlap
 * Returns true if there is ANY intersection
 *
 * Overlap exists when: range1.start < range2.end AND range1.end > range2.start
 */
export function timeRangesOverlap(
	range1: { start: Date; end: Date },
	range2: { start: Date; end: Date },
): boolean {
	return range1.start < range2.end && range1.end > range2.start;
}

/**
 * Get mission window from pickupAt and estimatedEndAt
 * Uses default duration if estimatedEndAt is null
 */
export function getMissionWindow(
	pickupAt: Date,
	estimatedEndAt: Date | null,
): MissionWindow {
	if (estimatedEndAt) {
		return { start: pickupAt, end: estimatedEndAt };
	}

	// Fallback: use default duration
	console.warn(
		`[driver-availability] estimatedEndAt is null, using default ${DEFAULT_MISSION_DURATION_MINUTES}-minute duration`,
	);
	const end = new Date(pickupAt);
	end.setMinutes(end.getMinutes() + DEFAULT_MISSION_DURATION_MINUTES);
	return { start: pickupAt, end };
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Find drivers with overlapping missions
 */
async function findDriversWithOverlappingMissions(
	db: PrismaClient,
	organizationId: string,
	driverIds: string[],
	missionWindow: MissionWindow,
	excludeQuoteId?: string,
): Promise<
	Array<{
		driverId: string;
		quoteId: string;
		pickupAt: Date;
		estimatedEndAt: Date | null;
	}>
> {
	if (driverIds.length === 0) {
		return [];
	}

	// Query for quotes with overlapping time windows
	// Overlap condition: existing.pickupAt < proposed.end AND existing.estimatedEndAt > proposed.start
	const overlappingQuotes = await db.quote.findMany({
		where: {
			organizationId,
			// Check both driverId and assignedDriverId
			OR: [
				{ driverId: { in: driverIds } },
				{ assignedDriverId: { in: driverIds } },
			],
			status: { in: [...ACTIVE_MISSION_STATUSES] },
			pickupAt: { lt: missionWindow.end },
			estimatedEndAt: { gt: missionWindow.start },
			// Exclude the current quote if provided (for updates)
			...(excludeQuoteId ? { id: { not: excludeQuoteId } } : {}),
		},
		select: {
			id: true,
			driverId: true,
			assignedDriverId: true,
			pickupAt: true,
			estimatedEndAt: true,
		},
	});

	// Map to driver IDs (use assignedDriverId if available, otherwise driverId)
	return overlappingQuotes.map((quote) => ({
		driverId: (quote.assignedDriverId || quote.driverId) as string,
		quoteId: quote.id,
		pickupAt: quote.pickupAt,
		estimatedEndAt: quote.estimatedEndAt,
	}));
}

/**
 * Find drivers with overlapping calendar events
 */
async function findDriversWithOverlappingCalendarEvents(
	db: PrismaClient,
	organizationId: string,
	driverIds: string[],
	missionWindow: MissionWindow,
): Promise<
	Array<{
		driverId: string;
		eventType: string;
		title: string | null;
		startAt: Date;
		endAt: Date;
	}>
> {
	if (driverIds.length === 0) {
		return [];
	}

	// Query for calendar events with overlapping time windows
	const overlappingEvents = await db.driverCalendarEvent.findMany({
		where: {
			organizationId,
			driverId: { in: driverIds },
			startAt: { lt: missionWindow.end },
			endAt: { gt: missionWindow.start },
		},
		select: {
			driverId: true,
			eventType: true,
			title: true,
			startAt: true,
			endAt: true,
		},
	});

	return overlappingEvents;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Check driver availability for a proposed mission window
 *
 * @param db - Prisma client
 * @param organizationId - Organization ID for multi-tenancy
 * @param driverIds - List of driver IDs to check
 * @param missionWindow - Proposed mission time window
 * @param excludeQuoteId - Optional quote ID to exclude (for updates)
 * @returns Availability result with available and unavailable drivers
 */
export async function checkDriverAvailability(
	db: PrismaClient,
	organizationId: string,
	driverIds: string[],
	missionWindow: MissionWindow,
	excludeQuoteId?: string,
): Promise<DriverAvailabilityResult> {
	if (driverIds.length === 0) {
		return {
			availableDriverIds: [],
			unavailableDrivers: [],
		};
	}

	// Check for overlapping missions and calendar events in parallel
	const [overlappingMissions, overlappingEvents] = await Promise.all([
		findDriversWithOverlappingMissions(
			db,
			organizationId,
			driverIds,
			missionWindow,
			excludeQuoteId,
		),
		findDriversWithOverlappingCalendarEvents(
			db,
			organizationId,
			driverIds,
			missionWindow,
		),
	]);

	// Build map of unavailable drivers with their reasons
	const unavailableMap = new Map<string, UnavailableDriver>();

	// Process mission overlaps
	for (const mission of overlappingMissions) {
		if (!unavailableMap.has(mission.driverId)) {
			unavailableMap.set(mission.driverId, {
				driverId: mission.driverId,
				reason: "MISSION_OVERLAP",
				conflictDetails: {
					type: "mission",
					startAt: mission.pickupAt,
					endAt: mission.estimatedEndAt || mission.pickupAt,
					description: `Quote ${mission.quoteId}`,
				},
			});
		}
	}

	// Process calendar event overlaps
	for (const event of overlappingEvents) {
		if (!unavailableMap.has(event.driverId)) {
			unavailableMap.set(event.driverId, {
				driverId: event.driverId,
				reason: "CALENDAR_EVENT",
				conflictDetails: {
					type: "calendar",
					startAt: event.startAt,
					endAt: event.endAt,
					description: event.title || event.eventType,
				},
			});
		}
	}

	// Separate available and unavailable drivers
	const unavailableDrivers = Array.from(unavailableMap.values());
	const unavailableDriverIds = new Set(unavailableMap.keys());
	const availableDriverIds = driverIds.filter(
		(id) => !unavailableDriverIds.has(id),
	);

	return {
		availableDriverIds,
		unavailableDrivers,
	};
}

/**
 * Get IDs of unavailable drivers for a mission window
 * Simplified version that just returns driver IDs
 */
export async function getUnavailableDriverIds(
	db: PrismaClient,
	organizationId: string,
	driverIds: string[],
	missionWindow: MissionWindow,
	excludeQuoteId?: string,
): Promise<string[]> {
	const result = await checkDriverAvailability(
		db,
		organizationId,
		driverIds,
		missionWindow,
		excludeQuoteId,
	);
	return result.unavailableDrivers.map((d) => d.driverId);
}

/**
 * Check if a specific driver is available for a mission window
 */
export async function isDriverAvailable(
	db: PrismaClient,
	organizationId: string,
	driverId: string,
	missionWindow: MissionWindow,
	excludeQuoteId?: string,
): Promise<boolean> {
	const result = await checkDriverAvailability(
		db,
		organizationId,
		[driverId],
		missionWindow,
		excludeQuoteId,
	);
	return result.availableDriverIds.includes(driverId);
}
