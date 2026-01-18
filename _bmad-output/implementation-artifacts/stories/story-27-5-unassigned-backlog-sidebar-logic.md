---
id: "27.5"
epic: "27"
title: "Unassigned Backlog - Sidebar Logic"
status: "review"
priority: "high"
complexity: "medium"
assigned_agent: "Amelia"
dependencies:
  - "27.1" # Dispatch Shell
  - "26.1" # Mission Model
tags:
  - "dispatch"
  - "sidebar"
  - "backlog"
files_to_modify:
  - "apps/web/modules/saas/dispatch/components/UnassignedSidebar.tsx"
  - "apps/web/modules/saas/dispatch/components/DispatchPage.tsx"
  - "packages/api/src/routes/vtc/missions.ts"
---

# Unassigned Backlog Sidebar Logic

## Objectif Métier
Fournir aux dispatcheurs une vue consolidée et filtrable de toutes les missions en attente d'attribution (Backlog), directement intégrée dans le Cockpit de Dispatch, sans nécessiter de changement de page.

## Valeur Ajoutée
- **Réactivité** : Visualisation immédiate des courses non couvertes.
- **Productivité** : Recherche et filtrage rapides pour trouver les missions correspondant à un chauffeur/véhicule disponible.
- **Intégration** : Prépare le terrain pour le Drag & Drop vers le Gantt.

## Critères d'Acceptation (AC)

### AC1 - Affichage du Backlog
- Le panneau latéral (Sidebar) doit afficher la liste des missions dont `driverId` est `null`.
- Les missions annulées ou complétées ne doivent PAS apparaître.
- Les missions doivent être triées par `startAt` croissant (les plus urgentes en haut).

### AC2 - Cards de Mission
Chaque élément de la liste doit afficher :
- **Heure de début** (format HH:mm).
- **Lieux** : Départ (Ville/Rue) -> Arrivée (Ville/Rue).
- **Client** : Nom du client ou passager.
- **Catégorie** : Badge ou icône indiquant la catégorie de véhicule requise (ex: Berline, Van).
- **Indicateur** : Si la mission est "Urgent" (ex: < 24h) - *Optionnel pour cette itération*.

### AC3 - Recherche Textuelle
- Un champ de recherche en haut de la sidebar.
- La recherche filtre dynamiquement la liste sur :
  - Nom du client/passager.
  - Adresse de départ ou d'arrivée.
  - ID de la mission (ref).

### AC4 - Filtre par Catégorie de Véhicule
- Un sélecteur (Dropdown ou Tabs) pour filtrer par `VehicleCategory` (ex: Toute, Berline, Van).
- Par défaut : "Toutes".

### AC5 - États Vides
- Si aucune mission n'est trouvée (backlog vide ou filtre trop restrictif), afficher un message clair (ex: "Aucune mission à assigner").

## Détails Techniques

### Composants UI
- Créer `apps/web/modules/saas/dispatch/components/UnassignedSidebar.tsx`.
- Utiliser les composants Shadcn/Radix existants (`ScrollArea`, `Input`, `Select`).
- Le composant doit être responsive et s'intégrer dans le layout `DispatchPage` (déjà existant ou en cours via 27.1).

### Data Fetching
- Utiliser un hook React Query (ex: `useUnassignedMissions` ou le hook générique `useMissions` avec filtres).
- L'API doit supporter les filtres query params : `?driverId=null&search=...&category=...`.

### Modèle de Données
- S'appuyer sur le modèle `Mission` (Prisma).
- S'assurer que les relations `startLocation`, `endLocation`, `pricing` (pour la catégorie) sont chargées ou accessibles.

## Stratégie de Test
1.  **Unit Tests (Vitest)** :
    - Tester la logique de filtrage (fonction pure si possible).
    - Tester le rendu des cards avec différentes données.
2.  **Browser Test** :
    - Vérifier que la sidebar s'ouvre/se ferme (si pliable).
    - Vérifier que la saisie dans le champ recherche met à jour la liste.
    - Vérifier le tri par date.

## Validation Review
- **Status:** Completed
- **Branch:** `feature/27-5-backlog-sidebar`
- **Changes:**
  - `packages/api/src/routes/vtc/missions.ts`: Added `unassignedOnly` filter.
  - `apps/web/modules/saas/dispatch/components/UnassignedSidebar.tsx`: Created sidebar component.
  - `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`: Integrated sidebar.
  - `apps/web/modules/saas/dispatch/types/mission.ts`: Updated types.
  - `apps/web/modules/saas/dispatch/hooks/useMissions.ts`: Updated hook.
- **Tests:**
  - `UnassignedSidebar.test.tsx` passed.

## Code Review
- **Reviewer:** BMM-Workflow-Reviewer
- **Date:** 2026-01-18
- **Findings:**
  - [High] Search input was updating state on every keystroke, causing potential API spam. Fixed by implementing `useDebounceValue`.
  - [Medium] Collapsed state was not handled in `UnassignedSidebar`, leading to UI clutter when sidebar collapsed. Fixed by passing `isCollapsed` prop and rendering minimal view.
  - [Low] Test needed update to handle async debounce behavior. Fixed in `UnassignedSidebar.test.tsx`.
- **Resolution:** All critical issues resolved. Performance optimized.

