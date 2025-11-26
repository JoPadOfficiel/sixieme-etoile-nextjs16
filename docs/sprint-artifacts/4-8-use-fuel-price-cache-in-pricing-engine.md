# Story 4.8: Use Fuel Price Cache in Pricing Engine

**Epic:** 4 – Dynamic Pricing & Shadow Calculation (Method 2)  
**Status:** done  
**Priority:** High  
**Story Points:** 5  
**Created:** 2025-11-26  
**Author:** Bob (Scrum Master)

---

## User Story

**As a** backend engineer,  
**I want** the pricing engine to consume fuel prices from a cache,  
**So that** quotes do not depend on real-time external API calls.

---

## Business Context

The pricing engine calculates operational costs including fuel for every quote. Currently, fuel prices are either hardcoded defaults (1.80 EUR/L) or configured per organization. This story introduces a **cache-first fuel price resolution** that:

1. **Eliminates real-time API dependency**: Quotes never wait for CollectAPI responses
2. **Ensures consistency**: All quotes in a period use the same fuel price
3. **Reduces costs**: Minimizes CollectAPI calls (daily refresh vs per-quote)
4. **Provides reliability**: System works even when CollectAPI is unavailable

### Related Functional Requirements

- **FR14**: Operational cost components include fuel cost
- **FR41**: Fuel price cache sourced from external provider, pricing uses cached values

### PRD Reference (Appendix B)

> **CollectAPI (Fuel)**
>
> - Frequency: Once daily (Cron job at 04:00 Paris time)
> - Storage: Update FuelPriceCache table
> - Usage: Calculator reads from DB (fast), never calls API in real-time

---

## Acceptance Criteria

### AC1: Cache Consumption

**Given** a `FuelPriceCache` table periodically refreshed via CollectAPI,  
**When** the pricing engine needs a fuel price for a quote (given a base/zone and fuel type),  
**Then** it reads the best matching cached entry in EUR and uses it in fuel cost calculations, without calling CollectAPI in real time.

### AC2: Staleness Handling

**Given** no recent cache entry is available according to configured staleness rules,  
**When** the pricing engine requests a fuel price,  
**Then** the engine either uses a safe fallback value or fails gracefully with a clear error, but never blocks on external API latency inside the quote request.

### AC3: Abstraction Layer

**Given** the pricing logic,  
**When** fuel price resolution is needed,  
**Then** the implementation abstracts fuel price resolution behind a small interface to keep CollectAPI-specific details out of domain code.

### AC4: EUR Currency

**Given** the VTC ERP is EUR-only,  
**When** fuel prices are retrieved from cache,  
**Then** they are always in EUR with no currency conversion.

### AC5: Fuel Type Support

**Given** different vehicle types may use different fuel (DIESEL, GASOLINE, LPG),  
**When** resolving fuel price,  
**Then** the service supports querying by fuel type with DIESEL as default.

---

## Technical Tasks

### T1: Create FuelPriceService Interface (AC3)

- [x] Create `packages/api/src/services/fuel-price-service.ts`
- [x] Define `FuelPriceService` interface with `getFuelPrice()` method
- [x] Define `FuelPriceResult` interface with price, source, staleness info
- [x] Define `FuelPriceParams` interface for query parameters

### T2: Implement FuelPriceCacheService (AC1, AC4, AC5)

- [x] Implement `getFuelPrice()` that queries `FuelPriceCache` table
- [x] Query by `countryCode` (default "FR") and `fuelType` (default DIESEL)
- [x] Order by `fetchedAt DESC` to get most recent entry
- [x] Return price in EUR with source metadata

### T3: Add Staleness Rules and Fallback Logic (AC2)

- [x] Define `FUEL_PRICE_STALENESS_HOURS` constant (default 48h)
- [x] Check if `fetchedAt` is within staleness threshold
- [x] Mark result as `isStale: true` if entry is old
- [x] Return `DEFAULT_COST_PARAMETERS.fuelPricePerLiter` as fallback when no cache
- [x] Log warning when using stale or fallback prices

### T4: Integrate into Pricing Engine (AC1, AC3)

- [x] Add `FuelPriceSourceInfo` interface to `TripAnalysis`
- [x] Integrate fuel price resolution into pricing flow
- [x] Add `fuelPriceSource` to `TripAnalysis` for transparency

### T5: Update loadPricingSettings (AC1)

- [x] Modify `loadPricingSettings()` in `pricing-calculate.ts`
- [x] Call `getFuelPrice()` and inject into settings
- [x] Handle async fuel price resolution

### T6: Add Unit Tests

- [x] Test cache hit scenario (recent entry exists)
- [x] Test cache miss scenario (no entries)
- [x] Test staleness detection (old entry)
- [x] Test fuel type filtering (DIESEL, GASOLINE, LPG)
- [x] Test country code filtering
- [x] Test fallback to default price
- [x] Test EUR currency assertion

### T7: Add Integration Tests

- [x] Test full pricing flow with cached fuel price
- [x] Test pricing continues when cache is empty
- [x] Test pricing with stale cache entry
- [x] Test database query performance (< 100ms)
- [x] Test concurrent requests handling
- [x] Test data integrity (consistent prices)

---

## Technical Design

### New Types

```typescript
// packages/api/src/services/fuel-price-service.ts

import type { FuelType } from "@repo/database";

/**
 * Parameters for fuel price resolution
 */
export interface FuelPriceParams {
  countryCode?: string; // Default: "FR"
  fuelType?: FuelType; // Default: "DIESEL"
  latitude?: number; // Optional: for location-based pricing (future)
  longitude?: number; // Optional: for location-based pricing (future)
}

/**
 * Result of fuel price resolution
 */
export interface FuelPriceResult {
  pricePerLitre: number;
  currency: "EUR";
  source: "CACHE" | "DEFAULT";
  fetchedAt: Date | null;
  isStale: boolean;
  fuelType: FuelType;
}

/**
 * Fuel price service interface for abstraction
 */
export interface IFuelPriceService {
  getFuelPrice(params?: FuelPriceParams): Promise<FuelPriceResult>;
}

/**
 * Configuration for staleness rules
 */
export interface FuelPriceCacheConfig {
  stalenessHours: number; // Default: 48
  defaultPrice: number; // Default: 1.80 EUR
}
```

### Implementation Strategy

```typescript
// Staleness threshold (48 hours by default)
export const FUEL_PRICE_STALENESS_HOURS = 48;

/**
 * Get fuel price from cache with fallback to default
 */
export async function getFuelPrice(
  params: FuelPriceParams = {}
): Promise<FuelPriceResult> {
  const { countryCode = "FR", fuelType = "DIESEL" } = params;

  // Query most recent cache entry
  const cached = await db.fuelPriceCache.findFirst({
    where: {
      countryCode,
      fuelType,
    },
    orderBy: { fetchedAt: "desc" },
  });

  if (!cached) {
    // No cache entry - return default
    return {
      pricePerLitre: DEFAULT_COST_PARAMETERS.fuelPricePerLiter,
      currency: "EUR",
      source: "DEFAULT",
      fetchedAt: null,
      isStale: false,
      fuelType,
    };
  }

  // Check staleness
  const stalenessThreshold = new Date();
  stalenessThreshold.setHours(
    stalenessThreshold.getHours() - FUEL_PRICE_STALENESS_HOURS
  );
  const isStale = cached.fetchedAt < stalenessThreshold;

  return {
    pricePerLitre: Number(cached.pricePerLitre),
    currency: "EUR",
    source: "CACHE",
    fetchedAt: cached.fetchedAt,
    isStale,
    fuelType: cached.fuelType,
  };
}
```

### Integration Points

1. **pricing-calculate.ts**: Call `getFuelPrice()` before pricing calculation
2. **pricing-engine.ts**: Pass resolved fuel price to `calculateCostBreakdown()`
3. **TripAnalysis**: Add `fuelPriceSource` field for transparency

---

## Test Cases

### Unit Tests

| Test ID | Description                                                     | AC       |
| ------- | --------------------------------------------------------------- | -------- |
| TC1     | getFuelPrice returns cached price when recent entry exists      | AC1      |
| TC2     | getFuelPrice queries by countryCode and fuelType                | AC1, AC5 |
| TC3     | getFuelPrice returns most recent entry (orderBy fetchedAt DESC) | AC1      |
| TC4     | getFuelPrice returns default when cache is empty                | AC2      |
| TC5     | getFuelPrice marks result as stale when entry is old            | AC2      |
| TC6     | getFuelPrice uses 48h staleness threshold by default            | AC2      |
| TC7     | getFuelPrice returns EUR currency always                        | AC4      |
| TC8     | getFuelPrice supports DIESEL fuel type (default)                | AC5      |
| TC9     | getFuelPrice supports GASOLINE fuel type                        | AC5      |
| TC10    | getFuelPrice supports LPG fuel type                             | AC5      |
| TC11    | getFuelPrice defaults to "FR" country code                      | AC1      |

### Integration Tests

| Test ID | Description                                     | AC       |
| ------- | ----------------------------------------------- | -------- |
| IT1     | Full pricing flow uses cached fuel price        | AC1, AC3 |
| IT2     | Pricing continues with default when cache empty | AC2      |
| IT3     | TripAnalysis includes fuel price source         | AC3      |

---

## Dependencies

### Prerequisites (Completed)

- ✅ Story 1.1: VTC ERP Prisma Models (FuelPriceCache model exists)
- ✅ Story 1.5: Integration Settings Storage (CollectAPI key management)
- ✅ Story 4.2: Operational Cost Components (calculateCostBreakdown exists)
- ✅ Story 4.6: Shadow Calculation (TripAnalysis structure)

### Blocking

- Epic 9: Background fuel cache refresh job (populates the cache)

---

## Out of Scope

- CollectAPI integration for cache population (Epic 9)
- Cron job for daily fuel price refresh (Epic 9)
- Location-based fuel price lookup (future enhancement)
- Fuel price history/trends (future enhancement)
- Admin UI for staleness configuration (Epic 9)

---

## Definition of Done

- [x] `FuelPriceService` interface created and exported
- [x] `getFuelPrice()` function implemented with cache lookup
- [x] Staleness rules implemented (48h default threshold)
- [x] Fallback to default price when cache empty
- [x] Pricing engine integrated with fuel price service
- [x] `TripAnalysis` includes `fuelPriceSource` field
- [x] Unit tests cover all acceptance criteria (26 tests passing)
- [x] Integration tests verify end-to-end flow (10 tests passing)
- [x] No CollectAPI calls during quote pricing
- [ ] Code reviewed and merged

---

## Dev Notes

### Architecture Patterns

- Follow existing service pattern in `packages/api/src/services/`
- Use dependency injection pattern for testability
- Keep CollectAPI details out of pricing domain code

### Source Tree Components

- `packages/api/src/services/fuel-price-service.ts` (new)
- `packages/api/src/services/__tests__/fuel-price-service.test.ts` (new)
- `packages/api/src/services/pricing-engine.ts` (modify)
- `packages/api/src/routes/vtc/pricing-calculate.ts` (modify)

### Testing Standards

- Use Vitest for unit tests
- Mock Prisma client for database calls
- Follow existing test patterns in `__tests__/` folders

### References

- [Source: docs/bmad/prd.md#Appendix-B - CollectAPI usage]
- [Source: docs/bmad/tech-spec.md#6-Fuel-Integrations]
- [Source: packages/database/prisma/schema.prisma#FuelPriceCache]

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-8-use-fuel-price-cache-in-pricing-engine.context.xml`

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

### Completion Notes List

- Created `FuelPriceService` with cache-first, fallback-to-default strategy
- Added `FuelPriceSourceInfo` interface to `TripAnalysis` for transparency
- Integrated fuel price resolution into `loadPricingSettings()` in pricing-calculate route
- Created database seed script for FuelPriceCache test data
- **Test Results:**
  - 26 unit tests passing (fuel-price-service.test.ts)
  - 10 integration tests passing (fuel-price-integration.test.ts)
  - 107 pricing-engine tests passing
  - 33 shadow-calculation tests passing
  - **Total: 176 tests passing**

### Files Modified/Created

- `packages/api/src/services/fuel-price-service.ts` (NEW - 260 lines)
- `packages/api/src/services/__tests__/fuel-price-service.test.ts` (NEW - 340 lines)
- `packages/api/src/services/__tests__/fuel-price-integration.test.ts` (NEW - 200 lines)
- `packages/api/src/services/pricing-engine.ts` (MODIFIED - added FuelPriceSourceInfo interface)
- `packages/api/src/routes/vtc/pricing-calculate.ts` (MODIFIED - integrated fuel price cache)
- `packages/database/prisma/seed.ts` (NEW - seed script for FuelPriceCache)
- `packages/database/package.json` (MODIFIED - added db:seed script)
- `docs/sprint-artifacts/4-8-use-fuel-price-cache-in-pricing-engine.md` (NEW)
- `docs/sprint-artifacts/4-8-use-fuel-price-cache-in-pricing-engine.context.xml` (NEW)
- `docs/sprint-artifacts/sprint-status.yaml` (MODIFIED)
