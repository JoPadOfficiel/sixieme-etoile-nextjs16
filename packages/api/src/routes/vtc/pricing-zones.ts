import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

// Helper to convert Prisma Decimal to number for JSON serialization
const decimalToNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) return null;
	return Number(value);
};

// Transform zone to convert Decimals to numbers
// biome-ignore lint/suspicious/noExplicitAny: Prisma returns dynamic types
const transformZone = (zone: any) => ({
	...zone,
	centerLatitude: decimalToNumber(zone.centerLatitude),
	centerLongitude: decimalToNumber(zone.centerLongitude),
	radiusKm: decimalToNumber(zone.radiusKm),
});
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// Validation schemas
const zoneTypeEnum = z.enum(["POLYGON", "RADIUS", "POINT"]);

const creationMethodEnum = z.enum(["DRAW", "POSTAL_CODE", "COORDINATES"]);

const createZoneSchema = z.object({
	name: z.string().min(1).max(255),
	code: z
		.string()
		.min(1)
		.max(50)
		.regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric with underscores"),
	zoneType: zoneTypeEnum.default("POLYGON"),
	geometry: z.any().optional().nullable(), // GeoJSON-like structure
	centerLatitude: z.coerce.number().min(-90).max(90).optional().nullable(),
	centerLongitude: z.coerce.number().min(-180).max(180).optional().nullable(),
	radiusKm: z.coerce.number().positive().optional().nullable(),
	parentZoneId: z.string().optional().nullable(),
	isActive: z.boolean().default(true),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").optional().nullable(),
	// Story 11.2: Postal code zone creation
	postalCodes: z.array(z.string()).optional().default([]),
	creationMethod: creationMethodEnum.optional().nullable(),
});

const updateZoneSchema = createZoneSchema.partial();

const listZonesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	zoneType: zoneTypeEnum.optional(),
	isActive: z.enum(["true", "false"]).optional(),
});

export const pricingZonesRouter = new Hono()
	.basePath("/pricing/zones")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// List zones
	.get(
		"/",
		validator("query", listZonesSchema),
		describeRoute({
			summary: "List pricing zones",
			description: "Get a paginated list of pricing zones for the current organization",
			tags: ["VTC - Pricing Zones"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, search, zoneType, isActive } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter
			const where = withTenantFilter(
				{
					...(search && {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{ code: { contains: search, mode: "insensitive" as const } },
						],
					}),
					...(zoneType && { zoneType }),
					...(isActive !== undefined && {
						isActive: isActive === "true",
					}),
				},
				organizationId,
			);

			const [zones, total] = await Promise.all([
				db.pricingZone.findMany({
					where,
					skip,
					take: limit,
					orderBy: { name: "asc" },
					include: {
						parentZone: {
							select: {
								id: true,
								name: true,
								code: true,
							},
						},
						_count: {
							select: {
								fromRoutes: true,
								toRoutes: true,
								childZones: true,
							},
						},
					},
				}),
				db.pricingZone.count({ where }),
			]);

			// Transform to include routesCount and convert Decimals
			const transformedZones = zones.map((zone) => ({
				...transformZone(zone),
				routesCount: zone._count.fromRoutes + zone._count.toRoutes,
				childZonesCount: zone._count.childZones,
			}));

			return c.json({
				data: transformedZones,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single zone
	.get(
		"/:id",
		describeRoute({
			summary: "Get pricing zone",
			description: "Get a single pricing zone by ID",
			tags: ["VTC - Pricing Zones"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const zone = await db.pricingZone.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					parentZone: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
					childZones: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
					_count: {
						select: {
							fromRoutes: true,
							toRoutes: true,
						},
					},
				},
			});

			if (!zone) {
				throw new HTTPException(404, {
					message: "Pricing zone not found",
				});
			}

			return c.json({
				...transformZone(zone),
				routesCount: zone._count.fromRoutes + zone._count.toRoutes,
			});
		},
	)

	// Create zone
	.post(
		"/",
		validator("json", createZoneSchema),
		describeRoute({
			summary: "Create pricing zone",
			description: "Create a new pricing zone",
			tags: ["VTC - Pricing Zones"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Validate RADIUS type requires radiusKm
			if (data.zoneType === "RADIUS" && !data.radiusKm) {
				throw new HTTPException(400, {
					message: "radiusKm is required for RADIUS zone type",
				});
			}

			// Validate center coordinates
			if (
				(data.centerLatitude !== null && data.centerLongitude === null) ||
				(data.centerLatitude === null && data.centerLongitude !== null)
			) {
				throw new HTTPException(400, {
					message: "Both centerLatitude and centerLongitude must be provided together",
				});
			}

			// Check for duplicate code
			const existingZone = await db.pricingZone.findFirst({
				where: {
					organizationId,
					code: data.code,
				},
			});

			if (existingZone) {
				throw new HTTPException(409, {
					message: `A zone with code "${data.code}" already exists`,
				});
			}

			// Validate parent zone if provided
			if (data.parentZoneId) {
				const parentZone = await db.pricingZone.findFirst({
					where: withTenantId(data.parentZoneId, organizationId),
				});

				if (!parentZone) {
					throw new HTTPException(400, {
						message: "Parent zone not found",
					});
				}
			}

			try {
				const zone = await db.pricingZone.create({
					data: withTenantCreate(
						{
							name: data.name,
							code: data.code,
							zoneType: data.zoneType,
							geometry: data.geometry ?? undefined,
							centerLatitude: data.centerLatitude ?? undefined,
							centerLongitude: data.centerLongitude ?? undefined,
							radiusKm: data.radiusKm ?? undefined,
							parentZoneId: data.parentZoneId ?? undefined,
							isActive: data.isActive,
							color: data.color ?? undefined,
							// Story 11.2: Postal code zone creation
							postalCodes: data.postalCodes ?? [],
							creationMethod: data.creationMethod ?? undefined,
						},
						organizationId,
					),
					include: {
						parentZone: {
							select: {
								id: true,
								name: true,
								code: true,
							},
						},
					},
				});

				return c.json(transformZone(zone), 201);
			} catch (error) {
				console.error("Error creating pricing zone:", error);
				throw new HTTPException(500, {
					message: error instanceof Error ? error.message : "Failed to create zone",
				});
			}
		},
	)

	// Update zone
	.patch(
		"/:id",
		validator("json", updateZoneSchema),
		describeRoute({
			summary: "Update pricing zone",
			description: "Update an existing pricing zone",
			tags: ["VTC - Pricing Zones"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check zone exists
			const existingZone = await db.pricingZone.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existingZone) {
				throw new HTTPException(404, {
					message: "Pricing zone not found",
				});
			}

			// Check for duplicate code if code is being changed
			if (data.code && data.code !== existingZone.code) {
				const duplicateZone = await db.pricingZone.findFirst({
					where: {
						organizationId,
						code: data.code,
						NOT: { id },
					},
				});

				if (duplicateZone) {
					throw new HTTPException(409, {
						message: `A zone with code "${data.code}" already exists`,
					});
				}
			}

			// Validate parent zone if provided
			if (data.parentZoneId) {
				// Prevent self-reference
				if (data.parentZoneId === id) {
					throw new HTTPException(400, {
						message: "A zone cannot be its own parent",
					});
				}

				const parentZone = await db.pricingZone.findFirst({
					where: withTenantId(data.parentZoneId, organizationId),
				});

				if (!parentZone) {
					throw new HTTPException(400, {
						message: "Parent zone not found",
					});
				}
			}

			const zone = await db.pricingZone.update({
				where: { id },
				data: {
					...(data.name !== undefined && { name: data.name }),
					...(data.code !== undefined && { code: data.code }),
					...(data.zoneType !== undefined && { zoneType: data.zoneType }),
					...(data.geometry !== undefined && { geometry: data.geometry }),
					...(data.centerLatitude !== undefined && { centerLatitude: data.centerLatitude }),
					...(data.centerLongitude !== undefined && { centerLongitude: data.centerLongitude }),
					...(data.radiusKm !== undefined && { radiusKm: data.radiusKm }),
					...(data.parentZoneId !== undefined && {
						parentZone: data.parentZoneId
							? { connect: { id: data.parentZoneId } }
							: { disconnect: true },
					}),
					...(data.isActive !== undefined && { isActive: data.isActive }),
					...(data.color !== undefined && { color: data.color }),
					// Story 11.2: Update postal codes
					...(data.postalCodes !== undefined && { postalCodes: data.postalCodes }),
					...(data.creationMethod !== undefined && { creationMethod: data.creationMethod }),
				},
				include: {
					parentZone: {
						select: {
							id: true,
							name: true,
							code: true,
						},
					},
				},
			});

			return c.json(transformZone(zone));
		},
	)

	// Delete zone
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete pricing zone",
			description: "Delete a pricing zone. Fails if zone is referenced by routes.",
			tags: ["VTC - Pricing Zones"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const force = c.req.query("force") === "true";

			// Check zone exists
			const zone = await db.pricingZone.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							fromRoutes: true,
							toRoutes: true,
							childZones: true,
						},
					},
				},
			});

			if (!zone) {
				throw new HTTPException(404, {
					message: "Pricing zone not found",
				});
			}

			const routesCount = zone._count.fromRoutes + zone._count.toRoutes;
			const childZonesCount = zone._count.childZones;

			// Check for references
			if ((routesCount > 0 || childZonesCount > 0) && !force) {
				throw new HTTPException(409, {
					message: `This zone is referenced by ${routesCount} routes and has ${childZonesCount} child zones. Use force=true to delete anyway.`,
					cause: {
						error: "ZONE_HAS_REFERENCES",
						routesCount,
						childZonesCount,
					},
				});
			}

			await db.pricingZone.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
