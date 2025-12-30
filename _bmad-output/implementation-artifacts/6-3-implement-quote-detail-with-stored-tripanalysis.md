# Story 6.3: Implement Quote Detail with Stored tripAnalysis

**Epic:** 6 - Quotes & Operator Cockpit  
**Status:** done
**Priority:** High  
**Story Points:** 8

---

## User Story

**As an** operator,  
**I want** a quote detail screen that shows stored analysis and history,  
**So that** I can understand exactly how a quote was built and evolved.

---

## Related FRs

- **FR21-FR24**: Shadow Calculation and tripAnalysis storage
- **FR31-FR33**: Quote lifecycle states and immutability rules
- **FR42-FR44**: Operator Cockpit UX (Trip Transparency display)

---

## Acceptance Criteria

### AC1: Quote Detail Page Layout

**Given** `/dashboard/quotes/[id]` page  
**When** I open an existing quote  
**Then** I see:

- **Header:**

  - Quote ID and status badge
  - Contact name with Partner/Private badge
  - Main action buttons (Send, Accept, Reject, Convert to Invoice)
  - Back to Quotes link

- **Left Column - Commercial Summary:**

  - Pricing mode badge (Grid/Dynamic)
  - Suggested price vs Final price
  - Internal cost and margin percentage
  - Profitability indicator
  - Applied rules summary (if any)
  - Matched grid info (if Method 1)

- **Center Column - Trip Transparency:**

  - TripTransparencyPanel rendering stored `tripAnalysis`
  - Segments A/B/C breakdown
  - Cost components (fuel, tolls, wear, driver)
  - Vehicle selection info (if available)

- **Right Column - Activity & Notes:**
  - Activity log timeline (created, sent, viewed, accepted/rejected)
  - Internal notes (editable for DRAFT, readonly otherwise)
  - Validity date display

### AC2: Immutable Commercial Data for Sent/Accepted Quotes

**Given** a quote with status SENT or ACCEPTED  
**When** I view the quote detail  
**Then** the commercial summary shows frozen values (prices, costs, margin) and does NOT recompute pricing from current configuration

### AC3: TripTransparency from Stored tripAnalysis

**Given** a quote with stored tripAnalysis JSON  
**When** I view the center column  
**Then** TripTransparencyPanel displays the stored segments (approach, service, return), cost breakdown, and profitability indicator from the stored data

### AC4: Activity Log Timeline

**Given** a quote with status history  
**When** I view the right column  
**Then** I see a timeline showing:

- Creation date with user
- Sent date (if applicable)
- Viewed date (if applicable)
- Accepted/Rejected date (if applicable)

### AC5: Send Quote Action

**Given** a DRAFT quote  
**When** I click "Send Quote"  
**Then**:

- The quote status changes to SENT via PATCH /api/vtc/quotes/:id
- The UI updates to reflect the new status
- Commercial values become frozen (displayed from stored data)
- Success toast is displayed

### AC6: Accept/Reject Actions

**Given** a SENT or VIEWED quote  
**When** I click "Mark as Accepted" or "Mark as Rejected"  
**Then**:

- The quote status changes accordingly via API
- The UI updates to show the new status badge
- For ACCEPTED, "Convert to Invoice" button becomes available

### AC7: Convert to Invoice Action

**Given** an ACCEPTED quote  
**When** I click "Convert to Invoice"  
**Then** I see a "Coming Soon" message or am redirected to invoice creation (Epic 7 placeholder)

### AC8: Notes Display and Edit

**Given** a quote with notes  
**When** I view the detail page  
**Then**:

- Notes are displayed in the right column
- For DRAFT quotes, notes are editable with save functionality
- For SENT/ACCEPTED/REJECTED quotes, notes are readonly

---

## Technical Tasks

### 1. Create Page Route

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/quotes/[id]/page.tsx`
- Server component that fetches quote data
- Import and render QuoteDetailPage component

### 2. Create QuoteDetailPage Component

- `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx`
- 3-column responsive grid layout using Tailwind CSS
- React Query for data fetching with loading states
- Handle quote not found (404)

### 3. Create QuoteHeader Component

- `apps/web/modules/saas/quotes/components/QuoteHeader.tsx`
- Quote ID, status badge, contact info
- Action buttons based on current status:
  - DRAFT: "Send Quote"
  - SENT/VIEWED: "Mark as Accepted", "Mark as Rejected"
  - ACCEPTED: "Convert to Invoice"
- Back to Quotes navigation

### 4. Create QuoteCommercialSummary Component (Left Column)

- `apps/web/modules/saas/quotes/components/QuoteCommercialSummary.tsx`
- Display pricing mode badge
- Show suggested vs final price
- Internal cost and margin with ProfitabilityIndicator
- Applied rules list (from appliedRules JSON)
- Matched grid info for Method 1 quotes

### 5. Adapt TripTransparencyPanel for Stored Data

- Modify TripTransparencyPanel to accept stored tripAnalysis directly
- Create helper to transform Quote.tripAnalysis to PricingResult format
- Ensure no API calls are made for display

### 6. Create QuoteActivityLog Component (Right Column)

- `apps/web/modules/saas/quotes/components/QuoteActivityLog.tsx`
- Timeline component showing status history
- Use createdAt, sentAt, viewedAt, acceptedAt, rejectedAt fields
- Display user info where available
- Notes section with edit capability for DRAFT

### 7. Implement Status Transition Mutations

- `apps/web/modules/saas/quotes/hooks/useQuoteActions.ts`
- useMutation for PATCH /api/vtc/quotes/:id
- Handle status transitions: DRAFT→SENT, SENT→VIEWED, SENT/VIEWED→ACCEPTED/REJECTED
- Invalidate quote query on success
- Show success/error toasts

### 8. Add Quote Detail Translations

- Extend `packages/i18n/translations/en.json` with quotes.detail keys
- Extend `packages/i18n/translations/fr.json` with quotes.detail keys
- Keys for all new UI elements

### 9. Update Component Exports

- Update `apps/web/modules/saas/quotes/components/index.ts`

### 10. Write Tests

- Vitest: Component unit tests
- Playwright MCP: E2E quote detail flow

---

## Dependencies

- **Story 6.1** (done): QuotesTable, ProfitabilityIndicator, QuoteStatusBadge
- **Story 6.2** (done): CreateQuoteCockpit, TripTransparencyPanel
- **Epic 4** (done): Pricing engine, shadow calculation, tripAnalysis structure
- **Epic 2** (done): Contacts with partner/private classification

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-3-implement-quote-detail-with-stored-tripanalysis.context.xml`

### Implementation Notes

- Use existing `apiClient.vtc.quotes[":id"].$get` for fetching quote
- Use existing `apiClient.vtc.quotes[":id"].$patch` for status updates
- Reuse TripTransparencyPanel with stored tripAnalysis data
- Do NOT call pricing API for SENT/ACCEPTED quotes - use stored values only
- Activity log should use createdAt and status change timestamps
- All dates in Europe/Paris timezone (no conversion per Story 1.4)
- All prices in EUR (no currency conversion per Story 1.3)

### API Endpoints Used

- `GET /api/vtc/quotes/:id` - Get quote detail
- `PATCH /api/vtc/quotes/:id` - Update quote status/notes

### Component Structure

```
apps/web/modules/saas/quotes/
├── components/
│   ├── QuoteDetailPage.tsx        # Main detail page layout
│   ├── QuoteHeader.tsx            # Header with actions
│   ├── QuoteCommercialSummary.tsx # Left column
│   ├── QuoteActivityLog.tsx       # Right column
│   ├── TripTransparencyPanel.tsx  # Center column (existing)
│   └── index.ts                   # Exports
├── hooks/
│   ├── useQuoteDetail.ts          # Quote fetching hook
│   └── useQuoteActions.ts         # Status transition mutations
└── types.ts                       # Extended types
```

### Status Transition Rules

| Current Status | Allowed Actions    | Next Status |
| -------------- | ------------------ | ----------- |
| DRAFT          | Send Quote         | SENT        |
| SENT           | Mark as Accepted   | ACCEPTED    |
| SENT           | Mark as Rejected   | REJECTED    |
| VIEWED         | Mark as Accepted   | ACCEPTED    |
| VIEWED         | Mark as Rejected   | REJECTED    |
| ACCEPTED       | Convert to Invoice | (Epic 7)    |
| REJECTED       | -                  | -           |
| EXPIRED        | -                  | -           |

---

## Definition of Done

- [ ] Page route `/quotes/[id]` created and accessible
- [ ] 3-column layout renders correctly on desktop (≥1280px)
- [ ] Quote header displays status badge and action buttons
- [ ] Commercial summary shows all pricing data
- [ ] TripTransparencyPanel displays stored tripAnalysis
- [ ] Activity log shows status history timeline
- [ ] Notes are editable for DRAFT quotes only
- [ ] Send Quote action transitions to SENT status
- [ ] Accept/Reject actions work correctly
- [ ] Convert to Invoice shows placeholder message
- [ ] SENT/ACCEPTED quotes display immutable stored values
- [ ] Translations added (EN, FR)
- [ ] Vitest unit tests passing
- [ ] Playwright E2E tests passing
- [ ] Code reviewed and merged
