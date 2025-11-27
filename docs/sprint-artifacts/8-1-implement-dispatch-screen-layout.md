# Story 8.1: Implement Dispatch Screen Layout (Missions List + Map + Transparency)

**Epic:** Epic 8 – Dispatch & Strategic Optimisation  
**Status:** ready-for-dev  
**Created:** 2025-11-27  
**Priority:** High

---

## User Story

**As a** dispatcher,  
**I want** a dedicated Dispatch screen with mission list, map and transparency panel,  
**So that** I can take assignment decisions with full context in a single view.

---

## Description

Implement the core Dispatch screen layout following UX Spec 8.8. The screen provides a consolidated view for dispatchers to manage missions (accepted quotes with future pickup dates), visualize routes on a map, and see trip transparency data.

The layout consists of three zones:

1. **Left panel** – Missions list with filters (status, date/time, vehicle category, partner/private)
2. **Right-top panel** – Google Map showing the selected mission's route and relevant operating bases
3. **Right-bottom panel** – TripTransparencyPanel + VehicleAssignmentPanel showing current assignment, profitability and compliance

### Key Features

- Missions are derived from `Quote` records with `status = ACCEPTED` and `pickupAt` in the future
- Reuse existing `TripTransparencyPanel` component for cost/segment breakdown
- Reuse existing `ProfitabilityIndicator` component for margin badges
- Dispatch-specific badges: Profitability (green/orange/red), Compliance (OK/Warning/Violation), Assignment (Assigned/Unassigned)

---

## Acceptance Criteria

### AC1: Dispatch Screen Layout

```gherkin
Given I navigate to `/dashboard/[organizationSlug]/dispatch`
When the page loads
Then I see a 3-zone layout:
  - Left: missions list panel (40% width on desktop)
  - Right-top: Google Map panel (60% width, 50% height)
  - Right-bottom: TripTransparencyPanel + VehicleAssignmentPanel (60% width, 50% height)
And the layout is responsive (stacks on smaller screens)
```

### AC2: Missions List Display

```gherkin
Given the missions list panel
When I view it
Then I see a DataTable with columns:
  - Time window (pickupAt formatted as date + time)
  - Route (pickup → dropoff addresses, truncated)
  - Client (contact displayName with Partner/Private badge)
  - Vehicle/Driver (assigned vehicle + driver name, or "Unassigned")
  - Dispatch Badges (profitability, compliance, assignment icons)
And the table has sticky header and row hover states
```

### AC3: Missions List Filters

```gherkin
Given the filters toolbar above the missions list
When I interact with filters
Then I can filter by:
  - Date range (from/to date pickers)
  - Vehicle category (dropdown with all categories)
  - Client type (Partner/Private/All)
And the list updates immediately when filters change
And filters are preserved in URL query params
```

### AC4: Mission Selection and Map Update

```gherkin
Given a mission in the list
When I click on the mission row
Then the row is highlighted as selected
And the Google Map updates to show:
  - Pickup marker (green pin)
  - Dropoff marker (red pin)
  - Route polyline between pickup and dropoff
  - Operating bases markers (blue pins) within reasonable distance
And the map auto-fits to show all relevant markers
```

### AC5: Trip Transparency Panel Display

```gherkin
Given a mission is selected
When I view the right-bottom panel
Then I see the TripTransparencyPanel with:
  - Summary cards (distance, duration, internal cost, margin %)
  - Tabs: Overview, Route (segments A/B/C), Costs breakdown
  - Profitability indicator with tooltip
And the data comes from the stored tripAnalysis JSON of the quote
```

### AC6: Vehicle Assignment Panel Display

```gherkin
Given a mission is selected
When I view the VehicleAssignmentPanel below TripTransparencyPanel
Then I see:
  - Current assignment status (Assigned/Unassigned)
  - If assigned: Vehicle name, category, base name
  - If assigned: Driver name, license categories
  - "Assign" or "Change Assignment" button (disabled for now, Story 8.2)
```

### AC7: Dispatch Badges

```gherkin
Given the missions list
When I view the Dispatch Badges column
Then each mission shows 3 compact badges:
  - Profitability: green (TrendingUp), orange (AlertTriangle), red (TrendingDown)
  - Compliance: green (ShieldCheck), amber (AlertTriangle), red (XCircle)
  - Assignment: blue (UserCheck) if assigned, gray (UserX) if unassigned
And hovering each badge shows a tooltip with details
```

### AC8: Empty State

```gherkin
Given no missions match the current filters
When I view the missions list
Then I see an empty state with:
  - Illustration or icon
  - Message "No missions found"
  - Suggestion to adjust filters
```

### AC9: Loading States

```gherkin
Given the dispatch page is loading
When data is being fetched
Then I see:
  - Skeleton loaders in the missions list
  - Map placeholder with loading spinner
  - Skeleton in the transparency panel
```

---

## Technical Implementation

### Files to Create

```
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/dispatch/
├── page.tsx                    # Main dispatch page
├── layout.tsx                  # Optional layout wrapper

apps/web/modules/saas/dispatch/
├── components/
│   ├── DispatchPage.tsx        # Main dispatch layout component
│   ├── MissionsList.tsx        # Left panel - missions table
│   ├── MissionsFilters.tsx     # Filters toolbar
│   ├── MissionRow.tsx          # Individual mission row
│   ├── DispatchBadges.tsx      # Profitability/Compliance/Assignment badges
│   ├── DispatchMap.tsx         # Google Map component
│   ├── VehicleAssignmentPanel.tsx  # Assignment info panel
│   └── index.ts                # Exports
├── hooks/
│   ├── useMissions.ts          # Fetch missions (accepted quotes)
│   ├── useOperatingBases.ts    # Fetch bases for map markers
│   └── index.ts
├── types/
│   ├── mission.ts              # Mission type definitions
│   └── index.ts
└── index.ts
```

### API Endpoints to Create

```typescript
// packages/api/src/routes/vtc/missions.ts

// GET /api/vtc/missions
// Returns accepted quotes with pickupAt in the future
interface GetMissionsQuery {
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  vehicleCategoryId?: string;
  clientType?: "PARTNER" | "PRIVATE" | "ALL";
  page?: number;
  limit?: number;
}

interface MissionListItem {
  id: string;
  quoteId: string;
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  contact: {
    id: string;
    displayName: string;
    isPartner: boolean;
  };
  vehicleCategory: {
    id: string;
    name: string;
    code: string;
  };
  assignment: {
    vehicleId: string | null;
    vehicleName: string | null;
    baseName: string | null;
    driverId: string | null;
    driverName: string | null;
  } | null;
  profitability: {
    marginPercent: number | null;
    level: "green" | "orange" | "red";
  };
  compliance: {
    status: "OK" | "WARNING" | "VIOLATION";
    warnings: string[];
  };
}

// GET /api/vtc/missions/[id]
// Returns full mission details with tripAnalysis
interface MissionDetail extends MissionListItem {
  tripAnalysis: TripAnalysis | null;
  appliedRules: AppliedRule[] | null;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
}
```

### Component Structure

```tsx
// DispatchPage.tsx - Main layout
<div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
  {/* Left Panel - Missions List */}
  <div className="w-2/5 flex flex-col">
    <MissionsFilters />
    <MissionsList
      selectedMissionId={selectedId}
      onSelectMission={setSelectedId}
    />
  </div>

  {/* Right Panel - Map + Transparency */}
  <div className="w-3/5 flex flex-col gap-4">
    {/* Map */}
    <div className="h-1/2">
      <DispatchMap mission={selectedMission} bases={bases} />
    </div>

    {/* Transparency + Assignment */}
    <div className="h-1/2 overflow-auto">
      <TripTransparencyPanel
        pricingResult={missionToPricingResult(selectedMission)}
        isLoading={isLoading}
      />
      <VehicleAssignmentPanel
        assignment={selectedMission?.assignment}
        onAssign={() => {
          /* Story 8.2 */
        }}
      />
    </div>
  </div>
</div>
```

### Translations to Add

```json
// apps/web/content/locales/en/saas.json
{
  "dispatch": {
    "title": "Dispatch",
    "missions": {
      "title": "Missions",
      "empty": {
        "title": "No missions found",
        "description": "Adjust your filters or wait for new accepted quotes"
      },
      "columns": {
        "timeWindow": "Time",
        "route": "Route",
        "client": "Client",
        "vehicleDriver": "Vehicle / Driver",
        "badges": "Status"
      }
    },
    "filters": {
      "dateFrom": "From",
      "dateTo": "To",
      "vehicleCategory": "Vehicle Category",
      "clientType": "Client Type",
      "all": "All",
      "partner": "Partner",
      "private": "Private"
    },
    "badges": {
      "profitability": {
        "profitable": "Profitable",
        "lowMargin": "Low margin",
        "loss": "Loss"
      },
      "compliance": {
        "ok": "Compliant",
        "warning": "Warning",
        "violation": "Violation"
      },
      "assignment": {
        "assigned": "Assigned",
        "unassigned": "Unassigned"
      }
    },
    "assignment": {
      "title": "Assignment",
      "vehicle": "Vehicle",
      "driver": "Driver",
      "base": "Base",
      "unassigned": "Not yet assigned",
      "assignButton": "Assign",
      "changeButton": "Change Assignment"
    },
    "map": {
      "loading": "Loading map...",
      "pickup": "Pickup",
      "dropoff": "Dropoff",
      "base": "Base"
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

```typescript
// apps/web/modules/saas/dispatch/components/__tests__/DispatchBadges.test.tsx
describe("DispatchBadges", () => {
  it("renders green profitability badge when margin >= 20%", () => {});
  it("renders orange profitability badge when 0% <= margin < 20%", () => {});
  it("renders red profitability badge when margin < 0%", () => {});
  it("renders compliance OK badge when no violations", () => {});
  it("renders compliance warning badge when warnings exist", () => {});
  it("renders compliance violation badge when violations exist", () => {});
  it("renders assigned badge when vehicle/driver assigned", () => {});
  it("renders unassigned badge when no assignment", () => {});
  it("shows tooltip on hover", () => {});
});

// apps/web/modules/saas/dispatch/components/__tests__/MissionsList.test.tsx
describe("MissionsList", () => {
  it("renders missions in table format", () => {});
  it("highlights selected mission row", () => {});
  it("calls onSelectMission when row clicked", () => {});
  it("shows empty state when no missions", () => {});
  it("shows loading skeleton when isLoading", () => {});
});

// apps/web/modules/saas/dispatch/components/__tests__/MissionsFilters.test.tsx
describe("MissionsFilters", () => {
  it("renders date range pickers", () => {});
  it("renders vehicle category dropdown", () => {});
  it("renders client type filter", () => {});
  it("calls onFilterChange when filter changes", () => {});
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/cypress/e2e/dispatch.cy.ts
describe("Dispatch Screen", () => {
  beforeEach(() => {
    cy.login("admin@example.com");
    cy.visit("/app/test-org/dispatch");
  });

  it("displays 3-zone layout", () => {
    cy.get('[data-testid="missions-list"]').should("be.visible");
    cy.get('[data-testid="dispatch-map"]').should("be.visible");
    cy.get('[data-testid="trip-transparency-panel"]').should("be.visible");
  });

  it("filters missions by date range", () => {
    cy.get('[data-testid="filter-date-from"]').type("2025-11-28");
    cy.get('[data-testid="missions-list"]').should(
      "contain",
      "filtered results"
    );
  });

  it("selects mission and updates map", () => {
    cy.get('[data-testid="mission-row"]').first().click();
    cy.get('[data-testid="mission-row"]')
      .first()
      .should("have.class", "selected");
    cy.get('[data-testid="dispatch-map"]').should("contain.html", "polyline");
  });

  it("shows trip transparency for selected mission", () => {
    cy.get('[data-testid="mission-row"]').first().click();
    cy.get('[data-testid="trip-transparency-panel"]').should("contain", "km");
    cy.get('[data-testid="trip-transparency-panel"]').should("contain", "€");
  });
});
```

### API Tests (curl)

```bash
# Get missions list
curl -X GET "http://localhost:3000/api/vtc/missions?dateFrom=2025-11-27&clientType=ALL" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Get mission detail
curl -X GET "http://localhost:3000/api/vtc/missions/mission-id-123" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Get operating bases for map
curl -X GET "http://localhost:3000/api/vtc/operating-bases" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"
```

---

## Dependencies

| Dependency                          | Type        | Status  |
| ----------------------------------- | ----------- | ------- |
| Story 4.6 - Shadow Calculation      | Story       | ✅ Done |
| Story 4.7 - Profitability Indicator | Story       | ✅ Done |
| Story 5.1 - Fleet Models & UI       | Story       | ✅ Done |
| Story 5.2 - Drivers & RSE Rules     | Story       | ✅ Done |
| Story 6.7 - TripTransparencyPanel   | Story       | ✅ Done |
| Google Maps API Integration         | Integration | ✅ Done |
| Quote model with tripAnalysis       | Data Model  | ✅ Done |

---

## Definition of Done

- [ ] Dispatch page route created and accessible
- [ ] 3-zone layout implemented and responsive
- [ ] Missions list displays accepted quotes with future pickupAt
- [ ] Filters work correctly (date, category, client type)
- [ ] Mission selection updates map and transparency panel
- [ ] Dispatch badges display correctly
- [ ] TripTransparencyPanel reused successfully
- [ ] VehicleAssignmentPanel shows current assignment
- [ ] Empty and loading states implemented
- [ ] Translations added (en/fr)
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] API endpoints tested with curl
- [ ] Code reviewed and merged

---

## Notes

- **Mission vs Quote**: For MVP, missions are simply accepted quotes with `pickupAt` in the future. A dedicated `Mission` model may be added later if needed.
- **Assignment Storage**: Currently, vehicle/driver assignment is not stored in the Quote model. For this story, we'll show "Unassigned" for all missions. Story 8.2 will add the assignment drawer and storage.
- **Map Performance**: Use marker clustering if many bases exist. Limit bases shown to those within reasonable distance of the mission route.
