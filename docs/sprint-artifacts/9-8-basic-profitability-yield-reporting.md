# Story 9-8: Basic Profitability & Yield Reporting

## Story

**As a** business owner  
**I want** simple profitability and yield reports using Trip Transparency data  
**So that** I can see which clients, grids, and vehicle categories perform best

## Description

This story implements a basic reporting page that aggregates profitability data from quotes and missions. The report allows filtering by date range, client, vehicle category, and profitability level, with grouping options to analyze performance across different dimensions.

## Acceptance Criteria

### AC1: Profitability Report Page

**Given** a Reporting area at `/dashboard/reports`  
**When** I open the profitability report  
**Then** I see:

- Summary cards showing Total Revenue, Total Cost, Average Margin %, and Loss Count
- A data table with missions/quotes showing margin and profitability indicator
- Grouping options: by client, vehicle category, period, or none

### AC2: Report Filters

**Given** the profitability report  
**When** I apply filters  
**Then** I can:

- Filter by date range (from/to)
- Filter by profitability level (all, green, orange, red)
- Filter by specific client/partner
- Filter by vehicle category

### AC3: Profitability Indicators

**Given** the report table  
**When** I view the data  
**Then** each row shows a Profitability Indicator (green/orange/red) consistent with quotes and dispatch screens

### AC4: Navigation Integration

**Given** the main navigation  
**When** I look for reports  
**Then** I see a "Reports" link in the sidebar leading to the reports page

## Test Cases

### Unit Tests

| ID  | Test Case                            | Expected Result                     |
| --- | ------------------------------------ | ----------------------------------- |
| UT1 | ReportSummaryCards with valid data   | Renders 4 cards with correct values |
| UT2 | ReportSummaryCards with zero data    | Shows "0" or "N/A" appropriately    |
| UT3 | ReportFilters date range selection   | Updates query params                |
| UT4 | ReportFilters profitability filter   | Filters data correctly              |
| UT5 | ProfitabilityReportTable empty state | Shows empty message                 |
| UT6 | ProfitabilityReportTable with data   | Renders rows with badges            |

### API Tests

| ID  | Test Case                                              | Expected Result                |
| --- | ------------------------------------------------------ | ------------------------------ |
| AT1 | GET /reports/profitability without filters             | Returns all data for org       |
| AT2 | GET /reports/profitability with date range             | Returns filtered data          |
| AT3 | GET /reports/profitability with groupBy=client         | Returns grouped data           |
| AT4 | GET /reports/profitability with profitabilityLevel=red | Returns only losses            |
| AT5 | Multi-tenancy check                                    | Cannot access other org's data |

### E2E Tests (Playwright)

| ID   | Test Case                   | Expected Result                  |
| ---- | --------------------------- | -------------------------------- |
| E2E1 | Navigate to /reports        | Page loads with summary cards    |
| E2E2 | Apply date filter           | Table updates with filtered data |
| E2E3 | Select "Group by Client"    | Data grouped by client name      |
| E2E4 | Filter by red profitability | Only loss-making rows shown      |

## Technical Notes

### Files to Create

1. **API Route**: `packages/api/src/routes/vtc/reports.ts`

   - GET /reports/profitability endpoint
   - Aggregation queries using Prisma

2. **Page**: `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/reports/page.tsx`

   - Main reports page

3. **Components**:

   - `apps/web/modules/saas/reports/components/ProfitabilityReport.tsx`
   - `apps/web/modules/saas/reports/components/ReportSummaryCards.tsx`
   - `apps/web/modules/saas/reports/components/ReportFilters.tsx`
   - `apps/web/modules/saas/reports/components/ProfitabilityReportTable.tsx`

4. **Hook**: `apps/web/modules/saas/reports/hooks/useProfitabilityReport.ts`

5. **Translations**: Add `reports` namespace to EN/FR files

### API Response Schema

```typescript
interface ProfitabilityReportResponse {
  summary: {
    totalRevenue: number;
    totalCost: number;
    avgMarginPercent: number;
    lossCount: number;
    totalCount: number;
  };
  data: ProfitabilityReportRow[];
}

interface ProfitabilityReportRow {
  id: string;
  groupKey: string | null;
  groupLabel: string | null;
  revenue: number;
  cost: number;
  marginPercent: number;
  profitabilityLevel: "green" | "orange" | "red";
  count: number;
  // When not grouped:
  quoteId?: string;
  contactName?: string;
  vehicleCategory?: string;
  pickupAt?: string;
}
```

### Navigation Update

Add to sidebar navigation in `apps/web/modules/saas/shared/components/SidebarNavigation.tsx`:

```tsx
{ href: "/reports", label: "Reports", icon: BarChart3 }
```

## Dependencies

- Story 4.6: tripAnalysis data structure
- Story 4.7: ProfitabilityIndicator component
- Story 6.1: Quotes list table patterns

## Constraints

- Must respect multi-tenancy (organizationId filtering)
- Aggregate queries should be performant
- Reuse existing UI patterns from quotes/invoices

## Definition of Done

- [ ] API endpoint created and tested
- [ ] Reports page accessible from navigation
- [ ] Summary cards display correct aggregations
- [ ] Filters work correctly
- [ ] Grouping options functional
- [ ] Profitability indicators consistent with other screens
- [ ] Translations added (EN/FR)
- [ ] Unit tests passing
- [ ] API tests passing
- [ ] E2E tests passing
- [ ] Code reviewed
