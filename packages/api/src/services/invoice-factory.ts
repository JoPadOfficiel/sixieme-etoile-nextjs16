/**
 * Invoice Factory Service
 * Story 28.8: Invoice Generation - Detached Snapshot
 *
 * Creates invoices from Orders with deep-copied data from QuoteLines.
 * Ensures fiscal immutability: Quote and Invoice are completely independent.
 *
 * Key Principle: Deep Copy
 * - QuoteLine data (description, quantity, price, VAT) is COPIED to InvoiceLine
 * - No foreign key from InvoiceLine to QuoteLine
 * - Modifications to Quote do NOT affect Invoice
 * - Modifications to Invoice do NOT affect Quote
 */

import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import {
	buildInvoiceLines,
	buildStayInvoiceLines,
	calculateInvoiceTotals,
	parseAppliedRules,
	type InvoiceLineInput,
	type StayDayInput,
} from "./invoice-line-builder";
import { calculateCommission, getCommissionPercent } from "./commission-service";

// ============================================================================
// Types
// ============================================================================

export interface InvoiceFactoryResult {
	invoice: Awaited<ReturnType<typeof db.invoice.findFirst>>;
	linesCreated: number;
	warning?: string;
}

// ============================================================================
// Invoice Factory
// ============================================================================

/**
 * InvoiceFactory - Story 28.8
 * Creates invoices from Orders with deep-copied data from QuoteLines.
 * Ensures fiscal immutability: Quote and Invoice are completely independent.
 */
export class InvoiceFactory {
	/**
	 * Create an invoice from an Order.
	 * Deep-copies all commercial data from the associated Quote(s).
	 *
	 * @param orderId - The Order ID
	 * @param organizationId - The Organization ID for tenant isolation
	 * @returns The created Invoice with lines and metadata
	 */
	static async createInvoiceFromOrder(
		orderId: string,
		organizationId: string
	): Promise<InvoiceFactoryResult> {
		// 1. Fetch Order with Quote(s) and Contact
		const order = await db.order.findFirst({
			where: { id: orderId, organizationId },
			include: {
				contact: {
					include: { partnerContract: true },
				},
				quotes: {
					where: { status: "ACCEPTED" },
					include: {
						vehicleCategory: true,
						lines: { orderBy: { sortOrder: "asc" } },
						stayDays: {
							include: { services: true },
							orderBy: { dayNumber: "asc" },
						},
						endCustomer: true,
					},
					orderBy: { createdAt: "desc" },
					take: 1, // Use most recent accepted quote
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		const quote = order.quotes[0];
		let warning: string | undefined;

		// 2. Generate invoice number
		const invoiceNumber = await this.generateInvoiceNumber(organizationId);

		// 3. Build invoice lines (deep copy)
		let invoiceLines: InvoiceLineInput[] = [];
		let invoiceNotes = `Generated from Order ${order.reference}`;

		if (quote) {
			const parsedRules = parseAppliedRules(quote.appliedRules);
			const endCustomerName =
				order.contact?.type === "AGENCY" && quote.endCustomer
					? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
					: null;

			if (quote.tripType === "STAY" && quote.stayDays && quote.stayDays.length > 0) {
				// STAY trip type - deep copy from stayDays
				const stayDaysInput: StayDayInput[] = quote.stayDays.map((day) => ({
					dayNumber: day.dayNumber,
					date: day.date,
					hotelRequired: day.hotelRequired,
					hotelCost: Number(day.hotelCost),
					mealCount: day.mealCount,
					mealCost: Number(day.mealCost),
					driverCount: day.driverCount,
					driverOvernightCost: Number(day.driverOvernightCost),
					services: day.services.map((s) => ({
						serviceOrder: s.serviceOrder,
						serviceType: s.serviceType as "TRANSFER" | "DISPO" | "EXCURSION",
						pickupAddress: s.pickupAddress,
						dropoffAddress: s.dropoffAddress,
						durationHours: s.durationHours ? Number(s.durationHours) : null,
						serviceCost: Number(s.serviceCost),
					})),
				}));

				invoiceLines = buildStayInvoiceLines(stayDaysInput, parsedRules, endCustomerName);

				const totalDays = quote.stayDays.length;
				const startDate = quote.stayStartDate
					? new Date(quote.stayStartDate).toLocaleDateString("fr-FR")
					: "N/A";
				const endDate = quote.stayEndDate
					? new Date(quote.stayEndDate).toLocaleDateString("fr-FR")
					: "N/A";
				invoiceNotes = `Séjour multi-jours (${totalDays} jours) du ${startDate} au ${endDate} - Order ${order.reference}`;
			} else {
				// Standard trip types - deep copy from quote
				const finalPrice = Number(quote.finalPrice);
				const transportAmount = this.calculateTransportAmount(finalPrice, parsedRules);

				invoiceLines = buildInvoiceLines(
					transportAmount,
					quote.pickupAddress,
					quote.dropoffAddress,
					parsedRules,
					endCustomerName,
					{
						pickupAddress: quote.pickupAddress,
						dropoffAddress: quote.dropoffAddress,
						pickupAt: quote.pickupAt,
						passengerCount: quote.passengerCount,
						luggageCount: quote.luggageCount,
						vehicleCategory: quote.vehicleCategory?.name || "Standard",
						tripType: quote.tripType,
						endCustomerName,
					}
				);
				invoiceNotes = `Transport: ${quote.pickupAddress} → ${quote.dropoffAddress ?? "N/A"} - Order ${order.reference}`;
			}
		} else {
			warning = `Order ${orderId} has no ACCEPTED quote - creating empty invoice`;
			console.warn(`[INVOICE_FACTORY] ${warning}`);
		}

		// 4. Calculate totals from lines
		const totals = calculateInvoiceTotals(invoiceLines);

		// 5. Calculate commission for partner contacts
		let commissionAmount: number | null = null;
		const commissionPercent = getCommissionPercent(order.contact);
		if (commissionPercent > 0) {
			const result = calculateCommission({
				totalExclVat: totals.totalExclVat,
				commissionPercent,
			});
			commissionAmount = result.commissionAmount;
		}

		// 6. Set due date based on payment terms
		const issueDate = new Date();
		const dueDate = this.calculateDueDate(issueDate, order.contact.partnerContract);

		// 7. Build cost breakdown (deep copy from quote)
		const costBreakdown = quote
			? quote.tripType === "STAY"
				? {
						...((quote.costBreakdown as object) ?? {}),
						tripAnalysis: quote.tripAnalysis,
						tripType: quote.tripType,
						stayDays: quote.stayDays?.length ?? 0,
				  }
				: quote.costBreakdown ?? undefined
			: undefined;

		// 8. Create Invoice with lines in transaction (atomic operation)
		const invoice = await db.$transaction(async (tx) => {
			const newInvoice = await tx.invoice.create({
				data: {
					organizationId,
					contactId: order.contactId,
					orderId: order.id,
					quoteId: quote?.id,
					number: invoiceNumber,
					status: "DRAFT",
					issueDate,
					dueDate,
					totalExclVat: totals.totalExclVat,
					totalVat: totals.totalVat,
					totalInclVat: totals.totalInclVat,
					commissionAmount,
					costBreakdown: costBreakdown as Prisma.InputJsonValue,
					notes: invoiceNotes,
					endCustomerId: quote?.endCustomerId,
				},
			});

			// Deep copy: Create InvoiceLines with copied data (no FK to QuoteLine)
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

		// 9. Return complete invoice with lines
		const completeInvoice = await db.invoice.findFirst({
			where: { id: invoice.id },
			include: {
				contact: true,
				endCustomer: true,
				lines: { orderBy: { sortOrder: "asc" } },
			},
		});

		console.log(
			`[INVOICE_FACTORY] Created invoice ${invoiceNumber} for Order ${order.reference} with ${invoiceLines.length} lines`
		);

		return {
			invoice: completeInvoice,
			linesCreated: invoiceLines.length,
			warning,
		};
	}

	/**
	 * Calculate transport amount from final price minus fees/promos
	 * This extracts the base transport cost for the main invoice line
	 */
	private static calculateTransportAmount(
		finalPrice: number,
		parsedRules: { optionalFees: { amount: number }[]; promotions: { discountAmount: number }[] }
	): number {
		// Sum of optional fees
		const totalFees = parsedRules.optionalFees.reduce((sum, fee) => sum + fee.amount, 0);

		// Sum of promotions (discounts)
		const totalDiscounts = parsedRules.promotions.reduce(
			(sum, promo) => sum + promo.discountAmount,
			0
		);

		// Transport = Final - Fees + Discounts (discounts were subtracted from final)
		return Math.max(0, finalPrice - totalFees + totalDiscounts);
	}

	/**
	 * Generate unique invoice number in format INV-YYYY-NNNN
	 */
	private static async generateInvoiceNumber(organizationId: string): Promise<string> {
		const year = new Date().getFullYear();
		const prefix = `INV-${year}-`;

		const lastInvoice = await db.invoice.findFirst({
			where: {
				organizationId,
				number: { startsWith: prefix },
			},
			orderBy: { number: "desc" },
		});

		let sequence = 1;
		if (lastInvoice) {
			const match = lastInvoice.number.match(/INV-\d{4}-(\d+)/);
			if (match) sequence = parseInt(match[1], 10) + 1;
		}

		return `${prefix}${sequence.toString().padStart(4, "0")}`;
	}

	/**
	 * Calculate due date based on payment terms from partner contract
	 */
	private static calculateDueDate(
		issueDate: Date,
		partnerContract: { paymentTerms: string } | null
	): Date {
		const dueDate = new Date(issueDate);

		if (!partnerContract) {
			dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
			return dueDate;
		}

		switch (partnerContract.paymentTerms) {
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
			default:
				dueDate.setDate(dueDate.getDate() + 30);
		}

		return dueDate;
	}
}
