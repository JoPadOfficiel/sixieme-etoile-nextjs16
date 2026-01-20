import { Hono } from "hono";
import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { blockTemplatesRouter } from "../block-templates";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		blockTemplate: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
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

const app = new Hono().route("/", blockTemplatesRouter);
const client = testClient(app);

// Mock data
const mockBlockTemplate = {
	id: "template-1",
	organizationId: "test-org-id",
	label: "Standard Transfer",
	isFullQuote: false,
	data: { some: "data" },
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockFullQuoteTemplate = {
	id: "template-2",
	organizationId: "test-org-id",
	label: "Full Trip Package",
	isFullQuote: true,
	data: { lines: [] },
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe("Block Templates API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /quotes/block-templates", () => {
		it("should return paginated templates list", async () => {
			vi.mocked(db.blockTemplate.findMany).mockResolvedValue([
				mockBlockTemplate,
			]);
			vi.mocked(db.blockTemplate.count).mockResolvedValue(1);

			const res = await client.quotes["block-templates"].$get({
				query: { page: "1", limit: "10" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.data).toHaveLength(1);
			expect(json.data[0].label).toBe("Standard Transfer");
			expect(json.data[0].isFullQuote).toBe(false);
			expect(json.meta.total).toBe(1);
		});

		it("should filter templates by isFullQuote=true", async () => {
			vi.mocked(db.blockTemplate.findMany).mockResolvedValue([
				mockFullQuoteTemplate,
			]);
			vi.mocked(db.blockTemplate.count).mockResolvedValue(1);

			await client.quotes["block-templates"].$get({
				query: { isFullQuote: "true" },
			});

			expect(db.blockTemplate.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isFullQuote: true,
					}),
				}),
			);
		});

		it("should filter templates by isFullQuote=false", async () => {
			vi.mocked(db.blockTemplate.findMany).mockResolvedValue([
				mockBlockTemplate,
			]);
			vi.mocked(db.blockTemplate.count).mockResolvedValue(1);

			await client.quotes["block-templates"].$get({
				query: { isFullQuote: "false" },
			});

			expect(db.blockTemplate.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "test-org-id",
						isFullQuote: false,
					}),
				}),
			);
		});
	});

	describe("POST /quotes/block-templates", () => {
		it("should create a single block template", async () => {
			vi.mocked(db.blockTemplate.create).mockResolvedValue(mockBlockTemplate);

			const res = await client.quotes["block-templates"].$post({
				json: {
					label: "Standard Transfer",
					data: { some: "data" },
					isFullQuote: false,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.label).toBe("Standard Transfer");
			expect(json.isFullQuote).toBe(false);
		});

		it("should create a full quote template", async () => {
			vi.mocked(db.blockTemplate.create).mockResolvedValue(
				mockFullQuoteTemplate,
			);

			const res = await client.quotes["block-templates"].$post({
				json: {
					label: "Full Trip Package",
					data: { lines: [] },
					isFullQuote: true,
				},
			});

			expect(res.status).toBe(201);
			const json = await res.json();
			expect(json.label).toBe("Full Trip Package");
			expect(json.isFullQuote).toBe(true);
		});
	});

	describe("DELETE /quotes/block-templates/:id", () => {
		it("should delete a template", async () => {
			vi.mocked(db.blockTemplate.findFirst).mockResolvedValue(
				mockBlockTemplate,
			);
			vi.mocked(db.blockTemplate.delete).mockResolvedValue(mockBlockTemplate);

			const res = await client.quotes["block-templates"][":id"].$delete({
				param: { id: "template-1" },
			});

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json.success).toBe(true);
		});

		it("should return 404 for non-existent template", async () => {
			vi.mocked(db.blockTemplate.findFirst).mockResolvedValue(null);

			const res = await client.quotes["block-templates"][":id"].$delete({
				param: { id: "non-existent" },
			});

			expect(res.status).toBe(404);
		});
	});
});
