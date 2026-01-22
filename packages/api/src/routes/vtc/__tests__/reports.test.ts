import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { reportsRouter } from "../reports";

/**
 * Reports API Tests
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 * Story 30.3: Validated Financial Reporting - Invoice-based revenue
 */

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		invoice: {
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
		it("should return profitability report with summary and data from invoices", async () => {
			const mockInvoices = [
				{
					id: "invoice-1",
					number: "INV-001",
					totalExclVat: 200,
					totalInclVat: 240,
					paidAmount: 240,
					costBreakdown: { internalCost: 150 },
					issueDate: new Date("2024-01-15"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
				{
					id: "invoice-2",
					number: "INV-002",
					totalExclVat: 300,
					totalInclVat: 360,
					paidAmount: 200,
					costBreakdown: { internalCost: 280 },
					issueDate: new Date("2024-01-16"),
					contactId: "contact-2",
					contact: { id: "contact-2", displayName: "Client B" },
				},
				{
					id: "invoice-3",
					number: "INV-003",
					totalExclVat: 100,
					totalInclVat: 120,
					paidAmount: 0,
					costBreakdown: { internalCost: 120 },
					issueDate: new Date("2024-01-17"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(mockInvoices as never);

			const res = await app.request("/reports/profitability");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.summary).toBeDefined();
			expect(data.summary.totalRevenue).toBe(600);
			expect(data.summary.totalCost).toBe(550);
			expect(data.summary.lossCount).toBe(1); // Invoice-3 has negative margin
			expect(data.summary.totalCount).toBe(3);
			expect(data.summary.paidAmount).toBe(440); // 240 + 200 + 0
			expect(data.summary.pendingAmount).toBe(280); // (360-200) + (120-0)
			expect(data.data).toHaveLength(3);
		});

		it("should pass vehicleCategoryId filter to invoice query", async () => {
			vi.mocked(db.invoice.findMany).mockResolvedValue([]);

			await app.request("/reports/profitability?vehicleCategoryId=cat-1");

			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						quote: { vehicleCategoryId: "cat-1" },
					}),
				})
			);
		});

		it("should filter invoices by status (only ISSUED, PARTIAL, PAID)", async () => {
			vi.mocked(db.invoice.findMany).mockResolvedValue([]);

			await app.request("/reports/profitability");

			// Verify the status filter was applied
			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						status: { in: ["ISSUED", "PARTIAL", "PAID"] },
					}),
				})
			);
		});

		it("should filter by profitability level (red) and update summary", async () => {
			const mockInvoices = [
				{
					id: "invoice-1",
					number: "INV-001",
					totalExclVat: 200,
					totalInclVat: 240,
					paidAmount: 240,
					costBreakdown: { internalCost: 150 },
					issueDate: new Date("2024-01-15"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
				{
					id: "invoice-2",
					number: "INV-002",
					totalExclVat: 100,
					totalInclVat: 120,
					paidAmount: 0,
					costBreakdown: { internalCost: 130 },
					issueDate: new Date("2024-01-16"),
					contactId: "contact-2",
					contact: { id: "contact-2", displayName: "Client B" },
				},
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(mockInvoices as never);

			const res = await app.request("/reports/profitability?profitabilityLevel=red");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.summary.totalRevenue).toBe(100);
			expect(data.summary.totalCount).toBe(1);
			expect(data.data).toHaveLength(1);
			expect(data.data[0].invoiceId).toBe("invoice-2");
		});

		it("should group by client", async () => {
			const mockInvoices = [
				{
					id: "invoice-1",
					number: "INV-001",
					totalExclVat: 200,
					totalInclVat: 240,
					paidAmount: 240,
					costBreakdown: { internalCost: 150 },
					issueDate: new Date("2024-01-15"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
				{
					id: "invoice-2",
					number: "INV-002",
					totalExclVat: 300,
					totalInclVat: 360,
					paidAmount: 360,
					costBreakdown: { internalCost: 250 },
					issueDate: new Date("2024-01-16"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(mockInvoices as never);

			const res = await app.request("/reports/profitability?groupBy=client");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.data).toHaveLength(1); // Grouped into 1 client
			expect(data.data[0].groupLabel).toBe("Client A");
			expect(data.data[0].count).toBe(2);
			expect(data.data[0].revenue).toBe(500);
		});

		it("should group by vehicle category (all categories)", async () => {
			const mockInvoices = [
				{
					id: "invoice-1",
					number: "INV-001",
					totalExclVat: 200,
					totalInclVat: 240,
					paidAmount: 240,
					costBreakdown: { internalCost: 150 },
					issueDate: new Date("2024-01-15"),
					contactId: "contact-1",
					contact: { id: "contact-1", displayName: "Client A" },
				},
				{
					id: "invoice-2",
					number: "INV-002",
					totalExclVat: 400,
					totalInclVat: 480,
					paidAmount: 480,
					costBreakdown: { internalCost: 350 },
					issueDate: new Date("2024-01-16"),
					contactId: "contact-2",
					contact: { id: "contact-2", displayName: "Client B" },
				},
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(mockInvoices as never);

			const res = await app.request("/reports/profitability?groupBy=vehicleCategory");
			expect(res.status).toBe(200);

			const data = await res.json();
			// Story 30.3: Invoice doesn't have vehicleCategoryId, so all grouped under "All Categories"
			expect(data.data).toHaveLength(1);
			expect(data.data[0].groupLabel).toBe("All Categories");
		});

		it("should return empty data when no invoices match", async () => {
			vi.mocked(db.invoice.findMany).mockResolvedValue([]);

			const res = await app.request("/reports/profitability");
			expect(res.status).toBe(200);

			const data = await res.json();
			expect(data.summary.totalCount).toBe(0);
			expect(data.summary.totalRevenue).toBe(0);
			expect(data.summary.paidAmount).toBe(0);
			expect(data.summary.pendingAmount).toBe(0);
			expect(data.data).toHaveLength(0);
		});

		it("should respect organization isolation (multi-tenancy)", async () => {
			vi.mocked(db.invoice.findMany).mockResolvedValue([]);

			await app.request("/reports/profitability");

			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
					}),
				})
			);
		});

		it("should exclude DRAFT and CANCELLED invoices from revenue", async () => {
			// This test verifies the WHERE clause excludes DRAFT and CANCELLED
			vi.mocked(db.invoice.findMany).mockResolvedValue([]);

			await app.request("/reports/profitability");

			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						status: { in: ["ISSUED", "PARTIAL", "PAID"] },
					}),
				})
			);
		});
	});
});
