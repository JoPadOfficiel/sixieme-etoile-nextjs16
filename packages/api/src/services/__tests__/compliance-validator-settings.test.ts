/**
 * Story 17.4: Configurable Staffing Cost Parameters
 * Tests for buildCostParametersFromSettings and buildExtendedCostParametersFromSettings
 */

import { describe, it, expect } from "vitest";
import {
	buildCostParametersFromSettings,
	buildExtendedCostParametersFromSettings,
	DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	DEFAULT_EXTENDED_STAFFING_COSTS,
	type OrganizationStaffingCostSettings,
} from "../compliance-validator";

// Helper to create a Decimal-like object (mimics Prisma Decimal)
function createDecimal(value: number): { toNumber: () => number } {
	return { toNumber: () => value };
}

// Helper to create full settings object
function createSettings(
	overrides: Partial<{
		hotelCostPerNight: number | null;
		mealCostPerDay: number | null;
		driverOvernightPremium: number | null;
		secondDriverHourlyRate: number | null;
		relayDriverFixedFee: number | null;
	}> = {}
): OrganizationStaffingCostSettings {
	return {
		hotelCostPerNight: overrides.hotelCostPerNight !== undefined 
			? (overrides.hotelCostPerNight !== null ? createDecimal(overrides.hotelCostPerNight) : null)
			: null,
		mealCostPerDay: overrides.mealCostPerDay !== undefined
			? (overrides.mealCostPerDay !== null ? createDecimal(overrides.mealCostPerDay) : null)
			: null,
		driverOvernightPremium: overrides.driverOvernightPremium !== undefined
			? (overrides.driverOvernightPremium !== null ? createDecimal(overrides.driverOvernightPremium) : null)
			: null,
		secondDriverHourlyRate: overrides.secondDriverHourlyRate !== undefined
			? (overrides.secondDriverHourlyRate !== null ? createDecimal(overrides.secondDriverHourlyRate) : null)
			: null,
		relayDriverFixedFee: overrides.relayDriverFixedFee !== undefined
			? (overrides.relayDriverFixedFee !== null ? createDecimal(overrides.relayDriverFixedFee) : null)
			: null,
	};
}

describe("buildCostParametersFromSettings", () => {
	describe("AC6: Backward Compatibility - Default Values", () => {
		it("should return defaults when settings is null", () => {
			const result = buildCostParametersFromSettings(null);
			
			expect(result).toEqual(DEFAULT_ALTERNATIVE_COST_PARAMETERS);
			expect(result.driverHourlyCost).toBe(25);
			expect(result.hotelCostPerNight).toBe(100);
			expect(result.mealAllowancePerDay).toBe(30);
		});

		it("should return defaults when settings is undefined", () => {
			const result = buildCostParametersFromSettings(undefined);
			
			expect(result).toEqual(DEFAULT_ALTERNATIVE_COST_PARAMETERS);
		});

		it("should return defaults when all settings fields are null", () => {
			const settings = createSettings({
				hotelCostPerNight: null,
				mealCostPerDay: null,
				secondDriverHourlyRate: null,
			});
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result).toEqual(DEFAULT_ALTERNATIVE_COST_PARAMETERS);
		});
	});

	describe("AC4: Use Organization Settings", () => {
		it("should use organization-specific hotel cost when configured", () => {
			const settings = createSettings({ hotelCostPerNight: 150 });
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result.hotelCostPerNight).toBe(150);
			expect(result.driverHourlyCost).toBe(25); // default
			expect(result.mealAllowancePerDay).toBe(30); // default
		});

		it("should use organization-specific meal cost when configured", () => {
			const settings = createSettings({ mealCostPerDay: 40 });
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result.mealAllowancePerDay).toBe(40);
			expect(result.hotelCostPerNight).toBe(100); // default
		});

		it("should use organization-specific driver hourly rate when configured", () => {
			const settings = createSettings({ secondDriverHourlyRate: 35 });
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result.driverHourlyCost).toBe(35);
		});

		it("should use all custom values when all are configured", () => {
			const settings = createSettings({
				hotelCostPerNight: 120,
				mealCostPerDay: 45,
				secondDriverHourlyRate: 30,
			});
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result.hotelCostPerNight).toBe(120);
			expect(result.mealAllowancePerDay).toBe(45);
			expect(result.driverHourlyCost).toBe(30);
		});
	});

	describe("AC5: Partial Configuration", () => {
		it("should mix custom and default values", () => {
			const settings = createSettings({
				hotelCostPerNight: 180,
				mealCostPerDay: null, // explicit null
				secondDriverHourlyRate: 28,
			});
			
			const result = buildCostParametersFromSettings(settings);
			
			expect(result.hotelCostPerNight).toBe(180);
			expect(result.mealAllowancePerDay).toBe(30); // default
			expect(result.driverHourlyCost).toBe(28);
		});
	});
});

describe("buildExtendedCostParametersFromSettings", () => {
	describe("AC6: Backward Compatibility - Default Values", () => {
		it("should return extended defaults when settings is null", () => {
			const result = buildExtendedCostParametersFromSettings(null);
			
			expect(result).toEqual(DEFAULT_EXTENDED_STAFFING_COSTS);
			expect(result.driverHourlyCost).toBe(25);
			expect(result.hotelCostPerNight).toBe(100);
			expect(result.mealAllowancePerDay).toBe(30);
			expect(result.driverOvernightPremium).toBe(50);
			expect(result.relayDriverFixedFee).toBe(150);
		});

		it("should return extended defaults when settings is undefined", () => {
			const result = buildExtendedCostParametersFromSettings(undefined);
			
			expect(result).toEqual(DEFAULT_EXTENDED_STAFFING_COSTS);
		});
	});

	describe("AC4: Use Organization Settings for Extended Parameters", () => {
		it("should use organization-specific overnight premium when configured", () => {
			const settings = createSettings({ driverOvernightPremium: 75 });
			
			const result = buildExtendedCostParametersFromSettings(settings);
			
			expect(result.driverOvernightPremium).toBe(75);
			expect(result.relayDriverFixedFee).toBe(150); // default
		});

		it("should use organization-specific relay driver fee when configured", () => {
			const settings = createSettings({ relayDriverFixedFee: 200 });
			
			const result = buildExtendedCostParametersFromSettings(settings);
			
			expect(result.relayDriverFixedFee).toBe(200);
			expect(result.driverOvernightPremium).toBe(50); // default
		});

		it("should use all custom values when all are configured", () => {
			const settings = createSettings({
				hotelCostPerNight: 150,
				mealCostPerDay: 40,
				driverOvernightPremium: 75,
				secondDriverHourlyRate: 30,
				relayDriverFixedFee: 200,
			});
			
			const result = buildExtendedCostParametersFromSettings(settings);
			
			expect(result.hotelCostPerNight).toBe(150);
			expect(result.mealAllowancePerDay).toBe(40);
			expect(result.driverOvernightPremium).toBe(75);
			expect(result.driverHourlyCost).toBe(30);
			expect(result.relayDriverFixedFee).toBe(200);
		});
	});

	describe("AC5: Cost Breakdown Reflects Configured Values", () => {
		it("should calculate correct total with all custom parameters for MULTI_DAY scenario", () => {
			const settings = createSettings({
				hotelCostPerNight: 120,
				mealCostPerDay: 35,
				secondDriverHourlyRate: 28,
			});
			
			const result = buildExtendedCostParametersFromSettings(settings);
			
			// For a 2-day mission:
			// Hotel: 1 night * 120 = 120
			// Meals: 2 days * 35 = 70
			// Extra driver: 1 extra day * 8h * 28 = 224
			// Total = 414
			const hotelNights = 1;
			const days = 2;
			const extraDays = 1;
			const standardWorkDay = 8;
			
			const hotelCost = hotelNights * result.hotelCostPerNight;
			const mealCost = days * result.mealAllowancePerDay;
			const extraDriverCost = extraDays * standardWorkDay * result.driverHourlyCost;
			
			expect(hotelCost).toBe(120);
			expect(mealCost).toBe(70);
			expect(extraDriverCost).toBe(224);
			expect(hotelCost + mealCost + extraDriverCost).toBe(414);
		});

		it("should calculate correct cost for DOUBLE_CREW with custom hourly rate", () => {
			const settings = createSettings({ secondDriverHourlyRate: 35 });
			
			const result = buildExtendedCostParametersFromSettings(settings);
			
			// For 6 extra hours of second driver
			const extraHours = 6;
			const extraDriverCost = extraHours * result.driverHourlyCost;
			
			expect(extraDriverCost).toBe(210);
		});
	});
});

describe("Default Constants Validation", () => {
	it("should have correct default values for AlternativeCostParameters", () => {
		expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost).toBe(25);
		expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight).toBe(100);
		expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay).toBe(30);
	});

	it("should have correct default values for ExtendedStaffingCostParameters", () => {
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.driverHourlyCost).toBe(25);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.hotelCostPerNight).toBe(100);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.mealAllowancePerDay).toBe(30);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.driverOvernightPremium).toBe(50);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.relayDriverFixedFee).toBe(150);
	});

	it("should have ExtendedStaffingCostParameters extend AlternativeCostParameters", () => {
		// Verify that extended costs include all base costs
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.driverHourlyCost).toBe(
			DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost
		);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.hotelCostPerNight).toBe(
			DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight
		);
		expect(DEFAULT_EXTENDED_STAFFING_COSTS.mealAllowancePerDay).toBe(
			DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay
		);
	});
});
