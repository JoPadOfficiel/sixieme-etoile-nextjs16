import type { QuoteLine } from "../components/yolo/dnd-utils";
import { parseSourceData } from "../schemas/sourceDataSchema";

/**
 * Story 29.3: Hydrate QuoteLines from database format to UI format
 *
 * This function converts QuoteLine records from the database (with JSON fields)
 * into the QuoteLine interface used by the Yolo Quote Editor.
 *
 * Key features:
 * - Validates sourceData with Zod schema
 * - Handles legacy quotes without complete sourceData
 * - Preserves all operational metadata for editing
 *
 * @param dbLines - Array of QuoteLine records from database
 * @returns Array of QuoteLine objects for the UI store
 */
export function hydrateFromQuote(
	dbLines: Array<{
		id: string;
		type: string;
		label: string;
		description?: string | null;
		quantity?: string | number | null;
		unitPrice: string | number;
		totalPrice: string | number;
		vatRate?: string | number | null;
		parentId?: string | null;
		sortOrder?: number | null;
		displayData?: unknown;
		sourceData?: unknown;
		dispatchable?: boolean | null;
	}>,
): QuoteLine[] {
	if (!dbLines || dbLines.length === 0) {
		return [];
	}

	return dbLines.map((line, index) => {
		const parsedSourceData = parseSourceData(line.sourceData);

		const quantity =
			line.quantity != null ? Number(line.quantity) : 1;
		const unitPrice = Number(line.unitPrice) || 0;
		const totalPrice = Number(line.totalPrice) || quantity * unitPrice;
		const vatRate = line.vatRate != null ? Number(line.vatRate) : 10;

		const displayData =
			line.displayData && typeof line.displayData === "object"
				? (line.displayData as Record<string, unknown>)
				: {
						label: line.label,
						description: line.description || undefined,
						quantity,
						unitPrice,
						vatRate,
						total: totalPrice,
					};

		return {
			id: line.id,
			type: line.type as "CALCULATED" | "MANUAL" | "GROUP",
			label: line.label,
			description: line.description || undefined,
			quantity,
			unitPrice,
			totalPrice,
			vatRate,
			parentId: line.parentId || null,
			sortOrder: line.sortOrder ?? index,
			displayData,
			sourceData: parsedSourceData,
			dispatchable: line.dispatchable ?? true,
		};
	});
}

/**
 * Story 29.3: Check if hydrated lines are valid for editing
 *
 * @param lines - Hydrated QuoteLine array
 * @returns true if lines are valid for editing
 */
export function validateHydratedLines(lines: QuoteLine[]): boolean {
	if (!lines || lines.length === 0) {
		return true;
	}

	return lines.every((line) => {
		return (
			line.id &&
			line.type &&
			line.label &&
			typeof line.unitPrice === "number" &&
			typeof line.totalPrice === "number"
		);
	});
}
