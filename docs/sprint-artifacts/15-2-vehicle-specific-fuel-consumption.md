# Story 15.2 – Use Vehicle-Specific Fuel Consumption in All Pricing Paths

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** ✅ Done  
**Priority:** High  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 4.2 (Operational cost components), Story 15.1 (Toll integration)

---

## User Story

**As a** pricing engine,  
**I want** to always use the vehicle category's specific fuel consumption rate when calculating costs,  
**So that** fuel costs are accurate for each vehicle type (Berline 5.5L vs Autocar 18L).

---

## Problem Statement

### Current Behavior

The pricing engine uses a fixed default consumption for all vehicles:

```typescript
// pricing-engine.ts
export const DEFAULT_COST_PARAMETERS = {
  fuelConsumptionL100km: 8.0, // Fixed for ALL vehicles
  // ...
};
```

### Impact Example

| Vehicle     | Real Consumption | Current Calc | Correct Calc | Error |
| ----------- | ---------------- | ------------ | ------------ | ----- |
| Berline     | 5.5 L/100km      | 8.0 L        | 5.5 L        | +45%  |
| Van Premium | 8.5 L/100km      | 8.0 L        | 8.5 L        | -6%   |
| Minibus     | 12.0 L/100km     | 8.0 L        | 12.0 L       | -33%  |
| Autocar     | 18.0 L/100km     | 8.0 L        | 18.0 L       | -56%  |

For a 100km trip at 1.789€/L with Autocar:

- **Current:** 8.0L × 1.789€ = **14.31€** ❌
- **Correct:** 18.0L × 1.789€ = **32.20€** ✅
- **Error:** 125% underestimation!

---

## Solution Design

### Fallback Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fuel Consumption Resolution                   │
│                                                                  │
│  1. Vehicle.consumptionLPer100Km (if vehicle selected)          │
│     │                                                            │
│     ▼ (null?)                                                    │
│  2. VehicleCategory.averageConsumptionL100km                    │
│     │                                                            │
│     ▼ (null?)                                                    │
│  3. OrganizationPricingSettings.fuelConsumptionL100km           │
│     │                                                            │
│     ▼ (null?)                                                    │
│  4. DEFAULT_COST_PARAMETERS.fuelConsumptionL100km (8.0)         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    pricing-calculate.ts                          │
│                                                                  │
│  1. Load vehicleCategory (already done)                         │
│  2. Extract averageConsumptionL100km                            │
│  3. Pass to pricingSettings                                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ pricingSettings.fuelConsumptionL100km =                  │   │
│  │   vehicleCategory.averageConsumptionL100km               │   │
│  │   ?? orgSettings.fuelConsumptionL100km                   │   │
│  │   ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  4. calculatePrice() uses correct consumption                   │
│  5. tripAnalysis includes fuelConsumptionSource                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC1: Category Consumption Used for Autocar

**Given** a quote for vehicle category "Autocar" with `averageConsumptionL100km = 18`  
**When** the pricing engine calculates fuel cost for a 100km trip at 1.789€/L  
**Then** it uses 18L × 1.789€ = 32.20€  
**And** NOT the default 8.0L × 1.789€ = 14.31€

### AC2: Category Consumption Without Vehicle Selection

**Given** a quote with `enableVehicleSelection = false`  
**When** the pricing engine calculates fuel cost  
**Then** it looks up `averageConsumptionL100km` from the selected VehicleCategory

### AC3: Fallback to Organization Settings

**Given** a VehicleCategory without `averageConsumptionL100km` set (null)  
**When** the pricing engine calculates fuel cost  
**Then** it falls back to `OrganizationPricingSettings.fuelConsumptionL100km`

### AC4: Vehicle-Specific Takes Priority

**Given** `enableVehicleSelection = true` with a selected vehicle  
**When** the vehicle has `consumptionLPer100Km` set  
**Then** it uses the vehicle-specific value (existing behavior preserved)

### AC5: Consumption Source Transparency

**Given** a successful pricing calculation  
**When** the tripAnalysis is generated  
**Then** it includes `fuelConsumptionSource: "VEHICLE" | "CATEGORY" | "ORGANIZATION" | "DEFAULT"`

---

## Technical Implementation

### 1. Database Schema Changes

```prisma
// Add to VehicleCategory model in schema.prisma

model VehicleCategory {
  // ... existing fields ...

  // Story 15.2: Average fuel consumption for this category
  averageConsumptionL100km Decimal? @db.Decimal(5, 2)

  // ... rest of model ...
}
```

### 2. Migration with Default Values

```sql
-- Migration: add_average_consumption_to_vehicle_category

ALTER TABLE vehicle_category
ADD COLUMN "averageConsumptionL100km" DECIMAL(5,2);

-- Set default values based on category code
UPDATE vehicle_category SET "averageConsumptionL100km" = 5.5 WHERE code = 'BERLINE';
UPDATE vehicle_category SET "averageConsumptionL100km" = 8.5 WHERE code = 'VAN_PREMIUM';
UPDATE vehicle_category SET "averageConsumptionL100km" = 12.0 WHERE code = 'MINIBUS';
UPDATE vehicle_category SET "averageConsumptionL100km" = 18.0 WHERE code = 'AUTOCAR';
UPDATE vehicle_category SET "averageConsumptionL100km" = 9.0 WHERE code = 'LUXE';
```

### 3. Update TripAnalysis Type

```typescript
// pricing-engine.ts

export type FuelConsumptionSource =
  | "VEHICLE"
  | "CATEGORY"
  | "ORGANIZATION"
  | "DEFAULT";

export interface TripAnalysis {
  // ... existing fields ...

  // Story 15.2: Fuel consumption source for transparency
  fuelConsumptionSource?: FuelConsumptionSource;
  fuelConsumptionL100km?: number;
}
```

### 4. Update FuelCostComponent

```typescript
// pricing-engine.ts

export interface FuelCostComponent {
  amount: number;
  distanceKm: number;
  litresUsed: number;
  fuelConsumptionL100km: number;
  fuelPricePerLiter: number;
  // Story 15.2: Track consumption source
  consumptionSource?: FuelConsumptionSource;
}
```

### 5. Resolve Fuel Consumption Function

```typescript
// pricing-engine.ts

export interface FuelConsumptionResolution {
  consumptionL100km: number;
  source: FuelConsumptionSource;
}

export function resolveFuelConsumption(
  vehicleConsumption: number | null | undefined,
  categoryConsumption: number | null | undefined,
  orgConsumption: number | null | undefined
): FuelConsumptionResolution {
  if (vehicleConsumption != null && vehicleConsumption > 0) {
    return { consumptionL100km: vehicleConsumption, source: "VEHICLE" };
  }
  if (categoryConsumption != null && categoryConsumption > 0) {
    return { consumptionL100km: categoryConsumption, source: "CATEGORY" };
  }
  if (orgConsumption != null && orgConsumption > 0) {
    return { consumptionL100km: orgConsumption, source: "ORGANIZATION" };
  }
  return {
    consumptionL100km: DEFAULT_COST_PARAMETERS.fuelConsumptionL100km,
    source: "DEFAULT",
  };
}
```

### 6. Update pricing-calculate.ts

```typescript
// Load vehicle category with consumption
const vehicleCategory = await db.vehicleCategory.findFirst({
  where: withTenantFilter({ id: data.vehicleCategoryId }, organizationId),
  select: {
    id: true,
    code: true,
    name: true,
    priceMultiplier: true,
    averageConsumptionL100km: true, // Story 15.2
  },
});

// Resolve fuel consumption with fallback chain
const fuelResolution = resolveFuelConsumption(
  null, // No vehicle selected in this path
  vehicleCategory?.averageConsumptionL100km
    ? Number(vehicleCategory.averageConsumptionL100km)
    : null,
  pricingSettings.fuelConsumptionL100km
);

// Update pricing settings with resolved consumption
const effectivePricingSettings = {
  ...pricingSettings,
  fuelConsumptionL100km: fuelResolution.consumptionL100km,
};

// ... pass effectivePricingSettings to calculatePrice() ...

// Add consumption source to tripAnalysis
result.tripAnalysis.fuelConsumptionSource = fuelResolution.source;
result.tripAnalysis.fuelConsumptionL100km = fuelResolution.consumptionL100km;
```

---

## Test Cases

### Unit Tests

```typescript
// packages/api/src/services/__tests__/fuel-consumption.test.ts

describe("resolveFuelConsumption", () => {
  it("should use vehicle consumption when available", () => {
    const result = resolveFuelConsumption(7.0, 18.0, 8.0);
    expect(result.consumptionL100km).toBe(7.0);
    expect(result.source).toBe("VEHICLE");
  });

  it("should use category consumption when vehicle is null", () => {
    const result = resolveFuelConsumption(null, 18.0, 8.0);
    expect(result.consumptionL100km).toBe(18.0);
    expect(result.source).toBe("CATEGORY");
  });

  it("should use org consumption when category is null", () => {
    const result = resolveFuelConsumption(null, null, 10.0);
    expect(result.consumptionL100km).toBe(10.0);
    expect(result.source).toBe("ORGANIZATION");
  });

  it("should use default when all are null", () => {
    const result = resolveFuelConsumption(null, null, null);
    expect(result.consumptionL100km).toBe(8.0);
    expect(result.source).toBe("DEFAULT");
  });

  it("should skip zero values", () => {
    const result = resolveFuelConsumption(0, 0, 10.0);
    expect(result.consumptionL100km).toBe(10.0);
    expect(result.source).toBe("ORGANIZATION");
  });
});
```

### Integration Tests (Curl)

```bash
# Test 1: Autocar category (18 L/100km)
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "...",
    "pickup": { "lat": 48.8566, "lng": 2.3522 },
    "dropoff": { "lat": 48.9566, "lng": 2.4522 },
    "vehicleCategoryId": "AUTOCAR_ID",
    "tripType": "transfer",
    "estimatedDistanceKm": 100,
    "estimatedDurationMinutes": 90
  }'

# Expected:
# - tripAnalysis.costBreakdown.fuel.fuelConsumptionL100km = 18
# - tripAnalysis.fuelConsumptionSource = "CATEGORY"
# - tripAnalysis.costBreakdown.fuel.amount ≈ 32€

# Test 2: Berline category (5.5 L/100km)
# Expected: fuel.amount ≈ 9.84€, source = "CATEGORY"
```

---

## Files to Modify/Create

| File                                                           | Action | Description                                                       |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma`                       | Modify | Add averageConsumptionL100km to VehicleCategory                   |
| `packages/api/src/services/pricing-engine.ts`                  | Modify | Add FuelConsumptionSource, resolveFuelConsumption(), update types |
| `packages/api/src/routes/vtc/pricing-calculate.ts`             | Modify | Load category consumption, pass to engine                         |
| `packages/database/prisma/seed-vtc-complete.ts`                | Modify | Add consumption values to seed data                               |
| `packages/api/src/services/__tests__/fuel-consumption.test.ts` | Create | Unit tests                                                        |

---

## Definition of Done

- [x] averageConsumptionL100km added to VehicleCategory schema
- [x] Migration created with default values per category
- [x] resolveFuelConsumption() function implemented
- [x] pricing-calculate.ts loads and passes category consumption
- [x] FuelConsumptionSource added to TripAnalysis
- [x] Unit tests passing (22 tests, 100% coverage)
- [x] Integration tests passing
- [x] Seed data updated with consumption values
- [x] No regression in existing pricing tests
- [x] Code reviewed and approved

---

## Implementation Summary (Completed 2025-12-02)

### Git

- **Branch:** `feature/15-2-vehicle-specific-fuel-consumption`
- **Commit:** `fc90d8f` - feat(15.2): Use vehicle-specific fuel consumption in all pricing paths

### Files Modified/Created

| File                                                                       | Action   | Lines |
| -------------------------------------------------------------------------- | -------- | ----- |
| `packages/database/prisma/schema.prisma`                                   | Modified | +3    |
| `packages/api/src/services/pricing-engine.ts`                              | Modified | +55   |
| `packages/api/src/routes/vtc/pricing-calculate.ts`                         | Modified | +20   |
| `packages/database/prisma/seed-vtc-complete.ts`                            | Modified | +12   |
| `packages/api/src/services/__tests__/fuel-consumption.test.ts`             | Created  | +175  |
| `docs/sprint-artifacts/15-2-vehicle-specific-fuel-consumption.context.xml` | Created  | +197  |

### Test Results

- **Vitest:** 22 tests passing (100%)
- **Coverage:** Fallback chain, real-world scenarios, cost calculation impact
- **No regressions** in existing pricing tests

---

## Related Documentation

- [PRD FR14: Fuel cost component](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 15.1: Google Routes API for Tolls](./15-1-integrate-google-routes-api-real-toll-costs.md)
