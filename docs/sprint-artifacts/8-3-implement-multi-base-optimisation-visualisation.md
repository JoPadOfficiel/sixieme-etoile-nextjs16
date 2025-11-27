# Story 8.3: Implement Multi-Base Optimisation & Visualisation

**Epic:** Epic 8 – Dispatch & Strategic Optimisation  
**Status:** done  
**Created:** 2025-11-27  
**Priority:** High

---

## User Story

**As an** operations lead,  
**I want** the dispatch engine to simulate the approach–service–return loop from multiple bases and visualize them on the map,  
**So that** I can pick assignments that minimise deadhead cost and preserve profit with full visual context.

---

## Description

Enhance the Dispatch screen to provide visual comparison of multi-base options. When a dispatcher opens the Assignment Drawer, the map should show:

1. **Candidate bases as distinct markers** - Differentiate candidate bases from other operating bases
2. **Route visualization** - Show approach (base→pickup), service (pickup→dropoff), and return (dropoff→base) segments
3. **Interactive preview** - Hovering over a candidate in the drawer previews its route on the map
4. **Cost comparison** - Display total internal cost and margin for each base option

This story builds on the existing `vehicle-selection.ts` service (Story 4.5) and the Assignment Drawer (Story 8.2) to add the visual layer that helps dispatchers make informed decisions.

### Key Features

1. **Enhanced DispatchMap** - Accept candidate bases and show route segments
2. **Route Polylines** - Three distinct segments with color coding (approach=gray, service=blue, return=gray dashed)
3. **Candidate Base Markers** - Visual distinction between candidate bases and other bases
4. **Hover Preview** - Real-time route preview when hovering candidates in drawer
5. **Click-to-Select** - Click base marker on map to select corresponding candidate

---

## Acceptance Criteria

### AC1: Candidate Bases Display on Map

```gherkin
Given a mission with multiple feasible bases/vehicles
When I open the assignment drawer
Then the map shows candidate bases as distinct markers (e.g., blue pins with vehicle icon)
And non-candidate bases are shown with muted styling (gray pins)
And each candidate marker shows a tooltip with base name and distance
```

### AC2: Route Preview on Hover

```gherkin
Given the assignment drawer is open with candidates
When I hover over a candidate row in the drawer
Then the map highlights that candidate's base marker
And shows a preview of the approach route (base → pickup) as a dashed gray line
And the preview disappears when I stop hovering
```

### AC3: Full Route Display for Selected Candidate

```gherkin
Given I have selected a candidate in the assignment drawer
When I view the map
Then I see three route segments:
  - Approach: gray dashed polyline from base to pickup
  - Service: blue solid polyline from pickup to dropoff (existing)
  - Return: gray dashed polyline from dropoff back to base
And the map auto-fits to show all three segments
```

### AC4: Cost Comparison Visualization

```gherkin
Given multiple candidates in the assignment drawer
When I view the candidates list
Then each candidate shows:
  - Total internal cost (EUR) prominently displayed
  - Cost breakdown tooltip (approach + service + return)
  - Margin comparison indicator (vs best option)
And candidates are sortable by total cost
```

### AC5: Map-to-Drawer Interaction

```gherkin
Given candidate bases are displayed on the map
When I click on a candidate base marker
Then the corresponding candidate is selected in the drawer
And the candidate row scrolls into view if not visible
And the full route is displayed on the map
```

### AC6: Multi-Base Evaluation Data in API

```gherkin
Given the GET /missions/:id/candidates endpoint
When I fetch candidates for a mission
Then each candidate includes:
  - baseLatitude and baseLongitude for map positioning
  - Segment distances and durations (approach, service, return)
  - Total internal cost breakdown
And the response includes all candidates that passed the Haversine filter
```

### AC7: Performance and UX

```gherkin
Given the dispatch map with candidates
When routes are being loaded or updated
Then I see a loading indicator on the map
And route updates complete within 200ms
And the map does not flicker or reset zoom unexpectedly
```

### AC8: Empty State Handling

```gherkin
Given a mission where no candidates pass the filters
When I view the map
Then I see the mission route (pickup → dropoff) only
And a message indicates "No candidate bases within range"
And the map shows all operating bases in muted style
```

---

## Technical Implementation

### API Changes

```typescript
// packages/api/src/routes/vtc/missions.ts
// Enhance GET /missions/:id/candidates response

interface AssignmentCandidate {
  // Existing fields...
  vehicleId: string;
  vehicleName: string;
  vehicleCategory: { id: string; name: string; code: string };
  baseId: string;
  baseName: string;
  baseDistanceKm: number;

  // NEW: Base coordinates for map visualization
  baseLatitude: number;
  baseLongitude: number;

  // Existing routing data
  driverId: string | null;
  driverName: string | null;
  driverLicenses: string[];
  flexibilityScore: number;
  scoreBreakdown: { ... };
  compliance: { status: "OK" | "WARNING" | "VIOLATION"; warnings: string[] };
  estimatedCost: {
    approach: number;
    service: number;
    return: number;
    total: number;
  };
  routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";

  // NEW: Segment details for route visualization
  segments: {
    approach: {
      distanceKm: number;
      durationMinutes: number;
      // Polyline coordinates (optional, for Google API routes)
      polyline?: string; // Encoded polyline
    };
    service: {
      distanceKm: number;
      durationMinutes: number;
      polyline?: string;
    };
    return: {
      distanceKm: number;
      durationMinutes: number;
      polyline?: string;
    };
  };
}
```

### Files to Create/Modify

```
apps/web/modules/saas/dispatch/
├── components/
│   ├── DispatchMap.tsx              # MODIFY: Add candidate bases, route segments
│   ├── CandidateBaseMarker.tsx      # CREATE: Custom marker for candidate bases
│   ├── RouteSegments.tsx            # CREATE: Polyline components for A/B/C segments
│   ├── CandidateRow.tsx             # MODIFY: Add onHover callback
│   ├── AssignmentDrawer.tsx         # MODIFY: Pass hover/select state to parent
│   └── DispatchPage.tsx             # MODIFY: Coordinate map-drawer state
├── hooks/
│   ├── useAssignmentCandidates.ts   # MODIFY: Include base coordinates
│   └── useRouteVisualization.ts     # CREATE: Manage route display state
├── types/
│   └── assignment.ts                # MODIFY: Add segment types
└── utils/
    └── route-colors.ts              # CREATE: Route color constants
```

### Component Structure

```tsx
// DispatchMap.tsx - Enhanced with candidate visualization
interface DispatchMapProps {
  mission: MissionDetail | null;
  bases: OperatingBase[];
  isLoading: boolean;
  // NEW props for multi-base visualization
  candidateBases?: CandidateBase[];
  selectedCandidateId?: string | null;
  hoveredCandidateId?: string | null;
  onCandidateSelect?: (candidateId: string) => void;
}

interface CandidateBase {
  vehicleId: string;
  baseId: string;
  baseName: string;
  latitude: number;
  longitude: number;
  isSelected: boolean;
  estimatedCost: number;
  segments: {
    approach: RouteSegment;
    service: RouteSegment;
    return: RouteSegment;
  };
}

interface RouteSegment {
  distanceKm: number;
  durationMinutes: number;
  polyline?: string;
}
```

```tsx
// RouteSegments.tsx - Polyline visualization
interface RouteSegmentsProps {
  pickup: google.maps.LatLngLiteral;
  dropoff: google.maps.LatLngLiteral;
  base?: google.maps.LatLngLiteral;
  showApproach?: boolean;
  showReturn?: boolean;
  isPreview?: boolean; // Lighter styling for hover preview
}

const ROUTE_COLORS = {
  approach: { stroke: "#6B7280", dash: [4, 4] }, // Gray dashed
  service: { stroke: "#2563EB", dash: null }, // Blue solid
  return: { stroke: "#6B7280", dash: [4, 4] }, // Gray dashed
  preview: { stroke: "#9CA3AF", dash: [2, 2] }, // Light gray for hover
};
```

### State Management

```tsx
// DispatchPage.tsx - Coordinate state between drawer and map
const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(
  null
);
const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
  null
);

// Transform candidates for map
const candidateBases = useMemo(() => {
  if (!candidatesData?.candidates) return [];
  return candidatesData.candidates.map((c) => ({
    vehicleId: c.vehicleId,
    baseId: c.baseId,
    baseName: c.baseName,
    latitude: c.baseLatitude,
    longitude: c.baseLongitude,
    isSelected: c.vehicleId === selectedCandidateId,
    estimatedCost: c.estimatedCost.total,
    segments: c.segments,
  }));
}, [candidatesData, selectedCandidateId]);
```

### Translations to Add

```json
// apps/web/content/locales/en/saas.json
{
  "dispatch": {
    "map": {
      "candidateBase": "Candidate Base",
      "approachRoute": "Approach",
      "serviceRoute": "Service",
      "returnRoute": "Return",
      "totalCost": "Total Cost",
      "noCandidates": "No candidate bases within range",
      "loadingRoutes": "Loading routes...",
      "clickToSelect": "Click to select this candidate"
    },
    "assignment": {
      "costComparison": {
        "best": "Best option",
        "difference": "+{{amount}} vs best",
        "segments": {
          "approach": "Approach (base → pickup)",
          "service": "Service (pickup → dropoff)",
          "return": "Return (dropoff → base)"
        }
      }
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

```typescript
// apps/web/modules/saas/dispatch/components/__tests__/RouteSegments.test.tsx
describe("RouteSegments", () => {
  it("renders service segment by default", () => {});
  it("renders approach segment when showApproach is true", () => {});
  it("renders return segment when showReturn is true", () => {});
  it("uses preview styling when isPreview is true", () => {});
  it("applies correct colors to each segment type", () => {});
});

// apps/web/modules/saas/dispatch/components/__tests__/CandidateBaseMarker.test.tsx
describe("CandidateBaseMarker", () => {
  it("renders with candidate styling", () => {});
  it("shows tooltip with base name and cost", () => {});
  it("highlights when selected", () => {});
  it("calls onSelect when clicked", () => {});
});

// apps/web/modules/saas/dispatch/components/__tests__/DispatchMap.test.tsx
describe("DispatchMap with candidates", () => {
  it("renders candidate bases when provided", () => {});
  it("differentiates candidate bases from other bases", () => {});
  it("shows approach route on hover", () => {});
  it("shows full route (A/B/C) when candidate selected", () => {});
  it("auto-fits bounds to include all route segments", () => {});
});

// apps/web/modules/saas/dispatch/hooks/__tests__/useRouteVisualization.test.ts
describe("useRouteVisualization", () => {
  it("returns null segments when no candidate selected", () => {});
  it("returns approach segment for hovered candidate", () => {});
  it("returns all segments for selected candidate", () => {});
  it("clears preview when hover ends", () => {});
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/dispatch-multi-base.spec.ts
describe("Dispatch Multi-Base Visualization", () => {
  beforeEach(async () => {
    await page.goto("/app/test-org/dispatch");
    await page.click('[data-testid="mission-row"]:first-child');
    await page.click('[data-testid="assign-button"]');
  });

  it("shows candidate bases on map when drawer opens", async () => {
    await expect(
      page.locator('[data-testid="candidate-base-marker"]')
    ).toHaveCount.greaterThan(0);
  });

  it("previews route on candidate hover", async () => {
    await page.hover('[data-testid="candidate-row"]:first-child');
    await expect(
      page.locator('[data-testid="approach-route-preview"]')
    ).toBeVisible();
  });

  it("shows full route when candidate selected", async () => {
    await page.click('[data-testid="candidate-row"]:first-child');
    await expect(page.locator('[data-testid="approach-route"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-route"]')).toBeVisible();
    await expect(page.locator('[data-testid="return-route"]')).toBeVisible();
  });

  it("selects candidate when clicking base marker on map", async () => {
    await page.click('[data-testid="candidate-base-marker"]:first-child');
    await expect(
      page.locator('[data-testid="candidate-row"].selected')
    ).toBeVisible();
  });

  it("shows cost comparison in candidate list", async () => {
    await expect(
      page.locator('[data-testid="cost-comparison"]').first()
    ).toContainText("€");
  });
});
```

### API Tests (curl)

```bash
# Get candidates with base coordinates
curl -X GET "http://localhost:3000/api/vtc/missions/mission-id-123/candidates" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Expected response includes baseLatitude, baseLongitude, segments:
# {
#   "candidates": [
#     {
#       "vehicleId": "vehicle-1",
#       "baseName": "Paris Base",
#       "baseLatitude": 48.8800,
#       "baseLongitude": 2.3800,
#       "segments": {
#         "approach": { "distanceKm": 5.2, "durationMinutes": 12 },
#         "service": { "distanceKm": 25.0, "durationMinutes": 35 },
#         "return": { "distanceKm": 28.0, "durationMinutes": 40 }
#       },
#       "estimatedCost": { "approach": 15.50, "service": 45.00, "return": 18.00, "total": 78.50 }
#     }
#   ]
# }

# Verify with MCP @postgres_vtc_sixiemme_etoile
# Check that OperatingBase has latitude/longitude populated
```

---

## Dependencies

| Dependency                         | Type  | Status  |
| ---------------------------------- | ----- | ------- |
| Story 4.5 - Multi-Base Selection   | Story | ✅ Done |
| Story 8.1 - Dispatch Screen Layout | Story | ✅ Done |
| Story 8.2 - Assignment Drawer      | Story | ✅ Done |
| Story 5.1 - Fleet Models & UI      | Story | ✅ Done |
| vehicle-selection.ts service       | Code  | ✅ Done |
| Google Maps API Integration        | Infra | ✅ Done |
| OperatingBase with coordinates     | Data  | ✅ Done |

---

## Definition of Done

- [x] API endpoint enhanced with baseLatitude, baseLongitude, segments
- [x] DispatchMap shows candidate bases with distinct markers
- [x] Route segments (approach/service/return) render correctly
- [x] Hover preview shows approach route
- [x] Selected candidate shows full A/B/C route
- [x] Click on map marker selects candidate in drawer
- [x] Cost comparison visible in candidate list
- [x] Map auto-fits to show all route segments
- [x] Loading states implemented
- [x] Empty state handled gracefully
- [x] Translations added (en/fr)
- [x] Unit tests passing (Vitest)
- [x] E2E tests passing (Playwright MCP)
- [x] API endpoints tested with curl
- [x] Database state verified via MCP
- [x] Code reviewed and merged

---

## Notes

- **Polyline Encoding**: If Google Maps API returns encoded polylines, decode them for display. For Haversine estimates, draw straight lines between points.
- **Performance**: Only fetch/display routes for visible candidates. Use debouncing for hover events.
- **Mobile**: On smaller screens, the map may need to be collapsible or in a separate tab.
- **Caching**: Consider caching route calculations to avoid repeated API calls for the same base-pickup-dropoff combinations.
- **Color Accessibility**: Ensure route colors have sufficient contrast and use patterns (dashed vs solid) in addition to color.
