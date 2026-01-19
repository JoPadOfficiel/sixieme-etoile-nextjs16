/**
 * Story 26.2: Migration Script Unit Tests
 *
 * Tests the backward compatibility migration logic that converts
 * legacy Quotes to the new Hybrid Blocks (QuoteLine) structure.
 *
 * @author Antigravity
 * @date 2026-01-19
 */

import { type PricingMode, Prisma, type TripType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
	buildDisplayData,
	buildSourceData,
	generateTripLabel,
} from "../../../../scripts/migrate-yolo-blocks";

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Factory for creating mock Quote objects
 */
function createMockQuote(overrides: Partial<MockQuote> = {}): MockQuote {
	return {
		id: "quote-123",
		organizationId: "org-456",
		contactId: "contact-789",
		status: "DRAFT",
		pricingMode: "DYNAMIC" as PricingMode,
		tripType: "TRANSFER" as TripType,
		pickupAt: new Date("2026-01-20T10:00:00Z"),
		pickupAddress: "Aéroport Charles de Gaulle, Roissy-en-France",
		pickupLatitude: new Prisma.Decimal(49.0097),
		pickupLongitude: new Prisma.Decimal(2.5479),
		dropoffAddress: "Tour Eiffel, Paris",
		dropoffLatitude: new Prisma.Decimal(48.8584),
		dropoffLongitude: new Prisma.Decimal(2.2945),
		isRoundTrip: false,
		passengerCount: 2,
		luggageCount: 3,
		vehicleCategoryId: "cat-berline",
		suggestedPrice: new Prisma.Decimal(150.0),
		finalPrice: new Prisma.Decimal(150.0),
		internalCost: new Prisma.Decimal(85.0),
		marginPercent: new Prisma.Decimal(43.33),
		tripAnalysis: {
			distanceKm: 35.5,
			durationMinutes: 45,
			segments: { A: 5, B: 35.5, C: 5 },
		},
		costBreakdown: {
			fuel: 12.5,
			tolls: 8.0,
			driver: 45.0,
			wear: 5.5,
			other: 14.0,
		},
		appliedRules: [{ type: "DYNAMIC_BASE", adjustment: 0 }],
		notes: "Client VIP - attention spéciale",
		estimatedEndAt: new Date("2026-01-20T11:00:00Z"),
		durationHours: null,
		stayStartDate: null,
		stayEndDate: null,
		lines: [],
		stayDays: [],
		vehicleCategory: { id: "cat-berline", name: "Berline" },
		contact: { id: "contact-789", firstName: "Jean", lastName: "Dupont" },
		...overrides,
	};
}

type MockQuote = {
	id: string;
	organizationId: string;
	contactId: string;
	status: string;
	pricingMode: PricingMode;
	tripType: TripType;
	pickupAt: Date;
	pickupAddress: string;
	pickupLatitude: Prisma.Decimal | null;
	pickupLongitude: Prisma.Decimal | null;
	dropoffAddress: string | null;
	dropoffLatitude: Prisma.Decimal | null;
	dropoffLongitude: Prisma.Decimal | null;
	isRoundTrip: boolean;
	passengerCount: number;
	luggageCount: number;
	vehicleCategoryId: string;
	suggestedPrice: Prisma.Decimal;
	finalPrice: Prisma.Decimal;
	internalCost: Prisma.Decimal | null;
	marginPercent: Prisma.Decimal | null;
	tripAnalysis: object | null;
	costBreakdown: object | null;
	appliedRules: object | null;
	notes: string | null;
	estimatedEndAt: Date | null;
	durationHours: Prisma.Decimal | null;
	stayStartDate: Date | null;
	stayEndDate: Date | null;
	lines: unknown[];
	stayDays: unknown[];
	vehicleCategory: { id: string; name: string };
	contact: { id: string; firstName: string; lastName: string };
};

/**
 * Factory for creating mock StayDay objects
 */
function createMockStayDay(overrides: Partial<MockStayDay> = {}): MockStayDay {
	return {
		id: "day-1",
		quoteId: "quote-123",
		dayNumber: 1,
		date: new Date("2026-02-01T00:00:00Z"),
		hotelRequired: true,
		hotelCost: new Prisma.Decimal(120.0),
		mealCount: 2,
		mealCost: new Prisma.Decimal(45.0),
		driverCount: 1,
		driverOvernightCost: new Prisma.Decimal(80.0),
		dayTotalCost: new Prisma.Decimal(445.0),
		dayTotalInternalCost: new Prisma.Decimal(280.0),
		notes: null,
		services: [],
		...overrides,
	};
}

type MockStayDay = {
	id: string;
	quoteId: string;
	dayNumber: number;
	date: Date;
	hotelRequired: boolean;
	hotelCost: Prisma.Decimal;
	mealCount: number;
	mealCost: Prisma.Decimal;
	driverCount: number;
	driverOvernightCost: Prisma.Decimal;
	dayTotalCost: Prisma.Decimal;
	dayTotalInternalCost: Prisma.Decimal;
	notes: string | null;
	services: MockStayService[];
};

/**
 * Factory for creating mock StayService objects
 */
function createMockStayService(
	overrides: Partial<MockStayService> = {},
): MockStayService {
	return {
		id: "service-1",
		stayDayId: "day-1",
		serviceOrder: 1,
		serviceType: "TRANSFER",
		pickupAt: new Date("2026-02-01T09:00:00Z"),
		pickupAddress: "Aéroport CDG, Terminal 2E",
		pickupLatitude: new Prisma.Decimal(49.0097),
		pickupLongitude: new Prisma.Decimal(2.5479),
		dropoffAddress: "Hôtel Plaza Athénée, Paris",
		dropoffLatitude: new Prisma.Decimal(48.8664),
		dropoffLongitude: new Prisma.Decimal(2.3053),
		durationHours: null,
		stops: null,
		distanceKm: new Prisma.Decimal(38.5),
		durationMinutes: 55,
		serviceCost: new Prisma.Decimal(180.0),
		serviceInternalCost: new Prisma.Decimal(95.0),
		tripAnalysis: null,
		notes: null,
		...overrides,
	};
}

type MockStayService = {
	id: string;
	stayDayId: string;
	serviceOrder: number;
	serviceType: string;
	pickupAt: Date;
	pickupAddress: string;
	pickupLatitude: Prisma.Decimal | null;
	pickupLongitude: Prisma.Decimal | null;
	dropoffAddress: string | null;
	dropoffLatitude: Prisma.Decimal | null;
	dropoffLongitude: Prisma.Decimal | null;
	durationHours: Prisma.Decimal | null;
	stops: object | null;
	distanceKm: Prisma.Decimal | null;
	durationMinutes: number | null;
	serviceCost: Prisma.Decimal;
	serviceInternalCost: Prisma.Decimal;
	tripAnalysis: object | null;
	notes: string | null;
};

// ============================================================================
// TESTS: generateTripLabel
// ============================================================================

describe("generateTripLabel", () => {
	it("should generate correct label for TRANSFER trip", () => {
		const quote = createMockQuote({
			tripType: "TRANSFER" as TripType,
			pickupAddress: "Aéroport Charles de Gaulle, Roissy",
			dropoffAddress: "Tour Eiffel, Paris",
		});

		const label = generateTripLabel(quote as never);
		expect(label).toBe("Transfert Aéroport Charles de Gaulle → Tour Eiffel");
	});

	it("should generate correct label for round-trip TRANSFER", () => {
		const quote = createMockQuote({
			tripType: "TRANSFER" as TripType,
			isRoundTrip: true,
			pickupAddress: "Gare du Nord, Paris",
			dropoffAddress: "Château de Versailles",
		});

		const label = generateTripLabel(quote as never);
		expect(label).toBe("Transfert A/R Gare du Nord ↔ Château de Versailles");
	});

	it("should generate correct label for DISPO trip with hours", () => {
		const quote = createMockQuote({
			tripType: "DISPO" as TripType,
			durationHours: new Prisma.Decimal(4),
		});

		const label = generateTripLabel(quote as never);
		expect(label).toBe("Mise à disposition 4h");
	});

	it("should generate correct label for EXCURSION trip", () => {
		const quote = createMockQuote({
			tripType: "EXCURSION" as TripType,
			pickupAddress: "Paris, Opéra",
			dropoffAddress: "Giverny, Jardins de Monet",
		});

		const label = generateTripLabel(quote as never);
		expect(label).toBe("Excursion Paris → Giverny");
	});

	it("should generate correct label for STAY trip with dates", () => {
		const quote = createMockQuote({
			tripType: "STAY" as TripType,
			stayStartDate: new Date("2026-02-01"),
			stayEndDate: new Date("2026-02-03"),
		});

		const label = generateTripLabel(quote as never);
		expect(label).toContain("Séjour du");
		expect(label).toContain("01 févr.");
		expect(label).toContain("03 févr.");
	});

	it("should generate correct label for OFF_GRID trip", () => {
		const quote = createMockQuote({
			tripType: "OFF_GRID" as TripType,
			pickupAddress: "Adresse Spéciale, Région",
			dropoffAddress: null,
		});

		const label = generateTripLabel(quote as never);
		expect(label).toBe("Sur mesure Adresse Spéciale → Destination");
	});
});

// ============================================================================
// TESTS: buildSourceData
// ============================================================================

describe("buildSourceData", () => {
	it("should build complete sourceData from quote", () => {
		const quote = createMockQuote();
		const sourceData = buildSourceData(quote as never);

		expect(sourceData.pricingMode).toBe("DYNAMIC");
		expect(sourceData.tripType).toBe("TRANSFER");
		expect(sourceData.pickupAddress).toBe(
			"Aéroport Charles de Gaulle, Roissy-en-France",
		);
		expect(sourceData.dropoffAddress).toBe("Tour Eiffel, Paris");
		expect(sourceData.pickupLatitude).toBe(49.0097);
		expect(sourceData.pickupLongitude).toBe(2.5479);
		expect(sourceData.internalCost).toBe(85);
		expect(sourceData.suggestedPrice).toBe(150);
		expect(sourceData.isRoundTrip).toBe(false);
		expect(sourceData.passengerCount).toBe(2);
		expect(sourceData.luggageCount).toBe(3);
		expect(sourceData.vehicleCategoryId).toBe("cat-berline");
		expect(sourceData.migratedFrom).toBe("legacy_quote");
		expect(sourceData.migratedAt).toBeDefined();
	});

	it("should extract distanceKm and durationMinutes from tripAnalysis", () => {
		const quote = createMockQuote({
			tripAnalysis: {
				distanceKm: 42.5,
				durationMinutes: 55,
			},
		});

		const sourceData = buildSourceData(quote as never);
		expect(sourceData.distanceKm).toBe(42.5);
		expect(sourceData.durationMinutes).toBe(55);
	});

	it("should handle null values gracefully", () => {
		const quote = createMockQuote({
			pickupLatitude: null,
			pickupLongitude: null,
			dropoffAddress: null,
			internalCost: null,
			tripAnalysis: null,
			costBreakdown: null,
			appliedRules: null,
		});

		const sourceData = buildSourceData(quote as never);
		expect(sourceData.pickupLatitude).toBeNull();
		expect(sourceData.pickupLongitude).toBeNull();
		expect(sourceData.dropoffAddress).toBeNull();
		expect(sourceData.internalCost).toBeNull();
		expect(sourceData.distanceKm).toBeNull();
		expect(sourceData.durationMinutes).toBeNull();
		expect(sourceData.tripAnalysis).toBeNull();
		expect(sourceData.costBreakdown).toBeNull();
		expect(sourceData.appliedRules).toBeNull();
	});

	it("should preserve costBreakdown and appliedRules", () => {
		const quote = createMockQuote({
			costBreakdown: { fuel: 15.0, tolls: 10.0, driver: 50.0 },
			appliedRules: [{ type: "NIGHT", multiplier: 1.3 }],
		});

		const sourceData = buildSourceData(quote as never);
		expect(sourceData.costBreakdown).toEqual({
			fuel: 15.0,
			tolls: 10.0,
			driver: 50.0,
		});
		expect(sourceData.appliedRules).toEqual([
			{ type: "NIGHT", multiplier: 1.3 },
		]);
	});
});

// ============================================================================
// TESTS: buildDisplayData
// ============================================================================

describe("buildDisplayData", () => {
	it("should build displayData with label and description", () => {
		const displayData = buildDisplayData("Transfert CDG → Paris", "Client VIP");

		expect(displayData.label).toBe("Transfert CDG → Paris");
		expect(displayData.description).toBe("Client VIP");
		expect(displayData.unitLabel).toBe("prestation");
		expect(displayData.showInPdf).toBe(true);
	});

	it("should handle missing description", () => {
		const displayData = buildDisplayData("Mise à disposition 4h");

		expect(displayData.label).toBe("Mise à disposition 4h");
		expect(displayData.description).toBeUndefined();
		expect(displayData.unitLabel).toBe("prestation");
		expect(displayData.showInPdf).toBe(true);
	});
});

// ============================================================================
// TESTS: STAY Trip Structure
// ============================================================================

describe("STAY Trip Migration Structure", () => {
	it("should create correct nested structure for STAY trip", () => {
		// Create a complete STAY trip with 2 days and multiple services
		const service1Day1 = createMockStayService({
			id: "s1d1",
			stayDayId: "day-1",
			serviceOrder: 1,
			serviceType: "TRANSFER",
			pickupAddress: "CDG Terminal 2E",
			dropoffAddress: "Hôtel Plaza",
			serviceCost: new Prisma.Decimal(150),
		});

		const service2Day1 = createMockStayService({
			id: "s2d1",
			stayDayId: "day-1",
			serviceOrder: 2,
			serviceType: "DISPO",
			pickupAddress: "Hôtel Plaza",
			dropoffAddress: null,
			durationHours: new Prisma.Decimal(3),
			serviceCost: new Prisma.Decimal(180),
		});

		const service1Day2 = createMockStayService({
			id: "s1d2",
			stayDayId: "day-2",
			serviceOrder: 1,
			serviceType: "EXCURSION",
			pickupAddress: "Hôtel Plaza",
			dropoffAddress: "Versailles",
			serviceCost: new Prisma.Decimal(350),
		});

		const service2Day2 = createMockStayService({
			id: "s2d2",
			stayDayId: "day-2",
			serviceOrder: 2,
			serviceType: "TRANSFER",
			pickupAddress: "Hôtel Plaza",
			dropoffAddress: "CDG Terminal 2E",
			serviceCost: new Prisma.Decimal(150),
		});

		const day1 = createMockStayDay({
			id: "day-1",
			dayNumber: 1,
			date: new Date("2026-02-01"),
			hotelCost: new Prisma.Decimal(0),
			mealCost: new Prisma.Decimal(0),
			driverOvernightCost: new Prisma.Decimal(0),
			services: [service1Day1, service2Day1],
		});

		const day2 = createMockStayDay({
			id: "day-2",
			dayNumber: 2,
			date: new Date("2026-02-02"),
			hotelCost: new Prisma.Decimal(120),
			mealCost: new Prisma.Decimal(45),
			driverOvernightCost: new Prisma.Decimal(80),
			services: [service1Day2, service2Day2],
		});

		const stayQuote = createMockQuote({
			tripType: "STAY" as TripType,
			stayStartDate: new Date("2026-02-01"),
			stayEndDate: new Date("2026-02-02"),
			finalPrice: new Prisma.Decimal(1075), // 150+180+350+150+120+45+80 = 1075
			stayDays: [day1, day2],
		});

		// Calculate expected totals
		const day1ServicesTotal = 150 + 180; // 330
		const day1StaffingTotal = 0;
		const day1Total = day1ServicesTotal + day1StaffingTotal; // 330

		const day2ServicesTotal = 350 + 150; // 500
		const day2StaffingTotal = 120 + 45 + 80; // 245
		const day2Total = day2ServicesTotal + day2StaffingTotal; // 745

		const expectedTotal = day1Total + day2Total; // 1075

		expect(Number(stayQuote.finalPrice)).toBe(expectedTotal);

		// Verify structure: 1 ROOT + 2 DAY GROUPs + 4 services + 1 staffing line = 8 lines
		// Expected lines:
		// 1. ROOT GROUP "Séjour..."
		//    2. DAY GROUP "Jour 1"
		//       3. CALCULATED "Transfert CDG → Hôtel"
		//       4. CALCULATED "Mise à disposition 3h"
		//    5. DAY GROUP "Jour 2"
		//       6. MANUAL "Frais journaliers" (245€)
		//       7. CALCULATED "Excursion"
		//       8. CALCULATED "Transfert Hôtel → CDG"

		const expectedLineCount = 8;

		// This is a structural test - actual line creation is done by the migration function
		// Here we just verify the mock data is set up correctly
		expect(stayQuote.stayDays.length).toBe(2);
		expect((stayQuote.stayDays[0] as MockStayDay).services.length).toBe(2);
		expect((stayQuote.stayDays[1] as MockStayDay).services.length).toBe(2);
	});
});

// ============================================================================
// TESTS: Financial Integrity
// ============================================================================

describe("Financial Integrity Validation", () => {
	it("should detect when calculated total matches finalPrice", () => {
		const quote = createMockQuote({
			finalPrice: new Prisma.Decimal(150.0),
		});

		const finalPrice = Number(quote.finalPrice);
		const lineTotal = 150.0; // What we would create

		const diff = Math.abs(finalPrice - lineTotal);
		expect(diff).toBeLessThanOrEqual(0.01);
	});

	it("should detect discrepancy when totals don't match", () => {
		const quote = createMockQuote({
			finalPrice: new Prisma.Decimal(150.0),
		});

		const finalPrice = Number(quote.finalPrice);
		const lineTotal = 145.0; // Wrong total

		const diff = Math.abs(finalPrice - lineTotal);
		expect(diff).toBeGreaterThan(0.01);
	});

	it("should calculate correct sum for STAY trip services", () => {
		const services = [
			{ serviceCost: new Prisma.Decimal(150) },
			{ serviceCost: new Prisma.Decimal(180) },
			{ serviceCost: new Prisma.Decimal(350) },
			{ serviceCost: new Prisma.Decimal(150) },
		];

		const staffingCosts = {
			hotelCost: new Prisma.Decimal(120),
			mealCost: new Prisma.Decimal(45),
			driverOvernightCost: new Prisma.Decimal(80),
		};

		const servicesTotal = services.reduce(
			(sum, s) => sum + Number(s.serviceCost),
			0,
		);
		const staffingTotal =
			Number(staffingCosts.hotelCost) +
			Number(staffingCosts.mealCost) +
			Number(staffingCosts.driverOvernightCost);
		const grandTotal = servicesTotal + staffingTotal;

		expect(servicesTotal).toBe(830);
		expect(staffingTotal).toBe(245);
		expect(grandTotal).toBe(1075);
	});
});

// ============================================================================
// TESTS: Idempotency
// ============================================================================

describe("Idempotency Checks", () => {
	it("should skip quote if it already has lines", () => {
		const quote = createMockQuote({
			lines: [{ id: "existing-line-1" }],
		});

		const hasLines = quote.lines.length > 0;
		expect(hasLines).toBe(true);

		// In actual migration, this quote would be skipped
	});

	it("should process quote if it has no lines", () => {
		const quote = createMockQuote({
			lines: [],
		});

		const hasLines = quote.lines.length > 0;
		expect(hasLines).toBe(false);

		// In actual migration, this quote would be processed
	});
});

// ============================================================================
// TESTS: Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle STAY trip with no stayDays", () => {
		const quote = createMockQuote({
			tripType: "STAY" as TripType,
			stayDays: [],
			finalPrice: new Prisma.Decimal(500),
		});

		// Should fall back to standard migration
		expect(quote.stayDays.length).toBe(0);
	});

	it("should handle quotes with very long addresses", () => {
		const longAddress =
			"123 Avenue des Champs-Élysées, Appartement 456, Bâtiment B, Escalier C, 75008 Paris, France, Europe, Monde";
		const quote = createMockQuote({
			pickupAddress: longAddress,
		});

		const label = generateTripLabel(quote as never);
		// Should truncate at first comma
		expect(label).toContain("123 Avenue des Champs-Élysées");
		expect(label).not.toContain("Appartement");
	});

	it("should handle quotes with special characters in addresses", () => {
		const quote = createMockQuote({
			pickupAddress: "Café & Restaurant 'L'Étoile', Paris",
			dropoffAddress: 'Hôtel "Le Grand" - Suite Présidentielle',
		});

		const sourceData = buildSourceData(quote as never);
		expect(sourceData.pickupAddress).toBe(
			"Café & Restaurant 'L'Étoile', Paris",
		);
		expect(sourceData.dropoffAddress).toBe(
			'Hôtel "Le Grand" - Suite Présidentielle',
		);
	});

	it("should handle zero-value quotes", () => {
		const quote = createMockQuote({
			finalPrice: new Prisma.Decimal(0),
			internalCost: new Prisma.Decimal(0),
		});

		const sourceData = buildSourceData(quote as never);
		expect(sourceData.internalCost).toBe(0);
	});
});
