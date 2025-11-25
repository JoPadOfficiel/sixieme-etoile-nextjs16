/**
 * Integration Settings API Tests
 *
 * Tests for the integration settings endpoints.
 * Validates CRUD operations, role-based access, and key masking.
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
    member: {
      findUnique: vi.fn(),
    },
    organizationIntegrationSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { integrationsRouter } from "../integrations";

describe("Integration Settings API", () => {
  // Create a test app with the integrations router
  const createTestApp = () => {
    const app = new Hono();
    app.route("/vtc", integrationsRouter);
    return app;
  };

  // Helper to create mock session
  const mockSession = (orgId: string, userId: string) => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { activeOrganizationId: orgId },
      user: { id: userId },
    } as any);
  };

  // Helper to mock admin membership
  const mockAdminMembership = (role: string = "admin") => {
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "member_123",
      role,
      userId: "user_123",
      organizationId: "org_123",
      createdAt: new Date(),
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.COLLECT_API_KEY;
  });

  describe("GET /vtc/settings/integrations", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(401);
    });

    it("should return 403 for non-admin users", async () => {
      mockSession("org_123", "user_123");
      // Mock member role
      vi.mocked(db.member.findUnique).mockResolvedValue({
        id: "member_123",
        role: "member", // Not admin
        userId: "user_123",
        organizationId: "org_123",
        createdAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(403);
      const body = await res.text();
      expect(body).toContain("Admin or owner role required");
    });

    it("should return masked keys for admin users", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      // Mock settings with keys
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: "AIzaSyB1234567890abcdefghijklmnop",
        collectApiKey: "collect_key_12345678",
        createdAt: new Date(),
        updatedAt: new Date("2025-01-15T10:00:00Z"),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.googleMapsApiKey).toBe("****...mnop");
      expect(body.data.collectApiKey).toBe("****...5678");
      expect(body.data.hasGoogleMapsKey).toBe(true);
      expect(body.data.hasCollectApiKey).toBe(true);
    });

    it("should return null for missing keys", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("owner");

      // Mock no settings
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.googleMapsApiKey).toBeNull();
      expect(body.data.collectApiKey).toBeNull();
      expect(body.data.hasGoogleMapsKey).toBe(false);
      expect(body.data.hasCollectApiKey).toBe(false);
    });

    it("should show env fallback keys as configured", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      // Set env vars
      process.env.GOOGLE_MAPS_API_KEY = "env_google_key_12345";

      // Mock no org-specific settings
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data.hasGoogleMapsKey).toBe(true);
      expect(body.data.googleMapsApiKey).toBe("****...2345");
      expect(body.data.hasCollectApiKey).toBe(false);
    });
  });

  describe("PUT /vtc/settings/integrations", () => {
    it("should return 403 for non-admin users", async () => {
      mockSession("org_123", "user_123");
      vi.mocked(db.member.findUnique).mockResolvedValue({
        id: "member_123",
        role: "member",
        userId: "user_123",
        organizationId: "org_123",
        createdAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: "new_key" }),
      });

      expect(res.status).toBe(403);
    });

    it("should create settings when none exist", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      const updatedAt = new Date("2025-01-15T10:00:00Z");
      vi.mocked(db.organizationIntegrationSettings.upsert).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: "new_google_key",
        collectApiKey: null,
        createdAt: updatedAt,
        updatedAt,
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: "new_google_key" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.updatedAt).toBe("2025-01-15T10:00:00.000Z");
    });

    it("should update existing settings", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("owner");

      const updatedAt = new Date("2025-01-15T12:00:00Z");
      vi.mocked(db.organizationIntegrationSettings.upsert).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: "updated_key",
        collectApiKey: "collect_key",
        createdAt: new Date(),
        updatedAt,
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleMapsApiKey: "updated_key",
          collectApiKey: "collect_key",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("should return 400 when no keys provided", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain("At least one API key must be provided");
    });

    it("should allow setting key to null to clear it", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      vi.mocked(db.organizationIntegrationSettings.upsert).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: null,
        collectApiKey: "existing_key",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: null }),
      });

      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /vtc/settings/integrations/:keyType", () => {
    it("should return 403 for non-admin users", async () => {
      mockSession("org_123", "user_123");
      vi.mocked(db.member.findUnique).mockResolvedValue({
        id: "member_123",
        role: "member",
        userId: "user_123",
        organizationId: "org_123",
        createdAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations/googleMaps", {
        method: "DELETE",
      });

      expect(res.status).toBe(403);
    });

    it("should delete Google Maps key", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      // Mock existing settings
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: "existing_key",
        collectApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.organizationIntegrationSettings.update).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: null,
        collectApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations/googleMaps", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deletedKey).toBe("googleMaps");
    });

    it("should delete CollectAPI key", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("owner");

      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: null,
        collectApiKey: "existing_key",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(db.organizationIntegrationSettings.update).mockResolvedValue({
        id: "settings_123",
        organizationId: "org_123",
        googleMapsApiKey: null,
        collectApiKey: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations/collectApi", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deletedKey).toBe("collectApi");
    });

    it("should return 404 when no settings exist", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      // Mock no settings
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations/googleMaps", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).toContain("No integration settings found");
    });

    it("should return 400 for invalid key type", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations/invalidKey", {
        method: "DELETE",
      });

      // Zod validation should fail
      expect(res.status).toBe(400);
    });
  });

  describe("Role-based access", () => {
    it("should allow admin role", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("admin");
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(200);
    });

    it("should allow owner role", async () => {
      mockSession("org_123", "user_123");
      mockAdminMembership("owner");
      vi.mocked(db.organizationIntegrationSettings.findUnique).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(200);
    });

    it("should deny member role", async () => {
      mockSession("org_123", "user_123");
      vi.mocked(db.member.findUnique).mockResolvedValue({
        id: "member_123",
        role: "member",
        userId: "user_123",
        organizationId: "org_123",
        createdAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(403);
    });

    it("should deny viewer role", async () => {
      mockSession("org_123", "user_123");
      vi.mocked(db.member.findUnique).mockResolvedValue({
        id: "member_123",
        role: "viewer",
        userId: "user_123",
        organizationId: "org_123",
        createdAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/settings/integrations");

      expect(res.status).toBe(403);
    });
  });
});
