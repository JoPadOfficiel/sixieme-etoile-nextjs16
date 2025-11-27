import { beforeEach, describe, expect, it, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { zoneRoutesRouter } from "../zone-routes";
import type { RouteDirection } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		zoneRoute: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		pricingZone: {
			findFirst: vi.fn(),
		},
		vehicleCategory: {
			findFirst: vi.fn(),
		},
	},
}));

// Mock the organization middleware
vi.mock("../../../middleware/organization", () => ({
	organizationMiddleware: vi.fn((c, next) => {
		c.set("organizationId", "test-org-id");
		return next();
	}),
}));

import { db } from "@repo/database";

const app = new Hono().route("/", zoneRoutesRouter);
const client = testClient(app);

// Mock data
const mockFromZone = {
	id: "zone-from-id",
	name: "Paris Intra-Muros",
	code: "PARIS_0",
	zoneType: "POLYGON",
	centerLatitude: 48.8566,
	centerLongitude: 2.3522,
	radiusKm: null,
};

const mockToZone = {
	id: "zone-to-id",
	name: "CDG Airport",
	code: "CDG",
	zoneType: "RADIUS",
	centerLatitude: 49.0097,
	centerLongitude: 2.5479,
	radiusKm: 5,
};

const mockVehicleCategory = {
	id: "category-id",
	name: "Berline",
	code: "BERLINE",
	maxPassengers: 3,
	priceMultiplier: 1.0,
	defaultRatePerKm: null,
	defaultRatePerHour: null,
};

const mockRoute = {
	id: "route-1",
	organizationId: "test-org-id",
	fromZoneId: "zone-from-id",
	toZoneId: "zone-to-id",
	vehicleCategoryId: "category-id",
	direction: "BIDIRECTIONAL" as RouteDirection,
	fixedPrice: new Decimal(85.0),
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	fromZone: mockFromZone,
	toZone: mockToZone,
	vehicleCategory: mockVehicleCategory,
	partnerContractZoneRoutes: [] as { id: string }[],
};

describe("Zone Routes API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/routes", () => {
		it("should return paginated routes list", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([mockRoute]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(1);

			const res = await client.pricing.routes.$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(1);
			expect(json.data[0].fromZone.name).toBe("Paris Intra-Muros");
			expect(json.data[0].toZone.name).toBe("CDG Airport");
			expect(json.data[0].fixedPrice).toBe(85.0);
			expect(json.meta.total).toBe(1);
		});

		it("should filter routes by fromZoneId", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({
				query: { fromZoneId: "zone-from-id" },
			});

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						fromZoneId: "zone-from-id",
					}),
				}),
			);
		});

		it("should filter routes by toZoneId", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({
				query: { toZoneId: "zone-to-id" },
			});

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						toZoneId: "zone-to-id",
					}),
				}),
			);
		});

		it("should filter routes by vehicleCategoryId", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({
				query: { vehicleCategoryId: "category-id" },
			});

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						vehicleCategoryId: "category-id",
					}),
				}),
			);
		});

		it("should filter routes by isActive", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({
				query: { isActive: "true" },
			});

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: true,
					}),
				}),
			);
		});

		it("should filter routes by direction", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({
				query: { direction: "BIDIRECTIONAL" },
			});

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						direction: "BIDIRECTIONAL",
					}),
				}),
			);
		});
	});

	describe("GET /pricing/routes/:id", () => {
		it("should return a single route with relations", async () => {
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(mockRoute);

			const res = await client.pricing.routes[":id"].$get({
				param: { id: "route-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect((json as typeof mockRoute).id).toBe("route-1");
			expect((json as typeof mockRoute).fromZone.name).toBe("Paris Intra-Muros");
			expect((json as typeof mockRoute).toZone.name).toBe("CDG Airport");
			expect((json as typeof mockRoute).vehicleCategory.name).toBe("Berline");
		});

		it("should return 404 for non-existent route", async () => {
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(null);

			const res = await client.pricing.routes[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/routes", () => {
		it("should create a new route", async () => {
			vi.mocked(db.pricingZone.findFirst)
				.mockResolvedValueOnce(mockFromZone as never)
				.mockResolvedValueOnce(mockToZone as never);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(mockVehicleCategory as never);
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(null);
			vi.mocked(db.zoneRoute.create).mockResolvedValue(mockRoute);

			const res = await client.pricing.routes.$post({
				json: {
					fromZoneId: "zone-from-id",
					toZoneId: "zone-to-id",
					vehicleCategoryId: "category-id",
					direction: "BIDIRECTIONAL",
					fixedPrice: 85.0,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect((json as typeof mockRoute).fromZone.id).toBe("zone-from-id");
			expect((json as typeof mockRoute).toZone.id).toBe("zone-to-id");
		});

		it("should reject invalid fromZone", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null);

			const res = await client.pricing.routes.$post({
				json: {
					fromZoneId: "invalid-zone",
					toZoneId: "zone-to-id",
					vehicleCategoryId: "category-id",
					direction: "BIDIRECTIONAL",
					fixedPrice: 85.0,
					isActive: true,
				},
			});

			expect(res.status).toBe(400);
		});

		it("should reject duplicate routes", async () => {
			vi.mocked(db.pricingZone.findFirst)
				.mockResolvedValueOnce(mockFromZone as never)
				.mockResolvedValueOnce(mockToZone as never);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(mockVehicleCategory as never);
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(mockRoute);

			const res = await client.pricing.routes.$post({
				json: {
					fromZoneId: "zone-from-id",
					toZoneId: "zone-to-id",
					vehicleCategoryId: "category-id",
					direction: "BIDIRECTIONAL",
					fixedPrice: 85.0,
					isActive: true,
				},
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PATCH /pricing/routes/:id", () => {
		it("should update an existing route", async () => {
			const updatedRoute = { ...mockRoute, fixedPrice: new Decimal(95.0), isActive: false };
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(mockRoute);
			vi.mocked(db.zoneRoute.update).mockResolvedValue(updatedRoute);

			const res = await client.pricing.routes[":id"].$patch({
				param: { id: "route-1" },
				json: {
					fixedPrice: 95.0,
					isActive: false,
				},
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(Number((json as any).fixedPrice)).toBe(95.0);
			expect((json as any).isActive).toBe(false);
		});

		it("should return 404 for non-existent route", async () => {
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(null);

			const res = await client.pricing.routes[":id"].$patch({
				param: { id: "non-existent" },
				json: { fixedPrice: 100.0 },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /pricing/routes/:id", () => {
		it("should delete an existing route", async () => {
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(mockRoute);
			vi.mocked(db.zoneRoute.delete).mockResolvedValue(mockRoute);

			const res = await client.pricing.routes[":id"].$delete({
				param: { id: "route-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent route", async () => {
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(null);

			const res = await client.pricing.routes[":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});

		it("should reject deletion if route has partner contracts", async () => {
			const routeWithContracts = {
				...mockRoute,
				partnerContractZoneRoutes: [{ id: "contract-1" }],
			};
			vi.mocked(db.zoneRoute.findFirst).mockResolvedValue(routeWithContracts);

			const res = await client.pricing.routes[":id"].$delete({
				param: { id: "route-1" },
			});

			expect(res.status).toBe(409);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			vi.mocked(db.zoneRoute.findMany).mockResolvedValue([]);
			vi.mocked(db.zoneRoute.count).mockResolvedValue(0);

			await client.pricing.routes.$get({ query: {} });

			expect(db.zoneRoute.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				}),
			);
		});
	});
});
