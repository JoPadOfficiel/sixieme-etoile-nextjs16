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

- [x] Create `GET /api/vtc/pricing/routes/coverage` endpoint
- [x] Return: totalZones, activeZones, totalPossibleRoutes, configuredRoutes, activeRoutes, coveragePercent
- [x] Include breakdown by vehicle category
- [x] Add tests for coverage calculation

### Task 2: Matrix Data API

- [x] Create `GET /api/vtc/pricing/routes/matrix` endpoint
- [x] Return zone list and matrix structure with route info per cell
- [x] Optimize for performance (limit to active zones)
- [x] Add tests for matrix generation

### Task 3: Enhanced Filters UI

- [x] Add filter bar component to Routes page (existing RoutesTable)
- [x] Implement From Zone select filter (existing)
- [x] Implement To Zone select filter (existing)
- [x] Implement Vehicle Category select filter (existing)
- [x] Implement Status toggle filter (existing)
- [x] Persist filters in URL query params (existing)

### Task 4: Coverage Statistics Card

- [x] Create CoverageStatsCard component
- [x] Display total/active routes count
- [x] Display coverage percentage with progress bar
- [x] Display zones count

### Task 5: Coverage Matrix Component

- [x] Create CoverageMatrix component
- [x] Render zone×zone grid
- [x] Color-code cells: green (has route), red/empty (missing), gray (same zone)
- [x] Show price on hover/click
- [x] Handle click on empty cell to open route creation

### Task 6: PRD Scenario Detection

- [x] Add `scenarioType` field to route display
- [x] Detect Intra-Zone (fromZone === toZone)
- [x] Detect Radial (Paris ↔ Airport)
- [x] Detect Circular Suburban (Suburb ↔ Suburb)
- [x] Add scenario badges to matrix

### Task 7: View Toggle

- [x] Add List/Matrix view toggle button (Tabs component)
- [x] View preference in state (localStorage optional for future)
- [x] Smooth transition between views

### Task 8: Translations

- [x] Add French translations for new UI elements
- [x] Add English translations

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

| File                                                             | Description                       | Status  |
| ---------------------------------------------------------------- | --------------------------------- | ------- |
| `packages/api/src/routes/vtc/routes-coverage.ts`                 | Coverage and matrix API endpoints | ✅ Done |
| `apps/web/modules/saas/pricing/components/CoverageStatsCard.tsx` | Coverage statistics card          | ✅ Done |
| `apps/web/modules/saas/pricing/components/CoverageMatrix.tsx`    | Zone×Zone matrix view             | ✅ Done |
| `packages/api/src/routes/vtc/__tests__/routes-coverage.test.ts`  | 23 unit tests for coverage logic  | ✅ Done |

### Modified Files

| File                                                       | Change                          | Status  |
| ---------------------------------------------------------- | ------------------------------- | ------- |
| `apps/web/app/.../settings/pricing/routes/page.tsx`        | Add filters, stats, matrix view | ✅ Done |
| `apps/web/modules/saas/pricing/components/RouteDrawer.tsx` | Add prefill zone props          | ✅ Done |
| `apps/web/modules/saas/pricing/components/RouteForm.tsx`   | Add default zone props          | ✅ Done |
| `apps/web/modules/saas/pricing/components/index.ts`        | Export new components           | ✅ Done |
| `packages/api/src/routes/vtc/router.ts`                    | Add coverage routes             | ✅ Done |
| `packages/i18n/translations/en.json`                       | Add translations                | ✅ Done |
| `packages/i18n/translations/fr.json`                       | Add translations                | ✅ Done |

## Implementation Notes

### ✅ Completed Features

- **Coverage Statistics API** (`GET /api/vtc/pricing/routes/coverage`)

  - Returns total zones, configured routes, active routes, and coverage percentage
  - Includes breakdown by vehicle category
  - Fully tested with unit tests

- **Matrix Data API** (`GET /api/vtc/pricing/routes/matrix`)

  - Returns zone×zone grid with route details
  - Supports optional vehicleCategoryId filter
  - Detects and categorizes PRD scenarios (Intra-Zone, Radial, Circular Suburban, Versailles)
  - Handles bidirectional routes correctly

- **UI Components**

  - `CoverageStatsCard`: Displays coverage statistics with progress bar
  - `CoverageMatrix`: Interactive zone×zone grid with scenario badges
  - List/Matrix view toggle using Tabs component
  - Quick route creation from empty matrix cells (prefill zones)

- **PRD Scenario Detection**

  - Intra-Zone: Same zone (fromZoneId === toZoneId)
  - Radial: City center ↔ Airport/Station (Paris ↔ CDG, etc.)
  - Circular Suburban: Suburb ↔ Suburb (92, 93, 94, 95, IDF)
  - Versailles: Special Paris ↔ Versailles exception

- **Translations**
  - English and French translations for all new UI elements
  - Scenario names, matrix legend, coverage labels

### 📊 Test Coverage

- **23 unit tests** covering:
  - Scenario detection (Intra-Zone, Radial, Versailles, Circular Suburban)
  - Coverage statistics calculation
  - Matrix structure validation
  - PRD scenario AC5-AC7 validation
  - All tests passing ✅

### 🎯 Acceptance Criteria Status

- **AC1** ✅ Advanced filters on Routes screen (existing + new view toggle)
- **AC2** ✅ Filter by From Zone (existing)
- **AC3** ✅ Coverage statistics with summary
- **AC4** ✅ Coverage matrix view with zone×zone grid
- **AC5** ✅ PRD scenario highlighting with badges
- **AC6** ✅ Quick route creation from empty cells (prefill zones)

### 🚀 Performance Considerations

- Matrix limited to active zones only
- Bidirectional routes marked once (not duplicated)
- Empty diagonal (same zone) visually distinct from missing routes
- Coverage stats computed on-demand (can be cached in future)
- Scenario detection uses efficient string matching

## Related PRD Sections

- **FR7-FR12:** Grid configuration and dual pricing modes
- **FR37:** Administration of rate grids
- **Appendix A:** Zoning scenarios (Intra-Zone Central, Radial Transfers, Circular Suburban, Versailles)
