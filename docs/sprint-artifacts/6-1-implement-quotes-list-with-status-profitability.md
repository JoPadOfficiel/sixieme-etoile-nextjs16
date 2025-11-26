# Story 6.1: Implement Quotes List with Status & Profitability

**Epic:** 6 - Quotes & Operator Cockpit  
**Status:** done  
**Priority:** High  
**Story Points:** 5

---

## User Story

**As an** operator,  
**I want** a quotes list with statuses and profitability indicators,  
**So that** I can quickly find and prioritise quotes to work on.

---

## Related FRs

- **FR31-FR33**: Quote lifecycle states (Draft, Sent, Viewed, Accepted, Rejected, Expired)
- **FR24**: Profitability indicator (green/orange/red) based on margin vs internal cost
- **FR42**: Structured quote builder UI with easy-to-scan layout

---

## Acceptance Criteria

### AC1: Quotes Table Display

**Given** `/dashboard/quotes` page  
**When** I open the page  
**Then** I see a table with columns:

- Quote ID
- Contact (with partner/private badge)
- Trip Summary (pickup → dropoff)
- Date/Time (Europe/Paris)
- Vehicle Category
- Status (Draft/Sent/Viewed/Accepted/Rejected/Expired)
- Price (EUR)
- Margin %
- Profitability Indicator (green/orange/red)

### AC2: Filtering & Search

**Given** the quotes list  
**When** I use filters  
**Then** I can filter by:

- Date range (pickup date)
- Status (multi-select)
- Client Type (Partner/Private)
- Vehicle Category
- Free-text search on contact name, addresses

### AC3: Profitability Indicator

**Given** a quote with margin data  
**When** displayed in the list  
**Then** Profitability Indicator shows:

- **Green**: margin ≥ greenMarginThreshold (default 20%)
- **Orange**: margin ≥ orangeMarginThreshold but < green (default 0-20%)
- **Red**: margin < orangeMarginThreshold (default < 0%)

With Lucide icon + colored dot + label + tooltip showing exact margin %.

### AC4: Row Actions

**Given** the quotes list  
**When** I click a row action menu  
**Then** I can:

- **View/Edit**: Navigate to quote detail
- **Duplicate**: Create a copy as new draft
- **Convert to Invoice**: Only visible for ACCEPTED quotes
- **Cancel**: Mark quote as cancelled (only for DRAFT/SENT)

---

## Technical Tasks

1. **Create quotes module structure**

   - `apps/web/modules/saas/quotes/components/`
   - `apps/web/modules/saas/quotes/types.ts`

2. **Create ProfitabilityIndicator component**

   - Reusable component in `apps/web/modules/saas/shared/components/`
   - Props: marginPercent, greenThreshold?, orangeThreshold?
   - Uses Lucide icons (TrendingUp, AlertTriangle, TrendingDown)
   - Tooltip with exact margin value

3. **Create QuotesTable component**

   - Follow ContactsTable pattern
   - Columns as per AC1
   - Search, filters, pagination
   - Row click → navigate to detail

4. **Create QuoteStatusBadge component**

   - Color-coded badges for each status
   - DRAFT: gray, SENT: blue, VIEWED: purple, ACCEPTED: green, REJECTED: red, EXPIRED: orange

5. **Create quotes page route**

   - `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/quotes/page.tsx`

6. **Extend quotes API if needed**

   - Add search parameter to list endpoint
   - Add date range filter
   - Add clientType filter (via contact.isPartner)

7. **Add translations**

   - `apps/web/content/locales/en/quotes.json`
   - `apps/web/content/locales/fr/quotes.json`

8. **Write tests**
   - Vitest: ProfitabilityIndicator, QuoteStatusBadge
   - Playwright: Quotes list E2E flow

---

## Dependencies

- Epic 2 (Contacts) - Contact data for display
- Epic 4 (Profitability) - Margin calculation in pricing engine
- Epic 1 (Foundation) - Time/currency handling

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-1-implement-quotes-list-with-status-profitability.context.xml`

### Implementation Notes

- Use existing `quotesRouter` at `/api/vtc/quotes`
- Follow ContactsTable pattern for consistency
- Profitability thresholds from OrganizationPricingSettings
- All dates in Europe/Paris timezone (no conversion)

---

## Definition of Done

- [ ] QuotesTable component implemented with all columns
- [ ] ProfitabilityIndicator component created and reusable
- [ ] Filters working (status, date range, client type, vehicle category)
- [ ] Search working on contact name and addresses
- [ ] Pagination working
- [ ] Row actions implemented with proper status checks
- [ ] Translations added (en, fr)
- [ ] Vitest unit tests passing
- [ ] Playwright E2E tests passing
- [ ] Code reviewed and merged
