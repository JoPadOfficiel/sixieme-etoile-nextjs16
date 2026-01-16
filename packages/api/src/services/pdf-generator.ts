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
	// Extended legal info
	rcs?: string | null;
	rm?: string | null;
	ape?: string | null;
	capital?: string | null;
	licenseVtc?: string | null; // EVTC number
}

export interface ContactPdfData {
	displayName: string;
	companyName?: string | null;
	billingAddress?: string | null;
	email?: string | null;
	phone?: string | null;
	vatNumber?: string | null;
	siret?: string | null;
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
	driverPhone?: string | null;
	// Story 25.1: Second driver for RSE double crew missions
	secondDriverName?: string | null;
	secondDriverPhone?: string | null;
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
function sanitizeText(text: string | null | undefined): string {
	if (!text) return "";
	return text
		.replace(/[’‘]/g, "'") // Smart quotes
		.replace(/[“”]/g, '"') // Smart double quotes
		.replace(/–/g, "-") // En dash
		.replace(/—/g, "-") // Em dash
		.replace(/€/g, "EUR")
		// Keep printable ASCII (0x20-0x7E) and Latin-1 Supplement (0xA0-0xFF) for accents
		// Remove characters not supported by WinAnsi
		.replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, " ")
		.trim(); 
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

	// Handle relative URLs
	let fullUrl = logoUrl;
	if (logoUrl.startsWith("/")) {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		fullUrl = `${baseUrl}${logoUrl}`;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

	try {
		console.log(`Fetching logo from: ${fullUrl}`);
		const response = await fetch(fullUrl, { signal: controller.signal });
		clearTimeout(timeoutId);
		if (!response.ok) {
			console.error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
			return null;
		}
		
		const imageBytes = await response.arrayBuffer();
		const contentType = response.headers.get("content-type")?.toLowerCase();

		// Detect image type and embed
		if (contentType?.includes("png") || fullUrl.toLowerCase().endsWith(".png")) {
			return await pdfDoc.embedPng(imageBytes);
		} else if (contentType?.includes("jpg") || contentType?.includes("jpeg") || fullUrl.toLowerCase().endsWith(".jpg") || fullUrl.toLowerCase().endsWith(".jpeg")) {
			return await pdfDoc.embedJpg(imageBytes);
		} else {
			// Fallback: try PNG then JPG
			try {
				return await pdfDoc.embedPng(imageBytes);
			} catch {
				return await pdfDoc.embedJpg(imageBytes);
			}
		}
	} catch (error) {
		clearTimeout(timeoutId);
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
// PDF Layout Components - Story 25.2 Refactored
// ============================================================================

interface DrawHeaderOptions {
	page: PDFPage;
	helvetica: PDFFont;
	helveticaBold: PDFFont;
	organization: OrganizationPdfData;
	logoImage: PDFImage | null;
	title: string;
	referenceLabel: string; // e.g. "Ref:" or "ID:"
	referenceValue: string;
	dateLabel: string; // e.g. "Date:"
	dateValue: string;
	color: typeof DEFAULT_BLUE; // Use Color type if imported, else default color var logic handled inside
}

function drawHeader(options: DrawHeaderOptions): number {
	const {
		page,
		helvetica,
		helveticaBold,
		organization,
		logoImage,
		title,
		referenceLabel,
		referenceValue,
		dateLabel,
		dateValue,
		color,
	} = options;
	const { height } = page.getSize();
	const logoPosition = organization.logoPosition ?? "LEFT";
	const showCompanyName = organization.showCompanyName ?? true;

	const headerY = height - 50;
	const draw = (text: string, opts: any) => page.drawText(sanitizeText(text), opts);

	if (logoPosition === "LEFT") {
		// LOGO LEFT, INFO RIGHT
		if (logoImage) {
			const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
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

		draw(title, {
			x: RIGHT_MARGIN - helveticaBold.widthOfTextAtSize(sanitizeText(title), 18),
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: color,
		});
		draw(`${referenceLabel} ${referenceValue}`, {
			x: RIGHT_MARGIN - 130, // Approximate align right block
			y: headerY - 18,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`${dateLabel} ${dateValue}`, {
			x: RIGHT_MARGIN - 130,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
	} else {
		// LOGO RIGHT, INFO LEFT
		draw(title, {
			x: LEFT_MARGIN,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: color,
		});
		draw(`${referenceLabel} ${referenceValue}`, {
			x: LEFT_MARGIN,
			y: headerY - 18,
			size: 10,
			font: helvetica,
			color: GRAY,
		});
		draw(`${dateLabel} ${dateValue}`, {
			x: LEFT_MARGIN,
			y: headerY - 32,
			size: 10,
			font: helvetica,
			color: GRAY,
		});

		if (logoImage) {
			const logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
			page.drawImage(logoImage, {
				x: RIGHT_MARGIN - logoDims.width,
				y: headerY - logoDims.height + 20,
				width: logoDims.width,
				height: logoDims.height,
			});
			if (showCompanyName) {
				const nameWidth = helveticaBold.widthOfTextAtSize(sanitizeText(organization.name), 14);
				draw(organization.name, {
					x: RIGHT_MARGIN - logoDims.width - 10 - nameWidth,
					y: headerY,
					size: 14,
					font: helveticaBold,
					color: BLACK,
				});
			}
		} else {
			const nameWidth = helveticaBold.widthOfTextAtSize(sanitizeText(organization.name), 18);
			draw(organization.name, {
				x: RIGHT_MARGIN - nameWidth,
				y: headerY,
				size: 18,
				font: helveticaBold,
				color: BLACK,
			});
		}
	}

	return headerY - 80;
}

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
    
	y = drawHeader({
		page,
		helvetica,
		helveticaBold,
		organization,
		logoImage,
		title: "DEVIS",
		referenceLabel: "Ref:",
		referenceValue: quote.id.slice(-8).toUpperCase(),
		dateLabel: "Date:",
		dateValue: formatDate(quote.createdAt),
		color: brandColor,
	});

	// Additional Quote Info (Valid Until)
	if (quote.validUntil) {
		const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
			page.drawText(sanitizeText(text), options);
		};
		// Re-calculate alignment based on logo position
		const logoPosition = organization.logoPosition ?? "LEFT";
		// Align with the block from drawHeader (RIGHT_MARGIN - 130 or LEFT_MARGIN)
		const infoX = logoPosition === "LEFT" ? RIGHT_MARGIN - 130 : LEFT_MARGIN;
		
		draw(`Valide jusqu'au: ${formatDate(quote.validUntil)}`, {
			x: infoX,
			y: headerY - 46, // 14pts below the Date line
			size: 10,
			font: helvetica,
			color: GRAY,
		});
	}

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

	y = Math.min(fromY, toY) - 30; // More spacing

	// =========================================================================
	// TRIP DETAILS SECTION - Story 25.2
	// =========================================================================

	draw("DETAILS DU TRAJET / TRIP DETAILS", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 20;

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
		y -= 16; // Increased line spacing
	}

	// =========================================================================
	// PRICING SECTION
	// =========================================================================

	y -= 20;
	draw("TARIFICATION / PRICING", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 20;

	// Pricing mode
	const pricingModeText = quote.pricingMode === "FIXED_GRID" ? "Grille tarifaire / Fixed Grid" : "Tarif dynamique / Dynamic";
	draw(`Mode: ${pricingModeText}`, { x: LEFT_MARGIN, y, size: 10, font: helvetica, color: BLACK });
	y -= 20;

	// Notes section
	if (quote.notes) {
		draw("NOTES", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
		y -= 14;
		draw(quote.notes.substring(0, 100), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 20;
	}

	y -= 10;
	// Total price box - RIGHT ALIGNED
	const totalLabel = "PRIX TOTAL TTC / TOTAL INCL. VAT:";
	const totalValue = formatPrice(quote.finalPrice);
	const labelWidth = helveticaBold.widthOfTextAtSize(sanitizeText(totalLabel), 10);
	const boxWidth = 220;
	const boxX = RIGHT_MARGIN - boxWidth;
	
	page.drawRectangle({
		x: boxX,
		y: y - 4,
		width: boxWidth,
		height: 30,
		color: LIGHT_GRAY,
	});
	draw(totalLabel, { x: boxX + 10, y: y + 8, size: 10, font: helveticaBold, color: DARK });
	// Value on next line inside box
	draw(totalValue, { x: boxX + 10, y: y - 10, size: 14, font: helveticaBold, color: brandColor });

	y -= 60;

	// =========================================================================
	// FOOTER - Story 25.2: Legal Mentions
	// =========================================================================

	const footerY = 70;
	
	// Acceptance block
	draw("BON POUR ACCORD / ACCEPTANCE", { x: LEFT_MARGIN, y: footerY + 50, size: 9, font: helveticaBold, color: DARK });
	page.drawRectangle({
		x: LEFT_MARGIN,
		y: footerY + 15,
		width: 200,
		height: 30, // Taller
		borderColor: GRAY,
		borderWidth: 0.5,
	});
	draw("Signature:", { x: LEFT_MARGIN + 5, y: footerY + 35, size: 8, font: helvetica, color: GRAY });

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
	
	y = drawHeader({
		page,
		helvetica,
		helveticaBold,
		organization,
		logoImage,
		title: "FACTURE",
		referenceLabel: "N:",
		referenceValue: invoice.number,
		dateLabel: "Emise le:",
		dateValue: formatDate(invoice.issueDate),
		color: brandColor,
	});

	// Additional Invoice Info (Due Date)
	const infoX = logoPosition === "LEFT" ? RIGHT_MARGIN - 130 : LEFT_MARGIN;

	draw(`Echeance: ${formatDate(invoice.dueDate)}`, {
		x: infoX,
		y: headerY - 46,
		size: 10,
		font: helvetica,
		color: GRAY,
	});

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

	y = Math.min(fromY, toY) - 30;

	// =========================================================================
	// PRICING TABLE - Story 25.2: EU-Compliant Columns
	// =========================================================================

	draw("DETAIL DES PRESTATIONS / LINE ITEMS", { x: LEFT_MARGIN, y, size: 11, font: helveticaBold, color: brandColor });
	y -= 20;

	// Table header background
	page.drawRectangle({
		x: LEFT_MARGIN,
		y: y - 4,
		width: CONTENT_WIDTH,
		height: 22,
		color: LIGHT_GRAY,
	});

	// Table header columns - Story 25.2: Description, Qty, Price HT, VAT%, Total HT
	draw("Description", { x: COL_DESC, y, size: 9, font: helveticaBold, color: DARK });
	draw("Qte", { x: COL_QTY, y, size: 9, font: helveticaBold, color: DARK });
	draw("Prix HT", { x: COL_PRICE, y, size: 9, font: helveticaBold, color: DARK });
	draw("TVA %", { x: COL_VAT, y, size: 9, font: helveticaBold, color: DARK });
	draw("Total HT", { x: COL_TOTAL, y, size: 9, font: helveticaBold, color: DARK });
	y -= 24;

	// Table rows
	for (const line of invoice.lines) {
		draw(line.description.substring(0, 45), { x: COL_DESC, y, size: 9, font: helvetica, color: BLACK });
		draw(String(line.quantity), { x: COL_QTY, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.unitPriceExclVat), { x: COL_PRICE, y, size: 9, font: helvetica, color: BLACK });
		draw(`${line.vatRate}%`, { x: COL_VAT, y, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.totalExclVat), { x: COL_TOTAL, y, size: 9, font: helvetica, color: BLACK });
		y -= 18; // Increased spacing
	}

	// =========================================================================
	// TOTALS SECTION - Story 25.2
	// =========================================================================

	y -= 25;
	const totalsX = RIGHT_MARGIN - 200; // Align to right

	// Subtotal
	draw("Total HT:", { x: totalsX + 20, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalExclVat), { x: totalsX + 110, y, size: 10, font: helvetica, color: BLACK });
	y -= 18;

	// VAT
	draw("TVA:", { x: totalsX + 20, y, size: 10, font: helvetica, color: BLACK });
	draw(formatPrice(invoice.totalVat), { x: totalsX + 110, y, size: 10, font: helvetica, color: BLACK });
	y -= 20;

	// Total TTC with highlight
	page.drawRectangle({
		x: totalsX,
		y: y - 6,
		width: 200,
		height: 26,
		color: LIGHT_GRAY,
	});
	draw("Total TTC:", { x: totalsX + 20, y: y + 2, size: 10, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalInclVat), { x: totalsX + 110, y: y, size: 12, font: helveticaBold, color: brandColor });
	y -= 40;

	// Commission info for partners
	if (invoice.commissionAmount && invoice.commissionAmount > 0) {
		draw(`Commission partenaire: ${formatPrice(invoice.commissionAmount)}`, {
			x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: ORANGE
		});
		y -= 16;
		draw(`Montant net: ${formatPrice(invoice.totalExclVat - invoice.commissionAmount)}`, {
			x: LEFT_MARGIN, y, size: 10, font: helvetica, color: GRAY
		});
		y -= 25;
	}

	// =========================================================================
	// NOTES SECTION
	// =========================================================================

	if (invoice.notes) {
		draw("NOTES", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
		y -= 16;
		draw(invoice.notes.substring(0, 100), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: GRAY });
		y -= 25;
	}

	// =========================================================================
	// PAYMENT INFO SECTION
	// =========================================================================

	draw("INFORMATIONS DE PAIEMENT / PAYMENT INFO", { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: DARK });
	y -= 16;
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
// Redesigned to match "Billet Co_Exemple" template
// ============================================================================

export async function generateMissionOrderPdf(
	mission: MissionOrderPdfData,
	organization: OrganizationPdfData
): Promise<Buffer> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const { height, width } = page.getSize();

	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Branding
	const brandColorRgb = hexToRgb(organization.brandColor);
	const brandColor = rgb(brandColorRgb.r, brandColorRgb.g, brandColorRgb.b);
	const logoImage = await embedLogoIfAvailable(pdfDoc, organization.documentLogoUrl ?? organization.logo);

	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	const drawRect = (x: number, y: number, w: number, h: number, fill?: boolean) => {
		page.drawRectangle({
			x, y, width: w, height: h,
			borderColor: BLACK,
			borderWidth: 0.5,
			color: fill ? LIGHT_GRAY : undefined,
		});
	};

	let y = height - 40;
	const missionNumber = mission.id.slice(-8).toUpperCase();
	const pickupTime = formatDateTime(mission.pickupAt).split(" ")[1] || "00:00";
	const pickupDate = formatDate(mission.pickupAt);

	// =========================================================================
	// HEADER: Logo + "Fiche de mission" box
	// =========================================================================
	
	// Logo on the left
	if (logoImage) {
		const logoDims = logoImage.scale(Math.min(80 / logoImage.width, 40 / logoImage.height));
		page.drawImage(logoImage, {
			x: LEFT_MARGIN,
			y: y - logoDims.height + 10,
			width: logoDims.width,
			height: logoDims.height,
		});
	} else {
		draw(organization.name, { x: LEFT_MARGIN, y: y - 5, size: 14, font: helveticaBold, color: BLACK });
	}

	// Title box on the right: "Fiche de mission"
	const titleBoxX = 350;
	const titleBoxWidth = 195;
	drawRect(titleBoxX, y - 45, titleBoxWidth, 55, true);
	draw("Fiche de mission", { x: titleBoxX + 35, y: y - 18, size: 14, font: helveticaBold, color: BLACK });
	
	// Reference row: N° de dossier | N° de mission | N° de version
	const refRowY = y - 32;
	const colW = titleBoxWidth / 3;
	draw("N° de dossier", { x: titleBoxX + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	draw("N° de mission", { x: titleBoxX + colW + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	draw("N° de version", { x: titleBoxX + colW * 2 + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	draw(missionNumber, { x: titleBoxX + 15, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });
	draw("1", { x: titleBoxX + colW + 25, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });
	draw("1", { x: titleBoxX + colW * 2 + 25, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });

	y -= 60;

	// Dispatch phone
	if (organization.phone) {
		draw(`Dispatch : ${organization.phone}`, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: BLACK });
		y -= 15;
	}

	// Legal text
	draw("Billet collectif equivalent ordre de mission selon l'arrete du 14 fevrier 1986 article 5", {
		x: LEFT_MARGIN, y, size: 7, font: helvetica, color: GRAY
	});
	y -= 20;

	// =========================================================================
	// MAIN TABLE: Date | Client | Chauffeur
	// Story 25.1: Extended with phone/email, partner SIRET/TVA, second driver
	// =========================================================================
	
	const tableY = y;
	// Increase table height to fit more info
	const tableH = mission.contact.isPartner ? 120 : 100;
	const col1W = 90; // Date - narrower
	const col2W = 240; // Client - wider for more info
	const col3W = CONTENT_WIDTH - col1W - col2W; // Chauffeur
	
	// Headers
	drawRect(LEFT_MARGIN, tableY - 15, col1W, 15, true);
	drawRect(LEFT_MARGIN + col1W, tableY - 15, col2W, 15, true);
	drawRect(LEFT_MARGIN + col1W + col2W, tableY - 15, col3W, 15, true);
	draw("Date", { x: LEFT_MARGIN + col1W / 2 - 10, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });
	draw("Client", { x: LEFT_MARGIN + col1W + col2W / 2 - 15, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });
	draw("Chauffeur(s)", { x: LEFT_MARGIN + col1W + col2W + col3W / 2 - 30, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });

	// Content cells
	drawRect(LEFT_MARGIN, tableY - 15 - tableH, col1W, tableH);
	drawRect(LEFT_MARGIN + col1W, tableY - 15 - tableH, col2W, tableH);
	drawRect(LEFT_MARGIN + col1W + col2W, tableY - 15 - tableH, col3W, tableH);

	// Date cell content
	draw(pickupDate, { x: LEFT_MARGIN + 5, y: tableY - 35, size: 10, font: helveticaBold, color: BLACK });

	// Client cell content - different layout for partner vs private
	const clientX = LEFT_MARGIN + col1W + 5;
	let clientYOffset = 30;
	
	if (mission.contact.isPartner) {
		// Partner: show agency name, contact details, SIRET, TVA
		draw(mission.contact.companyName || mission.contact.displayName, { x: clientX, y: tableY - clientYOffset, size: 9, font: helveticaBold, color: BLACK });
		clientYOffset += 12;
		if (mission.contact.phone) {
			draw(`Tel: ${mission.contact.phone}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.email) {
			draw(`Email: ${mission.contact.email}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.billingAddress) {
			const addrShort = sanitizeText(mission.contact.billingAddress).substring(0, 50);
			draw(`Adresse: ${addrShort}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.siret) {
			draw(`SIRET: ${mission.contact.siret}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: GRAY });
			clientYOffset += 10;
		}
		if (mission.contact.vatNumber) {
			draw(`TVA: ${mission.contact.vatNumber}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: GRAY });
		}
	} else {
		// Private client: show name, phone, email, address
		draw(mission.contact.displayName, { x: clientX, y: tableY - clientYOffset, size: 9, font: helveticaBold, color: BLACK });
		clientYOffset += 12;
		if (mission.contact.phone) {
			draw(`Tel: ${mission.contact.phone}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.email) {
			draw(`Email: ${mission.contact.email}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.billingAddress) {
			const addrShort = sanitizeText(mission.contact.billingAddress).substring(0, 50);
			draw(`Adresse: ${addrShort}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
		}
	}
	// Small creation date at bottom of client cell
	draw(`Dossier cree le ${formatDate(mission.createdAt)}`, { x: clientX, y: tableY - tableH + 5, size: 6, font: helvetica, color: GRAY });

	// Chauffeur cell content - with phone and second driver if present
	const chauffeurX = LEFT_MARGIN + col1W + col2W + 5;
	let chauffeurYOffset = 30;
	
	// Primary driver
	draw(mission.driverName, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 9, font: helveticaBold, color: BLACK });
	chauffeurYOffset += 10;
	if (mission.driverPhone) {
		draw(`Tel: ${mission.driverPhone}`, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 7, font: helvetica, color: BLACK });
		chauffeurYOffset += 12;
	} else {
		chauffeurYOffset += 8;
	}
	
	// Second driver (for RSE double crew)
	if (mission.secondDriverName) {
		draw(mission.secondDriverName, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 9, font: helveticaBold, color: BLACK });
		chauffeurYOffset += 10;
		if (mission.secondDriverPhone) {
			draw(`Tel: ${mission.secondDriverPhone}`, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 7, font: helvetica, color: BLACK });
			chauffeurYOffset += 12;
		}
	}
	
	// Vehicle info at bottom
	draw("Type:", { x: chauffeurX, y: tableY - tableH + 25, size: 6, font: helvetica, color: GRAY });
	draw(mission.vehicleCategory, { x: chauffeurX + 25, y: tableY - tableH + 25, size: 7, font: helvetica, color: BLACK });
	draw("Immat:", { x: chauffeurX, y: tableY - tableH + 15, size: 6, font: helvetica, color: GRAY });
	draw(mission.vehiclePlate || "N/A", { x: chauffeurX + 30, y: tableY - tableH + 15, size: 7, font: helvetica, color: BLACK });
	draw(mission.vehicleName, { x: chauffeurX, y: tableY - tableH + 5, size: 6, font: helvetica, color: GRAY });

	y = tableY - 15 - tableH - 10;

	// =========================================================================
	// SERVICE ROW
	// Story 25.1: Extended with "Nombre réel" fields and End Customer in notes
	// =========================================================================
	
	const serviceRowH = 80; // Increased height for more fields
	drawRect(LEFT_MARGIN, y - 15, 80, 15, true);
	draw("Service", { x: LEFT_MARGIN + 25, y: y - 12, size: 8, font: helveticaBold, color: BLACK });
	drawRect(LEFT_MARGIN + 80, y - 15, 160, 15, true);
	draw("Passager(s) : " + mission.passengerCount, { x: LEFT_MARGIN + 100, y: y - 12, size: 8, font: helveticaBold, color: BLACK });
	drawRect(LEFT_MARGIN + 240, y - 15, 255, 15, true);
	draw("Note au chauffeur", { x: LEFT_MARGIN + 320, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 15 - serviceRowH, 80, serviceRowH);
	drawRect(LEFT_MARGIN + 80, y - 15 - serviceRowH, 160, serviceRowH);
	drawRect(LEFT_MARGIN + 240, y - 15 - serviceRowH, 255, serviceRowH);

	// Story 25.1: Dynamic Service Type
	const serviceTypeMap: Record<string, string> = {
		"TRANSFER_ONE_WAY": "Transfert",
		"TRANSFER_RETURN": "Transfert A/R",
		"HOURLY": "Mise à disposition",
		"EXCURSION": "Excursion",
	};
	const serviceLabel = serviceTypeMap[mission.tripType] || "Transport de personnes";
	
	// Check width and wrap if necessary (max width ~80px)
	const serviceWidth = helveticaBold.widthOfTextAtSize(serviceLabel, 9);
	if (serviceWidth > 75) {
		const words = serviceLabel.split(" ");
		const mid = Math.ceil(words.length / 2);
		const line1 = words.slice(0, mid).join(" ");
		const line2 = words.slice(mid).join(" ");
		draw(line1, { x: LEFT_MARGIN + 5, y: y - 30, size: 8, font: helveticaBold, color: BLACK });
		draw(line2, { x: LEFT_MARGIN + 5, y: y - 40, size: 8, font: helveticaBold, color: BLACK });
	} else {
		draw(serviceLabel, { x: LEFT_MARGIN + 10, y: y - 35, size: 9, font: helveticaBold, color: BLACK });
	}

	// Passenger details - booking values
	const paxX = LEFT_MARGIN + 85;
	draw(`Adulte(s) prevus : ${mission.passengerCount}`, { x: paxX, y: y - 30, size: 7, font: helvetica, color: BLACK });
	draw(`Bagage(s) prevus : ${mission.luggageCount}`, { x: paxX, y: y - 40, size: 7, font: helvetica, color: BLACK });
	
	// Empty fields to be filled by driver after mission
	draw("Nombre réel adulte(s) :", { x: paxX, y: y - 55, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + 100, y: y - 57 }, end: { x: paxX + 150, y: y - 57 }, thickness: 0.5, color: BLACK });

	draw("Nombre réel enfant(s) :", { x: paxX, y: y - 65, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + 100, y: y - 67 }, end: { x: paxX + 150, y: y - 67 }, thickness: 0.5, color: BLACK });

	draw("Nombre de bagage(s) réel :", { x: paxX, y: y - 75, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + 110, y: y - 77 }, end: { x: paxX + 160, y: y - 77 }, thickness: 0.5, color: BLACK });

	// Notes section - with End Customer for partner missions
	const notesX = LEFT_MARGIN + 245;
	let notesYOffset = 30;
	
	// Story 25.1: For partner missions, display End Customer prominently
	if (mission.contact.isPartner && mission.endCustomer) {
		const endCustName = `${mission.endCustomer.firstName} ${mission.endCustomer.lastName}`;
		draw(`PASSAGER: ${endCustName}`, { x: notesX, y: y - notesYOffset, size: 8, font: helveticaBold, color: BLACK });
		notesYOffset += 12;
		if (mission.endCustomer.phone) {
			draw(`Tel: ${mission.endCustomer.phone}`, { x: notesX, y: y - notesYOffset, size: 7, font: helvetica, color: BLACK });
			notesYOffset += 10;
		}
		if (mission.endCustomer.email) {
			draw(`Email: ${mission.endCustomer.email}`, { x: notesX, y: y - notesYOffset, size: 7, font: helvetica, color: BLACK });
			notesYOffset += 10;
		}
	}
	
	// Regular notes at the end
	if (mission.notes) {
		const truncatedNotes = mission.notes.substring(0, 50);
		draw(truncatedNotes, { x: notesX, y: y - notesYOffset, size: 7, font: helvetica, color: GRAY });
	}

	// Reference mission
	draw("Reference mission", { x: LEFT_MARGIN + 10, y: y - 70, size: 7, font: helveticaBold, color: GRAY });

	y = y - 15 - serviceRowH - 10;

	// =========================================================================
	// PICKUP AND DESTINATION
	// =========================================================================
	
	// Prise en charge header
	drawRect(LEFT_MARGIN, y - 15, CONTENT_WIDTH, 15, true);
	draw("Prise en charge", { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 30, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 55, 80, 40);
	drawRect(LEFT_MARGIN + 80, y - 55, CONTENT_WIDTH - 80, 40);

	// Split Pickup Time cell horizontally for Planned vs Real
	page.drawLine({
		start: { x: LEFT_MARGIN, y: y - 35 },
		end: { x: LEFT_MARGIN + 80, y: y - 35 },
		thickness: 0.5,
		color: BLACK,
	});

	// Planned Time (Top)
	draw(pickupTime, { x: LEFT_MARGIN + 20, y: y - 28, size: 14, font: helveticaBold, color: BLACK });

	// Real Time Placeholder (Bottom)
	draw("Réel : ", { x: LEFT_MARGIN + 2, y: y - 48, size: 6, font: helvetica, color: GRAY });
	// Hour line
	page.drawLine({ start: { x: LEFT_MARGIN + 25, y: y - 48 }, end: { x: LEFT_MARGIN + 45, y: y - 48 }, thickness: 0.5, color: BLACK });
	draw(":", { x: LEFT_MARGIN + 47, y: y - 47, size: 8, font: helveticaBold, color: BLACK });
	// Minute line
	page.drawLine({ start: { x: LEFT_MARGIN + 50, y: y - 48 }, end: { x: LEFT_MARGIN + 70, y: y - 48 }, thickness: 0.5, color: BLACK });

	// Address
	draw(mission.pickupAddress.substring(0, 70), { x: LEFT_MARGIN + 85, y: y - 38, size: 9, font: helveticaBold, color: BLACK });

	y -= 65;

	// Destination header
	drawRect(LEFT_MARGIN, y - 15, CONTENT_WIDTH, 15, true);
	draw("Destination", { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 25, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 55, CONTENT_WIDTH - 80, 40);
	drawRect(LEFT_MARGIN + CONTENT_WIDTH - 80, y - 55, 80, 40);

	draw((mission.dropoffAddress || "A definir").substring(0, 70), { x: LEFT_MARGIN + 5, y: y - 38, size: 9, font: helveticaBold, color: BLACK });
	
	// Estimated arrival (placeholder) - Lines for writing
	page.drawLine({ start: { x: LEFT_MARGIN + CONTENT_WIDTH - 65, y: y - 40 }, end: { x: LEFT_MARGIN + CONTENT_WIDTH - 45, y: y - 40 }, thickness: 0.5, color: BLACK });
	draw(":", { x: LEFT_MARGIN + CONTENT_WIDTH - 42, y: y - 39, size: 10, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: LEFT_MARGIN + CONTENT_WIDTH - 38, y: y - 40 }, end: { x: LEFT_MARGIN + CONTENT_WIDTH - 18, y: y - 40 }, thickness: 0.5, color: BLACK });

	y -= 65;

	// =========================================================================
	// DRIVER INPUT TABLES
	// =========================================================================
	
	// Informations obligatoires header
	drawRect(LEFT_MARGIN, y - 15, CONTENT_WIDTH, 15, true);
	draw("Informations obligatoires a completer", { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 75, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	// Column headers for driver inputs
	const inputColW = CONTENT_WIDTH / 5;
	drawRect(LEFT_MARGIN, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 2, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 3, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 4, y - 35, inputColW, 20, true);

	draw("Heure depart garage", { x: LEFT_MARGIN + 5, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw("Heure retour garage", { x: LEFT_MARGIN + inputColW + 5, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw("Km depart", { x: LEFT_MARGIN + inputColW * 2 + 15, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw("Km arrivee", { x: LEFT_MARGIN + inputColW * 3 + 15, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw("TOTAL km", { x: LEFT_MARGIN + inputColW * 4 + 15, y: y - 28, size: 6, font: helvetica, color: GRAY });

	// Empty input cells
	for (let i = 0; i < 5; i++) {
		drawRect(LEFT_MARGIN + inputColW * i, y - 55, inputColW, 20);
	}

	y -= 65;

	// Repas / Observations
	drawRect(LEFT_MARGIN, y - 15, 120, 15, true);
	drawRect(LEFT_MARGIN + 120, y - 15, CONTENT_WIDTH - 120, 15, true);
	draw("Repas", { x: LEFT_MARGIN + 45, y: y - 12, size: 8, font: helveticaBold, color: BLACK });
	draw("Observations de fin de mission", { x: LEFT_MARGIN + 200, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 45, 120, 30);
	drawRect(LEFT_MARGIN + 120, y - 45, CONTENT_WIDTH - 120, 30);

	y -= 55;

	// Debours Chauffeur
	drawRect(LEFT_MARGIN, y - 15, 200, 15, true);
	draw("Debours Chauffeur sur justificatifs", { x: LEFT_MARGIN + 15, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	const expenseItems = ["Parking", "Peage", "Divers", "Total"];
	for (let i = 0; i < expenseItems.length; i++) {
		drawRect(LEFT_MARGIN, y - 35 - i * 18, 100, 18, i === 3 ? true : false);
		drawRect(LEFT_MARGIN + 100, y - 35 - i * 18, 100, 18);
		draw(expenseItems[i], { x: LEFT_MARGIN + 30, y: y - 30 - i * 18, size: 8, font: i === 3 ? helveticaBold : helvetica, color: BLACK });
	}

	// =========================================================================
	// FOOTER - Legal info (Expanded)
	// =========================================================================
	
	const footerY = 35;
	
	// Line 1: Company Name, Legal Form, Capital, Address
	const legalLine1 = [
		organization.name,
		organization.capital ? `Capital: ${organization.capital}` : "",
		organization.address
	].filter(Boolean).join(" - ");

	// Line 2: SIRET, RCS, APE, TVA, License
	const legalLine2Parts = [];
	if (organization.siret) legalLine2Parts.push(`SIRET: ${organization.siret}`);
	if (organization.rcs) legalLine2Parts.push(`RCS: ${organization.rcs}`);
	if (organization.ape) legalLine2Parts.push(`APE: ${organization.ape}`);
	if (organization.vatNumber) legalLine2Parts.push(`TVA: ${organization.vatNumber}`);
	if (organization.licenseVtc) legalLine2Parts.push(`Licence VTC: ${organization.licenseVtc}`);
	
	const legalLine2 = legalLine2Parts.join(" - ");

	page.drawLine({
		start: { x: LEFT_MARGIN, y: footerY + 15 },
		end: { x: RIGHT_MARGIN, y: footerY + 15 },
		color: GRAY,
		thickness: 0.5,
	});

	draw(legalLine1, { x: LEFT_MARGIN, y: footerY + 5, size: 7, font: helvetica, color: GRAY });
	draw(legalLine2, { x: LEFT_MARGIN, y: footerY - 5, size: 7, font: helvetica, color: GRAY });

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
