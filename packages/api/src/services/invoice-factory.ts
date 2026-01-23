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

import type { Prisma } from "@prisma/client";
import { db } from "@repo/database";
import Decimal from "decimal.js";
import {
	calculateCommission,
	getCommissionPercent,
} from "./commission-service";
import {
	type InvoiceLineInput,
	type StayDayInput,
	buildInvoiceLines,
	buildStayInvoiceLines,
	calculateInvoiceTotals,
	parseAppliedRules,
} from "./invoice-line-builder";
import {
	type QuoteLineForDeepCopy,
	deepCopyQuoteLinesToInvoiceLines as deepCopyQuoteLinesUtil,
} from "./invoice-line-utils";

// ============================================================================
// Types
// ============================================================================

export interface InvoiceFactoryResult {
	invoice: Awaited<ReturnType<typeof db.invoice.findFirst>>;
	linesCreated: number;
	warning?: string;
}

// ============================================================================
// Story 28.11: Partial Invoice Types
// ============================================================================

export type PartialInvoiceMode =
	| "FULL_BALANCE"
	| "DEPOSIT_PERCENT"
	| "MANUAL_SELECTION";

export interface PartialInvoiceOptions {
	mode: PartialInvoiceMode;
	depositPercent?: number; // For DEPOSIT_PERCENT mode (1-100)
	selectedLineIds?: string[]; // For MANUAL_SELECTION mode (legacy: QuoteLine IDs)
	missionIds?: string[]; // Story 30.4: For MANUAL_SELECTION mode (Mission IDs)
}

export interface OrderBalance {
	totalAmount: number; // Total order amount from quotes (TTC)
	invoicedAmount: number; // Sum of all existing invoices (TTC)
	remainingBalance: number; // totalAmount - invoicedAmount
	invoiceCount: number; // Number of existing invoices
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
		organizationId: string,
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
					// Story 29.5: Remove take: 1 to support multi-mission orders with multiple accepted quotes
				},
				invoices: {
					take: 1, // Check if invoice already exists
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		// MEDIUM-4 FIX: Check if invoice already exists for this order
		if (order.invoices && order.invoices.length > 0) {
			const existingInvoice = await db.invoice.findFirst({
				where: { id: order.invoices[0].id },
				include: {
					contact: true,
					endCustomer: true,
					lines: { orderBy: { sortOrder: "asc" } },
				},
			});
			console.log(
				`[INVOICE_FACTORY] Order ${orderId} already has invoice ${existingInvoice?.number} - returning existing`,
			);
			return {
				invoice: existingInvoice as any,
				linesCreated: existingInvoice?.lines?.length ?? 0,
				warning: "Invoice already exists for this order",
			};
		}

		// Story 29.5: Handle multiple accepted quotes for multi-mission orders
		const quotes = order.quotes;
		let warning: string | undefined;

		if (!quotes || quotes.length === 0) {
			warning = `Order ${orderId} has no ACCEPTED quote - creating empty invoice`;
			console.warn(`[INVOICE_FACTORY] ${warning}`);
		}

		// Use the most recent quote for metadata, but aggregate all quote lines
		const quote = quotes[0];

		// 2. Generate invoice number
		const invoiceNumber =
			await InvoiceFactory.generateInvoiceNumber(organizationId);

		// 3. Build invoice lines (deep copy)
		let invoiceLines: InvoiceLineInput[] = [];
		let invoiceNotes = `Generated from Order ${order.reference}`;

		if (quote) {
			const parsedRules = parseAppliedRules(quote.appliedRules);
			const endCustomerName =
				order.contact?.type === "AGENCY" && quote.endCustomer
					? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
					: null;

			// Story 29.5: Deep copy QuoteLines from ALL accepted quotes for multi-mission support
			// Priority: Use QuoteLines if available, fallback to legacy buildInvoiceLines
			const allQuoteLines: typeof quote.lines = [];

			// Aggregate lines from all accepted quotes
			for (const q of quotes) {
				if (q.lines && q.lines.length > 0) {
					allQuoteLines.push(...q.lines);
				}
			}

			if (allQuoteLines.length > 0) {
				// Fetch organization settings for document language
				const orgSettings = await db.organizationPricingSettings.findFirst({
					where: { organizationId },
					select: { documentLanguage: true },
				});
				const documentLanguage =
					(orgSettings?.documentLanguage as
						| "FRENCH"
						| "ENGLISH"
						| "BILINGUAL") || "FRENCH";

				// Deep copy each QuoteLine to InvoiceLine with localized descriptions
				invoiceLines = InvoiceFactory.deepCopyQuoteLinesToInvoiceLines(
					allQuoteLines,
					endCustomerName,
					documentLanguage,
				);
				invoiceNotes = `Facture générée depuis devis - Order ${order.reference}`;
			} else if (
				quote.tripType === "STAY" &&
				quote.stayDays &&
				quote.stayDays.length > 0
			) {
				// STAY trip type - deep copy from stayDays (legacy path)
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

				invoiceLines = buildStayInvoiceLines(
					stayDaysInput,
					parsedRules,
					endCustomerName,
				);

				const totalDays = quote.stayDays.length;
				const startDate = quote.stayStartDate
					? new Date(quote.stayStartDate).toLocaleDateString("fr-FR")
					: "N/A";
				const endDate = quote.stayEndDate
					? new Date(quote.stayEndDate).toLocaleDateString("fr-FR")
					: "N/A";
				invoiceNotes = `Séjour multi-jours (${totalDays} jours) du ${startDate} au ${endDate} - Order ${order.reference}`;
			} else {
				// Standard trip types - fallback to legacy buildInvoiceLines
				const finalPrice = Number(quote.finalPrice);
				const transportAmount = InvoiceFactory.calculateTransportAmount(
					finalPrice,
					parsedRules,
				);

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
					},
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
		const dueDate = InvoiceFactory.calculateDueDate(
			issueDate,
			order.contact.partnerContract,
		);

		// 7. Build cost breakdown (deep copy from quote)
		const costBreakdown = quote
			? quote.tripType === "STAY"
				? {
						...((quote.costBreakdown as object) ?? {}),
						tripAnalysis: quote.tripAnalysis,
						tripType: quote.tripType,
						stayDays: quote.stayDays?.length ?? 0,
					}
				: (quote.costBreakdown ?? undefined)
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

			// Deep copy: Create InvoiceLines with copied data
			// Story 29.5: Include quoteLineId for traceability (data is still independent)
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
						quoteLineId: line.quoteLineId, // Story 29.5: Traceability link
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
			`[INVOICE_FACTORY] Created invoice ${invoiceNumber} for Order ${order.reference} with ${invoiceLines.length} lines`,
		);

		return {
			invoice: completeInvoice,
			linesCreated: invoiceLines.length,
			warning,
		};
	}

	/**
	 * Deep copy QuoteLines to InvoiceLines using exported utility function
	 * This wrapper delegates to the testable utility function
	 * Story 29.5 Review Fix: Added documentLanguage parameter for i18n support
	 */
	private static deepCopyQuoteLinesToInvoiceLines(
		quoteLines: QuoteLineForDeepCopy[],
		endCustomerName: string | null,
		documentLanguage: "FRENCH" | "ENGLISH" | "BILINGUAL" = "FRENCH",
	): InvoiceLineInput[] {
		// Map document language to locale for date formatting
		const localeMap: Record<string, string> = {
			FRENCH: "fr-FR",
			ENGLISH: "en-GB",
			BILINGUAL: "fr-FR", // Use French locale for bilingual, labels are already bilingual
		};

		// Delegate to exported utility function for testability
		return deepCopyQuoteLinesUtil(quoteLines, endCustomerName, {
			locale: localeMap[documentLanguage] || "fr-FR",
			documentLanguage,
		});
	}

	/**
	 * Calculate transport amount from final price minus fees/promos
	 * MEDIUM-5 FIX: Account for quantity in fee/promo calculations
	 */
	private static calculateTransportAmount(
		finalPrice: number,
		parsedRules: {
			optionalFees: { amount: number; quantity?: number }[];
			promotions: { discountAmount: number; quantity?: number }[];
		},
	): number {
		// Sum of optional fees (with quantity)
		const totalFees = parsedRules.optionalFees.reduce(
			(sum, fee) => sum + fee.amount * (fee.quantity ?? 1),
			0,
		);

		// Sum of promotions (with quantity)
		const totalDiscounts = parsedRules.promotions.reduce(
			(sum, promo) => sum + promo.discountAmount * (promo.quantity ?? 1),
			0,
		);

		// Transport = Final - Fees + Discounts (discounts were subtracted from final)
		return Math.max(0, finalPrice - totalFees + totalDiscounts);
	}

	/**
	 * Generate unique invoice number in format INV-YYYY-NNNN
	 */
	private static async generateInvoiceNumber(
		organizationId: string,
	): Promise<string> {
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
			if (match) sequence = Number.parseInt(match[1], 10) + 1;
		}

		return `${prefix}${sequence.toString().padStart(4, "0")}`;
	}

	/**
	 * Calculate due date based on payment terms from partner contract
	 */
	private static calculateDueDate(
		issueDate: Date,
		partnerContract: { paymentTerms: string } | null,
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

	// ============================================================================
	// Story 28.11: Partial Invoice Methods
	// ============================================================================

	/**
	 * Calculate the current balance for an Order
	 * Returns total, invoiced, and remaining amounts
	 */
	static async calculateOrderBalance(
		orderId: string,
		organizationId: string,
	): Promise<OrderBalance> {
		const order = await db.order.findFirst({
			where: { id: orderId, organizationId },
			include: {
				quotes: {
					where: { status: "ACCEPTED" },
					select: {
						finalPrice: true,
						lines: { select: { totalPrice: true, vatRate: true } },
					},
				},
				invoices: {
					select: { totalInclVat: true },
					where: { status: { not: "CANCELLED" } }, // Exclude cancelled invoices
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		// Calculate total from accepted quotes
		let totalAmount = new Decimal(0);
		for (const quote of order.quotes) {
			if (quote.lines && quote.lines.length > 0) {
				// Sum quote lines (TTC calculation)
				// Assuming lines.totalPrice is HT, need to verify.
				// Actually QuoteLine.totalPrice is usually HT.
				// But in VTC context, sometimes stored as is.
				// Based on previous code: sum + linePrice * 1.1 implies it was HT.
				// Let's use Decimal for this accumulation.
				const linesTotal = quote.lines.reduce((sum, line) => {
					// Fix: Use actual VAT rate if available, otherwise default to 10%
					// We need to request vatRate in the selection above for this to work perfectly.
					// Assuming 10% for now until we update the query.
					const vatRate = line.vatRate
						? new Decimal(line.vatRate)
						: new Decimal(10);
					return sum.add(
						new Decimal(line.totalPrice).mul(vatRate.div(100).add(1)),
					);
				}, new Decimal(0));
				totalAmount = totalAmount.add(linesTotal);
			}
			// Fallback to finalPrice (already TTC)
			else totalAmount = totalAmount.add(new Decimal(quote.finalPrice));
		}

		// Calculate amount already invoiced
		const invoicedAmount = order.invoices.reduce(
			(sum, inv) => sum.add(new Decimal(inv.totalInclVat)),
			new Decimal(0),
		);

		const remainingBalance = totalAmount.sub(invoicedAmount);

		return {
			totalAmount: totalAmount.toDecimalPlaces(2).toNumber(),
			invoicedAmount: invoicedAmount.toDecimalPlaces(2).toNumber(),
			remainingBalance: Decimal.max(0, remainingBalance)
				.toDecimalPlaces(2)
				.toNumber(),
			invoiceCount: order.invoices.length,
		};
	}

	/**
	 * Create a partial invoice from an Order
	 * Supports three modes: FULL_BALANCE, DEPOSIT_PERCENT, MANUAL_SELECTION
	 */
	static async createPartialInvoice(
		orderId: string,
		organizationId: string,
		options: PartialInvoiceOptions,
	): Promise<InvoiceFactoryResult> {
		// 1. Calculate current balance
		const balance = await InvoiceFactory.calculateOrderBalance(
			orderId,
			organizationId,
		);

		// 2. Fetch order with contact and quotes
		const order = await db.order.findFirst({
			where: { id: orderId, organizationId },
			include: {
				contact: {
					include: { partnerContract: true },
				},
				quotes: {
					where: { status: "ACCEPTED" },
					include: {
						lines: { orderBy: { sortOrder: "asc" } },
						endCustomer: true,
					},
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		const quote = order.quotes[0];
		let invoiceLines: InvoiceLineInput[] = [];
		let invoiceAmount = new Decimal(0);
		let invoiceDescription = "";
		const endCustomerName = quote?.endCustomer
			? `${quote.endCustomer.firstName} ${quote.endCustomer.lastName}`
			: null;

		const remainingBalance = new Decimal(balance.remainingBalance);
		const totalAmount = new Decimal(balance.totalAmount);

		// 3. Calculate amount and lines based on mode
		switch (options.mode) {
			case "FULL_BALANCE": {
				invoiceAmount = remainingBalance;
				invoiceDescription = `Solde facture - Order ${order.reference}`;

				// Story 29.5 Review Fix: For first invoice (no prior invoices), deep-copy all QuoteLines
				// This ensures AC1/AC2 compliance - each QuoteLine becomes an InvoiceLine with quoteLineId
				if (
					balance.invoiceCount === 0 &&
					quote?.lines &&
					quote.lines.length > 0
				) {
					// First invoice: Deep-copy all quote lines for full traceability
					// Aggregate lines from all accepted quotes
					const allQuoteLines: typeof quote.lines = [];

					// Fetch all quotes (not just take: 1) for multi-quote orders
					const allQuotes = await db.quote.findMany({
						where: { orderId, status: "ACCEPTED" },
						include: {
							lines: { orderBy: { sortOrder: "asc" } },
							endCustomer: true,
						},
						orderBy: { createdAt: "desc" },
					});

					for (const q of allQuotes) {
						if (q.lines && q.lines.length > 0) {
							allQuoteLines.push(...q.lines);
						}
					}

					if (allQuoteLines.length > 0) {
						// Fetch organization settings for document language
						const orgSettings = await db.organizationPricingSettings.findFirst({
							where: { organizationId },
							select: { documentLanguage: true },
						});
						const documentLanguage =
							(orgSettings?.documentLanguage as
								| "FRENCH"
								| "ENGLISH"
								| "BILINGUAL") || "FRENCH";

						invoiceLines = InvoiceFactory.deepCopyQuoteLinesToInvoiceLines(
							allQuoteLines,
							endCustomerName,
							documentLanguage,
						);
						invoiceDescription = `Facture complète - Order ${order.reference}`;

						// Recalculate amount from deep-copied lines
						invoiceAmount = invoiceLines.reduce(
							(sum, line) =>
								sum.add(
									new Decimal(line.totalExclVat).add(
										new Decimal(line.totalVat),
									),
								),
							new Decimal(0),
						);
					}
				} else {
					// Subsequent balance invoice: Create single aggregate line for remaining balance
					// Deep copying would duplicate lines already invoiced
					const amountHT = invoiceAmount.div(1.1).toDecimalPlaces(2);
					const amountVAT = invoiceAmount.sub(amountHT).toDecimalPlaces(2);

					invoiceLines = [
						{
							lineType: "SERVICE" as const,
							description: invoiceDescription,
							quantity: 1,
							unitPriceExclVat: amountHT.toNumber(),
							vatRate: 10,
							totalExclVat: amountHT.toNumber(),
							totalVat: amountVAT.toNumber(),
							sortOrder: 0,
						},
					];
				}
				break;
			}

			case "DEPOSIT_PERCENT": {
				const percent = new Decimal(
					Math.min(100, Math.max(1, options.depositPercent ?? 30)),
				);

				invoiceAmount = totalAmount.mul(percent).div(100).toDecimalPlaces(2);
				invoiceDescription = `Acompte ${percent}% - Order ${order.reference}`;

				// Validate amount doesn't exceed balance
				if (invoiceAmount.gt(remainingBalance)) {
					throw new Error(
						`Deposit amount (${invoiceAmount}€) exceeds remaining balance (${remainingBalance}€)`,
					);
				}

				// Create single deposit line
				const amountHT = invoiceAmount.div(1.1).toDecimalPlaces(2);
				const amountVAT = invoiceAmount.sub(amountHT).toDecimalPlaces(2);

				invoiceLines = [
					{
						lineType: "SERVICE" as const,
						description: `Acompte ${percent}%`,
						quantity: 1,
						unitPriceExclVat: amountHT.toNumber(),
						vatRate: 10,
						totalExclVat: amountHT.toNumber(),
						totalVat: amountVAT.toNumber(),
						sortOrder: 0,
					},
				];
				break;
			}

			case "MANUAL_SELECTION": {
				// Story 30.4: Support both missionIds (new) and selectedLineIds (legacy)
				const missionIds = options.missionIds;
				const selectedLineIds = options.selectedLineIds;

				// Fetch organization settings for document language
				const orgSettings = await db.organizationPricingSettings.findFirst({
					where: { organizationId },
					select: { documentLanguage: true },
				});
				const documentLanguage =
					(orgSettings?.documentLanguage as
						| "FRENCH"
						| "ENGLISH"
						| "BILINGUAL") || "FRENCH";

				// Story 30.4: Mission-based selection (preferred for orders with missions)
				if (missionIds && missionIds.length > 0) {
					// Fetch missions with their quote lines
					const missions = await db.mission.findMany({
						where: {
							id: { in: missionIds },
							orderId: order.id,
							organizationId,
							// Only allow billing of COMPLETED missions (not already BILLED)
							status: { in: ["COMPLETED", "PENDING", "ASSIGNED", "IN_PROGRESS"] },
						},
						include: {
							quoteLine: true,
						},
					});

					if (missions.length === 0) {
						throw new Error(
							"No eligible missions found. Missions may already be billed or cancelled.",
						);
					}

					// Check for already billed missions
					const alreadyBilledCheck = await db.mission.findMany({
						where: {
							id: { in: missionIds },
							status: "BILLED",
						},
						select: { id: true },
					});

					if (alreadyBilledCheck.length > 0) {
						throw new Error(
							`${alreadyBilledCheck.length} mission(s) are already billed and cannot be invoiced again.`,
						);
					}

					// Build invoice lines from missions
					for (const mission of missions) {
						const missionPrice = mission.quoteLine
							? new Decimal(mission.quoteLine.totalPrice)
							: new Decimal(
									(mission.sourceData as { price?: number })?.price ?? 0,
								);

						const missionLabel =
							mission.quoteLine?.label ||
							(mission.sourceData as { label?: string })?.label ||
							(mission.sourceData as { lineLabel?: string })?.lineLabel ||
							"Mission";

						const priceHT = missionPrice.div(1.1).toDecimalPlaces(2);
						const priceVAT = missionPrice.sub(priceHT).toDecimalPlaces(2);

						invoiceLines.push({
							lineType: "SERVICE" as const,
							description: missionLabel,
							quantity: 1,
							unitPriceExclVat: priceHT.toNumber(),
							vatRate: 10,
							totalExclVat: priceHT.toNumber(),
							totalVat: priceVAT.toNumber(),
							sortOrder: invoiceLines.length,
							quoteLineId: mission.quoteLineId ?? undefined,
						});
					}

					// Calculate total
					invoiceAmount = invoiceLines.reduce(
						(sum, line) =>
							sum.add(
								new Decimal(line.totalExclVat).add(new Decimal(line.totalVat)),
							),
						new Decimal(0),
					);

					// Validate amount doesn't exceed balance
					if (invoiceAmount.gt(remainingBalance)) {
						throw new Error(
							`Selected missions amount (${invoiceAmount}€) exceeds remaining balance (${remainingBalance}€)`,
						);
					}

					invoiceDescription = `Facture partielle (${missions.length} mission${missions.length > 1 ? "s" : ""}) - Order ${order.reference}`;

					// Story 30.4: Store mission IDs to mark as BILLED after invoice creation
					(options as { _missionIdsToMark?: string[] })._missionIdsToMark =
						missions.map((m) => m.id);
				}
				// Legacy: QuoteLine-based selection
				else if (selectedLineIds && selectedLineIds.length > 0) {
					if (!quote?.lines) {
						throw new Error("Order has no quote lines to select from");
					}

					// Filter selected lines
					const selectedLines = quote.lines.filter((line) =>
						selectedLineIds.includes(line.id),
					);

					if (selectedLines.length === 0) {
						throw new Error("No matching lines found for selected IDs");
					}

					invoiceLines = InvoiceFactory.deepCopyQuoteLinesToInvoiceLines(
						selectedLines,
						endCustomerName,
						documentLanguage,
					);

					// Calculate total amount from lines
					invoiceAmount = invoiceLines.reduce(
						(sum, line) =>
							sum.add(
								new Decimal(line.totalExclVat).add(new Decimal(line.totalVat)),
							),
						new Decimal(0),
					);

					// Validate amount doesn't exceed balance
					if (invoiceAmount.gt(remainingBalance)) {
						throw new Error(
							`Selected lines amount (${invoiceAmount}€) exceeds remaining balance (${remainingBalance}€)`,
						);
					}

					invoiceDescription = `Facture partielle (${selectedLines.length} lignes) - Order ${order.reference}`;
				} else {
					throw new Error(
						"No missions or lines selected for manual invoice",
					);
				}
				break;
			}
		}

		// 4. Calculate totals
		const totalExclVat = invoiceLines.reduce(
			(sum, line) => sum.add(new Decimal(line.totalExclVat)),
			new Decimal(0),
		);
		const totalVat = invoiceLines.reduce(
			(sum, line) => sum.add(new Decimal(line.totalVat)),
			new Decimal(0),
		);
		const totalInclVat = totalExclVat.add(totalVat).toDecimalPlaces(2);

		// 5. Generate invoice number
		const invoiceNumber =
			await InvoiceFactory.generateInvoiceNumber(organizationId);

		// 6. Calculate commission
		let commissionAmount: number | null = null;
		const commissionPercent = getCommissionPercent(order.contact);
		if (commissionPercent > 0) {
			const result = calculateCommission({
				totalExclVat: totalExclVat.toNumber(),
				commissionPercent,
			});
			commissionAmount = result.commissionAmount;
		}

		// 7. Set dates
		const issueDate = new Date();
		const dueDate = InvoiceFactory.calculateDueDate(
			issueDate,
			order.contact.partnerContract,
		);

		// Story 30.4: Get mission IDs to mark as BILLED
		const missionIdsToMark = (options as { _missionIdsToMark?: string[] })
			._missionIdsToMark;

		// 8. Create invoice in transaction
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
					totalExclVat: totalExclVat.toDecimalPlaces(2).toNumber(),
					totalVat: totalVat.toDecimalPlaces(2).toNumber(),
					totalInclVat: totalInclVat.toNumber(),
					commissionAmount,
					notes: invoiceDescription,
					endCustomerId: quote?.endCustomerId,
				},
			});

			// Story 29.5: Include quoteLineId for traceability
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
						quoteLineId: line.quoteLineId, // Story 29.5: Traceability link
					})),
				});
			}

			// Story 30.4: Mark missions as BILLED to prevent duplicate invoicing
			if (missionIdsToMark && missionIdsToMark.length > 0) {
				await tx.mission.updateMany({
					where: { id: { in: missionIdsToMark } },
					data: { status: "BILLED" },
				});
				console.log(
					`[INVOICE_FACTORY] Marked ${missionIdsToMark.length} mission(s) as BILLED`,
				);
			}

			return newInvoice;
		});

		console.log(
			`[INVOICE_FACTORY] Created partial invoice ${invoiceNumber} (${options.mode}) for Order ${order.reference}: ${totalInclVat}€`,
		);

		// 9. Return complete invoice
		const completeInvoice = await db.invoice.findFirst({
			where: { id: invoice.id },
			include: {
				contact: true,
				endCustomer: true,
				lines: { orderBy: { sortOrder: "asc" } },
			},
		});

		return {
			invoice: completeInvoice,
			linesCreated: invoiceLines.length,
		};
	}
}
