import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { withTenantFilter } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

/**
 * Reports Router
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Provides aggregated profitability reports using Trip Transparency data.
 *
 * @see FR24 Profitability indicator
 * @see FR55 Trip Transparency module
 */

// Validation schemas
const profitabilityReportSchema = z.object({
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
	groupBy: z.enum(["client", "vehicleCategory", "period", "none"]).default("none"),
	profitabilityLevel: z.enum(["all", "green", "orange", "red"]).default("all"),
	contactId: z.string().optional(),
	vehicleCategoryId: z.string().optional(),
});

// Response types
interface ProfitabilityReportSummary {
	totalRevenue: number;
	totalCost: number;
	avgMarginPercent: number;
	lossCount: number;
	totalCount: number;
}

interface ProfitabilityReportRow {
	id: string;
	groupKey: string | null;
	groupLabel: string | null;
	revenue: number;
	cost: number;
	marginPercent: number;
	profitabilityLevel: "green" | "orange" | "red";
	count: number;
	quoteId?: string;
	contactName?: string;
	vehicleCategory?: string;
	pickupAt?: string;
}

/**
 * Calculate profitability level based on margin percentage
 */
function getProfitabilityLevel(marginPercent: number | null): "green" | "orange" | "red" {
	if (marginPercent === null) return "orange";
	if (marginPercent >= 20) return "green";
	if (marginPercent >= 0) return "orange";
	return "red";
}

/**
 * Get margin filter based on profitability level
 */
function getMarginFilter(level: string): { gte?: number; lt?: number } | undefined {
	switch (level) {
		case "green":
			return { gte: 20 };
		case "orange":
			return { gte: 0, lt: 20 };
		case "red":
			return { lt: 0 };
		default:
			return undefined;
	}
}

export const reportsRouter = new Hono()
	.basePath("/reports")
	.use("*", organizationMiddleware)

	// Get profitability report
	.get(
		"/profitability",
		validator("query", profitabilityReportSchema),
		describeRoute({
			summary: "Get profitability report",
			description:
				"Get aggregated profitability data for quotes/missions with filtering and grouping options",
			tags: ["VTC - Reports"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { dateFrom, dateTo, groupBy, profitabilityLevel, contactId, vehicleCategoryId } =
				c.req.valid("query");

			// Build where clause
			const marginFilter = getMarginFilter(profitabilityLevel);
			const baseWhere: Prisma.QuoteWhereInput = {
				status: { in: ["SENT", "ACCEPTED"] },
				...(dateFrom && { pickupAt: { gte: new Date(dateFrom) } }),
				...(dateTo && { pickupAt: { lte: new Date(dateTo) } }),
				...(contactId && { contactId }),
				...(vehicleCategoryId && { vehicleCategoryId }),
				...(marginFilter && { marginPercent: marginFilter }),
			};

			const where = withTenantFilter(baseWhere, organizationId);

			// Fetch quotes with related data
			const quotes = await db.quote.findMany({
				where,
				include: {
					contact: {
						select: { id: true, displayName: true },
					},
					vehicleCategory: {
						select: { id: true, name: true, code: true },
					},
				},
				orderBy: { pickupAt: "desc" },
			});

			// Calculate summary
			let totalRevenue = 0;
			let totalCost = 0;
			let lossCount = 0;

			for (const quote of quotes) {
				const revenue = Number(quote.finalPrice) || 0;
				const cost = Number(quote.internalCost) || 0;
				const margin = quote.marginPercent ? Number(quote.marginPercent) : null;

				totalRevenue += revenue;
				totalCost += cost;

				if (margin !== null && margin < 0) {
					lossCount++;
				}
			}

			const avgMarginPercent =
				quotes.length > 0
					? quotes.reduce((sum, q) => sum + (Number(q.marginPercent) || 0), 0) / quotes.length
					: 0;

			const summary: ProfitabilityReportSummary = {
				totalRevenue: Math.round(totalRevenue * 100) / 100,
				totalCost: Math.round(totalCost * 100) / 100,
				avgMarginPercent: Math.round(avgMarginPercent * 10) / 10,
				lossCount,
				totalCount: quotes.length,
			};

			// Build data rows based on groupBy
			let data: ProfitabilityReportRow[];

			if (groupBy === "none") {
				// No grouping - return individual quotes
				data = quotes.map((quote) => ({
					id: quote.id,
					groupKey: null,
					groupLabel: null,
					revenue: Number(quote.finalPrice) || 0,
					cost: Number(quote.internalCost) || 0,
					marginPercent: Number(quote.marginPercent) || 0,
					profitabilityLevel: getProfitabilityLevel(
						quote.marginPercent ? Number(quote.marginPercent) : null
					),
					count: 1,
					quoteId: quote.id,
					contactName: quote.contact.displayName,
					vehicleCategory: quote.vehicleCategory.name,
					pickupAt: quote.pickupAt.toISOString(),
				}));
			} else if (groupBy === "client") {
				// Group by client
				const grouped = new Map<
					string,
					{ label: string; revenue: number; cost: number; margins: number[]; count: number }
				>();

				for (const quote of quotes) {
					const key = quote.contactId;
					const existing = grouped.get(key);
					const revenue = Number(quote.finalPrice) || 0;
					const cost = Number(quote.internalCost) || 0;
					const margin = Number(quote.marginPercent) || 0;

					if (existing) {
						existing.revenue += revenue;
						existing.cost += cost;
						existing.margins.push(margin);
						existing.count++;
					} else {
						grouped.set(key, {
							label: quote.contact.displayName,
							revenue,
							cost,
							margins: [margin],
							count: 1,
						});
					}
				}

				data = Array.from(grouped.entries()).map(([key, value]) => {
					const avgMargin = value.margins.reduce((a, b) => a + b, 0) / value.margins.length;
					return {
						id: key,
						groupKey: key,
						groupLabel: value.label,
						revenue: Math.round(value.revenue * 100) / 100,
						cost: Math.round(value.cost * 100) / 100,
						marginPercent: Math.round(avgMargin * 10) / 10,
						profitabilityLevel: getProfitabilityLevel(avgMargin),
						count: value.count,
					};
				});
			} else if (groupBy === "vehicleCategory") {
				// Group by vehicle category
				const grouped = new Map<
					string,
					{ label: string; revenue: number; cost: number; margins: number[]; count: number }
				>();

				for (const quote of quotes) {
					const key = quote.vehicleCategoryId;
					const existing = grouped.get(key);
					const revenue = Number(quote.finalPrice) || 0;
					const cost = Number(quote.internalCost) || 0;
					const margin = Number(quote.marginPercent) || 0;

					if (existing) {
						existing.revenue += revenue;
						existing.cost += cost;
						existing.margins.push(margin);
						existing.count++;
					} else {
						grouped.set(key, {
							label: quote.vehicleCategory.name,
							revenue,
							cost,
							margins: [margin],
							count: 1,
						});
					}
				}

				data = Array.from(grouped.entries()).map(([key, value]) => {
					const avgMargin = value.margins.reduce((a, b) => a + b, 0) / value.margins.length;
					return {
						id: key,
						groupKey: key,
						groupLabel: value.label,
						revenue: Math.round(value.revenue * 100) / 100,
						cost: Math.round(value.cost * 100) / 100,
						marginPercent: Math.round(avgMargin * 10) / 10,
						profitabilityLevel: getProfitabilityLevel(avgMargin),
						count: value.count,
					};
				});
			} else if (groupBy === "period") {
				// Group by month
				const grouped = new Map<
					string,
					{ label: string; revenue: number; cost: number; margins: number[]; count: number }
				>();

				for (const quote of quotes) {
					const date = new Date(quote.pickupAt);
					const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
					const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
					const existing = grouped.get(key);
					const revenue = Number(quote.finalPrice) || 0;
					const cost = Number(quote.internalCost) || 0;
					const margin = Number(quote.marginPercent) || 0;

					if (existing) {
						existing.revenue += revenue;
						existing.cost += cost;
						existing.margins.push(margin);
						existing.count++;
					} else {
						grouped.set(key, {
							label,
							revenue,
							cost,
							margins: [margin],
							count: 1,
						});
					}
				}

				data = Array.from(grouped.entries())
					.sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
					.map(([key, value]) => {
						const avgMargin = value.margins.reduce((a, b) => a + b, 0) / value.margins.length;
						return {
							id: key,
							groupKey: key,
							groupLabel: value.label,
							revenue: Math.round(value.revenue * 100) / 100,
							cost: Math.round(value.cost * 100) / 100,
							marginPercent: Math.round(avgMargin * 10) / 10,
							profitabilityLevel: getProfitabilityLevel(avgMargin),
							count: value.count,
						};
					});
			} else {
				data = [];
			}

			return c.json({ summary, data });
		}
	);
