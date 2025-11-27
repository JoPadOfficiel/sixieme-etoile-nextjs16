/**
 * PDF Generator Service
 * Story 7.5: Document Generation & Storage
 *
 * Generates PDF documents for quotes, invoices, and mission orders.
 * Uses pdf-lib for server-side PDF generation (pure JS, no DOM required).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationPdfData {
	name: string;
	address?: string | null;
	phone?: string | null;
	email?: string | null;
	siret?: string | null;
	vatNumber?: string | null;
	iban?: string | null;
	bic?: string | null;
	logo?: string | null;
}

export interface ContactPdfData {
	displayName: string;
	companyName?: string | null;
	billingAddress?: string | null;
	email?: string | null;
	phone?: string | null;
	vatNumber?: string | null;
	isPartner: boolean;
}

export interface QuotePdfData {
	id: string;
	pickupAddress: string;
	dropoffAddress: string;
	pickupAt: Date;
	passengerCount: number;
	luggageCount: number;
	vehicleCategory: string;
	finalPrice: number;
	internalCost?: number | null;
	marginPercent?: number | null;
	pricingMode: string;
	tripType: string;
	status: string;
	validUntil?: Date | null;
	notes?: string | null;
	contact: ContactPdfData;
	createdAt: Date;
}

export interface InvoiceLinePdfData {
	description: string;
	quantity: number;
	unitPriceExclVat: number;
	vatRate: number;
	totalExclVat: number;
	totalVat: number;
}

export interface InvoicePdfData {
	id: string;
	number: string;
	issueDate: Date;
	dueDate: Date;
	totalExclVat: number;
	totalVat: number;
	totalInclVat: number;
	commissionAmount?: number | null;
	notes?: string | null;
	contact: ContactPdfData;
	lines: InvoiceLinePdfData[];
	paymentTerms?: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPrice(amount: number): string {
	// Use ASCII-safe format for pdf-lib compatibility
	return `${amount.toFixed(2).replace(".", ",")} EUR`;
}

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
}

function formatDateTime(date: Date): string {
	return new Intl.DateTimeFormat("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

/**
 * Sanitize text for PDF rendering (remove non-ASCII characters)
 * pdf-lib only supports WinAnsi encoding (basic Latin characters)
 */
function sanitizeText(text: string): string {
	return text
		.replace(/→/g, "->")
		.replace(/←/g, "<-")
		.replace(/€/g, "EUR")
		.replace(/[éèêë]/g, "e")
		.replace(/[àâä]/g, "a")
		.replace(/[ùûü]/g, "u")
		.replace(/[îï]/g, "i")
		.replace(/[ôö]/g, "o")
		.replace(/ç/g, "c")
		.replace(/[ÉÈÊË]/g, "E")
		.replace(/[ÀÂÄÃ]/g, "A")
		.replace(/[ÙÛÜ]/g, "U")
		.replace(/[ÎÏ]/g, "I")
		.replace(/[ÔÖ]/g, "O")
		.replace(/Ç/g, "C")
		.replace(/[^\x00-\x7F]/g, ""); // Remove any remaining non-ASCII
}

// Colors
const BLUE = rgb(0.145, 0.388, 0.922);
const GREEN = rgb(0.086, 0.639, 0.290);
const GRAY = rgb(0.4, 0.4, 0.4);
const DARK = rgb(0.216, 0.255, 0.318);
const BLACK = rgb(0, 0, 0);

// ============================================================================
// Quote PDF Generator
// ============================================================================

export async function generateQuotePdf(
	quote: QuotePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595, 842]); // A4
	const { width, height } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	let y = height - 50;
	const leftMargin = 50;
	const rightMargin = width - 50;

	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	// Header - Organization name
	draw(organization.name, {
		x: leftMargin,
		y,
		size: 20,
		font: helveticaBold,
		color: BLACK,
	});
	y -= 20;

	// Organization details
	if (organization.address) {
		draw(organization.address, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.phone) {
		draw(`Tel: ${organization.phone}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.email) {
		draw(organization.email, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.siret) {
		draw(`SIRET: ${organization.siret}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}

	// Document title
	y -= 20;
	draw("DEVIS", {
		x: leftMargin,
		y,
		size: 18,
		font: helveticaBold,
		color: BLUE,
	});

	// Reference and date on the right
	const refText = `Ref: ${quote.id.slice(-8).toUpperCase()}`;
	const dateText = `Date: ${formatDate(quote.createdAt)}`;
	draw(refText, { x: rightMargin - 100, y: y + 10, size: 10, font: helvetica, color: GRAY });
	draw(dateText, { x: rightMargin - 100, y: y - 4, size: 10, font: helvetica, color: GRAY });
	if (quote.validUntil) {
		draw(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, {
			x: rightMargin - 100, y: y - 18, size: 10, font: helvetica, color: GRAY
		});
	}

	// Client section
	y -= 40;
	draw("Client", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
	y -= 16;
	draw(quote.contact.displayName, { x: leftMargin, y, size: 11, font: helveticaBold, color: BLACK });
	y -= 14;
	if (quote.contact.companyName) {
		draw(quote.contact.companyName, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (quote.contact.billingAddress) {
		draw(quote.contact.billingAddress, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (quote.contact.email) {
		draw(quote.contact.email, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}

	// Trip details section
	y -= 20;
	draw("Details du trajet", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
	y -= 18;

	const tripDetails = [
		["Depart", quote.pickupAddress],
		["Arrivee", quote.dropoffAddress],
		["Date et heure", formatDateTime(quote.pickupAt)],
		["Passagers", String(quote.passengerCount)],
		["Bagages", String(quote.luggageCount)],
		["Categorie vehicule", quote.vehicleCategory],
		["Type de trajet", quote.tripType],
	];

	for (const [label, value] of tripDetails) {
		draw(label, { x: leftMargin, y, size: 10, font: helveticaBold, color: DARK });
		draw(value.substring(0, 60), { x: leftMargin + 120, y, size: 10, font: helvetica, color: BLACK });
		y -= 16;
	}

	// Pricing section
	y -= 20;
	draw("Tarification", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
	y -= 18;
	draw(
		`Mode: ${quote.pricingMode === "FIXED_GRID" ? "Grille tarifaire" : "Tarif dynamique"}`,
		{ x: leftMargin, y, size: 10, font: helvetica, color: BLACK }
	);
	y -= 20;
	draw(`Prix total TTC: ${formatPrice(quote.finalPrice)}`, {
		x: leftMargin, y, size: 14, font: helveticaBold, color: BLUE
	});

	// Notes
	if (quote.notes) {
		y -= 30;
		draw("Notes", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
		y -= 16;
		draw(quote.notes.substring(0, 100), { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
	}

	// Footer
	draw(
		"Ce devis est valable pour une duree de 30 jours a compter de sa date d'emission.",
		{ x: leftMargin, y: 50, size: 8, font: helvetica, color: GRAY }
	);
	draw(
		"Les prix indiques sont en euros TTC.",
		{ x: leftMargin, y: 38, size: 8, font: helvetica, color: GRAY }
	);

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

// ============================================================================
// Invoice PDF Generator
// ============================================================================

export async function generateInvoicePdf(
	invoice: InvoicePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([595, 842]); // A4
	const { width, height } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	let y = height - 50;
	const leftMargin = 50;
	const rightMargin = width - 50;

	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	// Header - Organization name
	draw(organization.name, {
		x: leftMargin,
		y,
		size: 20,
		font: helveticaBold,
		color: BLACK,
	});
	y -= 20;

	// Organization details
	if (organization.address) {
		draw(organization.address, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.phone) {
		draw(`Tel: ${organization.phone}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.email) {
		draw(organization.email, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.siret) {
		draw(`SIRET: ${organization.siret}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.vatNumber) {
		draw(`TVA: ${organization.vatNumber}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}

	// Document title
	y -= 20;
	draw("FACTURE", {
		x: leftMargin,
		y,
		size: 18,
		font: helveticaBold,
		color: GREEN,
	});

	// Invoice number and dates on the right
	draw(`N° ${invoice.number}`, { x: rightMargin - 100, y: y + 10, size: 10, font: helveticaBold, color: BLACK });
	draw(`Emise le: ${formatDate(invoice.issueDate)}`, { x: rightMargin - 100, y: y - 4, size: 10, font: helvetica, color: GRAY });
	draw(`Echeance: ${formatDate(invoice.dueDate)}`, { x: rightMargin - 100, y: y - 18, size: 10, font: helvetica, color: GRAY });

	// Client section
	y -= 40;
	draw("Facture a", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
	y -= 16;
	draw(invoice.contact.displayName, { x: leftMargin, y, size: 11, font: helveticaBold, color: BLACK });
	y -= 14;
	if (invoice.contact.companyName) {
		draw(invoice.contact.companyName, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (invoice.contact.billingAddress) {
		draw(invoice.contact.billingAddress, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (invoice.contact.vatNumber) {
		draw(`TVA: ${invoice.contact.vatNumber}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}

	// Line items section
	y -= 20;
	draw("Detail des prestations", { x: leftMargin, y, size: 12, font: helveticaBold, color: DARK });
	y -= 20;

	// Table header
	page.drawRectangle({
		x: leftMargin,
		y: y - 4,
		width: rightMargin - leftMargin,
		height: 18,
		color: rgb(0.95, 0.95, 0.95),
	});
	draw("Description", { x: leftMargin + 5, y, size: 9, font: helveticaBold, color: DARK });
	draw("Qte", { x: 300, y, size: 9, font: helveticaBold, color: DARK });
	draw("Prix HT", { x: 340, y, size: 9, font: helveticaBold, color: DARK });
	draw("TVA", { x: 400, y, size: 9, font: helveticaBold, color: DARK });
	draw("Total HT", { x: 450, y, size: 9, font: helveticaBold, color: DARK });
	y -= 20;

	// Table rows
	for (const line of invoice.lines) {
		draw(line.description.substring(0, 40), { x: leftMargin + 5, y, size: 9, font: helvetica, color: BLACK });
		draw(String(line.quantity), { x: 300, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.unitPriceExclVat), { x: 340, y, size: 9, font: helvetica, color: BLACK });
		draw(`${line.vatRate}%`, { x: 400, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.totalExclVat), { x: 450, y, size: 9, font: helvetica, color: BLACK });
		y -= 16;
	}

	// Totals
	y -= 20;
	const totalsX = 380;
	draw("Total HT:", { x: totalsX, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalExclVat), { x: totalsX + 70, y, size: 10, font: helvetica, color: BLACK });
	y -= 16;
	draw("TVA:", { x: totalsX, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalVat), { x: totalsX + 70, y, size: 10, font: helvetica, color: BLACK });
	y -= 16;
	page.drawRectangle({
		x: totalsX - 5,
		y: y - 4,
		width: 130,
		height: 18,
		color: rgb(0.95, 0.95, 0.95),
	});
	draw("Total TTC:", { x: totalsX, y, size: 10, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalInclVat), { x: totalsX + 70, y, size: 12, font: helveticaBold, color: BLACK });

	// Commission info for partners
	if (invoice.commissionAmount && invoice.commissionAmount > 0) {
		y -= 30;
		draw(`Commission partenaire: ${formatPrice(invoice.commissionAmount)}`, {
			x: leftMargin, y, size: 10, font: helveticaBold, color: rgb(0.976, 0.451, 0.086)
		});
		y -= 14;
		draw(`Montant net: ${formatPrice(invoice.totalExclVat - invoice.commissionAmount)}`, {
			x: leftMargin, y, size: 10, font: helvetica, color: GRAY
		});
	}

	// Notes
	if (invoice.notes) {
		y -= 30;
		draw("Notes", { x: leftMargin, y, size: 10, font: helveticaBold, color: DARK });
		y -= 14;
		draw(invoice.notes.substring(0, 100), { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
	}

	// Payment info
	y -= 30;
	draw("Informations de paiement", { x: leftMargin, y, size: 10, font: helveticaBold, color: DARK });
	y -= 14;
	if (invoice.paymentTerms) {
		draw(`Conditions: ${invoice.paymentTerms}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.iban) {
		draw(`IBAN: ${organization.iban}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.bic) {
		draw(`BIC: ${organization.bic}`, { x: leftMargin, y, size: 10, font: helvetica, color: GRAY });
	}

	// Footer
	draw(
		"En cas de retard de paiement, des penalites de retard seront appliquees au taux legal en vigueur.",
		{ x: leftMargin, y: 50, size: 8, font: helvetica, color: GRAY }
	);
	draw(
		"Une indemnite forfaitaire de 40EUR pour frais de recouvrement sera egalement due.",
		{ x: leftMargin, y: 38, size: 8, font: helvetica, color: GRAY }
	);

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

// ============================================================================
// Exports
// ============================================================================

export type DocumentType = "QUOTE_PDF" | "INVOICE_PDF" | "MISSION_ORDER";

export interface GeneratePdfOptions {
	type: DocumentType;
	data: QuotePdfData | InvoicePdfData;
	organization: OrganizationPdfData;
}

export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
	const { type, data, organization } = options;

	switch (type) {
		case "QUOTE_PDF":
			return generateQuotePdf(data as QuotePdfData, organization);
		case "INVOICE_PDF":
			return generateInvoicePdf(data as InvoicePdfData, organization);
		case "MISSION_ORDER":
			// TODO: Implement mission order PDF
			throw new Error("Mission order PDF not yet implemented");
		default:
			throw new Error(`Unknown document type: ${type}`);
	}
}
