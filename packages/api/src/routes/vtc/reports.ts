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
 * Story 30.3: Validated Financial Reporting - Invoice-based revenue
 *
 * Provides aggregated profitability reports using Invoice data (not Quotes).
 * Only legally invoiced amounts are reported for accounting accuracy.
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
	// Story 30.3: Payment tracking
	paidAmount: number;
	pendingAmount: number;
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
	invoiceId?: string;
	contactName?: string;
	invoiceNumber?: string;
	issueDate?: string;
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

			// Story 30.3: Build where clause for Invoice (not Quote)
			// Only include legally invoiced amounts: ISSUED, PARTIAL, PAID
			// Exclude DRAFT and CANCELLED
			const baseWhere: Prisma.InvoiceWhereInput = {
				status: { in: ["ISSUED", "PARTIAL", "PAID"] },
				...(dateFrom && { issueDate: { gte: new Date(dateFrom) } }),
				...(dateTo && { issueDate: { lte: new Date(dateTo) } }),
				...(contactId && { contactId }),
				...(vehicleCategoryId && { quote: { vehicleCategoryId } }),
			};

			const where = withTenantFilter(baseWhere, organizationId);

			// Fetch invoices with related data
			const invoices = await db.invoice.findMany({
				where,
				include: {
					contact: {
						select: { id: true, displayName: true },
					},
				},
				orderBy: { issueDate: "desc" },
			});

			// Helper to calculate margin for an invoice
			const getInvoiceMargin = (invoice: typeof invoices[0]) => {
				const revenue = Number(invoice.totalExclVat) || 0;
				const costBreakdown = invoice.costBreakdown as { internalCost?: number } | null;
				const cost = costBreakdown?.internalCost ? Number(costBreakdown.internalCost) : 0;
				return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
			};

			const getInvoiceCost = (invoice: typeof invoices[0]) => {
				const costBreakdown = invoice.costBreakdown as { internalCost?: number } | null;
				return costBreakdown?.internalCost ? Number(costBreakdown.internalCost) : 0;
			};

			// Apply profitability filter post-fetch (since margin is calculated)
			const marginFilter = getMarginFilter(profitabilityLevel);
			const filteredInvoices = marginFilter
				? invoices.filter((invoice) => {
						const margin = getInvoiceMargin(invoice);
						if (marginFilter.gte !== undefined && margin < marginFilter.gte) return false;
						if (marginFilter.lt !== undefined && margin >= marginFilter.lt) return false;
						return true;
					})
				: invoices;

			// Calculate summary from filtered Invoice data
			let totalRevenue = 0;
			let totalCost = 0;
			let lossCount = 0;
			let totalPaidAmount = 0;
			let totalPendingAmount = 0;
			const margins: number[] = [];

			for (const invoice of filteredInvoices) {
				const revenue = Number(invoice.totalExclVat) || 0;
				const paid = Number(invoice.paidAmount) || 0;
				const totalTTC = Number(invoice.totalInclVat) || 0;
				const cost = getInvoiceCost(invoice);
				const margin = getInvoiceMargin(invoice);

				totalRevenue += revenue;
				totalCost += cost;
				totalPaidAmount += paid;
				totalPendingAmount += Math.max(0, totalTTC - paid);
				margins.push(margin);

				if (margin < 0) {
					lossCount++;
				}
			}

			const avgMarginPercent =
				margins.length > 0
					? margins.reduce((sum, m) => sum + m, 0) / margins.length
					: 0;

			const summary: ProfitabilityReportSummary = {
				totalRevenue: Math.round(totalRevenue * 100) / 100,
				totalCost: Math.round(totalCost * 100) / 100,
				avgMarginPercent: Math.round(avgMarginPercent * 10) / 10,
				lossCount,
				totalCount: filteredInvoices.length,
				paidAmount: Math.round(totalPaidAmount * 100) / 100,
				pendingAmount: Math.round(totalPendingAmount * 100) / 100,
			};

			// Build data rows based on groupBy
			let data: ProfitabilityReportRow[];

			if (groupBy === "none") {
				// No grouping - return individual invoices
				data = filteredInvoices.map((invoice) => {
					const margin = getInvoiceMargin(invoice);
					return {
						id: invoice.id,
						groupKey: null,
						groupLabel: null,
						revenue: Number(invoice.totalExclVat) || 0,
						cost: getInvoiceCost(invoice),
						marginPercent: Math.round(margin * 10) / 10,
						profitabilityLevel: getProfitabilityLevel(margin),
						count: 1,
						invoiceId: invoice.id,
						contactName: invoice.contact.displayName,
						invoiceNumber: invoice.number,
						issueDate: invoice.issueDate.toISOString(),
					};
				});
			} else if (groupBy === "client") {
				// Group by client
				const grouped = new Map<
					string,
					{ label: string; revenue: number; cost: number; margins: number[]; count: number }
				>();

				for (const invoice of filteredInvoices) {
					const key = invoice.contactId;
					const existing = grouped.get(key);
					const revenue = Number(invoice.totalExclVat) || 0;
					const cost = getInvoiceCost(invoice);
					const margin = getInvoiceMargin(invoice);

					if (existing) {
						existing.revenue += revenue;
						existing.cost += cost;
						existing.margins.push(margin);
						existing.count++;
					} else {
						grouped.set(key, {
							label: invoice.contact.displayName,
							revenue,
							cost,
							margins: [margin],
							count: 1,
						});
					}
				}

				data = Array.from(grouped.entries()).map(([key, value]) => {
					const avgMargin = value.margins.length > 0 
						? value.margins.reduce((a, b) => a + b, 0) / value.margins.length 
						: 0;
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
				// Story 30.3: Vehicle category grouping not available directly on Invoice
				// Group all invoices under "All Categories" since Invoice doesn't have vehicleCategoryId
				const totalRev = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalExclVat) || 0), 0);
				const totalCst = filteredInvoices.reduce((sum, inv) => sum + getInvoiceCost(inv), 0);
				const allMargins = filteredInvoices.map(getInvoiceMargin);
				const avgMrg = allMargins.length > 0 ? allMargins.reduce((a, b) => a + b, 0) / allMargins.length : 0;

				data = filteredInvoices.length > 0 ? [{
					id: "all-categories",
					groupKey: "all-categories",
					groupLabel: "All Categories",
					revenue: Math.round(totalRev * 100) / 100,
					cost: Math.round(totalCst * 100) / 100,
					marginPercent: Math.round(avgMrg * 10) / 10,
					profitabilityLevel: getProfitabilityLevel(avgMrg),
					count: filteredInvoices.length,
				}] : [];
			} else if (groupBy === "period") {
				// Group by month using issueDate
				const grouped = new Map<
					string,
					{ label: string; revenue: number; cost: number; margins: number[]; count: number }
				>();

				for (const invoice of filteredInvoices) {
					const date = new Date(invoice.issueDate);
					const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
					const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
					const existing = grouped.get(key);
					const revenue = Number(invoice.totalExclVat) || 0;
					const cost = getInvoiceCost(invoice);
					const margin = getInvoiceMargin(invoice);

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
						const avgMargin = value.margins.length > 0 
							? value.margins.reduce((a, b) => a + b, 0) / value.margins.length 
							: 0;
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
