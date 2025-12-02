# Story 16.9 – Support Off-Grid avec Notes Obligatoires

**Epic:** 16 - Quote Refactoring  
**Status:** Done  
**Priority:** Low  
**Estimated Effort:** 2 Story Points  
**Created:** 2025-12-02  
**Author:** Bob (Scrum Master)

---

## User Story

**As an** operator,  
**I want** to create off-grid quotes with just a pickup address and description,  
**So that** I can handle non-standard trips that don't fit other categories.

---

## Problem Statement

Le système de devis actuel ne gère pas correctement les trajets "off-grid" :

- Le formulaire tente de calculer un prix automatiquement
- Le dropoff est requis même quand non pertinent
- Les notes ne sont pas obligatoires, menant à des devis sans contexte
- Pas d'estimation de rentabilité pour les prix manuels

**Impact business :** Impossibilité de gérer les demandes atypiques correctement.

---

## Acceptance Criteria

### AC1 - Minimal Required Fields

**Given** an off-grid quote,  
**When** I create the quote,  
**Then** only these fields are required:

- Contact
- Pickup address
- Pickup date/time
- Vehicle category
- Notes (description of the trip)
- Final price (manual entry)

### AC2 - No Automatic Pricing

**Given** an off-grid quote,  
**When** I fill in the form,  
**Then** no automatic pricing calculation is triggered,  
**And** the suggested price shows "—" (not calculated),  
**And** I must manually enter the final price.

### AC3 - Notes Validation

**Given** an off-grid quote with empty notes,  
**When** I try to submit,  
**Then** validation fails with "Notes are required for off-grid trips".

### AC4 - Profitability Calculation

**Given** an off-grid quote with manual price,  
**When** I enter the final price,  
**Then** the profitability indicator updates based on estimated internal cost,  
**And** internal cost is estimated from pickup address only (approach segment).

---

## Technical Design

### 1. Pricing Hook Changes

#### Skip API call for OFF_GRID

```typescript
// apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts
// Don't call API for OFF_GRID
if (formData.tripType === "OFF_GRID") {
  // Return a special "no calculation" result
  return;
}
```

### 2. Form Validation Changes

#### Notes required for OFF_GRID

```typescript
// apps/web/modules/saas/quotes/components/CreateQuoteForm.tsx
// Conditional validation
const isNotesRequired = tripType === "OFF_GRID";
if (isNotesRequired && !notes?.trim()) {
  errors.notes = "Notes are required for off-grid trips";
}
```

### 3. API Changes

#### Handle OFF_GRID in pricing endpoint

```typescript
// packages/api/src/routes/vtc/pricing-calculate.ts
// Return early for OFF_GRID with minimal response
if (data.tripType === "off_grid") {
  return c.json({
    pricingMode: "MANUAL",
    price: 0,
    suggestedPrice: null,
    // ... minimal response
  });
}
```

### 4. UI Changes

#### Display "—" for suggested price

- When tripType is OFF_GRID, show "—" instead of calculated price
- Enable final price input without suggested price

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                       | Input                           | Expected Output |
| ------- | --------------------------------- | ------------------------------- | --------------- |
| UT-1    | Skip pricing for OFF_GRID         | tripType=OFF_GRID               | No API call     |
| UT-2    | Notes validation for OFF_GRID     | tripType=OFF_GRID, notes=""     | Error           |
| UT-3    | Notes validation for transfer     | tripType=TRANSFER, notes=""     | No error        |
| UT-4    | Dropoff not required for OFF_GRID | tripType=OFF_GRID, dropoff=null | Valid           |

### E2E Tests (Playwright)

| Test ID | Description                     | Steps                      | Expected         |
| ------- | ------------------------------- | -------------------------- | ---------------- |
| E2E-1   | Create OFF_GRID without dropoff | Select OFF_GRID, fill form | Quote created    |
| E2E-2   | Verify notes required           | Submit without notes       | Validation error |
| E2E-3   | Verify suggested price          | Select OFF_GRID            | Shows "—"        |

---

## Files to Modify

1. `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`

   - Skip API call for OFF_GRID
   - Return special "no calculation" state

2. `apps/web/modules/saas/quotes/components/CreateQuoteForm.tsx`

   - Add conditional notes validation for OFF_GRID
   - Hide dropoff field for OFF_GRID

3. `packages/api/src/routes/vtc/pricing-calculate.ts`

   - Handle OFF_GRID with minimal response
   - Skip pricing calculation

4. `packages/i18n/translations/en.json` + `fr.json`
   - Add validation message for notes required

---

## Definition of Done

- [x] No automatic pricing for OFF_GRID
- [x] Dropoff optional for OFF_GRID
- [x] Notes required for OFF_GRID (via form validation)
- [x] Suggested price shows "—"
- [x] Unit tests passing (Vitest) - 15 tests in `off-grid-pricing.test.ts`
- [x] E2E tests passing (Playwright) - Formulaire OFF_GRID vérifié

## Implementation Progress

### Completed

1. **API Schema** (`packages/api/src/routes/vtc/pricing-calculate.ts`)

   - Added `off_grid` to tripType enum
   - Return minimal response for OFF_GRID (pricingMode: "MANUAL")
   - No pricing calculation triggered

2. **Frontend Hook** (`apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`)

   - Skip API call for OFF_GRID trips
   - Map OFF_GRID to `off_grid` for API
   - Added `off_grid` to tripType union

3. **Translations** (`packages/i18n/translations/en.json`, `fr.json`)

   - Added: offGrid, offGridManualPricing, offGridNoCalculation

4. **Unit Tests** (`packages/api/src/services/__tests__/off-grid-pricing.test.ts`)
   - 15 tests covering pricing behavior, notes validation, dropoff validation, trip type mapping

---

## Notes

- **OFF_GRID** est pour les trajets atypiques (événements, trajets complexes)
- **Prix manuel** : L'opérateur doit entrer le prix final
- **Rentabilité** : Estimée sur le segment d'approche uniquement

---

## Dependencies

- ✅ Story 16.1 - Schema Quote étendu (tripType OFF_GRID)
- ✅ Story 16.2 - Formulaire dynamique (champs conditionnels)
- ✅ Story 16.8 - DISPO pricing (dropoff optionnel pattern)
