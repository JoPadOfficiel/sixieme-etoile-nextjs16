/**
 * Documents API Route
 * Story 7.5: Document Generation & Storage
 *
 * Provides endpoints for generating and managing PDF documents
 * for quotes, invoices, and mission orders.
 */

import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import { format } from "date-fns";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import { getStorageService } from "../../services/document-storage";
import {
	type DocumentLanguage,
	buildInvoiceLines,
	buildStayInvoiceLines,
	buildTripDescription,
	calculateTransportAmount,
	parseAppliedRules,
} from "../../services/invoice-line-builder";
import { buildEnrichedDescription } from "../../services/invoice-line-utils";
import {
	type ContactPdfData,
	type InvoiceLinePdfData,
	type InvoicePdfData,
	type MissionOrderPdfData,
	type MissionSheetPdfData,
	type OrganizationPdfData,
	type QuotePdfData,
	generateInvoicePdf,
	generateMissionOrderPdf,
	generateMissionSheetPdf,
	generateQuotePdf,
} from "../../services/pdf-generator";

// ============================================================================
// Validation Schemas
// ============================================================================

const listDocumentsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	type: z.string().optional().describe("Filter by document type code"),
	quoteId: z.string().optional().describe("Filter by quote ID"),
	invoiceId: z.string().optional().describe("Filter by invoice ID"),
	search: z.string().optional().describe("Search in filename, contact name"),
	dateFrom: z.string().datetime().optional(),
	dateTo: z.string().datetime().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

import sharp from "sharp";

/**
 * Check if buffer is SVG (basic check)
 */
function isSvg(buffer: Buffer): boolean {
	const str = buffer.slice(0, 100).toString().trim().toLowerCase();
	return str.includes("<svg") || str.includes("<?xml");
}

/**
 * Helper to load logo as Base64 Data URI
 * Supports both local storage paths and public HTTP URLs
 * Converts SVG to PNG using sharp
 */
async function loadLogoAsBase64(
	pathOrUrl: string | null | undefined,
): Promise<string | null> {
	if (!pathOrUrl) return null;
	// Security: Prevent directory traversal
	if (pathOrUrl.includes("..")) {
		console.error(
			"Potential directory traversal attempt in logo path:",
			pathOrUrl,
		);
		return null;
	}
	try {
		let buffer: Buffer;
		let mime = "image/jpeg"; // Default

		if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
			const res = await fetch(pathOrUrl);
			if (!res.ok) {
				console.error(`Failed to fetch logo URL: ${res.status}`);
				return null;
			}
			const arr = await res.arrayBuffer();
			buffer = Buffer.from(arr);

			const contentType = res.headers.get("content-type");
			if (contentType) mime = contentType;
		} else {
			const storage = getStorageService();
			try {
				buffer = await storage.getBuffer(pathOrUrl);
			} catch (e: any) {
				// Fallback: Check public/uploads for local dev (ENOENT)
				if (e.code === "ENOENT" && process.env.NODE_ENV !== "production") {
					try {
						const fs = require("fs/promises");
						const path = require("path");
						// Try to find the file in public/uploads/document-logos
						// process.cwd() is likely apps/web in Next.js
						// So we look in public/uploads relative to CWD
						const fallbackPath = path.join(
							process.cwd(),
							"public/uploads/document-logos",
							pathOrUrl,
						);
						console.log(`Fallback: Checking logo at ${fallbackPath}`);
						buffer = await fs.readFile(fallbackPath);
					} catch (fallbackError) {
						console.error("Logo fallback failed:", fallbackError);
						return null; // Both failed, return null to continue PDF generation without logo
					}
				} else {
					console.error("Logo load failed (storage):", e);
					return null; // Return null on any storage error to prevent crash
				}
			}

			if (pathOrUrl.toLowerCase().endsWith(".png")) {
				mime = "image/png";
			} else if (pathOrUrl.toLowerCase().endsWith(".svg")) {
				mime = "image/svg+xml";
			}
		}

		// Convert SVG to PNG
		if (
			mime === "image/svg+xml" ||
			pathOrUrl.toLowerCase().endsWith(".svg") ||
			isSvg(buffer)
		) {
			console.log("Converting SVG logo to PNG...");
			try {
				buffer = await sharp(buffer).png().toBuffer();
				mime = "image/png";
			} catch (sharpError) {
				console.error("Failed to convert SVG to PNG:", sharpError);
				return null; // Fail safe
			}
		}

		return `data:${mime};base64,${buffer.toString("base64")}`;
	} catch (e) {
		console.error("Logo load failed:", e);
		return null; // Fail silently to allow PDF generation without logo
	}
}

/**
 * Transform organization to PDF data format
 */
/**
 * Transform organization to PDF data format
 */
function transformOrganizationToPdfData(
	org: Prisma.OrganizationGetPayload<{
		include: { organizationPricingSettings: true };
	}>,
): OrganizationPdfData {
	const settings = org.organizationPricingSettings;

	// Parse metadata for legal info (Story 25.1)
	let metadata: any = {};
	if (org.metadata) {
		if (typeof org.metadata === "string") {
			try {
				metadata = JSON.parse(org.metadata);
			} catch {}
		} else {
			metadata = org.metadata;
		}
	}

	return {
		logo: org.logo,
		// Story 25.3: Branding
		documentLogoUrl: settings?.documentLogoUrl,
		brandColor: settings?.brandColor,
		logoPosition: settings?.logoPosition,
		showCompanyName: settings?.showCompanyName,
		logoWidth: settings?.logoWidth,

		// Story 25.4: Document Settings
		documentLanguage: settings?.documentLanguage ?? "BILINGUAL",
		invoiceTerms: settings?.invoiceTerms,
		quoteTerms: settings?.quoteTerms,
		missionOrderTerms: settings?.missionOrderTerms,

		// Story 25.2: EU Compliance - Complete address and legal info
		name: settings?.legalName ?? org.name,
		address:
			(typeof metadata.address === "string" ? metadata.address : null) ??
			settings?.address ??
			null,
		addressLine2: metadata.addressLine2 ?? settings?.addressLine2 ?? null,
		postalCode: metadata.postalCode ?? settings?.postalCode ?? null,
		city: metadata.city ?? settings?.city ?? null,
		phone: metadata.phone ?? settings?.phone ?? null,
		email: metadata.email ?? settings?.email ?? null,

		siret: metadata.siret ?? settings?.siret ?? null,
		vatNumber: metadata.vatNumber ?? settings?.vatNumber ?? null,
		iban: metadata.iban ?? settings?.iban ?? null,
		bic: metadata.bic ?? settings?.bic ?? null,

		// Extended legal info for Mission Order footer
		rcs: metadata.rcs ?? (settings as any)?.rcs ?? null,
		rm: metadata.rm ?? null,
		ape: metadata.ape ?? (settings as any)?.ape ?? null, // Code NAF
		capital: (settings as any)?.capital ?? null, // Capital often manually set
		licenseVtc: (settings as any)?.licenseVtc ?? null,
	};
}

/**
 * Transform contact to PDF data format
 */
function transformContactToPdfData(contact: {
	displayName: string;
	companyName?: string | null;
	billingAddress?: string | null;
	email?: string | null;
	phone?: string | null;
	vatNumber?: string | null;
	siret?: string | null;
	isPartner: boolean;
}): ContactPdfData {
	return {
		displayName: contact.displayName,
		companyName: contact.companyName,
		billingAddress: contact.billingAddress,
		email: contact.email,
		phone: contact.phone,
		vatNumber: contact.vatNumber,
		siret: contact.siret,
		isPartner: contact.isPartner,
	};
}

/**
 * Transform quote to PDF data format
 * Uses unknown for Decimal fields to handle Prisma types
 */
function transformQuoteToPdfData(
	quote: {
		id: string;
		pickupAddress: string;
		dropoffAddress: string | null;
		pickupAt: Date;
		passengerCount: number;
		luggageCount: number;
		finalPrice: unknown;
		internalCost?: unknown;
		marginPercent?: unknown;
		pricingMode: string;
		tripType: string;
		status: string;
		validUntil?: Date | null;
		notes?: string | null;
		createdAt: Date;
		contact: {
			displayName: string;
			companyName?: string | null;
			billingAddress?: string | null;
			email?: string | null;
			phone?: string | null;
			vatNumber?: string | null;
			siret?: string | null;
			isPartner: boolean;
		};
		vehicleCategory?: {
			name: string;
		} | null;
		// Story 24.5: EndCustomer for partner agency sub-contacts
		endCustomer?: {
			firstName: string;
			lastName: string;
			email?: string | null;
			phone?: string | null;
		} | null;
		// New fields for line item generation
		appliedRules?: any;
		stayDays?: any[];
		// Story 26.11: Hybrid Blocks support
		lines?: Prisma.QuoteLineGetPayload<any>[];
	},
	language: DocumentLanguage = "BILINGUAL",
): QuotePdfData {
	// Parse applied rules
	const parsedRules = parseAppliedRules(quote.appliedRules);

	let lines: InvoiceLinePdfData[] = [];

	if (
		quote.tripType === "STAY" &&
		quote.stayDays &&
		quote.stayDays.length > 0
	) {
		// Use stay invoice line builder
		const invoiceLines = buildStayInvoiceLines(
			quote.stayDays,
			parsedRules,
			quote.endCustomer
				? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
				: null,
		);
		lines = invoiceLines.map((l) => ({
			description: l.description,
			quantity: l.quantity,
			unitPriceExclVat: l.unitPriceExclVat,
			vatRate: l.vatRate,
			totalExclVat: l.totalExclVat,
			totalVat: l.totalVat,
		}));
	} else {
		// Standard quote
		const transportAmount = calculateTransportAmount(
			Number(quote.finalPrice),
			parsedRules,
		);
		const endCustomerName = quote.endCustomer
			? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
			: null;

		// Build trip context for detailed descriptions with language support
		const tripContext = {
			pickupAddress: quote.pickupAddress,
			dropoffAddress: quote.dropoffAddress,
			pickupAt: quote.pickupAt,
			passengerCount: quote.passengerCount,
			luggageCount: quote.luggageCount,
			vehicleCategory: quote.vehicleCategory?.name || "Standard",
			tripType: quote.tripType,
			endCustomerName,
			language, // Pass language for localized descriptions
		};

		const invoiceLines = buildInvoiceLines(
			transportAmount,
			quote.pickupAddress,
			quote.dropoffAddress,
			parsedRules,
			endCustomerName,
			tripContext, // Pass trip context for detailed descriptions
		);
		lines = invoiceLines.map((l) => ({
			description: l.description,
			quantity: l.quantity,
			unitPriceExclVat: l.unitPriceExclVat,
			vatRate: l.vatRate,
			totalExclVat: l.totalExclVat,
			totalVat: l.totalVat,
		}));
	}

	// Story 26.11: Use QuoteLine lines if available (Hybrid Blocks / Universal Mode)
	// This overrides the legacy line generation above
	if (quote.lines && quote.lines.length > 0) {
		lines = quote.lines.map((l) => {
			const display =
				(l.displayData as unknown as {
					label?: string;
					quantity?: number;
					unitPrice?: number;
					totalPrice?: number;
					vatRate?: number;
					totalVat?: number;
				}) || {};

			// Generate enriched description on the fly for Quote PDF
			// This ensures we have full details (Date, Route, Pax, etc.) even for multi-item quotes
			const enrichedDescription = buildEnrichedDescription(
				l as any,
				quote.endCustomer
					? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
					: null,
				false, // No "Client:" prefix on individual lines for quotes usually, or maybe true for first? Let's check logic.
				// Actually, buildEnrichedDescription handles isFirstLine logic internally for customer name.
				// But here we are mapping all lines. Let's pass false and maybe rely on endCustomer in header or footer.
				// Wait, buildEnrichedDescription adds customer name if isFirstLine=true.
				// For quotes, we usually want detailed descriptions.
				{ locale: "fr-FR" }, // Default to FR for now as per previous logic, or map from language param?
			);

			// Use enriched description if available, otherwise fallback to label
			// But buildEnrichedDescription already falls back to label.
			// However, if we have a specific manual override in display.label, maybe we should use it?
			// The original logic was: display.label || l.label
			// If user manually changed label in UI, we should respect it.
			// But usually sourceData is the truth for details.

			// Strategy: Use enriched description unless display.label is explicitly different from l.label (manual edit)
			// For safety in this "Restricted" context, let's prioritize the detailed description
			// because the user complaint is about MISSING details.

			return {
				description: enrichedDescription, // FORCE detailed description
				quantity: Number(display.quantity ?? 1),
				unitPriceExclVat: Number(display.unitPrice ?? 0),
				vatRate: Number(display.vatRate ?? 0),
				totalExclVat: Number(display.totalPrice ?? 0),
				// Calculate VAT amount if not present
				totalVat: Number(
					display.totalVat ??
						Number(display.totalPrice ?? 0) *
							(Number(display.vatRate ?? 0) / 100),
				),
				type: (l.type as any) || "CALCULATED",
			};
		});
	}

	return {
		id: quote.id,
		pickupAddress: quote.pickupAddress,
		dropoffAddress: quote.dropoffAddress ?? "",
		pickupAt: quote.pickupAt,
		passengerCount: quote.passengerCount,
		luggageCount: quote.luggageCount,
		vehicleCategory: quote.vehicleCategory?.name || "Standard",
		finalPrice: Number(quote.finalPrice),
		internalCost: quote.internalCost ? Number(quote.internalCost) : null,
		marginPercent: quote.marginPercent ? Number(quote.marginPercent) : null,
		pricingMode: quote.pricingMode,
		tripType: quote.tripType,
		status: quote.status,
		validUntil: quote.validUntil,
		notes: quote.notes,
		contact: transformContactToPdfData(quote.contact),
		createdAt: quote.createdAt,
		// Story 24.5: Include endCustomer for PDF display
		endCustomer: quote.endCustomer
			? {
					firstName: quote.endCustomer.firstName,
					lastName: quote.endCustomer.lastName,
					email: quote.endCustomer.email,
					phone: quote.endCustomer.phone,
				}
			: null,
		lines,
	};
}

/**
 * Transform invoice to PDF data format
 * Uses unknown for Decimal fields to handle Prisma types
 */
function transformInvoiceToPdfData(
	invoice: {
		id: string;
		number: string;
		issueDate: Date;
		dueDate: Date;
		totalExclVat: unknown;
		totalVat: unknown;
		totalInclVat: unknown;
		commissionAmount?: unknown;
		notes?: string | null;
		contact: {
			displayName: string;
			companyName?: string | null;
			billingAddress?: string | null;
			email?: string | null;
			phone?: string | null;
			vatNumber?: string | null;
			isPartner: boolean;
			partnerContract?: {
				paymentTerms?: string | null;
			} | null;
		};
		lines: {
			description: string;
			quantity: unknown;
			unitPriceExclVat: unknown;
			vatRate: unknown;
			totalExclVat: unknown;
			totalVat: unknown;
		}[];
		// Story 24.6: EndCustomer for partner agency invoices
		endCustomer?: {
			firstName: string;
			lastName: string;
			email?: string | null;
			phone?: string | null;
		} | null;
		// Quote ID for reference
		quoteId?: string | null;
		// Quote details for trip info
		quote?: {
			pickupAddress: string;
			dropoffAddress?: string | null;
			pickupAt: Date;
			passengerCount: number;
			luggageCount: number;
			tripType: string;
			vehicleCategory?: { name: string } | null;
		} | null;
	},
	language: DocumentLanguage = "BILINGUAL",
): InvoicePdfData {
	// Build detailed description (legacy behavior) or use displayData (Hybrid behavior)
	const lines = invoice.lines.map((line): InvoiceLinePdfData => {
		const display = (line as any).displayData || {};
		// Prioritize the persisted description (which is already enriched with details)
		// over the display label, unless the display label is explicitly set (e.g. manual override)
		// Actually, standard InvoiceLines created by InvoiceFactory already have the FULL enriched description in 'description'.
		// So we should just use line.description directly.
		return {
			description: line.description || display.label || "",
			quantity: Number(display.quantity ?? line.quantity),
			unitPriceExclVat: Number(display.unitPrice ?? line.unitPriceExclVat),
			vatRate: Number(display.vatRate ?? line.vatRate),
			totalExclVat: Number(display.totalPrice ?? line.totalExclVat),
			totalVat: Number(display.totalVat ?? line.totalVat),
			type: (line as any).blockType || "CALCULATED",
		};
	});

	// Legacy: Replace first line's description with detailed trip info IFF it's a legacy invoice (no Hybrid lines)
	// We assume it's legacy if all lines are standard CALCULATED and don't explicitly rely on displayData overrides
	// However, usually Hybrid Mode implies we want strict display.
	// If the user manually edited lines (MANUAL or modified CALCULATED), we should respect it.
	// We skip the legacy override if we detect we are in "Universal Blocks" mode (Story 26.1).
	// A simple heuristic: if we have more than 1 line OR any line is GROUP/MANUAL, we skip the override.
	const isStrictDisplayMode =
		lines.some((l) => l.type === "GROUP" || l.type === "MANUAL") ||
		lines.length > 1;

	if (
		!isStrictDisplayMode &&
		invoice.quote &&
		lines.length > 0 &&
		lines[0].type === "CALCULATED"
	) {
		const q = invoice.quote;

		const endCustomerName = invoice.endCustomer
			? `${invoice.endCustomer.firstName} ${invoice.endCustomer.lastName}`
			: null;

		// Use language-aware description builder
		const detailedDescription = buildTripDescription({
			pickupAddress: q.pickupAddress,
			dropoffAddress: q.dropoffAddress ?? null,
			pickupAt: q.pickupAt,
			passengerCount: q.passengerCount,
			luggageCount: q.luggageCount,
			vehicleCategory: q.vehicleCategory?.name || "Standard",
			tripType: q.tripType,
			endCustomerName,
			language,
		});

		lines[0] = { ...lines[0], description: detailedDescription };
	}

	return {
		id: invoice.id,
		number: invoice.number,
		issueDate: invoice.issueDate,
		dueDate: invoice.dueDate,
		totalExclVat: Number(invoice.totalExclVat),
		totalVat: Number(invoice.totalVat),
		totalInclVat: Number(invoice.totalInclVat),
		commissionAmount: invoice.commissionAmount
			? Number(invoice.commissionAmount)
			: null,
		notes: invoice.notes,
		contact: transformContactToPdfData(invoice.contact),
		lines,
		paymentTerms: invoice.contact.partnerContract?.paymentTerms || null,
		endCustomer: invoice.endCustomer
			? {
					firstName: invoice.endCustomer.firstName,
					lastName: invoice.endCustomer.lastName,
					email: invoice.endCustomer.email,
					phone: invoice.endCustomer.phone,
				}
			: null,
		// Include quote reference for display in invoice PDF
		quoteReference: invoice.quoteId
			? invoice.quoteId.slice(-8).toUpperCase()
			: null,
		// Include trip details from quote
		tripDetails: invoice.quote
			? {
					pickupAddress: invoice.quote.pickupAddress,
					dropoffAddress: invoice.quote.dropoffAddress,
					pickupAt: invoice.quote.pickupAt,
					passengerCount: invoice.quote.passengerCount,
					luggageCount: invoice.quote.luggageCount,
					vehicleCategory: invoice.quote.vehicleCategory?.name || "Standard",
					tripType: invoice.quote.tripType,
				}
			: null,
	};
}

/**
 * Story 25.1: Transform mission to PDF data format
 */
function transformMissionToPdfData(quote: any): MissionOrderPdfData {
	const baseData = transformQuoteToPdfData(quote);
	// Build driver name from firstName + lastName (Driver model doesn't have displayName)
	const driverName = quote.assignedDriver
		? `${quote.assignedDriver.firstName} ${quote.assignedDriver.lastName}`.trim()
		: "À désigner";
	const driverPhone = quote.assignedDriver?.phone || null;

	// Story 25.1: Second driver for RSE double crew missions
	const secondDriverName = quote.secondDriver
		? `${quote.secondDriver.firstName} ${quote.secondDriver.lastName}`.trim()
		: null;
	const secondDriverPhone = quote.secondDriver?.phone || null;

	// Build vehicle name from internalName or registrationNumber
	const vehicleName =
		quote.assignedVehicle?.internalName ||
		quote.assignedVehicle?.registrationNumber ||
		"À désigner";
	return {
		...baseData,
		driverName,
		driverPhone,
		secondDriverName,
		secondDriverPhone,
		vehicleName,
		vehiclePlate: quote.assignedVehicle?.registrationNumber,
		// Story 26.12: Determine if this is a Manual/Yolo mission
		isManual:
			quote.lines && quote.lines.length > 0
				? quote.lines[0].type === "MANUAL"
				: false,
		displayLabel:
			quote.lines && quote.lines.length > 0
				? quote.lines[0].displayData?.label || quote.lines[0].label
				: null,
	};
}

/**
 * Generate filename for document
 */
function generateFilename(type: string, reference: string): string {
	const dateStr = format(new Date(), "yyyyMMdd");
	// Add timestamp to ensure unique filename on each generation for cache busting
	const timeStr = format(new Date(), "HHmmss");
	const refShort = reference.slice(-8).toUpperCase();

	switch (type) {
		case "QUOTE_PDF":
			return `DEVIS-${refShort}-${dateStr}-${timeStr}.pdf`;
		case "INVOICE_PDF":
			return `FACTURE-${reference}-${dateStr}-${timeStr}.pdf`;
		case "MISSION_ORDER":
			return `ORDRE-MISSION-${refShort}-${dateStr}-${timeStr}.pdf`;
		default:
			return `DOCUMENT-${refShort}-${dateStr}-${timeStr}.pdf`;
	}
}

// ============================================================================
// Routes
// ============================================================================

export const documentsRouter = new Hono()
	.basePath("/documents")
	.use("*", organizationMiddleware)

	// List documents
	.get(
		"/",
		validator("query", listDocumentsSchema),
		describeRoute({
			summary: "List documents",
			description:
				"Get a paginated list of generated documents for the current organization",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const {
				page,
				limit,
				type,
				quoteId,
				invoiceId,
				search,
				dateFrom,
				dateTo,
			} = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause
			const baseWhere: Prisma.DocumentWhereInput = {
				...(quoteId && { quoteId }),
				...(invoiceId && { invoiceId }),
			};

			// Filter by document type
			if (type) {
				baseWhere.documentType = { code: type };
			}

			// Add search filter - search in invoice number only since filename and quote relations may not exist
			if (search) {
				baseWhere.OR = [
					{ invoice: { number: { contains: search, mode: "insensitive" } } },
					{
						invoice: {
							contact: {
								displayName: { contains: search, mode: "insensitive" },
							},
						},
					},
				];
			}

			// Add date range filter
			if (dateFrom || dateTo) {
				baseWhere.createdAt = {
					...(dateFrom && { gte: new Date(dateFrom) }),
					...(dateTo && { lte: new Date(dateTo) }),
				};
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [documents, total] = await Promise.all([
				db.document.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						documentType: true,
						invoice: {
							select: {
								id: true,
								number: true,
								contact: {
									select: {
										displayName: true,
									},
								},
							},
						},
					},
				}),
				db.document.count({ where }),
			]);

			return c.json({
				data: documents,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single document
	.get(
		"/:id",
		describeRoute({
			summary: "Get document",
			description: "Get a single document by ID",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const document = await db.document.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					documentType: true,
					invoice: {
						include: {
							contact: true,
							lines: true,
						},
					},
				},
			});

			if (!document) {
				throw new HTTPException(404, {
					message: "Document not found",
				});
			}

			return c.json(document);
		},
	)

	// Download document file
	.get(
		"/:id/download",
		describeRoute({
			summary: "Download document",
			description: "Download the PDF file for a document",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const document = await db.document.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!document) {
				throw new HTTPException(404, {
					message: "Document not found",
				});
			}

			if (!document.storagePath) {
				throw new HTTPException(404, {
					message: "Document file not found",
				});
			}

			const storage = getStorageService();
			const buffer = await storage.getBuffer(document.storagePath);

			return new Response(new Uint8Array(buffer), {
				headers: {
					"Content-Type": "application/pdf",
					"Content-Disposition": `attachment; filename="document.pdf"`,
					"Content-Length": buffer.length.toString(),
				},
			});
		},
	)

	// Serve file directly (for local storage)
	.get(
		"/file/:path",
		describeRoute({
			summary: "Serve document file",
			description: "Serve a document file directly (for local storage)",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const storagePath = decodeURIComponent(c.req.param("path"));

			const storage = getStorageService();

			// Security check: ensure path doesn't escape storage directory
			if (storagePath.includes("..")) {
				throw new HTTPException(400, {
					message: "Invalid file path",
				});
			}

			try {
				const buffer = await storage.getBuffer(storagePath);

				return new Response(new Uint8Array(buffer), {
					headers: {
						"Content-Type": "application/pdf",
						"Cache-Control": "private, max-age=3600",
					},
				});
			} catch {
				throw new HTTPException(404, {
					message: "File not found",
				});
			}
		},
	)

	// Generate quote PDF
	.post(
		"/generate/quote/:quoteId",
		describeRoute({
			summary: "Generate quote PDF",
			description: "Generate a PDF document for a quote",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const quoteId = c.req.param("quoteId");

			// Fetch quote with all details
			// Story 24.5: Include endCustomer for PDF display
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
				include: {
					contact: true,
					vehicleCategory: true,
					// Story 26.1: Include Hybrid Block lines
					lines: {
						orderBy: { sortOrder: "asc" },
					},
					stayDays: {
						include: {
							services: true,
						},
						orderBy: { dayNumber: "asc" },
					},
					endCustomer: {
						select: {
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
						},
					},
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			// Get organization details with pricing settings for branding
			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				include: {
					organizationPricingSettings: true,
				},
			});

			if (!organization) {
				throw new HTTPException(404, {
					message: "Organization not found",
				});
			}

			// Get document type
			const documentType = await db.documentType.findUnique({
				where: { code: "QUOTE_PDF" },
			});

			if (!documentType) {
				throw new HTTPException(500, {
					message:
						"Document type QUOTE_PDF not found. Please run database seed.",
				});
			}

			// Generate PDF
			const orgData = transformOrganizationToPdfData(organization);
			const documentLanguage = (orgData.documentLanguage ||
				"BILINGUAL") as DocumentLanguage;
			const pdfData = transformQuoteToPdfData(quote, documentLanguage);

			// Fix: Load logo with robust fallback
			// Try document settings logo first, then organization logo
			if (orgData.documentLogoUrl) {
				const logo = await loadLogoAsBase64(orgData.documentLogoUrl);
				if (logo) {
					orgData.documentLogoUrl = logo;
				} else {
					// Fallback if file missing
					orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
				}
			} else {
				// No document logo setting, strict fallback
				orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
			}

			const pdfBuffer = await generateQuotePdf(pdfData, orgData);

			// Save to storage
			const storage = getStorageService();
			const filename = generateFilename("QUOTE_PDF", quote.id);
			const storagePath = await storage.save(
				pdfBuffer,
				filename,
				organizationId,
			);
			const url = await storage.getUrl(storagePath);

			// Create document record
			const document = await db.document.create({
				data: withTenantCreate(
					{
						documentTypeId: documentType.id,
						quoteId: quote.id,
						storagePath,
						url,
						filename,
					},
					organizationId,
				),
				include: {
					documentType: true,
				},
			});

			return c.json(document, 201);
		},
	)

	// Generate invoice PDF
	.post(
		"/generate/invoice/:invoiceId",
		describeRoute({
			summary: "Generate invoice PDF",
			description: "Generate a PDF document for an invoice",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("invoiceId");

			// Fetch invoice with all details including quote for trip details
			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
				include: {
					contact: {
						include: {
							partnerContract: true,
						},
					},
					endCustomer: {
						select: {
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
						},
					},
					lines: {
						orderBy: { sortOrder: "asc" },
					},
					// Include quote for trip details
					quote: {
						select: {
							pickupAddress: true,
							dropoffAddress: true,
							pickupAt: true,
							passengerCount: true,
							luggageCount: true,
							tripType: true,
							vehicleCategory: {
								select: { name: true },
							},
						},
					},
				},
			});

			if (!invoice) {
				throw new HTTPException(404, {
					message: "Invoice not found",
				});
			}

			// Get organization details with pricing settings for branding
			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				include: {
					organizationPricingSettings: true,
				},
			});

			if (!organization) {
				throw new HTTPException(404, {
					message: "Organization not found",
				});
			}

			// Get document type
			const documentType = await db.documentType.findUnique({
				where: { code: "INVOICE_PDF" },
			});

			if (!documentType) {
				throw new HTTPException(500, {
					message:
						"Document type INVOICE_PDF not found. Please run database seed.",
				});
			}

			// Generate PDF
			const orgData = transformOrganizationToPdfData(organization);
			const documentLanguage = (orgData.documentLanguage ||
				"BILINGUAL") as DocumentLanguage;
			const pdfData = transformInvoiceToPdfData(invoice, documentLanguage);

			// Fix: Load logo with robust fallback
			if (orgData.documentLogoUrl) {
				const logo = await loadLogoAsBase64(orgData.documentLogoUrl);
				if (logo) {
					orgData.documentLogoUrl = logo;
				} else {
					orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
				}
			} else {
				orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
			}

			const pdfBuffer = await generateInvoicePdf(pdfData, orgData);

			// Save to storage
			const storage = getStorageService();
			const filename = generateFilename("INVOICE_PDF", invoice.number);
			const storagePath = await storage.save(
				pdfBuffer,
				filename,
				organizationId,
			);
			const url = await storage.getUrl(storagePath);

			// Create document record
			const document = await db.document.create({
				data: withTenantCreate(
					{
						documentTypeId: documentType.id,
						invoiceId: invoice.id,
						storagePath,
						url,
						filename,
					},
					organizationId,
				),
				include: {
					documentType: true,
				},
			});

			return c.json(document, 201);
		},
	)

	// Generate mission order PDF - Story 25.1
	.post(
		"/generate/mission-order/:quoteId",
		describeRoute({
			summary: "Generate mission order PDF",
			description:
				"Generate a PDF document (Fiche Mission) for an assigned mission",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const quoteId = c.req.param("quoteId");

			// Fetch quote with assignments
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
				include: {
					contact: true,
					vehicleCategory: true,
					assignedDriver: true,
					assignedVehicle: true,
					endCustomer: true,
					// Story 25.1: Include second driver for RSE double crew missions
					secondDriver: true,
					// Story 26.12: Include lines to detect Manual/Yolo missions
					lines: {
						orderBy: { sortOrder: "asc" },
					},
				},
			});

			if (!quote) {
				throw new HTTPException(404, { message: "Mission not found" });
			}

			// Get organization details with pricing settings for branding
			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				include: {
					organizationPricingSettings: true,
				},
			});

			if (!organization) {
				throw new HTTPException(404, { message: "Organization not found" });
			}

			// Get document type
			const documentType = await db.documentType.findUnique({
				where: { code: "MISSION_ORDER" },
			});

			if (!documentType) {
				throw new HTTPException(500, {
					message:
						"Document type MISSION_ORDER not found. Please run database seed.",
				});
			}

			// Generate PDF
			const pdfData = transformMissionToPdfData(quote);
			const orgData = transformOrganizationToPdfData(organization);

			// Fix: Load logo with robust fallback
			if (orgData.documentLogoUrl) {
				const logo = await loadLogoAsBase64(orgData.documentLogoUrl);
				if (logo) {
					orgData.documentLogoUrl = logo;
				} else {
					orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
				}
			} else {
				orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
			}

			const pdfBuffer = await generateMissionOrderPdf(pdfData, orgData);

			// Save to storage
			const storage = getStorageService();
			const filename = generateFilename("MISSION_ORDER", quote.id);
			const storagePath = await storage.save(
				pdfBuffer,
				filename,
				organizationId,
			);
			const url = await storage.getUrl(storagePath);

			// Create document record
			const document = await db.document.create({
				data: withTenantCreate(
					{
						documentTypeId: documentType.id,
						quoteId: quote.id,
						storagePath,
						url,
						filename,
					},
					organizationId,
				),
				include: {
					documentType: true,
				},
			});

			// Story 25.1: Create Activity record
			if (quote.assignedDriverId) {
				await db.activity.create({
					data: {
						organizationId,
						driverId: quote.assignedDriverId,
						quoteId: quote.id,
						entityType: "QUOTE",
						entityId: quote.id,
						type: "DOCUMENT_GENERATED",
						description: "Génération Fiche Mission",
						metadata: {
							documentId: document.id,
							filename,
						},
					},
				});
			}

			return c.json(document, 201);
		},
	)

	// Story 29.8: Generate mission sheet PDF (per-Mission, not per-Quote)
	.post(
		"/generate/mission-sheet/:missionId",
		describeRoute({
			summary: "Generate mission sheet PDF",
			description:
				"Generate a PDF document (Fiche Mission) for a specific Mission entity with driver operational details",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const missionId = c.req.param("missionId");

			// Fetch mission with all required relations
			const mission = await db.mission.findFirst({
				where: {
					id: missionId,
					organizationId,
				},
				include: {
					quote: {
						include: {
							contact: true,
							vehicleCategory: true,
							endCustomer: true,
						},
					},
					quoteLine: true,
					driver: true,
					vehicle: {
						include: {
							vehicleCategory: true,
						},
					},
				},
			});

			if (!mission) {
				throw new HTTPException(404, { message: "Mission not found" });
			}

			// Type assertion for included relations
			const missionWithRelations = mission as typeof mission & {
				quote: NonNullable<typeof mission.quote>;
				quoteLine: typeof mission.quoteLine;
				driver: typeof mission.driver;
				vehicle: typeof mission.vehicle & {
					vehicleCategory?: { name: string } | null;
				};
			};

			// Get organization details with pricing settings for branding
			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				include: {
					organizationPricingSettings: true,
				},
			});

			if (!organization) {
				throw new HTTPException(404, { message: "Organization not found" });
			}

			// Get document type
			const documentType = await db.documentType.findUnique({
				where: { code: "MISSION_ORDER" },
			});

			if (!documentType) {
				throw new HTTPException(500, {
					message:
						"Document type MISSION_ORDER not found. Please run database seed.",
				});
			}

			// Story 29.8: Transform Mission to MissionSheetPdfData
			const sourceData =
				(missionWithRelations.sourceData as Record<string, unknown>) || {};
			const quoteLineSourceData =
				(missionWithRelations.quoteLine?.sourceData as Record<
					string,
					unknown
				>) || {};

			// Extract waypoints from sourceData (mission-specific)
			const stops: Array<{ address: string; name?: string }> = [];
			const stopsData = sourceData.stops || quoteLineSourceData.stops;
			if (Array.isArray(stopsData)) {
				for (const stop of stopsData) {
					if (typeof stop === "object" && stop !== null) {
						const stopObj = stop as Record<string, unknown>;
						stops.push({
							address: (stopObj.address as string) || "",
							name: stopObj.name as string | undefined,
						});
					}
				}
			}

			// Build driver name
			const driverName = missionWithRelations.driver
				? `${missionWithRelations.driver.firstName} ${missionWithRelations.driver.lastName}`.trim()
				: "À désigner";
			const driverPhone = missionWithRelations.driver?.phone || null;

			// Build vehicle info
			const vehicleName =
				missionWithRelations.vehicle?.internalName ||
				missionWithRelations.vehicle?.registrationNumber ||
				"À désigner";
			const vehiclePlate =
				missionWithRelations.vehicle?.registrationNumber || null;
			const vehicleCategory =
				missionWithRelations.vehicle?.vehicleCategory?.name ||
				missionWithRelations.quote.vehicleCategory?.name ||
				"N/A";

			// Build contact info
			const contact = missionWithRelations.quote.contact;
			const contactData = {
				displayName:
					contact.displayName ||
					`${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
				companyName: contact.companyName || null,
				billingAddress: contact.billingAddress || null,
				email: contact.email || null,
				phone: contact.phone || null,
				vatNumber: contact.vatNumber || null,
				siret: contact.siret || null,
				isPartner: contact.isPartner,
			};

			// Build endCustomer info
			const endCustomer = missionWithRelations.quote.endCustomer
				? {
						firstName: missionWithRelations.quote.endCustomer.firstName,
						lastName: missionWithRelations.quote.endCustomer.lastName,
						email: missionWithRelations.quote.endCustomer.email || null,
						phone: missionWithRelations.quote.endCustomer.phone || null,
					}
				: null;

			// Extract pickup/dropoff from sourceData or quote
			const pickupAddress =
				(sourceData.pickupAddress as string) ||
				(quoteLineSourceData.pickupAddress as string) ||
				missionWithRelations.quote.pickupAddress;
			const dropoffAddress =
				(sourceData.dropoffAddress as string) ||
				(quoteLineSourceData.dropoffAddress as string) ||
				missionWithRelations.quote.dropoffAddress ||
				null;

			// Extract duration for DISPO
			const durationHours =
				(sourceData.durationHours as number) ||
				(quoteLineSourceData.durationHours as number) ||
				(missionWithRelations.quote.durationHours
					? Number(missionWithRelations.quote.durationHours)
					: null);

			const pdfData: MissionSheetPdfData = {
				id: missionWithRelations.id,
				ref: missionWithRelations.ref,
				tripType: missionWithRelations.quote.tripType,
				pickupAddress,
				dropoffAddress,
				pickupAt: missionWithRelations.startAt,
				passengerCount: missionWithRelations.quote.passengerCount,
				luggageCount: missionWithRelations.quote.luggageCount,
				vehicleCategory,
				notes:
					missionWithRelations.notes ||
					missionWithRelations.quote.notes ||
					null,
				stops,
				durationHours,
				driverName,
				driverPhone,
				secondDriverName: null, // TODO: Add second driver support if needed
				secondDriverPhone: null,
				vehicleName,
				vehiclePlate,
				contact: contactData,
				endCustomer,
				createdAt: missionWithRelations.createdAt,
			};

			const orgData = transformOrganizationToPdfData(organization);

			// Fix: Load logo with robust fallback
			if (orgData.documentLogoUrl) {
				const logo = await loadLogoAsBase64(orgData.documentLogoUrl);
				if (logo) {
					orgData.documentLogoUrl = logo;
				} else {
					orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
				}
			} else {
				orgData.documentLogoUrl = await loadLogoAsBase64(orgData.logo);
			}

			const pdfBuffer = await generateMissionSheetPdf(pdfData, orgData);

			// Save to storage
			const storage = getStorageService();
			const refShort =
				missionWithRelations.ref ||
				missionWithRelations.id.slice(-8).toUpperCase();
			const dateStr = format(new Date(), "yyyyMMdd");
			const timeStr = format(new Date(), "HHmmss");
			const filename = `FICHE-MISSION-${refShort}-${dateStr}-${timeStr}.pdf`;
			const storagePath = await storage.save(
				pdfBuffer,
				filename,
				organizationId,
			);
			const url = await storage.getUrl(storagePath);

			// Create document record
			const document = await db.document.create({
				data: withTenantCreate(
					{
						documentTypeId: documentType.id,
						quoteId: missionWithRelations.quoteId,
						storagePath,
						url,
						filename,
					},
					organizationId,
				),
				include: {
					documentType: true,
				},
			});

			// Create Activity record
			if (missionWithRelations.driverId) {
				await db.activity.create({
					data: {
						organizationId,
						driverId: missionWithRelations.driverId,
						quoteId: missionWithRelations.quoteId,
						entityType: "MISSION",
						entityId: missionWithRelations.id,
						type: "DOCUMENT_GENERATED",
						description: `Génération Fiche Mission ${missionWithRelations.ref || missionWithRelations.id.slice(-8)}`,
						metadata: {
							documentId: document.id,
							filename,
							missionId: missionWithRelations.id,
						},
					},
				});
			}

			return c.json(document, 201);
		},
	)

	// Delete document (only if not linked to issued invoice)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete document",
			description: "Delete a document by ID",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const document = await db.document.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					invoice: true,
				},
			});

			if (!document) {
				throw new HTTPException(404, {
					message: "Document not found",
				});
			}

			// Don't allow deletion of documents linked to issued/paid invoices
			if (
				document.invoice &&
				["ISSUED", "PAID"].includes(document.invoice.status)
			) {
				throw new HTTPException(400, {
					message: "Cannot delete documents linked to issued or paid invoices",
				});
			}

			await db.document.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
