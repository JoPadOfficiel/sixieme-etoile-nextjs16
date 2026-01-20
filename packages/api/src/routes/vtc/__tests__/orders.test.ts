import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { ordersRouter } from "../orders";

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		contact: {
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

const mockContact = {
	id: "contact-1",
	organizationId: "test-org-id",
	name: "Test Client",
	email: "client@test.com",
	type: "INDIVIDUAL",
};

const mockOrder = {
	id: "order-1",
	organizationId: "test-org-id",
	reference: "ORD-2026-001",
	contactId: "contact-1",
	status: "DRAFT",
	notes: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	contact: mockContact,
	quotes: [],
	missions: [],
	invoices: [],
};

describe("Orders API - Story 28.2", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /orders - Create Order", () => {
		it("creates a new order with DRAFT status", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					create: ReturnType<typeof vi.fn>;
				};
				contact: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.contact.findFirst.mockResolvedValue(mockContact);
			mockDb.order.findFirst.mockResolvedValue(null); // No existing orders
			mockDb.order.create.mockResolvedValue(mockOrder);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders.$post({
				json: {
					contactId: "contact-1",
					notes: "Test order",
				},
			});

			expect(response.status).toBe(201);
			const data = await response.json();
			expect(data.status).toBe("DRAFT");
			expect(data.reference).toMatch(/^ORD-\d{4}-\d{3}$/);
		});

		it("returns 400 when contact not found", async () => {
			const mockDb = db as unknown as {
				contact: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.contact.findFirst.mockResolvedValue(null);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders.$post({
				json: {
					contactId: "invalid-contact",
				},
			});

			expect(response.status).toBe(400);
		});
	});

	describe("GET /orders - List Orders", () => {
		it("returns paginated list of orders", async () => {
			const mockDb = db as unknown as {
				order: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.count.mockResolvedValue(1);
			mockDb.order.findMany.mockResolvedValue([
				{
					...mockOrder,
					contact: { id: "contact-1", name: "Test", email: "test@test.com", type: "INDIVIDUAL" },
					_count: { quotes: 0, missions: 0, invoices: 0 },
				},
			]);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders.$get({
				query: { page: "1", limit: "20" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.orders).toHaveLength(1);
			expect(data.pagination.total).toBe(1);
		});

		it("filters orders by status", async () => {
			const mockDb = db as unknown as {
				order: {
					findMany: ReturnType<typeof vi.fn>;
					count: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.count.mockResolvedValue(0);
			mockDb.order.findMany.mockResolvedValue([]);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders.$get({
				query: { status: "CONFIRMED" },
			});

			expect(response.status).toBe(200);
			// Verify findMany was called (status filter is applied via withTenantFilter)
			expect(mockDb.order.findMany).toHaveBeenCalled();
		});
	});

	describe("GET /orders/:id - Get Order", () => {
		it("returns order with all relations", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue(mockOrder);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$get({
				param: { id: "order-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.id).toBe("order-1");
			expect(data.quotes).toBeDefined();
			expect(data.missions).toBeDefined();
			expect(data.invoices).toBeDefined();
		});

		it("returns 404 when order not found", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue(null);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$get({
				param: { id: "non-existent" },
			});

			expect(response.status).toBe(404);
		});
	});

	describe("PATCH /orders/:id/status - Status Transitions", () => {
		it("allows valid transition DRAFT -> QUOTED", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "DRAFT" });
			mockDb.order.update.mockResolvedValue({ ...mockOrder, status: "QUOTED" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "QUOTED" },
			});

			expect(response.status).toBe(200);
			const data = await response.json() as { status: string };
			expect(data?.status).toBe("QUOTED");
		});

		it("allows valid transition QUOTED -> CONFIRMED", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "QUOTED" });
			mockDb.order.update.mockResolvedValue({ ...mockOrder, status: "CONFIRMED" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "CONFIRMED" },
			});

			expect(response.status).toBe(200);
			const data = await response.json() as { status: string };
			expect(data?.status).toBe("CONFIRMED");
		});

		it("rejects invalid transition DRAFT -> PAID", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "DRAFT" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "PAID" },
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("Invalid transition");
		});

		it("rejects transition from terminal state CANCELLED", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "CANCELLED" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "DRAFT" },
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("terminal state");
		});

		it("is idempotent - same status returns success", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "CONFIRMED" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "CONFIRMED" },
			});

			expect(response.status).toBe(200);
		});

		it("allows transition to CANCELLED from any non-terminal state", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			// Test from CONFIRMED
			mockDb.order.findFirst.mockResolvedValue({ ...mockOrder, status: "CONFIRMED" });
			mockDb.order.update.mockResolvedValue({ ...mockOrder, status: "CANCELLED" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].status.$patch({
				param: { id: "order-1" },
				json: { status: "CANCELLED" },
			});

			expect(response.status).toBe(200);
			const data = await response.json() as { status: string };
			expect(data?.status).toBe("CANCELLED");
		});
	});

	describe("PATCH /orders/:id - Update Order", () => {
		it("updates order notes", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue(mockOrder);
			mockDb.order.update.mockResolvedValue({ ...mockOrder, notes: "Updated notes" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$patch({
				param: { id: "order-1" },
				json: { notes: "Updated notes" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.notes).toBe("Updated notes");
		});

		it("updates order contactId", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					update: ReturnType<typeof vi.fn>;
				};
				contact: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			const newContact = { ...mockContact, id: "contact-2" };
			mockDb.order.findFirst.mockResolvedValue(mockOrder);
			mockDb.contact.findFirst.mockResolvedValue(newContact);
			mockDb.order.update.mockResolvedValue({ ...mockOrder, contactId: "contact-2" });

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$patch({
				param: { id: "order-1" },
				json: { contactId: "contact-2" },
			});

			expect(response.status).toBe(200);
		});
	});

	describe("DELETE /orders/:id - Delete Order", () => {
		it("deletes DRAFT order without linked entities", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
					delete: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({
				...mockOrder,
				status: "DRAFT",
				_count: { quotes: 0, missions: 0, invoices: 0 },
			});
			mockDb.order.delete.mockResolvedValue(mockOrder);

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$delete({
				param: { id: "order-1" },
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.success).toBe(true);
		});

		it("rejects deletion of CONFIRMED order", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({
				...mockOrder,
				status: "CONFIRMED",
				_count: { quotes: 0, missions: 0, invoices: 0 },
			});

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$delete({
				param: { id: "order-1" },
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("Cannot delete");
		});

		it("rejects deletion of order with linked quotes", async () => {
			const mockDb = db as unknown as {
				order: {
					findFirst: ReturnType<typeof vi.fn>;
				};
			};

			mockDb.order.findFirst.mockResolvedValue({
				...mockOrder,
				status: "DRAFT",
				_count: { quotes: 2, missions: 0, invoices: 0 },
			});

			const app = new Hono().route("/", ordersRouter);
			const client = testClient(app);

			const response = await client.orders[":id"].$delete({
				param: { id: "order-1" },
			});

			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("linked");
		});
	});
});
