/**
 * Partner Contract API Routes
 *
 * Provides endpoints for managing partner contract data including
 * billing details, payment terms, commission, and grid assignments.
 *
 * Access is restricted to contacts with isPartner=true.
 *
 * @see docs/bmad/prd.md - FR2, FR4, FR11, FR36
 * @see docs/bmad/epics.md - Epic 2, Story 2.2
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";

// Validation schemas

// Story 12.1: Grid assignment with optional override price
const zoneRouteAssignmentSchema = z.object({
  zoneRouteId: z.string().min(1),
  overridePrice: z.number().positive().optional().nullable(), // null = use catalog price
});

const excursionAssignmentSchema = z.object({
  excursionPackageId: z.string().min(1),
  overridePrice: z.number().positive().optional().nullable(),
});

const dispoAssignmentSchema = z.object({
  dispoPackageId: z.string().min(1),
  overridePrice: z.number().positive().optional().nullable(),
});

const partnerContractSchema = z.object({
  billingAddress: z.string().max(500).optional().nullable(),
  paymentTerms: z.enum(["IMMEDIATE", "DAYS_15", "DAYS_30", "DAYS_45", "DAYS_60"]).default("DAYS_30"),
  commissionPercent: z.number().min(0).max(100).default(0),
  notes: z.string().max(2000).optional().nullable(),
  // Legacy: simple ID arrays (backward compatible, no override)
  zoneRouteIds: z.array(z.string()).default([]),
  excursionPackageIds: z.array(z.string()).default([]),
  dispoPackageIds: z.array(z.string()).default([]),
  // Story 12.1: New format with override prices
  zoneRouteAssignments: z.array(zoneRouteAssignmentSchema).optional(),
  excursionAssignments: z.array(excursionAssignmentSchema).optional(),
  dispoAssignments: z.array(dispoAssignmentSchema).optional(),
});

const contactIdParamSchema = z.object({
  contactId: z.string().min(1),
});

export const partnerContractsRouter = new Hono()
  .basePath("/contacts/:contactId/contract")
  // Apply organization middleware to all routes
  .use("*", organizationMiddleware)

  // Get partner contract for a contact
  .get(
    "/",
    validator("param", contactIdParamSchema),
    describeRoute({
      summary: "Get partner contract",
      description: "Get the partner contract for a specific contact. Returns 404 if no contract exists.",
      tags: ["VTC - CRM"],
      responses: {
        200: { description: "Partner contract data with grid assignments" },
        404: { description: "Contact not found or no contract exists" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { contactId } = c.req.valid("param");

      // Verify contact exists and belongs to organization
      const contact = await db.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { id: true, isPartner: true },
      });

      if (!contact) {
        throw new HTTPException(404, { message: "Contact not found" });
      }

      // Get contract with grid assignments
      // Story 12.1: Include overridePrice from junction tables
      const contract = await db.partnerContract.findUnique({
        where: { contactId },
        include: {
          zoneRoutes: {
            include: {
              zoneRoute: {
                include: {
                  fromZone: { select: { id: true, name: true, code: true } },
                  toZone: { select: { id: true, name: true, code: true } },
                  vehicleCategory: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          excursionPackages: {
            include: {
              excursionPackage: {
                select: { id: true, name: true, description: true, price: true },
              },
            },
          },
          dispoPackages: {
            include: {
              dispoPackage: {
                select: { id: true, name: true, description: true, basePrice: true },
              },
            },
          },
        },
      });

      if (!contract) {
        // Return empty contract structure for partners without contract yet
        return c.json({
          data: null,
          isPartner: contact.isPartner,
        });
      }

      // Story 12.1: Return catalog price, override price, and effective price
      return c.json({
        data: {
          id: contract.id,
          contactId: contract.contactId,
          billingAddress: contract.billingAddress,
          paymentTerms: contract.paymentTerms,
          commissionPercent: contract.commissionPercent.toString(),
          notes: contract.notes,
          zoneRoutes: contract.zoneRoutes.map((r) => {
            const catalogPrice = Number(r.zoneRoute.fixedPrice);
            const overridePrice = r.overridePrice ? Number(r.overridePrice) : null;
            const effectivePrice = overridePrice ?? catalogPrice;
            return {
              id: r.zoneRoute.id,
              fromZone: r.zoneRoute.fromZone,
              toZone: r.zoneRoute.toZone,
              vehicleCategory: r.zoneRoute.vehicleCategory,
              // Legacy field (backward compatible)
              fixedPrice: catalogPrice.toString(),
              // Story 12.1: New pricing fields
              catalogPrice,
              overridePrice,
              effectivePrice,
            };
          }),
          excursionPackages: contract.excursionPackages.map((p) => {
            const catalogPrice = Number(p.excursionPackage.price);
            const overridePrice = p.overridePrice ? Number(p.overridePrice) : null;
            const effectivePrice = overridePrice ?? catalogPrice;
            return {
              id: p.excursionPackage.id,
              name: p.excursionPackage.name,
              description: p.excursionPackage.description,
              // Legacy field (backward compatible)
              price: catalogPrice.toString(),
              // Story 12.1: New pricing fields
              catalogPrice,
              overridePrice,
              effectivePrice,
            };
          }),
          dispoPackages: contract.dispoPackages.map((p) => {
            const catalogPrice = Number(p.dispoPackage.basePrice);
            const overridePrice = p.overridePrice ? Number(p.overridePrice) : null;
            const effectivePrice = overridePrice ?? catalogPrice;
            return {
              id: p.dispoPackage.id,
              name: p.dispoPackage.name,
              description: p.dispoPackage.description,
              // Legacy field (backward compatible)
              basePrice: catalogPrice.toString(),
              // Story 12.1: New pricing fields
              catalogPrice,
              overridePrice,
              effectivePrice,
            };
          }),
          createdAt: contract.createdAt.toISOString(),
          updatedAt: contract.updatedAt.toISOString(),
        },
        isPartner: contact.isPartner,
      });
    }
  )

  // Create or update partner contract
  .put(
    "/",
    validator("param", contactIdParamSchema),
    validator("json", partnerContractSchema),
    describeRoute({
      summary: "Create or update partner contract",
      description: "Create or update the partner contract for a contact. Contact must have isPartner=true.",
      tags: ["VTC - CRM"],
      responses: {
        200: { description: "Contract created/updated successfully" },
        400: { description: "Contact is not a partner" },
        404: { description: "Contact not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { contactId } = c.req.valid("param");
      const data = c.req.valid("json");

      // Verify contact exists and is a partner
      const contact = await db.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { id: true, isPartner: true },
      });

      if (!contact) {
        throw new HTTPException(404, { message: "Contact not found" });
      }

      if (!contact.isPartner) {
        throw new HTTPException(400, {
          message: "Cannot create contract for non-partner contact. Set isPartner=true first.",
        });
      }

      // Validate that all grid IDs belong to the organization
      if (data.zoneRouteIds.length > 0) {
        const validRoutes = await db.zoneRoute.count({
          where: { id: { in: data.zoneRouteIds }, organizationId },
        });
        if (validRoutes !== data.zoneRouteIds.length) {
          throw new HTTPException(400, { message: "Some zone routes are invalid or belong to another organization" });
        }
      }

      if (data.excursionPackageIds.length > 0) {
        const validExcursions = await db.excursionPackage.count({
          where: { id: { in: data.excursionPackageIds }, organizationId },
        });
        if (validExcursions !== data.excursionPackageIds.length) {
          throw new HTTPException(400, { message: "Some excursion packages are invalid or belong to another organization" });
        }
      }

      if (data.dispoPackageIds.length > 0) {
        const validDispos = await db.dispoPackage.count({
          where: { id: { in: data.dispoPackageIds }, organizationId },
        });
        if (validDispos !== data.dispoPackageIds.length) {
          throw new HTTPException(400, { message: "Some dispo packages are invalid or belong to another organization" });
        }
      }

      // Upsert contract
      const contract = await db.partnerContract.upsert({
        where: { contactId },
        create: {
          organizationId,
          contactId,
          billingAddress: data.billingAddress,
          paymentTerms: data.paymentTerms,
          commissionPercent: data.commissionPercent,
          notes: data.notes,
        },
        update: {
          billingAddress: data.billingAddress,
          paymentTerms: data.paymentTerms,
          commissionPercent: data.commissionPercent,
          notes: data.notes,
        },
      });

      // Story 12.1: Determine which format is being used (new with overrides or legacy)
      const useNewZoneRouteFormat = data.zoneRouteAssignments && data.zoneRouteAssignments.length > 0;
      const useNewExcursionFormat = data.excursionAssignments && data.excursionAssignments.length > 0;
      const useNewDispoFormat = data.dispoAssignments && data.dispoAssignments.length > 0;

      // Sync grid assignments using transaction
      await db.$transaction(async (tx) => {
        // Delete existing assignments
        await tx.partnerContractZoneRoute.deleteMany({ where: { partnerContractId: contract.id } });
        await tx.partnerContractExcursionPackage.deleteMany({ where: { partnerContractId: contract.id } });
        await tx.partnerContractDispoPackage.deleteMany({ where: { partnerContractId: contract.id } });

        // Create new zone route assignments
        if (useNewZoneRouteFormat && data.zoneRouteAssignments) {
          // Story 12.1: New format with override prices
          await tx.partnerContractZoneRoute.createMany({
            data: data.zoneRouteAssignments.map((assignment) => ({
              partnerContractId: contract.id,
              zoneRouteId: assignment.zoneRouteId,
              overridePrice: assignment.overridePrice ?? null,
            })),
          });
        } else if (data.zoneRouteIds.length > 0) {
          // Legacy format: simple ID array, no override
          await tx.partnerContractZoneRoute.createMany({
            data: data.zoneRouteIds.map((zoneRouteId) => ({
              partnerContractId: contract.id,
              zoneRouteId,
              overridePrice: null,
            })),
          });
        }

        // Create new excursion assignments
        if (useNewExcursionFormat && data.excursionAssignments) {
          // Story 12.1: New format with override prices
          await tx.partnerContractExcursionPackage.createMany({
            data: data.excursionAssignments.map((assignment) => ({
              partnerContractId: contract.id,
              excursionPackageId: assignment.excursionPackageId,
              overridePrice: assignment.overridePrice ?? null,
            })),
          });
        } else if (data.excursionPackageIds.length > 0) {
          // Legacy format: simple ID array, no override
          await tx.partnerContractExcursionPackage.createMany({
            data: data.excursionPackageIds.map((excursionPackageId) => ({
              partnerContractId: contract.id,
              excursionPackageId,
              overridePrice: null,
            })),
          });
        }

        // Create new dispo assignments
        if (useNewDispoFormat && data.dispoAssignments) {
          // Story 12.1: New format with override prices
          await tx.partnerContractDispoPackage.createMany({
            data: data.dispoAssignments.map((assignment) => ({
              partnerContractId: contract.id,
              dispoPackageId: assignment.dispoPackageId,
              overridePrice: assignment.overridePrice ?? null,
            })),
          });
        } else if (data.dispoPackageIds.length > 0) {
          // Legacy format: simple ID array, no override
          await tx.partnerContractDispoPackage.createMany({
            data: data.dispoPackageIds.map((dispoPackageId) => ({
              partnerContractId: contract.id,
              dispoPackageId,
              overridePrice: null,
            })),
          });
        }
      });

      return c.json({
        success: true,
        contractId: contract.id,
        updatedAt: contract.updatedAt.toISOString(),
      });
    }
  )

  // Delete partner contract
  .delete(
    "/",
    validator("param", contactIdParamSchema),
    describeRoute({
      summary: "Delete partner contract",
      description: "Delete the partner contract for a contact. Grid assignments are also deleted.",
      tags: ["VTC - CRM"],
      responses: {
        200: { description: "Contract deleted successfully" },
        404: { description: "Contact or contract not found" },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { contactId } = c.req.valid("param");

      // Verify contact exists and belongs to organization
      const contact = await db.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { id: true },
      });

      if (!contact) {
        throw new HTTPException(404, { message: "Contact not found" });
      }

      // Delete contract (cascade will delete grid assignments)
      const deleted = await db.partnerContract.deleteMany({
        where: { contactId, organizationId },
      });

      if (deleted.count === 0) {
        throw new HTTPException(404, { message: "No contract found for this contact" });
      }

      return c.json({
        success: true,
        message: "Partner contract deleted",
      });
    }
  );
