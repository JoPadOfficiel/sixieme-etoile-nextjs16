# Story 3.1: Implement PricingZone Model & Zones Editor UI

Status: done

## Story

**As an** admin,  
**I want** to create and edit geographic pricing zones on a map,  
**So that** I can model central Paris, rings and satellite areas used by pricing and grids.

## Acceptance Criteria

### AC1: Zones List Page

- **Given** `/app/[orgSlug]/zones`
- **When** I open the page
- **Then** I see a table of existing zones with columns: Name, Code, Type (Polygon/Radius/Point), Parent Zone, Routes Count, Actions (Edit/Delete)

### AC2: Add Zone Form

- **Given** I click "Add Zone"
- **When** the form/drawer opens
- **Then** I can enter: name, code, type (dropdown), center coordinates (lat/lng), radius (if type=Radius), geometry JSON (if type=Polygon), and optional parent zone

### AC3: Create Zone

- **Given** I fill the zone form and submit
- **When** the zone is created
- **Then** a PricingZone record is persisted with organizationId, and the zone appears in the table

### AC4: Edit Zone

- **Given** an existing zone
- **When** I edit and save changes
- **Then** the zone is updated in the database and the table reflects the changes

### AC5: Delete Zone (No References)

- **Given** an existing zone with no routes referencing it
- **When** I delete the zone
- **Then** the zone is removed from the database

### AC6: Delete Zone (With References) - Warning

- **Given** an existing zone referenced by routes
- **When** I attempt to delete it
- **Then** a warning is shown and deletion is blocked unless confirmed

### AC7: Zones API

- **Given** the zones API
- **When** I call GET /api/vtc/pricing/zones
- **Then** I receive a paginated list of zones for the current organization

## Technical Tasks

### Task 1: Prisma Schema

- [ ] Add `PricingZone` model with all required fields
- [ ] Add `ZoneType` enum (POLYGON, RADIUS, POINT)
- [ ] Add self-referencing `parentZoneId` for hierarchy
- [ ] Run migration

### Task 2: API Routes

- [ ] Create `/api/vtc/pricing/zones` route file
- [ ] Implement GET (list with pagination)
- [ ] Implement GET /:id (single zone)
- [ ] Implement POST (create zone)
- [ ] Implement PATCH /:id (update zone)
- [ ] Implement DELETE /:id (delete zone with reference check)
- [ ] Add to router

### Task 3: Frontend - Zones List

- [ ] Create `/app/[orgSlug]/settings/zones/page.tsx`
- [ ] Create `ZonesTable` component
- [ ] Create `ZoneDrawer` component for add/edit
- [ ] Create `ZoneForm` component
- [ ] Add navigation link in settings layout

### Task 4: Translations

- [ ] Add zone-related translations (EN/FR)

### Task 5: Tests

- [ ] Vitest: API tests for zones CRUD
- [ ] Playwright MCP: UI tests for zones management
- [ ] curl + DB verification

## Data Model

### PricingZone

```prisma
enum ZoneType {
  POLYGON
  RADIUS
  POINT
}

model PricingZone {
  id             String    @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name           String
  code           String    // Unique per organization
  type           ZoneType

  // Geometry data
  geometry       Json?     // GeoJSON-like structure for POLYGON
  centerLat      Decimal   @db.Decimal(10, 7)
  centerLng      Decimal   @db.Decimal(10, 7)
  radiusKm       Decimal?  @db.Decimal(10, 2) // For RADIUS type

  // Hierarchy
  parentZoneId   String?
  parentZone     PricingZone?  @relation("ZoneHierarchy", fields: [parentZoneId], references: [id])
  childZones     PricingZone[] @relation("ZoneHierarchy")

  // Status
  isActive       Boolean   @default(true)

  // Timestamps
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations (for future stories)
  fromRoutes     ZoneRoute[] @relation("FromZone")
  toRoutes       ZoneRoute[] @relation("ToZone")

  @@unique([organizationId, code])
  @@index([organizationId])
  @@map("pricing_zone")
}
```

## API Contract

### GET /api/vtc/pricing/zones

Query params: `page`, `limit`, `search`, `type`, `isActive`

Response:

```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Paris Intra-Muros",
      "code": "PARIS_0",
      "type": "POLYGON",
      "centerLat": 48.8566,
      "centerLng": 2.3522,
      "radiusKm": null,
      "geometry": { "type": "Polygon", "coordinates": [...] },
      "parentZoneId": null,
      "parentZone": null,
      "isActive": true,
      "routesCount": 5,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### POST /api/vtc/pricing/zones

Request:

```json
{
  "name": "CDG Airport",
  "code": "CDG",
  "type": "RADIUS",
  "centerLat": 49.0097,
  "centerLng": 2.5479,
  "radiusKm": 5,
  "geometry": null,
  "parentZoneId": null,
  "isActive": true
}
```

### PATCH /api/vtc/pricing/zones/:id

Request: Partial update of zone fields

### DELETE /api/vtc/pricing/zones/:id

Response (success):

```json
{ "success": true }
```

Response (has references):

```json
{
  "error": "ZONE_HAS_REFERENCES",
  "message": "This zone is referenced by 3 routes. Delete them first or use force=true.",
  "routesCount": 3
}
```

## UI Components

### ZonesTable

Columns:

- Name (with code badge)
- Type (icon + label)
- Center (lat, lng)
- Parent Zone (link or "-")
- Routes Count
- Status (Active/Inactive badge)
- Actions (Edit, Delete)

### ZoneForm

Fields:

- Name (required)
- Code (required, auto-slugified)
- Type (select: Polygon, Radius, Point)
- Center Latitude (number input)
- Center Longitude (number input)
- Radius in km (conditional, for RADIUS type)
- Geometry JSON (textarea, conditional, for POLYGON type)
- Parent Zone (select from existing zones)
- Active (switch)

## Sample Zones for Testing

| Name              | Code       | Type    | Center          | Radius |
| ----------------- | ---------- | ------- | --------------- | ------ |
| Paris Intra-Muros | PARIS_0    | POLYGON | 48.8566, 2.3522 | -      |
| Petite Couronne   | PARIS_1    | POLYGON | 48.8566, 2.3522 | -      |
| Grande Couronne   | PARIS_2    | POLYGON | 48.8566, 2.3522 | -      |
| CDG Airport       | CDG        | RADIUS  | 49.0097, 2.5479 | 5 km   |
| Orly Airport      | ORY        | RADIUS  | 48.7262, 2.3652 | 3 km   |
| Versailles        | VERSAILLES | RADIUS  | 48.8014, 2.1301 | 4 km   |
| Disneyland Paris  | DISNEY     | RADIUS  | 48.8673, 2.7839 | 3 km   |

## Dev Notes

- Zone codes must be unique per organization
- Geometry is stored as JSON (GeoJSON-like) for flexibility
- For MVP, the map editor is a simple coordinate/JSON input
- Interactive Google Maps drawing can be added in a follow-up story
- Routes count is computed via relation count, not stored

## Testing Strategy

### Vitest (Unit/Integration)

- Test zones CRUD API endpoints
- Test unique code constraint
- Test parent zone hierarchy
- Test delete with references check
- Test multi-tenancy isolation

### Playwright MCP (E2E/UI)

- Test zones list page loads
- Test add zone flow
- Test edit zone flow
- Test delete zone (no references)
- Test delete zone warning (with references)

### curl + DB Verification

- Create zone via API, verify in DB
- Update zone, verify changes
- Delete zone, verify removal
- Test pagination and filtering

## Dependencies

- Story 1.1: Define VTC ERP Prisma Models ✅ Done
- Story 1.2: Enforce Organization-Level Multi-Tenancy ✅ Done
- Story 1.5: Integration Settings Storage ✅ Done

## Files to Create/Modify

### Database

- `packages/database/prisma/schema.prisma` - Add PricingZone model

### API

- `packages/api/src/routes/vtc/pricing-zones.ts` - New route file
- `packages/api/src/routes/vtc/router.ts` - Add zones routes
- `packages/api/src/routes/vtc/__tests__/pricing-zones.test.ts` - Tests

### Frontend

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/zones/page.tsx`
- `apps/web/modules/saas/pricing/components/ZonesTable.tsx`
- `apps/web/modules/saas/pricing/components/ZoneDrawer.tsx`
- `apps/web/modules/saas/pricing/components/ZoneForm.tsx`
- `apps/web/modules/saas/pricing/components/index.ts`
- `apps/web/modules/saas/pricing/types.ts`

### Translations

- `packages/i18n/translations/en.json` - Add zones translations
- `packages/i18n/translations/fr.json` - Add zones translations

### Navigation

- Update settings layout to include Zones link
