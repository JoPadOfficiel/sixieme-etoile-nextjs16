# Story 17.3: Automatic Compliance-Driven Staffing Integration

**Epic:** Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability  
**Status:** Ready for Development  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Sprint:** Current  
**Created:** 2025-12-30

---

## Description

**As an** operator,  
**I want** the system to automatically select the best compliant staffing plan when RSE violations are detected,  
**So that** I see the final price including all necessary staffing costs without manual intervention.

### Business Value

- Élimine le travail manuel de calcul des options de staffing RSE
- Garantit que les devis incluent automatiquement tous les coûts de conformité
- Réduit le risque d'erreur humaine dans l'estimation des coûts de missions longues
- Améliore la transparence des prix pour les clients

### Related FRs

- **FR64:** Le moteur de pricing doit automatiquement intégrer la validation de conformité pour les véhicules lourds et sélectionner automatiquement le meilleur plan de staffing conforme selon une politique configurable.
- **FR65:** Le plan de staffing sélectionné et ses coûts associés doivent être inclus dans le prix du devis et stockés dans tripAnalysis.

---

## Acceptance Criteria (BDD Format)

### AC1: Automatic Compliance Validation During Pricing

**Given** a quote request for a heavy vehicle trip that would violate RSE regulations (e.g., >10h driving),  
**When** the pricing engine calculates the quote,  
**Then** it shall automatically call the compliance validator to detect violations.

### AC2: Automatic Staffing Plan Generation

**Given** RSE violations are detected during pricing,  
**When** the compliance validator returns violations,  
**Then** the system shall generate alternative staffing plans (DOUBLE_CREW, RELAY_DRIVER, MULTI_DAY).

### AC3: Automatic Best Plan Selection

**Given** multiple staffing alternatives are available,  
**When** the system evaluates them,  
**Then** it shall automatically select the best plan according to the configured `staffingSelectionPolicy`:

- **CHEAPEST:** Select the plan with lowest additional cost
- **FASTEST:** Select the plan that minimizes total trip duration
- **PREFER_INTERNAL:** Prefer options that don't require external resources (relay driver)

### AC4: Staffing Costs Added to Quote Price

**Given** a staffing plan is selected,  
**When** the quote price is calculated,  
**Then** the selected plan's additional costs (second driver, hotel, meals, premiums) shall be added to the quote price.

### AC5: Staffing Plan Stored in TripAnalysis

**Given** a staffing plan is applied to a quote,  
**When** the quote is saved,  
**Then** the staffing plan details shall be stored in `tripAnalysis.compliancePlan` including:

- `planType`: DOUBLE_CREW | RELAY_DRIVER | MULTI_DAY | NONE
- `additionalCost`: Total additional cost in EUR
- `costBreakdown`: { extraDriverCost, hotelCost, mealAllowance, otherCosts }
- `adjustedSchedule`: { daysRequired, driversRequired, hotelNightsRequired }
- `originalViolations`: Array of violations that triggered the plan

### AC6: Quote UI Displays Staffing Plan Summary

**Given** a quote with a staffing plan applied,  
**When** the operator views the quote in the cockpit,  
**Then** the UI shall display:

- A staffing plan badge (e.g., "Double équipage requis")
- The additional cost (e.g., "+300€")
- A tooltip or expandable section with cost breakdown

### AC7: Light Vehicles Skip Compliance Integration

**Given** a quote request for a light vehicle,  
**When** the pricing engine calculates the quote,  
**Then** no compliance validation or staffing integration shall be performed,  
**And** `tripAnalysis.compliancePlan` shall be null or have `planType: NONE`.

### AC8: Configurable Staffing Selection Policy

**Given** an organization's pricing settings,  
**When** an admin views the settings page,  
**Then** they shall see a "Staffing Selection Policy" dropdown with options: CHEAPEST, FASTEST, PREFER_INTERNAL,  
**And** the default shall be CHEAPEST.

---

## Test Cases

### Unit Tests (Vitest)

#### TC1: Compliance Integration in Pricing Engine

```typescript
describe("Compliance-Driven Staffing Integration", () => {
  it("should detect RSE violations for heavy vehicle trips exceeding 10h driving", async () => {
    // Setup: Heavy vehicle, 12h driving time
    // Assert: violations array contains DRIVING_TIME_EXCEEDED
  });

  it("should generate staffing alternatives when violations detected", async () => {
    // Setup: Heavy vehicle with amplitude violation
    // Assert: alternatives include DOUBLE_CREW, MULTI_DAY
  });

  it("should select CHEAPEST plan when policy is CHEAPEST", async () => {
    // Setup: Multiple alternatives with different costs
    // Assert: lowest cost alternative is selected
  });

  it("should select FASTEST plan when policy is FASTEST", async () => {
    // Setup: Multiple alternatives with different durations
    // Assert: shortest duration alternative is selected
  });

  it("should prefer DOUBLE_CREW over RELAY when policy is PREFER_INTERNAL", async () => {
    // Setup: Both DOUBLE_CREW and RELAY_DRIVER feasible
    // Assert: DOUBLE_CREW is selected
  });

  it("should add staffing costs to quote price", async () => {
    // Setup: Quote with DOUBLE_CREW plan (cost: 200€)
    // Assert: finalPrice = basePrice + 200
  });

  it("should store compliancePlan in tripAnalysis", async () => {
    // Setup: Quote with staffing plan
    // Assert: tripAnalysis.compliancePlan contains all required fields
  });

  it("should skip compliance for light vehicles", async () => {
    // Setup: Light vehicle, 12h trip
    // Assert: no violations, compliancePlan is null
  });
});
```

#### TC2: Staffing Selection Policy Tests

```typescript
describe("Staffing Selection Policy", () => {
  it("should read policy from OrganizationPricingSettings", async () => {
    // Setup: Org with staffingSelectionPolicy = FASTEST
    // Assert: policy is correctly loaded
  });

  it("should default to CHEAPEST when policy not set", async () => {
    // Setup: Org without staffingSelectionPolicy
    // Assert: CHEAPEST is used
  });
});
```

### API Tests (Curl)

#### TC3: Pricing API with Compliance Integration

```bash
# Test: Create quote for heavy vehicle with long trip
curl -X POST http://localhost:3000/api/vtc/quotes \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "...",
    "vehicleCategoryId": "heavy-vehicle-id",
    "pickupAddress": "Paris",
    "dropoffAddress": "Marseille",
    "pickupAt": "2025-01-15T06:00:00",
    "tripType": "transfer"
  }'
# Expected: Response includes compliancePlan with staffing details
```

### E2E Tests (Playwright)

#### TC4: Quote Creation with Staffing Plan Display

```typescript
test("should display staffing plan badge for heavy vehicle long trip", async ({
  page,
}) => {
  // Navigate to quote creation
  // Select heavy vehicle category
  // Enter Paris → Marseille route
  // Assert: Staffing plan badge is visible
  // Assert: Additional cost is displayed
});

test("should show staffing cost breakdown in tooltip", async ({ page }) => {
  // Create quote with staffing plan
  // Hover over staffing badge
  // Assert: Tooltip shows cost breakdown
});
```

### Database Verification

#### TC5: Verify compliancePlan Storage

```sql
-- After creating a quote with staffing plan
SELECT
  id,
  "tripAnalysis"->>'compliancePlan' as compliance_plan
FROM quote
WHERE id = 'quote-id';
-- Expected: compliancePlan JSON with planType, additionalCost, etc.
```

---

## Technical Notes

### Schema Changes (schema.prisma)

```prisma
// Add to OrganizationPricingSettings
model OrganizationPricingSettings {
  // ... existing fields ...

  // Story 17.3: Staffing selection policy
  staffingSelectionPolicy StaffingSelectionPolicy?
}

// New enum
enum StaffingSelectionPolicy {
  CHEAPEST        // Select plan with lowest additional cost
  FASTEST         // Select plan that minimizes total duration
  PREFER_INTERNAL // Prefer internal options (double crew over relay)
}
```

### TripAnalysis Interface Update

```typescript
// In pricing-engine.ts
export interface TripAnalysis {
  // ... existing fields ...

  // Story 17.3: Compliance-driven staffing plan
  compliancePlan?: CompliancePlan | null;
}

export interface CompliancePlan {
  planType: "DOUBLE_CREW" | "RELAY_DRIVER" | "MULTI_DAY" | "NONE";
  isRequired: boolean;
  additionalCost: number;
  costBreakdown: {
    extraDriverCost: number;
    hotelCost: number;
    mealAllowance: number;
    otherCosts: number;
  };
  adjustedSchedule: {
    daysRequired: number;
    driversRequired: number;
    hotelNightsRequired: number;
  };
  originalViolations: ComplianceViolation[];
  selectedReason: string; // e.g., "Lowest cost option"
}
```

### Integration Points

1. **pricing-engine.ts**: Add compliance check after shadow calculation
2. **compliance-validator.ts**: Use existing `generateAlternatives()` function
3. **Quote UI**: Add staffing plan display component
4. **Settings UI**: Add staffing policy dropdown

### Files to Modify/Create

1. `packages/database/prisma/schema.prisma` - Add enum and field
2. `packages/api/src/services/pricing-engine.ts` - Integrate compliance
3. `packages/api/src/services/compliance-validator.ts` - Add selection logic
4. `apps/web/app/[locale]/(app)/dashboard/quotes/components/staffing-plan-badge.tsx` - New UI component
5. `apps/web/app/[locale]/(app)/dashboard/settings/pricing/page.tsx` - Add policy dropdown
6. `packages/api/src/services/__tests__/pricing-engine.test.ts` - Add tests

---

## Dependencies

- **Story 5.3:** Heavy-vehicle compliance validator (✅ Done)
- **Story 5.4:** Alternative staffing options generation (✅ Done)
- **Story 17.1:** Zone conflict resolution (✅ Done)
- **Story 17.2:** Zone multiplier aggregation (✅ Done)

## Blocked By

None

## Blocks

- **Story 17.4:** Configurable Staffing Cost Parameters (uses the same settings)
- **Story 17.5:** Quote Estimated End Time (uses compliancePlan for duration)

---

## Definition of Done

- [ ] Schema migration created and applied
- [ ] Pricing engine integrates compliance validation
- [ ] Staffing plan selection logic implemented
- [ ] Staffing costs added to quote price
- [ ] compliancePlan stored in tripAnalysis
- [ ] UI displays staffing plan badge and costs
- [ ] Settings UI includes staffing policy dropdown
- [ ] All unit tests pass (Vitest)
- [ ] All E2E tests pass (Playwright)
- [ ] API tests verified with curl + DB check
- [ ] Code reviewed and merged

---

## Implementation Log

### Completed (30/12/2025)

#### Phase 1: Schema & Types

- ✅ Added `StaffingSelectionPolicy` enum to Prisma schema (CHEAPEST, FASTEST, PREFER_INTERNAL)
- ✅ Added `staffingSelectionPolicy` field to `OrganizationPricingSettings`
- ✅ Created and applied migration `20251230214107_add_staffing_selection_policy`
- ✅ Defined `CompliancePlan` interface in pricing-engine.ts
- ✅ Defined `StaffingPlanType` type (DOUBLE_CREW, RELAY_DRIVER, MULTI_DAY, NONE)
- ✅ Updated `TripAnalysis` interface to include `compliancePlan` field

#### Phase 2: Compliance Validator Enhancements

- ✅ Added `selectBestStaffingPlan()` function to select plan based on policy
- ✅ Implemented policy logic:
  - **CHEAPEST**: Sort by cost, select lowest
  - **FASTEST**: Sort by days required, then drivers, select fastest
  - **PREFER_INTERNAL**: Priority order DOUBLE_CREW > MULTI_DAY > RELAY_DRIVER
- ✅ Added `integrateComplianceInPricing()` function for full compliance flow
- ✅ Added `AutomaticStaffingSelectionResult` interface for selection results

#### Phase 3: Pricing Engine Integration

- ✅ Added imports from compliance-validator
- ✅ Created `integrateComplianceIntoPricing()` function in pricing-engine.ts
- ✅ Implemented `ComplianceIntegrationInput` and `ComplianceIntegrationResult` interfaces
- ✅ Logic:
  - Skips compliance for LIGHT vehicles
  - Returns NONE plan for compliant HEAVY vehicles
  - Selects best staffing plan for non-compliant HEAVY vehicles
  - Stores all details in `tripAnalysis.compliancePlan`
  - Returns applied rule for transparency

#### Phase 4: Unit Tests

- ✅ Created `compliance-staffing-selection.test.ts` (13 tests)

  - Tests for CHEAPEST policy selection
  - Tests for FASTEST policy selection
  - Tests for PREFER_INTERNAL policy selection
  - Tests for filtering non-feasible/non-compliant alternatives
  - Tests for edge cases (no feasible alternatives, unknown policy, etc.)
  - **Result: 13/13 PASSED**

- ✅ Created `pricing-engine-compliance-integration.test.ts` (10 tests)
  - Tests for light vehicle handling (skip compliance)
  - Tests for compliant heavy vehicle trips (NONE plan)
  - Tests for compliancePlan storage in tripAnalysis
  - Tests for cost breakdown and adjusted schedule storage
  - Tests for applied rule generation
  - Tests for policy parameter respect
  - Tests for original data preservation
  - **Result: 10/10 PASSED**

#### Phase 5: Code Quality

- ✅ All TypeScript compilation successful (no errors in pricing-engine.ts, compliance-validator.ts)
- ✅ Total tests passing: 23/23
- ✅ Git branch: `feature/17-3-automatic-compliance-driven-staffing-integration`

### Files Modified/Created

**Modified:**

1. `/packages/database/prisma/schema.prisma` - Added enum and field
2. `/packages/api/src/services/compliance-validator.ts` - Added selection logic
3. `/packages/api/src/services/pricing-engine.ts` - Added integration function and types

**Created:**

1. `/packages/database/prisma/migrations/20251230214107_add_staffing_selection_policy/` - Migration
2. `/packages/api/src/services/__tests__/compliance-staffing-selection.test.ts` - Selection tests
3. `/packages/api/src/services/__tests__/pricing-engine-compliance-integration.test.ts` - Integration tests

### Remaining Work (Story 17.4+)

- UI Settings page: Add dropdown for staffing selection policy
- UI Quote display: Add staffing plan badge and cost breakdown
- Story 17.4: Configurable staffing cost parameters in organization settings
- Story 17.5: Quote estimated end time calculation with staffing plan
