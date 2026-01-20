/**
 * Story 28.6: SpawnService dispatchable flag tests
 *
 * Tests that the SpawnService correctly filters lines based on the dispatchable flag.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database before importing SpawnService
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		mission: {
			findMany: vi.fn(),
			createMany: vi.fn(),
		},
		$transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => callback({
			mission: {
				createMany: vi.fn(),
			},
		})),
	},
}));

import { db } from "@repo/database";
import { SpawnService } from "../spawn-service";

describe("SpawnService - dispatchable flag (Story 28.6)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should only spawn missions for lines with dispatchable=true", async () => {
		const mockOrder = {
			id: "order-1",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-1",
					tripType: "TRANSFER",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					estimatedEndAt: new Date("2026-06-01T11:00:00Z"),
					pickupAddress: "Paris",
					pickupLatitude: 48.8566,
					pickupLongitude: 2.3522,
					dropoffAddress: "CDG",
					dropoffLatitude: 49.0097,
					dropoffLongitude: 2.5479,
					passengerCount: 2,
					luggageCount: 2,
					vehicleCategoryId: "cat-1",
					vehicleCategory: { name: "Berline" },
					pricingMode: "DISTANCE",
					isRoundTrip: false,
					lines: [
						{
							id: "line-dispatchable",
							type: "CALCULATED",
							label: "Transfer CDG",
							sourceData: {},
							dispatchable: true,
							parentId: null,
							children: [],
						},
						{
							id: "line-not-dispatchable",
							type: "CALCULATED",
							label: "Airport Fee",
							sourceData: {},
							dispatchable: false,
							parentId: null,
							children: [],
						},
					],
				},
			],
		};

		(db.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
		(db.mission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
		(db.mission.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

		// The query in SpawnService filters by dispatchable: true at the database level
		// So only line-dispatchable should be in the result
		// This test validates the query structure includes the filter

		await SpawnService.execute("order-1", "org-1");

		// Verify findFirst was called with dispatchable filter
		expect(db.order.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				include: expect.objectContaining({
					quotes: expect.objectContaining({
						include: expect.objectContaining({
							lines: expect.objectContaining({
								where: expect.objectContaining({
									dispatchable: true,
								}),
							}),
						}),
					}),
				}),
			})
		);
	});

	it("should skip GROUP children with dispatchable=false", async () => {
		const mockOrder = {
			id: "order-2",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-2",
					tripType: "TRANSFER",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					estimatedEndAt: new Date("2026-06-01T11:00:00Z"),
					pickupAddress: "Paris",
					pickupLatitude: 48.8566,
					pickupLongitude: 2.3522,
					dropoffAddress: "CDG",
					dropoffLatitude: 49.0097,
					dropoffLongitude: 2.5479,
					passengerCount: 2,
					luggageCount: 2,
					vehicleCategoryId: "cat-1",
					vehicleCategory: { name: "Berline" },
					pricingMode: "DISTANCE",
					isRoundTrip: false,
					lines: [
						{
							id: "group-line",
							type: "GROUP",
							label: "Wedding Package",
							sourceData: {},
							dispatchable: true,
							parentId: null,
							children: [
								{
									id: "child-dispatchable",
									type: "CALCULATED",
									label: "Transfer 1",
									sourceData: {},
									dispatchable: true,
								},
								{
									id: "child-not-dispatchable",
									type: "CALCULATED",
									label: "Decoration Fee",
									sourceData: {},
									dispatchable: false,
								},
							],
						},
					],
				},
			],
		};

		(db.order.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockOrder);
		(db.mission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

		const createdMissions: unknown[] = [];
		(db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback: (tx: { mission: { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> } }) => Promise<unknown>) => {
			return callback({
				mission: {
					createMany: async (args: { data: unknown[] }) => {
						createdMissions.push(...args.data);
						return { count: args.data.length };
					},
				},
			});
		});

		(db.mission.findMany as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce([]) // First call for existing missions
			.mockResolvedValueOnce(createdMissions); // Second call for returning created missions

		await SpawnService.execute("order-2", "org-1");

		// Only child-dispatchable should have a mission created
		// child-not-dispatchable should be skipped due to dispatchable=false
		expect(createdMissions.length).toBe(1);
		expect(createdMissions[0]).toEqual(
			expect.objectContaining({
				quoteLineId: "child-dispatchable",
			})
		);
	});
});
