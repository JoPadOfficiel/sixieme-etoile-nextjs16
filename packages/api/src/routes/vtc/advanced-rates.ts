/**
 * Advanced Rate Modifiers API Routes
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 *
 * Provides endpoints for:
 * - CRUD operations on advanced rate modifiers
 * - Statistics for summary cards
 */

import { db } from "@repo/database";
import { AdvancedRateAppliesTo } from "@prisma/client";
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
 * Validate time format (HH:MM)
 */
const isValidTimeFormat = (time: string): boolean => {
	return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

/**
 * Validate days of week format (comma-separated 0-6)
 */
const isValidDaysOfWeek = (days: string): boolean => {
	const dayArray = days.split(",");
	return dayArray.every((d) => {
		const num = parseInt(d.trim(), 10);
		return !isNaN(num) && num >= 0 && num <= 6;
	});
};

/**
 * Transform rate modifier for JSON response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformAdvancedRate = (rate: any) => ({
	id: rate.id,
	name: rate.name,
	appliesTo: rate.appliesTo,
	startTime: rate.startTime,
	endTime: rate.endTime,
	daysOfWeek: rate.daysOfWeek,
	minDistanceKm: decimalToNumber(rate.minDistanceKm),
	maxDistanceKm: decimalToNumber(rate.maxDistanceKm),
	zoneId: rate.zoneId,
	zoneName: rate.zone?.name ?? null,
	adjustmentType: rate.adjustmentType,
	value: decimalToNumber(rate.value),
	priority: rate.priority,
	isActive: rate.isActive,
	vehicleCategoryIds: rate.vehicleCategories?.map((c: any) => c.id) ?? [],
	vehicleCategoryNames: rate.vehicleCategories?.map((c: any) => c.name) ?? [],
	createdAt: rate.createdAt.toISOString(),
	updatedAt: rate.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

// Note: Only NIGHT and WEEKEND types supported (Story 11.4)
// LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed - zone pricing handled by PricingZone.priceMultiplier
const appliesToEnum = z.enum(["NIGHT", "WEEKEND"]);

const adjustmentTypeEnum = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);

const listRatesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	type: appliesToEnum.optional(),
	status: z.enum(["all", "active", "inactive"]).optional(),
	search: z.string().optional(),
});

const createRateSchema = z
	.object({
		name: z.string().min(1, "Name is required").max(100, "Name too long"),
		appliesTo: appliesToEnum,
		startTime: z.string().optional().nullable(),
		endTime: z.string().optional().nullable(),
		daysOfWeek: z.string().optional().nullable(),
		minDistanceKm: z.coerce.number().positive().optional().nullable(),
		maxDistanceKm: z.coerce.number().positive().optional().nullable(),
		zoneId: z.string().optional().nullable(),
		adjustmentType: adjustmentTypeEnum,
		value: z.coerce.number(),
		priority: z.coerce.number().int().default(0),
		isActive: z.boolean().default(true),
		vehicleCategoryIds: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			// Validate time format if provided
			if (data.startTime && !isValidTimeFormat(data.startTime)) {
				return false;
			}
			if (data.endTime && !isValidTimeFormat(data.endTime)) {
				return false;
			}
			return true;
		},
		{ message: "Invalid time format. Use HH:MM (e.g., 22:00)" }
	)
	.refine(
		(data) => {
			// Validate days of week format if provided
			if (data.daysOfWeek && !isValidDaysOfWeek(data.daysOfWeek)) {
				return false;
			}
			return true;
		},
		{ message: "Invalid days of week format. Use comma-separated 0-6" }
	)
	.refine(
		(data) => {
			// Validate required fields based on type (only NIGHT and WEEKEND supported)
			if (data.appliesTo === "NIGHT" || data.appliesTo === "WEEKEND") {
				if (!data.startTime || !data.endTime) {
					return false;
				}
			}
			return true;
		},
		{
			message: "Start time and end time are required for NIGHT and WEEKEND types",
		}
	)
	.refine(
		(data) => {
			if (data.appliesTo === "WEEKEND") {
				if (!data.daysOfWeek) {
					return false;
				}
			}
			return true;
		},
		{ message: "Days of week are required for WEEKEND type" }
	);

const updateRateSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		appliesTo: appliesToEnum.optional(),
		startTime: z.string().optional().nullable(),
		endTime: z.string().optional().nullable(),
		daysOfWeek: z.string().optional().nullable(),
		minDistanceKm: z.coerce.number().positive().optional().nullable(),
		maxDistanceKm: z.coerce.number().positive().optional().nullable(),
		zoneId: z.string().optional().nullable(),
		adjustmentType: adjustmentTypeEnum.optional(),
		value: z.coerce.number().optional(),
		priority: z.coerce.number().int().optional(),
		isActive: z.boolean().optional(),
		vehicleCategoryIds: z.array(z.string()).optional(),
	})
	.refine(
		(data) => {
			if (data.startTime && !isValidTimeFormat(data.startTime)) {
				return false;
			}
			if (data.endTime && !isValidTimeFormat(data.endTime)) {
				return false;
			}
			return true;
		},
		{ message: "Invalid time format. Use HH:MM (e.g., 22:00)" }
	)
	.refine(
		(data) => {
			if (data.daysOfWeek && !isValidDaysOfWeek(data.daysOfWeek)) {
				return false;
			}
			return true;
		},
		{ message: "Invalid days of week format. Use comma-separated 0-6" }
	);

// ============================================================================
// Router
// ============================================================================

export const advancedRatesRouter = new Hono()
	.basePath("/pricing/advanced-rates")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/advanced-rates/stats - Get summary statistics
	// -------------------------------------------------------------------------
	.get(
		"/stats",
		describeRoute({
			summary: "Get advanced rate statistics",
			description: "Get counts of rate modifiers by type",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			// Note: Only NIGHT and WEEKEND types supported (Story 11.4)
			const [night, weekend, totalActive] = await Promise.all([
				db.advancedRate.count({
					where: withTenantFilter(
						{ appliesTo: AdvancedRateAppliesTo.NIGHT },
						organizationId
					),
				}),
				db.advancedRate.count({
					where: withTenantFilter(
						{ appliesTo: AdvancedRateAppliesTo.WEEKEND },
						organizationId
					),
				}),
				db.advancedRate.count({
					where: withTenantFilter(
						{ isActive: true, appliesTo: { in: [AdvancedRateAppliesTo.NIGHT, AdvancedRateAppliesTo.WEEKEND] } },
						organizationId
					),
				}),
			]);

			return c.json({
				night,
				weekend,
				totalActive,
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/advanced-rates - List all rate modifiers
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listRatesSchema),
		describeRoute({
			summary: "List advanced rate modifiers",
			description:
				"Get a paginated list of advanced rate modifiers for the current organization",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, type, status, search } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build filters
			const typeFilter = type
				? { appliesTo: type as AdvancedRateAppliesTo }
				: {};
			const statusFilter =
				status === "active"
					? { isActive: true }
					: status === "inactive"
						? { isActive: false }
						: {};

			const where = withTenantFilter(
				{
					...typeFilter,
					...statusFilter,
					...(search && {
						name: { contains: search, mode: "insensitive" as const },
					}),
				},
				organizationId
			);

			const [rates, total] = await Promise.all([
				db.advancedRate.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ priority: "desc" }, { name: "asc" }],
					include: {
						zone: {
							select: { name: true },
						},
						vehicleCategories: {
							select: { id: true, name: true },
						},
					},
				}),
				db.advancedRate.count({ where }),
			]);

			return c.json({
				data: rates.map(transformAdvancedRate),
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
	// GET /api/vtc/pricing/advanced-rates/:id - Get single rate modifier
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			summary: "Get advanced rate modifier",
			description: "Get a single advanced rate modifier by ID",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const rate = await db.advancedRate.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					zone: {
						select: { name: true },
					},
					vehicleCategories: {
						select: { id: true, name: true },
					},
				},
			});

			if (!rate) {
				throw new HTTPException(404, {
					message: "Advanced rate modifier not found",
				});
			}

			return c.json(transformAdvancedRate(rate));
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/pricing/advanced-rates - Create rate modifier
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createRateSchema),
		describeRoute({
			summary: "Create advanced rate modifier",
			description: "Create a new advanced rate modifier",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Note: ZONE_SCENARIO validation removed (Story 11.4)
			// Zone-based pricing now handled by PricingZone.priceMultiplier

			const rate = await db.advancedRate.create({
				data: withTenantCreate(
					{
						name: data.name,
						appliesTo: data.appliesTo,
						startTime: data.startTime ?? null,
						endTime: data.endTime ?? null,
						daysOfWeek: data.daysOfWeek ?? null,
						// Distance and zone fields kept for backward compatibility but not used
						minDistanceKm: null,
						maxDistanceKm: null,
						zoneId: null,
						adjustmentType: data.adjustmentType,
						value: data.value,
						priority: data.priority,
						isActive: data.isActive,
						...(data.vehicleCategoryIds &&
							data.vehicleCategoryIds.length > 0 && {
								vehicleCategories: {
									connect: data.vehicleCategoryIds.map((id) => ({ id })),
								},
							}),
					},
					organizationId
				),
				include: {
					zone: {
						select: { name: true },
					},
				},
			});

			return c.json(transformAdvancedRate(rate), 201);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/pricing/advanced-rates/:id - Update rate modifier
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		validator("json", updateRateSchema),
		describeRoute({
			summary: "Update advanced rate modifier",
			description: "Update an existing advanced rate modifier",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if rate exists
			const existing = await db.advancedRate.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Advanced rate modifier not found",
				});
			}

			// Note: Zone validation removed (Story 11.4)
			// Zone-based pricing now handled by PricingZone.priceMultiplier

			const rate = await db.advancedRate.update({
				where: withTenantId(id, organizationId),
				data: {
					...(data.name !== undefined && { name: data.name }),
					...(data.appliesTo !== undefined && { appliesTo: data.appliesTo }),
					...(data.startTime !== undefined && { startTime: data.startTime }),
					...(data.endTime !== undefined && { endTime: data.endTime }),
					...(data.daysOfWeek !== undefined && { daysOfWeek: data.daysOfWeek }),
					...(data.minDistanceKm !== undefined && {
						minDistanceKm: data.minDistanceKm,
					}),
					...(data.maxDistanceKm !== undefined && {
						maxDistanceKm: data.maxDistanceKm,
					}),
					...(data.zoneId !== undefined && { zoneId: data.zoneId }),
					...(data.adjustmentType !== undefined && {
						adjustmentType: data.adjustmentType,
					}),
					...(data.value !== undefined && { value: data.value }),
					...(data.priority !== undefined && { priority: data.priority }),
					...(data.isActive !== undefined && { isActive: data.isActive }),
					...(data.vehicleCategoryIds !== undefined && {
						vehicleCategories: {
							set: data.vehicleCategoryIds.map((id) => ({ id })),
						},
					}),
				},
				include: {
					zone: {
						select: { name: true },
					},
				},
			});

			return c.json(transformAdvancedRate(rate));
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/pricing/advanced-rates/:id - Delete rate modifier
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete advanced rate modifier",
			description: "Delete an advanced rate modifier",
			tags: ["VTC - Advanced Rates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if rate exists
			const existing = await db.advancedRate.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Advanced rate modifier not found",
				});
			}

			await db.advancedRate.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		}
	);

export default advancedRatesRouter;
