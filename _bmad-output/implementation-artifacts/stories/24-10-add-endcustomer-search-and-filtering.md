# Story 24-10: Add EndCustomer Search and Filtering

**Epic:** 24 - Agency Mini-CRM & Bidirectional Pricing
**Status:** done
**Priority:** High
**Effort:** Medium

## Description
As a **dispatcher or sales agent**,
I want to **search and filter Quotes and Missions by EndCustomer name**,
So that **I can quickly find relevant trips even if I only know the passenger's name and not the agency booking it.**

Currently, operators often struggle to find a specific trip when a partner agency (e.g., "MegaTravel") has hundreds of bookings. If a specific passenger calls ("Where is my driver?"), the operator needs to search by that passenger's name across the entire system.

## Acceptance Criteria

1. [x] **Backend Search Implementation**: `GET /quotes` and `GET /missions` endpoints include `EndCustomer.firstName` and `EndCustomer.lastName` in search logic.
2. [x] **Quotes List Search**: Main search bar on Quotes List filters by EndCustomer name.
3. [x] **Dispatch List Search**: Search bar in Dispatch / Missions List filters by EndCustomer name.
4. [x] **UI Display**: EndCustomer name is displayed in search results for both lists.

## Technical Implementation Approach
1.  **Backend (`packages/api`)**:
    *   Updated `quotes.ts` and `missions.ts` to include `endCustomer` fields in the `OR` search clause.
    *   Verified `include: { endCustomer: true }` is present.

2.  **Frontend (`apps/web`)**:
    *   Updated `QuotesTable.tsx` to display EndCustomer name.
    *   Verified `MissionsFilters.tsx` and `MissionRow.tsx` handle search and display correctly.

## Dependencies
- Story 24-1: EndCustomer Data Model (Done)
- Story 24-7: Dispatch Integration (Done)

## Testing Strategy
- **Unit Tests**: Added `packages/api/src/routes/vtc/__tests__/quotes-search.test.ts` to verify search logic.
- **Manual Verification**: Search by EndCustomer name correctly filters both lists.
