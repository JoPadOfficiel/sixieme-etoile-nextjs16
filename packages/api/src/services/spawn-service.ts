import { db } from "@repo/database";
import type { Mission, Prisma, TripType } from "@prisma/client";

/**
 * Story 28.4: Spawning Engine - Trigger Logic
 *
 * SpawnService transforms commercial quote lines into operational missions
 * when an Order transitions to CONFIRMED status.
 *
 * Rules:
 * - Only CALCULATED type lines spawn missions
 * - Only TRANSFER and DISPO tripTypes spawn missions (not EXCURSION)
 * - MANUAL and GROUP lines are skipped
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
							where: { type: "CALCULATED" },
							orderBy: { sortOrder: "asc" },
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
		const existingLineIds = new Set(
			existingMissions.map((m) => m.quoteLineId).filter(Boolean)
		);

		// 3. Collect eligible lines that don't already have missions
		const linesToSpawn: Array<{
			quote: (typeof order.quotes)[0];
			line: (typeof order.quotes)[0]["lines"][0];
		}> = [];

		for (const quote of order.quotes) {
			for (const line of quote.lines) {
				// Skip if mission already exists for this line (partial recovery)
				if (existingLineIds.has(line.id)) {
					console.log(
						`[SPAWN] Skipping line ${line.id}: Mission already exists`
					);
					continue;
				}
				linesToSpawn.push({ quote, line });
			}
		}

		if (linesToSpawn.length === 0) {
			if (existingMissions.length > 0) {
				console.log(
					`[SPAWN] Order ${orderId}: All eligible lines already have missions (${existingMissions.length})`
				);
			} else {
				console.log(`[SPAWN] Order ${orderId}: No eligible lines to spawn`);
			}
			return [];
		}

		// 4. Build mission create data
		const missionCreateData: Prisma.MissionCreateManyInput[] = linesToSpawn.map(
			({ quote, line }) => ({
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
					lineTotalPrice: Number(line.totalPrice),
					// Trip info
					tripType: quote.tripType,
					pricingMode: quote.pricingMode,
					isRoundTrip: quote.isRoundTrip,
				},
			})
		);

		// 5. Create missions in transaction using createMany with skipDuplicates
		// This prevents race condition duplicates if quoteLineId has unique constraint
		await db.$transaction(async (tx) => {
			await tx.mission.createMany({
				data: missionCreateData,
				skipDuplicates: true, // Prevent duplicates on race condition
			});
		});

		// 6. Fetch created missions to return (only new ones)
		const newLineIds = linesToSpawn.map(({ line }) => line.id);
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
}
