import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { organizationMiddleware } from "../../../middleware/organization";
import { pricingSettingsRouter } from "../pricing-settings";

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
		organizationPricingSettings: {
			findUnique: vi.fn(),
			update: vi.fn(),
			create: vi.fn(),
		},
		organization: {
			findFirst: vi.fn(),
		},
		member: {
			findUnique: vi.fn(),
		},
		vehicleCategory: {
			count: vi.fn(),
		},
	},
}));

describe("VTC Pricing Settings API", () => {
	const createTestApp = () => {
		const app = new Hono();
		app.use("*", organizationMiddleware);
		app.route("/", pricingSettingsRouter);
		return app;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Document Personalization Settings", () => {
		it("should allow updating logo resize settings", async () => {
			const orgId = "org_123";
			const userId = "user_123";
			const newLogoWidth = 200;

			// Mock session
			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: orgId },
				user: { id: userId },
			} as any);

			// Mock organization check
			vi.mocked(db.organization.findFirst).mockResolvedValue({
				id: orgId,
			} as any);

			// Mock membership check
			vi.mocked(db.member.findUnique).mockResolvedValue({
				id: "member_123",
				userId,
				organizationId: orgId,
				role: "owner",
			} as any);

			// Mock existing settings
			vi.mocked(db.organizationPricingSettings.findUnique).mockResolvedValue({
				id: "settings_123",
				organizationId: orgId,
				baseRatePerKm: 1.5,
				baseRatePerHour: 40,
				defaultMarginPercent: 20,
				createdAt: new Date(),
				updatedAt: new Date(),
				// Existing fields
				documentLogoUrl: "logo.png",
				logoPosition: "LEFT",
			} as any);

			// Mock update
			vi.mocked(db.organizationPricingSettings.update).mockResolvedValue({
				id: "settings_123",
				organizationId: orgId,
				baseRatePerKm: 1.5,
				baseRatePerHour: 40,
				defaultMarginPercent: 20,
				createdAt: new Date(),
				updatedAt: new Date(),
				documentLogoUrl: "logo.png",
				logoPosition: "LEFT",
				logoWidth: newLogoWidth, // The new field we expect
			} as any);

			const app = createTestApp();
			const res = await app.request("/pricing-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					logoWidth: newLogoWidth,
				}),
			});

			const body = await res.json();

			expect(res.status).toBe(200);
			expect(body.logoWidth).toBe(newLogoWidth);

			// Verify db update was called with new field
			expect(db.organizationPricingSettings.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						logoWidth: newLogoWidth,
					}),
				}),
			);
		});

		it("should allow updating PDF appearance", async () => {
			const orgId = "org_123";
			const userId = "user_123";
			const newPdfAppearance = "FULL";

			// Mock session
			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: orgId },
				user: { id: userId },
			} as any);

			// Mock organization check
			vi.mocked(db.organization.findFirst).mockResolvedValue({
				id: orgId,
			} as any);

			// Mock membership check
			vi.mocked(db.member.findUnique).mockResolvedValue({
				id: "member_123",
				userId,
				organizationId: orgId,
				role: "owner",
			} as any);

			// Mock existing settings
			vi.mocked(db.organizationPricingSettings.findUnique).mockResolvedValue({
				id: "settings_123",
				organizationId: orgId,
				pdfAppearance: "STANDARD",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			// Mock update
			vi.mocked(db.organizationPricingSettings.update).mockResolvedValue({
				id: "settings_123",
				organizationId: orgId,
				pdfAppearance: newPdfAppearance,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const app = createTestApp();
			const res = await app.request("/pricing-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					pdfAppearance: newPdfAppearance,
				}),
			});

			const body = await res.json();

			expect(res.status).toBe(200);
			expect(body.pdfAppearance).toBe(newPdfAppearance);

			// Verify db update was called with new field
			expect(db.organizationPricingSettings.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						pdfAppearance: newPdfAppearance,
					}),
				}),
			);
		});
	});
});
