# Story 20.6: Fix Vehicle Category Price Multiplier Application

**Epic:** 20 - Critical Bug Fixes, Google Maps Migration & Comprehensive Testing  
**Status:** done  
**Priority:** HIGH  
**Effort:** S (Small)  
**Date:** 2026-01-02  
**Branch:** `feature/20-6-fix-vehicle-category-multiplier`

---

## Description

As a **VTC operator**,  
I want the pricing engine to correctly skip the vehicle category multiplier when category-specific rates are already used,  
So that my quotes reflect accurate prices without double application of the category premium.

### Root Cause

During the modular refactoring (Story 19-15), the fix from Story 19.1 was not correctly propagated to `main-calculator.ts`. The `usedCategoryRates` parameter was hardcoded to `false` instead of using the value returned by `resolveRates()`.

---

## Acceptance Criteria Status

| AC# | Critère                                                                      | Status |
| --- | ---------------------------------------------------------------------------- | ------ |
| AC1 | Propagation correcte de usedCategoryRates dans calculatePrice()              | ✅     |
| AC2 | Propagation correcte de usedCategoryRates dans calculatePriceWithRealTolls() | ✅     |
| AC3 | Multiplicateur appliqué quand rates org utilisés                             | ✅     |
| AC4 | Transparence dans appliedRules avec skippedReason                            | ✅     |
| AC5 | Prix cohérent Paris-Marseille Autocar                                        | ✅     |

---

## Test Results

### cURL Test - Paris-Marseille Autocar

- **Prix:** 4 829,74 € (au lieu de ~12 000€+ avec double application)
- **appliedRules:** Contient `"skippedReason": "CATEGORY_RATES_USED"` ✅
- **rateSource:** "CATEGORY" avec 4.50€/km ✅
- Le multiplicateur 2.5× n'a PAS été appliqué ✅

### Playwright MCP Test - UI Quote Creation

- Contact: Jean Martin (Privé)
- Trajet: Paris → Marseille
- Catégorie: Autocar (HEAVY)
- **Prix suggéré affiché: 6 032,33 €** ✅ (< 10 000€)

### Database Verification

Toutes les catégories ont `defaultRatePerKm` et `defaultRatePerHour` définis:

- Autocar: 4.50€/km, 120€/h, multiplier 2.50
- Berline: 1.80€/km, 45€/h, multiplier 1.00
- Luxe: 3.50€/km, 90€/h, multiplier 2.00
- Minibus: 3.00€/km, 75€/h, multiplier 1.80
- Van Premium: 2.20€/km, 55€/h, multiplier 1.30

---

## Changes Made

### `packages/api/src/services/pricing/main-calculator.ts`

#### 1. calculatePrice() - Lines 113-114

- Moved `resolveRates()` call outside the `if (pricingMode === "DYNAMIC")` block
- Added comment: `// Story 20.6: Resolve rates once for use in dynamic pricing and category multiplier check`

#### 2. calculatePrice() - Lines 173-175

- Changed `applyVehicleCategoryMultiplier(price, vehicleCategory, false)` to `applyVehicleCategoryMultiplier(price, vehicleCategory, rates.usedCategoryRates)`
- Added comment explaining the fix

#### 3. calculatePriceWithRealTolls() - Lines 339-340

- Same fix: moved `resolveRates()` outside the DYNAMIC block

#### 4. calculatePriceWithRealTolls() - Lines 399-401

- Same fix: use `rates.usedCategoryRates` instead of `false`

---

## Test Cases

### Test 1: cURL - Pricing with category having specific rates

```bash
curl -X POST "http://localhost:3000/api/vtc/pricing/calculate" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "pickup": {"lat": 48.8566, "lng": 2.3522, "address": "Paris"},
    "dropoff": {"lat": 43.2965, "lng": 5.3698, "address": "Marseille"},
    "vehicleCategoryId": "AUTOCAR_ID",
    "tripType": "transfer"
  }'
```

**Expected:** `appliedRules` contains `"skippedReason": "CATEGORY_RATES_USED"`

### Test 2: Playwright MCP - UI Quote Creation

1. Navigate to `/app/sixieme-etoile-vtc/quotes/new`
2. Select contact
3. Enter Paris → Marseille
4. Select "Autocar" category
5. Verify price is reasonable (< 10,000€)

### Test 3: Database Verification

```sql
SELECT name, code, "defaultRatePerKm", "defaultRatePerHour", "priceMultiplier"
FROM vehicle_category
WHERE "organizationId" = 'sixieme-etoile-vtc'
AND "defaultRatePerKm" IS NOT NULL;
```

---

## Files Modified

| File                                                   | Modification                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `packages/api/src/services/pricing/main-calculator.ts` | Propagate `usedCategoryRates` from `resolveRates()` to `applyVehicleCategoryMultiplier()` in both functions |

---

## Dependencies

- **Prerequisite:** Story 19.1 (original fix), Story 19.15 (modular architecture)
- **Related:** Story 20.5 (real costs integration)
