/**
 * Tests for validateFormData utility
 * 
 * Tests form data validation and safe merging functionality
 */

import { describe, it, expect } from "vitest";
import { validateFormData, safeMergeFormData } from "../validateFormData";
import { initialCreateQuoteFormData } from "../types";

describe("validateFormData", () => {
	it("should return valid form data for complete input", () => {
		const input = {
			tripType: "TRANSFER",
			pickupAddress: "Paris, France",
			dropoffAddress: "CDG Airport",
			vehicleCategoryId: "van-premium",
			passengerCount: 4,
			luggageCount: 2,
			notes: "Test transfer",
			finalPrice: 50.0,
			isRoundTrip: false,
			durationHours: 2,
			maxKilometers: 100,
			flightNumber: "AF123",
			waitingTimeMinutes: 15,
			selectedOptionalFeeIds: ["fee-1"],
			stops: [{ address: "Stop 1", duration: 10 }],
			returnDate: new Date("2024-01-20"),
			stayDays: ["2024-01-15", "2024-01-16"],
			pricingMode: "DYNAMIC",
		};

		const result = validateFormData(input);

		expect(result.tripType).toBe("TRANSFER");
		expect(result.pickupAddress).toBe("Paris, France");
		expect(result.passengerCount).toBe(4);
		expect(result.finalPrice).toBe(50.0);
	});

	it("should use default values for missing fields", () => {
		const input = {};

		const result = validateFormData(input);

		expect(result.tripType).toBe(initialCreateQuoteFormData.tripType);
		expect(result.pickupAddress).toBe(initialCreateQuoteFormData.pickupAddress);
		expect(result.passengerCount).toBe(initialCreateQuoteFormData.passengerCount);
	});

	it("should validate numeric ranges", () => {
		const input = {
			passengerCount: 150, // Above max 99
			luggageCount: -5, // Below min 0
			finalPrice: -100, // Negative
			durationHours: -2, // Negative
			maxKilometers: 0, // Zero (should be null)
			waitingTimeMinutes: -10, // Negative
		};

		const result = validateFormData(input);

		expect(result.passengerCount).toBe(99); // Clamped to max
		expect(result.luggageCount).toBe(0); // Clamped to min
		expect(result.finalPrice).toBe(0); // Clamped to min
		expect(result.durationHours).toBeNull(); // Negative becomes null
		expect(result.maxKilometers).toBeNull(); // Zero becomes null
		expect(result.waitingTimeMinutes).toBe(0); // Clamped to min
	});

	it("should handle boolean conversion", () => {
		const input = {
			isRoundTrip: "true", // String that should become boolean
		};

		const result = validateFormData(input);

		expect(result.isRoundTrip).toBe(true);
	});

	it("should handle array fields correctly", () => {
		const input = {
			selectedOptionalFeeIds: ["fee-1", "fee-2"],
			stops: [{ address: "Stop 1", duration: 10 }],
			stayDays: ["2024-01-15"],
		};

		const result = validateFormData(input);

		expect(result.selectedOptionalFeeIds).toEqual(["fee-1", "fee-2"]);
		expect(result.stops).toEqual([{ address: "Stop 1", duration: 10 }]);
		expect(result.stayDays).toEqual(["2024-01-15"]);
	});

	it("should handle invalid array fields gracefully", () => {
		const input = {
			selectedOptionalFeeIds: "not-an-array",
			stops: "also-not-array",
			stayDays: null,
		};

		const result = validateFormData(input);

		expect(result.selectedOptionalFeeIds).toEqual([]);
		expect(result.stops).toEqual([]);
		expect(result.stayDays).toEqual([]);
	});
});

describe("safeMergeFormData", () => {
	it("should merge data safely", () => {
		const current = {
			tripType: "TRANSFER",
			pickupAddress: "Paris",
			passengerCount: 2,
		};

		const updates = {
			pickupAddress: "CDG Airport",
			passengerCount: 4,
			luggageCount: 3,
		};

		const result = safeMergeFormData(current, updates);

		expect(result.tripType).toBe("TRANSFER"); // Preserved
		expect(result.pickupAddress).toBe("CDG Airport"); // Updated
		expect(result.passengerCount).toBe(4); // Updated
		expect(result.luggageCount).toBe(3); // Added
	});

	it("should return current data if validation fails", () => {
		const current = {
			tripType: "TRANSFER",
			pickupAddress: "Paris",
		};

		const updates = {
			// This would cause validation to fail if we had validation errors
			passengerCount: "invalid" as any,
		};

		const result = safeMergeFormData(current, updates);

		// Should return current data unchanged
		expect(result).toEqual(current);
	});
});
