import { db } from "@repo/database";
import type { Mission, Prisma, TripType, QuoteLineType } from "@prisma/client";
import { eachDayOfInterval, startOfDay } from "date-fns";

/**
 * Story 28.4: Spawning Engine - Trigger Logic
 * Story 28.5: Group Spawning Logic (Multi-Day)
 *
 * SpawnService transforms commercial quote lines into operational missions
 * when an Order transitions to CONFIRMED status.
 *
 * Rules:
 * - CALCULATED type lines spawn missions directly
 * - GROUP lines with children: iterate and spawn recursively for CALCULATED children
 * - GROUP lines with date range (no children): spawn 1 mission per day in the interval
 * - Only TRANSFER and DISPO tripTypes spawn missions (not EXCURSION)
 * - MANUAL lines are skipped (no operational link)
 * - All missions created in a single transaction (atomic)
 * - Idempotent: re-confirming doesn't duplicate missions
 * - Supports partial recovery: only creates missions for lines without existing missions
 */

/** TripTypes that should spawn operational missions */
const SPAWNABLE_TRIP_TYPES: TripType[] = ["TRANSFER", "DISPO"];

export class SpawnService {
	/**
	 * Execute spawning for an Order
	 * Creates missions from eligible QuoteLines (type = CALCULATED, tripType = TRANSFER/DISPO)
	 *
	 * @param orderId - The Order ID to spawn missions for
	 * @param organizationId - The Organization ID for tenant scoping (security)
	 * @returns Array of created missions
	 */
	static async execute(
		orderId: string,
		organizationId: string
	): Promise<Mission[]> {
		// 1. Fetch Order with Quotes and QuoteLines (tenant-scoped)
		const order = await db.order.findFirst({
			where: {
				id: orderId,
				organizationId, // Tenant scope for security
			},
			include: {
				quotes: {
					where: {
						tripType: { in: SPAWNABLE_TRIP_TYPES }, // Only TRANSFER and DISPO
					},
					include: {
						lines: {
							where: {
								OR: [
									{ type: "CALCULATED" },
									{ type: "GROUP" },
								],
								parentId: null, // Only top-level lines (not nested children)
								dispatchable: true, // Story 28.6: Only spawn if dispatchable
							},
							orderBy: { sortOrder: "asc" },
							include: {
								children: {
									orderBy: { sortOrder: "asc" },
									include: {
										children: {
											orderBy: { sortOrder: "asc" },
										},
									},
								},
							},
						},
						vehicleCategory: true,
					},
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found or access denied`);
		}

		// 2. Get existing missions for this order to support partial recovery
		const existingMissions = await db.mission.findMany({
			where: { orderId },
			select: { quoteLineId: true },
		});
		const existingLineIds = new Set<string>(
			existingMissions.map((m) => m.quoteLineId).filter((id): id is string => id !== null)
		);

		// 3. Collect eligible lines that don't already have missions
		// Story 28.5: Now handles both CALCULATED and GROUP lines
		const missionCreateData: Prisma.MissionCreateManyInput[] = [];

		for (const quote of order.quotes) {
			for (const line of quote.lines) {
				if (line.type === "CALCULATED") {
					// Skip if mission already exists for this line (partial recovery)
					if (existingLineIds.has(line.id)) {
						console.log(
							`[SPAWN] Skipping CALCULATED line ${line.id}: Mission already exists`
						);
						continue;
					}
					// Build mission data for CALCULATED line
					missionCreateData.push(
						this.buildMissionData(line, quote, order, null)
					);
				} else if (line.type === "GROUP") {
					// Story 28.5: Process GROUP line
					const groupMissions = this.processGroupLine(
						line,
						quote,
						order,
						existingLineIds
					);
					missionCreateData.push(...groupMissions);
				}
				// MANUAL lines are skipped (no operational link)
			}
		}

		if (missionCreateData.length === 0) {
			if (existingMissions.length > 0) {
				console.log(
					`[SPAWN] Order ${orderId}: All eligible lines already have missions (${existingMissions.length})`
				);
			} else {
				console.log(`[SPAWN] Order ${orderId}: No eligible lines to spawn`);
			}
			return [];
		}

			// 4. Create missions in transaction using createMany with skipDuplicates
		// This prevents race condition duplicates if quoteLineId has unique constraint
		await db.$transaction(async (tx) => {
			await tx.mission.createMany({
				data: missionCreateData,
				skipDuplicates: true, // Prevent duplicates on race condition
			});
		});

		// 5. Fetch created missions to return (only new ones)
		const newLineIds = missionCreateData.map((m) => m.quoteLineId).filter(Boolean) as string[];
		const createdMissions = await db.mission.findMany({
			where: {
				orderId,
				quoteLineId: { in: newLineIds },
			},
			orderBy: { createdAt: "asc" },
		});

		console.log(
			`[SPAWN] Order ${orderId}: Created ${createdMissions.length} missions`
		);

		// Log individual mission creation for audit
		for (const mission of createdMissions) {
			console.log(
				`[SPAWN] Mission ${mission.id}: Created from QuoteLine ${mission.quoteLineId}`
			);
		}

		return createdMissions;
	}

	/**
	 * Check if an Order has any spawned missions
	 */
	static async hasMissions(orderId: string): Promise<boolean> {
		const count = await db.mission.count({
			where: { orderId },
		});
		return count > 0;
	}

	/**
	 * Get count of eligible lines for spawning (for preview)
	 * Only counts CALCULATED lines from TRANSFER/DISPO quotes
	 */
	static async getEligibleLineCount(orderId: string): Promise<number> {
		const order = await db.order.findUnique({
			where: { id: orderId },
			include: {
				quotes: {
					where: {
						tripType: { in: SPAWNABLE_TRIP_TYPES },
					},
					include: {
						lines: {
							where: { type: "CALCULATED" },
						},
					},
				},
			},
		});

		if (!order) return 0;

		return order.quotes.reduce((acc, quote) => acc + quote.lines.length, 0);
	}

	/**
	 * Get spawnable trip types (for external reference)
	 */
	static getSpawnableTripTypes(): TripType[] {
		return [...SPAWNABLE_TRIP_TYPES];
	}

	// =========================================================================
	// Story 28.5: GROUP Spawning Logic (Multi-Day)
	// =========================================================================

	/**
	 * Process a GROUP line and return mission create data
	 * Handles both children-based and date-range-based GROUP lines
	 *
	 * @param groupLine - The GROUP QuoteLine to process
	 * @param quote - The parent Quote
	 * @param order - The parent Order
	 * @param existingLineIds - Set of line IDs that already have missions
	 * @returns Array of mission create data
	 */
	private static processGroupLine(
		groupLine: { id: string; type: string; label: string; sourceData: unknown; children?: Array<{ id: string; type: string; label: string; sourceData: unknown; children?: unknown[] }> },
		quote: { id: string; pickupAt: Date | null; estimatedEndAt: Date | null; pickupAddress: string | null; pickupLatitude: unknown; pickupLongitude: unknown; dropoffAddress: string | null; dropoffLatitude: unknown; dropoffLongitude: unknown; passengerCount: number | null; luggageCount: number | null; vehicleCategoryId: string | null; vehicleCategory: { name: string } | null; tripType: string; pricingMode: string | null; isRoundTrip: boolean | null },
		order: { id: string; organizationId: string },
		existingLineIds: Set<string>
	): Prisma.MissionCreateManyInput[] {
		const missions: Prisma.MissionCreateManyInput[] = [];

		// Skip if already processed (idempotence)
		if (existingLineIds.has(groupLine.id)) {
			console.log(
				`[SPAWN] Skipping GROUP line ${groupLine.id}: Missions already exist`
			);
			return missions;
		}

		// Case 1: GROUP with children - recurse
		if (groupLine.children && groupLine.children.length > 0) {
			console.log(
				`[SPAWN] Processing GROUP line ${groupLine.id} with ${groupLine.children.length} children`
			);

			for (const child of groupLine.children) {
				// Skip if child already has mission
				if (existingLineIds.has(child.id)) {
					console.log(
						`[SPAWN] Skipping child line ${child.id}: Mission already exists`
					);
					continue;
				}

				if (child.type === "CALCULATED") {
					// Spawn mission for CALCULATED child, link to GROUP parent
					missions.push(
						this.buildMissionData(child as any, quote, order, groupLine.id)
					);
				} else if (child.type === "GROUP" && child.children) {
					// Recurse for nested GROUP (up to 2 levels)
					const nestedMissions = this.processGroupLine(
						child as any,
						quote,
						order,
						existingLineIds
					);
					missions.push(...nestedMissions);
				}
				// MANUAL children are skipped
			}
			return missions;
		}

		// Case 2: GROUP with date range (no children) - multi-day spawning
		const sourceData = groupLine.sourceData as Record<string, unknown> | null;
		const startDate = sourceData?.startDate as string | undefined;
		const endDate = sourceData?.endDate as string | undefined;

		if (startDate && endDate) {
			try {
				const days = eachDayOfInterval({
					start: new Date(startDate),
					end: new Date(endDate),
				});

				console.log(
					`[SPAWN] GROUP ${groupLine.id}: Spawning ${days.length} missions for date range ${startDate} to ${endDate}`
				);

				days.forEach((day, index) => {
					missions.push({
						organizationId: order.organizationId,
						quoteId: quote.id,
						quoteLineId: groupLine.id,
						orderId: order.id,
						status: "PENDING" as const,
						startAt: startOfDay(day),
						endAt: null, // Duration handled in sourceData
						sourceData: {
							// Location data from quote
							pickupAddress: quote.pickupAddress,
							pickupLatitude: quote.pickupLatitude
								? Number(quote.pickupLatitude)
								: null,
							pickupLongitude: quote.pickupLongitude
								? Number(quote.pickupLongitude)
								: null,
							dropoffAddress: quote.dropoffAddress,
							dropoffLatitude: quote.dropoffLatitude
								? Number(quote.dropoffLatitude)
								: null,
							dropoffLongitude: quote.dropoffLongitude
								? Number(quote.dropoffLongitude)
								: null,
							// Passenger info
							passengerCount: quote.passengerCount,
							luggageCount: quote.luggageCount,
							// Vehicle info
							vehicleCategoryId: quote.vehicleCategoryId,
							vehicleCategoryName: quote.vehicleCategory?.name ?? null,
							// GROUP-specific info (Story 28.5)
							groupLineId: groupLine.id,
							groupLabel: groupLine.label,
							dayIndex: index + 1,
							totalDays: days.length,
							dayDate: day.toISOString(),
							// Trip info
							tripType: quote.tripType,
							pricingMode: quote.pricingMode,
							isRoundTrip: quote.isRoundTrip,
							// Original GROUP sourceData
							lineSourceData: sourceData,
						},
					});
				});
			} catch (error) {
				console.error(
					`[SPAWN] GROUP ${groupLine.id}: Invalid date range - ${error}`
				);
			}
		} else {
			console.log(
				`[SPAWN] GROUP ${groupLine.id}: No children and no date range, skipping`
			);
		}

		return missions;
	}

	/**
	 * Build mission create data from a line
	 *
	 * @param line - The QuoteLine to build mission data from
	 * @param quote - The parent Quote
	 * @param order - The parent Order
	 * @param groupLineId - Optional parent GROUP line ID for traceability
	 * @returns Mission create data
	 */
	private static buildMissionData(
		line: { id: string; label: string; description?: string | null; sourceData: unknown; totalPrice?: unknown },
		quote: { id: string; pickupAt: Date | null; estimatedEndAt: Date | null; pickupAddress: string | null; pickupLatitude: unknown; pickupLongitude: unknown; dropoffAddress: string | null; dropoffLatitude: unknown; dropoffLongitude: unknown; passengerCount: number | null; luggageCount: number | null; vehicleCategoryId: string | null; vehicleCategory: { name: string } | null; tripType: string; pricingMode: string | null; isRoundTrip: boolean | null },
		order: { id: string; organizationId: string },
		groupLineId: string | null
	): Prisma.MissionCreateManyInput {
		return {
			organizationId: order.organizationId,
			quoteId: quote.id,
			quoteLineId: line.id,
			orderId: order.id,
			status: "PENDING" as const,
			startAt: quote.pickupAt,
			endAt: quote.estimatedEndAt ?? null,
			sourceData: {
				// Location data
				pickupAddress: quote.pickupAddress,
				pickupLatitude: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null,
				dropoffAddress: quote.dropoffAddress,
				dropoffLatitude: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null,
				// Passenger info
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				// Vehicle info
				vehicleCategoryId: quote.vehicleCategoryId,
				vehicleCategoryName: quote.vehicleCategory?.name ?? null,
				// Line info
				lineLabel: line.label,
				lineDescription: line.description,
				lineSourceData: line.sourceData,
				lineTotalPrice: line.totalPrice ? Number(line.totalPrice) : null,
				// GROUP parent reference (Story 28.5)
				groupLineId: groupLineId,
				// Trip info
				tripType: quote.tripType,
				pricingMode: quote.pricingMode,
				isRoundTrip: quote.isRoundTrip,
			},
		};
	}
}
