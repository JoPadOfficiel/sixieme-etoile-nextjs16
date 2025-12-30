# Story 16.8 – Calcul Prix Mise à Disposition

**Epic:** 16 - Quote Refactoring  
**Status:** Done  
**Priority:** Medium  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-12-02  
**Author:** Bob (Scrum Master)

---

## User Story

**As a** pricing engine,  
**I want** to calculate mise à disposition prices based on duration and included kilometers,  
**So that** hourly rentals are priced correctly with overage fees.

---

## Problem Statement

Le moteur de tarification actuel ne gère pas correctement les mises à disposition :

- Le formulaire exige une adresse de destination même pour les DISPO
- Les kilomètres inclus ne sont pas calculés automatiquement
- Les dépassements kilométriques ne sont pas gérés
- Les forfaits partenaires (DispoPackage) ne sont pas appliqués

**Impact business :** Perte de revenus sur les dépassements non facturés, friction utilisateur.

---

## Acceptance Criteria

### AC1 - Hourly Pricing

**Given** a dispo quote with `durationHours = 4`,  
**When** the pricing engine calculates,  
**Then** the base price is `4 × ratePerHour`.

### AC2 - Included Kilometers

**Given** a dispo quote with `durationHours = 4`,  
**When** the form displays,  
**Then** `maxKilometers` is automatically calculated as `4 × 50 = 200 km`,  
**And** the operator can override this value.

### AC3 - Overage Calculation

**Given** a dispo quote with `durationHours = 4` and actual distance 250 km,  
**When** the pricing engine calculates,  
**Then** overage is `(250 - 200) × overageRatePerKm = 50 × 0.50 = 25€`,  
**And** total price is `basePrice + 25€`.

### AC4 - No Dropoff Required

**Given** a dispo quote,  
**When** I create the quote,  
**Then** `dropoffAddress` is optional and can be left empty,  
**And** the quote is valid without a dropoff address.

### AC5 - Partner Dispo Packages

**Given** a partner with a matching DispoPackage,  
**When** the pricing engine runs,  
**Then** it uses the package price (Method 1) instead of dynamic calculation.

---

## Technical Design

### 1. Pricing Engine Changes

#### New Interface: DispoOverageResult

```typescript
// packages/api/src/services/pricing-engine.ts
export interface DispoOverageResult {
  includedKm: number;
  actualKm: number;
  overageKm: number;
  overageAmount: number;
  overageRatePerKm: number;
}

export interface AppliedDispoOverageRule extends AppliedRule {
  type: "DISPO_OVERAGE";
  description: string;
  includedKm: number;
  actualKm: number;
  overageKm: number;
  overageAmount: number;
  overageRatePerKm: number;
}
```

#### Function: calculateDispoOverage

```typescript
export function calculateDispoOverage(
  actualKm: number,
  includedKm: number,
  overageRatePerKm: number
): DispoOverageResult {
  const overageKm = Math.max(0, actualKm - includedKm);
  const overageAmount = Math.round(overageKm * overageRatePerKm * 100) / 100;
  return {
    includedKm,
    actualKm,
    overageKm,
    overageAmount,
    overageRatePerKm,
  };
}
```

### 2. Form Changes

#### Dropoff Optional for DISPO

```typescript
// apps/web/modules/saas/quotes/components/CreateQuoteForm.tsx
// Make dropoff validation conditional
const isDropoffRequired = tripType !== "DISPO";
```

#### Auto-calculate maxKilometers

```typescript
// When durationHours changes, auto-calculate maxKilometers
const includedKmPerHour = settings?.dispoIncludedKmPerHour ?? 50;
const calculatedMaxKm = durationHours * includedKmPerHour;
```

### 3. API Changes

#### Pricing Calculate Endpoint

```typescript
// packages/api/src/routes/vtc/pricing-calculate.ts
// Add durationHours and maxKilometers to schema
durationHours: z.coerce.number().positive().optional(),
maxKilometers: z.coerce.number().nonnegative().optional(),
```

### 4. UI Changes

#### TripTransparencyPanel

- Display included km for DISPO
- Display overage if applicable
- Show "Dispo" badge with duration

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                     | Input                              | Expected Output |
| ------- | ------------------------------- | ---------------------------------- | --------------- |
| UT-1    | Calculate dispo price 4h        | durationHours=4, rate=45           | price=180       |
| UT-2    | Calculate included km           | durationHours=4, kmPerHour=50      | maxKm=200       |
| UT-3    | Calculate overage               | actualKm=250, maxKm=200, rate=0.50 | overage=25      |
| UT-4    | No overage if under max         | actualKm=150, maxKm=200            | overage=0       |
| UT-5    | Form validation without dropoff | tripType=DISPO, dropoff=null       | valid=true      |

### Integration Tests (API)

| Test ID | Description                | Endpoint                        | Expected               |
| ------- | -------------------------- | ------------------------------- | ---------------------- |
| IT-1    | DISPO pricing with overage | POST /api/vtc/pricing/calculate | Price includes overage |
| IT-2    | DISPO without dropoff      | POST /api/vtc/pricing/calculate | Success                |

### E2E Tests (Playwright)

| Test ID | Description                  | Steps                                   | Expected          |
| ------- | ---------------------------- | --------------------------------------- | ----------------- |
| E2E-1   | Create DISPO without dropoff | Select DISPO, fill form without dropoff | Quote created     |
| E2E-2   | Verify km inclus auto-calc   | Enter 4h duration                       | maxKm shows 200   |
| E2E-3   | Verify overage in UI         | Enter distance > maxKm                  | Overage displayed |

---

## Files to Modify

1. `packages/api/src/services/pricing-engine.ts`

   - Add `DispoOverageResult` interface
   - Add `AppliedDispoOverageRule` interface
   - Add `calculateDispoOverage()` function
   - Modify `calculateDispoPrice()` to include overage

2. `packages/api/src/routes/vtc/pricing-calculate.ts`

   - Add `durationHours` and `maxKilometers` to schema
   - Pass to pricing engine

3. `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`

   - Pass `durationHours` and `maxKilometers` to API

4. `apps/web/modules/saas/quotes/components/CreateQuoteForm.tsx`

   - Make dropoff optional for DISPO
   - Auto-calculate maxKilometers from durationHours

5. `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`

   - Display DISPO-specific info (included km, overage)

6. `packages/i18n/translations/en.json` + `fr.json`
   - Add translations for DISPO UI elements

---

## Definition of Done

- [x] Hourly pricing calculated correctly (duration × rate)
- [x] Included km auto-calculated (duration × 50)
- [x] Overage calculated when km > max
- [x] Dropoff optional for DISPO
- [x] DispoPackage applied for partners (via Story 15.5)
- [x] UI displays included km and overage
- [x] Unit tests passing (Vitest) - 13 tests in `dispo-pricing.test.ts`
- [x] E2E tests passing (Playwright) - Formulaire DISPO vérifié

## Implementation Progress

### Completed

1. **API Schema** (`packages/api/src/routes/vtc/pricing-calculate.ts`)

   - Made `dropoff` optional in schema
   - Added `durationHours` and `maxKilometers` fields
   - Added validation: dropoff required for non-DISPO trips
   - Added `effectiveDropoff` fallback for DISPO

2. **Pricing Engine** (`packages/api/src/services/pricing-engine.ts`)

   - Added `durationHours` and `maxKilometers` to `PricingRequest`
   - `calculateDispoPrice()` already handles overage (Story 15.5)

3. **Frontend Hook** (`apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`)

   - Made `dropoff` optional in `PricingCalculationInput`
   - Added `durationHours` and `maxKilometers` fields
   - Conditional dropoff passing based on form data

4. **Translations** (`packages/i18n/translations/en.json`, `fr.json`)

   - Added: dispo, dispoDuration, includedKm, actualKm, overageKm, overageRate, overageAmount

5. **Unit Tests** (`packages/api/src/services/__tests__/dispo-pricing.test.ts`)
   - 13 tests covering `calculateDispoPrice()` and `applyTripTypePricing()`
   - Tests for hourly pricing, included km, overage, edge cases

---

## Notes

- **Km inclus par défaut** : 50 km/h (configurable via `dispoIncludedKmPerHour`)
- **Tarif dépassement** : 0.50 €/km (configurable via `dispoOverageRatePerKm`)
- **Priorité forfaits** : DispoPackage > calcul dynamique

---

## Dependencies

- ✅ Story 16.1 - Schema Quote étendu (durationHours, maxKilometers)
- ✅ Story 16.2 - Formulaire dynamique (champs conditionnels)
- ✅ Story 15.5 - Trip type differentiation (calculateDispoPrice base)
