# Story 15.5 – Differentiate Pricing by Trip Type (Transfer/Excursion/Dispo)

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** ✅ Done  
**Priority:** High  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 4.1 (Base dynamic price calculation)

---

## User Story

**As a** pricing engine,  
**I want** to apply different pricing logic based on trip type,  
**So that** excursions and mise-à-disposition have appropriate pricing models.

---

## Problem Statement

### Current Behavior

The pricing engine uses the same formula for all trip types:

```typescript
// Current: Same formula for all trip types
const basePrice = Math.max(
  distanceKm * ratePerKm,
  (durationMinutes / 60) * ratePerHour
);
// Missing: Trip type specific logic
```

### Impact Example

| Trip Type | Duration | Current Price | Expected Price  | Error |
| --------- | -------- | ------------- | --------------- | ----- |
| Transfer  | 2h       | 90€           | 90€             | 0%    |
| Excursion | 2h       | 90€           | 207€ (4h min)   | -56%  |
| Dispo 4h  | 4h+300km | 180€          | 230€ (+overage) | -22%  |

**Business Impact:** Excursions and dispo trips are underpriced.

---

## Solution Design

### Trip Type Pricing Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trip Type Pricing                             │
│                                                                  │
│  TRANSFER:                                                       │
│    price = MAX(distance×rate, duration×rate)                    │
│    No additional rules                                           │
│                                                                  │
│  EXCURSION:                                                      │
│    effectiveDuration = MAX(duration, minimumHours)              │
│    basePrice = effectiveDuration × ratePerHour                  │
│    price = basePrice × (1 + surchargePercent/100)               │
│    Add TripTypeRule with minimumApplied, surcharge              │
│                                                                  │
│  DISPO:                                                          │
│    basePrice = duration × ratePerHour                           │
│    includedKm = duration × includedKmPerHour                    │
│    overageKm = MAX(0, distance - includedKm)                    │
│    price = basePrice + (overageKm × overageRatePerKm)           │
│    Add TripTypeRule with overageKm, overageAmount               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Price Calculation Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    Price Calculation Flow                        │
│                                                                  │
│  1. Base Price with Category Rates (Story 15.4)                 │
│     │                                                            │
│     ▼                                                            │
│  2. ★ TRIP TYPE ADJUSTMENT (NEW - Story 15.5) ★                 │
│     │                                                            │
│     ▼                                                            │
│  3. Apply Target Margin                                         │
│     │                                                            │
│     ▼                                                            │
│  4. Vehicle Category Multiplier (Story 15.3)                    │
│     │                                                            │
│     ▼                                                            │
│  5. Zone/Advanced/Seasonal Multipliers                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC1: Transfer Uses Standard Formula

**Given** a trip type "transfer"  
**When** dynamic pricing is calculated  
**Then** it uses MAX(distance×rate, duration×rate)  
**And** no TRIP_TYPE rule is added (standard behavior)

### AC2: Excursion Applies Minimum Duration

**Given** a trip type "excursion" with 2h duration  
**When** dynamic pricing is calculated  
**Then** it uses 4h minimum (not 2h)  
**And** TRIP_TYPE rule shows `minimumApplied: true`

### AC3: Excursion Applies Surcharge

**Given** a trip type "excursion" with 5h duration  
**When** dynamic pricing is calculated  
**Then** it applies 15% surcharge to the base price  
**And** TRIP_TYPE rule shows `surchargePercent: 15`

### AC4: Dispo Calculates Overage

**Given** a trip type "dispo" for 4h with 300km  
**When** dynamic pricing is calculated  
**Then** it calculates: 4h×rate + (300-200)km × overageRate  
**And** TRIP_TYPE rule shows `overageKm: 100, overageAmount: 50€`

### AC5: Transparency in Applied Rules

**Given** a successful excursion or dispo pricing  
**When** the result is returned  
**Then** `appliedRules` contains a TRIP_TYPE rule  
**And** the rule shows tripType, adjustments, and final calculation

---

## Technical Implementation

### 1. Extend OrganizationPricingSettings

```typescript
// pricing-engine.ts

export interface OrganizationPricingSettings {
  baseRatePerKm: number;
  baseRatePerHour: number;
  targetMarginPercent: number;
  // Story 15.5: Trip type specific settings
  excursionMinimumHours: number; // Default: 4
  excursionSurchargePercent: number; // Default: 15
  dispoIncludedKmPerHour: number; // Default: 50
  dispoOverageRatePerKm: number; // Default: 0.50
}

export const DEFAULT_PRICING_SETTINGS: OrganizationPricingSettings = {
  baseRatePerKm: 2.5,
  baseRatePerHour: 45.0,
  targetMarginPercent: 20.0,
  // Story 15.5: Trip type defaults
  excursionMinimumHours: 4,
  excursionSurchargePercent: 15,
  dispoIncludedKmPerHour: 50,
  dispoOverageRatePerKm: 0.5,
};
```

### 2. Add AppliedTripTypeRule

```typescript
// pricing-engine.ts

export interface AppliedTripTypeRule extends AppliedRule {
  type: "TRIP_TYPE";
  tripType: TripType;
  description: string;
  // Excursion specific
  minimumApplied?: boolean;
  requestedHours?: number;
  effectiveHours?: number;
  surchargePercent?: number;
  surchargeAmount?: number;
  // Dispo specific
  includedKm?: number;
  actualKm?: number;
  overageKm?: number;
  overageRatePerKm?: number;
  overageAmount?: number;
  // Common
  basePriceBeforeAdjustment: number;
  priceAfterAdjustment: number;
}
```

### 3. Add Trip Type Calculation Functions

```typescript
// pricing-engine.ts

/**
 * Story 15.5: Calculate excursion price with minimum and surcharge
 */
export function calculateExcursionPrice(
  durationMinutes: number,
  ratePerHour: number,
  settings: OrganizationPricingSettings
): {
  price: number;
  rule: AppliedTripTypeRule;
} {
  const requestedHours = durationMinutes / 60;
  const effectiveHours = Math.max(
    requestedHours,
    settings.excursionMinimumHours
  );
  const minimumApplied = effectiveHours > requestedHours;

  const basePrice = effectiveHours * ratePerHour;
  const surchargeAmount =
    Math.round(((basePrice * settings.excursionSurchargePercent) / 100) * 100) /
    100;
  const price = Math.round((basePrice + surchargeAmount) * 100) / 100;

  return {
    price,
    rule: {
      type: "TRIP_TYPE",
      tripType: "excursion",
      description: `Excursion pricing: ${effectiveHours}h × ${ratePerHour}€/h + ${settings.excursionSurchargePercent}% surcharge`,
      minimumApplied,
      requestedHours,
      effectiveHours,
      surchargePercent: settings.excursionSurchargePercent,
      surchargeAmount,
      basePriceBeforeAdjustment: basePrice,
      priceAfterAdjustment: price,
    },
  };
}

/**
 * Story 15.5: Calculate dispo price with overage
 */
export function calculateDispoPrice(
  durationMinutes: number,
  distanceKm: number,
  ratePerHour: number,
  settings: OrganizationPricingSettings
): {
  price: number;
  rule: AppliedTripTypeRule;
} {
  const hours = durationMinutes / 60;
  const basePrice = Math.round(hours * ratePerHour * 100) / 100;

  const includedKm = hours * settings.dispoIncludedKmPerHour;
  const overageKm = Math.max(0, distanceKm - includedKm);
  const overageAmount =
    Math.round(overageKm * settings.dispoOverageRatePerKm * 100) / 100;
  const price = Math.round((basePrice + overageAmount) * 100) / 100;

  return {
    price,
    rule: {
      type: "TRIP_TYPE",
      tripType: "dispo",
      description: `Dispo pricing: ${hours}h × ${ratePerHour}€/h + ${overageKm}km overage`,
      includedKm,
      actualKm: distanceKm,
      overageKm,
      overageRatePerKm: settings.dispoOverageRatePerKm,
      overageAmount,
      basePriceBeforeAdjustment: basePrice,
      priceAfterAdjustment: price,
    },
  };
}
```

### 4. Update buildDynamicResult

```typescript
// In buildDynamicResult() function

// After base price calculation, before margin:
let adjustedPrice = calculation.basePrice;
let tripTypeRule: AppliedTripTypeRule | null = null;

// Story 15.5: Apply trip type specific pricing
if (tripType === "excursion") {
  const excursionResult = calculateExcursionPrice(
    durationMinutes,
    resolvedRates.ratePerHour,
    settings
  );
  adjustedPrice = excursionResult.price;
  tripTypeRule = excursionResult.rule;
} else if (tripType === "dispo") {
  const dispoResult = calculateDispoPrice(
    durationMinutes,
    distanceKm,
    resolvedRates.ratePerHour,
    settings
  );
  adjustedPrice = dispoResult.price;
  tripTypeRule = dispoResult.rule;
}
// transfer: use standard calculation (no adjustment)

if (tripTypeRule) {
  appliedRules.push(tripTypeRule);
}

// Apply margin to adjusted price
const priceWithMargin =
  Math.round(adjustedPrice * (1 + settings.targetMarginPercent / 100) * 100) /
  100;
```

---

## Test Cases

### Unit Tests

```typescript
// packages/api/src/services/__tests__/trip-type-pricing.test.ts

describe("calculateExcursionPrice", () => {
  it("should apply 4h minimum for 2h excursion", () => {
    const result = calculateExcursionPrice(120, 45, defaultSettings);
    expect(result.rule.effectiveHours).toBe(4);
    expect(result.rule.minimumApplied).toBe(true);
    // 4h × 45€ × 1.15 = 207€
    expect(result.price).toBe(207);
  });

  it("should not apply minimum for 6h excursion", () => {
    const result = calculateExcursionPrice(360, 45, defaultSettings);
    expect(result.rule.effectiveHours).toBe(6);
    expect(result.rule.minimumApplied).toBe(false);
    // 6h × 45€ × 1.15 = 310.5€
    expect(result.price).toBe(310.5);
  });
});

describe("calculateDispoPrice", () => {
  it("should calculate overage for 4h/300km dispo", () => {
    const result = calculateDispoPrice(240, 300, 45, defaultSettings);
    // Included: 4h × 50km = 200km
    // Overage: 300 - 200 = 100km × 0.50€ = 50€
    // Total: 4h × 45€ + 50€ = 230€
    expect(result.rule.overageKm).toBe(100);
    expect(result.rule.overageAmount).toBe(50);
    expect(result.price).toBe(230);
  });

  it("should have no overage when under included km", () => {
    const result = calculateDispoPrice(240, 150, 45, defaultSettings);
    expect(result.rule.overageKm).toBe(0);
    expect(result.rule.overageAmount).toBe(0);
    expect(result.price).toBe(180); // 4h × 45€
  });
});
```

---

## Files to Modify/Create

| File                                                            | Action | Description                                     |
| --------------------------------------------------------------- | ------ | ----------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                   | Modify | Add types, functions, update buildDynamicResult |
| `packages/api/src/services/__tests__/trip-type-pricing.test.ts` | Create | Unit tests                                      |

---

## Definition of Done

- [x] OrganizationPricingSettings extended with trip type fields
- [x] DEFAULT_PRICING_SETTINGS updated with defaults
- [x] AppliedTripTypeRule type added
- [x] calculateExcursionPrice() function implemented
- [x] calculateDispoPrice() function implemented
- [x] buildDynamicResult() branches by tripType
- [x] Unit tests passing (26 tests, 100% coverage)
- [x] Transfer pricing unchanged (regression test)
- [x] No regression in existing pricing tests
- [x] Code reviewed and approved

---

## Implementation Summary (Completed 2025-12-02)

### Git

- **Branch:** `feature/15-5-trip-type-differentiation`
- **Commit:** `7dc2a4e` - feat(15.5): Differentiate pricing by trip type

### Files Modified/Created

| File                                                               | Action   | Lines |
| ------------------------------------------------------------------ | -------- | ----- |
| `packages/api/src/services/pricing-engine.ts`                      | Modified | +170  |
| `packages/api/src/services/__tests__/trip-type-pricing.test.ts`    | Created  | +340  |
| `docs/sprint-artifacts/15-5-trip-type-differentiation.context.xml` | Created  | +180  |
| `docs/sprint-artifacts/15-5-trip-type-differentiation.md`          | Created  | +300  |

### Test Results

- **Vitest:** 26 tests passing (100%)
  - 10 tests for excursion pricing
  - 9 tests for dispo pricing
  - 5 tests for trip type dispatcher
  - 2 tests for real-world scenarios
- **No regressions** in existing pricing tests

---

## Related Documentation

- [PRD FR10: Excursion and dispo forfaits](../bmad/prd.md)
- [PRD FR12: Dynamic pricing fallback](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 4.1: Base dynamic price calculation](./4-1-base-dynamic-price-calculation.md)
