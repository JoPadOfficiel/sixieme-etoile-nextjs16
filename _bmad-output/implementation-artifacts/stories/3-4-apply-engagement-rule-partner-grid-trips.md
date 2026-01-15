# Story 3.4: Apply Engagement Rule for Partner Grid Trips

Status: done

Completed: 2025-01-26
Branch: `feature/3-4-engagement-rule-partner-grid-pricing`
Commit: `75feb3f`

## Story

**As a** commercial manager,  
**I want** the Engagement Rule to guarantee contractual prices for partner grid trips,  
**So that** operators cannot accidentally override binding contracts.

## Acceptance Criteria

### AC1: ZoneRoute Matching for Partners ✅

- **Given** a partner contact with an attached contract that includes ZoneRoutes
- **When** a pricing request is made with pickup/dropoff coordinates that match a configured route
- **Then** the pricing engine returns `pricingMode = "FIXED_GRID"` and the price from the matching ZoneRoute

**Implementation:** `matchZoneRoute()` in `pricing-engine.ts` handles bidirectional and unidirectional routes.

### AC2: ExcursionPackage Matching for Partners ✅

- **Given** a partner contact with an attached contract that includes ExcursionPackages
- **When** a pricing request is made that matches an excursion (by zones and vehicle category)
- **Then** the pricing engine returns `pricingMode = "FIXED_GRID"` and the price from the matching ExcursionPackage

**Implementation:** `matchExcursionPackage()` matches origin/destination zones with vehicle category.

### AC3: DispoPackage Matching for Partners ✅

- **Given** a partner contact with an attached contract that includes DispoPackages
- **When** a pricing request is made for a "mise à disposition" matching a dispo package
- **Then** the pricing engine returns `pricingMode = "FIXED_GRID"` and the basePrice from the matching DispoPackage

**Implementation:** `matchDispoPackage()` matches by vehicle category for dispo trips.

### AC4: Engagement Rule - No Profitability Override ✅

- **Given** a matched grid price that results in negative margin (internal cost > selling price)
- **When** the pricing engine computes the result
- **Then** the grid price is still returned (not modified), and the profitability indicator shows "red" with the actual margin percentage

**Implementation:** Profitability indicator calculated but price never modified for partner contracts.

### AC5: Fallback to Dynamic for No Match ✅

- **Given** a partner contact where no grid match exists for the requested itinerary
- **When** the pricing engine runs
- **Then** it returns `pricingMode = "DYNAMIC"` and falls back to basic dynamic pricing

**Implementation:** `buildDynamicResult()` provides fallback with distance/duration-based pricing.

### AC6: Private Contacts Skip Grid Matching ✅

- **Given** a private (non-partner) contact
- **When** a pricing request is made
- **Then** the pricing engine skips grid matching entirely and returns `pricingMode = "DYNAMIC"`

**Implementation:** Early return in `calculatePrice()` when `contact.isPartner === false`.

### AC7: Applied Rules Transparency ✅

- **Given** any pricing result
- **When** the response is returned
- **Then** it includes an `appliedRules` array explaining the matching logic (grid ID, why matched, or why fallback)

**Implementation:** Every code path adds descriptive rules to `appliedRules[]` array.

## Technical Tasks

### Task 1: Geo Utilities - Point-in-Zone Detection ✅

- [x] Create `packages/api/src/lib/geo-utils.ts`
- [x] Implement `isPointInPolygon(point, polygon)` using ray casting algorithm
- [x] Implement `isPointInRadius(point, center, radiusKm)` using Haversine formula
- [x] Implement `findZoneForPoint(point, zones)` that checks all zones
- [x] Add unit tests for geo utilities (15 tests passing)

### Task 2: Pricing Engine Service ✅

- [x] Create `packages/api/src/services/pricing-engine.ts`
- [x] Implement `calculatePrice(request)` main function
- [x] Implement `matchZoneRoute(fromZone, toZone, vehicleCategoryId, contractRoutes)`
- [x] Implement `matchExcursionPackage(originZone, destZone, vehicleCategoryId, contractExcursions)`
- [x] Implement `matchDispoPackage(vehicleCategoryId, contractDispos)`
- [x] Implement profitability calculation (basic: margin = price - estimatedCost)
- [x] Return structured response with appliedRules

### Task 3: API Route - Calculate Pricing ✅

- [x] Create `packages/api/src/routes/vtc/pricing-calculate.ts`
- [x] Implement POST `/api/vtc/pricing/calculate` endpoint
- [x] Validate request schema (contactId, pickup, dropoff, vehicleCategoryId, tripType)
- [x] Load contact with partner contract and assigned grids
- [x] Call pricing engine service
- [x] Return pricing result with mode, price, profitability, appliedRules
- [x] Add to VTC router

### Task 4: Tests ✅

- [x] Vitest: Geo utilities unit tests (15 tests)
- [x] Vitest: Pricing engine unit tests (15 tests covering all AC scenarios)
- [ ] Vitest: API integration tests (deferred - requires test DB setup)
- [ ] curl + DB verification (manual testing pending)

## Data Model (Existing)

### Relevant Models

```prisma
// Contact with partner flag
model Contact {
  id             String   @id @default(cuid())
  organizationId String
  isPartner      Boolean  @default(false)
  partnerContract PartnerContract?
  // ...
}

// Partner contract with grid assignments
model PartnerContract {
  id                String   @id @default(cuid())
  contactId         String   @unique
  contact           Contact  @relation(fields: [contactId], references: [id])
  // Grid assignments via junction tables
  zoneRoutes        PartnerContractZoneRoute[]
  excursionPackages PartnerContractExcursionPackage[]
  dispoPackages     PartnerContractDispoPackage[]
  // ...
}

// PricingZone for geo matching
model PricingZone {
  id              String   @id @default(cuid())
  organizationId  String
  zoneType        ZoneType // POLYGON, RADIUS, POINT
  geometry        Json?    // GeoJSON for polygons
  centerLatitude  Decimal?
  centerLongitude Decimal?
  radiusKm        Decimal?
  // ...
}

// ZoneRoute for fixed transfers
model ZoneRoute {
  id                String   @id @default(cuid())
  fromZoneId        String
  toZoneId          String
  vehicleCategoryId String
  fixedPrice        Decimal
  direction         RouteDirection // BIDIRECTIONAL, A_TO_B, B_TO_A
  isActive          Boolean
  // ...
}
```

## API Contract

### POST /api/vtc/pricing/calculate

Request:

```json
{
  "contactId": "contact-123",
  "pickup": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "dropoff": {
    "lat": 49.0097,
    "lng": 2.5479
  },
  "vehicleCategoryId": "category-berline",
  "tripType": "transfer",
  "pickupAt": "2025-01-15T10:00:00",
  "estimatedDurationMinutes": 45,
  "estimatedDistanceKm": 35
}
```

Response (Grid Match):

```json
{
  "pricingMode": "FIXED_GRID",
  "price": 150.0,
  "currency": "EUR",
  "internalCost": 85.0,
  "margin": 65.0,
  "marginPercent": 43.33,
  "profitabilityIndicator": "green",
  "matchedGrid": {
    "type": "ZoneRoute",
    "id": "route-123",
    "name": "Paris → CDG",
    "fromZone": "Paris Intra-Muros",
    "toZone": "CDG Airport"
  },
  "appliedRules": [
    {
      "type": "PARTNER_GRID_MATCH",
      "description": "Partner contract grid price applied",
      "gridType": "ZoneRoute",
      "gridId": "route-123",
      "originalPrice": 150.0
    }
  ],
  "isContractPrice": true
}
```

Response (No Match - Dynamic Fallback):

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
  "appliedRules": [
    {
      "type": "NO_GRID_MATCH",
      "description": "No matching grid found for partner, using dynamic pricing",
      "checkedGrids": ["ZoneRoute", "ExcursionPackage"],
      "reason": "No route matches fromZone=PARIS_0 toZone=UNKNOWN"
    },
    {
      "type": "DYNAMIC_BASE_PRICE",
      "description": "Base price from distance/duration",
      "distanceKm": 35,
      "durationMinutes": 45,
      "ratePerKm": 2.5,
      "ratePerHour": 45.0
    }
  ],
  "isContractPrice": false
}
```

Response (Private Contact):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 130.0,
  "currency": "EUR",
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

## Profitability Indicator Logic

| Margin % | Indicator | Color |
| -------- | --------- | ----- |
| ≥ 20%    | green     | 🟢    |
| 0-20%    | orange    | 🟠    |
| < 0%     | red       | 🔴    |

**Important:** For partner grid prices, even if indicator is "red", the price is NOT modified (Engagement Rule).

## Test Scenarios

### Scenario 1: Intra-Zone Central (Paris → Paris)

- Partner with grid including Paris intra-muros flat rate
- Pickup: 48.8566, 2.3522 (Paris center)
- Dropoff: 48.8606, 2.3376 (Paris center)
- Expected: FIXED_GRID, flat rate from grid

### Scenario 2: Radial Transfer (Paris → CDG)

- Partner with grid including Paris ↔ CDG route
- Pickup: 48.8566, 2.3522 (Paris)
- Dropoff: 49.0097, 2.5479 (CDG)
- Expected: FIXED_GRID, route price from grid

### Scenario 3: No Match (Paris → Unknown suburb)

- Partner with limited grid
- Pickup: 48.8566, 2.3522 (Paris)
- Dropoff: 48.9500, 2.8000 (outside any zone)
- Expected: DYNAMIC fallback

### Scenario 4: Private Client

- Non-partner contact
- Any coordinates
- Expected: DYNAMIC (no grid check)

### Scenario 5: Negative Margin (Engagement Rule)

- Partner with grid, route price = 80€
- Estimated internal cost = 100€
- Expected: FIXED_GRID, price = 80€, indicator = red, margin = -20€

### Scenario 6: Excursion Match

- Partner with Versailles excursion package
- Origin zone: Paris, Destination zone: Versailles
- Expected: FIXED_GRID, excursion package price

### Scenario 7: Dispo Match

- Partner with Half-Day Dispo package
- tripType = "dispo", vehicleCategory = Berline
- Expected: FIXED_GRID, dispo basePrice

## Dependencies

- Story 2.2: Store Partner Contract Data & Rate Grid Links ✅ Done
- Story 3.1: Implement PricingZone Model & Zones Editor UI ✅ Done
- Story 3.2: Implement ZoneRoute Model & Grid Routes Editor ✅ Done
- Story 3.3: Implement Excursion & Dispo Forfait Configuration ✅ Done

## Files Created/Modified

### New Files ✅

| File                                                         | Description                                                | Lines |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ----- |
| `packages/api/src/lib/geo-utils.ts`                          | Geo utilities (Haversine, point-in-polygon, zone matching) | 209   |
| `packages/api/src/services/pricing-engine.ts`                | Pricing engine service with Engagement Rule                | 539   |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | API route POST /api/vtc/pricing/calculate                  | 330   |
| `packages/api/src/lib/__tests__/geo-utils.test.ts`           | Geo utils tests (15 tests)                                 | 283   |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Engine tests (15 tests)                                    | 640   |

### Modified Files ✅

| File                                    | Change                                          |
| --------------------------------------- | ----------------------------------------------- |
| `packages/api/src/routes/vtc/router.ts` | Added `pricingCalculateRouter` import and route |

## Test Results

```
 ✓ src/lib/__tests__/geo-utils.test.ts (15 tests)
 ✓ src/services/__tests__/pricing-engine.test.ts (15 tests)

 Test Files  2 passed (2)
 Tests       30 passed (30)
```

### Test Coverage

| Category                          | Tests | Status |
| --------------------------------- | ----- | ------ |
| Haversine distance                | 3     | ✅     |
| Point-in-radius                   | 3     | ✅     |
| Point-in-polygon                  | 4     | ✅     |
| Zone matching                     | 5     | ✅     |
| Private client dynamic pricing    | 2     | ✅     |
| Partner ZoneRoute matching        | 4     | ✅     |
| Partner ExcursionPackage matching | 2     | ✅     |
| Partner DispoPackage matching     | 2     | ✅     |
| Profitability indicators          | 3     | ✅     |
| Route direction (A_TO_B, B_TO_A)  | 2     | ✅     |

## Dev Notes

- ✅ The pricing engine is a pure function for testability
- ✅ All grid matching is scoped by organizationId (multi-tenancy)
- ✅ internalCost uses simple estimate: distanceKm × 2.5 EUR (will be expanded in Epic 4)
- ✅ appliedRules array provides full transparency for debugging
- ⚠️ Zone geometry caching not implemented (optimize if needed)
- ✅ Negative margin partner trips are logged with console.warn for Epic 9 reporting

## Implementation Details

### Geo-Utils Functions

```typescript
// Distance calculation
haversineDistance(point1: GeoPoint, point2: GeoPoint): number

// Zone detection
isPointInRadius(point: GeoPoint, center: GeoPoint, radiusKm: number): boolean
isPointInPolygon(point: GeoPoint, polygon: GeoPolygon): boolean
isPointInZone(point: GeoPoint, zone: ZoneData): boolean
findZoneForPoint(point: GeoPoint, zones: ZoneData[]): ZoneData | null
```

### Pricing Engine Functions

```typescript
// Main entry point
calculatePrice(request: PricingRequest, context: PricingEngineContext): PricingResult

// Grid matching
matchZoneRoute(fromZone, toZone, vehicleCategoryId, contractRoutes): ZoneRoute | null
matchExcursionPackage(originZone, destZone, vehicleCategoryId, contractExcursions): ExcursionPackage | null
matchDispoPackage(vehicleCategoryId, contractDispos): DispoPackage | null

// Profitability
calculateProfitabilityIndicator(marginPercent: number): "green" | "orange" | "red"
estimateInternalCost(distanceKm: number): number
```

### API Endpoint

```
POST /api/vtc/pricing/calculate
Headers: x-organization-id: <organizationId>
Body: {
  contactId: string,
  pickup: { lat: number, lng: number },
  dropoff: { lat: number, lng: number },
  vehicleCategoryId: string,
  tripType: "transfer" | "excursion" | "dispo",
  estimatedDistanceKm?: number,
  estimatedDurationMinutes?: number
}
```

## Related PRD Sections

- **FR7:** Dual pricing modes (Method 1 = FIXED_GRID, Method 2 = DYNAMIC) ✅
- **FR11:** Engagement Rule - grid price always applied for partners ✅
- **FR24:** Profitability indicator always displayed ✅
- **FR4:** Pricing engine reads client type and attached configuration ✅
- **Appendix A:** Zoning Engine logic tree, Engagement Rule definition ✅
