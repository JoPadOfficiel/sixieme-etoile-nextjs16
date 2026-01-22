/**
 * Tests for lineToFormData utility
 * 
 * Tests the conversion of QuoteLine data back to CreateQuoteFormData format
 * for editing functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { lineToFormData } from "../lineToFormData";
import type { QuoteLine } from "../../components/yolo/dnd-utils";

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("lineToFormData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Valid Input Handling", () => {
		it("should convert valid CALCULATED line to form data", () => {
			const mockLine: QuoteLine = {
				id: "test-line-1",
				type: "CALCULATED",
				label: "Paris to CDG",
				description: "Airport transfer",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					origin: "Paris, France",
					destination: "Charles de Gaulle Airport",
					formData: {
						tripType: "TRANSFER",
						pickupAddress: "Paris, France",
						dropoffAddress: "Charles de Gaulle Airport",
						vehicleCategoryId: "van-premium",
						passengerCount: 4,
						luggageCount: 2,
						notes: "Test transfer",
						isRoundTrip: false,
						flightNumber: "AF123",
						waitingTimeMinutes: 15,
						selectedOptionalFeeIds: ["fee-1"],
						pricingMode: "DYNAMIC",
					},
				},
				displayData: {
					label: "Paris to CDG",
					description: "Airport transfer",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result).toEqual({
				tripType: "TRANSFER",
				pickupAddress: "Paris, France",
				pickupLatitude: null,
				pickupLongitude: null,
				dropoffAddress: "Charles de Gaulle Airport",
				dropoffLatitude: null,
				dropoffLongitude: null,
				pickupAt: null,
				vehicleCategoryId: "van-premium",
				passengerCount: 4,
				luggageCount: 2,
				notes: "Test transfer",
				finalPrice: 50.0,
				isRoundTrip: false,
				durationHours: null,
				maxKilometers: null,
				contactId: expect.any(String),
				contact: expect.any(Object),
				endCustomerId: null,
				endCustomer: null,
				validUntil: expect.any(Date),
				flightNumber: "AF123",
				waitingTimeMinutes: 15,
				selectedOptionalFeeIds: ["fee-1"],
				stops: [],
				returnDate: null,
				stayDays: [],
				pricingMode: "DYNAMIC",
			});
		});

		it("should handle MANUAL line with minimal data", () => {
			const mockLine: QuoteLine = {
				id: "manual-line-1",
				type: "MANUAL",
				label: "Custom Service",
				description: "",
				quantity: 1,
				unitPrice: 100.0,
				totalPrice: 100.0,
				vatRate: 20.0,
				sortOrder: 1,
				parentId: null,
				sourceData: {},
				displayData: {
					label: "Custom Service",
					description: "",
					quantity: 1,
					unitPrice: 100.0,
					vatRate: 20.0,
					total: 100.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.tripType).toBe("TRANSFER");
			expect(result.pickupAddress).toBe("");
			expect(result.dropoffAddress).toBe("");
			expect(result.finalPrice).toBe(100.0);
			expect(result.passengerCount).toBe(1);
			expect(result.luggageCount).toBe(0);
		});

		it("should handle valid date conversion", () => {
			const testDate = new Date("2024-01-15T10:00:00Z");
			const mockLine: QuoteLine = {
				id: "date-test",
				type: "CALCULATED",
				label: "Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						pickupAt: testDate.toISOString(),
					},
				},
				displayData: {
					label: "Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.pickupAt).toEqual(testDate);
		});
	});

	describe("Data Validation and Sanitization", () => {
		it("should sanitize string fields", () => {
			const mockLine: QuoteLine = {
				id: "sanitize-test",
				type: "CALCULATED",
				label: "<script>alert('xss')</script>",
				description: "Test <b>bold</b>",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						pickupAddress: "Test<script>alert('xss')</script>Address",
						dropoffAddress: "Address with <b>HTML</b>",
						vehicleCategoryId: "category<script>",
						notes: "Notes with <>'\"&",
						flightNumber: "FLIGHT<script>123",
					},
				},
				displayData: {
					label: "<script>alert('xss')</script>",
					description: "Test <b>bold</b>",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.pickupAddress).toBe("TestAddress");
			expect(result.dropoffAddress).toBe("Address with HTML");
			expect(result.vehicleCategoryId).toBe("category");
			expect(result.notes).toBe("Notes with ");
			expect(result.flightNumber).toBe("FLIGHT123");
		});

		it("should validate numeric ranges", () => {
			const mockLine: QuoteLine = {
				id: "range-test",
				type: "CALCULATED",
				label: "Range Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						passengerCount: 150, // Above max 99
						luggageCount: -5, // Below min 0
						finalPrice: -100, // Negative
						durationHours: -2, // Negative
						maxKilometers: 0, // Zero (should be null)
						waitingTimeMinutes: -10, // Negative
					},
				},
				displayData: {
					label: "Range Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.passengerCount).toBe(99); // Clamped to max
			expect(result.luggageCount).toBe(0); // Clamped to min
			expect(result.finalPrice).toBe(50.0); // Uses line price instead
			expect(result.durationHours).toBeNull(); // Negative becomes null
			expect(result.maxKilometers).toBeNull(); // Zero becomes null
			expect(result.waitingTimeMinutes).toBe(0); // Clamped to min
		});

		it("should handle invalid dates gracefully", () => {
			const mockLine: QuoteLine = {
				id: "invalid-date-test",
				type: "CALCULATED",
				label: "Invalid Date",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						pickupAt: "invalid-date-string",
						returnDate: "also-invalid",
					},
				},
				displayData: {
					label: "Invalid Date",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.pickupAt).toBeNull();
			expect(result.returnDate).toBeNull();
			expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid pickupAt date, using null');
		});

		it("should handle array fields correctly", () => {
			const mockLine: QuoteLine = {
				id: "array-test",
				type: "CALCULATED",
				label: "Array Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						selectedOptionalFeeIds: ["fee-1", "fee-2", "fee-3"],
						stops: [
							{ address: "Stop 1", duration: 10 },
							{ address: "Stop 2", duration: 15 },
						],
						stayDays: ["2024-01-15", "2024-01-16"],
					},
				},
				displayData: {
					label: "Array Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.selectedOptionalFeeIds).toEqual(["fee-1", "fee-2", "fee-3"]);
			expect(result.stops).toEqual([
				{ address: "Stop 1", duration: 10 },
				{ address: "Stop 2", duration: 15 },
			]);
			expect(result.stayDays).toEqual(["2024-01-15", "2024-01-16"]);
		});

		it("should handle non-array fields gracefully", () => {
			const mockLine: QuoteLine = {
				id: "non-array-test",
				type: "CALCULATED",
				label: "Non Array Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						selectedOptionalFeeIds: "not-an-array",
						stops: "also-not-array",
						stayDays: null,
					},
				},
				displayData: {
					label: "Non Array Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.selectedOptionalFeeIds).toEqual([]);
			expect(result.stops).toEqual([]);
			expect(result.stayDays).toEqual([]);
		});
	});

	describe("Error Handling", () => {
		it("should throw error for null input", () => {
			expect(() => lineToFormData(null as any)).toThrow("Failed to convert line to form data");
			expect(consoleErrorSpy).toHaveBeenCalledWith("Error in lineToFormData:", expect.any(Error));
		});

		it("should throw error for undefined input", () => {
			expect(() => lineToFormData(undefined as any)).toThrow("Failed to convert line to form data");
			expect(consoleErrorSpy).toHaveBeenCalledWith("Error in lineToFormData:", expect.any(Error));
		});

		it("should throw error for invalid object", () => {
			expect(() => lineToFormData("invalid" as any)).toThrow("Failed to convert line to form data");
			expect(consoleErrorSpy).toHaveBeenCalledWith("Error in lineToFormData:", expect.any(Error));
		});

		it("should handle missing sourceData gracefully", () => {
			const mockLine: QuoteLine = {
				id: "no-source-data",
				type: "CALCULATED",
				label: "Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				// sourceData is missing
				displayData: {
					label: "Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.tripType).toBe("TRANSFER");
			expect(result.pickupAddress).toBe("");
			expect(result.dropoffAddress).toBe("");
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero values correctly", () => {
			const mockLine: QuoteLine = {
				id: "zero-values",
				type: "CALCULATED",
				label: "Zero Values",
				description: "",
				quantity: 0,
				unitPrice: 0,
				totalPrice: 0,
				vatRate: 0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						passengerCount: 0,
						luggageCount: 0,
						finalPrice: 0,
						waitingTimeMinutes: 0,
					},
				},
				displayData: {
					label: "Zero Values",
					description: "",
					quantity: 0,
					unitPrice: 0,
					vatRate: 0,
					total: 0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.passengerCount).toBe(1); // Minimum passenger count
			expect(result.luggageCount).toBe(0);
			expect(result.finalPrice).toBe(0);
			expect(result.waitingTimeMinutes).toBe(0);
		});

		it("should handle boolean conversion", () => {
			const mockLine: QuoteLine = {
				id: "boolean-test",
				type: "CALCULATED",
				label: "Boolean Test",
				description: "",
				quantity: 1,
				unitPrice: 50.0,
				totalPrice: 50.0,
				vatRate: 20.0,
				sortOrder: 0,
				parentId: null,
				sourceData: {
					formData: {
						isRoundTrip: "true", // String that should become boolean
					},
				},
				displayData: {
					label: "Boolean Test",
					description: "",
					quantity: 1,
					unitPrice: 50.0,
					vatRate: 20.0,
					total: 50.0,
				},
			};

			const result = lineToFormData(mockLine);

			expect(result.isRoundTrip).toBe(true);
		});
	});
});
