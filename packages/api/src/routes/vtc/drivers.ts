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
import {
	getDriverCounters,
	getDriverCounterByRegime,
	recordDrivingActivity,
	getRecentAuditLogs,
	getComplianceSnapshot,
	type RegulatoryCategory,
} from "../../services/rse-counter";

// Validation schemas
const createDriverSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	email: z.string().email().optional().nullable(),
	phone: z.string().max(30).optional().nullable(),
	employmentStatus: z
		.enum(["EMPLOYEE", "CONTRACTOR", "FREELANCE"])
		.default("EMPLOYEE"),
	hourlyCost: z.number().positive().optional().nullable(),
	isActive: z.boolean().default(true),
	notes: z.string().max(1000).optional().nullable(),
});

const updateDriverSchema = createDriverSchema.partial();

const listDriversSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	isActive: z
		.string()
		.optional()
		.transform((val) => {
			if (val === "true") return true;
			if (val === "false") return false;
			return undefined;
		}),
	licenseCategoryId: z.string().optional(),
	search: z.string().optional(),
});

const createDriverLicenseSchema = z.object({
	licenseCategoryId: z.string().min(1),
	licenseNumber: z.string().min(1).max(50),
	validFrom: z.coerce.date(),
	validTo: z.coerce.date().optional().nullable(),
});

const updateDriverLicenseSchema = createDriverLicenseSchema.partial().omit({
	licenseCategoryId: true,
});

export const driversRouter = new Hono()
	.basePath("/drivers")
	.use("*", organizationMiddleware)

	// List drivers
	.get(
		"/",
		validator("query", listDriversSchema),
		describeRoute({
			summary: "List drivers",
			description:
				"Get a paginated list of drivers for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, isActive, licenseCategoryId, search } =
				c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause
			const baseWhere: Record<string, unknown> = {};

			if (isActive !== undefined) {
				baseWhere.isActive = isActive;
			}

			if (licenseCategoryId) {
				baseWhere.driverLicenses = {
					some: {
						licenseCategoryId,
					},
				};
			}

			if (search) {
				baseWhere.OR = [
					{ firstName: { contains: search, mode: "insensitive" } },
					{ lastName: { contains: search, mode: "insensitive" } },
					{ email: { contains: search, mode: "insensitive" } },
				];
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [drivers, total] = await Promise.all([
				db.driver.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
					include: {
						driverLicenses: {
							include: {
								licenseCategory: true,
							},
						},
					},
				}),
				db.driver.count({ where }),
			]);

			return c.json({
				data: drivers,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// Get single driver
	.get(
		"/:id",
		describeRoute({
			summary: "Get driver",
			description: "Get a single driver by ID with all licenses",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const driver = await db.driver.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					driverLicenses: {
						include: {
							licenseCategory: {
								include: {
									organizationRules: {
										where: { organizationId },
									},
								},
							},
						},
					},
				},
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			return c.json(driver);
		}
	)

	// Create driver
	.post(
		"/",
		validator("json", createDriverSchema),
		describeRoute({
			summary: "Create driver",
			description: "Create a new driver in the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const driver = await db.driver.create({
				data: withTenantCreate(data, organizationId),
				include: {
					driverLicenses: {
						include: {
							licenseCategory: true,
						},
					},
				},
			});

			return c.json(driver, 201);
		}
	)

	// Update driver
	.patch(
		"/:id",
		validator("json", updateDriverSchema),
		describeRoute({
			summary: "Update driver",
			description: "Update an existing driver",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.driver.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const driver = await db.driver.update({
				where: { id },
				data,
				include: {
					driverLicenses: {
						include: {
							licenseCategory: true,
						},
					},
				},
			});

			return c.json(driver);
		}
	)

	// Delete driver
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete driver",
			description: "Delete a driver by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.driver.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			// Delete associated licenses first
			await db.driverLicense.deleteMany({
				where: { driverId: id },
			});

			await db.driver.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	)

	// Add license to driver
	.post(
		"/:id/licenses",
		validator("json", createDriverLicenseSchema),
		describeRoute({
			summary: "Add license to driver",
			description: "Add a new license to an existing driver",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const data = c.req.valid("json");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			// Verify license category exists and belongs to this organization
			const category = await db.licenseCategory.findFirst({
				where: withTenantId(data.licenseCategoryId, organizationId),
			});

			if (!category) {
				throw new HTTPException(400, {
					message: "License category not found",
				});
			}

			// Check if driver already has this license category
			const existingLicense = await db.driverLicense.findFirst({
				where: {
					driverId,
					licenseCategoryId: data.licenseCategoryId,
				},
			});

			if (existingLicense) {
				throw new HTTPException(400, {
					message: `Driver already has a license for category "${category.code}"`,
				});
			}

			// Validate dates
			if (data.validTo && data.validFrom > data.validTo) {
				throw new HTTPException(400, {
					message: "validFrom must be before validTo",
				});
			}

			const license = await db.driverLicense.create({
				data: {
					driverId,
					licenseCategoryId: data.licenseCategoryId,
					licenseNumber: data.licenseNumber,
					validFrom: data.validFrom,
					validTo: data.validTo,
				},
				include: {
					licenseCategory: true,
				},
			});

			return c.json(license, 201);
		}
	)

	// Update driver license
	.patch(
		"/:id/licenses/:licenseId",
		validator("json", updateDriverLicenseSchema),
		describeRoute({
			summary: "Update driver license",
			description: "Update an existing driver license",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const licenseId = c.req.param("licenseId");
			const data = c.req.valid("json");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			// Verify license exists and belongs to this driver
			const existingLicense = await db.driverLicense.findFirst({
				where: {
					id: licenseId,
					driverId,
				},
			});

			if (!existingLicense) {
				throw new HTTPException(404, {
					message: "License not found",
				});
			}

			// Validate dates if both are provided
			const validFrom = data.validFrom ?? existingLicense.validFrom;
			const validTo = data.validTo ?? existingLicense.validTo;
			if (validTo && validFrom > validTo) {
				throw new HTTPException(400, {
					message: "validFrom must be before validTo",
				});
			}

			const license = await db.driverLicense.update({
				where: { id: licenseId },
				data,
				include: {
					licenseCategory: true,
				},
			});

			return c.json(license);
		}
	)

	// Remove license from driver
	.delete(
		"/:id/licenses/:licenseId",
		describeRoute({
			summary: "Remove license from driver",
			description: "Remove a license from a driver",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const licenseId = c.req.param("licenseId");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			// Verify license exists and belongs to this driver
			const existingLicense = await db.driverLicense.findFirst({
				where: {
					id: licenseId,
					driverId,
				},
			});

			if (!existingLicense) {
				throw new HTTPException(404, {
					message: "License not found",
				});
			}

			await db.driverLicense.delete({
				where: { id: licenseId },
			});

			return c.json({ success: true });
		}
	)

	// ============================================================================
	// RSE Counters Endpoints (Story 5.5)
	// ============================================================================

	// Get RSE counters for a driver on a specific date
	.get(
		"/:id/rse-counters",
		validator(
			"query",
			z.object({
				date: z.string().optional(), // ISO date string, defaults to today
			})
		),
		describeRoute({
			summary: "Get driver RSE counters",
			description:
				"Get RSE counters (driving time, amplitude, breaks) for a driver on a specific date",
			tags: ["VTC - Fleet", "VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const { date: dateStr } = c.req.valid("query");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const date = dateStr ? new Date(dateStr) : new Date();
			const counters = await getDriverCounters(db, organizationId, driverId, date);

			return c.json({
				date: date.toISOString().split("T")[0],
				counters,
			});
		}
	)

	// Get RSE counter for a specific regime
	.get(
		"/:id/rse-counters/:regime",
		validator(
			"query",
			z.object({
				date: z.string().optional(),
			})
		),
		describeRoute({
			summary: "Get driver RSE counter by regime",
			description:
				"Get RSE counter for a specific regulatory regime (LIGHT or HEAVY)",
			tags: ["VTC - Fleet", "VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const regime = c.req.param("regime").toUpperCase() as RegulatoryCategory;
			const { date: dateStr } = c.req.valid("query");

			if (regime !== "LIGHT" && regime !== "HEAVY") {
				throw new HTTPException(400, {
					message: "Invalid regime. Must be LIGHT or HEAVY",
				});
			}

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const date = dateStr ? new Date(dateStr) : new Date();
			const counter = await getDriverCounterByRegime(
				db,
				organizationId,
				driverId,
				date,
				regime
			);

			return c.json({
				date: date.toISOString().split("T")[0],
				regime,
				counter,
			});
		}
	)

	// Record driving activity
	.post(
		"/:id/rse-counters/record",
		validator(
			"json",
			z.object({
				date: z.string().optional(), // ISO date string, defaults to today
				regulatoryCategory: z.enum(["LIGHT", "HEAVY"]),
				licenseCategoryId: z.string().optional(),
				drivingMinutes: z.number().int().min(0),
				amplitudeMinutes: z.number().int().min(0).optional(),
				breakMinutes: z.number().int().min(0).optional(),
				workStartTime: z.string().datetime().optional(),
				workEndTime: z.string().datetime().optional(),
			})
		),
		describeRoute({
			summary: "Record driving activity",
			description:
				"Record driving activity for a driver, updating RSE counters",
			tags: ["VTC - Fleet", "VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const data = c.req.valid("json");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const date = data.date ? new Date(data.date) : new Date();

			const counter = await recordDrivingActivity(db, {
				organizationId,
				driverId,
				date,
				regulatoryCategory: data.regulatoryCategory,
				licenseCategoryId: data.licenseCategoryId,
				drivingMinutes: data.drivingMinutes,
				amplitudeMinutes: data.amplitudeMinutes,
				breakMinutes: data.breakMinutes,
				workStartTime: data.workStartTime ? new Date(data.workStartTime) : undefined,
				workEndTime: data.workEndTime ? new Date(data.workEndTime) : undefined,
			});

			return c.json(counter, 201);
		}
	)

	// Get compliance snapshot for a driver
	.get(
		"/:id/compliance-snapshot",
		validator(
			"query",
			z.object({
				date: z.string().optional(),
			})
		),
		describeRoute({
			summary: "Get driver compliance snapshot",
			description:
				"Get a compliance snapshot including counters, limits, and status for both LIGHT and HEAVY regimes",
			tags: ["VTC - Fleet", "VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const { date: dateStr } = c.req.valid("query");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const date = dateStr ? new Date(dateStr) : new Date();
			const snapshot = await getComplianceSnapshot(db, organizationId, driverId, date);

			return c.json(snapshot);
		}
	)

	// Get compliance audit logs for a driver
	.get(
		"/:id/compliance-logs",
		validator(
			"query",
			z.object({
				limit: z.coerce.number().int().positive().max(100).default(10),
			})
		),
		describeRoute({
			summary: "Get driver compliance audit logs",
			description:
				"Get recent compliance audit logs for a driver (decisions, violations, warnings)",
			tags: ["VTC - Fleet", "VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const driverId = c.req.param("id");
			const { limit } = c.req.valid("query");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const logs = await getRecentAuditLogs(db, organizationId, driverId, limit);

			return c.json({
				data: logs,
				meta: {
					limit,
					count: logs.length,
				},
			});
		}
	);
