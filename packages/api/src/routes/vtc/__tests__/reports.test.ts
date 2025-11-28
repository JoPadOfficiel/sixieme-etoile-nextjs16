import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { reportsRouter } from "../reports";

/**
 * Reports API Tests
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 */

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		quote: {
			findMany: vi.fn(),
		},
	},
}));

// Mock organization middleware
vi.mock("../../../middleware/organization", () => ({
	organizationMiddleware: vi.fn((c, next) => {
		c.set("organizationId", "test-org-id");
		return next();
	}),
}));

// Mock tenant filter
vi.mock("../../../lib/tenant-prisma", () => ({
	withTenantFilter: vi.fn((where) => ({ ...where, organizationId: "test-org-id" })),
}));

import { db } from "@repo/database";

describe("Reports API Routes", () => {
	const app = new Hono().route("/", reportsRouter);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /reports/profitability", () => {
		it("should return profitability report with summary and data", async () => {
			const mockQuotes = [
				{
					id: "quote-1",
					finalPrice: 200,
					internalCost: 150,
					marginPercent: 25,
					pickupAt: new Date("2024-01-15"),
					contactId: "contact-1",
					vehicleCategoryId: "cat-1",
					contact: { id: "contact-1", displayName: "Client A" },
					vehicleCategory: { id: "cat-1", name: "Sedan", code: "SED" },
				},
				{
					id: "quote-2",
					finalPrice: 300,
					internalCost: 280,
					marginPercent: 7,
					pickupAt: new Date("2024-01-16"),
					contactId: "contact-2",
					vehicleCategoryId: "cat-1",
					contact: { id: "contact-2", displayName: "Client B" },
					vehicleCategory: { id: "cat-1", name: "Sedan", code: "SED" },
				},
				{
					id: "quote-3",
					finalPrice: 100,
					internalCost: 120,
					marginPercent: -20,
					pickupAt: new Date("2024-01-17"),
					contactId: "contact-1",
					vehicleCategoryId: "cat-2",
					contact: { id: "contact-1", displayName: "Client A" },
					vehicleCategory: { id: "cat-2", name: "Van", code: "VAN" },
				},
			];

			vi.mocked(db.quote.findMany).mockResolvedValue(mockQuotes as never);

			const res = await app.request("/reports/profitability");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.summary).toBeDefined();
			expect(data.summary.totalRevenue).toBe(600);
			expect(data.summary.totalCost).toBe(550);
			expect(data.summary.lossCount).toBe(1);
			expect(data.summary.totalCount).toBe(3);
			expect(data.data).toHaveLength(3);
		});

		it("should filter by profitability level (red)", async () => {
			vi.mocked(db.quote.findMany).mockResolvedValue([]);

			const res = await app.request("/reports/profitability?profitabilityLevel=red");
			expect(res.status).toBe(200);

			// Verify the filter was applied (margin < 0)
			expect(db.quote.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						marginPercent: { lt: 0 },
					}),
				})
			);
		});

		it("should group by client", async () => {
			const mockQuotes = [
				{
					id: "quote-1",
					finalPrice: 200,
					internalCost: 150,
					marginPercent: 25,
					pickupAt: new Date("2024-01-15"),
					contactId: "contact-1",
					vehicleCategoryId: "cat-1",
					contact: { id: "contact-1", displayName: "Client A" },
					vehicleCategory: { id: "cat-1", name: "Sedan", code: "SED" },
				},
				{
					id: "quote-2",
					finalPrice: 300,
					internalCost: 250,
					marginPercent: 17,
					pickupAt: new Date("2024-01-16"),
					contactId: "contact-1",
					vehicleCategoryId: "cat-1",
					contact: { id: "contact-1", displayName: "Client A" },
					vehicleCategory: { id: "cat-1", name: "Sedan", code: "SED" },
				},
			];

			vi.mocked(db.quote.findMany).mockResolvedValue(mockQuotes as never);

			const res = await app.request("/reports/profitability?groupBy=client");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.data).toHaveLength(1); // Grouped into 1 client
			expect(data.data[0].groupLabel).toBe("Client A");
			expect(data.data[0].count).toBe(2);
			expect(data.data[0].revenue).toBe(500);
		});

		it("should group by vehicle category", async () => {
			const mockQuotes = [
				{
					id: "quote-1",
					finalPrice: 200,
					internalCost: 150,
					marginPercent: 25,
					pickupAt: new Date("2024-01-15"),
					contactId: "contact-1",
					vehicleCategoryId: "cat-1",
					contact: { id: "contact-1", displayName: "Client A" },
					vehicleCategory: { id: "cat-1", name: "Sedan", code: "SED" },
				},
				{
					id: "quote-2",
					finalPrice: 400,
					internalCost: 350,
					marginPercent: 12.5,
					pickupAt: new Date("2024-01-16"),
					contactId: "contact-2",
					vehicleCategoryId: "cat-2",
					contact: { id: "contact-2", displayName: "Client B" },
					vehicleCategory: { id: "cat-2", name: "Van", code: "VAN" },
				},
			];

			vi.mocked(db.quote.findMany).mockResolvedValue(mockQuotes as never);

			const res = await app.request("/reports/profitability?groupBy=vehicleCategory");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.data).toHaveLength(2); // 2 categories
		});

		it("should return empty data when no quotes match", async () => {
			vi.mocked(db.quote.findMany).mockResolvedValue([]);

			const res = await app.request("/reports/profitability");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.summary.totalCount).toBe(0);
			expect(data.summary.totalRevenue).toBe(0);
			expect(data.data).toHaveLength(0);
		});

		it("should respect organization isolation (multi-tenancy)", async () => {
			vi.mocked(db.quote.findMany).mockResolvedValue([]);

			await app.request("/reports/profitability");

			expect(db.quote.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				})
			);
		});
	});
});
