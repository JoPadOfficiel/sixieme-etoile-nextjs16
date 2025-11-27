/**
 * Seasonal Multipliers API Tests
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 */

import { Decimal } from "@prisma/client/runtime/library";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { seasonalMultipliersRouter } from "../seasonal-multipliers";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		seasonalMultiplier: {
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

const app = new Hono().route("/", seasonalMultipliersRouter);
const client = testClient(app);

// Helper to create dates
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

// Mock data
const mockActiveMultiplier = {
	id: "multiplier-active",
	organizationId: "test-org-id",
	name: "Summer Peak",
	description: "Summer high season",
	startDate: lastWeek,
	endDate: nextWeek,
	multiplier: new Decimal(1.3),
	priority: 10,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockUpcomingMultiplier = {
	id: "multiplier-upcoming",
	organizationId: "test-org-id",
	name: "Le Bourget Air Show",
	description: "Biennial aerospace event",
	startDate: nextWeek,
	endDate: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
	multiplier: new Decimal(1.5),
	priority: 20,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockExpiredMultiplier = {
	id: "multiplier-expired",
	organizationId: "test-org-id",
	name: "Winter Sale",
	description: "Winter discount period",
	startDate: new Date(lastWeek.getTime() - 14 * 24 * 60 * 60 * 1000),
	endDate: yesterday,
	multiplier: new Decimal(0.9),
	priority: 5,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("Seasonal Multipliers API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/seasonal-multipliers/stats", () => {
		it("should return correct statistics", async () => {
			vi.mocked(db.seasonalMultiplier.count)
				.mockResolvedValueOnce(1) // currentlyActive
				.mockResolvedValueOnce(2) // upcoming
				.mockResolvedValueOnce(5); // total

			const res = await client.pricing["seasonal-multipliers"].stats.$get();

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.currentlyActive).toBe(1);
			expect(json.upcoming).toBe(2);
			expect(json.total).toBe(5);
		});
	});

	describe("GET /pricing/seasonal-multipliers", () => {
		it("should return paginated multipliers list", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([
				mockActiveMultiplier,
				mockUpcomingMultiplier,
			]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(2);

			const res = await client.pricing["seasonal-multipliers"].$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(2);
			expect(json.data[0].name).toBe("Summer Peak");
			expect(json.data[0].multiplier).toBe(1.3);
			expect(json.data[0].status).toBe("active");
			expect(json.meta.total).toBe(2);
		});

		it("should filter by status=active", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([
				mockActiveMultiplier,
			]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(1);

			const res = await client.pricing["seasonal-multipliers"].$get({
				query: { status: "active" },
			});

			expect(res.status).toBe(200);
			expect(db.seasonalMultiplier.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: true,
					}),
				})
			);
		});

		it("should filter by status=upcoming", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([
				mockUpcomingMultiplier,
			]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(1);

			await client.pricing["seasonal-multipliers"].$get({
				query: { status: "upcoming" },
			});

			expect(db.seasonalMultiplier.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						startDate: expect.objectContaining({ gt: expect.any(Date) }),
					}),
				})
			);
		});

		it("should filter by status=expired", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([
				mockExpiredMultiplier,
			]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(1);

			await client.pricing["seasonal-multipliers"].$get({
				query: { status: "expired" },
			});

			expect(db.seasonalMultiplier.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						endDate: expect.objectContaining({ lt: expect.any(Date) }),
					}),
				})
			);
		});

		it("should search by name", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(0);

			await client.pricing["seasonal-multipliers"].$get({
				query: { search: "Bourget" },
			});

			expect(db.seasonalMultiplier.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({
								name: { contains: "Bourget", mode: "insensitive" },
							}),
						]),
					}),
				})
			);
		});
	});

	describe("GET /pricing/seasonal-multipliers/:id", () => {
		it("should return a single multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(
				mockActiveMultiplier
			);

			const res = await client.pricing["seasonal-multipliers"][":id"].$get({
				param: { id: "multiplier-active" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Summer Peak");
			expect(json.multiplier).toBe(1.3);
		});

		it("should return 404 for non-existent multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(null);

			const res = await client.pricing["seasonal-multipliers"][":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/seasonal-multipliers", () => {
		it("should create a new multiplier", async () => {
			const newMultiplier = {
				...mockActiveMultiplier,
				id: "new-multiplier",
			};
			vi.mocked(db.seasonalMultiplier.create).mockResolvedValue(newMultiplier);

			const res = await client.pricing["seasonal-multipliers"].$post({
				json: {
					name: "Summer Peak",
					description: "Summer high season",
					startDate: lastWeek.toISOString(),
					endDate: nextWeek.toISOString(),
					multiplier: 1.3,
					priority: 10,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.name).toBe("Summer Peak");
		});

		it("should validate required fields", async () => {
			const res = await client.pricing["seasonal-multipliers"].$post({
				json: {
					name: "",
					startDate: lastWeek.toISOString(),
					endDate: nextWeek.toISOString(),
					multiplier: 1.3,
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate multiplier range", async () => {
			const res = await client.pricing["seasonal-multipliers"].$post({
				json: {
					name: "Invalid Multiplier",
					startDate: lastWeek.toISOString(),
					endDate: nextWeek.toISOString(),
					multiplier: 5.0, // > 3.0
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate endDate >= startDate", async () => {
			vi.mocked(db.seasonalMultiplier.create).mockRejectedValue(
				new Error("End date must be greater than or equal to start date")
			);

			const res = await client.pricing["seasonal-multipliers"].$post({
				json: {
					name: "Invalid Dates",
					startDate: nextWeek.toISOString(),
					endDate: lastWeek.toISOString(), // Before start
					multiplier: 1.3,
				},
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /pricing/seasonal-multipliers/:id", () => {
		it("should update an existing multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(
				mockActiveMultiplier
			);
			vi.mocked(db.seasonalMultiplier.update).mockResolvedValue({
				...mockActiveMultiplier,
				name: "Updated Name",
			});

			const res = await client.pricing["seasonal-multipliers"][":id"].$patch({
				param: { id: "multiplier-active" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Updated Name");
		});

		it("should return 404 for non-existent multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(null);

			const res = await client.pricing["seasonal-multipliers"][":id"].$patch({
				param: { id: "non-existent" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(404);
		});

		it("should allow partial updates", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(
				mockActiveMultiplier
			);
			vi.mocked(db.seasonalMultiplier.update).mockResolvedValue({
				...mockActiveMultiplier,
				multiplier: new Decimal(1.5),
			});

			const res = await client.pricing["seasonal-multipliers"][":id"].$patch({
				param: { id: "multiplier-active" },
				json: { multiplier: 1.5 },
			});

			expect(res.status).toBe(200);
			expect(db.seasonalMultiplier.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						multiplier: 1.5,
					}),
				})
			);
		});
	});

	describe("DELETE /pricing/seasonal-multipliers/:id", () => {
		it("should delete a multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(
				mockActiveMultiplier
			);
			vi.mocked(db.seasonalMultiplier.delete).mockResolvedValue(
				mockActiveMultiplier
			);

			const res = await client.pricing["seasonal-multipliers"][":id"].$delete({
				param: { id: "multiplier-active" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent multiplier", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(null);

			const res = await client.pricing["seasonal-multipliers"][":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy", () => {
		it("should only return multipliers for the current organization", async () => {
			vi.mocked(db.seasonalMultiplier.findMany).mockResolvedValue([
				mockActiveMultiplier,
			]);
			vi.mocked(db.seasonalMultiplier.count).mockResolvedValue(1);

			await client.pricing["seasonal-multipliers"].$get({
				query: {},
			});

			expect(db.seasonalMultiplier.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				})
			);
		});

		it("should not return multiplier from another organization", async () => {
			vi.mocked(db.seasonalMultiplier.findFirst).mockResolvedValue(null);

			const res = await client.pricing["seasonal-multipliers"][":id"].$get({
				param: { id: "other-org-multiplier" },
			});

			expect(res.status).toBe(404);
		});
	});
});
