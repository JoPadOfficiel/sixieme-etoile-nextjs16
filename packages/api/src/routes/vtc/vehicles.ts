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
const createVehicleSchema = z.object({
	vehicleCategoryId: z.string().min(1),
	operatingBaseId: z.string().min(1),
	registrationNumber: z.string().min(1).max(20),
	internalName: z.string().max(100).optional().nullable(),
	vin: z.string().max(20).optional().nullable(),
	passengerCapacity: z.number().int().positive(),
	luggageCapacity: z.number().int().optional().nullable(),
	consumptionLPer100Km: z.number().positive().optional().nullable(),
	averageSpeedKmh: z.number().int().positive().optional().nullable(),
	costPerKm: z.number().positive().optional().nullable(),
	requiredLicenseCategoryId: z.string().optional().nullable(),
	status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE"]).default("ACTIVE"),
	notes: z.string().optional().nullable(),
	// Story 17.14: TCO fields
	purchasePrice: z.number().positive().optional().nullable(),
	expectedLifespanKm: z.number().int().positive().optional().nullable(),
	expectedLifespanYears: z.number().int().positive().max(30).optional().nullable(),
	annualMaintenanceBudget: z.number().nonnegative().optional().nullable(),
	annualInsuranceCost: z.number().nonnegative().optional().nullable(),
	depreciationMethod: z.enum(["LINEAR", "DECLINING_BALANCE"]).optional().nullable(),
	currentOdometerKm: z.number().int().nonnegative().optional().nullable(),
});

const updateVehicleSchema = createVehicleSchema.partial();

const listVehiclesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE"]).optional(),
	vehicleCategoryId: z.string().optional(),
	operatingBaseId: z.string().optional(),
});

export const vehiclesRouter = new Hono()
	.basePath("/vehicles")
	.use("*", organizationMiddleware)

	// List vehicles
	.get(
		"/",
		validator("query", listVehiclesSchema),
		describeRoute({
			summary: "List vehicles",
			description: "Get a paginated list of vehicles for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, status, vehicleCategoryId, operatingBaseId } =
				c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(status && { status }),
					...(vehicleCategoryId && { vehicleCategoryId }),
					...(operatingBaseId && { operatingBaseId }),
				},
				organizationId,
			);

			const [vehicles, total] = await Promise.all([
				db.vehicle.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						vehicleCategory: true,
						operatingBase: true,
						requiredLicenseCategory: true,
					},
				}),
				db.vehicle.count({ where }),
			]);

			return c.json({
				data: vehicles,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single vehicle
	.get(
		"/:id",
		describeRoute({
			summary: "Get vehicle",
			description: "Get a single vehicle by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const vehicle = await db.vehicle.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					vehicleCategory: true,
					operatingBase: true,
					requiredLicenseCategory: true,
				},
			});

			if (!vehicle) {
				throw new HTTPException(404, {
					message: "Vehicle not found",
				});
			}

			return c.json(vehicle);
		},
	)

	// Create vehicle
	.post(
		"/",
		validator("json", createVehicleSchema),
		describeRoute({
			summary: "Create vehicle",
			description: "Create a new vehicle in the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify vehicleCategory belongs to this organization
			const category = await db.vehicleCategory.findFirst({
				where: withTenantId(data.vehicleCategoryId, organizationId),
			});

			if (!category) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			// Verify operatingBase belongs to this organization
			const base = await db.operatingBase.findFirst({
				where: withTenantId(data.operatingBaseId, organizationId),
			});

			if (!base) {
				throw new HTTPException(400, {
					message: "Operating base not found",
				});
			}

			// Verify licenseCategory if provided
			if (data.requiredLicenseCategoryId) {
				const license = await db.licenseCategory.findFirst({
					where: withTenantId(data.requiredLicenseCategoryId, organizationId),
				});

				if (!license) {
					throw new HTTPException(400, {
						message: "License category not found",
					});
				}
			}

			const vehicle = await db.vehicle.create({
				data: withTenantCreate(data, organizationId),
				include: {
					vehicleCategory: true,
					operatingBase: true,
					requiredLicenseCategory: true,
				},
			});

			return c.json(vehicle, 201);
		},
	)

	// Update vehicle
	.patch(
		"/:id",
		validator("json", updateVehicleSchema),
		describeRoute({
			summary: "Update vehicle",
			description: "Update an existing vehicle",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.vehicle.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Vehicle not found",
				});
			}

			// Verify related entities if they're being updated
			if (data.vehicleCategoryId) {
				const category = await db.vehicleCategory.findFirst({
					where: withTenantId(data.vehicleCategoryId, organizationId),
				});
				if (!category) {
					throw new HTTPException(400, {
						message: "Vehicle category not found",
					});
				}
			}

			if (data.operatingBaseId) {
				const base = await db.operatingBase.findFirst({
					where: withTenantId(data.operatingBaseId, organizationId),
				});
				if (!base) {
					throw new HTTPException(400, {
						message: "Operating base not found",
					});
				}
			}

			const vehicle = await db.vehicle.update({
				where: { id },
				data,
				include: {
					vehicleCategory: true,
					operatingBase: true,
					requiredLicenseCategory: true,
				},
			});

			return c.json(vehicle);
		},
	)

	// Delete vehicle
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete vehicle",
			description: "Delete a vehicle by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.vehicle.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Vehicle not found",
				});
			}

			await db.vehicle.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
