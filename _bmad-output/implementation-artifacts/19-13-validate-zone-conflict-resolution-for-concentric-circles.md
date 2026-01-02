# Story 19-13: Validate Zone Conflict Resolution for Concentric Circles

**Epic:** 19 - Bug Fixes & Improvements  
**Story ID:** 19-13  
**Status:** ready-for-dev  
**Priority:** High  
**Estimated Points:** 5

---

## Description

En tant qu'**opérateur VTC**,  
Je veux que le système de résolution de conflits de zones fonctionne correctement avec le modèle de cercles concentriques (PARIS + BUSSY),  
Afin que les tarifs soient cohérents, prévisibles et que les zones spéciales (aéroports, POIs) aient priorité sur les cercles génériques.

### Contexte Métier

Le système de pricing utilise deux centres avec des anneaux concentriques :

- **PARIS** (Notre-Dame 48.8566, 2.3522) : coeff de base 1.0, augmente en s'éloignant
- **BUSSY-SAINT-MARTIN** (Garage 48.8495, 2.6905) : coeff 0.8, augmente en s'éloignant

Le moteur de pricing applique `Math.max(pickup_zone, dropoff_zone)` pour déterminer le multiplicateur final.

### Problème Actuel

Les tests unitaires existants (`geo-utils.test.ts`) valident les stratégies de résolution (PRIORITY, MOST_EXPENSIVE, CLOSEST, COMBINED) mais ne couvrent pas :

1. Le scénario réel des cercles concentriques PARIS/BUSSY
2. La priorité des zones spéciales (CDG, Orly, Versailles) sur les cercles
3. L'agrégation des multiplicateurs pickup/dropoff via `Math.max()`
4. Les cas limites aux frontières des cercles

---

## Acceptance Criteria

### AC1: Zones Spéciales Prioritaires sur Cercles Concentriques

**Given** un point situé à CDG (49.0097, 2.5479) qui est dans le rayon de CDG (5km) ET dans PARIS_40 (40km de Paris)  
**When** le système résout le conflit de zones  
**Then** la zone CDG est sélectionnée (priorité plus haute ou rayon plus petit)  
**And** le multiplicateur 1.2 (CDG) est appliqué, pas 1.3 (PARIS_40)

### AC2: Cercle le Plus Petit Gagne (Même Centre)

**Given** un point situé à 8km de Paris (dans PARIS_10 et PARIS_20 et PARIS_30...)  
**When** le système résout le conflit de zones avec stratégie par défaut (spécificité)  
**Then** la zone PARIS_10 (rayon 10km) est sélectionnée car plus spécifique  
**And** le multiplicateur 1.0 est appliqué

### AC3: Chevauchement PARIS/BUSSY - Math.max() Appliqué

**Given** un trajet de BUSSY_0 (pickup, mult 0.8) vers PARIS_20 (dropoff, mult 1.1)  
**When** le moteur de pricing calcule le multiplicateur de zone  
**Then** le multiplicateur final est 1.1 (Math.max(0.8, 1.1))

### AC4: Point dans Zone BUSSY Uniquement

**Given** un point situé à Disneyland (48.8673, 2.7836) - dans BUSSY_10 mais hors PARIS_20  
**When** le système résout la zone  
**Then** la zone BUSSY_10 est sélectionnée avec multiplicateur 0.85

### AC5: Stratégie PRIORITY Respectée

**Given** les zones avec priorités définies (CDG priority=5, PARIS_20 priority=1)  
**When** la stratégie de résolution est PRIORITY  
**Then** CDG est sélectionnée même si PARIS_20 a un rayon plus grand

### AC6: Stratégie MOST_EXPENSIVE Respectée

**Given** un point dans CDG (mult 1.2) et PARIS_30 (mult 1.2) et BUSSY_25 (mult 0.95)  
**When** la stratégie de résolution est MOST_EXPENSIVE  
**Then** une zone avec multiplicateur 1.2 est sélectionnée (CDG ou PARIS_30)

### AC7: Validation Topologique des Zones

**Given** la configuration des zones concentriques  
**When** l'outil de validation topologique est exécuté  
**Then** aucun "trou" de couverture n'est détecté dans la région Île-de-France  
**And** les chevauchements intentionnels (cercles concentriques) sont identifiés comme "expected"

---

## Test Cases

### TC1: Zone Spéciale CDG vs Cercle PARIS

```typescript
// Point: CDG Airport (49.0097, 2.5479)
// Expected: CDG zone selected (radius 5km, priority high)
// NOT: PARIS_40 (radius 40km from Paris center)
```

### TC2: Cercles Concentriques Paris - Spécificité

```typescript
// Point: 48.88, 2.35 (approx 3km from Paris center)
// Expected: PARIS_0 (5km radius) selected
// NOT: PARIS_10, PARIS_20, etc.
```

### TC3: Cercles Concentriques Bussy

```typescript
// Point: Disneyland (48.8673, 2.7836) - ~9km from Bussy
// Expected: BUSSY_10 (10km radius) selected
// Multiplier: 0.85
```

### TC4: Math.max() Aggregation

```typescript
// Pickup: BUSSY_0 (mult 0.8)
// Dropoff: PARIS_20 (mult 1.1)
// Expected final multiplier: 1.1
```

### TC5: Frontière Entre Deux Centres

```typescript
// Point: 48.85, 2.5 (between Paris and Bussy centers)
// Should be in both PARIS_20 and BUSSY_15
// With MOST_EXPENSIVE: PARIS_20 (1.1) wins over BUSSY_15 (0.9)
```

### TC6: Zone Hors Couverture

```typescript
// Point: Reims center (49.2583, 4.0317)
// Expected: REIMS zone (if within 20km radius)
// OR: PARIS_100 as fallback (100km from Paris)
```

### TC7: Surcharges de Zone Appliquées

```typescript
// Point: CDG
// Expected: Zone CDG selected
// AND: fixedAccessFee = 15.0€ added to operational cost
```

---

## Technical Notes

### Fichiers Concernés

- `packages/api/src/lib/geo-utils.ts` - Fonctions de résolution de zone
- `packages/api/src/lib/__tests__/geo-utils.test.ts` - Tests unitaires à étendre
- `packages/api/src/services/pricing-engine.ts` - Utilisation de findZoneForPoint
- `packages/api/src/lib/zone-topology-validator.ts` - Validation topologique
- `packages/database/prisma/seed-vtc-complete.ts` - Définitions des zones

### Implémentation Requise

1. **Nouveaux Tests Unitaires** dans `geo-utils.test.ts`:

   - Ajouter une suite `describe("Concentric Circles Resolution")` avec les scénarios réels PARIS/BUSSY
   - Tester chaque stratégie (PRIORITY, MOST_EXPENSIVE, CLOSEST, COMBINED, default)
   - Tester les zones spéciales qui "percent" les cercles

2. **Test d'Intégration** pour le pricing engine:

   - Vérifier que `Math.max(pickup, dropoff)` est bien appliqué
   - Vérifier que les surcharges de zone sont ajoutées

3. **Validation Topologique**:
   - Exécuter `validateZoneTopology()` sur les zones de seed
   - Vérifier qu'il n'y a pas de gaps dans la couverture

### Données de Test (depuis seed-vtc-complete.ts)

```typescript
// Cercles PARIS
PARIS_0:   { center: (48.8566, 2.3522), radius: 5km,  mult: 1.0 }
PARIS_10:  { center: (48.8566, 2.3522), radius: 10km, mult: 1.0 }
PARIS_20:  { center: (48.8566, 2.3522), radius: 20km, mult: 1.1 }
PARIS_30:  { center: (48.8566, 2.3522), radius: 30km, mult: 1.2 }
PARIS_40:  { center: (48.8566, 2.3522), radius: 40km, mult: 1.3 }
PARIS_60:  { center: (48.8566, 2.3522), radius: 60km, mult: 1.4 }
PARIS_100: { center: (48.8566, 2.3522), radius: 100km, mult: 1.5 }

// Cercles BUSSY
BUSSY_0:  { center: (48.8495, 2.6905), radius: 5km,  mult: 0.8 }
BUSSY_10: { center: (48.8495, 2.6905), radius: 10km, mult: 0.85 }
BUSSY_15: { center: (48.8495, 2.6905), radius: 15km, mult: 0.9 }
BUSSY_25: { center: (48.8495, 2.6905), radius: 25km, mult: 0.95 }
BUSSY_40: { center: (48.8495, 2.6905), radius: 40km, mult: 1.0 }

// Zones Spéciales
CDG:         { center: (49.0097, 2.5479), radius: 5km, mult: 1.2, priority: high }
ORLY:        { center: (48.7262, 2.3652), radius: 4km, mult: 1.1 }
LA_DEFENSE:  { center: (48.8920, 2.2362), radius: 3km, mult: 1.0 }
VERSAILLES:  { center: (48.8049, 2.1204), radius: 5km, mult: 1.2 }
```

---

## Dependencies

- Story 17-1: Configurable Zone Conflict Resolution Strategy ✅ (done)
- Story 17-2: Configurable Zone Multiplier Aggregation Strategy ✅ (done)
- Story 17-10: Zone Fixed Surcharges (Friction Costs) ✅ (done)
- Story 17-11: Zone Topology Validation Tools ✅ (done)

---

## Out of Scope

- Modification de la structure des zones (déjà définie dans seed)
- Changement des multiplicateurs (configuration métier)
- UI pour visualiser les conflits de zones (future story)

---

## Definition of Done

- [ ] Tests unitaires ajoutés pour les cercles concentriques PARIS/BUSSY
- [ ] Tests unitaires ajoutés pour les zones spéciales prioritaires
- [ ] Test d'intégration pour Math.max(pickup, dropoff)
- [ ] Validation topologique exécutée sans erreurs critiques
- [ ] Tous les tests passent (`pnpm test`)
- [ ] Code review approuvée
- [ ] Documentation mise à jour si nécessaire
