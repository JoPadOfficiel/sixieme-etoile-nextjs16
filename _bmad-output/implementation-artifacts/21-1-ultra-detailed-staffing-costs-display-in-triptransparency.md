# Story 21.1: Ultra-Detailed Staffing Costs Display in TripTransparency

**Epic:** Epic 21 - Complete Pricing System Refactor with Full Transparency  
**Story ID:** 21-1  
**Status:** Ready for Development  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Created:** 2026-01-03

---

## User Story

**As an** operator,  
**I want** to see the complete staffing cost breakdown in quotes,  
**So that** I can understand and validate each pricing component before sending to clients.

---

## Description

This story enhances the TripTransparencyPanel to display ultra-detailed staffing costs when RSE compliance requires additional staffing (double crew, relay driver, or multi-day missions). Currently, the `StaffingPlanBadge` shows a summary badge with total cost. This story adds a dedicated "Staffing Costs" section in the Costs tab with:

- **Second Driver Cost**: Hourly rate × hours worked with explicit calculation
- **Hotel Cost**: Price per night × number of nights × number of drivers
- **Meal Costs**: Detailed breakdown per driver with count × unit price
- **Daily Breakdown**: Day-by-day breakdown for multi-day trips
- **Icons**: Visual indicators (👥 for driver, 🏨 for hotel, 🍽️ for meals)
- **Source Attribution**: Show where each parameter comes from (org config, vehicle, etc.)

---

## Related FRs

- **FR89**: Display ultra-detailed staffing cost breakdown in TripTransparency
- **FR90**: Show explicit calculation formulas for each staffing cost component
- **FR65**: Selected staffing plan and costs shall be included in quote price and stored in tripAnalysis

---

## Acceptance Criteria

### AC1: Staffing Costs Section Display

**Given** a quote with RSE staffing (DOUBLE_CREW, RELAY_DRIVER, or MULTI_DAY),  
**When** I display the TripTransparency panel Costs tab,  
**Then** I see a dedicated "Staffing Costs" section with a blue background and border.

### AC2: Second Driver Cost Display

**Given** a quote with DOUBLE_CREW or RELAY_DRIVER staffing,  
**When** I view the Staffing Costs section,  
**Then** I see:

- Icon: 👥 (UsersIcon)
- Label: "Second Driver Cost"
- Calculation: "{hours}h × {hourlyRate}€/h = {total}€"
- Example: "5.25h × 25€/h = 131.25€"

### AC3: Hotel Cost Display

**Given** a quote with MULTI_DAY staffing requiring hotel nights,  
**When** I view the Staffing Costs section,  
**Then** I see:

- Icon: 🏨 (BedDoubleIcon)
- Label: "Hotel Cost"
- Calculation: "{nights} nights × {drivers} drivers × {pricePerNight}€/night = {total}€"
- Example: "2 nights × 2 drivers × 85€/night = 340€"

### AC4: Meal Costs Display

**Given** a quote with staffing requiring meal allowances,  
**When** I view the Staffing Costs section,  
**Then** I see:

- Icon: 🍽️ (UtensilsIcon)
- Label: "Meal Allowance"
- Calculation: "{days} days × {drivers} drivers × {mealRate}€/day = {total}€"
- Example: "2 days × 2 drivers × 30€/day = 120€"

### AC5: Total Staffing Cost

**Given** a quote with any RSE staffing costs,  
**When** I view the Staffing Costs section,  
**Then** I see a total row with:

- Label: "Total Staffing Cost"
- Bold total amount
- Matching the `compliancePlan.additionalCost` value

### AC6: No Staffing Section When Not Required

**Given** a quote without RSE staffing (planType = "NONE" or no compliancePlan),  
**When** I display the TripTransparency panel Costs tab,  
**Then** I do NOT see the Staffing Costs section.

### AC7: Source Attribution

**Given** any staffing cost line item,  
**When** I view the cost details,  
**Then** I see a small badge or tooltip indicating the source:

- "Org Config" for organization pricing settings
- "Default" for fallback values

---

## Technical Notes

### Files to Modify

1. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Add new `StaffingCostsSection` component
   - Import new icons (BedDoubleIcon, UtensilsIcon from lucide-react)
   - Render section in Costs tab when `compliancePlan` exists and is required

2. **`apps/web/modules/saas/quotes/components/StaffingCostsSection.tsx`** (NEW)

   - New component for detailed staffing cost display
   - Props: `compliancePlan: CompliancePlan`
   - Handles all three staffing types (DOUBLE_CREW, RELAY_DRIVER, MULTI_DAY)

3. **`apps/web/locales/fr/common.json`** and **`apps/web/locales/en/common.json`**
   - Add translation keys for staffing cost labels

### Data Source

The staffing cost data comes from `tripAnalysis.compliancePlan`:

```typescript
interface CompliancePlan {
  planType: StaffingPlanType; // "DOUBLE_CREW" | "RELAY_DRIVER" | "MULTI_DAY"
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
  originalViolations: Array<{...}>;
  selectedReason: string;
}
```

### Cost Parameters Source

From `packages/api/src/services/compliance-validator.ts`:

- `driverHourlyCost`: 25€/h (default) or from `OrganizationPricingSettings.secondDriverHourlyRate`
- `hotelCostPerNight`: 100€/night (default) or from `OrganizationPricingSettings.hotelCostPerNight`
- `mealAllowancePerDay`: 30€/day (default) or from `OrganizationPricingSettings.mealCostPerDay`

---

## Test Cases

### TC1: Double Crew Staffing Display

**Precondition:** Quote with Paris → Lyon (10h32 driving), HEAVY vehicle  
**Steps:**

1. Create quote with long-distance trip requiring double crew
2. Navigate to TripTransparency Costs tab
   **Expected:**

- Staffing Costs section visible
- Second Driver Cost: ~5.25h × 25€/h = ~131€
- Total matches `compliancePlan.additionalCost`

### TC2: Multi-Day Staffing Display

**Precondition:** Quote with Paris → Nice (17h+ amplitude), HEAVY vehicle  
**Steps:**

1. Create quote with very long trip requiring multi-day
2. Navigate to TripTransparency Costs tab
   **Expected:**

- Staffing Costs section visible
- Hotel Cost: 1 night × 1 driver × 100€ = 100€
- Meal Allowance: 2 days × 1 driver × 30€ = 60€
- Extra Driver Cost for additional day
- Total matches `compliancePlan.additionalCost`

### TC3: No Staffing Section for Short Trips

**Precondition:** Quote with Paris → CDG (short trip), any vehicle  
**Steps:**

1. Create quote with short trip
2. Navigate to TripTransparency Costs tab
   **Expected:** No Staffing Costs section displayed

### TC4: Light Vehicle No Staffing

**Precondition:** Quote with any distance, LIGHT vehicle  
**Steps:**

1. Create quote with LIGHT vehicle category
2. Navigate to TripTransparency Costs tab
   **Expected:** No Staffing Costs section (RSE only applies to HEAVY)

### TC5: Translation Keys

**Precondition:** Application in French locale  
**Steps:**

1. Create quote with staffing costs
2. View Staffing Costs section
   **Expected:** All labels in French

---

## Dependencies

- **Epic 17** (Story 17.3): Automatic compliance-driven staffing integration
- **Epic 5** (Story 5.4): Suggest alternative staffing/scheduling options
- **Story 19.1**: Fix RSE compliance & pricing critical bugs

---

## Definition of Done

- [ ] `StaffingCostsSection` component created with all cost breakdowns
- [ ] Component integrated into TripTransparencyPanel Costs tab
- [ ] Icons (👥, 🏨, 🍽️) displayed for each cost type
- [ ] Explicit calculations shown (e.g., "5h × 25€/h = 125€")
- [ ] Source attribution badges displayed
- [ ] Translation keys added for FR and EN
- [ ] No staffing section when not required
- [ ] All test cases pass
- [ ] Code reviewed and merged

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│ 💰 Costs                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👥 STAFFING COSTS (RSE Compliance)                      │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ 👥 Second Driver Cost                                   │ │
│ │    5.25h × 25€/h = 131.25€                    [Org]    │ │
│ │                                                         │ │
│ │ 🏨 Hotel Cost                                           │ │
│ │    2 nights × 2 drivers × 85€/night = 340€    [Org]    │ │
│ │                                                         │ │
│ │ 🍽️ Meal Allowance                                       │ │
│ │    2 days × 2 drivers × 30€/day = 120€        [Default]│ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Total Staffing Cost                      591.25€       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ⛽ Fuel                                                      │
│    450.5 km × 12 L/100km × 1.85€/L = 100.01€      [API]    │
│                                                              │
│ 🛣️ Tolls                                                    │
│    45.50€                                          [API]    │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Estimation

- **Development:** 3-4 hours
- **Testing:** 1-2 hours
- **Total:** 4-6 hours

---

## Notes

- The existing `StaffingPlanBadge` component shows a summary; this story adds the detailed breakdown
- Keep the badge in the header area, add detailed section in Costs tab
- Use consistent styling with existing cost rows (EditableCostRow pattern)
- The staffing costs are NOT editable (unlike fuel, tolls, etc.) as they are compliance-driven
