# Story 21.2: Detailed Approach Fee and Empty Return Display

**Epic:** Epic 21 - Complete Pricing System Refactor with Full Transparency  
**Story ID:** 21-2  
**Status:** Ready for Development  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Created:** 2026-01-03

---

## User Story

**As an** operator,  
**I want** to see detailed approach and empty return costs in quotes,  
**So that** I understand how the total price is constructed and can explain positioning costs to clients.

---

## Description

This story enhances the TripTransparencyPanel to display ultra-detailed positioning costs (approach fee and empty return) when a vehicle must travel from its base to the pickup location and/or return empty after dropoff. Currently, these costs are included in the segment breakdown but lack explicit visibility and detailed calculations.

This story adds a dedicated "Positioning Costs" section in the Costs tab with:

- **Approach Fee**: Distance base → pickup × rate/km + time × rate/h with explicit calculation
- **Empty Return**: Distance dropoff → base × rate/km (when applicable)
- **Icons**: Visual indicators (🚗 for approach, 🔄 for return)
- **Source Attribution**: Show where each parameter comes from (vehicle base, org config)
- **Map Visualization**: Visual representation of approach/return routes on the route map

---

## Related FRs

- **FR91**: Display detailed approach fee and empty return costs in TripTransparency
- **FR92**: Show explicit calculation formulas for positioning cost components
- **FR21-FR24**: Shadow Calculation segments A/B/C (approach, service, return)

---

## Acceptance Criteria

### AC1: Positioning Costs Section Display

**Given** a quote with approach and/or return segments (segments.approach or segments.return exist),  
**When** I display the TripTransparency panel Costs tab,  
**Then** I see a dedicated "Positioning Costs" section with an amber/orange background and border.

### AC2: Approach Fee Display

**Given** a quote with an approach segment (base → pickup),  
**When** I view the Positioning Costs section,  
**Then** I see:

- Icon: 🚗 (CarIcon)
- Label: "Approach Fee"
- Calculation: "{distance}km × {ratePerKm}€/km + {duration}h × {hourlyRate}€/h = {total}€"
- Example: "15.5km × 0.45€/km + 0.5h × 25€/h = 19.48€"
- Base name: "From: {baseName}"

### AC3: Empty Return Display

**Given** a quote with a return segment (dropoff → base),  
**When** I view the Positioning Costs section,  
**Then** I see:

- Icon: 🔄 (RotateCcwIcon)
- Label: "Empty Return"
- Calculation: "{distance}km × {ratePerKm}€/km + {duration}h × {hourlyRate}€/h = {total}€"
- Example: "22.3km × 0.45€/km + 0.7h × 25€/h = 27.54€"
- Base name: "To: {baseName}"

### AC4: Total Positioning Cost

**Given** a quote with any positioning costs,  
**When** I view the Positioning Costs section,  
**Then** I see a total row with:

- Label: "Total Positioning Cost"
- Bold total amount
- Sum of approach + return costs

### AC5: No Positioning Section When Not Applicable

**Given** a quote without approach/return segments (e.g., vehicle already at pickup),  
**When** I display the TripTransparency panel Costs tab,  
**Then** I do NOT see the Positioning Costs section.

### AC6: Source Attribution

**Given** any positioning cost line item,  
**When** I view the cost details,  
**Then** I see a small badge indicating the source:

- "Base" for vehicle base location
- "Org Config" for organization pricing settings rates

### AC7: Route Map Visualization

**Given** a quote with approach/return segments,  
**When** I view the Route tab,  
**Then** I see:

- Approach route displayed as a dashed line (base → pickup)
- Return route displayed as a dashed line (dropoff → base)
- Base location marker with distinct icon (🏠)
- Legend explaining the route types

---

## Technical Notes

### Files to Modify

1. **`apps/web/modules/saas/quotes/components/PositioningCostsSection.tsx`** (NEW)

   - New component for detailed positioning cost display
   - Props: `segments: { approach: SegmentAnalysis | null; return: SegmentAnalysis | null }`, `vehicleSelection: VehicleSelectionInfo | null`
   - Handles both approach and return segments

2. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Import and render `PositioningCostsSection` in Costs tab
   - Pass segments and vehicleSelection data

3. **`apps/web/modules/saas/quotes/components/ModernRouteMap.tsx`**

   - Add support for displaying base location marker
   - Add dashed polylines for approach/return routes
   - Add legend for route types

4. **`packages/i18n/translations/fr.json`** and **`packages/i18n/translations/en.json`**
   - Add translation keys for positioning cost labels

### Data Source

The positioning cost data comes from `tripAnalysis.segments`:

```typescript
interface TripAnalysis {
  segments: {
    approach: SegmentAnalysis | null; // Base → Pickup
    service: SegmentAnalysis; // Pickup → Dropoff
    return: SegmentAnalysis | null; // Dropoff → Base
  };
  vehicleSelection?: {
    selectedVehicle?: {
      vehicleId: string;
      vehicleName: string;
      baseId: string;
      baseName: string;
    };
  };
}

interface SegmentAnalysis {
  name: "approach" | "service" | "return";
  description: string;
  distanceKm: number;
  durationMinutes: number;
  cost: {
    fuel: {
      amount: number;
      distanceKm: number;
      consumptionL100km: number;
      pricePerLiter: number;
    };
    tolls: { amount: number; distanceKm: number; ratePerKm: number };
    wear: { amount: number; distanceKm: number; ratePerKm: number };
    driver: { amount: number; durationMinutes: number; hourlyRate: number };
    parking: { amount: number; description: string };
    total: number;
  };
  isEstimated: boolean;
}
```

### Cost Calculation Formula

From `packages/api/src/services/pricing/shadow-calculator.ts`:

- Approach/Return cost = fuel + tolls + wear + driver
- Each component calculated using organization pricing settings

---

## Test Cases

### TC1: Quote with Approach and Return

**Precondition:** Quote with vehicle from Bussy base, pickup in Paris, dropoff at CDG  
**Steps:**

1. Create quote with Paris pickup, CDG dropoff
2. Navigate to TripTransparency Costs tab
   **Expected:**

- Positioning Costs section visible
- Approach Fee: Bussy → Paris (~35km)
- Empty Return: CDG → Bussy (~25km)
- Total matches sum of both

### TC2: Quote with Approach Only

**Precondition:** Quote where dropoff is near the base  
**Steps:**

1. Create quote with pickup far from base, dropoff near base
2. Navigate to TripTransparency Costs tab
   **Expected:**

- Positioning Costs section visible
- Approach Fee displayed
- No Empty Return (or 0km return)

### TC3: No Positioning Section for Local Trips

**Precondition:** Quote where pickup is at or very near the base  
**Steps:**

1. Create quote with pickup at Bussy (base location)
2. Navigate to TripTransparency Costs tab
   **Expected:** No Positioning Costs section (or section shows 0€)

### TC4: Route Map with Base Marker

**Precondition:** Quote with approach segment  
**Steps:**

1. Create quote with vehicle selection
2. Navigate to TripTransparency Route tab
   **Expected:**

- Base location marker visible (🏠)
- Dashed line from base to pickup
- Legend explaining route types

### TC5: Translation Keys

**Precondition:** Application in French locale  
**Steps:**

1. Create quote with positioning costs
2. View Positioning Costs section
   **Expected:** All labels in French

---

## Dependencies

- **Story 21.1**: Ultra-detailed staffing costs display (pattern to follow)
- **Epic 4** (Story 4.6): Shadow calculation segments A/B/C
- **Story 10.1**: Google Maps integration in quotes

---

## Definition of Done

- [ ] `PositioningCostsSection` component created with approach/return breakdowns
- [ ] Component integrated into TripTransparencyPanel Costs tab
- [ ] Icons (🚗, 🔄, 🏠) displayed for each cost type
- [ ] Explicit calculations shown (e.g., "15km × 0.45€/km = 6.75€")
- [ ] Source attribution badges displayed
- [ ] Base location marker added to route map
- [ ] Dashed polylines for approach/return routes
- [ ] Translation keys added for FR and EN
- [ ] No positioning section when not applicable
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
│ │ 🚗 POSITIONING COSTS (Deadhead)                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ 🚗 Approach Fee                                         │ │
│ │    From: Garage Bussy-Saint-Martin               [Base] │ │
│ │    15.5km × 0.45€/km = 6.98€                           │ │
│ │    + 25min × 25€/h = 10.42€                            │ │
│ │    Total: 17.40€                                        │ │
│ │                                                         │ │
│ │ 🔄 Empty Return                                         │ │
│ │    To: Garage Bussy-Saint-Martin                 [Base] │ │
│ │    22.3km × 0.45€/km = 10.04€                          │ │
│ │    + 35min × 25€/h = 14.58€                            │ │
│ │    Total: 24.62€                                        │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Total Positioning Cost                      42.02€      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 👥 STAFFING COSTS (RSE)                                 │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ⛽ Fuel                                                      │
│    450.5 km × 12 L/100km × 1.85€/L = 100.01€      [API]    │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Estimation

- **Development:** 4-5 hours
- **Testing:** 1-2 hours
- **Total:** 5-7 hours

---

## Notes

- The positioning costs are NOT editable (unlike fuel, tolls, etc.) as they are calculated from vehicle base location
- Keep the section visually distinct from StaffingCostsSection (use amber/orange vs blue)
- The approach/return costs are already included in the total internal cost; this section just makes them explicit
- Consider adding a tooltip explaining why positioning costs exist (deadhead distance)
- The base marker on the map should use a distinct icon to differentiate from pickup/dropoff markers
