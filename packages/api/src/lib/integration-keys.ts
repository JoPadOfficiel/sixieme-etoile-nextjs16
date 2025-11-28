/**
 * Integration Keys Utilities
 *
 * Provides utilities for resolving and masking API keys for external integrations.
 * Implements org-specific key resolution with environment variable fallback.
 *
 * @see docs/bmad/tech-spec.md - API Key Configuration
 * @see docs/bmad/prd.md#FR37-FR41
 */

import { db } from "@repo/database";

/**
 * Environment variable names for fallback keys
 */
export const GOOGLE_MAPS_ENV_KEY = "GOOGLE_MAPS_API_KEY";
export const COLLECT_API_ENV_KEY = "COLLECT_API_KEY";

/**
 * Key types supported by the integration settings
 */
export type IntegrationKeyType = "googleMaps" | "collectApi";

/**
 * Mapping from key type to database field name
 */
const KEY_TYPE_TO_FIELD: Record<IntegrationKeyType, "googleMapsApiKey" | "collectApiKey"> = {
  googleMaps: "googleMapsApiKey",
  collectApi: "collectApiKey",
};

/**
 * Mapping from key type to environment variable name
 */
const KEY_TYPE_TO_ENV: Record<IntegrationKeyType, string> = {
  googleMaps: GOOGLE_MAPS_ENV_KEY,
  collectApi: COLLECT_API_ENV_KEY,
};

/**
 * Resolve an API key for a given organization.
 *
 * Resolution order:
 * 1. Organization-specific key from database
 * 2. Environment variable fallback
 * 3. null if neither is configured
 *
 * @param organizationId - The organization ID to resolve the key for
 * @param keyType - The type of key to resolve ('googleMaps' or 'collectApi')
 * @returns The resolved API key or null if not configured
 *
 * @example
 * const googleMapsKey = await resolveApiKey(orgId, 'googleMaps');
 * if (!googleMapsKey) {
 *   throw new Error('Google Maps API key not configured');
 * }
 */
export async function resolveApiKey(
  organizationId: string,
  keyType: IntegrationKeyType
): Promise<string | null> {
  // Try to get org-specific key from database
  const settings = await db.organizationIntegrationSettings.findUnique({
    where: { organizationId },
    select: { [KEY_TYPE_TO_FIELD[keyType]]: true },
  });

  const dbKey = settings?.[KEY_TYPE_TO_FIELD[keyType]];
  if (dbKey) {
    return dbKey;
  }

  // Fallback to environment variable
  const envKey = process.env[KEY_TYPE_TO_ENV[keyType]];
  return envKey || null;
}

/**
 * Resolve an API key synchronously from environment only.
 * Use this when you don't have access to the database or for fallback scenarios.
 *
 * @param keyType - The type of key to resolve
 * @returns The environment variable value or null
 */
export function resolveApiKeyFromEnv(keyType: IntegrationKeyType): string | null {
  return process.env[KEY_TYPE_TO_ENV[keyType]] || null;
}

/**
 * Check if an API key is configured for an organization.
 *
 * @param organizationId - The organization ID to check
 * @param keyType - The type of key to check
 * @returns True if the key is configured (either in DB or env)
 */
export async function hasApiKey(
  organizationId: string,
  keyType: IntegrationKeyType
): Promise<boolean> {
  const key = await resolveApiKey(organizationId, keyType);
  return key !== null && key.length > 0;
}

/**
 * Mask an API key for safe display.
 * Shows only the last 4 characters, with the rest replaced by asterisks.
 *
 * @param key - The API key to mask (or null/undefined)
 * @returns The masked key (e.g., "****...XXXX") or null if no key
 *
 * @example
 * maskApiKey("AIzaSyB1234567890abcdefg") // "****...defg"
 * maskApiKey(null) // null
 * maskApiKey("abc") // "****...abc" (short keys still masked)
 */
export function maskApiKey(key: string | null | undefined): string | null {
  if (!key) {
    return null;
  }

  // For very short keys (less than 4 chars), just show asterisks
  if (key.length <= 4) {
    return "****";
  }

  // Show last 4 characters
  const lastFour = key.slice(-4);
  return `****...${lastFour}`;
}

/**
 * Get integration settings for an organization with masked keys.
 *
 * @param organizationId - The organization ID
 * @returns Settings object with masked keys and metadata
 */
export async function getIntegrationSettingsMasked(organizationId: string): Promise<{
  googleMapsApiKey: string | null;
  collectApiKey: string | null;
  hasGoogleMapsKey: boolean;
  hasCollectApiKey: boolean;
  preferredFuelType: string | null;
  googleMapsStatus: string | null;
  googleMapsTestedAt: Date | null;
  collectApiStatus: string | null;
  collectApiTestedAt: Date | null;
  updatedAt: Date | null;
}> {
  const settings = await db.organizationIntegrationSettings.findUnique({
    where: { organizationId },
  });

  // Check for env fallbacks
  const envGoogleMaps = resolveApiKeyFromEnv("googleMaps");
  const envCollectApi = resolveApiKeyFromEnv("collectApi");

  const googleMapsKey = settings?.googleMapsApiKey || envGoogleMaps;
  const collectApiKey = settings?.collectApiKey || envCollectApi;

  return {
    googleMapsApiKey: maskApiKey(googleMapsKey),
    collectApiKey: maskApiKey(collectApiKey),
    hasGoogleMapsKey: !!googleMapsKey,
    hasCollectApiKey: !!collectApiKey,
    preferredFuelType: settings?.preferredFuelType || "DIESEL",
    googleMapsStatus: settings?.googleMapsStatus || null,
    googleMapsTestedAt: settings?.googleMapsTestedAt || null,
    collectApiStatus: settings?.collectApiStatus || null,
    collectApiTestedAt: settings?.collectApiTestedAt || null,
    updatedAt: settings?.updatedAt || null,
  };
}

/**
 * Update integration settings for an organization.
 * Creates the settings record if it doesn't exist.
 *
 * @param organizationId - The organization ID
 * @param updates - The keys to update (only provided keys are updated)
 * @returns The updated settings record
 */
export async function updateIntegrationSettings(
  organizationId: string,
  updates: {
    googleMapsApiKey?: string | null;
    collectApiKey?: string | null;
    preferredFuelType?: string;
  }
): Promise<{ updatedAt: Date }> {
  const result = await db.organizationIntegrationSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      googleMapsApiKey: updates.googleMapsApiKey ?? null,
      collectApiKey: updates.collectApiKey ?? null,
      preferredFuelType: updates.preferredFuelType ?? "DIESEL",
    },
    update: {
      ...(updates.googleMapsApiKey !== undefined && {
        googleMapsApiKey: updates.googleMapsApiKey,
      }),
      ...(updates.collectApiKey !== undefined && {
        collectApiKey: updates.collectApiKey,
      }),
      ...(updates.preferredFuelType !== undefined && {
        preferredFuelType: updates.preferredFuelType,
      }),
    },
    select: { updatedAt: true },
  });

  return result;
}

/**
 * Delete a specific API key from integration settings.
 *
 * @param organizationId - The organization ID
 * @param keyType - The type of key to delete
 * @returns True if the key was deleted, false if no settings exist
 */
export async function deleteApiKey(
  organizationId: string,
  keyType: IntegrationKeyType
): Promise<boolean> {
  const settings = await db.organizationIntegrationSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return false;
  }

  await db.organizationIntegrationSettings.update({
    where: { organizationId },
    data: {
      [KEY_TYPE_TO_FIELD[keyType]]: null,
    },
  });

  return true;
}
