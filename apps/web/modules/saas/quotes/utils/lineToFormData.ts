import type { QuoteLine } from "../components/yolo/dnd-utils";
import type { CreateQuoteFormData } from "../types";
import { initialCreateQuoteFormData } from "../types";
import { sanitizeString, sanitizeNumber } from "./typeGuards";

/**
 * Extract form data from a quote line for editing
 * This converts QuoteLine data back to CreateQuoteFormData format
 * to populate the main form when editing a line
 * 
 * @throws {Error} When line data is invalid or cannot be processed
 */
export function lineToFormData(line: QuoteLine): Partial<CreateQuoteFormData> {
	try {
		// Validate input
		if (!line || typeof line !== 'object') {
			throw new Error('Invalid line data provided');
		}

		const sourceData = line.sourceData as Record<string, unknown> || {};
		const formData = sourceData.formData as CreateQuoteFormData || {};

		// Validate and sanitize data
		const tripType = formData.tripType || "TRANSFER";
		const pickupAddress = sanitizeString(formData.pickupAddress) || sanitizeString(sourceData.origin) || "";
		const dropoffAddress = sanitizeString(formData.dropoffAddress) || sanitizeString(sourceData.destination) || "";
		
		// Validate dates
		let pickupAt: Date | null = null;
		if (formData.pickupAt) {
			const date = new Date(formData.pickupAt);
			if (isNaN(date.getTime())) {
				console.warn('Invalid pickupAt date, using null');
				pickupAt = null;
			} else {
				pickupAt = date;
			}
		}

		// Validate coordinates
		const pickupLatitude = typeof formData.pickupLatitude === 'number' ? formData.pickupLatitude : null;
		const pickupLongitude = typeof formData.pickupLongitude === 'number' ? formData.pickupLongitude : null;
		const dropoffLatitude = typeof formData.dropoffLatitude === 'number' ? formData.dropoffLatitude : null;
		const dropoffLongitude = typeof formData.dropoffLongitude === 'number' ? formData.dropoffLongitude : null;

		// Validate numeric fields
		const passengerCount = sanitizeNumber(formData.passengerCount) || 1;
		const luggageCount = sanitizeNumber(formData.luggageCount) || 0;
		const finalPrice = typeof line.totalPrice === 'number' ? line.totalPrice : 0;
		const durationHours = typeof formData.durationHours === 'number' ? formData.durationHours : null;
		const maxKilometers = typeof formData.maxKilometers === 'number' ? formData.maxKilometers : null;
		const waitingTimeMinutes = sanitizeNumber(formData.waitingTimeMinutes) || 0;

		// Return validated and sanitized data
		return {
			tripType,
			pickupAddress,
			pickupLatitude,
			pickupLongitude,
			dropoffAddress,
			dropoffLatitude,
			dropoffLongitude,
			pickupAt,
			vehicleCategoryId: sanitizeString(formData.vehicleCategoryId) || "",
			passengerCount: Math.max(1, Math.min(99, passengerCount)), // Validate range 1-99
			luggageCount: Math.max(0, Math.min(20, luggageCount)), // Validate range 0-20
			notes: sanitizeString(formData.notes) || "",
			finalPrice: Math.max(0, finalPrice), // Ensure non-negative
			isRoundTrip: Boolean(formData.isRoundTrip),
			durationHours: durationHours && durationHours > 0 ? durationHours : null,
			maxKilometers: maxKilometers && maxKilometers > 0 ? maxKilometers : null,
			// Keep other fields from initial data
			contactId: initialCreateQuoteFormData.contactId,
			contact: initialCreateQuoteFormData.contact,
			endCustomerId: initialCreateQuoteFormData.endCustomerId,
			endCustomer: initialCreateQuoteFormData.endCustomer,
			validUntil: initialCreateQuoteFormData.validUntil,
			flightNumber: sanitizeString(formData.flightNumber) || "",
			waitingTimeMinutes: Math.max(0, waitingTimeMinutes),
			selectedOptionalFeeIds: Array.isArray(formData.selectedOptionalFeeIds) ? formData.selectedOptionalFeeIds : [],
			stops: Array.isArray(formData.stops) ? formData.stops : [],
			returnDate: formData.returnDate ? new Date(formData.returnDate) : null,
			stayDays: Array.isArray(formData.stayDays) ? formData.stayDays : [],
			pricingMode: formData.pricingMode || "DYNAMIC",
		};
	} catch (error) {
		console.error('Error in lineToFormData:', error);
		throw new Error(`Failed to convert line to form data: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}
