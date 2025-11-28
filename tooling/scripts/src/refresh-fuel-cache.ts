#!/usr/bin/env tsx
/**
 * Fuel Price Cache Refresh Script
 *
 * CLI script to refresh the fuel price cache from CollectAPI.
 * Designed to be run via cron job (e.g., daily at 04:00 Europe/Paris).
 *
 * Story 9.7: Fuel Price Cache Refresh & Staleness Rules
 *
 * Usage:
 *   pnpm --filter @repo/scripts refresh-fuel-cache
 *   # or directly:
 *   npx tsx tooling/scripts/src/refresh-fuel-cache.ts
 *
 * Environment Variables:
 *   COLLECTAPI_KEY or COLLECT_API_KEY - API key for CollectAPI
 *   DATABASE_URL - PostgreSQL connection string
 *
 * Cron Configuration (Europe/Paris timezone):
 *   0 4 * * * cd /path/to/project && pnpm --filter @repo/scripts refresh-fuel-cache
 *
 * @see packages/api/src/jobs/refresh-fuel-cache.ts - Main job implementation
 */

// Import from relative path since this script runs standalone
import { refreshFuelPriceCache, getFuelCacheStatus } from "../../../packages/api/src/jobs/refresh-fuel-cache";

async function main() {
	console.log("=".repeat(60));
	console.log("Fuel Price Cache Refresh Script");
	console.log("=".repeat(60));
	console.log(`Started at: ${new Date().toISOString()}`);
	console.log("");

	// Check for API key (support multiple naming conventions)
	const apiKey = process.env.COLLECTAPI_KEY || process.env.COLLECT_API_KEY || process.env.COLLECTAPI_API_KEY;
	if (!apiKey) {
		console.error("ERROR: No CollectAPI key found in environment");
		console.error("Set COLLECTAPI_KEY or COLLECT_API_KEY environment variable");
		process.exit(1);
	}

	console.log("API key found in environment");
	console.log("");

	try {
		// Run the refresh job
		console.log("Starting fuel price cache refresh...");
		console.log("");

		const result = await refreshFuelPriceCache({ apiKey });

		// Print results
		console.log("");
		console.log("-".repeat(40));
		console.log("RESULTS");
		console.log("-".repeat(40));
		console.log(`Success: ${result.success}`);
		console.log(`Updated: ${result.updatedCount}/${result.totalTypes}`);
		console.log(`Failed: ${result.failedCount}`);
		console.log(`Duration: ${result.durationMs}ms`);
		console.log("");

		// Print individual results
		console.log("Fuel Type Results:");
		for (const r of result.results) {
			if (r.success) {
				console.log(`  ✓ ${r.fuelType}: ${r.price} ${r.currency}`);
			} else {
				console.log(`  ✗ ${r.fuelType}: ${r.error}`);
			}
		}

		// Print errors if any
		if (result.errors.length > 0) {
			console.log("");
			console.log("Errors:");
			for (const error of result.errors) {
				console.log(`  - ${error}`);
			}
		}

		// Get and print cache status
		console.log("");
		console.log("-".repeat(40));
		console.log("CACHE STATUS");
		console.log("-".repeat(40));

		const status = await getFuelCacheStatus();
		console.log(`Last refresh: ${status.lastRefresh?.toISOString() || "Never"}`);
		console.log(`Staleness threshold: ${status.stalenessThresholdHours} hours`);
		console.log("");
		console.log("Current cache entries:");
		for (const entry of status.entries) {
			const staleIndicator = entry.isStale ? " [STALE]" : "";
			console.log(
				`  ${entry.fuelType}: ${entry.pricePerLitre} EUR (fetched: ${entry.fetchedAt.toISOString()})${staleIndicator}`,
			);
		}

		console.log("");
		console.log("=".repeat(60));
		console.log(`Completed at: ${new Date().toISOString()}`);
		console.log("=".repeat(60));

		// Exit with appropriate code
		process.exit(result.success ? 0 : 1);
	} catch (error) {
		console.error("");
		console.error("FATAL ERROR:");
		console.error(error instanceof Error ? error.message : String(error));
		console.error("");
		process.exit(1);
	}
}

// Run the script
main();
