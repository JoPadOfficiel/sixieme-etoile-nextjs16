---
id: "27-14"
title: "Export Schedule"
epic: "27 - Unified Dispatch (Cockpit)"
status: "review"
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
- `packages/i18n/translations/fr.json` (Traductions)
- `packages/i18n/translations/en.json` (Translations)

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
