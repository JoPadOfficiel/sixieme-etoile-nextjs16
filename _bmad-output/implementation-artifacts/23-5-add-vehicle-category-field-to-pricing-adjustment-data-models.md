---
id: "23-5"
title: "Add vehicle category field to pricing adjustment data models"
status: "done"
epic: "23"
type: "story"
---

## Objectif
Permettre de cibler les ajustements tarifaires (saisonniers, avancés, frais optionnels, promotions) sur une catégorie de véhicule spécifique (ex: "Berline", "Van").
Actuellement, ces ajustements s'appliquent globalement à toutes les catégories, ce qui manque de finesse pour certaines stratégies commerciales (ex: majoration nuit plus élevée pour les Vans, ou option "Siège bébé" uniquement pour certaines catégories).

## Périmètre Technique
Modification du schéma Prisma pour ajouter une relation optionnelle vers `VehicleCategory` sur les modèles suivants :
1. `SeasonalMultiplier`
2. `AdvancedRate` (correspondant à AdvancedRateModifier dans le métier)
3. `OptionalFee`
4. `Promotion`

## Critères d'Acceptation (AC)

### AC1 : Mise à jour du Modèle de Données
- [ ] Le modèle `SeasonalMultiplier` contient un champ optionnel `vehicleCategoryId` (FK).
- [ ] Le modèle `AdvancedRate` contient un champ optionnel `vehicleCategoryId` (FK).
- [ ] Le modèle `OptionalFee` contient un champ optionnel `vehicleCategoryId` (FK).
- [ ] Le modèle `Promotion` contient un champ optionnel `vehicleCategoryId` (FK).
- [ ] Tous ces champs sont indexés pour la performance des requêtes.

### AC2 : Migration Base de Données
- [ ] Une migration Prisma valide est générée est appliquée.
- [ ] La migration n'entraîne aucune perte de données existantes.
- [ ] Les enregistrements existants ont `vehicleCategoryId = null` (signifiant "Toutes catégories", préservant le comportement actuel).

### AC3 : Validation Technique
- [ ] Les types TypeScript et schémas Zod sont régénérés et corrects.
- [ ] Le code compile sans erreur après les changements de schéma.

## Instructions Techniques Spéciales
- **Rétro-compatibilité** : La valeur `null` doit explicitement signifier "Applicable à toutes les catégories". Ne pas mettre de valeur par défaut forcée pointant vers une catégorie spécifique.
- **Indexation** : Ajouter `@@index([vehicleCategoryId])` sur chaque modèle modifié.
- **Relation** : Utiliser `onDelete: Cascade` pour la relation : si une catégorie de véhicule est supprimée, les ajustements *spécifiques* à cette catégorie doivent être supprimés (ou gérés, mais Cascade est standard ici pour éviter les orphelins). *Correction* : Pour `OptionalFee` et `Promotion`, peut-être `SetNull` ? Non, si je supprime la catégorie "Van", la promotion "Promo Van Ete" n'a plus de sens. `Cascade` semble cohérent.

## Dépendances
- Aucune dépendance bloquante.

## Risques
- Impact mineur sur les requêtes existantes qui ne filtrent pas encore par ce champ (elles récupéreront tout, y compris les spécifiques, sauf si la logique métier est mise à jour ultérieurement dans les stories suivantes). Cette story ne concerne QUE la structure de données.

## Résumé de l'Implémentation
- **Date** : Thu Jan  8 22:43:02 CET 2026
- **Modifications** :
  - Ajout de `vehicleCategoryId` (FK) sur `AdvancedRate`, `SeasonalMultiplier`, `OptionalFee`, `Promotion`.
  - Ajout des relations inverses sur `VehicleCategory`.
  - Migration DB : `20260108214126_add_vehicle_category_to_adjustments`.
- **Validation** :
  - Script de vérification `scripts/verify-schema-23-5.ts` exécuté avec succès.
  - Création/Lecture de `SeasonalMultiplier` avec et sans catégorie validée.
