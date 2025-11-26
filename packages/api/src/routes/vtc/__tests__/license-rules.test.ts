/**
 * License Rules API Tests
 *
 * Tests for the organization license rules (RSE) CRUD endpoints.
 * Validates multi-tenancy, uniqueness constraints, and data persistence.
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
		organizationLicenseRule: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			count: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		licenseCategory: {
			findFirst: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { licenseRulesRouter } from "../license-rules";

describe("License Rules API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.route("/vtc", licenseRulesRouter);
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
		code: "D_CMI",
		name: "Permis D avec FIMO",
		description: "Transport de personnes > 9 places",
	};

	const sampleRule = {
		id: "rule_123",
		organizationId: "org_123",
		licenseCategoryId: "lic_cat_123",
		maxDailyDrivingHours: "10.00",
		maxDailyAmplitudeHours: "14.00",
		breakMinutesPerDrivingBlock: 45,
		drivingBlockHoursForBreak: "4.50",
		cappedAverageSpeedKmh: 80,
		createdAt: new Date("2025-01-15T10:00:00Z"),
		updatedAt: new Date("2025-01-15T10:00:00Z"),
		licenseCategory: sampleLicenseCategory,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("GET /vtc/license-rules", () => {
		it("should return 401 for unauthenticated requests", async () => {
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules");

			expect(res.status).toBe(401);
		});

		it("should return paginated license rules list", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findMany).mockResolvedValue([sampleRule] as any);
			vi.mocked(db.organizationLicenseRule.count).mockResolvedValue(1);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.data).toHaveLength(1);
			expect(body.data[0].maxDailyDrivingHours).toBe("10.00");
			expect(body.data[0].licenseCategory.code).toBe("D_CMI");
			expect(body.meta.page).toBe(1);
			expect(body.meta.total).toBe(1);
		});

		it("should only return rules for the current organization", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findMany).mockResolvedValue([sampleRule] as any);
			vi.mocked(db.organizationLicenseRule.count).mockResolvedValue(1);

			const app = createTestApp();
			await app.request("/vtc/license-rules");

			expect(db.organizationLicenseRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
					}),
				})
			);
		});
	});

	describe("GET /vtc/license-rules/:id", () => {
		it("should return a single license rule", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(sampleRule as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/rule_123");

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.maxDailyDrivingHours).toBe("10.00");
			expect(body.breakMinutesPerDrivingBlock).toBe(45);
		});

		it("should return 404 for non-existent rule", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/nonexistent");

			expect(res.status).toBe(404);
		});
	});

	describe("POST /vtc/license-rules", () => {
		it("should create a new license rule", async () => {
			mockAuthenticatedUser();

			const newRule = {
				licenseCategoryId: "lic_cat_456",
				maxDailyDrivingHours: 9,
				maxDailyAmplitudeHours: 12,
				breakMinutesPerDrivingBlock: 30,
				drivingBlockHoursForBreak: 4,
			};

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue({
				id: "lic_cat_456",
				organizationId: "org_123",
				code: "B",
				name: "Permis B",
			} as any);
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);
			vi.mocked(db.organizationLicenseRule.create).mockResolvedValue({
				id: "rule_new",
				organizationId: "org_123",
				...newRule,
				cappedAverageSpeedKmh: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				licenseCategory: {
					id: "lic_cat_456",
					code: "B",
					name: "Permis B",
				},
			} as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newRule),
			});

			expect(res.status).toBe(201);
			const body = await res.json();

			expect(body.maxDailyDrivingHours).toBe(9);
			expect(body.organizationId).toBe("org_123");
		});

		it("should reject duplicate rule for same license category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(sampleLicenseCategory as any);
			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(sampleRule as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					licenseCategoryId: "lic_cat_123",
					maxDailyDrivingHours: 10,
					maxDailyAmplitudeHours: 14,
					breakMinutesPerDrivingBlock: 45,
					drivingBlockHoursForBreak: 4.5,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should reject non-existent license category", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.licenseCategory.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					licenseCategoryId: "nonexistent",
					maxDailyDrivingHours: 10,
					maxDailyAmplitudeHours: 14,
					breakMinutesPerDrivingBlock: 45,
					drivingBlockHoursForBreak: 4.5,
				}),
			});

			expect(res.status).toBe(400);
		});

		it("should validate required fields", async () => {
			mockAuthenticatedUser();

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PATCH /vtc/license-rules/:id", () => {
		it("should update an existing license rule", async () => {
			mockAuthenticatedUser();

			const updatedRule = {
				...sampleRule,
				maxDailyDrivingHours: "9.00",
			};

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(sampleRule as any);
			vi.mocked(db.organizationLicenseRule.update).mockResolvedValue(updatedRule as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/rule_123", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ maxDailyDrivingHours: 9 }),
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.maxDailyDrivingHours).toBe("9.00");
		});

		it("should return 404 for non-existent rule", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/nonexistent", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ maxDailyDrivingHours: 9 }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /vtc/license-rules/:id", () => {
		it("should delete an existing license rule", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(sampleRule as any);
			vi.mocked(db.organizationLicenseRule.delete).mockResolvedValue(sampleRule as any);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/rule_123", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const body = await res.json();

			expect(body.success).toBe(true);
		});

		it("should return 404 for non-existent rule", async () => {
			mockAuthenticatedUser();

			vi.mocked(db.organizationLicenseRule.findFirst).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/vtc/license-rules/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("Multi-tenancy enforcement", () => {
		it("should always include organizationId in queries", async () => {
			mockAuthenticatedUser("org_456", "user_456");

			vi.mocked(db.organizationLicenseRule.findMany).mockResolvedValue([]);
			vi.mocked(db.organizationLicenseRule.count).mockResolvedValue(0);

			const app = createTestApp();
			await app.request("/vtc/license-rules");

			expect(db.organizationLicenseRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_456",
					}),
				})
			);
		});
	});
});
