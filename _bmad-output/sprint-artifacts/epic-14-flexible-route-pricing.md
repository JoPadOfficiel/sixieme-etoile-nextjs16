# Epic 14 - Flexible Route Pricing System

**Status:** contexted
**Created:** 2025-12-01  
**Author:** BMAD Orchestrator

---

## Epic Overview

### Problem Statement

Le système actuel de tarification par routes (`/settings/pricing/routes`) présente plusieurs limitations critiques :

1. **Bug Vehicle Category** : Le dropdown de sélection des catégories véhicules ne fonctionne pas
2. **Modèle trop rigide** : Actuellement limité à Zone unique → Zone unique
3. **Manque de flexibilité** :
   - Impossible de définir un prix identique pour plusieurs zones sources (ex: "Paris Intramuros" = toutes zones Paris internes)
   - Impossible d'utiliser une adresse/lieu spécifique comme origine ou destination
   - Pas de visualisation interactive sur carte

### Business Value

| Bénéfice               | Impact                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| Configuration flexible | Réduction de 80% du nombre de routes à créer pour couvrir Paris Intramuros  |
| Adresses spécifiques   | Support des partenaires hôteliers avec prix fixes depuis leur établissement |
| Carte interactive      | Réduction des erreurs de configuration, meilleure UX admin                  |
| Vehicle Category fix   | Déblocage d'une fonctionnalité critique cassée                              |

### Scope

#### In Scope

- Correction du bug Vehicle Category dropdown
- Extension du modèle de données pour supporter multi-zones et adresses
- Nouveau formulaire de création/édition de routes avec :
  - Sélection multi-zones (dropdown ou carte)
  - Sélection d'adresse via Google Places Autocomplete
  - Radio buttons pour choisir le type (Zone(s) vs Adresse)
- Carte Google Maps interactive pour sélection visuelle des zones
- Migration des données existantes

#### Out of Scope

- Refonte du pricing engine (Epic 4)
- Modification des forfaits excursions/dispos
- Import/export bulk des routes
- Historique des modifications de routes

---

## Technical Context

### Current Data Model (ZoneRoute)

```prisma
model ZoneRoute {
  id                String    @id @default(cuid())
  organizationId    String
  fromZoneId        String    // SINGLE zone
  toZoneId          String    // SINGLE zone
  vehicleCategoryId String
  direction         RouteDirection @default(BIDIRECTIONAL)
  fixedPrice        Decimal
  isActive          Boolean   @default(true)
  // ...
}
```

### Proposed Data Model Changes

```prisma
model ZoneRoute {
  id                String    @id @default(cuid())
  organizationId    String

  // Origin - Either zone(s) OR specific address
  originType        OriginType @default(ZONES)  // ZONES | ADDRESS
  fromZoneId        String?    // Deprecated, kept for migration
  fromZones         ZoneRouteOriginZone[]      // NEW: Multi-zone support
  originPlaceId     String?    // Google Place ID for specific address
  originAddress     String?    // Human-readable address
  originLat         Float?
  originLng         Float?

  // Destination - Either zone(s) OR specific address
  destinationType   DestinationType @default(ZONES)  // ZONES | ADDRESS
  toZoneId          String?    // Deprecated, kept for migration
  toZones           ZoneRouteDestinationZone[] // NEW: Multi-zone support
  destPlaceId       String?
  destAddress       String?
  destLat           Float?
  destLng           Float?

  vehicleCategoryId String
  direction         RouteDirection @default(BIDIRECTIONAL)
  fixedPrice        Decimal
  isActive          Boolean   @default(true)
  // ...
}

model ZoneRouteOriginZone {
  id          String    @id @default(cuid())
  zoneRouteId String
  zoneId      String
  zoneRoute   ZoneRoute @relation(fields: [zoneRouteId], references: [id], onDelete: Cascade)
  zone        PricingZone @relation(fields: [zoneId], references: [id])
}

model ZoneRouteDestinationZone {
  id          String    @id @default(cuid())
  zoneRouteId String
  zoneId      String
  zoneRoute   ZoneRoute @relation(fields: [zoneRouteId], references: [id], onDelete: Cascade)
  zone        PricingZone @relation(fields: [zoneId], references: [id])
}

enum OriginType {
  ZONES
  ADDRESS
}

enum DestinationType {
  ZONES
  ADDRESS
}
```

### Dependencies

| Dependency            | Status   | Notes                               |
| --------------------- | -------- | ----------------------------------- |
| Google Maps API       | ✅ Ready | Places Autocomplete + Drawing Tools |
| PricingZone model     | ✅ Ready | Epic 3 / Epic 11                    |
| VehicleCategory model | ✅ Ready | Epic 1                              |
| Pricing Engine        | ✅ Ready | Epic 4 - needs zone matching update |

### Risks

| Risk                                     | Probability | Mitigation                      |
| ---------------------------------------- | ----------- | ------------------------------- |
| Migration complexe des routes existantes | Medium      | Script de migration automatique |
| Performance pricing avec multi-zones     | Low         | Index optimisés + cache         |
| Conflits de routes                       | Medium      | Validation côté API             |

---

## Stories Breakdown

### Story 14.1: Fix Vehicle Category Dropdown Bug

**Priority:** Critical  
**Estimate:** 2 SP

Corriger le bug où le dropdown Vehicle Category ne charge pas les options.

### Story 14.2: Extend ZoneRoute Schema for Multi-Zone & Address Support

**Priority:** High  
**Estimate:** 5 SP

Modifier le schéma Prisma pour supporter :

- Multi-zones origine/destination
- Adresses spécifiques via Google Places

### Story 14.3: Implement Flexible Route Form UI

**Priority:** High  
**Estimate:** 8 SP

Nouveau formulaire avec :

- Radio buttons: Zone(s) vs Adresse
- Multi-select zones dropdown
- Google Places Autocomplete pour adresses
- Preview des sélections

### Story 14.4: Add Interactive Google Maps Zone Selection

**Priority:** Medium  
**Estimate:** 5 SP

Carte interactive permettant de :

- Visualiser les zones existantes
- Sélectionner/désélectionner des zones par clic
- Voir la preview de la route

### Story 14.5: Update Pricing Engine for Multi-Zone Routes

**Priority:** High  
**Estimate:** 3 SP

Adapter le pricing engine pour :

- Matcher une adresse pickup/dropoff contre des routes multi-zones
- Prioriser les routes les plus spécifiques

### Story 14.6: Migrate Existing Routes to New Schema

**Priority:** Medium  
**Estimate:** 2 SP

Script de migration qui convertit les routes Zone→Zone existantes vers le nouveau format.

---

## Related PRD Requirements

- **FR8**: Geographic zones model → Extended to support multi-zone grouping
- **FR9**: Route matrix with fixed prices → Extended with flexible origins/destinations
- **FR37**: Admin configuration for zones, routes → New UI form

## Related Epics

- **Epic 3**: Zone Engine & Partner Fixed Grids (foundation)
- **Epic 11**: Zone Management Refactoring (zone editor)
- **Epic 12**: Partner-Specific Pricing (override prices per partner)
- **Epic 13**: Pricing UI Improvements (translations, filters)
