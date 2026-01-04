# Guide Utilisateur : Affichage des Coûts de Staffing

**Version:** 1.0  
**Date:** 2026-01-04  
**Public:** Opérateurs commerciaux, Dispatchers

---

## Introduction

Les coûts de staffing (personnel) sont maintenant affichés de manière détaillée dans les devis et le dispatch. Vous pouvez voir exactement combien coûtent les repas, les nuitées d'hôtel et les seconds conducteurs pour chaque mission.

### Composants des Coûts de Staffing

1. **Repas** : Déjeuner et dîner pour les conducteurs
2. **Hôtel** : Nuitées pour les missions longues ou de nuit
3. **Second conducteur** : Coût horaire du deuxième conducteur (si requis par RSE)

---

## Règles de Calcul Automatique

### Calcul des Repas

**Règle** : 1 repas par tranche de 6 heures de service (maximum 2 par jour)

**Exemples** :

```
Mission 4h → 0 repas
Mission 7h → 1 repas (déjeuner ou dîner)
Mission 13h → 2 repas (déjeuner + dîner)
Mission 25h → 4 repas (2 jours × 2 repas)
```

**Tarif standard** : 25€ par repas par conducteur

**Calcul** :

```
Nombre de repas = floor(durée_heures / 6)
Maximum par jour = 2 repas
Coût total = nombre_repas × 25€ × nombre_conducteurs
```

### Calcul des Nuitées d'Hôtel

**Règle** : 1 nuitée si :

- Le service se termine après 20h00, OU
- La durée totale dépasse 12 heures

**Exemples** :

```
Service 10h-18h → Pas d'hôtel (fin avant 20h)
Service 10h-21h → 1 nuitée (fin après 20h)
Service 8h-22h → 1 nuitée (durée > 12h)
Service sur 3 jours → 2 nuitées
```

**Tarif standard** : 85€ par nuitée par conducteur

**Calcul** :

```
Si heure_fin > 20h00 OU durée > 12h :
  nombre_nuitées = nombre_jours - 1
Coût total = nombre_nuitées × 85€ × nombre_conducteurs
```

**Note** : L'hôtel inclut toujours 1 repas (petit-déjeuner)

### Calcul du Second Conducteur

**Règle RSE** : Second conducteur requis si :

- Amplitude de service > 13 heures, OU
- Distance totale > 500 km, OU
- Réglementation spécifique véhicule lourd

**Tarif** : Taux horaire du conducteur (généralement 25-35€/h)

**Calcul** :

```
Si second_conducteur_requis :
  Coût = durée_heures × taux_horaire_conducteur
```

---

## Affichage dans les Devis

### Panneau Transparence du Trajet

Lors de la création d'un devis, le panneau **Transparence du Trajet** affiche une section dédiée aux coûts de staffing :

![Coûts de staffing dans devis](../../../assets/screenshots/quote-staffing-costs.png)

**Informations affichées** :

1. **Résumé Staffing** :

   ```
   👥 Staffing : 2 conducteurs requis
   🍽️ Repas : 4 repas × 25€ = 100€
   🏨 Hôtel : 2 nuitées × 85€ = 170€
   💰 Total Staffing : 270€
   ```

2. **Détail par Jour** (pour missions multi-jours) :

   ```
   Jour 1 :
   - Repas : Déjeuner + Dîner = 50€
   - Hôtel : 1 nuitée = 85€

   Jour 2 :
   - Repas : Déjeuner + Dîner = 50€
   - Hôtel : 1 nuitée = 85€
   ```

3. **Calcul Détaillé** :

   ```
   Repas :
   - Durée mission : 14 heures
   - Repas calculés : 14h ÷ 6h = 2 repas
   - Conducteurs : 2
   - Coût : 2 repas × 25€ × 2 conducteurs = 100€

   Hôtel :
   - Fin de service : 22h30 (après 20h)
   - Nuitées requises : 1
   - Conducteurs : 2
   - Coût : 1 nuitée × 85€ × 2 conducteurs = 170€
   ```

### Modification Manuelle

Vous pouvez ajuster manuellement les coûts de staffing :

1. Cliquez sur **✏️ Modifier** dans la section Staffing
2. Ajustez les valeurs :
   - Nombre de repas
   - Nombre de nuitées
   - Tarifs unitaires
3. Le total se recalcule automatiquement

**Cas d'usage** :

- Négociation spéciale avec hôtel partenaire
- Client fournit les repas
- Ajustement pour conditions particulières

---

## Affichage dans le Dispatch

### Vue Liste des Missions

Dans la liste des missions, les indicateurs de staffing apparaissent :

![Indicateurs staffing dispatch](../../../assets/screenshots/dispatch-staffing-indicators.png)

**Badges visuels** :

- 🏨 : Nuitée d'hôtel requise
- 🍽️ : Repas inclus
- 👥 : Second conducteur requis

**Survol** : Passez la souris sur les badges pour voir le détail

### Détails de Mission

Lorsque vous sélectionnez une mission, le panneau de détails affiche :

1. **Section Staffing** :

   ```
   Exigences de Staffing
   ━━━━━━━━━━━━━━━━━━━━
   👥 2 conducteurs (RSE 14h amplitude)
   🍽️ 4 repas (2 jours × 2 repas/jour)
   🏨 2 nuitées (mission multi-jours)

   Coût Total Staffing : 450€
   ```

2. **Breakdown des Coûts** :

   ```
   Repas : 100€
   - Jour 1 : 2 repas × 25€ = 50€
   - Jour 2 : 2 repas × 25€ = 50€

   Hôtel : 170€
   - Nuit 1 : 85€ × 2 conducteurs = 170€

   Second Conducteur : 180€
   - 12 heures × 15€/h = 180€
   ```

3. **Timeline Multi-Jours** (pour séjours STAY) :

   ```
   📅 Jour 1 - 04/01/2026
   ├─ Service : 10h-22h (12h)
   ├─ Repas : Déjeuner + Dîner
   └─ Hôtel : Nuitée requise

   📅 Jour 2 - 05/01/2026
   ├─ Service : 9h-18h (9h)
   ├─ Repas : Déjeuner
   └─ Hôtel : Pas de nuitée (fin avant 20h)
   ```

### Affectation de Conducteurs

Lors de l'affectation, le système vérifie :

- ✅ **Disponibilité** : Conducteurs disponibles sur toute la durée
- ✅ **Conformité RSE** : Respect des temps de conduite
- ✅ **Compétences** : Licence appropriée pour le véhicule

Si second conducteur requis :

- Le système suggère automatiquement des binômes compatibles
- Affiche le coût additionnel du second conducteur

---

## Configuration des Tarifs

### Paramètres Globaux

Accédez à **Paramètres** → **Tarification** → **Coûts de Staffing** :

**Tarifs par défaut** :

```
Repas :
- Déjeuner : 25€
- Dîner : 25€
- Petit-déjeuner : Inclus dans hôtel

Hôtel :
- Nuitée standard : 85€
- Nuitée grande ville : 110€
- Nuitée province : 70€

Second Conducteur :
- Taux horaire : 25€/h
- Taux forfaitaire jour : 200€
```

### Paramètres par Véhicule

Certains véhicules peuvent avoir des tarifs spécifiques :

**Exemple** :

```
Minibus (9 places) :
- Repas : 30€ (conducteur + accompagnateur)
- Hôtel : 95€ (chambre double)
- Second conducteur : Obligatoire si > 8h
```

### Paramètres par Zone

Les tarifs peuvent varier selon la zone géographique :

**Exemple** :

```
Paris intra-muros :
- Hôtel : 110€ (tarifs élevés)

Province :
- Hôtel : 70€ (tarifs modérés)

Étranger :
- Hôtel : Variable selon pays
```

---

## Facturation au Client

### Inclusion dans le Prix

Les coûts de staffing sont **toujours inclus** dans le prix total du devis :

**Structure de prix** :

```
Prix de base (distance + temps) : 350€
+ Coûts de staffing : 270€
+ Péages et frais : 45€
= Prix total TTC : 665€
```

### Transparence sur la Facture

Sur la facture, les coûts de staffing apparaissent en lignes séparées :

**Exemple de facture** :

```
Ligne 1 : Transport Paris → Lyon (470 km) : 350.00€
Ligne 2 : Repas conducteurs (4 repas) : 100.00€
Ligne 3 : Hébergement conducteurs (2 nuitées) : 170.00€
Ligne 4 : Péages autoroute : 45.00€
─────────────────────────────────────────────────
Total HT : 665.00€
TVA 10% : 66.50€
Total TTC : 731.50€
```

### Justification Client

Si le client questionne les coûts de staffing :

**Arguments** :

- ✅ **Conformité légale** : Respect de la réglementation RSE
- ✅ **Sécurité** : Conducteurs reposés = trajet plus sûr
- ✅ **Transparence** : Tous les coûts sont détaillés
- ✅ **Qualité** : Service professionnel avec personnel qualifié

---

## Optimisation des Coûts

### Réduire les Coûts de Repas

**Stratégies** :

- 🔄 **Optimiser les horaires** : Planifier pour éviter les heures de repas
- 🤝 **Négocier avec restaurants** : Tarifs préférentiels pour volume
- 📦 **Paniers repas** : Alternative moins coûteuse (15€ vs 25€)

### Réduire les Coûts d'Hôtel

**Stratégies** :

- 🏨 **Hôtels partenaires** : Négocier des tarifs annuels
- 🔄 **Optimiser les retours** : Planifier pour éviter les nuitées
- 🚗 **Relais de conducteurs** : Changement de conducteur pour éviter nuitée

### Optimiser le Staffing

**Stratégies** :

- 📊 **Analyser les missions** : Identifier les patterns coûteux
- 🔄 **Regrouper les trajets** : Combiner plusieurs missions
- 👥 **Former les conducteurs** : Polyvalence pour meilleure utilisation

---

## Questions Fréquentes (FAQ)

### Q1 : Les coûts de staffing sont-ils toujours facturés au client ?

**R :** Oui, les coûts de staffing font partie des coûts opérationnels réels et sont inclus dans le prix du devis. Ils sont transparents sur la facture.

### Q2 : Puis-je désactiver l'affichage des coûts de staffing pour certains clients ?

**R :** Vous pouvez masquer le détail sur la facture client tout en conservant le calcul interne. Configurez cela dans Paramètres → Facturation → Niveau de détail.

### Q3 : Comment gérer les cas où le client fournit les repas ?

**R :** Modifiez manuellement le nombre de repas à 0 dans le devis. Le système conservera la trace que des repas étaient prévus mais ne les facturera pas.

### Q4 : Les tarifs de staffing sont-ils les mêmes pour tous les conducteurs ?

**R :** Par défaut oui, mais vous pouvez configurer des tarifs spécifiques par conducteur dans leur profil (Paramètres → Conducteurs → Tarifs).

### Q5 : Comment sont calculés les coûts de staffing pour un séjour STAY ?

**R :** Pour un STAY, le système calcule jour par jour :

- Repas selon la durée de chaque service
- Hôtel selon l'heure de fin de chaque journée
- Second conducteur selon les exigences RSE de chaque service

---

## Support

Pour toute question sur les coûts de staffing :

- **Documentation technique** : [docs/api/pricing-endpoints.md](../../api/pricing-endpoints.md)
- **Guide de rentabilité** : [docs/best-practices/staffing-management.md](../../best-practices/staffing-management.md)
- **Support technique** : support@sixieme-etoile.fr

---

**Dernière mise à jour** : 2026-01-04  
**Version** : 1.0 (Epic 22 - Story 22.2)
