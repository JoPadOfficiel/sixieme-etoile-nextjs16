/**
 * Contacts API Tests
 *
 * Tests for the contacts CRUD endpoints.
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
import { contactsRouter } from "../contacts";

describe("Contacts API", () => {
  // Create a test app with the contacts router
  const createTestApp = () => {
    const app = new Hono();
    app.route("/vtc", contactsRouter);
    return app;
  };

  // Helper to create mock session
  const mockSession = (orgIdOrSlug: string, userId: string) => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { activeOrganizationId: orgIdOrSlug },
      user: { id: userId },
    } as any);
  };

  // Helper to mock organization lookup (middleware resolves slug/id to real id)
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

  // Sample contact data
  const sampleContact = {
    id: "contact_123",
    organizationId: "org_123",
    displayName: "John Doe",
    type: "INDIVIDUAL",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+33612345678",
    companyName: null,
    vatNumber: null,
    siret: null,
    billingAddress: null,
    isPartner: false,
    defaultClientType: "PRIVATE",
    notes: null,
    createdAt: new Date("2025-01-15T10:00:00Z"),
    updatedAt: new Date("2025-01-15T10:00:00Z"),
    _count: { quotes: 5, invoices: 3 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /vtc/contacts", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts");

      expect(res.status).toBe(401);
    });

    it("should return paginated contacts list", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findMany).mockResolvedValue([sampleContact] as any);
      vi.mocked(db.contact.count).mockResolvedValue(1);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].displayName).toBe("John Doe");
      expect(body.data[0]._count.quotes).toBe(5);
      expect(body.data[0]._count.invoices).toBe(3);
      expect(body.meta.page).toBe(1);
      expect(body.meta.total).toBe(1);
    });

    it("should filter contacts by search term", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findMany).mockResolvedValue([sampleContact] as any);
      vi.mocked(db.contact.count).mockResolvedValue(1);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts?search=john");

      expect(res.status).toBe(200);

      // Verify the search filter was applied
      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org_123",
            OR: expect.arrayContaining([
              expect.objectContaining({ displayName: expect.any(Object) }),
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ companyName: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it("should filter contacts by isPartner", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findMany).mockResolvedValue([]);
      vi.mocked(db.contact.count).mockResolvedValue(0);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts?isPartner=true");

      expect(res.status).toBe(200);

      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org_123",
            isPartner: true,
          }),
        })
      );
    });

    it("should respect pagination parameters", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findMany).mockResolvedValue([]);
      vi.mocked(db.contact.count).mockResolvedValue(50);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts?page=2&limit=10");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.meta.page).toBe(2);
      expect(body.meta.limit).toBe(10);
      expect(body.meta.totalPages).toBe(5);

      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    it("should only return contacts for the current organization", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findMany).mockResolvedValue([sampleContact] as any);
      vi.mocked(db.contact.count).mockResolvedValue(1);

      const app = createTestApp();
      await app.request("/vtc/contacts");

      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org_123",
          }),
        })
      );
    });
  });

  describe("GET /vtc/contacts/:id", () => {
    it("should return a single contact with quotes and invoices", async () => {
      mockAuthenticatedUser();

      const contactWithRelations = {
        ...sampleContact,
        quotes: [{ id: "quote_1", status: "DRAFT" }],
        invoices: [{ id: "invoice_1", status: "ISSUED" }],
      };

      vi.mocked(db.contact.findFirst).mockResolvedValue(contactWithRelations as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123");

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.displayName).toBe("John Doe");
      expect(body.quotes).toHaveLength(1);
      expect(body.invoices).toHaveLength(1);
    });

    it("should return 404 for non-existent contact", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/nonexistent");

      expect(res.status).toBe(404);
    });

    it("should not return contact from another organization", async () => {
      mockAuthenticatedUser();

      // Contact belongs to different org - findFirst returns null due to tenant filter
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_other_org");

      expect(res.status).toBe(404);
    });
  });

  describe("POST /vtc/contacts", () => {
    it("should create a new contact", async () => {
      mockAuthenticatedUser();

      const newContact = {
        displayName: "Jane Smith",
        type: "INDIVIDUAL",
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        isPartner: false,
      };

      vi.mocked(db.contact.create).mockResolvedValue({
        id: "contact_new",
        organizationId: "org_123",
        ...newContact,
        phone: null,
        companyName: null,
        vatNumber: null,
        siret: null,
        billingAddress: null,
        defaultClientType: "PRIVATE",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.displayName).toBe("Jane Smith");
      expect(body.organizationId).toBe("org_123");
    });

    it("should create a partner contact", async () => {
      mockAuthenticatedUser();

      const partnerContact = {
        displayName: "Partner Agency",
        type: "AGENCY",
        companyName: "Travel Agency Inc",
        email: "contact@agency.com",
        isPartner: true,
        defaultClientType: "PARTNER",
      };

      vi.mocked(db.contact.create).mockResolvedValue({
        id: "contact_partner",
        organizationId: "org_123",
        ...partnerContact,
        firstName: null,
        lastName: null,
        phone: null,
        vatNumber: null,
        siret: null,
        billingAddress: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partnerContact),
      });

      expect(res.status).toBe(201);
      const body = await res.json();

      expect(body.isPartner).toBe(true);
      expect(body.defaultClientType).toBe("PARTNER");
      expect(body.type).toBe("AGENCY");
    });

    it("should validate required fields", async () => {
      mockAuthenticatedUser();

      const app = createTestApp();
      const res = await app.request("/vtc/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Missing displayName
      });

      expect(res.status).toBe(400);
    });

    it("should set organizationId automatically", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.create).mockResolvedValue({
        id: "contact_new",
        organizationId: "org_123",
        displayName: "Test",
        type: "INDIVIDUAL",
        isPartner: false,
        defaultClientType: "PRIVATE",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createTestApp();
      await app.request("/vtc/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Test" }),
      });

      expect(db.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: "org_123",
          }),
        })
      );
    });
  });

  describe("PATCH /vtc/contacts/:id", () => {
    it("should update an existing contact", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.contact.update).mockResolvedValue({
        ...sampleContact,
        displayName: "John Updated",
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "John Updated" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.displayName).toBe("John Updated");
    });

    it("should return 404 for non-existent contact", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Updated" }),
      });

      expect(res.status).toBe(404);
    });

    it("should allow changing partner status", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.contact.update).mockResolvedValue({
        ...sampleContact,
        isPartner: true,
        defaultClientType: "PARTNER",
      } as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPartner: true, defaultClientType: "PARTNER" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.isPartner).toBe(true);
      expect(body.defaultClientType).toBe("PARTNER");
    });
  });

  describe("DELETE /vtc/contacts/:id", () => {
    it("should delete an existing contact", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(sampleContact as any);
      vi.mocked(db.contact.delete).mockResolvedValue(sampleContact as any);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_123", {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
    });

    it("should return 404 for non-existent contact", async () => {
      mockAuthenticatedUser();

      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/nonexistent", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });

    it("should not delete contact from another organization", async () => {
      mockAuthenticatedUser();

      // Contact not found due to tenant filter
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_other_org", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Multi-tenancy enforcement", () => {
    it("should always include organizationId in queries", async () => {
      mockAuthenticatedUser("org_456", "user_456");

      vi.mocked(db.contact.findMany).mockResolvedValue([]);
      vi.mocked(db.contact.count).mockResolvedValue(0);

      const app = createTestApp();
      await app.request("/vtc/contacts");

      expect(db.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: "org_456",
          }),
        })
      );
    });

    it("should prevent cross-organization access on single contact", async () => {
      mockAuthenticatedUser();

      // Simulate contact belonging to different org
      vi.mocked(db.contact.findFirst).mockResolvedValue(null);

      const app = createTestApp();
      const res = await app.request("/vtc/contacts/contact_from_org_456");

      expect(res.status).toBe(404);
    });
  });
});
