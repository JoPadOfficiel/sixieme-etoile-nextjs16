# Story 5.2: Implement Drivers, Licence Categories & RSE Rules

**Epic:** 5 - Fleet & RSE Compliance Engine  
**Status:** done  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As a** HR/compliance manager,  
**I want** to manage drivers, their licences and RSE rules per licence category,  
**So that** heavy-vehicle constraints can be enforced correctly.

---

## Related Functional Requirements

- **FR25**: The system shall classify vehicles into at least LIGHT and HEAVY regulatory categories and apply heavy-vehicle rules where required.
- **FR26**: Regulatory constraints such as maximum daily driving time, maximum work amplitude and mandatory breaks shall be stored in configuration by license type, not hard-coded.
- **FR29**: The system shall support drivers with multiple licenses and ensure that assigned drivers hold the required license for the selected vehicle.
- **FR38**: Admins shall be able to configure vehicle categories, cost parameters and mapped regulatory rules per licence type.
- **FR47-FR49**: Heavy-vehicle compliance validator, alternative staffing options, RSE counters per regime.

---

## Acceptance Criteria

### AC1: Drivers List Page

**Given** the Drivers screen `/app/[organizationSlug]/drivers`  
**When** I open the screen  
**Then** I see a table or cards with Name, Licence Categories, Primary Base, Availability, Daily amplitude used, Driving time used and key compliance indicators (UX spec 8.6)

### AC2: Add/Edit Driver with Licenses

**Given** I add or edit a driver  
**When** the drawer opens  
**Then** I can set personal details (firstName, lastName, email, phone), hourly cost, employment status, and attach one or more DriverLicense entries (licence category, licence number, validity dates)

### AC3: Settings Fleet - Regulatory Rules

**Given** the Settings Fleet page `/app/[organizationSlug]/settings/fleet`  
**When** I edit regulatory rules for a licence type  
**Then** I can set max daily driving hours, max amplitude, break rules (minutes per driving block, driving block hours for break) and capped average speed, which are stored in OrganizationLicenseRule per FR26

### AC4: Multi-Tenancy

**Given** all driver and license entities  
**When** created or queried  
**Then** they are scoped by `organizationId` (multi-tenancy enforced)

### Acceptance Criteria Status

- [x] **AC1** Drivers list implemented with search, filters, license badges and compliance indicators.
- [x] **AC2** Driver drawer allows full CRUD on driver information and licenses.
- [x] **AC3** Settings Fleet page includes license categories + RSE rules tabs with forms/dialogs.
- [x] **AC4** Multi-tenancy enforced in all APIs and queries (org middleware + filters).

---

## Technical Tasks

### Backend (packages/api)

1. [x] **Create License Categories API** (`packages/api/src/routes/vtc/license-categories.ts`)

   - GET `/vtc/license-categories` - List categories with pagination
   - GET `/vtc/license-categories/:id` - Get single category
   - POST `/vtc/license-categories` - Create category (code, name, description)
   - PATCH `/vtc/license-categories/:id` - Update category
   - DELETE `/vtc/license-categories/:id` - Delete category (if no drivers/rules linked)

2. [x] **Create Organization License Rules API** (`packages/api/src/routes/vtc/license-rules.ts`)

   - GET `/vtc/license-rules` - List RSE rules with license category info
   - GET `/vtc/license-rules/:id` - Get single rule
   - POST `/vtc/license-rules` - Create RSE rule for a license category
   - PATCH `/vtc/license-rules/:id` - Update RSE rule thresholds
   - DELETE `/vtc/license-rules/:id` - Delete rule

3. [x] **Create Drivers API** (`packages/api/src/routes/vtc/drivers.ts`)

   - GET `/vtc/drivers` - List drivers with licenses, filters (isActive, licenseCategoryId)
   - GET `/vtc/drivers/:id` - Get single driver with licenses
   - POST `/vtc/drivers` - Create driver
   - PATCH `/vtc/drivers/:id` - Update driver
   - DELETE `/vtc/drivers/:id` - Delete driver (if no active assignments)
   - POST `/vtc/drivers/:id/licenses` - Add license to driver
   - PATCH `/vtc/drivers/:id/licenses/:licenseId` - Update license
   - DELETE `/vtc/drivers/:id/licenses/:licenseId` - Remove license from driver

4. [x] **Register routes in VTC router** (`packages/api/src/routes/vtc/router.ts`)
   - Import and register licenseCategoriesRouter, licenseRulesRouter, driversRouter

### Frontend (apps/web)

5. [x] **Create Driver Types** (`apps/web/modules/saas/fleet/types.ts`)

   - LicenseCategory, OrganizationLicenseRule, Driver, DriverLicense interfaces
   - Response types with pagination meta

6. [x] **Create Drivers Page** (`apps/web/app/(saas)/app/(organizations)/[organizationSlug]/drivers/page.tsx`)

   - DriversTable component with search, filters (active/inactive, license category)
   - Summary cards: Total drivers, Available, On Mission, Active today
   - Compliance indicators using Lucide icons

7. [x] **Create Driver Form Drawer** (`apps/web/modules/saas/fleet/components/DriverDrawer.tsx`)

   - Personal info section (firstName, lastName, email, phone)
   - Employment section (status, hourly cost)
   - Licenses section with add/remove capability
   - License form: category selector, license number, validFrom, validTo

8. [x] **Create Settings Fleet Page** (`apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/page.tsx`)

   - License Categories section with table and add/edit dialog
   - Regulatory Rules section with table showing RSE thresholds per license type
   - Rule form: maxDailyDrivingHours, maxDailyAmplitudeHours, breakMinutesPerDrivingBlock, drivingBlockHoursForBreak, cappedAverageSpeedKmh

9. [x] **Add Sidebar Navigation** - Add "Drivers" entry in sidebar (below Operating Bases per UX)

10. [x] **Add Translations** (`packages/i18n/translations/en.json`, `packages/i18n/translations/fr.json`)
    - Drivers module translations
    - License categories translations
    - RSE rules translations

### Testing

11. [x] **API Tests** (`packages/api/src/routes/vtc/__tests__/`)
    - drivers.test.ts
    - license-categories.test.ts
    - license-rules.test.ts

---

## Data Models (Already in Prisma)

```prisma
model LicenseCategory {
  id             String       @id @default(cuid())
  organizationId String
  code           String       // e.g. "B", "D", "D_CMI"
  name           String
  description    String?

  organizationRules     OrganizationLicenseRule[]
  vehiclesRequiringThis Vehicle[]
  driverLicenses        DriverLicense[]

  @@unique([organizationId, code])
}

model OrganizationLicenseRule {
  id                String          @id @default(cuid())
  organizationId    String
  licenseCategoryId String

  // RSE constraints (zero-hardcoding)
  maxDailyDrivingHours        Decimal @db.Decimal(4, 2) // e.g. 10.00
  maxDailyAmplitudeHours      Decimal @db.Decimal(4, 2) // e.g. 14.00
  breakMinutesPerDrivingBlock Int     // e.g. 45
  drivingBlockHoursForBreak   Decimal @db.Decimal(4, 2) // e.g. 4.50
  cappedAverageSpeedKmh       Int?    // e.g. 85 for heavy vehicles

  @@unique([organizationId, licenseCategoryId])
}

model Driver {
  id             String       @id @default(cuid())
  organizationId String

  firstName        String
  lastName         String
  email            String?
  phone            String?
  employmentStatus DriverEmploymentStatus @default(EMPLOYEE)
  hourlyCost       Decimal?               @db.Decimal(10, 2)
  isActive         Boolean                @default(true)
  notes            String?

  driverLicenses DriverLicense[]
}

model DriverLicense {
  id                String          @id @default(cuid())
  driverId          String
  licenseCategoryId String

  licenseNumber String
  validFrom     DateTime
  validTo       DateTime?

  @@unique([driverId, licenseCategoryId])
}

enum DriverEmploymentStatus {
  EMPLOYEE
  CONTRACTOR
  FREELANCE
}
```

---

## UI Components

### Drivers Page Layout

- Header: Title "Drivers", Add Driver button
- Summary Cards: Total drivers, Available, On Mission, Active today
- Filters: Status tabs (Active/Inactive), License category dropdown, Search
- Table: Name, Licenses (badges), Status, Hourly Cost, Compliance indicators
- Row click opens DriverDrawer

### Driver Drawer Layout

- Header: "Add Driver" / "Edit Driver"
- Sections:
  - Personal Information (firstName, lastName, email, phone)
  - Employment (status dropdown, hourly cost input)
  - Licenses (list with add button, each license shows category, number, validity)
- Footer: Cancel, Save buttons

### Settings Fleet Page Layout

- Header: Title "Fleet & Regulatory Configuration"
- Tabs or Sections:
  - License Categories: Table (Code, Name, Description, Vehicles count, Drivers count, Actions)
  - Regulatory Rules: Table (License Category, Max Driving Hours, Max Amplitude, Break Rules, Speed Cap, Actions)

---

## Dependencies

- Story 5.1 (Fleet Models & Bases UI) ✅ Done
- Stories 1.1-1.2 (data model + multi-tenancy) ✅ Done

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-2-implement-drivers-licence-categories-rse-rules.context.xml

### Implementation Notes

- Follow vehicles.ts pattern for API routes
- Follow VehiclesTable pattern for DriversTable
- Follow VehicleDrawer pattern for DriverDrawer
- Ensure all routes use organizationMiddleware
- RSE rules must be configurable, never hardcoded
- Support multi-license drivers (FR29)
- Use Lucide icons for compliance indicators (ShieldCheck, AlertTriangle, XCircle)

### Test Strategy

- Vitest for API tests (drivers, license-categories, license-rules)
- Playwright MCP for UI flows (create driver, add license, configure RSE rules)
- Curl for API verification
- DB verification via postgres_vtc_sixiemme_etoile MCP

---

## Implementation Summary

**Status: ✅ DONE**  
**Completed: 2025-11-26**

### Backend Implementation

| File                                                | Description                                        |
| --------------------------------------------------- | -------------------------------------------------- |
| `packages/api/src/routes/vtc/license-categories.ts` | CRUD API for license categories with multi-tenancy |
| `packages/api/src/routes/vtc/license-rules.ts`      | CRUD API for RSE rules with category linkage       |
| `packages/api/src/routes/vtc/drivers.ts`            | CRUD API for drivers with license management       |
| `packages/api/src/routes/vtc/router.ts`             | Updated to register new routes                     |

### Frontend Implementation

| File                                                                                 | Description                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `apps/web/modules/saas/fleet/types.ts`                                               | Extended with Driver, License, Rule types            |
| `apps/web/modules/saas/fleet/components/DriversTable.tsx`                            | Drivers list with filters and pagination             |
| `apps/web/modules/saas/fleet/components/DriverForm.tsx`                              | Driver form with license management                  |
| `apps/web/modules/saas/fleet/components/DriverDrawer.tsx`                            | Drawer wrapper for driver form                       |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/drivers/page.tsx`        | Drivers page                                         |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/page.tsx` | Fleet settings with license categories and RSE rules |

### Translations

| File                                 | Description                                         |
| ------------------------------------ | --------------------------------------------------- |
| `packages/i18n/translations/en.json` | English translations for drivers and fleet settings |
| `packages/i18n/translations/fr.json` | French translations for drivers and fleet settings  |

### Tests

| File                                                               | Tests    |
| ------------------------------------------------------------------ | -------- |
| `packages/api/src/routes/vtc/__tests__/license-categories.test.ts` | 14 tests |
| `packages/api/src/routes/vtc/__tests__/license-rules.test.ts`      | 14 tests |
| `packages/api/src/routes/vtc/__tests__/drivers.test.ts`            | 18 tests |

**Total: 46 API tests passing**

### Acceptance Criteria Met

- [x] AC1: CRUD for LicenseCategory with multi-tenancy
- [x] AC2: CRUD for OrganizationLicenseRule with category linkage
- [x] AC3: CRUD for Driver with license management
- [x] AC4: DriversTable with filters and pagination
- [x] AC5: DriverDrawer with license management
- [x] AC6: Settings Fleet page with license categories and RSE rules
- [x] AC7: Translations (EN/FR)
- [x] AC8: Vitest API tests (46 tests passing)
