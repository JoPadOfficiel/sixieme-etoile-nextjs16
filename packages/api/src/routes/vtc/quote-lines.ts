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

import { Prisma, type QuoteLine, QuoteStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { db } from "@repo/database";
import {
	type QuoteLineDisplayDataInput,
	type QuoteLineInput,
	type QuoteLineSourceDataInput,
	QuoteLinesArraySchema,
} from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import { missionSyncService } from "../../services/mission-sync.service";

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
 * Simple structured logger for quote lines operations
 * Uses console but with structured format for production log aggregation
 */
const logger = {
	info: (message: string, context: Record<string, unknown>) => {
		console.log(
			JSON.stringify({
				level: "info",
				message,
				...context,
				timestamp: new Date().toISOString(),
			}),
		);
	},
	warn: (message: string, context: Record<string, unknown>) => {
		console.warn(
			JSON.stringify({
				level: "warn",
				message,
				...context,
				timestamp: new Date().toISOString(),
			}),
		);
	},
	error: (message: string, context: Record<string, unknown>) => {
		console.error(
			JSON.stringify({
				level: "error",
				message,
				...context,
				timestamp: new Date().toISOString(),
			}),
		);
	},
};

/**
 * Extracts numeric value from displayData.total or displayData.groupSubtotal
 * Falls back to totalPrice field
 * Uses Decimal for precise financial calculations
 */
function extractLineTotal(line: QuoteLine): Decimal {
	const displayData = line.displayData as QuoteLineDisplayDataInput | null;
	if (displayData?.groupSubtotal) {
		return new Decimal(displayData.groupSubtotal);
	}
	return new Decimal(line.totalPrice.toString());
}

/**
 * Extracts internal cost from sourceData if available
 * Returns null for MANUAL lines without sourceData
 * Returns 0 if sourceData exists but all cost components are 0
 */
function extractInternalCost(line: QuoteLine): Decimal | null {
	const sourceData = line.sourceData as QuoteLineSourceDataInput | null;
	if (!sourceData) return null;

	// Sum all cost components if available
	const fuel = new Decimal(sourceData.fuelCost ?? 0);
	const tolls = new Decimal(sourceData.tollCost ?? 0);
	const driver = new Decimal(sourceData.driverCost ?? 0);
	const wear = new Decimal(sourceData.wearCost ?? 0);

	// If no cost components, check for a direct internalCost field
	const directCost = (sourceData as unknown as { internalCost?: number })
		.internalCost;
	if (directCost !== undefined) {
		return new Decimal(directCost);
	}

	// Return sum of components - even if 0 (valid cost)
	// Check if ANY cost field was explicitly provided
	const hasCostData =
		sourceData.fuelCost !== undefined ||
		sourceData.tollCost !== undefined ||
		sourceData.driverCost !== undefined ||
		sourceData.wearCost !== undefined;

	if (hasCostData) {
		return fuel.plus(tolls).plus(driver).plus(wear);
	}

	return null;
}

/**
 * Calculates quote totals from quote lines
 * Uses Decimal throughout for precise financial calculations
 */
function calculateQuoteTotals(lines: QuoteLine[]): QuoteTotals {
	let totalPrice = new Decimal(0);
	let totalInternalCost = new Decimal(0);
	let hasInternalCost = false;

	for (const line of lines) {
		totalPrice = totalPrice.plus(extractLineTotal(line));

		const cost = extractInternalCost(line);
		if (cost !== null) {
			totalInternalCost = totalInternalCost.plus(cost);
			hasInternalCost = true;
		}
	}

	const finalPrice = totalPrice.toDecimalPlaces(2);
	const internalCost = hasInternalCost
		? totalInternalCost.toDecimalPlaces(2)
		: null;

	// Calculate margin only if we have both finalPrice and internalCost
	let marginPercent: Decimal | null = null;
	if (internalCost !== null && !totalPrice.isZero()) {
		const margin = totalPrice
			.minus(totalInternalCost)
			.dividedBy(totalPrice)
			.times(100);
		marginPercent = margin.toDecimalPlaces(2);
	}

	return { finalPrice, internalCost, marginPercent };
}

/**
 * Build a map of tempId -> new ID for new lines
 * For new lines without explicit id, we let Prisma generate the CUID
 * This map is used only for parent resolution
 */
function buildIdMap(
	lines: QuoteLineInput[],
	existingIds: Set<string>,
): Map<string, string> {
	const idMap = new Map<string, string>();

	for (const line of lines) {
		// If line has an existing ID, use it
		if (line.id && existingIds.has(line.id)) {
			idMap.set(line.id, line.id);
		}
		// If line has a tempId and an id, map tempId -> id
		else if (line.tempId && line.id) {
			idMap.set(line.tempId, line.id);
		}
		// For tempId only - we need to generate (will be done in create phase)
	}

	return idMap;
}

/**
 * Resolve parentId using the id map
 * Handles both existing IDs and tempIds
 */
function resolveParentId(
	parentId: string | null | undefined,
	idMap: Map<string, string>,
): string | null {
	if (!parentId) return null;
	return idMap.get(parentId) ?? parentId;
}

/**
 * Check if any line has children that would be orphaned
 */
function checkForOrphanedChildren(
	linesToDelete: string[],
	existingLines: Array<{ id: string; parentId: string | null }>,
	incomingLines: QuoteLineInput[],
): string[] {
	// Build set of incoming line IDs
	const incomingIds = new Set(incomingLines.map((l) => l.id).filter(Boolean));

	// Find children of lines to be deleted that are not being re-parented
	const orphanedChildren: string[] = [];

	for (const line of existingLines) {
		if (line.parentId && linesToDelete.includes(line.parentId)) {
			// This line's parent is being deleted
			if (!linesToDelete.includes(line.id) && !incomingIds.has(line.id)) {
				orphanedChildren.push(line.id);
			}
		}
	}

	return orphanedChildren;
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

			logger.info("Quote lines update started", {
				quoteId,
				organizationId,
				lineCount: lines.length,
				recalculateTotals,
			});

			// Verify quote exists and belongs to organization
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
				include: {
					lines: {
						select: {
							id: true,
							parentId: true,
						},
					},
				},
			});

			if (!quote) {
				logger.warn("Quote not found", { quoteId, organizationId });
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			// Check if quote is editable (only DRAFT quotes can have lines modified)
			// Using enum instead of magic string
			if (quote.status !== QuoteStatus.DRAFT) {
				logger.warn("Attempted to modify non-DRAFT quote", {
					quoteId,
					status: quote.status,
				});
				throw new HTTPException(400, {
					message:
						"Cannot modify lines for non-DRAFT quotes. Quote must be in DRAFT status.",
				});
			}

			// Build sets for diff logic
			const existingLineIds = new Set(quote.lines.map((l) => l.id));
			const incomingWithIds = lines.filter(
				(l): l is QuoteLineInput & { id: string } =>
					!!l.id && existingLineIds.has(l.id),
			);
			const incomingNewLines = lines.filter(
				(l) => !l.id || !existingLineIds.has(l.id),
			);
			const incomingIds = new Set(incomingWithIds.map((l) => l.id));
			const linesToDelete = Array.from(existingLineIds).filter(
				(id) => !incomingIds.has(id),
			);

			// Check for orphaned children before deleting
			if (linesToDelete.length > 0) {
				const orphanedChildren = checkForOrphanedChildren(
					linesToDelete,
					quote.lines,
					lines,
				);

				if (orphanedChildren.length > 0) {
					// Also delete orphaned children to prevent constraint violations
					linesToDelete.push(...orphanedChildren);
					logger.info("Including orphaned children in deletion", {
						quoteId,
						orphanedCount: orphanedChildren.length,
					});
				}
			}

			// Build ID map for parent resolution - pass through for resolution
			const idMap = buildIdMap(lines, existingLineIds);

			// Execute all operations in a transaction
			const result = await db.$transaction(async (tx) => {
				const stats: LineUpdateResult = {
					created: 0,
					updated: 0,
					deleted: 0,
				};

				// 1. Delete removed lines (children first due to FK constraints)
				if (linesToDelete.length > 0) {
					// First delete children, then parents
					await tx.quoteLine.deleteMany({
						where: {
							id: { in: linesToDelete },
							quoteId,
						},
					});
					stats.deleted = linesToDelete.length;
				}

				// 2. Update existing lines in parallel for better performance
				if (incomingWithIds.length > 0) {
					await Promise.all(
						incomingWithIds.map(async (line) => {
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
									dispatchable: line.dispatchable, // Story 28.6
								},
							});
						}),
					);
					stats.updated = incomingWithIds.length;
				}

				// 3. Create new lines - need to handle tempId -> id mapping
				// Create in order to handle parent references correctly
				const createdLineIds = new Map<string, string>();

				// First pass: create lines without parents or with existing parents
				const linesWithoutNewParents = incomingNewLines.filter((line) => {
					if (!line.parentId) return true;
					// Check if parent is an existing line or already in idMap
					return existingLineIds.has(line.parentId) || idMap.has(line.parentId);
				});

				const linesWithNewParents = incomingNewLines.filter((line) => {
					if (!line.parentId) return false;
					// Parent is a tempId for a new line
					return (
						!existingLineIds.has(line.parentId) && !idMap.has(line.parentId)
					);
				});

				// Create lines without new parents first
				for (const line of linesWithoutNewParents) {
					const resolvedParentId = resolveParentId(line.parentId, idMap);

					const created = await tx.quoteLine.create({
						data: {
							// Let Prisma generate CUID automatically
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
							dispatchable: line.dispatchable, // Story 28.6
						},
					});

					// Map tempId to actual created id for child references
					if (line.tempId) {
						createdLineIds.set(line.tempId, created.id);
						idMap.set(line.tempId, created.id);
					}
					stats.created++;
				}

				// Second pass: create lines with new parents (now that parents exist)
				for (const line of linesWithNewParents) {
					const resolvedParentId =
						createdLineIds.get(line.parentId!) ??
						resolveParentId(line.parentId, idMap);

					await tx.quoteLine.create({
						data: {
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
							dispatchable: line.dispatchable, // Story 28.6
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
				let updatedQuoteData = {
					id: quote.id,
					finalPrice: quote.finalPrice,
					internalCost: quote.internalCost,
					marginPercent: quote.marginPercent,
				};

				if (recalculateTotals) {
					const totals = calculateQuoteTotals(updatedLines);

					const updated = await tx.quote.update({
						where: { id: quoteId },
						data: {
							finalPrice: totals.finalPrice,
							internalCost: totals.internalCost,
							marginPercent: totals.marginPercent,
						},
						select: {
							id: true,
							finalPrice: true,
							internalCost: true,
							marginPercent: true,
						},
					});

					updatedQuoteData = updated;

					logger.info("Quote totals recalculated", {
						quoteId,
						finalPrice: totals.finalPrice.toString(),
						internalCost: totals.internalCost?.toString() ?? null,
						marginPercent: totals.marginPercent?.toString() ?? null,
					});
				}

				return {
					stats,
					lines: updatedLines,
					quote: updatedQuoteData,
				};
			});

			logger.info("Quote lines update completed", {
				quoteId,
				stats: result.stats,
			});

			// Sync missions after line update (non-blocking)
			try {
				await missionSyncService.syncQuoteMissions(quoteId);
				logger.info("Mission sync completed", { quoteId });
			} catch (syncError) {
				logger.error("Mission sync failed", {
					quoteId,
					error:
						syncError instanceof Error ? syncError.message : String(syncError),
				});
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
					createdAt: line.createdAt.toISOString(),
					updatedAt: line.updatedAt.toISOString(),
				})),
			});
		},
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
					createdAt: line.createdAt.toISOString(),
					updatedAt: line.updatedAt.toISOString(),
				})),
			});
		},
	);
