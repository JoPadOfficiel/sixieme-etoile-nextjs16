/**
 * Geospatial Utilities Tests
 *
 * Story 27.8: Map Smart Assignment Suggestions
 *
 * Tests for Haversine distance calculation and driver suggestion algorithm.
 */

import { describe, it, expect } from "vitest";
import {
	haversineDistance,
	findNearestDrivers,
	getSuggestionForDriver,
	formatDistance,
	type SuggestedDriver,
} from "./geo";
import type { DriverPosition } from "../mocks/driverPositions";

describe("haversineDistance", () => {
	it("should return 0 for same coordinates", () => {
		const distance = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
		expect(distance).toBe(0);
	});

	it("should calculate distance between Paris and Lyon (~392 km)", () => {
		// Paris: 48.8566, 2.3522
		// Lyon: 45.7640, 4.8357
		const distance = haversineDistance(48.8566, 2.3522, 45.764, 4.8357);
		// Expected: ~392 km (allowing 5% margin for Haversine approximation)
		expect(distance).toBeGreaterThan(370);
		expect(distance).toBeLessThan(410);
	});

	it("should calculate distance between Paris Center and Eiffel Tower (~2.2 km)", () => {
		// Notre-Dame: 48.8530, 2.3499
		// Eiffel Tower: 48.8584, 2.2945
		const distance = haversineDistance(48.853, 2.3499, 48.8584, 2.2945);
		expect(distance).toBeGreaterThan(2);
		expect(distance).toBeLessThan(5);
	});

	it("should calculate short distance accurately (~500m)", () => {
		// Two points ~500m apart in Paris
		const distance = haversineDistance(48.8566, 2.3522, 48.8606, 2.3522);
		expect(distance).toBeGreaterThan(0.3);
		expect(distance).toBeLessThan(0.6);
	});

	it("should handle negative coordinates (Southern/Western hemispheres)", () => {
		// Sydney: -33.8688, 151.2093
		// Melbourne: -37.8136, 144.9631
		const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
		// Expected: ~714 km
		expect(distance).toBeGreaterThan(680);
		expect(distance).toBeLessThan(750);
	});
});

describe("findNearestDrivers", () => {
	const mockDrivers: DriverPosition[] = [
		{ id: "d1", name: "Pierre", status: "ACTIVE", lat: 48.8566, lng: 2.3522 }, // Paris Center
		{ id: "d2", name: "Sophie", status: "ACTIVE", lat: 48.8606, lng: 2.3376 }, // Louvre (~1km)
		{ id: "d3", name: "Ahmed", status: "INACTIVE", lat: 48.8448, lng: 2.3735 }, // Gare de Lyon
		{ id: "d4", name: "Marie", status: "ACTIVE", lat: 48.8738, lng: 2.295 }, // Arc de Triomphe (~3km)
		{ id: "d5", name: "Jean", status: "INACTIVE", lat: 48.8922, lng: 2.2378 }, // La Defense
		{ id: "d6", name: "Lucie", status: "ACTIVE", lat: 48.8352, lng: 2.3219 }, // Montparnasse (~2.5km)
	];

	it("should return top 3 nearest ACTIVE drivers", () => {
		// Pickup at Paris Center
		const suggestions = findNearestDrivers(48.8566, 2.3522, mockDrivers, 3);

		expect(suggestions).toHaveLength(3);
		expect(suggestions[0].driverId).toBe("d1"); // Pierre - closest (same location)
		expect(suggestions[0].rank).toBe(1);
		expect(suggestions[1].rank).toBe(2);
		expect(suggestions[2].rank).toBe(3);
	});

	it("should only include ACTIVE drivers", () => {
		const suggestions = findNearestDrivers(48.8566, 2.3522, mockDrivers, 10);

		// Only 4 active drivers in mock data
		expect(suggestions).toHaveLength(4);
		suggestions.forEach((s) => {
			expect(s.status).toBe("ACTIVE");
		});
	});

	it("should sort by distance ascending", () => {
		const suggestions = findNearestDrivers(48.8566, 2.3522, mockDrivers, 4);

		for (let i = 1; i < suggestions.length; i++) {
			expect(suggestions[i].distanceKm).toBeGreaterThanOrEqual(
				suggestions[i - 1].distanceKm
			);
		}
	});

	it("should return empty array if no active drivers", () => {
		const inactiveDrivers: DriverPosition[] = [
			{ id: "d1", name: "Test", status: "INACTIVE", lat: 48.8566, lng: 2.3522 },
		];

		const suggestions = findNearestDrivers(48.8566, 2.3522, inactiveDrivers, 3);
		expect(suggestions).toHaveLength(0);
	});

	it("should return fewer than N if not enough active drivers", () => {
		const fewDrivers: DriverPosition[] = [
			{ id: "d1", name: "Pierre", status: "ACTIVE", lat: 48.8566, lng: 2.3522 },
			{ id: "d2", name: "Sophie", status: "ACTIVE", lat: 48.8606, lng: 2.3376 },
		];

		const suggestions = findNearestDrivers(48.8566, 2.3522, fewDrivers, 5);
		expect(suggestions).toHaveLength(2);
	});

	it("should handle empty drivers array", () => {
		const suggestions = findNearestDrivers(48.8566, 2.3522, [], 3);
		expect(suggestions).toHaveLength(0);
	});

	it("should include correct distance values", () => {
		const suggestions = findNearestDrivers(48.8566, 2.3522, mockDrivers, 3);

		// First driver is at same location
		expect(suggestions[0].distanceKm).toBe(0);

		// Other drivers should have positive distance
		expect(suggestions[1].distanceKm).toBeGreaterThan(0);
		expect(suggestions[2].distanceKm).toBeGreaterThan(0);
	});

	it("should perform well with 50 drivers", () => {
		// Generate 50 mock drivers
		const manyDrivers: DriverPosition[] = Array.from({ length: 50 }, (_, i) => ({
			id: `d${i}`,
			name: `Driver ${i}`,
			status: i % 3 === 0 ? "INACTIVE" : "ACTIVE",
			lat: 48.8 + Math.random() * 0.2,
			lng: 2.2 + Math.random() * 0.3,
		}));

		const start = performance.now();
		const suggestions = findNearestDrivers(48.8566, 2.3522, manyDrivers, 3);
		const duration = performance.now() - start;

		expect(suggestions).toHaveLength(3);
		expect(duration).toBeLessThan(16); // Should complete in under 16ms (60fps)
	});
});

describe("getSuggestionForDriver", () => {
	const mockSuggestions: SuggestedDriver[] = [
		{
			driverId: "d1",
			driverName: "Pierre",
			distanceKm: 0,
			rank: 1,
			lat: 48.8566,
			lng: 2.3522,
			status: "ACTIVE",
		},
		{
			driverId: "d2",
			driverName: "Sophie",
			distanceKm: 1.2,
			rank: 2,
			lat: 48.8606,
			lng: 2.3376,
			status: "ACTIVE",
		},
		{
			driverId: "d4",
			driverName: "Marie",
			distanceKm: 3.1,
			rank: 3,
			lat: 48.8738,
			lng: 2.295,
			status: "ACTIVE",
		},
	];

	it("should return suggestion for driver in list", () => {
		const suggestion = getSuggestionForDriver("d2", mockSuggestions);
		expect(suggestion).not.toBeNull();
		expect(suggestion?.rank).toBe(2);
		expect(suggestion?.driverName).toBe("Sophie");
	});

	it("should return null for driver not in list", () => {
		const suggestion = getSuggestionForDriver("d99", mockSuggestions);
		expect(suggestion).toBeNull();
	});

	it("should return null for empty suggestions", () => {
		const suggestion = getSuggestionForDriver("d1", []);
		expect(suggestion).toBeNull();
	});
});

describe("formatDistance", () => {
	it("should format distance >= 1km with one decimal", () => {
		expect(formatDistance(2.345)).toBe("2.3 km");
		expect(formatDistance(10.0)).toBe("10.0 km");
		expect(formatDistance(1.0)).toBe("1.0 km");
	});

	it("should format distance < 1km in meters", () => {
		expect(formatDistance(0.5)).toBe("500 m");
		expect(formatDistance(0.123)).toBe("123 m");
		expect(formatDistance(0.05)).toBe("50 m");
	});

	it("should handle edge case at 1km boundary", () => {
		expect(formatDistance(0.999)).toBe("999 m");
		expect(formatDistance(1.001)).toBe("1.0 km");
	});
});
