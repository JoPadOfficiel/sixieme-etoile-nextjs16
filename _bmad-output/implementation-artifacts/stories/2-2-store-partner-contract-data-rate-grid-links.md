# Story 2.2: Store Partner Contract Data & Rate Grid Links

Status: done

## Story

**As a** commercial manager,  
**I want** to attach contract details and rate grids to partner contacts,  
**So that** the pricing engine can apply contractual prices automatically for Method 1.

## Acceptance Criteria

### AC1: Commercial Settings Section for Partners

- **Given** a Partner contact in the CRM (isPartner=true)
- **When** I open its detail view
- **Then** I see a "Commercial Settings" section with:
  - Billing address (optional, if different from contact)
  - Payment terms dropdown (e.g., "Immediate", "15 days", "30 days", "45 days", "60 days")
  - Commission percentage input (0-100%)
  - Assigned zone routes (multi-select from organization's ZoneRoutes)
  - Assigned excursion packages (multi-select from organization's ExcursionPackages)
  - Assigned dispo packages (multi-select from organization's DispoPackages)

### AC2: Hidden for Non-Partners

- **Given** a Private contact (isPartner=false)
- **When** I open its detail view
- **Then** I do NOT see the "Commercial Settings" section

### AC3: Data Persistence

- **Given** I save the commercial settings for a partner
- **When** I reload the page
- **Then** all data is persisted and displayed correctly

### AC4: API Accessibility for Pricing Engine

- **Given** a PartnerContract with assigned grids
- **When** the API endpoint `/api/vtc/contacts/:id/contract` is called
- **Then** it returns the contract data including grid IDs for Method 1 pricing

### AC5: Multi-tenancy Enforcement

- **Given** a PartnerContract
- **When** accessed via API
- **Then** only contracts belonging to the user's organization are accessible

## Technical Tasks

### Task 1: Database Schema

- [ ] Create `PartnerContract` model in Prisma schema
- [ ] Create junction tables for grid assignments:
  - `PartnerContractZoneRoute`
  - `PartnerContractExcursionPackage`
  - `PartnerContractDispoPackage`
- [ ] Run `prisma migrate dev` to apply changes
- [ ] Run `prisma generate` to update client

### Task 2: API Endpoints

- [ ] `GET /api/vtc/contacts/:contactId/contract` - Get partner contract
- [ ] `PUT /api/vtc/contacts/:contactId/contract` - Create/update partner contract
- [ ] `DELETE /api/vtc/contacts/:contactId/contract` - Delete partner contract
- [ ] Add validation: contact must have isPartner=true
- [ ] Enforce organizationId scoping

### Task 3: Frontend Components

- [ ] Create `PartnerContractForm` component
- [ ] Create `GridAssignmentSelect` component (reusable multi-select for grids)
- [ ] Integrate into ContactDrawer/ContactDetail (conditional on isPartner)
- [ ] Add loading states and error handling

### Task 4: Tests

- [ ] Vitest: API endpoint tests (CRUD, validation, multi-tenancy)
- [ ] Playwright: UI tests for commercial settings section
- [ ] curl + DB verification: End-to-end API tests

## Data Model

```prisma
model PartnerContract {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Link to Contact (1:1)
  contactId String  @unique
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // Billing (optional override)
  billingAddress String?

  // Payment terms
  paymentTerms PaymentTerms @default(DAYS_30)

  // Commission
  commissionPercent Decimal @default(0) @db.Decimal(5, 2) // 0.00 to 100.00

  // Metadata
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Grid assignments (many-to-many)
  zoneRoutes        PartnerContractZoneRoute[]
  excursionPackages PartnerContractExcursionPackage[]
  dispoPackages     PartnerContractDispoPackage[]

  @@index([organizationId])
  @@index([contactId])
  @@map("partner_contract")
}

enum PaymentTerms {
  IMMEDIATE
  DAYS_15
  DAYS_30
  DAYS_45
  DAYS_60
}

model PartnerContractZoneRoute {
  id                String          @id @default(cuid())
  partnerContractId String
  partnerContract   PartnerContract @relation(fields: [partnerContractId], references: [id], onDelete: Cascade)
  zoneRouteId       String
  zoneRoute         ZoneRoute       @relation(fields: [zoneRouteId], references: [id], onDelete: Cascade)

  @@unique([partnerContractId, zoneRouteId])
  @@map("partner_contract_zone_route")
}

model PartnerContractExcursionPackage {
  id                  String           @id @default(cuid())
  partnerContractId   String
  partnerContract     PartnerContract  @relation(fields: [partnerContractId], references: [id], onDelete: Cascade)
  excursionPackageId  String
  excursionPackage    ExcursionPackage @relation(fields: [excursionPackageId], references: [id], onDelete: Cascade)

  @@unique([partnerContractId, excursionPackageId])
  @@map("partner_contract_excursion_package")
}

model PartnerContractDispoPackage {
  id                String          @id @default(cuid())
  partnerContractId String
  partnerContract   PartnerContract @relation(fields: [partnerContractId], references: [id], onDelete: Cascade)
  dispoPackageId    String
  dispoPackage      DispoPackage    @relation(fields: [dispoPackageId], references: [id], onDelete: Cascade)

  @@unique([partnerContractId, dispoPackageId])
  @@map("partner_contract_dispo_package")
}
```

## API Contracts

### GET /api/vtc/contacts/:contactId/contract

Response:

```json
{
  "data": {
    "id": "cuid",
    "contactId": "cuid",
    "billingAddress": "123 Rue Example, 75001 Paris",
    "paymentTerms": "DAYS_30",
    "commissionPercent": "10.00",
    "notes": "VIP partner",
    "zoneRoutes": [{ "id": "...", "fromZone": {...}, "toZone": {...}, "fixedPrice": "150.00" }],
    "excursionPackages": [{ "id": "...", "name": "Versailles Full Day", "price": "450.00" }],
    "dispoPackages": [{ "id": "...", "name": "4h Dispo Paris", "basePrice": "200.00" }],
    "createdAt": "2025-11-26T00:00:00Z",
    "updatedAt": "2025-11-26T00:00:00Z"
  }
}
```

### PUT /api/vtc/contacts/:contactId/contract

Request:

```json
{
  "billingAddress": "123 Rue Example, 75001 Paris",
  "paymentTerms": "DAYS_30",
  "commissionPercent": 10.0,
  "notes": "VIP partner",
  "zoneRouteIds": ["id1", "id2"],
  "excursionPackageIds": ["id1"],
  "dispoPackageIds": ["id1", "id2"]
}
```

## Dev Notes

- Contact model needs a relation to PartnerContract (optional 1:1)
- ZoneRoute, ExcursionPackage, DispoPackage need reverse relations to junction tables
- Commission is stored as Decimal(5,2) to support 0.00-100.00 range
- PaymentTerms enum provides standardized options
- Grid assignments use explicit junction tables for proper referential integrity

## Testing Strategy

### Vitest (Unit/Integration)

- Test CRUD operations on PartnerContract
- Test validation (isPartner check)
- Test multi-tenancy isolation
- Test grid assignment sync (add/remove)

### Playwright (E2E/UI)

- Test Commercial Settings visibility for partners vs non-partners
- Test form submission and data persistence
- Test grid multi-select functionality

### curl + DB Verification

- Create contract via API, verify in DB
- Update contract, verify changes
- Delete contract, verify cascade
- Test unauthorized access (wrong org)

## Dependencies

- Story 2.1: Contact Model & Basic CRM UI ✅ Done
- Story 1.1: VTC ERP Prisma Models ✅ Done
- Story 1.2: Multi-tenancy ✅ Done

## Files to Modify/Create

### Database

- `packages/database/prisma/schema.prisma` - Add PartnerContract and junction models

### API

- `packages/api/src/routes/vtc/partner-contracts.ts` - New router
- `packages/api/src/routes/vtc/index.ts` - Register new router

### Frontend

- `apps/web/modules/saas/contacts/components/PartnerContractForm.tsx` - New component
- `apps/web/modules/saas/contacts/components/ContactDrawer.tsx` - Integrate contract form
- `apps/web/modules/saas/contacts/types.ts` - Add contract types

### Tests

- `packages/api/src/routes/vtc/__tests__/partner-contracts.test.ts` - API tests
