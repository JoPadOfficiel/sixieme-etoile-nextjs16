import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.test.ts"],
		testTimeout: 10000,
		// Load .env.local from monorepo root for DATABASE_URL
		setupFiles: ["./src/test-setup.ts"],
	},
});
