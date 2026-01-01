# Story 19.4: Fix Dispo Pricing Formula

**Epic:** Epic 19 - Pricing Engine Critical Fixes & Quote System Stabilization  
**Priority:** HIGH  
**Status:** done  
**Created:** 2026-01-01  
**Author:** Bob (Scrum Master) via BMad Orchestrator

---

## Description

Le moteur de pricing DISPO (mise à disposition) utilise actuellement la **durée estimée de la route** au lieu de la **durée spécifiée par l'utilisateur**. Cela produit des prix incorrects car :

1. Pour une DISPO de 4h à 45€/h, le prix attendu est **180€**
2. Le système utilise la durée de route estimée (ex: 30 min) → prix calculé = **22,50€**

### Cause racine

Dans `buildDynamicResult()`, la fonction `applyTripTypePricing()` est appelée avec `durationMinutes` (durée de route estimée) au lieu de `request.durationHours * 60` (durée demandée par l'utilisateur).

Le champ `durationHours` est bien passé dans `PricingRequest` mais n'est **jamais propagé** à `buildDynamicResult()` ni utilisé dans le calcul DISPO dynamique.

### Impact business

- **Sous-facturation massive** : Une DISPO de 4h facturée comme 30 min = perte de ~87% du revenu
- **Km inclus incorrects** : 4h × 50km/h = 200km attendus, mais calculé sur 30min = 25km
- **Dépassements kilométriques faussés** : Le client paie des dépassements non justifiés

---

## Critères d'Acceptation (AC)

### AC1: Utilisation de durationHours pour le calcul DISPO

**Given** un devis DISPO avec `durationHours = 4` et `ratePerHour = 45€`  
**When** le pricing engine calcule le prix dynamique  
**Then** le prix de base doit être `4 × 45 = 180€` (pas basé sur la durée de route)

### AC2: Km inclus calculés sur durationHours

**Given** un devis DISPO avec `durationHours = 4` et `dispoIncludedKmPerHour = 50`  
**When** le pricing engine calcule les km inclus  
**Then** `includedKm = 4 × 50 = 200 km`

### AC3: Dépassement kilométrique correct

**Given** un devis DISPO avec `durationHours = 4`, `maxKilometers = 250` (ou distance estimée)  
**When** la distance estimée dépasse les km inclus (200km)  
**Then** le dépassement = `max(0, 250 - 200) × 0.50 = 25€`  
**And** le prix total = `180 + 25 = 205€`

### AC4: Fallback si durationHours non fourni

**Given** un devis DISPO sans `durationHours` spécifié  
**When** le pricing engine calcule  
**Then** il utilise `estimatedDurationMinutes` de la route comme fallback  
**And** un warning est ajouté dans `appliedRules`

### AC5: Transparence dans appliedRules

**Given** un calcul DISPO avec `durationHours = 4`  
**When** le résultat est retourné  
**Then** `appliedRules` contient une règle `TRIP_TYPE` avec :

- `tripType: "dispo"`
- `requestedDurationHours: 4`
- `includedKm: 200`
- `basePriceBeforeAdjustment: 180`

### AC6: Backward compatibility

**Given** les tests existants du pricing engine  
**When** les tests sont exécutés après la modification  
**Then** tous les tests existants doivent passer  
**And** les trajets transfer et excursion ne sont pas affectés

---

## Cas de Tests

### Test 1: cURL - DISPO 4h Paris

```bash
curl -X POST "http://localhost:3000/api/vtc/pricing/calculate" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=O90mxkdZ7xPfu8VV1j_6Mub5GwlbEgTo.ZjljYpfad4MwXTrb7yxpScpaYxNQgBo1KppGzTQvOYs=" \
  -d '{
    "contactId": "CONTACT_ID",
    "pickup": {"lat": 48.8566, "lng": 2.3522, "address": "Paris, France"},
    "vehicleCategoryId": "BERLINE_CATEGORY_ID",
    "tripType": "dispo",
    "durationHours": 4,
    "passengerCount": 2,
    "pickupAt": "2026-01-05T10:00:00Z"
  }'
```

**Expected:**

- `price` ≈ 180€ (base) + marge + multiplicateurs
- `appliedRules` contient `tripType: "dispo"` avec `requestedDurationHours: 4`
- `includedKm: 200`

### Test 2: cURL - DISPO 8h avec dépassement km

```bash
curl -X POST "http://localhost:3000/api/vtc/pricing/calculate" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "CONTACT_ID",
    "pickup": {"lat": 48.8566, "lng": 2.3522},
    "vehicleCategoryId": "BERLINE_CATEGORY_ID",
    "tripType": "dispo",
    "durationHours": 8,
    "maxKilometers": 500,
    "passengerCount": 2
  }'
```

**Expected:**

- `includedKm: 400` (8h × 50km/h)
- `overageKm: 100` (500 - 400)
- `overageAmount: 50€` (100 × 0.50)
- Prix base = 8 × 45 = 360€

### Test 3: cURL - DISPO sans durationHours (fallback)

```bash
curl -X POST "http://localhost:3000/api/vtc/pricing/calculate" \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "CONTACT_ID",
    "pickup": {"lat": 48.8566, "lng": 2.3522},
    "dropoff": {"lat": 48.8922, "lng": 2.2417},
    "vehicleCategoryId": "BERLINE_CATEGORY_ID",
    "tripType": "dispo",
    "passengerCount": 2
  }'
```

**Expected:**

- Utilise `estimatedDurationMinutes` de la route
- `appliedRules` contient un warning `DISPO_DURATION_FALLBACK`

### Test 4: Playwright - Création devis DISPO via UI

1. Naviguer vers `/app/sixieme-etoile-vtc/quotes/new`
2. Sélectionner contact
3. Sélectionner type "Mise à disposition"
4. Entrer pickup "Paris, France"
5. Entrer durée "4" heures
6. Sélectionner catégorie "Berline"
7. Vérifier que "Prix suggéré" affiche ~180€ (+ marge)
8. Vérifier que "Km inclus" affiche "200 km"

### Test 5: DB Verification

```sql
-- Vérifier les settings de l'organisation
SELECT "dispoIncludedKmPerHour", "dispoOverageRatePerKm", "baseRatePerHour"
FROM organization_pricing_settings
WHERE "organizationId" = '11e26194-1263-487d-8999-f7c8b5891083';
```

### Test 6: Vitest - Unit Tests

```typescript
describe("calculateDispoPrice with durationHours", () => {
  it("should use durationHours instead of route duration", () => {
    const result = calculateDispoPrice(
      240, // 4 hours in minutes (from durationHours)
      100, // actual distance km
      45, // rate per hour
      { dispoIncludedKmPerHour: 50, dispoOverageRatePerKm: 0.5 }
    );

    expect(result.price).toBe(180); // 4h × 45€
    expect(result.rule.includedKm).toBe(200); // 4h × 50km
    expect(result.rule.overageKm).toBe(0); // 100 < 200
  });

  it("should calculate overage correctly", () => {
    const result = calculateDispoPrice(
      240, // 4 hours
      250, // actual distance km (exceeds included)
      45,
      { dispoIncludedKmPerHour: 50, dispoOverageRatePerKm: 0.5 }
    );

    expect(result.price).toBe(205); // 180 + 25 (overage)
    expect(result.rule.overageKm).toBe(50); // 250 - 200
    expect(result.rule.overageAmount).toBe(25); // 50 × 0.50
  });
});
```

---

## Contraintes & Dépendances

### Fichiers à modifier

| Fichier                                       | Modification                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts` | Modifier `buildDynamicResult()` pour accepter et utiliser `durationHours`                |
| `packages/api/src/services/pricing-engine.ts` | Modifier `applyTripTypePricing()` pour accepter `requestedDurationMinutes` optionnel     |
| `packages/api/src/services/pricing-engine.ts` | Modifier `calculatePrice()` pour passer `request.durationHours` à `buildDynamicResult()` |

### Dépendances

- ✅ Story 16.8 - Calcul Prix Mise à Disposition (base implémentée)
- ✅ Story 15.5 - Trip type differentiation (fonction `calculateDispoPrice` existe)
- ✅ Story 19.1 - Fix double category pricing (terminée)

### Bloque

- Story 19.14 - Add comprehensive pricing tests

---

## Solution Technique

### Modification 1: Ajouter `requestedDurationMinutes` à `buildDynamicResult()`

```typescript
function buildDynamicResult(
  distanceKm: number,
  durationMinutes: number,
  settings: OrganizationPricingSettings,
  appliedRules: AppliedRule[],
  fallbackReason: FallbackReason,
  gridSearchDetails: GridSearchDetails | null,
  usingDefaultSettings: boolean = false,
  multiplierContext: MultiplierContext | null = null,
  advancedRates: AdvancedRateData[] = [],
  seasonalMultipliers: SeasonalMultiplierData[] = [],
  shadowInput: ShadowCalculationInput | null = null,
  pickupZone: ZoneData | null = null,
  dropoffZone: ZoneData | null = null,
  vehicleCategory: VehicleCategoryInfo | undefined = undefined,
  tripType: TripType = "transfer",
  isRoundTrip: boolean = false,
  clientDifficultyScore: number | null = null,
  // NEW: Requested duration for DISPO (in minutes, from durationHours * 60)
  requestedDurationMinutes: number | null = null
): PricingResult {
  // ...

  // Story 19.4: For DISPO, use requested duration if provided
  const effectiveDurationMinutes =
    tripType === "dispo" && requestedDurationMinutes != null
      ? requestedDurationMinutes
      : durationMinutes;

  // Add warning if DISPO uses fallback duration
  if (tripType === "dispo" && requestedDurationMinutes == null) {
    appliedRules.push({
      type: "DISPO_DURATION_FALLBACK",
      description:
        "DISPO using route duration as fallback (durationHours not provided)",
      routeDurationMinutes: durationMinutes,
    });
  }

  // Story 15.5: Apply trip type specific pricing with effective duration
  const tripTypePricingResult = applyTripTypePricing(
    tripType,
    distanceKm,
    effectiveDurationMinutes, // Use effective duration
    resolvedRates.ratePerHour,
    calculation.basePrice,
    settings
  );
  // ...
}
```

### Modification 2: Passer `durationHours` dans `calculatePrice()`

```typescript
// In calculatePrice(), when calling buildDynamicResult():
return buildDynamicResult(
  estimatedDistanceKm,
  estimatedDurationMinutes,
  pricingSettings,
  appliedRules,
  fallbackReason,
  gridSearchDetails,
  false,
  multiplierContext,
  advancedRates,
  seasonalMultipliers,
  null,
  pickupZone,
  dropoffZone,
  vehicleCategory,
  request.tripType,
  request.isRoundTrip ?? false,
  contact.difficultyScore ?? null,
  // NEW: Pass requested duration for DISPO
  request.durationHours != null ? request.durationHours * 60 : null
);
```

### Modification 3: Enrichir `AppliedTripTypeRule` pour DISPO

```typescript
export interface AppliedTripTypeRule extends AppliedRule {
  type: "TRIP_TYPE" | "TIME_BUCKET";
  tripType: TripType;
  description: string;
  // ... existing fields ...
  // NEW: For DISPO transparency
  requestedDurationHours?: number;
  usedFallbackDuration?: boolean;
}
```

---

## Definition of Done

- [x] `durationHours` utilisé pour le calcul DISPO (pas la durée de route)
- [x] Km inclus calculés sur `durationHours`
- [x] Dépassements kilométriques corrects
- [x] Fallback avec warning si `durationHours` non fourni
- [x] `appliedRules` contient les détails DISPO
- [x] Tests unitaires passants (Vitest) - 16 tests
- [x] Tests E2E passants (Playwright) - Formulaire DISPO vérifié
- [x] Tests cURL validés - 3 scénarios testés
- [x] Vérification DB cohérente
- [x] Backward compatibility (transfer/excursion non affectés)

---

## Notes d'Implémentation

### Points d'attention

1. **Ne pas modifier la signature de `calculateDispoPrice()`** - elle fonctionne correctement, c'est l'appel qui est incorrect
2. **Préserver le comportement pour transfer et excursion** - ils doivent continuer à utiliser `durationMinutes` de la route
3. **Le champ `maxKilometers`** de la request peut être utilisé comme distance estimée pour le calcul de dépassement si fourni

### Ordre des modifications

1. Modifier `buildDynamicResult()` pour accepter `requestedDurationMinutes`
2. Modifier tous les appels à `buildDynamicResult()` dans `calculatePrice()` pour passer le paramètre
3. Ajouter le warning pour le fallback
4. Enrichir `AppliedTripTypeRule` pour la transparence
5. Ajouter les tests unitaires
6. Valider avec les tests E2E
