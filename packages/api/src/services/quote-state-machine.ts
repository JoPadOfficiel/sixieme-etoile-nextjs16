/**
 * Quote State Machine Service
 *
 * Implements quote lifecycle state transitions with validation and audit logging.
 *
 * @see Story 6.4: Implement Quote Lifecycle & Status Transitions
 * @see FR31-FR33: Quote lifecycle requirements
 */

import { db } from "@repo/database";
import type { Quote, QuoteStatus } from "@prisma/client";

/**
 * Valid status transitions map
 * Each key is a current status, and the value is an array of valid next statuses
 */
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
	DRAFT: ["SENT", "EXPIRED"],
	SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
	VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED"],
	ACCEPTED: [], // Terminal state
	REJECTED: [], // Terminal state
	EXPIRED: [], // Terminal state
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

		// Execute transition in a transaction
		const [updatedQuote] = await db.$transaction([
			// Update quote status and timestamp
			db.quote.update({
				where: { id: quoteId },
				data: {
					status: newStatus,
					...timestampUpdate,
				},
				include: {
					contact: true,
					vehicleCategory: true,
					invoice: true,
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

		return {
			success: true,
			quote: updatedQuote,
		};
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
	 * Notes are editable for all statuses except EXPIRED
	 * This allows operators to add driver instructions after sending
	 */
	static isNotesEditable(status: QuoteStatus): boolean {
		return status !== "EXPIRED";
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
