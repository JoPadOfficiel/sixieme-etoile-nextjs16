/**
 * Document Types
 * Story 7.5: Document Generation & Storage
 */

export interface DocumentType {
	id: string;
	code: string;
	name: string;
	description: string | null;
}

export interface Document {
	id: string;
	organizationId: string;
	documentTypeId: string;
	documentType: DocumentType;
	quoteId: string | null;
	invoiceId: string | null;
	storagePath: string | null;
	url: string | null;
	filename?: string | null;
	createdAt: string;
	invoice?: {
		id: string;
		number: string;
		contact: {
			displayName: string;
		};
	} | null;
}

export interface DocumentsListResponse {
	data: Document[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface DocumentFilters {
	type?: string;
	quoteId?: string;
	invoiceId?: string;
	search?: string;
	dateFrom?: string;
	dateTo?: string;
	page?: number;
	limit?: number;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(dateString));
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(code: string): string {
	switch (code) {
		case "QUOTE_PDF":
			return "Devis PDF";
		case "INVOICE_PDF":
			return "Facture PDF";
		case "MISSION_ORDER":
			return "Ordre de mission";
		default:
			return code;
	}
}

/**
 * Get document type badge variant
 */
export function getDocumentTypeBadgeVariant(
	code: string
): "default" | "secondary" | "outline" {
	switch (code) {
		case "QUOTE_PDF":
			return "secondary";
		case "INVOICE_PDF":
			return "default";
		case "MISSION_ORDER":
			return "outline";
		default:
			return "outline";
	}
}
