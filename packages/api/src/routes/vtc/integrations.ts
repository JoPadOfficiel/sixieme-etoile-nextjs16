/**
 * Integration Settings API Routes
 *
 * Provides endpoints for managing organization integration settings
 * (Google Maps API key, CollectAPI key).
 *
 * Access is restricted to admin/owner roles only.
 *
 * @see docs/bmad/tech-spec.md - API Key Configuration
 * @see docs/bmad/prd.md#FR37-FR41
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  getIntegrationSettingsMasked,
  updateIntegrationSettings,
  deleteApiKey,
  resolveApiKey,
  type IntegrationKeyType,
} from "../../lib/integration-keys";
import { testCollectAPIConnection } from "../../lib/collectapi-client";
import { testGoogleMapsConnection } from "../../lib/google-maps-client";
import { organizationMiddleware } from "../../middleware/organization";
import { refreshFuelPriceCache, getFuelCacheStatus } from "../../jobs/refresh-fuel-cache";

/**
 * Allowed roles for integration settings management
 */
const ADMIN_ROLES = ["admin", "owner"];

/**
 * Middleware to check if user has admin/owner role
 */
const requireAdminRole = async (c: any, next: () => Promise<void>) => {
  const organizationId = c.get("organizationId");
  const user = c.get("user");

  // Get user's membership to check role
  const membership = await db.member.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organizationId,
      },
    },
    select: { role: true },
  });

  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    throw new HTTPException(403, {
      message: "Access denied. Admin or owner role required.",
    });
  }

  await next();
};

// Validation schemas
const updateIntegrationSettingsSchema = z.object({
  googleMapsApiKey: z.string().min(1).max(500).optional().nullable(),
  collectApiKey: z.string().min(1).max(500).optional().nullable(),
  preferredFuelType: z.enum(["DIESEL", "GASOLINE", "LPG"]).optional(),
});

const keyTypeParamSchema = z.object({
  keyType: z.enum(["googleMaps", "collectApi"]),
});

export const integrationsRouter = new Hono()
  .basePath("/settings/integrations")
  // Apply organization middleware to all routes
  .use("*", organizationMiddleware)
  // Apply admin role check to all routes
  .use("*", requireAdminRole)

  // Get integration settings (masked)
  .get(
    "/",
    describeRoute({
      summary: "Get integration settings",
      description:
        "Get current integration settings with masked API keys. Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Integration settings with masked keys",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");

      const settings = await getIntegrationSettingsMasked(organizationId);

      return c.json({
        data: settings,
      });
    }
  )

  // Update integration settings
  .put(
    "/",
    validator("json", updateIntegrationSettingsSchema),
    describeRoute({
      summary: "Update integration settings",
      description:
        "Create or update integration settings. Only provided keys are updated. Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Settings updated successfully",
        },
        400: {
          description: "Invalid request body",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const data = c.req.valid("json");

      // Validate that at least one field is provided
      if (data.googleMapsApiKey === undefined && data.collectApiKey === undefined && data.preferredFuelType === undefined) {
        throw new HTTPException(400, {
          message: "At least one field must be provided",
        });
      }

      const result = await updateIntegrationSettings(organizationId, {
        googleMapsApiKey: data.googleMapsApiKey,
        collectApiKey: data.collectApiKey,
        preferredFuelType: data.preferredFuelType,
      });

      return c.json({
        success: true,
        updatedAt: result.updatedAt.toISOString(),
      });
    }
  )

  // Get Google Maps API key (unmasked, for client-side use)
  // This endpoint is accessible to all authenticated org members
  .get(
    "/google-maps-key",
    describeRoute({
      summary: "Get Google Maps API key",
      description:
        "Get the Google Maps API key for client-side map rendering. Returns the actual key (not masked).",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Google Maps API key",
        },
        404: {
          description: "No Google Maps API key configured",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");

      const key = await resolveApiKey(organizationId, "googleMaps");

      if (!key) {
        throw new HTTPException(404, {
          message: "Google Maps API key not configured",
        });
      }

      return c.json({
        key,
      });
    }
  )

  // Test connection for a specific API key
  .post(
    "/test/:keyType",
    validator("param", keyTypeParamSchema),
    describeRoute({
      summary: "Test API connection",
      description:
        "Test the connectivity of a specific API key (Google Maps or CollectAPI). Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Test result with connection status",
        },
        404: {
          description: "No API key configured for this integration",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { keyType } = c.req.valid("param");

      // Get the API key
      const apiKey = await resolveApiKey(organizationId, keyType as IntegrationKeyType);

      if (!apiKey) {
        throw new HTTPException(404, {
          message: `No ${keyType === "googleMaps" ? "Google Maps" : "CollectAPI"} key configured`,
        });
      }

      // Test the connection
      let testResult;
      if (keyType === "googleMaps") {
        testResult = await testGoogleMapsConnection(apiKey);
      } else {
        testResult = await testCollectAPIConnection(apiKey);
      }

      // Update the status in database
      // Use explicit field names to avoid Prisma dynamic field issues
      const now = new Date();
      
      if (keyType === "googleMaps") {
        await db.organizationIntegrationSettings.update({
          where: { organizationId },
          data: {
            googleMapsStatus: testResult.status,
            googleMapsTestedAt: now,
          },
        });
      } else {
        await db.organizationIntegrationSettings.update({
          where: { organizationId },
          data: {
            collectApiStatus: testResult.status,
            collectApiTestedAt: now,
          },
        });
      }

      return c.json({
        success: testResult.success,
        status: testResult.status,
        latencyMs: testResult.latencyMs,
        message: testResult.message,
        details: testResult.details,
        error: testResult.error,
      });
    }
  )

  // Delete a specific API key
  .delete(
    "/:keyType",
    validator("param", keyTypeParamSchema),
    describeRoute({
      summary: "Delete API key",
      description:
        "Remove a specific API key from integration settings. Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Key deleted successfully",
        },
        404: {
          description: "No settings found for this organization",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");
      const { keyType } = c.req.valid("param");

      const deleted = await deleteApiKey(organizationId, keyType as IntegrationKeyType);

      if (!deleted) {
        throw new HTTPException(404, {
          message: "No integration settings found for this organization",
        });
      }

      return c.json({
        success: true,
        deletedKey: keyType,
      });
    }
  )

  // Refresh fuel price cache
  .post(
    "/fuel-cache/refresh",
    describeRoute({
      summary: "Refresh fuel price cache",
      description:
        "Manually trigger a refresh of the fuel price cache from CollectAPI. Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Refresh completed (may include partial failures)",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
        500: {
          description: "Refresh failed completely",
        },
      },
    }),
    async (c) => {
      const organizationId = c.get("organizationId");

      const result = await refreshFuelPriceCache({ organizationId });

      return c.json({
        success: result.success,
        updatedCount: result.updatedCount,
        failedCount: result.failedCount,
        totalTypes: result.totalTypes,
        results: result.results,
        errors: result.errors,
        timestamp: result.timestamp.toISOString(),
        durationMs: result.durationMs,
      });
    }
  )

  // Get fuel cache status
  .get(
    "/fuel-cache/status",
    describeRoute({
      summary: "Get fuel cache status",
      description:
        "Get the current status of the fuel price cache including staleness info. Only admin/owner roles can access.",
      tags: ["VTC - Settings"],
      responses: {
        200: {
          description: "Cache status with entries and staleness info",
        },
        403: {
          description: "Access denied - admin/owner role required",
        },
      },
    }),
    async (c) => {
      const status = await getFuelCacheStatus();

      return c.json({
        entries: status.entries.map((e) => ({
          fuelType: e.fuelType,
          pricePerLitre: e.pricePerLitre,
          fetchedAt: e.fetchedAt.toISOString(),
          isStale: e.isStale,
        })),
        lastRefresh: status.lastRefresh?.toISOString() || null,
        stalenessThresholdHours: status.stalenessThresholdHours,
      });
    }
  );
