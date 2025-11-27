import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantFilter, withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

/**
 * Missions Router
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Missions are accepted quotes with pickupAt in the future.
 * This router provides endpoints for the Dispatch screen.
 *
 * @see FR50-FR51 Multi-base dispatch and driver flexibility
 * @see UX Spec 8.8 Dispatch Screen
 */

// Validation schemas
const listMissionsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	dateFrom: z
		.string()
		.datetime()
		.optional()
		.describe("Filter missions with pickupAt >= dateFrom"),
	dateTo: z
		.string()
		.datetime()
		.optional()
		.describe("Filter missions with pickupAt <= dateTo"),
	vehicleCategoryId: z
		.string()
		.optional()
		.describe("Filter by vehicle category"),
	clientType: z
		.enum(["PARTNER", "PRIVATE", "ALL"])
		.optional()
		.default("ALL")
		.describe("Filter by client type"),
	search: z
		.string()
		.optional()
		.describe("Search in contact name, pickup/dropoff addresses"),
});

// Response types
interface MissionAssignment {
	vehicleId: string | null;
	vehicleName: string | null;
	baseName: string | null;
	driverId: string | null;
	driverName: string | null;
}

interface MissionProfitability {
	marginPercent: number | null;
	level: "green" | "orange" | "red";
}

interface MissionCompliance {
	status: "OK" | "WARNING" | "VIOLATION";
	warnings: string[];
}

interface MissionListItem {
	id: string;
	quoteId: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	passengerCount: number;
	luggageCount: number;
	finalPrice: number;
	contact: {
		id: string;
		displayName: string;
		isPartner: boolean;
	};
	vehicleCategory: {
		id: string;
		name: string;
		code: string;
	};
	assignment: MissionAssignment | null;
	profitability: MissionProfitability;
	compliance: MissionCompliance;
}

/**
 * Calculate profitability level based on margin percentage
 */
function getProfitabilityLevel(
	marginPercent: number | null,
): "green" | "orange" | "red" {
	if (marginPercent === null) return "orange";
	if (marginPercent >= 20) return "green";
	if (marginPercent >= 0) return "orange";
	return "red";
}

/**
 * Extract compliance status from tripAnalysis
 */
function getComplianceStatus(tripAnalysis: unknown): MissionCompliance {
	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return { status: "OK", warnings: [] };
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const complianceResult = analysis.complianceResult as
		| Record<string, unknown>
		| undefined;

	if (!complianceResult) {
		return { status: "OK", warnings: [] };
	}

	const violations = (complianceResult.violations as unknown[]) || [];
	const warnings = (complianceResult.warnings as unknown[]) || [];

	if (violations.length > 0) {
		return {
			status: "VIOLATION",
			warnings: violations.map((v) =>
				typeof v === "object" && v !== null && "message" in v
					? String((v as { message: string }).message)
					: String(v),
			),
		};
	}

	if (warnings.length > 0) {
		return {
			status: "WARNING",
			warnings: warnings.map((w) =>
				typeof w === "object" && w !== null && "message" in w
					? String((w as { message: string }).message)
					: String(w),
			),
		};
	}

	return { status: "OK", warnings: [] };
}

/**
 * Extract vehicle assignment from tripAnalysis
 * For now, returns null as assignment is not yet stored (Story 8.2)
 */
function getAssignment(tripAnalysis: unknown): MissionAssignment | null {
	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return null;
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const vehicleSelection = analysis.vehicleSelection as
		| Record<string, unknown>
		| undefined;

	if (!vehicleSelection || !vehicleSelection.selectedVehicle) {
		return null;
	}

	const selected = vehicleSelection.selectedVehicle as Record<string, unknown>;

	return {
		vehicleId: (selected.vehicleId as string) || null,
		vehicleName: (selected.vehicleName as string) || null,
		baseName: (selected.baseName as string) || null,
		driverId: null, // Driver assignment not yet implemented
		driverName: null,
	};
}

export const missionsRouter = new Hono()
	.basePath("/missions")
	.use("*", organizationMiddleware)

	// List missions (accepted quotes with future pickupAt)
	.get(
		"/",
		validator("query", listMissionsSchema),
		describeRoute({
			summary: "List missions",
			description:
				"Get a paginated list of missions (accepted quotes with future pickup dates) for dispatch",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, dateFrom, dateTo, vehicleCategoryId, clientType, search } =
				c.req.valid("query");

			const skip = (page - 1) * limit;
			const now = new Date();

			// Build where clause
			const baseWhere: Prisma.QuoteWhereInput = {
				status: "ACCEPTED",
				pickupAt: {
					gte: dateFrom ? new Date(dateFrom) : now,
					...(dateTo && { lte: new Date(dateTo) }),
				},
				...(vehicleCategoryId && { vehicleCategoryId }),
			};

			// Client type filter
			if (clientType && clientType !== "ALL") {
				baseWhere.contact = {
					isPartner: clientType === "PARTNER",
				};
			}

			// Search filter
			if (search) {
				baseWhere.OR = [
					{
						contact: { displayName: { contains: search, mode: "insensitive" } },
					},
					{
						contact: { companyName: { contains: search, mode: "insensitive" } },
					},
					{ pickupAddress: { contains: search, mode: "insensitive" } },
					{ dropoffAddress: { contains: search, mode: "insensitive" } },
				];
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [quotes, total] = await Promise.all([
				db.quote.findMany({
					where,
					skip,
					take: limit,
					orderBy: { pickupAt: "asc" },
					include: {
						contact: true,
						vehicleCategory: true,
					},
				}),
				db.quote.count({ where }),
			]);

			// Transform quotes to missions
			const missions: MissionListItem[] = quotes.map((quote) => ({
				id: quote.id,
				quoteId: quote.id,
				pickupAt: quote.pickupAt.toISOString(),
				pickupAddress: quote.pickupAddress,
				dropoffAddress: quote.dropoffAddress,
				pickupLatitude: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null,
				dropoffLatitude: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				finalPrice: Number(quote.finalPrice),
				contact: {
					id: quote.contact.id,
					displayName: quote.contact.displayName,
					isPartner: quote.contact.isPartner,
				},
				vehicleCategory: {
					id: quote.vehicleCategory.id,
					name: quote.vehicleCategory.name,
					code: quote.vehicleCategory.code,
				},
				assignment: getAssignment(quote.tripAnalysis),
				profitability: {
					marginPercent: quote.marginPercent
						? Number(quote.marginPercent)
						: null,
					level: getProfitabilityLevel(
						quote.marginPercent ? Number(quote.marginPercent) : null,
					),
				},
				compliance: getComplianceStatus(quote.tripAnalysis),
			}));

			return c.json({
				data: missions,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single mission detail
	.get(
		"/:id",
		describeRoute({
			summary: "Get mission detail",
			description:
				"Get detailed mission information including tripAnalysis for dispatch",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const quote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					status: "ACCEPTED",
				},
				include: {
					contact: true,
					vehicleCategory: true,
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Mission not found",
				});
			}

			const mission = {
				id: quote.id,
				quoteId: quote.id,
				pickupAt: quote.pickupAt.toISOString(),
				pickupAddress: quote.pickupAddress,
				dropoffAddress: quote.dropoffAddress,
				pickupLatitude: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null,
				dropoffLatitude: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				finalPrice: Number(quote.finalPrice),
				internalCost: quote.internalCost ? Number(quote.internalCost) : null,
				marginPercent: quote.marginPercent ? Number(quote.marginPercent) : null,
				suggestedPrice: Number(quote.suggestedPrice),
				pricingMode: quote.pricingMode,
				tripType: quote.tripType,
				notes: quote.notes,
				contact: {
					id: quote.contact.id,
					displayName: quote.contact.displayName,
					isPartner: quote.contact.isPartner,
					email: quote.contact.email,
					phone: quote.contact.phone,
				},
				vehicleCategory: {
					id: quote.vehicleCategory.id,
					name: quote.vehicleCategory.name,
					code: quote.vehicleCategory.code,
				},
				tripAnalysis: quote.tripAnalysis,
				appliedRules: quote.appliedRules,
				assignment: getAssignment(quote.tripAnalysis),
				profitability: {
					marginPercent: quote.marginPercent
						? Number(quote.marginPercent)
						: null,
					level: getProfitabilityLevel(
						quote.marginPercent ? Number(quote.marginPercent) : null,
					),
				},
				compliance: getComplianceStatus(quote.tripAnalysis),
			};

			return c.json(mission);
		},
	);
