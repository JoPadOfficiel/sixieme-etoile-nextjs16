# Story 2.5: Expose Commercial Context in CRM Views

**Status:** ready-for-dev  
**Epic:** 2 - CRM & Partner Contracts  
**Sprint:** Current  
**Priority:** Medium  
**Story Points:** 5

---

## User Story

**As a** commercial manager,  
**I want** CRM views that show key commercial metrics per client,  
**So that** I can see which partners are most active and drive revenue.

---

## Description

This story extends the existing CRM views (Contacts list and Contact detail) to expose commercial context and metrics. The goal is to give commercial managers visibility into:

1. **Contacts List**: Show average margin band indicator alongside existing quotes/invoices counts
2. **Contact Detail**: Add a commercial summary panel showing commissions, typical grids used, and overall profitability trend

The implementation should use lightweight aggregation queries and reuse existing components (ProfitabilityIndicator, TimelineSummary patterns).

---

## Acceptance Criteria

### AC1: Contacts List Shows Commercial Metrics

**Given** the Contacts list (`/dashboard/contacts`)  
**When** I view a row  
**Then** I see:

- Quotes count (existing)
- Invoices count (existing)
- Average margin band indicator (green/orange/red) based on the contact's quotes

### AC2: Contact Detail Shows Commercial Summary

**Given** a Contact detail view (drawer)  
**When** I open it  
**Then** I see:

- Timeline of recent quotes and missions (existing)
- A panel summarising:
  - Commission percentage (for partners)
  - Typical grids used (zone routes, excursions, dispos assigned)
  - Overall profitability trend (average margin, total revenue)

### AC3: Lightweight Aggregation

- Use lightweight aggregation queries to display counts and basic metrics
- Full analytics/reporting belongs in Epic 9 (Story 9.8)

### AC4: Caching Acceptable

- Metrics are advisory and do not need to be 100% real-time
- Caching is acceptable for performance

---

## Technical Tasks

### Task 1: Create Commercial Metrics API Endpoint

- [ ] Add `GET /api/vtc/contacts/:id/commercial-metrics` endpoint
- [ ] Implement aggregation query for average margin, total revenue, profitability band
- [ ] Include commission summary from PartnerContract
- [ ] Include typical grids (zone routes, excursions, dispos) for partners

### Task 2: Extend ContactWithCounts Type

- [ ] Add `averageMarginPercent` to ContactWithCounts or create new type
- [ ] Add `CommercialMetrics` interface for detailed metrics

### Task 3: Update Contacts List API

- [ ] Extend list endpoint to include average margin calculation
- [ ] Use efficient aggregation (avoid N+1 queries)

### Task 4: Update ContactsTable Component

- [ ] Add ProfitabilityIndicator column for average margin
- [ ] Handle contacts with no quotes (show neutral state)

### Task 5: Create ContactCommercialSummary Component

- [ ] Display commission percentage for partners
- [ ] Display typical grids section (zone routes, packages)
- [ ] Display profitability trend (average margin, total revenue)

### Task 6: Integrate Commercial Summary in ContactDrawer

- [ ] Add commercial summary panel to contact detail view
- [ ] Position in the timeline tab or as separate section

### Task 7: Add Translations

- [ ] Add i18n keys for commercial metrics labels
- [ ] Support en/fr locales

### Task 8: Write Tests

- [ ] API tests for commercial metrics endpoint
- [ ] Component tests for ContactCommercialSummary
- [ ] E2E test with Playwright MCP

---

## Dependencies

### Prerequisites (Done)

- Story 2.1: Contact Model & Basic CRM UI ✅
- Story 2.2: Partner Contract Data & Rate Grid Links ✅
- Story 2.3: Safe Reclassification Partner/Private ✅
- Story 2.4: Link Quotes and Invoices to Contacts ✅
- Story 4.7: Profitability Indicator ✅

### Related

- Story 9.8: Basic Profitability & Yield Reporting (full analytics)

---

## Technical Notes

### API Design

```typescript
// GET /api/vtc/contacts/:id/commercial-metrics
interface CommercialMetricsResponse {
  contactId: string;
  metrics: {
    // Aggregated from quotes
    totalQuotes: number;
    totalQuotesValue: number; // EUR
    averageMarginPercent: number | null;
    profitabilityBand: "green" | "orange" | "red" | "unknown";

    // Aggregated from invoices
    totalInvoices: number;
    totalInvoicesValue: number; // EUR
    paidInvoicesValue: number; // EUR

    // From PartnerContract (if partner)
    commissionPercent: number | null;

    // Typical grids (for partners)
    typicalGrids: {
      zoneRoutes: Array<{
        id: string;
        fromZone: string;
        toZone: string;
        count: number;
      }>;
      excursionPackages: Array<{ id: string; name: string; count: number }>;
      dispoPackages: Array<{ id: string; name: string; count: number }>;
    } | null;
  };
}
```

### Aggregation Query Strategy

```sql
-- Average margin for a contact
SELECT
  AVG(margin_percent) as avg_margin,
  SUM(final_price) as total_value,
  COUNT(*) as total_quotes
FROM quote
WHERE contact_id = :contactId
  AND organization_id = :orgId
  AND status IN ('ACCEPTED', 'SENT', 'VIEWED')
```

### Component Structure

```
ContactDrawer
├── Tabs
│   ├── Details (ContactForm)
│   ├── Timeline (ContactTimeline)
│   │   └── TimelineSummaryCard (existing)
│   │   └── ContactCommercialSummary (NEW)
│   └── Contract (PartnerContractForm) - partners only
```

---

## UI/UX Notes

- Reuse `ProfitabilityIndicator` component for consistency
- Use compact mode in contacts list (icon only)
- Show tooltip with exact margin percentage
- For contacts with no quotes, show "—" or neutral indicator
- Commercial summary should be visually distinct but not overwhelming

---

## Definition of Done

- [ ] API endpoint returns commercial metrics for a contact
- [ ] Contacts list shows average margin indicator
- [ ] Contact detail shows commercial summary panel
- [ ] All acceptance criteria verified
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Translations added (en/fr)
- [ ] Code reviewed
- [ ] Documentation updated

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-5-expose-commercial-context-crm-views.context.xml`

### Implementation Notes

_To be filled during development_

### Test Results

_To be filled during development_
