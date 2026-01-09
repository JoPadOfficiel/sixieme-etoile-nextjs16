/**
 * Optional Fees API Routes
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 *
 * Provides endpoints for:
 * - CRUD operations on optional fees
 * - Statistics for summary cards
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
 * Transform optional fee for JSON response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformOptionalFee = (fee: any) => ({
	id: fee.id,
	name: fee.name,
	description: fee.description,
	amountType: fee.amountType,
	amount: decimalToNumber(fee.amount),
	isTaxable: fee.isTaxable,
	vatRate: decimalToNumber(fee.vatRate),
	autoApplyRules: fee.autoApplyRules,
	isActive: fee.isActive,
	vehicleCategoryIds: fee.vehicleCategories?.map((c: any) => c.id) ?? [],
	vehicleCategoryNames: fee.vehicleCategories?.map((c: any) => c.name) ?? [],
	createdAt: fee.createdAt.toISOString(),
	updatedAt: fee.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

const autoApplyRuleSchema = z.object({
	type: z.enum([
		"AIRPORT_PICKUP",
		"AIRPORT_DROPOFF",
		"BAGGAGE_OVER_CAPACITY",
		"NIGHT_SERVICE",
		"CUSTOM",
	]),
	condition: z.string().optional(),
});

const listOptionalFeesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	type: z.enum(["all", "FIXED", "PERCENTAGE"]).optional(),
	status: z.enum(["all", "active", "inactive"]).optional(),
	search: z.string().optional(),
});

const createOptionalFeeSchema = z.object({
	name: z.string().min(1, "Name is required").max(100, "Name too long"),
	description: z.string().max(500, "Description too long").optional().nullable(),
	amountType: z.enum(["FIXED", "PERCENTAGE"]),
	amount: z.coerce.number().positive("Amount must be positive"),
	isTaxable: z.boolean().default(true),
	vatRate: z.coerce
		.number()
		.min(0, "VAT rate must be at least 0")
		.max(100, "VAT rate cannot exceed 100")
		.default(20),
	autoApplyRules: z.array(autoApplyRuleSchema).optional().nullable(),
	isActive: z.boolean().default(true),
	vehicleCategoryIds: z.array(z.string()).optional(),
});

const updateOptionalFeeSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	amountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
	amount: z.coerce.number().positive().optional(),
	isTaxable: z.boolean().optional(),
	vatRate: z.coerce.number().min(0).max(100).optional(),
	autoApplyRules: z.array(autoApplyRuleSchema).optional().nullable(),
	isActive: z.boolean().optional(),
	vehicleCategoryIds: z.array(z.string()).optional(),
});

// ============================================================================
// Router
// ============================================================================

export const optionalFeesRouter = new Hono()
	.basePath("/pricing/optional-fees")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/optional-fees/stats - Get summary statistics
	// -------------------------------------------------------------------------
	.get(
		"/stats",
		describeRoute({
			summary: "Get optional fee statistics",
			description:
				"Get counts of fixed, percentage, taxable, and total active optional fees",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			const [fixed, percentage, taxable, totalActive] = await Promise.all([
				// Fixed fees count
				db.optionalFee.count({
					where: withTenantFilter(
						{
							amountType: AmountType.FIXED,
						},
						organizationId
					),
				}),
				// Percentage fees count
				db.optionalFee.count({
					where: withTenantFilter(
						{
							amountType: AmountType.PERCENTAGE,
						},
						organizationId
					),
				}),
				// Taxable fees count
				db.optionalFee.count({
					where: withTenantFilter(
						{
							isTaxable: true,
						},
						organizationId
					),
				}),
				// Total active fees count
				db.optionalFee.count({
					where: withTenantFilter(
						{
							isActive: true,
						},
						organizationId
					),
				}),
			]);

			return c.json({
				fixed,
				percentage,
				taxable,
				totalActive,
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /api/vtc/pricing/optional-fees - List all optional fees
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listOptionalFeesSchema),
		describeRoute({
			summary: "List optional fees",
			description:
				"Get a paginated list of optional fees for the current organization",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, type, status, search } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build type filter
			let typeFilter = {};
			if (type && type !== "all") {
				typeFilter = { amountType: type as AmountType };
			}

			// Build status filter
			let statusFilter = {};
			if (status === "active") {
				statusFilter = { isActive: true };
			} else if (status === "inactive") {
				statusFilter = { isActive: false };
			}

			const where = withTenantFilter(
				{
					...typeFilter,
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

			const [fees, total] = await Promise.all([
				db.optionalFee.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ name: "asc" }],
					include: {
						vehicleCategories: {
							select: { id: true, name: true },
						},
					},
				}),
				db.optionalFee.count({ where }),
			]);

			return c.json({
				data: fees.map(transformOptionalFee),
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
	// GET /api/vtc/pricing/optional-fees/:id - Get single optional fee
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			summary: "Get optional fee",
			description: "Get a single optional fee by ID",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const fee = await db.optionalFee.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					vehicleCategories: {
						select: { id: true, name: true },
					},
				},
			});

			if (!fee) {
				throw new HTTPException(404, {
					message: "Optional fee not found",
				});
			}

			return c.json(transformOptionalFee(fee));
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/pricing/optional-fees - Create optional fee
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createOptionalFeeSchema),
		describeRoute({
			summary: "Create optional fee",
			description: "Create a new optional fee",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const createdFee = await db.optionalFee.create({
				data: withTenantCreate(
					{
						name: data.name,
						description: data.description ?? null,
						amountType: data.amountType as AmountType,
						amount: data.amount,
						isTaxable: data.isTaxable,
						vatRate: data.vatRate,
						autoApplyRules: data.autoApplyRules
							? (data.autoApplyRules as Prisma.InputJsonValue)
							: Prisma.JsonNull,
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
			});

			// Refetch with vehicleCategories to include them in response
			const fee = await db.optionalFee.findUnique({
				where: { id: createdFee.id },
				include: {
					vehicleCategories: {
						select: { id: true, name: true },
					},
				},
			});

			return c.json(transformOptionalFee(fee), 201);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/pricing/optional-fees/:id - Update optional fee
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		validator("json", updateOptionalFeeSchema),
		describeRoute({
			summary: "Update optional fee",
			description: "Update an existing optional fee",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if fee exists
			const existing = await db.optionalFee.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Optional fee not found",
				});
			}

			// Build update data with proper type handling
			const updateData: Prisma.OptionalFeeUpdateInput = {};
			if (data.name !== undefined) updateData.name = data.name;
			if (data.description !== undefined) updateData.description = data.description;
			if (data.amountType !== undefined) updateData.amountType = data.amountType as AmountType;
			if (data.amount !== undefined) updateData.amount = data.amount;
			if (data.isTaxable !== undefined) updateData.isTaxable = data.isTaxable;
			if (data.vatRate !== undefined) updateData.vatRate = data.vatRate;
			if (data.autoApplyRules !== undefined) {
				updateData.autoApplyRules = data.autoApplyRules
					? (data.autoApplyRules as Prisma.InputJsonValue)
					: Prisma.JsonNull;
			}
			if (data.isActive !== undefined) updateData.isActive = data.isActive;
			if (data.vehicleCategoryIds !== undefined) {
				updateData.vehicleCategories = {
					set: data.vehicleCategoryIds.map((id) => ({ id })),
				};
			}

			const fee = await db.optionalFee.update({
				where: withTenantId(id, organizationId),
				data: updateData,
				include: {
					vehicleCategories: {
						select: { id: true, name: true },
					},
				},
			});

			return c.json(transformOptionalFee(fee));
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/pricing/optional-fees/:id - Delete optional fee
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete optional fee",
			description: "Delete an optional fee",
			tags: ["VTC - Optional Fees"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if fee exists
			const existing = await db.optionalFee.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Optional fee not found",
				});
			}

			await db.optionalFee.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		}
	);

export default optionalFeesRouter;
