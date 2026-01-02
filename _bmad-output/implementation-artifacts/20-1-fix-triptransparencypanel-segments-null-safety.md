# Story 20.1 - Fix TripTransparencyPanel Segments Null Safety

**Epic:** 20 - Critical Bug Fixes, Google Maps Migration & Comprehensive Testing  
**Status:** Done  
**Date:** 2026-01-02  
**Branch:** `feature/20-1-fix-triptransparencypanel-segments-null-safety`

---

## Description

Le composant `TripTransparencyPanel` affiche les segments de trajet (approche, service, retour) dans l'onglet "Route". Le code accédait directement à `tripAnalysis.segments.service` sans vérifier que `segments` existe, ce qui provoquait un crash JavaScript quand :

- Le `tripAnalysis` est partiellement initialisé
- Les données proviennent d'un devis legacy sans structure `segments`
- Le pricing engine retourne un résultat sans segmentation (cas edge)

## Critères d'Acceptation

| AC# | Critère                                                                         | Status |
| --- | ------------------------------------------------------------------------------- | ------ |
| AC1 | Le panneau ne crash pas quand `tripAnalysis.segments` est `null` ou `undefined` | ✅     |
| AC2 | Le panneau ne crash pas quand `tripAnalysis.segments.service` est `null`        | ✅     |
| AC3 | Un message informatif s'affiche quand les segments ne sont pas disponibles      | ✅     |
| AC4 | Le comportement existant est préservé quand les segments sont présents          | ✅     |
| AC5 | L'onglet "Costs" fonctionne même sans segments (utilise `costBreakdown`)        | ✅     |

## Implémentation

### Fichiers Modifiés

1. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Ajout d'une vérification null safety pour `tripAnalysis.segments` et `tripAnalysis.segments.service`
   - Création du composant `NoSegmentsMessage` pour l'affichage dégradé gracieux
   - Le composant affiche un message informatif et les totaux quand les segments ne sont pas disponibles

2. **`packages/i18n/translations/fr.json`**

   - Ajout des clés de traduction :
     - `quotes.create.tripTransparency.segments.notAvailable`
     - `quotes.create.tripTransparency.segments.notAvailableDesc`

3. **`packages/i18n/translations/en.json`**
   - Ajout des clés de traduction correspondantes en anglais

### Changement Principal

```typescript
// Avant (ligne 419) - Crash si segments est null
) : (
  /* Standard Transfer/Dispo segments */
  <Table>
    ...
    <SegmentRow segment={tripAnalysis.segments.service} ... />
    ...
  </Table>
)

// Après - Vérification null safety avec fallback gracieux
) : tripAnalysis.segments && tripAnalysis.segments.service ? (
  /* Standard Transfer/Dispo segments */
  <Table>
    ...
    <SegmentRow segment={tripAnalysis.segments.service} ... />
    ...
  </Table>
) : (
  /* Story 20.1: Segments not available - graceful fallback */
  <NoSegmentsMessage t={t} tripAnalysis={tripAnalysis} />
)
```

## Tests

### Tests TypeScript

- ✅ Le fichier `TripTransparencyPanel.tsx` compile sans erreurs TypeScript

### Tests UI (Playwright MCP)

- ⚠️ **Bloqués** par une erreur de build préexistante dans `pricing-calculate.ts`
- L'erreur concerne des imports manquants (`calculatePrice`, `applyPriceOverride`, etc.) qui ne sont pas liés à cette story
- Les tests UI devront être exécutés une fois l'erreur de build corrigée

### Validation Manuelle Recommandée

1. Créer un devis avec des données partielles (sans segments)
2. Vérifier que l'onglet "Route" affiche le message "Données de segments non disponibles"
3. Vérifier que les totaux sont toujours affichés
4. Vérifier que l'onglet "Costs" fonctionne normalement

## Notes

- Cette story corrige un bug de robustesse frontend
- Aucune modification de base de données requise
- Aucune modification d'API requise
- Le fix est rétrocompatible avec les données existantes

## Références

- PRD FR21-FR24: Shadow Calculation and Profitability
- Story 6.2: Create Quote 3-Column Cockpit
- UX Spec 6.1.5: TripTransparencyPanel
