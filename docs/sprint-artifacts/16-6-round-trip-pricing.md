# Story 16.6 – Calcul Prix Aller-Retour pour Transfer

**Epic:** Epic 16 - Refactorisation du Système de Devis par Type de Trajet  
**Status:** done
**Priority:** Medium  
**Estimated Effort:** 2 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 16.1 ✅, Story 16.2 ✅, Story 15.5 ✅

---

## User Story

**As a** pricing engine,  
**I want** to correctly calculate round-trip transfer prices,  
**So that** aller-retour transfers are priced at 2× the one-way price.

---

## Problem Statement

Actuellement, lorsqu'un opérateur coche "Aller-retour" sur un devis de type TRANSFER, le prix n'est pas automatiquement doublé. Le champ `isRoundTrip` existe mais n'est pas utilisé par le moteur de pricing.

| Problème                | Impact                   |
| ----------------------- | ------------------------ |
| Prix non doublé         | Sous-tarification de 50% |
| Coût interne non doublé | Marge incorrecte         |
| Prix grille non doublé  | Incohérence partenaires  |
| Pas de traçabilité      | Aucune règle ROUND_TRIP  |

---

## Acceptance Criteria

### AC1 - Round Trip Pricing (Dynamic)

**Given** a transfer quote with `isRoundTrip = true`,  
**When** the pricing engine calculates using dynamic pricing,  
**Then** the base price is doubled (×2),  
**And** an `appliedRule` of type `ROUND_TRIP` is added with:

```json
{
  "type": "ROUND_TRIP",
  "description": "Round trip multiplier applied (×2)",
  "multiplier": 2,
  "priceBeforeRoundTrip": 100.0,
  "priceAfterRoundTrip": 200.0
}
```

### AC2 - Internal Cost Doubled

**Given** a round-trip transfer,  
**When** the shadow calculation runs,  
**Then** the internal cost is doubled,  
**And** the margin calculation uses the doubled internal cost.

**Example:**

- One-way internal cost: 25€
- Round-trip internal cost: 50€
- Price: 200€
- Margin: (200 - 50) / 200 = 75%

### AC3 - Grid Price Doubled

**Given** a partner with a grid route and `isRoundTrip = true`,  
**When** the pricing engine matches the route,  
**Then** the fixed price is doubled (contract price × 2),  
**And** the `ROUND_TRIP` rule is added to `appliedRules`.

**Example:**

- Grid price Paris → CDG: 73€
- Round-trip price: 146€

### AC4 - UI Display

**Given** a round-trip quote,  
**When** I view the TripTransparencyPanel,  
**Then** a badge "Round Trip ×2" is visible,  
**And** the route tab shows the trip with a "↔" indicator.

### AC5 - One-Way Unchanged

**Given** a transfer quote with `isRoundTrip = false` (or undefined),  
**When** the pricing engine calculates,  
**Then** the price is NOT doubled,  
**And** no `ROUND_TRIP` rule is added.

---

## Technical Design

### New Type

```typescript
// packages/api/src/services/pricing-engine.ts

interface AppliedRoundTripRule {
  type: "ROUND_TRIP";
  description: string;
  multiplier: 2;
  priceBeforeRoundTrip: number;
  priceAfterRoundTrip: number;
  internalCostBeforeRoundTrip: number;
  internalCostAfterRoundTrip: number;
}
```

### Modified Functions

#### 1. `buildDynamicResult()`

Add round-trip multiplier application AFTER all other multipliers:

```typescript
// After all other price adjustments
if (request.isRoundTrip) {
  const priceBeforeRoundTrip = price;
  const internalCostBeforeRoundTrip = internalCost;

  price = price * 2;
  internalCost = internalCost * 2;

  appliedRules.push({
    type: "ROUND_TRIP",
    description: "Round trip multiplier applied (×2)",
    multiplier: 2,
    priceBeforeRoundTrip,
    priceAfterRoundTrip: price,
    internalCostBeforeRoundTrip,
    internalCostAfterRoundTrip: internalCost,
  });
}
```

#### 2. `buildGridResult()`

Add round-trip multiplier for grid prices:

```typescript
// After getting grid price
if (request.isRoundTrip) {
  const priceBeforeRoundTrip = price;
  price = price * 2;

  appliedRules.push({
    type: "ROUND_TRIP",
    description: "Round trip multiplier applied to contract price (×2)",
    multiplier: 2,
    priceBeforeRoundTrip,
    priceAfterRoundTrip: price,
  });
}
```

### UI Changes

#### TripTransparencyPanel

Add round-trip badge next to pricing mode:

```tsx
{
  pricingResult.appliedRules?.some((r) => r.type === "ROUND_TRIP") && (
    <Badge variant="outline" className="text-xs">
      <ArrowLeftRightIcon className="size-3 mr-1" />
      {t("quotes.create.tripTransparency.roundTrip")}
    </Badge>
  );
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                    | Input                          | Expected             |
| ------- | ------------------------------ | ------------------------------ | -------------------- |
| UT-1    | Dynamic price doubled          | isRoundTrip=true, price=100    | price=200            |
| UT-2    | Internal cost doubled          | isRoundTrip=true, cost=25      | cost=50              |
| UT-3    | Grid price doubled             | isRoundTrip=true, gridPrice=73 | price=146            |
| UT-4    | One-way unchanged              | isRoundTrip=false, price=100   | price=100            |
| UT-5    | ROUND_TRIP rule added          | isRoundTrip=true               | rule in appliedRules |
| UT-6    | No ROUND_TRIP rule for one-way | isRoundTrip=false              | no rule              |

### E2E Tests (Playwright)

| Test ID | Description              | Steps                                          | Expected      |
| ------- | ------------------------ | ---------------------------------------------- | ------------- |
| E2E-1   | Round trip price doubled | Create quote → Check round trip → Verify price | Price ×2      |
| E2E-2   | Round trip badge visible | Create round trip quote → Check UI             | Badge visible |
| E2E-3   | One-way price normal     | Create quote → Uncheck round trip → Verify     | Normal price  |

---

## Files to Modify

1. `packages/api/src/services/pricing-engine.ts` - Add round-trip multiplier
2. `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx` - Add badge
3. `packages/i18n/translations/en.json` - Add translations
4. `packages/i18n/translations/fr.json` - Add translations

---

## Definition of Done

- [x] Dynamic price doubled for isRoundTrip = true
- [x] Internal cost doubled for round-trip
- [x] Grid price doubled for round-trip
- [x] ROUND_TRIP rule added to appliedRules
- [x] Round trip badge visible in TripTransparency
- [x] One-way pricing unchanged
- [x] All translations added (en + fr)
- [x] E2E tests passing - Verified via Playwright MCP (Marie Dupont + Round Trip = 67,68€ with badge)

---

## Notes

- **Order of Operations:** ROUND_TRIP multiplier applies LAST, after all other adjustments
- **Multiplier Value:** Always ×2, not configurable
- **Margin Calculation:** Uses doubled internal cost for accurate margin
