import { Decimal } from "@prisma/client/runtime/library";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { disposRouter } from "../dispos";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		dispoPackage: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
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

const app = new Hono().route("/", disposRouter);
const client = testClient(app);

// Mock data
const mockVehicleCategory = {
	id: "category-id",
	name: "Berline",
	code: "BERLINE",
	maxPassengers: 3,
	priceMultiplier: new Decimal(1.0),
	defaultRatePerKm: null,
	defaultRatePerHour: null,
};

const mockDispo = {
	id: "dispo-1",
	organizationId: "test-org-id",
	name: "Half-Day Disposal",
	description: "4 hours with driver at disposal",
	vehicleCategoryId: "category-id",
	includedDurationHours: new Decimal(4),
	includedDistanceKm: new Decimal(80),
	basePrice: new Decimal(280),
	overageRatePerKm: new Decimal(1.5),
	overageRatePerHour: new Decimal(45),
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	vehicleCategory: mockVehicleCategory,
};

describe("Dispos API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/dispos", () => {
		it("should return paginated dispos list", async () => {
			vi.mocked(db.dispoPackage.findMany).mockResolvedValue([mockDispo]);
			vi.mocked(db.dispoPackage.count).mockResolvedValue(1);

			const res = await client.pricing.dispos.$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(1);
			expect(json.data[0].name).toBe("Half-Day Disposal");
			expect(json.data[0].includedDurationHours).toBe(4);
			expect(json.data[0].basePrice).toBe(280);
			expect(json.data[0].overageRatePerKm).toBe(1.5);
			expect(json.meta.total).toBe(1);
		});

		it("should filter dispos by vehicleCategoryId", async () => {
			vi.mocked(db.dispoPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.dispoPackage.count).mockResolvedValue(0);

			await client.pricing.dispos.$get({
				query: { vehicleCategoryId: "category-id" },
			});

			expect(db.dispoPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						vehicleCategoryId: "category-id",
					}),
				}),
			);
		});

		it("should filter dispos by isActive status", async () => {
			vi.mocked(db.dispoPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.dispoPackage.count).mockResolvedValue(0);

			await client.pricing.dispos.$get({
				query: { isActive: "true" },
			});

			expect(db.dispoPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: true,
					}),
				}),
			);
		});

		it("should search dispos by name", async () => {
			vi.mocked(db.dispoPackage.findMany).mockResolvedValue([]);
			vi.mocked(db.dispoPackage.count).mockResolvedValue(0);

			await client.pricing.dispos.$get({
				query: { search: "half" },
			});

			expect(db.dispoPackage.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						OR: expect.arrayContaining([
							expect.objectContaining({
								name: expect.objectContaining({ contains: "half" }),
							}),
						]),
					}),
				}),
			);
		});
	});

	describe("GET /pricing/dispos/:id", () => {
		it("should return a single dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(mockDispo);

			const res = await client.pricing.dispos[":id"].$get({
				param: { id: "dispo-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Half-Day Disposal");
			expect(json.description).toBe("4 hours with driver at disposal");
		});

		it("should return 404 for non-existent dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.dispos[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/dispos", () => {
		it("should create a new dispo", async () => {
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				mockVehicleCategory as any,
			);
			vi.mocked(db.dispoPackage.create).mockResolvedValue(mockDispo);

			const res = await client.pricing.dispos.$post({
				json: {
					name: "Half-Day Disposal",
					description: "4 hours with driver at disposal",
					vehicleCategoryId: "category-id",
					includedDurationHours: 4,
					includedDistanceKm: 80,
					basePrice: 280,
					overageRatePerKm: 1.5,
					overageRatePerHour: 45,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.name).toBe("Half-Day Disposal");
		});

		it("should return 400 for invalid vehicle category", async () => {
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const res = await client.pricing.dispos.$post({
				json: {
					name: "Test Dispo",
					vehicleCategoryId: "invalid-category",
					includedDurationHours: 4,
					includedDistanceKm: 50,
					basePrice: 200,
					overageRatePerKm: 1.5,
					overageRatePerHour: 40,
					isActive: true,
				},
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /pricing/dispos/:id", () => {
		it("should update an existing dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(mockDispo);
			vi.mocked(db.dispoPackage.update).mockResolvedValue({
				...mockDispo,
				name: "Updated Package Name",
			});

			const res = await client.pricing.dispos[":id"].$patch({
				param: { id: "dispo-1" },
				json: { name: "Updated Package Name" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Updated Package Name");
		});

		it("should return 404 for non-existent dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.dispos[":id"].$patch({
				param: { id: "non-existent" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(404);
		});

		it("should update overage rates", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(mockDispo);
			vi.mocked(db.dispoPackage.update).mockResolvedValue({
				...mockDispo,
				overageRatePerKm: new Decimal(2.0),
				overageRatePerHour: new Decimal(50),
			});

			const res = await client.pricing.dispos[":id"].$patch({
				param: { id: "dispo-1" },
				json: { overageRatePerKm: 2.0, overageRatePerHour: 50 },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.overageRatePerKm).toBe(2.0);
			expect(json.overageRatePerHour).toBe(50);
		});
	});

	describe("DELETE /pricing/dispos/:id", () => {
		it("should delete a dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(mockDispo);
			vi.mocked(db.dispoPackage.delete).mockResolvedValue(mockDispo);

			const res = await client.pricing.dispos[":id"].$delete({
				param: { id: "dispo-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent dispo", async () => {
			vi.mocked(db.dispoPackage.findFirst).mockResolvedValue(null);

			const res = await client.pricing.dispos[":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});
});
