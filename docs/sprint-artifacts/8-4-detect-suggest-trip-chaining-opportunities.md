# Story 8.4: Detect & Suggest Trip Chaining Opportunities

**Epic:** Epic 8 – Dispatch & Strategic Optimisation  
**Status:** in-progress  
**Created:** 2025-11-27  
**Updated:** 2025-11-27  
**Priority:** High  
**Branch:** feature/8-4-trip-chaining

---

## User Story

**As a** dispatcher,  
**I want** the system to detect opportunities to chain trips (where the drop-off of one mission is close in time and space to the pick-up of another),  
**So that** I can reduce or eliminate deadhead segments and improve operational profitability.

---

## Description

Implement trip chaining detection and suggestion functionality in the Dispatch screen. When missions are confirmed, the planning engine should automatically detect opportunities where:

1. **Spatial proximity**: The drop-off location of Mission A is within a configurable distance (default: 10km) of the pick-up location of Mission B
2. **Temporal proximity**: The time gap between Mission A's drop-off and Mission B's pick-up is within a configurable window (default: 30 minutes minimum, 2 hours maximum)

When chaining is applied, instead of:

- Mission A: Base → Pickup A → Dropoff A → Base (full loop)
- Mission B: Base → Pickup B → Dropoff B → Base (full loop)

The system optimizes to:

- Chained: Base → Pickup A → Dropoff A → Pickup B → Dropoff B → Base (single loop)

This eliminates one return-to-base segment and one approach segment, significantly reducing deadhead kilometers and costs.

### Key Features

1. **ChainingService** - Backend service to detect chaining opportunities
2. **Chaining Suggestions API** - Endpoint to get suggestions for a mission
3. **ChainingSuggestions Component** - UI to display and apply suggestions
4. **Savings Calculator** - Calculate and display estimated savings
5. **Chain Application** - Apply chain and update shadow calculations

---

## Acceptance Criteria

### AC1: Chaining Detection Algorithm

```gherkin
Given a set of confirmed missions in a time window
When the planning engine runs chaining detection for a mission
Then it identifies other missions where:
  - The drop-off of the source mission is within 10km of the target's pickup
  - OR the pickup of the source mission is within 10km of the target's drop-off
And the time gap between missions is between 30 minutes and 2 hours
And the results are sorted by potential savings (highest first)
```

### AC2: Chaining Suggestions Display

```gherkin
Given a mission is selected in the Dispatch screen
When chaining opportunities exist for that mission
Then I see a "Chaining Suggestions" section in the right panel
And each suggestion shows:
  - Target mission summary (route, time)
  - Chain order (this mission BEFORE or AFTER target)
  - Transition distance and time
  - Estimated savings (km and EUR)
And suggestions are visually distinct from other dispatch information
```

### AC3: Chaining Application

```gherkin
Given a chaining suggestion is displayed
When I click "Apply Chain" on a suggestion
Then a confirmation dialog appears showing:
  - The two missions being chained
  - The new combined route
  - The estimated savings
When I confirm the chain
Then both missions are updated with chain information
And the shadow calculation is recalculated for the combined route
And profitability indicators are updated
And a success toast is shown
```

### AC4: Savings Calculation

```gherkin
Given two missions that can be chained
When the chaining suggestion is generated
Then the system calculates:
  | Metric | Original | Chained |
  | Total distance | M1 full loop + M2 full loop | M1 approach + M1 service + transition + M2 service + M2 return |
  | Total cost | Cost(M1) + Cost(M2) | Cost(combined) |
  | Savings | - | Original - Chained |
And the savings are displayed in both kilometers and EUR
And a percentage reduction is shown
```

### AC5: Chain Constraints Validation

```gherkin
Given potential chaining candidates
When chaining is evaluated
Then the system verifies:
  - Vehicle category compatibility (same or compatible categories)
  - Time gap is sufficient for transition (>= 30 min)
  - Time gap is not too long (< 2 hours, to avoid idle time)
  - RSE compliance for combined duration (if heavy vehicle)
  - No existing chain conflicts
And incompatible chains are filtered out or marked with warnings
```

### AC6: API Endpoint for Chaining Suggestions

```gherkin
Given the GET /api/vtc/missions/:id/chaining-suggestions endpoint
When called with a valid mission ID
Then it returns a list of chainable missions with:
  - Target mission details
  - Chain order (BEFORE/AFTER)
  - Transition metrics (distance, duration)
  - Savings breakdown
  - Compatibility flags
And the response is sorted by savings descending
```

### AC7: Chain Indicator in Missions List

```gherkin
Given the missions list in Dispatch
When a mission is part of a chain
Then it shows a chain badge/icon (Link icon)
And hovering shows the chain details
And clicking navigates to the chained mission
```

### AC8: Undo Chain

```gherkin
Given a mission that is part of a chain
When I click "Remove from Chain"
Then the chain is dissolved
And both missions return to independent status
And shadow calculations are recalculated for each mission separately
```

---

## Technical Implementation

### Database Schema Changes

```prisma
// Add to Quote model in schema.prisma
model Quote {
  // ... existing fields ...

  // Chaining fields (Story 8.4)
  chainId           String?   // Shared ID for chained missions
  chainOrder        Int?      // Order in chain (1, 2, 3...)
  chainedWithId     String?   // Direct link to next mission in chain
  chainedWith       Quote?    @relation("ChainLink", fields: [chainedWithId], references: [id])
  chainedBy         Quote[]   @relation("ChainLink")
}
```

### Files to Create

```
packages/api/src/services/
├── chaining-service.ts           # Main chaining detection logic
├── __tests__/
│   └── chaining-service.test.ts  # Unit tests

packages/api/src/routes/vtc/
├── missions.ts                   # ADD: chaining-suggestions and apply-chain endpoints

apps/web/modules/saas/dispatch/
├── components/
│   ├── ChainingSuggestions.tsx   # Suggestions panel component
│   ├── ChainingSuggestionRow.tsx # Individual suggestion row
│   ├── ChainConfirmDialog.tsx    # Confirmation dialog
│   ├── ChainBadge.tsx            # Badge for chained missions
│   └── index.ts                  # Update exports
├── hooks/
│   ├── useChainingSuggestions.ts # Fetch suggestions hook
│   ├── useApplyChain.ts          # Apply chain mutation hook
│   └── index.ts                  # Update exports
├── types/
│   └── chaining.ts               # Chaining type definitions
```

### API Endpoints

```typescript
// GET /api/vtc/missions/:id/chaining-suggestions
interface GetChainingSuggestionsResponse {
  suggestions: ChainingSuggestion[];
  mission: {
    id: string;
    pickupAt: string;
    pickupAddress: string;
    dropoffAddress: string;
    dropoffAt: string; // Estimated based on duration
  };
}

interface ChainingSuggestion {
  targetMissionId: string;
  targetMission: {
    id: string;
    pickupAt: string;
    pickupAddress: string;
    dropoffAddress: string;
    contact: { displayName: string };
  };
  chainOrder: "BEFORE" | "AFTER"; // This mission goes BEFORE or AFTER target
  transition: {
    distanceKm: number;
    durationMinutes: number;
    fromAddress: string;
    toAddress: string;
  };
  savings: {
    distanceKm: number;
    costEur: number;
    percentReduction: number;
  };
  compatibility: {
    vehicleCategory: boolean;
    timeGap: boolean;
    rseCompliance: boolean;
    noConflicts: boolean;
  };
  isRecommended: boolean; // True if all compatibility checks pass
}

// POST /api/vtc/missions/:id/apply-chain
interface ApplyChainRequest {
  targetMissionId: string;
  chainOrder: "BEFORE" | "AFTER";
}

interface ApplyChainResponse {
  success: boolean;
  chainId: string;
  updatedMissions: {
    id: string;
    chainOrder: number;
    newInternalCost: number;
    newMarginPercent: number;
  }[];
  totalSavings: {
    distanceKm: number;
    costEur: number;
  };
  message: string;
}

// DELETE /api/vtc/missions/:id/chain
interface RemoveChainResponse {
  success: boolean;
  affectedMissions: string[];
  message: string;
}
```

### Chaining Service Algorithm

```typescript
// packages/api/src/services/chaining-service.ts

interface ChainingConfig {
  minTimeGapMinutes: number; // Default: 30
  maxTimeGapMinutes: number; // Default: 120
  maxTransitionDistanceKm: number; // Default: 10
  haversinePreFilterKm: number; // Default: 20 (wider for pre-filter)
}

const DEFAULT_CHAINING_CONFIG: ChainingConfig = {
  minTimeGapMinutes: 30,
  maxTimeGapMinutes: 120,
  maxTransitionDistanceKm: 10,
  haversinePreFilterKm: 20,
};

/**
 * Detect chaining opportunities for a mission
 *
 * Algorithm:
 * 1. Load all accepted missions in a time window (±4 hours of source mission)
 * 2. Pre-filter by Haversine distance (dropoff-to-pickup or pickup-to-dropoff)
 * 3. For remaining candidates, check time gap constraints
 * 4. Calculate transition routing and savings
 * 5. Validate compatibility (vehicle category, RSE)
 * 6. Sort by savings and return top suggestions
 */
export async function detectChainingOpportunities(
  missionId: string,
  organizationId: string,
  config: ChainingConfig = DEFAULT_CHAINING_CONFIG
): Promise<ChainingSuggestion[]> {
  // Implementation details in dev phase
}

/**
 * Calculate savings from chaining two missions
 */
export function calculateChainingSavings(
  mission1: MissionWithRouting,
  mission2: MissionWithRouting,
  transitionDistanceKm: number,
  settings: OrganizationPricingSettings
): ChainingSavings {
  // Original cost: both missions do full loops
  const originalCost = mission1.totalInternalCost + mission2.totalInternalCost;

  // Chained cost:
  // - Mission1: approach + service (no return)
  // - Transition: dropoff1 → pickup2
  // - Mission2: service + return (no approach)
  const chainedCost =
    mission1.approachCost +
    mission1.serviceCost +
    calculateTransitionCost(transitionDistanceKm, settings) +
    mission2.serviceCost +
    mission2.returnCost;

  return {
    distanceKm:
      mission1.returnDistanceKm +
      mission2.approachDistanceKm -
      transitionDistanceKm,
    costEur: originalCost - chainedCost,
    percentReduction: ((originalCost - chainedCost) / originalCost) * 100,
  };
}
```

### Component Structure

```tsx
// ChainingSuggestions.tsx
interface ChainingSuggestionsProps {
  missionId: string;
  onChainApplied?: () => void;
}

export function ChainingSuggestions({
  missionId,
  onChainApplied,
}: ChainingSuggestionsProps) {
  const { data, isLoading } = useChainingSuggestions(missionId);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ChainingSuggestion | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (isLoading) return <ChainingSuggestionsSkeleton />;
  if (!data?.suggestions.length) return null; // Don't show if no suggestions

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {t("dispatch.chaining.title")}
        </CardTitle>
        <CardDescription>
          {t("dispatch.chaining.description", {
            count: data.suggestions.length,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.suggestions.map((suggestion) => (
            <ChainingSuggestionRow
              key={suggestion.targetMissionId}
              suggestion={suggestion}
              onApply={() => {
                setSelectedSuggestion(suggestion);
                setShowConfirmDialog(true);
              }}
            />
          ))}
        </div>
      </CardContent>

      <ChainConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        suggestion={selectedSuggestion}
        sourceMission={data.mission}
        onConfirm={handleApplyChain}
      />
    </Card>
  );
}
```

### Translations to Add

```json
// apps/web/content/locales/en/saas.json
{
  "dispatch": {
    "chaining": {
      "title": "Chaining Opportunities",
      "description": "{{count}} mission(s) can be chained to reduce deadhead",
      "suggestion": {
        "chainBefore": "Chain before this mission",
        "chainAfter": "Chain after this mission",
        "transition": "Transition: {{distance}} km, {{duration}} min",
        "savings": "Save {{distance}} km ({{cost}})",
        "savingsPercent": "{{percent}}% cost reduction",
        "apply": "Apply Chain",
        "recommended": "Recommended"
      },
      "confirm": {
        "title": "Confirm Chain",
        "description": "You are about to chain these two missions:",
        "mission1": "Mission 1",
        "mission2": "Mission 2",
        "newRoute": "New combined route",
        "estimatedSavings": "Estimated savings",
        "confirm": "Confirm Chain",
        "cancel": "Cancel"
      },
      "success": "Missions chained successfully! Saved {{savings}}",
      "error": "Failed to chain missions",
      "badge": {
        "chained": "Chained",
        "chainedWith": "Chained with {{mission}}"
      },
      "remove": {
        "button": "Remove from Chain",
        "confirm": "Are you sure you want to remove this mission from the chain?",
        "success": "Chain removed successfully"
      },
      "compatibility": {
        "vehicleCategory": "Vehicle category",
        "timeGap": "Time gap",
        "rseCompliance": "RSE compliance",
        "noConflicts": "No conflicts"
      }
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

```typescript
// packages/api/src/services/__tests__/chaining-service.test.ts
describe("ChainingService", () => {
  describe("detectChainingOpportunities", () => {
    it("detects missions within distance threshold", () => {});
    it("detects missions within time gap threshold", () => {});
    it("filters out missions outside distance threshold", () => {});
    it("filters out missions with time gap too short", () => {});
    it("filters out missions with time gap too long", () => {});
    it("correctly identifies BEFORE vs AFTER chain order", () => {});
    it("sorts suggestions by savings descending", () => {});
    it("excludes already chained missions", () => {});
    it("respects organization tenancy", () => {});
  });

  describe("calculateChainingSavings", () => {
    it("calculates correct distance savings", () => {});
    it("calculates correct cost savings", () => {});
    it("calculates correct percentage reduction", () => {});
    it("handles edge case where transition > saved distance", () => {});
  });

  describe("validateChainingCompatibility", () => {
    it("validates vehicle category compatibility", () => {});
    it("validates time gap constraints", () => {});
    it("validates RSE compliance for heavy vehicles", () => {});
    it("detects chain conflicts", () => {});
  });
});

// apps/web/modules/saas/dispatch/components/__tests__/ChainingSuggestions.test.tsx
describe("ChainingSuggestions", () => {
  it("renders suggestions when available", () => {});
  it("hides component when no suggestions", () => {});
  it("shows loading skeleton while fetching", () => {});
  it("displays savings in correct format", () => {});
  it("opens confirm dialog on Apply click", () => {});
  it("shows compatibility indicators", () => {});
});

describe("ChainConfirmDialog", () => {
  it("displays both missions", () => {});
  it("shows estimated savings", () => {});
  it("calls onConfirm when confirmed", () => {});
  it("closes on cancel", () => {});
});

describe("ChainBadge", () => {
  it("renders chain icon for chained missions", () => {});
  it("shows tooltip with chain details", () => {});
  it("does not render for unchained missions", () => {});
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/dispatch-chaining.spec.ts
describe("Dispatch Chaining", () => {
  beforeEach(async () => {
    // Setup: Create two chainable missions
    await page.goto("/app/test-org/dispatch");
  });

  it("displays chaining suggestions for eligible missions", async () => {
    await page.click('[data-testid="mission-row"]:first-child');
    await expect(
      page.locator('[data-testid="chaining-suggestions"]')
    ).toBeVisible();
  });

  it("shows savings information in suggestions", async () => {
    await page.click('[data-testid="mission-row"]:first-child');
    await expect(
      page.locator('[data-testid="chaining-savings"]')
    ).toContainText("km");
    await expect(
      page.locator('[data-testid="chaining-savings"]')
    ).toContainText("€");
  });

  it("opens confirmation dialog on Apply Chain", async () => {
    await page.click('[data-testid="mission-row"]:first-child');
    await page.click('[data-testid="apply-chain-button"]:first-child');
    await expect(
      page.locator('[data-testid="chain-confirm-dialog"]')
    ).toBeVisible();
  });

  it("applies chain and updates missions", async () => {
    await page.click('[data-testid="mission-row"]:first-child');
    await page.click('[data-testid="apply-chain-button"]:first-child');
    await page.click('[data-testid="confirm-chain-button"]');

    // Verify success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Verify chain badge appears
    await expect(page.locator('[data-testid="chain-badge"]')).toBeVisible();
  });

  it("removes chain when requested", async () => {
    // First apply a chain, then remove it
    // ... setup chain ...
    await page.click('[data-testid="remove-chain-button"]');
    await page.click('[data-testid="confirm-remove-chain"]');

    await expect(page.locator('[data-testid="chain-badge"]')).not.toBeVisible();
  });
});
```

### API Tests (curl)

```bash
# Get chaining suggestions for a mission
curl -X GET "http://localhost:3000/api/vtc/missions/mission-id-123/chaining-suggestions" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Expected response:
# {
#   "suggestions": [
#     {
#       "targetMissionId": "mission-456",
#       "chainOrder": "AFTER",
#       "transition": { "distanceKm": 5.2, "durationMinutes": 12 },
#       "savings": { "distanceKm": 18.5, "costEur": 45.00, "percentReduction": 22 },
#       "compatibility": { "vehicleCategory": true, "timeGap": true, "rseCompliance": true },
#       "isRecommended": true
#     }
#   ],
#   "mission": { "id": "mission-123", ... }
# }

# Apply chain
curl -X POST "http://localhost:3000/api/vtc/missions/mission-id-123/apply-chain" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{"targetMissionId": "mission-456", "chainOrder": "AFTER"}'

# Expected response:
# {
#   "success": true,
#   "chainId": "chain-789",
#   "updatedMissions": [...],
#   "totalSavings": { "distanceKm": 18.5, "costEur": 45.00 },
#   "message": "Chain applied successfully"
# }

# Remove chain
curl -X DELETE "http://localhost:3000/api/vtc/missions/mission-id-123/chain" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Verify in database via MCP @postgres_vtc_sixiemme_etoile
# SELECT id, "chainId", "chainOrder", "chainedWithId" FROM "Quote" WHERE id IN ('mission-123', 'mission-456');
```

---

## Dependencies

| Dependency                           | Type  | Status  |
| ------------------------------------ | ----- | ------- |
| Story 4.5 - Multi-Base Selection     | Story | ✅ Done |
| Story 4.6 - Shadow Calculation       | Story | ✅ Done |
| Story 8.1 - Dispatch Screen Layout   | Story | ✅ Done |
| Story 8.2 - Assignment Drawer        | Story | ✅ Done |
| Story 8.3 - Multi-Base Visualization | Story | ✅ Done |
| vehicle-selection.ts service         | Code  | ✅ Done |
| haversineDistance utility            | Code  | ✅ Done |
| TripTransparencyPanel component      | Code  | ✅ Done |

---

## Definition of Done

- [x] Database schema updated with chaining fields on Quote
- [x] Prisma migration created and applied
- [x] ChainingService implemented with detection algorithm
- [x] API endpoint GET /missions/:id/chaining-suggestions implemented
- [x] API endpoint POST /missions/:id/apply-chain implemented
- [x] API endpoint DELETE /missions/:id/chain implemented
- [x] ChainingSuggestions component implemented
- [x] ChainingSuggestionRow component implemented (in ChainingSuggestions.tsx)
- [x] ChainConfirmDialog component implemented (in ChainingSuggestions.tsx)
- [x] ChainBadge component implemented
- [x] useChainingSuggestions hook implemented
- [x] useApplyChain hook implemented
- [ ] DispatchPage updated to show chaining suggestions
- [ ] MissionRow updated with chain badge
- [ ] Shadow calculation updated when chain applied
- [ ] Profitability recalculated after chaining
- [ ] Translations added (en/fr)
- [x] Unit tests passing (Vitest) - 43 tests passing
- [ ] E2E tests passing (Playwright MCP)
- [ ] API endpoints tested with curl
- [ ] Database state verified via MCP
- [ ] Code reviewed and merged

---

## Notes

- **Chain Limit**: For MVP, chains are limited to 2 missions. Multi-mission chains (3+) can be added in a future story.
- **Time Window**: The algorithm searches ±4 hours from the source mission's pickup time to find candidates.
- **Performance**: Use Haversine pre-filter (20km) before detailed calculations to limit API calls.
- **RSE Compliance**: For heavy vehicles, verify that combined duration doesn't exceed daily limits.
- **Conflict Detection**: A mission can only be in one chain at a time.
- **Undo**: Chains can be dissolved, returning missions to independent status.

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/8-4-detect-suggest-trip-chaining-opportunities.context.xml

### Files Modified/Created

**Database:**

- `packages/database/prisma/schema.prisma` - Added chaining fields to Quote model
- `packages/database/prisma/migrations/20251127183224_add_quote_chaining_fields/` - Migration

**Backend:**

- `packages/api/src/services/chaining-service.ts` - NEW: Chaining detection service
- `packages/api/src/services/__tests__/chaining-service.test.ts` - NEW: 43 unit tests
- `packages/api/src/routes/vtc/missions.ts` - Added chaining endpoints

**Frontend Types:**

- `apps/web/modules/saas/dispatch/types/chaining.ts` - NEW: Chaining type definitions
- `apps/web/modules/saas/dispatch/types/index.ts` - Updated exports

**Frontend Hooks:**

- `apps/web/modules/saas/dispatch/hooks/useChainingSuggestions.ts` - NEW
- `apps/web/modules/saas/dispatch/hooks/useApplyChain.ts` - NEW
- `apps/web/modules/saas/dispatch/hooks/index.ts` - Updated exports

**Frontend Components:**

- `apps/web/modules/saas/dispatch/components/ChainingSuggestions.tsx` - NEW
- `apps/web/modules/saas/dispatch/components/ChainBadge.tsx` - NEW
- `apps/web/modules/saas/dispatch/components/index.ts` - Updated exports

### Test Summary

**Unit Tests (Vitest):** 43/43 passing

- `calculateTimeGapMinutes`: 3 tests
- `calculateTransitionDistance`: 3 tests
- `calculateTransitionDuration`: 3 tests
- `isTimeGapValid`: 5 tests
- `isTransitionDistanceValid`: 3 tests
- `estimateDropoffTime`: 2 tests
- `extractCostData`: 3 tests
- `generateChainId`: 2 tests
- `detectChainingOpportunities`: 9 tests
- `calculateChainingSavings`: 5 tests
- `checkChainingCompatibility`: 5 tests
