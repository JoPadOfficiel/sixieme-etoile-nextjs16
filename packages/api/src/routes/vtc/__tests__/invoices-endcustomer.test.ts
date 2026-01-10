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
		endCustomer: {
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

describe("Invoice EndCustomer Integration (Unit)", () => {
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

	const sampleContact = {
		id: "contact_123",
		organizationId: "org_123",
		displayName: "Test Agency",
		isPartner: true,
		partnerContract: {
			paymentTerms: "DAYS_30",
		}
	};

	const sampleEndCustomer = {
		id: "ec_123",
		firstName: "John",
		lastName: "Doe",
		email: "john@doe.com",
	};

	const sampleQuote = {
		id: "quote_123",
		organizationId: "org_123",
		contactId: "contact_123",
		status: "ACCEPTED",
		finalPrice: 150.0,
		pickupAddress: "Paris CDG",
		dropoffAddress: "Paris Center",
		contact: sampleContact,
		endCustomerId: "ec_123",
		endCustomer: sampleEndCustomer,
		vehicleCategory: {
			name: "Sedan",
		},
		tripType: "TRANSFER",
		stayDays: [],
		appliedRules: [],
	};

	const sampleInvoice = {
		id: "invoice_123",
		organizationId: "org_123",
		contactId: "contact_123",
		quoteId: "quote_123",
		number: "INV-2025-0001",
		status: "DRAFT",
		endCustomerId: "ec_123",
		endCustomer: sampleEndCustomer,
		contact: sampleContact,
		lines: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		issueDate: new Date(),
		dueDate: new Date(),
		totalExclVat: 100,
		totalVat: 20,
		totalInclVat: 120,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create invoice with endCustomer from quote", async () => {
		mockAuthenticatedUser();

		// Mock Quote finding
		vi.mocked(db.quote.findFirst).mockResolvedValue(sampleQuote as any);
		
		// Mock Invoice finding:
		// 1. generateInvoiceNumber (last invoice) -> null (first invoice of year)
		// 2. existingInvoice check (by quoteId) -> null
		// 3. fetch complete invoice -> return created
		vi.mocked(db.invoice.findFirst)
			.mockResolvedValueOnce(null) 
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(sampleInvoice as any);

		// Mock Transaction
		const mockCreate = vi.fn().mockResolvedValue({
			...sampleInvoice,
			id: "new_invoice_123",
		});
		
		const mockTransaction = vi.fn().mockImplementation(async (fn) => {
			const mockTx = {
				invoice: {
					create: mockCreate,
				},
				invoiceLine: {
					createMany: vi.fn().mockResolvedValue({ count: 1 }),
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
		
		// Verify create was called with endCustomerId
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					endCustomerId: "ec_123",
				}),
			})
		);
		
		const data = await res.json();
		expect(data.endCustomerId).toBe("ec_123");
		expect(data.endCustomer).toBeDefined();
	});

	it("should include endCustomer in list invoices", async () => {
		mockAuthenticatedUser();

		vi.mocked(db.invoice.findMany).mockResolvedValue([sampleInvoice] as any);
		vi.mocked(db.invoice.count).mockResolvedValue(1);

		const app = createTestApp();
		const res = await app.request("/vtc/invoices", {
			headers: { Cookie: "session=test" },
		});

		expect(res.status).toBe(200);
		
		// Verify include was called with endCustomer: true
		expect(db.invoice.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				include: expect.objectContaining({
					endCustomer: true,
				}),
			})
		);
		
		const data = await res.json();
		expect(data.data[0].endCustomer).toBeDefined();
		expect(data.data[0].endCustomer.firstName).toBe("John");
	});
});
