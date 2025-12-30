# Story 13.2: Add Partner Filter to Pricing Pages

## Story Info

- **Epic**: 13 - Pricing UI Improvements & Partner Filtering
- **Story ID**: 13-2
- **Status**: done
- **Created**: 2025-12-01

## User Story

**As a** Commercial Manager  
**I want** to filter pricing pages (routes, excursions, dispos) by partner/agency  
**So that** I can see all negotiated prices for a specific partner at once

## Acceptance Criteria

| ID  | Criterion                                                                                     | Status |
| --- | --------------------------------------------------------------------------------------------- | ------ |
| AC1 | Routes page has a "Partner" filter dropdown showing all partner contacts                      | ✅     |
| AC2 | When a partner is selected, routes show their override price (if any) alongside catalog price | ✅     |
| AC3 | Routes with negotiated prices display a "Negotiated" badge                                    | ✅     |
| AC4 | Excursions page has the same partner filter functionality                                     | ✅     |
| AC5 | Dispos page has the same partner filter functionality                                         | ✅     |
| AC6 | Clearing the partner filter shows all routes with catalog prices only                         | ✅     |
| AC7 | API returns partner-specific override prices when partnerId query param is provided           | ✅     |

## Technical Implementation

### 1. API Changes (zone-routes.ts)

Add `partnerId` query parameter to the list routes endpoint:

- When provided, include the partner's override price for each route
- Return `overridePrice` field alongside `fixedPrice` (catalog price)

### 2. Frontend Changes

#### RoutesTable.tsx

- Add `partnerId` filter prop
- Add `partners` prop for dropdown options
- Display override price column when partner is selected
- Show "Negotiated" badge for routes with override prices

#### routes/page.tsx

- Fetch partner contacts on mount
- Add partner filter state
- Pass partnerId to API calls

### 3. Translation Keys

- `routes.filters.partner` - "Partner"
- `routes.filters.allPartners` - "All Partners"
- `routes.table.overridePrice` - "Negotiated Price"

## Files to Modify

| File                                                       | Changes                                               |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| `packages/api/src/routes/vtc/zone-routes.ts`               | Add partnerId query param, include override prices    |
| `apps/web/modules/saas/pricing/components/RoutesTable.tsx` | Add partner filter dropdown and override price column |
| `apps/web/app/.../settings/pricing/routes/page.tsx`        | Add partner state and fetch partners                  |
| `packages/i18n/translations/en.json`                       | Add translation keys                                  |
| `packages/i18n/translations/fr.json`                       | Add translation keys                                  |

## Implementation Log

### Session 2025-12-01

- [x] Task 1: Add partnerId to zone-routes API
- [x] Task 2: Add translation keys
- [x] Task 3: Update RoutesTable component
- [x] Task 4: Update routes page
- [x] Task 5: Test with Playwright
