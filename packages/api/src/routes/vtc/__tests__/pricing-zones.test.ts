import { beforeEach, describe, expect, it, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { pricingZonesRouter } from "../pricing-zones";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		pricingZone: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
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

const app = new Hono().route("/", pricingZonesRouter);
const client = testClient(app);

describe("Pricing Zones API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/zones", () => {
		it("should return paginated zones list", async () => {
			const mockZones = [
				{
					id: "zone-1",
					organizationId: "test-org-id",
					name: "Paris Intra-Muros",
					code: "PARIS_0",
					zoneType: "POLYGON",
					centerLatitude: 48.8566,
					centerLongitude: 2.3522,
					radiusKm: null,
					geometry: null,
					parentZoneId: null,
					parentZone: null,
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
					_count: { fromRoutes: 2, toRoutes: 3, childZones: 1 },
				},
			];

			vi.mocked(db.pricingZone.findMany).mockResolvedValue(mockZones);
			vi.mocked(db.pricingZone.count).mockResolvedValue(1);

			const res = await client.pricing.zones.$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(1);
			expect(json.data[0].name).toBe("Paris Intra-Muros");
			expect(json.data[0].routesCount).toBe(5);
			expect(json.meta.total).toBe(1);
		});

		it("should filter zones by search term", async () => {
			vi.mocked(db.pricingZone.findMany).mockResolvedValue([]);
			vi.mocked(db.pricingZone.count).mockResolvedValue(0);

			await client.pricing.zones.$get({
				query: { search: "CDG" },
			});

			expect(db.pricingZone.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						OR: expect.arrayContaining([
							{ name: { contains: "CDG", mode: "insensitive" } },
							{ code: { contains: "CDG", mode: "insensitive" } },
						]),
					}),
				}),
			);
		});

		it("should filter zones by type", async () => {
			vi.mocked(db.pricingZone.findMany).mockResolvedValue([]);
			vi.mocked(db.pricingZone.count).mockResolvedValue(0);

			await client.pricing.zones.$get({
				query: { zoneType: "RADIUS" },
			});

			expect(db.pricingZone.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						zoneType: "RADIUS",
					}),
				}),
			);
		});
	});

	describe("GET /pricing/zones/:id", () => {
		it("should return a single zone", async () => {
			const mockZone = {
				id: "zone-1",
				organizationId: "test-org-id",
				name: "CDG Airport",
				code: "CDG",
				zoneType: "RADIUS",
				centerLatitude: 49.0097,
				centerLongitude: 2.5479,
				radiusKm: 5,
				geometry: null,
				parentZoneId: null,
				parentZone: null,
				childZones: [],
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { fromRoutes: 2, toRoutes: 3 },
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(mockZone);

			const res = await client.pricing.zones[":id"].$get({
				param: { id: "zone-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("CDG Airport");
			expect(json.routesCount).toBe(5);
		});

		it("should return 404 for non-existent zone", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null);

			const res = await client.pricing.zones[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/zones", () => {
		it("should create a new zone", async () => {
			const newZone = {
				name: "Orly Airport",
				code: "ORY",
				zoneType: "RADIUS" as const,
				centerLatitude: 48.7262,
				centerLongitude: 2.3652,
				radiusKm: 3,
				isActive: true,
			};

			const createdZone = {
				id: "zone-new",
				organizationId: "test-org-id",
				...newZone,
				geometry: null,
				parentZoneId: null,
				parentZone: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null); // No duplicate
			vi.mocked(db.pricingZone.create).mockResolvedValue(createdZone);

			const res = await client.pricing.zones.$post({
				json: newZone,
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.name).toBe("Orly Airport");
			expect(json.code).toBe("ORY");
		});

		it("should reject duplicate code", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue({
				id: "existing-zone",
				organizationId: "test-org-id",
				name: "Existing Zone",
				code: "CDG",
				zoneType: "RADIUS",
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				geometry: null,
				parentZoneId: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const res = await client.pricing.zones.$post({
				json: {
					name: "Another CDG",
					code: "CDG",
					zoneType: "RADIUS",
					radiusKm: 5,
				},
			});

			expect(res.status).toBe(409);
		});

		it("should require radiusKm for RADIUS type", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null);

			const res = await client.pricing.zones.$post({
				json: {
					name: "Test Zone",
					code: "TEST",
					zoneType: "RADIUS",
					// Missing radiusKm
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate code format", async () => {
			const res = await client.pricing.zones.$post({
				json: {
					name: "Test Zone",
					code: "invalid-code", // lowercase not allowed
					zoneType: "POLYGON",
				},
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /pricing/zones/:id", () => {
		it("should update an existing zone", async () => {
			const existingZone = {
				id: "zone-1",
				organizationId: "test-org-id",
				name: "Old Name",
				code: "OLD",
				zoneType: "POLYGON",
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				geometry: null,
				parentZoneId: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const updatedZone = {
				...existingZone,
				name: "New Name",
				parentZone: null,
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(existingZone);
			vi.mocked(db.pricingZone.update).mockResolvedValue(updatedZone);

			const res = await client.pricing.zones[":id"].$patch({
				param: { id: "zone-1" },
				json: { name: "New Name" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("New Name");
		});

		it("should return 404 for non-existent zone", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null);

			const res = await client.pricing.zones[":id"].$patch({
				param: { id: "non-existent" },
				json: { name: "New Name" },
			});

			expect(res.status).toBe(404);
		});

		it("should prevent self-reference as parent", async () => {
			const existingZone = {
				id: "zone-1",
				organizationId: "test-org-id",
				name: "Zone",
				code: "ZONE",
				zoneType: "POLYGON",
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				geometry: null,
				parentZoneId: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(existingZone);

			const res = await client.pricing.zones[":id"].$patch({
				param: { id: "zone-1" },
				json: { parentZoneId: "zone-1" }, // Self-reference
			});

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /pricing/zones/:id", () => {
		it("should delete a zone with no references", async () => {
			const zone = {
				id: "zone-1",
				organizationId: "test-org-id",
				name: "Zone",
				code: "ZONE",
				zoneType: "POLYGON",
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				geometry: null,
				parentZoneId: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { fromRoutes: 0, toRoutes: 0, childZones: 0 },
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(zone);
			vi.mocked(db.pricingZone.delete).mockResolvedValue(zone);

			const res = await client.pricing.zones[":id"].$delete({
				param: { id: "zone-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should block deletion if zone has references", async () => {
			const zone = {
				id: "zone-1",
				organizationId: "test-org-id",
				name: "Zone",
				code: "ZONE",
				zoneType: "POLYGON",
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				geometry: null,
				parentZoneId: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { fromRoutes: 2, toRoutes: 1, childZones: 0 },
			};

			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(zone);

			const res = await client.pricing.zones[":id"].$delete({
				param: { id: "zone-1" },
			});

			expect(res.status).toBe(409);
		});

		it("should return 404 for non-existent zone", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(null);

			const res = await client.pricing.zones[":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			vi.mocked(db.pricingZone.findMany).mockResolvedValue([]);
			vi.mocked(db.pricingZone.count).mockResolvedValue(0);

			await client.pricing.zones.$get({});

			expect(db.pricingZone.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				}),
			);
		});
	});
});
