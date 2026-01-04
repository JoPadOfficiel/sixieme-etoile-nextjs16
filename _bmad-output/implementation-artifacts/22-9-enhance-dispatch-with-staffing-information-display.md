# Story 22.9: Enhance Dispatch with Staffing Information Display

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** ready-for-dev  
**Created:** 2026-01-04  
**Priority:** High  
**Branch:** feature/22-9-dispatch-staffing-display

---

## User Story

**As a** dispatcher,  
**I want** to see complete staffing details when assigning missions,  
**So that** I can make informed decisions about driver allocation and costs.

---

## Description

This story enhances the dispatch interface to display comprehensive staffing information directly in mission lists and detail views. While the `StaffingCostsSection` component already exists (Story 21.5), this story adds:

1. **Staffing Indicators in Mission List**: Visual icons in MissionRow showing RSE requirements (hotel, meals, second driver)
2. **Timeline View for Multi-Day Missions**: Daily staffing breakdown for STAY trips
3. **Driver Availability Integration**: Show which drivers can fulfill staffing requirements
4. **Alternative Staffing Options**: Display cost implications of different staffing configurations

### Business Value

- **Quick Visual Assessment**: Dispatchers can identify RSE-heavy missions at a glance
- **Informed Assignment**: See driver availability before opening assignment drawer
- **Cost Transparency**: Understand staffing cost implications before assignment
- **Multi-Day Support**: Proper handling of STAY trips with daily staffing needs

### Prerequisites

- ✅ Story 21.5: RSE Staffing Integration in Dispatch (StaffingCostsSection component)
- ✅ Story 22.5-22.8: STAY trip type complete
- ✅ Epic 8: Dispatch interface

---

## Acceptance Criteria

### AC1: Staffing Indicators in Mission List

```gherkin
Given a mission with RSE staffing requirements
When I view the missions list
Then I see visual indicators showing:
  - Hotel icon (🏨) if overnight stay required
  - Meal icon (🍽️) if meal allowance included
  - Double driver icon (👥) if second driver required
And the indicators are color-coded (amber for RSE requirements)
And hovering shows tooltip with details
```

### AC2: Mission Row Staffing Summary

```gherkin
Given a mission with staffing costs
When I view the mission row in the list
Then I see a compact staffing summary:
  - Number of drivers required
  - Number of hotel nights
  - Total staffing cost badge
And this information is visible without selecting the mission
```

### AC3: Timeline View for Multi-Day Missions

```gherkin
Given a STAY mission with multiple days
When I select the mission
Then I see a timeline view showing:
  - Each day with its services
  - Daily staffing requirements (drivers, hotel, meals)
  - Daily costs breakdown
And the timeline is collapsible for compact view
```

### AC4: Driver Availability Display

```gherkin
Given a selected mission with staffing requirements
When I view the staffing section
Then I see driver availability information:
  - Number of available drivers for the mission window
  - Drivers with required licenses
  - Drivers already assigned to overlapping missions
And this helps dispatchers make informed assignment decisions
```

### AC5: Alternative Staffing Options

```gherkin
Given a mission requiring RSE compliance
When I view the staffing section
Then I see alternative staffing options:
  - Single driver (if compliant)
  - Double crew with cost
  - Relay driver with cost
And each option shows the cost difference
```

### AC6: Staffing Badge in DispatchBadges

```gherkin
Given a mission with non-standard staffing
When I view the dispatch badges
Then I see a staffing badge indicating:
  - "RSE" for missions requiring compliance measures
  - Driver count if more than 1
And the badge is consistent with other dispatch badges
```

### AC7: STAY Trip Staffing Display

```gherkin
Given a STAY trip with stayDays data
When I view the mission in dispatch
Then the staffing section shows:
  - Total days and services count
  - Aggregated hotel nights
  - Aggregated meal count
  - Per-day breakdown expandable
```

---

## Technical Implementation

### Files to Modify

```
apps/web/modules/saas/dispatch/components/MissionRow.tsx
├── Add StaffingIndicators component
├── Show staffing summary in row
├── Handle STAY trip type display

apps/web/modules/saas/dispatch/components/DispatchBadges.tsx
├── Add RSE/staffing badge
├── Show driver count badge

apps/web/modules/saas/dispatch/components/StaffingCostsSection.tsx
├── Add timeline view for multi-day missions
├── Add alternative staffing options display
├── Add driver availability section
├── Support STAY trip stayDays data

apps/web/modules/saas/dispatch/types.ts
├── Extend MissionListItem with staffing summary
├── Add StaffingIndicators type
```

### Files to Create

```
apps/web/modules/saas/dispatch/components/StaffingIndicators.tsx
├── Compact visual indicators for mission list
├── Hotel, meal, driver icons
├── Tooltip with details

apps/web/modules/saas/dispatch/components/StaffingTimeline.tsx
├── Timeline view for multi-day missions
├── Per-day breakdown
├── Collapsible sections

apps/web/modules/saas/dispatch/components/AlternativeStaffingOptions.tsx
├── Display staffing alternatives
├── Cost comparison
├── Selection support (future)
```

### Key Components to Implement

```typescript
// StaffingIndicators - Compact icons for mission list
interface StaffingIndicatorsProps {
  hasHotel: boolean;
  hasMeals: boolean;
  hasSecondDriver: boolean;
  driverCount: number;
  totalCost?: number;
  className?: string;
}

// StaffingTimeline - Multi-day breakdown
interface StaffingTimelineProps {
  stayDays?: StayDay[];
  compliancePlan?: CompliancePlan;
  isExpanded?: boolean;
  onToggle?: () => void;
}

// AlternativeStaffingOptions - Staffing alternatives
interface AlternativeStaffingOptionsProps {
  currentPlan: StaffingPlan;
  alternatives?: StaffingAlternative[];
  onSelectAlternative?: (alternative: StaffingAlternative) => void;
}
```

### Type Extensions

```typescript
// Extend MissionListItem
interface MissionListItem {
  // ... existing fields
  staffingSummary?: {
    driverCount: number;
    hotelNights: number;
    mealCount: number;
    totalStaffingCost: number;
    planType: StaffingPlanType;
    isRSERequired: boolean;
  };
  stayDays?: StayDayListItem[];
}

// StayDayListItem for list display
interface StayDayListItem {
  dayNumber: number;
  date: string;
  serviceCount: number;
  hotelRequired: boolean;
  mealCount: number;
  driverCount: number;
}
```

---

## Tasks / Subtasks

- [ ] Task 1: Create StaffingIndicators Component (AC: #1, #2)

  - [ ] Create StaffingIndicators.tsx with hotel/meal/driver icons
  - [ ] Add tooltip with staffing details
  - [ ] Add total cost badge
  - [ ] Style with amber color for RSE requirements

- [ ] Task 2: Update MissionRow with Staffing Display (AC: #1, #2)

  - [ ] Integrate StaffingIndicators in MissionRow
  - [ ] Show staffing summary in compact format
  - [ ] Handle STAY trip type display

- [ ] Task 3: Add RSE Badge to DispatchBadges (AC: #6)

  - [ ] Add RSE badge for non-standard staffing
  - [ ] Show driver count when > 1
  - [ ] Consistent styling with other badges

- [ ] Task 4: Create StaffingTimeline Component (AC: #3, #7)

  - [ ] Create timeline view for multi-day missions
  - [ ] Show per-day staffing breakdown
  - [ ] Make collapsible for compact view
  - [ ] Support STAY trip stayDays data

- [ ] Task 5: Create AlternativeStaffingOptions Component (AC: #5)

  - [ ] Display staffing alternatives
  - [ ] Show cost comparison
  - [ ] Prepare for future selection support

- [ ] Task 6: Enhance StaffingCostsSection (AC: #4, #7)

  - [ ] Add driver availability section
  - [ ] Integrate timeline for multi-day
  - [ ] Add alternative options display

- [ ] Task 7: Update API to Include Staffing Summary (AC: #2)

  - [ ] Extend missions list endpoint with staffing summary
  - [ ] Include stayDays summary for STAY trips
  - [ ] Optimize query for list performance

- [ ] Task 8: Add Translations (AC: All)
  - [ ] Add French translations for new UI elements
  - [ ] Add English translations

---

## Test Cases

### API Tests (Curl)

```bash
# Get missions list with staffing summary
curl -X GET "http://localhost:3000/api/vtc/missions?includeStaffing=true" \
  -H "Cookie: better-auth.session_token=..."

# Expected: missions with staffingSummary field

# Get STAY mission detail with stayDays
curl -X GET "http://localhost:3000/api/vtc/missions/{missionId}" \
  -H "Cookie: better-auth.session_token=..."

# Expected: mission with stayDays array and staffing details
```

### Database Verification

```sql
-- Verify missions with RSE staffing requirements
SELECT
  q.id,
  q.trip_type,
  q.trip_analysis->'compliancePlan'->>'planType' as plan_type,
  q.trip_analysis->'staffingCosts'->>'totalStaffingCost' as staffing_cost
FROM quote q
WHERE q.status = 'ACCEPTED'
AND q.trip_analysis->'compliancePlan'->>'planType' != 'SINGLE_DRIVER'
ORDER BY q.created_at DESC
LIMIT 10;

-- Verify STAY missions with stayDays
SELECT
  q.id,
  q.trip_type,
  COUNT(sd.id) as day_count,
  SUM(sd.hotel_cost) as total_hotel,
  SUM(sd.meal_cost) as total_meals
FROM quote q
LEFT JOIN stay_day sd ON sd.quote_id = q.id
WHERE q.trip_type = 'STAY'
GROUP BY q.id, q.trip_type
ORDER BY q.created_at DESC
LIMIT 5;
```

### UI Tests (Playwright MCP)

```typescript
describe("Dispatch Staffing Display", () => {
  it("should show staffing indicators in mission list", async () => {
    // Navigate to dispatch
    // Find mission with RSE requirements
    // Verify hotel/meal/driver icons visible
    // Verify tooltip on hover
  });

  it("should show RSE badge for non-standard staffing", async () => {
    // Navigate to dispatch
    // Find mission with double crew
    // Verify RSE badge visible
    // Verify driver count badge
  });

  it("should show timeline for STAY missions", async () => {
    // Navigate to dispatch
    // Select STAY mission
    // Verify timeline visible
    // Verify per-day breakdown
    // Test collapse/expand
  });

  it("should show alternative staffing options", async () => {
    // Select mission with RSE requirements
    // Verify alternatives displayed
    // Verify cost comparison shown
  });
});
```

---

## Dev Notes

### Architecture Patterns

- Follow existing dispatch component patterns
- Use Collapsible for expandable sections
- Maintain consistent badge styling
- Reuse existing StaffingCostsSection as base

### Existing Code to Reuse

- `apps/web/modules/saas/dispatch/components/StaffingCostsSection.tsx` - Base staffing display
- `apps/web/modules/saas/dispatch/components/DispatchBadges.tsx` - Badge patterns
- `apps/web/modules/saas/quotes/components/StaffingCostsSection.tsx` - Quote staffing display
- `apps/web/modules/saas/dispatch/types.ts` - Type definitions

### Important Considerations

1. **Performance**: Staffing summary should be computed server-side for list
2. **Backward Compatibility**: Existing missions without staffing data should display gracefully
3. **Responsive Design**: Indicators should work on smaller screens
4. **Accessibility**: Icons should have proper aria-labels
5. **Translations**: All new text must be translated (FR/EN)

### Project Structure Notes

- Components in `apps/web/modules/saas/dispatch/components/`
- Types in `apps/web/modules/saas/dispatch/types.ts`
- Translations in `apps/web/content/locales/{locale}/dispatch.json`
- API routes in `packages/api/src/routes/vtc/missions.ts`

### References

- [Source: docs/bmad/epics.md#Story-22.9]
- [Source: apps/web/modules/saas/dispatch/components/StaffingCostsSection.tsx]
- [Source: apps/web/modules/saas/dispatch/components/MissionRow.tsx]
- [Source: apps/web/modules/saas/dispatch/components/DispatchBadges.tsx]

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Completion Notes List

- Created `StaffingIndicators` component for compact visual indicators in mission list
- Created `StaffingTimeline` component for multi-day STAY mission display
- Updated `MissionRow` to display staffing indicators and STAY trip type badge
- Extended `MissionListItem` type with `staffingSummary`, `tripType`, and `stayDays`
- Added `getStaffingSummary()` function in missions API to extract staffing data
- Updated missions API to include staffing summary in list response
- Added English and French translations for new UI elements
- Integrated `StaffingTimeline` in `DispatchPage` for STAY missions

### File List

**Created:**

- `apps/web/modules/saas/dispatch/components/StaffingIndicators.tsx`
- `apps/web/modules/saas/dispatch/components/StaffingTimeline.tsx`

**Modified:**

- `apps/web/modules/saas/dispatch/components/MissionRow.tsx`
- `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`
- `apps/web/modules/saas/dispatch/types/mission.ts`
- `packages/api/src/routes/vtc/missions.ts`
- `packages/i18n/translations/en.json`
- `packages/i18n/translations/fr.json`

---

## Change Log

| Date       | Change        | Author            |
| ---------- | ------------- | ----------------- |
| 2026-01-04 | Story created | BMAD Orchestrator |
