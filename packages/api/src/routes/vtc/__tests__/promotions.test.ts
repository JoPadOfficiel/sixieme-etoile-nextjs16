/**
 * Promotions API Tests
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 */

import { Decimal } from "@prisma/client/runtime/library";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { promotionsRouter } from "../promotions";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		promotion: {
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

const app = new Hono().route("/", promotionsRouter);
const client = testClient(app);

// Helper to create dates
const now = new Date();
const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
const farFutureDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days from now

// Mock data
const mockActivePromotion = {
	id: "promo-active",
	organizationId: "test-org-id",
	code: "SUMMER2024",
	description: "Summer discount campaign",
	discountType: "FIXED" as const,
	value: new Decimal(20.0),
	validFrom: pastDate,
	validTo: futureDate,
	maxTotalUses: 100,
	maxUsesPerContact: 1,
	currentUses: 45,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockPercentagePromotion = {
	id: "promo-percentage",
	organizationId: "test-org-id",
	code: "VIP15",
	description: "VIP 15% discount",
	discountType: "PERCENTAGE" as const,
	value: new Decimal(15.0),
	validFrom: pastDate,
	validTo: futureDate,
	maxTotalUses: null,
	maxUsesPerContact: null,
	currentUses: 10,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockExpiredPromotion = {
	id: "promo-expired",
	organizationId: "test-org-id",
	code: "OLDCODE",
	description: "Expired promotion",
	discountType: "FIXED" as const,
	value: new Decimal(10.0),
	validFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
	validTo: pastDate,
	maxTotalUses: 50,
	maxUsesPerContact: null,
	currentUses: 30,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockUpcomingPromotion = {
	id: "promo-upcoming",
	organizationId: "test-org-id",
	code: "NEWYEAR2025",
	description: "New Year promotion",
	discountType: "PERCENTAGE" as const,
	value: new Decimal(25.0),
	validFrom: futureDate,
	validTo: farFutureDate,
	maxTotalUses: 200,
	maxUsesPerContact: 2,
	currentUses: 0,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockInactivePromotion = {
	id: "promo-inactive",
	organizationId: "test-org-id",
	code: "DISABLED",
	description: "Disabled promotion",
	discountType: "FIXED" as const,
	value: new Decimal(5.0),
	validFrom: pastDate,
	validTo: futureDate,
	maxTotalUses: null,
	maxUsesPerContact: null,
	currentUses: 0,
	isActive: false,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockUsageLimitReachedPromotion = {
	id: "promo-limit-reached",
	organizationId: "test-org-id",
	code: "LIMITREACHED",
	description: "Usage limit reached",
	discountType: "FIXED" as const,
	value: new Decimal(10.0),
	validFrom: pastDate,
	validTo: futureDate,
	maxTotalUses: 50,
	maxUsesPerContact: null,
	currentUses: 50, // Limit reached
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("Promotions API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/promotions/stats", () => {
		it("should return correct statistics", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([
				mockActivePromotion,
				mockPercentagePromotion,
				mockExpiredPromotion,
				mockUpcomingPromotion,
				mockInactivePromotion,
			]);

			const res = await client.pricing.promotions.stats.$get();

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.active).toBe(2); // mockActivePromotion, mockPercentagePromotion
			expect(json.expired).toBe(1); // mockExpiredPromotion
			expect(json.upcoming).toBe(1); // mockUpcomingPromotion
			expect(json.totalUses).toBe(85); // 45 + 10 + 30 + 0 + 0
		});

		it("should return zero counts when no promotions exist", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([]);

			const res = await client.pricing.promotions.stats.$get();

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.active).toBe(0);
			expect(json.expired).toBe(0);
			expect(json.upcoming).toBe(0);
			expect(json.totalUses).toBe(0);
		});
	});

	describe("GET /pricing/promotions/validate/:code", () => {
		it("should return valid=true for active promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "SUMMER2024" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; promotion?: { code: string } };
			expect(json.valid).toBe(true);
			expect(json.promotion).toBeDefined();
			expect(json.promotion?.code).toBe("SUMMER2024");
		});

		it("should return valid=false with reason NOT_FOUND", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "NOTEXIST" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; reason?: string };
			expect(json.valid).toBe(false);
			expect(json.reason).toBe("NOT_FOUND");
		});

		it("should return valid=false with reason EXPIRED", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockExpiredPromotion);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "OLDCODE" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; reason?: string };
			expect(json.valid).toBe(false);
			expect(json.reason).toBe("EXPIRED");
		});

		it("should return valid=false with reason NOT_STARTED", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockUpcomingPromotion);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "NEWYEAR2025" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; reason?: string };
			expect(json.valid).toBe(false);
			expect(json.reason).toBe("NOT_STARTED");
		});

		it("should return valid=false with reason USAGE_LIMIT_REACHED", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(
				mockUsageLimitReachedPromotion
			);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "LIMITREACHED" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; reason?: string };
			expect(json.valid).toBe(false);
			expect(json.reason).toBe("USAGE_LIMIT_REACHED");
		});

		it("should return valid=false with reason INACTIVE", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockInactivePromotion);

			const res = await client.pricing.promotions.validate[":code"].$get({
				param: { code: "DISABLED" },
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { valid: boolean; reason?: string };
			expect(json.valid).toBe(false);
			expect(json.reason).toBe("INACTIVE");
		});

		it("should be case-insensitive for code lookup", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);

			await client.pricing.promotions.validate[":code"].$get({
				param: { code: "summer2024" },
			});

			expect(db.promotion.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						code: "SUMMER2024",
					}),
				})
			);
		});
	});

	describe("GET /pricing/promotions", () => {
		it("should return paginated promotions list", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([
				mockActivePromotion,
				mockPercentagePromotion,
			]);
			vi.mocked(db.promotion.count).mockResolvedValue(2);

			const res = await client.pricing.promotions.$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(2);
			expect(json.data[0].code).toBe("SUMMER2024");
			expect(json.data[0].value).toBe(20);
			expect(json.data[0].discountType).toBe("FIXED");
			expect(json.data[0].status).toBe("active");
			expect(json.meta.total).toBe(2);
		});

		it("should filter by type=FIXED", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([mockActivePromotion]);
			vi.mocked(db.promotion.count).mockResolvedValue(1);

			const res = await client.pricing.promotions.$get({
				query: { type: "FIXED" },
			});

			expect(res.status).toBe(200);
			expect(db.promotion.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						discountType: "FIXED",
					}),
				})
			);
		});

		it("should filter by type=PERCENTAGE", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([
				mockPercentagePromotion,
			]);
			vi.mocked(db.promotion.count).mockResolvedValue(1);

			await client.pricing.promotions.$get({
				query: { type: "PERCENTAGE" },
			});

			expect(db.promotion.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						discountType: "PERCENTAGE",
					}),
				})
			);
		});

		it("should search by code", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([]);
			vi.mocked(db.promotion.count).mockResolvedValue(0);

			await client.pricing.promotions.$get({
				query: { search: "SUMMER" },
			});

			expect(db.promotion.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({
								code: { contains: "SUMMER", mode: "insensitive" },
							}),
						]),
					}),
				})
			);
		});

		it("should return empty array when no promotions exist", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([]);
			vi.mocked(db.promotion.count).mockResolvedValue(0);

			const res = await client.pricing.promotions.$get({
				query: {},
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(0);
			expect(json.meta.total).toBe(0);
		});

		it("should compute status correctly for each promotion", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([
				mockActivePromotion,
				mockExpiredPromotion,
				mockUpcomingPromotion,
				mockInactivePromotion,
			]);
			vi.mocked(db.promotion.count).mockResolvedValue(4);

			const res = await client.pricing.promotions.$get({
				query: {},
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			const statuses = json.data.map((p: { status: string }) => p.status);
			expect(statuses).toContain("active");
			expect(statuses).toContain("expired");
			expect(statuses).toContain("upcoming");
			expect(statuses).toContain("inactive");
		});
	});

	describe("GET /pricing/promotions/:id", () => {
		it("should return a single promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);

			const res = await client.pricing.promotions[":id"].$get({
				param: { id: "promo-active" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.code).toBe("SUMMER2024");
			expect(json.value).toBe(20);
			expect(json.status).toBe("active");
		});

		it("should return 404 for non-existent promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);

			const res = await client.pricing.promotions[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/promotions", () => {
		it("should create a FIXED promotion", async () => {
			const newPromo = {
				...mockActivePromotion,
				id: "new-promo",
				currentUses: 0,
			};
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null); // No duplicate
			vi.mocked(db.promotion.create).mockResolvedValue(newPromo);

			const res = await client.pricing.promotions.$post({
				json: {
					code: "SUMMER2024",
					description: "Summer discount campaign",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
					maxTotalUses: 100,
					maxUsesPerContact: 1,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.code).toBe("SUMMER2024");
		});

		it("should create a PERCENTAGE promotion", async () => {
			const newPromo = {
				...mockPercentagePromotion,
				id: "new-percentage-promo",
				currentUses: 0,
			};
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);
			vi.mocked(db.promotion.create).mockResolvedValue(newPromo);

			const res = await client.pricing.promotions.$post({
				json: {
					code: "VIP15",
					discountType: "PERCENTAGE",
					value: 15.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.discountType).toBe("PERCENTAGE");
		});

		it("should reject duplicate code within same organization", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);

			const res = await client.pricing.promotions.$post({
				json: {
					code: "SUMMER2024",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(res.status).toBe(409);
		});

		it("should validate required fields", async () => {
			const res = await client.pricing.promotions.$post({
				json: {
					code: "",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate value is positive", async () => {
			const res = await client.pricing.promotions.$post({
				json: {
					code: "INVALID",
					discountType: "FIXED",
					value: -5.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate validTo >= validFrom", async () => {
			const res = await client.pricing.promotions.$post({
				json: {
					code: "INVALID",
					discountType: "FIXED",
					value: 20.0,
					validFrom: futureDate.toISOString(),
					validTo: pastDate.toISOString(), // Before validFrom
				},
			});

			expect(res.status).toBe(400);
		});

		it("should convert code to uppercase", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);
			vi.mocked(db.promotion.create).mockResolvedValue({
				...mockActivePromotion,
				code: "LOWERCASE",
			});

			await client.pricing.promotions.$post({
				json: {
					code: "lowercase",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(db.promotion.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						code: "LOWERCASE",
					}),
				})
			);
		});

		it("should set default isActive to true", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);
			vi.mocked(db.promotion.create).mockResolvedValue(mockActivePromotion);

			await client.pricing.promotions.$post({
				json: {
					code: "NEWCODE",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(db.promotion.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						isActive: true,
					}),
				})
			);
		});

		it("should set currentUses to 0", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);
			vi.mocked(db.promotion.create).mockResolvedValue(mockActivePromotion);

			await client.pricing.promotions.$post({
				json: {
					code: "NEWCODE",
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(db.promotion.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						currentUses: 0,
					}),
				})
			);
		});
	});

	describe("PATCH /pricing/promotions/:id", () => {
		it("should update promotion fields", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);
			vi.mocked(db.promotion.update).mockResolvedValue({
				...mockActivePromotion,
				value: new Decimal(25.0),
			});

			const res = await client.pricing.promotions[":id"].$patch({
				param: { id: "promo-active" },
				json: { value: 25.0 },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.value).toBe(25);
		});

		it("should allow partial updates", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);
			vi.mocked(db.promotion.update).mockResolvedValue({
				...mockActivePromotion,
				description: "Updated description",
			});

			const res = await client.pricing.promotions[":id"].$patch({
				param: { id: "promo-active" },
				json: { description: "Updated description" },
			});

			expect(res.status).toBe(200);
		});

		it("should validate code uniqueness on update", async () => {
			// First call returns the promotion being updated
			vi.mocked(db.promotion.findFirst)
				.mockResolvedValueOnce(mockActivePromotion)
				// Second call finds a duplicate
				.mockResolvedValueOnce(mockPercentagePromotion);

			const res = await client.pricing.promotions[":id"].$patch({
				param: { id: "promo-active" },
				json: { code: "VIP15" }, // Trying to use existing code
			});

			expect(res.status).toBe(409);
		});

		it("should not allow updating currentUses", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);
			vi.mocked(db.promotion.update).mockResolvedValue(mockActivePromotion);

			await client.pricing.promotions[":id"].$patch({
				param: { id: "promo-active" },
				json: { value: 30.0 },
			});

			// currentUses should not be in the update data
			expect(db.promotion.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.not.objectContaining({
						currentUses: expect.anything(),
					}),
				})
			);
		});

		it("should return 404 for non-existent promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);

			const res = await client.pricing.promotions[":id"].$patch({
				param: { id: "non-existent" },
				json: { value: 25.0 },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /pricing/promotions/:id", () => {
		it("should delete a promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(mockActivePromotion);
			vi.mocked(db.promotion.delete).mockResolvedValue(mockActivePromotion);

			const res = await client.pricing.promotions[":id"].$delete({
				param: { id: "promo-active" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent promotion", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);

			const res = await client.pricing.promotions[":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy", () => {
		it("should only return promotions for the current organization", async () => {
			vi.mocked(db.promotion.findMany).mockResolvedValue([mockActivePromotion]);
			vi.mocked(db.promotion.count).mockResolvedValue(1);

			await client.pricing.promotions.$get({
				query: {},
			});

			expect(db.promotion.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				})
			);
		});

		it("should not return promotion from another organization", async () => {
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null);

			const res = await client.pricing.promotions[":id"].$get({
				param: { id: "other-org-promo" },
			});

			expect(res.status).toBe(404);
		});

		it("should enforce code uniqueness per organization only", async () => {
			// Same code can exist in different organizations
			vi.mocked(db.promotion.findFirst).mockResolvedValue(null); // No duplicate in current org
			vi.mocked(db.promotion.create).mockResolvedValue(mockActivePromotion);

			const res = await client.pricing.promotions.$post({
				json: {
					code: "SUMMER2024", // Same code as mockActivePromotion but different org
					discountType: "FIXED",
					value: 20.0,
					validFrom: pastDate.toISOString(),
					validTo: futureDate.toISOString(),
				},
			});

			expect(res.status).toBe(201);
		});
	});
});
