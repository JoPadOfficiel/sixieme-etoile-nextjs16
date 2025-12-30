/**
 * Time Buckets API Routes
 * Story 17.9: Configurable Time Buckets for MAD Pricing
 *
 * Provides endpoints for:
 * - CRUD operations on MAD time buckets
 * - Statistics for summary cards
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
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
 * Transform time bucket for JSON response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformTimeBucket = (bucket: any) => ({
	id: bucket.id,
	durationHours: bucket.durationHours,
	vehicleCategoryId: bucket.vehicleCategoryId,
	vehicleCategory: bucket.vehicleCategory ? {
		id: bucket.vehicleCategory.id,
		name: bucket.vehicleCategory.name,
		code: bucket.vehicleCategory.code,
	} : null,
	price: decimalToNumber(bucket.price),
	isActive: bucket.isActive,
	createdAt: bucket.createdAt.toISOString(),
	updatedAt: bucket.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

const listTimeBucketsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	vehicleCategoryId: z.string().optional(),
	isActive: z.enum(["true", "false"]).optional(),
});

const createTimeBucketSchema = z.object({
	durationHours: z.coerce
		.number()
		.int()
		.min(1, "Duration must be at least 1 hour")
		.max(24, "Duration cannot exceed 24 hours"),
	vehicleCategoryId: z.string().min(1, "Vehicle category is required"),
	price: z.coerce
		.number()
		.min(0, "Price must be positive")
		.max(10000, "Price cannot exceed 10000€"),
	isActive: z.boolean().default(true),
});

const updateTimeBucketSchema = z.object({
	durationHours: z.coerce.number().int().min(1).max(24).optional(),
	vehicleCategoryId: z.string().min(1).optional(),
	price: z.coerce.number().min(0).max(10000).optional(),
	isActive: z.boolean().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const timeBucketsRouter = new Hono()
	.basePath("/pricing/time-buckets")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/time-buckets/stats - Get summary statistics
	// -------------------------------------------------------------------------
	.get(
		"/stats",
		describeRoute({
			summary: "Get time bucket statistics",
			description: "Get counts of active and total time buckets",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			// Get pricing settings to find pricingSettingsId
			const pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				return c.json({
					active: 0,
					total: 0,
					byCategory: [],
				});
			}

			const [active, total, byCategory] = await Promise.all([
				db.madTimeBucket.count({
					where: {
						pricingSettingsId: pricingSettings.id,
						isActive: true,
					},
				}),
				db.madTimeBucket.count({
					where: {
						pricingSettingsId: pricingSettings.id,
					},
				}),
				db.madTimeBucket.groupBy({
					by: ["vehicleCategoryId"],
					where: {
						pricingSettingsId: pricingSettings.id,
						isActive: true,
					},
					_count: true,
				}),
			]);

			return c.json({
				active,
				total,
				byCategory: byCategory.map((g: { vehicleCategoryId: string; _count: number }) => ({
					vehicleCategoryId: g.vehicleCategoryId,
					count: g._count,
				})),
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/time-buckets - List all time buckets
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listTimeBucketsSchema),
		describeRoute({
			summary: "List time buckets",
			description: "Get a paginated list of MAD time buckets for the current organization",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, vehicleCategoryId, isActive } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Get pricing settings
			const pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				return c.json({
					data: [],
					meta: { page, limit, total: 0, totalPages: 0 },
				});
			}

			const where = {
				pricingSettingsId: pricingSettings.id,
				...(vehicleCategoryId && { vehicleCategoryId }),
				...(isActive !== undefined && { isActive: isActive === "true" }),
			};

			const [buckets, total] = await Promise.all([
				db.madTimeBucket.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ vehicleCategoryId: "asc" }, { durationHours: "asc" }],
					include: {
						vehicleCategory: {
							select: { id: true, name: true, code: true },
						},
					},
				}),
				db.madTimeBucket.count({ where }),
			]);

			return c.json({
				data: buckets.map(transformTimeBucket),
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
	// GET /api/vtc/pricing/time-buckets/:id - Get single time bucket
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			summary: "Get time bucket",
			description: "Get a single time bucket by ID",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get pricing settings
			const pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			const bucket = await db.madTimeBucket.findFirst({
				where: {
					id,
					pricingSettingsId: pricingSettings.id,
				},
				include: {
					vehicleCategory: {
						select: { id: true, name: true, code: true },
					},
				},
			});

			if (!bucket) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			return c.json(transformTimeBucket(bucket));
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/pricing/time-buckets - Create time bucket
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createTimeBucketSchema),
		describeRoute({
			summary: "Create time bucket",
			description: "Create a new MAD time bucket",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Get or create pricing settings
			let pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				// Create default pricing settings
				pricingSettings = await db.organizationPricingSettings.create({
					data: {
						organizationId,
						baseRatePerKm: 2.5,
						baseRatePerHour: 45,
						defaultMarginPercent: 25,
						minimumFare: 30,
					},
				});
			}

			// Validate vehicle category exists and belongs to organization
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
			});

			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			// Check for duplicate (same duration + vehicle category)
			const existing = await db.madTimeBucket.findFirst({
				where: {
					pricingSettingsId: pricingSettings.id,
					durationHours: data.durationHours,
					vehicleCategoryId: data.vehicleCategoryId,
				},
			});

			if (existing) {
				throw new HTTPException(400, {
					message: `A time bucket for ${data.durationHours}h already exists for this vehicle category`,
				});
			}

			const bucket = await db.madTimeBucket.create({
				data: {
					organizationId,
					pricingSettingsId: pricingSettings.id,
					durationHours: data.durationHours,
					vehicleCategoryId: data.vehicleCategoryId,
					price: data.price,
					isActive: data.isActive,
				},
				include: {
					vehicleCategory: {
						select: { id: true, name: true, code: true },
					},
				},
			});

			return c.json(transformTimeBucket(bucket), 201);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/pricing/time-buckets/:id - Update time bucket
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		validator("json", updateTimeBucketSchema),
		describeRoute({
			summary: "Update time bucket",
			description: "Update an existing time bucket",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Get pricing settings
			const pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			// Check if bucket exists
			const existing = await db.madTimeBucket.findFirst({
				where: {
					id,
					pricingSettingsId: pricingSettings.id,
				},
			});

			if (!existing) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			// If changing duration or category, check for duplicates
			if (data.durationHours !== undefined || data.vehicleCategoryId !== undefined) {
				const newDuration = data.durationHours ?? existing.durationHours;
				const newCategory = data.vehicleCategoryId ?? existing.vehicleCategoryId;

				const duplicate = await db.madTimeBucket.findFirst({
					where: {
						pricingSettingsId: pricingSettings.id,
						durationHours: newDuration,
						vehicleCategoryId: newCategory,
						id: { not: id },
					},
				});

				if (duplicate) {
					throw new HTTPException(400, {
						message: `A time bucket for ${newDuration}h already exists for this vehicle category`,
					});
				}
			}

			// Validate vehicle category if changing
			if (data.vehicleCategoryId) {
				const vehicleCategory = await db.vehicleCategory.findFirst({
					where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
				});

				if (!vehicleCategory) {
					throw new HTTPException(400, {
						message: "Vehicle category not found",
					});
				}
			}

			const bucket = await db.madTimeBucket.update({
				where: { id },
				data: {
					...(data.durationHours !== undefined && { durationHours: data.durationHours }),
					...(data.vehicleCategoryId !== undefined && { vehicleCategoryId: data.vehicleCategoryId }),
					...(data.price !== undefined && { price: data.price }),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
				include: {
					vehicleCategory: {
						select: { id: true, name: true, code: true },
					},
				},
			});

			return c.json(transformTimeBucket(bucket));
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/pricing/time-buckets/:id - Delete time bucket
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete time bucket",
			description: "Delete a time bucket",
			tags: ["VTC - Time Buckets"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get pricing settings
			const pricingSettings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!pricingSettings) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			// Check if bucket exists
			const existing = await db.madTimeBucket.findFirst({
				where: {
					id,
					pricingSettingsId: pricingSettings.id,
				},
			});

			if (!existing) {
				throw new HTTPException(404, { message: "Time bucket not found" });
			}

			await db.madTimeBucket.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	);

export default timeBucketsRouter;
