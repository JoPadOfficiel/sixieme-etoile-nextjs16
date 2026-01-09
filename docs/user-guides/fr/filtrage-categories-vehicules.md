# Guide Utilisateur : Filtrage par Catégorie de Véhicule pour le Pricing

Ce guide explique comment utiliser la nouvelle fonctionnalité de filtrage par catégorie de véhicule pour vos ajustements tarifaires (Tarifs Avancés, Multiplicateurs Saisonniers, Frais Optionnels et Promotions).

## Introduction
Auparavant, chaque ajustement de prix s'appliquait à toutes les catégories de véhicules. Vous pouvez désormais différencier vos tarifs : par exemple, définir un tarif de nuit plus élevé pour les Vans que pour les Berlines, ou proposer une promotion exclusive aux réservations d'Autocars.

## Configuration d'un Ajustement
Lors de la création ou de l'édition d'un ajustement (Ajustements, Frais ou Promotions), une nouvelle section **"Catégories de Véhicules"** est disponible dans le formulaire.

### Les 3 modes disponibles :
1.  **Toutes les catégories (Par défaut) :** L'ajustement s'applique à tous les devis, quelle que soit la voiture choisie.
2.  **Une seule catégorie :** Sélectionnez une catégorie spécifique dans la liste déroulante.
3.  **Plusieurs catégories :** Cochez les catégories auxquelles vous souhaitez que cet ajustement s'applique.

## Impact sur la Création de Devis
Le système de filtrage est intelligent et automatique :

### 1. Calcul Automatique
Lorsqu'un devis est calculé, le moteur de pricing vérifie la catégorie du véhicule sélectionné. Seuls les tarifs avancés et multiplicateurs saisonniers correspondants sont appliqués.

### 2. Catalogue de Frais et Promotions
Lorsque vous ajoutez un frais manuel ou une promotion depuis le catalogue :
- Seuls les frais applicables à la catégorie de véhicule du devis sont affichés.
- Si aucune catégorie n'est encore sélectionnée, la liste complète est affichée par défaut.

## Exemples d'utilisation
- **Heures de Nuit :** Créez un ajustement "Nuit" de +20€ pour les Berlines et un autre de +40€ pour les Autocars.
- **Frais de Bagage :** Définissez un frais "Excédent de bagages" disponible uniquement pour les catégories de type "Van".
- **Promotion Spéciale :** Appliquez une remise de 10% uniquement sur les réservations de la catégorie "Berline VIP".

## Résolution de problèmes
- **Mon frais n'apparaît pas dans le catalogue :** Vérifiez que la catégorie de véhicule du devis correspond bien à celle configurée dans le frais.
- **Le prix ne change pas :** Assurez-vous que l'ajustement est "Actif" et que ses conditions (jours, heures, dates) sont également remplies.
