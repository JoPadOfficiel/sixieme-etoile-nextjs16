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

// Validation schemas
const createVehicleCategorySchema = z.object({
	name: z.string().min(1).max(100),
	code: z.string().min(1).max(20),
	regulatoryCategory: z.enum(["LIGHT", "HEAVY"]).default("LIGHT"),
	maxPassengers: z.number().int().positive(),
	maxLuggageVolume: z.number().int().positive().optional().nullable(),
	priceMultiplier: z.number().positive().default(1.0),
	defaultRatePerKm: z.number().positive().optional().nullable(),
	defaultRatePerHour: z.number().positive().optional().nullable(),
	description: z.string().optional().nullable(),
	isActive: z.boolean().default(true),
});

const updateVehicleCategorySchema = createVehicleCategorySchema.partial();

const listVehicleCategoriesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	regulatoryCategory: z.enum(["LIGHT", "HEAVY"]).optional(),
	isActive: z.enum(["true", "false"]).optional(),
});

export const vehicleCategoriesRouter = new Hono()
	.basePath("/vehicle-categories")
	.use("*", organizationMiddleware)

	// List vehicle categories
	.get(
		"/",
		validator("query", listVehicleCategoriesSchema),
		describeRoute({
			summary: "List vehicle categories",
			description:
				"Get a paginated list of vehicle categories for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, regulatoryCategory, isActive } =
				c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(regulatoryCategory && { regulatoryCategory }),
					...(isActive !== undefined && { isActive: isActive === "true" }),
				},
				organizationId,
			);

			const [categories, total] = await Promise.all([
				db.vehicleCategory.findMany({
					where,
					skip,
					take: limit,
					orderBy: { name: "asc" },
					include: {
						_count: {
							select: {
								vehicles: true,
							},
						},
					},
				}),
				db.vehicleCategory.count({ where }),
			]);

			return c.json({
				data: categories,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single vehicle category
	.get(
		"/:id",
		describeRoute({
			summary: "Get vehicle category",
			description: "Get a single vehicle category by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const category = await db.vehicleCategory.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			if (!category) {
				throw new HTTPException(404, {
					message: "Vehicle category not found",
				});
			}

			return c.json(category);
		},
	)

	// Create vehicle category
	.post(
		"/",
		validator("json", createVehicleCategorySchema),
		describeRoute({
			summary: "Create vehicle category",
			description: "Create a new vehicle category in the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Check for duplicate code within organization
			const existing = await db.vehicleCategory.findFirst({
				where: withTenantFilter({ code: data.code }, organizationId),
			});

			if (existing) {
				throw new HTTPException(400, {
					message: "A vehicle category with this code already exists",
				});
			}

			const category = await db.vehicleCategory.create({
				data: withTenantCreate(data, organizationId),
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			return c.json(category, 201);
		},
	)

	// Update vehicle category
	.patch(
		"/:id",
		validator("json", updateVehicleCategorySchema),
		describeRoute({
			summary: "Update vehicle category",
			description: "Update an existing vehicle category",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.vehicleCategory.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Vehicle category not found",
				});
			}

			// Check for duplicate code if code is being updated
			if (data.code && data.code !== existing.code) {
				const duplicate = await db.vehicleCategory.findFirst({
					where: withTenantFilter(
						{
							code: data.code,
							id: { not: id },
						},
						organizationId,
					),
				});

				if (duplicate) {
					throw new HTTPException(400, {
						message: "A vehicle category with this code already exists",
					});
				}
			}

			const category = await db.vehicleCategory.update({
				where: { id },
				data,
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			return c.json(category);
		},
	)

	// Delete vehicle category
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete vehicle category",
			description:
				"Delete a vehicle category by ID. Cannot delete if vehicles are linked.",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.vehicleCategory.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Vehicle category not found",
				});
			}

			if (existing._count.vehicles > 0) {
				throw new HTTPException(400, {
					message:
						"Cannot delete vehicle category with linked vehicles. Remove or reassign vehicles first.",
				});
			}

			await db.vehicleCategory.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
