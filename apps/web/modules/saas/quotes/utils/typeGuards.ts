import type { QuoteLine } from "../components/yolo/dnd-utils";
import type { DisplayData } from "../components/yolo/UniversalLineItemRow";

/**
 * Type guard functions for safe type checking
 */

export function isValidQuoteLine(obj: unknown): obj is QuoteLine {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'id' in obj &&
		'type' in obj &&
		'label' in obj &&
		'quantity' in obj &&
		'unitPrice' in obj &&
		'totalPrice' in obj &&
		'vatRate' in obj
	);
}

export function isValidDisplayData(obj: unknown): obj is DisplayData {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'label' in obj &&
		'quantity' in obj &&
		'unitPrice' in obj &&
		'vatRate' in obj &&
		'total' in obj
	);
}

export function sanitizeString(value: unknown): string {
	if (typeof value === 'string') {
		// Basic XSS prevention - remove HTML tags and special characters
		return value
			.replace(/<[^>]*>/g, '') // Remove HTML tags
			.replace(/[<>'"&]/g, '') // Remove dangerous characters
			.trim();
	}
	return '';
}

export function sanitizeNumber(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}
	if (typeof value === 'string') {
		const num = parseFloat(value);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}
