import { MissionStatus, type Prisma, QuoteLineType } from "@prisma/client";
import { db } from "@repo/database";
import { addDays } from "date-fns";

type SpawnTransaction = Omit<
	Prisma.TransactionClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export class SpawnService {
	/**
	 * Execute the spawning logic for a confirmed order.
	 * Converts QuoteLines into Missions.
	 */
	async execute(orderId: string) {
		return await db.$transaction(async (tx) => {
			// 1. Fetch Order with accepted quote and lines
			const order = await tx.order.findUnique({
				where: { id: orderId },
				include: {
					quotes: {
						where: { status: "ACCEPTED" }, // Only process accepted quote
						include: {
							lines: {
								include: {
									children: {
										include: {
											children: true, // Support 2 levels deep for safety
										},
									},
								},
								orderBy: { sortOrder: "asc" },
							},
							vehicleCategory: true,
						},
					},
				},
			});

			if (!order) throw new Error(`Order ${orderId} not found`);

			// Assuming there's exactly one accepted quote for a confirmed order
			const quote = order.quotes[0];
			if (!quote)
				throw new Error(`No accepted quote found for Order ${orderId}`);

			// Filter root lines (those without parents)
			const rootLines = quote.lines.filter((l) => !l.parentId);

			const createdMissions = [];

			// 2. Process Lines
			for (const line of rootLines) {
				// Pass organizationId explicitly to avoid N+1 queries
				// Cast line to any because the recursive inclusion type is complex
				const missions = await this.processLine(
					tx,
					line,
					quote,
					order.id,
					order.organizationId,
				);
				createdMissions.push(...missions);
			}

			return createdMissions;
		});
	}

	/**
	 * Recursive function to process a line.
	 * - If GROUP: Recurse on children.
	 * - If Item: Create Mission(s).
	 */
	private async processLine(
		tx: SpawnTransaction,
		line: any,
		quote: any,
		orderId: string,
		organizationId: string,
	): Promise<any[]> {
		const missions = [];

		if (line.type === QuoteLineType.GROUP) {
			if (line.children && line.children.length > 0) {
				for (const child of line.children) {
					const childMissions = await this.processLine(
						tx,
						child,
						quote,
						orderId,
						organizationId,
					);
					missions.push(...childMissions);
				}
			}
			return missions;
		}

		// It's a leaf item (CALCULATED or MANUAL)
		// Check for Multi-Day logic
		const isMultiDay = this.detectMultiDay(line);
		const count = isMultiDay ? Math.ceil(Number(line.quantity)) : 1;

		for (let i = 0; i < count; i++) {
			const missionDate = isMultiDay
				? addDays(quote.pickupAt, i)
				: quote.pickupAt;

			const mission = await tx.mission.create({
				data: {
					organizationId: organizationId,
					quoteId: quote.id,
					quoteLineId: line.id,
					orderId: orderId,
					status: MissionStatus.PENDING,
					startAt: missionDate,
					vehicleId: null,
					driverId: null,
					notes: line.description,
					sourceData: line.sourceData || {},
					executionData: {},
				},
			});
			missions.push(mission);
		}

		return missions;
	}

	private detectMultiDay(line: any): boolean {
		// Logic to detect if this line is a "Day-based" quantity.
		// Heuristic: Check sourceData.unit or label/description for "jour"/"day".

		const label = line.label?.toLowerCase() || "";
		const description = line.description?.toLowerCase() || "";
		const unit = (line.sourceData as any)?.unit?.toLowerCase() || "";

		// Strong check on unit/metadata first if available
		if (
			unit === "day" ||
			unit === "days" ||
			unit === "jour" ||
			unit === "jours"
		) {
			return Number(line.quantity) > 1;
		}

		// Fallback text check
		const text = `${label} ${description}`;
		if (text.includes("jour") || text.includes("day")) {
			return Number(line.quantity) > 1;
		}
		return false;
	}
}
