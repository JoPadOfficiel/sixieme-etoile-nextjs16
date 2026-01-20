import { db } from "@repo/database";
import { MissionStatus, QuoteLineType } from "@repo/database";
import { addDays } from "date-fns";

export class SpawnService {
	/**
	 * Execute the spawning logic for a confirmed order.
	 * Converts QuoteLines into Missions.
	 */
	async execute(orderId: string) {
		// 1. Fetch Order with accepted quote and lines
		const order = await db.order.findUnique({
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
		if (!quote) throw new Error(`No accepted quote found for Order ${orderId}`);

		// Filter root lines (those without parents)
		const rootLines = quote.lines.filter((l) => !l.parentId);

		const createdMissions = [];

		// 2. Process Lines
		for (const line of rootLines) {
			const missions = await this.processLine(line, quote, order.id);
			createdMissions.push(...missions);
		}

		return createdMissions;
	}

	/**
	 * Recursive function to process a line.
	 * - If GROUP: Recurse on children.
	 * - If Item: Create Mission(s).
	 */
	private async processLine(
		line: any,
		quote: any,
		orderId: string,
	): Promise<any[]> {
		const missions = [];

		if (line.type === QuoteLineType.GROUP) {
			if (line.children && line.children.length > 0) {
				for (const child of line.children) {
					const childMissions = await this.processLine(child, quote, orderId);
					missions.push(...childMissions);
				}
			}
			return missions;
		}

		// It's a leaf item (CALCULATED or MANUAL)
		// Check for Multi-Day logic
		// Heuristic: If quantity > 1 AND label implies days (or based on future metadata)
		// For AC2: "Si Time-Range ... (ex: '3 Jours')"
		const isMultiDay = this.detectMultiDay(line);

		const count = isMultiDay ? Math.ceil(Number(line.quantity)) : 1;
		// Note: If not multi-day, quantity might represent "2 Vehicles".
		// The prompt AC2 focuses on "Time-Range".
		// If it's just "2 Vans", normally that's "2 Missions" too?
		// But the prompt specifically distinguishes "Time-Range without children => 1 mission per day".
		// I will stick to:
		// - If Multi-Day: Loop days.
		// - Else: Just 1 mission (Assuming quantity '2 vans' isn't the scope of THIS story, or is handled otherwise).
		// Actually, usually 1 line = 1 mission unless specific split logic.
		// I'll stick to 1 mission unless multi-day.

		for (let i = 0; i < count; i++) {
			const missionDate = isMultiDay
				? addDays(quote.pickupAt, i)
				: quote.pickupAt;

			const mission = await db.mission.create({
				data: {
					organizationId: orderId
						? await this.getOrgId(orderId)
						: quote.organizationId, // Helper needed or use quote.orgId
					quoteId: quote.id,
					quoteLineId: line.id,
					orderId: orderId,
					status: MissionStatus.PENDING,
					startAt: missionDate,
					// Map other context
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
		// Logic to detect if this line is a "Day-based" quantity
		// In a real app, strict metadata is better. Here parsing label or checking unit.
		// Based on AC2: "Quantity: 3, Unit: days" implies we might check displayData if available.
		// Or check label string.
		const label = line.label?.toLowerCase() || "";
		const description = line.description?.toLowerCase() || "";

		const text = label + " " + description;
		if (text.includes("jour") || text.includes("day")) {
			return Number(line.quantity) > 1;
		}
		return false;
	}

	private async getOrgId(orderId: string) {
		const order = await db.order.findUnique({
			where: { id: orderId },
			select: { organizationId: true },
		});
		return order?.organizationId || "";
	}
}
