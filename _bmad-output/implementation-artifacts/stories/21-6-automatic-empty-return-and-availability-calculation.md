# Story 21-6: Automatic Empty Return and Availability Calculation

## Story Information

| Field                | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| **Story ID**         | 21-6                                                              |
| **Epic**             | Epic 21 - Complete Pricing System Refactor with Full Transparency |
| **Title**            | Automatic Empty Return and Availability Calculation               |
| **Status**           | Ready for Development                                             |
| **Priority**         | HIGH                                                              |
| **Estimated Effort** | M (Medium)                                                        |
| **Created**          | 2026-01-03                                                        |

---

## User Story

**As an** operator,  
**I want** the system to automatically calculate empty return and availability costs,  
**So that** the final price includes all operational costs without manual intervention.

---

## Description

This story enhances the pricing engine to automatically determine and calculate positioning costs (approach fee, empty return, availability fee) based on trip type and configuration. Currently, these costs are calculated when vehicle selection provides segment data, but the logic for determining **when** these costs should be included is not fully automated.

The implementation adds:

1. **Automatic Empty Return Detection**: Logic to determine if empty return is required based on trip type (transfer vs excursion vs dispo)
2. **Availability Fee Calculation**: For dispo trips, calculate waiting time costs
3. **Approach Fee Inclusion**: Ensure approach costs are always included in pricing
4. **TripAnalysis Enhancement**: Store positioning cost decisions and calculations for transparency
5. **Price Integration**: Ensure positioning costs are properly added to the total price

### Business Rules

- **Transfer**: Empty return is ALWAYS required (vehicle must return to base)
- **Excursion**: Empty return is ALWAYS required (round trip from base)
- **Dispo (Mise à disposition)**:
  - Empty return is required
  - Availability fee applies for waiting hours beyond included time
- **Approach Fee**: Always applies when vehicle comes from a base

---

## Related FRs

- **FR99**: Automatic empty return calculation based on trip type
- **FR100**: Availability fee calculation for dispo trips
- **FR21**: Shadow calculation segments A/B/C
- **FR22**: Internal cost per segment calculation
- **FR55**: Trip Transparency cost component exposure

---

## Acceptance Criteria

### AC1: Automatic Empty Return Detection for Transfers

**Given** a quote with tripType = "transfer",  
**When** the pricing engine calculates the price,  
**Then** the system automatically:

- Sets `emptyReturnRequired = true`
- Calculates empty return cost: Distance dropoff → base × rate/km
- Includes this cost in `tripAnalysis.positioningCosts`
- Adds the cost to `internalCost`

### AC2: Automatic Empty Return Detection for Excursions

**Given** a quote with tripType = "excursion",  
**When** the pricing engine calculates the price,  
**Then** the system automatically:

- Sets `emptyReturnRequired = true`
- Calculates empty return cost based on excursion return segment
- Includes this cost in `tripAnalysis.positioningCosts`

### AC3: Availability Fee for Dispo Trips

**Given** a quote with tripType = "dispo" and durationHours > includedHours,  
**When** the pricing engine calculates the price,  
**Then** the system:

- Calculates availability fee: (durationHours - includedHours) × availabilityRatePerHour
- Includes this in `tripAnalysis.positioningCosts.availabilityFee`
- Adds the fee to the total price

### AC4: Approach Fee Always Included

**Given** any quote with a selected vehicle/base,  
**When** the pricing engine calculates the price,  
**Then** the system:

- Calculates approach fee: Distance base → pickup × rate/km + time × rate/h
- Includes this in `tripAnalysis.positioningCosts.approachFee`
- Adds the cost to `internalCost`

### AC5: Positioning Costs in TripAnalysis

**Given** a calculated quote,  
**When** I inspect `tripAnalysis`,  
**Then** I see a `positioningCosts` object with:

```typescript
{
  approachFee: {
    required: boolean;
    distanceKm: number;
    durationMinutes: number;
    cost: number;
    reason: string;
  };
  emptyReturn: {
    required: boolean;
    distanceKm: number;
    durationMinutes: number;
    cost: number;
    reason: string;
  };
  availabilityFee: {
    required: boolean;
    waitingHours: number;
    ratePerHour: number;
    cost: number;
    reason: string;
  } | null;
  totalPositioningCost: number;
}
```

### AC6: Positioning Costs Displayed in TripTransparency

**Given** a quote with positioning costs,  
**When** I view the TripTransparency panel,  
**Then** I see the PositioningCostsSection displaying:

- Approach fee with calculation breakdown
- Empty return with calculation breakdown
- Availability fee (if applicable)
- Total positioning cost

### AC7: Positioning Costs Included in Profitability

**Given** a quote with positioning costs,  
**When** profitability is calculated,  
**Then** `internalCost` includes all positioning costs,  
**And** margin and profitability indicator reflect the true operational cost.

### AC8: No Positioning Costs When No Vehicle Selected

**Given** a quote without vehicle selection (fallback mode),  
**When** the pricing engine calculates the price,  
**Then** `positioningCosts` shows:

- `approachFee.required = false` with reason "No vehicle selected"
- `emptyReturn.required = false` with reason "No vehicle selected"
- Costs are estimated based on average deadhead assumptions

---

## Test Cases

### TC1: Transfer with Full Positioning Costs

**Preconditions:** Transfer quote with vehicle selection from Bussy base
**Steps:**

1. Create quote: Paris → CDG, tripType = "transfer"
2. Vehicle selected from Bussy-Saint-Martin base
3. Verify approach fee calculated (Bussy → Paris)
4. Verify empty return calculated (CDG → Bussy)
5. Verify total includes both costs
   **Expected:** Both positioning costs calculated and included

### TC2: Excursion with Return Segment

**Preconditions:** Excursion quote Paris → Versailles → Paris
**Steps:**

1. Create quote: tripType = "excursion"
2. Verify approach fee calculated
3. Verify empty return calculated (return to base after excursion)
4. Check tripAnalysis.positioningCosts
   **Expected:** Full positioning costs with excursion-specific logic

### TC3: Dispo with Availability Fee

**Preconditions:** Dispo quote with 8 hours, included hours = 4
**Steps:**

1. Create quote: tripType = "dispo", durationHours = 8
2. Verify approach fee calculated
3. Verify empty return calculated
4. Verify availability fee: (8 - 4) × rate = 4h × rate
   **Expected:** Availability fee added to positioning costs

### TC4: Dispo Without Availability Fee

**Preconditions:** Dispo quote with 3 hours, included hours = 4
**Steps:**

1. Create quote: tripType = "dispo", durationHours = 3
2. Verify approach fee calculated
3. Verify empty return calculated
4. Verify availability fee = 0 (within included hours)
   **Expected:** No availability fee, only approach and return

### TC5: Quote Without Vehicle Selection

**Preconditions:** Quote in fallback mode (no vehicle available)
**Steps:**

1. Create quote without vehicle selection
2. Check tripAnalysis.positioningCosts
3. Verify reasons explain "No vehicle selected"
   **Expected:** Positioning costs marked as not required with explanation

### TC6: Positioning Costs in Profitability

**Preconditions:** Quote with significant positioning costs
**Steps:**

1. Create quote with 50km approach + 50km return
2. Calculate internal cost
3. Verify positioning costs (approach + return) included in internalCost
4. Verify margin reflects true profitability
   **Expected:** Profitability indicator accurate with positioning costs

---

## Technical Notes

### Files to Create

- None (extend existing modules)

### Files to Modify

- `packages/api/src/services/pricing/types.ts` - Add PositioningCosts interface
- `packages/api/src/services/pricing/shadow-calculator.ts` - Add positioning cost calculation
- `packages/api/src/services/pricing/main-calculator.ts` - Integrate positioning costs
- `packages/api/src/services/pricing/trip-type-pricing.ts` - Add availability fee logic
- `apps/web/modules/saas/quotes/components/PositioningCostsSection.tsx` - Enhance display
- `packages/i18n/translations/en.json` - Add translations
- `packages/i18n/translations/fr.json` - Add translations

### New Types

```typescript
// In types.ts
export interface PositioningCostItem {
  required: boolean;
  distanceKm: number;
  durationMinutes: number;
  cost: number;
  reason: string;
}

export interface AvailabilityFeeItem {
  required: boolean;
  waitingHours: number;
  ratePerHour: number;
  cost: number;
  reason: string;
}

export interface PositioningCosts {
  approachFee: PositioningCostItem;
  emptyReturn: PositioningCostItem;
  availabilityFee: AvailabilityFeeItem | null;
  totalPositioningCost: number;
}

// Add to TripAnalysis interface
export interface TripAnalysis {
  // ... existing fields
  positioningCosts?: PositioningCosts;
}
```

### Calculation Logic

```typescript
function calculatePositioningCosts(
  tripType: TripType,
  segments: TripAnalysis["segments"],
  durationHours?: number,
  includedHours?: number,
  availabilityRatePerHour?: number
): PositioningCosts {
  // Approach fee - always from segment A if available
  const approachFee = segments.approach
    ? {
        required: true,
        distanceKm: segments.approach.distanceKm,
        durationMinutes: segments.approach.durationMinutes,
        cost: segments.approach.cost.total,
        reason: "Vehicle positioning from base to pickup",
      }
    : {
        required: false,
        distanceKm: 0,
        durationMinutes: 0,
        cost: 0,
        reason: "No vehicle selected - approach cost estimated in base price",
      };

  // Empty return - always required for all trip types
  const emptyReturn = segments.return
    ? {
        required: true,
        distanceKm: segments.return.distanceKm,
        durationMinutes: segments.return.durationMinutes,
        cost: segments.return.cost.total,
        reason: `Empty return to base after ${tripType}`,
      }
    : {
        required: false,
        distanceKm: 0,
        durationMinutes: 0,
        cost: 0,
        reason: "No vehicle selected - return cost estimated in base price",
      };

  // Availability fee - only for dispo trips
  let availabilityFee: AvailabilityFeeItem | null = null;
  if (
    tripType === "dispo" &&
    durationHours &&
    includedHours &&
    availabilityRatePerHour
  ) {
    const extraHours = Math.max(0, durationHours - includedHours);
    availabilityFee = {
      required: extraHours > 0,
      waitingHours: extraHours,
      ratePerHour: availabilityRatePerHour,
      cost: extraHours * availabilityRatePerHour,
      reason:
        extraHours > 0
          ? `${extraHours}h beyond ${includedHours}h included`
          : "Within included hours",
    };
  }

  const totalPositioningCost =
    approachFee.cost + emptyReturn.cost + (availabilityFee?.cost ?? 0);

  return {
    approachFee,
    emptyReturn,
    availabilityFee,
    totalPositioningCost,
  };
}
```

### Integration Points

1. **shadow-calculator.ts**: Add `calculatePositioningCosts` function
2. **main-calculator.ts**: Call positioning cost calculation after shadow segments
3. **trip-type-pricing.ts**: Pass dispo-specific parameters for availability fee
4. **PositioningCostsSection.tsx**: Display new `positioningCosts` structure

---

## Dependencies

- **Story 21-2** (Detailed Approach Fee and Empty Return Display) ✅ Done
- **Epic 4** (Shadow Calculation) ✅ Done
- **Epic 8** (Dispatch) ✅ Done

---

## Out of Scope

- Changing the shadow calculation segment logic
- Modifying vehicle selection algorithm
- Adding new API endpoints (use existing quote pricing)
- Real-time availability checking (handled by dispatch)

---

## Definition of Done

- [ ] PositioningCosts interface added to types.ts
- [ ] calculatePositioningCosts function implemented
- [ ] Positioning costs integrated into main pricing flow
- [ ] TripAnalysis includes positioningCosts field
- [ ] PositioningCostsSection enhanced to use new structure
- [ ] All acceptance criteria verified via Playwright MCP
- [ ] API tests via Curl with DB verification
- [ ] French and English translations added
- [ ] No console errors or warnings
- [ ] Code follows existing patterns and style
- [ ] Sprint status updated to `done`
