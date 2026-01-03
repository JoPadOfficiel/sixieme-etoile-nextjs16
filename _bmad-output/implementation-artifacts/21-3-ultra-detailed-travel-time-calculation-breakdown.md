# Story 21.3: Ultra-Detailed Travel Time Calculation Breakdown

**Epic:** Epic 21 - Complete Pricing System Refactor with Full Transparency  
**Story ID:** 21-3  
**Status:** Ready for Development  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Created:** 2026-01-03

---

## User Story

**As an** operator,  
**I want** to understand how travel time is calculated,  
**So that** I can explain differences with Google Maps and validate estimates for clients.

---

## Description

This story enhances the TripTransparencyPanel to display ultra-detailed travel time calculation breakdown. Currently, operators see only the final travel time but don't understand why it differs from Google Maps estimates. This story adds a dedicated "Time Analysis" section in the TripTransparency panel with:

- **Base Google Maps Time**: Reference time from Google Routes API
- **Vehicle Surcharge**: Additional time for heavy vehicles (coaches travel slower than cars)
- **Traffic Surcharge**: Rush hour or congestion adjustments
- **Mandatory Breaks**: RSE-required driving breaks for heavy vehicles
- **Total Calculated Time**: Final time with all adjustments
- **Icons**: Visual indicators (⏱️ for time, 🚌 for vehicle, 🚦 for traffic, ☕ for breaks)
- **Source Attribution**: Show where each parameter comes from (vehicle config, regulation, Google API)

---

## Related FRs

- **FR93**: Display ultra-detailed travel time calculation breakdown in TripTransparency
- **FR94**: Show explicit calculation formulas for each time component
- **FR26**: Regulatory constraints (breaks, amplitude) stored in configuration
- **FR40**: Europe/Paris business time strategy

---

## Acceptance Criteria

### AC1: Time Analysis Section Display

**Given** a quote with calculated travel time,  
**When** I display the TripTransparency panel,  
**Then** I see a dedicated "Time Analysis" section with a purple/violet background and border.

### AC2: Base Google Maps Time Display

**Given** a quote with routing data from Google Routes API,  
**When** I view the Time Analysis section,  
**Then** I see:

- Icon: 🗺️ (MapIcon)
- Label: "Base Google Maps Time"
- Value: "{hours}h{minutes}" (e.g., "10h00")
- Badge: [Google API] or [Estimate]

### AC3: Vehicle Type Surcharge Display

**Given** a quote with a HEAVY vehicle category (coach, minibus),  
**When** I view the Time Analysis section,  
**Then** I see:

- Icon: 🚌 (BusIcon)
- Label: "Vehicle Type Adjustment"
- Calculation: "+{percentage}% ({reason})"
- Example: "+40% (Coach average speed 70km/h vs car 100km/h)"
- Value: "+{hours}h{minutes}" (e.g., "+4h00")

### AC4: Traffic Surcharge Display

**Given** a quote with traffic adjustments applied,  
**When** I view the Time Analysis section,  
**Then** I see:

- Icon: 🚦 (TrafficConeIcon)
- Label: "Traffic Adjustment"
- Calculation: "+{percentage}% ({reason})"
- Example: "+15% (Rush hour departure 08:00)"
- Value: "+{hours}h{minutes}" (e.g., "+1h30")

### AC5: Mandatory Breaks Display (RSE)

**Given** a quote with HEAVY vehicle requiring mandatory breaks,  
**When** I view the Time Analysis section,  
**Then** I see:

- Icon: ☕ (CoffeeIcon)
- Label: "Mandatory Driving Breaks"
- Calculation: "{breakCount} breaks × {breakDuration}min"
- Example: "5 breaks × 45min = 3h45"
- Regulation reference: "RSE Art. 561-2"
- Value: "+{hours}h{minutes}" (e.g., "+3h45")

### AC6: Total Calculated Time

**Given** a quote with time analysis,  
**When** I view the Time Analysis section,  
**Then** I see a total row with:

- Label: "Total Estimated Time"
- Bold total value: "{hours}h{minutes}"
- Comparison with Google Maps: "(+{diff} vs Google Maps)"

### AC7: No Time Analysis for Simple Trips

**Given** a quote with LIGHT vehicle and no adjustments,  
**When** I display the TripTransparency panel,  
**Then** I see a simplified Time Analysis showing only:

- Base Google Maps Time
- Total Time (same as base)
- No adjustment rows

### AC8: Source Attribution

**Given** any time component line item,  
**When** I view the time details,  
**Then** I see a small badge indicating the source:

- "Google API" for routing data
- "Vehicle Config" for vehicle-specific adjustments
- "RSE Regulation" for mandatory breaks
- "Org Config" for traffic multipliers

---

## Technical Notes

### Files to Modify

1. **`apps/web/modules/saas/quotes/components/TimeAnalysisSection.tsx`** (NEW)

   - New component for detailed time calculation display
   - Props: `tripAnalysis: TripAnalysis`, `vehicleCategory: VehicleCategory | null`
   - Handles all time adjustment types

2. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Import and render `TimeAnalysisSection` in a new "Time" tab or in Overview
   - Pass tripAnalysis and vehicleCategory data

3. **`packages/api/src/services/pricing-engine.ts`**

   - Enhance `tripAnalysis` to include detailed time breakdown
   - Add `timeAnalysis` object to store calculation components

4. **`packages/api/src/services/pricing/types.ts`**

   - Add `TimeAnalysis` interface definition

5. **`apps/web/locales/fr/common.json`** and **`apps/web/locales/en/common.json`**
   - Add translation keys for time analysis labels

### Data Structure

Add to `tripAnalysis`:

```typescript
interface TimeAnalysis {
  baseGoogleTime: {
    durationMinutes: number;
    source: "GOOGLE_API" | "ESTIMATE";
    fetchedAt?: string;
  };
  vehicleAdjustment: {
    percentage: number;
    additionalMinutes: number;
    reason: string; // e.g., "Coach average speed 70km/h"
    vehicleCategoryName: string;
  } | null;
  trafficAdjustment: {
    percentage: number;
    additionalMinutes: number;
    reason: string; // e.g., "Rush hour departure"
    appliedRule: string;
  } | null;
  mandatoryBreaks: {
    breakCount: number;
    breakDurationMinutes: number;
    totalBreakMinutes: number;
    regulationReference: string; // e.g., "RSE Art. 561-2"
    isHeavyVehicle: boolean;
  } | null;
  totalDurationMinutes: number;
  differenceFromGoogle: number; // in minutes
}
```

### Calculation Logic

From `packages/api/src/services/pricing-engine.ts`:

1. **Base Time**: From Google Routes API `routes[0].duration`
2. **Vehicle Adjustment**:
   - HEAVY vehicles (coach, minibus): +40% (average speed 70km/h vs 100km/h)
   - LIGHT vehicles: 0%
3. **Traffic Adjustment**: Based on departure time
   - Rush hour (07:00-09:00, 17:00-19:00): +15%
   - Night (22:00-06:00): -10%
   - Weekend: -5%
4. **Mandatory Breaks**: For HEAVY vehicles only
   - 45min break every 4.5h of driving
   - Formula: `Math.floor(drivingHours / 4.5) * 45`

### RSE Regulation Reference

From `packages/api/src/services/compliance-validator.ts`:

- Maximum continuous driving: 4.5 hours
- Mandatory break duration: 45 minutes
- Maximum daily driving: 9 hours (can be extended to 10h twice per week)
- Maximum daily amplitude: 13 hours

---

## Test Cases

### TC1: Long Trip with All Adjustments (Paris → Nice)

**Precondition:** Quote with Paris → Nice, HEAVY vehicle (Coach), departure 08:00  
**Steps:**

1. Create quote with long-distance trip
2. Navigate to TripTransparency panel
   **Expected:**

- Time Analysis section visible
- Base Google Maps Time: ~10h00
- Vehicle Adjustment: +40% (+4h00)
- Traffic Adjustment: +15% (+1h30)
- Mandatory Breaks: 3 breaks × 45min = 2h15
- Total: ~17h45
- Difference shown: "+7h45 vs Google Maps"

### TC2: Short Trip No Adjustments (Paris → CDG)

**Precondition:** Quote with Paris → CDG, LIGHT vehicle (Berline), departure 14:00  
**Steps:**

1. Create quote with short trip
2. Navigate to TripTransparency panel
   **Expected:**

- Time Analysis section visible (simplified)
- Base Google Maps Time: ~45min
- No Vehicle Adjustment (LIGHT)
- No Traffic Adjustment (off-peak)
- No Mandatory Breaks (short trip)
- Total: ~45min

### TC3: Heavy Vehicle with Breaks

**Precondition:** Quote with 6h driving time, HEAVY vehicle  
**Steps:**

1. Create quote with medium-distance trip
2. Navigate to TripTransparency panel
   **Expected:**

- Mandatory Breaks: 1 break × 45min = 45min
- Regulation reference: "RSE Art. 561-2"
- Total includes break time

### TC4: Night Departure Discount

**Precondition:** Quote with departure at 23:00  
**Steps:**

1. Create quote with night departure
2. Navigate to TripTransparency panel
   **Expected:**

- Traffic Adjustment: -10% (Night travel)
- Total time reduced from base

### TC5: Translation Keys

**Precondition:** Application in French locale  
**Steps:**

1. Create quote with time analysis
2. View Time Analysis section
   **Expected:** All labels in French

### TC6: API Verification

**Precondition:** Quote created via API  
**Steps:**

1. Call POST /api/vtc/pricing/calculate with trip data
2. Verify response includes `timeAnalysis` object
   **Expected:**

- `timeAnalysis.baseGoogleTime` present
- `timeAnalysis.totalDurationMinutes` matches displayed value
- All adjustment fields populated correctly

---

## Dependencies

- **Story 21.1**: Ultra-detailed staffing costs display (pattern to follow)
- **Story 21.2**: Detailed approach fee display (pattern to follow)
- **Epic 20** (Story 20.2): Google Routes API migration
- **Epic 5** (Story 5.3): Heavy vehicle compliance validator

---

## Definition of Done

- [ ] `TimeAnalysisSection` component created with all time breakdowns
- [ ] Component integrated into TripTransparencyPanel
- [ ] Icons (🗺️, 🚌, 🚦, ☕) displayed for each time component
- [ ] Explicit calculations shown (e.g., "+40% = +4h00")
- [ ] Source attribution badges displayed
- [ ] `timeAnalysis` object added to pricing engine response
- [ ] Translation keys added for FR and EN
- [ ] Simplified view for trips without adjustments
- [ ] All test cases pass (Playwright MCP + Curl + DB verification)
- [ ] Code reviewed and merged
- [ ] sprint-status.yaml updated to `done`

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│ ⏱️ Time Analysis                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⏱️ TRAVEL TIME BREAKDOWN                                │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ 🗺️ Base Google Maps Time                    [Google API]│ │
│ │    Reference travel time                      10h00     │ │
│ │                                                         │ │
│ │ 🚌 Vehicle Type Adjustment                [Vehicle Config]│
│ │    +40% (Coach avg speed 70km/h vs car)      +4h00     │ │
│ │                                                         │ │
│ │ 🚦 Traffic Adjustment                      [Org Config] │ │
│ │    +15% (Rush hour departure 08:00)          +1h30     │ │
│ │                                                         │ │
│ │ ☕ Mandatory Driving Breaks              [RSE Regulation]│ │
│ │    3 breaks × 45min (RSE Art. 561-2)         +2h15     │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Total Estimated Time                         17h45     │ │
│ │ (+7h45 vs Google Maps)                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Estimation

- **Development:** 5-6 hours
- **Testing:** 2-3 hours
- **Total:** 7-9 hours

---

## Notes

- The time analysis is read-only (not editable) as it's calculated from objective data
- Keep the section visually distinct from other sections (use purple/violet vs blue for staffing, amber for positioning)
- The time breakdown helps operators explain to clients why VTC estimates differ from Google Maps
- For LIGHT vehicles, most adjustments will be null/zero - show simplified view
- Consider adding a collapsible "Why is this different from Google Maps?" explanation
- The mandatory breaks calculation assumes continuous driving; actual breaks may vary based on route stops
- Traffic adjustments are based on departure time; consider adding real-time traffic data in future

---

## API Contract

### Request (existing)

```typescript
POST /api/vtc/pricing/calculate
{
  tripType: "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID",
  pickupAddress: string,
  dropoffAddress: string,
  pickupAt: string, // ISO datetime
  vehicleCategoryId: string,
  // ... other fields
}
```

### Response Enhancement

```typescript
{
  // ... existing fields
  tripAnalysis: {
    // ... existing fields
    timeAnalysis: {
      baseGoogleTime: {
        durationMinutes: 600, // 10h00
        source: "GOOGLE_API",
        fetchedAt: "2026-01-03T08:00:00Z"
      },
      vehicleAdjustment: {
        percentage: 40,
        additionalMinutes: 240, // +4h00
        reason: "Coach average speed 70km/h vs car 100km/h",
        vehicleCategoryName: "Autocar"
      },
      trafficAdjustment: {
        percentage: 15,
        additionalMinutes: 90, // +1h30
        reason: "Rush hour departure 08:00",
        appliedRule: "RUSH_HOUR_MORNING"
      },
      mandatoryBreaks: {
        breakCount: 3,
        breakDurationMinutes: 45,
        totalBreakMinutes: 135, // 2h15
        regulationReference: "RSE Art. 561-2",
        isHeavyVehicle: true
      },
      totalDurationMinutes: 1065, // 17h45
      differenceFromGoogle: 465 // +7h45
    }
  }
}
```

---

## Constraints

- Must not break existing pricing calculations
- Must maintain backward compatibility with existing API consumers
- Time calculations must use Europe/Paris timezone (FR40)
- Heavy vehicle detection based on `VehicleCategory.regulatoryCategory = "HEAVY"`
