# Guide Utilisateur : Système de Sous-Traitance

**Version:** 1.0  
**Date:** 2026-01-04  
**Public:** Dispatchers, Gestionnaires de flotte

---

## Introduction

Le système de sous-traitance permet de gérer efficacement l'externalisation de missions lorsque vos ressources internes ne sont pas disponibles. Ce guide couvre la gestion des profils de sous-traitants, l'analyse de rentabilité, et l'attribution de missions.

### Avantages de la Sous-Traitance

- **Flexibilité** : Répondez aux pics de demande sans augmenter votre flotte
- **Couverture géographique** : Servez des zones éloignées de vos bases
- **Optimisation des coûts** : Externalisez les missions non rentables en interne
- **Qualité de service** : Maintenez vos engagements même en cas de contraintes

---

## Gestion des Profils de Sous-Traitants

### Créer un Profil de Sous-Traitant

1. Accédez à **Paramètres** → **Sous-Traitants**
2. Cliquez sur **+ Nouveau Sous-Traitant**
3. Remplissez les informations :

#### Informations Générales

- **Nom de l'entreprise** : Raison sociale du sous-traitant
- **Contact principal** : Nom et prénom du responsable
- **Email** : Adresse email de contact
- **Téléphone** : Numéro de téléphone principal
- **Adresse** : Adresse du siège social

#### Flotte de Véhicules

Pour chaque catégorie de véhicule disponible :

- **Catégorie** : Berline, Van, Minibus, etc.
- **Nombre de véhicules** : Quantité disponible
- **Capacité** : Nombre de passagers
- **Équipements** : WiFi, sièges bébé, etc.

**Exemple** :

```
Berline Standard : 5 véhicules, 3 passagers
Van Premium : 2 véhicules, 7 passagers
```

#### Zones d'Opération

Définissez les zones géographiques couvertes :

- **Zones principales** : Zones de service régulier
- **Zones secondaires** : Zones couvertes sur demande
- **Restrictions** : Zones non couvertes

**Exemple** :

```
Zones principales : Seine-et-Marne (77), Val-de-Marne (94)
Zones secondaires : Paris intra-muros
Restrictions : Aucune sortie d'Île-de-France
```

#### Grille Tarifaire

Configurez les tarifs du sous-traitant :

- **Tarif au kilomètre** : Prix par km selon catégorie
- **Tarif horaire** : Prix par heure pour mise à disposition
- **Forfaits** : Trajets prédéfinis (aéroports, gares)
- **Frais minimums** : Prix minimum de course

**Exemple** :

```
Berline : 2.50€/km, 45€/h, Minimum 50€
Van : 3.20€/km, 60€/h, Minimum 70€
```

#### Disponibilité et Délais

- **Délai de réponse** : Temps moyen de confirmation
- **Disponibilité** : Jours et horaires de service
- **Préavis requis** : Délai minimum de réservation

### Modifier un Profil Existant

1. Accédez à **Paramètres** → **Sous-Traitants**
2. Cliquez sur le sous-traitant à modifier
3. Mettez à jour les informations nécessaires
4. Cliquez sur **Enregistrer**

---

## Suggestions de Sous-Traitance

### Analyse Automatique

Le système analyse automatiquement chaque mission et suggère la sous-traitance si :

- ✅ **Aucun véhicule interne disponible** dans la fenêtre horaire
- ✅ **Distance importante de la base** (coût de positionnement élevé)
- ✅ **Rentabilité négative** avec ressources internes
- ✅ **Zone mieux couverte** par un sous-traitant

### Visualiser les Suggestions

Dans le dispatch, les missions avec suggestion de sous-traitance affichent :

- **Badge "Sous-traitance suggérée"** : Indicateur visuel orange
- **Icône de recommandation** : 💡 dans la liste des missions
- **Score de pertinence** : Pourcentage de recommandation

![Suggestions de sous-traitance](../../../assets/screenshots/subcontracting-suggestions.png)

### Détails de la Suggestion

Cliquez sur une mission suggérée pour voir :

1. **Comparaison de coûts** :

   - Coût interne estimé
   - Coût sous-traitant
   - Économie potentielle

2. **Sous-traitants disponibles** :

   - Liste des sous-traitants couvrant la zone
   - Tarifs de chacun
   - Disponibilité confirmée

3. **Analyse de rentabilité** :
   - Marge avec ressources internes
   - Marge avec sous-traitance
   - Recommandation finale

**Exemple de comparaison** :

```
Coût interne : 280€ (positionnement 80km + service)
Coût sous-traitant : 180€ (base locale)
Économie : 100€ (35%)
Recommandation : ✅ Sous-traiter
```

---

## Attribution de Mission à un Sous-Traitant

### Processus d'Attribution

1. **Sélectionner la mission** dans le dispatch
2. **Ouvrir le panneau d'attribution**
3. **Onglet "Sous-Traitants"** : Voir les sous-traitants disponibles
4. **Comparer les options** : Coûts et disponibilité
5. **Sélectionner le sous-traitant** : Cliquer sur "Attribuer"
6. **Confirmer l'attribution** : Valider la sélection

![Attribution à un sous-traitant](../../../assets/screenshots/subcontracting-assignment.png)

### Filtrage des Sous-Traitants

Utilisez les filtres pour trouver le meilleur sous-traitant :

- **Type de véhicule** : Catégorie requise
- **Zone géographique** : Couverture de la zone
- **Prix maximum** : Budget disponible
- **Disponibilité** : Fenêtre horaire requise
- **Évaluation** : Note de performance

### Confirmation et Communication

Après attribution :

1. **Notification automatique** : Email envoyé au sous-traitant
2. **Détails de la mission** : Informations complètes transmises
3. **Confirmation attendue** : Délai selon profil du sous-traitant
4. **Statut mis à jour** : Mission marquée "En attente de confirmation"

---

## Suivi des Missions Sous-Traitées

### Vue dans le Dispatch

Les missions sous-traitées sont identifiées par :

- **Badge "Sous-traité"** : Indicateur bleu
- **Nom du sous-traitant** : Affiché dans les détails
- **Statut de confirmation** : Confirmé / En attente / Refusé

### Statuts Possibles

- **Attribué** : Mission envoyée au sous-traitant
- **Confirmé** : Sous-traitant a accepté la mission
- **En cours** : Mission en exécution
- **Terminé** : Mission complétée
- **Refusé** : Sous-traitant a décliné (réattribution nécessaire)

### Gestion des Refus

Si un sous-traitant refuse :

1. **Notification immédiate** : Alerte dans le dispatch
2. **Réattribution automatique** : Suggestions alternatives
3. **Historique conservé** : Raison du refus enregistrée

---

## Analyse de Performance

### Métriques par Sous-Traitant

Accédez à **Rapports** → **Sous-Traitance** pour voir :

- **Nombre de missions** : Total attribué par période
- **Taux d'acceptation** : % de missions confirmées
- **Taux de ponctualité** : % de missions à l'heure
- **Évaluation moyenne** : Note globale
- **Coût moyen** : Prix moyen par mission

### Tableau de Bord

Le tableau de bord affiche :

1. **Top 5 sous-traitants** : Les plus utilisés
2. **Économies réalisées** : Montant total économisé
3. **Taux de sous-traitance** : % de missions externalisées
4. **Zones les plus sous-traitées** : Analyse géographique

![Tableau de bord sous-traitance](../../../assets/screenshots/subcontracting-dashboard.png)

---

## Facturation et Paiement

### Réception des Factures

Les factures des sous-traitants sont :

1. **Reçues par email** : Envoi automatique après mission
2. **Enregistrées dans le système** : Lien avec la mission
3. **Vérifiées automatiquement** : Comparaison avec tarif convenu
4. **Validées ou contestées** : Workflow d'approbation

### Suivi des Paiements

- **Factures en attente** : Liste des factures à payer
- **Factures payées** : Historique des paiements
- **Échéancier** : Dates de paiement planifiées
- **Rapprochement** : Vérification des montants

---

## Conseils et Bonnes Pratiques

### Sélection des Sous-Traitants

**Critères de qualité** :

- ✅ Vérifiez les assurances et licences VTC
- ✅ Testez avec des missions simples d'abord
- ✅ Demandez des références clients
- ✅ Visitez leur base si possible

**Négociation tarifaire** :

- 💡 Négociez des forfaits pour trajets récurrents
- 💡 Obtenez des tarifs dégressifs selon volume
- 💡 Clarifiez les frais supplémentaires (péages, parking)

### Optimisation de la Sous-Traitance

**Quand sous-traiter** :

- ✅ Distance > 50km de votre base la plus proche
- ✅ Pic de demande dépassant votre capacité
- ✅ Zone géographique peu fréquente
- ✅ Rentabilité interne négative

**Quand garder en interne** :

- ❌ Clients VIP ou contrats stratégiques
- ❌ Missions très rentables
- ❌ Zone proche de vos bases
- ❌ Besoin de contrôle qualité maximal

### Gestion des Relations

- **Communication régulière** : Briefing mensuel avec sous-traitants principaux
- **Feedback constructif** : Partagez les retours clients
- **Reconnaissance** : Valorisez les bonnes performances
- **Contrats clairs** : Formalisez les accords par écrit

---

## Questions Fréquentes (FAQ)

### Q1 : Comment calculer le prix de vente au client avec sous-traitance ?

**R :** Le système calcule automatiquement :

- Coût sous-traitant (selon grille tarifaire)
- - Marge de l'agence (configurable, généralement 15-25%)
- = Prix de vente client

Vous pouvez ajuster manuellement la marge avant d'envoyer le devis.

### Q2 : Que faire si un sous-traitant refuse une mission au dernier moment ?

**R :**

1. Le système vous alerte immédiatement
2. Les suggestions alternatives s'affichent automatiquement
3. Réattribuez à un autre sous-traitant ou prenez en interne
4. Le refus est enregistré dans l'historique du sous-traitant

### Q3 : Puis-je sous-traiter une partie d'un séjour STAY ?

**R :** Oui, pour un séjour STAY, vous pouvez :

- Sous-traiter certains services et garder d'autres en interne
- Utiliser différents sous-traitants pour différents jours
- Le système gère la coordination automatiquement

### Q4 : Comment gérer les litiges avec un sous-traitant ?

**R :**

1. Documentez le problème dans les notes de mission
2. Contactez le sous-traitant directement
3. Si non résolu, marquez la mission comme "Litige"
4. Le système bloque les paiements jusqu'à résolution

### Q5 : Les clients savent-ils que la mission est sous-traitée ?

**R :** Cela dépend de votre configuration :

- **Mode transparent** : Le client est informé (nom du sous-traitant visible)
- **Mode marque blanche** : Le client ne voit que votre marque
- Configurez ce paramètre dans Paramètres → Sous-Traitance → Visibilité

---

## Support

Pour toute question sur la sous-traitance :

- **Documentation API** : [docs/api/subcontracting-endpoints.md](../../api/subcontracting-endpoints.md)
- **Guide d'optimisation** : [docs/best-practices/subcontracting-optimization.md](../../best-practices/subcontracting-optimization.md)
- **Support technique** : support@sixieme-etoile.fr

---

**Dernière mise à jour** : 2026-01-04  
**Version** : 1.0 (Epic 22)
