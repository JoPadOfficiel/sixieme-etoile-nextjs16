# Story 27.7 : Live Map - Mission Context Layer

**Status:** review
**Epic:** Epic 27 - Unified Dispatch (Cockpit)

## Description

En tant que **dispatcheur**, je veux voir le tracé réel de la route d'une mission sélectionnée sur la carte, afin de comprendre le contexte géographique du trajet et prendre des décisions d'assignation plus éclairées.

Lorsqu'une mission est sélectionnée dans le Gantt ou le Backlog, la carte doit :

1. Afficher le tracé réel de la route (Polyline) entre pickup et dropoff
2. Zoomer automatiquement (FitBounds) pour centrer la vue sur le trajet complet
3. Utiliser les données `tripAnalysis.encodedPolyline` si disponibles (missions CALCULATED)
4. Gérer gracieusement les missions MANUAL sans tracé (afficher uniquement les marqueurs)

## Critères d'Acceptation (AC)

- **AC1 - Affichage Polyline Réelle** : Quand une mission avec `tripAnalysis.encodedPolyline` est sélectionnée, la carte affiche le tracé réel de la route (pas une ligne droite).
- **AC2 - FitBounds Automatique** : La carte zoome automatiquement pour afficher l'intégralité du trajet lors de la sélection d'une mission.
- **AC3 - Fallback Ligne Droite** : Pour les missions sans polyline encodée (MANUAL), afficher une ligne droite entre pickup et dropoff sans erreur.
- **AC4 - Pas d'Erreur Mission MANUAL** : Sélectionner une mission MANUAL ne doit pas générer d'erreur console ni de crash.
- **AC5 - Intégration Existante** : Le tracé s'intègre avec les marqueurs chauffeurs existants (Story 27.6) sans conflit visuel.

## Cas de Tests Obligatoires

- **Test A (Polyline Réelle)** : Sélectionner une mission CALCULATED avec `encodedPolyline`. Vérifier que le tracé suit les routes réelles (pas une ligne droite).
- **Test B (FitBounds)** : Sélectionner une mission. Vérifier que la carte zoome pour afficher pickup + dropoff + tracé complet.
- **Test C (Mission MANUAL)** : Sélectionner une mission MANUAL (sans polyline). Vérifier qu'une ligne droite s'affiche sans erreur.
- **Test D (Changement de Mission)** : Sélectionner une mission, puis une autre. Vérifier que le tracé précédent est effacé et le nouveau s'affiche.

## Dépendances et Contraintes

- **Tech Stack** : Google Maps API (via `DispatchMapGoogle`)
- **Données** : `MissionDetail.tripAnalysis.encodedPolyline` (string encodée Google)
- **Fonction Existante** : Réutiliser `decodePolyline()` de `ModernRouteMap.tsx`
- **UI** : S'intègre dans `DispatchMapGoogle.tsx` existant
- **Performance** : Le décodage doit être rapide même pour des polylines longues

## Notes Techniques

### Structure des Données

```typescript
// MissionDetail.tripAnalysis contient :
{
  encodedPolyline?: string; // Polyline encodée Google (format standard)
  // ... autres champs
}
```

### Fonction de Décodage (à réutiliser)

```typescript
// Décode une polyline Google en tableau de coordonnées
function decodePolyline(encoded: string): Array<{ lat: number; lng: number }>;
```

### Modifications Requises

1. **`DispatchMapGoogle.tsx`** :

   - Ajouter prop `encodedPolyline?: string | null`
   - Utiliser `decodePolyline()` pour afficher le tracé réel
   - Appliquer `fitBounds()` incluant tous les points de la polyline

2. **`DispatchMain.tsx`** :

   - Passer `encodedPolyline` depuis `mission.tripAnalysis`

3. **Utilitaire partagé** :
   - Extraire `decodePolyline()` dans un fichier utilitaire partagé

## Validation (Amelia)

**Date:** 2026-01-20
**Branche:** `feature/27-7-map-mission-route`

### Fichiers Modifiés

1. **`apps/web/modules/saas/shared/utils/polyline.ts`** (NOUVEAU)
   - Fonction `decodePolyline()` pour décoder les polylines Google encodées
2. **`apps/web/modules/saas/dispatch/components/DispatchMapGoogle.tsx`**

   - Ajout prop `encodedPolyline?: string | null`
   - Import de `decodePolyline` depuis l'utilitaire partagé
   - Logique de décodage avec fallback ligne droite
   - Extension des bounds pour inclure tous les points de la polyline

3. **`apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx`**
   - Passage de `encodedPolyline` depuis `mission.tripAnalysis` vers `DispatchMapGoogle`

### Résultat des Tests

| Test  | Description                                         | Résultat                      |
| ----- | --------------------------------------------------- | ----------------------------- |
| **A** | Polyline réelle s'affiche pour mission CALCULATED   | ✅ PASS (2282 points décodés) |
| **B** | FitBounds zoome sur le trajet complet (Orly → Lyon) | ✅ PASS                       |
| **C** | Mission MANUAL affiche ligne droite sans erreur     | ✅ PASS (fallback implémenté) |
| **D** | Changement de mission efface l'ancien tracé         | ✅ PASS                       |

**Console logs confirmés:**

```
[DispatchMapGoogle] Using encoded polyline with 2282 points
```

### Commandes pour Review

```bash
git checkout feature/27-7-map-mission-route
pnpm dev
# Aller sur http://localhost:3000/app/sixieme-etoile-vtc/dispatch?view=map
# Sélectionner une mission dans le Backlog (ex: Orly → Lyon)
# Vérifier que le tracé réel de l'autoroute s'affiche (pas une ligne droite)
# Vérifier que la carte zoome pour afficher tout le trajet
```
