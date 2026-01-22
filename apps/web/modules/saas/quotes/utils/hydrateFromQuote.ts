import type { QuoteLine } from "../components/yolo/dnd-utils";
import { parseSourceData } from "../schemas/sourceDataSchema";
import { DEFAULT_QUANTITY, DEFAULT_VAT_RATE } from "../constants/quoteDefaults";

// ============================================================================
// Types
// ============================================================================

export interface DatabaseQuoteLine {
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
}

export interface ParsedQuoteLineData {
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	vatRate: number;
	parsedSourceData: Record<string, unknown>;
	displayData: Record<string, unknown>;
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parse and validate numeric fields from database line
 */
function parseQuoteLineData(line: DatabaseQuoteLine): ParsedQuoteLineData {
	const quantity = line.quantity != null ? Number(line.quantity) : DEFAULT_QUANTITY;
	
	// Validate numeric fields to prevent NaN corruption
	const unitPrice = Number(line.unitPrice);
	if (isNaN(unitPrice)) {
		throw new Error(`Invalid unitPrice for line ${line.id}: ${line.unitPrice}`);
	}
	
	const totalPrice = Number(line.totalPrice);
	if (isNaN(totalPrice)) {
		throw new Error(`Invalid totalPrice for line ${line.id}: ${line.totalPrice}`);
	}
	
	const vatRate = line.vatRate != null ? Number(line.vatRate) : DEFAULT_VAT_RATE;
	if (isNaN(vatRate)) {
		throw new Error(`Invalid vatRate for line ${line.id}: ${line.vatRate}`);
	}

	const parsedSourceData = parseSourceData(line.sourceData);

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
		quantity,
		unitPrice,
		totalPrice,
		vatRate,
		parsedSourceData,
		displayData,
	};
}

/**
 * Transform parsed data to QuoteLine interface
 */
function transformToQuoteLine(
	line: DatabaseQuoteLine,
	parsedData: ParsedQuoteLineData,
	index: number,
): QuoteLine {
	return {
		id: line.id,
		type: line.type as "CALCULATED" | "MANUAL" | "GROUP",
		label: line.label,
		description: line.description || undefined,
		quantity: parsedData.quantity,
		unitPrice: parsedData.unitPrice,
		totalPrice: parsedData.totalPrice,
		vatRate: parsedData.vatRate,
		parentId: line.parentId || null,
		sortOrder: line.sortOrder ?? index,
		displayData: parsedData.displayData,
		sourceData: parsedData.parsedSourceData,
		dispatchable: line.dispatchable ?? true,
	};
}

// ============================================================================
// Main Export
// ============================================================================

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
export function hydrateFromQuote(dbLines: DatabaseQuoteLine[]): QuoteLine[] {
	if (!dbLines || dbLines.length === 0) {
		return [];
	}

	return dbLines.map((line, index) => {
		const parsedData = parseQuoteLineData(line);
		return transformToQuoteLine(line, parsedData, index);
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
