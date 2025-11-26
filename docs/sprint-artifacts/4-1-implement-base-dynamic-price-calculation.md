# Story 4.1: Implement Base Dynamic Price Calculation

Status: done
Completed: 2025-11-26
Branch: feature/4-1-dynamic-base-price-calculation

## Story

**As a** pricing engineer,  
**I want** a base dynamic price computed from distance and duration,  
**So that** dynamic quotes are grounded in physical trip characteristics.

## Acceptance Criteria

### AC1: Distance-Based Price Wins

- **Given** an organisation with OrganizationPricingSettings (baseRatePerKm=2.5, baseRatePerHour=45)
- **When** a dynamic quote is calculated for a 30km, 45min trip
- **Then** the basePrice = max(30×2.5, 0.75×45) = max(75, 33.75) = 75 EUR

### AC2: Duration-Based Price Wins

- **Given** a trip where duration-based price exceeds distance-based price
- **When** a dynamic quote is calculated for a 10km, 2h trip (traffic)
- **Then** the basePrice = max(10×2.5, 2×45) = max(25, 90) = 90 EUR

### AC3: Applied Rules Documentation

- **Given** a dynamic quote calculation
- **When** the result is returned
- **Then** appliedRules includes a `DYNAMIC_BASE_CALCULATION` entry with:
  - distanceKm, durationMinutes
  - baseRatePerKm, baseRatePerHour
  - distanceBasedPrice, durationBasedPrice
  - selectedMethod ("distance" or "duration")
  - basePrice

### AC4: Default Rates Fallback

- **Given** an organisation without OrganizationPricingSettings
- **When** a dynamic quote is calculated
- **Then** default rates are used (baseRatePerKm=2.5, baseRatePerHour=45) and a warning is logged

### AC5: Missing Routing Data Error

- **Given** a pricing request without distance/duration data
- **When** the pricing engine runs
- **Then** it returns an error with code `MISSING_ROUTING_DATA` and a clear message

## Technical Tasks

### Task 1: Update PricingRequest Type

- [x] Add `distanceKm?: number` to PricingRequest (existing as `estimatedDistanceKm`)
- [x] Add `durationMinutes?: number` to PricingRequest (existing as `estimatedDurationMinutes`)
- [x] Update API validation schema (already supports these fields)

### Task 2: Implement PRD Formula

- [x] Create `calculateDynamicBasePrice()` function
- [x] Implement `max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)`
- [x] Return both prices and selected method via `DynamicBaseCalculationResult`

### Task 3: Fetch OrganizationPricingSettings

- [x] Settings passed via `PricingEngineContext`
- [x] Implement default values fallback via `DEFAULT_PRICING_SETTINGS`
- [x] Add `usingDefaultSettings` flag in appliedRules

### Task 4: Enhance Applied Rules

- [x] Add `DYNAMIC_BASE_CALCULATION` rule type
- [x] Include all inputs and calculation details
- [x] Replace old `DYNAMIC_BASE_PRICE` rule

### Task 5: Update Pricing Engine

- [x] Integrate new calculation in `buildDynamicResult()`
- [x] Backward compatible (existing API unchanged)
- [x] Full calculation details in appliedRules

### Task 6: Update API Endpoint

- [x] API already accepts `estimatedDistanceKm` and `estimatedDurationMinutes`
- [x] Response includes enhanced `appliedRules` with `DYNAMIC_BASE_CALCULATION`

### Task 7: Unit Tests

- [x] Test distance-based price wins scenario (AC1)
- [x] Test duration-based price wins scenario (AC2)
- [x] Test default rates fallback (AC4)
- [x] Test appliedRules structure (AC3)
- [x] Test edge cases (equal prices, short trips, long trips)

### Task 8: Update Translations

- [x] Not needed - rule descriptions are in code

## Data Types

### Updated PricingRequest

```typescript
export interface PricingRequest {
  organizationId: string;
  contactId?: string;
  tripType: TripType;
  vehicleCategoryId: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  // NEW: Routing data
  distanceKm?: number;
  durationMinutes?: number;
}
```

### DynamicBaseCalculation Result

```typescript
interface DynamicBaseCalculationResult {
  distanceBasedPrice: number;
  durationBasedPrice: number;
  selectedMethod: "distance" | "duration";
  basePrice: number;
  inputs: {
    distanceKm: number;
    durationMinutes: number;
    baseRatePerKm: number;
    baseRatePerHour: number;
  };
}
```

### Enhanced AppliedRule

```typescript
interface DynamicBaseCalculationRule {
  type: "DYNAMIC_BASE_CALCULATION";
  description: string;
  inputs: {
    distanceKm: number;
    durationMinutes: number;
    baseRatePerKm: number;
    baseRatePerHour: number;
  };
  calculation: {
    distanceBasedPrice: number;
    durationBasedPrice: number;
    selectedMethod: "distance" | "duration";
    basePrice: number;
  };
}
```

## API Contract

### POST /api/vtc/pricing/calculate

Request (updated):

```json
{
  "contactId": "contact-123",
  "tripType": "transfer",
  "vehicleCategoryId": "cat-berline",
  "pickup": { "lat": 48.8566, "lng": 2.3522 },
  "dropoff": { "lat": 49.0097, "lng": 2.5479 },
  "distanceKm": 30,
  "durationMinutes": 45
}
```

Response (dynamic pricing):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 75.0,
  "currency": "EUR",
  "internalCost": 45.0,
  "margin": 30.0,
  "marginPercent": 40.0,
  "profitabilityIndicator": "green",
  "matchedGrid": null,
  "fallbackReason": "NO_ROUTE_MATCH",
  "appliedRules": [
    {
      "type": "ZONE_MAPPING",
      "description": "Mapped coordinates to zones",
      "pickupZone": "Paris Center",
      "dropoffZone": "CDG Airport"
    },
    {
      "type": "GRID_SEARCH_ATTEMPTED",
      "description": "Searched 3 routes in partner contract, none matched",
      "routesChecked": 3
    },
    {
      "type": "DYNAMIC_BASE_CALCULATION",
      "description": "Base price calculated using max(distance, duration) formula",
      "inputs": {
        "distanceKm": 30,
        "durationMinutes": 45,
        "baseRatePerKm": 2.5,
        "baseRatePerHour": 45.0
      },
      "calculation": {
        "distanceBasedPrice": 75.0,
        "durationBasedPrice": 33.75,
        "selectedMethod": "distance",
        "basePrice": 75.0
      }
    }
  ],
  "isContractPrice": false
}
```

Error Response (missing routing data):

```json
{
  "error": {
    "code": "MISSING_ROUTING_DATA",
    "message": "Distance and duration are required for dynamic pricing calculation"
  }
}
```

## Test Scenarios

### Scenario 1: Distance-Based Price Wins

```typescript
const request = {
  distanceKm: 30,
  durationMinutes: 45,
  // ... other fields
};

const settings = {
  baseRatePerKm: 2.5,
  baseRatePerHour: 45.0,
};

// distanceBasedPrice = 30 × 2.5 = 75
// durationBasedPrice = 0.75 × 45 = 33.75
// basePrice = max(75, 33.75) = 75

expect(result.price).toBe(75);
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "DYNAMIC_BASE_CALCULATION",
    calculation: expect.objectContaining({
      selectedMethod: "distance",
      basePrice: 75,
    }),
  })
);
```

### Scenario 2: Duration-Based Price Wins (Traffic)

```typescript
const request = {
  distanceKm: 10,
  durationMinutes: 120, // 2 hours in traffic
  // ... other fields
};

// distanceBasedPrice = 10 × 2.5 = 25
// durationBasedPrice = 2 × 45 = 90
// basePrice = max(25, 90) = 90

expect(result.price).toBe(90);
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "DYNAMIC_BASE_CALCULATION",
    calculation: expect.objectContaining({
      selectedMethod: "duration",
      basePrice: 90,
    }),
  })
);
```

### Scenario 3: Default Rates Fallback

```typescript
// Organization without pricing settings
const result = await calculatePrice({
  organizationId: "org-no-settings",
  distanceKm: 20,
  durationMinutes: 30,
  // ... other fields
});

// Uses defaults: baseRatePerKm=2.5, baseRatePerHour=45
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "DYNAMIC_BASE_CALCULATION",
    inputs: expect.objectContaining({
      baseRatePerKm: 2.5,
      baseRatePerHour: 45.0,
    }),
  })
);
```

### Scenario 4: Missing Routing Data Error

```typescript
const request = {
  // No distanceKm or durationMinutes
  contactId: "contact-123",
  tripType: "transfer",
  // ...
};

// For dynamic pricing (no grid match), should return error
expect(result.error).toEqual({
  code: "MISSING_ROUTING_DATA",
  message: expect.stringContaining("Distance and duration are required"),
});
```

## Dependencies

- Story 1.1: Define VTC ERP Prisma Models ✅ Done
- Story 1.3: Implement EUR-Only Monetary Representation ✅ Done
- Story 3.5: Fallback to Dynamic Pricing ✅ Done

## Files to Create/Modify

### Modified Files

| File                                                         | Change                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Add calculateDynamicBasePrice(), update calculatePrice() |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Add distance/duration to request schema                  |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Add tests for dynamic base calculation                   |
| `packages/i18n/translations/en.json`                         | Add error messages                                       |
| `packages/i18n/translations/fr.json`                         | Add error messages                                       |

## Dev Notes

- The formula `max(distance, duration)` ensures minimum revenue for both traffic-heavy and highway trips
- Default rates (2.5€/km, 45€/h) are reasonable for Paris VTC market
- This is the foundation for Story 4.3 (multipliers) and Story 4.6 (shadow calculation)
- Distance/duration will eventually come from Google Maps API; for now, accept them as inputs
- Keep the calculation pure and deterministic for easy testing

## Related PRD Sections

- **FR7:** Dual pricing modes (Method 1 = FIXED_GRID, Method 2 = DYNAMIC)
- **FR12:** Base price from distance/duration
- **FR13:** max(distance, duration) formula
- **Appendix A Section 3:** Dynamic Calculation Algorithm
