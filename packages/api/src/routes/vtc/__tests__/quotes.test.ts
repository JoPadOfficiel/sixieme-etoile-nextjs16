import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { quotesRouter } from "../quotes";

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		quote: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		order: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn((args) =>
				Promise.resolve({ ...(args.data || {}), id: "order-1" }),
			),
		},
		mission: {
			updateMany: vi.fn(),
		},
		quoteStatusAuditLog: {
			create: vi.fn(),
		},
		quoteNotesAuditLog: {
			create: vi.fn(),
		},
		quoteLine: {
			create: vi.fn((args) =>
				Promise.resolve({
					...(args.data || {}),
					id: `line-${Math.random().toString(36).substr(2, 9)}`,
				}),
			),
			update: vi.fn(),
			findMany: vi.fn().mockResolvedValue([]),
		},
		stayDay: {
			create: vi.fn((args) =>
				Promise.resolve({
					...(args.data || {}),
					id: `day-${Math.random().toString(36).substr(2, 9)}`,
				}),
			),
		},
		stayService: {
			create: vi.fn(),
		},
		$transaction: vi.fn((arg) => {
			if (typeof arg === "function") {
				return arg(db);
			}
			return Promise.all(arg);
		}),
		contact: {
			findFirst: vi.fn(),
		},
		vehicleCategory: {
			findFirst: vi.fn(),
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

import { db } from "@repo/database";

const mockQuote = {
	id: "quote-1",
	organizationId: "test-org-id",
	contactId: "contact-1",
	status: "DRAFT",
	pricingMode: "DYNAMIC",
	tripType: "TRANSFER",
	pickupAt: new Date("2025-01-15T10:00:00Z"),
	pickupAddress: "Paris CDG Airport",
	pickupLatitude: 49.0097,
	pickupLongitude: 2.5479,
	dropoffAddress: "Eiffel Tower, Paris",
	dropoffLatitude: 48.8584,
	dropoffLongitude: 2.2945,
	passengerCount: 2,
	luggageCount: 3,
	vehicleCategoryId: "cat-1",
	suggestedPrice: "150.00",
	finalPrice: "160.00",
	internalCost: "120.00",
	marginPercent: "25.00",
	tripAnalysis: null,
	appliedRules: null,
	validUntil: null,
	notes: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	contact: {
		id: "contact-1",
		displayName: "John Doe",
		type: "INDIVIDUAL",
		isPartner: false,
		companyName: null,
		email: "john@example.com",
		phone: "+33612345678",
	},
	vehicleCategory: {
		id: "cat-1",
		name: "Sedan",
		code: "SEDAN",
		regulatoryCategory: "LIGHT",
	},
};

describe("Quotes API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /quotes", () => {
		it("returns paginated list of quotes", async () => {
			const mockDb = db as unknown as {
				quote: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findMany.mockResolvedValue([mockQuote]);
			mockDb.quote.count.mockResolvedValue(1);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes.$get({
				query: { page: "1", limit: "10" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.data).toHaveLength(1);
			expect(data.meta.total).toBe(1);
			expect(data.meta.page).toBe(1);
		});

		it("filters by status", async () => {
			const mockDb = db as unknown as {
				quote: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findMany.mockResolvedValue([mockQuote]);
			mockDb.quote.count.mockResolvedValue(1);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes.$get({
				query: { page: "1", limit: "10", status: "DRAFT" },
			});

			expect(response.status).toBe(200);
			expect(mockDb.quote.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						status: "DRAFT",
					}),
				}),
			);
		});

		it("filters by clientType PARTNER", async () => {
			const mockDb = db as unknown as {
				quote: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findMany.mockResolvedValue([]);
			mockDb.quote.count.mockResolvedValue(0);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes.$get({
				query: { page: "1", limit: "10", clientType: "PARTNER" },
			});

			expect(response.status).toBe(200);
			expect(mockDb.quote.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						contact: expect.objectContaining({
							isPartner: true,
						}),
					}),
				}),
			);
		});

		it("filters by search term", async () => {
			const mockDb = db as unknown as {
				quote: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findMany.mockResolvedValue([mockQuote]);
			mockDb.quote.count.mockResolvedValue(1);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes.$get({
				query: { page: "1", limit: "10", search: "Paris" },
			});

			expect(response.status).toBe(200);
			expect(mockDb.quote.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({
								pickupAddress: expect.objectContaining({
									contains: "Paris",
									mode: "insensitive",
								}),
							}),
						]),
					}),
				}),
			);
		});
	});

	describe("GET /quotes/:id", () => {
		it("returns a single quote", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findFirst.mockResolvedValue(mockQuote);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].$get({
				param: { id: "quote-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.id).toBe("quote-1");
		});

		it("returns 404 for non-existent quote", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findFirst.mockResolvedValue(null);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /quotes/:id", () => {
		it("updates quote status", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findFirst.mockResolvedValue(mockQuote);
			mockDb.quote.update.mockResolvedValue({
				...mockQuote,
				status: "ACCEPTED",
			});

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].$patch({
				param: { id: "quote-1" },
				json: { status: "ACCEPTED" },
			});

			expect(response.status).toBe(200);
			expect(mockDb.quote.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "quote-1" },
					data: expect.objectContaining({
						status: "ACCEPTED",
					}),
				}),
			);
		});

		it("updates quote notes", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findFirst.mockResolvedValue(mockQuote);
			mockDb.quote.update.mockResolvedValue({
				...mockQuote,
				notes: "New notes",
			});

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].$patch({
				param: { id: "quote-1" },
				json: { notes: "New notes" },
			});

			expect(response.status).toBe(200);
			expect(mockDb.quote.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						notes: "New notes",
					}),
				}),
			);
		});
	});

	describe("Profitability Indicator Logic", () => {
		it("quote with margin >= 20% is profitable (green)", () => {
			const quote = { ...mockQuote, marginPercent: "25.00" };
			const margin = Number.parseFloat(quote.marginPercent);

			expect(margin >= 20).toBe(true);
		});

		it("quote with margin 0-20% is low margin (orange)", () => {
			const quote = { ...mockQuote, marginPercent: "10.00" };
			const margin = Number.parseFloat(quote.marginPercent);

			expect(margin >= 0 && margin < 20).toBe(true);
		});

		it("quote with negative margin is loss (red)", () => {
			const quote = { ...mockQuote, marginPercent: "-5.00" };
			const margin = Number.parseFloat(quote.marginPercent);

			expect(margin < 0).toBe(true);
		});
	});
	describe("POST /quotes/:id/duplicate", () => {
		it("duplicates a quote successfully", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
					create: ReturnType<typeof vi.fn>;
					findUnique: ReturnType<typeof vi.fn>;
				};
				quoteLine: {
					create: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			// Mock original quote finding
			const originalQuoteWithLines = {
				...mockQuote,
				lines: [
					{
						id: "line-1",
						type: "CALCULATED",
						label: "Transfer",
						totalPrice: 100,
						sortOrder: 0,
						sourceData: {},
						displayData: {},
					},
				],
				stayDays: [],
			};

			mockDb.quote.findFirst.mockResolvedValue(originalQuoteWithLines);

			// Mock creation returning a basic object with ID
			mockDb.quote.create.mockResolvedValue({ id: "new-quote-id" });

			// Mock final fetch returning the complete new quote
			mockDb.quote.findUnique.mockResolvedValue({
				...mockQuote,
				id: "new-quote-id",
				status: "DRAFT",
				lines: [
					{
						id: "new-line-id",
						type: "CALCULATED",
						label: "Transfer",
						totalPrice: 100,
						sortOrder: 0,
						parentId: null,
					},
				],
			});

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].duplicate.$post({
				param: { id: "quote-1" },
			});

			expect(response.status).toBe(201);

			const data = await response.json();
			expect(data.id).toBe("new-quote-id");
			expect(data.status).toBe("DRAFT");

			// Verify findFirst was called to get original
			expect(mockDb.quote.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: "quote-1",
					}),
				}),
			);

			// Verify create was called with DRAFT status
			expect(mockDb.quote.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "DRAFT",
						notes: expect.stringContaining("[Copie]"),
					}),
				}),
			);

			// Verify lines were duplicated
			expect(mockDb.quoteLine.create).toHaveBeenCalled();
		});

		it("returns 404 if quote to duplicate not found", async () => {
			const mockDb = db as unknown as {
				quote: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.quote.findFirst.mockResolvedValue(null);

			const app = new Hono().route("/", quotesRouter);
			const client = testClient(app);

			const response = await client.quotes[":id"].duplicate.$post({
				param: { id: "non-existent" },
			});

			expect(response.status).toBe(404);
		});
	});
});
