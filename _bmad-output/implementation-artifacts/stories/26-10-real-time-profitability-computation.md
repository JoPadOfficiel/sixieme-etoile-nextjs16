# Story 26.10 - Real-time Profitability Computation

## Metadata

- **Story ID**: 26.10
- **Epic**: 26 - Flexible "Yolo Mode" Billing
- **Status**: done
- **Priority**: High
- **Estimated Points**: 3
- **Branch**: `feature/26-10-profitability-badge`
- **Implemented**: 2026-01-18

## Description

En tant qu'**opérateur VTC**, je veux voir la **rentabilité en temps réel** (badge coloré Vert/Orange/Rouge)
lorsque je modifie le prix de vente d'une ligne de devis, afin de **prendre des décisions commerciales éclairées**
et éviter de vendre à perte.

### Contexte Technique

Dans l'architecture "Hybrid Block" (Yolo Mode), chaque ligne possède :

- `sourceData.internalCost` : Coût interne calculé par le moteur de pricing
- `displayData.total` : Prix de vente affiché (éditable par l'utilisateur)

La marge doit être calculée dynamiquement et affichée via un badge visuel.

## Acceptance Criteria (AC)

### AC1 - Formule de Calcul de Marge ✅

**GIVEN** un prix de vente (sellingPrice) et un coût interne (internalCost)
**WHEN** la fonction `calculateMarginPercent` est appelée
**THEN** elle retourne `((sellingPrice - internalCost) / sellingPrice) * 100`

### AC2 - Gestion Division par Zéro ✅

**GIVEN** un prix de vente égal à 0
**WHEN** la fonction `calculateMarginPercent` est appelée
**THEN** elle retourne `null` (et non pas `Infinity` ou `NaN`)

### AC3 - Badge Vert (Profitable) ✅

**GIVEN** une marge ≥ 20%
**WHEN** le badge de rentabilité est affiché
**THEN** il est de couleur **verte** avec l'icône TrendingUp

### AC4 - Badge Orange (Marge Faible) ✅

**GIVEN** une marge ≥ 0% et < 20%
**WHEN** le badge de rentabilité est affiché
**THEN** il est de couleur **orange** avec l'icône AlertTriangle

### AC5 - Badge Rouge (Perte) ✅

**GIVEN** une marge < 0%
**WHEN** le badge de rentabilité est affiché
**THEN** il est de couleur **rouge** avec l'icône TrendingDown

### AC6 - Mise à Jour Dynamique ✅

**GIVEN** l'utilisateur édite le prix de vente dans l'interface
**WHEN** la valeur change
**THEN** le badge de rentabilité se met à jour **instantanément** (sans rechargement)

### AC7 - Affichage du Pourcentage ✅

**GIVEN** une marge calculée
**WHEN** l'utilisateur survole le badge
**THEN** un tooltip affiche le pourcentage exact (ex: "25.5%")

## Implementation Details

### Files Created

1. **`apps/web/modules/saas/shared/utils/profitability.ts`**

   - `calculateMarginPercent(sellingPrice, internalCost)` - Calcule la marge en %
   - `getProfitabilityLevel(margin, greenThreshold, orangeThreshold)` - Détermine le niveau (green/orange/red)
   - `computeProfitability(sellingPrice, internalCost)` - Combine les deux fonctions
   - `formatMarginPercent(margin, decimals)` - Formate pour l'affichage
   - Constantes: `DEFAULT_GREEN_THRESHOLD = 20`, `DEFAULT_ORANGE_THRESHOLD = 0`

2. **`apps/web/modules/saas/shared/utils/profitability.test.ts`**
   - 34 tests unitaires couvrant tous les cas
   - Tests de marge positive, négative, nulle
   - Tests de division par zéro
   - Tests des seuils personnalisés
   - Tests de formatage

### Files Modified

1. **`apps/web/modules/saas/shared/components/ProfitabilityIndicator.tsx`**
   - Import des fonctions utilitaires depuis `../utils/profitability`
   - Ajout des props `sellingPrice` et `internalCost` pour calcul en temps réel
   - Utilisation de `calculateMarginPercent()` pour le calcul dynamique
   - Utilisation de `getProfitabilityLevel()` pour déterminer la couleur
   - Utilisation de `formatMarginPercent()` pour l'affichage

## Test Results

### Vitest (34/34 tests passing) ✅

```
 ✓ calculateMarginPercent (10 tests)
   ✓ positive margin (profitable) (3)
   ✓ negative margin (loss) (2)
   ✓ zero margin (break-even) (1)
   ✓ division by zero (2)
   ✓ decimal values (2)
 ✓ getProfitabilityLevel (14 tests)
   ✓ green level (profitable) (3)
   ✓ orange level (low margin) (3)
   ✓ red level (loss) (3)
   ✓ null/undefined margin (2)
   ✓ custom thresholds (2)
   ✓ default thresholds (1)
 ✓ computeProfitability (4 tests)
 ✓ formatMarginPercent (6 tests)
```

### MCP Browser Tests

- **Status**: Non applicable (DB non configurée dans worktree isolé)
- **Note**: Le composant utilise les fonctions utilitaires testées unitairement

## Definition of Done

- [x] Fonction `calculateMarginPercent` implémentée et testée
- [x] Fonction `getProfitabilityLevel` exportée et testée
- [x] Tests Vitest passent (100% coverage sur les fonctions)
- [x] Badge change de couleur dynamiquement dans l'UI (via props sellingPrice/internalCost)
- [x] Tooltip affiche le pourcentage exact
- [x] Code review effectuée (fixes appliquées)

## Usage Example

```tsx
// Option 1: Avec marge pré-calculée
<ProfitabilityIndicator marginPercent={25.5} />

// Option 2: Avec calcul en temps réel (Story 26.10)
<ProfitabilityIndicator
  sellingPrice={100}
  internalCost={75}
/>
// → Affiche badge vert avec marge 25%

// Option 3: Avec seuils personnalisés
<ProfitabilityIndicator
  sellingPrice={100}
  internalCost={85}
  greenThreshold={30}
  orangeThreshold={10}
/>
// → Affiche badge orange (15% < 30%)
```

## Senior Developer Review (AI)

**Date:** 2026-01-18
**Reviewer:** JoPad

### Issues Fixed

1. **AC6 dynamique câblé**: utilisation de `sellingPrice/internalCost` dans `QuotePricingPanel` pour un recalcul live du badge.
2. **Seuils unifiés**: alignement de `shared/types/pricing.ts` sur les utilitaires `shared/utils/profitability.ts`.
3. **Division par zéro cohérente**: `recalculateMargin` utilise désormais `calculateMarginPercent` (retour `null`).

### Files Updated During Review

- `apps/web/modules/saas/quotes/components/QuotePricingPanel.tsx`
- `apps/web/modules/saas/shared/types/pricing.ts`
- `apps/web/modules/saas/quotes/types.ts`

## Change Log

- 2026-01-18: Initial implementation (utilities + tests + component refactor).
- 2026-01-18: Review fixes applied (live badge wiring + threshold alignment + zero-division consistency).
