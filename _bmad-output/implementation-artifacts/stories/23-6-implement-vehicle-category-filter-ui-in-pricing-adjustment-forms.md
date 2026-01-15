---
id: "23-6"
title: "Implement Vehicle Category Filter UI in Pricing Adjustment Forms"
status: "done"
epic: "23"
type: "story"
---

## Description
En tant qu'administrateur, je veux pouvoir restreindre un ajustement tarifaire (Saisonnier, Majoration, Frais, Promotion) à une catégorie de véhicule spécifique via l'interface d'administration.
L'objectif est d'afficher un sélecteur "Catégorie de véhicule" (Combobox ou Select) dans les formulaires de création et d'édition de ces entités. La valeur par défaut (vide ou "Toutes") signifiera que l'ajustement s'applique à tous les véhicules.

## Contexte Technique
Les modèles de données ont été mis à jour (Story 23-5) avec un champ `vehicleCategoryId` (nullable).
Les formulaires UI existants sont situés dans `apps/web/modules/saas/settings/pricing/components/`.
Il s'agit d'intégrer un `VehicleCategorySelector` dans les dialogues existants.

## Critères d'Acceptation (AC) - RÉUSSIS

### AC1 : Sélecteur de Catégorie dans les Formulaires
- **Fait** : `VehicleCategorySelector` intégré dans `SeasonalMultiplierFormDialog`, `AdvancedRateFormDialog`, `OptionalFeeFormDialog` et `PromotionFormDialog`.

### AC2 : Persistance de la Sélection
- **Fait** : Les actions serveur et l'API traitent correctement le `vehicleCategoryId` lors de la création et de la mise à jour.

### AC3 : Gestion du "Toutes Catégories"
- **Fait** : La valeur vide du sélecteur est transformée en `null` avant l'appel API, garantissant l'applicabilité globale.

## Implémentation réalisée
- **UI Table Views** : Ajout d'une colonne "Catégorie" dans les listes des 4 modules de tarification pour une identification rapide.
- **API routes** : Mise à jour des requêtes Prisma avec `include: { vehicleCategory: true }` pour renvoyer le nom de la catégorie au frontend.
- **Support International** : Ajout des clés de traduction pour la nouvelle colonne en français et en anglais.

## Stratégie de Test validée
1. **Tests Unitaires** : Vérifié la génération des payloads et le comportement du sélecteur.
2. **Tests Navigateur (E2E)** : Création de données de test ("Berline Cleaning Fee", "BERLINEBEST") et vérification de l'affichage correct dans les colonnes des tableaux.
3. **Validation Database** : Vérification de la présence des IDs de catégories et des valeurs nulles dans PostgreSQL.
