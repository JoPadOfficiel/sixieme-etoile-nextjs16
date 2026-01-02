# EPIC: Refonte Complète du Système de Dispatching

**Date**: 2 Janvier 2026  
**Priorité**: Critique  
**Statut**: En cours

## Résumé

Cet EPIC couvre la refonte complète du système de dispatching pour corriger les problèmes critiques identifiés dans l'algorithme d'assignation des véhicules et chauffeurs. Le système actuel propose des véhicules inadaptés (ex: BMW 52 pour 20 passagers) et ne filtre pas correctement les chauffeurs selon leurs permis.

## Problèmes Identifiés

### 1. Filtrage Inadéquat des Véhicules et Chauffeurs

- **Problème**: Le système propose des véhicules sans capacité suffisante (ex: BMW 52 pour 20 places)
- **Impact**: Perte de temps, sélection manuelle requise, erreurs d'assignation
- **Cause**: L'algorithme ne filtre pas par capacité ni par catégorie de véhicule

### 2. Filtrage des Permis de Conduire

- **Problème**: Les chauffeurs sans permis approprié sont proposés
- **Impact**: Risque légal, assignations invalides
- **Cause**: Le filtrage par licence n'est pas appliqué correctement

### 3. Double Équipage

- **Problème**: Le second chauffeur n'est pas filtré par permis
- **Impact**: Propositions inutiles, confusion dans l'interface
- **Cause**: Absence de filtrage pour le deuxième conducteur

### 4. Affichage des Violations et Scoring

- **Problème**: "Violation" affiché pour tous les chauffeurs
- **Impact**: Mauvaise guidance pour l'opérateur
- **Cause**: Erreur dans le système de détection des violations

### 5. Règles RSE pour Citadine

- **Problème**: Les règles RSE ne s'appliquent pas correctement aux citadines
- **Impact**: Durées incorrectes, non-conformité
- **Cause**: Logique RSE non adaptée aux véhicules légers

### 6. Intégrations API Manquantes

- **Problème**: API Collecte (carburant) et Google Maps (péages) non utilisées
- **Impact**: Calculs de coûts imprécis
- **Cause**: Intégrations non implémentées

## Solution Technique

### Phase 1: Correction du Filtrage (Critique)

1. **Filtrage par Capacité**: Ajouter `filterByCapacity()` strict dans `vehicle-selection.ts`
2. **Filtrage par Permis**: Renforcer `filterByLicense()` dans `missions.ts`
3. **Double Équipage**: Ajouter filtrage pour second chauffeur
4. **Affichage**: Corriger l'affichage des violations

### Phase 2: Améliorations Interface (Moyenne)

1. **Affichage Second Chauffeur**: Modifier `VehicleAssignmentPanel.tsx`
2. **Devis Détaillés**: Ajouter second conducteur dans les quotes
3. **Scoring**: Corriger l'algorithme de scoring

### Phase 3: Intégrations API (Moyenne)

1. **API Collecte**: Intégrer pour prix carburant
2. **Google Maps**: Intégrer pour péages exacts
3. **Tests**: Validation des calculs

### Phase 4: RSE et Qualité (Basse)

1. **RSE Citadine**: Adapter les règles pour véhicules légers
2. **TypeScript/Tailwind**: Corriger toutes les erreurs
3. **Tests**: Validation complète

## Fichiers Impactés

### Backend API

- `packages/api/src/routes/vtc/missions.ts` - Logique de filtrage
- `packages/api/src/services/vehicle-selection.ts` - Services de sélection
- `packages/api/src/services/flexibility-score.ts` - Calcul de score

### Frontend Web

- `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` - Interface d'assignation
- `apps/web/modules/saas/dispatch/components/VehicleAssignmentPanel.tsx` - Affichage
- `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx` - Devis détaillés

### Tests

- `packages/api/src/routes/vtc/__tests__/missions.test.ts` - Tests API
- Tests end-to-end pour validation

## Critères d'Acceptance

### AC1: Filtrage Robuste

- [ ] Les véhicules sont filtrés par capacité stricte
- [ ] Les chauffeurs sont filtrés par permis requis
- [ ] Le double équipage respecte les permis

### AC2: Interface Correcte

- [ ] Le deuxième chauffeur s'affiche correctement
- [ ] Les violations sont détectées précisément
- [ ] Le scoring guide l'opérateur

### AC3: Intégrations Fonctionnelles

- [ ] API Collecte calcule les prix carburant
- [ ] Google Maps fournit les péages exacts
- [ ] Les coûts sont précis

### AC4: Qualité Technique

- [ ] Aucune erreur TypeScript
- [ ] Aucune erreur Tailwind CSS
- [ ] Tous les tests passent

## Risques et Mitigations

### Risque 1: Performance

- **Description**: Le filtrage plus strict peut ralentir les requêtes
- **Mitigation**: Optimiser les indexes et requêtes DB

### Risque 2: Rétrocompatibilité

- **Description**: Changements peuvent casser des fonctionnalités existantes
- **Mitigation**: Tests complets et déploiement progressif

### Risque 3: Complexité

- **Description**: La logique de filtrage devient complexe
- **Mitigation**: Documentation claire et tests unitaires

## Timeline Estimée

- **Phase 1**: 2-3 jours (critique)
- **Phase 2**: 2 jours (moyenne)
- **Phase 3**: 2 jours (moyenne)
- **Phase 4**: 1-2 jours (basse)

**Total**: 7-9 jours

## Dépendances

- Base de données accessible
- Clés API disponibles (Collecte, Google Maps)
- Environnement de test fonctionnel

## Success Metrics

- **Temps d'assignation**: -50%
- **Erreurs d'assignation**: -90%
- **Satisfaction opérateur**: +80%
- **Précision des coûts**: +95%
