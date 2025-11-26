# Story 3.5: Fallback to Dynamic Pricing When No Grid Match Exists

Status: done
Completed: 2025-01-14
Branch: feature/3-5-fallback-dynamic-pricing
Commit: e2269a1

## Story

**As an** operator,  
**I want** the system to automatically fall back to dynamic pricing when no grid applies,  
**So that** I can still quote off-grid scenarios without manual calculations.

## Acceptance Criteria

### AC1: Grid Search Details in appliedRules

- **Given** a partner contact where no ZoneRoute matches the requested itinerary
- **When** the pricing engine runs
- **Then** the `appliedRules` includes a `GRID_SEARCH_ATTEMPTED` entry listing all routes checked and why each failed to match

### AC2: Excursion Search Details

- **Given** a partner contact where no ExcursionPackage matches
- **When** the pricing engine runs for an excursion trip
- **Then** the `appliedRules` includes details about which excursion packages were checked and why they didn't match

### AC3: Private Client Clear Indication

- **Given** a private (non-partner) contact
- **When** the pricing engine runs
- **Then** the `appliedRules` clearly indicates `PRIVATE_CLIENT` as the reason for dynamic pricing, without attempting grid search

### AC4: Human-Readable Fallback Reason

- **Given** any fallback to dynamic pricing
- **When** the response is returned
- **Then** it includes a human-readable `fallbackReason` field summarizing why dynamic pricing was used

### AC5: Intra-Zone Central Scenario

- **Given** the Intra-Zone Central scenario (Paris → Paris within same zone)
- **When** tested with a partner having an intra-zone flat rate
- **Then** the pricing engine correctly matches the intra-zone route (same fromZone and toZone)

### AC6: Radial Transfer Scenario

- **Given** the Radial Transfer scenario (Paris ↔ CDG)
- **When** tested with a partner having a Paris-CDG route
- **Then** the pricing engine correctly matches in both directions (bidirectional)

### AC7: Circular Suburban Scenario

- **Given** the Circular Suburban scenario (Suburb A → Suburb B, both outside Paris)
- **When** tested with a partner without suburban routes
- **Then** the pricing engine falls back to dynamic with clear explanation

## Technical Tasks

### Task 1: Enhance Pricing Engine - Search Details

- [x] Add `GridSearchDetails` type to pricing-engine.ts
- [x] Implement `matchZoneRouteWithDetails()`, `matchExcursionPackageWithDetails()`, `matchDispoPackageWithDetails()` functions
- [x] Track each route/excursion/dispo checked with rejection reason
- [x] Add rejection reason type: `ZONE_MISMATCH`, `CATEGORY_MISMATCH`, `DIRECTION_MISMATCH`, `INACTIVE`

### Task 2: Add Fallback Reason Field

- [x] Add `FallbackReason` type
- [x] Add `fallbackReason` field to `PricingResult` interface
- [x] Add `gridSearchDetails` field to `PricingResult` interface
- [x] Update all fallback paths to set appropriate reason

### Task 3: Update API Response

- [x] `PricingResult` now includes `fallbackReason` and `gridSearchDetails`
- [x] Include enhanced `appliedRules` with `GRID_SEARCH_ATTEMPTED` type
- [x] Backward compatible (new fields are additive)

### Task 4: PRD Scenario Tests

- [x] Vitest: Intra-Zone Central scenario test
- [x] Vitest: Radial Transfer bidirectional test
- [x] Vitest: Circular Suburban fallback test
- [x] Vitest: Versailles exception test
- [x] Vitest: Search details structure validation
- [x] Vitest: Rejection reasons (CATEGORY_MISMATCH, DIRECTION_MISMATCH, INACTIVE)

### Task 5: Integration Tests

- [x] Unit tests cover all scenarios (45 tests passing)

## Data Types

### FallbackReason Enum

```typescript
export type FallbackReason =
  | "PRIVATE_CLIENT" // Contact is not a partner
  | "NO_CONTRACT" // Partner has no active contract
  | "NO_ZONE_MATCH" // Pickup or dropoff not in any configured zone
  | "NO_ROUTE_MATCH" // No route matches zone pair + vehicle category
  | "NO_EXCURSION_MATCH" // No excursion package matches
  | "NO_DISPO_MATCH" // No dispo package matches
  | null; // Not a fallback (grid matched)
```

### GridSearchDetails Type

```typescript
export interface GridSearchDetails {
  pickupZone: { id: string; name: string; code: string } | null;
  dropoffZone: { id: string; name: string; code: string } | null;
  vehicleCategoryId: string;
  tripType: TripType;
  routesChecked: RouteCheckResult[];
  excursionsChecked: ExcursionCheckResult[];
  disposChecked: DispoCheckResult[];
}

export interface RouteCheckResult {
  routeId: string;
  routeName: string;
  fromZone: string;
  toZone: string;
  vehicleCategory: string;
  rejectionReason: RejectionReason;
}

export type RejectionReason =
  | "ZONE_MISMATCH"
  | "CATEGORY_MISMATCH"
  | "DIRECTION_MISMATCH"
  | "INACTIVE";
```

### Enhanced PricingResult

```typescript
export interface PricingResult {
  pricingMode: PricingMode;
  price: number;
  currency: "EUR";
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityIndicator;
  matchedGrid: MatchedGrid | null;
  appliedRules: AppliedRule[];
  isContractPrice: boolean;
  // NEW FIELDS
  fallbackReason: FallbackReason;
  gridSearchDetails?: GridSearchDetails;
}
```

## API Contract

### POST /api/vtc/pricing/calculate

Response (Fallback with Search Details):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 125.0,
  "currency": "EUR",
  "internalCost": 75.0,
  "margin": 50.0,
  "marginPercent": 40.0,
  "profitabilityIndicator": "green",
  "matchedGrid": null,
  "fallbackReason": "NO_ROUTE_MATCH",
  "gridSearchDetails": {
    "pickupZone": {
      "id": "zone-paris",
      "name": "Paris Center",
      "code": "PAR-CTR"
    },
    "dropoffZone": {
      "id": "zone-versailles",
      "name": "Versailles",
      "code": "VERS"
    },
    "vehicleCategoryId": "vehicle-cat-1",
    "tripType": "transfer",
    "routesChecked": [
      {
        "routeId": "route-1",
        "routeName": "Paris → CDG",
        "fromZone": "Paris Center",
        "toZone": "CDG Airport",
        "vehicleCategory": "Berline",
        "rejectionReason": "ZONE_MISMATCH"
      },
      {
        "routeId": "route-2",
        "routeName": "Paris → Orly",
        "fromZone": "Paris Center",
        "toZone": "Orly Airport",
        "vehicleCategory": "Berline",
        "rejectionReason": "ZONE_MISMATCH"
      }
    ],
    "excursionsChecked": [],
    "disposChecked": []
  },
  "appliedRules": [
    {
      "type": "ZONE_MAPPING",
      "description": "Mapped coordinates to zones",
      "pickupZone": "Paris Center",
      "dropoffZone": "Versailles"
    },
    {
      "type": "GRID_SEARCH_ATTEMPTED",
      "description": "Searched 2 routes in partner contract, none matched",
      "routesChecked": 2,
      "excursionsChecked": 0,
      "disposChecked": 0
    },
    {
      "type": "NO_GRID_MATCH",
      "description": "No matching grid found for partner, using dynamic pricing",
      "reason": "NO_ROUTE_MATCH"
    },
    {
      "type": "DYNAMIC_BASE_PRICE",
      "description": "Base price from distance/duration",
      "distanceKm": 30,
      "durationMinutes": 45
    }
  ],
  "isContractPrice": false
}
```

Response (Private Client):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 130.0,
  "currency": "EUR",
  "fallbackReason": "PRIVATE_CLIENT",
  "gridSearchDetails": null,
  "appliedRules": [
    {
      "type": "PRIVATE_CLIENT",
      "description": "Private client - grid matching skipped"
    },
    {
      "type": "DYNAMIC_BASE_PRICE",
      "description": "Base price from distance/duration"
    }
  ],
  "isContractPrice": false
}
```

## Test Scenarios

### Scenario 1: Intra-Zone Central (Paris → Paris)

```typescript
// Partner with intra-zone route (fromZone === toZone)
const intraZoneRoute = {
  fromZoneId: "zone-paris",
  toZoneId: "zone-paris", // Same zone
  fixedPrice: 45.0,
  direction: "BIDIRECTIONAL",
};

// Request: pickup and dropoff both in Paris
const request = {
  pickup: { lat: 48.8566, lng: 2.3522 }, // Paris center
  dropoff: { lat: 48.8606, lng: 2.3376 }, // Paris center
  vehicleCategoryId: "vehicle-cat-1",
  tripType: "transfer",
};

// Expected: FIXED_GRID with intra-zone price
expect(result.pricingMode).toBe("FIXED_GRID");
expect(result.price).toBe(45.0);
```

### Scenario 2: Radial Transfer (Paris ↔ CDG)

```typescript
// Partner with bidirectional Paris-CDG route
const radialRoute = {
  fromZoneId: "zone-paris",
  toZoneId: "zone-cdg",
  fixedPrice: 75.0,
  direction: "BIDIRECTIONAL",
};

// Test A→B direction
const requestAtoB = {
  pickup: { lat: 48.8566, lng: 2.3522 }, // Paris
  dropoff: { lat: 49.0097, lng: 2.5479 }, // CDG
};
expect(resultAtoB.pricingMode).toBe("FIXED_GRID");

// Test B→A direction (should also match)
const requestBtoA = {
  pickup: { lat: 49.0097, lng: 2.5479 }, // CDG
  dropoff: { lat: 48.8566, lng: 2.3522 }, // Paris
};
expect(resultBtoA.pricingMode).toBe("FIXED_GRID");
```

### Scenario 3: Circular Suburban (Suburb A → Suburb B)

```typescript
// Partner with only Paris-CDG route (no suburban routes)
// Request: Suburb to Suburb (neither in Paris nor CDG)
const request = {
  pickup: { lat: 48.95, lng: 2.25 }, // Suburb A (e.g., Argenteuil)
  dropoff: { lat: 48.9, lng: 2.45 }, // Suburb B (e.g., Bobigny)
  vehicleCategoryId: "vehicle-cat-1",
  tripType: "transfer",
};

// Expected: DYNAMIC with clear fallback reason
expect(result.pricingMode).toBe("DYNAMIC");
expect(result.fallbackReason).toBe("NO_ZONE_MATCH"); // or NO_ROUTE_MATCH
expect(result.gridSearchDetails).toBeDefined();
```

### Scenario 4: Versailles Exception

```typescript
// Partner with specific Paris-Versailles route
const versaillesRoute = {
  fromZoneId: "zone-paris",
  toZoneId: "zone-versailles",
  fixedPrice: 95.0,
  direction: "BIDIRECTIONAL",
};

// Request: Paris to Versailles
const request = {
  pickup: { lat: 48.8566, lng: 2.3522 }, // Paris
  dropoff: { lat: 48.8049, lng: 2.1204 }, // Versailles
};

// Expected: FIXED_GRID with Versailles route price
expect(result.pricingMode).toBe("FIXED_GRID");
expect(result.price).toBe(95.0);
```

## Dependencies

- Story 3.4: Apply Engagement Rule for Partner Grid Trips ✅ Done
- Story 3.2: Implement ZoneRoute Model & Grid Routes Editor ✅ Done
- Story 3.3: Implement Excursion & Dispo Forfait Configuration ✅ Done

## Files to Modify

### Modified Files

- `packages/api/src/services/pricing-engine.ts` - Add search details and fallback reason
- `packages/api/src/routes/vtc/pricing-calculate.ts` - Update response to include new fields
- `packages/api/src/services/__tests__/pricing-engine.test.ts` - Add PRD scenario tests

## Dev Notes

- The pricing engine already handles fallback; this story enhances transparency
- Search details should be collected during the matching process, not as a separate pass
- Fallback reason should be human-readable for operator display
- Keep the API response backward-compatible (new fields are additive)
- Log search details at DEBUG level for troubleshooting

## Related PRD Sections

- **FR7:** Dual pricing modes (Method 1 = FIXED_GRID, Method 2 = DYNAMIC)
- **FR12-FR16:** Dynamic pricing calculation rules
- **Appendix A:** Zoning Engine scenarios (Intra-Zone, Radial, Circular Suburban, Versailles)
