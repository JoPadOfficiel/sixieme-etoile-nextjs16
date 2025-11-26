/**
 * Vehicle Categories API Tests
 *
 * Tests for the vehicle categories CRUD endpoints.
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
		vehicleCategory: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { vehicleCategoriesRouter } from "../vehicle-categories";

describe("Vehicle Categories API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", vehicleCategoriesRouter);
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
		name: "Berline Premium",
		code: "BERLINE",
		regulatoryCategory: "LIGHT",
		maxPassengers: 4,
		maxLuggageVolume: 3,
		priceMultiplier: "1.2",
		defaultRatePerKm: "1.50",
		defaultRatePerHour: "45.00",
		description: "Berline haut de gamme",
		isActive: true,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		_count: { vehicles: 5 },
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/vehicle-categories", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories");

			expect(res.status).toBe(401);
		});

		it("should return paginated vehicle categories list", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findMany).mockResolvedValue([
				sampleCategory,
			] as any);
			vi.mocked(db.vehicleCategory.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].name).toBe("Berline Premium");
			expect(body.data[0].code).toBe("BERLINE");
			expect(body.data[0]._count.vehicles).toBe(5);
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should filter by regulatory category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicleCategory.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request(
				"/vtc/vehicle-categories?regulatoryCategory=HEAVY"
			);

			expect(res.status).toBe(200);

			expect(db.vehicleCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						regulatoryCategory: "HEAVY",
					}),
				})
			);
		});

		it("should filter by isActive", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicleCategory.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories?isActive=true");

			expect(res.status).toBe(200);

			expect(db.vehicleCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						isActive: true,
					}),
				})
			);
		});

		it("should only return categories for the current organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findMany).mockResolvedValue([
				sampleCategory,
			] as any);
			vi.mocked(db.vehicleCategory.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/vehicle-categories");

			expect(db.vehicleCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("GET /vtc/vehicle-categories/:id", () => {
		it("should return a single vehicle category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/cat_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.name).toBe("Berline Premium");
			expect(body.regulatoryCategory).toBe("LIGHT");
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/nonexistent");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/vehicle-categories", () => {
		it("should create a new vehicle category", async () => {
			mockAuthenticatedUser();

			const newCategory = {
				name: "Van Premium",
				code: "VAN",
				regulatoryCategory: "LIGHT",
				maxPassengers: 7,
				maxLuggageVolume: 6,
				priceMultiplier: 1.5,
			};

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null); // No duplicate
			vi.mocked(db.vehicleCategory.create).mockResolvedValue({
				id: "cat_new",
				organizationId: "org_123",
				...newCategory,
				priceMultiplier: "1.5",
				defaultRatePerKm: null,
				defaultRatePerHour: null,
				description: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { vehicles: 0 },
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newCategory),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.name).toBe("Van Premium");
			expect(body.code).toBe("VAN");
			expect(body.organizationId).toBe("org_123");
		});

		it("should reject duplicate code within organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Another Berline",
					code: "BERLINE",
					regulatoryCategory: "LIGHT",
					maxPassengers: 4,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /vtc/vehicle-categories/:id", () => {
		it("should update an existing vehicle category", async () => {
			mockAuthenticatedUser();

			const updatedCategory = {
				...sampleCategory,
				name: "Berline Luxe",
			};

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);
			vi.mocked(db.vehicleCategory.update).mockResolvedValue(
				updatedCategory as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/cat_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Berline Luxe" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.name).toBe("Berline Luxe");
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /vtc/vehicle-categories/:id", () => {
		it("should delete a vehicle category without linked vehicles", async () => {
			mockAuthenticatedUser();

			const categoryNoVehicles = {
				...sampleCategory,
				_count: { vehicles: 0 },
			};

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				categoryNoVehicles as any
			);
			vi.mocked(db.vehicleCategory.delete).mockResolvedValue(
				categoryNoVehicles as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/cat_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should reject deletion of category with linked vehicles", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/cat_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(400);
		});

		it("should return 404 for non-existent category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicle-categories/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.vehicleCategory.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicleCategory.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/vehicle-categories");

			expect(db.vehicleCategory.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});
	});
});
