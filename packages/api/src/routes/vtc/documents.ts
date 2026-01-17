/**
 * Documents API Route
 * Story 7.5: Document Generation & Storage
 *
 * Provides endpoints for generating and managing PDF documents
 * for quotes, invoices, and mission orders.
 */

import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { format } from "date-fns";
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import {
	generateQuotePdf,
	generateInvoicePdf,
	generateMissionOrderPdf,
	type QuotePdfData,
	type InvoicePdfData,
	type MissionOrderPdfData,
	type OrganizationPdfData,
	type ContactPdfData,
	type InvoiceLinePdfData,
} from "../../services/pdf-generator";
import {
	getStorageService,
	LocalStorageService,
} from "../../services/document-storage";
import {
	parseAppliedRules,
	buildInvoiceLines,
	calculateTransportAmount,
	buildStayInvoiceLines,
	buildTripDescription,
	type DocumentLanguage,
} from "../../services/invoice-line-builder";

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
async function loadLogoAsBase64(pathOrUrl: string | null | undefined): Promise<string | null> {
	if (!pathOrUrl) return null;
	try {
		let buffer: Buffer;
		let mime = "image/jpeg"; // Default

		if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
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
				if (e.code === 'ENOENT' && process.env.NODE_ENV !== 'production') {
					try {
						const fs = require('fs/promises');
						const path = require('path');
						// Try to find the file in public/uploads/document-logos
						// process.cwd() is likely apps/web in Next.js
						// So we look in public/uploads relative to CWD
						const fallbackPath = path.join(process.cwd(), 'public/uploads/document-logos', pathOrUrl);
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
		if (mime === "image/svg+xml" || pathOrUrl.toLowerCase().endsWith(".svg") || isSvg(buffer)) {
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
function transformOrganizationToPdfData(org: any): OrganizationPdfData {
	const settings = org.organizationPricingSettings;

	// Parse metadata for legal info (Story 25.1)
	let metadata: any = {};
	if (org.metadata) {
		if (typeof org.metadata === 'string') {
			try { metadata = JSON.parse(org.metadata); } catch {}
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
		documentLanguage: settings?.documentLanguage ?? 'BILINGUAL',
		invoiceTerms: settings?.invoiceTerms,
		quoteTerms: settings?.quoteTerms,
		missionOrderTerms: settings?.missionOrderTerms,
		
		// Story 25.2: EU Compliance - Complete address and legal info
		name: settings?.legalName ?? org.name,
		address: (typeof metadata.address === 'string' ? metadata.address : null) ?? settings?.address ?? null,
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
		rcs: metadata.rcs ?? settings?.rcs ?? null,
		rm: metadata.rm ?? null,
		ape: metadata.ape ?? settings?.ape ?? null, // Code NAF
		capital: settings?.capital ?? null, // Capital often manually set
		licenseVtc: settings?.licenseVtc ?? null,
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
function transformQuoteToPdfData(quote: {
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
}, language: DocumentLanguage = 'BILINGUAL'): QuotePdfData {
	// Parse applied rules
	const parsedRules = parseAppliedRules(quote.appliedRules);
	
	let lines: InvoiceLinePdfData[] = [];
	
	if (quote.tripType === "STAY" && quote.stayDays && quote.stayDays.length > 0) {
		// Use stay invoice line builder
		const invoiceLines = buildStayInvoiceLines(
			quote.stayDays,
			parsedRules,
			quote.endCustomer ? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}` : null
		);
		lines = invoiceLines.map(l => ({
			description: l.description,
			quantity: l.quantity,
			unitPriceExclVat: l.unitPriceExclVat,
			vatRate: l.vatRate,
			totalExclVat: l.totalExclVat,
			totalVat: l.totalVat,
		}));
	} else {
		// Standard quote
		const transportAmount = calculateTransportAmount(Number(quote.finalPrice), parsedRules);
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
		lines = invoiceLines.map(l => ({
			description: l.description,
			quantity: l.quantity,
			unitPriceExclVat: l.unitPriceExclVat,
			vatRate: l.vatRate,
			totalExclVat: l.totalExclVat,
			totalVat: l.totalVat,
		}));
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
		endCustomer: quote.endCustomer ? {
			firstName: quote.endCustomer.firstName,
			lastName: quote.endCustomer.lastName,
			email: quote.endCustomer.email,
			phone: quote.endCustomer.phone,
		} : null,
		lines,
	};
}

/**
 * Transform invoice to PDF data format
 * Uses unknown for Decimal fields to handle Prisma types
 */
function transformInvoiceToPdfData(invoice: {
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
}, language: DocumentLanguage = 'BILINGUAL'): InvoicePdfData {
	// Build detailed description for the first line if quote data is available
	let lines = invoice.lines.map((line): InvoiceLinePdfData => ({
		description: line.description,
		quantity: Number(line.quantity),
		unitPriceExclVat: Number(line.unitPriceExclVat),
		vatRate: Number(line.vatRate),
		totalExclVat: Number(line.totalExclVat),
		totalVat: Number(line.totalVat),
	}));
	
	// Replace first line's description with detailed trip info if quote is available
	if (invoice.quote && lines.length > 0) {
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
			vehicleCategory: q.vehicleCategory?.name || 'Standard',
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
		commissionAmount: invoice.commissionAmount ? Number(invoice.commissionAmount) : null,
		notes: invoice.notes,
		contact: transformContactToPdfData(invoice.contact),
		lines,
		paymentTerms: invoice.contact.partnerContract?.paymentTerms || null,
		endCustomer: invoice.endCustomer ? {
			firstName: invoice.endCustomer.firstName,
			lastName: invoice.endCustomer.lastName,
			email: invoice.endCustomer.email,
			phone: invoice.endCustomer.phone,
		} : null,
		// Include quote reference for display in invoice PDF
		quoteReference: invoice.quoteId ? invoice.quoteId.slice(-8).toUpperCase() : null,
		// Include trip details from quote
		tripDetails: invoice.quote ? {
			pickupAddress: invoice.quote.pickupAddress,
			dropoffAddress: invoice.quote.dropoffAddress,
			pickupAt: invoice.quote.pickupAt,
			passengerCount: invoice.quote.passengerCount,
			luggageCount: invoice.quote.luggageCount,
			vehicleCategory: invoice.quote.vehicleCategory?.name || "Standard",
			tripType: invoice.quote.tripType,
		} : null,
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
	const vehicleName = quote.assignedVehicle?.internalName 
		|| quote.assignedVehicle?.registrationNumber 
		|| "À désigner";
	return {
		...baseData,
		driverName,
		driverPhone,
		secondDriverName,
		secondDriverPhone,
		vehicleName,
		vehiclePlate: quote.assignedVehicle?.registrationNumber,
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
			description: "Get a paginated list of generated documents for the current organization",
			tags: ["VTC - Documents"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, type, quoteId, invoiceId, search, dateFrom, dateTo } = c.req.valid("query");

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
					{ invoice: { contact: { displayName: { contains: search, mode: "insensitive" } } } },
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
		}
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
		}
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
		}
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
		}
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
					message: "Document type QUOTE_PDF not found. Please run database seed.",
				});
			}

			// Generate PDF
			const orgData = transformOrganizationToPdfData(organization);
			const documentLanguage = (orgData.documentLanguage || 'BILINGUAL') as DocumentLanguage;
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
			const storagePath = await storage.save(pdfBuffer, filename, organizationId);
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
					organizationId
				),
				include: {
					documentType: true,
				},
			});

			return c.json(document, 201);
		}
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
					message: "Document type INVOICE_PDF not found. Please run database seed.",
				});
			}

			// Generate PDF
			const orgData = transformOrganizationToPdfData(organization);
			const documentLanguage = (orgData.documentLanguage || 'BILINGUAL') as DocumentLanguage;
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
			const storagePath = await storage.save(pdfBuffer, filename, organizationId);
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
					organizationId
				),
				include: {
					documentType: true,
				},
			});

			return c.json(document, 201);
		}
	)

	// Generate mission order PDF - Story 25.1
	.post(
		"/generate/mission-order/:quoteId",
		describeRoute({
			summary: "Generate mission order PDF",
			description: "Generate a PDF document (Fiche Mission) for an assigned mission",
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
					message: "Document type MISSION_ORDER not found. Please run database seed.",
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
			const storagePath = await storage.save(pdfBuffer, filename, organizationId);
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
					organizationId
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
		}
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
			if (document.invoice && ["ISSUED", "PAID"].includes(document.invoice.status)) {
				throw new HTTPException(400, {
					message: "Cannot delete documents linked to issued or paid invoices",
				});
			}

			await db.document.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	);
