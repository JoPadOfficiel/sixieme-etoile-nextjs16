# Story 21.4: Pricing Segments and Traversed Zones Visualization

**Epic:** Epic 21 - Complete Pricing System Refactor with Full Transparency  
**Story ID:** 21-4  
**Status:** Ready for Development  
**Priority:** HIGH  
**Effort:** M (Medium)  
**Created:** 2026-01-03

---

## User Story

**As an** operator,  
**I want** to see trip breakdown by segments and zones,  
**So that** I understand how each zone impacts the price and can explain pricing to clients.

---

## Description

This story enhances the TripTransparencyPanel to display detailed pricing segments and traversed zones for multi-zone trips. Currently, the panel shows basic zone multiplier information in the Overview tab, but operators cannot see the detailed breakdown of which zones are traversed and how each zone contributes to the final price.

This story adds a dedicated "Pricing Segments" section in the Route tab with:

- **Segment List**: Each segment showing from/to zones, distance, duration, and cost
- **Traversed Zones**: Visual list of all zones crossed in order (e.g., PARIS_20 → PARIS_40 → LYON_0)
- **Zone Multipliers**: The multiplier applied for each zone segment
- **Segment Costs**: Individual cost contribution per segment
- **Map Visualization**: Entry/exit points for each zone segment
- **Icons**: Visual indicators (🗺️ for zones, 📍 for entry/exit points, 💰 for costs)
- **Source Attribution**: Show segmentation method (POLYLINE vs FALLBACK)

The data already exists in `tripAnalysis.zoneSegments` and `tripAnalysis.routeSegmentation` from Story 17.13 (Route Segmentation for Multi-Zone Trips). This story focuses on the UI visualization.

---

## Related FRs

- **FR95**: Display pricing segments and traversed zones in TripTransparency
- **FR96**: Show zone-by-zone cost breakdown with multipliers
- **FR75**: Route segmentation for multi-zone trips (already implemented in backend)
- **FR72**: Zone fixed surcharges displayed per zone

---

## Acceptance Criteria

### AC1: Pricing Segments Section Display

**Given** a quote with route segmentation data (multi-zone trip),  
**When** I display the TripTransparency panel Route tab,  
**Then** I see a dedicated "Pricing Segments" section with a green/emerald background and border.

### AC2: Traversed Zones Display

**Given** a quote with zones traversed,  
**When** I view the Pricing Segments section,  
**Then** I see:

- Icon: 🗺️ (MapIcon)
- Label: "Zones Traversed"
- Value: Zone codes in order (e.g., "PARIS_20 → PARIS_40 → BUSSY_10 → BUSSY_0")
- Badge: [POLYLINE] or [FALLBACK] indicating segmentation method

### AC3: Segment Table Display

**Given** a quote with multiple zone segments,  
**When** I view the Pricing Segments section,  
**Then** I see a table with columns:

- **#**: Segment number
- **Zone**: Zone name and code
- **Distance**: Distance in km for this segment
- **Duration**: Duration in minutes for this segment
- **Multiplier**: Zone price multiplier (e.g., "×1.2")
- **Surcharges**: Any fixed surcharges (parking, access fees)
- **Segment Cost**: Calculated cost for this segment

### AC4: Weighted Multiplier Summary

**Given** a quote with route segmentation,  
**When** I view the Pricing Segments section,  
**Then** I see a summary row showing:

- Label: "Weighted Average Multiplier"
- Value: The calculated weighted multiplier (e.g., "×1.15")
- Calculation hint: "Based on distance in each zone"

### AC5: Total Surcharges Display

**Given** a quote with zone surcharges,  
**When** I view the Pricing Segments section,  
**Then** I see:

- Label: "Total Zone Surcharges"
- Value: Sum of all parking + access fees (e.g., "45.00€")
- Breakdown: Per-zone surcharge details if any

### AC6: No Segments Section for Single-Zone Trips

**Given** a quote with only one zone (no multi-zone segmentation),  
**When** I display the TripTransparency panel Route tab,  
**Then** I do NOT see the Pricing Segments section (or show simplified "Single Zone" message).

### AC7: Fallback Segmentation Indicator

**Given** a quote where polyline was not available (fallback segmentation),  
**When** I view the Pricing Segments section,  
**Then** I see:

- Warning badge: [FALLBACK]
- Tooltip: "Route segmentation estimated from pickup/dropoff zones only"
- Segments show 50/50 split as estimate

### AC8: Source Attribution

**Given** any segment line item,  
**When** I view the segment details,  
**Then** I see a small badge indicating the source:

- "Polyline" for precise route-based segmentation
- "Estimate" for fallback segmentation

---

## Technical Notes

### Files to Create

1. **`apps/web/modules/saas/quotes/components/PricingSegmentsSection.tsx`** (NEW)
   - New component for detailed zone segment display
   - Props: `tripAnalysis: TripAnalysis`, `appliedRules: AppliedRule[]`
   - Handles both POLYLINE and FALLBACK segmentation methods

### Files to Modify

2. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Import and render `PricingSegmentsSection` in Route tab
   - Pass tripAnalysis and appliedRules data
   - Show section only when `tripAnalysis.zoneSegments` has data

3. **`apps/web/locales/fr/common.json`** and **`apps/web/locales/en/common.json`**
   - Add translation keys for pricing segments labels

### Data Source

The zone segment data comes from `tripAnalysis.zoneSegments` and `tripAnalysis.routeSegmentation`:

```typescript
// From tripAnalysis.zoneSegments (ZoneSegmentInfo[])
interface ZoneSegmentInfo {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  distanceKm: number;
  durationMinutes: number;
  priceMultiplier: number;
  surchargesApplied: number;
  entryPoint: { lat: number; lng: number };
  exitPoint: { lat: number; lng: number };
}

// From tripAnalysis.routeSegmentation
interface RouteSegmentation {
  weightedMultiplier: number;
  totalSurcharges: number;
  zonesTraversed: string[]; // Zone codes in order
  segmentationMethod: "POLYLINE" | "FALLBACK";
}
```

### Applied Rule Data

The `ROUTE_SEGMENTATION` applied rule contains additional context:

```typescript
interface RouteSegmentationRule {
  type: "ROUTE_SEGMENTATION";
  description: string;
  segmentationMethod: "POLYLINE" | "FALLBACK";
  zonesTraversed: string[];
  segmentCount: number;
  weightedMultiplier: number;
  totalSurcharges: number;
  segments: Array<{
    zoneCode: string;
    zoneName: string;
    distanceKm: number;
    multiplier: number;
  }>;
  priceBefore: number;
  priceAfter: number;
}
```

### Existing Backend Support

From `packages/api/src/services/route-segmentation.ts`:

- `segmentRouteByZones()`: Segments route by pricing zones
- `createFallbackSegmentation()`: Creates fallback when no polyline
- `buildRouteSegmentationRule()`: Builds applied rule for transparency

---

## Test Cases

### TC1: Multi-Zone Trip (Paris → Lyon)

**Precondition:** Quote with Paris → Lyon trip crossing multiple zones  
**Steps:**

1. Create quote with long-distance trip
2. Navigate to TripTransparency Route tab
   **Expected:**

- Pricing Segments section visible
- Zones Traversed: "PARIS_0 → PARIS_20 → PARIS_40 → PARIS_100 → OUTSIDE_ZONES"
- Multiple segment rows with different multipliers
- Weighted multiplier calculated (e.g., ×1.25)
- Badge: [POLYLINE]

### TC2: Single-Zone Trip (Paris Intra-Muros)

**Precondition:** Quote with Paris → Paris (same zone) trip  
**Steps:**

1. Create quote with short intra-zone trip
2. Navigate to TripTransparency Route tab
   **Expected:**

- No Pricing Segments section OR simplified "Single Zone" display
- Zone multiplier shown in Overview tab only

### TC3: Trip with Zone Surcharges (Versailles)

**Precondition:** Quote with pickup or dropoff in Versailles zone (has parking surcharge)  
**Steps:**

1. Create quote with Versailles destination
2. Navigate to TripTransparency Route tab
   **Expected:**

- Pricing Segments section shows surcharge
- Versailles segment shows "Surcharges: 40€"
- Total Zone Surcharges row shows sum

### TC4: Fallback Segmentation

**Precondition:** Quote where polyline was not available  
**Steps:**

1. Create quote (simulate no polyline)
2. Navigate to TripTransparency Route tab
   **Expected:**

- Badge: [FALLBACK]
- Warning tooltip about estimation
- Segments show 50/50 split

### TC5: Zone Multiplier Calculation

**Precondition:** Quote crossing zones with different multipliers  
**Steps:**

1. Create quote: BUSSY_0 (×0.8) → PARIS_0 (×1.0) → CDG (×1.2)
2. Navigate to TripTransparency Route tab
   **Expected:**

- Each segment shows correct multiplier
- Weighted average calculated based on distance
- Formula hint displayed

### TC6: Translation Keys

**Precondition:** Application in French locale  
**Steps:**

1. Create quote with zone segments
2. View Pricing Segments section
   **Expected:** All labels in French

### TC7: API Verification

**Precondition:** Quote created via API  
**Steps:**

1. Call POST /api/vtc/pricing/calculate with multi-zone trip
2. Verify response includes `zoneSegments` and `routeSegmentation`
   **Expected:**

- `tripAnalysis.zoneSegments` array populated
- `tripAnalysis.routeSegmentation.zonesTraversed` contains zone codes
- `appliedRules` contains `ROUTE_SEGMENTATION` rule

---

## Dependencies

- **Story 17.13**: Route segmentation for multi-zone trips (backend - DONE)
- **Story 21.1**: Ultra-detailed staffing costs display (UI pattern to follow)
- **Story 21.2**: Detailed approach fee display (UI pattern to follow)
- **Story 21.3**: Ultra-detailed travel time breakdown (UI pattern to follow)
- **Epic 3** (Story 3.1): PricingZone model and zones editor

---

## Definition of Done

- [ ] `PricingSegmentsSection` component created with all segment breakdowns
- [ ] Component integrated into TripTransparencyPanel Route tab
- [ ] Icons (🗺️, 📍, 💰) displayed for visual clarity
- [ ] Segment table with zone, distance, duration, multiplier, surcharges, cost
- [ ] Weighted multiplier summary displayed
- [ ] Total surcharges displayed
- [ ] Segmentation method badge (POLYLINE/FALLBACK) displayed
- [ ] Source attribution badges displayed
- [ ] Translation keys added for FR and EN
- [ ] No segments section when single zone
- [ ] All test cases pass (Playwright MCP + Curl + DB verification)
- [ ] Code reviewed and merged
- [ ] sprint-status.yaml updated to `done`

---

## UI Mockup (Text-based)

```
┌─────────────────────────────────────────────────────────────┐
│ 🗺️ Route                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [Map Preview Component]                                      │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🗺️ PRICING SEGMENTS                          [POLYLINE] │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │                                                         │ │
│ │ Zones Traversed:                                        │ │
│ │ PARIS_0 → PARIS_20 → PARIS_40 → BUSSY_10 → BUSSY_0     │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ # │ Zone          │ Dist  │ Time │ ×Mult │ Cost    │ │ │
│ │ ├───┼───────────────┼───────┼──────┼───────┼─────────┤ │ │
│ │ │ 1 │ PARIS_0       │ 12km  │ 25m  │ ×1.0  │ 28.50€  │ │ │
│ │ │ 2 │ PARIS_20      │ 35km  │ 40m  │ ×1.1  │ 89.25€  │ │ │
│ │ │ 3 │ PARIS_40      │ 28km  │ 32m  │ ×1.3  │ 84.50€  │ │ │
│ │ │ 4 │ BUSSY_10      │ 15km  │ 18m  │ ×0.85 │ 29.75€  │ │ │
│ │ │ 5 │ BUSSY_0       │ 8km   │ 10m  │ ×0.8  │ 14.80€  │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Weighted Multiplier              ×1.05                  │ │
│ │ (Based on distance in each zone)                        │ │
│ │                                                         │ │
│ │ Total Zone Surcharges            0.00€                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Existing Segment A/B/C Table]                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Estimation

- **Development:** 4-5 hours
- **Testing:** 2-3 hours
- **Total:** 6-8 hours

---

## Notes

- The pricing segments section should appear ABOVE the existing A/B/C segments table in the Route tab
- Use emerald/green color scheme to differentiate from staffing (blue), positioning (amber), and time (purple) sections
- Keep the section collapsible for trips with many zones to avoid overwhelming the UI
- The weighted multiplier calculation is: `Σ(distance_i × multiplier_i) / total_distance`
- Zone surcharges (parking, access fees) are only applied once per zone, even if the route enters/exits multiple times
- For excursion trips with multiple stops, show zone segments for each leg if available
- Consider adding a mini-map showing zone boundaries and entry/exit points in a future enhancement

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

### Response (existing - verify data is populated)

```typescript
{
  // ... existing fields
  tripAnalysis: {
    // ... existing fields
    zoneSegments: [
      {
        zoneId: "zone-123",
        zoneCode: "PARIS_20",
        zoneName: "Paris Petite Couronne",
        distanceKm: 35.5,
        durationMinutes: 40,
        priceMultiplier: 1.1,
        surchargesApplied: 0,
        entryPoint: { lat: 48.8566, lng: 2.3522 },
        exitPoint: { lat: 48.9000, lng: 2.4000 }
      },
      // ... more segments
    ],
    routeSegmentation: {
      weightedMultiplier: 1.05,
      totalSurcharges: 0,
      zonesTraversed: ["PARIS_0", "PARIS_20", "PARIS_40", "BUSSY_10", "BUSSY_0"],
      segmentationMethod: "POLYLINE"
    }
  },
  appliedRules: [
    // ... existing rules
    {
      type: "ROUTE_SEGMENTATION",
      description: "Route segmented across 5 zone(s): PARIS_0 → PARIS_20 → PARIS_40 → BUSSY_10 → BUSSY_0. Weighted multiplier: 1.05×",
      segmentationMethod: "POLYLINE",
      zonesTraversed: ["PARIS_0", "PARIS_20", "PARIS_40", "BUSSY_10", "BUSSY_0"],
      segmentCount: 5,
      weightedMultiplier: 1.05,
      totalSurcharges: 0,
      segments: [
        { zoneCode: "PARIS_0", zoneName: "Paris Centre", distanceKm: 12, multiplier: 1.0 },
        // ... more segments
      ],
      priceBefore: 200,
      priceAfter: 210
    }
  ]
}
```

---

## Constraints

- Must not break existing Route tab functionality (A/B/C segments)
- Must maintain backward compatibility with quotes that don't have zone segmentation data
- Zone segment data may be null for older quotes - handle gracefully
- Performance: Don't re-calculate segments on frontend; use pre-calculated data from API
- Styling must be consistent with other TripTransparency sections (21.1, 21.2, 21.3)
