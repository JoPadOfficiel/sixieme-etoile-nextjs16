/**
 * Bulk Payment API Tests (Story 25.6: Lettrage)
 *
 * Tests for bulk payment application and balance calculation.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock the auth module
vi.mock("@repo/auth", () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

// Mock the database module
vi.mock("@repo/database", () => ({
	db: {
		organization: {
			findFirst: vi.fn(),
		},
		member: {
			findUnique: vi.fn(),
		},
		contact: {
			findFirst: vi.fn(),
		},
		invoice: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			update: vi.fn(),
		},
		$transaction: vi.fn((fn) => fn({
			invoice: {
				update: vi.fn(),
			},
		})),
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { invoicesBulkPaymentRouter } from "../invoices-bulk-payment";

describe("Bulk Payment API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", invoicesBulkPaymentRouter);
		return app;
	};

	const mockSession = (orgId: string = "org_123") => {
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: { activeOrganizationId: orgId },
			user: { id: "user_123" },
		} as any);
	};

	const mockOrganization = (orgId: string = "org_123") => {
		vi.mocked(db.organization.findFirst).mockResolvedValue({
			id: orgId,
		} as any);
	};

	const mockMembership = (role: string = "member") => {
		vi.mocked(db.member.findUnique).mockResolvedValue({
			id: "member_123",
			role,
			userId: "user_123",
			organizationId: "org_123",
			createdAt: new Date(),
		} as any);
	};

	const mockAuthenticatedUser = () => {
		mockSession();
		mockOrganization();
		mockMembership();
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /contact-balance/:contactId", () => {
		it("should calculate correct outstanding balance", async () => {
			mockAuthenticatedUser();
			
			vi.mocked(db.contact.findFirst).mockResolvedValue({
				id: "contact_1",
				displayName: "Test Contact",
				organizationId: "org_123",
			} as any);

			vi.mocked(db.invoice.findMany).mockResolvedValue([
				{
					id: "inv1",
					number: "INV-1",
					issueDate: new Date("2024-01-01"),
					dueDate: new Date("2024-02-01"),
					totalInclVat: 100,
					paidAmount: 0, // Unpaid
					status: "ISSUED",
				},
				{
					id: "inv2",
					number: "INV-2",
					issueDate: new Date("2024-01-02"),
					dueDate: new Date("2024-02-02"),
					totalInclVat: 200,
					paidAmount: 50, // Partially paid
					status: "PARTIAL",
				},
			] as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/contact-balance/contact_1", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			
			// Total outstanding = 100 + (200 - 50) = 250
			expect(data.totalOutstanding).toBe(250);
			expect(data.invoiceCount).toBe(2);
			expect(data.breakdown.issued).toBe(100);
			expect(data.breakdown.partial).toBe(150);
		});
	});

	describe("POST /bulk-payment", () => {
		it("should apply payment in FIFO order", async () => {
			mockAuthenticatedUser();

			// 3 invoices: 100€, 100€, 100€
			// Payment: 250€
			// Expected: Inv1 PAID, Inv2 PAID, Inv3 PARTIAL (50€ paid)
			const invoices = [
				{ id: "inv1", totalInclVat: 100, paidAmount: 0, status: "ISSUED", issueDate: new Date("2024-01-01") },
				{ id: "inv2", totalInclVat: 100, paidAmount: 0, status: "ISSUED", issueDate: new Date("2024-01-02") },
				{ id: "inv3", totalInclVat: 100, paidAmount: 0, status: "ISSUED", issueDate: new Date("2024-01-03") },
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(invoices as any);
			
			const updateSpy = vi.fn();
			vi.mocked(db.$transaction).mockImplementation(async (fn) => fn({
				invoice: { update: updateSpy },
			}));

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/bulk-payment", {
				method: "POST",
				headers: { "Content-Type": "application/json", Cookie: "session=test" },
				body: JSON.stringify({
					invoiceIds: ["inv1", "inv2", "inv3"],
					paymentAmount: 250,
				}),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
			expect(data.totalApplied).toBe(250);

			// Check DB updates
			expect(updateSpy).toHaveBeenCalledTimes(3);
			
			// Inv1: Fully paid
			expect(updateSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
				where: { id: "inv1" },
				data: { paidAmount: 100, status: "PAID" },
			}));

			// Inv2: Fully paid
			expect(updateSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
				where: { id: "inv2" },
				data: { paidAmount: 100, status: "PAID" },
			}));

			// Inv3: Partially paid (50€)
			expect(updateSpy).toHaveBeenNthCalledWith(3, expect.objectContaining({
				where: { id: "inv3" },
				data: { paidAmount: 50, status: "PARTIAL" },
			}));
		});

		it("should handle mixed partial invoices correctly", async () => {
			mockAuthenticatedUser();

			// Inv1: 100€ total, 50€ already paid
			// Payment: 20€
			// Expected: Inv1 PARTIAL, paidAmount 70€
			const invoices = [
				{ id: "inv1", totalInclVat: 100, paidAmount: 50, status: "PARTIAL", issueDate: new Date("2024-01-01") },
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(invoices as any);
			
			const updateSpy = vi.fn();
			vi.mocked(db.$transaction).mockImplementation(async (fn) => fn({
				invoice: { update: updateSpy },
			}));

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/bulk-payment", {
				method: "POST",
				headers: { "Content-Type": "application/json", Cookie: "session=test" },
				body: JSON.stringify({
					invoiceIds: ["inv1"],
					paymentAmount: 20,
				}),
			});

			expect(res.status).toBe(200);
			
			expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
				where: { id: "inv1" },
				data: { paidAmount: 70, status: "PARTIAL" },
			}));
		});

		it("should calculate overage correctly", async () => {
			mockAuthenticatedUser();

			// Inv1: 100€
			// Payment: 150€
			// Expected: Inv1 PAID (100€), Overage 50€
			const invoices = [
				{ id: "inv1", totalInclVat: 100, paidAmount: 0, status: "ISSUED", issueDate: new Date("2024-01-01") },
			];

			vi.mocked(db.invoice.findMany).mockResolvedValue(invoices as any);
			
			const updateSpy = vi.fn();
			vi.mocked(db.$transaction).mockImplementation(async (fn) => fn({
				invoice: { update: updateSpy },
			}));

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/bulk-payment", {
				method: "POST",
				headers: { "Content-Type": "application/json", Cookie: "session=test" },
				body: JSON.stringify({
					invoiceIds: ["inv1"],
					paymentAmount: 150,
				}),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.totalApplied).toBe(100);
			expect(data.overage).toBe(50);

			expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
				where: { id: "inv1" },
				data: { paidAmount: 100, status: "PAID" },
			}));
		});
	});
});
