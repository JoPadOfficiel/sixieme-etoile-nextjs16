# Story 20.4: Fix RSE Second Driver Cost Calculation

**Epic:** 20 - Critical Bug Fixes, Google Maps Migration & Comprehensive Testing  
**Status:** in-progress  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Date:** 2026-01-02  
**Branch:** `feature/20-4-fix-rse-second-driver-cost`

---

## Story

As a **VTC operator**,  
I want the pricing engine to correctly calculate and include RSE staffing costs (second driver, hotel, meals) in quotes for long trips,  
So that my quotes for heavy vehicle trips are accurate and include all compliance-related costs.

---

## Context & Problem Statement

### Current Issue

The function `integrateComplianceIntoPricing` in `pricing-engine.ts` is a simple alias to `integrateComplianceInPricing` from `compliance-validator.ts`. However:

1. `integrateComplianceInPricing` returns `{ complianceResult, staffingSelection }`
2. Tests and consumers expect `ComplianceIntegrationResult` with `{ tripAnalysis, additionalStaffingCost, appliedRule }`
3. The `compliancePlan` is never added to `tripAnalysis`
4. The `additionalStaffingCost` is never calculated and returned

### Expected Behavior

When a heavy vehicle trip exceeds RSE limits (9h driving, 13h amplitude), the system should:

1. Detect the violation
2. Select the best staffing plan (DOUBLE_CREW, RELAY_DRIVER, or MULTI_DAY)
3. Calculate the additional cost
4. Add `compliancePlan` to `tripAnalysis`
5. Return `additionalStaffingCost` for inclusion in the final price

---

## Acceptance Criteria

| AC#  | Critère                                                                                                                                 | Test Method |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| AC1  | `integrateComplianceIntoPricing` returns `ComplianceIntegrationResult` with `tripAnalysis`, `additionalStaffingCost`, and `appliedRule` | Unit Test   |
| AC2  | For LIGHT vehicles, `compliancePlan` is `null` and `additionalStaffingCost` is `0`                                                      | Unit Test   |
| AC3  | For compliant HEAVY trips, `compliancePlan.planType` is `"NONE"` and `additionalStaffingCost` is `0`                                    | Unit Test   |
| AC4  | For non-compliant HEAVY trips, system selects best staffing plan and calculates cost                                                    | Unit Test   |
| AC5  | DOUBLE_CREW cost = `(totalDrivingHours / 2) × driverHourlyCost`                                                                         | Unit Test   |
| AC6  | `compliancePlan` is stored in `tripAnalysis.compliancePlan`                                                                             | Unit Test   |
| AC7  | `appliedRule` of type `"COMPLIANCE_STAFFING"` is returned for non-compliant trips                                                       | Unit Test   |
| AC8  | Cost parameters are read from organization settings when available                                                                      | Unit Test   |
| AC9  | Existing tests in `pricing-engine-compliance-integration.test.ts` pass                                                                  | Unit Test   |
| AC10 | Existing tests in `pricing-engine-rse-staffing.test.ts` pass                                                                            | Unit Test   |

---

## Technical Design

### Files to Modify

1. **`packages/api/src/services/pricing-engine.ts`**

   - Replace alias with actual implementation of `integrateComplianceIntoPricing`
   - Import `ComplianceIntegrationInput`, `ComplianceIntegrationResult` from types
   - Implement wrapper function that transforms `integrateComplianceInPricing` result

2. **`packages/api/src/services/pricing/index.ts`**
   - Export `integrateComplianceIntoPricing` from pricing-engine.ts
   - Export `ComplianceIntegrationInput`, `ComplianceIntegrationResult` types

### Implementation Details

```typescript
// packages/api/src/services/pricing-engine.ts

import type {
  ComplianceIntegrationInput,
  ComplianceIntegrationResult,
  CompliancePlan,
  AppliedRule,
} from "./pricing/types";
import {
  integrateComplianceInPricing,
  type RSERules,
  type AlternativeCostParameters,
  DEFAULT_ALTERNATIVE_COST_PARAMETERS,
} from "./compliance-validator";

export function integrateComplianceIntoPricing(
  input: ComplianceIntegrationInput
): ComplianceIntegrationResult {
  // Extract parameters
  const rules = (input.rules as RSERules | null) ?? null;
  const costParameters =
    input.costParameters ?? DEFAULT_ALTERNATIVE_COST_PARAMETERS;
  const policy = input.staffingSelectionPolicy ?? "CHEAPEST";

  // Call the underlying compliance integration
  const { complianceResult, staffingSelection } = integrateComplianceInPricing(
    {
      organizationId: input.organizationId,
      vehicleCategoryId: input.vehicleCategoryId,
      regulatoryCategory: input.regulatoryCategory,
      licenseCategoryId: input.licenseCategoryId,
      tripAnalysis: input.tripAnalysis,
      pickupAt: input.pickupAt,
      estimatedDropoffAt: input.estimatedDropoffAt,
    },
    rules,
    costParameters,
    policy
  );

  // Build compliancePlan for tripAnalysis
  let compliancePlan: CompliancePlan | null = null;
  let additionalStaffingCost = 0;
  let appliedRule: AppliedRule | null = null;

  if (input.regulatoryCategory === "LIGHT") {
    // LIGHT vehicles: no compliance plan
    compliancePlan = null;
  } else if (complianceResult.isCompliant) {
    // Compliant HEAVY trip: NONE plan
    compliancePlan = {
      planType: "NONE",
      isRequired: false,
      additionalCost: 0,
      costBreakdown: {
        extraDriverCost: 0,
        hotelCost: 0,
        mealAllowance: 0,
        otherCosts: 0,
      },
      adjustedSchedule: {
        daysRequired: 1,
        driversRequired: 1,
        hotelNightsRequired: 0,
      },
      originalViolations: [],
      selectedReason: "Trip is compliant - no staffing plan required",
    };
  } else if (staffingSelection.selectedPlan) {
    // Non-compliant: use selected plan
    const plan = staffingSelection.selectedPlan;
    compliancePlan = {
      planType: plan.type,
      isRequired: true,
      additionalCost: plan.additionalCost.total,
      costBreakdown: plan.additionalCost.breakdown,
      adjustedSchedule: {
        daysRequired: plan.adjustedSchedule.daysRequired,
        driversRequired: plan.adjustedSchedule.driversRequired,
        hotelNightsRequired: plan.adjustedSchedule.hotelNightsRequired,
      },
      originalViolations: staffingSelection.originalViolations.map((v) => ({
        type: v.type,
        message: v.message,
        actual: v.actual,
        limit: v.limit,
      })),
      selectedReason: staffingSelection.selectionReason,
    };
    additionalStaffingCost = plan.additionalCost.total;

    // Create applied rule for transparency
    appliedRule = {
      type: "COMPLIANCE_STAFFING",
      planType: plan.type,
      additionalCost: plan.additionalCost.total,
      description: staffingSelection.selectionReason,
      violations: staffingSelection.originalViolations.length,
    };
  }

  // Return result with updated tripAnalysis
  return {
    tripAnalysis: {
      ...input.tripAnalysis,
      compliancePlan,
    },
    additionalStaffingCost,
    appliedRule,
  };
}
```

---

## Test Cases

### TC1: LIGHT Vehicle - No Compliance

```typescript
it("should return null compliancePlan for LIGHT vehicles", () => {
  const result = integrateComplianceIntoPricing({
    regulatoryCategory: "LIGHT",
    tripAnalysis: createTripAnalysis(600), // 10h
    ...
  });
  expect(result.tripAnalysis.compliancePlan).toBeNull();
  expect(result.additionalStaffingCost).toBe(0);
});
```

### TC2: Compliant HEAVY Trip

```typescript
it("should return NONE plan for compliant HEAVY trip", () => {
  const result = integrateComplianceIntoPricing({
    regulatoryCategory: "HEAVY",
    tripAnalysis: createTripAnalysis(480), // 8h - within limits
    ...
  });
  expect(result.tripAnalysis.compliancePlan?.planType).toBe("NONE");
  expect(result.additionalStaffingCost).toBe(0);
});
```

### TC3: Non-Compliant HEAVY Trip - DOUBLE_CREW

```typescript
it("should select DOUBLE_CREW and calculate cost for 15h trip", () => {
  const result = integrateComplianceIntoPricing({
    regulatoryCategory: "HEAVY",
    tripAnalysis: createTripAnalysis(900), // 15h - exceeds limits
    costParameters: { driverHourlyCost: 25, ... },
    ...
  });
  expect(result.tripAnalysis.compliancePlan?.planType).toBe("DOUBLE_CREW");
  expect(result.additionalStaffingCost).toBeGreaterThan(0);
  // Cost = (15h / 2) × 25€ = 187.50€
  expect(result.tripAnalysis.compliancePlan?.costBreakdown.extraDriverCost).toBeCloseTo(187.5, 1);
});
```

### TC4: Applied Rule Transparency

```typescript
it("should return COMPLIANCE_STAFFING applied rule", () => {
  const result = integrateComplianceIntoPricing({
    regulatoryCategory: "HEAVY",
    tripAnalysis: createTripAnalysis(900),
    ...
  });
  expect(result.appliedRule?.type).toBe("COMPLIANCE_STAFFING");
  expect(result.appliedRule?.planType).toBeDefined();
});
```

---

## Dependencies

- **Prerequisite:** Story 19.2 (Automatic RSE-Compliant Staffing) - ✅ Done
- **Uses:** `compliance-validator.ts` functions
- **Uses:** `ComplianceIntegrationInput`, `ComplianceIntegrationResult` types

---

## Out of Scope

- UI changes to display compliance plan (covered in other stories)
- Database schema changes
- New API endpoints

---

## Definition of Done

- [ ] `integrateComplianceIntoPricing` correctly returns `ComplianceIntegrationResult`
- [ ] All existing tests pass
- [ ] `compliancePlan` is correctly added to `tripAnalysis`
- [ ] `additionalStaffingCost` matches `compliancePlan.additionalCost`
- [ ] `appliedRule` is returned for non-compliant trips
- [ ] Code review completed
- [ ] Sprint status updated to `done`
