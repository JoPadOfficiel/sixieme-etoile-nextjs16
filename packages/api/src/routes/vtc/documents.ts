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

/**
 * Transform organization to PDF data format
 */
function transformOrganizationToPdfData(org: any): OrganizationPdfData {
	const settings = org.organizationPricingSettings;
	return {
		name: org.name,
		address: null, // TODO: Add address to organization model
		phone: null,
		email: null,
		siret: null,
		vatNumber: null,
		iban: null,
		bic: null,
		logo: org.logo,
		// Story 25.3: Branding
		documentLogoUrl: settings?.documentLogoUrl,
		brandColor: settings?.brandColor,
		logoPosition: settings?.logoPosition,
		showCompanyName: settings?.showCompanyName,
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
	isPartner: boolean;
}): ContactPdfData {
	return {
		displayName: contact.displayName,
		companyName: contact.companyName,
		billingAddress: contact.billingAddress,
		email: contact.email,
		phone: contact.phone,
		vatNumber: contact.vatNumber,
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
}): QuotePdfData {
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
}): InvoicePdfData {
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
		lines: invoice.lines.map((line): InvoiceLinePdfData => ({
			description: line.description,
			quantity: Number(line.quantity),
			unitPriceExclVat: Number(line.unitPriceExclVat),
			vatRate: Number(line.vatRate),
			totalExclVat: Number(line.totalExclVat),
			totalVat: Number(line.totalVat),
		})),
		paymentTerms: invoice.contact.partnerContract?.paymentTerms || null,
		endCustomer: invoice.endCustomer ? {
			firstName: invoice.endCustomer.firstName,
			lastName: invoice.endCustomer.lastName,
			email: invoice.endCustomer.email,
			phone: invoice.endCustomer.phone,
		} : null,
	};
}

/**
 * Story 25.1: Transform mission to PDF data format
 */
function transformMissionToPdfData(quote: any): MissionOrderPdfData {
	const baseData = transformQuoteToPdfData(quote);
	return {
		...baseData,
		driverName: quote.assignedDriver?.displayName || "A designer",
		vehicleName: quote.assignedVehicle?.name || "A designer",
		vehiclePlate: quote.assignedVehicle?.licensePlate,
	};
}

/**
 * Generate filename for document
 */
function generateFilename(type: string, reference: string): string {
	const dateStr = format(new Date(), "yyyyMMdd");
	const refShort = reference.slice(-8).toUpperCase();

	switch (type) {
		case "QUOTE_PDF":
			return `DEVIS-${refShort}-${dateStr}.pdf`;
		case "INVOICE_PDF":
			return `FACTURE-${reference}-${dateStr}.pdf`;
		case "MISSION_ORDER":
			return `ORDRE-MISSION-${refShort}-${dateStr}.pdf`;
		default:
			return `DOCUMENT-${refShort}-${dateStr}.pdf`;
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
			const pdfData = transformQuoteToPdfData(quote);
			const orgData = transformOrganizationToPdfData(organization);
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

			// Fetch invoice with all details
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
			const pdfData = transformInvoiceToPdfData(invoice);
			const orgData = transformOrganizationToPdfData(organization);
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
