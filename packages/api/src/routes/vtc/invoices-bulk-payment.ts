/**
 * Bulk Payment API Route (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 *
 * Provides endpoints for applying bulk payments across multiple invoices
 * with FIFO (First In, First Out) allocation strategy.
 */

import { db } from "@repo/database";
import type { Prisma, InvoiceStatus } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// ============================================================================
// Validation Schemas
// ============================================================================

const bulkPaymentSchema = z.object({
	invoiceIds: z.array(z.string()).min(1).describe("List of invoice IDs to apply payment to"),
	paymentAmount: z.number().positive().describe("Total payment amount in EUR"),
	paymentDate: z.string().datetime().optional().describe("Payment date (defaults to now)"),
	paymentReference: z.string().optional().describe("Payment reference (e.g., bank transfer ref)"),
	paymentMethod: z.enum(["VIREMENT", "CHEQUE", "CB", "ESPECES"]).optional().describe("Payment method"),
});

const contactBalanceSchema = z.object({
	contactId: z.string().min(1).describe("Contact ID"),
});

// ============================================================================
// Types
// ============================================================================

export interface PaymentAllocation {
	invoiceId: string;
	invoiceNumber: string;
	issueDate: Date;
	previousStatus: InvoiceStatus;
	newStatus: InvoiceStatus;
	previousPaidAmount: number;
	amountApplied: number;
	newPaidAmount: number;
	totalInclVat: number;
	remainingAmount: number;
}

export interface BulkPaymentResult {
	success: boolean;
	allocations: PaymentAllocation[];
	totalApplied: number;
	overage: number;
	paymentDate: Date;
	paymentReference?: string;
	paymentMethod?: string;
}

export interface ContactBalance {
	contactId: string;
	contactName: string;
	totalOutstanding: number;
	invoiceCount: number;
	oldestInvoiceDate: string | null;
	breakdown: {
		issued: number;
		partial: number;
	};
	unpaidInvoices: Array<{
		id: string;
		number: string;
		issueDate: Date;
		dueDate: Date;
		totalInclVat: number;
		paidAmount: number;
		remainingAmount: number;
		status: InvoiceStatus;
		isOverdue: boolean;
	}>;
}

// ============================================================================
// Routes
// ============================================================================

export const invoicesBulkPaymentRouter = new Hono()
	.basePath("/invoices")
	.use("*", organizationMiddleware)

	/**
	 * Apply bulk payment to multiple invoices (Lettrage)
	 * 
	 * Payment is allocated in FIFO order (oldest invoice first).
	 * Invoices are marked as:
	 * - PAID: if fully paid (paidAmount >= totalInclVat)
	 * - PARTIAL: if partially paid (0 < paidAmount < totalInclVat)
	 */
	.post(
		"/bulk-payment",
		validator("json", bulkPaymentSchema),
		describeRoute({
			summary: "Apply bulk payment to multiple invoices",
			description: "Story 25.6: Distribute a payment across multiple invoices using FIFO allocation. Handles partial payments automatically.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Fetch all requested invoices, ordered by issue date (oldest first)
			const invoices = await db.invoice.findMany({
				where: {
					organizationId,
					id: { in: data.invoiceIds },
					// Only allow ISSUED or PARTIAL invoices
					status: { in: ["ISSUED", "PARTIAL"] },
				},
				orderBy: { issueDate: "asc" },
			});

			// Validate all invoices were found and are eligible
			const foundIds = new Set(invoices.map((i) => i.id));
			const missingIds = data.invoiceIds.filter((id) => !foundIds.has(id));
			
			if (missingIds.length > 0) {
				// Check if they exist but are ineligible
				const ineligibleInvoices = await db.invoice.findMany({
					where: {
						organizationId,
						id: { in: missingIds },
					},
					select: { id: true, number: true, status: true },
				});

				if (ineligibleInvoices.length > 0) {
					const details = ineligibleInvoices
						.map((i) => `${i.number} (${i.status})`)
						.join(", ");
					throw new HTTPException(400, {
						message: `Cannot apply payment to invoices with status other than ISSUED or PARTIAL: ${details}`,
					});
				}

				throw new HTTPException(404, {
					message: `Invoices not found: ${missingIds.join(", ")}`,
				});
			}

			// Calculate allocations using FIFO
			const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
			let remainingPayment = data.paymentAmount;
			const allocations: PaymentAllocation[] = [];

			for (const invoice of invoices) {
				const totalInclVat = Number(invoice.totalInclVat);
				const currentPaidAmount = Number(invoice.paidAmount);
				const outstandingAmount = totalInclVat - currentPaidAmount;

				if (remainingPayment <= 0 || outstandingAmount <= 0) {
					// No more payment to allocate or invoice already fully paid
					continue;
				}

				// Calculate how much to apply to this invoice
				const amountToApply = Math.min(remainingPayment, outstandingAmount);
				const newPaidAmount = currentPaidAmount + amountToApply;
				const newRemainingAmount = totalInclVat - newPaidAmount;

				// Determine new status
				let newStatus: InvoiceStatus;
				// Use a small epsilon for floating point comparison
				if (newRemainingAmount < 0.01) {
					newStatus = "PAID";
				} else {
					newStatus = "PARTIAL";
				}

				allocations.push({
					invoiceId: invoice.id,
					invoiceNumber: invoice.number,
					issueDate: invoice.issueDate,
					previousStatus: invoice.status,
					newStatus,
					previousPaidAmount: currentPaidAmount,
					amountApplied: Math.round(amountToApply * 100) / 100,
					newPaidAmount: Math.round(newPaidAmount * 100) / 100,
					totalInclVat,
					remainingAmount: Math.round(Math.max(0, newRemainingAmount) * 100) / 100,
				});

				remainingPayment -= amountToApply;
			}

			// Apply all updates in a single transaction
			await db.$transaction(async (tx) => {
				for (const allocation of allocations) {
					await tx.invoice.update({
						where: { id: allocation.invoiceId },
						data: {
							paidAmount: allocation.newPaidAmount,
							status: allocation.newStatus,
						},
					});
				}
			});

			const totalApplied = allocations.reduce((sum, a) => sum + a.amountApplied, 0);
			const overage = Math.round(Math.max(0, remainingPayment) * 100) / 100;

			const result: BulkPaymentResult = {
				success: true,
				allocations,
				totalApplied: Math.round(totalApplied * 100) / 100,
				overage,
				paymentDate,
				paymentReference: data.paymentReference,
				paymentMethod: data.paymentMethod,
			};

			return c.json(result);
		},
	)

	/**
	 * Get contact outstanding balance
	 * 
	 * Returns the total outstanding balance for a contact,
	 * including breakdown by invoice status.
	 */
	.get(
		"/contact-balance/:contactId",
		describeRoute({
			summary: "Get contact outstanding balance",
			description: "Story 25.6: Returns total outstanding balance and unpaid invoices for a contact.",
			tags: ["VTC - Invoices"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const contactId = c.req.param("contactId");

			// Verify contact exists and belongs to organization
			const contact = await db.contact.findFirst({
				where: withTenantId(contactId, organizationId),
			});

			if (!contact) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			// Fetch all unpaid invoices (ISSUED or PARTIAL)
			const unpaidInvoices = await db.invoice.findMany({
				where: {
					organizationId,
					contactId,
					status: { in: ["ISSUED", "PARTIAL"] },
				},
				orderBy: { issueDate: "asc" },
				select: {
					id: true,
					number: true,
					issueDate: true,
					dueDate: true,
					totalInclVat: true,
					paidAmount: true,
					status: true,
				},
			});

			// Calculate totals
			const now = new Date();
			let totalOutstanding = 0;
			let issuedTotal = 0;
			let partialTotal = 0;

			const invoiceDetails = unpaidInvoices.map((inv) => {
				const totalInclVat = Number(inv.totalInclVat);
				const paidAmount = Number(inv.paidAmount);
				const remainingAmount = Math.round((totalInclVat - paidAmount) * 100) / 100;
				
				totalOutstanding += remainingAmount;
				
				if (inv.status === "ISSUED") {
					issuedTotal += remainingAmount;
				} else if (inv.status === "PARTIAL") {
					partialTotal += remainingAmount;
				}

				return {
					id: inv.id,
					number: inv.number,
					issueDate: inv.issueDate,
					dueDate: inv.dueDate,
					totalInclVat,
					paidAmount,
					remainingAmount,
					status: inv.status,
					isOverdue: inv.dueDate < now,
				};
			});

			const result: ContactBalance = {
				contactId,
				contactName: contact.displayName,
				totalOutstanding: Math.round(totalOutstanding * 100) / 100,
				invoiceCount: unpaidInvoices.length,
				oldestInvoiceDate: unpaidInvoices.length > 0 
					? unpaidInvoices[0].issueDate.toISOString() 
					: null,
				breakdown: {
					issued: Math.round(issuedTotal * 100) / 100,
					partial: Math.round(partialTotal * 100) / 100,
				},
				unpaidInvoices: invoiceDetails,
			};

			return c.json(result);
		},
	);
