# Guide Utilisateur : Type de Trajet STAY (Séjour Multi-Jours)

**Version:** 1.0  
**Date:** 2026-01-04  
**Public:** Opérateurs commerciaux, Dispatchers

---

## Introduction

Le type de trajet **STAY** (Séjour) permet de créer des packages multi-jours comprenant plusieurs services de transport répartis sur plusieurs journées. Ce guide vous explique comment créer, gérer et facturer des séjours complexes.

### Cas d'Usage Typiques

- **Séjour touristique** : Transfert aéroport + excursions + retour sur 3-5 jours
- **Événement d'entreprise** : Transport de délégation sur plusieurs jours avec multiples déplacements
- **Voyage d'affaires** : Mise à disposition récurrente pendant un séjour professionnel

---

## Création d'un Devis STAY

### Étape 1 : Sélectionner le Type de Trajet

1. Accédez à **Devis** → **Nouveau Devis**
2. Dans le formulaire, sélectionnez **Type de trajet** : `STAY`
3. L'interface se transforme pour afficher le configurateur multi-jours

![Sélection du type STAY](../../../assets/screenshots/stay-selection.png)

### Étape 2 : Configurer les Informations Générales

Remplissez les informations de base :

- **Client** : Sélectionnez le contact (particulier ou agence partenaire)
- **Véhicule** : Choisissez la catégorie de véhicule
- **Dates du séjour** : Date de début et date de fin
- **Notes** : Instructions spéciales pour le séjour complet

### Étape 3 : Ajouter les Journées de Service

Pour chaque jour du séjour :

1. Cliquez sur **+ Ajouter une journée**
2. Sélectionnez la date
3. Configurez les services pour cette journée

![Calendrier multi-jours](../../../assets/screenshots/stay-calendar.png)

### Étape 4 : Configurer les Services par Jour

Pour chaque journée, vous pouvez ajouter plusieurs services :

#### Type de Service : TRANSFER (Transfert)

- **Point de départ** : Adresse de prise en charge
- **Point d'arrivée** : Adresse de dépose
- **Heure de prise en charge** : Heure exacte
- **Passagers** : Nombre de passagers
- **Bagages** : Nombre de bagages

**Exemple** : Transfert aéroport CDG → Hôtel Paris (Jour 1, 10h00)

#### Type de Service : EXCURSION

- **Point de départ** : Adresse de départ
- **Arrêts intermédiaires** : Ajoutez les étapes du circuit
- **Point de retour** : Adresse de retour
- **Heure de départ** : Heure de début
- **Durée estimée** : Durée totale de l'excursion

**Exemple** : Excursion Versailles avec visite château (Jour 2, 9h00-17h00)

#### Type de Service : DISPO (Mise à Disposition)

- **Point de départ** : Adresse de prise en charge
- **Zone de disponibilité** : Zone géographique
- **Heure de début** : Heure de début de mise à disposition
- **Durée** : Nombre d'heures de disponibilité

**Exemple** : Mise à disposition 4h pour réunions Paris (Jour 3, 14h00-18h00)

### Étape 5 : Vérifier les Coûts de Staffing

Le système calcule automatiquement :

- **Nuitées d'hôtel** : Si le service se termine après 20h00 ou dépasse 12h
- **Repas** : 1 repas par 6 heures de service (max 2/jour)
- **Second conducteur** : Si requis par la réglementation RSE

![Détail des coûts de staffing](../../../assets/screenshots/stay-staffing-costs.png)

**Règles de calcul** :

- 1 repas = 25€ par conducteur
- 1 nuitée = 85€ par conducteur
- Les coûts sont doublés si 2 conducteurs requis

### Étape 6 : Réviser le Récapitulatif

Le panneau **Transparence du Trajet** affiche :

1. **Résumé par jour** : Services et coûts de chaque journée
2. **Coûts de staffing totaux** : Hôtels + repas + second conducteur
3. **Prix total du séjour** : Somme de tous les services
4. **Marge** : Rentabilité globale du package

![Récapitulatif du séjour](../../../assets/screenshots/stay-summary.png)

### Étape 7 : Envoyer le Devis

1. Vérifiez tous les détails
2. Cliquez sur **Envoyer le devis**
3. Le client reçoit un devis détaillé avec le breakdown jour par jour

---

## Modification d'un Devis STAY

### Avant Envoi (Statut DRAFT)

Tous les champs sont modifiables :

- Ajoutez ou supprimez des journées
- Modifiez les services
- Changez les horaires ou adresses

### Après Envoi (Statut SENT/ACCEPTED)

**Champs modifiables** :

- Notes opérationnelles uniquement

**Champs verrouillés** :

- Prix, services, dates, véhicule

Pour modifier un devis envoyé, créez un nouveau devis ou dupliquez l'existant.

---

## Conversion en Facture

Lorsqu'un devis STAY est accepté :

1. Accédez au devis accepté
2. Cliquez sur **Convertir en facture**
3. La facture est générée avec **lignes détaillées** :

**Structure de facture** :

```
Ligne 1: Transfert - Jour 1 - CDG → Hôtel Paris
Ligne 2: Excursion - Jour 2 - Versailles (8h)
Ligne 3: Hôtel - Jour 2 - Nuitée conducteur
Ligne 4: Repas - Jour 2 - Déjeuner + Dîner
Ligne 5: Mise à disposition - Jour 3 - Paris (4h)
Ligne 6: Transfert - Jour 3 - Hôtel → CDG
```

Chaque ligne affiche :

- Description du service
- Date
- Prix unitaire
- TVA applicable

![Facture détaillée STAY](../../../assets/screenshots/stay-invoice.png)

---

## Dispatch des Missions STAY

### Vue dans le Dispatch

Les missions STAY apparaissent dans le dispatch avec :

- **Badge STAY** : Indicateur visuel du type multi-jours
- **Durée totale** : Nombre de jours du séjour
- **Timeline** : Vue chronologique des services

### Affectation des Conducteurs

Pour chaque service du séjour :

1. Sélectionnez la mission STAY
2. Développez la timeline pour voir les services
3. Affectez un conducteur à chaque service
4. Le système vérifie la disponibilité sur toute la durée

**Important** : Un même conducteur peut être affecté à tous les services du séjour, ou vous pouvez utiliser plusieurs conducteurs selon la disponibilité.

![Dispatch STAY timeline](../../../assets/screenshots/stay-dispatch-timeline.png)

---

## Conseils et Bonnes Pratiques

### Quand Utiliser STAY vs Devis Séparés ?

**Utilisez STAY quand** :

- ✅ Même client sur plusieurs jours
- ✅ Package global avec prix négocié
- ✅ Facturation unique souhaitée
- ✅ Gestion de staffing cohérente (hôtel, repas)

**Utilisez des devis séparés quand** :

- ❌ Services indépendants sans lien
- ❌ Facturation séparée requise
- ❌ Clients différents
- ❌ Flexibilité d'annulation par service

### Optimisation des Coûts

1. **Groupez les services** : Réduisez les déplacements à vide entre services
2. **Planifiez les nuitées** : Évitez les retours inutiles à la base
3. **Optimisez les horaires** : Minimisez les temps d'attente
4. **Utilisez un seul conducteur** : Si la réglementation RSE le permet

### Gestion des Imprévus

- **Annulation d'un service** : Contactez le support pour modifier le devis
- **Ajout de service** : Créez un devis complémentaire
- **Changement d'horaire** : Modifiez les notes pour informer le conducteur

---

## Questions Fréquentes (FAQ)

### Q1 : Puis-je mélanger différents types de véhicules dans un STAY ?

**R :** Non, actuellement un séjour STAY utilise la même catégorie de véhicule pour tous les services. Si vous avez besoin de véhicules différents, créez des devis séparés.

### Q2 : Comment sont calculés les coûts d'hôtel ?

**R :** Une nuitée d'hôtel est ajoutée automatiquement si :

- Le service se termine après 20h00, OU
- La durée totale du service dépasse 12 heures

Le coût est de 85€ par conducteur par nuit.

### Q3 : Puis-je modifier les prix des services individuels ?

**R :** Oui, dans le panneau Transparence du Trajet, vous pouvez ajuster manuellement les prix de chaque composant avant d'envoyer le devis.

### Q4 : Comment gérer un séjour sur 2 semaines ?

**R :** Le système STAY supporte des séjours de toute durée. Ajoutez simplement autant de journées que nécessaire. Pour les très longs séjours, envisagez de créer plusieurs packages STAY par semaine pour plus de flexibilité.

### Q5 : Les coûts de staffing sont-ils facturés au client ?

**R :** Oui, les coûts de staffing (hôtel, repas, second conducteur) sont inclus dans le prix total du devis et apparaissent comme lignes séparées sur la facture pour transparence.

---

## Support

Pour toute question ou problème avec les devis STAY :

- **Documentation complète** : [docs/api/stay-endpoints.md](../../api/stay-endpoints.md)
- **Guide des meilleures pratiques** : [docs/best-practices/stay-usage-guide.md](../../best-practices/stay-usage-guide.md)
- **Support technique** : support@sixieme-etoile.fr

---

**Dernière mise à jour** : 2026-01-04  
**Version** : 1.0 (Epic 22)
