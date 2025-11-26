/**
 * License Categories API Tests
 *
 * Tests for the license categories CRUD endpoints.
 * Validates multi-tenancy, pagination, and data persistence.
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
		licenseCategory: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		organizationLicenseRule: {
			deleteMany: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { licenseCategoriesRouter } from "../license-categories";

describe("License Categories API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", licenseCategoriesRouter);
		return app;
	};

	const mockSession = (orgIdOrSlug: string, userId: string) => {
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: { activeOrganizationId: orgIdOrSlug },
			user: { id: userId },
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

	const mockAuthenticatedUser = (
		orgId: string = "org_123",
		userId: string = "user_123",
		role: string = "member"
	) => {
		mockSession(orgId, userId);
		mockOrganization(orgId);
		mockMembership(role);
	};

	const sampleCategory = {
		id: "cat_123",
		organizationId: "org_123",
		code: "B",
		name: "Permis B",
		description: "Véhicules légers",
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		_count: {
			driverLicenses: 5,
			vehiclesRequiringThis: 2,
			organizationRules: 1,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/license-categories", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories");

			expect(res.status).toBe(401);
		});

		it("should return paginated license categories list", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findMany).mockResolvedValue([sampleCategory] as any);
			vi.mocked(db.licenseCategory.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].code).toBe("B");
			expect(body.data[0].name).toBe("Permis B");
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should only return categories for the current organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findMany).mockResolvedValue([sampleCategory] as any);
			vi.mocked(db.licenseCategory.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/license-categories");

			expect(db.licenseCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("GET /vtc/license-categories/:id", () => {
		it("should return a single license category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleCategory as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/cat_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.code).toBe("B");
			expect(body.name).toBe("Permis B");
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/nonexistent");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/license-categories", () => {
		it("should create a new license category", async () => {
			mockAuthenticatedUser();

			const newCategory = {
				code: "D",
				name: "Permis D",
				description: "Transport de personnes",
			};

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(null);
			vi.mocked(db.licenseCategory.create).mockResolvedValue({
				id: "cat_new",
				organizationId: "org_123",
				...newCategory,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: {
					driverLicenses: 0,
					vehiclesRequiringThis: 0,
					organizationRules: 0,
				},
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newCategory),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.code).toBe("D");
			expect(body.organizationId).toBe("org_123");
		});

		it("should reject duplicate code", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleCategory as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					code: "B",
					name: "Duplicate",
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /vtc/license-categories/:id", () => {
		it("should update an existing license category", async () => {
			mockAuthenticatedUser();

			const updatedCategory = {
				...sampleCategory,
				name: "Permis B - Updated",
			};

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleCategory as any);
			vi.mocked(db.licenseCategory.update).mockResolvedValue(updatedCategory as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/cat_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Permis B - Updated" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.name).toBe("Permis B - Updated");
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /vtc/license-categories/:id", () => {
		it("should delete an existing license category without dependencies", async () => {
			mockAuthenticatedUser();

			const categoryWithoutDeps = {
				...sampleCategory,
				_count: {
					driverLicenses: 0,
					vehiclesRequiringThis: 0,
				},
			};

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(categoryWithoutDeps as any);
			vi.mocked(db.organizationLicenseRule.deleteMany).mockResolvedValue({ count: 0 } as any);
			vi.mocked(db.licenseCategory.delete).mockResolvedValue(categoryWithoutDeps as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/cat_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should reject deletion if category is in use", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleCategory as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/cat_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(400);
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-categories/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.licenseCategory.findMany).mockResolvedValue([]);
			vi.mocked(db.licenseCategory.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/license-categories");

			expect(db.licenseCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});
	});
});
