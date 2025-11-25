/**
 * Integration Keys Utilities Tests
 *
 * Tests for API key resolution and masking functions.
 *
 * @see packages/api/src/lib/integration-keys.ts
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  GOOGLE_MAPS_ENV_KEY,
  COLLECT_API_ENV_KEY,
  maskApiKey,
  resolveApiKeyFromEnv,
} from "../integration-keys";

describe("Integration Keys Utilities", () => {
  describe("Constants", () => {
    it("should have correct Google Maps env key constant", () => {
      expect(GOOGLE_MAPS_ENV_KEY).toBe("GOOGLE_MAPS_API_KEY");
    });

    it("should have correct CollectAPI env key constant", () => {
      expect(COLLECT_API_ENV_KEY).toBe("COLLECT_API_KEY");
    });
  });

  describe("maskApiKey", () => {
    it("should mask a standard API key showing last 4 chars", () => {
      const result = maskApiKey("AIzaSyB1234567890abcdefghijklmnop");
      expect(result).toBe("****...mnop");
    });

    it("should mask a shorter key correctly", () => {
      const result = maskApiKey("12345678");
      expect(result).toBe("****...5678");
    });

    it("should return null for null input", () => {
      expect(maskApiKey(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(maskApiKey(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(maskApiKey("")).toBeNull();
    });

    it("should handle very short keys (4 chars or less)", () => {
      expect(maskApiKey("abc")).toBe("****");
      expect(maskApiKey("abcd")).toBe("****");
    });

    it("should handle exactly 5 character key", () => {
      expect(maskApiKey("abcde")).toBe("****...bcde");
    });

    it("should preserve last 4 characters exactly", () => {
      const key = "prefix_LAST";
      const result = maskApiKey(key);
      expect(result).toBe("****...LAST");
    });
  });

  describe("resolveApiKeyFromEnv", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset env before each test
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return Google Maps key from env when set", () => {
      process.env.GOOGLE_MAPS_API_KEY = "test-google-key";
      const result = resolveApiKeyFromEnv("googleMaps");
      expect(result).toBe("test-google-key");
    });

    it("should return CollectAPI key from env when set", () => {
      process.env.COLLECT_API_KEY = "test-collect-key";
      const result = resolveApiKeyFromEnv("collectApi");
      expect(result).toBe("test-collect-key");
    });

    it("should return null when Google Maps env key not set", () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      const result = resolveApiKeyFromEnv("googleMaps");
      expect(result).toBeNull();
    });

    it("should return null when CollectAPI env key not set", () => {
      delete process.env.COLLECT_API_KEY;
      const result = resolveApiKeyFromEnv("collectApi");
      expect(result).toBeNull();
    });

    it("should return null for empty env value", () => {
      process.env.GOOGLE_MAPS_API_KEY = "";
      const result = resolveApiKeyFromEnv("googleMaps");
      expect(result).toBeNull();
    });
  });

  describe("Key masking edge cases", () => {
    it("should handle keys with special characters", () => {
      const key = "AIza-Sy_B12.34!@#$%^&*()";
      const result = maskApiKey(key);
      expect(result).toBe("****...&*()");
    });

    it("should handle keys with unicode characters", () => {
      const key = "key-with-émojis-🔑🔐";
      const result = maskApiKey(key);
      // Last 4 chars might be emoji
      expect(result).toContain("****...");
    });

    it("should handle whitespace-only key", () => {
      const result = maskApiKey("    ");
      expect(result).toBe("****");
    });

    it("should handle key with leading/trailing whitespace", () => {
      const key = "  key12345  ";
      const result = maskApiKey(key);
      expect(result).toBe("****...45  ");
    });
  });
});

/**
 * Note: Tests for resolveApiKey, hasApiKey, getIntegrationSettingsMasked,
 * updateIntegrationSettings, and deleteApiKey require database mocking
 * and are covered in the integration tests (integrations.test.ts).
 */
