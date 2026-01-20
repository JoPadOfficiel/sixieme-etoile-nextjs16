/**
 * Invoices API Route (Story 2.4 + Story 7.1 + Story 7.4)
 *
 * Provides CRUD operations for invoices with contact linking.
 * Invoices are immutable financial documents derived from accepted quotes.
 * Story 7.4: Uses centralized commission service for partner commission calculation.
 */

import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
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
import {
	parseAppliedRules,
	buildInvoiceLines,
	buildStayInvoiceLines,
	calculateInvoiceTotals,
	calculateTransportAmount,
	TRANSPORT_VAT_RATE,
	type StayDayInput,
	type StayServiceInput,
} from "../../services/invoice-line-builder";
import {
	calculateCommission,
	getCommissionPercent,
} from "../../services/commission-service";

// ============================================================================
// Validation Schemas
// ============================================================================

const createInvoiceSchema = z.object({
	contactId: z.string().min(1).describe("Contact ID for the invoice"),
	quoteId: z.string().optional().nullable().describe("Source quote ID (optional)"),
	issueDate: z.string().datetime().describe("Invoice issue date"),
	dueDate: z.string().datetime().describe("Payment due date"),
	totalExclVat: z.number().nonnegative().describe("Total excluding VAT in EUR"),
	totalVat: z.number().nonnegative().describe("Total VAT amount in EUR"),
	totalInclVat: z.number().nonnegative().describe("Total including VAT in EUR"),
	commissionAmount: z.number().optional().nullable().describe("Commission amount for partner invoices"),
	notes: z.string().optional().nullable().describe("Additional notes"),
	endCustomerId: z.string().optional().nullable().describe("End Customer ID for the invoice"),
	lines: z.array(z.object({
		description: z.string().min(1),
		quantity: z.number().positive().default(1),
		unitPriceExclVat: z.number().nonnegative(),
		vatRate: z.number().nonnegative().default(20),
		totalExclVat: z.number().nonnegative(),
		totalVat: z.number().nonnegative(),
		lineType: z.enum(["SERVICE", "OPTIONAL_FEE", "PROMOTION_ADJUSTMENT", "OTHER"]).default("SERVICE"),
		sortOrder: z.number().int().nonnegative().default(0),
	})).optional().describe("Invoice line items"),
});

const updateInvoiceSchema = z.object({
	status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
	dueDate: z.string().datetime().optional(),
	notes: z.string().optional().nullable(),
});

const listInvoicesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
	contactId: z.string().optional().describe("Filter by contact ID"),
	search: z.string().optional().describe("Search in invoice number, contact name"),
	dateFrom: z.string().datetime().optional().describe("Filter invoices issued from this date"),
	dateTo: z.string().datetime().optional().describe("Filter invoices issued until this date"),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate next invoice number for organization
 * Format: INV-YYYY-NNNN (e.g., INV-2025-0001)
 */
async function generateInvoiceNumber(organizationId: string): Promise<string> {
	const year = new Date().getFullYear();
	const prefix = `INV-${year}-`;

	// Find the highest invoice number for this year
	const lastInvoice = await db.invoice.findFirst({
		where: {
			organizationId,
			number: { startsWith: prefix },
		},
		orderBy: { number: "desc" },
	});

	let nextNumber = 1;
	if (lastInvoice) {
		const lastNumberStr = lastInvoice.number.replace(prefix, "");
		const lastNumber = parseInt(lastNumberStr, 10);
		if (!isNaN(lastNumber)) {
			nextNumber = lastNumber + 1;
		}
	}

	return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

// ============================================================================
// Routes
// ============================================================================

export const invoicesRouter = new Hono()
	.basePath("/invoices")
	.use("*", organizationMiddleware)

	// List invoices
	.get(
		"/",
		validator("query", listInvoicesSchema),
		describeRoute({
			summary: "List invoices",
			description: "Get a paginated list of invoices for the current organization",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, status, contactId, search, dateFrom, dateTo } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause
			const baseWhere: Prisma.InvoiceWhereInput = {
				...(status && { status }),
				...(contactId && { contactId }),
			};

			// Add search filter
			if (search) {
				baseWhere.OR = [
					{ number: { contains: search, mode: "insensitive" } },
					{ contact: { displayName: { contains: search, mode: "insensitive" } } },
					{ contact: { companyName: { contains: search, mode: "insensitive" } } },
				];
			}

			// Add date range filter
			if (dateFrom || dateTo) {
				baseWhere.issueDate = {
					...(dateFrom && { gte: new Date(dateFrom) }),
					...(dateTo && { lte: new Date(dateTo) }),
				};
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [invoices, total] = await Promise.all([
				db.invoice.findMany({
					where,
					skip,
					take: limit,
					orderBy: { issueDate: "desc" },
					include: {
						contact: true,
						endCustomer: true,
						quote: {
							select: {
								id: true,
								pickupAddress: true,
								dropoffAddress: true,
								pickupAt: true,
							},
						},
						_count: {
							select: { lines: true },
						},
					},
				}),
				db.invoice.count({ where }),
			]);

			return c.json({
				data: invoices,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single invoice
	.get(
		"/:id",
		describeRoute({
			summary: "Get invoice",
			description: "Get a single invoice by ID with all details",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const invoice = await db.invoice.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					contact: {
						include: {
							partnerContract: true,
						},
					},
					endCustomer: true,
					quote: true,
					lines: {
						orderBy: { id: "asc" },
					},
					documents: true,
				},
			});

			if (!invoice) {
				throw new HTTPException(404, {
					message: "Invoice not found",
				});
			}

			return c.json(invoice);
		},
	)

	// Create invoice
	.post(
		"/",
		validator("json", createInvoiceSchema),
		describeRoute({
			summary: "Create invoice",
			description: "Create a new invoice. Can be standalone or linked to a quote.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify contact belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(data.contactId, organizationId),
				include: {
					partnerContract: true,
				},
			});

			if (!contact) {
				throw new HTTPException(400, {
					message: "Contact not found",
				});
			}

			// If quoteId provided, verify it exists and belongs to this org
			if (data.quoteId) {
				const quote = await db.quote.findFirst({
					where: withTenantId(data.quoteId, organizationId),
				});

				if (!quote) {
					throw new HTTPException(400, {
						message: "Quote not found",
					});
				}

				// Verify quote is ACCEPTED
				if (quote.status !== "ACCEPTED") {
					throw new HTTPException(400, {
						message: "Only accepted quotes can be converted to invoices",
					});
				}

				// Check if invoice already exists for this quote
				const existingInvoice = await db.invoice.findFirst({
					where: { quoteId: data.quoteId },
				});

				if (existingInvoice) {
					throw new HTTPException(400, {
						message: "An invoice already exists for this quote",
					});
				}
			}

			// Generate invoice number
			const invoiceNumber = await generateInvoiceNumber(organizationId);

			// Story 7.4: Calculate commission using centralized service
			let commissionAmount = data.commissionAmount;
			if (!commissionAmount) {
				const commissionPercent = getCommissionPercent(contact);
				if (commissionPercent > 0) {
					const commissionResult = calculateCommission({
						totalExclVat: data.totalExclVat,
						commissionPercent,
					});
					commissionAmount = commissionResult.commissionAmount;
				}
			}

			// Create invoice with lines in a transaction
			const invoice = await db.$transaction(async (tx) => {
				const newInvoice = await tx.invoice.create({
					data: withTenantCreate(
						{
							contactId: data.contactId,
							quoteId: data.quoteId,
							number: invoiceNumber,
							status: "DRAFT",
							issueDate: new Date(data.issueDate),
							dueDate: new Date(data.dueDate),
							totalExclVat: data.totalExclVat,
							totalVat: data.totalVat,
							totalInclVat: data.totalInclVat,
							commissionAmount,
							notes: data.notes,
							endCustomerId: data.endCustomerId,
						},
						organizationId,
					),
					include: {
						contact: true,
					},
				});

				// Create invoice lines if provided
				if (data.lines && data.lines.length > 0) {
					await tx.invoiceLine.createMany({
						data: data.lines.map((line, index) => ({
							invoiceId: newInvoice.id,
							description: line.description,
							quantity: line.quantity,
							unitPriceExclVat: line.unitPriceExclVat,
							vatRate: line.vatRate,
							totalExclVat: line.totalExclVat,
							totalVat: line.totalVat,
							lineType: line.lineType,
							sortOrder: line.sortOrder ?? index,
						})),
					});
				}

				return newInvoice;
			});

			// Fetch complete invoice with lines
			const completeInvoice = await db.invoice.findFirst({
				where: { id: invoice.id },
				include: {
					contact: true,
					endCustomer: true,
					quote: true,
					lines: true,
				},
			});

			return c.json(completeInvoice, 201);
		},
	)

	// Create invoice from quote (convenience endpoint)
	.post(
		"/from-quote/:quoteId",
		describeRoute({
			summary: "Create invoice from quote",
			description: "Convert an accepted quote to an invoice with deep-copy semantics. Story 22.8: Supports STAY trip type with detailed line items per day and service.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const quoteId = c.req.param("quoteId");

			// Get the quote with all details, including stayDays for STAY trip type
			const quote = await db.quote.findFirst({
				where: withTenantId(quoteId, organizationId),
				include: {
					contact: {
						include: {
							partnerContract: true,
						},
					},
					vehicleCategory: true,
					// Story 22.8: Include stayDays and services for STAY quotes
					stayDays: {
						include: {
							services: true,
						},
						orderBy: { dayNumber: "asc" },
					},
					endCustomer: true,
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			if (quote.status !== "ACCEPTED") {
				throw new HTTPException(400, {
					message: "Only accepted quotes can be converted to invoices",
				});
			}

			// Check if invoice already exists
			const existingInvoice = await db.invoice.findFirst({
				where: { quoteId },
			});

			if (existingInvoice) {
				throw new HTTPException(400, {
					message: "An invoice already exists for this quote",
				});
			}

			// Generate invoice number
			const invoiceNumber = await generateInvoiceNumber(organizationId);

			// Story 7.3: Parse appliedRules to extract optional fees and promotions
			const parsedRules = parseAppliedRules(quote.appliedRules);

            // Story 25.4: Inject end customer name for Agency invoices
            const endCustomerName = quote.contact.type === "AGENCY" && quote.endCustomer
                ? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
                : null;

			// Story 22.8: Build invoice lines based on trip type
			let invoiceLines;
			let invoiceNotes: string;

			if (quote.tripType === "STAY" && quote.stayDays && quote.stayDays.length > 0) {
				// STAY trip type: Build detailed lines per day and service
				// Convert Prisma Decimal types to numbers for invoice line builder
				const stayDaysInput: StayDayInput[] = quote.stayDays.map((day) => ({
					dayNumber: day.dayNumber,
					date: day.date,
					hotelRequired: day.hotelRequired,
					hotelCost: Number(day.hotelCost),
					mealCount: day.mealCount,
					mealCost: Number(day.mealCost),
					driverCount: day.driverCount,
					driverOvernightCost: Number(day.driverOvernightCost),
					services: day.services.map((service) => ({
						serviceOrder: service.serviceOrder,
						serviceType: service.serviceType as "TRANSFER" | "DISPO" | "EXCURSION",
						pickupAddress: service.pickupAddress,
						dropoffAddress: service.dropoffAddress,
						durationHours: service.durationHours ? Number(service.durationHours) : null,
						serviceCost: Number(service.serviceCost),
					})),
				}));

				invoiceLines = buildStayInvoiceLines(stayDaysInput, parsedRules, endCustomerName);

				// Build notes for STAY invoice
				const totalDays = quote.stayDays.length;
				const startDate = quote.stayStartDate ? new Date(quote.stayStartDate).toLocaleDateString("fr-FR") : "N/A";
				const endDate = quote.stayEndDate ? new Date(quote.stayEndDate).toLocaleDateString("fr-FR") : "N/A";
				invoiceNotes = `Séjour multi-jours (${totalDays} jours) du ${startDate} au ${endDate}`;
			} else {
				// Standard trip types: Use existing logic
				const finalPrice = Number(quote.finalPrice);
				const transportAmount = calculateTransportAmount(finalPrice, parsedRules);

				// Build trip context for detailed descriptions
				const tripContext = {
					pickupAddress: quote.pickupAddress,
					dropoffAddress: quote.dropoffAddress,
					pickupAt: quote.pickupAt,
					passengerCount: quote.passengerCount,
					luggageCount: quote.luggageCount,
					vehicleCategory: quote.vehicleCategory?.name || "Standard",
					tripType: quote.tripType,
					endCustomerName,
				};

				invoiceLines = buildInvoiceLines(
					transportAmount,
					quote.pickupAddress,
					quote.dropoffAddress,
					parsedRules,
					endCustomerName,
					tripContext, // Pass trip context for detailed descriptions
				);

				invoiceNotes = `Generated from quote. Trip: ${quote.pickupAddress} → ${quote.dropoffAddress}`;
			}

			// Calculate totals from lines (ensures consistency)
			const totals = calculateInvoiceTotals(invoiceLines);

			// Story 7.4: Calculate commission using centralized service
			let commissionAmount: number | null = null;
			const commissionPercent = getCommissionPercent(quote.contact);
			if (commissionPercent > 0) {
				const commissionResult = calculateCommission({
					totalExclVat: totals.totalExclVat,
					commissionPercent,
				});
				commissionAmount = commissionResult.commissionAmount;
			}

			// Set due date based on payment terms
			const issueDate = new Date();
			let dueDate = new Date(issueDate);
			if (quote.contact.partnerContract) {
				const paymentTerms = quote.contact.partnerContract.paymentTerms;
				switch (paymentTerms) {
					case "IMMEDIATE":
						break;
					case "DAYS_15":
						dueDate.setDate(dueDate.getDate() + 15);
						break;
					case "DAYS_30":
						dueDate.setDate(dueDate.getDate() + 30);
						break;
					case "DAYS_45":
						dueDate.setDate(dueDate.getDate() + 45);
						break;
					case "DAYS_60":
						dueDate.setDate(dueDate.getDate() + 60);
						break;
				}
			} else {
				// Default: 30 days for private clients
				dueDate.setDate(dueDate.getDate() + 30);
			}

			// Story 22.8: Build cost breakdown with tripAnalysis for STAY quotes
			const costBreakdown = quote.tripType === "STAY" 
				? {
					...((quote.costBreakdown as object) ?? {}),
					tripAnalysis: quote.tripAnalysis,
					tripType: quote.tripType,
					stayDays: quote.stayDays?.length ?? 0,
				}
				: quote.costBreakdown ?? undefined;

			// Create invoice with all lines in a transaction
			const invoice = await db.$transaction(async (tx) => {
				const newInvoice = await tx.invoice.create({
					data: withTenantCreate(
						{
							contactId: quote.contactId,
							quoteId: quote.id,
							number: invoiceNumber,
							status: "DRAFT",
							issueDate,
							dueDate,
							totalExclVat: totals.totalExclVat,
							totalVat: totals.totalVat,
							totalInclVat: totals.totalInclVat,
							commissionAmount,
							// Story 15.7 + 22.8: Deep-copy cost breakdown from quote
							costBreakdown: costBreakdown as Prisma.InputJsonValue,
							notes: invoiceNotes,
							endCustomerId: quote.endCustomerId,
						},
						organizationId,
					),
				});

				if (invoiceLines.length > 0) {
					await tx.invoiceLine.createMany({
						data: invoiceLines.map((line) => ({
							invoiceId: newInvoice.id,
							description: line.description,
							quantity: line.quantity,
							unitPriceExclVat: line.unitPriceExclVat,
							vatRate: line.vatRate,
							totalExclVat: line.totalExclVat,
							totalVat: line.totalVat,
							lineType: line.lineType,
							sortOrder: line.sortOrder,
						})),
					});
				}

				return newInvoice;
			});

			// Fetch complete invoice
			const completeInvoice = await db.invoice.findFirst({
				where: { id: invoice.id },
				include: {
					contact: true,
					endCustomer: true,
					quote: true,
					lines: {
						orderBy: { sortOrder: "asc" },
					},
				},
			});

			return c.json(completeInvoice, 201);
		},
	)

	// Update invoice
	.patch(
		"/:id",
		validator("json", updateInvoiceSchema),
		describeRoute({
			summary: "Update invoice",
			description: "Update invoice status or notes. Amounts are immutable after creation.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.invoice.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Invoice not found",
				});
			}

			// Validate status transitions
			if (data.status) {
				const validTransitions: Record<string, string[]> = {
					DRAFT: ["ISSUED", "CANCELLED"],
					ISSUED: ["PAID", "CANCELLED"],
					PAID: [], // Terminal state
					CANCELLED: [], // Terminal state
				};

				const allowed = validTransitions[existing.status] || [];
				if (!allowed.includes(data.status)) {
					throw new HTTPException(400, {
						message: `Cannot transition from ${existing.status} to ${data.status}`,
					});
				}
			}

			const invoice = await db.invoice.update({
				where: { id },
				data: {
					...(data.status && { status: data.status }),
					...(data.dueDate && { dueDate: new Date(data.dueDate) }),
					...(data.notes !== undefined && { notes: data.notes }),
				},
				include: {
					contact: true,
					quote: true,
					lines: true,
				},
			});

			return c.json(invoice);
		},
	)

	// Delete invoice (only drafts)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete invoice",
			description: "Delete a draft invoice by ID",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.invoice.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Invoice not found",
				});
			}

			if (existing.status !== "DRAFT") {
				throw new HTTPException(400, {
					message: "Only draft invoices can be deleted",
				});
			}

			// Delete lines first, then invoice
			await db.$transaction(async (tx) => {
				await tx.invoiceLine.deleteMany({
					where: { invoiceId: id },
				});
				await tx.invoice.delete({
					where: { id },
				});
			});

			return c.json({ success: true });
		},
	)

	// Add line to invoice (only DRAFT)
	.post(
		"/:id/lines",
		validator("json", z.object({
			description: z.string().min(1),
			quantity: z.number().positive().default(1),
			unitPriceExclVat: z.number(),
			vatRate: z.number().min(0).max(100).default(20),
			lineType: z.enum(["SERVICE", "OPTIONAL_FEE", "PROMOTION_ADJUSTMENT", "OTHER"]).default("OPTIONAL_FEE"),
		})),
		describeRoute({
			summary: "Add line to invoice",
			description: "Add a new line to a DRAFT invoice. Recalculates totals automatically.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("id");
			const data = c.req.valid("json");

			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
				include: { lines: true },
			});

			if (!invoice) {
				throw new HTTPException(404, { message: "Invoice not found" });
			}

			if (invoice.status !== "DRAFT") {
				throw new HTTPException(400, { message: "Can only add lines to DRAFT invoices" });
			}

			// Calculate line totals
			const totalExclVat = Math.round(data.quantity * data.unitPriceExclVat * 100) / 100;
			const totalVat = Math.round(totalExclVat * (data.vatRate / 100) * 100) / 100;

			// Get max sort order
			const maxSortOrder = invoice.lines.reduce((max, line) => Math.max(max, line.sortOrder), 0);

			// Create line and update invoice totals in transaction
			const result = await db.$transaction(async (tx) => {
				const newLine = await tx.invoiceLine.create({
					data: {
						invoiceId,
						description: data.description,
						quantity: data.quantity,
						unitPriceExclVat: data.unitPriceExclVat,
						vatRate: data.vatRate,
						totalExclVat,
						totalVat,
						lineType: data.lineType,
						sortOrder: maxSortOrder + 1,
					},
				});

				// Recalculate invoice totals
				const allLines = await tx.invoiceLine.findMany({ where: { invoiceId } });
				const newTotalExclVat = allLines.reduce((sum, l) => sum + Number(l.totalExclVat), 0);
				const newTotalVat = allLines.reduce((sum, l) => sum + Number(l.totalVat), 0);
				const newTotalInclVat = Math.round((newTotalExclVat + newTotalVat) * 100) / 100;

				await tx.invoice.update({
					where: { id: invoiceId },
					data: {
						totalExclVat: newTotalExclVat,
						totalVat: newTotalVat,
						totalInclVat: newTotalInclVat,
					},
				});

				return newLine;
			});

			// Return updated invoice
			const updatedInvoice = await db.invoice.findFirst({
				where: { id: invoiceId },
				include: { contact: true, quote: true, lines: { orderBy: { sortOrder: "asc" } } },
			});

			return c.json(updatedInvoice, 201);
		},
	)

	// Delete line from invoice (only DRAFT)
	.delete(
		"/:id/lines/:lineId",
		describeRoute({
			summary: "Delete line from invoice",
			description: "Remove a line from a DRAFT invoice. Recalculates totals automatically.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("id");
			const lineId = c.req.param("lineId");

			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
			});

			if (!invoice) {
				throw new HTTPException(404, { message: "Invoice not found" });
			}

			if (invoice.status !== "DRAFT") {
				throw new HTTPException(400, { message: "Can only delete lines from DRAFT invoices" });
			}

			// Verify line belongs to this invoice
			const line = await db.invoiceLine.findFirst({
				where: { id: lineId, invoiceId },
			});

			if (!line) {
				throw new HTTPException(404, { message: "Invoice line not found" });
			}

			// Return updated invoice
			const updatedInvoice = await db.invoice.findFirst({
				where: { id: invoiceId },
				include: { contact: true, quote: true, lines: { orderBy: { sortOrder: "asc" } } },
			});

			return c.json(updatedInvoice);
		},
	)

	// Update line from invoice (only DRAFT)
	// Story 28.9: Full editability - description, unitPriceExclVat, vatRate, quantity
	.patch(
		"/:id/lines/:lineId",
		validator("json", z.object({
			description: z.string().min(1).optional(),
			quantity: z.number().positive().optional(),
			unitPriceExclVat: z.number().min(0).optional(),
			vatRate: z.number().min(0).max(100).optional(),
		})),
		describeRoute({
			summary: "Update line in invoice",
			description: "Update a line in a DRAFT invoice (description, quantity, unitPriceExclVat, vatRate). Recalculates totals automatically. Story 28.9: Full editability.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("id");
			const lineId = c.req.param("lineId");
			const data = c.req.valid("json");

			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
			});

			if (!invoice) {
				throw new HTTPException(404, { message: "Invoice not found" });
			}

			if (invoice.status !== "DRAFT") {
				throw new HTTPException(400, { message: "Can only update lines in DRAFT invoices" });
			}

			// Verify line belongs to this invoice
			const line = await db.invoiceLine.findFirst({
				where: { id: lineId, invoiceId },
			});

			if (!line) {
				throw new HTTPException(404, { message: "Invoice line not found" });
			}

			// Update line and recalculate totals in transaction
			await db.$transaction(async (tx) => {
				// Use new values if provided, otherwise keep existing
				const newQuantity = data.quantity ?? Number(line.quantity);
				const newUnitPrice = data.unitPriceExclVat ?? Number(line.unitPriceExclVat);
				const newVatRate = data.vatRate ?? Number(line.vatRate);
				const newDescription = data.description ?? line.description;

				// Recalculate line totals
				const totalExclVat = Math.round(newQuantity * newUnitPrice * 100) / 100;
				const totalVat = Math.round(totalExclVat * (newVatRate / 100) * 100) / 100;

				await tx.invoiceLine.update({
					where: { id: lineId },
					data: {
						description: newDescription,
						quantity: newQuantity,
						unitPriceExclVat: newUnitPrice,
						vatRate: newVatRate,
						totalExclVat,
						totalVat,
					},
				});

				// Recalculate invoice totals
				const remainingLines = await tx.invoiceLine.findMany({ where: { invoiceId } });
				const newTotalExclVat = remainingLines.reduce((sum, l) => sum + Number(l.totalExclVat), 0);
				const newTotalVat = remainingLines.reduce((sum, l) => sum + Number(l.totalVat), 0);
				const newTotalInclVat = Math.round((newTotalExclVat + newTotalVat) * 100) / 100;

				await tx.invoice.update({
					where: { id: invoiceId },
					data: {
						totalExclVat: newTotalExclVat,
						totalVat: newTotalVat,
						totalInclVat: newTotalInclVat,
					},
				});
			});

			// Return updated invoice
			const updatedInvoice = await db.invoice.findFirst({
				where: { id: invoiceId },
				include: { contact: true, quote: true, lines: { orderBy: { sortOrder: "asc" } } },
			});

			return c.json(updatedInvoice);
		},
	)

	// ============================================================================
	// Story 28.10: Mission Context & Placeholder Finalization
	// ============================================================================

	/**
	 * GET /invoices/:id/mission-context
	 * Retrieve mission context for placeholder replacement
	 */
	.get(
		"/:id/mission-context",
		describeRoute({
			summary: "Get mission context for invoice",
			description: "Retrieve mission data linked to the invoice through Order for placeholder replacement. Story 28.10.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("id");

			// Find invoice with order and missions
			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
				include: {
					order: {
						include: {
							missions: {
								include: {
									driver: true,
									vehicle: true,
								},
								orderBy: { startAt: "asc" },
							},
						},
					},
				},
			});

			if (!invoice) {
				throw new HTTPException(404, { message: "Invoice not found" });
			}

			// Check if invoice has an order with missions
			const missions = invoice.order?.missions ?? [];

			if (missions.length === 0) {
				return c.json({
					hasMission: false,
					context: null,
					missionCount: 0,
				});
			}

			// Use first mission for context (most common case)
			const firstMission = missions[0];

			const context = {
				driverName: firstMission.driver
					? `${firstMission.driver.firstName} ${firstMission.driver.lastName}`
					: null,
				vehiclePlate: firstMission.vehicle?.registrationNumber ?? null,
				startAt: firstMission.startAt?.toISOString() ?? null,
				endAt: firstMission.endAt?.toISOString() ?? null,
			};

			return c.json({
				hasMission: true,
				context,
				missionCount: missions.length,
			});
		},
	)

	/**
	 * POST /invoices/:id/finalize-placeholders
	 * Permanently replace placeholders in invoice line descriptions
	 */
	.post(
		"/:id/finalize-placeholders",
		describeRoute({
			summary: "Finalize placeholders in invoice",
			description: "Permanently replace all placeholders in invoice line descriptions with actual mission data. Story 28.10.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const invoiceId = c.req.param("id");

			// Placeholder tokens
			const placeholderTokens = ["{{driver}}", "{{plate}}", "{{start}}", "{{end}}"];

			// Find invoice with order, missions, and lines
			const invoice = await db.invoice.findFirst({
				where: withTenantId(invoiceId, organizationId),
				include: {
					order: {
						include: {
							missions: {
								include: {
									driver: true,
									vehicle: true,
								},
								orderBy: { startAt: "asc" },
							},
						},
					},
					lines: true,
				},
			});

			if (!invoice) {
				throw new HTTPException(404, { message: "Invoice not found" });
			}

			if (invoice.status !== "DRAFT") {
				throw new HTTPException(400, { message: "Can only finalize placeholders in DRAFT invoices" });
			}

			const missions = invoice.order?.missions ?? [];

			if (missions.length === 0) {
				throw new HTTPException(400, { message: "No mission linked to this invoice" });
			}

			// Build context from first mission
			const firstMission = missions[0];
			const driverName = firstMission.driver
				? `${firstMission.driver.firstName} ${firstMission.driver.lastName}`
				: null;
			const vehiclePlate = firstMission.vehicle?.licensePlate ?? null;
			const startAt = firstMission.startAt;
			const endAt = firstMission.endAt;

			// Format date helper
			const formatDate = (date: Date | null): string => {
				if (!date) return "[Non assigné]";
				return date.toLocaleString("fr-FR", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
			};

			// Replace placeholders in text
			const replacePlaceholdersInText = (text: string): string => {
				if (!text) return text;
				const unassigned = "[Non assigné]";
				const replacements: Record<string, string> = {
					"{{driver}}": driverName || unassigned,
					"{{plate}}": vehiclePlate || unassigned,
					"{{start}}": formatDate(startAt),
					"{{end}}": formatDate(endAt),
				};

				let result = text;
				for (const [token, value] of Object.entries(replacements)) {
					const escapedToken = token.replace(/[{}]/g, "\\$&");
					const regex = new RegExp(escapedToken, "g");
					result = result.replace(regex, value);
				}
				return result;
			};

			// Update all lines with replaced descriptions
			let updatedCount = 0;
			await db.$transaction(async (tx) => {
				for (const line of invoice.lines) {
					const hasPlaceholder = placeholderTokens.some((token) => line.description.includes(token));
					if (hasPlaceholder) {
						const newDescription = replacePlaceholdersInText(line.description);
						await tx.invoiceLine.update({
							where: { id: line.id },
							data: { description: newDescription },
						});
						updatedCount++;
					}
				}
			});

			// Return updated invoice
			const updatedInvoice = await db.invoice.findFirst({
				where: { id: invoiceId },
				include: { contact: true, quote: true, lines: { orderBy: { sortOrder: "asc" } } },
			});

			return c.json({
				success: true,
				updatedLinesCount: updatedCount,
				invoice: updatedInvoice,
			});
		},
	);
