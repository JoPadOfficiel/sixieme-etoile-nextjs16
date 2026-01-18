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
	address?: string | null;       // Line 1 (street)
	addressLine2?: string | null;  // Complement
	postalCode?: string | null;    // Postal code
	city?: string | null;          // City
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
	logoWidth?: number;
	// Story 25.4: Document settings
	documentLanguage?: "FRENCH" | "ENGLISH" | "BILINGUAL";
	invoiceTerms?: string | null;
	quoteTerms?: string | null;
	missionOrderTerms?: string | null;
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
	lines: InvoiceLinePdfData[];
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
	// Story 26.11: Support for Hybrid Block types
	type?: "CALCULATED" | "MANUAL" | "GROUP";
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
	// Reference to the associated quote (for display in invoice PDF)
	quoteReference?: string | null;
	// Trip details from associated quote (for display in invoice PDF)
	tripDetails?: {
		pickupAddress: string;
		dropoffAddress?: string | null;
		pickupAt: Date;
		passengerCount: number;
		luggageCount: number;
		vehicleCategory: string;
		tripType: string;
	} | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLabel(fr: string, en: string, lang?: "FRENCH" | "ENGLISH" | "BILINGUAL"): string {
	if (lang === "FRENCH") return fr;
	if (lang === "ENGLISH") return en;
	if (fr === en) return fr;
	return `${fr} / ${en}`;
}

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
 * Story 25.4: Format complete organization address into lines
 * Returns array of address lines for display
 */
function formatOrganizationAddressLines(org: OrganizationPdfData): string[] {
	const lines: string[] = [];
	if (org.address) {
		lines.push(org.address);
	}
	if (org.addressLine2) {
		lines.push(org.addressLine2);
	}
	// Combine postal code and city on same line
	const postalCity = [org.postalCode, org.city].filter(Boolean).join(" ");
	if (postalCity) {
		lines.push(postalCity);
	}
	return lines;
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
	url: string | null | undefined
): Promise<PDFImage | null> {
	if (!url) return null;

	try {
		let imageBytes: ArrayBuffer | Uint8Array;
		let contentType: string | null = null;

		// Handle Data URIs (Base64)
		if (url.startsWith("data:")) {
			const matches = url.match(/^data:(image\/(\w+));base64,(.+)$/);
			if (!matches) return null;
			contentType = matches[1]; // e.g. image/png
			imageBytes = Buffer.from(matches[3], "base64");
		} else {
			// Fetch from URL
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

			try {
				console.log(`Fetching logo from: ${url}`);
				const response = await fetch(url, { signal: controller.signal });
				clearTimeout(timeoutId);

				if (!response.ok) {
					console.error(`Failed to fetch logo: ${response.status} ${response.statusText}`);
					return null;
				}

				imageBytes = await response.arrayBuffer();
				contentType = response.headers.get("content-type");
			} catch (error) {
				clearTimeout(timeoutId);
				console.error("Error fetching logo:", error);
				return null;
			}
		}

		if (contentType && contentType.includes("png")) {
			return await pdfDoc.embedPng(imageBytes);
		} else if (contentType && (contentType.includes("jpg") || contentType.includes("jpeg"))) {
			return await pdfDoc.embedJpg(imageBytes);
		} else {
			console.warn("Unsupported image type:", contentType);
			// Try PNG as fallback
			try {
				return await pdfDoc.embedPng(imageBytes);
			} catch {
				try {
					return await pdfDoc.embedJpg(imageBytes);
				} catch {
					return null;
				}
			}
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

	const logoWidth = organization.logoWidth ?? 120; // Default 120 if not set, or fall back to old logic?
	// Actually preserve old default behavior if logoWidth is missing? 
	// The DB defaults to 150. So organization.logoWidth will likely be present.
	// If it is present, we use it as target width.
	// We should probably limit height preventing it from covering the whole page? 
	// But let's respect the user setting primarily.

	if (logoPosition === "LEFT") {
		// LOGO LEFT, INFO RIGHT
		if (logoImage) {
			let logoDims;
			if (organization.logoWidth) {
				const scale = organization.logoWidth / logoImage.width;
				logoDims = { width: organization.logoWidth, height: logoImage.height * scale };
			} else {
				// Old default behavior (max 120w, 50h)
				logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
			}

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

		// Title aligned to the right
		const titleX = RIGHT_MARGIN - helveticaBold.widthOfTextAtSize(sanitizeText(title), 18);
		draw(title, {
			x: titleX,
			y: headerY,
			size: 18,
			font: helveticaBold,
			color: color,
		});

		// Aligned labels and values as a single right-aligned block
		const infoSize = (referenceLabel.includes("/") || dateLabel.includes("/")) ? 8 : 10;
		const refLine = `${referenceLabel} ${referenceValue}`;
		const dateLine = `${dateLabel} ${dateValue}`;
		
		draw(refLine, { 
			x: RIGHT_MARGIN - helvetica.widthOfTextAtSize(sanitizeText(refLine), infoSize), 
			y: headerY - 18, 
			size: infoSize, 
			font: helvetica, 
			color: GRAY 
		});
		draw(dateLine, { 
			x: RIGHT_MARGIN - helvetica.widthOfTextAtSize(sanitizeText(dateLine), infoSize), 
			y: headerY - 32, 
			size: infoSize, 
			font: helvetica, 
			color: GRAY 
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
		// Aligned labels and values
		const infoSize = (referenceLabel.includes("/") || dateLabel.includes("/")) ? 8 : 10;
		draw(`${referenceLabel} ${referenceValue}`, { x: LEFT_MARGIN, y: headerY - 18, size: infoSize, font: helvetica, color: GRAY });
		draw(`${dateLabel} ${dateValue}`, { x: LEFT_MARGIN, y: headerY - 32, size: infoSize, font: helvetica, color: GRAY });

		if (logoImage) {
			let logoDims;
			if (organization.logoWidth) {
				const scale = organization.logoWidth / logoImage.width;
				logoDims = { width: organization.logoWidth, height: logoImage.height * scale };
			} else {
				logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
			}

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

	// Helper for drawing rectangles/lines
	const drawRect = (x: number, y: number, w: number, h: number, fill?: boolean, color?: typeof LIGHT_GRAY) => {
		page.drawRectangle({
			x, y, width: w, height: h,
			borderColor: BLACK,
			borderWidth: 0.5,
			color: fill ? (color || LIGHT_GRAY) : undefined,
		});
	};

	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	let y = height - 50;
	
	// Dynamic quote reference
	const quoteReference = quote.id.slice(-8).toUpperCase();
	
	const lang = organization.documentLanguage;

	// Capture header bottom Y
	const headerY = drawHeader({
		page, helvetica, helveticaBold, organization, logoImage,
		title: getLabel("DEVIS", "QUOTE", lang),
		referenceLabel: getLabel("Réf:", "Ref:", lang),
		referenceValue: quoteReference,
		dateLabel: getLabel("Date:", "Date:", lang),
		dateValue: formatDate(quote.createdAt),
		color: brandColor,
	});

	// Additional Info (Valid Until) - Aligned with Header Date
	if (quote.validUntil) {
		const isBilingual = lang === "BILINGUAL";
		const infoSize = isBilingual ? 8 : 9;
		const labelPosition = organization.logoPosition ?? "LEFT";
		const headerBottomY = headerY;
		
		const validLine = `${getLabel("Valide jusqu'au:", "Valid until:", lang)} ${formatDate(quote.validUntil)}`;
		
		if (labelPosition === "LEFT") {
			draw(validLine, {
				x: RIGHT_MARGIN - helvetica.widthOfTextAtSize(sanitizeText(validLine), infoSize),
				y: headerBottomY + 34,
				size: infoSize,
				font: helvetica,
				color: GRAY,
			});
		} else {
			draw(validLine, {
				x: LEFT_MARGIN,
				y: headerBottomY + 34,
				size: infoSize,
				font: helvetica,
				color: GRAY,
			});
		}
	}

	y = headerY - 20;

	// =========================================================================
	// FROM / BILL TO BLOCKS (No borders, simple labels)
	// =========================================================================

	const blockWidth = 240;

	// Left Block: DE / FROM
	draw(getLabel("DE", "FROM", lang) + ":", { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
	y -= 14;
	draw(organization.name, { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: BLACK });
	y -= 12;
	
	// Complete address display (line 1, line 2, postal code + city)
	const addressLines = formatOrganizationAddressLines(organization);
	for (const addrLine of addressLines) {
		const sanitized = sanitizeText(addrLine);
		if (sanitized.length > 45) {
			draw(sanitized.substring(0, 45), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
			y -= 10;
			draw(sanitized.substring(45, 90), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		} else {
			draw(sanitized, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		}
		y -= 10;
	}
	
	if (organization.phone) {
		draw(getLabel("Tél", "Tel", lang) + `: ${organization.phone}`, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		y -= 10;
	}
	if (organization.email) {
		draw(organization.email, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		y -= 12;
	}

	// Right Block: A / BILL TO (reset Y to same starting point)
	// Always bill to the contact (agency for B2B) - end customer shown in trip details
	const rightBlockX = RIGHT_MARGIN - blockWidth;
	let toY = headerY - 20;
	draw(getLabel("A", "BILL TO", lang) + ":", { x: rightBlockX, y: toY, size: 9, font: helveticaBold, color: DARK });
	toY -= 14;

	// Always show contact name (agency name for B2B)
	draw(quote.contact.displayName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
	toY -= 12;
	
	// For B2B/partners, show company name if different from displayName
	if (quote.contact.companyName && quote.contact.companyName !== quote.contact.displayName) {
		draw(quote.contact.companyName, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// Address
	if (quote.contact.billingAddress) {
		const addr = sanitizeText(quote.contact.billingAddress);
		if (addr.length > 40) {
			draw(addr.substring(0, 40), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
			toY -= 10;
			draw(addr.substring(40, 80), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		} else {
			draw(addr, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		}
		toY -= 10;
	}
	// Phone
	if (quote.contact.phone) {
		draw(`Tel: ${quote.contact.phone}`, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// Email
	if (quote.contact.email) {
		draw(quote.contact.email, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// SIRET for B2B
	if (quote.contact.siret) {
		draw(`SIRET: ${quote.contact.siret}`, { x: rightBlockX, y: toY, size: 8, font: helvetica, color: GRAY });
		toY -= 10;
	}
	// VAT for B2B
	if (quote.contact.vatNumber) {
		draw(`${getLabel("TVA", "VAT", lang)}: ${quote.contact.vatNumber}`, { x: rightBlockX, y: toY, size: 8, font: helvetica, color: GRAY });
	}

	y = Math.min(y, toY) - 30;

	// =========================================================================
	// PRICING TABLE WITH TRIP DETAILS IN DESIGNATION
	// =========================================================================

	// =========================================================================
	// PRICING TABLE
	// =========================================================================
	
	// Rebalance columns for Bilingual support: Description down, others up
	const colDescW = 230;
	const colVatW = 45;
	const colUnitW = 90;
	const colQtyW = 50;
	const colTotalW = 80;
	
	const xDesc = LEFT_MARGIN;
	const xVat = xDesc + colDescW;
	const xUnit = xVat + colVatW;
	const xQty = xUnit + colUnitW;
	const xTotal = xQty + colQtyW;

	// Table Header
	const headerH = 20;
	drawRect(xDesc, y - headerH, CONTENT_WIDTH, headerH, true, rgb(0.95, 0.95, 0.95));
	drawRect(xDesc, y - headerH, colDescW, headerH);
	drawRect(xVat, y - headerH, colVatW, headerH);
	drawRect(xUnit, y - headerH, colUnitW, headerH);
	drawRect(xQty, y - headerH, colQtyW, headerH);
	drawRect(xTotal, y - headerH, colTotalW, headerH);

	const thY = y - 14;
	draw(getLabel("Désignation", "Description", lang), { x: xDesc + 5, y: thY, size: 9, font: helveticaBold, color: BLACK });
	draw(getLabel("TVA", "VAT", lang), { x: xVat + 5, y: thY, size: 9, font: helveticaBold, color: BLACK });
	draw(getLabel("P.U. HT", "Unit Price", lang), { x: xUnit + 5, y: thY, size: 9, font: helveticaBold, color: BLACK });
	draw(getLabel("Qté", "Qty", lang), { x: xQty + 5, y: thY, size: 9, font: helveticaBold, color: BLACK });
	draw(getLabel("Total HT", "Total", lang), { x: xTotal + 5, y: thY, size: 9, font: helveticaBold, color: BLACK });

	y -= headerH;

	// Render line items
	for (const line of quote.lines) {
		const description = sanitizeText(line.description);
		
		// STORY 26.11: GROUP lines rendered as Sub-headers
		if (line.type === "GROUP") {
			const groupRowH = 25;
			drawRect(xDesc, y - groupRowH, CONTENT_WIDTH, groupRowH, true, rgb(0.98, 0.98, 0.98));
			// Draw Description centered-ish or left aligned but bold and covering the whole width
			draw(description.toUpperCase(), { 
				x: xDesc + 5, 
				y: y - 16, 
				size: 9, 
				font: helveticaBold, 
				color: DARK 
			});
			y -= groupRowH;
			continue;
		}

		// First split by newlines to preserve explicit line breaks
		const paragraphs = description.split('\n').filter(p => p.trim());
		const lines: string[] = [];
		
		// Then wrap each paragraph
		for (const paragraph of paragraphs) {
			const words = paragraph.split(' ');
			let currentLine = "";
			
			for (const word of words) {
				const testLine = currentLine + (currentLine ? " " : "") + word;
				if (helvetica.widthOfTextAtSize(testLine, 8) < colDescW - 10) {
					currentLine = testLine;
				} else {
					if (currentLine) lines.push(currentLine);
					currentLine = word;
				}
			}
			if (currentLine) lines.push(currentLine);
		}

		const lineSpacing = 11;
		const rowPadding = 8;
		const rowH = Math.max(20, (lines.length * lineSpacing) + (rowPadding * 2));

		drawRect(xDesc, y - rowH, colDescW, rowH);
		drawRect(xVat, y - rowH, colVatW, rowH);
		drawRect(xUnit, y - rowH, colUnitW, rowH);
		drawRect(xQty, y - rowH, colQtyW, rowH);
		drawRect(xTotal, y - rowH, colTotalW, rowH);

		// Render multi-line description
		let textY = y - rowPadding - 6;
		for (const l of lines) {
			draw(l, { x: xDesc + 5, y: textY, size: 8, font: helvetica, color: BLACK });
			textY -= lineSpacing;
		}

		// Values (centered vertically)
		const midY = y - (rowH / 2) - 3;
		draw(`${line.vatRate}%`, { x: xVat + 5, y: midY, size: 9, font: helvetica, color: BLACK });
		// Story 26.11: Show empty for zero/null prices if needed, but Manual lines might have prices
		draw(formatPrice(line.unitPriceExclVat), { x: xUnit + 5, y: midY, size: 9, font: helvetica, color: BLACK });
		draw(String(line.quantity), { x: xQty + 10, y: midY, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.totalExclVat), { x: xTotal + 5, y: midY, size: 9, font: helvetica, color: BLACK });

		y -= rowH;
	}

	y -= 20;

	// =========================================================================
	// VAT BREAKDOWN TABLE
	// =========================================================================
	const vatDataTableX = LEFT_MARGIN;
	const vatDataTableW = 250;
	const vatColW = [100, 75, 75]; // Rate Base, Rate, Amount
	
	draw(getLabel("DETAIL TVA", "VAT BREAKDOWN", lang), { x: vatDataTableX, y: y, size: 9, font: helveticaBold, color: DARK });
	y -= 14;
	
	const vatHeaderH = 15;
	drawRect(vatDataTableX, y - vatHeaderH, vatColW[0], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	drawRect(vatDataTableX + vatColW[0], y - vatHeaderH, vatColW[1], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	drawRect(vatDataTableX + vatColW[0] + vatColW[1], y - vatHeaderH, vatColW[2], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	
	draw(getLabel("Base HT", "Tax Base", lang), { x: vatDataTableX + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	draw(getLabel("Taux", "Rate", lang), { x: vatDataTableX + vatColW[0] + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	draw(getLabel("Montant", "Amount", lang), { x: vatDataTableX + vatColW[0] + vatColW[1] + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	y -= vatHeaderH;

	// Group lines by VAT rate
	const vatMap = new Map<number, { base: number; vat: number }>();
	for (const line of quote.lines) {
		const existing = vatMap.get(line.vatRate) || { base: 0, vat: 0 };
		existing.base += line.totalExclVat;
		existing.vat += line.totalVat;
		vatMap.set(line.vatRate, existing);
	}

	for (const [rate, data] of Array.from(vatMap.entries()).sort((a, b) => a[0] - b[0])) {
		const vatRowH = 15;
		drawRect(vatDataTableX, y - vatRowH, vatColW[0], vatRowH);
		drawRect(vatDataTableX + vatColW[0], y - vatRowH, vatColW[1], vatRowH);
		drawRect(vatDataTableX + vatColW[0] + vatColW[1], y - vatRowH, vatColW[2], vatRowH);
		
		draw(formatPrice(data.base), { x: vatDataTableX + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		draw(`${rate}%`, { x: vatDataTableX + vatColW[0] + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		draw(formatPrice(data.vat), { x: vatDataTableX + vatColW[0] + vatColW[1] + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		y -= vatRowH;
	}

	// =========================================================================
	// TOTALS
	// =========================================================================

	// Reset y for totals if vat table was too short, but usually it flows
	let totalsY = y + (Array.from(vatMap.entries()).length * 15) + vatHeaderH + 14; 
	// Reset to a safe point if necessary, or just continue from y
	const totalsW = 240;
	const totalsX = RIGHT_MARGIN - totalsW;
	const totalsValueOffset = 140;

	// Draw totals block starting from the same Y as VAT breakdown label for better alignment if space allows
	let currentTotalsY = totalsY;

	const totalHT = quote.lines.reduce((sum, l) => sum + l.totalExclVat, 0);
	const totalVAT = quote.lines.reduce((sum, l) => sum + l.totalVat, 0);
	const totalTTC = totalHT + totalVAT;

	drawRect(totalsX, currentTotalsY - 20, totalsW, 20);
	draw(getLabel("Total HT", "Total Excl. VAT", lang), { x: totalsX + 10, y: currentTotalsY - 14, size: 9, font: helveticaBold, color: BLACK });
	draw(formatPrice(totalHT), { x: totalsX + totalsValueOffset, y: currentTotalsY - 14, size: 9, font: helvetica, color: BLACK });
	currentTotalsY -= 20;

	drawRect(totalsX, currentTotalsY - 20, totalsW, 20);
	draw(getLabel("Total TVA", "Total VAT", lang), { x: totalsX + 10, y: currentTotalsY - 14, size: 9, font: helveticaBold, color: BLACK });
	draw(formatPrice(totalVAT), { x: totalsX + totalsValueOffset, y: currentTotalsY - 14, size: 9, font: helvetica, color: BLACK });
	currentTotalsY -= 20;

	drawRect(totalsX, currentTotalsY - 25, totalsW, 25, true, rgb(0.9, 0.9, 0.9));
	draw(getLabel("Total TTC", "Total Incl. VAT", lang), { x: totalsX + 10, y: currentTotalsY - 16, size: 10, font: helveticaBold, color: BLACK });
	draw(formatPrice(totalTTC), { x: totalsX + totalsValueOffset, y: currentTotalsY - 16, size: 10, font: helveticaBold, color: BLACK });
	
	y = Math.min(y, currentTotalsY - 25);

	y -= 50;

	// =========================================================================
	// SIGNATURE BOX (Left side)
	// =========================================================================

	const signatureBoxX = LEFT_MARGIN;
	const signatureBoxY = 130;
	const signatureBoxW = 200;
	const signatureBoxH = 80;

	// Draw the signature box
	drawRect(signatureBoxX, signatureBoxY - signatureBoxH, signatureBoxW, signatureBoxH);
	
	// Title
	draw(getLabel("BON POUR ACCORD", "APPROVED", lang), { x: signatureBoxX + 10, y: signatureBoxY - 15, size: 9, font: helveticaBold, color: BLACK });
	
	// Date field
	draw(`${getLabel("Date", "Date", lang)}:`, { x: signatureBoxX + 10, y: signatureBoxY - 35, size: 8, font: helvetica, color: GRAY });
	page.drawLine({
		start: { x: signatureBoxX + 40, y: signatureBoxY - 37 },
		end: { x: signatureBoxX + 120, y: signatureBoxY - 37 },
		thickness: 0.5,
		color: BLACK,
	});
	
	// Signature label
	draw(`${getLabel("Signature", "Signature", lang)}:`, { x: signatureBoxX + 10, y: signatureBoxY - 55, size: 8, font: helvetica, color: GRAY });

	// =========================================================================
	// CONDITIONS DE REGLEMENT / PAYMENT TERMS (Right side, above signature box)
	// =========================================================================

	const footerY = signatureBoxY - signatureBoxH - 10;
	if (organization.quoteTerms && organization.quoteTerms.trim().length > 0) {
		draw(getLabel("CONDITIONS", "TERMS", lang) + ":", { x: LEFT_MARGIN, y: footerY, size: 9, font: helveticaBold, color: DARK });
		const termsLines = organization.quoteTerms.split("\n");
		let termsY = footerY - 12;
		for (const line of termsLines.slice(0, 5)) { // Limit to 5 lines in Quote
			draw(line, { x: LEFT_MARGIN, y: termsY, size: 8, font: helvetica, color: BLACK });
			termsY -= 10;
		}
	} else {
		draw(getLabel("CONDITIONS DE REGLEMENT", "PAYMENT TERMS", lang) + ":", { x: LEFT_MARGIN, y: footerY, size: 9, font: helveticaBold, color: DARK });
		draw(getLabel("Paiement à réception", "Payment upon receipt", lang), { x: LEFT_MARGIN, y: footerY - 12, size: 8, font: helvetica, color: BLACK });
	}

	// Page number
	draw("Page 1 / 1", { x: RIGHT_MARGIN - 45, y: 25, size: 8, font: helvetica, color: GRAY });


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

	// Helper for drawing rectangles/lines
	const drawRect = (x: number, y: number, w: number, h: number, fill?: boolean, color?: typeof LIGHT_GRAY) => {
		page.drawRectangle({
			x, y, width: w, height: h,
			borderColor: BLACK,
			borderWidth: 0.5,
			color: fill ? (color || LIGHT_GRAY) : undefined,
		});
	};

	let y = height - 50;
	// Helper to draw sanitized text
	const draw = (text: string, options: Parameters<typeof page.drawText>[1]) => {
		page.drawText(sanitizeText(text), options);
	};

	const lang = organization.documentLanguage;

	const headerY = drawHeader({
		page, helvetica, helveticaBold, organization, logoImage,
		title: getLabel("FACTURE", "INVOICE", lang),
		referenceLabel: getLabel("N°:", "N°:", lang),
		referenceValue: invoice.number,
		dateLabel: getLabel("Date:", "Date:", lang),
		dateValue: formatDate(invoice.issueDate),
		color: brandColor,
	});

	// Additional Info (Due Date + Quote Reference) - Aligned with Header Date
	const isBilingual = lang === "BILINGUAL";
	const infoSize = isBilingual ? 8 : 9;
	const labelPosition = organization.logoPosition ?? "LEFT";

	// We use the returned headerY which is actually headerBottom (headerY - 80)
	const headerBottomY = headerY; 
	
	// Echeance / Due
	const dueLine = `${getLabel("Echéance:", "Due Date:", lang)} ${formatDate(invoice.dueDate)}`;
	if (labelPosition === "LEFT") {
		draw(dueLine, { 
			x: RIGHT_MARGIN - helvetica.widthOfTextAtSize(sanitizeText(dueLine), infoSize), 
			y: headerBottomY + 34, 
			size: infoSize, 
			font: helvetica, 
			color: GRAY 
		});
	} else {
		draw(dueLine, { x: LEFT_MARGIN, y: headerBottomY + 34, size: infoSize, font: helvetica, color: GRAY });
	}
	
	// Show quote reference if available
	if (invoice.quoteReference) {
		const refLine = `${getLabel("Réf. Devis:", "Quote Ref:", lang)} ${invoice.quoteReference}`;
		if (labelPosition === "LEFT") {
			draw(refLine, { 
				x: RIGHT_MARGIN - helvetica.widthOfTextAtSize(sanitizeText(refLine), infoSize), 
				y: headerBottomY + 22, 
				size: infoSize, 
				font: helvetica, 
				color: GRAY 
			});
		} else {
			draw(refLine, { x: LEFT_MARGIN, y: headerBottomY + 22, size: infoSize, font: helvetica, color: GRAY });
		}
	}

	y = headerY - 20;

	// =========================================================================
	// FROM / BILL TO BLOCKS (No borders, simple labels)
	// =========================================================================

	const blockWidth = 240;

	// Left Block: DE / FROM
	draw(getLabel("DE", "FROM", lang) + ":", { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
	y -= 14;
	draw(organization.name, { x: LEFT_MARGIN, y, size: 10, font: helveticaBold, color: BLACK });
	y -= 12;
	
	// Complete address display (line 1, line 2, postal code + city)
	const addressLines = formatOrganizationAddressLines(organization);
	for (const addrLine of addressLines) {
		const sanitized = sanitizeText(addrLine);
		if (sanitized.length > 45) {
			draw(sanitized.substring(0, 45), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
			y -= 10;
			draw(sanitized.substring(45, 90), { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		} else {
			draw(sanitized, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		}
		y -= 10;
	}
	
	if (organization.phone) {
		draw(`${getLabel("Tél", "Tel", lang)}: ${organization.phone}`, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		y -= 10;
	}
	if (organization.email) {
		draw(organization.email, { x: LEFT_MARGIN, y, size: 9, font: helvetica, color: BLACK });
		y -= 10;
	}
	if (organization.siret) {
		draw(`SIRET: ${organization.siret}`, { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: GRAY });
		y -= 10;
	}
	if (organization.vatNumber) {
		draw(`${getLabel("TVA", "VAT", lang)}: ${organization.vatNumber}`, { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: GRAY });
	}

	// Right Block: A / BILL TO (reset Y to same starting point)
	// Always bill to the contact (agency for B2B) - end customer shown in trip details
	const rightBlockX = RIGHT_MARGIN - blockWidth;
	let toY = headerY - 20;
	draw(getLabel("A", "BILL TO", lang) + ":", { x: rightBlockX, y: toY, size: 9, font: helveticaBold, color: DARK });
	toY -= 14;

	const contact = invoice.contact;
	
	// Always show contact name (agency name for B2B)
	draw(contact.displayName, { x: rightBlockX, y: toY, size: 10, font: helveticaBold, color: BLACK });
	toY -= 12;

	// For B2B/partners, show company name if different from displayName
	if (contact.companyName && contact.companyName !== contact.displayName) {
		draw(contact.companyName, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// Address
	if (contact.billingAddress) {
		const addr = sanitizeText(contact.billingAddress);
		if (addr.length > 40) {
			draw(addr.substring(0, 40), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
			toY -= 10;
			draw(addr.substring(40, 80), { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		} else {
			draw(addr, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		}
		toY -= 10;
	}
	// Phone
	if (contact.phone) {
		draw(`Tel: ${contact.phone}`, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// Email
	if (contact.email) {
		draw(contact.email, { x: rightBlockX, y: toY, size: 9, font: helvetica, color: BLACK });
		toY -= 10;
	}
	// SIRET for B2B
	if (contact.siret) {
		draw(`SIRET: ${contact.siret}`, { x: rightBlockX, y: toY, size: 8, font: helvetica, color: GRAY });
		toY -= 10;
	}
	// VAT for B2B
	if (contact.vatNumber) {
		draw(`TVA / VAT: ${contact.vatNumber}`, { x: rightBlockX, y: toY, size: 8, font: helvetica, color: GRAY });
	}
	
	y = Math.min(y, toY) - 30;

	// =========================================================================
	// PRICING TABLE WITH TRIP DETAILS
	// =========================================================================

	// Rebalance columns for Bilingual support: Description down, others up
	const colDescW = 230;
	const colVatW = 45;
	const colUnitW = 90;
	const colQtyW = 50;
	const colTotalW = 80;
	
	const xDesc = LEFT_MARGIN;
	const xVat = xDesc + colDescW;
	const xUnit = xVat + colVatW;
	const xQty = xUnit + colUnitW;
	const xTotal = xQty + colQtyW;

	// Header
	const headerH = 25; // Slightly taller for bilingual text
	drawRect(xDesc, y - headerH, CONTENT_WIDTH, headerH, true, rgb(0.95, 0.95, 0.95));
	drawRect(xDesc, y - headerH, colDescW, headerH);
	drawRect(xVat, y - headerH, colVatW, headerH);
	drawRect(xUnit, y - headerH, colUnitW, headerH);
	drawRect(xQty, y - headerH, colQtyW, headerH);
	drawRect(xTotal, y - headerH, colTotalW, headerH);

	const thY = y - 16;
	const headerSize = lang === "BILINGUAL" ? 8 : 9;
	draw(getLabel("Désignation", "Description", lang), { x: xDesc + 5, y: thY, size: headerSize, font: helveticaBold, color: BLACK });
	draw(getLabel("TVA", "VAT", lang), { x: xVat + 5, y: thY, size: headerSize, font: helveticaBold, color: BLACK });
	draw(getLabel("P.U. HT", "Unit Price", lang), { x: xUnit + 5, y: thY, size: headerSize, font: helveticaBold, color: BLACK });
	draw(getLabel("Qté", "Qty", lang), { x: xQty + 5, y: thY, size: headerSize, font: helveticaBold, color: BLACK });
	draw(getLabel("Total HT", "Total", lang), { x: xTotal + 5, y: thY, size: headerSize, font: helveticaBold, color: BLACK });

	y -= headerH;

	// Render individual line items
	for (const line of invoice.lines) {
		const description = sanitizeText(line.description);
		
		// STORY 26.11: GROUP lines rendered as Sub-headers
		if (line.type === "GROUP") {
			const groupRowH = 25;
			drawRect(xDesc, y - groupRowH, CONTENT_WIDTH, groupRowH, true, rgb(0.98, 0.98, 0.98));
			draw(description.toUpperCase(), { 
				x: xDesc + 5, 
				y: y - 16, 
				size: 9, 
				font: helveticaBold, 
				color: DARK 
			});
			y -= groupRowH;
			continue;
		}

		// First split by newlines to preserve explicit line breaks
		const paragraphs = description.split('\n').filter(p => p.trim());
		const lines: string[] = [];
		
		// Then wrap each paragraph
		for (const paragraph of paragraphs) {
			const words = paragraph.split(' ');
			let currentLine = "";
			
			for (const word of words) {
				const testLine = currentLine + (currentLine ? " " : "") + word;
				if (helvetica.widthOfTextAtSize(testLine, 8) < colDescW - 10) {
					currentLine = testLine;
				} else {
					if (currentLine) lines.push(currentLine);
					currentLine = word;
				}
			}
			if (currentLine) lines.push(currentLine);
		}

		const lineSpacing = 11;
		const rowPadding = 8;
		const rowH = Math.max(20, (lines.length * lineSpacing) + (rowPadding * 2));

		drawRect(xDesc, y - rowH, colDescW, rowH);
		drawRect(xVat, y - rowH, colVatW, rowH);
		drawRect(xUnit, y - rowH, colUnitW, rowH);
		drawRect(xQty, y - rowH, colQtyW, rowH);
		drawRect(xTotal, y - rowH, colTotalW, rowH);

		// Render multi-line description
		let textY = y - rowPadding - 6;
		for (const l of lines) {
			draw(l, { x: xDesc + 5, y: textY, size: 8, font: helvetica, color: BLACK });
			textY -= lineSpacing;
		}

		// Values (centered vertically)
		const midY = y - (rowH / 2) - 3;
		draw(`${line.vatRate}%`, { x: xVat + 5, y: midY, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.unitPriceExclVat), { x: xUnit + 5, y: midY, size: 9, font: helvetica, color: BLACK });
		draw(String(line.quantity), { x: xQty + 10, y: midY, size: 9, font: helvetica, color: BLACK });
		draw(formatPrice(line.totalExclVat), { x: xTotal + 5, y: midY, size: 9, font: helvetica, color: BLACK });

		y -= rowH;
	}

	y -= 25;

	// =========================================================================
	// VAT BREAKDOWN TABLE
	// =========================================================================
	const vatDataTableX = LEFT_MARGIN;
	const vatColW = [100, 75, 75]; // Rate Base, Rate, Amount
	
	draw(getLabel("DETAIL TVA", "VAT BREAKDOWN", lang), { x: vatDataTableX, y: y, size: 9, font: helveticaBold, color: DARK });
	y -= 14;
	
	const vatHeaderH = 15;
	drawRect(vatDataTableX, y - vatHeaderH, vatColW[0], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	drawRect(vatDataTableX + vatColW[0], y - vatHeaderH, vatColW[1], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	drawRect(vatDataTableX + vatColW[0] + vatColW[1], y - vatHeaderH, vatColW[2], vatHeaderH, true, rgb(0.95, 0.95, 0.95));
	
	draw(getLabel("Base HT", "Tax Base", lang), { x: vatDataTableX + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	draw(getLabel("Taux", "Rate", lang), { x: vatDataTableX + vatColW[0] + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	draw(getLabel("Montant", "Amount", lang), { x: vatDataTableX + vatColW[0] + vatColW[1] + 5, y: y - 11, size: 7, font: helveticaBold, color: BLACK });
	y -= vatHeaderH;

	// Group lines by VAT rate
	const vatMap = new Map<number, { base: number; vat: number }>();
	for (const line of invoice.lines) {
		const existing = vatMap.get(line.vatRate) || { base: 0, vat: 0 };
		existing.base += line.totalExclVat;
		existing.vat += line.totalVat;
		vatMap.set(line.vatRate, existing);
	}

	for (const [rate, data] of Array.from(vatMap.entries()).sort((a, b) => a[0] - b[0])) {
		const vatRowH = 15;
		drawRect(vatDataTableX, y - vatRowH, vatColW[0], vatRowH);
		drawRect(vatDataTableX + vatColW[0], y - vatRowH, vatColW[1], vatRowH);
		drawRect(vatDataTableX + vatColW[0] + vatColW[1], y - vatRowH, vatColW[2], vatRowH);
		
		draw(formatPrice(data.base), { x: vatDataTableX + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		draw(`${rate}%`, { x: vatDataTableX + vatColW[0] + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		draw(formatPrice(data.vat), { x: vatDataTableX + vatColW[0] + vatColW[1] + 5, y: y - 11, size: 8, font: helvetica, color: BLACK });
		y -= vatRowH;
	}

	// =========================================================================
	// TOTALS
	// =========================================================================

	// Reset y for totals to be consistently aligned with VAT table
	let totalsY = y + (Array.from(vatMap.entries()).length * 15) + vatHeaderH + 14;
	const totalsW = 240;
	const totalsX = RIGHT_MARGIN - totalsW;
	const valueOffset = 140;

	let currentTotalsY = totalsY;

	drawRect(totalsX, currentTotalsY - 20, totalsW, 20);
	draw(getLabel("Total HT", "Total Excl. VAT", lang), { x: totalsX + 10, y: currentTotalsY - 14, size: 9, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalExclVat), { x: totalsX + valueOffset, y: currentTotalsY - 14, size: 9, font: helvetica, color: BLACK });
	currentTotalsY -= 20;

	drawRect(totalsX, currentTotalsY - 20, totalsW, 20);
	draw(getLabel("Total TVA", "Total VAT", lang), { x: totalsX + 10, y: currentTotalsY - 14, size: 9, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalVat), { x: totalsX + valueOffset, y: currentTotalsY - 14, size: 9, font: helvetica, color: BLACK });
	currentTotalsY -= 20;

	drawRect(totalsX, currentTotalsY - 25, totalsW, 25, true, rgb(0.9, 0.9, 0.9));
	draw(getLabel("Total TTC", "Total Incl. VAT", lang), { x: totalsX + 10, y: currentTotalsY - 16, size: 10, font: helveticaBold, color: BLACK });
	draw(formatPrice(invoice.totalInclVat), { x: totalsX + valueOffset, y: currentTotalsY - 16, size: 10, font: helveticaBold, color: BLACK });

	y = Math.min(y, currentTotalsY - 25);

	y -= 45;

	// =========================================================================
	// CONDITIONS DE REGLEMENT / PAYMENT TERMS
	// =========================================================================

	draw(getLabel("CONDITIONS DE REGLEMENT", "PAYMENT TERMS", lang) + ":", { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: DARK });
	y -= 12;
	
	if (invoice.paymentTerms) {
		draw(`${invoice.paymentTerms}`, { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: BLACK });
		y -= 10;
	} else {
		draw(getLabel("Paiement à réception", "Payment upon receipt", lang), { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: BLACK });
		y -= 10;
	}
	
	if (organization.iban) {
		draw(`IBAN: ${organization.iban}`, { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: GRAY });
		y -= 10;
	}
	if (organization.bic) {
		draw(`BIC: ${organization.bic}`, { x: LEFT_MARGIN, y, size: 8, font: helvetica, color: GRAY });
	}

	// =========================================================================
	// SIGNATURE BOX (Left side) - Same structure as Quote
	// Positioned above the legal mentions
	// =========================================================================

	const signatureBoxX = LEFT_MARGIN;
	const signatureBoxW = 200;
	const signatureBoxH = 70;
	// Position signature box ABOVE the footer (footer at Y=60 max, so box bottom at Y=70)
	const signatureBoxY = 70 + signatureBoxH; // Top of box at Y=140

	// Draw the signature box
	drawRect(signatureBoxX, signatureBoxY - signatureBoxH, signatureBoxW, signatureBoxH);
	
	// Title
	draw(getLabel("BON POUR ACCORD", "APPROVED", lang), { x: signatureBoxX + 10, y: signatureBoxY - 15, size: 9, font: helveticaBold, color: BLACK });
	
	// Date field
	draw(`${getLabel("Date", "Date", lang)}:`, { x: signatureBoxX + 10, y: signatureBoxY - 32, size: 8, font: helvetica, color: GRAY });
	page.drawLine({
		start: { x: signatureBoxX + 40, y: signatureBoxY - 34 },
		end: { x: signatureBoxX + 120, y: signatureBoxY - 34 },
		thickness: 0.5,
		color: BLACK,
	});
	
	// Signature label
	draw(`${getLabel("Signature", "Signature", lang)}:`, { x: signatureBoxX + 10, y: signatureBoxY - 50, size: 8, font: helvetica, color: GRAY });

	// =========================================================================
	// FOOTER (Legal mentions) - Below the signature box
	// =========================================================================

	const footerY = 55;
	if (organization.invoiceTerms && organization.invoiceTerms.trim().length > 0) {
		const termsLines = organization.invoiceTerms.split("\n");
		let termsY = footerY;
		for (const line of termsLines.slice(0, 3)) { // Limit to 3 lines in footer
			draw(line, { x: LEFT_MARGIN, y: termsY, size: 7, font: helvetica, color: GRAY });
			termsY -= 10;
		}
	} else {
		// Only minimal fallback if absolutely empty
		draw(getLabel("Paiement à réception", "Payment upon receipt", lang), { x: LEFT_MARGIN, y: footerY, size: 7, font: helvetica, color: GRAY });
	}

	draw(getLabel("Page 1 / 1", "Page 1 / 1", lang), { x: RIGHT_MARGIN - 45, y: footerY - 20, size: 8, font: helvetica, color: GRAY });

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
	const lang = "FRENCH";
	const missionNumber = mission.id.slice(-8).toUpperCase();
	const pickupTime = formatDateTime(mission.pickupAt).split(" ")[1] || "00:00";
	const pickupDate = formatDate(mission.pickupAt);

	// =========================================================================
	// HEADER: Logo + "Fiche de mission" box
	// =========================================================================
	
	// Logo on the left
	let nextSectionY = y - 60;

	if (logoImage) {
		let logoDims;
		if (organization.logoWidth) {
			const scale = organization.logoWidth / logoImage.width;
			logoDims = { width: organization.logoWidth, height: logoImage.height * scale };
		} else {
			// Updated to match drawHeader default (120/50 instead of 80/40) for better consistency
			logoDims = logoImage.scale(Math.min(120 / logoImage.width, 50 / logoImage.height));
		}

		page.drawImage(logoImage, {
			x: LEFT_MARGIN,
			y: y - logoDims.height + 10,
			width: logoDims.width,
			height: logoDims.height,
		});

		// Ensure next section doesn't overlap with logo if it's large
		const logoBottom = y - logoDims.height + 10;
		if (logoBottom - 20 < nextSectionY) {
			nextSectionY = logoBottom - 20;
		}
	} else {
		draw(organization.name, { x: LEFT_MARGIN, y: y - 5, size: 14, font: helveticaBold, color: BLACK });
	}

	// Title box on the right: "Fiche de mission"
	const titleBoxX = 350;
	const titleBoxWidth = 195;
	drawRect(titleBoxX, y - 45, titleBoxWidth, 55, true);
	draw(getLabel("Fiche de mission", "Mission Order", lang), { x: titleBoxX + 15, y: y - 18, size: 14, font: helveticaBold, color: BLACK });
	
	// Reference row: Ref. Devis | N° de mission | N° de version
	const refRowY = y - 32;
	const colW = titleBoxWidth / 3;
	draw(getLabel("Réf. Devis", "Quote Ref.", lang), { x: titleBoxX + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("N° mission", "Mission No.", lang), { x: titleBoxX + colW + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("Version", "Version", lang), { x: titleBoxX + colW * 2 + 5, y: refRowY, size: 6, font: helvetica, color: GRAY });
	
	// Value for Ref Devis (Quote ID short with prefix)
	const refDevisText = `#${mission.id.substring(0, 8).toUpperCase()}`;
	draw(refDevisText, { x: titleBoxX + 5, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });
	
	// Value for Mission Number (Static 1)
	draw("1", { x: titleBoxX + colW + 25, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });
	// Value for Version (Static 1)
	draw("1", { x: titleBoxX + colW * 2 + 25, y: refRowY - 10, size: 8, font: helveticaBold, color: BLACK });

	y = nextSectionY;

	// Dispatch phone
	if (organization.phone) {
		draw(`Dispatch : ${organization.phone}`, { x: LEFT_MARGIN, y, size: 9, font: helveticaBold, color: BLACK });
		y -= 15;
	}

	// Legal text
	// Legal text
	draw(getLabel("Billet collectif équivalent ordre de mission", "Collective ticket equivalent to mission order", lang), {
		x: LEFT_MARGIN, y, size: 6, font: helvetica, color: GRAY
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
	draw(getLabel("Date", "Date", lang), { x: LEFT_MARGIN + col1W / 2 - 10, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });
	draw(getLabel("Client", "Client", lang), { x: LEFT_MARGIN + col1W + col2W / 2 - 15, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });
	draw(getLabel("Chauffeur(s)", "Driver(s)", lang), { x: LEFT_MARGIN + col1W + col2W + col3W / 2 - 30, y: tableY - 12, size: 8, font: helveticaBold, color: BLACK });

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
			draw(`${getLabel("Tél", "Tel", lang)}: ${mission.contact.phone}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.email) {
			draw(`Email: ${mission.contact.email}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.billingAddress) {
			const addrShort = sanitizeText(mission.contact.billingAddress).substring(0, 50);
			draw(`${getLabel("Adresse", "Address", lang)}: ${addrShort}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
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
			draw(`${getLabel("Tél", "Tel", lang)}: ${mission.contact.phone}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.email) {
			draw(`Email: ${mission.contact.email}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
			clientYOffset += 10;
		}
		if (mission.contact.billingAddress) {
			const addrShort = sanitizeText(mission.contact.billingAddress).substring(0, 50);
			draw(`${getLabel("Adresse", "Address", lang)}: ${addrShort}`, { x: clientX, y: tableY - clientYOffset, size: 7, font: helvetica, color: BLACK });
		}
	}
	// Small creation date at bottom of client cell
	draw(`${getLabel("Dossier créé le", "File created on", lang)} ${formatDate(mission.createdAt)}`, { x: clientX, y: tableY - tableH + 5, size: 6, font: helvetica, color: GRAY });

	// Chauffeur cell content - with phone and second driver if present
	const chauffeurX = LEFT_MARGIN + col1W + col2W + 5;
	let chauffeurYOffset = 30;
	
	// Primary driver
	draw(mission.driverName, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 9, font: helveticaBold, color: BLACK });
	chauffeurYOffset += 10;
	if (mission.driverPhone) {
		draw(`${getLabel("Tél", "Tel", lang)}: ${mission.driverPhone}`, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 7, font: helvetica, color: BLACK });
		chauffeurYOffset += 12;
	} else {
		chauffeurYOffset += 8;
	}
	
	// Second driver (for RSE double crew)
	if (mission.secondDriverName) {
		draw(mission.secondDriverName, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 9, font: helveticaBold, color: BLACK });
		chauffeurYOffset += 10;
		if (mission.secondDriverPhone) {
			draw(`${getLabel("Tél", "Tel", lang)}: ${mission.secondDriverPhone}`, { x: chauffeurX, y: tableY - chauffeurYOffset, size: 7, font: helvetica, color: BLACK });
			chauffeurYOffset += 12;
		}
	}

	// Vehicle info at bottom
	draw(getLabel("Type:", "Type:", lang), { x: chauffeurX, y: tableY - tableH + 25, size: 6, font: helvetica, color: GRAY });
	draw(mission.vehicleCategory, { x: chauffeurX + 25, y: tableY - tableH + 25, size: 7, font: helvetica, color: BLACK });
	draw(getLabel("Immat:", "Plate:", lang), { x: chauffeurX, y: tableY - tableH + 15, size: 6, font: helvetica, color: GRAY });
	draw(mission.vehiclePlate || "N/A", { x: chauffeurX + 30, y: tableY - tableH + 15, size: 7, font: helvetica, color: BLACK });
	draw(mission.vehicleName, { x: chauffeurX, y: tableY - tableH + 5, size: 6, font: helvetica, color: GRAY });

	y = tableY - 15 - tableH - 10;

	// =========================================================================
	// SERVICE ROW
	// =========================================================================
	
	const serviceRowH = 80;
	drawRect(LEFT_MARGIN, y - 15, 80, 15, true);
	draw(getLabel("Service", "Service", lang), { x: LEFT_MARGIN + 25, y: y - 12, size: 8, font: helveticaBold, color: BLACK });
	drawRect(LEFT_MARGIN + 80, y - 15, 160, 15, true);
	draw(getLabel("Passager(s) : ", "Passenger(s): ", lang) + mission.passengerCount, { x: LEFT_MARGIN + 100, y: y - 12, size: 8, font: helveticaBold, color: BLACK });
	drawRect(LEFT_MARGIN + 240, y - 15, 255, 15, true);
	draw(getLabel("Note au chauffeur", "Note to driver", lang), { x: LEFT_MARGIN + 320, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 15 - serviceRowH, 80, serviceRowH);
	drawRect(LEFT_MARGIN + 80, y - 15 - serviceRowH, 160, serviceRowH);
	drawRect(LEFT_MARGIN + 240, y - 15 - serviceRowH, 255, serviceRowH);

	// Story 25.1: Dynamic Service Type - Using actual TripType enum values
	const serviceTypeMap: Record<string, string> = {
		"TRANSFER": "Transfert",
		"DISPO": "Mise à disposition",
		"EXCURSION": "Excursion",
		"OFF_GRID": "Hors grille",
		"STAY": "Séjour",
		// Legacy mappings for backward compatibility
		"TRANSFER_ONE_WAY": "Transfert",
		"TRANSFER_RETURN": "Transfert A/R",
		"HOURLY": "Mise à disposition",
	};
	const serviceLabel = serviceTypeMap[mission.tripType] || mission.tripType;
	
	// Draw Service Label aligned
	const serviceY = y - 35;
	const serviceWords = serviceLabel.split(" ");
	if (serviceWords.length > 2) {
		// Multi-line wrap
		draw(serviceWords.slice(0, 2).join(" "), { x: LEFT_MARGIN + 5, y: serviceY, size: 8, font: helveticaBold, color: BLACK });
		draw(serviceWords.slice(2).join(" "), { x: LEFT_MARGIN + 5, y: serviceY - 10, size: 8, font: helveticaBold, color: BLACK });
	} else {
		draw(serviceLabel, { x: LEFT_MARGIN + 5, y: serviceY, size: 8, font: helveticaBold, color: BLACK });
	}



	// Passenger details - booking values
	const paxX = LEFT_MARGIN + 85;
	draw(`${getLabel("Adulte(s) prévus :", "Adult(s) expected:", lang)} ${mission.passengerCount}`, { x: paxX, y: y - 30, size: 7, font: helvetica, color: BLACK });
	draw(`${getLabel("Bagage(s) prévus :", "Luggage expected:", lang)} ${mission.luggageCount}`, { x: paxX, y: y - 40, size: 7, font: helvetica, color: BLACK });
	
	// Empty fields to be filled by driver after mission
	const labelRealAdults = getLabel("Nombre réel adulte(s) :", "Real number of adult(s):", lang);
	const widthRealAdults = helveticaBold.widthOfTextAtSize(labelRealAdults, 7);
	draw(labelRealAdults, { x: paxX, y: y - 55, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + widthRealAdults + 2, y: y - 57 }, end: { x: paxX + widthRealAdults + 50, y: y - 57 }, thickness: 0.5, color: BLACK });

	const labelRealChildren = getLabel("Nombre réel enfant(s) :", "Real number of children:", lang);
	const widthRealChildren = helveticaBold.widthOfTextAtSize(labelRealChildren, 7);
	draw(labelRealChildren, { x: paxX, y: y - 65, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + widthRealChildren + 2, y: y - 67 }, end: { x: paxX + widthRealChildren + 50, y: y - 67 }, thickness: 0.5, color: BLACK });

	const labelRealLuggage = getLabel("Nombre de bagage(s) réel :", "Real number of luggage:", lang);
	const widthRealLuggage = helveticaBold.widthOfTextAtSize(labelRealLuggage, 7);
	draw(labelRealLuggage, { x: paxX, y: y - 75, size: 7, font: helveticaBold, color: BLACK });
	page.drawLine({ start: { x: paxX + widthRealLuggage + 2, y: y - 77 }, end: { x: paxX + widthRealLuggage + 50, y: y - 77 }, thickness: 0.5, color: BLACK });

	// Notes section - with End Customer for partner missions
	const notesX = LEFT_MARGIN + 245;
	let notesYOffset = 30;
	
	// Story 25.1: For partner missions, display End Customer prominently
	if (mission.contact.isPartner && mission.endCustomer) {
		const endCustName = `${mission.endCustomer.firstName} ${mission.endCustomer.lastName}`;
		draw(`${getLabel("PASSAGER", "PASSENGER", lang)}: ${endCustName}`, { x: notesX, y: y - notesYOffset, size: 8, font: helveticaBold, color: BLACK });
		notesYOffset += 12;
		if (mission.endCustomer.phone) {
			draw(`${getLabel("Tél", "Tel", lang)}: ${mission.endCustomer.phone}`, { x: notesX, y: y - notesYOffset, size: 7, font: helvetica, color: BLACK });
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

	y = y - 15 - serviceRowH - 10;

	// =========================================================================
	// PICKUP AND DESTINATION
	// =========================================================================
	
	// Prise en charge header
	drawRect(LEFT_MARGIN, y - 15, CONTENT_WIDTH, 15, true);
	draw(getLabel("Prise en charge", "Pickup", lang), { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 30, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

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
	draw(getLabel("Réel : ", "Real: ", lang), { x: LEFT_MARGIN + 2, y: y - 48, size: 6, font: helvetica, color: GRAY });
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
	draw(getLabel("Destination", "Destination", lang), { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 25, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	drawRect(LEFT_MARGIN, y - 55, CONTENT_WIDTH - 80, 40);
	drawRect(LEFT_MARGIN + CONTENT_WIDTH - 80, y - 55, 80, 40);

	draw((mission.dropoffAddress || getLabel("A définir", "To be defined", lang)).substring(0, 70), { x: LEFT_MARGIN + 5, y: y - 38, size: 9, font: helveticaBold, color: BLACK });
	
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
	draw(getLabel("Informations obligatoires à compléter", "Mandatory information to complete", lang), { x: LEFT_MARGIN + CONTENT_WIDTH / 2 - 95, y: y - 12, size: 8, font: helveticaBold, color: BLACK });

	// Column headers for driver inputs
	const inputColW = CONTENT_WIDTH / 5;
	drawRect(LEFT_MARGIN, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 2, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 3, y - 35, inputColW, 20, true);
	drawRect(LEFT_MARGIN + inputColW * 4, y - 35, inputColW, 20, true);

	draw(getLabel("Heure départ garage", "Garage departure time", lang), { x: LEFT_MARGIN + 2, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("Heure retour garage", "Garage return time", lang), { x: LEFT_MARGIN + inputColW + 2, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("Km départ", "Start Km", lang), { x: LEFT_MARGIN + inputColW * 2 + 10, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("Km arrivée", "End Km", lang), { x: LEFT_MARGIN + inputColW * 3 + 10, y: y - 28, size: 6, font: helvetica, color: GRAY });
	draw(getLabel("TOTAL km", "TOTAL km", lang), { x: LEFT_MARGIN + inputColW * 4 + 10, y: y - 28, size: 6, font: helvetica, color: GRAY });

	// Empty input cells - Increased height (35px)
	const cellHeight = 35;
	for (let i = 0; i < 5; i++) {
		drawRect(LEFT_MARGIN + inputColW * i, y - 35 - cellHeight, inputColW, cellHeight);
	}

	y -= (35 + cellHeight + 10); // Adjust Y based on new height

	// =========================================================================
	// BLOC UNIFIÉ : OBSERVATIONS & FRAIS (Unified Block)
	// Ratio updated: 75% Observations / 25% Frais
	// =========================================================================
	
	const blockSize = 110; // Hauteur totale du bloc
	const splitRatio = 0.75; // 75% pour Observations
	const splitX = LEFT_MARGIN + (CONTENT_WIDTH * splitRatio);
	
	// Grand rectangle conteneur
	drawRect(LEFT_MARGIN, y - blockSize, CONTENT_WIDTH, blockSize);
	
	// Ligne verticale de séparation (Obs vs Frais)
	page.drawLine({
		start: { x: splitX, y: y },
		end: { x: splitX, y: y - blockSize },
		thickness: 1,
		color: BLACK
	});

	// --- PARTIE GAUCHE : OBSERVATIONS ---
	// Header Observations
	drawRect(LEFT_MARGIN, y - 20, splitX - LEFT_MARGIN, 20, true); // Header background
	draw(getLabel("OBSERVATIONS FIN DE MISSION", "END OF MISSION OBSERVATIONS", lang), { 
		x: LEFT_MARGIN + 10, 
		y: y - 13, 
		size: 8, 
		font: helveticaBold, 
		color: BLACK 
	});

	// --- PARTIE DROITE : FRAIS / DEBOURS ---
	// Header Frais
	drawRect(splitX, y - 20, RIGHT_MARGIN - splitX, 20, true); // Header background
	draw(getLabel("FRAIS / DÉBOURS", "EXPENSES / DISBURSEMENTS", lang), { 
		x: splitX + 5, 
		y: y - 13, 
		size: 7, 
		font: helveticaBold, 
		color: BLACK 
	});

	// Lignes de frais (5 items: Repas, Parking, Peage, Divers, Total)
	const expenseItems = [
		getLabel("Repas", "Meals", lang),
		getLabel("Parking", "Parking", lang), 
		getLabel("Péage", "Tolls", lang), 
		getLabel("Divers", "Misc", lang), 
		getLabel("TOTAL", "TOTAL", lang)
	];
	const rowHeight = (blockSize - 20) / expenseItems.length; // 90px / 5 = 18px
	
	// Vertical separator for amounts in Frais column
	const amountColX = splitX + (RIGHT_MARGIN - splitX) * 0.6; // 60% of the column for label

	page.drawLine({
		start: { x: amountColX, y: y - 20 }, // Start below header
		end: { x: amountColX, y: y - blockSize },
		thickness: 0.5,
		color: BLACK
	});

	expenseItems.forEach((item, index) => {
		const lineY = y - 20 - (rowHeight * index); // Start below header
		const nextLineY = lineY - rowHeight;
		
		// Ligne de séparation horizontale (pour toutes les lignes sauf la dernière si fond de case)
		if (index < expenseItems.length) {
			page.drawLine({ 
				start: { x: splitX, y: nextLineY }, 
				end: { x: RIGHT_MARGIN, y: nextLineY }, 
				thickness: 0.5, 
				color: BLACK 
			});
		}

		const isTotal = item === "TOTAL";
		
		draw(item, { 
			x: splitX + 5, 
			y: lineY - 12, 
			size: 8, 
			font: isTotal ? helveticaBold : helvetica, 
			color: BLACK 
		});
		
		// Zone montant (€) - Centered in amount column
		draw("€", { 
			x: amountColX + 5, 
			y: lineY - 12, 
			size: 8, 
			font: helvetica, 
			color: GRAY 
		});
	});

	// =========================================================================
	// FOOTER - Legal info (Expanded)
	// =========================================================================
	
	const footerY = 35;

	// Custom Terms for Mission Order
	if (organization.missionOrderTerms) {
		const termsLines = organization.missionOrderTerms.split("\n");
		let termsY = footerY + 60; // Start comfortably above the divider
		draw(getLabel("CONDITIONS", "TERMS", lang) + ":", { x: LEFT_MARGIN, y: termsY, size: 8, font: helveticaBold, color: BLACK });
		termsY -= 10;
		for (const line of termsLines.slice(0, 5)) { // Limit to 5 lines to avoid overflow
			draw(line, { x: LEFT_MARGIN, y: termsY, size: 7, font: helvetica, color: BLACK });
			termsY -= 9;
		}
	}
	
	// Build complete address string
	const fullAddress = formatOrganizationAddressLines(organization).join(", ");
	
	// Line 1: Company Name, Legal Form, Capital, Complete Address
	const legalLine1 = [
		organization.name,
		organization.capital ? `Capital: ${organization.capital}` : "",
		fullAddress
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
