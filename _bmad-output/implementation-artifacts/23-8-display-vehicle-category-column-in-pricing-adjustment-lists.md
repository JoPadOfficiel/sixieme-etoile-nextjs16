---
id: "23-8"
title: "Display vehicle category column in pricing adjustment lists"
status: "done"
epic: "23"
type: "story"
---

## Description
En tant qu'administrateur, je veux voir la colonne "Catégorie de véhicule" dans les listes des ajustements de prix (Seasonal Multipliers, Advanced Rates, Optional Fees, Promotions) pour identifier rapidement les règles spécifiques aux véhicules.

## Critères d'Acceptation (AC)

### AC1 : Colonne Catégorie dans Seasonal Multipliers
- Le tableau des Multiplicateurs Saisonniers affiche une colonne "Vehicle Categories" (ou "Catégorie").
- Si aucune catégorie n'est spécifique (tableau vide), afficher "All Categories".
- Si une ou plusieurs catégories sont sélectionnées, afficher leurs noms séparés par des virgules.

### AC2 : Colonne Catégorie dans Advanced Rates
- Le tableau des Tarifs Avancés (Advanced Rates) affiche une colonne "Vehicle Categories".
- Même logique d'affichage ("All Categories" vs liste).

### AC3 : Colonne Catégorie dans Optional Fees
- Le tableau des Frais Optionnels (Optional Fees) affiche une colonne "Vehicle Categories".
- Même logique d'affichage.

### AC4 : Colonne Catégorie dans Promotions
- Le tableau des Promotions affiche une colonne "Vehicle Categories".
- Même logique d'affichage.

## Contraintes & Dépendances
- Les données proviennent de la relation `vehicleCategories` (Many-to-Many).
- Le backend doit inclure cette relation dans les requêtes de liste `findMany`.
- Le frontend doit mapper ces objets vers une liste de noms de string.
