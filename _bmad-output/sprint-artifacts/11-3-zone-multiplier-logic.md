# Story 11.3 - Zone Pricing Multiplier Logic

## Résumé

Ce document explique la logique métier des multiplicateurs de zones pour le système de pricing VTC.

## Principe Fondamental

Dans le VTC, la tarification est inversement proportionnelle à la proximité du garage principal :

- **Plus on est proche du garage** → **Prix moins cher** (pas de trajet à vide)
- **Plus on s'éloigne** → **Prix plus cher** (coût du deadhead)
- **Paris Centre** → **Prix compétitif** (zone de forte demande, concurrence élevée)

## Logique des Multiplicateurs

### Comment ça fonctionne

Le pricing engine utilise `Math.max(pickupMultiplier, dropoffMultiplier)` pour déterminer le multiplicateur final.

**Exemple :**

- Trajet Paris (0.85×) → CDG (1.15×) = **1.15×** appliqué
- Trajet Bussy (0.80×) → Disney (0.95×) = **0.95×** appliqué
- Trajet Paris (0.85×) → Paris (0.85×) = **0.85×** appliqué

### Pourquoi Math.max() ?

Cette logique protège la rentabilité :

1. Si un trajet implique une zone "chère" (éloignée), le multiplicateur élevé s'applique
2. Les trajets entre zones "avantageuses" bénéficient du tarif réduit
3. Cela reflète le coût réel du trajet à vide (approche + retour)

## Tableau des Zones et Multiplicateurs

| Zone                   | Code            | Multiplicateur | Justification                                  |
| ---------------------- | --------------- | -------------- | ---------------------------------------------- |
| **Bussy-Saint-Martin** | BUSSY_ST_MARTIN | **0.80×**      | Garage principal - aucun trajet à vide         |
| Zone Premium Paris     | PARIS_PREMIUM   | 0.85×          | Centre Paris - forte demande, tarif compétitif |
| Marne-la-Vallée        | MARNE_LA_VALLEE | 0.90×          | Proche garage - tarif avantageux               |
| Paris Intra-Muros      | PARIS_INTRA     | 0.90×          | Paris élargi - tarif compétitif                |
| Est Urbain             | EST_URBAIN      | 0.95×          | Proche garage - tarif modéré                   |
| Disneyland             | DISNEY          | 0.95×          | Proche garage + forte demande touristique      |
| La Défense             | LA_DEFENSE      | 1.05×          | Zone affaires - légère majoration              |
| Aéroport Orly          | ORLY            | 1.10×          | Transferts aéroport premium                    |
| Petite Couronne        | PETITE_COURONNE | 1.10×          | Distance modérée du centre                     |
| Aéroport CDG           | CDG             | 1.15×          | Transferts premium longue distance             |
| Brie-sur-Orge          | BRIE_SUR_ORGE   | 1.15×          | Zone sud éloignée                              |
| Le Bourget             | LBG             | 1.20×          | Aviation d'affaires premium                    |
| Grande Couronne        | GRANDE_COURONNE | 1.25×          | Trajets longs - majoration importante          |

## Scénarios de Calcul

### Scénario 1 : Trajet local (même zone)

```
Pickup: Bussy-Saint-Martin (0.80×)
Dropoff: Bussy-Saint-Martin (0.80×)
→ Multiplicateur: 0.80× (réduction de 20%)
```

### Scénario 2 : Trajet vers Paris

```
Pickup: Bussy-Saint-Martin (0.80×)
Dropoff: Paris Premium (0.85×)
→ Multiplicateur: 0.85× (réduction de 15%)
```

### Scénario 3 : Trajet aéroport

```
Pickup: Paris Premium (0.85×)
Dropoff: CDG (1.15×)
→ Multiplicateur: 1.15× (majoration de 15%)
```

### Scénario 4 : Trajet grande couronne

```
Pickup: Paris Premium (0.85×)
Dropoff: Grande Couronne (1.25×)
→ Multiplicateur: 1.25× (majoration de 25%)
```

## Zones qui se chevauchent

Quand un point géographique appartient à plusieurs zones (ex: un point dans Paris qui est aussi dans la Petite Couronne), le système de géolocalisation retourne la zone la plus spécifique (plus petit rayon).

La logique de `findZoneForPoint()` dans `geo-utils.ts` :

1. Trouve toutes les zones contenant le point
2. Retourne la zone avec le plus petit rayon (la plus spécifique)

## Impact sur les Routes Forfaitaires

Les routes forfaitaires (`ZoneRoute`) ont des prix fixes qui **ne sont pas** affectés par les multiplicateurs de zone. Le multiplicateur s'applique uniquement au calcul dynamique (Méthode 2).

**Hiérarchie de tarification :**

1. Route forfaitaire définie → Prix fixe (pas de multiplicateur)
2. Excursion/Dispo forfaitaire → Prix fixe (pas de multiplicateur)
3. Calcul dynamique → Prix de base × multiplicateur de zone

## Références

- PRD Section 2.3 : Tarification Dynamique
- Document VTC-Analyse-approfondie : Partie 6 - Système de Zones
- Story 11.3 : Zone Pricing Multipliers Integration
