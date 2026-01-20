/**
 * Story 26.21: Cart Template Utilities
 *
 * Utilities for serializing cart lines to template format and
 * deserializing templates back to cart lines with new IDs.
 */

import type { QuoteLine } from "../components/yolo/dnd-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * Structure for a single line in a full quote template
 */
export interface TemplateLineData {
	tempId: string;
	type: "CALCULATED" | "MANUAL" | "GROUP";
	label: string;
	description?: string;
	quantity: number;
	unitPrice: number;
	totalPrice: number;
	vatRate: number;
	parentId: string | null;
	sortOrder: number;
	displayData: {
		label: string;
		quantity: number;
		unitPrice: number;
		vatRate: number;
		total: number;
	};
}

/**
 * Full quote template data structure
 */
export interface FullQuoteTemplateData {
	lines: TemplateLineData[];
	version: 1;
}

// =============================================================================
// Serialization: Cart -> Template
// =============================================================================

/**
 * Serialize cart lines to template format.
 * - Generates temporary IDs (tpl-1, tpl-2, etc.)
 * - Maps parentId references to new temp IDs
 * - Clears sourceData (templates are for structure, not specific trip data)
 *
 * @param lines - Current cart lines
 * @returns Template data ready to be saved
 */
export function serializeCartToTemplate(
	lines: QuoteLine[],
): FullQuoteTemplateData {
	// Create a mapping from original IDs to template IDs
	const idMap = new Map<string, string>();
	lines.forEach((line, index) => {
		const originalId = line.id ?? line.tempId ?? `unknown-${index}`;
		idMap.set(originalId, `tpl-${index + 1}`);
	});

	const templateLines: TemplateLineData[] = lines.map((line, index) => {
		const originalId = line.id ?? line.tempId ?? `unknown-${index}`;
		const tempId = idMap.get(originalId) ?? `tpl-${index + 1}`;

		// Map parentId to new template ID
		let mappedParentId: string | null = null;
		if (line.parentId) {
			mappedParentId = idMap.get(line.parentId) ?? null;
		}

		// Safe cast and access for displayData
		const displayData = (line.displayData as Record<string, unknown>) || {};
		const displayLabel = (displayData.label as string) || line.label;
		const displayQuantity = Number(displayData.quantity ?? line.quantity) || 1;
		const displayUnitPrice =
			Number(displayData.unitPrice ?? line.unitPrice) || 0;
		const displayVatRate = Number(displayData.vatRate ?? line.vatRate) || 10;
		const displayTotal = Number(displayData.total ?? line.totalPrice) || 0;

		return {
			tempId,
			type: line.type as "CALCULATED" | "MANUAL" | "GROUP",
			label: line.label,
			description: line.description ?? undefined,
			quantity: Number(line.quantity) || 1,
			unitPrice: Number(line.unitPrice) || 0,
			totalPrice: Number(line.totalPrice) || 0,
			vatRate: Number(line.vatRate) || 10,
			parentId: mappedParentId,
			sortOrder: index,
			displayData: {
				label: displayLabel,
				quantity: displayQuantity,
				unitPrice: displayUnitPrice,
				vatRate: displayVatRate,
				total: displayTotal,
			},
		};
	});

	return {
		lines: templateLines,
		version: 1,
	};
}

// =============================================================================
// Deserialization: Template -> Cart
// =============================================================================

/**
 * Deserialize template to cart lines with new unique IDs.
 * - Generates new unique IDs for each line
 * - Correctly maps parentId references
 * - Recalculates sortOrder based on insertion position
 *
 * @param templateData - Template data from database
 * @param startSortOrder - Starting sort order (for "Add to Cart" mode)
 * @returns Cart lines ready to be inserted
 */
export function deserializeTemplateToCart(
	templateData: FullQuoteTemplateData,
	startSortOrder = 0,
): QuoteLine[] {
	const now = Date.now();

	// Create a mapping from template IDs to new IDs
	const idMap = new Map<string, string>();
	templateData.lines.forEach((line, index) => {
		idMap.set(line.tempId, `imported-${now}-${index}`);
	});

	return templateData.lines.map((line, index) => {
		const newId = idMap.get(line.tempId) ?? `imported-${now}-${index}`;

		// Map parentId to new ID
		let newParentId: string | null = null;
		if (line.parentId) {
			newParentId = idMap.get(line.parentId) ?? null;
		}

		const cartLine: QuoteLine = {
			tempId: newId,
			type: line.type,
			label: line.label,
			description: line.description ?? "",
			quantity: line.quantity,
			unitPrice: line.unitPrice,
			totalPrice: line.totalPrice,
			vatRate: line.vatRate,
			parentId: newParentId,
			sortOrder: startSortOrder + index,
			displayData: {
				label: line.displayData.label,
				quantity: line.displayData.quantity,
				unitPrice: line.displayData.unitPrice,
				vatRate: line.displayData.vatRate,
				total: line.displayData.total,
			},
			// sourceData is intentionally not set (null) for imported templates
		};

		return cartLine;
	});
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Type guard to validate that a stored template JSON object matches
 * the expected FullQuoteTemplateData structure.
 * Checks for version compatibility and essential line properties.
 *
 * @param data - The unknown data object from the database or API
 * @returns True if the data is a valid full quote template, narrowing the type.
 */
export function isValidFullQuoteTemplate(
	data: unknown,
): data is FullQuoteTemplateData {
	if (!data || typeof data !== "object") return false;

	const obj = data as Record<string, unknown>;

	if (obj.version !== 1) return false;
	if (!Array.isArray(obj.lines)) return false;

	// Validate each line has required fields
	for (const line of obj.lines) {
		if (!line || typeof line !== "object") return false;
		const l = line as Record<string, unknown>;

		if (typeof l.tempId !== "string") return false;
		if (!["CALCULATED", "MANUAL", "GROUP"].includes(l.type as string))
			return false;
		if (typeof l.label !== "string") return false;
		if (typeof l.quantity !== "number") return false;
		if (typeof l.unitPrice !== "number") return false;
		if (typeof l.sortOrder !== "number") return false;
	}

	return true;
}
