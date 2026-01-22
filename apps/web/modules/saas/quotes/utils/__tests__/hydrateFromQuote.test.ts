/**
 * Unit Tests - hydrateFromQuote
 * Story 29.3: Ensure Lossless Quote Editing (Hydration)
 */

import { describe, expect, test } from 'vitest';
import { hydrateFromQuote, validateHydratedLines } from '../hydrateFromQuote';
import type { DatabaseQuoteLine } from '../hydrateFromQuote';

describe('hydrateFromQuote', () => {
	test('should handle empty array', () => {
		const result = hydrateFromQuote([]);
		expect(result).toEqual([]);
	});

	test('should handle null/undefined input', () => {
		expect(hydrateFromQuote(null as unknown as DatabaseQuoteLine[])).toEqual([]);
		expect(hydrateFromQuote(undefined as unknown as DatabaseQuoteLine[])).toEqual([]);
	});

	test('should hydrate basic calculated line', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_1',
				type: 'CALCULATED',
				label: 'Transfer CDG → Paris',
				description: 'Airport transfer',
				quantity: '1',
				unitPrice: '137.75',
				totalPrice: '137.75',
				vatRate: '10',
				parentId: null,
				sortOrder: 0,
				displayData: { route: 'CDG → Paris' },
				sourceData: {
					origin: 'CDG',
					destination: 'Paris',
					distance: 30.5,
					duration: 45,
				},
				dispatchable: true,
			},
		];

		const result = hydrateFromQuote(dbLines);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 'line_1',
			type: 'CALCULATED',
			label: 'Transfer CDG → Paris',
			description: 'Airport transfer',
			quantity: 1,
			unitPrice: 137.75,
			totalPrice: 137.75,
			vatRate: 10,
			parentId: null,
			sortOrder: 0,
			dispatchable: true,
		});
		expect(result[0].sourceData).toEqual({
			origin: 'CDG',
			destination: 'Paris',
			distance: 30.5,
			duration: 45,
		});
	});

	test('should handle manual line', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_2',
				type: 'MANUAL',
				label: 'Additional Service',
				description: null,
				quantity: '2',
				unitPrice: '25.00',
				totalPrice: '50.00',
				vatRate: '20',
				parentId: null,
				sortOrder: 1,
				displayData: null,
				sourceData: {},
				dispatchable: false,
			},
		];

		const result = hydrateFromQuote(dbLines);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 'line_2',
			type: 'MANUAL',
			label: 'Additional Service',
			description: undefined,
			quantity: 2,
			unitPrice: 25.00,
			totalPrice: 50.00,
			vatRate: 20,
			dispatchable: false,
		});
	});

	test('should use default values for missing fields', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_3',
				type: 'CALCULATED',
				label: 'Basic Line',
				description: null,
				quantity: null, // Missing quantity
				unitPrice: '100.00',
				totalPrice: '100.00',
				vatRate: null, // Missing VAT rate
				parentId: null,
				sortOrder: null, // Missing sort order
				displayData: null,
				sourceData: null,
				dispatchable: null,
			},
		];

		const result = hydrateFromQuote(dbLines);

		expect(result[0]).toMatchObject({
			quantity: 1, // Default quantity
			vatRate: 10, // Default VAT rate
			sortOrder: 0, // Default sort order (index)
			dispatchable: true, // Default dispatchable
		});
	});

	test('should throw error for invalid unitPrice', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_invalid',
				type: 'CALCULATED',
				label: 'Invalid Line',
				description: null,
				quantity: '1',
				unitPrice: 'invalid_price', // Invalid price
				totalPrice: '100.00',
				vatRate: '10',
				parentId: null,
				sortOrder: 0,
				displayData: null,
				sourceData: null,
				dispatchable: true,
			},
		];

		expect(() => hydrateFromQuote(dbLines)).toThrow(
			'Invalid unitPrice for line line_invalid: invalid_price'
		);
	});

	test('should throw error for invalid totalPrice', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_invalid',
				type: 'CALCULATED',
				label: 'Invalid Line',
				description: null,
				quantity: '1',
				unitPrice: '100.00',
				totalPrice: 'not_a_number', // Invalid total
				vatRate: '10',
				parentId: null,
				sortOrder: 0,
				displayData: null,
				sourceData: null,
				dispatchable: true,
			},
		];

		expect(() => hydrateFromQuote(dbLines)).toThrow(
			'Invalid totalPrice for line line_invalid: not_a_number'
		);
	});

	test('should throw error for invalid vatRate', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'line_invalid',
				type: 'CALCULATED',
				label: 'Invalid Line',
				description: null,
				quantity: '1',
				unitPrice: '100.00',
				totalPrice: '100.00',
				vatRate: 'invalid_vat', // Invalid VAT
				parentId: null,
				sortOrder: 0,
				displayData: null,
				sourceData: null,
				dispatchable: true,
			},
		];

		expect(() => hydrateFromQuote(dbLines)).toThrow(
			'Invalid vatRate for line line_invalid: invalid_vat'
		);
	});

	test('should handle multiple lines with parent-child relationships', () => {
		const dbLines: DatabaseQuoteLine[] = [
			{
				id: 'parent_line',
				type: 'GROUP',
				label: 'Group Service',
				description: 'Parent group',
				quantity: '1',
				unitPrice: '0.00',
				totalPrice: '200.00',
				vatRate: '10',
				parentId: null,
				sortOrder: 0,
				displayData: null,
				sourceData: null,
				dispatchable: false,
			},
			{
				id: 'child_line',
				type: 'CALCULATED',
				label: 'Child Service',
				description: 'Child of group',
				quantity: '1',
				unitPrice: '100.00',
				totalPrice: '100.00',
				vatRate: '10',
				parentId: 'parent_line',
				sortOrder: 1,
				displayData: null,
				sourceData: null,
				dispatchable: true,
			},
		];

		const result = hydrateFromQuote(dbLines);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			id: 'parent_line',
			type: 'GROUP',
			parentId: null,
			sortOrder: 0,
		});
		expect(result[1]).toMatchObject({
			id: 'child_line',
			type: 'CALCULATED',
			parentId: 'parent_line',
			sortOrder: 1,
		});
	});
});

describe('validateHydratedLines', () => {
	test('should validate empty array', () => {
		expect(validateHydratedLines([])).toBe(true);
		expect(validateHydratedLines(null as any)).toBe(true);
	});

	test('should validate valid lines', () => {
		const validLines = [
			{
				id: 'line_1',
				type: 'CALCULATED' as const,
				label: 'Valid Line',
				quantity: 1,
				unitPrice: 100,
				totalPrice: 100,
				vatRate: 10,
				parentId: null,
				sortOrder: 0,
				displayData: {},
				sourceData: {},
				dispatchable: true,
			},
		];

		expect(validateHydratedLines(validLines)).toBe(true);
	});

	test('should reject invalid lines - missing id', () => {
		const invalidLines = [
			{
				// id missing
				type: 'CALCULATED' as const,
				label: 'Invalid Line',
				quantity: 1,
				unitPrice: 100,
				totalPrice: 100,
				vatRate: 10,
				parentId: null,
				sortOrder: 0,
				displayData: {},
				sourceData: {},
				dispatchable: true,
			},
		] as any;

		expect(validateHydratedLines(invalidLines)).toBe(false);
	});

	test('should reject invalid lines - missing type', () => {
		const invalidLines = [
			{
				id: 'line_1',
				// type missing
				label: 'Invalid Line',
				quantity: 1,
				unitPrice: 100,
				totalPrice: 100,
				vatRate: 10,
				parentId: null,
				sortOrder: 0,
				displayData: {},
				sourceData: {},
				dispatchable: true,
			},
		] as any;

		expect(validateHydratedLines(invalidLines)).toBe(false);
	});

	test('should reject invalid lines - non-numeric prices', () => {
		const invalidLines = [
			{
				id: 'line_1',
				type: 'CALCULATED' as const,
				label: 'Invalid Line',
				quantity: 1,
				unitPrice: 'not_a_number' as any, // Invalid type
				totalPrice: 100,
				vatRate: 10,
				parentId: null,
				sortOrder: 0,
				displayData: {},
				sourceData: {},
				dispatchable: true,
			},
		] as any;

		expect(validateHydratedLines(invalidLines)).toBe(false);
	});
});
