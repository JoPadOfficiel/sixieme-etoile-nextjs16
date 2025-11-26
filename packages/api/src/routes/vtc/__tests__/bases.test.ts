/**
 * Operating Bases API Tests
 *
 * Tests for the operating bases CRUD endpoints.
 * Validates multi-tenancy, pagination, search, and data persistence.
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
		operatingBase: {
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
import { basesRouter } from "../bases";

describe("Operating Bases API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", basesRouter);
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

	const sampleBase = {
		id: "base_123",
		organizationId: "org_123",
		name: "Paris CDG Garage",
		addressLine1: "1 Rue de l'Aéroport",
		addressLine2: null,
		city: "Roissy-en-France",
		postalCode: "95700",
		countryCode: "FR",
		latitude: "49.0097",
		longitude: "2.5479",
		isActive: true,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		_count: { vehicles: 3 },
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/bases", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases");

			expect(res.status).toBe(401);
		});

		it("should return paginated bases list with vehicle counts", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([
				sampleBase,
			] as any);
			vi.mocked(db.operatingBase.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/bases");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].name).toBe("Paris CDG Garage");
			expect(body.data[0].city).toBe("Roissy-en-France");
			expect(body.data[0]._count.vehicles).toBe(3);
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should filter bases by search term", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([
				sampleBase,
			] as any);
			vi.mocked(db.operatingBase.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/bases?search=paris");

			expect(res.status).toBe(200);

			expect(db.operatingBase.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						OR: expect.arrayContaining([
							expect.objectContaining({ name: expect.any(Object) }),
							expect.objectContaining({ city: expect.any(Object) }),
							expect.objectContaining({ addressLine1: expect.any(Object) }),
						]),
					}),
				})
			);
		});

		it("should filter by isActive", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([]);
			vi.mocked(db.operatingBase.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/bases?isActive=true");

			expect(res.status).toBe(200);

			expect(db.operatingBase.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						isActive: true,
					}),
				})
			);
		});

		it("should respect pagination parameters", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([]);
			vi.mocked(db.operatingBase.count).mockResolvedValue(50);

			const app = createTestApp();
			const res = await app.request("/vtc/bases?page=2&limit=10");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.meta.page).toBe(2);
			expect(body.meta.limit).toBe(10);
			expect(body.meta.totalPages).toBe(5);

			expect(db.operatingBase.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					skip: 10,
					take: 10,
				})
			);
		});

		it("should only return bases for the current organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([
				sampleBase,
			] as any);
			vi.mocked(db.operatingBase.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/bases");

			expect(db.operatingBase.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("GET /vtc/bases/:id", () => {
		it("should return a single base with linked vehicles", async () => {
			mockAuthenticatedUser();

			const baseWithVehicles = {
				...sampleBase,
				vehicles: [
					{
						id: "vehicle_1",
						registrationNumber: "AB-123-CD",
						vehicleCategory: { name: "Berline" },
					},
				],
			};

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				baseWithVehicles as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.name).toBe("Paris CDG Garage");
			expect(body.vehicles).toHaveLength(1);
			expect(body.vehicles[0].registrationNumber).toBe("AB-123-CD");
		});

		it("should return 404 for non-existent base", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/nonexistent");

			expect(res.status).toBe(404);
		});

		it("should not return base from another organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_other_org");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/bases", () => {
		it("should create a new operating base", async () => {
			mockAuthenticatedUser();

			const newBase = {
				name: "Orly Garage",
				addressLine1: "10 Avenue de l'Aéroport",
				city: "Orly",
				postalCode: "94310",
				latitude: 48.7262,
				longitude: 2.3652,
			};

			vi.mocked(db.operatingBase.create).mockResolvedValue({
				id: "base_new",
				organizationId: "org_123",
				...newBase,
				addressLine2: null,
				countryCode: "FR",
				latitude: "48.7262",
				longitude: "2.3652",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { vehicles: 0 },
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/bases", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newBase),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.name).toBe("Orly Garage");
			expect(body.city).toBe("Orly");
			expect(body.organizationId).toBe("org_123");
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/bases", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});

		it("should validate latitude and longitude ranges", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/bases", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Invalid Base",
					addressLine1: "123 Street",
					city: "City",
					postalCode: "12345",
					latitude: 100, // Invalid: > 90
					longitude: 2.0,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should set organizationId automatically", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.create).mockResolvedValue({
				id: "base_new",
				organizationId: "org_123",
				name: "Test Base",
				addressLine1: "123 Street",
				city: "City",
				postalCode: "12345",
				countryCode: "FR",
				latitude: "48.0",
				longitude: "2.0",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				_count: { vehicles: 0 },
			} as any);

			const app = createTestApp();
			await app.request("/vtc/bases", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Test Base",
					addressLine1: "123 Street",
					city: "City",
					postalCode: "12345",
					latitude: 48.0,
					longitude: 2.0,
				}),
			});

			expect(db.operatingBase.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("PATCH /vtc/bases/:id", () => {
		it("should update an existing base", async () => {
			mockAuthenticatedUser();

			const updatedBase = {
				...sampleBase,
				name: "Paris CDG Garage - Updated",
			};

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				sampleBase as any
			);
			vi.mocked(db.operatingBase.update).mockResolvedValue(updatedBase as any);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Paris CDG Garage - Updated" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.name).toBe("Paris CDG Garage - Updated");
		});

		it("should return 404 for non-existent base", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("should allow updating coordinates", async () => {
			mockAuthenticatedUser();

			const updatedBase = {
				...sampleBase,
				latitude: "49.0100",
				longitude: "2.5500",
			};

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				sampleBase as any
			);
			vi.mocked(db.operatingBase.update).mockResolvedValue(updatedBase as any);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ latitude: 49.01, longitude: 2.55 }),
			});

			expect(res.status).toBe(200);
		});
	});

	describe("DELETE /vtc/bases/:id", () => {
		it("should delete a base without linked vehicles", async () => {
			mockAuthenticatedUser();

			const baseNoVehicles = {
				...sampleBase,
				_count: { vehicles: 0 },
			};

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				baseNoVehicles as any
			);
			vi.mocked(db.operatingBase.delete).mockResolvedValue(
				baseNoVehicles as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should reject deletion of base with linked vehicles", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				sampleBase as any
			);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(400);
		});

		it("should return 404 for non-existent base", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});

		it("should not delete base from another organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_other_org", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.operatingBase.findMany).mockResolvedValue([]);
			vi.mocked(db.operatingBase.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/bases");

			expect(db.operatingBase.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});

		it("should prevent cross-organization access on single base", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/bases/base_from_org_456");

			expect(res.status).toBe(404);
		});
	});
});
