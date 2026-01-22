import { db } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpawnService } from "../services/spawn-service";

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		mission: {
			create: vi.fn(),
		},
		vehicleCategory: {
			findFirst: vi.fn(),
		},
	},
}));

describe("SpawnService.createInternal", () => {
	const mockOrderId = "order-123";
	const mockOrganizationId = "org-123";
	const mockQuoteId = "quote-123";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create an internal mission successfully", async () => {
		// Given
		const params = {
			orderId: mockOrderId,
			organizationId: mockOrganizationId,
			label: "Vehicle Wash",
			startAt: new Date("2026-01-22T09:00:00Z"),
			notes: "Clean interior",
		};

		// Mock order with quotes
		vi.mocked(db.order.findFirst).mockResolvedValue({
			id: mockOrderId,
			organizationId: mockOrganizationId,
			quotes: [{ id: mockQuoteId }],
		} as any);

		// Mock created mission
		const mockCreatedMission = {
			id: "mission-123",
			isInternal: true,
			quoteLineId: null,
			sourceData: { isInternal: true },
			...params,
		};
		vi.mocked(db.mission.create).mockResolvedValue(mockCreatedMission as any);

		// When
		const result = await SpawnService.createInternal(params);

		// Then
		expect(db.order.findFirst).toHaveBeenCalledWith({
			where: { id: mockOrderId, organizationId: mockOrganizationId },
			include: { quotes: expect.anything() },
		});

		expect(db.mission.create).toHaveBeenCalledWith({
			data: {
				organizationId: mockOrganizationId,
				quoteId: mockQuoteId,
				quoteLineId: null,
				orderId: mockOrderId,
				status: "PENDING",
				startAt: params.startAt,
				endAt: null,
				isInternal: true,
				notes: params.notes,
				sourceData: expect.objectContaining({
					isInternal: true,
					label: params.label,
					createdBy: "internal-task",
				}),
			},
		});

		expect(result).toEqual(mockCreatedMission);
	});

	it("should support optional vehicle category", async () => {
		// Given
		const params = {
			orderId: mockOrderId,
			organizationId: mockOrganizationId,
			label: "Vehicle Wash",
			startAt: new Date("2026-01-22T09:00:00Z"),
			vehicleCategoryId: "cat-123",
		};

		vi.mocked(db.order.findFirst).mockResolvedValue({
			id: mockOrderId,
			quotes: [{ id: mockQuoteId }],
		} as any);

		vi.mocked(db.vehicleCategory.findFirst).mockResolvedValue({
			id: "cat-123",
			name: "Sedan",
		} as any);

		vi.mocked(db.mission.create).mockResolvedValue({
			id: "mission-123",
		} as any);

		// When
		await SpawnService.createInternal(params);

		// Then
		expect(db.vehicleCategory.findFirst).toHaveBeenCalledWith({
			where: { id: "cat-123", organizationId: mockOrganizationId },
			select: { name: true },
		});

		expect(db.mission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					sourceData: expect.objectContaining({
						vehicleCategoryId: "cat-123",
						vehicleCategoryName: "Sedan",
					}),
				}),
			}),
		);
	});

	it("should throw error if order not found", async () => {
		// Given
		const params = {
			orderId: "invalid-id",
			organizationId: mockOrganizationId,
			label: "Task",
			startAt: new Date(),
		};

		vi.mocked(db.order.findFirst).mockResolvedValue(null);

		// When/Then
		await expect(SpawnService.createInternal(params)).rejects.toThrow(
			/Order invalid-id not found/,
		);
	});

	it("should throw error if order has no quotes", async () => {
		// Given
		const params = {
			orderId: mockOrderId,
			organizationId: mockOrganizationId,
			label: "Task",
			startAt: new Date(),
		};

		vi.mocked(db.order.findFirst).mockResolvedValue({
			id: mockOrderId,
			quotes: [],
		} as any);

		// When/Then
		await expect(SpawnService.createInternal(params)).rejects.toThrow(
			/no quotes/,
		);
	});
});
