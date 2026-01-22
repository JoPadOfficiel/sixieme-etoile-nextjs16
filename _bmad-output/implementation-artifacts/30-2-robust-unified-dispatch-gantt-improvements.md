# Story 30.2: Robust Unified Dispatch & Gantt Improvements

## Story Information

- **Epic**: 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- **Story ID**: 30-2
- **Status**: review
- **Created**: 2026-01-23
- **Branch**: `feature/30-2-dispatch-robustness`

---

## Description

**En tant que** dispatcher de Sixième Étoile,  
**Je veux** que le système bloque automatiquement les assignations illégales (permis incompatible, chevauchements horaires),  
**Afin de** pouvoir faire confiance aveuglément au système et éviter les erreurs d'assignation coûteuses.

### Contexte Métier

Le dispatcher doit avoir une **confiance absolue** dans le système. Actuellement, le système permet des assignations "illégales" :

- Un chauffeur avec permis B peut être assigné à un minibus nécessitant un permis D
- Un chauffeur déjà occupé peut recevoir une mission chevauchante sans blocage

Cette story implémente "Le Cerveau" - un algorithme de vérification des contraintes qui :

1. **BLOQUE** strictement les violations de permis et chevauchements
2. **AVERTIT** sur les risques RSE (>9h conduite, <11h repos)
3. **DIAGNOSTIQUE** précisément pourquoi aucun candidat n'est disponible

---

## Acceptance Criteria (AC)

### AC1: Vérification Stricte du Permis (BLOQUANT)

- [ ] Le système vérifie que le chauffeur possède le permis requis par le véhicule
- [ ] Si `Vehicle.requiredLicenseCategoryId` existe, le chauffeur DOIT avoir un `DriverLicense` correspondant
- [ ] Un candidat sans le bon permis est **exclu** de la liste (pas affiché)
- [ ] Le diagnostic indique `excludedByLicense: N` si des candidats ont été exclus

### AC2: Vérification Stricte des Chevauchements (BLOQUANT)

- [ ] Le système vérifie les missions existantes du chauffeur pour la même période
- [ ] Requête Prisma avec overlap: `startAt < mission.endAt AND endAt > mission.startAt`
- [ ] Un candidat avec chevauchement est **exclu** de la liste par défaut
- [ ] Le diagnostic indique `excludedBySchedule: N` si des candidats ont été exclus

### AC3: Vérification RSE (WARNING)

- [ ] Le système calcule le temps de conduite cumulé du chauffeur pour la journée
- [ ] Si >9h de conduite prévue → WARNING "Risque dépassement RSE (>9h conduite)"
- [ ] Si <11h de repos depuis dernière mission → WARNING "Repos insuffisant (<11h)"
- [ ] Les candidats avec WARNING restent affichés mais avec badge orange

### AC4: Diagnostic Détaillé si Liste Vide

- [ ] Si aucun candidat disponible, afficher un panneau explicatif
- [ ] Afficher les raisons de rejet: `{ excludedByLicense: 2, excludedBySchedule: 3, excludedByCalendar: 1 }`
- [ ] Suggérer des actions: "Aucun chauffeur disponible. 2 exclus pour permis, 3 pour planning."

### AC5: UI Alerte Conflit avec Force Assign

- [ ] Si un candidat a un WARNING, afficher l'alerte en orange
- [ ] Afficher le détail du conflit: "Overlap: 15 min avec Mission #123"
- [ ] Bouton "Force Assign" rouge pour forcer l'assignation malgré le warning
- [ ] Confirmation modale avant force assign

### AC6: Gantt - Fix Scroll Horizontal

- [ ] Le scroll horizontal fonctionne correctement pendant le drag & drop
- [ ] Le backlog sidebar est responsive et ne bloque pas le scroll

### AC7: Second Driver Assignment

- [ ] Bouton "Assign Second Driver" visible pour missions RSE double crew
- [ ] Crée un `MissionAssignment` secondaire avec `role: "SECOND_DRIVER"`
- [ ] Le Gantt affiche les deux chauffeurs sur la même mission

---

## Technical Implementation

### 1. Helper `checkConstraints` (Le Cerveau)

**Fichier**: `apps/web/modules/saas/dispatch/utils/checkConstraints.ts`

```typescript
export interface ConstraintCheckResult {
  isBlocked: boolean;
  blockReason: string | null;
  warnings: string[];
  diagnostics: {
    excludedByLicense: number;
    excludedBySchedule: number;
    excludedByCalendar: number;
    excludedByRSE: number;
  };
}

export interface CandidateConstraints {
  driverId: string;
  driverLicenses: string[]; // License category IDs
  vehicleRequiredLicenseId: string | null;
  existingMissions: { startAt: Date; endAt: Date; id: string }[];
  calendarEvents: { startAt: Date; endAt: Date; type: string }[];
  dailyDrivingMinutes: number;
  lastMissionEndAt: Date | null;
}

export function checkConstraints(
  mission: { startAt: Date; endAt: Date },
  candidate: CandidateConstraints
): ConstraintCheckResult;
```

### 2. Backend API Enhancement

**Fichier**: `packages/api/src/routes/vtc/missions.ts`

Modifier l'endpoint `/missions/:id/candidates` pour:

- Inclure `Vehicle.requiredLicenseCategoryId` dans la requête
- Inclure `Driver.driverLicenses` avec les catégories
- Calculer les chevauchements avec requête Prisma optimisée
- Retourner les diagnostics dans la réponse

### 3. UI Components

**Fichiers à modifier**:

- `AssignmentDrawer.tsx`: Afficher diagnostics si liste vide
- `CandidatesList.tsx`: Afficher warnings et bouton Force Assign
- `CandidateCard.tsx`: Badge warning orange avec détail conflit

### 4. Gantt Fixes

**Fichiers**:

- `GanttTimeline.tsx`: Fix scroll horizontal pendant drag
- `DispatchSidebar.tsx`: Responsive backlog

---

## Test Cases

### Test 1: Rejet par Permis

```
GIVEN un véhicule "Minibus 20pl" avec requiredLicenseCategoryId = "D"
AND un chauffeur "Jean" avec uniquement permis B
WHEN je cherche les candidats pour une mission avec ce véhicule
THEN Jean n'apparaît PAS dans la liste
AND le diagnostic affiche excludedByLicense: 1
```

### Test 2: Rejet par Chevauchement

```
GIVEN un chauffeur "Marie" avec une mission de 10h00 à 12h00
WHEN je cherche les candidats pour une mission de 11h00 à 13h00
THEN Marie n'apparaît PAS dans la liste
AND le diagnostic affiche excludedBySchedule: 1
```

### Test 3: Warning RSE

```
GIVEN un chauffeur "Pierre" avec 8h de conduite déjà planifiées
WHEN je cherche les candidats pour une mission de 2h
THEN Pierre apparaît avec un WARNING orange
AND le message indique "Risque dépassement RSE (>9h conduite)"
```

### Test 4: Second Driver

```
GIVEN une mission RSE nécessitant double équipage
WHEN j'assigne un premier chauffeur puis clique "Assign Second Driver"
THEN je peux sélectionner un second chauffeur
AND le Gantt affiche les deux chauffeurs sur la mission
```

---

## Dependencies

- **Prisma Models**: `Vehicle.requiredLicenseCategoryId`, `DriverLicense`, `DriverCalendarEvent`, `Mission`
- **Existing Code**: `checkCompliance.ts` (à étendre), `useAssignmentCandidates.ts`
- **Libraries**: `date-fns` (areIntervalsOverlapping)

---

## Files to Modify

1. `apps/web/modules/saas/dispatch/utils/checkConstraints.ts` - Refactor complet
2. `packages/api/src/routes/vtc/missions.ts` - Endpoint candidates
3. `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` - UI diagnostics
4. `apps/web/modules/saas/dispatch/components/CandidatesList.tsx` - Empty state + warnings
5. `apps/web/modules/saas/dispatch/components/CandidateCard.tsx` - Force Assign button
6. `apps/web/modules/saas/dispatch/types/assignment.ts` - Types diagnostics
7. `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx` - Scroll fix

---

## Definition of Done

- [ ] Tous les AC validés
- [ ] Tests unitaires pour `checkConstraints`
- [ ] Tests E2E pour les 4 cas de test
- [ ] Code review passée
- [ ] Documentation mise à jour
- [ ] sprint-status.yaml mis à jour avec status: review
