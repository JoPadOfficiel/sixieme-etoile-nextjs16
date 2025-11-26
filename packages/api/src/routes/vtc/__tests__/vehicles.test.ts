/**
 * Vehicles API Tests
 *
 * Tests for the vehicles CRUD endpoints.
 * Validates multi-tenancy, pagination, filters, and data persistence.
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
		vehicle: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		vehicleCategory: {
			findFirst: vi.fn(),
		},
		operatingBase: {
			findFirst: vi.fn(),
		},
		licenseCategory: {
			findFirst: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { vehiclesRouter } from "../vehicles";

describe("Vehicles API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", vehiclesRouter);
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
	};

	const sampleBase = {
		id: "base_123",
		organizationId: "org_123",
		name: "Paris CDG Garage",
		city: "Roissy-en-France",
	};

	const sampleVehicle = {
		id: "vehicle_123",
		organizationId: "org_123",
		vehicleCategoryId: "cat_123",
		operatingBaseId: "base_123",
		registrationNumber: "AB-123-CD",
		internalName: "Mercedes S-Class #1",
		vin: "WDDUG8CB1EA123456",
		passengerCapacity: 4,
		luggageCapacity: 3,
		consumptionLPer100Km: "8.5",
		averageSpeedKmh: 85,
		costPerKm: "0.35",
		requiredLicenseCategoryId: null,
		status: "ACTIVE",
		notes: null,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		vehicleCategory: sampleCategory,
		operatingBase: sampleBase,
		requiredLicenseCategory: null,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/vehicles", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles");

			expect(res.status).toBe(401);
		});

		it("should return paginated vehicles list with relations", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([sampleVehicle] as any);
			vi.mocked(db.vehicle.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].registrationNumber).toBe("AB-123-CD");
			expect(body.data[0].vehicleCategory.name).toBe("Berline Premium");
			expect(body.data[0].operatingBase.name).toBe("Paris CDG Garage");
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should filter vehicles by status", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicle.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles?status=MAINTENANCE");

			expect(res.status).toBe(200);

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						status: "MAINTENANCE",
					}),
				})
			);
		});

		it("should filter vehicles by vehicleCategoryId", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicle.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles?vehicleCategoryId=cat_123");

			expect(res.status).toBe(200);

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						vehicleCategoryId: "cat_123",
					}),
				})
			);
		});

		it("should filter vehicles by operatingBaseId", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicle.count).mockResolvedValue(0);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles?operatingBaseId=base_123");

			expect(res.status).toBe(200);

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						operatingBaseId: "base_123",
					}),
				})
			);
		});

		it("should respect pagination parameters", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicle.count).mockResolvedValue(50);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles?page=2&limit=10");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.meta.page).toBe(2);
			expect(body.meta.limit).toBe(10);
			expect(body.meta.totalPages).toBe(5);

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					skip: 10,
					take: 10,
				})
			);
		});

		it("should only return vehicles for the current organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findMany).mockResolvedValue([sampleVehicle] as any);
			vi.mocked(db.vehicle.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/vehicles");

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("GET /vtc/vehicles/:id", () => {
		it("should return a single vehicle with relations", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(sampleVehicle as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.registrationNumber).toBe("AB-123-CD");
			expect(body.vehicleCategory.name).toBe("Berline Premium");
			expect(body.operatingBase.name).toBe("Paris CDG Garage");
		});

		it("should return 404 for non-existent vehicle", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/nonexistent");

			expect(res.status).toBe(404);
		});

		it("should not return vehicle from another organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_other_org");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/vehicles", () => {
		it("should create a new vehicle", async () => {
			mockAuthenticatedUser();

			const newVehicle = {
				vehicleCategoryId: "cat_123",
				operatingBaseId: "base_123",
				registrationNumber: "EF-456-GH",
				passengerCapacity: 4,
			};

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);
			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				sampleBase as any
			);
			vi.mocked(db.vehicle.create).mockResolvedValue({
				id: "vehicle_new",
				organizationId: "org_123",
				...newVehicle,
				internalName: null,
				vin: null,
				luggageCapacity: null,
				consumptionLPer100Km: null,
				averageSpeedKmh: null,
				costPerKm: null,
				requiredLicenseCategoryId: null,
				status: "ACTIVE",
				notes: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				vehicleCategory: sampleCategory,
				operatingBase: sampleBase,
				requiredLicenseCategory: null,
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newVehicle),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.registrationNumber).toBe("EF-456-GH");
			expect(body.organizationId).toBe("org_123");
		});

		it("should reject invalid vehicleCategoryId", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					vehicleCategoryId: "invalid_cat",
					operatingBaseId: "base_123",
					registrationNumber: "EF-456-GH",
					passengerCapacity: 4,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should reject invalid operatingBaseId", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);
			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					vehicleCategoryId: "cat_123",
					operatingBaseId: "invalid_base",
					registrationNumber: "EF-456-GH",
					passengerCapacity: 4,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});

		it("should set organizationId automatically", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(
				sampleCategory as any
			);
			vi.mocked(db.operatingBase.findFirst).mockResolvedValue(
				sampleBase as any
			);
			vi.mocked(db.vehicle.create).mockResolvedValue({
				...sampleVehicle,
				id: "vehicle_new",
			} as any);

			const app = createTestApp();
			await app.request("/vtc/vehicles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					vehicleCategoryId: "cat_123",
					operatingBaseId: "base_123",
					registrationNumber: "EF-456-GH",
					passengerCapacity: 4,
				}),
			});

			expect(db.vehicle.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("PATCH /vtc/vehicles/:id", () => {
		it("should update an existing vehicle", async () => {
			mockAuthenticatedUser();

			const updatedVehicle = {
				...sampleVehicle,
				internalName: "Mercedes S-Class #1 - Updated",
			};

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(sampleVehicle as any);
			vi.mocked(db.vehicle.update).mockResolvedValue(updatedVehicle as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ internalName: "Mercedes S-Class #1 - Updated" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.internalName).toBe("Mercedes S-Class #1 - Updated");
		});

		it("should return 404 for non-existent vehicle", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ internalName: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("should allow changing status", async () => {
			mockAuthenticatedUser();

			const updatedVehicle = {
				...sampleVehicle,
				status: "MAINTENANCE",
			};

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(sampleVehicle as any);
			vi.mocked(db.vehicle.update).mockResolvedValue(updatedVehicle as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "MAINTENANCE" }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.status).toBe("MAINTENANCE");
		});

		it("should validate new vehicleCategoryId if provided", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(sampleVehicle as any);
			vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ vehicleCategoryId: "invalid_cat" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /vtc/vehicles/:id", () => {
		it("should delete an existing vehicle", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(sampleVehicle as any);
			vi.mocked(db.vehicle.delete).mockResolvedValue(sampleVehicle as any);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should return 404 for non-existent vehicle", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});

		it("should not delete vehicle from another organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_other_org", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.vehicle.findMany).mockResolvedValue([]);
			vi.mocked(db.vehicle.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/vehicles");

			expect(db.vehicle.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});

		it("should prevent cross-organization access on single vehicle", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.vehicle.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/vehicles/vehicle_from_org_456");

			expect(res.status).toBe(404);
		});
	});
});
