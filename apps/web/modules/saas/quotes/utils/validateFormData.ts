import type { CreateQuoteFormData } from "../types";
import { initialCreateQuoteFormData } from "../types";

/**
 * Validation utilities for form data
 */

export function validateFormData(data: Partial<CreateQuoteFormData>): CreateQuoteFormData {
	// Create a clean base form with all required fields
	const validatedForm: CreateQuoteFormData = {
		...initialCreateQuoteFormData,
	};

	// Validate and merge each field safely
	if (data.tripType) {
		validatedForm.tripType = data.tripType;
	}

	if (data.pickupAddress !== undefined) {
		validatedForm.pickupAddress = data.pickupAddress;
	}

	if (data.pickupLatitude !== undefined) {
		validatedForm.pickupLatitude = data.pickupLatitude;
	}

	if (data.pickupLongitude !== undefined) {
		validatedForm.pickupLongitude = data.pickupLongitude;
	}

	if (data.dropoffAddress !== undefined) {
		validatedForm.dropoffAddress = data.dropoffAddress;
	}

	if (data.dropoffLatitude !== undefined) {
		validatedForm.dropoffLatitude = data.dropoffLatitude;
	}

	if (data.dropoffLongitude !== undefined) {
		validatedForm.dropoffLongitude = data.dropoffLongitude;
	}

	if (data.pickupAt !== undefined) {
		validatedForm.pickupAt = data.pickupAt;
	}

	if (data.vehicleCategoryId !== undefined) {
		validatedForm.vehicleCategoryId = data.vehicleCategoryId;
	}

	if (data.passengerCount !== undefined) {
		validatedForm.passengerCount = Math.max(1, Math.min(99, data.passengerCount));
	}

	if (data.luggageCount !== undefined) {
		validatedForm.luggageCount = Math.max(0, Math.min(20, data.luggageCount));
	}

	if (data.notes !== undefined) {
		validatedForm.notes = data.notes;
	}

	if (data.finalPrice !== undefined) {
		validatedForm.finalPrice = Math.max(0, data.finalPrice);
	}

	if (data.isRoundTrip !== undefined) {
		validatedForm.isRoundTrip = Boolean(data.isRoundTrip);
	}

	if (data.durationHours !== undefined) {
		validatedForm.durationHours = data.durationHours && data.durationHours > 0 ? data.durationHours : null;
	}

	if (data.maxKilometers !== undefined) {
		validatedForm.maxKilometers = data.maxKilometers && data.maxKilometers > 0 ? data.maxKilometers : null;
	}

	if (data.flightNumber !== undefined) {
		validatedForm.flightNumber = data.flightNumber;
	}

	if (data.waitingTimeMinutes !== undefined) {
		validatedForm.waitingTimeMinutes = Math.max(0, data.waitingTimeMinutes);
	}

	if (data.selectedOptionalFeeIds !== undefined) {
		validatedForm.selectedOptionalFeeIds = Array.isArray(data.selectedOptionalFeeIds) ? data.selectedOptionalFeeIds : [];
	}

	if (data.stops !== undefined) {
		validatedForm.stops = Array.isArray(data.stops) ? data.stops : [];
	}

	if (data.returnDate !== undefined) {
		validatedForm.returnDate = data.returnDate;
	}

	if (data.stayDays !== undefined) {
		validatedForm.stayDays = Array.isArray(data.stayDays) ? data.stayDays : [];
	}

	if (data.pricingMode !== undefined) {
		validatedForm.pricingMode = data.pricingMode;
	}

	return validatedForm;
}

/**
 * Merge form data with validation to prevent state corruption
 */
export function safeMergeFormData(
	current: CreateQuoteFormData, 
	updates: Partial<CreateQuoteFormData>
): CreateQuoteFormData {
	try {
		return validateFormData({ ...current, ...updates });
	} catch (error) {
		console.error('Error merging form data:', error);
		// Return current data if validation fails
		return current;
	}
}
