/**
 * Invoices API Tests (Story 2.4)
 *
 * Tests for the invoices CRUD endpoints.
 * Validates multi-tenancy, contact linking, and invoice lifecycle.
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
		quote: {
			findFirst: vi.fn(),
		},
		invoice: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		invoiceLine: {
			createMany: vi.fn(),
			create: vi.fn(),
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn((fn) => fn({
			invoice: {
				create: vi.fn(),
				delete: vi.fn(),
			},
			invoiceLine: {
				createMany: vi.fn(),
				create: vi.fn(),
				deleteMany: vi.fn(),
			},
		})),
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { invoicesRouter } from "../invoices";

describe("Invoices API", () => {
	// Create a test app with the invoices router
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", invoicesRouter);
		return app;
	};

	// Helper to create mock session
	const mockSession = (orgIdOrSlug: string, userId: string) => {
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: { activeOrganizationId: orgIdOrSlug },
			user: { id: userId },
		} as any);
	};

	// Helper to mock organization lookup
	const mockOrganization = (orgId: string = "org_123") => {
		vi.mocked(db.organization.findFirst).mockResolvedValue({
			id: orgId,
		} as any);
	};

	// Helper to mock membership
	const mockMembership = (role: string = "member") => {
		vi.mocked(db.member.findUnique).mockResolvedValue({
			id: "member_123",
			role,
			userId: "user_123",
			organizationId: "org_123",
			createdAt: new Date(),
		} as any);
	};

	// Combined helper for authenticated requests
	const mockAuthenticatedUser = (
		orgId: string = "org_123",
		userId: string = "user_123",
		role: string = "member"
	) => {
		mockSession(orgId, userId);
		mockOrganization(orgId);
		mockMembership(role);
	};

	// Sample data
	const sampleContact = {
		id: "contact_123",
		organizationId: "org_123",
		displayName: "Test Contact",
		isPartner: false,
		partnerContract: null,
	};

	const sampleQuote = {
		id: "quote_123",
		organizationId: "org_123",
		contactId: "contact_123",
		status: "ACCEPTED",
		finalPrice: 150.0,
		pickupAddress: "Paris CDG",
		dropoffAddress: "Paris Center",
		contact: {
			...sampleContact,
			partnerContract: null,
		},
		vehicleCategory: {
			name: "Sedan",
		},
	};

	const sampleInvoice = {
		id: "invoice_123",
		organizationId: "org_123",
		contactId: "contact_123",
		quoteId: null,
		number: "INV-2025-0001",
		status: "DRAFT",
		issueDate: new Date("2025-01-15"),
		dueDate: new Date("2025-02-14"),
		totalExclVat: 100.0,
		totalVat: 10.0,
		totalInclVat: 110.0,
		commissionAmount: null,
		notes: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		contact: sampleContact,
		lines: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /invoices", () => {
		it("should list invoices for authenticated user", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findMany).mockResolvedValue([sampleInvoice] as any);
			vi.mocked(db.invoice.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.data).toHaveLength(1);
			expect(data.meta.total).toBe(1);
		});

		it("should filter invoices by contactId", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findMany).mockResolvedValue([sampleInvoice] as any);
			vi.mocked(db.invoice.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices?contactId=contact_123", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						contactId: "contact_123",
					}),
				})
			);
		});

		it("should filter invoices by status", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findMany).mockResolvedValue([]);
			vi.mocked(db.invoice.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices?status=PAID", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
			expect(db.invoice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						status: "PAID",
					}),
				})
			);
		});
	});

	describe("GET /invoices/:id", () => {
		it("should return invoice with contact data", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue(sampleInvoice as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_123", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.id).toBe("invoice_123");
			expect(data.contact).toBeDefined();
			expect(data.contact.id).toBe("contact_123");
		});

		it("should return 404 for non-existent invoice", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/nonexistent", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /invoices", () => {
		it("should create invoice with contact link", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
			vi.mocked(db.invoice.findFirst).mockResolvedValue(null); // No existing invoice
			
			const mockTransaction = vi.fn().mockImplementation(async (fn) => {
				const mockTx = {
					invoice: {
						create: vi.fn().mockResolvedValue({
							...sampleInvoice,
							id: "new_invoice_123",
						}),
					},
					invoiceLine: {
						createMany: vi.fn().mockResolvedValue({ count: 1 }),
					},
				};
				return fn(mockTx);
			});
			vi.mocked(db.$transaction).mockImplementation(mockTransaction);

			// Mock the final fetch
			vi.mocked(db.invoice.findFirst).mockResolvedValue({
				...sampleInvoice,
				id: "new_invoice_123",
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: "session=test",
				},
				body: JSON.stringify({
					contactId: "contact_123",
					issueDate: "2025-01-15T00:00:00Z",
					dueDate: "2025-02-14T00:00:00Z",
					totalExclVat: 100,
					totalVat: 10,
					totalInclVat: 110,
				}),
			});

			expect(res.status).toBe(201);
		});

		it("should reject invoice for non-existent contact", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.contact.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: "session=test",
				},
				body: JSON.stringify({
					contactId: "nonexistent",
					issueDate: "2025-01-15T00:00:00Z",
					dueDate: "2025-02-14T00:00:00Z",
					totalExclVat: 100,
					totalVat: 10,
					totalInclVat: 110,
				}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("POST /invoices/from-quote/:quoteId", () => {
		it("should create invoice from accepted quote", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.quote.findFirst).mockResolvedValue(sampleQuote as any);
			// First call: check if invoice exists (null), second call: fetch created invoice
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null) // No existing invoice
				.mockResolvedValueOnce({
					...sampleInvoice,
					quoteId: "quote_123",
				} as any); // Created invoice

			const mockTransaction = vi.fn().mockImplementation(async (fn) => {
				const mockTx = {
					invoice: {
						create: vi.fn().mockResolvedValue({
							...sampleInvoice,
							id: "new_invoice_123",
							quoteId: "quote_123",
						}),
					},
					invoiceLine: {
						create: vi.fn().mockResolvedValue({}),
					},
				};
				return fn(mockTx);
			});
			vi.mocked(db.$transaction).mockImplementation(mockTransaction);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/from-quote/quote_123", {
				method: "POST",
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(201);
		});

		it("should reject non-accepted quote", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.quote.findFirst).mockResolvedValue({
				...sampleQuote,
				status: "DRAFT",
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/from-quote/quote_123", {
				method: "POST",
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(400);
			const text = await res.text();
			expect(text).toContain("accepted");
		});

		it("should reject if invoice already exists for quote", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.quote.findFirst).mockResolvedValue(sampleQuote as any);
			vi.mocked(db.invoice.findFirst).mockResolvedValue(sampleInvoice as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/from-quote/quote_123", {
				method: "POST",
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(400);
			const text = await res.text();
			expect(text).toContain("already exists");
		});
	});

	describe("PATCH /invoices/:id", () => {
		it("should update invoice status", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue(sampleInvoice as any);
			vi.mocked(db.invoice.update).mockResolvedValue({
				...sampleInvoice,
				status: "ISSUED",
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_123", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Cookie: "session=test",
				},
				body: JSON.stringify({ status: "ISSUED" }),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.status).toBe("ISSUED");
		});

		it("should reject invalid status transition", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue({
				...sampleInvoice,
				status: "PAID",
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_123", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Cookie: "session=test",
				},
				body: JSON.stringify({ status: "DRAFT" }),
			});

			expect(res.status).toBe(400);
			const text = await res.text();
			expect(text).toContain("Cannot transition");
		});
	});

	describe("DELETE /invoices/:id", () => {
		it("should delete draft invoice", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue(sampleInvoice as any);

			const mockTransaction = vi.fn().mockImplementation(async (fn) => {
				const mockTx = {
					invoiceLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
					},
					invoice: {
						delete: vi.fn().mockResolvedValue(sampleInvoice),
					},
				};
				return fn(mockTx);
			});
			vi.mocked(db.$transaction).mockImplementation(mockTransaction);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_123", {
				method: "DELETE",
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(200);
		});

		it("should reject deletion of non-draft invoice", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.invoice.findFirst).mockResolvedValue({
				...sampleInvoice,
				status: "ISSUED",
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_123", {
				method: "DELETE",
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(400);
			const text = await res.text();
			expect(text).toContain("draft");
		});
	});

	describe("Multi-tenancy", () => {
		it("should not return invoices from other organizations", async () => {
			mockAuthenticatedUser("org_123");

			// Invoice belongs to different org
			vi.mocked(db.invoice.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/invoices/invoice_other_org", {
				headers: { Cookie: "session=test" },
			});

			expect(res.status).toBe(404);
		});
	});
});
