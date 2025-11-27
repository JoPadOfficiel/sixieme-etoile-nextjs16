import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantFilter, withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import {
	getEmptyLegStatus,
	findMatchingEmptyLegs,
	calculateEmptyLegData,
	validateMissionForEmptyLeg,
	calculateEmptyLegPrice,
	parsePricingStrategy,
	DEFAULT_EMPTY_LEG_CONFIG,
	type EmptyLegData,
	type EmptyLegStatus,
	type PricingStrategy,
} from "../../services/empty-leg-service";

/**
 * Empty-Legs Router
 *
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 *
 * Provides CRUD operations for empty-leg opportunities and matching functionality.
 *
 * @see FR53 - Empty-leg detection and pricing strategies
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const pricingStrategySchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("PERCENTAGE_DISCOUNT"),
		value: z.number().min(0).max(100),
	}),
	z.object({
		type: z.literal("FIXED_PRICE"),
		value: z.number().min(0),
	}),
	z.object({
		type: z.literal("COST_PLUS_MARGIN"),
		marginPercent: z.number().min(0).max(100),
	}),
]);

const listEmptyLegsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	vehicleId: z.string().optional(),
	fromDate: z.string().datetime().optional(),
	toDate: z.string().datetime().optional(),
	includeExpired: z.coerce.boolean().optional().default(false),
});

const createEmptyLegSchema = z.object({
	vehicleId: z.string().min(1),
	fromAddress: z.string().optional(),
	fromLatitude: z.number().optional(),
	fromLongitude: z.number().optional(),
	fromZoneId: z.string().optional(),
	toAddress: z.string().optional(),
	toLatitude: z.number().optional(),
	toLongitude: z.number().optional(),
	toZoneId: z.string().optional(),
	windowStart: z.string().datetime(),
	windowEnd: z.string().datetime(),
	pricingStrategy: pricingStrategySchema.optional(),
	notes: z.string().optional(),
});

const updateEmptyLegSchema = z.object({
	fromAddress: z.string().optional(),
	fromLatitude: z.number().optional(),
	fromLongitude: z.number().optional(),
	toAddress: z.string().optional(),
	toLatitude: z.number().optional(),
	toLongitude: z.number().optional(),
	windowStart: z.string().datetime().optional(),
	windowEnd: z.string().datetime().optional(),
	pricingStrategy: pricingStrategySchema.optional().nullable(),
	isActive: z.boolean().optional(),
	notes: z.string().optional().nullable(),
});

const matchEmptyLegsSchema = z.object({
	pickupLatitude: z.coerce.number(),
	pickupLongitude: z.coerce.number(),
	dropoffLatitude: z.coerce.number(),
	dropoffLongitude: z.coerce.number(),
	pickupAt: z.string().datetime(),
	maxDistanceKm: z.coerce.number().optional(),
});

const createFromMissionSchema = z.object({
	windowEndHours: z.number().min(1).max(24).optional(),
	pricingStrategy: pricingStrategySchema.optional(),
});

// ============================================================================
// Response Types
// ============================================================================

interface EmptyLegListItem {
	id: string;
	vehicle: {
		id: string;
		name: string;
		category: { id: string; name: string; code: string };
	};
	corridor: {
		fromAddress: string | null;
		fromLatitude: number | null;
		fromLongitude: number | null;
		toAddress: string | null;
		toLatitude: number | null;
		toLongitude: number | null;
	};
	estimatedDistanceKm: number | null;
	estimatedDurationMins: number | null;
	windowStart: string;
	windowEnd: string;
	pricingStrategy: PricingStrategy | null;
	status: EmptyLegStatus;
	isActive: boolean;
	sourceMissionId: string | null;
	notes: string | null;
	createdAt: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function transformEmptyLeg(
	emptyLeg: {
		id: string;
		vehicleId: string;
		vehicle: {
			id: string;
			internalName: string | null;
			registrationNumber: string;
			vehicleCategory: { id: string; name: string; code: string };
		};
		fromAddress: string | null;
		fromLatitude: unknown;
		fromLongitude: unknown;
		toAddress: string | null;
		toLatitude: unknown;
		toLongitude: unknown;
		estimatedDistanceKm: unknown;
		estimatedDurationMins: number | null;
		windowStart: Date;
		windowEnd: Date;
		pricingStrategy: unknown;
		isActive: boolean;
		sourceMissionId: string | null;
		notes: string | null;
		createdAt: Date;
	},
): EmptyLegListItem {
	const pricingStrategy = parsePricingStrategy(emptyLeg.pricingStrategy);
	const status = getEmptyLegStatus(emptyLeg.windowStart, emptyLeg.windowEnd);

	return {
		id: emptyLeg.id,
		vehicle: {
			id: emptyLeg.vehicle.id,
			name: emptyLeg.vehicle.internalName ?? emptyLeg.vehicle.registrationNumber,
			category: emptyLeg.vehicle.vehicleCategory,
		},
		corridor: {
			fromAddress: emptyLeg.fromAddress,
			fromLatitude: emptyLeg.fromLatitude ? Number(emptyLeg.fromLatitude) : null,
			fromLongitude: emptyLeg.fromLongitude ? Number(emptyLeg.fromLongitude) : null,
			toAddress: emptyLeg.toAddress,
			toLatitude: emptyLeg.toLatitude ? Number(emptyLeg.toLatitude) : null,
			toLongitude: emptyLeg.toLongitude ? Number(emptyLeg.toLongitude) : null,
		},
		estimatedDistanceKm: emptyLeg.estimatedDistanceKm
			? Number(emptyLeg.estimatedDistanceKm)
			: null,
		estimatedDurationMins: emptyLeg.estimatedDurationMins,
		windowStart: emptyLeg.windowStart.toISOString(),
		windowEnd: emptyLeg.windowEnd.toISOString(),
		pricingStrategy,
		status,
		isActive: emptyLeg.isActive,
		sourceMissionId: emptyLeg.sourceMissionId,
		notes: emptyLeg.notes,
		createdAt: emptyLeg.createdAt.toISOString(),
	};
}

// ============================================================================
// Router
// ============================================================================

export const emptyLegsRouter = new Hono()
	.basePath("/empty-legs")
	.use("*", organizationMiddleware)

	// List empty legs
	.get(
		"/",
		validator("query", listEmptyLegsSchema),
		describeRoute({
			summary: "List empty-leg opportunities",
			description: "Get a paginated list of empty-leg opportunities",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, vehicleId, fromDate, toDate, includeExpired } =
				c.req.valid("query");

			const skip = (page - 1) * limit;
			const now = new Date();

			// Build where clause
			const baseWhere: Prisma.EmptyLegOpportunityWhereInput = {
				...(vehicleId && { vehicleId }),
				...(fromDate && { windowStart: { gte: new Date(fromDate) } }),
				...(toDate && { windowEnd: { lte: new Date(toDate) } }),
			};

			// Filter out expired unless explicitly requested
			if (!includeExpired) {
				baseWhere.windowEnd = { gte: now };
				baseWhere.isActive = true;
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [emptyLegs, total] = await Promise.all([
				db.emptyLegOpportunity.findMany({
					where,
					skip,
					take: limit,
					orderBy: { windowStart: "asc" },
					include: {
						vehicle: {
							include: {
								vehicleCategory: true,
							},
						},
					},
				}),
				db.emptyLegOpportunity.count({ where }),
			]);

			const data = emptyLegs.map(transformEmptyLeg);

			return c.json({
				data,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Find matching empty legs for a request
	// NOTE: This route MUST be before /:id to avoid "match" being interpreted as an ID
	.get(
		"/match",
		validator("query", matchEmptyLegsSchema),
		describeRoute({
			summary: "Find matching empty legs",
			description: "Find empty-leg opportunities that match a booking request",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const {
				pickupLatitude,
				pickupLongitude,
				dropoffLatitude,
				dropoffLongitude,
				pickupAt,
				maxDistanceKm,
			} = c.req.valid("query");

			const pickupTime = new Date(pickupAt);

			// Get active empty legs with valid time windows
			const emptyLegs = await db.emptyLegOpportunity.findMany({
				where: {
					organizationId,
					isActive: true,
					windowStart: { lte: pickupTime },
					windowEnd: { gte: pickupTime },
				},
				include: {
					vehicle: {
						include: {
							vehicleCategory: true,
						},
					},
				},
			});

			// Transform to EmptyLegData
			const emptyLegData: EmptyLegData[] = emptyLegs.map((el) => ({
				id: el.id,
				vehicleId: el.vehicleId,
				fromAddress: el.fromAddress,
				fromLatitude: el.fromLatitude ? Number(el.fromLatitude) : null,
				fromLongitude: el.fromLongitude ? Number(el.fromLongitude) : null,
				toAddress: el.toAddress,
				toLatitude: el.toLatitude ? Number(el.toLatitude) : null,
				toLongitude: el.toLongitude ? Number(el.toLongitude) : null,
				estimatedDistanceKm: el.estimatedDistanceKm ? Number(el.estimatedDistanceKm) : null,
				estimatedDurationMins: el.estimatedDurationMins,
				windowStart: el.windowStart,
				windowEnd: el.windowEnd,
				pricingStrategy: parsePricingStrategy(el.pricingStrategy),
				isActive: el.isActive,
			}));

			// Find matches
			const config = {
				...DEFAULT_EMPTY_LEG_CONFIG,
				...(maxDistanceKm !== undefined && { maxMatchDistanceKm: maxDistanceKm }),
			};

			const matches = findMatchingEmptyLegs(
				emptyLegData,
				{
					pickupLat: pickupLatitude,
					pickupLng: pickupLongitude,
					dropoffLat: dropoffLatitude,
					dropoffLng: dropoffLongitude,
					pickupAt: pickupTime,
				},
				config,
			);

			// Enrich with vehicle info
			const enrichedMatches = matches.map((match) => {
				const emptyLeg = emptyLegs.find((el) => el.id === match.emptyLegId);
				return {
					...match,
					emptyLeg: emptyLeg ? transformEmptyLeg(emptyLeg) : null,
				};
			});

			return c.json({
				matches: enrichedMatches,
				request: {
					pickupLatitude,
					pickupLongitude,
					dropoffLatitude,
					dropoffLongitude,
					pickupAt,
				},
			});
		},
	)

	// Get single empty leg
	.get(
		"/:id",
		describeRoute({
			summary: "Get empty-leg detail",
			description: "Get detailed information about an empty-leg opportunity",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const emptyLeg = await db.emptyLegOpportunity.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					vehicle: {
						include: {
							vehicleCategory: true,
							operatingBase: true,
						},
					},
					fromZone: true,
					toZone: true,
				},
			});

			if (!emptyLeg) {
				throw new HTTPException(404, {
					message: "Empty leg not found",
				});
			}

			const pricingStrategy = parsePricingStrategy(emptyLeg.pricingStrategy);
			const status = getEmptyLegStatus(emptyLeg.windowStart, emptyLeg.windowEnd);

			return c.json({
				id: emptyLeg.id,
				vehicle: {
					id: emptyLeg.vehicle.id,
					name: emptyLeg.vehicle.internalName ?? emptyLeg.vehicle.registrationNumber,
					registrationNumber: emptyLeg.vehicle.registrationNumber,
					category: emptyLeg.vehicle.vehicleCategory,
					base: {
						id: emptyLeg.vehicle.operatingBase.id,
						name: emptyLeg.vehicle.operatingBase.name,
						address: `${emptyLeg.vehicle.operatingBase.addressLine1}, ${emptyLeg.vehicle.operatingBase.city}`,
					},
				},
				corridor: {
					fromAddress: emptyLeg.fromAddress,
					fromLatitude: emptyLeg.fromLatitude ? Number(emptyLeg.fromLatitude) : null,
					fromLongitude: emptyLeg.fromLongitude ? Number(emptyLeg.fromLongitude) : null,
					fromZone: emptyLeg.fromZone
						? { id: emptyLeg.fromZone.id, name: emptyLeg.fromZone.name, code: emptyLeg.fromZone.code }
						: null,
					toAddress: emptyLeg.toAddress,
					toLatitude: emptyLeg.toLatitude ? Number(emptyLeg.toLatitude) : null,
					toLongitude: emptyLeg.toLongitude ? Number(emptyLeg.toLongitude) : null,
					toZone: emptyLeg.toZone
						? { id: emptyLeg.toZone.id, name: emptyLeg.toZone.name, code: emptyLeg.toZone.code }
						: null,
				},
				estimatedDistanceKm: emptyLeg.estimatedDistanceKm
					? Number(emptyLeg.estimatedDistanceKm)
					: null,
				estimatedDurationMins: emptyLeg.estimatedDurationMins,
				windowStart: emptyLeg.windowStart.toISOString(),
				windowEnd: emptyLeg.windowEnd.toISOString(),
				pricingStrategy,
				status,
				isActive: emptyLeg.isActive,
				sourceMissionId: emptyLeg.sourceMissionId,
				notes: emptyLeg.notes,
				createdAt: emptyLeg.createdAt.toISOString(),
				updatedAt: emptyLeg.updatedAt.toISOString(),
			});
		},
	)

	// Create empty leg manually
	.post(
		"/",
		validator("json", createEmptyLegSchema),
		describeRoute({
			summary: "Create empty-leg opportunity",
			description: "Manually create an empty-leg opportunity",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify vehicle exists and belongs to organization
			const vehicle = await db.vehicle.findFirst({
				where: withTenantFilter({ id: data.vehicleId }, organizationId),
				include: {
					vehicleCategory: true,
					operatingBase: true,
				},
			});

			if (!vehicle) {
				throw new HTTPException(400, {
					message: "Vehicle not found",
				});
			}

			// Calculate distance if coordinates provided
			let estimatedDistanceKm: number | null = null;
			let estimatedDurationMins: number | null = null;

			if (
				data.fromLatitude !== undefined &&
				data.fromLongitude !== undefined &&
				data.toLatitude !== undefined &&
				data.toLongitude !== undefined
			) {
				const { haversineDistance } = await import("../../lib/geo-utils");
				estimatedDistanceKm = Math.round(
					haversineDistance(
						{ lat: data.fromLatitude, lng: data.fromLongitude },
						{ lat: data.toLatitude, lng: data.toLongitude },
					) * 100,
				) / 100;
				estimatedDurationMins = Math.round((estimatedDistanceKm / 50) * 60);
			}

			const emptyLeg = await db.emptyLegOpportunity.create({
				data: {
					organizationId,
					vehicleId: data.vehicleId,
					fromAddress: data.fromAddress,
					fromLatitude: data.fromLatitude,
					fromLongitude: data.fromLongitude,
					fromZoneId: data.fromZoneId,
					toAddress: data.toAddress,
					toLatitude: data.toLatitude,
					toLongitude: data.toLongitude,
					toZoneId: data.toZoneId,
					estimatedDistanceKm,
					estimatedDurationMins,
					windowStart: new Date(data.windowStart),
					windowEnd: new Date(data.windowEnd),
					pricingStrategy: data.pricingStrategy ?? undefined,
					notes: data.notes,
					isActive: true,
				},
				include: {
					vehicle: {
						include: {
							vehicleCategory: true,
						},
					},
				},
			});

			return c.json(transformEmptyLeg(emptyLeg), 201);
		},
	)

	// Update empty leg
	.patch(
		"/:id",
		validator("json", updateEmptyLegSchema),
		describeRoute({
			summary: "Update empty-leg opportunity",
			description: "Update an existing empty-leg opportunity",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Verify empty leg exists
			const existing = await db.emptyLegOpportunity.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Empty leg not found",
				});
			}

			// Recalculate distance if coordinates changed
			let estimatedDistanceKm = existing.estimatedDistanceKm;
			let estimatedDurationMins = existing.estimatedDurationMins;

			const fromLat = data.fromLatitude ?? (existing.fromLatitude ? Number(existing.fromLatitude) : null);
			const fromLng = data.fromLongitude ?? (existing.fromLongitude ? Number(existing.fromLongitude) : null);
			const toLat = data.toLatitude ?? (existing.toLatitude ? Number(existing.toLatitude) : null);
			const toLng = data.toLongitude ?? (existing.toLongitude ? Number(existing.toLongitude) : null);

			if (
				fromLat !== null &&
				fromLng !== null &&
				toLat !== null &&
				toLng !== null &&
				(data.fromLatitude !== undefined ||
					data.fromLongitude !== undefined ||
					data.toLatitude !== undefined ||
					data.toLongitude !== undefined)
			) {
				const { haversineDistance } = await import("../../lib/geo-utils");
				const distance = haversineDistance(
					{ lat: fromLat, lng: fromLng },
					{ lat: toLat, lng: toLng },
				);
				estimatedDistanceKm = Math.round(distance * 100) / 100 as unknown as typeof existing.estimatedDistanceKm;
				estimatedDurationMins = Math.round((distance / 50) * 60);
			}

			const emptyLeg = await db.emptyLegOpportunity.update({
				where: { id },
				data: {
					...(data.fromAddress !== undefined && { fromAddress: data.fromAddress }),
					...(data.fromLatitude !== undefined && { fromLatitude: data.fromLatitude }),
					...(data.fromLongitude !== undefined && { fromLongitude: data.fromLongitude }),
					...(data.toAddress !== undefined && { toAddress: data.toAddress }),
					...(data.toLatitude !== undefined && { toLatitude: data.toLatitude }),
					...(data.toLongitude !== undefined && { toLongitude: data.toLongitude }),
					...(data.windowStart !== undefined && { windowStart: new Date(data.windowStart) }),
					...(data.windowEnd !== undefined && { windowEnd: new Date(data.windowEnd) }),
					...(data.pricingStrategy !== undefined && {
						pricingStrategy: data.pricingStrategy ?? undefined,
					}),
					...(data.isActive !== undefined && { isActive: data.isActive }),
					...(data.notes !== undefined && { notes: data.notes }),
					estimatedDistanceKm,
					estimatedDurationMins,
				},
				include: {
					vehicle: {
						include: {
							vehicleCategory: true,
						},
					},
				},
			});

			return c.json(transformEmptyLeg(emptyLeg));
		},
	)

	// Delete empty leg
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete empty-leg opportunity",
			description: "Delete an empty-leg opportunity",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Verify empty leg exists
			const existing = await db.emptyLegOpportunity.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Empty leg not found",
				});
			}

			await db.emptyLegOpportunity.delete({
				where: { id },
			});

			return c.json({
				success: true,
				message: "Empty leg deleted",
			});
		},
	);

// ============================================================================
// Mission Empty-Leg Creation Endpoint
// ============================================================================

export const missionEmptyLegRouter = new Hono()
	.basePath("/missions")
	.use("*", organizationMiddleware)

	// Create empty leg from mission
	.post(
		"/:id/create-empty-leg",
		validator("json", createFromMissionSchema),
		describeRoute({
			summary: "Create empty leg from mission",
			description: "Create an empty-leg opportunity from a confirmed mission",
			tags: ["VTC - Empty Legs"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const missionId = c.req.param("id");
			const { windowEndHours, pricingStrategy } = c.req.valid("json");

			// Get the mission (quote)
			const mission = await db.quote.findFirst({
				where: {
					...withTenantId(missionId, organizationId),
					status: "ACCEPTED",
				},
				include: {
					assignedVehicle: {
						include: {
							operatingBase: true,
							vehicleCategory: true,
						},
					},
				},
			});

			if (!mission) {
				throw new HTTPException(404, {
					message: "Mission not found or not accepted",
				});
			}

			// Validate mission for empty-leg creation
			const validation = validateMissionForEmptyLeg({
				id: mission.id,
				dropoffAddress: mission.dropoffAddress,
				dropoffLatitude: mission.dropoffLatitude ? Number(mission.dropoffLatitude) : null,
				dropoffLongitude: mission.dropoffLongitude ? Number(mission.dropoffLongitude) : null,
				pickupAt: mission.pickupAt,
				assignedVehicleId: mission.assignedVehicleId,
				tripAnalysis: mission.tripAnalysis,
			});

			if (!validation.valid) {
				throw new HTTPException(400, {
					message: validation.error ?? "Invalid mission for empty-leg creation",
				});
			}

			// Check if empty leg already exists for this mission
			const existingEmptyLeg = await db.emptyLegOpportunity.findFirst({
				where: {
					organizationId,
					sourceMissionId: missionId,
				},
			});

			if (existingEmptyLeg) {
				throw new HTTPException(400, {
					message: "Empty leg already exists for this mission",
				});
			}

			// Calculate empty-leg data
			const emptyLegData = calculateEmptyLegData(
				{
					id: mission.id,
					dropoffAddress: mission.dropoffAddress,
					dropoffLatitude: mission.dropoffLatitude ? Number(mission.dropoffLatitude) : null,
					dropoffLongitude: mission.dropoffLongitude ? Number(mission.dropoffLongitude) : null,
					pickupAt: mission.pickupAt,
					assignedVehicleId: mission.assignedVehicleId,
					tripAnalysis: mission.tripAnalysis,
				},
				{
					id: mission.assignedVehicle!.id,
					operatingBase: {
						id: mission.assignedVehicle!.operatingBase.id,
						name: mission.assignedVehicle!.operatingBase.name,
						addressLine1: mission.assignedVehicle!.operatingBase.addressLine1,
						city: mission.assignedVehicle!.operatingBase.city,
						latitude: Number(mission.assignedVehicle!.operatingBase.latitude),
						longitude: Number(mission.assignedVehicle!.operatingBase.longitude),
					},
				},
				{
					windowEndHours,
					pricingStrategy: pricingStrategy as PricingStrategy | undefined,
				},
			);

			// Create empty leg
			const emptyLeg = await db.emptyLegOpportunity.create({
				data: {
					organizationId,
					vehicleId: emptyLegData.vehicleId,
					fromAddress: emptyLegData.fromAddress,
					fromLatitude: emptyLegData.fromLatitude,
					fromLongitude: emptyLegData.fromLongitude,
					toAddress: emptyLegData.toAddress,
					toLatitude: emptyLegData.toLatitude,
					toLongitude: emptyLegData.toLongitude,
					estimatedDistanceKm: emptyLegData.estimatedDistanceKm,
					estimatedDurationMins: emptyLegData.estimatedDurationMins,
					windowStart: emptyLegData.windowStart,
					windowEnd: emptyLegData.windowEnd,
					pricingStrategy: emptyLegData.pricingStrategy as object ?? undefined,
					sourceMissionId: missionId,
					isActive: true,
				},
				include: {
					vehicle: {
						include: {
							vehicleCategory: true,
						},
					},
				},
			});

			return c.json(
				{
					success: true,
					message: "Empty leg created successfully",
					emptyLeg: transformEmptyLeg(emptyLeg),
				},
				201,
			);
		},
	);
