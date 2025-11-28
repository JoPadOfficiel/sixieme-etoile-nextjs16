/**
 * Promotions API Routes
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 *
 * Provides endpoints for:
 * - CRUD operations on promotions
 * - Statistics for summary cards
 * - Promo code validation
 */

import { db } from "@repo/database";
import { Prisma, AmountType } from "@prisma/client";
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
 * Compute promotion status based on dates, isActive, and usage
 */
const computePromotionStatus = (promotion: {
	isActive: boolean;
	validFrom: Date;
	validTo: Date;
	currentUses: number;
	maxTotalUses: number | null;
}): "active" | "expired" | "upcoming" | "inactive" => {
	const now = new Date();

	if (!promotion.isActive) {
		return "inactive";
	}

	if (now < promotion.validFrom) {
		return "upcoming";
	}

	if (now > promotion.validTo) {
		return "expired";
	}

	if (
		promotion.maxTotalUses !== null &&
		promotion.currentUses >= promotion.maxTotalUses
	) {
		return "expired"; // Usage limit reached
	}

	return "active";
};

/**
 * Transform promotion for JSON response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformPromotion = (promotion: any) => ({
	id: promotion.id,
	code: promotion.code,
	description: promotion.description,
	discountType: promotion.discountType,
	value: decimalToNumber(promotion.value),
	validFrom: promotion.validFrom.toISOString(),
	validTo: promotion.validTo.toISOString(),
	maxTotalUses: promotion.maxTotalUses,
	maxUsesPerContact: promotion.maxUsesPerContact,
	currentUses: promotion.currentUses,
	isActive: promotion.isActive,
	status: computePromotionStatus(promotion),
	createdAt: promotion.createdAt.toISOString(),
	updatedAt: promotion.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

const listPromotionsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	type: z.enum(["all", "FIXED", "PERCENTAGE"]).optional(),
	status: z.enum(["all", "active", "expired", "upcoming", "inactive"]).optional(),
	search: z.string().optional(),
});

const createPromotionSchema = z
	.object({
		code: z
			.string()
			.min(1, "Code is required")
			.max(50, "Code too long")
			.transform((val) => val.toUpperCase().trim()),
		description: z.string().max(500, "Description too long").optional().nullable(),
		discountType: z.enum(["FIXED", "PERCENTAGE"]),
		value: z.coerce.number().positive("Value must be positive"),
		validFrom: z.coerce.date(),
		validTo: z.coerce.date(),
		maxTotalUses: z.coerce.number().int().positive().optional().nullable(),
		maxUsesPerContact: z.coerce.number().int().positive().optional().nullable(),
		isActive: z.boolean().default(true),
	})
	.refine((data) => data.validTo >= data.validFrom, {
		message: "Valid To must be after or equal to Valid From",
		path: ["validTo"],
	});

const updatePromotionSchema = z
	.object({
		code: z
			.string()
			.min(1)
			.max(50)
			.transform((val) => val.toUpperCase().trim())
			.optional(),
		description: z.string().max(500).optional().nullable(),
		discountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
		value: z.coerce.number().positive().optional(),
		validFrom: z.coerce.date().optional(),
		validTo: z.coerce.date().optional(),
		maxTotalUses: z.coerce.number().int().positive().optional().nullable(),
		maxUsesPerContact: z.coerce.number().int().positive().optional().nullable(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(data) => {
			if (data.validFrom && data.validTo) {
				return data.validTo >= data.validFrom;
			}
			return true;
		},
		{
			message: "Valid To must be after or equal to Valid From",
			path: ["validTo"],
		}
	);

// ============================================================================
// Router
// ============================================================================

export const promotionsRouter = new Hono()
	.basePath("/pricing/promotions")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/promotions/stats - Get summary statistics
	// -------------------------------------------------------------------------
	.get(
		"/stats",
		describeRoute({
			summary: "Get promotion statistics",
			description:
				"Get counts of active, expired, upcoming promotions and total uses",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const now = new Date();

			// Get all promotions for this org to compute stats
			const promotions = await db.promotion.findMany({
				where: withTenantFilter({}, organizationId),
				select: {
					isActive: true,
					validFrom: true,
					validTo: true,
					currentUses: true,
					maxTotalUses: true,
				},
			});

			let active = 0;
			let expired = 0;
			let upcoming = 0;
			let totalUses = 0;

			for (const promo of promotions) {
				totalUses += promo.currentUses;
				const status = computePromotionStatus(promo);
				switch (status) {
					case "active":
						active++;
						break;
					case "expired":
						expired++;
						break;
					case "upcoming":
						upcoming++;
						break;
					// inactive promotions are not counted in active/expired/upcoming
				}
			}

			return c.json({
				active,
				expired,
				upcoming,
				totalUses,
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/promotions/validate/:code - Validate promo code
	// -------------------------------------------------------------------------
	.get(
		"/validate/:code",
		describeRoute({
			summary: "Validate promo code",
			description: "Check if a promo code is valid and can be applied",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const code = c.req.param("code").toUpperCase().trim();

			const promotion = await db.promotion.findFirst({
				where: withTenantFilter({ code }, organizationId),
			});

			if (!promotion) {
				return c.json({
					valid: false,
					reason: "NOT_FOUND",
				});
			}

			const now = new Date();

			if (!promotion.isActive) {
				return c.json({
					valid: false,
					promotion: transformPromotion(promotion),
					reason: "INACTIVE",
				});
			}

			if (now < promotion.validFrom) {
				return c.json({
					valid: false,
					promotion: transformPromotion(promotion),
					reason: "NOT_STARTED",
				});
			}

			if (now > promotion.validTo) {
				return c.json({
					valid: false,
					promotion: transformPromotion(promotion),
					reason: "EXPIRED",
				});
			}

			if (
				promotion.maxTotalUses !== null &&
				promotion.currentUses >= promotion.maxTotalUses
			) {
				return c.json({
					valid: false,
					promotion: transformPromotion(promotion),
					reason: "USAGE_LIMIT_REACHED",
				});
			}

			return c.json({
				valid: true,
				promotion: transformPromotion(promotion),
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/promotions - List all promotions
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listPromotionsSchema),
		describeRoute({
			summary: "List promotions",
			description:
				"Get a paginated list of promotions for the current organization",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, type, status, search } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build type filter
			let typeFilter = {};
			if (type && type !== "all") {
				typeFilter = { discountType: type as AmountType };
			}

			const where = withTenantFilter(
				{
					...typeFilter,
					...(search && {
						OR: [
							{ code: { contains: search, mode: "insensitive" as const } },
							{
								description: { contains: search, mode: "insensitive" as const },
							},
						],
					}),
				},
				organizationId
			);

			const [promotions, total] = await Promise.all([
				db.promotion.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ createdAt: "desc" }],
				}),
				db.promotion.count({ where }),
			]);

			// Filter by computed status if needed
			let filteredPromotions = promotions.map(transformPromotion);
			if (status && status !== "all") {
				filteredPromotions = filteredPromotions.filter((p) => p.status === status);
			}

			return c.json({
				data: filteredPromotions,
				meta: {
					page,
					limit,
					total: status && status !== "all" ? filteredPromotions.length : total,
					totalPages: Math.ceil(
						(status && status !== "all" ? filteredPromotions.length : total) / limit
					),
				},
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/promotions/:id - Get single promotion
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			summary: "Get promotion",
			description: "Get a single promotion by ID",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const promotion = await db.promotion.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!promotion) {
				throw new HTTPException(404, {
					message: "Promotion not found",
				});
			}

			return c.json(transformPromotion(promotion));
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/pricing/promotions - Create promotion
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createPromotionSchema),
		describeRoute({
			summary: "Create promotion",
			description: "Create a new promotion",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Check for duplicate code within organization
			const existing = await db.promotion.findFirst({
				where: withTenantFilter({ code: data.code }, organizationId),
			});

			if (existing) {
				throw new HTTPException(409, {
					message: "Promo code already exists",
				});
			}

			const promotion = await db.promotion.create({
				data: withTenantCreate(
					{
						code: data.code,
						description: data.description ?? null,
						discountType: data.discountType as AmountType,
						value: data.value,
						validFrom: data.validFrom,
						validTo: data.validTo,
						maxTotalUses: data.maxTotalUses ?? null,
						maxUsesPerContact: data.maxUsesPerContact ?? null,
						currentUses: 0,
						isActive: data.isActive,
					},
					organizationId
				),
			});

			return c.json(transformPromotion(promotion), 201);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/pricing/promotions/:id - Update promotion
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		validator("json", updatePromotionSchema),
		describeRoute({
			summary: "Update promotion",
			description: "Update an existing promotion",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if promotion exists
			const existing = await db.promotion.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Promotion not found",
				});
			}

			// If code is being changed, check for duplicates
			if (data.code && data.code !== existing.code) {
				const duplicate = await db.promotion.findFirst({
					where: withTenantFilter(
						{
							code: data.code,
							NOT: { id },
						},
						organizationId
					),
				});

				if (duplicate) {
					throw new HTTPException(409, {
						message: "Promo code already exists",
					});
				}
			}

			// Validate date range if both dates are provided or one is being updated
			const newValidFrom = data.validFrom ?? existing.validFrom;
			const newValidTo = data.validTo ?? existing.validTo;
			if (newValidTo < newValidFrom) {
				throw new HTTPException(400, {
					message: "Valid To must be after or equal to Valid From",
				});
			}

			// Build update data with proper type handling
			const updateData: Prisma.PromotionUpdateInput = {};
			if (data.code !== undefined) updateData.code = data.code;
			if (data.description !== undefined) updateData.description = data.description;
			if (data.discountType !== undefined)
				updateData.discountType = data.discountType as AmountType;
			if (data.value !== undefined) updateData.value = data.value;
			if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
			if (data.validTo !== undefined) updateData.validTo = data.validTo;
			if (data.maxTotalUses !== undefined)
				updateData.maxTotalUses = data.maxTotalUses;
			if (data.maxUsesPerContact !== undefined)
				updateData.maxUsesPerContact = data.maxUsesPerContact;
			if (data.isActive !== undefined) updateData.isActive = data.isActive;
			// Note: currentUses is NOT updatable via API

			const promotion = await db.promotion.update({
				where: withTenantId(id, organizationId),
				data: updateData,
			});

			return c.json(transformPromotion(promotion));
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/pricing/promotions/:id - Delete promotion
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete promotion",
			description: "Delete a promotion",
			tags: ["VTC - Promotions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if promotion exists
			const existing = await db.promotion.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Promotion not found",
				});
			}

			await db.promotion.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		}
	);

export default promotionsRouter;
