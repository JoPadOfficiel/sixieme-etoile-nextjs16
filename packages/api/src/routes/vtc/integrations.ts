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
  type IntegrationKeyType,
} from "../../lib/integration-keys";
import { organizationMiddleware } from "../../middleware/organization";

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

      // Validate that at least one key is provided
      if (data.googleMapsApiKey === undefined && data.collectApiKey === undefined) {
        throw new HTTPException(400, {
          message: "At least one API key must be provided",
        });
      }

      const result = await updateIntegrationSettings(organizationId, {
        googleMapsApiKey: data.googleMapsApiKey,
        collectApiKey: data.collectApiKey,
      });

      return c.json({
        success: true,
        updatedAt: result.updatedAt.toISOString(),
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
  );
