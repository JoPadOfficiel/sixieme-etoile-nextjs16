# Story 16.7 – Calcul Prix Excursion Multi-Arrêts

**Epic:** 16 - Quote Refactoring  
**Status:** In Progress  
**Priority:** Medium  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-12-02  
**Author:** Bob (Scrum Master)

---

## User Story

**As a** pricing engine,  
**I want** to calculate excursion prices based on total distance including all stops,  
**So that** multi-stop excursions are priced accurately.

---

## Problem Statement

Le moteur de tarification actuel ne calcule pas correctement les excursions multi-arrêts :

- La distance ne prend pas en compte les arrêts intermédiaires
- `TripAnalysis.segments` est limité à 3 segments (approach/service/return)
- L'UI ne visualise pas chaque leg séparément

**Impact business :** Sous-facturation estimée de 15-25% sur les excursions complexes.

---

## Acceptance Criteria

### AC1 - Multi-Stop Distance Calculation

**Given** an excursion with stops [A → B → C → D],  
**When** the pricing engine calculates distance,  
**Then** it sums: `distance(A→B) + distance(B→C) + distance(C→D)`,  
**And** the total distance is used for pricing.

### AC2 - Minimum Duration Applied

**Given** an excursion with total duration 2 hours,  
**When** the pricing engine calculates,  
**Then** it uses the minimum duration (4 hours) per Story 15.5,  
**And** the `TRIP_TYPE` rule shows `minimumApplied: true`.

### AC3 - Stops in Trip Analysis

**Given** an excursion with multiple stops,  
**When** the quote is saved,  
**Then** `tripAnalysis.excursionLegs` includes each leg as a separate segment:

```typescript
excursionLegs: [
  { from: "Paris", to: "Versailles", distanceKm: 22, durationMinutes: 35 },
  { from: "Versailles", to: "Giverny", distanceKm: 65, durationMinutes: 55 },
  { from: "Giverny", to: "Paris", distanceKm: 75, durationMinutes: 70 },
];
```

### AC4 - Return Date Handling

**Given** an excursion with `returnDate` different from `pickupAt`,  
**When** the pricing engine calculates,  
**Then** it notes the multi-day nature in `tripAnalysis.isMultiDay: true`.

---

## Technical Design

### 1. Data Structures

#### New Interface: ExcursionLeg

```typescript
// packages/api/src/services/pricing-engine.ts
export interface ExcursionLeg {
  order: number;
  fromAddress: string;
  toAddress: string;
  distanceKm: number;
  durationMinutes: number;
  cost: {
    fuel: number;
    tolls: number;
    wear: number;
    driver: number;
    total: number;
  };
}
```

#### Extended TripAnalysis

```typescript
export interface TripAnalysis {
  // Existing fields for transfers
  segments: {
    approach: SegmentAnalysis | null;
    service: SegmentAnalysis;
    return: SegmentAnalysis | null;
  };
  // New fields for excursions
  excursionLegs?: ExcursionLeg[];
  isMultiDay?: boolean;
  totalStops?: number;
  // ... existing fields
}
```

### 2. Routing with Waypoints

#### Function: calculateExcursionRoute

```typescript
// packages/api/src/lib/routing.ts
export async function calculateExcursionRoute(
  origin: GeoPoint,
  destination: GeoPoint,
  waypoints: GeoPoint[]
): Promise<ExcursionRouteResult> {
  // Call Google Routes API with intermediates
  // Return legs array with distance/duration per leg
}
```

### 3. Pricing Engine Changes

#### Function: buildExcursionResult

```typescript
// packages/api/src/services/pricing-engine.ts
function buildExcursionResult(
  legs: ExcursionLeg[],
  settings: OrganizationPricingSettings,
  appliedRules: AppliedRule[]
  // ... other params
): PricingResult {
  // Sum total distance from all legs
  // Apply minimum duration (4h)
  // Calculate price based on total distance/duration
}
```

### 4. API Changes

#### Pricing Calculate Endpoint

```typescript
// packages/api/src/routes/vtc/pricing-calculate.ts
// Add stops to schema
stops: z.array(z.object({
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  order: z.number(),
})).optional(),
```

### 5. UI Changes

#### TripTransparencyPanel

- Display excursion legs in Route tab
- Show each leg with from → to, distance, duration
- Total at bottom

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                         | Input                  | Expected Output                  |
| ------- | ----------------------------------- | ---------------------- | -------------------------------- |
| UT-1    | Calculate 2-stop excursion distance | Paris→Versailles→Paris | Sum of both legs                 |
| UT-2    | Calculate 4-stop excursion distance | A→B→C→D                | Sum of 3 legs                    |
| UT-3    | Apply minimum duration              | 2h excursion           | 4h applied, minimumApplied: true |
| UT-4    | Build excursion legs array          | 3 waypoints            | 3 ExcursionLeg objects           |

### Integration Tests (API)

| Test ID | Description                  | Endpoint                        | Expected               |
| ------- | ---------------------------- | ------------------------------- | ---------------------- |
| IT-1    | Excursion pricing with stops | POST /api/vtc/pricing/calculate | Correct total distance |
| IT-2    | Trip analysis contains legs  | POST /api/vtc/pricing/calculate | excursionLegs array    |

### E2E Tests (Playwright)

| Test ID | Description                   | Steps                  | Expected                      |
| ------- | ----------------------------- | ---------------------- | ----------------------------- |
| E2E-1   | Create excursion with 3 stops | Fill form, add 2 stops | Price reflects total distance |
| E2E-2   | View excursion legs in UI     | Open TripTransparency  | All legs displayed            |

---

## Files to Modify

1. `packages/api/src/services/pricing-engine.ts`

   - Add `ExcursionLeg` interface
   - Extend `TripAnalysis` with `excursionLegs`
   - Add `buildExcursionResult()` function
   - Add `calculateExcursionSegments()` function

2. `packages/api/src/lib/routing.ts`

   - Add `calculateExcursionRoute()` with waypoints support

3. `packages/api/src/routes/vtc/pricing-calculate.ts`

   - Add `stops` to validation schema
   - Pass stops to routing function

4. `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`

   - Pass stops to API

5. `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`
   - Display excursion legs in Route tab

---

## Definition of Done

- [x] Multi-stop distance calculated correctly (sum of all legs)
- [x] Minimum duration (4h) applied for excursions (via Story 15.5)
- [x] excursionLegs array in tripAnalysis
- [ ] Google Routes API called with waypoints (requires routing integration)
- [x] UI displays all legs in TripTransparency
- [ ] Unit tests passing (Vitest)
- [ ] E2E tests passing (Playwright)

## Implementation Progress

### Completed

1. **Backend Types** (`packages/api/src/services/pricing-engine.ts`)

   - Added `ExcursionLeg` interface
   - Added `ExcursionStop` interface
   - Added `ExcursionCalculationInput` interface
   - Extended `TripAnalysis` with `excursionLegs`, `isMultiDay`, `totalStops`
   - Implemented `calculateExcursionLegs()` function
   - Implemented `calculateLegCost()` helper function
   - Implemented `buildExcursionTripAnalysis()` function

2. **API Schema** (`packages/api/src/routes/vtc/pricing-calculate.ts`)

   - Added `excursionStopSchema` for validation
   - Added `stops` and `returnDate` to `calculatePricingSchema`
   - Added imports for excursion functions

3. **Frontend Types** (`apps/web/modules/saas/quotes/types.ts`)

   - Added `ExcursionLeg` interface
   - Extended `TripAnalysis` with excursion fields

4. **Frontend Hook** (`apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`)

   - Added `ExcursionStopInput` interface
   - Extended `PricingCalculationInput` with `stops` and `returnDate`
   - Modified `calculate()` to pass stops to API

5. **UI Component** (`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`)

   - Added conditional rendering for excursion legs
   - Added excursion badge with stop count
   - Added multi-day badge
   - Added table for displaying each leg

6. **Translations** (`packages/i18n/translations/en.json`, `fr.json`)
   - Added: excursion, stops, multiDay, leg

---

## Notes

- **Rétrocompatibilité** : Les transfers continuent d'utiliser segments.approach/service/return
- **Excursions** : Utilisent le nouveau champ excursionLegs
- **Limite API** : Google Routes supporte max 25 waypoints
- **Performance** : Un seul appel API avec tous les waypoints

---

## Dependencies

- ✅ Story 16.1 - Schema Quote étendu (stops field)
- ✅ Story 16.2 - Formulaire dynamique (stops UI)
- ✅ Story 15.5 - Trip type differentiation (minimum duration)
- ✅ Story 15.1/15.2 - Google Routes API integration
