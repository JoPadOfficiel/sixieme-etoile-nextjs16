# Story 14.6: Assign Rate Grids to Partners from Pricing UI

**Status:** in-progress  
**Epic:** Epic 14 - Flexible Route Pricing System  
**Created:** 2025-12-01  
**Branch:** `feature/14-6-assign-rate-grids-from-pricing-ui`

---

## Description

**As a** pricing administrator,  
**I want** to assign zone routes, excursion packages, and dispo packages to partners directly from the pricing configuration pages,  
**So that** I can efficiently manage which partners have access to which rate grids without navigating to each contact individually.

---

## Acceptance Criteria

### AC1: Partner Assignments API for Zone Routes

**Given** I am authenticated as an organization admin,  
**When** I call `GET /api/vtc/zone-routes/:id/partner-assignments`,  
**Then** I receive a list of partners assigned to this route with their override prices.

**And** when I call `POST /api/vtc/zone-routes/:id/partner-assignments` with a list of partner assignments,  
**Then** the assignments are created/updated in the database.

### AC2: Partner Assignments API for Excursion Packages

**Given** I am authenticated as an organization admin,  
**When** I call `GET /api/vtc/excursion-packages/:id/partner-assignments`,  
**Then** I receive a list of partners assigned to this package with their override prices.

**And** when I call `POST /api/vtc/excursion-packages/:id/partner-assignments` with a list of partner assignments,  
**Then** the assignments are created/updated in the database.

### AC3: Partner Assignments API for Dispo Packages

**Given** I am authenticated as an organization admin,  
**When** I call `GET /api/vtc/dispo-packages/:id/partner-assignments`,  
**Then** I receive a list of partners assigned to this package with their override prices.

**And** when I call `POST /api/vtc/dispo-packages/:id/partner-assignments` with a list of partner assignments,  
**Then** the assignments are created/updated in the database.

### AC4: Partner Count Badge on Pricing Lists

**Given** I am on `/settings/pricing/routes`,  
**When** I view the routes list,  
**Then** each route shows a badge with the number of partners assigned (e.g., "3 partners").

**And** the same applies to `/settings/pricing/excursions` and `/settings/pricing/dispos`.

### AC5: Assign Partners Dialog

**Given** I am on the routes/excursions/dispos list,  
**When** I click the "Assign Partners" button on a row,  
**Then** a dialog opens showing all available partners with checkboxes.

**And** I can set an optional override price for each selected partner.

**And** when I click "Save", the assignments are persisted via the API.

### AC6: Bidirectional Consistency

**Given** I assign a route to Partner A from the pricing UI,  
**When** I open Partner A's contact page and view their contract,  
**Then** the route appears in their "Assigned Rate Grids" section.

**And** vice versa: assignments made from the contact page appear in the pricing UI.

---

## Technical Notes

### New API Endpoints

```typescript
// Zone Routes
GET  /api/vtc/zone-routes/:id/partner-assignments
POST /api/vtc/zone-routes/:id/partner-assignments

// Excursion Packages
GET  /api/vtc/excursion-packages/:id/partner-assignments
POST /api/vtc/excursion-packages/:id/partner-assignments

// Dispo Packages
GET  /api/vtc/dispo-packages/:id/partner-assignments
POST /api/vtc/dispo-packages/:id/partner-assignments
```

### Request/Response Schema

```typescript
// GET response
{
  assignments: [
    {
      contactId: string;
      contactName: string;
      overridePrice: number | null;
      catalogPrice: number;
      effectivePrice: number;
      assignedAt: string;
    }
  ],
  catalogPrice: number;
  totalPartners: number;
}

// POST request
{
  assignments: [
    {
      contactId: string;
      overridePrice: number | null; // null = use catalog price
    }
  ]
}
```

### UI Components

1. **PartnerAssignmentDialog** - Reusable dialog for all three types
2. **PartnerCountBadge** - Shows "X partners" on list items
3. **PartnerAssignmentRow** - Row in dialog with checkbox + price input

---

## Test Cases

### Backend Tests (Vitest)

| ID  | Test Case                                      | Expected Result                  |
| --- | ---------------------------------------------- | -------------------------------- |
| T1  | GET assignments for route with no partners     | Returns empty array              |
| T2  | GET assignments for route with partners        | Returns partner list with prices |
| T3  | POST new assignment                            | Creates PartnerContractZoneRoute |
| T4  | POST update existing assignment price          | Updates overridePrice            |
| T5  | POST remove assignment (empty array)           | Deletes junction record          |
| T6  | POST with invalid contactId                    | Returns 400 error                |
| T7  | POST with non-partner contact                  | Returns 400 error                |
| T8  | Multi-tenancy: cannot access other org's route | Returns 404                      |

### API Tests (Curl)

| ID  | Test Case                    | Endpoint                                         |
| --- | ---------------------------- | ------------------------------------------------ |
| C1  | Get zone route assignments   | GET /zone-routes/:id/partner-assignments         |
| C2  | Assign partners to route     | POST /zone-routes/:id/partner-assignments        |
| C3  | Get excursion assignments    | GET /excursion-packages/:id/partner-assignments  |
| C4  | Assign partners to excursion | POST /excursion-packages/:id/partner-assignments |
| C5  | Get dispo assignments        | GET /dispo-packages/:id/partner-assignments      |
| C6  | Assign partners to dispo     | POST /dispo-packages/:id/partner-assignments     |

### UI Tests (Playwright MCP)

| ID  | Test Case             | Steps                                        |
| --- | --------------------- | -------------------------------------------- |
| P1  | Partner badge visible | Navigate to routes, verify badge shows count |
| P2  | Open assign dialog    | Click "Assign Partners", verify dialog opens |
| P3  | Select partner        | Check partner checkbox, verify selection     |
| P4  | Set override price    | Enter price, verify input works              |
| P5  | Save assignments      | Click Save, verify success toast             |
| P6  | Bidirectional sync    | Assign from pricing, verify in contact page  |

---

## Files to Modify/Create

### New Files

- `packages/api/src/routes/vtc/partner-assignments.ts` - New API routes
- `apps/web/modules/saas/pricing/components/PartnerAssignmentDialog.tsx`
- `apps/web/modules/saas/pricing/components/PartnerCountBadge.tsx`

### Modified Files

- `packages/api/src/routes/vtc/index.ts` - Register new routes
- `apps/web/modules/saas/pricing/components/RoutesTable.tsx` - Add badge + button
- `apps/web/modules/saas/pricing/components/ExcursionsTable.tsx` - Add badge + button
- `apps/web/modules/saas/pricing/components/DisposTable.tsx` - Add badge + button
- `packages/i18n/translations/fr.json` - French translations
- `packages/i18n/translations/en.json` - English translations

---

## Definition of Done

- [ ] All 6 API endpoints implemented and tested
- [ ] Partner count badge visible on all pricing lists
- [ ] Assign Partners dialog functional for routes/excursions/dispos
- [ ] Bidirectional consistency verified
- [ ] All Vitest tests passing
- [ ] All Curl tests documented and passing
- [ ] All Playwright tests passing
- [ ] Translations complete (FR/EN)
- [ ] Code reviewed and merged to main
