/**
 * Story 26.4: Backend API CRUD for Nested Lines & Totals
 *
 * This module provides the API endpoint for batch updating quote lines
 * with the Hybrid Blocks architecture. It handles:
 * - Diff logic: create, update, delete lines
 * - Re-parenting and reordering
 * - Automatic total recalculation (finalPrice, internalCost, marginPercent)
 * - Transaction safety with Prisma
 */

import { db } from "@repo/database";
import {
	UpdateQuoteLinesSchema,
	QuoteLinesArraySchema,
	type QuoteLineInput,
	type QuoteLineDisplayDataInput,
	type QuoteLineSourceDataInput,
} from "@repo/database";
import { Prisma, type QuoteLine } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import { missionSyncService } from "../../services/mission-sync.service";
import { Decimal } from "@prisma/client/runtime/library";

// =============================================================================
// TYPES & HELPERS
// =============================================================================

interface LineUpdateResult {
	created: number;
	updated: number;
	deleted: number;
}

interface QuoteTotals {
	finalPrice: Decimal;
	internalCost: Decimal | null;
	marginPercent: Decimal | null;
}

/**
 * Extracts numeric value from displayData.total or displayData.groupSubtotal
 * Falls back to totalPrice field
 */
function extractLineTotal(line: QuoteLine): number {
	const displayData = line.displayData as QuoteLineDisplayDataInput | null;
	if (displayData?.groupSubtotal) {
		return displayData.groupSubtotal;
	}
	return Number(line.totalPrice);
}

/**
 * Extracts internal cost from sourceData if available
 * Returns null for MANUAL lines without sourceData
 */
function extractInternalCost(line: QuoteLine): number | null {
	const sourceData = line.sourceData as QuoteLineSourceDataInput | null;
	if (!sourceData) return null;

	// Sum all cost components if available
	const fuel = sourceData.fuelCost ?? 0;
	const tolls = sourceData.tollCost ?? 0;
	const driver = sourceData.driverCost ?? 0;
	const wear = sourceData.wearCost ?? 0;

	// If no cost components, check for a direct internalCost field
	const directCost = (sourceData as unknown as { internalCost?: number }).internalCost;
	if (directCost !== undefined) {
		return directCost;
	}

	// Return sum of components if any were present
	if (fuel > 0 || tolls > 0 || driver > 0 || wear > 0) {
		return fuel + tolls + driver + wear;
	}

	return null;
}

/**
 * Calculates quote totals from quote lines
 */
function calculateQuoteTotals(lines: QuoteLine[]): QuoteTotals {
	let totalPrice = 0;
	let totalInternalCost = 0;
	let hasInternalCost = false;

	for (const line of lines) {
		totalPrice += extractLineTotal(line);

		const cost = extractInternalCost(line);
		if (cost !== null) {
			totalInternalCost += cost;
			hasInternalCost = true;
		}
	}

	const finalPrice = new Decimal(totalPrice.toFixed(2));
	const internalCost = hasInternalCost ? new Decimal(totalInternalCost.toFixed(2)) : null;

	// Calculate margin only if we have both finalPrice and internalCost
	let marginPercent: Decimal | null = null;
	if (internalCost !== null && totalPrice > 0) {
		const margin = ((totalPrice - totalInternalCost) / totalPrice) * 100;
		marginPercent = new Decimal(margin.toFixed(2));
	}

	return { finalPrice, internalCost, marginPercent };
}

/**
 * Build a map of tempId -> generated CUID for new lines
 * This allows proper parentId resolution when creating lines
 */
function buildIdMap(
	lines: QuoteLineInput[],
	existingIds: Set<string>
): Map<string, string> {
	const idMap = new Map<string, string>();

	for (const line of lines) {
		// If line has an existing ID, use it
		if (line.id && existingIds.has(line.id)) {
			idMap.set(line.id, line.id);
		}
		// If line has a tempId, generate a new CUID
		else if (line.tempId) {
			// Generate CUID - we'll use crypto.randomUUID() as a fallback
			const newId = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
			idMap.set(line.tempId, `c${newId}`); // Prefix with 'c' for cuid-like format
		}
	}

	return idMap;
}

/**
 * Resolve parentId using the id map
 * Handles both existing IDs and tempIds
 */
function resolveParentId(
	parentId: string | null | undefined,
	idMap: Map<string, string>
): string | null {
	if (!parentId) return null;
	return idMap.get(parentId) ?? parentId;
}

// =============================================================================
// REQUEST/RESPONSE SCHEMAS
// =============================================================================

const updateLinesRequestSchema = z.object({
	lines: QuoteLinesArraySchema,
	recalculateTotals: z.boolean().default(true),
});

// =============================================================================
// ROUTER
// =============================================================================

export const quoteLinesRouter = new Hono()
	.basePath("/quotes/:quoteId/lines")
	.use("*", organizationMiddleware)

	/**
	 * PATCH /quotes/:quoteId/lines
	 *
	 * Batch update all lines for a quote. This endpoint:
	 * 1. Validates the quote exists and belongs to the organization
	 * 2. Validates the incoming lines using Zod schemas
	 * 3. Performs diff: create new, update existing, delete missing
	 * 4. Recalculates quote totals (finalPrice, internalCost, marginPercent)
	 * 5. All operations in a single transaction for atomicity
	 */
	.patch(
		"/",
		validator("json", updateLinesRequestSchema),
		describeRoute({
			summary: "Update quote lines",
			description:
				"Batch update all lines for a quote. Handles create/update/delete with automatic total recalculation.",
			tags: ["VTC - Quote Lines"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const quoteId = c.req.param("quoteId");
			const { lines, recalculateTotals } = c.req.valid("json");

			// Verify quote exists and belongs to organization
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
				include: {
					lines: {
						select: {
							id: true,
						},
					},
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			// Check if quote is editable (only DRAFT quotes can have lines modified)
			if (quote.status !== "DRAFT") {
				throw new HTTPException(400, {
					message:
						"Cannot modify lines for non-DRAFT quotes. Quote must be in DRAFT status.",
				});
			}

			// Build sets for diff logic
			const existingLineIds = new Set(quote.lines.map((l) => l.id));
			const incomingWithIds = lines.filter((l): l is QuoteLineInput & { id: string } => 
				!!l.id && existingLineIds.has(l.id)
			);
			const incomingNewLines = lines.filter((l) => !l.id || !existingLineIds.has(l.id));
			const incomingIds = new Set(incomingWithIds.map((l) => l.id));
			const linesToDelete = [...existingLineIds].filter((id) => !incomingIds.has(id));

			// Build ID map for parent resolution
			const idMap = buildIdMap(lines, existingLineIds);

			// Execute all operations in a transaction
			const result = await db.$transaction(async (tx) => {
				const stats: LineUpdateResult = {
					created: 0,
					updated: 0,
					deleted: 0,
				};

				// 1. Delete removed lines
				if (linesToDelete.length > 0) {
					await tx.quoteLine.deleteMany({
						where: {
							id: { in: linesToDelete },
							quoteId,
						},
					});
					stats.deleted = linesToDelete.length;
				}

				// 2. Update existing lines
				for (const line of incomingWithIds) {
					const resolvedParentId = resolveParentId(line.parentId, idMap);

					await tx.quoteLine.update({
						where: { id: line.id },
						data: {
							type: line.type,
							label: line.label,
							description: line.description,
							sourceData: line.sourceData 
								? (line.sourceData as Prisma.InputJsonValue) 
								: Prisma.JsonNull,
							displayData: line.displayData as Prisma.InputJsonValue,
							quantity: line.quantity,
							unitPrice: line.unitPrice,
							totalPrice: line.totalPrice,
							vatRate: line.vatRate,
							parentId: resolvedParentId,
							sortOrder: line.sortOrder,
						},
					});
					stats.updated++;
				}

				// 3. Create new lines (with generated CUIDs)
				for (const line of incomingNewLines) {
					const lineKey = line.id || line.tempId;
					const newId = lineKey ? idMap.get(lineKey) : undefined;
					const resolvedParentId = resolveParentId(line.parentId, idMap);

					await tx.quoteLine.create({
						data: {
							...(newId && { id: newId }),
							quoteId,
							type: line.type,
							label: line.label,
							description: line.description,
							sourceData: line.sourceData 
								? (line.sourceData as Prisma.InputJsonValue) 
								: Prisma.JsonNull,
							displayData: line.displayData as Prisma.InputJsonValue,
							quantity: line.quantity,
							unitPrice: line.unitPrice,
							totalPrice: line.totalPrice,
							vatRate: line.vatRate,
							parentId: resolvedParentId,
							sortOrder: line.sortOrder,
						},
					});
					stats.created++;
				}

				// 4. Fetch all lines after modifications for total calculation
				const updatedLines = await tx.quoteLine.findMany({
					where: { quoteId },
					orderBy: { sortOrder: "asc" },
				});

				// 5. Recalculate quote totals if requested
				let updatedQuote = quote;
				if (recalculateTotals) {
					const totals = calculateQuoteTotals(updatedLines);

					updatedQuote = await tx.quote.update({
						where: { id: quoteId },
						data: {
							finalPrice: totals.finalPrice,
							internalCost: totals.internalCost,
							marginPercent: totals.marginPercent,
						},
						include: {
							contact: true,
							vehicleCategory: true,
							lines: {
								select: { id: true },
							},
							endCustomer: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
									phone: true,
									difficultyScore: true,
								},
							},
						},
					});
				}

				return {
					stats,
					lines: updatedLines,
					quote: updatedQuote,
				};
			});

			// Sync missions after line update (non-blocking)
			try {
				await missionSyncService.syncQuoteMissions(quoteId);
			} catch (syncError) {
				console.warn(
					`[MissionSync] Failed to sync missions for quote ${quoteId}:`,
					syncError
				);
			}

			return c.json({
				success: true,
				stats: result.stats,
				quote: {
					id: result.quote.id,
					finalPrice: Number(result.quote.finalPrice),
					internalCost: result.quote.internalCost
						? Number(result.quote.internalCost)
						: null,
					marginPercent: result.quote.marginPercent
						? Number(result.quote.marginPercent)
						: null,
				},
				lines: result.lines.map((line) => ({
					id: line.id,
					type: line.type,
					label: line.label,
					description: line.description,
					sourceData: line.sourceData,
					displayData: line.displayData,
					quantity: Number(line.quantity),
					unitPrice: Number(line.unitPrice),
					totalPrice: Number(line.totalPrice),
					vatRate: Number(line.vatRate),
					parentId: line.parentId,
					sortOrder: line.sortOrder,
				})),
			});
		}
	)

	/**
	 * GET /quotes/:quoteId/lines
	 *
	 * Get all lines for a quote, ordered by sortOrder
	 */
	.get(
		"/",
		describeRoute({
			summary: "Get quote lines",
			description: "Get all lines for a quote, ordered by sortOrder",
			tags: ["VTC - Quote Lines"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const quoteId = c.req.param("quoteId");

			// Verify quote exists and belongs to organization
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			const lines = await db.quoteLine.findMany({
				where: { quoteId },
				orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
			});

			return c.json({
				success: true,
				lines: lines.map((line) => ({
					id: line.id,
					type: line.type,
					label: line.label,
					description: line.description,
					sourceData: line.sourceData,
					displayData: line.displayData,
					quantity: Number(line.quantity),
					unitPrice: Number(line.unitPrice),
					totalPrice: Number(line.totalPrice),
					vatRate: Number(line.vatRate),
					parentId: line.parentId,
					sortOrder: line.sortOrder,
				})),
			});
		}
	);
