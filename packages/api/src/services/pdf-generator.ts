/**
 * PDF Generator Service
 * Story 7.5: Document Generation & Storage
 * Story 25.2: EU-Compliant Invoice & Quote PDF Layout
 * Story 25.3: Organization Document Personalization
 *
 * Generates PDF documents for quotes, invoices, and mission orders.
 * Uses pdf-lib for server-side PDF generation (pure JS, no DOM required).
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, PDFImage } from "pdf-lib";

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
	// Story 25.3: Branding settings
	documentLogoUrl?: string | null;
	brandColor?: string | null;
	logoPosition?: "LEFT" | "RIGHT";
	showCompanyName?: boolean;
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
	// Story 24.5: EndCustomer for partner agency sub-contacts
	endCustomer?: {
		firstName: string;
		lastName: string;
		email?: string | null;
		phone?: string | null;
	} | null;
	// Story 25.2: Trip Details for EU compliance
	estimatedDistanceKm?: number | null;
	estimatedDurationMins?: number | null;
}

export interface MissionOrderPdfData extends QuotePdfData {
	driverName: string;
	vehicleName: string;
	vehiclePlate?: string | null;
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
	// Story 24.6: EndCustomer for partner agency invoices
	endCustomer?: {
		firstName: string;
		lastName: string;
		email?: string | null;
		phone?: string | null;
	} | null;
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

/**
 * Story 25.2: Convert HEX color to RGB for pdf-lib
 */
function hexToRgb(hex: string | null | undefined): { r: number; g: number; b: number } {
	if (!hex) {
		return { r: 0.145, g: 0.388, b: 0.922 }; // Default blue
	}
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16) / 255,
				g: parseInt(result[2], 16) / 255,
				b: parseInt(result[3], 16) / 255,
			}
		: { r: 0.145, g: 0.388, b: 0.922 };
}

/**
 * Story 25.2: Embed logo image from URL
 */
async function embedLogoIfAvailable(
	pdfDoc: PDFDocument,
	logoUrl: string | null | undefined
): Promise<PDFImage | null> {
	if (!logoUrl) return null;
	try {
		const response = await fetch(logoUrl);
		if (!response.ok) return null;
		const imageBytes = await response.arrayBuffer();

		// Detect image type and embed
		if (logoUrl.toLowerCase().endsWith(".png")) {
			return await pdfDoc.embedPng(imageBytes);
		} else {
			return await pdfDoc.embedJpg(imageBytes);
		}
	} catch (error) {
		console.error("Failed to embed logo:", error);
		return null;
	}
}

// Default Colors
const DEFAULT_BLUE = rgb(0.145, 0.388, 0.922);
const GREEN = rgb(0.086, 0.639, 0.290);
const GRAY = rgb(0.4, 0.4, 0.4);
const DARK = rgb(0.216, 0.255, 0.318);
const BLACK = rgb(0, 0, 0);
const LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
const ORANGE = rgb(0.976, 0.451, 0.086);

// ============================================================================
// PDF Layout Constants - Story 25.2
// ============================================================================

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842; // A4
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 545; // PAGE_WIDTH - 50
const CONTENT_WIDTH = 495; // RIGHT_MARGIN - LEFT_MARGIN

// Column positions for pricing table
const COL_DESC = LEFT_MARGIN + 5;
const COL_QTY = 300;
const COL_PRICE = 345;
const COL_VAT = 410;
const COL_TOTAL = 470;

// ============================================================================
// Quote PDF Generator - Story 25.2 Refactored
// ============================================================================

export async function generateQuotePdf(
	quote: QuotePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const { height } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Story 25.3: Get branding settings
	const logoPosition = organization.logoPosition ?? "LEFT";
	const showCompanyName = organization.showCompanyName ?? true;
	const brandColorRgb = hexToRgb(organization.brandColor);
	const brandColor = rgb(brandColorRgb.r, brandColorRgb.g, brandColorRgb.b);

	// Story 25.2: Embed logo if available
	const logoImage = await embedLogoIfAvailable(
		pdfDoc,
		organization.documentLogoUrl ?? organization.logo
	);

	let y = height - 50;

	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	// =========================================================================
	// HEADER SECTION - Story 25.2: Dynamic Logo Positioning
	// =========================================================================
	
	const headerY = y;
	const logoMaxHeight = 50;
	const logoMaxWidth = 120;

	if (logoPosition === "LEFT") {
		// Logo on LEFT, Document Info on RIGHT
		if (logoImage) {
			const logoDims = logoImage.scale(
				Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height)
			);
			page.drawImage(logoImage, {
				x: LEFT_MARGIN,
				y: headerY - logoDims.height + 20,
				width: logoDims.width,
				height: logoDims.height,
			});
			if (showCompanyName) {
				draw(organization.name, {
					x: LEFT_MARGIN + logoDims.width + 10,
					y: headerY,
					size: 14,
					font: helveticaBold,
					color: BLACK,
				});
			}
		} else {
			// No logo - just company name
			draw(organization.name, {
				x: LEFT_MARGIN,
				y: headerY,
				size: 18,
				font: helveticaBold,
				color: BLACK,
			});
		}

		// Document title on RIGHT
		draw("DEVIS", {
			x: RIGHT_MARGIN - 80,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: brandColor,
		});
		draw(`Ref: ${quote.id.slice(-8).toUpperCase()}`, {
			x: RIGHT_MARGIN - 100,
			y: headerY - 18,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`Date: ${formatDate(quote.createdAt)}`, {
			x: RIGHT_MARGIN - 100,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		if (quote.validUntil) {
			draw(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, {
				x: RIGHT_MARGIN - 100,
				y: headerY - 46,
				size: 10,
				font: helvetica,
				color: GRAY,
			});
		}
	} else {
		// Logo on RIGHT, Document Info on LEFT
		draw("DEVIS", {
			x: LEFT_MARGIN,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: brandColor,
		});
		draw(`Ref: ${quote.id.slice(-8).toUpperCase()}`, {
			x: LEFT_MARGIN,
			y: headerY - 18,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`Date: ${formatDate(quote.createdAt)}`, {
			x: LEFT_MARGIN,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		if (quote.validUntil) {
			draw(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, {
				x: LEFT_MARGIN,
				y: headerY - 46,
				size: 10,
				font: helvetica,
				color: GRAY,
			});
		}

		if (logoImage) {
			const logoDims = logoImage.scale(
				Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height)
			);
			page.drawImage(logoImage, {
				x: RIGHT_MARGIN - logoDims.width,
				y: headerY - logoDims.height + 20,
				width: logoDims.width,
				height: logoDims.height,
			});
			if (showCompanyName) {
				draw(organization.name, {
					x: RIGHT_MARGIN - logoDims.width - 10 - helveticaBold.widthOfTextAtSize(organization.name, 14),
					y: headerY,
					size: 14,
					font: helveticaBold,
					color: BLACK,
				});
			}
		} else {
			draw(organization.name, {
				x: RIGHT_MARGIN - helveticaBold.widthOfTextAtSize(organization.name, 18),
				y: headerY,
				size: 18,
				font: helveticaBold,
				color: BLACK,
			});
		}
	}

	y = headerY - 70;

	// =========================================================================
	// FROM / BILL TO BLOCKS - Story 25.2: EU-Compliant Layout
	// =========================================================================

	const blockY = y;
	const blockWidth = 230;
	const lineHeight = 14;

	// FROM Block (Left side)
	draw("DE / FROM:", { x: LEFT_MARGIN, y: blockY, size: 10, font: helveticaBold, color: DARK });
	let fromY = blockY - 16;
	draw(organization.name, { x: LEFT_MARGIN, y: fromY, size: 10, font: helveticaBold, color: BLACK });
	fromY -= lineHeight;
	if (organization.address) {
		draw(organization.address.substring(0, 45), { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.phone) {
		draw(`Tel: ${organization.phone}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.email) {
		draw(organization.email, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.siret) {
		draw(`SIRET: ${organization.siret}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.vatNumber) {
		draw(`TVA: ${organization.vatNumber}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
	}

	// BILL TO Block (Right side)
	const rightBlockX = LEFT_MARGIN + blockWidth + 30;
	draw("A / BILL TO:", { x: rightBlockX, y: blockY, size: 10, font: helveticaBold, color: DARK });
	let toY = blockY - 16;

	if (quote.endCustomer) {
		// EndCustomer exists: show as primary recipient
		const endCustomerName = `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`;
		draw(endCustomerName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
		toY -= lineHeight;
		if (quote.endCustomer.email) {
			draw(quote.endCustomer.email, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (quote.endCustomer.phone) {
			draw(`Tel: ${quote.endCustomer.phone}`, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		// Show agency as billed-to
		toY -= 6;
		draw("Facture a:", { x: rightBlockX, y: toY, size: 9, font: helveticaBold, color: DARK });
		toY -= lineHeight;
		draw(quote.contact.displayName, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= lineHeight;
	} else {
		draw(quote.contact.displayName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
		toY -= lineHeight;
		if (quote.contact.companyName) {
			draw(quote.contact.companyName.substring(0, 35), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (quote.contact.billingAddress) {
			draw(quote.contact.billingAddress.substring(0, 40), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (quote.contact.email) {
			draw(quote.contact.email, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (quote.contact.vatNumber) {
			draw(`TVA: ${quote.contact.vatNumber}`, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
		}
	}

	y = Math.min(fromY, toY) - 20;

	// =========================================================================
	// TRIP DETAILS SECTION - Story 25.2
	// =========================================================================

	draw("DETAILS DU TRAJET / TRIP DETAILS", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;

	const tripDetails = [
		["Depart / From", quote.pickupAddress.substring(0, 55)],
		["Arrivee / To", quote.dropoffAddress.substring(0, 55)],
		["Date et heure / Date & Time", formatDateTime(quote.pickupAt)],
		["Passagers / Passengers", String(quote.passengerCount)],
		["Bagages / Luggage", String(quote.luggageCount)],
		["Categorie vehicule / Vehicle", quote.vehicleCategory],
		["Type de trajet / Trip type", quote.tripType],
	];

	// Story 25.2: Add estimated distance and duration if available
	if (quote.estimatedDistanceKm) {
		tripDetails.push(["Distance estimee / Est. Distance", `${quote.estimatedDistanceKm.toFixed(1)} km`]);
	}
	if (quote.estimatedDurationMins) {
		const hours = Math.floor(quote.estimatedDurationMins / 60);
		const mins = quote.estimatedDurationMins % 60;
		const durationStr = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;
		tripDetails.push(["Duree estimee / Est. Duration", durationStr]);
	}

	for (const [label, value] of tripDetails) {
		draw(label, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
		draw(value, { x: LEFT_MARGIN + 160, y, size: 9, font: helvetica, color: BLACK });
		y -= 14;
	}

	// =========================================================================
	// PRICING SECTION
	// =========================================================================

	y -= 15;
	draw("TARIFICATION / PRICING", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;

	// Pricing mode
	const pricingModeText = quote.pricingMode === "FIXED_GRID" ? "Grille tarifaire / Fixed Grid" : "Tarif dynamique / Dynamic";
	draw(`Mode: ${pricingModeText}`, { x: LEFT_MARGIN, y, size: 10, font: helvetica, color: BLACK });
	y -= 25;

	// Total price box
	page.drawRectangle({
		x: LEFT_MARGIN,
		y: y - 4,
		width: 200,
		height: 24,
		color: LIGHT_GRAY,
	});
	draw("PRIX TOTAL TTC / TOTAL INCL. VAT:", { x: LEFT_MARGIN + 5, y, size: 10, font: helveticaBold, color: DARK });
	draw(formatPrice(quote.finalPrice), { x: LEFT_MARGIN + 5, y: y - 14, size: 14, font: helveticaBold, color: brandColor });

	y -= 40;

	// Notes section
	if (quote.notes) {
		draw("NOTES", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
		y -= 14;
		draw(quote.notes.substring(0, 100), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 20;
	}

	// =========================================================================
	// FOOTER - Story 25.2: Legal Mentions
	// =========================================================================

	const footerY = 70;
	
	// Acceptance block
	draw("BON POUR ACCORD / ACCEPTANCE", { x: LEFT_MARGIN, y: footerY + 40, size: 9, font: helveticaBold, color: DARK });
	page.drawRectangle({
		x: LEFT_MARGIN,
		y: footerY + 15,
		width: 200,
		height: 20,
		borderColor: GRAY,
		borderWidth: 0.5,
	});
	draw("Signature:", { x: LEFT_MARGIN + 5, y: footerY + 22, size: 8, font: helvetica, color: GRAY });

	// Legal mentions
	draw(
		"Ce devis est valable pour une duree de 30 jours a compter de sa date d'emission.",
		{ x: LEFT_MARGIN, y: footerY, size: 8, font: helvetica, color: GRAY }
	);
	draw(
		"Les prix indiques sont en euros TTC. / Prices are in EUR including VAT.",
		{ x: LEFT_MARGIN, y: footerY - 12, size: 8, font: helvetica, color: GRAY }
	);

	// Page number
	draw("Page 1 / 1", { x: RIGHT_MARGIN - 50, y: footerY - 12, size: 8, font: helvetica, color: GRAY });

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

// ============================================================================
// Invoice PDF Generator - Story 25.2 Refactored
// ============================================================================

export async function generateInvoicePdf(
	invoice: InvoicePdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const { height } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Story 25.3: Get branding settings
	const logoPosition = organization.logoPosition ?? "LEFT";
	const showCompanyName = organization.showCompanyName ?? true;
	const brandColorRgb = hexToRgb(organization.brandColor);
	const brandColor = rgb(brandColorRgb.r, brandColorRgb.g, brandColorRgb.b);

	// Story 25.2: Embed logo if available
	const logoImage = await embedLogoIfAvailable(
		pdfDoc,
		organization.documentLogoUrl ?? organization.logo
	);

	let y = height - 50;

	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	// =========================================================================
	// HEADER SECTION - Story 25.2: Dynamic Logo Positioning
	// =========================================================================

	const headerY = y;
	const logoMaxHeight = 50;
	const logoMaxWidth = 120;

	if (logoPosition === "LEFT") {
		// Logo on LEFT, Document Info on RIGHT
		if (logoImage) {
			const logoDims = logoImage.scale(
				Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height)
			);
			page.drawImage(logoImage, {
				x: LEFT_MARGIN,
				y: headerY - logoDims.height + 20,
				width: logoDims.width,
				height: logoDims.height,
			});
			if (showCompanyName) {
				draw(organization.name, {
					x: LEFT_MARGIN + logoDims.width + 10,
					y: headerY,
					size: 14,
					font: helveticaBold,
					color: BLACK,
				});
			}
		} else {
			draw(organization.name, {
				x: LEFT_MARGIN,
				y: headerY,
				size: 18,
				font: helveticaBold,
				color: BLACK,
			});
		}

		// Document title on RIGHT
		draw("FACTURE", {
			x: RIGHT_MARGIN - 80,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: brandColor,
		});
		draw(`N: ${invoice.number}`, {
			x: RIGHT_MARGIN - 100,
			y: headerY - 18,
			size: 10,
			font: helveticaBold,
			color: BLACK,
		});
		draw(`Emise le: ${formatDate(invoice.issueDate)}`, {
			x: RIGHT_MARGIN - 100,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`Echeance: ${formatDate(invoice.dueDate)}`, {
			x: RIGHT_MARGIN - 100,
			y: headerY - 46,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
	} else {
		// Logo on RIGHT, Document Info on LEFT
		draw("FACTURE", {
			x: LEFT_MARGIN,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: brandColor,
		});
		draw(`N: ${invoice.number}`, {
			x: LEFT_MARGIN,
			y: headerY - 18,
			size: 10,
			font: helveticaBold,
			color: BLACK,
		});
		draw(`Emise le: ${formatDate(invoice.issueDate)}`, {
			x: LEFT_MARGIN,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`Echeance: ${formatDate(invoice.dueDate)}`, {
			x: LEFT_MARGIN,
			y: headerY - 46,
			size: 10,
			font: helvetica,
			color: GRAY,
		});

		if (logoImage) {
			const logoDims = logoImage.scale(
				Math.min(logoMaxWidth / logoImage.width, logoMaxHeight / logoImage.height)
			);
			page.drawImage(logoImage, {
				x: RIGHT_MARGIN - logoDims.width,
				y: headerY - logoDims.height + 20,
				width: logoDims.width,
				height: logoDims.height,
			});
			if (showCompanyName) {
				draw(organization.name, {
					x: RIGHT_MARGIN - logoDims.width - 10 - helveticaBold.widthOfTextAtSize(organization.name, 14),
					y: headerY,
					size: 14,
					font: helveticaBold,
					color: BLACK,
				});
			}
		} else {
			draw(organization.name, {
				x: RIGHT_MARGIN - helveticaBold.widthOfTextAtSize(organization.name, 18),
				y: headerY,
				size: 18,
				font: helveticaBold,
				color: BLACK,
			});
		}
	}

	y = headerY - 70;

	// =========================================================================
	// FROM / BILL TO BLOCKS - Story 25.2: EU-Compliant Layout
	// =========================================================================

	const blockY = y;
	const blockWidth = 230;
	const lineHeight = 14;

	// FROM Block (Left side)
	draw("DE / FROM:", { x: LEFT_MARGIN, y: blockY, size: 10, font: helveticaBold, color: DARK });
	let fromY = blockY - 16;
	draw(organization.name, { x: LEFT_MARGIN, y: fromY, size: 10, font: helveticaBold, color: BLACK });
	fromY -= lineHeight;
	if (organization.address) {
		draw(organization.address.substring(0, 45), { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.phone) {
		draw(`Tel: ${organization.phone}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.email) {
		draw(organization.email, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.siret) {
		draw(`SIRET: ${organization.siret}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
		fromY -= lineHeight;
	}
	if (organization.vatNumber) {
		draw(`TVA: ${organization.vatNumber}`, { x: LEFT_MARGIN, y: fromY, size: 9, font: helvetica, color: GRAY });
	}

	// BILL TO Block (Right side)
	const rightBlockX = LEFT_MARGIN + blockWidth + 30;
	draw("FACTURE A / BILL TO:", { x: rightBlockX, y: blockY, size: 10, font: helveticaBold, color: DARK });
	let toY = blockY - 16;

	if (invoice.endCustomer) {
		// Story 24.6: EndCustomer exists: display "Prestation pour" (Service For)
		draw(invoice.contact.displayName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
		toY -= lineHeight;
		if (invoice.contact.companyName) {
			draw(invoice.contact.companyName.substring(0, 35), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (invoice.contact.billingAddress) {
			draw(invoice.contact.billingAddress.substring(0, 40), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		// End Customer details (Service For)
		toY -= 6;
		draw("Prestation pour:", { x: rightBlockX, y: toY, size: 9, font: helveticaBold, color: DARK });
		toY -= lineHeight;
		const endCustomerName = `${invoice.endCustomer.firstName} ${invoice.endCustomer.lastName}`;
		draw(endCustomerName, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= lineHeight;
	} else {
		draw(invoice.contact.displayName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
		toY -= lineHeight;
		if (invoice.contact.companyName) {
			draw(invoice.contact.companyName.substring(0, 35), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (invoice.contact.billingAddress) {
			draw(invoice.contact.billingAddress.substring(0, 40), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
			toY -= lineHeight;
		}
		if (invoice.contact.vatNumber) {
			draw(`TVA: ${invoice.contact.vatNumber}`, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: GRAY });
		}
	}

	y = Math.min(fromY, toY) - 25;

	// =========================================================================
	// PRICING TABLE - Story 25.2: EU-Compliant Columns
	// =========================================================================

	draw("DETAIL DES PRESTATIONS / LINE ITEMS", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;

	// Table header background
	page.drawRectangle({
		x: LEFT_MARGIN,
		y: y - 4,
		width: CONTENT_WIDTH,
		height: 18,
		color: LIGHT_GRAY,
	});

	// Table header columns - Story 25.2: Description, Qty, Price HT, VAT%, Total HT
	draw("Description", { x: COL_DESC, y, size: 9, font: helveticaBold, color: DARK });
	draw("Qte", { x: COL_QTY, y, size: 9, font: helveticaBold, color: DARK });
	draw("Prix HT", { x: COL_PRICE, y, size: 9, font: helveticaBold, color: DARK });
	draw("TVA %", { x: COL_VAT, y, size: 9, font: helveticaBold, color: DARK });
	draw("Total HT", { x: COL_TOTAL, y, size: 9, font: helveticaBold, color: DARK });
	y -= 20;

	// Table rows
	for (const line of invoice.lines) {
		draw(line.description.substring(0, 40), { x: COL_DESC, y, size: 9, font: helvetica, color: BLACK });
		draw(String(line.quantity), { x: COL_QTY, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.unitPriceExclVat), { x: COL_PRICE, y, size: 9, font: helvetica, color: BLACK });
		draw(`${line.vatRate}%`, { x: COL_VAT, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.totalExclVat), { x: COL_TOTAL, y, size: 9, font: helvetica, color: BLACK });
		y -= 16;
	}

	// =========================================================================
	// TOTALS SECTION - Story 25.2
	// =========================================================================

	y -= 15;
	const totalsX = 380;

	// Subtotal
	draw("Total HT:", { x: totalsX, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalExclVat), { x: totalsX + 70, y, size: 10, font: helvetica, color: BLACK });
	y -= 16;

	// VAT
	draw("TVA:", { x: totalsX, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalVat), { x: totalsX + 70, y, size: 10, font: helvetica, color: BLACK });
	y -= 16;

	// Total TTC with highlight
	page.drawRectangle({
		x: totalsX - 5,
		y: y - 4,
		width: 140,
		height: 20,
		color: LIGHT_GRAY,
	});
	draw("Total TTC:", { x: totalsX, y, size: 10, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalInclVat), { x: totalsX + 70, y, size: 12, font: helveticaBold, color: brandColor });
	y -= 30;

	// Commission info for partners
	if (invoice.commissionAmount && invoice.commissionAmount > 0) {
		draw(`Commission partenaire: ${formatPrice(invoice.commissionAmount)}`, {
			x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: ORANGE
		});
		y -= 14;
		draw(`Montant net: ${formatPrice(invoice.totalExclVat - invoice.commissionAmount)}`, {
			x: LEFT_MARGIN, y, size: 10, font: helvetica, color: GRAY
		});
		y -= 20;
	}

	// =========================================================================
	// NOTES SECTION
	// =========================================================================

	if (invoice.notes) {
		draw("NOTES", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
		y -= 14;
		draw(invoice.notes.substring(0, 100), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 20;
	}

	// =========================================================================
	// PAYMENT INFO SECTION
	// =========================================================================

	draw("INFORMATIONS DE PAIEMENT / PAYMENT INFO", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
	y -= 14;
	if (invoice.paymentTerms) {
		draw(`Conditions: ${invoice.paymentTerms}`, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.iban) {
		draw(`IBAN: ${organization.iban}`, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 14;
	}
	if (organization.bic) {
		draw(`BIC: ${organization.bic}`, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
	}

	// =========================================================================
	// FOOTER - Story 25.2: Legal Mentions (EU/FR Compliance)
	// =========================================================================

	const footerY = 50;
	
	draw(
		"En cas de retard de paiement, des penalites de retard seront appliquees au taux legal en vigueur.",
		{ x: LEFT_MARGIN, y: footerY + 12, size: 7, font: helvetica, color: GRAY }
	);
	draw(
		"Une indemnite forfaitaire de 40 EUR pour frais de recouvrement sera egalement due.",
		{ x: LEFT_MARGIN, y: footerY, size: 7, font: helvetica, color: GRAY }
	);

	// Page number
	draw("Page 1 / 1", { x: RIGHT_MARGIN - 50, y: footerY, size: 8, font: helvetica, color: GRAY });

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

// ============================================================================
// Mission Order PDF Generator - Story 25.1
// ============================================================================

export async function generateMissionOrderPdf(
	mission: MissionOrderPdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const { height } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Branding settings
	const logoPosition = organization.logoPosition ?? "LEFT";
	const showCompanyName = organization.showCompanyName ?? true;
	const brandColorRgb = hexToRgb(organization.brandColor);
	const brandColor = rgb(brandColorRgb.r, brandColorRgb.g, brandColorRgb.b);

	const logoImage = await embedLogoIfAvailable(
		pdfDoc,
		organization.documentLogoUrl ?? organization.logo
	);

	let y = height - 50;
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	// --- Header Re-used logic ---
	const headerY = y;
	if (logoPosition === "LEFT") {
		if (logoImage) {
			const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
			page.drawImage(logoImage, { x: LEFT_MARGIN, y: headerY - logoDims.height + 20, width: logoDims.width, height: logoDims.height });
			if (showCompanyName) draw(organization.name, { x: LEFT_MARGIN + logoDims.width + 10, y: headerY, size: 14, font: helveticaBold, color: BLACK });
		} else draw(organization.name, { x: LEFT_MARGIN, y: headerY, size: 18, font: helveticaBold, color: BLACK });
		
		draw("FICHE MISSION", { x: RIGHT_MARGIN - 130, y: headerY, size: 18, font: helveticaBold, color: brandColor });
		draw(`ID: ${mission.id.slice(-8).toUpperCase()}`, { x: RIGHT_MARGIN - 130, y: headerY - 18, size: 10, font: helvetica, color: GRAY });
		draw(`Date: ${formatDate(mission.createdAt)}`, { x: RIGHT_MARGIN - 130, y: headerY - 32, size: 10, font: helvetica, color: GRAY });
	} else {
		draw("FICHE MISSION", { x: LEFT_MARGIN, y: headerY, size: 18, font: helveticaBold, color: brandColor });
		draw(`ID: ${mission.id.slice(-8).toUpperCase()}`, { x: LEFT_MARGIN, y: headerY - 18, size: 10, font: helvetica, color: GRAY });
		draw(`Date: ${formatDate(mission.createdAt)}`, { x: LEFT_MARGIN, y: headerY - 32, size: 10, font: helvetica, color: GRAY });

		if (logoImage) {
			const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
			page.drawImage(logoImage, { x: RIGHT_MARGIN - logoDims.width, y: headerY - logoDims.height + 20, width: logoDims.width, height: logoDims.height });
			if (showCompanyName) draw(organization.name, { x: RIGHT_MARGIN - logoDims.width - 10 - helveticaBold.widthOfTextAtSize(organization.name, 14), y: headerY, size: 14, font: helveticaBold, color: BLACK });
		} else draw(organization.name, { x: RIGHT_MARGIN - helveticaBold.widthOfTextAtSize(organization.name, 18), y: headerY, size: 18, font: helveticaBold, color: BLACK });
	}

	y = headerY - 80;

	// --- Mission Resume ---
	draw("RESUME MISSION", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;
	const resumeDetails = [
		["Conducteur / Driver", mission.driverName],
		["Vehicule / Vehicle", `${mission.vehicleName} ${mission.vehiclePlate ? `(${mission.vehiclePlate})` : ""}`],
		["Categorie / Category", mission.vehicleCategory],
	];
	for (const [label, value] of resumeDetails) {
		draw(label, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
		draw(value, { x: LEFT_MARGIN + 160, y, size: 9, font: helvetica, color: BLACK });
		y -= 14;
	}

	// --- Trajet ---
	y -= 10;
	draw("TRAJET / ITINERARY", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;
	const itineraryDetails = [
		["Prise en charge / Pickup", mission.pickupAddress.substring(0, 60)],
		["Destination / Dropoff", (mission.dropoffAddress || "N/A").substring(0, 60)],
		["Date et heure / Time", formatDateTime(mission.pickupAt)],
	];
	for (const [label, value] of itineraryDetails) {
		draw(label, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
		draw(value, { x: LEFT_MARGIN + 160, y, size: 9, font: helvetica, color: BLACK });
		y -= 14;
	}

	// --- Passengers ---
	y -= 10;
	draw("PASSAGERS / PASSENGERS", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 18;
	const passDetails = [
		["Nombre / Count", `${mission.passengerCount} pers. / ${mission.luggageCount} bag.`],
		["Contact", mission.endCustomer ? `${mission.endCustomer.firstName} ${mission.endCustomer.lastName}` : mission.contact.displayName],
	];
	if (mission.notes) passDetails.push(["Notes Speciales", mission.notes.substring(0, 80)]);
	
	for (const [label, value] of passDetails) {
		draw(label, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
		draw(value, { x: LEFT_MARGIN + 160, y, size: 9, font: helvetica, color: BLACK });
		y -= 14;
	}

	// --- Driver Input Area ---
	y -= 30;
	page.drawRectangle({ x: LEFT_MARGIN, y: y - 100, width: CONTENT_WIDTH, height: 110, borderColor: brandColor, borderWidth: 1 });
	draw("ZONE CONDUCTEUR (A REMPLIR) / DRIVER AREA", { x: LEFT_MARGIN + 10, y: y - 5, size: 10, font: helveticaBold, color: brandColor });
	
	let inputY = y - 25;
	draw("Kilometres DEPART: _________ km", { x: LEFT_MARGIN + 20, y: inputY, size: 10, font: helvetica, color: BLACK });
	draw("Kilometres ARRIVEE: _________ km", { x: LEFT_MARGIN + 220, y: inputY, size: 10, font: helvetica, color: BLACK });
	inputY -= 25;
	draw("Frais Peages / Tolls: _________ EUR", { x: LEFT_MARGIN + 20, y: inputY, size: 10, font: helvetica, color: BLACK });
	draw("Parking / Divers: _________ EUR", { x: LEFT_MARGIN + 220, y: inputY, size: 10, font: helvetica, color: BLACK });
	inputY -= 25;
	draw("Observations: ____________________________________________________________________", { x: LEFT_MARGIN + 20, y: inputY, size: 10, font: helvetica, color: BLACK });
	
	// Footer
	draw("Page 1 / 1", { x: RIGHT_MARGIN - 50, y: 30, size: 8, font: helvetica, color: GRAY });
	draw(`Genere par Sixieme Etoile ERP - ${new Date().toLocaleDateString()}`, { x: LEFT_MARGIN, y: 30, size: 8, font: helvetica, color: GRAY });

	const pdfBytes = await pdfDoc.save();
	return Buffer.from(pdfBytes);
}

// ============================================================================
// Exports
// ============================================================================

export type DocumentType = "QUOTE_PDF" | "INVOICE_PDF" | "MISSION_ORDER";

export interface GeneratePdfOptions {
	type: DocumentType;
	data: QuotePdfData | InvoicePdfData | MissionOrderPdfData;
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
			return generateMissionOrderPdf(data as MissionOrderPdfData, organization);
		default:
			throw new Error(`Unknown document type: ${type}`);
	}
}
