/**
 * Postal Codes API Routes - Story 11.2
 *
 * Endpoints for validating postal codes and fetching their boundaries.
 */

import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";
import {
	getPostalCodeZoneGeometry,
	searchPostalCodes,
	validatePostalCodeFormat,
	validatePostalCodes,
} from "../../services/postal-code-service";

// Validation schemas
const validatePostalCodesSchema = z.object({
	postalCodes: z.array(z.string()).min(1).max(20),
	countryCode: z.string().length(2).default("FR"),
});

const getGeometrySchema = z.object({
	postalCodes: z.array(z.string()).min(1).max(20),
	countryCode: z.string().length(2).default("FR"),
});

const searchSchema = z.object({
	query: z.string().min(2).max(10),
	countryCode: z.string().length(2).default("FR"),
	limit: z.coerce.number().int().positive().max(20).default(10),
});

const validateSingleSchema = z.object({
	postalCode: z.string().min(1).max(10),
	countryCode: z.string().length(2).default("FR"),
});

export const postalCodesRouter = new Hono()
	.basePath("/postal-codes")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// Validate a single postal code format (quick, no API call)
	.get(
		"/validate",
		validator("query", validateSingleSchema),
		describeRoute({
			summary: "Validate postal code format",
			description: "Quickly validate a postal code format without fetching boundary data",
			tags: ["VTC - Postal Codes"],
		}),
		async (c) => {
			const { postalCode, countryCode } = c.req.valid("query");

			const result = validatePostalCodeFormat(postalCode, countryCode);

			return c.json({
				postalCode,
				countryCode,
				isValid: result.isValid,
				error: result.error,
			});
		}
	)

	// Validate multiple postal codes and fetch their boundaries
	.post(
		"/validate",
		validator("json", validatePostalCodesSchema),
		describeRoute({
			summary: "Validate postal codes",
			description: "Validate multiple postal codes and fetch their boundary data",
			tags: ["VTC - Postal Codes"],
		}),
		async (c) => {
			const { postalCodes, countryCode } = c.req.valid("json");

			try {
				const results = await validatePostalCodes(postalCodes, countryCode);

				const validCount = results.filter((r) => r.isValid).length;
				const invalidCount = results.filter((r) => !r.isValid).length;

				return c.json({
					results,
					summary: {
						total: postalCodes.length,
						valid: validCount,
						invalid: invalidCount,
					},
				});
			} catch (error) {
				console.error("Error validating postal codes:", error);
				throw new HTTPException(500, {
					message: error instanceof Error ? error.message : "Failed to validate postal codes",
				});
			}
		}
	)

	// Get merged geometry for multiple postal codes
	.post(
		"/geometry",
		validator("json", getGeometrySchema),
		describeRoute({
			summary: "Get postal code zone geometry",
			description: "Fetch and merge boundaries for multiple postal codes into a single geometry",
			tags: ["VTC - Postal Codes"],
		}),
		async (c) => {
			const { postalCodes, countryCode } = c.req.valid("json");

			try {
				const result = await getPostalCodeZoneGeometry(postalCodes, countryCode);

				if (!result.success) {
					return c.json(
						{
							success: false,
							errors: result.errors,
							validationResults: result.validationResults,
						},
						400
					);
				}

				return c.json({
					success: true,
					geometry: result.result?.geometry,
					center: result.result?.center,
					postalCodes: result.result?.postalCodes,
					totalArea: result.result?.totalArea,
					validationResults: result.validationResults,
					errors: result.errors,
				});
			} catch (error) {
				console.error("Error getting postal code geometry:", error);
				throw new HTTPException(500, {
					message: error instanceof Error ? error.message : "Failed to get postal code geometry",
				});
			}
		}
	)

	// Search postal codes (for autocomplete)
	.get(
		"/search",
		validator("query", searchSchema),
		describeRoute({
			summary: "Search postal codes",
			description: "Search for postal codes by partial match (for autocomplete)",
			tags: ["VTC - Postal Codes"],
		}),
		async (c) => {
			const { query, countryCode, limit } = c.req.valid("query");

			try {
				const results = await searchPostalCodes(query, countryCode, limit);

				return c.json({
					query,
					results,
				});
			} catch (error) {
				console.error("Error searching postal codes:", error);
				throw new HTTPException(500, {
					message: error instanceof Error ? error.message : "Failed to search postal codes",
				});
			}
		}
	);
