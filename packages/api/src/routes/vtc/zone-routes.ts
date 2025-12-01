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

// Transform route to convert Decimals to numbers
// biome-ignore lint/suspicious/noExplicitAny: Prisma returns dynamic types
const transformRoute = (route: any) => ({
	...route,
	fixedPrice: decimalToNumber(route.fixedPrice),
	fromZone: route.fromZone
		? {
				...route.fromZone,
				centerLatitude: decimalToNumber(route.fromZone.centerLatitude),
				centerLongitude: decimalToNumber(route.fromZone.centerLongitude),
				radiusKm: decimalToNumber(route.fromZone.radiusKm),
			}
		: null,
	toZone: route.toZone
		? {
				...route.toZone,
				centerLatitude: decimalToNumber(route.toZone.centerLatitude),
				centerLongitude: decimalToNumber(route.toZone.centerLongitude),
				radiusKm: decimalToNumber(route.toZone.radiusKm),
			}
		: null,
	vehicleCategory: route.vehicleCategory
		? {
				...route.vehicleCategory,
				priceMultiplier: decimalToNumber(route.vehicleCategory.priceMultiplier),
				defaultRatePerKm: decimalToNumber(
					route.vehicleCategory.defaultRatePerKm,
				),
				defaultRatePerHour: decimalToNumber(
					route.vehicleCategory.defaultRatePerHour,
				),
			}
		: null,
});

// Validation schemas
const routeDirectionEnum = z.enum(["BIDIRECTIONAL", "A_TO_B", "B_TO_A"]);

const createRouteSchema = z.object({
	fromZoneId: z.string().min(1, "From zone is required"),
	toZoneId: z.string().min(1, "To zone is required"),
	vehicleCategoryId: z.string().min(1, "Vehicle category is required"),
	direction: routeDirectionEnum.default("BIDIRECTIONAL"),
	fixedPrice: z.coerce.number().positive("Fixed price must be positive"),
	isActive: z.boolean().default(true),
});

const updateRouteSchema = createRouteSchema.partial();

const listRoutesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	fromZoneId: z.string().optional(),
	toZoneId: z.string().optional(),
	vehicleCategoryId: z.string().optional(),
	direction: routeDirectionEnum.optional(),
	isActive: z.enum(["true", "false"]).optional(),
	search: z.string().optional(),
	// Story 13.2: Partner filter to show override prices
	partnerId: z.string().optional(),
});

export const zoneRoutesRouter = new Hono()
	.basePath("/pricing/routes")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// List routes
	.get(
		"/",
		validator("query", listRoutesSchema),
		describeRoute({
			summary: "List zone routes",
			description:
				"Get a paginated list of zone routes for the current organization",
			tags: ["VTC - Zone Routes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const {
				page,
				limit,
				fromZoneId,
				toZoneId,
				vehicleCategoryId,
				direction,
				isActive,
				search,
				partnerId,
			} = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter
			const where = withTenantFilter(
				{
					...(fromZoneId && { fromZoneId }),
					...(toZoneId && { toZoneId }),
					...(vehicleCategoryId && { vehicleCategoryId }),
					...(direction && { direction }),
					...(isActive !== undefined && {
						isActive: isActive === "true",
					}),
					...(search && {
						OR: [
							{
								fromZone: {
									name: { contains: search, mode: "insensitive" as const },
								},
							},
							{
								fromZone: {
									code: { contains: search, mode: "insensitive" as const },
								},
							},
							{
								toZone: {
									name: { contains: search, mode: "insensitive" as const },
								},
							},
							{
								toZone: {
									code: { contains: search, mode: "insensitive" as const },
								},
							},
							{
								vehicleCategory: {
									name: { contains: search, mode: "insensitive" as const },
								},
							},
						],
					}),
				},
				organizationId,
			);

			// Story 13.2: If partnerId is provided, get the partner's contract ID
			let partnerContractId: string | null = null;
			if (partnerId) {
				const partnerContract = await db.partnerContract.findFirst({
					where: withTenantFilter({ contactId: partnerId }, organizationId),
					select: { id: true },
				});
				partnerContractId = partnerContract?.id ?? null;
			}

			const [routes, total] = await Promise.all([
				db.zoneRoute.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ fromZone: { name: "asc" } }, { toZone: { name: "asc" } }],
					include: {
						fromZone: {
							select: {
								id: true,
								name: true,
								code: true,
								zoneType: true,
								centerLatitude: true,
								centerLongitude: true,
								radiusKm: true,
							},
						},
						toZone: {
							select: {
								id: true,
								name: true,
								code: true,
								zoneType: true,
								centerLatitude: true,
								centerLongitude: true,
								radiusKm: true,
							},
						},
						vehicleCategory: {
							select: {
								id: true,
								name: true,
								code: true,
								maxPassengers: true,
								priceMultiplier: true,
								defaultRatePerKm: true,
								defaultRatePerHour: true,
							},
						},
						// Story 13.2: Include partner contract override prices when partnerId is provided
						...(partnerContractId && {
							partnerContractZoneRoutes: {
								where: { partnerContractId },
								select: {
									id: true,
									overridePrice: true,
								},
							},
						}),
					},
				}),
				db.zoneRoute.count({ where }),
			]);

			// Story 13.2: Transform routes to include override price info
			const transformedRoutes = routes.map((route) => {
				const transformed = transformRoute(route);
				
				// If we have partner contract data, extract the override price
				if (partnerContractId && 'partnerContractZoneRoutes' in route) {
					const contractRoute = (route as { partnerContractZoneRoutes?: { overridePrice: unknown }[] }).partnerContractZoneRoutes?.[0];
					return {
						...transformed,
						overridePrice: contractRoute ? decimalToNumber(contractRoute.overridePrice) : null,
						hasOverride: contractRoute?.overridePrice !== null && contractRoute?.overridePrice !== undefined,
					};
				}
				
				return {
					...transformed,
					overridePrice: null,
					hasOverride: false,
				};
			});

			return c.json({
				data: transformedRoutes,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					partnerId: partnerId ?? null,
				},
			});
		},
	)

	// Get single route
	.get(
		"/:id",
		describeRoute({
			summary: "Get zone route",
			description: "Get a single zone route by ID",
			tags: ["VTC - Zone Routes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const route = await db.zoneRoute.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					fromZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					toZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					vehicleCategory: {
						select: {
							id: true,
							name: true,
							code: true,
							maxPassengers: true,
							priceMultiplier: true,
							defaultRatePerKm: true,
							defaultRatePerHour: true,
						},
					},
					partnerContractZoneRoutes: {
						include: {
							partnerContract: {
								include: {
									contact: {
										select: {
											id: true,
											displayName: true,
										},
									},
								},
							},
						},
					},
				},
			});

			if (!route) {
				throw new HTTPException(404, { message: "Route not found" });
			}

			return c.json(transformRoute(route));
		},
	)

	// Create route
	.post(
		"/",
		validator("json", createRouteSchema),
		describeRoute({
			summary: "Create zone route",
			description: "Create a new zone route",
			tags: ["VTC - Zone Routes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Validate that fromZone exists and belongs to the organization
			const fromZone = await db.pricingZone.findFirst({
				where: withTenantFilter({ id: data.fromZoneId }, organizationId),
			});
			if (!fromZone) {
				throw new HTTPException(400, {
					message: "From zone not found or does not belong to this organization",
				});
			}

			// Validate that toZone exists and belongs to the organization
			const toZone = await db.pricingZone.findFirst({
				where: withTenantFilter({ id: data.toZoneId }, organizationId),
			});
			if (!toZone) {
				throw new HTTPException(400, {
					message: "To zone not found or does not belong to this organization",
				});
			}

			// Validate that vehicleCategory exists and belongs to the organization
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
			});
			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message:
						"Vehicle category not found or does not belong to this organization",
				});
			}

			// Check for duplicate route (same from/to/category/direction)
			const existingRoute = await db.zoneRoute.findFirst({
				where: withTenantFilter(
					{
						fromZoneId: data.fromZoneId,
						toZoneId: data.toZoneId,
						vehicleCategoryId: data.vehicleCategoryId,
						direction: data.direction,
					},
					organizationId,
				),
			});

			if (existingRoute) {
				throw new HTTPException(409, {
					message:
						"A route with the same zones, vehicle category, and direction already exists",
				});
			}

			const route = await db.zoneRoute.create({
				data: withTenantCreate(
					{
						fromZoneId: data.fromZoneId,
						toZoneId: data.toZoneId,
						vehicleCategoryId: data.vehicleCategoryId,
						direction: data.direction,
						fixedPrice: data.fixedPrice,
						isActive: data.isActive,
					},
					organizationId,
				),
				include: {
					fromZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					toZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					vehicleCategory: {
						select: {
							id: true,
							name: true,
							code: true,
							maxPassengers: true,
							priceMultiplier: true,
							defaultRatePerKm: true,
							defaultRatePerHour: true,
						},
					},
				},
			});

			return c.json(transformRoute(route), 201);
		},
	)

	// Update route
	.patch(
		"/:id",
		validator("json", updateRouteSchema),
		describeRoute({
			summary: "Update zone route",
			description: "Update an existing zone route",
			tags: ["VTC - Zone Routes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Check if route exists
			const existingRoute = await db.zoneRoute.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingRoute) {
				throw new HTTPException(404, { message: "Route not found" });
			}

			// Validate fromZone if provided
			if (data.fromZoneId) {
				const fromZone = await db.pricingZone.findFirst({
					where: withTenantFilter({ id: data.fromZoneId }, organizationId),
				});
				if (!fromZone) {
					throw new HTTPException(400, {
						message:
							"From zone not found or does not belong to this organization",
					});
				}
			}

			// Validate toZone if provided
			if (data.toZoneId) {
				const toZone = await db.pricingZone.findFirst({
					where: withTenantFilter({ id: data.toZoneId }, organizationId),
				});
				if (!toZone) {
					throw new HTTPException(400, {
						message:
							"To zone not found or does not belong to this organization",
					});
				}
			}

			// Validate vehicleCategory if provided
			if (data.vehicleCategoryId) {
				const vehicleCategory = await db.vehicleCategory.findFirst({
					where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
				});
				if (!vehicleCategory) {
					throw new HTTPException(400, {
						message:
							"Vehicle category not found or does not belong to this organization",
					});
				}
			}

			// Check for duplicate route if changing key fields
			if (data.fromZoneId || data.toZoneId || data.vehicleCategoryId || data.direction) {
				const duplicateCheck = await db.zoneRoute.findFirst({
					where: withTenantFilter(
						{
							id: { not: id },
							fromZoneId: data.fromZoneId ?? existingRoute.fromZoneId,
							toZoneId: data.toZoneId ?? existingRoute.toZoneId,
							vehicleCategoryId:
								data.vehicleCategoryId ?? existingRoute.vehicleCategoryId,
							direction: data.direction ?? existingRoute.direction,
						},
						organizationId,
					),
				});

				if (duplicateCheck) {
					throw new HTTPException(409, {
						message:
							"A route with the same zones, vehicle category, and direction already exists",
					});
				}
			}

			const route = await db.zoneRoute.update({
				where: withTenantId(id, organizationId),
				data: {
					...(data.fromZoneId && { fromZoneId: data.fromZoneId }),
					...(data.toZoneId && { toZoneId: data.toZoneId }),
					...(data.vehicleCategoryId && {
						vehicleCategoryId: data.vehicleCategoryId,
					}),
					...(data.direction && { direction: data.direction }),
					...(data.fixedPrice !== undefined && { fixedPrice: data.fixedPrice }),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
				include: {
					fromZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					toZone: {
						select: {
							id: true,
							name: true,
							code: true,
							zoneType: true,
							centerLatitude: true,
							centerLongitude: true,
							radiusKm: true,
						},
					},
					vehicleCategory: {
						select: {
							id: true,
							name: true,
							code: true,
							maxPassengers: true,
							priceMultiplier: true,
							defaultRatePerKm: true,
							defaultRatePerHour: true,
						},
					},
				},
			});

			return c.json(transformRoute(route));
		},
	)

	// Delete route
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete zone route",
			description: "Delete a zone route",
			tags: ["VTC - Zone Routes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Check if route exists
			const existingRoute = await db.zoneRoute.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					partnerContractZoneRoutes: true,
				},
			});

			if (!existingRoute) {
				throw new HTTPException(404, { message: "Route not found" });
			}

			// Check if route is assigned to any partner contracts
			if (existingRoute.partnerContractZoneRoutes.length > 0) {
				throw new HTTPException(409, {
					message: `This route is assigned to ${existingRoute.partnerContractZoneRoutes.length} partner contract(s). Remove the assignments first or use force=true.`,
					cause: {
						contractsCount: existingRoute.partnerContractZoneRoutes.length,
					},
				});
			}

			await db.zoneRoute.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		},
	);
