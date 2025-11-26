# Story 3.6: Visualise Grid Coverage and Gaps

Status: done
Completed: 2025-01-14
Branch: feature/3-6-grid-coverage-visualization

## Story

**As an** admin,  
**I want** to see which zone pairs and scenarios are covered by grids,  
**So that** I can identify missing coverage and prioritise new contracts.

## Acceptance Criteria

### AC1: Advanced Filters on Routes Screen

- **Given** the Routes/Grid screen (`/settings/pricing/routes`)
- **When** I open the filters panel
- **Then** I can filter by: From Zone, To Zone, Vehicle Category, Status (active/inactive)

### AC2: Filter by From Zone

- **Given** the Routes table with filters applied
- **When** I select a specific From Zone
- **Then** only routes starting from that zone are displayed

### AC3: Coverage Statistics

- **Given** the Routes screen
- **When** I view the coverage statistics
- **Then** I see a summary showing: total routes, active routes, zones covered, and coverage percentage

### AC4: Coverage Matrix View

- **Given** the Routes screen with a "Coverage Matrix" view toggle
- **When** I switch to matrix view
- **Then** I see a zone×zone grid where cells indicate if a route exists (with price) or is missing

### AC5: PRD Scenario Highlighting

- **Given** the matrix or list view
- **When** a route matches a PRD scenario (Intra-Zone, Radial, Circular Suburban)
- **Then** it is highlighted with a badge or icon indicating the scenario type

### AC6: Quick Route Creation from Matrix

- **Given** the coverage matrix
- **When** I click on an empty cell (missing route)
- **Then** I can quickly create a new route for that zone pair

## Technical Tasks

### Task 1: Coverage Statistics API

- [ ] Create `GET /api/vtc/pricing/routes/coverage` endpoint
- [ ] Return: totalZones, activeZones, totalPossibleRoutes, configuredRoutes, activeRoutes, coveragePercent
- [ ] Include breakdown by vehicle category
- [ ] Add tests for coverage calculation

### Task 2: Matrix Data API

- [ ] Create `GET /api/vtc/pricing/routes/matrix` endpoint
- [ ] Return zone list and matrix structure with route info per cell
- [ ] Optimize for performance (limit to active zones)
- [ ] Add tests for matrix generation

### Task 3: Enhanced Filters UI

- [ ] Add filter bar component to Routes page
- [ ] Implement From Zone select filter
- [ ] Implement To Zone select filter
- [ ] Implement Vehicle Category select filter
- [ ] Implement Status toggle filter
- [ ] Persist filters in URL query params

### Task 4: Coverage Statistics Card

- [ ] Create CoverageStatsCard component
- [ ] Display total/active routes count
- [ ] Display coverage percentage with progress bar
- [ ] Display zones count

### Task 5: Coverage Matrix Component

- [ ] Create CoverageMatrix component
- [ ] Render zone×zone grid
- [ ] Color-code cells: green (has route), red/empty (missing), gray (same zone)
- [ ] Show price on hover/click
- [ ] Handle click on empty cell to open route creation

### Task 6: PRD Scenario Detection

- [ ] Add `scenarioType` field to route display
- [ ] Detect Intra-Zone (fromZone === toZone)
- [ ] Detect Radial (Paris ↔ Airport)
- [ ] Detect Circular Suburban (Suburb ↔ Suburb)
- [ ] Add scenario badges to table and matrix

### Task 7: View Toggle

- [ ] Add List/Matrix view toggle button
- [ ] Persist view preference in localStorage
- [ ] Smooth transition between views

### Task 8: Translations

- [ ] Add French translations for new UI elements
- [ ] Add English translations

## Data Types

### Coverage Statistics Response

```typescript
interface CoverageStats {
  totalZones: number;
  activeZones: number;
  totalPossibleRoutes: number; // activeZones × activeZones
  configuredRoutes: number;
  activeRoutes: number;
  coveragePercent: number;
  byCategory: {
    [categoryId: string]: {
      categoryName: string;
      configured: number;
      active: number;
      total: number;
      coveragePercent: number;
    };
  };
}
```

### Matrix Response

```typescript
interface MatrixResponse {
  zones: Array<{
    id: string;
    name: string;
    code: string;
    zoneType: string;
  }>;
  matrix: {
    [fromZoneId: string]: {
      [toZoneId: string]: {
        hasRoute: boolean;
        routeId?: string;
        routeName?: string;
        price?: number;
        direction?: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
        isActive?: boolean;
        vehicleCategoryId?: string;
        vehicleCategoryName?: string;
      } | null;
    };
  };
  scenarios: {
    intraZone: string[]; // routeIds
    radial: string[];
    circularSuburban: string[];
  };
}
```

### Scenario Type Enum

```typescript
type ScenarioType =
  | "INTRA_ZONE" // Same zone (fromZone === toZone)
  | "RADIAL" // City center ↔ Airport/Station
  | "CIRCULAR_SUBURBAN" // Suburb ↔ Suburb
  | "VERSAILLES" // Special Paris ↔ Versailles
  | "STANDARD"; // Default
```

## API Contract

### GET /api/vtc/pricing/routes/coverage

Response:

```json
{
  "totalZones": 8,
  "activeZones": 6,
  "totalPossibleRoutes": 36,
  "configuredRoutes": 12,
  "activeRoutes": 10,
  "coveragePercent": 33.33,
  "byCategory": {
    "cat-berline": {
      "categoryName": "Berline",
      "configured": 8,
      "active": 7,
      "total": 36,
      "coveragePercent": 22.22
    },
    "cat-van": {
      "categoryName": "Van",
      "configured": 4,
      "active": 3,
      "total": 36,
      "coveragePercent": 11.11
    }
  }
}
```

### GET /api/vtc/pricing/routes/matrix

Query params: `?vehicleCategoryId=cat-berline` (optional filter)

Response:

```json
{
  "zones": [
    {
      "id": "zone-paris",
      "name": "Paris Center",
      "code": "PAR",
      "zoneType": "POLYGON"
    },
    {
      "id": "zone-cdg",
      "name": "CDG Airport",
      "code": "CDG",
      "zoneType": "RADIUS"
    },
    {
      "id": "zone-orly",
      "name": "Orly Airport",
      "code": "ORY",
      "zoneType": "RADIUS"
    }
  ],
  "matrix": {
    "zone-paris": {
      "zone-paris": {
        "hasRoute": true,
        "routeId": "route-1",
        "routeName": "Paris Intra-Zone",
        "price": 45.0,
        "direction": "BIDIRECTIONAL",
        "isActive": true
      },
      "zone-cdg": {
        "hasRoute": true,
        "routeId": "route-2",
        "routeName": "Paris → CDG",
        "price": 75.0,
        "direction": "BIDIRECTIONAL",
        "isActive": true
      },
      "zone-orly": {
        "hasRoute": false
      }
    },
    "zone-cdg": {
      "zone-paris": null,
      "zone-cdg": null,
      "zone-orly": {
        "hasRoute": false
      }
    }
  },
  "scenarios": {
    "intraZone": ["route-1"],
    "radial": ["route-2"],
    "circularSuburban": []
  }
}
```

## UI Components

### Filter Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│ From Zone: [All ▼]  To Zone: [All ▼]  Category: [All ▼]  [✓ Active] │
│                                                    [List] [Matrix]  │
└─────────────────────────────────────────────────────────────────────┘
```

### Coverage Stats Card

```
┌─────────────────────────────────────────────────────────────────────┐
│ Grid Coverage                                                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 12 routes configured  •  10 active  •  6 zones  •  33% coverage    │
│ [████████░░░░░░░░░░░░░░░░░░░░░░] 33%                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Coverage Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│           │ Paris  │  CDG   │  Orly  │ Versailles │                │
│───────────┼────────┼────────┼────────┼────────────┤                │
│ Paris     │  45€   │  75€   │   -    │    95€     │                │
│           │ 🔵     │ 🟢     │  ⬜    │   🟢       │                │
│───────────┼────────┼────────┼────────┼────────────┤                │
│ CDG       │  ↔     │   -    │   -    │     -      │                │
│           │        │  ⬛    │  ⬜    │    ⬜      │                │
│───────────┼────────┼────────┼────────┼────────────┤                │
│ Orly      │   -    │   -    │   -    │     -      │                │
│           │  ⬜    │  ⬜    │  ⬛    │    ⬜      │                │
└─────────────────────────────────────────────────────────────────────┘

Legend: 🟢 Active route  🔵 Intra-zone  ⬜ Missing  ⬛ Same zone  ↔ Bidirectional
```

## Test Scenarios

### Scenario 1: Filter by From Zone

```typescript
// Given routes: Paris→CDG, Paris→Orly, CDG→Orly
// When filter fromZone = "Paris"
// Then only Paris→CDG and Paris→Orly are shown
expect(filteredRoutes).toHaveLength(2);
expect(filteredRoutes.every((r) => r.fromZone.name === "Paris")).toBe(true);
```

### Scenario 2: Coverage Statistics

```typescript
// Given 3 active zones and 4 configured routes
// totalPossibleRoutes = 3 × 3 = 9
// coveragePercent = 4/9 × 100 = 44.44%
expect(stats.totalPossibleRoutes).toBe(9);
expect(stats.configuredRoutes).toBe(4);
expect(stats.coveragePercent).toBeCloseTo(44.44, 1);
```

### Scenario 3: Matrix Cell Click

```typescript
// Given matrix with empty cell Paris→Versailles
// When I click the empty cell
// Then route creation drawer opens with fromZone=Paris, toZone=Versailles prefilled
```

### Scenario 4: Scenario Detection

```typescript
// Given route with fromZoneId === toZoneId
// Then scenarioType = "INTRA_ZONE"

// Given route Paris → CDG (airport)
// Then scenarioType = "RADIAL"
```

## Dependencies

- Story 3.1: Implement PricingZone Model & Zones Editor UI ✅ Done
- Story 3.2: Implement ZoneRoute Model & Grid Routes Editor ✅ Done
- Story 3.3: Implement Excursion & Dispo Forfait Configuration ✅ Done

## Files to Create/Modify

### New Files

| File                                                             | Description                       |
| ---------------------------------------------------------------- | --------------------------------- |
| `packages/api/src/routes/vtc/routes-coverage.ts`                 | Coverage and matrix API endpoints |
| `apps/web/modules/saas/pricing/components/CoverageStatsCard.tsx` | Coverage statistics card          |
| `apps/web/modules/saas/pricing/components/CoverageMatrix.tsx`    | Zone×Zone matrix view             |
| `apps/web/modules/saas/pricing/components/RouteFilters.tsx`      | Advanced filter bar               |

### Modified Files

| File                                                | Change                          |
| --------------------------------------------------- | ------------------------------- |
| `apps/web/app/.../settings/pricing/routes/page.tsx` | Add filters, stats, matrix view |
| `packages/api/src/routes/vtc/router.ts`             | Add coverage routes             |
| `packages/i18n/translations/en.json`                | Add translations                |
| `packages/i18n/translations/fr.json`                | Add translations                |

## Dev Notes

- The matrix can get large with many zones; consider pagination or limiting to top N zones
- Bidirectional routes should show "↔" indicator and not duplicate in matrix
- Empty diagonal (same zone) should be visually distinct from missing routes
- Consider caching coverage stats as they're expensive to compute
- PRD scenario detection is heuristic; may need zone categorization in future

## Related PRD Sections

- **FR7-FR12:** Grid configuration and dual pricing modes
- **FR37:** Administration of rate grids
- **Appendix A:** Zoning scenarios (Intra-Zone Central, Radial Transfers, Circular Suburban, Versailles)
