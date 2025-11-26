# Story 3.3: Implement Excursion & Dispo Forfait Configuration

Status: done

## Story

**As an** admin,  
**I want** to configure excursion and "mise à disposition" forfaits by vehicle category,  
**So that** partners can buy standardised packages for common programmes.

## Acceptance Criteria

### AC1: Excursions List Page

- **Given** `/app/[orgSlug]/settings/pricing` (Excursions tab)
- **When** I open the page
- **Then** I see a table of existing excursion packages with columns: Name, Origin Zone, Destination Zone, Vehicle Category, Included Duration, Included Distance, Price (EUR), Status, Actions (Edit/Delete)

### AC2: Add Excursion Form

- **Given** I click "Add Excursion"
- **When** the form/drawer opens
- **Then** I can set: Name, Description, Origin Zone (optional), Destination Zone (optional), Vehicle Category, Included Duration (hours), Included Distance (km), Price (EUR), and toggle Active status

### AC3: Create Excursion

- **Given** I fill the excursion form and submit
- **When** the excursion is created
- **Then** an ExcursionPackage record is persisted with organizationId, and the package appears in the table

### AC4: Dispos List Page

- **Given** `/app/[orgSlug]/settings/pricing` (Dispos tab)
- **When** I open the page
- **Then** I see a table of existing dispo packages with columns: Name, Vehicle Category, Included Duration, Included Distance, Base Price (EUR), Overage Rate/km, Overage Rate/hour, Status, Actions (Edit/Delete)

### AC5: Add Dispo Form

- **Given** I click "Add Dispo"
- **When** the form/drawer opens
- **Then** I can set: Name, Description, Vehicle Category, Included Duration (hours), Included Distance (km), Base Price (EUR), Overage Rate per km, Overage Rate per hour, and toggle Active status

### AC6: Create Dispo

- **Given** I fill the dispo form and submit
- **When** the dispo is created
- **Then** a DispoPackage record is persisted with organizationId, and the package appears in the table

### AC7: Edit Package

- **Given** an existing excursion or dispo package
- **When** I edit and save changes
- **Then** the package is updated in the database and the table reflects the changes

### AC8: Delete Package

- **Given** an existing excursion or dispo package
- **When** I delete the package
- **Then** the package is removed from the database (unless assigned to partner contracts)

## Technical Tasks

### Task 1: API Routes - Excursions

- [x] Create `/api/vtc/pricing/excursions` route file
- [x] Implement GET (list with pagination and filters)
- [x] Implement GET /:id (single excursion with relations)
- [x] Implement POST (create excursion)
- [x] Implement PATCH /:id (update excursion)
- [x] Implement DELETE /:id (delete excursion)
- [x] Add to router

### Task 2: API Routes - Dispos

- [x] Create `/api/vtc/pricing/dispos` route file
- [x] Implement GET (list with pagination and filters)
- [x] Implement GET /:id (single dispo with relations)
- [x] Implement POST (create dispo)
- [x] Implement PATCH /:id (update dispo)
- [x] Implement DELETE /:id (delete dispo)
- [x] Add to router

### Task 3: Frontend - Pricing Settings Page

- [ ] Create `/app/[orgSlug]/settings/pricing/page.tsx` with tabs
- [x] Create `ExcursionsTable` component with filters
- [x] Create `ExcursionDrawer` component for add/edit
- [x] Create `ExcursionForm` component
- [x] Create `DisposTable` component with filters
- [x] Create `DispoDrawer` component for add/edit
- [x] Create `DispoForm` component
- [ ] Add navigation link in Settings sidebar

### Task 4: Translations

- [x] Add excursion-related translations (EN/FR)
- [x] Add dispo-related translations (EN/FR)

### Task 5: Tests

- [x] Vitest: API tests for excursions CRUD
- [x] Vitest: API tests for dispos CRUD
- [ ] Playwright MCP: UI tests for excursions management
- [ ] Playwright MCP: UI tests for dispos management
- [ ] curl + DB verification

## Data Model (Already in Schema)

### ExcursionPackage

```prisma
model ExcursionPackage {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Package details
  name        String
  description String?

  // Zones
  originZoneId      String?
  originZone        PricingZone? @relation("ExcursionOrigin", fields: [originZoneId], references: [id])
  destinationZoneId String?
  destinationZone   PricingZone? @relation("ExcursionDestination", fields: [destinationZoneId], references: [id])

  // Vehicle category
  vehicleCategoryId String
  vehicleCategory   VehicleCategory @relation(fields: [vehicleCategoryId], references: [id])

  // Included service
  includedDurationHours Decimal @db.Decimal(5, 2)
  includedDistanceKm    Decimal @db.Decimal(8, 2)

  // Pricing
  price Decimal @db.Decimal(10, 2) // EUR

  // Status
  isActive                         Boolean                           @default(true)
  createdAt                        DateTime                          @default(now())
  updatedAt                        DateTime                          @updatedAt
  partnerContractExcursionPackages PartnerContractExcursionPackage[]

  @@index([organizationId])
  @@index([vehicleCategoryId])
  @@map("excursion_package")
}
```

### DispoPackage

```prisma
model DispoPackage {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Package details
  name        String
  description String?

  // Vehicle category
  vehicleCategoryId String
  vehicleCategory   VehicleCategory @relation(fields: [vehicleCategoryId], references: [id])

  // Included service
  includedDurationHours Decimal @db.Decimal(5, 2)
  includedDistanceKm    Decimal @db.Decimal(8, 2)

  // Pricing
  basePrice          Decimal @db.Decimal(10, 2) // EUR
  overageRatePerKm   Decimal @db.Decimal(10, 4) // EUR per km
  overageRatePerHour Decimal @db.Decimal(10, 2) // EUR per hour

  // Status
  isActive                     Boolean                       @default(true)
  createdAt                    DateTime                      @default(now())
  updatedAt                    DateTime                      @updatedAt
  partnerContractDispoPackages PartnerContractDispoPackage[]

  @@index([organizationId])
  @@index([vehicleCategoryId])
  @@map("dispo_package")
}
```

## API Contract

### GET /api/vtc/pricing/excursions

Query params: `page`, `limit`, `search`, `originZoneId`, `destinationZoneId`, `vehicleCategoryId`, `isActive`

Response:

```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Normandy D-Day Beaches",
      "description": "Full day excursion to Normandy beaches",
      "originZone": {
        "id": "zone1",
        "name": "Paris Intra-Muros",
        "code": "PARIS_0"
      },
      "destinationZone": null,
      "vehicleCategory": {
        "id": "cat1",
        "name": "Berline",
        "code": "BERLINE"
      },
      "includedDurationHours": 12.0,
      "includedDistanceKm": 600.0,
      "price": 850.0,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

### POST /api/vtc/pricing/excursions

Request:

```json
{
  "name": "Normandy D-Day Beaches",
  "description": "Full day excursion to Normandy beaches",
  "originZoneId": "zone1",
  "destinationZoneId": null,
  "vehicleCategoryId": "cat1",
  "includedDurationHours": 12.0,
  "includedDistanceKm": 600.0,
  "price": 850.0,
  "isActive": true
}
```

### GET /api/vtc/pricing/dispos

Query params: `page`, `limit`, `search`, `vehicleCategoryId`, `isActive`

Response:

```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Half Day Dispo",
      "description": "4 hours at disposal",
      "vehicleCategory": {
        "id": "cat1",
        "name": "Berline",
        "code": "BERLINE"
      },
      "includedDurationHours": 4.0,
      "includedDistanceKm": 80.0,
      "basePrice": 320.0,
      "overageRatePerKm": 2.5,
      "overageRatePerHour": 65.0,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

### POST /api/vtc/pricing/dispos

Request:

```json
{
  "name": "Half Day Dispo",
  "description": "4 hours at disposal",
  "vehicleCategoryId": "cat1",
  "includedDurationHours": 4.0,
  "includedDistanceKm": 80.0,
  "basePrice": 320.0,
  "overageRatePerKm": 2.5,
  "overageRatePerHour": 65.0,
  "isActive": true
}
```

## UI Components

### ExcursionsTable

Columns:

- Name
- Origin Zone (name or "Any")
- Destination Zone (name or "Any")
- Vehicle Category
- Included Duration (hours)
- Included Distance (km)
- Price (EUR formatted)
- Status (Active/Inactive badge)
- Actions (Edit, Delete)

Filters:

- Search (name, description)
- Origin Zone (select)
- Destination Zone (select)
- Vehicle Category (select)
- Status (Active/Inactive/All)

### ExcursionForm

Fields:

- Name (required, text)
- Description (optional, textarea)
- Origin Zone (optional, select from PricingZones)
- Destination Zone (optional, select from PricingZones)
- Vehicle Category (required, select from VehicleCategories)
- Included Duration Hours (required, number)
- Included Distance Km (required, number)
- Price EUR (required, number)
- Active (switch)

### DisposTable

Columns:

- Name
- Vehicle Category
- Included Duration (hours)
- Included Distance (km)
- Base Price (EUR formatted)
- Overage Rate/km (EUR formatted)
- Overage Rate/hour (EUR formatted)
- Status (Active/Inactive badge)
- Actions (Edit, Delete)

Filters:

- Search (name, description)
- Vehicle Category (select)
- Status (Active/Inactive/All)

### DispoForm

Fields:

- Name (required, text)
- Description (optional, textarea)
- Vehicle Category (required, select from VehicleCategories)
- Included Duration Hours (required, number)
- Included Distance Km (required, number)
- Base Price EUR (required, number)
- Overage Rate per km EUR (required, number)
- Overage Rate per hour EUR (required, number)
- Active (switch)

## Sample Data for Testing

### Excursions

| Name                    | Origin Zone       | Destination | Category | Duration | Distance | Price EUR |
| ----------------------- | ----------------- | ----------- | -------- | -------- | -------- | --------- |
| Normandy D-Day Beaches  | Paris Intra-Muros | -           | Berline  | 12h      | 600 km   | 850.00    |
| Loire Valley Châteaux   | Paris Intra-Muros | -           | Berline  | 10h      | 400 km   | 720.00    |
| Champagne Wine Tour     | Paris Intra-Muros | -           | Van      | 8h       | 300 km   | 890.00    |
| Giverny & Monet Gardens | Paris Intra-Muros | -           | Berline  | 5h       | 160 km   | 380.00    |
| Versailles Palace       | Paris Intra-Muros | Versailles  | Berline  | 6h       | 80 km    | 420.00    |
| Mont-Saint-Michel       | Paris Intra-Muros | -           | Van      | 14h      | 700 km   | 1200.00   |

### Dispos

| Name           | Category | Duration | Distance | Base Price | Overage/km | Overage/hour |
| -------------- | -------- | -------- | -------- | ---------- | ---------- | ------------ |
| Half Day Dispo | Berline  | 4h       | 80 km    | 320.00     | 2.50       | 65.00        |
| Full Day Dispo | Berline  | 8h       | 150 km   | 580.00     | 2.50       | 65.00        |
| Event Dispo    | Van      | 6h       | 100 km   | 520.00     | 3.00       | 75.00        |
| Wedding Dispo  | Berline  | 10h      | 200 km   | 750.00     | 2.50       | 65.00        |

## Dev Notes

- Excursions and Dispos are scoped by organizationId (multi-tenancy)
- Excursions can have optional origin/destination zones (for flexibility)
- Dispos have overage rates for km and hours beyond included amounts
- Prices are stored in EUR (Decimal 10,2)
- Packages can be assigned to partner contracts via junction tables
- Index on vehicleCategoryId for efficient lookups

## Testing Strategy

### Vitest (Unit/Integration)

- Test excursions CRUD API endpoints
- Test dispos CRUD API endpoints
- Test filters (zone, category, status)
- Test pagination
- Test multi-tenancy isolation
- Test validation (required fields, positive values)
- Test deletion protection when assigned to contracts

### Playwright MCP (E2E/UI)

- Test pricing settings page loads with tabs
- Test add excursion flow
- Test edit excursion flow
- Test delete excursion
- Test add dispo flow
- Test edit dispo flow
- Test delete dispo
- Test filters work correctly

### curl + DB Verification

- Create excursion via API, verify in DB
- Create dispo via API, verify in DB
- Update packages, verify changes
- Delete packages, verify removal
- Test pagination and filtering

## Dependencies

- Story 3.1: Implement PricingZone Model & Zones Editor UI ✅ Done
- Story 3.2: Implement ZoneRoute Model & Grid Routes Editor ✅ Done
- Story 2.2: Store Partner Contract Data & Rate Grid Links ✅ Done
- Story 1.1: Define VTC ERP Prisma Models ✅ Done
- Story 1.2: Enforce Organization-Level Multi-Tenancy ✅ Done

## Files to Create/Modify

### API

- `packages/api/src/routes/vtc/excursions.ts` - New route file
- `packages/api/src/routes/vtc/dispos.ts` - New route file
- `packages/api/src/routes/vtc/router.ts` - Add routes
- `packages/api/src/routes/vtc/__tests__/excursions.test.ts` - Tests
- `packages/api/src/routes/vtc/__tests__/dispos.test.ts` - Tests

### Frontend

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/page.tsx`
- `apps/web/modules/saas/pricing/components/ExcursionsTable.tsx`
- `apps/web/modules/saas/pricing/components/ExcursionDrawer.tsx`
- `apps/web/modules/saas/pricing/components/ExcursionForm.tsx`
- `apps/web/modules/saas/pricing/components/DisposTable.tsx`
- `apps/web/modules/saas/pricing/components/DispoDrawer.tsx`
- `apps/web/modules/saas/pricing/components/DispoForm.tsx`
- `apps/web/modules/saas/pricing/components/index.ts` - Add exports
- `apps/web/modules/saas/pricing/types.ts` - Add ExcursionPackage and DispoPackage types

### Navigation

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/layout.tsx` - Add Pricing link

### Translations

- `packages/i18n/translations/en.json` - Add excursions and dispos translations
- `packages/i18n/translations/fr.json` - Add excursions and dispos translations
