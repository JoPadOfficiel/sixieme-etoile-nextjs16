/**
 * Invoice Line Utilities
 * Story 29.5: Extracted and exported functions for multi-mission invoicing
 * Story 29.5 Review Fix: Added i18n support for document language settings
 *
 * These functions are extracted from InvoiceFactory to enable proper unit testing.
 * They handle the deep copy of QuoteLines to InvoiceLines with enriched descriptions.
 */

import type { InvoiceLineInput } from "./invoice-line-builder";

// ============================================================================
// Types
// ============================================================================

export type DocumentLanguage = "FRENCH" | "ENGLISH" | "BILINGUAL";

export interface QuoteLineForDeepCopy {
	id: string;
	label: string;
	description: string | null;
	quantity: { toString(): string } | number;
	unitPrice: { toString(): string } | number;
	totalPrice: { toString(): string } | number;
	vatRate: { toString(): string } | number;
	type: string;
	sortOrder: number;
	sourceData?: unknown;
	displayData?: unknown;
}

export interface EnrichedDescriptionOptions {
	locale?: string;
	timezone?: string;
	/** Document language for i18n labels (defaults to FRENCH for backward compatibility) */
	documentLanguage?: DocumentLanguage;
}

// ============================================================================
// i18n Labels
// ============================================================================

/**
 * Localized trip type labels by language
 */
export const TRIP_TYPE_LABELS_I18N: Record<
	DocumentLanguage,
	Record<string, string>
> = {
	FRENCH: {
		TRANSFER: "Transfert",
		DISPO: "Mise à disposition",
		EXCURSION: "Excursion",
		STAY: "Séjour",
		CALCULATED: "Transfert",
		MANUAL: "Service",
		OPTIONAL_FEE: "Option",
		PROMOTION: "Promotion",
	},
	ENGLISH: {
		TRANSFER: "Transfer",
		DISPO: "Chauffeur Service",
		EXCURSION: "Excursion",
		STAY: "Stay",
		CALCULATED: "Transfer",
		MANUAL: "Service",
		OPTIONAL_FEE: "Option",
		PROMOTION: "Promotion",
	},
	BILINGUAL: {
		TRANSFER: "Transfert / Transfer",
		DISPO: "Mise à disposition / Chauffeur Service",
		EXCURSION: "Excursion",
		STAY: "Séjour / Stay",
		CALCULATED: "Transfert / Transfer",
		MANUAL: "Service",
		OPTIONAL_FEE: "Option",
		PROMOTION: "Promotion",
	},
};

/**
 * Localized description labels by language
 */
export const DESCRIPTION_LABELS_I18N: Record<
	DocumentLanguage,
	{
		departure: string;
		arrival: string;
		client: string;
		pax: string;
		bags: string;
	}
> = {
	FRENCH: {
		departure: "Départ",
		arrival: "Arrivée",
		client: "Client",
		pax: "pax",
		bags: "bag.",
	},
	ENGLISH: {
		departure: "Departure",
		arrival: "Arrival",
		client: "Client",
		pax: "pax",
		bags: "bags",
	},
	BILINGUAL: {
		departure: "Départ / Departure",
		arrival: "Arrivée / Arrival",
		client: "Client",
		pax: "pax",
		bags: "bag.",
	},
};

/**
 * Map trip type to display label (legacy - kept for backward compatibility)
 * @deprecated Use getTripTypeLabel() with documentLanguage instead
 */
export const TRIP_TYPE_LABELS: Record<string, string> =
	TRIP_TYPE_LABELS_I18N.FRENCH;

/**
 * Get localized trip type label
 */
export function getTripTypeLabel(
	tripType: string,
	language: DocumentLanguage = "FRENCH",
): string {
	return TRIP_TYPE_LABELS_I18N[language][tripType] || tripType;
}

/**
 * Get localized description labels
 */
export function getDescriptionLabels(language: DocumentLanguage = "FRENCH") {
	return DESCRIPTION_LABELS_I18N[language];
}

/**
 * Build enriched description with date and route from sourceData
 * Format: Multi-line with full trip details (matches buildTripDescription in invoice-line-builder.ts)
 *
 * @param line - The QuoteLine to build description for
 * @param endCustomerName - Optional end customer name to include on first line
 * @param isFirstLine - Whether this is the first line (for customer name inclusion)
 * @param options - Locale and timezone options
 * @returns Enriched description string with full trip details
 */
export function buildEnrichedDescription(
	line: {
		label: string;
		description: string | null;
		type: string;
		sourceData?: unknown;
		displayData?: unknown;
	},
	endCustomerName: string | null,
	isFirstLine: boolean,
	options: EnrichedDescriptionOptions = {},
): string {
	const { locale = "fr-FR", timezone, documentLanguage = "FRENCH" } = options;

	// Get localized labels
	const labels = getDescriptionLabels(documentLanguage);

	// Try to extract date and route from sourceData
	const sourceData = line.sourceData as Record<string, unknown> | null;
	const displayData = line.displayData as Record<string, unknown> | null;

	// Extract pickup date/time
	let pickupAt: Date | null = null;
	if (sourceData?.pickupAt) {
		pickupAt = new Date(sourceData.pickupAt as string);
	} else if (displayData?.pickupAt) {
		pickupAt = new Date(displayData.pickupAt as string);
	}

	// Extract addresses (FULL addresses, not truncated)
	const pickupAddress =
		(sourceData?.pickupAddress as string) ||
		(displayData?.pickupAddress as string) ||
		null;
	const dropoffAddress =
		(sourceData?.dropoffAddress as string) ||
		(displayData?.dropoffAddress as string) ||
		null;

	// Extract additional trip details
	const passengerCount =
		(sourceData?.passengerCount as number) ||
		(displayData?.passengerCount as number) ||
		null;
	const luggageCount =
		(sourceData?.luggageCount as number) ||
		(displayData?.luggageCount as number) ||
		null;
	const vehicleCategory =
		(sourceData?.vehicleCategory as string) ||
		(displayData?.vehicleCategory as string) ||
		null;

	// Build enriched description if we have date/route info
	if (pickupAt && !Number.isNaN(pickupAt.getTime())) {
		const dateOptions: Intl.DateTimeFormatOptions = {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			...(timezone ? { timeZone: timezone } : {}),
		};
		const timeOptions: Intl.DateTimeFormatOptions = {
			hour: "2-digit",
			minute: "2-digit",
			...(timezone ? { timeZone: timezone } : {}),
		};

		const formattedDate = pickupAt.toLocaleDateString(locale, dateOptions);
		const formattedTime = pickupAt.toLocaleTimeString(locale, timeOptions);

		// Get actual trip type from sourceData/displayData, fallback to line.type
		const tripType =
			(sourceData?.tripType as string) ||
			(displayData?.tripType as string) ||
			(line.type === "CALCULATED" ? "TRANSFER" : line.type);

		// Use localized trip type label
		const typeLabel = getTripTypeLabel(tripType, documentLanguage);

		// Build description lines (multi-line format for PDF)
		const lines: string[] = [];

		// Line 1: Type + Date/Time
		lines.push(`${typeLabel} - ${formattedDate} ${formattedTime}`);

		// Line 2: Departure address (full) - localized
		if (pickupAddress) {
			lines.push(`${labels.departure}: ${pickupAddress}`);
		}

		// Line 3: Arrival address (full) - localized
		if (dropoffAddress) {
			lines.push(`${labels.arrival}: ${dropoffAddress}`);
		}

		// Line 4: Passengers & Luggage & Vehicle (if available) - localized
		const details: string[] = [];
		if (passengerCount !== null) {
			details.push(`${passengerCount} ${labels.pax}`);
		}
		if (luggageCount !== null) {
			details.push(`${luggageCount} ${labels.bags}`);
		}
		if (vehicleCategory) {
			details.push(vehicleCategory);
		}
		if (details.length > 0) {
			lines.push(details.join(" | "));
		}

		// Line 5: End customer name (if applicable and first line) - localized
		if (endCustomerName && isFirstLine) {
			lines.push(`${labels.client}: ${endCustomerName}`);
		}

		return lines.join("\n");
	}

	// Fallback: use label + description
	let description = line.label;
	if (line.description) {
		description = `${line.label} - ${line.description}`;
	}

	// Add end customer name on first line
	if (endCustomerName && isFirstLine) {
		description += ` (${labels.client}: ${endCustomerName})`;
	}

	return description;
}

/**
 * Deep copy QuoteLines to InvoiceLines
 * This ensures AC1/AC2/AC3 compliance - complete isolation between Quote and Invoice
 *
 * @param quoteLines - Array of QuoteLines to copy
 * @param endCustomerName - Optional end customer name
 * @param options - Locale and timezone options
 * @returns Array of InvoiceLineInput objects
 */
export function deepCopyQuoteLinesToInvoiceLines(
	quoteLines: QuoteLineForDeepCopy[],
	endCustomerName: string | null,
	options: EnrichedDescriptionOptions = {},
): InvoiceLineInput[] {
	return quoteLines.map((line, index) => {
		const quantity =
			typeof line.quantity === "number"
				? line.quantity
				: Number(line.quantity.toString());
		const unitPrice =
			typeof line.unitPrice === "number"
				? line.unitPrice
				: Number(line.unitPrice.toString());
		const totalPrice =
			typeof line.totalPrice === "number"
				? line.totalPrice
				: Number(line.totalPrice.toString());
		const vatRate =
			typeof line.vatRate === "number"
				? line.vatRate
				: Number(line.vatRate.toString());

		// Calculate VAT amounts
		const totalExclVat = Math.round(totalPrice * 100) / 100;
		const totalVat = Math.round(((totalExclVat * vatRate) / 100) * 100) / 100;

		// Build enriched description with date and route
		const description = buildEnrichedDescription(
			line,
			endCustomerName,
			index === 0,
			options,
		);

		// Map QuoteLine type to InvoiceLine type
		let lineType:
			| "SERVICE"
			| "OPTIONAL_FEE"
			| "PROMOTION_ADJUSTMENT"
			| "OTHER" = "SERVICE";
		if (line.type === "OPTIONAL_FEE") {
			lineType = "OPTIONAL_FEE";
		} else if (line.type === "PROMOTION") {
			lineType = "PROMOTION_ADJUSTMENT";
		} else if (line.type === "MANUAL") {
			lineType = "OTHER";
		}

		return {
			lineType,
			description,
			quantity,
			unitPriceExclVat: unitPrice,
			vatRate,
			totalExclVat,
			totalVat,
			sortOrder: line.sortOrder ?? index,
			// Traceability link to source QuoteLine
			quoteLineId: line.id,
		};
	});
}

/**
 * Calculate invoice totals from lines
 */
export function calculateTotalsFromLines(
	lines: { totalExclVat: number; totalVat: number }[],
): { totalExclVat: number; totalVat: number; totalInclVat: number } {
	const totalExclVat = lines.reduce((sum, line) => sum + line.totalExclVat, 0);
	const totalVat = lines.reduce((sum, line) => sum + line.totalVat, 0);
	const totalInclVat = Math.round((totalExclVat + totalVat) * 100) / 100;

	return {
		totalExclVat: Math.round(totalExclVat * 100) / 100,
		totalVat: Math.round(totalVat * 100) / 100,
		totalInclVat,
	};
}
