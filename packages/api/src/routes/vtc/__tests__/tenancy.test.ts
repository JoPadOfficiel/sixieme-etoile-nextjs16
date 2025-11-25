/**
 * VTC ERP Multi-Tenancy Integration Tests
 *
 * These tests validate that the multi-tenancy middleware and utilities
 * correctly isolate data between organizations.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

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
		member: {
			findUnique: vi.fn(),
		},
		contact: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
	},
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { organizationMiddleware } from "../../../middleware/organization";

describe("VTC ERP Multi-Tenancy", () => {
	// Create a test app with the organization middleware
	const createTestApp = () => {
		const app = new Hono();
		app.use("*", organizationMiddleware);
		app.get("/test", (c) => {
			return c.json({
				organizationId: c.get("organizationId"),
				userId: c.get("user")?.id,
			});
		});
		return app;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authentication", () => {
		it("should return 401 for unauthenticated requests", async () => {
			// Mock no session
			vi.mocked(auth.api.getSession).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/test");

			expect(res.status).toBe(401);
			const body = await res.text();
			expect(body).toContain("Unauthorized");
		});
	});

	describe("Organization Membership", () => {
		it("should return 400 when no active organization is selected", async () => {
			// Mock session without activeOrganizationId
			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: null },
				user: { id: "user_123" },
			} as any);

			const app = createTestApp();
			const res = await app.request("/test");

			expect(res.status).toBe(400);
			const body = await res.text();
			expect(body).toContain("No active organization selected");
		});

		it("should return 403 when user is not a member of the organization", async () => {
			// Mock session with activeOrganizationId
			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: "org_123" },
				user: { id: "user_123" },
			} as any);

			// Mock no membership found
			vi.mocked(db.member.findUnique).mockResolvedValue(null);

			const app = createTestApp();
			const res = await app.request("/test");

			expect(res.status).toBe(403);
			const body = await res.text();
			expect(body).toContain("You are not a member of this organization");
		});

		it("should set organizationId in context when authenticated and member", async () => {
			const orgId = "org_123";
			const userId = "user_123";

			// Mock valid session
			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: orgId },
				user: { id: userId },
			} as any);

			// Mock membership exists
			vi.mocked(db.member.findUnique).mockResolvedValue({
				id: "member_123",
				userId,
				organizationId: orgId,
				role: "member",
			} as any);

			const app = createTestApp();
			const res = await app.request("/test");

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.organizationId).toBe(orgId);
			expect(body.userId).toBe(userId);
		});
	});

	describe("Tenant Isolation Logic", () => {
		it("should call member.findUnique with correct composite key", async () => {
			const orgId = "org_123";
			const userId = "user_123";

			vi.mocked(auth.api.getSession).mockResolvedValue({
				session: { activeOrganizationId: orgId },
				user: { id: userId },
			} as any);

			vi.mocked(db.member.findUnique).mockResolvedValue({
				id: "member_123",
				userId,
				organizationId: orgId,
				role: "member",
			} as any);

			const app = createTestApp();
			await app.request("/test");

			expect(db.member.findUnique).toHaveBeenCalledWith({
				where: {
					userId_organizationId: {
						userId,
						organizationId: orgId,
					},
				},
			});
		});
	});
});

/**
 * Manual Integration Test Commands (curl)
 * 
 * Run these after starting the dev server:
 * 
 * # 1. Test unauthenticated access (should return 401)
 * curl -X GET http://localhost:3000/api/vtc/contacts -v
 * 
 * # 2. Test contact CRUD (requires valid session cookie)
 * # First, login via the web app to get a session cookie
 * 
 * # List contacts:
 * curl -X GET "http://localhost:3000/api/vtc/contacts" \
 *   -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
 * 
 * # Create contact:
 * curl -X POST "http://localhost:3000/api/vtc/contacts" \
 *   -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"displayName": "Test Contact", "type": "INDIVIDUAL"}'
 * 
 * # Get single contact:
 * curl -X GET "http://localhost:3000/api/vtc/contacts/CONTACT_ID" \
 *   -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
 * 
 * # Update contact:
 * curl -X PATCH "http://localhost:3000/api/vtc/contacts/CONTACT_ID" \
 *   -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"displayName": "Updated Name"}'
 * 
 * # Delete contact:
 * curl -X DELETE "http://localhost:3000/api/vtc/contacts/CONTACT_ID" \
 *   -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
 */
