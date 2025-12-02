# Story 15.3 – Apply Vehicle Category Price Multipliers in Dynamic Pricing

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** Ready for Development  
**Priority:** High  
**Estimated Effort:** 2 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 4.1 (Base dynamic price calculation), Story 15.2 (Vehicle-specific fuel consumption)

---

## User Story

**As a** pricing engine,  
**I want** to apply the `VehicleCategory.priceMultiplier` to dynamic pricing calculations,  
**So that** premium vehicles (Luxe 2.0×, Autocar 2.5×) are priced appropriately higher than standard vehicles.

---

## Problem Statement

### Current Behavior

The pricing engine calculates dynamic prices without considering the vehicle category multiplier:

```typescript
// Current: All categories priced the same
const basePrice = Math.max(
  distanceKm * ratePerKm,
  (durationMinutes / 60) * ratePerHour
);
// Missing: basePrice × categoryMultiplier
```

### Impact Example

| Category    | Multiplier | Base Price | Current Final | Expected Final | Error |
| ----------- | ---------- | ---------- | ------------- | -------------- | ----- |
| Berline     | 1.0×       | 100€       | 100€          | 100€           | 0%    |
| Van Premium | 1.3×       | 100€       | 100€          | 130€           | -23%  |
| Minibus     | 1.8×       | 100€       | 100€          | 180€           | -44%  |
| Luxe        | 2.0×       | 100€       | 100€          | 200€           | -50%  |
| Autocar     | 2.5×       | 100€       | 100€          | 250€           | -60%  |

**Business Impact:** Premium vehicles are underpriced by up to 60%, making them unprofitable.

---

## Solution Design

### Multiplier Application Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    Price Calculation Flow                        │
│                                                                  │
│  1. Base Price (MAX of distance×rate, duration×rate)            │
│     │                                                            │
│     ▼                                                            │
│  2. ★ VEHICLE CATEGORY MULTIPLIER (NEW - Story 15.3) ★          │
│     │                                                            │
│     ▼                                                            │
│  3. Zone Multiplier (pickup/dropoff zone)                       │
│     │                                                            │
│     ▼                                                            │
│  4. Advanced Rate Multiplier (time-based)                       │
│     │                                                            │
│     ▼                                                            │
│  5. Seasonal Multiplier (date-based)                            │
│     │                                                            │
│     ▼                                                            │
│  6. Final Price                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### FIXED_GRID Exception

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIXED_GRID (Method 1)                         │
│                                                                  │
│  Partner Contract Price = FINAL PRICE                           │
│                                                                  │
│  ❌ NO category multiplier applied                              │
│  ❌ NO zone multiplier applied                                  │
│  ❌ NO advanced rate applied                                    │
│                                                                  │
│  Reason: Contract prices are negotiated and fixed               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC1: Category Multiplier Applied to Dynamic Pricing

**Given** a dynamic pricing calculation for category "Luxe" with `priceMultiplier: 2.0`  
**When** the base price is calculated as 100€  
**Then** the price after category multiplier is 200€  
**And** an `appliedRule` of type `VEHICLE_CATEGORY_MULTIPLIER` is added to the result

### AC2: Neutral Multiplier (1.0) Not Added

**Given** a dynamic pricing calculation for category "Berline" with `priceMultiplier: 1.0`  
**When** the base price is calculated  
**Then** no `VEHICLE_CATEGORY_MULTIPLIER` rule is added to `appliedRules`  
**And** the price remains unchanged

### AC3: FIXED_GRID Not Affected

**Given** a FIXED_GRID pricing (Method 1) with a matching partner contract  
**When** the route matches the contract  
**Then** the vehicle category multiplier is NOT applied  
**And** the contract price is used as-is

### AC4: Multiplier Order Correct

**Given** a dynamic pricing with zone multiplier 1.2 and category multiplier 2.0  
**When** the price is calculated  
**Then** category multiplier is applied BEFORE zone multiplier  
**And** Final = Base × CategoryMultiplier × ZoneMultiplier = 100 × 2.0 × 1.2 = 240€

### AC5: Transparency in Applied Rules

**Given** a successful dynamic pricing calculation with category multiplier 1.5  
**When** the result is returned  
**Then** `appliedRules` contains a `VEHICLE_CATEGORY_MULTIPLIER` rule  
**And** the rule shows `categoryCode`, `categoryName`, and `multiplier` value

---

## Technical Implementation

### 1. Add AppliedVehicleCategoryMultiplierRule Type

```typescript
// pricing-engine.ts

/**
 * Story 15.3: Vehicle category price multiplier rule
 */
export interface AppliedVehicleCategoryMultiplierRule {
  type: "VEHICLE_CATEGORY_MULTIPLIER";
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  multiplier: number;
  priceBeforeMultiplier: number;
  priceAfterMultiplier: number;
}

// Update AppliedRule union type
export type AppliedRule =
  | AppliedZoneRouteRule
  | AppliedExcursionPackageRule
  | AppliedDispoPackageRule
  | AppliedAdvancedRateRule
  | AppliedSeasonalMultiplierRule
  | AppliedZoneMultiplierRule
  | AppliedVehicleCategoryMultiplierRule // NEW
  | DynamicBaseCalculationRule;
```

### 2. Add VehicleCategoryInfo to PricingContext

```typescript
// pricing-engine.ts

export interface VehicleCategoryInfo {
  id: string;
  code: string;
  name: string;
  priceMultiplier: number;
}

export interface PricingContext {
  contact: ContactData;
  zones: ZoneData[];
  pricingSettings: OrganizationPricingSettings;
  advancedRates?: AdvancedRateData[];
  seasonalMultipliers?: SeasonalMultiplierData[];
  vehicleCategory?: VehicleCategoryInfo; // NEW
}
```

### 3. Apply Category Multiplier Function

```typescript
// pricing-engine.ts

/**
 * Story 15.3: Apply vehicle category price multiplier
 * Returns the multiplied price and an optional rule if multiplier != 1.0
 */
export function applyVehicleCategoryMultiplier(
  price: number,
  vehicleCategory: VehicleCategoryInfo | undefined
): {
  price: number;
  rule: AppliedVehicleCategoryMultiplierRule | null;
} {
  // No category info or neutral multiplier
  if (!vehicleCategory || vehicleCategory.priceMultiplier === 1.0) {
    return { price, rule: null };
  }

  const multiplier = vehicleCategory.priceMultiplier;
  const priceAfterMultiplier = Math.round(price * multiplier * 100) / 100;

  const rule: AppliedVehicleCategoryMultiplierRule = {
    type: "VEHICLE_CATEGORY_MULTIPLIER",
    categoryId: vehicleCategory.id,
    categoryCode: vehicleCategory.code,
    categoryName: vehicleCategory.name,
    multiplier,
    priceBeforeMultiplier: price,
    priceAfterMultiplier,
  };

  return { price: priceAfterMultiplier, rule };
}
```

### 4. Update buildDynamicResult

```typescript
// In buildDynamicResult() function

// After calculating base price, before zone multiplier:
const { price: priceAfterCategory, rule: categoryRule } =
  applyVehicleCategoryMultiplier(basePrice, context.vehicleCategory);

if (categoryRule) {
  appliedRules.push(categoryRule);
}

// Then apply zone multiplier to priceAfterCategory
const { price: priceAfterZone, rule: zoneRule } =
  applyZoneMultiplier(priceAfterCategory, ...);
```

### 5. Update pricing-calculate.ts

```typescript
// Load vehicle category with priceMultiplier (already done in 15.2)
const vehicleCategory = await db.vehicleCategory.findFirst({
  where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
  select: {
    id: true,
    code: true,
    name: true,
    priceMultiplier: true,
    averageConsumptionL100km: true,
  },
});

// Pass to calculatePrice
const result = calculatePrice(pricingRequest, {
  contact,
  zones,
  pricingSettings: effectivePricingSettings,
  advancedRates,
  seasonalMultipliers,
  vehicleCategory: vehicleCategory
    ? {
        id: vehicleCategory.id,
        code: vehicleCategory.code,
        name: vehicleCategory.name,
        priceMultiplier: Number(vehicleCategory.priceMultiplier),
      }
    : undefined,
});
```

---

## Test Cases

### Unit Tests

```typescript
// packages/api/src/services/__tests__/category-multiplier.test.ts

describe("applyVehicleCategoryMultiplier", () => {
  it("should apply 2.5× multiplier for Autocar", () => {
    const category = {
      id: "1",
      code: "AUTOCAR",
      name: "Autocar",
      priceMultiplier: 2.5,
    };
    const result = applyVehicleCategoryMultiplier(100, category);
    expect(result.price).toBe(250);
    expect(result.rule?.type).toBe("VEHICLE_CATEGORY_MULTIPLIER");
    expect(result.rule?.multiplier).toBe(2.5);
  });

  it("should not add rule for 1.0× multiplier", () => {
    const category = {
      id: "1",
      code: "BERLINE",
      name: "Berline",
      priceMultiplier: 1.0,
    };
    const result = applyVehicleCategoryMultiplier(100, category);
    expect(result.price).toBe(100);
    expect(result.rule).toBeNull();
  });

  it("should handle undefined category", () => {
    const result = applyVehicleCategoryMultiplier(100, undefined);
    expect(result.price).toBe(100);
    expect(result.rule).toBeNull();
  });

  it("should round to 2 decimal places", () => {
    const category = {
      id: "1",
      code: "VAN",
      name: "Van",
      priceMultiplier: 1.333,
    };
    const result = applyVehicleCategoryMultiplier(100, category);
    expect(result.price).toBe(133.3);
  });
});
```

### Integration Tests (Curl)

```bash
# Test 1: Autocar with 2.5× multiplier
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "...",
    "pickup": { "lat": 48.8566, "lng": 2.3522 },
    "dropoff": { "lat": 48.9566, "lng": 2.4522 },
    "vehicleCategoryId": "AUTOCAR_ID",
    "tripType": "transfer",
    "estimatedDistanceKm": 50,
    "estimatedDurationMinutes": 60
  }'

# Expected:
# - appliedRules contains VEHICLE_CATEGORY_MULTIPLIER with multiplier: 2.5
# - Price is 2.5× higher than Berline for same route

# Test 2: Berline with 1.0× multiplier (no rule added)
# Expected: No VEHICLE_CATEGORY_MULTIPLIER in appliedRules
```

---

## Files to Modify/Create

| File                                                              | Action | Description                                        |
| ----------------------------------------------------------------- | ------ | -------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                     | Modify | Add types, applyVehicleCategoryMultiplier function |
| `packages/api/src/routes/vtc/pricing-calculate.ts`                | Modify | Pass vehicleCategory to calculatePrice             |
| `packages/api/src/services/__tests__/category-multiplier.test.ts` | Create | Unit tests                                         |

---

## Definition of Done

- [ ] AppliedVehicleCategoryMultiplierRule type added
- [ ] VehicleCategoryInfo interface added
- [ ] applyVehicleCategoryMultiplier() function implemented
- [ ] buildDynamicResult() updated to apply category multiplier
- [ ] pricing-calculate.ts passes vehicleCategory to engine
- [ ] Unit tests passing (>90% coverage)
- [ ] Integration tests passing
- [ ] FIXED_GRID pricing not affected
- [ ] No regression in existing pricing tests
- [ ] Code reviewed and approved

---

## Related Documentation

- [PRD FR60: Vehicle category multipliers](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 15.2: Vehicle-specific fuel consumption](./15-2-vehicle-specific-fuel-consumption.md)
- [Story 11.3: Zone multiplier logic](./11-3-zone-multiplier-logic.md)
