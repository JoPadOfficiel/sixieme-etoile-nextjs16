/**
 * Pending Charges Detection Service
 * Story 28.12: Post-Mission Pending Charges
 *
 * Detects additional charges from Mission.executionData that haven't been invoiced yet.
 * Compares execution data (waiting time, parking, tolls, extra km) with existing InvoiceLines.
 */

import type { InvoiceLine, Mission } from "@prisma/client";
import { db } from "@repo/database";

// ============================================================================
// Types
// ============================================================================

export type PendingChargeType =
	| "WAITING_TIME"
	| "EXTRA_KM"
	| "PARKING"
	| "ADDITIONAL_TOLLS"
	| "OTHER";

export interface PendingCharge {
	id: string;
	orderId: string;
	missionId: string;
	missionLabel: string;
	type: PendingChargeType;
	description: string;
	amount: number;
	vatRate: number;
	invoiced: boolean;
	invoiceLineId?: string;
}

export interface PendingChargesResult {
	orderId: string;
	pendingCharges: PendingCharge[];
	totalPending: number;
}

// ============================================================================
// Service
// ============================================================================

export class PendingChargesService {
	/**
	 * Pricing constants for additional charges
	 * TODO: Move to OrganizationPricingSettings in future story
	 */
	private static readonly WAITING_TIME_RATE_PER_MINUTE = 0.5; // €0.50/min
	private static readonly EXTRA_KM_RATE = 2.0; // €2.00/km
	private static readonly INCLUDED_WAITING_MINUTES = 15; // First 15 min free

	/**
	 * Detect pending charges for an Order by comparing
	 * Mission.executionData with existing InvoiceLines
	 */
	static async detectPendingCharges(
		orderId: string,
		organizationId: string,
	): Promise<PendingChargesResult> {
		// 1. Fetch Order with Missions and Invoices
		const order = await db.order.findFirst({
			where: { id: orderId, organizationId },
			include: {
				missions: {
					include: {
						quoteLine: true,
					},
				},
				invoices: {
					include: {
						lines: true,
					},
				},
			},
		});

		if (!order) {
			throw new Error(`Order ${orderId} not found`);
		}

		// 2. Build set of already-invoiced charges (by description matching)
		const invoicedDescriptions = new Set<string>();
		for (const invoice of order.invoices) {
			for (const line of invoice.lines) {
				// Normalize and add to set
				invoicedDescriptions.add(line.description.toLowerCase().trim());
			}
		}

		// 3. Iterate missions and extract pending charges
		const pendingCharges: PendingCharge[] = [];

		for (const mission of order.missions) {
			const executionData = mission.executionData as Record<
				string,
				unknown
			> | null;
			if (!executionData) continue;

			// Story 28.13 FIX: Skip internal missions (non-billable)
			if (mission.isInternal) continue;

			const missionLabel = this.getMissionLabel(mission);

			// Check waiting time
			const waitingMinutes = executionData.waitingTimeMinutes as
				| number
				| undefined;
			if (
				typeof waitingMinutes === "number" &&
				waitingMinutes > this.INCLUDED_WAITING_MINUTES
			) {
				const billableMinutes = waitingMinutes - this.INCLUDED_WAITING_MINUTES;
				const amount = billableMinutes * this.WAITING_TIME_RATE_PER_MINUTE;
				const description = `Waiting Time (${billableMinutes} min)`;

				if (
					!this.isAlreadyInvoiced(
						description,
						missionLabel,
						invoicedDescriptions,
					)
				) {
					pendingCharges.push({
						id: `pc_wait_${mission.id}`,
						orderId,
						missionId: mission.id,
						missionLabel,
						type: "WAITING_TIME",
						description,
						amount: Math.round(amount * 100) / 100, // Round to 2 decimals
						vatRate: 10,
						invoiced: false,
					});
				}
			}

			// Check parking
			const parkingCost = executionData.parkingCost as number | undefined;
			if (typeof parkingCost === "number" && parkingCost > 0) {
				const description = "Parking";

				if (
					!this.isAlreadyInvoiced(
						description,
						missionLabel,
						invoicedDescriptions,
					)
				) {
					pendingCharges.push({
						id: `pc_park_${mission.id}`,
						orderId,
						missionId: mission.id,
						missionLabel,
						type: "PARKING",
						description,
						amount: Math.round(parkingCost * 100) / 100,
						vatRate: 20, // Parking at standard VAT
						invoiced: false,
					});
				}
			}

			// Check additional tolls
			const additionalTolls = executionData.additionalTolls as
				| number
				| undefined;
			if (typeof additionalTolls === "number" && additionalTolls > 0) {
				const description = "Additional Tolls";

				if (
					!this.isAlreadyInvoiced(
						description,
						missionLabel,
						invoicedDescriptions,
					)
				) {
					pendingCharges.push({
						id: `pc_toll_${mission.id}`,
						orderId,
						missionId: mission.id,
						missionLabel,
						type: "ADDITIONAL_TOLLS",
						description,
						amount: Math.round(additionalTolls * 100) / 100,
						vatRate: 20,
						invoiced: false,
					});
				}
			}

			// Check other charges (array of {label, amount})
			const otherCharges = executionData.otherCharges as
				| Array<{ label: string; amount: number }>
				| undefined;
			if (Array.isArray(otherCharges) && otherCharges.length > 0) {
				for (const charge of otherCharges) {
					if (
						typeof charge.label === "string" &&
						typeof charge.amount === "number" &&
						charge.amount > 0
					) {
						if (
							!this.isAlreadyInvoiced(
								charge.label,
								missionLabel,
								invoicedDescriptions,
							)
						) {
							pendingCharges.push({
								id: `pc_other_${mission.id}_${charge.label.replace(/\s+/g, "_").toLowerCase()}`,
								orderId,
								missionId: mission.id,
								missionLabel,
								type: "OTHER",
								description: charge.label,
								amount: Math.round(charge.amount * 100) / 100,
								vatRate: 20,
								invoiced: false,
							});
						}
					}
				}
			}

			// Check extra KM
			const estimatedKm = this.getEstimatedDistance(mission);
			const actualKm = executionData.actualDistanceKm as number | undefined;
			if (
				typeof estimatedKm === "number" &&
				typeof actualKm === "number" &&
				actualKm > estimatedKm
			) {
				const extraKm = actualKm - estimatedKm;
				// Only charge if difference is significant (> 2km to avoid noise)
				if (extraKm > 2) {
					const description = `Extra Distance (+${extraKm.toFixed(1)} km)`;

					if (
						!this.isAlreadyInvoiced(
							description,
							missionLabel,
							invoicedDescriptions,
						)
					) {
						pendingCharges.push({
							id: `pc_km_${mission.id}`,
							orderId,
							missionId: mission.id,
							missionLabel,
							type: "EXTRA_KM",
							description,
							amount: Math.round(extraKm * this.EXTRA_KM_RATE * 100) / 100,
							vatRate: 10,
							invoiced: false,
						});
					}
				}
			}
		}

		return {
			orderId,
			pendingCharges,
			totalPending: pendingCharges.reduce((sum, c) => sum + c.amount, 0),
		};
	}

	/**
	 * Add a pending charge to an invoice
	 */
	static async addChargeToInvoice(
		charge: PendingCharge,
		invoiceId: string,
		organizationId: string,
	): Promise<InvoiceLine> {
		// Verify invoice exists and belongs to org
		const invoice = await db.invoice.findFirst({
			where: { id: invoiceId, organizationId },
			include: { lines: { orderBy: { sortOrder: "desc" }, take: 1 } },
		});

		if (!invoice) {
			throw new Error(`Invoice ${invoiceId} not found`);
		}

		// Calculate amounts (charge.amount is TTC, we need to extract HT)
		const amountExclVat = charge.amount / (1 + charge.vatRate / 100);
		const vatAmount = charge.amount - amountExclVat;

		// Get next sort order
		const lastSortOrder = invoice.lines[0]?.sortOrder ?? 0;

		// Create invoice line
		const newLine = await db.invoiceLine.create({
			data: {
				invoiceId: invoice.id,
				lineType: "SERVICE",
				blockType: "MANUAL",
				description: `${charge.description} - ${charge.missionLabel}`,
				quantity: 1,
				unitPriceExclVat: Math.round(amountExclVat * 100) / 100,
				vatRate: charge.vatRate,
				totalExclVat: Math.round(amountExclVat * 100) / 100,
				totalVat: Math.round(vatAmount * 100) / 100,
				sortOrder: lastSortOrder + 1,
				sourceData: {
					pendingChargeId: charge.id,
					missionId: charge.missionId,
					chargeType: charge.type,
					addedFromPendingCharges: true,
				},
			},
		});

		// Recalculate invoice totals
		await this.recalculateInvoiceTotals(invoiceId);

		return newLine;
	}

	/**
	 * Add all pending charges to an invoice at once
	 */
	static async addAllChargesToInvoice(
		orderId: string,
		invoiceId: string,
		organizationId: string,
	): Promise<{ linesCreated: number; totalAmount: number }> {
		const { pendingCharges } = await this.detectPendingCharges(
			orderId,
			organizationId,
		);

		if (pendingCharges.length === 0) {
			return { linesCreated: 0, totalAmount: 0 };
		}

		let totalAmount = 0;
		for (const charge of pendingCharges) {
			await this.addChargeToInvoice(charge, invoiceId, organizationId);
			totalAmount += charge.amount;
		}

		return {
			linesCreated: pendingCharges.length,
			totalAmount,
		};
	}

	/**
	 * Recalculate invoice totals after adding lines
	 */
	private static async recalculateInvoiceTotals(
		invoiceId: string,
	): Promise<void> {
		const lines = await db.invoiceLine.findMany({
			where: { invoiceId },
		});

		let totalExclVat = 0;
		let totalVat = 0;

		for (const line of lines) {
			totalExclVat += Number(line.totalExclVat);
			totalVat += Number(line.totalVat);
		}

		// Round to 2 decimal places
		totalExclVat = Math.round(totalExclVat * 100) / 100;
		totalVat = Math.round(totalVat * 100) / 100;
		const totalInclVat = Math.round((totalExclVat + totalVat) * 100) / 100;

		await db.invoice.update({
			where: { id: invoiceId },
			data: {
				totalExclVat,
				totalVat,
				totalInclVat,
			},
		});
	}

	/**
	 * Helper: Get mission label from sourceData
	 */
	private static getMissionLabel(mission: Mission): string {
		const sourceData = mission.sourceData as {
			pickupAddress?: string;
			dropoffAddress?: string;
		} | null;

		if (sourceData?.pickupAddress && sourceData?.dropoffAddress) {
			// Extract first part of address (before comma)
			const pickup = sourceData.pickupAddress.split(",")[0]?.trim() || "";
			const dropoff = sourceData.dropoffAddress.split(",")[0]?.trim() || "";
			return `${pickup} → ${dropoff}`;
		}

		return `Mission #${mission.id.slice(-6)}`;
	}

	/**
	 * Helper: Get estimated distance from mission sourceData
	 */
	private static getEstimatedDistance(mission: Mission): number | null {
		const sourceData = mission.sourceData as {
			estimatedDistance?: number;
		} | null;
		return sourceData?.estimatedDistance ?? null;
	}

	/**
	 * Helper: Check if a charge description is already invoiced
	 * Uses fuzzy matching to avoid duplicates
	 */
	private static isAlreadyInvoiced(
		description: string,
		missionLabel: string,
		invoicedDescriptions: Set<string>,
	): boolean {
		const normalizedDesc = description.toLowerCase().trim();
		const fullDescription = `${description} - ${missionLabel}`
			.toLowerCase()
			.trim();

		for (const invoiced of Array.from(invoicedDescriptions)) {
			// Exact match
			if (invoiced === fullDescription) {
				return true;
			}

			// Contains match (handles cases where description is part of invoiced line)
			if (
				invoiced.includes(normalizedDesc) &&
				invoiced.includes(missionLabel.toLowerCase())
			) {
				return true;
			}

			// Partial match for common charge types
			if (normalizedDesc.includes("waiting") && invoiced.includes("waiting")) {
				// Check if it's for the same mission
				if (
					invoiced.includes(missionLabel.toLowerCase().split(" → ")[0] || "")
				) {
					return true;
				}
			}

			if (normalizedDesc.includes("parking") && invoiced.includes("parking")) {
				if (
					invoiced.includes(missionLabel.toLowerCase().split(" → ")[0] || "")
				) {
					return true;
				}
			}
		}

		return false;
	}
}
