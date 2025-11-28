/**
 * Story 6.8: Manual Editing of Cost Components in Trip Transparency
 * 
 * API endpoint for updating cost components on quotes.
 * Allows authorized users to manually override calculated costs.
 */

import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// Cost component names
const costComponentSchema = z.enum(['fuel', 'tolls', 'wear', 'driver', 'parking']);

// Update cost request schema
const updateCostSchema = z.object({
  componentName: costComponentSchema.describe("Cost component to update"),
  value: z.number().nonnegative().describe("New cost value in EUR"),
  reason: z.string().optional().describe("Optional reason for the override"),
});

// Reset costs request schema
const resetCostsSchema = z.object({
  componentNames: z.array(costComponentSchema).optional().describe("Specific components to reset, or all if empty"),
});

// Types for trip analysis
interface CostBreakdown {
  fuel: { amount: number; distanceKm: number; consumptionL100km: number; pricePerLiter: number };
  tolls: { amount: number; distanceKm: number; ratePerKm: number };
  wear: { amount: number; distanceKm: number; ratePerKm: number };
  driver: { amount: number; durationMinutes: number; hourlyRate: number };
  parking: { amount: number; description: string };
  total: number;
}

interface CostOverride {
  componentName: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking';
  originalValue: number;
  editedValue: number;
  editedBy: string;
  editedAt: string;
  reason?: string;
}

interface CostOverrides {
  overrides: CostOverride[];
  hasManualEdits: boolean;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
}

interface EffectiveCosts {
  fuel: number;
  tolls: number;
  wear: number;
  driver: number;
  parking: number;
  total: number;
}

interface TripAnalysis {
  costBreakdown: CostBreakdown;
  costOverrides?: CostOverrides;
  effectiveCosts?: EffectiveCosts;
  [key: string]: unknown;
}

/**
 * Calculate effective costs from breakdown and overrides
 */
function calculateEffectiveCosts(
  costBreakdown: CostBreakdown,
  overrides: CostOverride[]
): EffectiveCosts {
  const effectiveCosts: EffectiveCosts = {
    fuel: costBreakdown.fuel.amount,
    tolls: costBreakdown.tolls.amount,
    wear: costBreakdown.wear.amount,
    driver: costBreakdown.driver.amount,
    parking: costBreakdown.parking.amount,
    total: 0,
  };

  // Apply overrides
  for (const override of overrides) {
    effectiveCosts[override.componentName] = override.editedValue;
  }

  // Calculate total
  effectiveCosts.total = 
    effectiveCosts.fuel + 
    effectiveCosts.tolls + 
    effectiveCosts.wear + 
    effectiveCosts.driver + 
    effectiveCosts.parking;

  return effectiveCosts;
}

/**
 * Calculate margin and profitability from price and costs
 */
function calculateMargin(price: number, totalCost: number) {
  const margin = price - totalCost;
  const marginPercent = price > 0 ? (margin / price) * 100 : 0;
  const profitabilityIndicator = 
    marginPercent >= 20 ? 'green' as const : 
    marginPercent >= 0 ? 'orange' as const : 
    'red' as const;
  
  return { margin, marginPercent, profitabilityIndicator };
}

export const quoteCostsRouter = new Hono()
  .basePath("/quotes/:quoteId/costs")
  .use("*", organizationMiddleware)

  // Get current cost overrides
  .get(
    "/",
    describeRoute({
      summary: "Get quote cost overrides",
      description: "Get the current cost overrides for a quote",
      tags: ["VTC - Quote Costs"],
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const quoteId = c.req.param("quoteId");

      const quote = await db.quote.findFirst({
        where: withTenantId(quoteId, organizationId),
        select: {
          id: true,
          status: true,
          tripAnalysis: true,
          finalPrice: true,
          internalCost: true,
          marginPercent: true,
        },
      });

      if (!quote) {
        throw new HTTPException(404, { message: "Quote not found" });
      }

      const tripAnalysis = quote.tripAnalysis as TripAnalysis | null;
      
      return c.json({
        quoteId: quote.id,
        status: quote.status,
        costOverrides: tripAnalysis?.costOverrides || null,
        effectiveCosts: tripAnalysis?.effectiveCosts || null,
        internalCost: quote.internalCost,
        marginPercent: quote.marginPercent,
      });
    }
  )

  // Update a cost component
  .patch(
    "/",
    validator("json", updateCostSchema),
    describeRoute({
      summary: "Update quote cost component",
      description: "Manually override a cost component on a DRAFT quote. Requires admin/owner role.",
      tags: ["VTC - Quote Costs"],
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const quoteId = c.req.param("quoteId");
      const { componentName, value, reason } = c.req.valid("json");

      // Get session for user ID
      const session = c.get("session");
      const userId = typeof session === "object" && session?.userId 
        ? session.userId 
        : null;

      if (!userId) {
        throw new HTTPException(401, { message: "Authentication required" });
      }

      // Check user role - must be admin or owner
      const member = await db.member.findFirst({
        where: {
          userId,
          organizationId,
        },
        select: { role: true },
      });

      if (!member || !['admin', 'owner'].includes(member.role)) {
        throw new HTTPException(403, { 
          message: "Only organization admins or owners can edit cost components" 
        });
      }

      // Get the quote
      const quote = await db.quote.findFirst({
        where: withTenantId(quoteId, organizationId),
        select: {
          id: true,
          status: true,
          tripAnalysis: true,
          finalPrice: true,
          internalCost: true,
        },
      });

      if (!quote) {
        throw new HTTPException(404, { message: "Quote not found" });
      }

      // Only DRAFT quotes can be edited
      if (quote.status !== "DRAFT") {
        throw new HTTPException(400, { 
          message: "Cost components can only be edited on DRAFT quotes" 
        });
      }

      const tripAnalysis = quote.tripAnalysis as TripAnalysis | null;
      
      if (!tripAnalysis?.costBreakdown) {
        throw new HTTPException(400, { 
          message: "Quote has no trip analysis with cost breakdown" 
        });
      }

      // Get original value
      const originalValue = tripAnalysis.costBreakdown[componentName].amount;

      // Get existing overrides or create new
      const existingOverrides = tripAnalysis.costOverrides?.overrides || [];
      
      // Remove any existing override for this component
      const filteredOverrides = existingOverrides.filter(
        o => o.componentName !== componentName
      );

      // Add new override (only if different from original)
      const now = new Date().toISOString();
      const newOverrides: CostOverride[] = [...filteredOverrides];
      
      if (value !== originalValue) {
        newOverrides.push({
          componentName,
          originalValue,
          editedValue: value,
          editedBy: userId,
          editedAt: now,
          reason,
        });
      }

      // Calculate effective costs
      const effectiveCosts = calculateEffectiveCosts(
        tripAnalysis.costBreakdown,
        newOverrides
      );

      // Calculate new margin
      const finalPrice = Number(quote.finalPrice);
      const { margin, marginPercent, profitabilityIndicator } = calculateMargin(
        finalPrice,
        effectiveCosts.total
      );

      // Update trip analysis with overrides
      const updatedTripAnalysis: TripAnalysis = {
        ...tripAnalysis,
        costOverrides: {
          overrides: newOverrides,
          hasManualEdits: newOverrides.length > 0,
          lastEditedAt: newOverrides.length > 0 ? now : null,
          lastEditedBy: newOverrides.length > 0 ? userId : null,
        },
        effectiveCosts,
      };

      // Update quote
      const updatedQuote = await db.quote.update({
        where: { id: quoteId },
        data: {
          tripAnalysis: updatedTripAnalysis as unknown as Prisma.InputJsonValue,
          internalCost: effectiveCosts.total,
          marginPercent,
        },
        include: {
          contact: true,
          vehicleCategory: true,
        },
      });

      return c.json({
        success: true,
        quoteId: updatedQuote.id,
        updatedCosts: effectiveCosts,
        margin,
        marginPercent,
        profitabilityIndicator,
        costOverrides: updatedTripAnalysis.costOverrides,
      });
    }
  )

  // Reset cost overrides
  .delete(
    "/",
    validator("json", resetCostsSchema.optional()),
    describeRoute({
      summary: "Reset quote cost overrides",
      description: "Reset cost overrides to original calculated values",
      tags: ["VTC - Quote Costs"],
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const quoteId = c.req.param("quoteId");
      const body = c.req.valid("json");
      const componentNames = body?.componentNames;

      // Get session for user ID
      const session = c.get("session");
      const userId = typeof session === "object" && session?.userId 
        ? session.userId 
        : null;

      if (!userId) {
        throw new HTTPException(401, { message: "Authentication required" });
      }

      // Check user role
      const member = await db.member.findFirst({
        where: {
          userId,
          organizationId,
        },
        select: { role: true },
      });

      if (!member || !['admin', 'owner'].includes(member.role)) {
        throw new HTTPException(403, { 
          message: "Only organization admins or owners can reset cost overrides" 
        });
      }

      // Get the quote
      const quote = await db.quote.findFirst({
        where: withTenantId(quoteId, organizationId),
        select: {
          id: true,
          status: true,
          tripAnalysis: true,
          finalPrice: true,
        },
      });

      if (!quote) {
        throw new HTTPException(404, { message: "Quote not found" });
      }

      if (quote.status !== "DRAFT") {
        throw new HTTPException(400, { 
          message: "Cost overrides can only be reset on DRAFT quotes" 
        });
      }

      const tripAnalysis = quote.tripAnalysis as TripAnalysis | null;
      
      if (!tripAnalysis?.costBreakdown) {
        throw new HTTPException(400, { 
          message: "Quote has no trip analysis" 
        });
      }

      // Filter overrides based on componentNames (or remove all)
      let newOverrides: CostOverride[] = [];
      if (componentNames && componentNames.length > 0) {
        newOverrides = (tripAnalysis.costOverrides?.overrides || []).filter(
          o => !componentNames.includes(o.componentName)
        );
      }

      // Recalculate effective costs
      const effectiveCosts = calculateEffectiveCosts(
        tripAnalysis.costBreakdown,
        newOverrides
      );

      // Calculate new margin
      const finalPrice = Number(quote.finalPrice);
      const { margin, marginPercent, profitabilityIndicator } = calculateMargin(
        finalPrice,
        effectiveCosts.total
      );

      // Update trip analysis
      const updatedTripAnalysis: TripAnalysis = {
        ...tripAnalysis,
        costOverrides: {
          overrides: newOverrides,
          hasManualEdits: newOverrides.length > 0,
          lastEditedAt: newOverrides.length > 0 
            ? tripAnalysis.costOverrides?.lastEditedAt || null 
            : null,
          lastEditedBy: newOverrides.length > 0 
            ? tripAnalysis.costOverrides?.lastEditedBy || null 
            : null,
        },
        effectiveCosts,
      };

      // Update quote
      await db.quote.update({
        where: { id: quoteId },
        data: {
          tripAnalysis: updatedTripAnalysis as unknown as Prisma.InputJsonValue,
          internalCost: effectiveCosts.total,
          marginPercent,
        },
      });

      return c.json({
        success: true,
        quoteId: quote.id,
        updatedCosts: effectiveCosts,
        margin,
        marginPercent,
        profitabilityIndicator,
        costOverrides: updatedTripAnalysis.costOverrides,
      });
    }
  );
