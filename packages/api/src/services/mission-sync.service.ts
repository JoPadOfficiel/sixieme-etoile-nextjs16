/**
 * Story 27.2: Mission Synchronization Service
 *
 * This service bridges the Commercial Domain (Quotes, QuoteLines) and the Operational Domain (Missions).
 * It automatically synchronizes QuoteLines to Mission records for dispatch purposes.
 *
 * Key responsibilities:
 * - Create missions for new CALCULATED/GROUP quote lines
 * - Update mission timing when quote pickupAt/estimatedEndAt changes
 * - Delete orphan missions (unassigned only) when quote lines are removed
 * - Preserve operational data (driverId, vehicleId, status) during updates
 */

import type {
	MissionStatus,
	Prisma,
	PrismaClient,
	QuoteLineType,
} from "@prisma/client";
import { db } from "@repo/database";

/**
 * Result of a mission sync operation
 */
export interface SyncResult {
	quoteId: string;
	created: number;
	updated: number;
	deleted: number;
	preserved: number;
	detached: number;
	errors: SyncError[];
}

/**
 * Error during sync operation
 */
export interface SyncError {
	type: "DELETION_BLOCKED" | "UPDATE_FAILED" | "CREATE_FAILED";
	quoteLineId?: string;
	missionId?: string;
	message: string;
}

/**
 * Types of quote lines that should generate missions
 * - CALCULATED: GPS-based trips with full route data
 * - GROUP: Container lines that may have time-bound children
 */
const MISSION_ELIGIBLE_TYPES: QuoteLineType[] = ["CALCULATED", "GROUP"];

/**
 * Mission statuses that are protected from deletion
 * Once a mission is assigned or in progress, it cannot be auto-deleted
 */
const PROTECTED_STATUSES: MissionStatus[] = [
	"ASSIGNED",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
];

/**
 * Mission statuses that allow deletion (only unassigned pending missions)
 */
const DELETABLE_STATUSES: MissionStatus[] = ["PENDING"];

/**
 * Service class for synchronizing Quote Lines to Missions
 */
export class MissionSyncService {
	private prisma: PrismaClient;

	constructor(prisma?: PrismaClient) {
		this.prisma = prisma || (db as PrismaClient);
	}

	/**
	 * Synchronize missions for a given quote.
	 * Implements upsert pattern: create/update/delete as needed.
	 *
	 * @param quoteId - The ID of the quote to sync
	 * @returns SyncResult with counts of created/updated/deleted/preserved missions
	 */
	async syncQuoteMissions(quoteId: string): Promise<SyncResult> {
		const result: SyncResult = {
			quoteId,
			created: 0,
			updated: 0,
			deleted: 0,
			preserved: 0,
			detached: 0,
			errors: [],
		};

		console.log(`[MissionSync] Starting sync for quote ${quoteId}`);

		// Use a transaction to ensure data consistency
		await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// Step 1: Fetch Quote with all QuoteLines and existing Missions
			const quote = await tx.quote.findUnique({
				where: { id: quoteId },
				include: {
					lines: true,
					missions: true,
				},
			});

			if (!quote) {
				console.warn(`[MissionSync] Quote ${quoteId} not found`);
				result.errors.push({
					type: "UPDATE_FAILED",
					message: `Quote ${quoteId} not found`,
				});
				return;
			}

			console.log(
				`[MissionSync] Quote ${quoteId}: ${quote.lines.length} lines, ${quote.missions.length} existing missions`,
			);

			// Step 2: Identify eligible quote lines (CALCULATED or GROUP with timing)
			const eligibleLines = quote.lines.filter((line) =>
				this.isLineEligibleForMission(line),
			);

			// Step 3: Build a map of existing missions by quoteLineId
			const existingMissionsByLineId = new Map<
				string,
				(typeof quote.missions)[0]
			>();
			const orphanMissions: typeof quote.missions = [];

			for (const mission of quote.missions) {
				if (mission.quoteLineId) {
					existingMissionsByLineId.set(mission.quoteLineId, mission);
				} else {
					// Missions without quoteLineId are already detached
					orphanMissions.push(mission);
				}
			}

			// Step 4: Process each eligible line - Create or Update
			for (const line of eligibleLines) {
				const existingMission = existingMissionsByLineId.get(line.id);

				if (existingMission) {
					// Update existing mission
					const updateNeeded = this.isMissionUpdateNeeded(
						existingMission,
						quote,
						line,
					);

					if (updateNeeded) {
						try {
							await tx.mission.update({
								where: { id: existingMission.id },
								data: {
									startAt: this.extractStartTime(quote, line),
									endAt: quote.estimatedEndAt || undefined,
									sourceData: line.sourceData || undefined,
									// Note: driverId, vehicleId, status are NOT updated
								},
							});
							result.updated++;
							console.log(
								`[MissionSync] Updated mission ${existingMission.id} for line ${line.id}`,
							);
						} catch (error) {
							result.errors.push({
								type: "UPDATE_FAILED",
								missionId: existingMission.id,
								quoteLineId: line.id,
								message: `Failed to update mission: ${error instanceof Error ? error.message : String(error)}`,
							});
						}
					}

					// Remove from map to track orphans later
					existingMissionsByLineId.delete(line.id);
				} else {
					// Create new mission
					try {
						await tx.mission.create({
							data: {
								organizationId: quote.organizationId,
								quoteId: quote.id,
								quoteLineId: line.id,
								startAt: this.extractStartTime(quote, line),
								endAt: quote.estimatedEndAt || undefined,
								sourceData: line.sourceData || undefined,
								status: "PENDING",
								// driverId and vehicleId are null (unassigned)
							},
						});
						result.created++;
						console.log(`[MissionSync] Created mission for line ${line.id}`);
					} catch (error) {
						result.errors.push({
							type: "CREATE_FAILED",
							quoteLineId: line.id,
							message: `Failed to create mission: ${error instanceof Error ? error.message : String(error)}`,
						});
					}
				}
			}

			// Step 5: Handle orphan missions (existing missions with no matching line)
			// Add remaining missions in the map (not matched with eligible lines)
			for (const [lineId, mission] of Array.from(existingMissionsByLineId)) {
				orphanMissions.push(mission);
			}

			for (const mission of orphanMissions) {
				if (this.canDeleteMission(mission.status)) {
					// Delete unassigned pending missions
					try {
						await tx.mission.delete({
							where: { id: mission.id },
						});
						result.deleted++;
						console.log(`[MissionSync] Deleted orphan mission ${mission.id}`);
					} catch (error) {
						result.errors.push({
							type: "DELETION_BLOCKED",
							missionId: mission.id,
							message: `Failed to delete mission: ${error instanceof Error ? error.message : String(error)}`,
						});
					}
				} else {
					// Detach the mission (set quoteLineId to null) but preserve it
					if (mission.quoteLineId) {
						try {
							await tx.mission.update({
								where: { id: mission.id },
								data: { quoteLineId: null },
							});
							result.detached++;
							console.log(
								`[MissionSync] Detached mission ${mission.id} (protected status: ${mission.status})`,
							);
						} catch (error) {
							result.errors.push({
								type: "UPDATE_FAILED",
								missionId: mission.id,
								message: `Failed to detach mission: ${error instanceof Error ? error.message : String(error)}`,
							});
						}
					} else {
						result.preserved++;
					}
				}
			}
		});

		console.log(
			`[MissionSync] Sync complete for quote ${quoteId}: created=${result.created}, updated=${result.updated}, deleted=${result.deleted}, detached=${result.detached}, errors=${result.errors.length}`,
		);

		return result;
	}

	/**
	 * Check if a quote line should generate a mission
	 *
	 * @param line - The quote line to check
	 * @returns true if the line should have a corresponding mission
	 */
	private isLineEligibleForMission(line: {
		type: QuoteLineType;
		sourceData: Prisma.JsonValue | null;
		parentId: string | null;
	}): boolean {
		// Only CALCULATED lines generate missions
		// GROUP lines only generate missions if they have time-bound data in sourceData
		if (!MISSION_ELIGIBLE_TYPES.includes(line.type)) {
			return false;
		}

		// CALCULATED lines always generate missions
		if (line.type === "CALCULATED") {
			return true;
		}

		// GROUP lines only generate missions if they have pickup/timing data
		// This handles cases like "Excursion Package" which has a specific start time
		if (line.type === "GROUP") {
			const sourceData = line.sourceData as Record<string, unknown> | null;
			if (sourceData && (sourceData.pickupAt || sourceData.startAt)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if a mission needs to be updated based on quote/line changes
	 *
	 * @param mission - The existing mission
	 * @param quote - The parent quote
	 * @param line - The associated quote line
	 * @returns true if the mission should be updated
	 */
	private isMissionUpdateNeeded(
		mission: {
			startAt: Date;
			endAt: Date | null;
			sourceData: Prisma.JsonValue | null;
		},
		quote: { pickupAt: Date; estimatedEndAt: Date | null },
		line: { sourceData: Prisma.JsonValue | null },
	): boolean {
		// Check if start time changed
		const expectedStartAt = this.extractStartTime(quote, line);
		if (mission.startAt.getTime() !== expectedStartAt.getTime()) {
			return true;
		}

		// Check if end time changed
		const expectedEndAt = quote.estimatedEndAt;
		if (expectedEndAt && mission.endAt?.getTime() !== expectedEndAt.getTime()) {
			return true;
		}
		if (!expectedEndAt && mission.endAt) {
			return true;
		}

		// Check if sourceData changed (deep comparison)
		const missionSourceData = JSON.stringify(mission.sourceData);
		const lineSourceData = JSON.stringify(line.sourceData);
		if (missionSourceData !== lineSourceData) {
			return true;
		}

		return false;
	}

	/**
	 * Extract the start time for a mission from quote and line data
	 *
	 * @param quote - The parent quote
	 * @param line - The quote line (may have specific timing in sourceData)
	 * @returns The start time for the mission
	 */
	private extractStartTime(
		quote: { pickupAt: Date },
		line: { sourceData: Prisma.JsonValue | null },
	): Date {
		// Check if line has specific timing in sourceData
		const sourceData = line.sourceData as Record<string, unknown> | null;
		if (sourceData) {
			// Try to get line-specific timing
			if (sourceData.pickupAt && typeof sourceData.pickupAt === "string") {
				return new Date(sourceData.pickupAt);
			}
			if (sourceData.startAt && typeof sourceData.startAt === "string") {
				return new Date(sourceData.startAt);
			}
		}

		// Fall back to quote pickupAt
		return quote.pickupAt;
	}

	/**
	 * Check if a mission can be deleted based on its status
	 *
	 * @param status - The mission status
	 * @returns true if the mission can be safely deleted
	 */
	private canDeleteMission(status: MissionStatus): boolean {
		return DELETABLE_STATUSES.includes(status);
	}
}

// Export singleton instance for convenience
export const missionSyncService = new MissionSyncService();
