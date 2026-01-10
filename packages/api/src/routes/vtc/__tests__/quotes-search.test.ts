import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// 1. Mock EVERYTHING before any other imports
vi.mock("@repo/database", () => ({
  db: {
    quote: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    vehicleCategory: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../../../middleware/organization", () => ({
  organizationMiddleware: async (c: any, next: any) => {
    console.log("MOCKED MIDDLEWARE CALLED");
    c.set("organizationId", "org-123");
    await next();
  },
}));

// 2. Import the router
import { quotesRouter } from "../quotes";
import { db } from "@repo/database";

describe("Quotes Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should include endCustomer fields in OR search clause", async () => {
    const searchTerm = "Wick";
    const orgId = "org-123";

    // Mock successful response
    vi.mocked(db.quote.findMany).mockResolvedValue([]);
    vi.mocked(db.quote.count).mockResolvedValue(0);

    const app = new Hono();
    // No need for extra middleware here since organizationMiddleware is mocked to set orgId
    app.route("/", quotesRouter);

    const req = new Request(`http://localhost/quotes?search=${searchTerm}`, {
      method: "GET",
    });

    const res = await app.request(req);
    
    if (res.status !== 200) {
      const body = await res.text();
      console.log("Response Status:", res.status);
      console.log("Response Body:", body);
    }
    
    expect(res.status).toBe(200);

    // Verify Prisma call arguments
    const findManyCall = vi.mocked(db.quote.findMany).mock.calls[0][0];
    const where = findManyCall?.where as any;

    expect(where.OR).toBeDefined();
    const orFieldStrings = JSON.stringify(where.OR);
    
    expect(orFieldStrings).toContain("endCustomer");
    expect(where.OR).toEqual(expect.arrayContaining([
      { contact: { displayName: { contains: searchTerm, mode: "insensitive" } } },
      { contact: { companyName: { contains: searchTerm, mode: "insensitive" } } },
      { endCustomer: { firstName: { contains: searchTerm, mode: "insensitive" } } },
      { endCustomer: { lastName: { contains: searchTerm, mode: "insensitive" } } },
    ]));
  });
});
