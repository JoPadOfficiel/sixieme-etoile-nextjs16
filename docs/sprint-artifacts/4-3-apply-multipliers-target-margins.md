# Story 4.3: Apply Multipliers and Target Margins

Status: done

## Story

**As a** pricing manager,  
**I want** configurable multipliers and target margins applied on top of base cost,  
**So that** the system can propose commercially viable prices in different contexts.

## Acceptance Criteria

### AC1: Advanced Rate Modifiers Applied

- **Given** configured advanced rates (night/weekend/long-distance rules) and seasonal multipliers
- **When** a dynamic quote is computed
- **Then** the pricing engine applies all applicable rules in a defined order:
  1. Base price (from `calculateDynamicBasePrice`)
  2. Advanced rate modifiers (sorted by priority DESC)
  3. Seasonal multipliers (sorted by priority DESC)
  4. Target margin application
- **And** the final suggested selling price is stored in the quote

### AC2: Applied Rules Transparency

- **Given** a dynamic quote with multipliers applied
- **When** the pricing result is returned
- **Then** the `appliedRules` context lists each rule with:
  - `type`: rule type identifier (`ADVANCED_RATE` or `SEASONAL_MULTIPLIER`)
  - `ruleId`: database ID of the rule
  - `ruleName`: human-readable name
  - `adjustmentType`: `PERCENTAGE`, `FIXED_AMOUNT`, or `MULTIPLIER`
  - `adjustmentValue`: the raw value from the rule
  - `priceBefore`: price before this rule was applied
  - `priceAfter`: price after this rule was applied

### AC3: Night Rate Application

- **Given** a trip with `pickupAt` between 22:00 and 06:00 (Europe/Paris timezone)
- **When** an active `NIGHT` advanced rate exists for the organization
- **Then** the night rate modifier is applied to the base price
- **And** the rule is recorded in `appliedRules`

### AC4: Weekend Rate Application

- **Given** a trip with `pickupAt` on Saturday (day 6) or Sunday (day 0)
- **When** an active `WEEKEND` advanced rate exists for the organization
- **Then** the weekend rate modifier is applied to the base price
- **And** the rule is recorded in `appliedRules`

### AC5: Long Distance Rate Application

- **Given** a trip with distance exceeding the `minDistanceKm` threshold
- **When** an active `LONG_DISTANCE` advanced rate exists for the organization
- **Then** the long distance modifier is applied to the base price
- **And** if `maxDistanceKm` is set, the rule only applies if distance is within range

### AC6: Seasonal Multiplier Application

- **Given** a trip with `pickupAt` within a seasonal multiplier's date range (`startDate` to `endDate`)
- **When** an active seasonal multiplier exists for the organization
- **Then** the seasonal multiplier is applied after advanced rates
- **And** the multiplier value (e.g., 1.3 for 30% increase) is applied to the current price

### AC7: Priority-Based Rule Stacking

- **Given** multiple applicable rules with different priorities
- **When** rules are evaluated
- **Then** rules are applied in priority order (higher priority value first)
- **And** all applicable rules are applied (not just the highest priority)

### AC8: Idempotent Rule Evaluation

- **Given** the same pricing request
- **When** `calculatePrice` is called multiple times
- **Then** the result is identical each time (no double-application of multipliers)

### AC9: Grid Pricing Unaffected

- **Given** a partner with grid pricing (`FIXED_GRID` mode)
- **When** multipliers exist in the organization configuration
- **Then** the grid price is NOT modified by any multipliers
- **And** the Engagement Rule is preserved

## Tasks / Subtasks

### Task 1: Create Multiplier Data Types (AC: 1, 2)

- [x] Define `AdvancedRateData` interface matching Prisma model
- [x] Define `SeasonalMultiplierData` interface matching Prisma model
- [x] Define `MultiplierContext` interface for evaluation context
- [x] Define `AppliedMultiplierRule` interface extending `AppliedRule`
- [x] Export types from pricing-engine.ts

### Task 2: Implement Advanced Rate Evaluation (AC: 3, 4, 5, 7)

- [x] Create `isNightTime(pickupAt: Date): boolean` helper
- [x] Create `isWeekend(pickupAt: Date): boolean` helper
- [x] Create `isLongDistance(distanceKm: number, minKm: number, maxKm?: number): boolean` helper
- [x] Create `evaluateAdvancedRate(rate: AdvancedRateData, context: MultiplierContext): boolean`
- [x] Create `applyAdvancedRate(price: number, rate: AdvancedRateData): number`
- [x] Create `evaluateAdvancedRates(basePrice: number, context: MultiplierContext, rates: AdvancedRateData[]): { adjustedPrice: number; appliedRules: AppliedMultiplierRule[] }`

### Task 3: Implement Seasonal Multiplier Evaluation (AC: 6, 7)

- [x] Create `isWithinDateRange(pickupAt: Date, startDate: Date, endDate: Date): boolean` helper
- [x] Create `evaluateSeasonalMultiplier(multiplier: SeasonalMultiplierData, pickupAt: Date): boolean`
- [x] Create `applySeasonalMultiplier(price: number, multiplier: SeasonalMultiplierData): number`
- [x] Create `evaluateSeasonalMultipliers(price: number, pickupAt: Date, multipliers: SeasonalMultiplierData[]): { adjustedPrice: number; appliedRules: AppliedMultiplierRule[] }`

### Task 4: Integrate into Pricing Engine (AC: 1, 8, 9)

- [x] Update `PricingEngineContext` to include `advancedRates` and `seasonalMultipliers`
- [x] Modify `buildDynamicResult` to apply multipliers after base price calculation
- [x] Ensure multipliers are NOT applied in `buildGridResult` (Engagement Rule)
- [x] Update `calculatePrice` to pass multiplier context
- [x] Verify idempotence with unit tests

### Task 5: Update API Route (AC: 1, 2)

- [x] Create `loadAdvancedRates(organizationId: string): Promise<AdvancedRateData[]>`
- [x] Create `loadSeasonalMultipliers(organizationId: string): Promise<SeasonalMultiplierData[]>`
- [x] Update `pricingCalculateRouter` to load and pass multipliers to pricing engine
- [x] Ensure proper error handling for missing/invalid data

### Task 6: Unit Tests (AC: 1-9)

- [x] Test night rate: pickup at 23:00 applies modifier, 10:00 does not
- [x] Test weekend rate: Saturday applies modifier, Monday does not
- [x] Test long distance: 150km applies modifier, 30km does not
- [x] Test seasonal multiplier: date within range applies, outside does not
- [x] Test priority ordering: higher priority applied first
- [x] Test multiple rules stacking: all applicable rules applied
- [x] Test idempotence: same input produces same output
- [x] Test grid pricing unaffected: FIXED_GRID ignores multipliers
- [x] Test no applicable rules: price unchanged
- [x] Test inactive rules: not applied

### Task 7: Integration Tests (AC: 1, 2)

- [x] Test API endpoint with multipliers configured
- [x] Test appliedRules contains all multiplier details
- [x] Test response structure matches expected format

## Dev Notes

### Order of Operations (Critical)

The pricing calculation MUST follow this exact order:

```
1. Base Price = max(distance × ratePerKm, duration × ratePerHour)
2. For each Advanced Rate (sorted by priority DESC):
   - If applicable: price = applyAdjustment(price, rate)
3. For each Seasonal Multiplier (sorted by priority DESC):
   - If applicable: price = price × multiplier
4. Final Price = price (margin already included in base calculation)
```

### Adjustment Types

- **PERCENTAGE**: `newPrice = price × (1 + value/100)` (e.g., value=20 means +20%)
- **FIXED_AMOUNT**: `newPrice = price + value` (e.g., value=15 means +15 EUR)
- **MULTIPLIER** (seasonal): `newPrice = price × value` (e.g., value=1.3 means ×1.3)

### Time Zone Handling

All time comparisons use Europe/Paris timezone:

```typescript
import { toZonedTime } from "date-fns-tz";

const PARIS_TZ = "Europe/Paris";
const parisTime = toZonedTime(pickupAt, PARIS_TZ);
const hour = parisTime.getHours();
const dayOfWeek = parisTime.getDay(); // 0=Sunday, 6=Saturday
```

### Database Queries

```typescript
// Load active advanced rates
const advancedRates = await db.advancedRate.findMany({
  where: { organizationId, isActive: true },
  orderBy: { priority: "desc" },
});

// Load active seasonal multipliers
const seasonalMultipliers = await db.seasonalMultiplier.findMany({
  where: { organizationId, isActive: true },
  orderBy: { priority: "desc" },
});
```

### Project Structure Notes

- **Service location**: `packages/api/src/services/pricing-engine.ts`
- **Route location**: `packages/api/src/routes/vtc/pricing-calculate.ts`
- **Test location**: `packages/api/src/services/__tests__/pricing-engine.test.ts`
- **Prisma models**: Already defined in `packages/database/prisma/schema.prisma`

### Testing Standards

- Use Vitest for unit tests
- Follow existing patterns in `pricing-engine.test.ts`
- Each AC should have at least one test case
- Use descriptive test names referencing the AC

### References

- [Source: docs/bmad/prd.md#FR15] - Configurable multipliers and target margin settings
- [Source: docs/bmad/prd.md#FR58] - Advanced rate modifiers (night, weekend, long-distance)
- [Source: docs/bmad/prd.md#FR59] - Seasonal multipliers with date ranges
- [Source: docs/bmad/tech-spec.md#4. Pricing, Zones & Grids] - AdvancedRate and SeasonalMultiplier models
- [Source: docs/bmad/epics.md#Story 4.3] - Order of operations and idempotence requirements
- [Source: docs/sprint-artifacts/4-1-implement-base-dynamic-price-calculation.md] - Base price calculation
- [Source: docs/sprint-artifacts/4-2-add-operational-cost-components-internal-cost.md] - Cost breakdown

## Test Scenarios

### Scenario 1: Night Rate Application

```typescript
const request = {
  pickupAt: "2025-11-26T23:00:00+01:00", // 23:00 Paris time
  distanceKm: 30,
  durationMinutes: 45,
};

const nightRate: AdvancedRateData = {
  id: "rate-night",
  name: "Night Surcharge",
  appliesTo: "NIGHT",
  startTime: "22:00",
  endTime: "06:00",
  adjustmentType: "PERCENTAGE",
  value: 20, // +20%
  priority: 10,
  isActive: true,
};

// Base price: 75 EUR
// After night rate: 75 × 1.20 = 90 EUR
expect(result.price).toBe(90);
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "ADVANCED_RATE",
    ruleName: "Night Surcharge",
    priceBefore: 75,
    priceAfter: 90,
  })
);
```

### Scenario 2: Weekend + Seasonal Stacking

```typescript
const request = {
  pickupAt: "2025-06-14T10:00:00+02:00", // Saturday during Le Bourget
  distanceKm: 50,
  durationMinutes: 60,
};

const weekendRate: AdvancedRateData = {
  appliesTo: "WEEKEND",
  adjustmentType: "PERCENTAGE",
  value: 15, // +15%
  priority: 5,
};

const leBourgetMultiplier: SeasonalMultiplierData = {
  name: "Le Bourget Air Show",
  startDate: new Date("2025-06-14"),
  endDate: new Date("2025-06-22"),
  multiplier: 1.3, // ×1.3
  priority: 10,
};

// Base price: 100 EUR
// After weekend: 100 × 1.15 = 115 EUR
// After seasonal: 115 × 1.30 = 149.50 EUR
expect(result.price).toBeCloseTo(149.5, 2);
```

### Scenario 3: Long Distance Threshold

```typescript
const shortTrip = { distanceKm: 30 };
const longTrip = { distanceKm: 150 };

const longDistanceRate: AdvancedRateData = {
  appliesTo: "LONG_DISTANCE",
  minDistanceKm: 100,
  maxDistanceKm: null, // No upper limit
  adjustmentType: "PERCENTAGE",
  value: -10, // -10% discount for long trips
  priority: 5,
};

// Short trip: no discount applied
// Long trip: -10% discount applied
```

### Scenario 4: Grid Pricing Unaffected

```typescript
// Partner with grid price of 150 EUR
// Night rate and seasonal multiplier configured
// Result should still be 150 EUR (Engagement Rule)

expect(result.pricingMode).toBe("FIXED_GRID");
expect(result.price).toBe(150);
expect(result.appliedRules).not.toContainEqual(
  expect.objectContaining({ type: "ADVANCED_RATE" })
);
```

## API Contract

### POST /api/vtc/pricing/calculate

Request (unchanged):

```json
{
  "contactId": "contact-123",
  "pickup": { "lat": 48.85, "lng": 2.35 },
  "dropoff": { "lat": 49.01, "lng": 2.55 },
  "vehicleCategoryId": "cat-sedan",
  "tripType": "transfer",
  "pickupAt": "2025-11-26T23:00:00+01:00",
  "estimatedDistanceKm": 30,
  "estimatedDurationMinutes": 45
}
```

Response (with multipliers):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 108.00,
  "currency": "EUR",
  "internalCost": 44.70,
  "margin": 63.30,
  "marginPercent": 58.61,
  "profitabilityIndicator": "green",
  "matchedGrid": null,
  "fallbackReason": "PRIVATE_CLIENT",
  "appliedRules": [
    {
      "type": "DYNAMIC_BASE_CALCULATION",
      "description": "Base price calculated using max(distance, duration) formula",
      "inputs": { "distanceKm": 30, "durationMinutes": 45 },
      "calculation": { "basePrice": 75, "priceWithMargin": 90 }
    },
    {
      "type": "ADVANCED_RATE",
      "ruleId": "rate-night",
      "ruleName": "Night Surcharge",
      "adjustmentType": "PERCENTAGE",
      "adjustmentValue": 20,
      "priceBefore": 90,
      "priceAfter": 108
    }
  ],
  "isContractPrice": false,
  "tripAnalysis": {
    "costBreakdown": { ... }
  }
}
```

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-3-apply-multipliers-target-margins.context.xml`

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

### Completion Notes List

### File List

| File                                                         | Action   | Description                                                             |
| ------------------------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Modified | Add multiplier types, evaluation functions, integrate into pricing flow |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Modified | Load multipliers from DB, pass to pricing engine                        |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Modified | Add comprehensive multiplier tests                                      |
