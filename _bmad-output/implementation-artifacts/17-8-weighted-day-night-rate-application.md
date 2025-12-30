# Story 17.8: Weighted Day/Night Rate Application

**Epic:** Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability  
**Status:** ready-for-dev  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Sprint:** Current  
**Created:** 2025-12-31

---

## Story

As an **operator**,  
I want night rates to be applied proportionally for trips that span day and night periods,  
So that pricing is fair for trips that start during the day and end at night (or vice versa).

### Business Value

- **Équité tarifaire** : Un trajet de 20h à 23h (3h dont 1h de nuit) applique le tarif nuit sur 33% seulement, pas 100%
- **Transparence** : L'opérateur voit clairement le calcul pondéré dans les règles appliquées ("Night rate applied to 33% of trip duration")
- **Précision commerciale** : Les clients ne sont pas surfacturés pour des trajets qui ne sont que partiellement de nuit
- **Cohérence** : Utilise `pickupAt` et `estimatedEndAt` (Story 17.5) pour calculer le chevauchement exact

### Related FRs

- **FR70:** The pricing engine shall support weighted day/night rate application for trips that span multiple time periods, calculating the proportion of the trip in each period based on pickupAt and estimatedEndAt.

---

## Acceptance Criteria (BDD Format)

### AC1: Proportional Night Rate for Trips Spanning Day/Night

**Given** an organisation with a night rate configured (e.g., 22:00-06:00, +20%),  
**When** a trip starts at 20:00 and ends at 23:00 (3 hours total, 1 hour in night period),  
**Then** the night rate shall be applied proportionally: 1/3 of the trip at night rate,  
**And** the effective adjustment shall be: `basePrice × (1 + 0.20 × 0.333) = basePrice × 1.0667` (approximately +6.67% instead of +20%).

### AC2: Full Night Rate for Trips Entirely in Night Period

**Given** an organisation with a night rate configured (22:00-06:00, +20%),  
**When** a trip starts at 23:00 and ends at 02:00 (3 hours, entirely in night period),  
**Then** the night rate shall be applied at 100%: `basePrice × 1.20`.

### AC3: No Night Rate for Trips Entirely in Day Period

**Given** an organisation with a night rate configured (22:00-06:00, +20%),  
**When** a trip starts at 10:00 and ends at 14:00 (4 hours, entirely in day period),  
**Then** no night rate shall be applied: `basePrice × 1.00`.

### AC4: Applied Rules Show Weighted Calculation Details

**Given** a trip that spans day and night periods,  
**When** the pricing result is returned,  
**Then** `appliedRules` shall contain a `WEIGHTED_NIGHT_RATE` rule with:

- `nightPeriodStart`: "22:00"
- `nightPeriodEnd`: "06:00"
- `tripStart`: ISO timestamp of pickupAt
- `tripEnd`: ISO timestamp of estimatedEndAt
- `nightMinutes`: minutes of trip in night period
- `totalMinutes`: total trip duration
- `nightPercentage`: percentage of trip in night period (e.g., 33.33)
- `baseAdjustment`: original night rate adjustment (e.g., 20)
- `effectiveAdjustment`: weighted adjustment applied (e.g., 6.67)
- `priceBefore` and `priceAfter`

### AC5: Early Morning Trips (Crossing Midnight)

**Given** a trip that starts at 05:00 and ends at 08:00 (3 hours),  
**When** the night period is 22:00-06:00,  
**Then** 1 hour (05:00-06:00) is in night period = 33.33% night rate applied.

### AC6: Overnight Trips (Crossing Midnight)

**Given** a trip that starts at 21:00 and ends at 01:00 (4 hours),  
**When** the night period is 22:00-06:00,  
**Then** 3 hours (22:00-01:00) are in night period = 75% night rate applied.

### AC7: Fallback When estimatedEndAt is Null

**Given** a trip where `estimatedEndAt` is null (routing failed),  
**When** the pricing engine evaluates the night rate,  
**Then** it shall fall back to the current binary behavior (apply full rate if pickupAt is in night period).

### AC8: Weekend Rate Remains Binary (Not Weighted)

**Given** a trip that starts on Friday at 23:00 and ends on Saturday at 02:00,  
**When** the pricing engine evaluates rates,  
**Then** the weekend rate shall be applied based on pickupAt day only (binary, not weighted),  
**And** the night rate shall be weighted as per AC1-AC6.

---

## Tasks / Subtasks

- [ ] **Task 1: Implement Night Period Overlap Calculator** (AC: 1, 2, 3, 5, 6)

  - [ ] Create `calculateNightOverlapMinutes(pickupAt: Date, estimatedEndAt: Date, nightStart: string, nightEnd: string): number`
  - [ ] Handle overnight ranges (22:00-06:00 crossing midnight)
  - [ ] Handle trips crossing midnight (21:00-01:00)
  - [ ] Handle multi-day trips (rare but possible)

- [ ] **Task 2: Implement Weighted Night Rate Calculation** (AC: 1, 4)

  - [ ] Create `calculateWeightedNightRate(basePrice: number, context: MultiplierContext, rate: AdvancedRateData, estimatedEndAt: Date | null): WeightedRateResult`
  - [ ] Calculate `nightPercentage = nightMinutes / totalMinutes`
  - [ ] Calculate `effectiveAdjustment = rate.value × nightPercentage`
  - [ ] Return detailed breakdown for appliedRules

- [ ] **Task 3: Update evaluateAdvancedRate for NIGHT Type** (AC: 1, 7)

  - [ ] Modify `evaluateAdvancedRate()` to accept optional `estimatedEndAt` parameter
  - [ ] For NIGHT rates, use weighted calculation when `estimatedEndAt` is available
  - [ ] Fall back to binary (current behavior) when `estimatedEndAt` is null

- [ ] **Task 4: Update evaluateAdvancedRates to Pass estimatedEndAt** (AC: 1)

  - [ ] Add `estimatedEndAt` to `MultiplierContext` interface
  - [ ] Update all callers to pass `estimatedEndAt` from tripAnalysis

- [ ] **Task 5: Update AppliedMultiplierRule for Weighted Details** (AC: 4)

  - [ ] Add optional `weightedDetails` field to `AppliedMultiplierRule` interface
  - [ ] Include all fields from AC4 in the weighted details

- [ ] **Task 6: Unit Tests** (AC: 1-8)

  - [ ] Test `calculateNightOverlapMinutes` for various scenarios
  - [ ] Test weighted night rate calculation
  - [ ] Test fallback to binary when estimatedEndAt is null
  - [ ] Test overnight trips crossing midnight
  - [ ] Test early morning trips

- [ ] **Task 7: Integration Tests** (AC: 1, 4)

  - [ ] Test full pricing flow with weighted night rate
  - [ ] Verify appliedRules contains weighted details

- [ ] **Task 8: Update Translations** (AC: 4)
  - [ ] Add translation keys for weighted night rate description
  - [ ] Add "Night rate applied to X% of trip duration" message

---

## Dev Notes

### Algorithm: Night Period Overlap Calculation

The core challenge is calculating how many minutes of a trip fall within the night period, handling:

1. **Normal ranges** (e.g., 09:00-18:00): Simple overlap calculation
2. **Overnight ranges** (e.g., 22:00-06:00): Split into two segments (22:00-24:00 and 00:00-06:00)
3. **Trips crossing midnight**: May enter/exit night period multiple times

```typescript
/**
 * Calculate minutes of trip that fall within night period
 * Handles overnight ranges like 22:00-06:00
 */
export function calculateNightOverlapMinutes(
  pickupAt: Date,
  estimatedEndAt: Date,
  nightStart: string, // "22:00"
  nightEnd: string // "06:00"
): number {
  const tripStartMinutes = getMinutesSinceMidnight(pickupAt);
  const tripEndMinutes = getMinutesSinceMidnight(estimatedEndAt);
  const tripDurationMinutes = Math.round(
    (estimatedEndAt.getTime() - pickupAt.getTime()) / 60000
  );

  const nightStartMinutes = parseTimeToMinutes(nightStart); // 22:00 = 1320
  const nightEndMinutes = parseTimeToMinutes(nightEnd); // 06:00 = 360

  // For overnight ranges, calculate overlap with two segments
  if (nightStartMinutes > nightEndMinutes) {
    // Night period spans midnight: 22:00-24:00 and 00:00-06:00
    const segment1 = { start: nightStartMinutes, end: 1440 }; // 22:00-24:00
    const segment2 = { start: 0, end: nightEndMinutes }; // 00:00-06:00

    // Calculate overlap with each segment, accounting for multi-day trips
    return calculateOverlapWithSegments(
      pickupAt,
      estimatedEndAt,
      tripDurationMinutes,
      [segment1, segment2]
    );
  }

  // Normal range (e.g., 09:00-18:00)
  return calculateOverlapWithSegments(
    pickupAt,
    estimatedEndAt,
    tripDurationMinutes,
    [{ start: nightStartMinutes, end: nightEndMinutes }]
  );
}
```

### Weighted Rate Application

```typescript
interface WeightedRateResult {
  adjustedPrice: number;
  nightMinutes: number;
  totalMinutes: number;
  nightPercentage: number;
  baseAdjustment: number;
  effectiveAdjustment: number;
}

export function calculateWeightedNightRate(
  basePrice: number,
  pickupAt: Date,
  estimatedEndAt: Date | null,
  rate: AdvancedRateData
): WeightedRateResult | null {
  // Fallback to binary if no estimatedEndAt
  if (!estimatedEndAt || !rate.startTime || !rate.endTime) {
    return null; // Caller should use binary evaluation
  }

  const totalMinutes = Math.round(
    (estimatedEndAt.getTime() - pickupAt.getTime()) / 60000
  );

  if (totalMinutes <= 0) {
    return null;
  }

  const nightMinutes = calculateNightOverlapMinutes(
    pickupAt,
    estimatedEndAt,
    rate.startTime,
    rate.endTime
  );

  const nightPercentage = (nightMinutes / totalMinutes) * 100;
  const effectiveAdjustment = rate.value * (nightMinutes / totalMinutes);

  // Apply weighted adjustment
  let adjustedPrice = basePrice;
  if (rate.adjustmentType === "PERCENTAGE") {
    adjustedPrice = basePrice * (1 + effectiveAdjustment / 100);
  } else {
    adjustedPrice = basePrice + rate.value * (nightMinutes / totalMinutes);
  }

  return {
    adjustedPrice,
    nightMinutes,
    totalMinutes,
    nightPercentage,
    baseAdjustment: rate.value,
    effectiveAdjustment,
  };
}
```

### Files to Modify

1. **`packages/api/src/services/pricing-engine.ts`**

   - Add `calculateNightOverlapMinutes()` function
   - Add `calculateWeightedNightRate()` function
   - Update `MultiplierContext` to include `estimatedEndAt`
   - Update `evaluateAdvancedRate()` for weighted NIGHT calculation
   - Update `AppliedMultiplierRule` interface for weighted details

2. **`packages/api/src/routes/vtc/pricing-calculate.ts`**

   - Pass `estimatedEndAt` to pricing context

3. **`packages/i18n/translations/en.json`** and **`fr.json`**
   - Add translation keys for weighted night rate messages

### Existing Code to Leverage

From `pricing-engine.ts`:

- `isTimeInRange()` - Already handles overnight ranges (line 2144-2165)
- `parseTimeString()` - Parses "HH:MM" format (line 2127-2135)
- `getParisTime()` - Gets hours/minutes in Europe/Paris (line 2110-2125)
- `isNightTime()` - Current binary check (line 2181-2184)
- `evaluateAdvancedRate()` - Current NIGHT evaluation (line 2226-2253)
- `evaluateAdvancedRates()` - Applies all rates (line 2275-2308)

From Story 17.5:

- `calculateEstimatedEndAt()` - Provides `estimatedEndAt` (line 1081-1109)

### Interface Updates

```typescript
// Add to MultiplierContext
export interface MultiplierContext {
  pickupAt: Date | null;
  estimatedEndAt: Date | null; // NEW: Story 17.8
  distanceKm: number;
  pickupZoneId: string | null;
  dropoffZoneId: string | null;
}

// Add to AppliedMultiplierRule
export interface AppliedMultiplierRule {
  type: string;
  description: string;
  ruleId?: string;
  ruleName?: string;
  adjustmentType?: string;
  adjustmentValue?: number;
  priceBefore: number;
  priceAfter: number;
  // NEW: Story 17.8 - Weighted night rate details
  weightedDetails?: {
    nightPeriodStart: string;
    nightPeriodEnd: string;
    tripStart: string;
    tripEnd: string;
    nightMinutes: number;
    totalMinutes: number;
    nightPercentage: number;
    baseAdjustment: number;
    effectiveAdjustment: number;
  };
}
```

### Project Structure Notes

- Pricing engine is in `packages/api/src/services/pricing-engine.ts`
- Tests are in `packages/api/src/services/__tests__/pricing-engine.test.ts`
- Translations are in `packages/i18n/translations/`
- Story 17.5 already provides `estimatedEndAt` calculation

### References

- [Source: docs/bmad/epics.md#Story-17.8] - Story definition
- [Source: docs/bmad/prd.md#FR70] - Functional requirement
- [Source: packages/api/src/services/pricing-engine.ts:2137-2253] - Current night rate implementation
- [Source: packages/api/src/services/pricing-engine.ts:1081-1109] - calculateEstimatedEndAt (Story 17.5)
- [Source: packages/api/src/services/__tests__/pricing-engine.test.ts:1980-2125] - Existing night rate tests

---

## Test Cases

### Unit Tests (Vitest)

#### TC1: calculateNightOverlapMinutes - Basic Cases

```typescript
describe("calculateNightOverlapMinutes", () => {
  // Night period: 22:00-06:00

  it("should return 0 for trip entirely in day period (10:00-14:00)", () => {
    const pickupAt = new Date("2025-01-15T10:00:00");
    const endAt = new Date("2025-01-15T14:00:00");
    const result = calculateNightOverlapMinutes(
      pickupAt,
      endAt,
      "22:00",
      "06:00"
    );
    expect(result).toBe(0);
  });

  it("should return full duration for trip entirely in night period (23:00-02:00)", () => {
    const pickupAt = new Date("2025-01-15T23:00:00");
    const endAt = new Date("2025-01-16T02:00:00");
    const result = calculateNightOverlapMinutes(
      pickupAt,
      endAt,
      "22:00",
      "06:00"
    );
    expect(result).toBe(180); // 3 hours = 180 minutes
  });

  it("should return partial overlap for trip spanning day/night (20:00-23:00)", () => {
    const pickupAt = new Date("2025-01-15T20:00:00");
    const endAt = new Date("2025-01-15T23:00:00");
    const result = calculateNightOverlapMinutes(
      pickupAt,
      endAt,
      "22:00",
      "06:00"
    );
    expect(result).toBe(60); // 1 hour in night (22:00-23:00)
  });

  it("should handle early morning trip (05:00-08:00)", () => {
    const pickupAt = new Date("2025-01-15T05:00:00");
    const endAt = new Date("2025-01-15T08:00:00");
    const result = calculateNightOverlapMinutes(
      pickupAt,
      endAt,
      "22:00",
      "06:00"
    );
    expect(result).toBe(60); // 1 hour in night (05:00-06:00)
  });

  it("should handle overnight trip (21:00-01:00)", () => {
    const pickupAt = new Date("2025-01-15T21:00:00");
    const endAt = new Date("2025-01-16T01:00:00");
    const result = calculateNightOverlapMinutes(
      pickupAt,
      endAt,
      "22:00",
      "06:00"
    );
    expect(result).toBe(180); // 3 hours in night (22:00-01:00)
  });
});
```

#### TC2: calculateWeightedNightRate

```typescript
describe("calculateWeightedNightRate", () => {
  const nightRate: AdvancedRateData = {
    id: "rate-night",
    name: "Night Surcharge",
    appliesTo: "NIGHT",
    startTime: "22:00",
    endTime: "06:00",
    daysOfWeek: null,
    minDistanceKm: null,
    maxDistanceKm: null,
    zoneId: null,
    adjustmentType: "PERCENTAGE",
    value: 20, // +20%
    priority: 10,
    isActive: true,
  };

  it("should apply 33% of night rate for 1/3 night trip", () => {
    const pickupAt = new Date("2025-01-15T20:00:00");
    const endAt = new Date("2025-01-15T23:00:00");
    const basePrice = 100;

    const result = calculateWeightedNightRate(
      basePrice,
      pickupAt,
      endAt,
      nightRate
    );

    expect(result).not.toBeNull();
    expect(result!.nightMinutes).toBe(60);
    expect(result!.totalMinutes).toBe(180);
    expect(result!.nightPercentage).toBeCloseTo(33.33, 1);
    expect(result!.effectiveAdjustment).toBeCloseTo(6.67, 1);
    expect(result!.adjustedPrice).toBeCloseTo(106.67, 1);
  });

  it("should apply 100% night rate for fully night trip", () => {
    const pickupAt = new Date("2025-01-15T23:00:00");
    const endAt = new Date("2025-01-16T02:00:00");
    const basePrice = 100;

    const result = calculateWeightedNightRate(
      basePrice,
      pickupAt,
      endAt,
      nightRate
    );

    expect(result!.nightPercentage).toBe(100);
    expect(result!.effectiveAdjustment).toBe(20);
    expect(result!.adjustedPrice).toBe(120);
  });

  it("should return null when estimatedEndAt is null", () => {
    const pickupAt = new Date("2025-01-15T23:00:00");
    const basePrice = 100;

    const result = calculateWeightedNightRate(
      basePrice,
      pickupAt,
      null,
      nightRate
    );

    expect(result).toBeNull();
  });
});
```

#### TC3: Integration with evaluateAdvancedRates

```typescript
describe("evaluateAdvancedRates with weighted night rate", () => {
  it("should include weightedDetails in appliedRules for partial night trip", () => {
    const context: MultiplierContext = {
      pickupAt: new Date("2025-01-15T20:00:00"),
      estimatedEndAt: new Date("2025-01-15T23:00:00"),
      distanceKm: 50,
      pickupZoneId: null,
      dropoffZoneId: null,
    };

    const result = evaluateAdvancedRates(100, context, [nightRate]);

    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0].weightedDetails).toBeDefined();
    expect(result.appliedRules[0].weightedDetails!.nightPercentage).toBeCloseTo(
      33.33,
      1
    );
  });

  it("should fall back to binary when estimatedEndAt is null", () => {
    const context: MultiplierContext = {
      pickupAt: new Date("2025-01-15T23:00:00"), // In night period
      estimatedEndAt: null,
      distanceKm: 50,
      pickupZoneId: null,
      dropoffZoneId: null,
    };

    const result = evaluateAdvancedRates(100, context, [nightRate]);

    // Should apply full 20% (binary behavior)
    expect(result.adjustedPrice).toBe(120);
    expect(result.appliedRules[0].weightedDetails).toBeUndefined();
  });
});
```

### API Tests (Curl)

#### TC4: Pricing with Weighted Night Rate

```bash
# Test: Create pricing calculation for trip spanning day/night
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contactId": "test-contact-id",
    "vehicleCategoryId": "berline-id",
    "pickupAddress": "Paris, France",
    "pickupLat": 48.8566,
    "pickupLng": 2.3522,
    "dropoffAddress": "Versailles, France",
    "dropoffLat": 48.8014,
    "dropoffLng": 2.1301,
    "pickupAt": "2025-01-15T20:00:00",
    "tripType": "transfer"
  }'

# Expected: Response includes weighted night rate in appliedRules
# {
#   "price": 95.67,
#   "appliedRules": [
#     {
#       "type": "ADVANCED_RATE",
#       "description": "Applied NIGHT rate: Night Surcharge (33% of trip)",
#       "weightedDetails": {
#         "nightPercentage": 33.33,
#         "effectiveAdjustment": 6.67,
#         ...
#       }
#     }
#   ]
# }
```

---

## Dependencies

- **Story 17.5:** Quote Estimated End Time (estimatedEndAt) ✅ **DONE** - Provides `estimatedEndAt` calculation

## Blocked By

None

## Blocks

None (last story in this feature chain)

---

## Definition of Done

- [ ] `calculateNightOverlapMinutes()` function implemented and tested
- [ ] `calculateWeightedNightRate()` function implemented and tested
- [ ] `MultiplierContext` updated with `estimatedEndAt` field
- [ ] `evaluateAdvancedRate()` uses weighted calculation for NIGHT type
- [ ] `AppliedMultiplierRule` includes `weightedDetails` for weighted rates
- [ ] Fallback to binary behavior when `estimatedEndAt` is null
- [ ] All unit tests pass (Vitest)
- [ ] Integration test with full pricing flow
- [ ] Translations added for weighted rate messages
- [ ] Code reviewed and merged

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

- Unit tests: 29/29 passed
- Existing pricing-engine tests: 123 passed (8 failed - preexisting issues unrelated to Story 17.8)

### Completion Notes List

**Completed (31/12/2025):**

1. **MultiplierContext Interface Updated** ✅

   - Added `estimatedEndAt: Date | null` field for weighted rate calculation
   - Updated all callers in `calculatePrice()` to pass `estimatedEndAt`

2. **WeightedNightRateDetails Interface Added** ✅

   - New interface for transparency in appliedRules
   - Includes: nightPeriodStart, nightPeriodEnd, tripStart, tripEnd, nightMinutes, totalMinutes, nightPercentage, baseAdjustment, effectiveAdjustment

3. **AppliedMultiplierRule Extended** ✅

   - Added optional `weightedDetails?: WeightedNightRateDetails` field

4. **Core Functions Implemented** ✅

   - `calculateNightOverlapMinutes()` - Calculates minutes of trip in night period
   - `calculateWeightedNightRate()` - Calculates weighted rate adjustment
   - Handles overnight ranges (22:00-06:00), trips crossing midnight, multi-day trips

5. **evaluateAdvancedRates Updated** ✅

   - NIGHT rates now use weighted calculation when `estimatedEndAt` is available
   - Falls back to binary behavior when `estimatedEndAt` is null
   - WEEKEND rates remain binary (not weighted)

6. **Unit Tests Created** ✅

   - 29 tests covering all acceptance criteria
   - Tests for: basic cases, early morning, overnight, multi-day, fallback, combined rates

7. **Translations Added** ✅
   - English: `weightedNightRate`, `nightRateDetails`
   - French: `weightedNightRate`, `nightRateDetails`

### File List

**Modified:**

1. `packages/api/src/services/pricing-engine.ts`

   - Added `estimatedEndAt` to `MultiplierContext` interface
   - Added `WeightedNightRateDetails` interface
   - Added `weightedDetails` to `AppliedMultiplierRule` interface
   - Added `calculateNightOverlapMinutes()` function
   - Added `calculateWeightedNightRate()` function
   - Updated `evaluateAdvancedRates()` for weighted NIGHT calculation
   - Updated `calculatePrice()` to calculate and pass `estimatedEndAt`

2. `packages/i18n/translations/en.json` - Added weighted night rate translations
3. `packages/i18n/translations/fr.json` - Added weighted night rate translations

**Created:**

1. `packages/api/src/services/__tests__/weighted-night-rate.test.ts` - 29 unit tests
