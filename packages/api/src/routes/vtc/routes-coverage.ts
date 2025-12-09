/**
 * Routes Coverage API
 * Provides coverage statistics and matrix view for zone routes
 *
 * Story 3.6: Visualise Grid Coverage and Gaps
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { withTenantFilter } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// ============================================================================
// Types
// ============================================================================

export type ScenarioType =
	| "INTRA_ZONE"
	| "RADIAL"
	| "CIRCULAR_SUBURBAN"
	| "VERSAILLES"
	| "STANDARD";

export interface CoverageStats {
	totalZones: number;
	activeZones: number;
	totalPossibleRoutes: number;
	configuredRoutes: number;
	activeRoutes: number;
	coveragePercent: number;
	byCategory: {
		[categoryId: string]: {
			categoryName: string;
			configured: number;
			active: number;
			total: number;
			coveragePercent: number;
		};
	};
}

export interface MatrixCell {
	hasRoute: boolean;
	routeId?: string;
	routeName?: string;
	price?: number;
	direction?: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
	isActive?: boolean;
	vehicleCategoryId?: string;
	vehicleCategoryName?: string;
	scenarioType?: ScenarioType;
}

export interface MatrixZone {
	id: string;
	name: string;
	code: string;
	zoneType: string;
}

export interface MatrixResponse {
	zones: MatrixZone[];
	matrix: {
		[fromZoneId: string]: {
			[toZoneId: string]: MatrixCell | null;
		};
	};
	scenarios: {
		intraZone: string[];
		radial: string[];
		circularSuburban: string[];
		versailles: string[];
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect scenario type for a route based on zone characteristics
 */
function detectScenarioType(
	fromZoneCode: string,
	toZoneCode: string,
	fromZoneId: string,
	toZoneId: string,
): ScenarioType {
	// Intra-Zone: same zone
	if (fromZoneId === toZoneId) {
		return "INTRA_ZONE";
	}

	const fromCodeUpper = fromZoneCode.toUpperCase();
	const toCodeUpper = toZoneCode.toUpperCase();

	// Versailles exception
	if (
		(fromCodeUpper.includes("PARIS") || fromCodeUpper === "PAR") &&
		(toCodeUpper.includes("VERSAILLES") || toCodeUpper === "VERS")
	) {
		return "VERSAILLES";
	}
	if (
		(toCodeUpper.includes("PARIS") || toCodeUpper === "PAR") &&
		(fromCodeUpper.includes("VERSAILLES") || fromCodeUpper === "VERS")
	) {
		return "VERSAILLES";
	}

	// Radial: City center to Airport/Station
	const airportCodes = ["CDG", "ORY", "ORLY", "BVA", "LBG"];
	const stationCodes = ["GARE", "STATION", "TGV"];
	const cityCodes = ["PARIS", "PAR", "CENTER", "CENTRE", "CITY"];

	const isFromCity = cityCodes.some(
		(c) => fromCodeUpper.includes(c) || fromCodeUpper === c,
	);
	const isToCity = cityCodes.some(
		(c) => toCodeUpper.includes(c) || toCodeUpper === c,
	);
	const isFromAirportOrStation =
		airportCodes.some(
			(c) => fromCodeUpper.includes(c) || fromCodeUpper === c,
		) ||
		stationCodes.some((c) => fromCodeUpper.includes(c) || fromCodeUpper === c);
	const isToAirportOrStation =
		airportCodes.some((c) => toCodeUpper.includes(c) || toCodeUpper === c) ||
		stationCodes.some((c) => toCodeUpper.includes(c) || toCodeUpper === c);

	if (
		(isFromCity && isToAirportOrStation) ||
		(isToCity && isFromAirportOrStation)
	) {
		return "RADIAL";
	}

	// Circular Suburban: both zones are suburbs (not city center, not airport)
	const suburbIndicators = ["SUBURB", "BANLIEUE", "IDF", "92", "93", "94", "95"];
	const isFromSuburb =
		!isFromCity &&
		!isFromAirportOrStation &&
		(suburbIndicators.some(
			(s) => fromCodeUpper.includes(s) || fromCodeUpper === s,
		) ||
			(!isFromCity && !isFromAirportOrStation));
	const isToSuburb =
		!isToCity &&
		!isToAirportOrStation &&
		(suburbIndicators.some((s) => toCodeUpper.includes(s) || toCodeUpper === s) ||
			(!isToCity && !isToAirportOrStation));

	if (isFromSuburb && isToSuburb && fromZoneId !== toZoneId) {
		return "CIRCULAR_SUBURBAN";
	}

	return "STANDARD";
}

/**
 * Convert Prisma Decimal to number
 */
const decimalToNumber = (value: unknown): number | null => {
	if (value === null || value === undefined) return null;
	return Number(value);
};

// ============================================================================
// Validation Schemas
// ============================================================================

const matrixQuerySchema = z.object({
	vehicleCategoryId: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const routesCoverageRouter = new Hono()
	.basePath("/pricing/routes")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /coverage - Coverage statistics
	// -------------------------------------------------------------------------
	.get(
		"/coverage",
		describeRoute({
			summary: "Get routes coverage statistics",
			description:
				"Returns statistics about zone route coverage including total routes, active routes, and coverage percentage",
			tags: ["VTC - Routes Coverage"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			// Get all active zones
			const zones = await db.pricingZone.findMany({
				where: withTenantFilter({ isActive: true }, organizationId),
				select: { id: true },
			});

			const totalZones = zones.length;
			const activeZones = totalZones;

			// Total possible routes = N × N (including intra-zone)
			const totalPossibleRoutes = totalZones * totalZones;

			// Get all routes with their categories
			const routes = await db.zoneRoute.findMany({
				where: withTenantFilter({}, organizationId),
				include: {
					vehicleCategory: {
						select: { id: true, name: true },
					},
				},
			});

			const configuredRoutes = routes.length;
			const activeRoutes = routes.filter((r) => r.isActive).length;

			// Calculate coverage percentage
			const coveragePercent =
				totalPossibleRoutes > 0
					? Math.round((configuredRoutes / totalPossibleRoutes) * 10000) / 100
					: 0;

			// Group by category
			const byCategory: CoverageStats["byCategory"] = {};

			// Get all vehicle categories
			const categories = await db.vehicleCategory.findMany({
				where: withTenantFilter({}, organizationId),
				select: { id: true, name: true },
			});

			for (const category of categories) {
				const categoryRoutes = routes.filter(
					(r) => r.vehicleCategoryId === category.id,
				);
				const categoryActiveRoutes = categoryRoutes.filter((r) => r.isActive);

				byCategory[category.id] = {
					categoryName: category.name,
					configured: categoryRoutes.length,
					active: categoryActiveRoutes.length,
					total: totalPossibleRoutes,
					coveragePercent:
						totalPossibleRoutes > 0
							? Math.round(
									(categoryRoutes.length / totalPossibleRoutes) * 10000,
								) / 100
							: 0,
				};
			}

			const stats: CoverageStats = {
				totalZones,
				activeZones,
				totalPossibleRoutes,
				configuredRoutes,
				activeRoutes,
				coveragePercent,
				byCategory,
			};

			return c.json(stats);
		},
	)

	// -------------------------------------------------------------------------
	// GET /matrix - Coverage matrix
	// -------------------------------------------------------------------------
	.get(
		"/matrix",
		validator("query", matrixQuerySchema),
		describeRoute({
			summary: "Get routes coverage matrix",
			description:
				"Returns a zone×zone matrix showing which routes exist and their details",
			tags: ["VTC - Routes Coverage"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { vehicleCategoryId } = c.req.valid("query");

			// Get all active zones
			const zones = await db.pricingZone.findMany({
				where: withTenantFilter({ isActive: true }, organizationId),
				orderBy: { name: "asc" },
				select: {
					id: true,
					name: true,
					code: true,
					zoneType: true,
				},
			});

			// Build route filter
			const routeFilter: Record<string, unknown> = {};
			if (vehicleCategoryId) {
				routeFilter.vehicleCategoryId = vehicleCategoryId;
			}

			// Get all routes
			const routes = await db.zoneRoute.findMany({
				where: withTenantFilter(routeFilter, organizationId),
				include: {
					fromZone: {
						select: { id: true, name: true, code: true },
					},
					toZone: {
						select: { id: true, name: true, code: true },
					},
					vehicleCategory: {
						select: { id: true, name: true },
					},
				},
			});

			// Build matrix
			const matrix: MatrixResponse["matrix"] = {};
			const scenarios: MatrixResponse["scenarios"] = {
				intraZone: [],
				radial: [],
				circularSuburban: [],
				versailles: [],
			};

			// Initialize matrix with null values
			for (const fromZone of zones) {
				matrix[fromZone.id] = {};
				for (const toZone of zones) {
					matrix[fromZone.id][toZone.id] = null;
				}
			}

			// Fill in routes (skip routes without zones)
			for (const route of routes) {
				// Skip routes with null zones (legacy data)
				if (!route.fromZone || !route.toZone || !route.fromZoneId || !route.toZoneId) {
					continue;
				}
				
				const scenarioType = detectScenarioType(
					route.fromZone.code,
					route.toZone.code,
					route.fromZoneId,
					route.toZoneId,
				);

				const cell: MatrixCell = {
					hasRoute: true,
					routeId: route.id,
					routeName: `${route.fromZone.name} → ${route.toZone.name}`,
					price: decimalToNumber(route.fixedPrice) ?? undefined,
					direction: route.direction as MatrixCell["direction"],
					isActive: route.isActive,
					vehicleCategoryId: route.vehicleCategoryId,
					vehicleCategoryName: route.vehicleCategory?.name,
					scenarioType,
				};

				matrix[route.fromZoneId][route.toZoneId] = cell;

				// Track scenarios
				switch (scenarioType) {
					case "INTRA_ZONE":
						scenarios.intraZone.push(route.id);
						break;
					case "RADIAL":
						scenarios.radial.push(route.id);
						break;
					case "CIRCULAR_SUBURBAN":
						scenarios.circularSuburban.push(route.id);
						break;
					case "VERSAILLES":
						scenarios.versailles.push(route.id);
						break;
				}

				// For bidirectional routes, also mark the reverse direction
				if (
					route.direction === "BIDIRECTIONAL" &&
					route.fromZoneId !== route.toZoneId
				) {
					const reverseCell: MatrixCell = {
						...cell,
						routeName: `${route.toZone.name} → ${route.fromZone.name} (↔)`,
					};
					// Only set if not already set by another route
					if (!matrix[route.toZoneId][route.fromZoneId]?.hasRoute) {
						matrix[route.toZoneId][route.fromZoneId] = reverseCell;
					}
				}
			}

			// Mark empty cells (no route)
			for (const fromZone of zones) {
				for (const toZone of zones) {
					if (matrix[fromZone.id][toZone.id] === null) {
						matrix[fromZone.id][toZone.id] = {
							hasRoute: false,
						};
					}
				}
			}

			const response: MatrixResponse = {
				zones: zones.map((z) => ({
					id: z.id,
					name: z.name,
					code: z.code,
					zoneType: z.zoneType,
				})),
				matrix,
				scenarios,
			};

			return c.json(response);
		},
	);
