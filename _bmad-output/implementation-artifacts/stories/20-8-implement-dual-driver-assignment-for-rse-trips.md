# Story 20.8: Implement Dual Driver Assignment for RSE Trips

## Status: In Progress

## Description

**En tant qu'** opérateur dispatch,  
**Je veux** pouvoir assigner deux conducteurs à une mission nécessitant un double équipage RSE,  
**Afin de** respecter les réglementations RSE pour les trajets longs et refléter correctement le staffing dans le système.

## Contexte Métier

Lorsqu'un trajet dépasse les limites RSE (temps de conduite > 9h ou amplitude > 13h pour véhicules lourds), le système calcule automatiquement un plan de staffing (Story 17.3, 19.2). Si le plan sélectionné est `DOUBLE_CREW`, le devis inclut le coût du second conducteur.

**Problème résolu** : Le système de dispatch ne permettait d'assigner qu'un seul conducteur (`assignedDriverId`). Cette story ajoute le support pour l'assignation d'un second conducteur requis par le plan RSE.

## Critères d'Acceptation

- [x] AC1: Extension du Schéma Quote - `secondDriverId` ajouté au modèle Quote
- [x] AC2: API d'Assignation Étendue - endpoint accepte `secondDriverId`
- [x] AC3: Validation du Second Conducteur - rejet si non requis par DOUBLE_CREW
- [x] AC4: UI Assignment Drawer - Badge "Double Équipage Requis" affiché
- [x] AC5: UI Assignment Drawer - Sélecteur de second conducteur visible
- [ ] AC6: Validation Disponibilité Second Conducteur (à implémenter)
- [x] AC7: Affichage Mission Assignée - deux conducteurs affichés
- [ ] AC8: Réponse API Étendue - `requiresSecondDriver` dans la réponse (à implémenter)

## Fichiers Modifiés

### Backend

- `packages/database/prisma/schema.prisma` - Ajout `secondDriverId` et relation `SecondDriver`
- `packages/database/prisma/migrations/20260102152900_add_second_driver_for_rse/` - Migration
- `packages/api/src/routes/vtc/missions.ts` - Extension endpoint assign avec validation

### Frontend

- `apps/web/modules/saas/dispatch/types/assignment.ts` - Types étendus
- `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` - UI second driver
- `apps/web/modules/saas/dispatch/hooks/useAssignMission.ts` - Mutation étendue (via types)

### Traductions

- `packages/i18n/translations/fr.json` - Clés FR ajoutées
- `packages/i18n/translations/en.json` - Clés EN ajoutées

## Dépendances

- Story 17.3: Automatic Compliance-Driven Staffing Integration (done)
- Story 19.2: Implement Automatic RSE-Compliant Staffing for Long Trips (done)
- Story 8.2: Implement Assignment Drawer (done)

## Notes Techniques

### Schéma Prisma

```prisma
model Quote {
  // Story 20.8: Second driver for RSE double crew missions
  secondDriverId    String?
  secondDriver      Driver?   @relation("SecondDriver", fields: [secondDriverId], references: [id])
}

model Driver {
  // Story 20.8: Second driver relation for RSE double crew missions
  secondDriverQuotes   Quote[]   @relation("SecondDriver")
}
```

### Validation API

- Le second conducteur ne peut être assigné que si `compliancePlan.planType === "DOUBLE_CREW"`
- Les conducteurs principal et secondaire doivent être différents
- Le second conducteur doit exister et appartenir à l'organisation

## Tests à Exécuter

1. Test API - Assignation simple (sans second conducteur)
2. Test API - Assignation double équipage
3. Test API - Rejet second conducteur non requis
4. Test API - Validation conducteurs différents
5. Test UI - Badge double équipage
6. Test UI - Sélection second conducteur
7. Test UI - Affichage deux conducteurs
