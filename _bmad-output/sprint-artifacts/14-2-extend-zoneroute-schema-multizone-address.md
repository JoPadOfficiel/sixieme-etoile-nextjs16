# Story 14.2: Extend ZoneRoute Schema for Multi-Zone & Address Support

**Status:** done  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** High  
**Estimate:** 5 SP  
**Created:** 2025-12-01

---

## Story Context

### Problem

Le modèle actuel `ZoneRoute` est limité à une relation **Zone unique → Zone unique**, ce qui ne permet pas de :

1. **Regrouper plusieurs zones** sous un même prix (ex: "Paris Intramuros" = toutes zones Paris internes → CDG)
2. **Définir une adresse spécifique** comme origine ou destination (ex: Hôtel Ritz Paris → Orly)
3. **Combiner zones et adresses** pour des configurations flexibles

### Current Schema

```prisma
model ZoneRoute {
  id                String    @id @default(cuid())
  organizationId    String
  fromZoneId        String    // ❌ Single zone only
  toZoneId          String    // ❌ Single zone only
  vehicleCategoryId String
  direction         RouteDirection @default(BIDIRECTIONAL)
  fixedPrice        Decimal
  isActive          Boolean   @default(true)
  // ...
}
```

### Objectives

1. Permettre la sélection de **plusieurs zones** comme origine et/ou destination
2. Permettre la sélection d'une **adresse spécifique** (via Google Places) comme origine et/ou destination
3. Maintenir la **rétrocompatibilité** avec les routes existantes
4. Préparer le terrain pour le **pricing engine** (Story 14.5)

---

## Scope

### In Scope

- Modification du schéma Prisma `ZoneRoute`
- Création des tables de liaison `ZoneRouteOriginZone` et `ZoneRouteDestinationZone`
- Ajout des enums `OriginType` et `DestinationType`
- Migration Prisma
- Script de migration des données existantes

### Out of Scope

- Modification de l'UI (Story 14.3)
- Modification du pricing engine (Story 14.5)
- Carte interactive (Story 14.4)

---

## Acceptance Criteria

### AC1: Schema Supports Multi-Zone Origins

**Given** le nouveau schéma Prisma  
**When** je crée une route avec plusieurs zones d'origine  
**Then** les zones sont stockées dans `ZoneRouteOriginZone`

### AC2: Schema Supports Multi-Zone Destinations

**Given** le nouveau schéma Prisma  
**When** je crée une route avec plusieurs zones de destination  
**Then** les zones sont stockées dans `ZoneRouteDestinationZone`

### AC3: Schema Supports Address Origin

**Given** le nouveau schéma Prisma  
**When** je crée une route avec une adresse d'origine  
**Then** `originType = ADDRESS`, `originPlaceId`, `originAddress`, `originLat`, `originLng` sont remplis

### AC4: Schema Supports Address Destination

**Given** le nouveau schéma Prisma  
**When** je crée une route avec une adresse de destination  
**Then** `destinationType = ADDRESS`, `destPlaceId`, `destAddress`, `destLat`, `destLng` sont remplis

### AC5: Existing Routes Migrated

**Given** les routes existantes avec `fromZoneId` et `toZoneId`  
**When** la migration s'exécute  
**Then** chaque route a une entrée dans `ZoneRouteOriginZone` et `ZoneRouteDestinationZone`

### AC6: API Backward Compatible

**Given** l'API existante `/api/vtc/pricing/routes`  
**When** je liste les routes  
**Then** les routes existantes s'affichent correctement avec `fromZone` et `toZone`

---

## Technical Details

### New Schema

```prisma
enum OriginDestinationType {
  ZONES
  ADDRESS
}

model ZoneRoute {
  id                String    @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Origin configuration
  originType        OriginDestinationType @default(ZONES)
  originZones       ZoneRouteOriginZone[]
  originPlaceId     String?   // Google Place ID
  originAddress     String?   // Human-readable address
  originLat         Float?
  originLng         Float?

  // Destination configuration
  destinationType   OriginDestinationType @default(ZONES)
  destinationZones  ZoneRouteDestinationZone[]
  destPlaceId       String?
  destAddress       String?
  destLat           Float?
  destLng           Float?

  // Legacy fields (kept for backward compatibility during migration)
  fromZoneId        String?
  fromZone          PricingZone? @relation("FromZone", fields: [fromZoneId], references: [id])
  toZoneId          String?
  toZone            PricingZone? @relation("ToZone", fields: [toZoneId], references: [id])

  vehicleCategoryId String
  vehicleCategory   VehicleCategory @relation(fields: [vehicleCategoryId], references: [id])
  direction         RouteDirection @default(BIDIRECTIONAL)
  fixedPrice        Decimal @db.Decimal(10, 2)
  isActive          Boolean @default(true)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Partner overrides
  partnerContractZoneRoutes PartnerContractZoneRoute[]

  @@index([organizationId])
  @@index([originType])
  @@index([destinationType])
  @@index([vehicleCategoryId])
  @@index([isActive])
}

model ZoneRouteOriginZone {
  id          String    @id @default(cuid())
  zoneRouteId String
  zoneId      String
  zoneRoute   ZoneRoute @relation(fields: [zoneRouteId], references: [id], onDelete: Cascade)
  zone        PricingZone @relation("OriginZones", fields: [zoneId], references: [id])

  @@unique([zoneRouteId, zoneId])
  @@index([zoneRouteId])
  @@index([zoneId])
}

model ZoneRouteDestinationZone {
  id          String    @id @default(cuid())
  zoneRouteId String
  zoneId      String
  zoneRoute   ZoneRoute @relation(fields: [zoneRouteId], references: [id], onDelete: Cascade)
  zone        PricingZone @relation("DestinationZones", fields: [zoneId], references: [id])

  @@unique([zoneRouteId, zoneId])
  @@index([zoneRouteId])
  @@index([zoneId])
}
```

### Migration Strategy

1. **Add new columns** (nullable) to ZoneRoute
2. **Create junction tables** ZoneRouteOriginZone, ZoneRouteDestinationZone
3. **Data migration script**: For each existing route, create entries in junction tables
4. **Keep legacy columns** for backward compatibility during transition

---

## Test Cases

### TC1: Create Route with Multi-Zone Origin

```typescript
const route = await db.zoneRoute.create({
  data: {
    organizationId: "org_1",
    originType: "ZONES",
    originZones: {
      create: [{ zoneId: "zone_paris_1" }, { zoneId: "zone_paris_2" }],
    },
    destinationType: "ZONES",
    destinationZones: {
      create: [{ zoneId: "zone_cdg" }],
    },
    vehicleCategoryId: "cat_berline",
    fixedPrice: 80,
  },
});
expect(route.originZones).toHaveLength(2);
```

### TC2: Create Route with Address Origin

```typescript
const route = await db.zoneRoute.create({
  data: {
    organizationId: "org_1",
    originType: "ADDRESS",
    originPlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    originAddress: "Hôtel Ritz Paris, Place Vendôme",
    originLat: 48.8683,
    originLng: 2.3293,
    destinationType: "ZONES",
    destinationZones: {
      create: [{ zoneId: "zone_orly" }],
    },
    vehicleCategoryId: "cat_berline",
    fixedPrice: 95,
  },
});
expect(route.originType).toBe("ADDRESS");
```

### TC3: Migration preserves existing routes

```sql
-- Before migration
SELECT COUNT(*) FROM "ZoneRoute" WHERE "fromZoneId" IS NOT NULL;
-- After migration
SELECT COUNT(*) FROM "ZoneRouteOriginZone";
-- Counts should match
```

---

## Dependencies

- Prisma schema (Epic 1) ✅
- PricingZone model (Epic 3) ✅
- VehicleCategory model (Epic 1) ✅

---

## Definition of Done

- [x] Prisma schema updated with new fields and tables
- [x] Migration created and tested
- [x] Data migration script for existing routes
- [x] AC1-AC6 validated
- [x] TC1-TC3 passing
- [x] No regression on existing routes API
- [ ] Code committed with descriptive message

---

## Implementation Summary

**Completed:** 2025-12-01

### Changes Made

1. **Prisma Schema** (`packages/database/prisma/schema.prisma`)

   - Added `OriginDestinationType` enum (`ZONES`, `ADDRESS`)
   - Extended `ZoneRoute` model with:
     - `originType`, `originZones`, `originPlaceId`, `originAddress`, `originLat`, `originLng`
     - `destinationType`, `destinationZones`, `destPlaceId`, `destAddress`, `destLat`, `destLng`
   - Made `fromZoneId` and `toZoneId` nullable (backward compatibility)
   - Created `ZoneRouteOriginZone` junction table
   - Created `ZoneRouteDestinationZone` junction table
   - Added inverse relations in `PricingZone`

2. **Migration** (`20251201123347_story_14_2_multizone_address_routes`)

   - Schema migration applied successfully
   - Data migration script migrated 40 existing routes

3. **API Updates** (`packages/api/src/routes/vtc/zone-routes.ts`)
   - Added `transformZone` helper function
   - Updated `transformRoute` to include `originZones` and `destinationZones`
   - Updated list and get endpoints to include new relations

### Verification

```sql
-- Routes migrated successfully
SELECT COUNT(*) FROM zone_route_origin_zone;      -- 40
SELECT COUNT(*) FROM zone_route_destination_zone; -- 40
```
