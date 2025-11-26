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

// Transform excursion to convert Decimals to numbers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformExcursion = (excursion: any) => ({
	...excursion,
	includedDurationHours: decimalToNumber(excursion.includedDurationHours),
	includedDistanceKm: decimalToNumber(excursion.includedDistanceKm),
	price: decimalToNumber(excursion.price),
	originZone: excursion.originZone
		? {
				...excursion.originZone,
				centerLatitude: decimalToNumber(excursion.originZone.centerLatitude),
				centerLongitude: decimalToNumber(excursion.originZone.centerLongitude),
				radiusKm: decimalToNumber(excursion.originZone.radiusKm),
			}
		: null,
	destinationZone: excursion.destinationZone
		? {
				...excursion.destinationZone,
				centerLatitude: decimalToNumber(
					excursion.destinationZone.centerLatitude,
				),
				centerLongitude: decimalToNumber(
					excursion.destinationZone.centerLongitude,
				),
				radiusKm: decimalToNumber(excursion.destinationZone.radiusKm),
			}
		: null,
	vehicleCategory: excursion.vehicleCategory
		? {
				...excursion.vehicleCategory,
				priceMultiplier: decimalToNumber(
					excursion.vehicleCategory.priceMultiplier,
				),
				defaultRatePerKm: decimalToNumber(
					excursion.vehicleCategory.defaultRatePerKm,
				),
				defaultRatePerHour: decimalToNumber(
					excursion.vehicleCategory.defaultRatePerHour,
				),
			}
		: null,
});

// Validation schemas
const createExcursionSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	originZoneId: z.string().optional().nullable(),
	destinationZoneId: z.string().optional().nullable(),
	vehicleCategoryId: z.string().min(1, "Vehicle category is required"),
	includedDurationHours: z.coerce
		.number()
		.positive("Included duration must be positive"),
	includedDistanceKm: z.coerce
		.number()
		.positive("Included distance must be positive"),
	price: z.coerce.number().positive("Price must be positive"),
	isActive: z.boolean().default(true),
});

const updateExcursionSchema = createExcursionSchema.partial();

const listExcursionsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	originZoneId: z.string().optional(),
	destinationZoneId: z.string().optional(),
	vehicleCategoryId: z.string().optional(),
	isActive: z.enum(["true", "false"]).optional(),
	search: z.string().optional(),
});

export const excursionsRouter = new Hono()
	.basePath("/pricing/excursions")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// List excursions
	.get(
		"/",
		validator("query", listExcursionsSchema),
		describeRoute({
			summary: "List excursion packages",
			description:
				"Get a paginated list of excursion packages for the current organization",
			tags: ["VTC - Excursions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const {
				page,
				limit,
				originZoneId,
				destinationZoneId,
				vehicleCategoryId,
				isActive,
				search,
			} = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter
			const where = withTenantFilter(
				{
					...(originZoneId && { originZoneId }),
					...(destinationZoneId && { destinationZoneId }),
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

			const [excursions, total] = await Promise.all([
				db.excursionPackage.findMany({
					where,
					skip,
					take: limit,
					orderBy: { name: "asc" },
					include: {
						originZone: true,
						destinationZone: true,
						vehicleCategory: true,
					},
				}),
				db.excursionPackage.count({ where }),
			]);

			return c.json({
				data: excursions.map(transformExcursion),
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single excursion
	.get(
		"/:id",
		describeRoute({
			summary: "Get excursion package",
			description: "Get a single excursion package by ID",
			tags: ["VTC - Excursions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const excursion = await db.excursionPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					originZone: true,
					destinationZone: true,
					vehicleCategory: true,
				},
			});

			if (!excursion) {
				throw new HTTPException(404, {
					message: "Excursion package not found",
				});
			}

			return c.json(transformExcursion(excursion));
		},
	)

	// Create excursion
	.post(
		"/",
		validator("json", createExcursionSchema),
		describeRoute({
			summary: "Create excursion package",
			description: "Create a new excursion package",
			tags: ["VTC - Excursions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Validate originZone if provided
			if (data.originZoneId) {
				const originZone = await db.pricingZone.findFirst({
					where: withTenantFilter({ id: data.originZoneId }, organizationId),
				});
				if (!originZone) {
					throw new HTTPException(400, {
						message:
							"Origin zone not found or does not belong to this organization",
					});
				}
			}

			// Validate destinationZone if provided
			if (data.destinationZoneId) {
				const destinationZone = await db.pricingZone.findFirst({
					where: withTenantFilter(
						{ id: data.destinationZoneId },
						organizationId,
					),
				});
				if (!destinationZone) {
					throw new HTTPException(400, {
						message:
							"Destination zone not found or does not belong to this organization",
					});
				}
			}

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

			const excursion = await db.excursionPackage.create({
				data: withTenantCreate(
					{
						name: data.name,
						description: data.description,
						originZoneId: data.originZoneId || null,
						destinationZoneId: data.destinationZoneId || null,
						vehicleCategoryId: data.vehicleCategoryId,
						includedDurationHours: data.includedDurationHours,
						includedDistanceKm: data.includedDistanceKm,
						price: data.price,
						isActive: data.isActive,
					},
					organizationId,
				),
				include: {
					originZone: true,
					destinationZone: true,
					vehicleCategory: true,
				},
			});

			return c.json(transformExcursion(excursion), 201);
		},
	)

	// Update excursion
	.patch(
		"/:id",
		validator("json", updateExcursionSchema),
		describeRoute({
			summary: "Update excursion package",
			description: "Update an existing excursion package",
			tags: ["VTC - Excursions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if excursion exists
			const existingExcursion = await db.excursionPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingExcursion) {
				throw new HTTPException(404, {
					message: "Excursion package not found",
				});
			}

			// Validate originZone if provided
			if (data.originZoneId) {
				const originZone = await db.pricingZone.findFirst({
					where: withTenantFilter({ id: data.originZoneId }, organizationId),
				});
				if (!originZone) {
					throw new HTTPException(400, {
						message:
							"Origin zone not found or does not belong to this organization",
					});
				}
			}

			// Validate destinationZone if provided
			if (data.destinationZoneId) {
				const destinationZone = await db.pricingZone.findFirst({
					where: withTenantFilter(
						{ id: data.destinationZoneId },
						organizationId,
					),
				});
				if (!destinationZone) {
					throw new HTTPException(400, {
						message:
							"Destination zone not found or does not belong to this organization",
					});
				}
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

			const excursion = await db.excursionPackage.update({
				where: withTenantId(id, organizationId),
				data: {
					...(data.name !== undefined && { name: data.name }),
					...(data.description !== undefined && {
						description: data.description,
					}),
					...(data.originZoneId !== undefined && {
						originZoneId: data.originZoneId || null,
					}),
					...(data.destinationZoneId !== undefined && {
						destinationZoneId: data.destinationZoneId || null,
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
					...(data.price !== undefined && { price: data.price }),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
				include: {
					originZone: true,
					destinationZone: true,
					vehicleCategory: true,
				},
			});

			return c.json(transformExcursion(excursion));
		},
	)

	// Delete excursion
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete excursion package",
			description: "Delete an excursion package",
			tags: ["VTC - Excursions"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if excursion exists
			const existingExcursion = await db.excursionPackage.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingExcursion) {
				throw new HTTPException(404, {
					message: "Excursion package not found",
				});
			}

			// Check if excursion is assigned to any partner contracts
			// Note: partnerContractExcursionPackages relation check would require regenerating Prisma client
			// For now, we allow deletion - the DB will enforce FK constraints if needed

			await db.excursionPackage.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		},
	);
