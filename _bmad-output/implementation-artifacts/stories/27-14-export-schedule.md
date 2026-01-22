---
id: "27-14"
title: "Export Schedule"
epic: "27 - Unified Dispatch (Cockpit)"
status: "done"
priority: "medium"
story_points: 3
assignee: "Antigravity"
---

# Export Schedule PDF

## Description
Implémentation de l'export PDF du planning journalier des chauffeurs.
Permet aux dispatchers d'imprimer ou d'archiver la liste des missions de la journée, triée par chauffeur.

## Implémentation
- **Composant PDF** : `SchedulePdfDocument.tsx` utilisant `@react-pdf/renderer`
- **Bouton d'action** : `ExportScheduleButton.tsx` intégré dans la toolbar du Gantt
- **Format** : A4 Paysage
- **Données** : Réutilise les données `drivers` du Gantt (missions + état)

## Changements
### Nouveaux Fichiers
- `apps/web/modules/saas/dispatch/components/pdf/SchedulePdfDocument.tsx`
- `apps/web/modules/saas/dispatch/components/ExportScheduleButton.tsx`

### Fichiers Modifiés
- `apps/web/modules/saas/dispatch/components/index.ts` (Barrel export)
- `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx` (Integration UI)
- `apps/web/modules/saas/dispatch/index.ts` (Barrel export root)
- `packages/i18n/translations/fr.json` (Traductions)
- `packages/i18n/translations/en.json` (Translations)

## Code Review (Agent JoPad)
- [x] AC1: Bouton Export visible (OK)
- [x] AC2: Génération PDF (OK)
- [x] AC3: Format A4 Paysage (OK)
- [x] AC4: Liste par chauffeur (OK)
- [x] AC5: Infos mission (OK)
- [x] AC6: Date affichée (OK)
- [x] AC7: Nom organisation (OK - Hardcoded "Sixième Étoile" pour MVP)
- [x] AC8: i18n (OK)
- [x] AC9: État vide (OK)

### Action Items
- [x] Rendre le nom de l'organisation dynamique dans `ExportScheduleButton.tsx` (Fixé via `useActiveOrganization`)
- [x] Optimiser la génération PDF avec `dynamic` import (Fixé via `next/dynamic` dans `GanttTimeline`)
- [x] Corriger la locale hardcodée (devient dynamique en/fr) dans `SchedulePdfDocument` et `ExportScheduleButton` [AI-Review]

## Tests Exécutés
- [x] Compilation TypeScript (OK)
- [x] Vérification des types dans le composant PDF (OK)
- [x] Intégration UI dans la toolbar Gantt (OK)
- [x] Traductions FR/EN présentes (OK)

## Commandes
```bash
# Lancer en dev pour tester
pnpm dev --filter web
```
