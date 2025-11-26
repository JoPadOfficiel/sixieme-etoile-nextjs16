# Story 5.1: Implement Fleet Models & Fleet/Bases UI

**Epic:** 5 - Fleet & RSE Compliance Engine  
**Status:** ready-for-dev  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As a** fleet manager,  
**I want** to manage vehicles and operating bases in the system,  
**So that** pricing and dispatch always know where vehicles are anchored and what they can do.

---

## Related Functional Requirements

- **FR17**: The system shall model vehicles, drivers and garages/bases, with each vehicle linked to a default base.
- **FR25**: The system shall classify vehicles into at least LIGHT and HEAVY regulatory categories.
- **FR37-FR38**: Admin configuration for vehicle categories, cost parameters and mapped regulatory rules per licence type.

---

## Acceptance Criteria

### AC1: Vehicles List Page

**Given** the Vehicles screen `/dashboard/vehicles`  
**When** I open it  
**Then** I see a table with at least: Vehicle (make/model), Licence Plate, Category (LIGHT/HEAVY, commercial class), Status, Base, Seats, Luggage capacity, Mileage, Tags (UX spec 8.5)

### AC2: Add/Edit Vehicle

**Given** I click `Add Vehicle`  
**When** the drawer opens  
**Then** I can set vehicle category, base, registration, capacity (passengers/luggage), consumption, average speed, cost per km and required licence category, and saving persists a `Vehicle` linked to a `VehicleCategory` and `OperatingBase`

### AC3: Operating Bases Page

**Given** the Bases screen `/dashboard/fleet/bases`  
**When** I open it  
**Then** I see a map with base markers and a list of bases (name, address, type, linked vehicles count) as in UX spec 8.7, and I can add/edit bases with geocoded lat/lng

### AC4: Multi-Tenancy

**Given** all fleet entities  
**When** created or queried  
**Then** they are scoped by `organizationId` (multi-tenancy enforced)

---

## Technical Tasks

### Backend (packages/api)

1. **Create Vehicle Categories API** (`packages/api/src/routes/vtc/vehicle-categories.ts`)

   - GET `/vtc/vehicle-categories` - List categories with pagination
   - GET `/vtc/vehicle-categories/:id` - Get single category
   - POST `/vtc/vehicle-categories` - Create category
   - PATCH `/vtc/vehicle-categories/:id` - Update category
   - DELETE `/vtc/vehicle-categories/:id` - Delete category

2. **Create Operating Bases API** (`packages/api/src/routes/vtc/bases.ts`)

   - GET `/vtc/bases` - List bases with vehicle counts
   - GET `/vtc/bases/:id` - Get single base with vehicles
   - POST `/vtc/bases` - Create base
   - PATCH `/vtc/bases/:id` - Update base
   - DELETE `/vtc/bases/:id` - Delete base (if no vehicles linked)

3. **Create Vehicles API** (`packages/api/src/routes/vtc/vehicles.ts`)

   - GET `/vtc/vehicles` - List vehicles with filters (status, category, base)
   - GET `/vtc/vehicles/:id` - Get single vehicle
   - POST `/vtc/vehicles` - Create vehicle
   - PATCH `/vtc/vehicles/:id` - Update vehicle
   - DELETE `/vtc/vehicles/:id` - Delete vehicle

4. **Register routes in VTC router** (`packages/api/src/routes/vtc/index.ts`)

### Frontend (apps/web)

5. **Create Fleet Types** (`apps/web/modules/saas/fleet/types.ts`)

   - VehicleCategory, Vehicle, OperatingBase interfaces
   - Response types with pagination meta

6. **Create Vehicles Page** (`apps/web/app/dashboard/vehicles/page.tsx`)

   - VehiclesTable component with search, filters, pagination
   - Status badges (Active/Maintenance/Out of Service)
   - Category badges (LIGHT/HEAVY)

7. **Create Vehicle Form Drawer** (`apps/web/modules/saas/fleet/components/VehicleDrawer.tsx`)

   - Form with all vehicle fields
   - Category and Base selectors
   - Create/Update mutations

8. **Create Bases Page** (`apps/web/app/dashboard/fleet/bases/page.tsx`)

   - Map component with base markers
   - BasesTable with vehicle counts
   - BaseDrawer for add/edit

9. **Add Translations** (`apps/web/messages/en.json`, `apps/web/messages/fr.json`)
   - Fleet module translations

### Testing

10. **API Tests** (`packages/api/src/routes/vtc/__tests__/`)
    - vehicles.test.ts
    - bases.test.ts
    - vehicle-categories.test.ts

---

## Data Models (Already in Prisma)

```prisma
model VehicleCategory {
  id                 String       @id @default(cuid())
  organizationId     String
  name               String
  code               String
  regulatoryCategory VehicleRegulatoryCategory @default(LIGHT)
  maxPassengers      Int
  maxLuggageVolume   Int?
  priceMultiplier    Decimal      @default(1.0)
  // ... relations
}

model OperatingBase {
  id             String       @id @default(cuid())
  organizationId String
  name           String
  addressLine1   String
  city           String
  postalCode     String
  latitude       Decimal
  longitude      Decimal
  isActive       Boolean      @default(true)
  // ... relations
}

model Vehicle {
  id                   String          @id @default(cuid())
  organizationId       String
  vehicleCategoryId    String
  operatingBaseId      String
  registrationNumber   String
  passengerCapacity    Int
  luggageCapacity      Int?
  consumptionLPer100Km Decimal?
  averageSpeedKmh      Int?
  costPerKm            Decimal?
  status               VehicleStatus   @default(ACTIVE)
  // ... relations
}
```

---

## UI Components

### Vehicles Page Layout

- Header: Title "Vehicles", Add Vehicle button
- Filters: Status tabs, Category dropdown, Base dropdown, Search
- Table: Sortable columns, row click to edit
- Pagination: Page info, prev/next buttons

### Bases Page Layout

- Header: Title "Operating Bases", Add Base button
- Map: Google Maps with base markers (top section)
- Table: Name, Address, City, Vehicles count, Actions (bottom section)

---

## Dependencies

- Stories 1.1-1.2 (data model + multi-tenancy) ✅ Done
- Story 3.1 (zones map integration) - Optional for map component

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-1-implement-fleet-models-fleet-bases-ui.context.xml

### Implementation Notes

- Follow contacts.ts pattern for API routes
- Use ContactsTable pattern for data tables
- Use ContactDrawer pattern for form drawers
- Ensure all routes use organizationMiddleware
