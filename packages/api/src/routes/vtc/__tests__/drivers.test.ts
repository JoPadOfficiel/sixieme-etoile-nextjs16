/**
 * Drivers API Tests
 *
 * Tests for the drivers CRUD endpoints including license management.
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
		driver: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		driverLicense: {
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
		},
		licenseCategory: {
			findFirst: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { driversRouter } from "../drivers";

describe("Drivers API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", driversRouter);
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

	const sampleLicenseCategory = {
		id: "lic_cat_123",
		organizationId: "org_123",
		code: "B",
		name: "Permis B",
		description: null,
	};

	const sampleDriverLicense = {
		id: "dl_123",
		driverId: "driver_123",
		licenseCategoryId: "lic_cat_123",
		licenseNumber: "12345678",
		validFrom: new Date("2020-01-01"),
		validTo: new Date("2030-01-01"),
		createdAt: new Date(),
		updatedAt: new Date(),
		licenseCategory: sampleLicenseCategory,
	};

	const sampleDriver = {
		id: "driver_123",
		organizationId: "org_123",
		firstName: "Jean",
		lastName: "Dupont",
		email: "jean.dupont@example.com",
		phone: "+33612345678",
		employmentStatus: "EMPLOYEE",
		hourlyCost: "25.00",
		isActive: true,
		notes: null,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		driverLicenses: [sampleDriverLicense],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/drivers", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers");

			expect(res.status).toBe(401);
		});

		it("should return paginated drivers list with licenses", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findMany).mockResolvedValue([sampleDriver] as any);
			vi.mocked(db.driver.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].firstName).toBe("Jean");
			expect(body.data[0].lastName).toBe("Dupont");
			expect(body.data[0].driverLicenses).toHaveLength(1);
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should filter by isActive", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findMany).mockResolvedValue([sampleDriver] as any);
			vi.mocked(db.driver.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/drivers?isActive=true");

			expect(db.driver.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						isActive: true,
					}),
				})
			);
		});

		it("should search by name", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findMany).mockResolvedValue([sampleDriver] as any);
			vi.mocked(db.driver.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/drivers?search=Jean");

			expect(db.driver.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							expect.objectContaining({ firstName: expect.any(Object) }),
						]),
					}),
				})
			);
		});
	});

	describe("GET /vtc/drivers/:id", () => {
		it("should return a single driver with licenses", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.firstName).toBe("Jean");
			expect(body.driverLicenses).toHaveLength(1);
		});

		it("should return 404 for non-existent driver", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/nonexistent");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/drivers", () => {
		it("should create a new driver", async () => {
			mockAuthenticatedUser();

			const newDriver = {
				firstName: "Marie",
				lastName: "Martin",
				email: "marie.martin@example.com",
				employmentStatus: "EMPLOYEE",
				isActive: true,
			};

			vi.mocked(db.driver.create).mockResolvedValue({
				id: "driver_new",
				organizationId: "org_123",
				...newDriver,
				phone: null,
				hourlyCost: null,
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				driverLicenses: [],
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newDriver),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.firstName).toBe("Marie");
			expect(body.organizationId).toBe("org_123");
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/drivers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /vtc/drivers/:id", () => {
		it("should update an existing driver", async () => {
			mockAuthenticatedUser();

			const updatedDriver = {
				...sampleDriver,
				firstName: "Jean-Pierre",
			};

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.driver.update).mockResolvedValue(updatedDriver as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ firstName: "Jean-Pierre" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.firstName).toBe("Jean-Pierre");
		});

		it("should return 404 for non-existent driver", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ firstName: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /vtc/drivers/:id", () => {
		it("should delete an existing driver and their licenses", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.driverLicense.deleteMany).mockResolvedValue({ count: 1 } as any);
			vi.mocked(db.driver.delete).mockResolvedValue(sampleDriver as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
			expect(db.driverLicense.deleteMany).toHaveBeenCalledWith({
				where: { driverId: "driver_123" },
			});
		});

		it("should return 404 for non-existent driver", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/drivers/:id/licenses", () => {
		it("should add a license to a driver", async () => {
			mockAuthenticatedUser();

			const newLicense = {
				licenseCategoryId: "lic_cat_123",
				licenseNumber: "87654321",
				validFrom: "2025-01-01",
			};

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleLicenseCategory as any);
			vi.mocked(db.driverLicense.findFirst).mockResolvedValue(null);
			vi.mocked(db.driverLicense.create).mockResolvedValue({
				id: "dl_new",
				driverId: "driver_123",
				...newLicense,
				validTo: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				licenseCategory: sampleLicenseCategory,
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123/licenses", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newLicense),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.licenseNumber).toBe("87654321");
		});

		it("should reject duplicate license category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleLicenseCategory as any);
			vi.mocked(db.driverLicense.findFirst).mockResolvedValue(sampleDriverLicense as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123/licenses", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					licenseCategoryId: "lic_cat_123",
					licenseNumber: "duplicate",
					validFrom: "2025-01-01",
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should return 404 for non-existent driver", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/nonexistent/licenses", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					licenseCategoryId: "lic_cat_123",
					licenseNumber: "12345",
					validFrom: "2025-01-01",
				}),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /vtc/drivers/:id/licenses/:licenseId", () => {
		it("should remove a license from a driver", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.driverLicense.findFirst).mockResolvedValue(sampleDriverLicense as any);
			vi.mocked(db.driverLicense.delete).mockResolvedValue(sampleDriverLicense as any);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123/licenses/dl_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should return 404 for non-existent license", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.driver.findFirst).mockResolvedValue(sampleDriver as any);
			vi.mocked(db.driverLicense.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/drivers/driver_123/licenses/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.driver.findMany).mockResolvedValue([]);
			vi.mocked(db.driver.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/drivers");

			expect(db.driver.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});
	});
});
