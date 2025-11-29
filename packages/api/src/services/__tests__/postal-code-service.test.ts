/**
 * Postal Code Service Tests - Story 11.2
 */

import { describe, expect, it } from "vitest";
import {
	mergePostalCodeBoundaries,
	validatePostalCodeFormat,
	type PostalCodeBoundary,
} from "../postal-code-service";

describe("postal-code-service", () => {
	describe("validatePostalCodeFormat", () => {
		it("should validate correct French postal codes", () => {
			const validCodes = ["75001", "75016", "92100", "69001", "13001", "33000"];

			for (const code of validCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			}
		});

		it("should reject postal codes with wrong length", () => {
			const invalidCodes = ["7500", "750011", "1", "123456"];

			for (const code of invalidCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("French postal codes must be exactly 5 digits");
			}
		});

		it("should reject postal codes with non-numeric characters", () => {
			const invalidCodes = ["7500A", "ABCDE", "75-01", "75 001"];

			for (const code of invalidCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(false);
			}
		});

		it("should reject invalid department codes", () => {
			const invalidCodes = ["00001", "96001", "99001"];

			for (const code of invalidCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(false);
				expect(result.error).toBe("Invalid French department code");
			}
		});

		it("should accept Corsica postal codes (20xxx)", () => {
			const corsicaCodes = ["20000", "20100", "20200"];

			for (const code of corsicaCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(true);
			}
		});

		it("should accept overseas territories (97xxx)", () => {
			const overseasCodes = ["97100", "97200", "97300", "97400"];

			for (const code of overseasCodes) {
				const result = validatePostalCodeFormat(code);
				expect(result.isValid).toBe(true);
			}
		});

		it("should reject non-French country codes", () => {
			const result = validatePostalCodeFormat("75001", "DE");
			expect(result.isValid).toBe(false);
			expect(result.error).toBe("Only French postal codes are supported in this version");
		});
	});

	describe("mergePostalCodeBoundaries", () => {
		it("should return null for empty array", () => {
			const result = mergePostalCodeBoundaries([]);
			expect(result).toBeNull();
		});

		it("should return single boundary unchanged", () => {
			const boundary: PostalCodeBoundary = {
				postalCode: "75001",
				name: "Paris 1er",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.33, 48.86],
							[2.34, 48.86],
							[2.34, 48.87],
							[2.33, 48.87],
							[2.33, 48.86],
						],
					],
				},
				center: { latitude: 48.865, longitude: 2.335 },
				boundingBox: { minLat: 48.86, maxLat: 48.87, minLng: 2.33, maxLng: 2.34 },
			};

			const result = mergePostalCodeBoundaries([boundary]);

			expect(result).not.toBeNull();
			expect(result?.postalCodes).toEqual(["75001"]);
			expect(result?.geometry).toEqual(boundary.geometry);
		});

		it("should merge adjacent boundaries", () => {
			const boundary1: PostalCodeBoundary = {
				postalCode: "75001",
				name: "Paris 1er",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.33, 48.86],
							[2.34, 48.86],
							[2.34, 48.87],
							[2.33, 48.87],
							[2.33, 48.86],
						],
					],
				},
				center: { latitude: 48.865, longitude: 2.335 },
				boundingBox: { minLat: 48.86, maxLat: 48.87, minLng: 2.33, maxLng: 2.34 },
			};

			const boundary2: PostalCodeBoundary = {
				postalCode: "75002",
				name: "Paris 2e",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.34, 48.86],
							[2.35, 48.86],
							[2.35, 48.87],
							[2.34, 48.87],
							[2.34, 48.86],
						],
					],
				},
				center: { latitude: 48.865, longitude: 2.345 },
				boundingBox: { minLat: 48.86, maxLat: 48.87, minLng: 2.34, maxLng: 2.35 },
			};

			const result = mergePostalCodeBoundaries([boundary1, boundary2]);

			expect(result).not.toBeNull();
			expect(result?.postalCodes).toEqual(["75001", "75002"]);
			expect(result?.geometry.type).toBe("Polygon");
			expect(result?.totalArea).toBeGreaterThan(0);
		});

		it("should calculate center of merged boundaries", () => {
			const boundary1: PostalCodeBoundary = {
				postalCode: "75001",
				name: "Paris 1er",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.0, 48.0],
							[2.1, 48.0],
							[2.1, 48.1],
							[2.0, 48.1],
							[2.0, 48.0],
						],
					],
				},
				center: { latitude: 48.05, longitude: 2.05 },
				boundingBox: { minLat: 48.0, maxLat: 48.1, minLng: 2.0, maxLng: 2.1 },
			};

			const result = mergePostalCodeBoundaries([boundary1]);

			expect(result).not.toBeNull();
			expect(result?.center.latitude).toBeCloseTo(48.05, 1);
			expect(result?.center.longitude).toBeCloseTo(2.05, 1);
		});
	});
});
