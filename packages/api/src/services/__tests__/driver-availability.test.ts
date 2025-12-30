/**
 * Driver Availability Service Tests
 * Story 17.7: Driver Availability Overlap Detection
 */

import { describe, it, expect } from "vitest";
import {
	timeRangesOverlap,
	getMissionWindow,
	DEFAULT_MISSION_DURATION_MINUTES,
} from "../driver-availability";

// ============================================================================
// timeRangesOverlap Tests
// ============================================================================

describe("timeRangesOverlap", () => {
	describe("Overlap Detection", () => {
		it("should detect overlap when existing event starts during proposed mission (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T11:00:00"),
				end: new Date("2025-01-15T13:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should detect overlap when existing event ends during proposed mission (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T09:00:00"),
				end: new Date("2025-01-15T11:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should detect overlap when existing event spans entire proposed mission (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T09:00:00"),
				end: new Date("2025-01-15T13:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should detect overlap when proposed mission spans entire existing event (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T09:00:00"),
				end: new Date("2025-01-15T13:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should detect overlap when events are exactly the same (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});
	});

	describe("No Overlap Detection", () => {
		it("should NOT detect overlap when events are adjacent (end = start) (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T12:00:00"),
				end: new Date("2025-01-15T14:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(false);
		});

		it("should NOT detect overlap when events are adjacent (start = end) (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T12:00:00"),
				end: new Date("2025-01-15T14:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(false);
		});

		it("should NOT detect overlap when events are completely separate (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T14:00:00"),
				end: new Date("2025-01-15T16:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(false);
		});

		it("should NOT detect overlap when events are on different days (AC4)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-16T10:00:00"),
				end: new Date("2025-01-16T12:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(false);
		});
	});

	describe("Edge Cases", () => {
		it("should handle multi-day events correctly", () => {
			const proposed = {
				start: new Date("2025-01-17T10:00:00"),
				end: new Date("2025-01-17T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T00:00:00"),
				end: new Date("2025-01-20T23:59:59"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should handle overnight missions correctly", () => {
			const proposed = {
				start: new Date("2025-01-15T22:00:00"),
				end: new Date("2025-01-16T02:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T23:00:00"),
				end: new Date("2025-01-16T01:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});

		it("should handle very short overlaps (1 minute)", () => {
			const proposed = {
				start: new Date("2025-01-15T10:00:00"),
				end: new Date("2025-01-15T12:00:00"),
			};
			const existing = {
				start: new Date("2025-01-15T11:59:00"),
				end: new Date("2025-01-15T14:00:00"),
			};

			expect(timeRangesOverlap(proposed, existing)).toBe(true);
		});
	});
});

// ============================================================================
// getMissionWindow Tests
// ============================================================================

describe("getMissionWindow", () => {
	it("should return mission window with provided estimatedEndAt (AC7)", () => {
		const pickupAt = new Date("2025-01-15T10:00:00");
		const estimatedEndAt = new Date("2025-01-15T12:30:00");

		const result = getMissionWindow(pickupAt, estimatedEndAt);

		expect(result.start).toEqual(pickupAt);
		expect(result.end).toEqual(estimatedEndAt);
	});

	it("should use default duration when estimatedEndAt is null (AC7)", () => {
		const pickupAt = new Date("2025-01-15T10:00:00");

		const result = getMissionWindow(pickupAt, null);

		expect(result.start).toEqual(pickupAt);
		// Default duration is 120 minutes (2 hours)
		const expectedEnd = new Date(pickupAt);
		expectedEnd.setMinutes(expectedEnd.getMinutes() + DEFAULT_MISSION_DURATION_MINUTES);
		expect(result.end).toEqual(expectedEnd);
	});

	it("should calculate correct end time with default duration", () => {
		const pickupAt = new Date("2025-01-15T10:00:00");

		const result = getMissionWindow(pickupAt, null);

		// 10:00 + 120 minutes = 12:00
		expect(result.end.getHours()).toBe(12);
		expect(result.end.getMinutes()).toBe(0);
	});

	it("should handle overnight default duration correctly", () => {
		const pickupAt = new Date("2025-01-15T23:00:00");

		const result = getMissionWindow(pickupAt, null);

		// 23:00 + 120 minutes = 01:00 next day
		expect(result.end.getDate()).toBe(16);
		expect(result.end.getHours()).toBe(1);
		expect(result.end.getMinutes()).toBe(0);
	});
});

// ============================================================================
// filterByDriverAvailability Tests (from vehicle-selection.ts)
// ============================================================================

import { filterByDriverAvailability, type VehicleCandidate } from "../vehicle-selection";

describe("filterByDriverAvailability", () => {
	const createVehicle = (overrides: Partial<VehicleCandidate> = {}): VehicleCandidate => ({
		vehicleId: "v1",
		vehicleName: "Test Vehicle",
		vehicleCategoryId: "cat-1",
		regulatoryCategory: "LIGHT",
		baseId: "base-1",
		baseName: "Test Base",
		baseLocation: { lat: 48.8566, lng: 2.3522 },
		passengerCapacity: 4,
		luggageCapacity: 3,
		consumptionLPer100Km: 8,
		costPerKm: 0.5,
		averageSpeedKmh: 50,
		status: "ACTIVE",
		driverId: null,
		driverName: null,
		...overrides,
	});

	it("should include vehicle without driver (AC3)", () => {
		const vehicles = [createVehicle({ vehicleId: "v1", driverId: null })];
		const availableDriverIds = ["driver-1"];

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		expect(result.available).toHaveLength(1);
		expect(result.unavailable).toHaveLength(0);
	});

	it("should include vehicle with available driver (AC3)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", driverId: "driver-1", driverName: "John Doe" }),
		];
		const availableDriverIds = ["driver-1"];

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		expect(result.available).toHaveLength(1);
		expect(result.available[0].vehicleId).toBe("v1");
		expect(result.unavailable).toHaveLength(0);
	});

	it("should exclude vehicle with unavailable driver (AC1, AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", driverId: "driver-1", driverName: "John Doe" }),
		];
		const availableDriverIds = ["driver-2"]; // driver-1 not in list

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		expect(result.available).toHaveLength(0);
		expect(result.unavailable).toHaveLength(1);
		expect(result.unavailable[0].vehicleId).toBe("v1");
	});

	it("should correctly separate available and unavailable vehicles", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", driverId: "driver-1" }),
			createVehicle({ vehicleId: "v2", driverId: "driver-2" }),
			createVehicle({ vehicleId: "v3", driverId: null }), // No driver
			createVehicle({ vehicleId: "v4", driverId: "driver-3" }),
		];
		const availableDriverIds = ["driver-1", "driver-3"];

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		expect(result.available).toHaveLength(3); // v1, v3, v4
		expect(result.unavailable).toHaveLength(1); // v2
		expect(result.available.map((v) => v.vehicleId)).toContain("v1");
		expect(result.available.map((v) => v.vehicleId)).toContain("v3");
		expect(result.available.map((v) => v.vehicleId)).toContain("v4");
		expect(result.unavailable[0].vehicleId).toBe("v2");
	});

	it("should handle empty vehicle list", () => {
		const vehicles: VehicleCandidate[] = [];
		const availableDriverIds = ["driver-1"];

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		expect(result.available).toHaveLength(0);
		expect(result.unavailable).toHaveLength(0);
	});

	it("should handle empty available drivers list", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", driverId: "driver-1" }),
			createVehicle({ vehicleId: "v2", driverId: null }),
		];
		const availableDriverIds: string[] = [];

		const result = filterByDriverAvailability(vehicles, availableDriverIds);

		// v1 has driver not in list -> unavailable
		// v2 has no driver -> available
		expect(result.available).toHaveLength(1);
		expect(result.available[0].vehicleId).toBe("v2");
		expect(result.unavailable).toHaveLength(1);
		expect(result.unavailable[0].vehicleId).toBe("v1");
	});
});
