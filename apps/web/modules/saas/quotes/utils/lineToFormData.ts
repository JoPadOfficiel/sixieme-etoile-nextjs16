import type { QuoteLine } from "../components/yolo/dnd-utils";
import type { CreateQuoteFormData } from "../types";
import { initialCreateQuoteFormData } from "../types";

/**
 * Extract form data from a quote line for editing
 * This converts QuoteLine data back to CreateQuoteFormData format
 * to populate the main form when editing a line
 */
export function lineToFormData(line: QuoteLine): Partial<CreateQuoteFormData> {
	const sourceData = line.sourceData as Record<string, unknown> || {};
	const formData = sourceData.formData as CreateQuoteFormData || {};

	// Extract data from sourceData with fallbacks
	return {
		tripType: formData.tripType || "TRANSFER",
		pickupAddress: formData.pickupAddress || (sourceData.origin as string) || "",
		pickupLatitude: formData.pickupLatitude || null,
		pickupLongitude: formData.pickupLongitude || null,
		dropoffAddress: formData.dropoffAddress || (sourceData.destination as string) || "",
		dropoffLatitude: formData.dropoffLatitude || null,
		dropoffLongitude: formData.dropoffLongitude || null,
		pickupAt: formData.pickupAt ? new Date(formData.pickupAt) : null,
		vehicleCategoryId: formData.vehicleCategoryId || "",
		passengerCount: formData.passengerCount || 1,
		luggageCount: formData.luggageCount || 0,
		notes: formData.notes || "",
		finalPrice: line.totalPrice,
		isRoundTrip: formData.isRoundTrip || false,
		durationHours: formData.durationHours || null,
		maxKilometers: formData.maxKilometers || null,
		// Keep other fields from initial data
		contactId: initialCreateQuoteFormData.contactId,
		contact: initialCreateQuoteFormData.contact,
		endCustomerId: initialCreateQuoteFormData.endCustomerId,
		endCustomer: initialCreateQuoteFormData.endCustomer,
		validUntil: initialCreateQuoteFormData.validUntil,
		flightNumber: formData.flightNumber || "",
		waitingTimeMinutes: formData.waitingTimeMinutes || 0,
		selectedOptionalFeeIds: formData.selectedOptionalFeeIds || [],
		stops: formData.stops || [],
		returnDate: formData.returnDate || null,
		stayDays: formData.stayDays || [],
		pricingMode: formData.pricingMode || "DYNAMIC",
	};
}
