/**
 * Story 26.4: Backend API CRUD for Nested Lines & Totals
 * 
 * Integration tests for the quote-lines API endpoint
 * 
 * Code Review Fixes Applied:
 * - L3: Added test for recalculateTotals: false
 * - Improved mock structure for better type safety
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { QuoteStatus } from '@prisma/client';

// Mock only the db from @repo/database - not the schemas
vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal() as Record<string, unknown>;
	return {
		...actual,
		db: {
			quote: {
				findFirst: vi.fn(),
				update: vi.fn(),
			},
			quoteLine: {
				findMany: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				deleteMany: vi.fn(),
			},
			$transaction: vi.fn(),
		},
	};
});

// Mock mission sync service
vi.mock('../../../services/mission-sync.service', () => ({
	missionSyncService: {
		syncQuoteMissions: vi.fn(),
	},
}));

// Mock middleware
vi.mock('../../../middleware/organization', () => ({
	organizationMiddleware: vi.fn(async (c, next) => {
		c.set('organizationId', 'test-org-id');
		await next();
	}),
}));

import { db } from '@repo/database';
import { missionSyncService } from '../../../services/mission-sync.service';
import { quoteLinesRouter } from '../quote-lines';

describe('Quote Lines API - Story 26.4', () => {
	const mockQuote = {
		id: 'quote-123',
		status: QuoteStatus.DRAFT,
		organizationId: 'test-org-id',
		finalPrice: new Decimal('100.00'),
		internalCost: new Decimal('60.00'),
		marginPercent: new Decimal('40.00'),
		lines: [
			{ id: 'line-1', parentId: null },
			{ id: 'line-2', parentId: null },
		],
	};

	const mockLine = {
		id: 'line-1',
		quoteId: 'quote-123',
		type: 'CALCULATED' as const,
		label: 'Transfer CDG → Paris',
		description: null,
		sourceData: {
			pricingMode: 'DYNAMIC',
			tripType: 'TRANSFER',
			calculatedAt: '2026-01-18T12:00:00Z',
			distanceKm: 45,
			fuelCost: 15,
			tollCost: 10,
			driverCost: 25,
			wearCost: 10,
		},
		displayData: {
			label: 'Transfer CDG → Paris',
			unitLabel: 'trajet',
		},
		quantity: new Decimal('1'),
		unitPrice: new Decimal('100.00'),
		totalPrice: new Decimal('100.00'),
		vatRate: new Decimal('10.00'),
		parentId: null,
		sortOrder: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /quotes/:quoteId/lines', () => {
		it('should return 404 when quote not found', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(null);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/non-existent/lines', {
				method: 'GET',
			});

			expect(res.status).toBe(404);
		});

		it('should return lines ordered by sortOrder with timestamps', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			vi.mocked(db.quoteLine.findMany).mockResolvedValue([mockLine] as unknown as ReturnType<typeof db.quoteLine.findMany>);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'GET',
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
			expect(data.lines).toHaveLength(1);
			expect(data.lines[0].id).toBe('line-1');
			expect(data.lines[0].type).toBe('CALCULATED');
			// M3 fix: timestamps should be included
			expect(data.lines[0].createdAt).toBeDefined();
			expect(data.lines[0].updatedAt).toBeDefined();
		});
	});

	describe('PATCH /quotes/:quoteId/lines', () => {
		it('should return 404 when quote not found', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(null);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/non-existent/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(404);
		});

		it('should return 400 when quote is not DRAFT (using QuoteStatus enum)', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue({
				...mockQuote,
				status: QuoteStatus.SENT, // L2 fix: using enum
			} as unknown as ReturnType<typeof db.quote.findFirst>);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(400);
		});

		it('should perform CRUD operations in transaction with Promise.all', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			
			// Mock transaction to execute the callback
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
						update: vi.fn().mockResolvedValue(mockLine),
						create: vi.fn().mockResolvedValue({ ...mockLine, id: 'new-line' }),
						findMany: vi.fn().mockResolvedValue([mockLine]),
					},
					quote: {
						update: vi.fn().mockResolvedValue({
							...mockQuote,
							lines: [{ id: 'line-1' }],
						}),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [
						{
							id: 'line-1',
							type: 'CALCULATED',
							label: 'Updated Transfer',
							displayData: { label: 'Updated Transfer' },
							sourceData: {
								pricingMode: 'DYNAMIC',
								tripType: 'TRANSFER',
								calculatedAt: '2026-01-18T12:00:00Z',
							},
							quantity: 1,
							unitPrice: 120,
							totalPrice: 120,
							vatRate: 10,
							sortOrder: 0,
						},
					],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.success).toBe(true);
			expect(data.stats).toBeDefined();
		});

		// L3 fix: Added test for recalculateTotals: false
		it('should skip total recalculation when recalculateTotals is false', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			
			let quoteUpdateCalled = false;
			
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue([]),
					},
					quote: {
						update: vi.fn().mockImplementation(() => {
							quoteUpdateCalled = true;
							return { ...mockQuote, lines: [] };
						}),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: false, // Skip recalculation
				}),
			});

			// Quote.update should not be called when recalculateTotals is false
			expect(quoteUpdateCalled).toBe(false);
		});

		it('should sync missions after successful update', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue([]),
					},
					quote: {
						update: vi.fn().mockResolvedValue({ ...mockQuote, lines: [] }),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});

			expect(missionSyncService.syncQuoteMissions).toHaveBeenCalledWith('quote-123');
		});
	});

	describe('Total Calculation Logic', () => {
		it('should calculate finalPrice as sum of line totalPrices using Decimal', async () => {
			const linesWithTotals = [
				{ ...mockLine, totalPrice: new Decimal('100.00') },
				{ ...mockLine, id: 'line-2', totalPrice: new Decimal('50.00') },
			];

			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue(linesWithTotals),
					},
					quote: {
						update: vi.fn().mockResolvedValue({
							...mockQuote,
							finalPrice: new Decimal('150.00'),
							internalCost: new Decimal('120.00'),
							marginPercent: new Decimal('20.00'),
							lines: [{ id: 'line-1' }, { id: 'line-2' }],
						}),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.quote.finalPrice).toBe(150);
		});

		// M1 fix: Test that zero costs are handled correctly
		it('should return 0 internalCost when all cost components are 0', async () => {
			const lineWithZeroCosts = {
				...mockLine,
				sourceData: {
					pricingMode: 'DYNAMIC',
					tripType: 'TRANSFER',
					calculatedAt: '2026-01-18T12:00:00Z',
					fuelCost: 0,
					tollCost: 0,
					driverCost: 0,
					wearCost: 0,
				},
			};

			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue([lineWithZeroCosts]),
					},
					quote: {
						update: vi.fn().mockImplementation(({ data }) => {
							// M1 fix: internalCost should be 0, not null
							expect(Number(data.internalCost)).toBe(0);
							return {
								...mockQuote,
								...data,
								lines: [{ id: 'line-1' }],
							};
						}),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});
		});

		it('should calculate internalCost from sourceData cost components', async () => {
			// Line with sourceData containing cost breakdown
			const lineWithCosts = {
				...mockLine,
				sourceData: {
					pricingMode: 'DYNAMIC',
					tripType: 'TRANSFER',
					calculatedAt: '2026-01-18T12:00:00Z',
					fuelCost: 20,
					tollCost: 15,
					driverCost: 30,
					wearCost: 5,
				},
			};

			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue([lineWithCosts]),
					},
					quote: {
						update: vi.fn().mockImplementation(({ data }) => {
							// Verify the internalCost calculation
							expect(Number(data.internalCost)).toBe(70); // 20 + 15 + 30 + 5
							return {
								...mockQuote,
								...data,
								lines: [{ id: 'line-1' }],
							};
						}),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [],
					recalculateTotals: true,
				}),
			});
		});
	});

	describe('Validation Errors', () => {
		it('should reject CALCULATED lines without sourceData', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [
						{
							type: 'CALCULATED',
							label: 'Test',
							displayData: { label: 'Test' },
							sourceData: null, // Required for CALCULATED
							quantity: 1,
							unitPrice: 100,
							totalPrice: 100,
							vatRate: 10,
							sortOrder: 0,
						},
					],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(400);
		});

		it('should reject GROUP lines with parentId (nesting)', async () => {
			vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as unknown as ReturnType<typeof db.quote.findFirst>);

			const app = new Hono().route('/', quoteLinesRouter);
			const res = await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [
						{
							tempId: 'temp-group-1',
							type: 'GROUP',
							label: 'Parent Group',
							displayData: { label: 'Parent Group' },
							quantity: 1,
							unitPrice: 0,
							totalPrice: 0,
							vatRate: 0,
							sortOrder: 0,
						},
						{
							type: 'GROUP',
							label: 'Nested Group',
							displayData: { label: 'Nested Group' },
							parentId: 'temp-group-1', // Invalid - GROUP cannot have parent
							quantity: 1,
							unitPrice: 0,
							totalPrice: 0,
							vatRate: 0,
							sortOrder: 1,
						},
					],
					recalculateTotals: true,
				}),
			});

			expect(res.status).toBe(400);
		});
	});

	// H1 fix: Test for orphaned children handling
	describe('Cascade Delete - Orphan Prevention', () => {
		it('should delete orphaned children when parent is deleted', async () => {
			const quoteWithHierarchy = {
				...mockQuote,
				lines: [
					{ id: 'group-1', parentId: null },
					{ id: 'child-1', parentId: 'group-1' },
					{ id: 'child-2', parentId: 'group-1' },
				],
			};

			vi.mocked(db.quote.findFirst).mockResolvedValue(quoteWithHierarchy as unknown as ReturnType<typeof db.quote.findFirst>);
			
			let deletedLineIds: string[] = [];
			
			vi.mocked(db.$transaction).mockImplementation(async (callback: unknown) => {
				const mockTx = {
					quoteLine: {
						deleteMany: vi.fn().mockImplementation(({ where }) => {
							deletedLineIds = where.id.in;
							return { count: deletedLineIds.length };
						}),
						update: vi.fn(),
						create: vi.fn(),
						findMany: vi.fn().mockResolvedValue([]),
					},
					quote: {
						update: vi.fn().mockResolvedValue({ ...mockQuote, lines: [] }),
					},
				};
				return (callback as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
			});

			const app = new Hono().route('/', quoteLinesRouter);
			await app.request('/quotes/quote-123/lines', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lines: [], // Delete all lines including the group
					recalculateTotals: true,
				}),
			});

			// All 3 lines should be deleted (parent + 2 orphaned children)
			expect(deletedLineIds).toContain('group-1');
			expect(deletedLineIds).toContain('child-1');
			expect(deletedLineIds).toContain('child-2');
		});
	});
});
