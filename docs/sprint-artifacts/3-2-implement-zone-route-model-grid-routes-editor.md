# Story 3.2: Implement ZoneRoute Model & Grid Routes Editor

Status: in-progress

## Story

**As an** admin,  
**I want** to define fixed zone-to-zone routes per vehicle category,  
**So that** partner transfers can be priced from contractual grids.

## Acceptance Criteria

### AC1: Routes List Page

- **Given** `/app/[orgSlug]/routes`
- **When** I open the page
- **Then** I see a table of existing routes with columns: From Zone, To Zone, Vehicle Category, Direction (Bidirectional/A→B/B→A), Fixed Price (EUR), Status, Actions (Edit/Delete)

### AC2: Add Route Form

- **Given** I click "Add Route"
- **When** the form/drawer opens
- **Then** I can select: From Zone (dropdown), To Zone (dropdown), Vehicle Category (dropdown), Direction (dropdown), Fixed Price (EUR input), and toggle Active status

### AC3: Create Route

- **Given** I fill the route form and submit
- **When** the route is created
- **Then** a ZoneRoute record is persisted with organizationId, and the route appears in the table

### AC4: Edit Route

- **Given** an existing route
- **When** I edit and save changes
- **Then** the route is updated in the database and the table reflects the changes

### AC5: Delete Route

- **Given** an existing route
- **When** I delete the route
- **Then** the route is removed from the database

### AC6: Filter Routes

- **Given** the routes table
- **When** I filter by From Zone, To Zone, Vehicle Category, or Status
- **Then** the table shows only matching routes

### AC7: Routes API

- **Given** the routes API
- **When** I call GET /api/vtc/pricing/routes
- **Then** I receive a paginated list of routes for the current organization with zone and category details

## Technical Tasks

### Task 1: API Routes

- [ ] Create `/api/vtc/pricing/routes` route file
- [ ] Implement GET (list with pagination and filters)
- [ ] Implement GET /:id (single route with relations)
- [ ] Implement POST (create route)
- [ ] Implement PATCH /:id (update route)
- [ ] Implement DELETE /:id (delete route)
- [ ] Add to router

### Task 2: Frontend - Routes List

- [ ] Create `/app/[orgSlug]/routes/page.tsx`
- [ ] Create `RoutesTable` component with filters
- [ ] Create `RouteDrawer` component for add/edit
- [ ] Create `RouteForm` component
- [ ] Add navigation link in NavBar

### Task 3: Translations

- [ ] Add route-related translations (EN/FR)

### Task 4: Tests

- [ ] Vitest: API tests for routes CRUD
- [ ] Playwright MCP: UI tests for routes management
- [ ] curl + DB verification

## Data Model (Already in Schema)

### ZoneRoute

```prisma
model ZoneRoute {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Route definition
  fromZoneId        String
  fromZone          PricingZone     @relation("FromZone", fields: [fromZoneId], references: [id])
  toZoneId          String
  toZone            PricingZone     @relation("ToZone", fields: [toZoneId], references: [id])
  vehicleCategoryId String
  vehicleCategory   VehicleCategory @relation(fields: [vehicleCategoryId], references: [id])

  // Pricing
  direction  RouteDirection @default(BIDIRECTIONAL)
  fixedPrice Decimal        @db.Decimal(10, 2) // EUR

  // Status
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  partnerContractZoneRoutes PartnerContractZoneRoute[]

  @@index([organizationId])
  @@index([fromZoneId, toZoneId])
  @@index([vehicleCategoryId])
  @@map("zone_route")
}

enum RouteDirection {
  BIDIRECTIONAL
  A_TO_B
  B_TO_A
}
```

## API Contract

### GET /api/vtc/pricing/routes

Query params: `page`, `limit`, `fromZoneId`, `toZoneId`, `vehicleCategoryId`, `direction`, `isActive`

Response:

```json
{
  "data": [
    {
      "id": "cuid",
      "fromZone": {
        "id": "zone1",
        "name": "Paris Intra-Muros",
        "code": "PARIS_0"
      },
      "toZone": {
        "id": "zone2",
        "name": "CDG Airport",
        "code": "CDG"
      },
      "vehicleCategory": {
        "id": "cat1",
        "name": "Berline",
        "code": "BERLINE"
      },
      "direction": "BIDIRECTIONAL",
      "fixedPrice": "85.00",
      "isActive": true,
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

### POST /api/vtc/pricing/routes

Request:

```json
{
  "fromZoneId": "zone1",
  "toZoneId": "zone2",
  "vehicleCategoryId": "cat1",
  "direction": "BIDIRECTIONAL",
  "fixedPrice": 85.0,
  "isActive": true
}
```

### PATCH /api/vtc/pricing/routes/:id

Request: Partial update of route fields

### DELETE /api/vtc/pricing/routes/:id

Response:

```json
{ "success": true }
```

## UI Components

### RoutesTable

Columns:

- From Zone (name + code badge)
- To Zone (name + code badge)
- Vehicle Category (name)
- Direction (icon + label: ↔ Bidirectional, → A to B, ← B to A)
- Fixed Price (EUR formatted)
- Status (Active/Inactive badge)
- Actions (Edit, Delete)

Filters:

- From Zone (select)
- To Zone (select)
- Vehicle Category (select)
- Status (Active/Inactive/All)

### RouteForm

Fields:

- From Zone (required, select from PricingZones)
- To Zone (required, select from PricingZones)
- Vehicle Category (required, select from VehicleCategories)
- Direction (required, select: Bidirectional, A→B, B→A)
- Fixed Price EUR (required, number input)
- Active (switch)

## Sample Routes for Testing

| From Zone         | To Zone          | Category | Direction     | Price EUR |
| ----------------- | ---------------- | -------- | ------------- | --------- |
| Paris Intra-Muros | CDG Airport      | Berline  | Bidirectional | 85.00     |
| Paris Intra-Muros | CDG Airport      | Van      | Bidirectional | 120.00    |
| Paris Intra-Muros | Orly Airport     | Berline  | Bidirectional | 65.00     |
| CDG Airport       | Disneyland Paris | Berline  | Bidirectional | 95.00     |
| Paris Intra-Muros | Versailles       | Berline  | A→B           | 75.00     |
| Petite Couronne   | CDG Airport      | Berline  | Bidirectional | 70.00     |

## Dev Notes

- Routes are scoped by organizationId (multi-tenancy)
- Direction affects pricing logic: BIDIRECTIONAL applies both ways, A_TO_B/B_TO_A are one-way
- Price is stored in EUR (Decimal 10,2)
- Index on (fromZoneId, toZoneId) for efficient route lookups
- Routes can be assigned to partner contracts via PartnerContractZoneRoute junction table

## Testing Strategy

### Vitest (Unit/Integration)

- Test routes CRUD API endpoints
- Test filters (fromZoneId, toZoneId, vehicleCategoryId, direction, isActive)
- Test pagination
- Test multi-tenancy isolation
- Test validation (required fields, valid zone/category IDs)

### Playwright MCP (E2E/UI)

- Test routes list page loads
- Test add route flow
- Test edit route flow
- Test delete route
- Test filters work correctly

### curl + DB Verification

- Create route via API, verify in DB
- Update route, verify changes
- Delete route, verify removal
- Test pagination and filtering

## Dependencies

- Story 3.1: Implement PricingZone Model & Zones Editor UI ✅ Done
- Story 1.1: Define VTC ERP Prisma Models (VehicleCategory) ✅ Done
- Story 1.2: Enforce Organization-Level Multi-Tenancy ✅ Done

## Files to Create/Modify

### API

- `packages/api/src/routes/vtc/zone-routes.ts` - New route file
- `packages/api/src/routes/vtc/router.ts` - Add routes
- `packages/api/src/routes/vtc/__tests__/zone-routes.test.ts` - Tests

### Frontend

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/routes/page.tsx`
- `apps/web/modules/saas/pricing/components/RoutesTable.tsx`
- `apps/web/modules/saas/pricing/components/RouteDrawer.tsx`
- `apps/web/modules/saas/pricing/components/RouteForm.tsx`
- `apps/web/modules/saas/pricing/components/index.ts` - Add exports
- `apps/web/modules/saas/pricing/types.ts` - Add ZoneRoute type

### Navigation

- `apps/web/modules/saas/shared/components/NavBar.tsx` - Add Routes link

### Translations

- `packages/i18n/translations/en.json` - Add routes translations
- `packages/i18n/translations/fr.json` - Add routes translations
