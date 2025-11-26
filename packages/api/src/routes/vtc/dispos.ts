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

// Helper to convert Prisma Decimal to number for JSON serialization
const decimalToNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) return null;
	return Number(value);
};

// Transform dispo to convert Decimals to numbers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformDispo = (dispo: any) => ({
	...dispo,
	includedDurationHours: decimalToNumber(dispo.includedDurationHours),
	includedDistanceKm: decimalToNumber(dispo.includedDistanceKm),
	basePrice: decimalToNumber(dispo.basePrice),
	overageRatePerKm: decimalToNumber(dispo.overageRatePerKm),
	overageRatePerHour: decimalToNumber(dispo.overageRatePerHour),
	vehicleCategory: dispo.vehicleCategory
		? {
				...dispo.vehicleCategory,
				priceMultiplier: decimalToNumber(dispo.vehicleCategory.priceMultiplier),
				defaultRatePerKm: decimalToNumber(
					dispo.vehicleCategory.defaultRatePerKm,
				),
				defaultRatePerHour: decimalToNumber(
					dispo.vehicleCategory.defaultRatePerHour,
				),
			}
		: null,
});

// Validation schemas
const createDispoSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	vehicleCategoryId: z.string().min(1, "Vehicle category is required"),
	includedDurationHours: z.coerce
		.number()
		.positive("Included duration must be positive"),
	includedDistanceKm: z.coerce
		.number()
		.positive("Included distance must be positive"),
	basePrice: z.coerce.number().positive("Base price must be positive"),
	overageRatePerKm: z.coerce
		.number()
		.nonnegative("Overage rate per km must be non-negative"),
	overageRatePerHour: z.coerce
		.number()
		.nonnegative("Overage rate per hour must be non-negative"),
	isActive: z.boolean().default(true),
});

const updateDispoSchema = createDispoSchema.partial();

const listDisposSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	vehicleCategoryId: z.string().optional(),
	isActive: z.enum(["true", "false"]).optional(),
	search: z.string().optional(),
});

export const disposRouter = new Hono()
	.basePath("/pricing/dispos")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// List dispos
	.get(
		"/",
		validator("query", listDisposSchema),
		describeRoute({
			summary: "List dispo packages",
			description:
				"Get a paginated list of dispo packages for the current organization",
			tags: ["VTC - Dispos"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, vehicleCategoryId, isActive, search } =
				c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter
			const where = withTenantFilter(
				{
					...(vehicleCategoryId && { vehicleCategoryId }),
					...(isActive !== undefined && {
						isActive: isActive === "true",
					}),
					...(search && {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{
								description: { contains: search, mode: "insensitive" as const },
							},
						],
					}),
				},
				organizationId,
			);

			const [dispos, total] = await Promise.all([
				db.dispoPackage.findMany({
					where,
					skip,
					take: limit,
					orderBy: { name: "asc" },
					include: {
						vehicleCategory: true,
					},
				}),
				db.dispoPackage.count({ where }),
			]);

			return c.json({
				data: dispos.map(transformDispo),
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single dispo
	.get(
		"/:id",
		describeRoute({
			summary: "Get dispo package",
			description: "Get a single dispo package by ID",
			tags: ["VTC - Dispos"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const dispo = await db.dispoPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					vehicleCategory: true,
				},
			});

			if (!dispo) {
				throw new HTTPException(404, { message: "Dispo package not found" });
			}

			return c.json(transformDispo(dispo));
		},
	)

	// Create dispo
	.post(
		"/",
		validator("json", createDispoSchema),
		describeRoute({
			summary: "Create dispo package",
			description: "Create a new dispo package",
			tags: ["VTC - Dispos"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Validate vehicleCategory
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
			});
			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message:
						"Vehicle category not found or does not belong to this organization",
				});
			}

			const dispo = await db.dispoPackage.create({
				data: withTenantCreate(
					{
						name: data.name,
						description: data.description,
						vehicleCategoryId: data.vehicleCategoryId,
						includedDurationHours: data.includedDurationHours,
						includedDistanceKm: data.includedDistanceKm,
						basePrice: data.basePrice,
						overageRatePerKm: data.overageRatePerKm,
						overageRatePerHour: data.overageRatePerHour,
						isActive: data.isActive,
					},
					organizationId,
				),
				include: {
					vehicleCategory: true,
				},
			});

			return c.json(transformDispo(dispo), 201);
		},
	)

	// Update dispo
	.patch(
		"/:id",
		validator("json", updateDispoSchema),
		describeRoute({
			summary: "Update dispo package",
			description: "Update an existing dispo package",
			tags: ["VTC - Dispos"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if dispo exists
			const existingDispo = await db.dispoPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingDispo) {
				throw new HTTPException(404, { message: "Dispo package not found" });
			}

			// Validate vehicleCategory if provided
			if (data.vehicleCategoryId) {
				const vehicleCategory = await db.vehicleCategory.findFirst({
					where: withTenantFilter(
						{ id: data.vehicleCategoryId },
						organizationId,
					),
				});
				if (!vehicleCategory) {
					throw new HTTPException(400, {
						message:
							"Vehicle category not found or does not belong to this organization",
					});
				}
			}

			const dispo = await db.dispoPackage.update({
				where: withTenantId(id, organizationId),
				data: {
					...(data.name !== undefined && { name: data.name }),
					...(data.description !== undefined && {
						description: data.description,
					}),
					...(data.vehicleCategoryId !== undefined && {
						vehicleCategoryId: data.vehicleCategoryId,
					}),
					...(data.includedDurationHours !== undefined && {
						includedDurationHours: data.includedDurationHours,
					}),
					...(data.includedDistanceKm !== undefined && {
						includedDistanceKm: data.includedDistanceKm,
					}),
					...(data.basePrice !== undefined && { basePrice: data.basePrice }),
					...(data.overageRatePerKm !== undefined && {
						overageRatePerKm: data.overageRatePerKm,
					}),
					...(data.overageRatePerHour !== undefined && {
						overageRatePerHour: data.overageRatePerHour,
					}),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
				include: {
					vehicleCategory: true,
				},
			});

			return c.json(transformDispo(dispo));
		},
	)

	// Delete dispo
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete dispo package",
			description: "Delete a dispo package",
			tags: ["VTC - Dispos"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if dispo exists
			const existingDispo = await db.dispoPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingDispo) {
				throw new HTTPException(404, { message: "Dispo package not found" });
			}

			// Note: partnerContractDispoPackages relation check would require regenerating Prisma client
			// For now, we allow deletion - the DB will enforce FK constraints if needed

			await db.dispoPackage.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		},
	);
