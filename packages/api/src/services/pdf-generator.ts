/**
 * PDF Generator Service
 * Story 7.5: Document Generation & Storage
 *
 * Generates PDF documents for quotes, invoices, and mission orders.
 * Uses jsPDF for server-side PDF generation.
 */

import { jsPDF } from "jspdf";

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
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(amount);
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

// ============================================================================
// Quote PDF Generator
// ============================================================================

export function generateQuotePdf(
	quote: QuotePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	let y = 20;

	// Header - Organization name
	doc.setFontSize(20);
	doc.setFont("helvetica", "bold");
	doc.text(organization.name, 20, y);
	y += 8;

	// Organization details
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	if (organization.address) {
		doc.text(organization.address, 20, y);
		y += 5;
	}
	if (organization.phone) {
		doc.text(`Tél: ${organization.phone}`, 20, y);
		y += 5;
	}
	if (organization.email) {
		doc.text(organization.email, 20, y);
		y += 5;
	}
	if (organization.siret) {
		doc.text(`SIRET: ${organization.siret}`, 20, y);
		y += 5;
	}

	// Document title
	y += 10;
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(37, 99, 235); // Blue
	doc.text("DEVIS", 20, y);

	// Reference and date on the right
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(`Réf: ${quote.id.slice(-8).toUpperCase()}`, pageWidth - 60, y - 5);
	doc.text(`Date: ${formatDate(quote.createdAt)}`, pageWidth - 60, y);
	if (quote.validUntil) {
		doc.text(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, pageWidth - 60, y + 5);
	}

	// Client section
	y += 15;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Client", 20, y);
	y += 6;

	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(0, 0, 0);
	doc.text(quote.contact.displayName, 20, y);
	y += 5;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	if (quote.contact.companyName) {
		doc.text(quote.contact.companyName, 20, y);
		y += 5;
	}
	if (quote.contact.billingAddress) {
		doc.text(quote.contact.billingAddress, 20, y);
		y += 5;
	}
	if (quote.contact.email) {
		doc.text(quote.contact.email, 20, y);
		y += 5;
	}

	// Trip details section
	y += 10;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Détails du trajet", 20, y);
	y += 8;

	// Trip details table
	const tripDetails = [
		["Départ", quote.pickupAddress],
		["Arrivée", quote.dropoffAddress],
		["Date et heure", formatDateTime(quote.pickupAt)],
		["Passagers", String(quote.passengerCount)],
		["Bagages", String(quote.luggageCount)],
		["Catégorie véhicule", quote.vehicleCategory],
		["Type de trajet", quote.tripType],
	];

	doc.setFontSize(10);
	for (const [label, value] of tripDetails) {
		doc.setFont("helvetica", "bold");
		doc.setTextColor(55, 65, 81);
		doc.text(label, 20, y);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(0, 0, 0);
		doc.text(value, 70, y);
		y += 6;
	}

	// Pricing section
	y += 10;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Tarification", 20, y);
	y += 8;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(0, 0, 0);
	doc.text(
		`Mode: ${quote.pricingMode === "FIXED_GRID" ? "Grille tarifaire" : "Tarif dynamique"}`,
		20,
		y
	);
	y += 8;

	doc.setFontSize(14);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(37, 99, 235);
	doc.text(`Prix total TTC: ${formatPrice(quote.finalPrice)}`, 20, y);

	// Notes
	if (quote.notes) {
		y += 15;
		doc.setFontSize(12);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(55, 65, 81);
		doc.text("Notes", 20, y);
		y += 6;
		doc.setFontSize(10);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(quote.notes, 20, y);
	}

	// Footer
	y = doc.internal.pageSize.getHeight() - 30;
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(
		"Ce devis est valable pour une durée de 30 jours à compter de sa date d'émission.",
		20,
		y
	);
	doc.text("Les prix indiqués sont en euros TTC.", 20, y + 4);

	// Return as Buffer
	const arrayBuffer = doc.output("arraybuffer");
	return Promise.resolve(Buffer.from(arrayBuffer));
}

// ============================================================================
// Invoice PDF Generator
// ============================================================================

export function generateInvoicePdf(
	invoice: InvoicePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const doc = new jsPDF();
	const pageWidth = doc.internal.pageSize.getWidth();
	let y = 20;

	// Header - Organization name
	doc.setFontSize(20);
	doc.setFont("helvetica", "bold");
	doc.text(organization.name, 20, y);
	y += 8;

	// Organization details
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	if (organization.address) {
		doc.text(organization.address, 20, y);
		y += 5;
	}
	if (organization.phone) {
		doc.text(`Tél: ${organization.phone}`, 20, y);
		y += 5;
	}
	if (organization.email) {
		doc.text(organization.email, 20, y);
		y += 5;
	}
	if (organization.siret) {
		doc.text(`SIRET: ${organization.siret}`, 20, y);
		y += 5;
	}
	if (organization.vatNumber) {
		doc.text(`TVA: ${organization.vatNumber}`, 20, y);
		y += 5;
	}

	// Document title
	y += 10;
	doc.setFontSize(18);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(22, 163, 74); // Green
	doc.text("FACTURE", 20, y);

	// Invoice number and dates on the right
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(0, 0, 0);
	doc.text(`N° ${invoice.number}`, pageWidth - 60, y - 5);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(`Émise le: ${formatDate(invoice.issueDate)}`, pageWidth - 60, y);
	doc.text(`Échéance: ${formatDate(invoice.dueDate)}`, pageWidth - 60, y + 5);

	// Client section
	y += 15;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Facturé à", 20, y);
	y += 6;

	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(0, 0, 0);
	doc.text(invoice.contact.displayName, 20, y);
	y += 5;

	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	if (invoice.contact.companyName) {
		doc.text(invoice.contact.companyName, 20, y);
		y += 5;
	}
	if (invoice.contact.billingAddress) {
		doc.text(invoice.contact.billingAddress, 20, y);
		y += 5;
	}
	if (invoice.contact.vatNumber) {
		doc.text(`TVA: ${invoice.contact.vatNumber}`, 20, y);
		y += 5;
	}

	// Line items section
	y += 10;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Détail des prestations", 20, y);
	y += 8;

	// Table header
	doc.setFillColor(243, 244, 246);
	doc.rect(20, y - 4, pageWidth - 40, 8, "F");
	doc.setFontSize(9);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Description", 22, y);
	doc.text("Qté", 100, y);
	doc.text("Prix HT", 115, y);
	doc.text("TVA", 140, y);
	doc.text("Total HT", 160, y);
	y += 8;

	// Table rows
	doc.setFont("helvetica", "normal");
	doc.setTextColor(0, 0, 0);
	for (const line of invoice.lines) {
		doc.text(line.description.substring(0, 40), 22, y);
		doc.text(String(line.quantity), 100, y);
		doc.text(formatPrice(line.unitPriceExclVat), 115, y);
		doc.text(`${line.vatRate}%`, 140, y);
		doc.text(formatPrice(line.totalExclVat), 160, y);
		y += 6;
	}

	// Totals
	y += 10;
	const totalsX = pageWidth - 80;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text("Total HT:", totalsX, y);
	doc.text(formatPrice(invoice.totalExclVat), totalsX + 40, y);
	y += 6;
	doc.text("TVA:", totalsX, y);
	doc.text(formatPrice(invoice.totalVat), totalsX + 40, y);
	y += 6;
	doc.setFillColor(243, 244, 246);
	doc.rect(totalsX - 5, y - 4, 65, 8, "F");
	doc.setFont("helvetica", "bold");
	doc.text("Total TTC:", totalsX, y);
	doc.setFontSize(12);
	doc.text(formatPrice(invoice.totalInclVat), totalsX + 40, y);

	// Commission info for partners
	if (invoice.commissionAmount && invoice.commissionAmount > 0) {
		y += 15;
		doc.setFontSize(10);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(249, 115, 22); // Orange
		doc.text(`Commission partenaire: ${formatPrice(invoice.commissionAmount)}`, 20, y);
		y += 5;
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(
			`Montant net: ${formatPrice(invoice.totalExclVat - invoice.commissionAmount)}`,
			20,
			y
		);
	}

	// Notes
	if (invoice.notes) {
		y += 15;
		doc.setFontSize(10);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(55, 65, 81);
		doc.text("Notes", 20, y);
		y += 5;
		doc.setFont("helvetica", "normal");
		doc.setTextColor(100, 100, 100);
		doc.text(invoice.notes, 20, y);
	}

	// Payment info
	y += 15;
	doc.setFontSize(10);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(55, 65, 81);
	doc.text("Informations de paiement", 20, y);
	y += 5;
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	if (invoice.paymentTerms) {
		doc.text(`Conditions: ${invoice.paymentTerms}`, 20, y);
		y += 5;
	}
	if (organization.iban) {
		doc.text(`IBAN: ${organization.iban}`, 20, y);
		y += 5;
	}
	if (organization.bic) {
		doc.text(`BIC: ${organization.bic}`, 20, y);
	}

	// Footer
	y = doc.internal.pageSize.getHeight() - 25;
	doc.setFontSize(8);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100, 100, 100);
	doc.text(
		"En cas de retard de paiement, des pénalités de retard seront appliquées au taux légal en vigueur.",
		20,
		y
	);
	doc.text(
		"Une indemnité forfaitaire de 40€ pour frais de recouvrement sera également due.",
		20,
		y + 4
	);

	// Return as Buffer
	const arrayBuffer = doc.output("arraybuffer");
	return Promise.resolve(Buffer.from(arrayBuffer));
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
