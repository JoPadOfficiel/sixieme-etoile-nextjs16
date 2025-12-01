import { Decimal } from "@prisma/client/runtime/library";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { excursionsRouter } from "../excursions";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		excursionPackage: {
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

const app = new Hono().route("/", excursionsRouter);
const client = testClient(app);

// Mock data
const mockOriginZone = {
	id: "zone-origin-id",
	name: "Paris Intra-Muros",
	code: "PARIS_0",
	zoneType: "POLYGON",
	centerLatitude: new Decimal(48.8566),
	centerLongitude: new Decimal(2.3522),
	radiusKm: null,
};

const mockDestinationZone = {
	id: "zone-dest-id",
	name: "Versailles",
	code: "VERSAILLES",
	zoneType: "RADIUS",
	centerLatitude: new Decimal(48.8014),
	centerLongitude: new Decimal(2.1301),
	radiusKm: new Decimal(10),
};

const mockVehicleCategory = {
	id: "category-id",
	name: "Berline",
	code: "BERLINE",
	maxPassengers: 3,
	priceMultiplier: new Decimal(1.0),
	defaultRatePerKm: null,
	defaultRatePerHour: null,
};

const mockExcursion = {
	id: "excursion-1",
	organizationId: "test-org-id",
	name: "Versailles Day Tour",
	description: "Full day tour to Versailles Palace",
	originZoneId: "zone-origin-id",
	destinationZoneId: "zone-dest-id",
	vehicleCategoryId: "category-id",
	includedDurationHours: new Decimal(8),
	includedDistanceKm: new Decimal(100),
	price: new Decimal(450),
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	originZone: mockOriginZone,
	destinationZone: mockDestinationZone,
	vehicleCategory: mockVehicleCategory,
};

describe("Excursions API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/excursions", () => {
		it("should return paginated excursions list", async () => {
			vi.mocked(db.excursionPackage.findMany).mockResolvedValue([
				mockExcursion,
			]);
			vi.mocked(db.excursionPackage.count).mockResolvedValue(1);

			const res = await client.pricing.excursions.$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(1);
			expect(json.data[0].name).toBe("Versailles Day Tour");
			expect(json.data[0].includedDurationHours).toBe(8);
			expect(json.data[0].price).toBe(450);
			expect(json.meta.total).toBe(1);
		});

		it("should filter excursions by zoneId (matches origin OR destination)", async () => {
			vi.mocked(db.excursionPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.excursionPackage.count).mockResolvedValue(0);

			await client.pricing.excursions.$get({
				query: { zoneId: "zone-id" },
			});

			expect(db.excursionPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						OR: [
							{ originZoneId: "zone-id" },
							{ destinationZoneId: "zone-id" },
						],
					}),
				}),
			);
		});

		it("should filter excursions by vehicleCategoryId", async () => {
			vi.mocked(db.excursionPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.excursionPackage.count).mockResolvedValue(0);

			await client.pricing.excursions.$get({
				query: { vehicleCategoryId: "category-id" },
			});

			expect(db.excursionPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						vehicleCategoryId: "category-id",
					}),
				}),
			);
		});

		it("should filter excursions by isActive status", async () => {
			vi.mocked(db.excursionPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.excursionPackage.count).mockResolvedValue(0);

			await client.pricing.excursions.$get({
				query: { isActive: "true" },
			});

			expect(db.excursionPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: true,
					}),
				}),
			);
		});
	});

	describe("GET /pricing/excursions/:id", () => {
		it("should return a single excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(mockExcursion);

			const res = await client.pricing.excursions[":id"].$get({
				param: { id: "excursion-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Versailles Day Tour");
			expect(json.description).toBe("Full day tour to Versailles Palace");
		});

		it("should return 404 for non-existent excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.excursions[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/excursions", () => {
		it("should create a new excursion", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(
				mockOriginZone as any,
			);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				mockVehicleCategory as any,
			);
			vi.mocked(db.excursionPackage.create).mockResolvedValue(mockExcursion);

			const res = await client.pricing.excursions.$post({
				json: {
					name: "Versailles Day Tour",
					description: "Full day tour to Versailles Palace",
					originZoneId: "zone-origin-id",
					destinationZoneId: "zone-dest-id",
					vehicleCategoryId: "category-id",
					includedDurationHours: 8,
					includedDistanceKm: 100,
					price: 450,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.name).toBe("Versailles Day Tour");
		});

		it("should return 400 for invalid vehicle category", async () => {
			vi.mocked(db.pricingZone.findFirst).mockResolvedValue(
				mockOriginZone as any,
			);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const res = await client.pricing.excursions.$post({
				json: {
					name: "Test Excursion",
					vehicleCategoryId: "invalid-category",
					includedDurationHours: 4,
					includedDistanceKm: 50,
					price: 200,
					isActive: true,
				},
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /pricing/excursions/:id", () => {
		it("should update an existing excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(mockExcursion);
			vi.mocked(db.excursionPackage.update).mockResolvedValue({
				...mockExcursion,
				name: "Updated Tour Name",
			});

			const res = await client.pricing.excursions[":id"].$patch({
				param: { id: "excursion-1" },
				json: { name: "Updated Tour Name" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Updated Tour Name");
		});

		it("should return 404 for non-existent excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.excursions[":id"].$patch({
				param: { id: "non-existent" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /pricing/excursions/:id", () => {
		it("should delete an excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(mockExcursion);
			vi.mocked(db.excursionPackage.delete).mockResolvedValue(mockExcursion);

			const res = await client.pricing.excursions[":id"].$delete({
				param: { id: "excursion-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent excursion", async () => {
			vi.mocked(db.excursionPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.excursions[":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});
});
