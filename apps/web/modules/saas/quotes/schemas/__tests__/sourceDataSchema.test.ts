/**
 * Unit Tests - sourceDataSchema
 * Story 29.3: Ensure Lossless Quote Editing (Hydration)
 */

import { describe, expect, test } from 'vitest';
import { sourceDataSchema, parseSourceData, type SourceData } from '../sourceDataSchema';

describe('sourceDataSchema', () => {
	test('should validate valid sourceData', () => {
		const validData = {
			origin: 'CDG',
			destination: 'Paris',
			distance: 30.5,
			duration: 45,
			basePrice: 100,
			pickupAt: '2026-01-22T12:05:00Z',
			formData: { pickupAddress: 'CDG' },
			pricingResult: { price: 137.75 },
		};

		const result = sourceDataSchema.safeParse(validData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validData);
		}
	});

	test('should validate partial sourceData', () => {
		const partialData = {
			origin: 'CDG',
			destination: 'Paris',
		};

		const result = sourceDataSchema.safeParse(partialData);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(partialData);
		}
	});

	test('should validate empty sourceData', () => {
		const result = sourceDataSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({});
		}
	});

	test('should reject unknown fields with strict validation', () => {
		const dataWithUnknownFields = {
			origin: 'CDG',
			destination: 'Paris',
			unknownField: 'should be rejected',
			anotherUnknown: 123,
		};

		const result = sourceDataSchema.safeParse(dataWithUnknownFields);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues).toHaveLength(2);
			expect(result.error.issues[0].path).toContain('unknownField');
			expect(result.error.issues[1].path).toContain('anotherUnknown');
		}
	});

	test('should reject invalid data types', () => {
		const invalidData = {
			distance: 'not_a_number', // Should be number
			duration: null, // Should be number or undefined
		};

		const result = sourceDataSchema.safeParse(invalidData);
		expect(result.success).toBe(false);
	});

	test('should handle null and undefined input', () => {
		expect(sourceDataSchema.safeParse(null).success).toBe(false);
		expect(sourceDataSchema.safeParse(undefined).success).toBe(false);
	});
});

describe('parseSourceData', () => {
	test('should return valid data when parsing succeeds', () => {
		const validData = {
			origin: 'CDG',
			destination: 'Paris',
			distance: 30.5,
		};

		const result = parseSourceData(validData);
		expect(result).toEqual(validData);
	});

	test('should return empty object when parsing fails', () => {
		const invalidData = {
			origin: 'CDG',
			unknownField: 'rejected',
		};

		const result = parseSourceData(invalidData);
		expect(result).toEqual({});
	});

	test('should return empty object for null/undefined input', () => {
		expect(parseSourceData(null)).toEqual({});
		expect(parseSourceData(undefined)).toEqual({});
	});

	test('should return empty object for invalid types', () => {
		expect(parseSourceData('string')).toEqual({});
		expect(parseSourceData(123)).toEqual({});
		expect(parseSourceData([])).toEqual({});
	});

	test('should preserve type safety', () => {
		const result = parseSourceData({ origin: 'CDG' }) as SourceData;
		// TypeScript should infer this as SourceData
		expect(typeof result.origin).toBe('string');
	});

	test('should handle complex nested objects', () => {
		const complexData = {
			origin: 'CDG',
			formData: {
				pickupAddress: 'CDG',
				dropoffAddress: 'Paris',
				passengerCount: 4,
				luggageCount: 2,
				vehicleCategory: 'Van Premium',
			},
			pricingResult: {
				price: 137.75,
				internalCost: 78.98,
				marginPercent: 42.7,
				appliedRules: [],
			},
		};

		const result = parseSourceData(complexData);
		expect(result).toEqual(complexData);
	});

	test('should handle arrays in nested objects', () => {
		const dataWithArrays = {
			origin: 'CDG',
			formData: {
				selectedOptionalFeeIds: ['fee_1', 'fee_2'],
				stops: [
					{ id: 'stop_1', address: 'Orly', order: 1 },
					{ id: 'stop_2', address: 'Disney', order: 2 },
				],
			},
		};

		const result = parseSourceData(dataWithArrays);
		expect(result).toEqual(dataWithArrays);
		expect(Array.isArray(result.formData.selectedOptionalFeeIds)).toBe(true);
		expect(Array.isArray(result.formData.stops)).toBe(true);
	});
});
