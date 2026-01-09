/**
 * Optional Fees API Tests
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 */

import { Decimal } from "@prisma/client/runtime/library";
import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { optionalFeesRouter } from "../optional-fees";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		optionalFee: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			findUnique: vi.fn(),
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

const app = new Hono().route("/", optionalFeesRouter);
const client = testClient(app);

// Mock data
const mockFixedFee = {
	id: "fee-fixed",
	organizationId: "test-org-id",
	name: "Baby Seat",
	description: "Child safety seat for infants",
	amountType: "FIXED" as const,
	amount: new Decimal(15.0),
	isTaxable: true,
	vatRate: new Decimal(20.0),
	autoApplyRules: null,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockPercentageFee = {
	id: "fee-percentage",
	organizationId: "test-org-id",
	name: "Premium Service",
	description: "Premium service surcharge",
	amountType: "PERCENTAGE" as const,
	amount: new Decimal(10.0),
	isTaxable: true,
	vatRate: new Decimal(20.0),
	autoApplyRules: null,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockFeeWithAutoApply = {
	id: "fee-auto-apply",
	organizationId: "test-org-id",
	name: "Airport Waiting Fee",
	description: "Additional waiting time at airport",
	amountType: "FIXED" as const,
	amount: new Decimal(25.0),
	isTaxable: true,
	vatRate: new Decimal(20.0),
	autoApplyRules: [{ type: "AIRPORT_PICKUP" }, { type: "AIRPORT_DROPOFF" }],
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockInactiveFee = {
	id: "fee-inactive",
	organizationId: "test-org-id",
	name: "Old Fee",
	description: "Deprecated fee",
	amountType: "FIXED" as const,
	amount: new Decimal(5.0),
	isTaxable: false,
	vatRate: new Decimal(0),
	autoApplyRules: null,
	isActive: false,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("Optional Fees API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /pricing/optional-fees/stats", () => {
		it("should return correct statistics", async () => {
			vi.mocked(db.optionalFee.count)
				.mockResolvedValueOnce(2) // fixed
				.mockResolvedValueOnce(1) // percentage
				.mockResolvedValueOnce(3) // taxable
				.mockResolvedValueOnce(3); // totalActive

			const res = await client.pricing["optional-fees"].stats.$get();

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.fixed).toBe(2);
			expect(json.percentage).toBe(1);
			expect(json.taxable).toBe(3);
			expect(json.totalActive).toBe(3);
		});
	});

	describe("GET /pricing/optional-fees", () => {
		it("should return paginated fees list", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([
				mockFixedFee,
				mockPercentageFee,
			]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(2);

			const res = await client.pricing["optional-fees"].$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(2);
			expect(json.data[0].name).toBe("Baby Seat");
			expect(json.data[0].amount).toBe(15);
			expect(json.data[0].amountType).toBe("FIXED");
			expect(json.meta.total).toBe(2);
		});

		it("should filter by type=FIXED", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([mockFixedFee]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(1);

			const res = await client.pricing["optional-fees"].$get({
				query: { type: "FIXED" },
			});

			expect(res.status).toBe(200);
			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						amountType: "FIXED",
					}),
				})
			);
		});

		it("should filter by type=PERCENTAGE", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([mockPercentageFee]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(1);

			await client.pricing["optional-fees"].$get({
				query: { type: "PERCENTAGE" },
			});

			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						amountType: "PERCENTAGE",
					}),
				})
			);
		});

		it("should filter by status=active", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([mockFixedFee]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(1);

			await client.pricing["optional-fees"].$get({
				query: { status: "active" },
			});

			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: true,
					}),
				})
			);
		});

		it("should filter by status=inactive", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([mockInactiveFee]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(1);

			await client.pricing["optional-fees"].$get({
				query: { status: "inactive" },
			});

			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isActive: false,
					}),
				})
			);
		});

		it("should search by name", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(0);

			await client.pricing["optional-fees"].$get({
				query: { search: "Baby" },
			});

			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({
								name: { contains: "Baby", mode: "insensitive" },
							}),
						]),
					}),
				})
			);
		});

		it("should return empty array when no fees exist", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(0);

			const res = await client.pricing["optional-fees"].$get({
				query: {},
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(0);
			expect(json.meta.total).toBe(0);
		});
	});

	describe("GET /pricing/optional-fees/:id", () => {
		it("should return a single fee", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(mockFixedFee);

			const res = await client.pricing["optional-fees"][":id"].$get({
				param: { id: "fee-fixed" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Baby Seat");
			expect(json.amount).toBe(15);
		});

		it("should return 404 for non-existent fee", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(null);

			const res = await client.pricing["optional-fees"][":id"].$get({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /pricing/optional-fees", () => {
		it("should create a FIXED fee", async () => {
			const newFee = {
				...mockFixedFee,
				id: "new-fee",
			};
			vi.mocked(db.optionalFee.create).mockResolvedValue(newFee);
			vi.mocked(db.optionalFee.findUnique).mockResolvedValue(newFee);

			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "Baby Seat",
					description: "Child safety seat for infants",
					amountType: "FIXED",
					amount: 15.0,
					isTaxable: true,
					vatRate: 20.0,
					isActive: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.name).toBe("Baby Seat");
		});

		it("should create a PERCENTAGE fee", async () => {
			const newFee = {
				...mockPercentageFee,
				id: "new-percentage-fee",
			};
			vi.mocked(db.optionalFee.create).mockResolvedValue(newFee);
			vi.mocked(db.optionalFee.findUnique).mockResolvedValue(newFee);

			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "Premium Service",
					amountType: "PERCENTAGE",
					amount: 10.0,
					isTaxable: true,
					vatRate: 20.0,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.amountType).toBe("PERCENTAGE");
		});

		it("should create fee with auto-apply rules", async () => {
			vi.mocked(db.optionalFee.create).mockResolvedValue(mockFeeWithAutoApply);
			vi.mocked(db.optionalFee.findUnique).mockResolvedValue(mockFeeWithAutoApply);

			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "Airport Waiting Fee",
					amountType: "FIXED",
					amount: 25.0,
					autoApplyRules: [
						{ type: "AIRPORT_PICKUP" },
						{ type: "AIRPORT_DROPOFF" },
					],
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.autoApplyRules).toHaveLength(2);
		});

		it("should validate required fields", async () => {
			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "",
					amountType: "FIXED",
					amount: 15.0,
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate amount is positive", async () => {
			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "Invalid Fee",
					amountType: "FIXED",
					amount: -5.0,
				},
			});

			expect(res.status).toBe(400);
		});

		it("should validate vatRate range", async () => {
			const res = await client.pricing["optional-fees"].$post({
				json: {
					name: "Invalid VAT",
					amountType: "FIXED",
					amount: 15.0,
					vatRate: 150, // > 100
				},
			});

			expect(res.status).toBe(400);
		});

		it("should set default isTaxable to true", async () => {
			vi.mocked(db.optionalFee.create).mockResolvedValue(mockFixedFee);

			await client.pricing["optional-fees"].$post({
				json: {
					name: "Default Taxable",
					amountType: "FIXED",
					amount: 15.0,
				},
			});

			expect(db.optionalFee.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						isTaxable: true,
					}),
				})
			);
		});

		it("should set default vatRate to 20", async () => {
			vi.mocked(db.optionalFee.create).mockResolvedValue(mockFixedFee);

			await client.pricing["optional-fees"].$post({
				json: {
					name: "Default VAT",
					amountType: "FIXED",
					amount: 15.0,
				},
			});

			expect(db.optionalFee.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						vatRate: 20,
					}),
				})
			);
		});

		it("should set default isActive to true", async () => {
			vi.mocked(db.optionalFee.create).mockResolvedValue(mockFixedFee);

			await client.pricing["optional-fees"].$post({
				json: {
					name: "Default Active",
					amountType: "FIXED",
					amount: 15.0,
				},
			});

			expect(db.optionalFee.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						isActive: true,
					}),
				})
			);
		});
	});

	describe("PATCH /pricing/optional-fees/:id", () => {
		it("should update fee fields", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(mockFixedFee);
			vi.mocked(db.optionalFee.update).mockResolvedValue({
				...mockFixedFee,
				name: "Updated Name",
			});

			const res = await client.pricing["optional-fees"][":id"].$patch({
				param: { id: "fee-fixed" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.name).toBe("Updated Name");
		});

		it("should allow partial updates", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(mockFixedFee);
			vi.mocked(db.optionalFee.update).mockResolvedValue({
				...mockFixedFee,
				amount: new Decimal(20.0),
			});

			const res = await client.pricing["optional-fees"][":id"].$patch({
				param: { id: "fee-fixed" },
				json: { amount: 20.0 },
			});

			expect(res.status).toBe(200);
		});

		it("should update auto-apply rules", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(mockFixedFee);
			vi.mocked(db.optionalFee.update).mockResolvedValue({
				...mockFixedFee,
				autoApplyRules: [{ type: "NIGHT_SERVICE" }],
			});

			const res = await client.pricing["optional-fees"][":id"].$patch({
				param: { id: "fee-fixed" },
				json: { autoApplyRules: [{ type: "NIGHT_SERVICE" }] },
			});

			expect(res.status).toBe(200);
		});

		it("should return 404 for non-existent fee", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(null);

			const res = await client.pricing["optional-fees"][":id"].$patch({
				param: { id: "non-existent" },
				json: { name: "Updated Name" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /pricing/optional-fees/:id", () => {
		it("should delete a fee", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(mockFixedFee);
			vi.mocked(db.optionalFee.delete).mockResolvedValue(mockFixedFee);

			const res = await client.pricing["optional-fees"][":id"].$delete({
				param: { id: "fee-fixed" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent fee", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(null);

			const res = await client.pricing["optional-fees"][":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy", () => {
		it("should only return fees for the current organization", async () => {
			vi.mocked(db.optionalFee.findMany).mockResolvedValue([mockFixedFee]);
			vi.mocked(db.optionalFee.count).mockResolvedValue(1);

			await client.pricing["optional-fees"].$get({
				query: {},
			});

			expect(db.optionalFee.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				})
			);
		});

		it("should not return fee from another organization", async () => {
			vi.mocked(db.optionalFee.findFirst).mockResolvedValue(null);

			const res = await client.pricing["optional-fees"][":id"].$get({
				param: { id: "other-org-fee" },
			});

			expect(res.status).toBe(404);
		});
	});
});
