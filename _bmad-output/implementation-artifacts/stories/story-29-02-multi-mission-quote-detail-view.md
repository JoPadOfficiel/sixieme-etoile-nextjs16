# Story 29.2: Implement Multi-Mission Quote Detail View

**Epic:** Epic 29 – Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)  
**Author:** JoPad (via BMAD Orchestrator)  
**Status:** review  
**Priority:** High (P1 - Visualization)  
**Estimated Points:** 5  
**Branch:** `feature/29-2-quote-view`

---

## Goal

Enable the commercial team to **visualize the complete multi-mission journey** on a single quote detail page. The page must display:

1. **All QuoteLines** in a table format (not just the header)
2. **Multi-Mission Map** showing ALL trips with markers for each mission
3. **Interactive UX**: Clicking a line zooms the map to that specific mission

This is the **"Yolo Mode" visualization** - the commercial sees the entire client journey at a glance.

---

## Problem Statement

Currently, the `QuoteDetailPage` component:

1. **Single Trip Display**: Only shows the primary trip coordinates from the Quote header (`pickupLatitude`, `dropoffLatitude`)
2. **No Lines Table**: The `lines` array from Story 29.1 is not displayed
3. **No Multi-Mission Map**: The `ModernRouteMap` component only handles a single origin/destination
4. **No Interaction**: No way to focus on a specific mission within a multi-mission quote

**Root Cause:** The detail page was designed for single-trip quotes before Yolo Mode existed.

---

## Requirements (Functional)

| ID        | Requirement                                                    |
| --------- | -------------------------------------------------------------- |
| **FR160** | Quote detail displays all QuoteLines in a readable table       |
| **FR161** | Map shows markers for ALL missions (pickup + dropoff per line) |
| **FR162** | Map auto-fits bounds to encompass all mission points           |
| **FR163** | Clicking a line highlights it and zooms map to that mission    |

---

## Acceptance Criteria

### AC1: QuoteLines Table Display

- [ ] **AC1.1:** A new `QuoteLinesTable` component displays all `quote.lines` in a table format
- [ ] **AC1.2:** Each row shows: Line number, Type (TRANSFER/DISPO/EXCURSION), Origin → Destination, Date/Time, Price
- [ ] **AC1.3:** The table is placed below the header, above the 3-column layout
- [ ] **AC1.4:** Empty state: If no lines, show legacy single-trip view (backward compatible)

### AC2: Multi-Mission Map Component

- [ ] **AC2.1:** Create `MultiMissionMap` component that accepts an array of missions
- [ ] **AC2.2:** For each mission, display:
  - Green marker (pickup) with label "1A", "2A", etc.
  - Red marker (dropoff) with label "1B", "2B", etc.
- [ ] **AC2.3:** Map auto-calculates bounds to fit ALL markers on initial load
- [ ] **AC2.4:** Optional: Draw polyline for each mission if `encodedPolyline` exists in `sourceData`

### AC3: Interactive Line Selection

- [ ] **AC3.1:** Create React Context `QuoteLineSelectionContext` to track selected line
- [ ] **AC3.2:** Clicking a row in `QuoteLinesTable` sets that line as selected
- [ ] **AC3.3:** When a line is selected, map zooms to that mission's bounds (pickup + dropoff)
- [ ] **AC3.4:** Selected row has visual highlight (border or background)
- [ ] **AC3.5:** Clicking "View All" or clicking outside resets to full bounds view

### AC4: Data Extraction from sourceData

- [ ] **AC4.1:** Extract coordinates from `line.sourceData`:
  - `pickupLatitude`, `pickupLongitude`
  - `dropoffLatitude`, `dropoffLongitude`
  - `origin` (address string)
  - `destination` (address string)
- [ ] **AC4.2:** Handle missing coordinates gracefully (skip marker, show warning)
- [ ] **AC4.3:** Extract `tripType` for display badge

---

## Technical Design

### Files to Create

| File                                                                  | Purpose                          |
| --------------------------------------------------------------------- | -------------------------------- |
| `apps/web/modules/saas/quotes/components/QuoteLinesTable.tsx`         | Table displaying all quote lines |
| `apps/web/modules/saas/quotes/components/MultiMissionMap.tsx`         | Map showing multiple missions    |
| `apps/web/modules/saas/quotes/contexts/QuoteLineSelectionContext.tsx` | React Context for line selection |

### Files to Modify

| File                                                          | Changes                               |
| ------------------------------------------------------------- | ------------------------------------- |
| `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx` | Add QuoteLinesTable + MultiMissionMap |
| `apps/web/modules/saas/quotes/components/index.ts`            | Export new components                 |

### Implementation Steps

1. **Create `QuoteLineSelectionContext`**:

   ```typescript
   interface QuoteLineSelectionContextValue {
     selectedLineId: string | null;
     setSelectedLineId: (id: string | null) => void;
   }
   ```

2. **Create `QuoteLinesTable`**:

   ```typescript
   interface QuoteLinesTableProps {
     lines: Quote["lines"];
   }
   // Uses context to set selected line on row click
   ```

3. **Create `MultiMissionMap`**:

   ```typescript
   interface MultiMissionMapProps {
     lines: Quote["lines"];
     selectedLineId?: string | null;
   }
   // Extracts coordinates from each line's sourceData
   // Creates markers array for all missions
   // Listens to selectedLineId to zoom
   ```

4. **Update `QuoteDetailPage`**:
   ```typescript
   // Wrap with QuoteLineSelectionProvider
   // Add QuoteLinesTable above 3-column layout
   // Replace TripTransparencyPanel map with MultiMissionMap
   ```

### Data Flow

```
QuoteDetailPage
    │
    ├── QuoteLineSelectionProvider (Context)
    │       │
    │       ├── QuoteLinesTable
    │       │       └── onClick → setSelectedLineId(line.id)
    │       │
    │       └── MultiMissionMap
    │               └── useEffect([selectedLineId]) → zoomToMission()
    │
    └── quote.lines[]
            ├── line.sourceData.pickupLatitude
            ├── line.sourceData.pickupLongitude
            ├── line.sourceData.dropoffLatitude
            ├── line.sourceData.dropoffLongitude
            └── line.sourceData.origin/destination
```

---

## Test Cases

### TC1: Multi-Line Quote Display

**Given:** A quote with 3 lines (Transfer + Dispo + Excursion)  
**When:** User opens the quote detail page  
**Then:**

- Table shows 3 rows with correct data
- Map shows 6 markers (3 pickups + 3 dropoffs)
- All markers are visible within map bounds

### TC2: Line Selection Zoom

**Given:** A multi-line quote is displayed  
**When:** User clicks on line 2 in the table  
**Then:**

- Line 2 row is highlighted
- Map zooms to show only line 2's pickup and dropoff markers
- Other markers remain visible but map is centered on line 2

### TC3: Reset to Full View

**Given:** Line 2 is currently selected  
**When:** User clicks "View All" button or clicks the same line again  
**Then:**

- Selection is cleared
- Map zooms out to show all markers

### TC4: Legacy Single-Trip Quote

**Given:** A quote with no `lines` array (legacy format)  
**When:** User opens the quote detail page  
**Then:**

- No table is shown
- Map shows single pickup/dropoff from Quote header
- Page functions as before (backward compatible)

### TC5: Missing Coordinates Handling

**Given:** A line with missing `sourceData.pickupLatitude`  
**When:** Quote detail page loads  
**Then:**

- Line is shown in table with "Coordinates unavailable" note
- No marker is placed for that mission
- Other missions display correctly

---

## Out of Scope

- Editing lines from detail view (Story 29.3)
- Mission spawning (Story 29.4)
- Route polylines between missions (nice-to-have, not required)
- Drag-and-drop reordering of lines

---

## Dependencies

- **Upstream:** Story 29.1 (QuoteLine persistence) - DONE ✅
- **Downstream:** Stories 29.3-29.8 benefit from this visualization

---

## Definition of Done

- [ ] All Acceptance Criteria verified
- [ ] All Test Cases pass (5/5)
- [ ] Code reviewed
- [ ] No regressions in existing quote functionality
- [ ] Browser MCP test: Open multi-mission quote, verify 3 trips visible on map
- [ ] sprint-status.yaml updated to `review`

---

---

## Implementation Summary

### Files Created

| File                                                                  | Purpose                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| `apps/web/modules/saas/quotes/contexts/QuoteLineSelectionContext.tsx` | React Context for line selection state                |
| `apps/web/modules/saas/quotes/components/QuoteLinesTable.tsx`         | Table displaying all quote lines with click-to-select |
| `apps/web/modules/saas/quotes/components/MultiMissionMap.tsx`         | Google Maps component showing all missions            |

### Files Modified

| File                                                          | Changes                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx` | Added QuoteLineSelectionProvider, QuoteLinesTable, MultiMissionMap |
| `apps/web/modules/saas/quotes/components/index.ts`            | Added exports for new components                                   |
| `packages/i18n/translations/fr.json`                          | Added French translations for lines and map                        |
| `packages/i18n/translations/en.json`                          | Added English translations for lines and map                       |

### Key Features Implemented

1. **QuoteLineSelectionContext**: React Context managing `selectedLineId` state shared between table and map
2. **QuoteLinesTable**:
   - Displays all `quote.lines` in a table format
   - Shows line number, type badge, route (origin → destination), date/time, price
   - Click row to select/deselect line
   - Visual highlight for selected row
   - "View All" button to reset selection
3. **MultiMissionMap**:
   - Displays markers for all missions (pickup green, dropoff red)
   - Labels: "1A/1B", "2A/2B", etc. for each mission
   - Auto-fits bounds to show all markers
   - Zooms to selected mission when line is clicked
   - Polylines connecting pickup to dropoff for each mission
   - Click markers to select/deselect
   - Opacity reduction for non-selected missions
4. **Backward Compatibility**: Legacy single-trip quotes continue to work (no lines table shown)

### Manual Test Instructions

1. Navigate to: `http://localhost:3000/app/sixieme-etoile-vtc/quotes`
2. Find or create a multi-line quote (Yolo Mode with 2+ items)
3. Click on the quote to open detail view
4. **Verify TC1**: Table shows all lines with correct data, map shows all markers
5. **Verify TC2**: Click a line row → map zooms to that mission, row is highlighted
6. **Verify TC3**: Click "View All" or same row again → map shows all markers
7. **Verify TC4**: Open a legacy single-trip quote → no table shown, normal view
8. **Verify TC5**: Lines without coordinates show warning, no marker placed

---

## Implementation Notes

### Google Maps Markers Array

```typescript
const markers = lines.flatMap((line, index) => {
  const sourceData = line.sourceData as SourceData;
  if (!sourceData?.pickupLatitude) return [];

  return [
    {
      position: {
        lat: sourceData.pickupLatitude,
        lng: sourceData.pickupLongitude,
      },
      label: `${index + 1}A`,
      icon: { color: "green" },
    },
    {
      position: {
        lat: sourceData.dropoffLatitude,
        lng: sourceData.dropoffLongitude,
      },
      label: `${index + 1}B`,
      icon: { color: "red" },
    },
  ];
});
```

### Fit Bounds Logic

```typescript
const bounds = new google.maps.LatLngBounds();
markers.forEach((m) => bounds.extend(m.position));
map.fitBounds(bounds, { padding: 50 });
```

### Selected Line Zoom

```typescript
useEffect(() => {
  if (selectedLineId) {
    const line = lines.find((l) => l.id === selectedLineId);
    if (line?.sourceData) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({
        lat: line.sourceData.pickupLatitude,
        lng: line.sourceData.pickupLongitude,
      });
      bounds.extend({
        lat: line.sourceData.dropoffLatitude,
        lng: line.sourceData.dropoffLongitude,
      });
      map.fitBounds(bounds, { padding: 100 });
    }
  } else {
    // Reset to all markers
    fitAllMarkers();
  }
}, [selectedLineId]);
```
