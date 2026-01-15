# Story 18.2: Automatic Transfer-to-MAD Detection (Dense Zone)

## Story Information

| Field                | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| **Story ID**         | 18.2                                                                 |
| **Epic**             | Epic 18 - Advanced Geospatial, Route Optimization & Yield Management |
| **Title**            | Automatic Transfer-to-MAD Detection (Dense Zone)                     |
| **Status**           | ✅ Done                                                              |
| **Created**          | 2025-12-31                                                           |
| **Completed**        | 2025-12-31                                                           |
| **Priority**         | High                                                                 |
| **Estimated Effort** | 5 Story Points                                                       |
| **Branch**           | feature/18-2-transfer-to-mad-dense-zone                              |

---

## User Story

**As an** operator,  
**I want** the system to automatically suggest switching to MAD pricing when a trip is within a dense zone,  
**So that** I don't lose money on distance-based pricing when commercial speed is too low.

---

## Related Requirements

| Requirement | Description                                                                                                                                                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR79**    | The pricing engine shall implement automatic trip type detection that suggests switching from transfer to mise-à-disposition (MAD) pricing when the trip is within a dense zone (Z_0) where commercial speed is too low for distance-based pricing to be profitable. |

---

## Business Context

### Problem Statement

Dans les zones denses comme Paris intra-muros (Z_0), la vitesse commerciale est souvent très basse (< 15 km/h) en raison du trafic. Un trajet de 5 km peut prendre 30-45 minutes. Avec un pricing au kilomètre (Transfer), le prix est bas alors que le temps chauffeur est élevé → perte de rentabilité.

### Solution

Le système détecte automatiquement quand un trajet Transfer est dans une zone dense avec une vitesse commerciale trop basse, et suggère (ou applique automatiquement) un switch vers le pricing MAD (Mise à Disposition) qui est basé sur le temps.

### Value Proposition

- **Rentabilité** : Évite les pertes sur les trajets intra-Paris
- **Automatisation** : Détection intelligente sans intervention manuelle
- **Transparence** : L'opérateur voit la comparaison Transfer vs MAD
- **Flexibilité** : Mode suggestion ou switch automatique configurable

---

## Acceptance Criteria (BDD)

### AC1: Détection de zone dense

```gherkin
Given une demande de devis pour un transfer
And le pickup ET le dropoff sont dans la zone centrale dense (Z_0)
When le moteur de pricing calcule le devis
Then il doit identifier le trajet comme "intra-dense-zone"
And stocker cette information dans tripAnalysis.denseZoneDetection
```

### AC2: Calcul de la vitesse commerciale

```gherkin
Given un trajet identifié comme intra-dense-zone
And la distance estimée est de 5 km
And la durée estimée est de 30 minutes
When le système calcule la vitesse commerciale
Then la vitesse commerciale = 5 km / 0.5 h = 10 km/h
And cette vitesse est stockée dans tripAnalysis.commercialSpeedKmh
```

### AC3: Suggestion de switch vers MAD

```gherkin
Given un trajet intra-dense-zone
And la vitesse commerciale (10 km/h) est inférieure au seuil configuré (15 km/h)
When le pricing est calculé
Then le système doit ajouter une suggestion "CONSIDER_MAD_PRICING"
And la suggestion doit inclure:
  - Le prix Transfer calculé
  - Le prix MAD équivalent (basé sur la durée)
  - La différence de prix
  - La recommandation ("MAD pricing recommandé pour meilleure rentabilité")
```

### AC4: Comparaison Transfer vs MAD

```gherkin
Given un trajet avec:
  - Distance: 5 km
  - Durée: 30 minutes
  - Prix Transfer: 25€ (5 km × 5€/km)
  - Prix MAD: 45€ (0.5h × 90€/h)
When le système génère la suggestion
Then il doit afficher:
  - "Prix Transfer: 25€"
  - "Prix MAD équivalent: 45€"
  - "Gain potentiel: +20€ (+80%)"
And recommander le switch vers MAD
```

### AC5: Switch automatique (si activé)

```gherkin
Given l'organisation a activé "autoSwitchToMAD = true"
And un trajet intra-dense-zone avec vitesse commerciale < seuil
When le pricing est calculé
Then le système doit automatiquement:
  - Utiliser le pricing MAD au lieu de Transfer
  - Ajouter une règle "AUTO_SWITCHED_TO_MAD" dans appliedRules
  - Conserver le prix Transfer original dans tripAnalysis pour transparence
```

### AC6: Configuration des seuils

```gherkin
Given un admin dans les paramètres de pricing de l'organisation
When il accède à la section "Dense Zone Detection"
Then il doit pouvoir configurer:
  - denseZoneSpeedThreshold: seuil de vitesse (défaut: 15 km/h)
  - autoSwitchToMAD: toggle on/off (défaut: false)
  - denseZoneCodes: liste des codes de zones denses (défaut: ["PARIS_0"])
And les changements doivent s'appliquer immédiatement aux nouveaux devis
```

### AC7: Zones non-denses (pas de suggestion)

```gherkin
Given un trajet Transfer
And le pickup OU le dropoff est en dehors des zones denses
When le pricing est calculé
Then aucune suggestion MAD ne doit être générée
And le pricing Transfer standard s'applique
```

### AC8: Vitesse au-dessus du seuil (pas de suggestion)

```gherkin
Given un trajet intra-dense-zone
And la vitesse commerciale (25 km/h) est supérieure au seuil (15 km/h)
When le pricing est calculé
Then aucune suggestion MAD ne doit être générée
And le pricing Transfer standard s'applique
```

---

## Technical Design

### 1. Schema Changes (Prisma)

```prisma
// In OrganizationPricingSettings model
model OrganizationPricingSettings {
  // ... existing fields ...

  // Story 18.2: Dense zone detection for Transfer-to-MAD switching
  denseZoneSpeedThreshold  Decimal? @db.Decimal(5, 2) // km/h (default: 15.0)
  autoSwitchToMAD          Boolean  @default(false)   // Auto-switch or suggestion only
  denseZoneCodes           String[] @default([])      // Zone codes considered "dense" (e.g., ["PARIS_0"])
}
```

### 2. New Types (pricing-engine.ts)

```typescript
// Dense zone detection result
export interface DenseZoneDetection {
  isIntraDenseZone: boolean;
  pickupZoneCode: string | null;
  dropoffZoneCode: string | null;
  denseZoneCodes: string[];
  commercialSpeedKmh: number | null;
  speedThreshold: number;
  isBelowThreshold: boolean;
}

// MAD suggestion for Transfer trips
export interface MadSuggestion {
  type: "CONSIDER_MAD_PRICING";
  transferPrice: number;
  madPrice: number;
  priceDifference: number;
  percentageGain: number;
  recommendation: string;
  autoSwitched: boolean;
}

// Extended TripAnalysis
export interface TripAnalysis {
  // ... existing fields ...
  denseZoneDetection?: DenseZoneDetection;
  madSuggestion?: MadSuggestion;
}
```

### 3. Core Functions

#### 3.1 detectDenseZone()

```typescript
/**
 * Story 18.2: Detect if a trip is within a dense zone
 */
export function detectDenseZone(
  pickupZone: ZoneData | null,
  dropoffZone: ZoneData | null,
  distanceKm: number,
  durationMinutes: number,
  settings: OrganizationPricingSettings
): DenseZoneDetection {
  const denseZoneCodes = settings.denseZoneCodes ?? ["PARIS_0"];
  const speedThreshold = settings.denseZoneSpeedThreshold ?? 15.0;

  const pickupCode = pickupZone?.code ?? null;
  const dropoffCode = dropoffZone?.code ?? null;

  // Check if both pickup and dropoff are in dense zones
  const pickupInDense = pickupCode && denseZoneCodes.includes(pickupCode);
  const dropoffInDense = dropoffCode && denseZoneCodes.includes(dropoffCode);
  const isIntraDenseZone = pickupInDense && dropoffInDense;

  // Calculate commercial speed (km/h)
  const durationHours = durationMinutes / 60;
  const commercialSpeedKmh =
    durationHours > 0
      ? Math.round((distanceKm / durationHours) * 100) / 100
      : null;

  const isBelowThreshold =
    commercialSpeedKmh !== null && commercialSpeedKmh < speedThreshold;

  return {
    isIntraDenseZone,
    pickupZoneCode: pickupCode,
    dropoffZoneCode: dropoffCode,
    denseZoneCodes,
    commercialSpeedKmh,
    speedThreshold,
    isBelowThreshold,
  };
}
```

#### 3.2 calculateMadSuggestion()

```typescript
/**
 * Story 18.2: Calculate MAD price suggestion for Transfer trips
 */
export function calculateMadSuggestion(
  transferPrice: number,
  durationMinutes: number,
  distanceKm: number,
  settings: OrganizationPricingSettings,
  autoSwitch: boolean
): MadSuggestion {
  // Calculate equivalent MAD price
  const madResult = calculateDispoPrice(
    durationMinutes,
    distanceKm,
    settings.baseRatePerHour,
    settings
  );
  const madPrice = madResult.price;

  const priceDifference = madPrice - transferPrice;
  const percentageGain =
    transferPrice > 0
      ? Math.round((priceDifference / transferPrice) * 100 * 100) / 100
      : 0;

  const recommendation =
    priceDifference > 0
      ? `MAD pricing recommandé: +${priceDifference.toFixed(
          2
        )}€ (+${percentageGain}%)`
      : `Transfer pricing optimal pour ce trajet`;

  return {
    type: "CONSIDER_MAD_PRICING",
    transferPrice,
    madPrice,
    priceDifference,
    percentageGain,
    recommendation,
    autoSwitched: autoSwitch && priceDifference > 0,
  };
}
```

### 4. Integration Points

#### 4.1 pricing-calculate.ts

- Après le calcul du prix Transfer, appeler `detectDenseZone()`
- Si `isIntraDenseZone && isBelowThreshold`, appeler `calculateMadSuggestion()`
- Si `autoSwitchToMAD` est activé et MAD est plus rentable, remplacer le prix

#### 4.2 UI Quote Creation

- Afficher un badge/alert si `madSuggestion` est présent
- Permettre à l'opérateur de cliquer pour appliquer le prix MAD
- Afficher la comparaison Transfer vs MAD dans TripTransparency

### 5. Files to Modify/Create

| File                                                               | Action | Description                                          |
| ------------------------------------------------------------------ | ------ | ---------------------------------------------------- |
| `packages/database/prisma/schema.prisma`                           | Modify | Add dense zone fields to OrganizationPricingSettings |
| `packages/api/src/services/pricing-engine.ts`                      | Modify | Add types and detection functions                    |
| `packages/api/src/routes/vtc/pricing-calculate.ts`                 | Modify | Integrate dense zone detection                       |
| `packages/api/src/services/__tests__/dense-zone-detection.test.ts` | Create | Unit tests                                           |
| `apps/web/app/[locale]/(app)/dashboard/settings/pricing/page.tsx`  | Modify | Add dense zone config UI                             |

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                               | Expected Result           |
| ------- | ----------------------------------------- | ------------------------- |
| DZ-01   | Detect intra-dense-zone (both in PARIS_0) | isIntraDenseZone = true   |
| DZ-02   | Detect non-dense (pickup outside)         | isIntraDenseZone = false  |
| DZ-03   | Calculate commercial speed (5km/30min)    | commercialSpeedKmh = 10   |
| DZ-04   | Speed below threshold (10 < 15)           | isBelowThreshold = true   |
| DZ-05   | Speed above threshold (25 > 15)           | isBelowThreshold = false  |
| DZ-06   | MAD suggestion with positive gain         | priceDifference > 0       |
| DZ-07   | Auto-switch when enabled                  | autoSwitched = true       |
| DZ-08   | No auto-switch when disabled              | autoSwitched = false      |
| DZ-09   | Custom dense zone codes                   | Uses configured codes     |
| DZ-10   | Custom speed threshold                    | Uses configured threshold |

### Integration Tests (API)

| Test ID | Description                                       | Expected Result       |
| ------- | ------------------------------------------------- | --------------------- |
| API-01  | POST /pricing/calculate with intra-dense transfer | Returns madSuggestion |
| API-02  | POST /pricing/calculate with non-dense transfer   | No madSuggestion      |
| API-03  | POST /pricing/calculate with auto-switch enabled  | Price = MAD price     |

### E2E Tests (Playwright)

| Test ID | Description                                  | Expected Result |
| ------- | -------------------------------------------- | --------------- |
| E2E-01  | Create quote Paris→Paris, see MAD suggestion | Alert visible   |
| E2E-02  | Click "Apply MAD pricing"                    | Price updates   |
| E2E-03  | Configure dense zone settings                | Settings saved  |

---

## Dependencies

| Dependency                            | Type         | Status     |
| ------------------------------------- | ------------ | ---------- |
| Epic 16 (Quote System Refactoring)    | Prerequisite | ✅ Done    |
| Story 17.9 (Time Buckets for MAD)     | Related      | ✅ Done    |
| Story 18.11 (Configurable Thresholds) | Follow-up    | 📋 Backlog |

---

## Definition of Done

- [ ] Schema migration applied successfully
- [ ] `detectDenseZone()` function implemented and tested
- [ ] `calculateMadSuggestion()` function implemented and tested
- [ ] Integration in pricing-calculate.ts complete
- [ ] Unit tests passing (100% coverage on new code)
- [ ] API integration tests passing
- [ ] Settings UI for dense zone configuration
- [ ] Quote UI shows MAD suggestion when applicable
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

## Notes

- Les zones denses par défaut sont `["PARIS_0"]` (Paris intra-muros, rayon 5km autour de Notre-Dame)
- Le seuil de vitesse par défaut est 15 km/h (typique du trafic parisien dense)
- Le mode "suggestion only" est le défaut pour éviter des changements de prix inattendus
- Cette story prépare le terrain pour Story 18.3 (Round-Trip to MAD) et Story 18.11 (Configurable Thresholds)
