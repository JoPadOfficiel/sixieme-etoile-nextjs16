# Guide Utilisateur : Tarification Aller-Retour Corrigée

**Version:** 1.0  
**Date:** 2026-01-04  
**Public:** Opérateurs commerciaux, Responsables tarifaires

---

## Introduction

La tarification aller-retour a été corrigée pour refléter avec précision les coûts opérationnels réels. Au lieu d'appliquer un simple multiplicateur ×2, le système calcule maintenant chaque segment du trajet pour éviter la double comptabilisation des retours à vide.

### Changement Clé

**Avant (Incorrect)** :

```
Prix aller-retour = Prix aller simple × 2
```

**Maintenant (Correct)** :

```
Prix aller-retour = Somme de tous les segments réels
```

---

## Comprendre le Calcul par Segments

### Les 6 Segments d'un Aller-Retour

Pour un trajet aller-retour complet, le système calcule :

1. **Segment A** : Base → Point de départ (positionnement aller)
2. **Segment B** : Point de départ → Destination (service aller)
3. **Segment C** : Destination → Base (retour à vide après aller)
4. **Segment D** : Base → Destination (positionnement retour)
5. **Segment E** : Destination → Point de départ (service retour)
6. **Segment F** : Point de départ → Base (retour à vide final)

**Prix total = A + B + C + D + E + F**

![Schéma des segments aller-retour](../../../assets/screenshots/round-trip-segments.png)

### Exemple Concret

**Trajet** : Aller-retour Paris Gare de Lyon ↔ Aéroport CDG  
**Base** : Bussy-Saint-Martin

**Calcul détaillé** :

```
Segment A: Bussy → Gare de Lyon = 35 km × 2.50€ = 87.50€
Segment B: Gare de Lyon → CDG = 40 km × 2.50€ = 100.00€
Segment C: CDG → Bussy = 25 km × 2.50€ = 62.50€

[Attente client à CDG - quelques heures]

Segment D: Bussy → CDG = 25 km × 2.50€ = 62.50€
Segment E: CDG → Gare de Lyon = 40 km × 2.50€ = 100.00€
Segment F: Gare de Lyon → Bussy = 35 km × 2.50€ = 87.50€

Total = 500.00€
```

**Ancienne méthode (incorrecte)** :

```
Aller simple = 87.50 + 100.00 + 62.50 = 250€
Aller-retour = 250€ × 2 = 500€
```

Dans cet exemple, les deux méthodes donnent le même résultat, mais ce n'est pas toujours le cas.

---

## Cas où la Différence est Significative

### Cas 1 : Base Différente pour le Retour

Si le véhicule ne retourne pas à la même base :

**Trajet** : Paris → Lyon (aller), Lyon → Paris (retour)  
**Base aller** : Bussy-Saint-Martin  
**Base retour** : Lyon (véhicule reste sur place)

**Nouveau calcul** :

```
Segment A: Bussy → Paris = 40 km
Segment B: Paris → Lyon = 470 km
Segment C: Pas de retour à vide (véhicule reste à Lyon)
Segment D: Pas de positionnement (déjà à Lyon)
Segment E: Lyon → Paris = 470 km
Segment F: Paris → Bussy = 40 km

Total = 40 + 470 + 470 + 40 = 1020 km
```

**Ancien calcul (incorrect)** :

```
Aller simple = 40 + 470 + 40 = 550 km
Aller-retour = 550 × 2 = 1100 km (80 km de trop!)
```

### Cas 2 : Optimisation Multi-Base

Le système sélectionne automatiquement la base optimale pour chaque segment :

**Trajet** : Aller-retour Versailles ↔ Orly  
**Bases disponibles** : Bussy (Est), Versailles (Ouest)

**Optimisation** :

```
Aller:
- Segment A: Versailles base → Versailles départ = 2 km
- Segment B: Versailles → Orly = 25 km
- Segment C: Orly → Bussy base = 30 km

Retour:
- Segment D: Bussy base → Orly = 30 km
- Segment E: Orly → Versailles = 25 km
- Segment F: Versailles → Versailles base = 2 km

Total = 114 km
```

**Sans optimisation** :

```
Tout depuis Bussy = 180 km (66 km de plus!)
```

---

## Impact sur les Devis

### Visualisation dans l'Interface

Lorsque vous créez un devis aller-retour :

1. **Cochez "Aller-retour"** dans le formulaire
2. Le panneau **Transparence du Trajet** affiche :
   - Breakdown des 6 segments
   - Distance et coût de chaque segment
   - Base utilisée pour chaque positionnement
   - Total optimisé

![Transparence aller-retour](../../../assets/screenshots/round-trip-transparency.png)

### Informations Affichées

Pour chaque segment :

- **Distance** : Kilomètres parcourus
- **Durée** : Temps estimé
- **Base** : Base de départ/arrivée
- **Coût** : Prix calculé
- **Type** : Positionnement / Service / Retour à vide

---

## Avantages de la Nouvelle Méthode

### 1. Précision des Coûts

✅ **Coûts réels** : Reflète exactement les kilomètres parcourus  
✅ **Pas de double comptabilisation** : Évite de facturer deux fois les retours à vide  
✅ **Optimisation multi-base** : Utilise la base la plus proche pour chaque segment

### 2. Transparence Client

✅ **Détail complet** : Le client voit exactement ce qu'il paie  
✅ **Justification claire** : Chaque segment est expliqué  
✅ **Confiance renforcée** : Transparence totale sur le calcul

### 3. Rentabilité Améliorée

✅ **Marges correctes** : Calcul précis des coûts internes  
✅ **Décisions éclairées** : Savoir si un aller-retour est rentable  
✅ **Optimisation automatique** : Sélection de la meilleure base

---

## Cas Particuliers

### Aller-Retour Immédiat (Attente)

Si le client demande un aller-retour avec attente :

**Exemple** : Déposer à l'aéroport, attendre 2h, ramener

**Calcul** :

```
Segment A: Base → Départ = 30 km
Segment B: Départ → Aéroport = 40 km
[Attente 2h = 2 × 45€/h = 90€]
Segment E: Aéroport → Départ = 40 km
Segment F: Départ → Base = 30 km

Total = 140 km + 90€ attente
```

Pas de segments C et D car le véhicule ne retourne pas à la base entre les deux trajets.

### Aller-Retour Multi-Jours

Pour un aller-retour sur plusieurs jours :

**Exemple** : Déposer lundi, récupérer vendredi

Le système ajoute automatiquement :

- **Coûts de staffing** : Hôtel si nécessaire
- **Optimisation** : Le véhicule peut faire d'autres missions entre-temps
- **Segments optimisés** : Utilise la position actuelle du véhicule

---

## Migration des Anciens Devis

### Devis Existants

Les devis créés avant la correction conservent leur prix d'origine :

- ✅ **Prix garantis** : Pas de modification rétroactive
- ✅ **Marqueur visuel** : Badge "Ancien calcul" dans les détails
- ✅ **Recalcul possible** : Option pour recalculer avec nouvelle méthode

### Recalculer un Ancien Devis

1. Ouvrez le devis aller-retour existant
2. Cliquez sur **Recalculer avec nouvelle méthode**
3. Comparez l'ancien et le nouveau prix
4. Décidez de conserver ou mettre à jour

**Note** : Seuls les devis en statut DRAFT peuvent être recalculés.

---

## Questions Fréquentes (FAQ)

### Q1 : Mes prix aller-retour vont-ils augmenter ?

**R :** Pas nécessairement. Dans la plupart des cas, le nouveau calcul est plus précis et peut même être moins cher grâce à l'optimisation multi-base. Les prix augmentent uniquement si l'ancien calcul sous-estimait les coûts réels.

### Q2 : Comment expliquer le nouveau calcul aux clients ?

**R :** Utilisez le panneau Transparence du Trajet qui montre clairement chaque segment. Les clients apprécient la transparence et comprennent qu'ils paient pour les kilomètres réellement parcourus.

### Q3 : Puis-je forcer l'utilisation d'une base spécifique ?

**R :** Oui, dans les paramètres avancés du devis, vous pouvez désactiver l'optimisation multi-base et forcer une base spécifique. Cependant, cela peut augmenter le coût.

### Q4 : Que se passe-t-il si je modifie un devis aller-retour existant ?

**R :** Si le devis est en DRAFT, il sera automatiquement recalculé avec la nouvelle méthode. Si le devis est déjà envoyé ou accepté, vous devez créer un nouveau devis.

### Q5 : Le calcul fonctionne-t-il avec les grilles tarifaires partenaires ?

**R :** Oui, pour les agences partenaires avec grilles tarifaires, le système applique les tarifs de grille à chaque segment, puis optimise le total. Les règles d'engagement des grilles sont respectées.

---

## Support Technique

Pour toute question sur la tarification aller-retour :

- **Documentation technique** : [docs/api/pricing-endpoints.md](../../api/pricing-endpoints.md)
- **Guide de rentabilité** : [docs/best-practices/staffing-management.md](../../best-practices/staffing-management.md)
- **Support** : support@sixieme-etoile.fr

---

**Dernière mise à jour** : 2026-01-04  
**Version** : 1.0 (Epic 22 - Story 22.1)
