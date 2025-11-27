/**
 * Seasonal Multipliers API Routes
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 *
 * Provides endpoints for:
 * - CRUD operations on seasonal multipliers
 * - Statistics for summary cards
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert Prisma Decimal to number for JSON serialization
 */
const decimalToNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) return null;
	return Number(value);
};

/**
 * Calculate the status of a seasonal multiplier based on dates
 */
const calculateStatus = (
	startDate: Date,
	endDate: Date,
	isActive: boolean
): "active" | "upcoming" | "expired" => {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (endDate < today) {
		return "expired";
	}

	if (startDate <= today && endDate >= today && isActive) {
		return "active";
	}

	if (startDate > today) {
		return "upcoming";
	}

	return "expired";
};

/**
 * Transform multiplier for JSON response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformMultiplier = (multiplier: any) => ({
	id: multiplier.id,
	name: multiplier.name,
	description: multiplier.description,
	startDate: multiplier.startDate.toISOString(),
	endDate: multiplier.endDate.toISOString(),
	multiplier: decimalToNumber(multiplier.multiplier),
	priority: multiplier.priority,
	isActive: multiplier.isActive,
	status: calculateStatus(
		multiplier.startDate,
		multiplier.endDate,
		multiplier.isActive
	),
	createdAt: multiplier.createdAt.toISOString(),
	updatedAt: multiplier.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

const listMultipliersSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	status: z.enum(["all", "active", "upcoming", "expired"]).optional(),
	search: z.string().optional(),
});

const createMultiplierSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	description: z.string().max(500, "Description too long").optional().nullable(),
	startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid start date",
	}),
	endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
		message: "Invalid end date",
	}),
	multiplier: z.coerce
		.number()
		.min(0.1, "Multiplier must be at least 0.1")
		.max(3.0, "Multiplier cannot exceed 3.0"),
	priority: z.coerce.number().int().default(0),
	isActive: z.boolean().default(true),
});

const updateMultiplierSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	startDate: z
		.string()
		.refine((val) => !isNaN(Date.parse(val)), {
			message: "Invalid start date",
		})
		.optional(),
	endDate: z
		.string()
		.refine((val) => !isNaN(Date.parse(val)), {
			message: "Invalid end date",
		})
		.optional(),
	multiplier: z.coerce.number().min(0.1).max(3.0).optional(),
	priority: z.coerce.number().int().optional(),
	isActive: z.boolean().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const seasonalMultipliersRouter = new Hono()
	.basePath("/pricing/seasonal-multipliers")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/seasonal-multipliers/stats - Get summary statistics
	// -------------------------------------------------------------------------
	.get(
		"/stats",
		describeRoute({
			summary: "Get seasonal multiplier statistics",
			description:
				"Get counts of active, upcoming, and total seasonal multipliers",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const thirtyDaysFromNow = new Date(today);
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

			const [currentlyActive, upcoming, total] = await Promise.all([
				// Currently active: startDate <= today <= endDate AND isActive
				db.seasonalMultiplier.count({
					where: withTenantFilter(
						{
							startDate: { lte: today },
							endDate: { gte: today },
							isActive: true,
						},
						organizationId
					),
				}),
				// Upcoming: startDate > today AND startDate <= today + 30 days
				db.seasonalMultiplier.count({
					where: withTenantFilter(
						{
							startDate: {
								gt: today,
								lte: thirtyDaysFromNow,
							},
						},
						organizationId
					),
				}),
				// Total
				db.seasonalMultiplier.count({
					where: withTenantFilter({}, organizationId),
				}),
			]);

			return c.json({
				currentlyActive,
				upcoming,
				total,
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/seasonal-multipliers - List all multipliers
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listMultipliersSchema),
		describeRoute({
			summary: "List seasonal multipliers",
			description:
				"Get a paginated list of seasonal multipliers for the current organization",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, status, search } = c.req.valid("query");

			const skip = (page - 1) * limit;
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			// Build status filter
			let statusFilter = {};
			if (status === "active") {
				statusFilter = {
					startDate: { lte: today },
					endDate: { gte: today },
					isActive: true,
				};
			} else if (status === "upcoming") {
				statusFilter = {
					startDate: { gt: today },
				};
			} else if (status === "expired") {
				statusFilter = {
					endDate: { lt: today },
				};
			}

			const where = withTenantFilter(
				{
					...statusFilter,
					...(search && {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{
								description: { contains: search, mode: "insensitive" as const },
							},
						],
					}),
				},
				organizationId
			);

			const [multipliers, total] = await Promise.all([
				db.seasonalMultiplier.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ priority: "desc" }, { startDate: "asc" }],
				}),
				db.seasonalMultiplier.count({ where }),
			]);

			return c.json({
				data: multipliers.map(transformMultiplier),
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/seasonal-multipliers/:id - Get single multiplier
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			summary: "Get seasonal multiplier",
			description: "Get a single seasonal multiplier by ID",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const multiplier = await db.seasonalMultiplier.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!multiplier) {
				throw new HTTPException(404, {
					message: "Seasonal multiplier not found",
				});
			}

			return c.json(transformMultiplier(multiplier));
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/pricing/seasonal-multipliers - Create multiplier
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createMultiplierSchema),
		describeRoute({
			summary: "Create seasonal multiplier",
			description: "Create a new seasonal multiplier",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Parse dates
			const startDate = new Date(data.startDate);
			const endDate = new Date(data.endDate);

			// Validate endDate >= startDate
			if (endDate < startDate) {
				throw new HTTPException(400, {
					message: "End date must be greater than or equal to start date",
				});
			}

			const multiplier = await db.seasonalMultiplier.create({
				data: withTenantCreate(
					{
						name: data.name,
						description: data.description ?? null,
						startDate,
						endDate,
						multiplier: data.multiplier,
						priority: data.priority,
						isActive: data.isActive,
					},
					organizationId
				),
			});

			return c.json(transformMultiplier(multiplier), 201);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/pricing/seasonal-multipliers/:id - Update multiplier
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		validator("json", updateMultiplierSchema),
		describeRoute({
			summary: "Update seasonal multiplier",
			description: "Update an existing seasonal multiplier",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if multiplier exists
			const existing = await db.seasonalMultiplier.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Seasonal multiplier not found",
				});
			}

			// Parse dates if provided
			const startDate = data.startDate ? new Date(data.startDate) : undefined;
			const endDate = data.endDate ? new Date(data.endDate) : undefined;

			// Validate date range if both are provided or one is being updated
			const effectiveStartDate = startDate ?? existing.startDate;
			const effectiveEndDate = endDate ?? existing.endDate;

			if (effectiveEndDate < effectiveStartDate) {
				throw new HTTPException(400, {
					message: "End date must be greater than or equal to start date",
				});
			}

			const multiplier = await db.seasonalMultiplier.update({
				where: withTenantId(id, organizationId),
				data: {
					...(data.name !== undefined && { name: data.name }),
					...(data.description !== undefined && {
						description: data.description,
					}),
					...(startDate !== undefined && { startDate }),
					...(endDate !== undefined && { endDate }),
					...(data.multiplier !== undefined && { multiplier: data.multiplier }),
					...(data.priority !== undefined && { priority: data.priority }),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
			});

			return c.json(transformMultiplier(multiplier));
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/pricing/seasonal-multipliers/:id - Delete multiplier
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete seasonal multiplier",
			description: "Delete a seasonal multiplier",
			tags: ["VTC - Seasonal Multipliers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if multiplier exists
			const existing = await db.seasonalMultiplier.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Seasonal multiplier not found",
				});
			}

			await db.seasonalMultiplier.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		}
	);

export default seasonalMultipliersRouter;
