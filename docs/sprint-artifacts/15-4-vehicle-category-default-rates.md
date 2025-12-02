# Story 15.4 – Use Vehicle Category Default Rates for Dynamic Pricing

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** Ready for Development  
**Priority:** High  
**Estimated Effort:** 2 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 15.3 (Vehicle category multipliers)

---

## User Story

**As a** pricing engine,  
**I want** to use `VehicleCategory.defaultRatePerKm` and `defaultRatePerHour` instead of organization-wide rates,  
**So that** each vehicle category has appropriate base rates (Autocar 4.50€/km vs Berline 1.80€/km).

---

## Problem Statement

### Current Behavior

The pricing engine uses organization-wide rates for all categories:

```typescript
// Current: All categories use same rates
const basePrice = Math.max(
  distanceKm * settings.baseRatePerKm, // 1.80€/km for ALL
  (durationMinutes / 60) * settings.baseRatePerHour // 45€/h for ALL
);
```

### Impact Example

| Category    | Category Rate | Org Rate | 100km Trip | Current | Expected | Error |
| ----------- | ------------- | -------- | ---------- | ------- | -------- | ----- |
| Berline     | 1.80€/km      | 1.80€/km | 100km      | 180€    | 180€     | 0%    |
| Van Premium | 2.20€/km      | 1.80€/km | 100km      | 180€    | 220€     | -18%  |
| Minibus     | 3.00€/km      | 1.80€/km | 100km      | 180€    | 300€     | -40%  |
| Autocar     | 4.50€/km      | 1.80€/km | 100km      | 180€    | 450€     | -60%  |
| Luxe        | 3.50€/km      | 1.80€/km | 100km      | 180€    | 350€     | -49%  |

**Business Impact:** Premium vehicles are underpriced by up to 60% on base rate alone.

---

## Solution Design

### Rate Resolution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rate Resolution                               │
│                                                                  │
│  1. Check VehicleCategory.defaultRatePerKm                      │
│     │                                                            │
│     ├─ NOT NULL → Use category rate (source: "CATEGORY")        │
│     │                                                            │
│     └─ NULL → Fallback to OrganizationPricingSettings           │
│               (source: "ORGANIZATION")                           │
│                                                                  │
│  Same logic for defaultRatePerHour                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Price Calculation Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    Price Calculation Flow                        │
│                                                                  │
│  1. ★ BASE PRICE with Category Rates (NEW - Story 15.4) ★       │
│     MAX(distance × categoryRatePerKm, duration × categoryRatePerHour)
│     │                                                            │
│     ▼                                                            │
│  2. Apply Target Margin (existing)                              │
│     │                                                            │
│     ▼                                                            │
│  3. Vehicle Category Multiplier (Story 15.3)                    │
│     │                                                            │
│     ▼                                                            │
│  4. Zone Multiplier (Story 11.3)                                │
│     │                                                            │
│     ▼                                                            │
│  5. Advanced/Seasonal Multipliers                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC1: Category Rates Used for Autocar

**Given** a dynamic pricing calculation for category "Autocar" with `defaultRatePerKm: 4.50`  
**When** the base price is calculated for a 100km trip  
**Then** it uses 100 × 4.50 = 450€ (not 100 × 1.80 = 180€)

### AC2: Fallback to Organization Rates

**Given** a VehicleCategory with `defaultRatePerKm: null`  
**When** the base price is calculated  
**Then** it falls back to `OrganizationPricingSettings.baseRatePerKm`  
**And** `DynamicBaseCalculationRule` shows `rateSource: "ORGANIZATION"`

### AC3: FIXED_GRID Not Affected

**Given** a FIXED_GRID pricing (Method 1) with a matching partner contract  
**When** the route matches the contract  
**Then** the category rates are NOT used  
**And** the contract price is used as-is

### AC4: Rate Source Transparency

**Given** a successful dynamic pricing calculation  
**When** the result is returned  
**Then** `DynamicBaseCalculationRule` includes `rateSource: "CATEGORY" | "ORGANIZATION"`  
**And** the actual rates used are shown in `inputs`

### AC5: Both Rates Applied Correctly

**Given** a category with `defaultRatePerKm: 4.50` and `defaultRatePerHour: 120`  
**When** the base price is calculated for 50km in 2 hours  
**Then** MAX(50×4.50=225, 2×120=240) = 240€ is used

---

## Technical Implementation

### 1. Extend VehicleCategoryInfo

```typescript
// pricing-engine.ts

export interface VehicleCategoryInfo {
  id: string;
  code: string;
  name: string;
  priceMultiplier: number;
  // Story 15.4: Category-specific rates
  defaultRatePerKm: number | null;
  defaultRatePerHour: number | null;
}
```

### 2. Add RateSource Type

```typescript
// pricing-engine.ts

export type RateSource = "CATEGORY" | "ORGANIZATION";

export interface ResolvedRates {
  ratePerKm: number;
  ratePerHour: number;
  rateSource: RateSource;
}
```

### 3. Add resolveRates Function

```typescript
// pricing-engine.ts

/**
 * Story 15.4: Resolve rates with fallback chain
 * Priority: Category → Organization
 */
export function resolveRates(
  vehicleCategory: VehicleCategoryInfo | undefined,
  orgSettings: OrganizationPricingSettings
): ResolvedRates {
  // Check if category has rates
  if (
    vehicleCategory?.defaultRatePerKm != null &&
    vehicleCategory?.defaultRatePerHour != null
  ) {
    return {
      ratePerKm: vehicleCategory.defaultRatePerKm,
      ratePerHour: vehicleCategory.defaultRatePerHour,
      rateSource: "CATEGORY",
    };
  }

  // Fallback to organization rates
  return {
    ratePerKm: orgSettings.baseRatePerKm,
    ratePerHour: orgSettings.baseRatePerHour,
    rateSource: "ORGANIZATION",
  };
}
```

### 4. Update DynamicBaseCalculationRule

```typescript
// pricing-engine.ts

export interface DynamicBaseCalculationRule extends AppliedRule {
  type: "DYNAMIC_BASE_CALCULATION";
  description: string;
  inputs: {
    distanceKm: number;
    durationMinutes: number;
    baseRatePerKm: number;
    baseRatePerHour: number;
    targetMarginPercent: number;
    // Story 15.4: Rate source transparency
    rateSource: RateSource;
  };
  calculation: {
    distanceBasedPrice: number;
    durationBasedPrice: number;
    selectedMethod: "distance" | "duration";
    basePrice: number;
    priceWithMargin: number;
  };
  usingDefaultSettings?: boolean;
}
```

### 5. Update calculateDynamicBasePrice

```typescript
// pricing-engine.ts

export function calculateDynamicBasePrice(
  distanceKm: number,
  durationMinutes: number,
  settings: OrganizationPricingSettings,
  // Story 15.4: Optional category rates
  categoryRates?: { ratePerKm: number; ratePerHour: number } | null
): DynamicBasePriceCalculation {
  // Use category rates if provided, otherwise org rates
  const ratePerKm = categoryRates?.ratePerKm ?? settings.baseRatePerKm;
  const ratePerHour = categoryRates?.ratePerHour ?? settings.baseRatePerHour;

  // ... rest of calculation using resolved rates
}
```

### 6. Update buildDynamicResult

```typescript
// In buildDynamicResult() function

// Story 15.4: Resolve rates before calculation
const resolvedRates = resolveRates(vehicleCategory, settings);

// Calculate with resolved rates
const calculation = calculateDynamicBasePrice(
  distanceKm,
  durationMinutes,
  settings,
  { ratePerKm: resolvedRates.ratePerKm, ratePerHour: resolvedRates.ratePerHour }
);

// Add rate source to the rule
appliedRules.push({
  type: "DYNAMIC_BASE_CALCULATION",
  // ... existing fields ...
  inputs: {
    // ... existing inputs ...
    rateSource: resolvedRates.rateSource,
  },
});
```

### 7. Update pricing-calculate.ts

```typescript
// Load vehicle category with rates
const vehicleCategory = await db.vehicleCategory.findFirst({
  where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
  select: {
    id: true,
    code: true,
    name: true,
    priceMultiplier: true,
    averageConsumptionL100km: true,
    defaultRatePerKm: true,     // Story 15.4
    defaultRatePerHour: true,   // Story 15.4
  },
});

// Pass to calculatePrice with rates
vehicleCategory: vehicleCategory ? {
  id: vehicleCategory.id,
  code: vehicleCategory.code,
  name: vehicleCategory.name,
  priceMultiplier: Number(vehicleCategory.priceMultiplier),
  defaultRatePerKm: vehicleCategory.defaultRatePerKm
    ? Number(vehicleCategory.defaultRatePerKm)
    : null,
  defaultRatePerHour: vehicleCategory.defaultRatePerHour
    ? Number(vehicleCategory.defaultRatePerHour)
    : null,
} : undefined,
```

---

## Test Cases

### Unit Tests

```typescript
// packages/api/src/services/__tests__/category-rates.test.ts

describe("resolveRates", () => {
  it("should use category rates when available", () => {
    const category = {
      id: "1",
      code: "AUTOCAR",
      name: "Autocar",
      priceMultiplier: 2.5,
      defaultRatePerKm: 4.5,
      defaultRatePerHour: 120,
    };
    const orgSettings = { baseRatePerKm: 1.8, baseRatePerHour: 45 };

    const result = resolveRates(category, orgSettings);

    expect(result.ratePerKm).toBe(4.5);
    expect(result.ratePerHour).toBe(120);
    expect(result.rateSource).toBe("CATEGORY");
  });

  it("should fallback to org rates when category is null", () => {
    const category = {
      id: "1",
      code: "NEW",
      name: "New",
      priceMultiplier: 1.0,
      defaultRatePerKm: null,
      defaultRatePerHour: null,
    };
    const orgSettings = { baseRatePerKm: 1.8, baseRatePerHour: 45 };

    const result = resolveRates(category, orgSettings);

    expect(result.ratePerKm).toBe(1.8);
    expect(result.ratePerHour).toBe(45);
    expect(result.rateSource).toBe("ORGANIZATION");
  });
});

describe("calculateDynamicBasePrice with category rates", () => {
  it("should use Autocar rates (4.50€/km)", () => {
    const result = calculateDynamicBasePrice(100, 90, defaultSettings, {
      ratePerKm: 4.5,
      ratePerHour: 120,
    });
    expect(result.distanceBasedPrice).toBe(450);
  });
});
```

---

## Files to Modify/Create

| File                                                         | Action | Description                                 |
| ------------------------------------------------------------ | ------ | ------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Modify | Extend types, add resolveRates, update calc |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Modify | Load and pass category rates                |
| `packages/api/src/services/__tests__/category-rates.test.ts` | Create | Unit tests                                  |

---

## Definition of Done

- [ ] VehicleCategoryInfo extended with defaultRatePerKm/Hour
- [ ] RateSource type and ResolvedRates interface added
- [ ] resolveRates() function implemented
- [ ] calculateDynamicBasePrice() updated to accept category rates
- [ ] buildDynamicResult() uses resolved rates
- [ ] DynamicBaseCalculationRule includes rateSource
- [ ] pricing-calculate.ts loads and passes category rates
- [ ] Unit tests passing (>90% coverage)
- [ ] FIXED_GRID pricing not affected
- [ ] No regression in existing pricing tests
- [ ] Code reviewed and approved

---

## Related Documentation

- [PRD FR13: Dynamic pricing base](../bmad/prd.md)
- [PRD FR60: Vehicle category configuration](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 15.3: Vehicle category multipliers](./15-3-vehicle-category-price-multipliers.md)
