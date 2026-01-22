import type { Mission, Prisma, TripType } from "@prisma/client";
import { db } from "@repo/database";
import { eachDayOfInterval, startOfDay } from "date-fns";

/**
 * Story 28.7: Manual Spawn Parameters
 */
export interface SpawnManualParams {
	quoteLineId: string;
	orderId: string;
	organizationId: string;
	startAt: Date;
	vehicleCategoryId: string;
	notes?: string;
}

/**
 * Story 28.13: Internal Mission Parameters
 */
export interface CreateInternalParams {
	orderId: string;
	organizationId: string;
	label: string;
	startAt: Date;
	vehicleCategoryId?: string;
	notes?: string;
}

/**
 * Story 28.4: Spawning Engine - Trigger Logic
 * Story 28.5: Group Spawning Logic (Multi-Day)
 * Story 29.4: Intelligent Multi-Mission Spawning with Chronological Ordering
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
 * - Story 29.4: Lines are sorted chronologically and refs are generated sequentially
 */

/** TripTypes that should spawn operational missions */
const SPAWNABLE_TRIP_TYPES: TripType[] = ["TRANSFER", "DISPO"];

/**
 * Story 29.4: Interface for line with extracted pickup date for sorting
 */
interface LineWithPickupDate {
	line: {
		id: string;
		type: string;
		label: string;
		description?: string | null;
		sourceData: unknown;
		totalPrice?: unknown;
		dispatchable?: boolean;
		children?: Array<{
			id: string;
			type: string;
			label: string;
			sourceData: unknown;
			dispatchable?: boolean;
			children?: unknown[];
		}>;
	};
	quote: {
		id: string;
		pickupAt: Date | null;
		estimatedEndAt: Date | null;
		pickupAddress: string | null;
		pickupLatitude: unknown;
		pickupLongitude: unknown;
		dropoffAddress: string | null;
		dropoffLatitude: unknown;
		dropoffLongitude: unknown;
		passengerCount: number | null;
		luggageCount: number | null;
		vehicleCategoryId: string | null;
		vehicleCategory: { name: string } | null;
		tripType: string;
		pricingMode: string | null;
		isRoundTrip: boolean | null;
	};
	pickupAt: Date;
	groupLineId: string | null;
}

/**
 * Story 29.4: Extract pickup date from line sourceData or fallback to quote
 */
function extractPickupAt(line: { sourceData: unknown }, quote: { pickupAt: Date | null }): Date {
	const lineSource = line.sourceData as Record<string, unknown> | null;
	if (lineSource?.pickupAt) {
		return new Date(lineSource.pickupAt as string);
	}
	return quote.pickupAt ?? new Date();
}

/**
 * Story 29.4: Generate sequential mission reference
 * Format: {OrderRef}-{paddedIndex} e.g., "ORD-2026-001-01"
 */
function generateMissionRef(orderRef: string, index: number): string {
	const paddedIndex = String(index + 1).padStart(2, "0");
	return `${orderRef}-${paddedIndex}`;
}

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
		organizationId: string,
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
								OR: [{ type: "CALCULATED" }, { type: "GROUP" }],
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
			existingMissions
				.map((m) => m.quoteLineId)
				.filter((id): id is string => id !== null),
		);

		// 3. Story 29.4: Collect all eligible lines with their pickup dates for sorting
		const linesWithDates: LineWithPickupDate[] = [];

		for (const quote of order.quotes) {
			for (const line of quote.lines) {
				if (line.type === "CALCULATED") {
					// Skip if mission already exists for this line (partial recovery)
					if (existingLineIds.has(line.id)) {
						console.log(
							`[SPAWN] Skipping CALCULATED line ${line.id}: Mission already exists`,
						);
						continue;
					}
					// Collect line with extracted pickup date
					linesWithDates.push({
						line,
						quote,
						pickupAt: extractPickupAt(line, quote),
						groupLineId: null,
					});
				} else if (line.type === "GROUP") {
					// Story 28.5: Process GROUP line - collect children with dates
					const groupLines = this.collectGroupLines(
						line,
						quote,
						existingLineIds,
					);
					linesWithDates.push(...groupLines);
				}
				// MANUAL lines are skipped (no operational link)
			}
		}

		if (linesWithDates.length === 0) {
			if (existingMissions.length > 0) {
				console.log(
					`[SPAWN] Order ${orderId}: All eligible lines already have missions (${existingMissions.length})`,
				);
			} else {
				console.log(`[SPAWN] Order ${orderId}: No eligible lines to spawn`);
			}
			return [];
		}

		// 4. Story 29.4: Sort lines chronologically by pickup date
		const sortedLines = [...linesWithDates].sort(
			(a, b) => a.pickupAt.getTime() - b.pickupAt.getTime(),
		);

		console.log(
			`[SPAWN] Order ${orderId}: Sorted ${sortedLines.length} lines chronologically`,
		);

		// 5. Story 29.4: Build mission data with sequential refs
		const totalMissions = sortedLines.length;
		const missionCreateData: Prisma.MissionCreateManyInput[] = sortedLines.map(
			(item, index) => {
				const ref = generateMissionRef(order.reference, index);
				return this.buildMissionDataWithRef(
					item.line,
					item.quote,
					order,
					item.groupLineId,
					ref,
					index + 1, // 1-based sequence index
					totalMissions,
				);
			},
		);

		// 6. Create missions in transaction using createMany with skipDuplicates
		// This prevents race condition duplicates if quoteLineId has unique constraint
		await db.$transaction(async (tx) => {
			await tx.mission.createMany({
				data: missionCreateData,
				skipDuplicates: true, // Prevent duplicates on race condition
			});
		});

		// 7. Fetch created missions to return (only new ones), ordered by startAt (chronological)
		const newLineIds = missionCreateData
			.map((m) => m.quoteLineId)
			.filter(Boolean) as string[];
		const createdMissions = await db.mission.findMany({
			where: {
				orderId,
				quoteLineId: { in: newLineIds },
			},
			orderBy: { startAt: "asc" }, // Chronological order matches ref sequence
		});

		console.log(
			`[SPAWN] Order ${orderId}: Created ${createdMissions.length} missions with sequential refs`,
		);

		// Log individual mission creation for audit
		for (const mission of createdMissions) {
			// Note: mission.ref will be available after Prisma client regeneration
			const missionRef = (mission as { ref?: string }).ref ?? mission.id;
			console.log(
				`[SPAWN] Mission ${missionRef}: Created from QuoteLine ${mission.quoteLineId}`,
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
	// Story 28.7: Manual Mission Spawning
	// =========================================================================

	/**
	 * Manually spawn a mission from a quote line that wasn't auto-spawned
	 * Used for MANUAL lines or lines with dispatchable=false that need operational handling
	 *
	 * @param params - Manual spawn parameters
	 * @returns Created mission
	 * @throws Error if line already has a mission or doesn't belong to order
	 */
	static async spawnManual(params: SpawnManualParams): Promise<Mission> {
		const {
			quoteLineId,
			orderId,
			organizationId,
			startAt,
			vehicleCategoryId,
			notes,
		} = params;

		// 1. Fetch the quote line with its quote and verify ownership
		const quoteLine = await db.quoteLine.findFirst({
			where: {
				id: quoteLineId,
				quote: {
					organizationId, // Tenant scope
				},
			},
			include: {
				quote: {
					include: {
						vehicleCategory: true,
					},
				},
				missions: {
					select: { id: true },
				},
			},
		});

		if (!quoteLine) {
			throw new Error(`QuoteLine ${quoteLineId} not found or access denied`);
		}

		// 2. Verify the quote belongs to the order
		if (quoteLine.quote.orderId !== orderId) {
			throw new Error(
				`QuoteLine ${quoteLineId} does not belong to Order ${orderId}`,
			);
		}

		// 3. Check if mission already exists for this line
		if (quoteLine.missions.length > 0) {
			throw new Error(
				`QuoteLine ${quoteLineId} already has a mission (${quoteLine.missions[0].id})`,
			);
		}

		// 4. Fetch vehicle category for sourceData (with tenant scoping for security)
		const vehicleCategory = await db.vehicleCategory.findFirst({
			where: { id: vehicleCategoryId, organizationId },
			select: { id: true, name: true },
		});

		if (!vehicleCategory) {
			throw new Error(
				`VehicleCategory ${vehicleCategoryId} not found or access denied`,
			);
		}

		// 5. Create the mission
		const mission = await db.mission.create({
			data: {
				organizationId,
				quoteId: quoteLine.quoteId,
				quoteLineId,
				orderId,
				status: "PENDING",
				startAt,
				endAt: null,
				notes: notes ?? null,
				sourceData: {
					// Location data from quote
					pickupAddress: quoteLine.quote.pickupAddress,
					pickupLatitude: quoteLine.quote.pickupLatitude
						? Number(quoteLine.quote.pickupLatitude)
						: null,
					pickupLongitude: quoteLine.quote.pickupLongitude
						? Number(quoteLine.quote.pickupLongitude)
						: null,
					dropoffAddress: quoteLine.quote.dropoffAddress,
					dropoffLatitude: quoteLine.quote.dropoffLatitude
						? Number(quoteLine.quote.dropoffLatitude)
						: null,
					dropoffLongitude: quoteLine.quote.dropoffLongitude
						? Number(quoteLine.quote.dropoffLongitude)
						: null,
					// Passenger info
					passengerCount: quoteLine.quote.passengerCount,
					luggageCount: quoteLine.quote.luggageCount,
					// Vehicle info (from params, not quote)
					vehicleCategoryId: vehicleCategory.id,
					vehicleCategoryName: vehicleCategory.name,
					// Line info
					lineLabel: quoteLine.label,
					lineDescription: quoteLine.description,
					lineType: quoteLine.type,
					lineTotalPrice: quoteLine.totalPrice
						? Number(quoteLine.totalPrice)
						: null,
					// Trip info
					tripType: quoteLine.quote.tripType,
					pricingMode: quoteLine.quote.pricingMode,
					isRoundTrip: quoteLine.quote.isRoundTrip,
					// Manual spawn marker
					manuallySpawned: true,
					spawnedAt: new Date().toISOString(),
				},
			},
		});

		console.log(
			`[SPAWN-MANUAL] Mission ${mission.id}: Created from QuoteLine ${quoteLineId} (Order: ${orderId})`,
		);

		return mission;
	}

	// =========================================================================
	// Story 29.4: Collect GROUP Lines with Pickup Dates for Sorting
	// =========================================================================

	/**
	 * Collect lines from a GROUP for chronological sorting
	 * Returns LineWithPickupDate array instead of mission data
	 *
	 * @param groupLine - The GROUP QuoteLine to process
	 * @param quote - The parent Quote
	 * @param existingLineIds - Set of line IDs that already have missions
	 * @returns Array of lines with extracted pickup dates
	 */
	private static collectGroupLines(
		groupLine: {
			id: string;
			type: string;
			label: string;
			sourceData: unknown;
			dispatchable?: boolean;
			children?: Array<{
				id: string;
				type: string;
				label: string;
				sourceData: unknown;
				dispatchable?: boolean;
				children?: unknown[];
			}>;
		},
		quote: {
			id: string;
			pickupAt: Date | null;
			estimatedEndAt: Date | null;
			pickupAddress: string | null;
			pickupLatitude: unknown;
			pickupLongitude: unknown;
			dropoffAddress: string | null;
			dropoffLatitude: unknown;
			dropoffLongitude: unknown;
			passengerCount: number | null;
			luggageCount: number | null;
			vehicleCategoryId: string | null;
			vehicleCategory: { name: string } | null;
			tripType: string;
			pricingMode: string | null;
			isRoundTrip: boolean | null;
		},
		existingLineIds: Set<string>,
	): LineWithPickupDate[] {
		const lines: LineWithPickupDate[] = [];

		// Skip if already processed (idempotence)
		if (existingLineIds.has(groupLine.id)) {
			console.log(
				`[SPAWN] Skipping GROUP line ${groupLine.id}: Missions already exist`,
			);
			return lines;
		}

		// Case 1: GROUP with children - collect each child
		if (groupLine.children && groupLine.children.length > 0) {
			console.log(
				`[SPAWN] Collecting GROUP line ${groupLine.id} with ${groupLine.children.length} children`,
			);

			for (const child of groupLine.children) {
				// Skip if child already has mission
				if (existingLineIds.has(child.id)) {
					console.log(
						`[SPAWN] Skipping child line ${child.id}: Mission already exists`,
					);
					continue;
				}

				// Story 28.6: Skip if child is not dispatchable
				if (child.dispatchable === false) {
					console.log(
						`[SPAWN] Skipping child line ${child.id}: dispatchable=false`,
					);
					continue;
				}

				if (child.type === "CALCULATED") {
					// Collect CALCULATED child with extracted pickup date
					lines.push({
						line: child as LineWithPickupDate["line"],
						quote,
						pickupAt: extractPickupAt(child, quote),
						groupLineId: groupLine.id,
					});
				} else if (child.type === "GROUP" && child.children) {
					// Recurse for nested GROUP (up to 2 levels)
					const nestedLines = this.collectGroupLines(
						child as typeof groupLine,
						quote,
						existingLineIds,
					);
					lines.push(...nestedLines);
				}
				// MANUAL children are skipped
			}
			return lines;
		}

		// Case 2: GROUP with date range (no children) - multi-day spawning
		// For date range groups, we collect each day as a separate line
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
					`[SPAWN] GROUP ${groupLine.id}: Collecting ${days.length} days for date range ${startDate} to ${endDate}`,
				);

				// For date range groups, we create a synthetic line for each day
				days.forEach((day) => {
					lines.push({
						line: {
							...groupLine,
							sourceData: {
								...(sourceData || {}),
								dayDate: day.toISOString(),
							},
						},
						quote,
						pickupAt: startOfDay(day),
						groupLineId: groupLine.id,
					});
				});
			} catch (error) {
				console.error(
					`[SPAWN] GROUP ${groupLine.id}: Invalid date range - ${error}`,
				);
			}
		} else {
			console.log(
				`[SPAWN] GROUP ${groupLine.id}: No children and no date range, skipping`,
			);
		}

		return lines;
	}

	// =========================================================================
	// Story 28.5: GROUP Spawning Logic (Multi-Day) - Legacy method kept for compatibility
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
	 * @deprecated Use collectGroupLines + buildMissionDataWithRef for Story 29.4
	 */
	private static processGroupLine(
		groupLine: {
			id: string;
			type: string;
			label: string;
			sourceData: unknown;
			dispatchable?: boolean;
			children?: Array<{
				id: string;
				type: string;
				label: string;
				sourceData: unknown;
				dispatchable?: boolean;
				children?: unknown[];
			}>;
		},
		quote: {
			id: string;
			pickupAt: Date | null;
			estimatedEndAt: Date | null;
			pickupAddress: string | null;
			pickupLatitude: unknown;
			pickupLongitude: unknown;
			dropoffAddress: string | null;
			dropoffLatitude: unknown;
			dropoffLongitude: unknown;
			passengerCount: number | null;
			luggageCount: number | null;
			vehicleCategoryId: string | null;
			vehicleCategory: { name: string } | null;
			tripType: string;
			pricingMode: string | null;
			isRoundTrip: boolean | null;
		},
		order: { id: string; organizationId: string },
		existingLineIds: Set<string>,
	): Prisma.MissionCreateManyInput[] {
		const missions: Prisma.MissionCreateManyInput[] = [];

		// Skip if already processed (idempotence)
		if (existingLineIds.has(groupLine.id)) {
			console.log(
				`[SPAWN] Skipping GROUP line ${groupLine.id}: Missions already exist`,
			);
			return missions;
		}

		// Case 1: GROUP with children - recurse
		if (groupLine.children && groupLine.children.length > 0) {
			console.log(
				`[SPAWN] Processing GROUP line ${groupLine.id} with ${groupLine.children.length} children`,
			);

			for (const child of groupLine.children) {
				// Skip if child already has mission
				if (existingLineIds.has(child.id)) {
					console.log(
						`[SPAWN] Skipping child line ${child.id}: Mission already exists`,
					);
					continue;
				}

				// Story 28.6: Skip if child is not dispatchable
				if (child.dispatchable === false) {
					console.log(
						`[SPAWN] Skipping child line ${child.id}: dispatchable=false`,
					);
					continue;
				}

				if (child.type === "CALCULATED") {
					// Spawn mission for CALCULATED child, link to GROUP parent
					missions.push(
						this.buildMissionData(child as any, quote, order, groupLine.id),
					);
				} else if (child.type === "GROUP" && child.children) {
					// Recurse for nested GROUP (up to 2 levels)
					const nestedMissions = this.processGroupLine(
						child as any,
						quote,
						order,
						existingLineIds,
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
					`[SPAWN] GROUP ${groupLine.id}: Spawning ${days.length} missions for date range ${startDate} to ${endDate}`,
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
							// Original GROUP sourceData (cast for type compatibility)
							lineSourceData: (sourceData ??
								null) as Prisma.InputJsonValue | null,
						} as Prisma.InputJsonValue,
					});
				});
			} catch (error) {
				console.error(
					`[SPAWN] GROUP ${groupLine.id}: Invalid date range - ${error}`,
				);
			}
		} else {
			console.log(
				`[SPAWN] GROUP ${groupLine.id}: No children and no date range, skipping`,
			);
		}

		return missions;
	}

	/**
	 * Story 29.4: Build mission create data with sequential ref
	 *
	 * @param line - The QuoteLine to build mission data from
	 * @param quote - The parent Quote
	 * @param order - The parent Order (with reference field)
	 * @param groupLineId - Optional parent GROUP line ID for traceability
	 * @param ref - Sequential mission reference (e.g., "ORD-2026-001-01")
	 * @param sequenceIndex - 1-based position in chronological order
	 * @param totalMissions - Total missions being spawned for this Order
	 * @returns Mission create data with ref
	 */
	private static buildMissionDataWithRef(
		line: {
			id: string;
			label: string;
			description?: string | null;
			sourceData: unknown;
			totalPrice?: unknown;
		},
		quote: {
			id: string;
			pickupAt: Date | null;
			estimatedEndAt: Date | null;
			pickupAddress: string | null;
			pickupLatitude: unknown;
			pickupLongitude: unknown;
			dropoffAddress: string | null;
			dropoffLatitude: unknown;
			dropoffLongitude: unknown;
			passengerCount: number | null;
			luggageCount: number | null;
			vehicleCategoryId: string | null;
			vehicleCategory: { name: string } | null;
			tripType: string;
			pricingMode: string | null;
			isRoundTrip: boolean | null;
		},
		order: { id: string; organizationId: string; reference: string },
		groupLineId: string | null,
		ref: string,
		sequenceIndex: number,
		totalMissions: number,
	): Prisma.MissionCreateManyInput {
		// Extract potential trip data from line sourceData (Shopping Cart Mode)
		const lineSource = (line.sourceData as Record<string, unknown>) || {};

		// Helper to resolve value: Line > Quote > Default
		const resolve = <T>(
			lineVal: unknown,
			quoteVal: T,
			fallback: T | null = null,
		): T | null => {
			if (lineVal !== undefined && lineVal !== null && lineVal !== "") {
				return lineVal as T;
			}
			return quoteVal ?? fallback;
		};

		// Resolve addresses
		const pickupAddress = resolve(
			lineSource.pickupAddress,
			quote.pickupAddress,
		);
		const dropoffAddress = resolve(
			lineSource.dropoffAddress,
			quote.dropoffAddress,
		);

		// Resolve coordinates with number conversion
		const pickupLat =
			lineSource.pickupLatitude !== undefined
				? Number(lineSource.pickupLatitude)
				: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null;
		const pickupLng =
			lineSource.pickupLongitude !== undefined
				? Number(lineSource.pickupLongitude)
				: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null;
		const dropoffLat =
			lineSource.dropoffLatitude !== undefined
				? Number(lineSource.dropoffLatitude)
				: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null;
		const dropoffLng =
			lineSource.dropoffLongitude !== undefined
				? Number(lineSource.dropoffLongitude)
				: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null;

		// Resolve operational details
		const pax = resolve(lineSource.passengerCount, quote.passengerCount);
		const lug = resolve(lineSource.luggageCount, quote.luggageCount);
		const tripType = resolve(lineSource.tripType, quote.tripType) as string;
		const pricingMode = resolve(lineSource.pricingMode, quote.pricingMode) as
			| string
			| null;
		const isRoundTrip = resolve(lineSource.isRoundTrip, quote.isRoundTrip) as
			| boolean
			| null;

		// Resolve Dates
		let startAt = quote.pickupAt ?? new Date();
		let endAt = quote.estimatedEndAt ?? null;

		if (lineSource.pickupAt) {
			startAt = new Date(lineSource.pickupAt as string);
		}
		if (lineSource.estimatedEndAt) {
			endAt = new Date(lineSource.estimatedEndAt as string);
		} else if (lineSource.dropoffAt) {
			endAt = new Date(lineSource.dropoffAt as string);
		}

		// Note: ref field requires Prisma client regeneration after schema migration
		return {
			organizationId: order.organizationId,
			quoteId: quote.id,
			quoteLineId: line.id,
			orderId: order.id,
			status: "PENDING" as const,
			startAt,
			endAt,
			ref, // Story 29.4: Sequential reference (requires db:generate after migration)
			sourceData: {
				// Location data
				pickupAddress,
				pickupLatitude: pickupLat,
				pickupLongitude: pickupLng,
				dropoffAddress,
				dropoffLatitude: dropoffLat,
				dropoffLongitude: dropoffLng,
				// Passenger info
				passengerCount: pax,
				luggageCount: lug,
				// Vehicle info
				vehicleCategoryId: resolve(
					lineSource.vehicleCategoryId,
					quote.vehicleCategoryId,
				),
				vehicleCategoryName: resolve(
					lineSource.vehicleCategoryName,
					quote.vehicleCategory?.name,
				),
				// Line info
				lineLabel: line.label,
				lineDescription: line.description,
				lineSourceData: (line.sourceData ??
					null) as Prisma.InputJsonValue | null,
				lineTotalPrice: line.totalPrice ? Number(line.totalPrice) : null,
				// GROUP parent reference (Story 28.5)
				groupLineId: groupLineId,
				// Trip info
				tripType,
				pricingMode,
				isRoundTrip,
				// Story 29.4: Sequence metadata
				sequenceIndex,
				totalMissionsInOrder: totalMissions,
				spawnedAt: new Date().toISOString(),
			} as Prisma.InputJsonValue,
		};
	}

	/**
	 * Build mission create data from a line
	 *
	 * @param line - The QuoteLine to build mission data from
	 * @param quote - The parent Quote
	 * @param order - The parent Order
	 * @param groupLineId - Optional parent GROUP line ID for traceability
	 * @returns Mission create data
	 * @deprecated Use buildMissionDataWithRef for Story 29.4
	 */
	private static buildMissionData(
		line: {
			id: string;
			label: string;
			description?: string | null;
			sourceData: unknown;
			totalPrice?: unknown;
		},
		quote: {
			id: string;
			pickupAt: Date | null;
			estimatedEndAt: Date | null;
			pickupAddress: string | null;
			pickupLatitude: unknown;
			pickupLongitude: unknown;
			dropoffAddress: string | null;
			dropoffLatitude: unknown;
			dropoffLongitude: unknown;
			passengerCount: number | null;
			luggageCount: number | null;
			vehicleCategoryId: string | null;
			vehicleCategory: { name: string } | null;
			tripType: string;
			pricingMode: string | null;
			isRoundTrip: boolean | null;
		},
		order: { id: string; organizationId: string },
		groupLineId: string | null,
	): Prisma.MissionCreateManyInput {
		// Extract potential trip data from line sourceData (Shopping Cart Mode)
		const lineSource = (line.sourceData as Record<string, unknown>) || {};

		// Helper to resolve value: Line > Quote > Default
		const resolve = <T>(
			lineVal: unknown,
			quoteVal: T,
			fallback: T | null = null,
		): T | null => {
			if (lineVal !== undefined && lineVal !== null && lineVal !== "") {
				return lineVal as T;
			}
			return quoteVal ?? fallback;
		};

		// Resolve addresses
		const pickupAddress = resolve(
			lineSource.pickupAddress,
			quote.pickupAddress,
		);
		const dropoffAddress = resolve(
			lineSource.dropoffAddress,
			quote.dropoffAddress,
		);

		// Resolve coordinates with number conversion
		const pickupLat =
			lineSource.pickupLatitude !== undefined
				? Number(lineSource.pickupLatitude)
				: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null;
		const pickupLng =
			lineSource.pickupLongitude !== undefined
				? Number(lineSource.pickupLongitude)
				: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null;
		const dropoffLat =
			lineSource.dropoffLatitude !== undefined
				? Number(lineSource.dropoffLatitude)
				: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null;
		const dropoffLng =
			lineSource.dropoffLongitude !== undefined
				? Number(lineSource.dropoffLongitude)
				: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null;

		// Resolve operational details
		const pax = resolve(lineSource.passengerCount, quote.passengerCount);
		const lug = resolve(lineSource.luggageCount, quote.luggageCount);
		const tripType = resolve(lineSource.tripType, quote.tripType) as string;
		const pricingMode = resolve(lineSource.pricingMode, quote.pricingMode) as
			| string
			| null;
		const isRoundTrip = resolve(lineSource.isRoundTrip, quote.isRoundTrip) as
			| boolean
			| null;

		// Resolve Dates (If line has specific dates, use them, else Quote Header dates)
		// Note: pickupAt/estimatedEndAt are Dates in Quote arg, but might be strings in JSON
		let startAt = quote.pickupAt ?? new Date();
		let endAt = quote.estimatedEndAt ?? null;

		if (lineSource.pickupAt) {
			startAt = new Date(lineSource.pickupAt as string);
		}
		if (lineSource.estimatedEndAt) {
			endAt = new Date(lineSource.estimatedEndAt as string);
		} else if (lineSource.dropoffAt) {
			// Compatibility with executionData format
			endAt = new Date(lineSource.dropoffAt as string);
		}

		return {
			organizationId: order.organizationId,
			quoteId: quote.id,
			quoteLineId: line.id,
			orderId: order.id,
			status: "PENDING" as const,
			startAt,
			endAt,
			sourceData: {
				// Location data
				pickupAddress,
				pickupLatitude: pickupLat,
				pickupLongitude: pickupLng,
				dropoffAddress,
				dropoffLatitude: dropoffLat,
				dropoffLongitude: dropoffLng,
				// Passenger info
				passengerCount: pax,
				luggageCount: lug,
				// Vehicle info
				vehicleCategoryId: resolve(
					lineSource.vehicleCategoryId,
					quote.vehicleCategoryId,
				),
				vehicleCategoryName: resolve(
					lineSource.vehicleCategoryName,
					quote.vehicleCategory?.name,
				),
				// Line info
				lineLabel: line.label,
				lineDescription: line.description,
				lineSourceData: (line.sourceData ??
					null) as Prisma.InputJsonValue | null,
				lineTotalPrice: line.totalPrice ? Number(line.totalPrice) : null,
				// GROUP parent reference (Story 28.5)
				groupLineId: groupLineId,
				// Trip info
				tripType,
				pricingMode,
				isRoundTrip,
			} as Prisma.InputJsonValue,
		};
	}

	// =========================================================================
	// Story 28.13: Internal Mission Creation
	// =========================================================================

	/**
	 * Create an internal (non-billable) mission for an Order
	 * These missions have no quote line source and are excluded from invoices
	 *
	 * @param params - Internal mission parameters
	 * @returns Created mission with isInternal=true
	 * @throws Error if order doesn't exist or has no quotes
	 */
	static async createInternal(params: CreateInternalParams): Promise<Mission> {
		const {
			orderId,
			organizationId,
			label,
			startAt,
			vehicleCategoryId,
			notes,
		} = params;

		// 1. Fetch the order with its first quote (for required quoteId relation)
		const order = await db.order.findFirst({
			where: {
				id: orderId,
				organizationId, // Tenant scope
			},
			include: {
				quotes: {
					take: 1,
					orderBy: { createdAt: "asc" },
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found or access denied`);
		}

		if (order.quotes.length === 0) {
			throw new Error(
				`Order ${orderId} has no quotes - cannot create internal mission`,
			);
		}

		const referenceQuote = order.quotes[0];

		// 2. Optionally fetch vehicle category for sourceData
		let vehicleCategoryName: string | null = null;
		if (vehicleCategoryId) {
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: { id: vehicleCategoryId, organizationId },
				select: { name: true },
			});
			vehicleCategoryName = vehicleCategory?.name ?? null;
		}

		// 3. Create the internal mission
		const mission = await db.mission.create({
			data: {
				organizationId,
				quoteId: referenceQuote.id, // Required relation - use first quote of order
				quoteLineId: null, // No source line for internal missions
				orderId,
				status: "PENDING",
				startAt,
				endAt: null,
				isInternal: true, // Story 28.13: Mark as internal (non-billable)
				notes: notes ?? null,
				sourceData: {
					// Internal mission marker
					isInternal: true,
					label,
					// Vehicle info (if provided)
					vehicleCategoryId: vehicleCategoryId ?? null,
					vehicleCategoryName,
					// Creation metadata
					createdAt: new Date().toISOString(),
					createdBy: "internal-task",
				},
			},
		});

		console.log(
			`[SPAWN-INTERNAL] Mission ${mission.id}: Created internal task "${label}" for Order ${orderId}`,
		);

		return mission;
	}
}
