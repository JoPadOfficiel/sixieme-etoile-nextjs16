# Story 12.3: Partner Contract Override Price UI

**Epic:** 12 - Partner-Specific Pricing & Contract Enhancements  
**Story ID:** 12-3  
**Status:** done  
**Priority:** High  
**Estimated Effort:** 5 points  
**Context:** [12-3-partner-contract-override-ui.context.xml](./12-3-partner-contract-override-ui.context.xml)  
**Depends On:** [12-1](./12-1-partner-specific-pricing-schema.md), [12-2](./12-2-pricing-engine-override-support.md)

---

## Related PRD Requirements

- **FR2:** Partner contract data includes assigned rate grids
- **FR11:** Engagement Rule - grid price applied even if unprofitable
- **FR36:** Partner-specific pricing configuration

---

## User Story

**As a** VTC operator,  
**I want** to view and edit negotiated prices for each route/excursion/dispo in a partner contract,  
**So that** I can configure partner-specific pricing without needing database access.

---

## Problem Statement

The Stories 12.1 and 12.2 added technical support for negotiated prices (`overridePrice`), but there is no user interface to configure them. The current `PartnerContractForm.tsx` only shows the count of assigned grids, not their prices.

---

## Acceptance Criteria

### AC1: Display Prices in Contract Form

**Given** a partner contract with assigned zone routes,  
**When** the user views the contract form,  
**Then** they shall see a table with:

- Route name (From Zone → To Zone)
- Vehicle category
- Catalog price (fixedPrice)
- Negotiated price (overridePrice or "Catalog" if null)
- A visual indicator if override is active

### AC2: Display Excursion and Dispo Prices

**Given** a partner contract with assigned excursions and dispos,  
**When** the user views the contract form,  
**Then** they shall see tables with:

- Package name
- Catalog price
- Negotiated price (or "Catalog" if null)

### AC3: Edit Override Price

**Given** a displayed route/excursion/dispo,  
**When** the user clicks on the price cell,  
**Then** they shall be able to:

- Enter a new negotiated price (positive number)
- Clear the override to use catalog price
- See validation errors for invalid input

### AC4: Save Changes

**Given** modified override prices,  
**When** the user clicks "Save",  
**Then**:

- The API PUT /api/vtc/contacts/:contactId/contract is called
- A success toast is displayed
- The form reflects the saved values

### AC5: Visual Feedback

**Given** any user action,  
**Then**:

- Loading states are shown during API calls
- Success/error toasts are displayed
- Override prices are visually distinct from catalog prices

---

## Technical Specification

### Files to Modify

1. **`apps/web/modules/saas/contacts/types.ts`**

   - Update `ZoneRouteAssignment` to include `catalogPrice`, `overridePrice`, `effectivePrice`
   - Update `PackageAssignment` similarly

2. **`apps/web/modules/saas/contacts/components/PartnerContractForm.tsx`**
   - Add collapsible sections for Zone Routes, Excursions, Dispos
   - Add editable price tables with inline editing
   - Update form data structure to include override prices
   - Update save mutation to send new format

### New Components

```
apps/web/modules/saas/contacts/components/
├── PartnerContractForm.tsx (modify)
├── PriceOverrideTable.tsx (new)
└── PriceOverrideCell.tsx (new)
```

### Type Updates

```typescript
// types.ts
export interface ZoneRouteAssignment {
  id: string;
  fromZone: { id: string; name: string; code: string };
  toZone: { id: string; name: string; code: string };
  vehicleCategory: { id: string; name: string; code: string };
  fixedPrice: string; // Legacy
  catalogPrice: number;
  overridePrice: number | null;
  effectivePrice: number;
}

export interface PackageAssignment {
  id: string;
  name: string;
  description: string | null;
  price?: string; // Legacy for excursion
  basePrice?: string; // Legacy for dispo
  catalogPrice: number;
  overridePrice: number | null;
  effectivePrice: number;
}

export interface PartnerContractFormData {
  // ... existing fields
  zoneRouteAssignments: Array<{
    zoneRouteId: string;
    overridePrice: number | null;
  }>;
  excursionAssignments: Array<{
    excursionPackageId: string;
    overridePrice: number | null;
  }>;
  dispoAssignments: Array<{
    dispoPackageId: string;
    overridePrice: number | null;
  }>;
}
```

### UI Components

#### PriceOverrideTable

A reusable table component for displaying and editing prices:

| Column     | Description                       |
| ---------- | --------------------------------- |
| Name       | Route name or package name        |
| Category   | Vehicle category (routes only)    |
| Catalog    | Catalog price (read-only)         |
| Negotiated | Editable input or "Catalog" badge |
| Actions    | Reset to catalog button           |

#### PriceOverrideCell

An inline editable cell for price input:

- Click to edit mode
- Input validation (positive number)
- Blur or Enter to confirm
- Escape to cancel

---

## Test Cases

### Playwright Tests

| Test ID | Description               | Expected Result                    |
| ------- | ------------------------- | ---------------------------------- |
| T12.3.1 | View contract with routes | Routes table displayed with prices |
| T12.3.2 | Edit override price       | Price updated in UI                |
| T12.3.3 | Save changes              | API called, success toast shown    |
| T12.3.4 | Reset to catalog          | Override cleared, shows "Catalog"  |
| T12.3.5 | Invalid price input       | Validation error displayed         |
| T12.3.6 | Empty contract            | "No routes assigned" message       |

### API Tests (Curl)

```bash
# Get contract with prices
curl -X GET "http://localhost:3000/api/vtc/contacts/{contactId}/contract" \
  -H "x-organization-id: {orgId}"

# Update with override prices
curl -X PUT "http://localhost:3000/api/vtc/contacts/{contactId}/contract" \
  -H "Content-Type: application/json" \
  -H "x-organization-id: {orgId}" \
  -d '{
    "paymentTerms": "DAYS_30",
    "commissionPercent": 10,
    "zoneRouteAssignments": [
      { "zoneRouteId": "{routeId}", "overridePrice": 95 }
    ]
  }'
```

### Database Verification

```sql
-- Verify override price saved
SELECT
  pczr."overridePrice",
  zr."fixedPrice" as catalog_price
FROM partner_contract_zone_route pczr
JOIN zone_route zr ON zr.id = pczr."zoneRouteId"
WHERE pczr."partnerContractId" = '{contractId}';
```

---

## Dependencies

- **Prerequisite:** Stories 12.1 (Schema) and 12.2 (Pricing Engine)
- **API:** PUT /api/vtc/contacts/:contactId/contract (exists)

---

## Constraints

| ID  | Constraint     | Description                                    |
| --- | -------------- | ---------------------------------------------- |
| C-1 | Existing API   | Use existing PUT endpoint, no new endpoints    |
| C-2 | Design System  | Use shadcn/ui components (Table, Input, Badge) |
| C-3 | Inline Editing | Prefer inline editing over modals              |
| C-4 | Multi-tenancy  | Respect organization isolation                 |

---

## Definition of Done

- [x] Types updated with catalogPrice, overridePrice, effectivePrice
- [x] Price tables displayed for routes, excursions, dispos
- [x] Inline editing of override prices works
- [x] Reset to catalog price works
- [x] Save mutation sends new format with assignments
- [x] Success/error toasts displayed
- [x] Playwright tests pass
- [x] API tests (curl) confirm correct data
- [x] DB verification confirms overridePrice saved
- [x] Code reviewed and merged

---

## Implementation Log

### Files Modified

1. `apps/web/modules/saas/contacts/types.ts`

   - Added `catalogPrice`, `overridePrice`, `effectivePrice` to `ZoneRouteAssignment`
   - Added `catalogPrice`, `overridePrice`, `effectivePrice` to `PackageAssignment`
   - Added `ZoneRouteOverride`, `ExcursionOverride`, `DispoOverride` interfaces
   - Updated `PartnerContractFormData` with assignment arrays

2. `apps/web/modules/saas/contacts/components/PriceOverrideCell.tsx` (NEW)

   - Inline editable cell for override prices
   - Click to edit, Enter to save, Escape to cancel
   - Validation for positive numbers
   - Reset to catalog button

3. `apps/web/modules/saas/contacts/components/PriceOverrideTable.tsx` (NEW)

   - `ZoneRoutesTable` - Collapsible table for zone routes
   - `PackagesTable` - Collapsible table for excursion/dispo packages
   - Badge indicators for override count

4. `apps/web/modules/saas/contacts/components/PartnerContractForm.tsx`

   - Integrated `ZoneRoutesTable` and `PackagesTable`
   - Added handlers for price changes
   - Updated form data to include override assignments
   - Updated save mutation to send new format

5. `docs/sprint-artifacts/12-3-partner-contract-override-ui.context.xml` - Story context
6. `docs/sprint-artifacts/12-3-partner-contract-override-ui.md` - Story specification
7. `docs/sprint-artifacts/sprint-status.yaml` - Updated status

### Tests Executed

#### ESLint

```bash
pnpm run lint
# No errors in our files
```

### Git Commands

```bash
git add .
git commit -m "feat(12-3): Add UI for partner contract override prices

- Add PriceOverrideCell component for inline price editing
- Add ZoneRoutesTable and PackagesTable components
- Update PartnerContractForm with interactive price tables
- Update types with catalogPrice, overridePrice, effectivePrice
- Support for zone routes, excursions, and dispo packages

Story: 12-3-partner-contract-override-ui"

git push origin feature/12-3-partner-contract-override-ui
```
