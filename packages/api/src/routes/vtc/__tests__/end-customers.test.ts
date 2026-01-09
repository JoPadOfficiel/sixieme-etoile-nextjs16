/**
 * EndCustomers API Tests
 *
 * Tests for the end-customers CRUD endpoints (Story 24.2).
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
    contact: {
      findFirst: vi.fn(),
    },
    endCustomer: {
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
import { endCustomersRouter, contactEndCustomersRouter } from "../end-customers";

describe("EndCustomers API", () => {
  // Create a test app with both routers mounted
  const createTestApp = () => {
    const app = new Hono();
    // Mount the direct end-customer router
    app.route("/vtc", endCustomersRouter);
    // Mount the contact-scoped router under /vtc because of how path storage works in Hono testing
    // Note: The router itself defines basePath "/contacts/:contactId/end-customers"
    // So app.route("/vtc", router) results in "/vtc/contacts/:contactId/end-customers"
    app.route("/vtc", contactEndCustomersRouter);
    return app;
  };

  // Helper to create mock session
  const mockSession = (orgIdOrSlug: string, userId: string) => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { activeOrganizationId: orgIdOrSlug },
      user: { id: userId },
    } as any);
  };

  // Helper to mock organization lookup
  const mockOrganization = (orgId: string = "org_123") => {
    vi.mocked(db.organization.findFirst).mockResolvedValue({
      id: orgId,
    } as any);
  };

  // Helper to mock membership
  const mockMembership = (role: string = "member") => {
    vi.mocked(db.member.findUnique).mockResolvedValue({
      id: "member_123",
      role,
      userId: "user_123",
      organizationId: "org_123",
      createdAt: new Date(),
    } as any);
  };

  // Combined helper for authenticated requests
  const mockAuthenticatedUser = (orgId: string = "org_123", userId: string = "user_123", role: string = "member") => {
    mockSession(orgId, userId);
    mockOrganization(orgId);
    mockMembership(role);
  };

  // Sample data
  const sampleContact = {
    id: "contact_123",
    organizationId: "org_123",
    displayName: "Partner Agency",
    isPartner: true,
  };

  const sampleEndCustomer = {
    id: "ec_123",
    organizationId: "org_123",
    contactId: "contact_123",
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean.dupont@example.com",
    phone: "+33612345678",
    difficultyScore: 3,
    notes: "VIP client",
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { quotes: 2 },
    contact: {
      id: "contact_123",
      displayName: "Partner Agency",
      isPartner: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===================================
  // List EndCustomers (Scoped to Contact)
  // ===================================
  describe("GET /vtc/contacts/:contactId/end-customers", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123/end-customers");

      expect(res.status).toBe(401);
    });

    it("should return paginated list for a contact", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.endCustomer.findMany).mockResolvedValue([sampleEndCustomer] as any);
      vi.mocked(db.endCustomer.count).mockResolvedValue(1);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123/end-customers");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].firstName).toBe("Jean");
      expect(body.meta.total).toBe(1);
    });

    it("should return 404 if parent contact not found", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_missing/end-customers");

      expect(res.status).toBe(404);
    });

    it("should filter by search term", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.endCustomer.findMany).mockResolvedValue([]);
      vi.mocked(db.endCustomer.count).mockResolvedValue(0);

      const app = createTestApp();
      await app.request("/vtc/contacts/contact_123/end-customers?search=dupont");

      expect(db.endCustomer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: expect.any(Object) }),
              expect.objectContaining({ lastName: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it("should filter by difficultyScore", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.endCustomer.findMany).mockResolvedValue([]);

      const app = createTestApp();
      await app.request("/vtc/contacts/contact_123/end-customers?difficultyScore=5");

      expect(db.endCustomer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficultyScore: 5,
          }),
        })
      );
    });
  });

  // ===================================
  // Create EndCustomer (Scoped to Contact)
  // ===================================
  describe("POST /vtc/contacts/:contactId/end-customers", () => {
    it("should create a new end-customer", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      
      const newEndCustomer = {
        firstName: "New",
        lastName: "Client",
        difficultyScore: 1,
      };

      vi.mocked(db.endCustomer.create).mockResolvedValue({
        id: "ec_new",
        organizationId: "org_123",
        contactId: "contact_123",
        ...newEndCustomer,
        email: null,
        phone: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123/end-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEndCustomer),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.firstName).toBe("New");
    });

    it("should fail if contact is not a partner", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue({
        ...sampleContact,
        isPartner: false, // Not a partner
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123/end-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Test", lastName: "Test" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("partenaires");
    });

    it("should validate required fields", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123/end-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "JustFirstName" }), // Missing lastName
      });

      expect(res.status).toBe(400);
    });
  });

  // ===================================
  // Get Single EndCustomer
  // ===================================
  describe("GET /vtc/end-customers/:id", () => {
    it("should return a single end-customer", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(sampleEndCustomer as any);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_123");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe("ec_123");
      expect(body._count.quotes).toBe(2);
    });

    it("should return 404 if not found", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_missing");

      expect(res.status).toBe(404);
    });

    it("should enforce tenant isolation", async () => {
      mockAuthenticatedUser("org_123");
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(null); // Not found in this org

      const app = createTestApp();
      await app.request("/vtc/end-customers/ec_other_org");

      // Verify query included organizationId
      expect(db.endCustomer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "ec_other_org",
            organizationId: "org_123",
          }),
        })
      );
    });
  });

  // ===================================
  // Update EndCustomer
  // ===================================
  describe("PATCH /vtc/end-customers/:id", () => {
    it("should update an existing end-customer", async () => {
      mockAuthenticatedUser();
      
      const updatedData = { ...sampleEndCustomer, difficultyScore: 5 };
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(sampleEndCustomer as any);
      vi.mocked(db.endCustomer.update).mockResolvedValue(updatedData as any);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficultyScore: 5 }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.difficultyScore).toBe(5);
    });

    it("should return 404 if not found", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_missing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Updated" }),
      });

      expect(res.status).toBe(404);
    });
  });

  // ===================================
  // Delete EndCustomer
  // ===================================
  describe("DELETE /vtc/end-customers/:id", () => {
    it("should delete successfully if no linked quotes", async () => {
      mockAuthenticatedUser();
      
      const safeToDelete = { ...sampleEndCustomer, _count: { quotes: 0 } };
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(safeToDelete as any);
      vi.mocked(db.endCustomer.delete).mockResolvedValue(safeToDelete as any);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_123", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("should fail (400) if linked quotes exist", async () => {
      mockAuthenticatedUser();
      
      // Has 2 linked quotes
      const unsafeToDelete = { ...sampleEndCustomer, _count: { quotes: 2 } };
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(unsafeToDelete as any);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_123", {
        method: "DELETE",
      });

      expect(res.status).toBe(400); // Bad Request because of linked quotes
      const body = await res.json();
      expect(body.message).toContain("Impossible de supprimer");
      expect(body.message).toContain("2 devis");
      
      // Ensure delete was NOT called
      expect(db.endCustomer.delete).not.toHaveBeenCalled();
    });

    it("should return 404 if not found", async () => {
      mockAuthenticatedUser();
      vi.mocked(db.endCustomer.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/end-customers/ec_missing", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
      expect(db.endCustomer.delete).not.toHaveBeenCalled();
    });
  });
});
