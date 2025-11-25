/**
 * Vitest Test Setup
 *
 * This file is loaded before each test file.
 * It can be used to set up global test utilities, mocks, or environment variables.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local from monorepo root for DATABASE_URL and other env vars
config({ path: resolve(__dirname, "../../../.env.local") });

// Also try .env if .env.local doesn't exist
config({ path: resolve(__dirname, "../../../.env") });
