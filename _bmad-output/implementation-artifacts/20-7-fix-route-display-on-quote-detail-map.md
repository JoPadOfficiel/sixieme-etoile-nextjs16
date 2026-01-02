# Story 20-7: Fix Route Display on Quote Detail Map

**Epic:** Epic 20 - Critical Bug Fixes & Testing  
**Priority:** HIGH  
**Effort:** M  
**Status:** in-progress

---

## Description

**En tant qu'** opérateur VTC,  
**Je veux** voir l'itinéraire complet (polyline) sur la carte de détail d'un devis,  
**Afin de** visualiser le trajet réel entre le point de départ et d'arrivée, incluant les waypoints pour les excursions.

---

## Contexte Technique

Le composant `ModernRouteMap` utilise la nouvelle Google Routes API via `computeRoutesWithFallback()`. L'analyse du code révèle que :

1. La fonction `computeRoutesWithFallback` retourne `{ success, data, fallback }` où `data.routes[0].overview_path` contient le chemin
2. Le composant `ModernRouteMap` vérifie `result.data.routes[0]` et `route.overview_path` correctement
3. **Problème potentiel** : Si l'API échoue ou si `apiKey` n'est pas disponible, le fallback n'est pas correctement affiché

---

## Critères d'Acceptation (AC)

| AC      | Description                                                                 | Test                                   |
| ------- | --------------------------------------------------------------------------- | -------------------------------------- |
| **AC1** | La polyline de l'itinéraire s'affiche entre les marqueurs pickup et dropoff | Visuel sur page détail devis           |
| **AC2** | Les waypoints (pour excursions) sont connectés dans l'ordre                 | Test avec devis excursion multi-arrêts |
| **AC3** | Une polyline de fallback (lignes droites) s'affiche si l'API échoue         | Simuler erreur API                     |
| **AC4** | Les logs console indiquent le succès ou l'échec de la requête route         | Vérifier console navigateur            |
| **AC5** | Les bounds de la carte s'ajustent pour afficher l'itinéraire complet        | Vérifier zoom automatique              |

---

## Cas de Tests

### Test 1: Transfer Simple (Paris → CDG)

- **Précondition** : Devis existant avec pickup Paris, dropoff CDG
- **Action** : Ouvrir la page détail du devis
- **Résultat attendu** : Carte affiche polyline bleue entre les deux points

### Test 2: Excursion Multi-Arrêts (Paris → Versailles → Giverny → Paris)

- **Précondition** : Devis excursion avec waypoints
- **Action** : Ouvrir la page détail du devis
- **Résultat attendu** : Polyline connecte tous les points dans l'ordre

### Test 3: Fallback (API indisponible)

- **Précondition** : Simuler échec API (clé invalide ou timeout)
- **Action** : Ouvrir la page détail du devis
- **Résultat attendu** : Polyline en pointillés (fallback) visible

### Test 4: Bounds Automatiques

- **Précondition** : Devis avec trajet long (Paris → Normandie)
- **Action** : Ouvrir la page détail
- **Résultat attendu** : Carte zoome pour afficher tout l'itinéraire

---

## Contraintes / Dépendances

- **Dépendance** : Story 20.2 (Migration Google Routes API) - ✅ Complétée
- **Dépendance** : `GoogleMapsProvider` doit fournir `apiKey`
- **Contrainte** : Ne pas casser le composant `RoutePreviewMap` legacy (déprécié mais conservé)

---

## Notes Techniques

**Fichiers à modifier :**

- `apps/web/modules/saas/quotes/components/ModernRouteMap.tsx`

**Points de vérification :**

1. Vérifier que `apiKey` est bien passé au composant via `useGoogleMaps()`
2. Ajouter des logs de debug pour tracer le flux
3. S'assurer que la polyline est créée même en cas de fallback
4. Vérifier la gestion des erreurs et timeouts

---

## Implementation Notes

### Root Cause Analysis

After code review, the issue is that `ModernRouteMap` component:

1. Correctly calls `computeRoutesWithFallback`
2. But the response handling may fail silently if `apiKey` is undefined
3. The fallback polyline creation inside the timeout may not execute properly

### Fix Strategy

1. Add immediate fallback polyline display while waiting for API
2. Improve error handling and logging
3. Ensure polyline is always visible (API result or fallback)
4. Add debug logs for troubleshooting

---

## Related FRs

- FR95: Fix Route Display on Quote Detail Map
