/**
 * Partner Assignments API Routes
 *
 * Story 14.6: Provides endpoints for managing partner assignments to rate grids
 * (zone routes, excursion packages, dispo packages) from the pricing UI.
 *
 * This enables bidirectional assignment workflow:
 * - From Pricing UI: Assign a route/package to multiple partners
 * - From Contact page: Assign multiple routes/packages to a partner (existing)
 *
 * @see docs/sprint-artifacts/14-6-assign-rate-grids-from-pricing-ui.md
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantFilter } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// Helper to convert Prisma Decimal to number
const decimalToNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

// Validation schemas
const partnerAssignmentSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  overridePrice: z.number().positive().nullable().optional(),
});

const bulkAssignmentSchema = z.object({
  assignments: z.array(partnerAssignmentSchema),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

// ============================================================================
// ZONE ROUTES PARTNER ASSIGNMENTS
// ============================================================================

export const zoneRouteAssignmentsRouter = new Hono()
  .basePath("/pricing/routes/:id/partner-assignments")
  .use("*", organizationMiddleware)

  // GET: List partners assigned to a zone route
  .get(
    "/",
    validator("param", idParamSchema),
    describeRoute({
      summary: "Get zone route partner assignments",
      description: "List all partners assigned to a specific zone route with their override prices",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "List of partner assignments" },
        404: { description: "Zone route not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");

      // Verify route exists and belongs to organization
      const route = await db.zoneRoute.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: {
          id: true,
          fixedPrice: true,
          partnerContractZoneRoutes: {
            include: {
              partnerContract: {
                include: {
                  contact: {
                    select: {
                      id: true,
                      displayName: true,
                      email: true,
                      phone: true,
                      isPartner: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!route) {
        throw new HTTPException(404, { message: "Zone route not found" });
      }

      const catalogPrice = decimalToNumber(route.fixedPrice) ?? 0;

      const assignments = route.partnerContractZoneRoutes.map((pcr) => {
        const overridePrice = decimalToNumber(pcr.overridePrice);
        return {
          id: pcr.id,
          contactId: pcr.partnerContract.contact.id,
          contactName: pcr.partnerContract.contact.displayName,
          contactEmail: pcr.partnerContract.contact.email,
          contactPhone: pcr.partnerContract.contact.phone,
          overridePrice,
          catalogPrice,
          effectivePrice: overridePrice ?? catalogPrice,
          assignedAt: pcr.partnerContract.createdAt,
        };
      });

      return c.json({
        routeId: route.id,
        catalogPrice,
        totalPartners: assignments.length,
        assignments,
      });
    }
  )

  // POST: Bulk assign/update partners to a zone route
  .post(
    "/",
    validator("param", idParamSchema),
    validator("json", bulkAssignmentSchema),
    describeRoute({
      summary: "Assign partners to zone route",
      description: "Bulk assign or update partner assignments for a zone route. Replaces all existing assignments.",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "Assignments updated successfully" },
        400: { description: "Invalid request data" },
        404: { description: "Zone route not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");
      const { assignments } = c.req.valid("json");

      // Verify route exists
      const route = await db.zoneRoute.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: { id: true },
      });

      if (!route) {
        throw new HTTPException(404, { message: "Zone route not found" });
      }

      // Validate all contacts are partners in this organization
      const contactIds = assignments.map((a) => a.contactId);
      if (contactIds.length > 0) {
        const validContacts = await db.contact.findMany({
          where: withTenantFilter(
            { id: { in: contactIds }, isPartner: true },
            organizationId
          ),
          select: { id: true },
        });

        const validContactIds = new Set(validContacts.map((c) => c.id));
        const invalidContacts = contactIds.filter((id) => !validContactIds.has(id));

        if (invalidContacts.length > 0) {
          throw new HTTPException(400, {
            message: `Some contacts are not partners or don't exist: ${invalidContacts.join(", ")}`,
          });
        }
      }

      // Perform the assignment update in a transaction
      await db.$transaction(async (tx) => {
        // Get or create partner contracts for each contact
        for (const assignment of assignments) {
          // Ensure partner contract exists
          let contract = await tx.partnerContract.findUnique({
            where: { contactId: assignment.contactId },
            select: { id: true },
          });

          if (!contract) {
            // Create a default partner contract
            contract = await tx.partnerContract.create({
              data: {
                organizationId,
                contactId: assignment.contactId,
                paymentTerms: "DAYS_30",
                commissionPercent: 0,
              },
              select: { id: true },
            });
          }

          // Upsert the zone route assignment
          await tx.partnerContractZoneRoute.upsert({
            where: {
              partnerContractId_zoneRouteId: {
                partnerContractId: contract.id,
                zoneRouteId: id,
              },
            },
            create: {
              partnerContractId: contract.id,
              zoneRouteId: id,
              overridePrice: assignment.overridePrice ?? null,
            },
            update: {
              overridePrice: assignment.overridePrice ?? null,
            },
          });
        }

        // Remove assignments for contacts not in the new list
        if (contactIds.length > 0) {
          // Get all contracts for contacts NOT in the list
          const contractsToRemove = await tx.partnerContract.findMany({
            where: {
              organizationId,
              contactId: { notIn: contactIds },
            },
            select: { id: true },
          });

          if (contractsToRemove.length > 0) {
            await tx.partnerContractZoneRoute.deleteMany({
              where: {
                zoneRouteId: id,
                partnerContractId: { in: contractsToRemove.map((c) => c.id) },
              },
            });
          }
        } else {
          // If empty assignments, remove all
          await tx.partnerContractZoneRoute.deleteMany({
            where: { zoneRouteId: id },
          });
        }
      });

      return c.json({
        success: true,
        routeId: id,
        assignedCount: assignments.length,
      });
    }
  );

// ============================================================================
// EXCURSION PACKAGES PARTNER ASSIGNMENTS
// ============================================================================

export const excursionAssignmentsRouter = new Hono()
  .basePath("/pricing/excursions/:id/partner-assignments")
  .use("*", organizationMiddleware)

  // GET: List partners assigned to an excursion package
  .get(
    "/",
    validator("param", idParamSchema),
    describeRoute({
      summary: "Get excursion package partner assignments",
      description: "List all partners assigned to a specific excursion package",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "List of partner assignments" },
        404: { description: "Excursion package not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");

      const pkg = await db.excursionPackage.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: {
          id: true,
          price: true,
          partnerContractExcursionPackages: {
            include: {
              partnerContract: {
                include: {
                  contact: {
                    select: {
                      id: true,
                      displayName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!pkg) {
        throw new HTTPException(404, { message: "Excursion package not found" });
      }

      const catalogPrice = decimalToNumber(pkg.price) ?? 0;

      const assignments = pkg.partnerContractExcursionPackages.map((pce) => {
        const overridePrice = decimalToNumber(pce.overridePrice);
        return {
          id: pce.id,
          contactId: pce.partnerContract.contact.id,
          contactName: pce.partnerContract.contact.displayName,
          contactEmail: pce.partnerContract.contact.email,
          contactPhone: pce.partnerContract.contact.phone,
          overridePrice,
          catalogPrice,
          effectivePrice: overridePrice ?? catalogPrice,
          assignedAt: pce.partnerContract.createdAt,
        };
      });

      return c.json({
        packageId: pkg.id,
        catalogPrice,
        totalPartners: assignments.length,
        assignments,
      });
    }
  )

  // POST: Bulk assign partners to excursion package
  .post(
    "/",
    validator("param", idParamSchema),
    validator("json", bulkAssignmentSchema),
    describeRoute({
      summary: "Assign partners to excursion package",
      description: "Bulk assign or update partner assignments for an excursion package",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "Assignments updated successfully" },
        400: { description: "Invalid request data" },
        404: { description: "Excursion package not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");
      const { assignments } = c.req.valid("json");

      const pkg = await db.excursionPackage.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: { id: true },
      });

      if (!pkg) {
        throw new HTTPException(404, { message: "Excursion package not found" });
      }

      const contactIds = assignments.map((a) => a.contactId);
      if (contactIds.length > 0) {
        const validContacts = await db.contact.findMany({
          where: withTenantFilter(
            { id: { in: contactIds }, isPartner: true },
            organizationId
          ),
          select: { id: true },
        });

        const validContactIds = new Set(validContacts.map((c) => c.id));
        const invalidContacts = contactIds.filter((id) => !validContactIds.has(id));

        if (invalidContacts.length > 0) {
          throw new HTTPException(400, {
            message: `Some contacts are not partners or don't exist: ${invalidContacts.join(", ")}`,
          });
        }
      }

      await db.$transaction(async (tx) => {
        for (const assignment of assignments) {
          let contract = await tx.partnerContract.findUnique({
            where: { contactId: assignment.contactId },
            select: { id: true },
          });

          if (!contract) {
            contract = await tx.partnerContract.create({
              data: {
                organizationId,
                contactId: assignment.contactId,
                paymentTerms: "DAYS_30",
                commissionPercent: 0,
              },
              select: { id: true },
            });
          }

          await tx.partnerContractExcursionPackage.upsert({
            where: {
              partnerContractId_excursionPackageId: {
                partnerContractId: contract.id,
                excursionPackageId: id,
              },
            },
            create: {
              partnerContractId: contract.id,
              excursionPackageId: id,
              overridePrice: assignment.overridePrice ?? null,
            },
            update: {
              overridePrice: assignment.overridePrice ?? null,
            },
          });
        }

        if (contactIds.length > 0) {
          const contractsToRemove = await tx.partnerContract.findMany({
            where: {
              organizationId,
              contactId: { notIn: contactIds },
            },
            select: { id: true },
          });

          if (contractsToRemove.length > 0) {
            await tx.partnerContractExcursionPackage.deleteMany({
              where: {
                excursionPackageId: id,
                partnerContractId: { in: contractsToRemove.map((c) => c.id) },
              },
            });
          }
        } else {
          await tx.partnerContractExcursionPackage.deleteMany({
            where: { excursionPackageId: id },
          });
        }
      });

      return c.json({
        success: true,
        packageId: id,
        assignedCount: assignments.length,
      });
    }
  );

// ============================================================================
// DISPO PACKAGES PARTNER ASSIGNMENTS
// ============================================================================

export const dispoAssignmentsRouter = new Hono()
  .basePath("/pricing/dispos/:id/partner-assignments")
  .use("*", organizationMiddleware)

  // GET: List partners assigned to a dispo package
  .get(
    "/",
    validator("param", idParamSchema),
    describeRoute({
      summary: "Get dispo package partner assignments",
      description: "List all partners assigned to a specific dispo package",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "List of partner assignments" },
        404: { description: "Dispo package not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");

      const pkg = await db.dispoPackage.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: {
          id: true,
          basePrice: true,
          partnerContractDispoPackages: {
            include: {
              partnerContract: {
                include: {
                  contact: {
                    select: {
                      id: true,
                      displayName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!pkg) {
        throw new HTTPException(404, { message: "Dispo package not found" });
      }

      const catalogPrice = decimalToNumber(pkg.basePrice) ?? 0;

      const assignments = pkg.partnerContractDispoPackages.map((pcd) => {
        const overridePrice = decimalToNumber(pcd.overridePrice);
        return {
          id: pcd.id,
          contactId: pcd.partnerContract.contact.id,
          contactName: pcd.partnerContract.contact.displayName,
          contactEmail: pcd.partnerContract.contact.email,
          contactPhone: pcd.partnerContract.contact.phone,
          overridePrice,
          catalogPrice,
          effectivePrice: overridePrice ?? catalogPrice,
          assignedAt: pcd.partnerContract.createdAt,
        };
      });

      return c.json({
        packageId: pkg.id,
        catalogPrice,
        totalPartners: assignments.length,
        assignments,
      });
    }
  )

  // POST: Bulk assign partners to dispo package
  .post(
    "/",
    validator("param", idParamSchema),
    validator("json", bulkAssignmentSchema),
    describeRoute({
      summary: "Assign partners to dispo package",
      description: "Bulk assign or update partner assignments for a dispo package",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "Assignments updated successfully" },
        400: { description: "Invalid request data" },
        404: { description: "Dispo package not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { id } = c.req.valid("param");
      const { assignments } = c.req.valid("json");

      const pkg = await db.dispoPackage.findFirst({
        where: withTenantFilter({ id }, organizationId),
        select: { id: true },
      });

      if (!pkg) {
        throw new HTTPException(404, { message: "Dispo package not found" });
      }

      const contactIds = assignments.map((a) => a.contactId);
      if (contactIds.length > 0) {
        const validContacts = await db.contact.findMany({
          where: withTenantFilter(
            { id: { in: contactIds }, isPartner: true },
            organizationId
          ),
          select: { id: true },
        });

        const validContactIds = new Set(validContacts.map((c) => c.id));
        const invalidContacts = contactIds.filter((id) => !validContactIds.has(id));

        if (invalidContacts.length > 0) {
          throw new HTTPException(400, {
            message: `Some contacts are not partners or don't exist: ${invalidContacts.join(", ")}`,
          });
        }
      }

      await db.$transaction(async (tx) => {
        for (const assignment of assignments) {
          let contract = await tx.partnerContract.findUnique({
            where: { contactId: assignment.contactId },
            select: { id: true },
          });

          if (!contract) {
            contract = await tx.partnerContract.create({
              data: {
                organizationId,
                contactId: assignment.contactId,
                paymentTerms: "DAYS_30",
                commissionPercent: 0,
              },
              select: { id: true },
            });
          }

          await tx.partnerContractDispoPackage.upsert({
            where: {
              partnerContractId_dispoPackageId: {
                partnerContractId: contract.id,
                dispoPackageId: id,
              },
            },
            create: {
              partnerContractId: contract.id,
              dispoPackageId: id,
              overridePrice: assignment.overridePrice ?? null,
            },
            update: {
              overridePrice: assignment.overridePrice ?? null,
            },
          });
        }

        if (contactIds.length > 0) {
          const contractsToRemove = await tx.partnerContract.findMany({
            where: {
              organizationId,
              contactId: { notIn: contactIds },
            },
            select: { id: true },
          });

          if (contractsToRemove.length > 0) {
            await tx.partnerContractDispoPackage.deleteMany({
              where: {
                dispoPackageId: id,
                partnerContractId: { in: contractsToRemove.map((c) => c.id) },
              },
            });
          }
        } else {
          await tx.partnerContractDispoPackage.deleteMany({
            where: { dispoPackageId: id },
          });
        }
      });

      return c.json({
        success: true,
        packageId: id,
        assignedCount: assignments.length,
      });
    }
  );

// ============================================================================
// HELPER: Get all partners for assignment dialog
// ============================================================================

export const partnersListRouter = new Hono()
  .basePath("/partners")
  .use("*", organizationMiddleware)

  .get(
    "/",
    describeRoute({
      summary: "List all partners",
      description: "Get all partner contacts for assignment dialogs",
      tags: ["VTC - Partner Assignments"],
      responses: {
        200: { description: "List of partners" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");

      const partners = await db.contact.findMany({
        where: withTenantFilter({ isPartner: true }, organizationId),
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          partnerContract: {
            select: {
              id: true,
              commissionPercent: true,
            },
          },
        },
        orderBy: { displayName: "asc" },
      });

      return c.json({
        partners: partners.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          email: p.email,
          phone: p.phone,
          hasContract: !!p.partnerContract,
          commissionPercent: p.partnerContract
            ? decimalToNumber(p.partnerContract.commissionPercent)
            : null,
        })),
        total: partners.length,
      });
    }
  );
