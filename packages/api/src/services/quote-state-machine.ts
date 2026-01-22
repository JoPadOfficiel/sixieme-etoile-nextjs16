/**
 * Quote State Machine Service
 *
 * Implements quote lifecycle state transitions with validation and audit logging.
 *
 * @see Story 6.4: Implement Quote Lifecycle & Status Transitions
 * @see FR31-FR33: Quote lifecycle requirements
 */

import type { Quote, QuoteStatus } from "@prisma/client";
import { db } from "@repo/database";

/**
 * Valid status transitions map
 * Each key is a current status, and the value is an array of valid next statuses
 */
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
	DRAFT: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
	SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
	VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"],
	ACCEPTED: ["CANCELLED"], // Can be cancelled
	REJECTED: [], // Terminal state
	EXPIRED: [], // Terminal state
	CANCELLED: [], // Terminal state
};

/**
 * Timestamp field mapping for each status
 * When transitioning to a status, the corresponding timestamp field is set
 */
const STATUS_TIMESTAMP_FIELD: Record<QuoteStatus, string | null> = {
	DRAFT: null,
	SENT: "sentAt",
	VIEWED: "viewedAt",
	ACCEPTED: "acceptedAt",
	REJECTED: "rejectedAt",
	EXPIRED: "expiredAt",
	CANCELLED: "cancelledAt",
};

/**
 * Human-readable status names for error messages
 */
const STATUS_LABELS: Record<QuoteStatus, string> = {
	DRAFT: "Draft",
	SENT: "Sent",
	VIEWED: "Viewed",
	ACCEPTED: "Accepted",
	REJECTED: "Rejected",
	EXPIRED: "Expired",
	CANCELLED: "Cancelled",
};

export interface TransitionValidationResult {
	valid: boolean;
	error?: string;
	errorKey?: string; // i18n key for frontend
}

export interface TransitionResult {
	success: boolean;
	quote?: Quote;
	error?: string;
	errorKey?: string;
}

/**
 * Quote State Machine
 *
 * Provides methods for validating and executing quote status transitions.
 * All transitions are validated against the VALID_TRANSITIONS map.
 * Successful transitions record timestamps and create audit log entries.
 */
export class QuoteStateMachine {
	/**
	 * Check if a transition from one status to another is valid
	 */
	static canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
		return VALID_TRANSITIONS[from]?.includes(to) ?? false;
	}

	/**
	 * Get list of valid next statuses from current status
	 */
	static getValidTransitions(from: QuoteStatus): QuoteStatus[] {
		return VALID_TRANSITIONS[from] ?? [];
	}

	/**
	 * Validate a status transition and return detailed result
	 */
	static validateTransition(
		from: QuoteStatus,
		to: QuoteStatus,
	): TransitionValidationResult {
		// Same status - no-op
		if (from === to) {
			return {
				valid: false,
				error: `Quote is already in ${STATUS_LABELS[from]} status`,
				errorKey: "quotes.status.transition.alreadyInStatus",
			};
		}

		// Check if transition is valid
		if (!this.canTransition(from, to)) {
			const validTransitions = this.getValidTransitions(from);

			if (validTransitions.length === 0) {
				return {
					valid: false,
					error: `Cannot transition from ${STATUS_LABELS[from]} status. This is a terminal state.`,
					errorKey: "quotes.status.transition.terminalState",
				};
			}

			return {
				valid: false,
				error: `Invalid transition from ${STATUS_LABELS[from]} to ${STATUS_LABELS[to]}. Valid transitions: ${validTransitions.map((s) => STATUS_LABELS[s]).join(", ")}`,
				errorKey: "quotes.status.transition.invalidTransition",
			};
		}

		return { valid: true };
	}

	/**
	 * Execute a status transition with timestamp recording and audit logging
	 *
	 * @param quoteId - The quote ID to transition
	 * @param newStatus - The target status
	 * @param organizationId - The organization ID for multi-tenancy
	 * @param userId - Optional user ID for audit trail
	 * @param reason - Optional reason for the transition
	 */
	static async transition(
		quoteId: string,
		newStatus: QuoteStatus,
		organizationId: string,
		userId?: string,
		reason?: string,
	): Promise<TransitionResult> {
		// Fetch current quote
		const quote = await db.quote.findFirst({
			where: {
				id: quoteId,
				organizationId,
			},
		});

		if (!quote) {
			return {
				success: false,
				error: "Quote not found",
				errorKey: "quotes.status.transition.notFound",
			};
		}

		const currentStatus = quote.status;

		// Validate transition
		const validation = this.validateTransition(currentStatus, newStatus);
		if (!validation.valid) {
			return {
				success: false,
				error: validation.error,
				errorKey: validation.errorKey,
			};
		}

		// Determine timestamp field to update
		const timestampField = STATUS_TIMESTAMP_FIELD[newStatus];
		const timestampUpdate = timestampField
			? { [timestampField]: new Date() }
			: {};

		// Story 29.5: When transitioning to ACCEPTED, create Order if not exists
		let orderId: string | null = quote.orderId;
		if (newStatus === "ACCEPTED" && !quote.orderId) {
			// Generate order reference
			const orderReference = await this.generateOrderReference(organizationId);
			
			// Create Order in a separate transaction first
			const newOrder = await db.order.create({
				data: {
					organizationId,
					reference: orderReference,
					contactId: quote.contactId,
					status: "CONFIRMED",
					notes: null,
				},
			});
			orderId = newOrder.id;
			console.log(`[QuoteStateMachine] Created Order ${orderReference} for accepted quote ${quoteId}`);
		}

		// Execute transition in a transaction
		const [updatedQuote] = await db.$transaction([
			// Update quote status, timestamp, and orderId
			db.quote.update({
				where: { id: quoteId },
				data: {
					status: newStatus,
					...timestampUpdate,
					...(orderId && !quote.orderId ? { orderId } : {}),
				},
				include: {
					contact: true,
					vehicleCategory: true,
					invoices: true,
				},
			}),
			// Create audit log entry
			db.quoteStatusAuditLog.create({
				data: {
					organizationId,
					quoteId,
					previousStatus: currentStatus,
					newStatus,
					userId,
					reason,
				},
			}),
		]);

		// Story 29.5: Link missions to the new Order
		if (newStatus === "ACCEPTED" && orderId) {
			await db.mission.updateMany({
				where: {
					quoteId,
					orderId: null,
				},
				data: {
					orderId,
				},
			});
			console.log(`[QuoteStateMachine] Linked missions to Order ${orderId}`);
		}

		return {
			success: true,
			quote: updatedQuote,
		};
	}

	/**
	 * Generate unique order reference in format ORD-YYYY-NNN
	 * Story 29.5: Used when auto-creating Order on quote acceptance
	 */
	private static async generateOrderReference(
		organizationId: string,
		retryCount = 0,
	): Promise<string> {
		const MAX_RETRIES = 3;
		const year = new Date().getFullYear();
		const prefix = `ORD-${year}-`;

		const lastOrder = await db.order.findFirst({
			where: {
				organizationId,
				reference: { startsWith: prefix },
			},
			orderBy: { reference: "desc" },
		});

		let sequence = 1;
		if (lastOrder) {
			const match = lastOrder.reference.match(/ORD-\d{4}-(\d+)/);
			if (match) sequence = Number.parseInt(match[1], 10) + 1;
		}

		sequence += retryCount;
		const reference = `${prefix}${sequence.toString().padStart(3, "0")}`;

		if (retryCount < MAX_RETRIES) {
			const existing = await db.order.findFirst({
				where: { organizationId, reference },
			});
			if (existing) {
				return this.generateOrderReference(organizationId, retryCount + 1);
			}
		}

		return reference;
	}

	/**
	 * Check if a quote should be auto-expired based on validUntil date
	 *
	 * @param quote - The quote to check
	 * @returns true if the quote should be expired
	 */
	static shouldAutoExpire(quote: Quote): boolean {
		// Only DRAFT and SENT quotes can be auto-expired
		if (!["DRAFT", "SENT", "VIEWED"].includes(quote.status)) {
			return false;
		}

		// Check if validUntil is set and in the past
		if (!quote.validUntil) {
			return false;
		}

		return new Date(quote.validUntil) < new Date();
	}

	/**
	 * Auto-expire a quote if it meets expiration criteria
	 *
	 * @param quoteId - The quote ID to check and potentially expire
	 * @param organizationId - The organization ID for multi-tenancy
	 */
	static async checkAndExpire(
		quoteId: string,
		organizationId: string,
	): Promise<TransitionResult | null> {
		const quote = await db.quote.findFirst({
			where: {
				id: quoteId,
				organizationId,
			},
		});

		if (!quote || !this.shouldAutoExpire(quote)) {
			return null;
		}

		return this.transition(
			quoteId,
			"EXPIRED",
			organizationId,
			undefined,
			"Auto-expired due to validUntil date",
		);
	}

	/**
	 * Batch expire all quotes that have passed their validUntil date
	 * Used by background jobs/cron
	 *
	 * @param organizationId - Optional organization ID to scope the operation
	 */
	static async expireOverdueQuotes(organizationId?: string): Promise<number> {
		const now = new Date();

		// Find all quotes that should be expired
		const overdueQuotes = await db.quote.findMany({
			where: {
				status: { in: ["DRAFT", "SENT", "VIEWED"] },
				validUntil: { lt: now },
				...(organizationId && { organizationId }),
			},
			select: {
				id: true,
				organizationId: true,
			},
		});

		let expiredCount = 0;

		// Expire each quote
		for (const quote of overdueQuotes) {
			const result = await this.transition(
				quote.id,
				"EXPIRED",
				quote.organizationId,
				undefined,
				"Auto-expired by batch job",
			);

			if (result.success) {
				expiredCount++;
			}
		}

		return expiredCount;
	}

	/**
	 * Get the status history for a quote from audit logs
	 */
	static async getStatusHistory(quoteId: string, organizationId: string) {
		return db.quoteStatusAuditLog.findMany({
			where: {
				quoteId,
				organizationId,
			},
			orderBy: {
				timestamp: "asc",
			},
		});
	}

	/**
	 * Check if a quote's commercial values should be frozen (non-editable)
	 * Commercial values are frozen after the quote leaves DRAFT status
	 */
	static isCommerciallyFrozen(status: QuoteStatus): boolean {
		return status !== "DRAFT";
	}

	/**
	 * Check if a quote can be edited (notes, etc.)
	 * Only DRAFT quotes are fully editable
	 */
	static isEditable(status: QuoteStatus): boolean {
		return status === "DRAFT";
	}

	/**
	 * Story 22.3: Check if notes can be edited on a quote
	 * Notes are editable for all statuses except EXPIRED and CANCELLED
	 * This allows operators to add driver instructions after sending
	 * Story 30.1: CANCELLED quotes are fully locked
	 */
	static isNotesEditable(status: QuoteStatus): boolean {
		return status !== "EXPIRED" && status !== "CANCELLED";
	}

	/**
	 * Check if a quote can be converted to an invoice
	 * Only ACCEPTED quotes can be converted
	 */
	static canConvertToInvoice(status: QuoteStatus): boolean {
		return status === "ACCEPTED";
	}
}

export default QuoteStateMachine;
