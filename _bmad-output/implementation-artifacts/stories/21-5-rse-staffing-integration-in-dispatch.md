# Story 21-5: RSE Staffing Integration in Dispatch

## Story Information

| Field                | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| **Story ID**         | 21-5                                                              |
| **Epic**             | Epic 21 - Complete Pricing System Refactor with Full Transparency |
| **Title**            | RSE Staffing Integration in Dispatch                              |
| **Status**           | Ready for Development                                             |
| **Priority**         | HIGH                                                              |
| **Estimated Effort** | M (Medium)                                                        |
| **Created**          | 2026-01-03                                                        |

---

## User Story

**As a** dispatcher,  
**I want** to see all RSE staffing information in the dispatch screen,  
**So that** I can assign drivers and see associated costs before confirming assignments.

---

## Description

This story enhances the dispatch interface to display comprehensive RSE (Réglementation Sociale Européenne) staffing information directly in the mission details panel. When a mission requires special staffing arrangements (double crew, hotel stays, meals), this information must be clearly visible with detailed cost breakdowns.

The implementation adds a new `StaffingCostsSection` component that displays:

- Driver count requirements with RSE justification
- Hotel costs with per-night breakdown
- Meal costs with per-driver breakdown
- Total staffing costs

This information is extracted from the `tripAnalysis.compliancePlan` and `tripAnalysis.staffingCosts` already calculated by the pricing engine.

---

## Related FRs

- **FR97**: RSE staffing information display in dispatch
- **FR98**: Staffing cost transparency
- **FR64**: Automatic compliance-driven staffing integration
- **FR65**: Staffing plan and costs in tripAnalysis

---

## Acceptance Criteria

### AC1: Staffing Section Display in Mission Details

**Given** a mission with RSE staffing requirements (double driver, hotel, meals),  
**When** I select the mission in the dispatch screen,  
**Then** I see a "Staffing Costs" section in the right panel with:

- Icon 👥 with required driver count
- Detail text: "2 drivers (RSE 13h amplitude)" or similar
- Total staffing cost displayed prominently

### AC2: Hotel Costs Display

**Given** a mission requiring overnight stays,  
**When** I view the staffing section,  
**Then** I see:

- Icon 🏨 with night count
- Detailed calculation: "2 nights × 2 drivers × 85€ = 340€"
- Source of hotel rate (organization config)

### AC3: Meal Costs Display

**Given** a mission requiring meal allowances,  
**When** I view the staffing section,  
**Then** I see:

- Icon 🍽️ with meal count
- Detailed calculation: "4 meals × 25€ = 100€"
- Breakdown by driver if applicable

### AC4: Clickable Details

**Given** any staffing cost item,  
**When** I click on it,  
**Then** I see an expanded view with:

- Full calculation breakdown
- Applied rates and their sources
- RSE rule that triggered the requirement

### AC5: Color-Coded Status

**Given** staffing information display,  
**When** viewing the section,  
**Then** items are color-coded:

- Green: Standard staffing (single driver, no extras)
- Amber: RSE-required staffing (double crew, hotel, meals)
- Red: Missing required staffing (not yet assigned)

### AC6: Integration with Existing Compliance Panel

**Given** the existing `MissionComplianceDetails` component,  
**When** a mission has RSE staffing,  
**Then** the new staffing section appears ABOVE the compliance details,  
**And** both sections are visually consistent in styling.

### AC7: No Staffing Section for Simple Missions

**Given** a mission with no RSE staffing requirements,  
**When** I view the mission details,  
**Then** no staffing section is displayed (or shows "Standard staffing - 1 driver").

### AC8: Translations Support

**Given** the staffing section,  
**When** displayed in French or English,  
**Then** all labels, tooltips, and calculations are properly translated.

---

## Test Cases

### TC1: Display Staffing for Double Crew Mission

**Preconditions:** Mission with `tripAnalysis.compliancePlan.planType === "DOUBLE_CREW"`
**Steps:**

1. Navigate to Dispatch page
2. Select a mission requiring double crew
3. Verify staffing section appears
4. Verify driver count shows "2 drivers"
5. Verify RSE justification is displayed
   **Expected:** Staffing section shows double crew requirement with costs

### TC2: Display Hotel Costs

**Preconditions:** Mission with overnight stay requirement
**Steps:**

1. Select mission with hotel costs in tripAnalysis
2. Verify hotel section appears with 🏨 icon
3. Verify calculation breakdown is correct
4. Click to expand details
   **Expected:** Hotel costs displayed with full breakdown

### TC3: Display Meal Costs

**Preconditions:** Mission with meal allowances
**Steps:**

1. Select mission with meal costs in tripAnalysis
2. Verify meals section appears with 🍽️ icon
3. Verify per-meal rate is correct
   **Expected:** Meal costs displayed with count and total

### TC4: No Staffing Section for Simple Mission

**Preconditions:** Mission with single driver, no RSE requirements
**Steps:**

1. Select a simple transfer mission
2. Check right panel
   **Expected:** No staffing section displayed OR minimal "Standard staffing" indicator

### TC5: Color Coding Verification

**Preconditions:** Various missions with different staffing states
**Steps:**

1. Select mission with standard staffing → verify green/neutral
2. Select mission with RSE staffing → verify amber
3. Select mission requiring but missing second driver → verify red
   **Expected:** Correct color coding for each state

### TC6: French Translation

**Preconditions:** App locale set to French
**Steps:**

1. Navigate to Dispatch
2. Select mission with RSE staffing
3. Verify all labels are in French
   **Expected:** "Coûts de personnel", "conducteurs", "nuits", "repas" etc.

---

## Technical Notes

### Files to Create

- `apps/web/modules/saas/dispatch/components/StaffingCostsSection.tsx` - New component

### Files to Modify

- `apps/web/modules/saas/dispatch/components/DispatchPage.tsx` - Add StaffingCostsSection
- `apps/web/modules/saas/dispatch/types/mission.ts` - Add staffing types if needed
- `apps/web/locales/en/dispatch.json` - Add translations
- `apps/web/locales/fr/dispatch.json` - Add translations

### Data Source

The staffing information comes from `tripAnalysis` stored on the Quote/Mission:

```typescript
tripAnalysis: {
  compliancePlan: {
    planType: "SINGLE_DRIVER" | "DOUBLE_CREW" | "RELAY" | "MULTI_DAY",
    reason: string,
    driverCount: number,
    totalDrivingHours: number,
    totalAmplitudeHours: number
  },
  staffingCosts: {
    secondDriverCost: number,
    hotelCost: number,
    mealCost: number,
    totalStaffingCost: number,
    breakdown: {
      hotelNights: number,
      hotelRatePerNight: number,
      mealCount: number,
      mealRatePerMeal: number,
      secondDriverHours: number,
      secondDriverHourlyRate: number
    }
  }
}
```

### Component Structure

```tsx
<StaffingCostsSection
  tripAnalysis={selectedMission?.tripAnalysis}
  isLoading={missionDetailLoading}
  className="..."
/>
```

### Styling Guidelines

- Use existing Card/CardContent components
- Icons: Users (👥), Building2 (🏨), UtensilsCrossed (🍽️)
- Colors: amber-50/amber-950 for RSE items, green-50/green-950 for standard
- Collapsible sections for detailed breakdowns

---

## Dependencies

- **Epic 8** (Dispatch) - Base dispatch screen ✅ Done
- **Epic 17** (Staffing Integration) - Staffing cost calculation ✅ Done
- **Story 21-1** (Staffing Costs Display in TripTransparency) ✅ Done - Can reuse patterns

---

## Out of Scope

- Modifying the pricing engine calculations
- Adding new API endpoints (use existing mission detail)
- Changing the AssignmentDrawer (already has double crew support from Story 20.8)

---

## Definition of Done

- [ ] StaffingCostsSection component created and tested
- [ ] Component integrated into DispatchPage
- [ ] All acceptance criteria verified via Playwright MCP
- [ ] French and English translations added
- [ ] No console errors or warnings
- [ ] Code follows existing patterns and style
- [ ] Sprint status updated to `done`
