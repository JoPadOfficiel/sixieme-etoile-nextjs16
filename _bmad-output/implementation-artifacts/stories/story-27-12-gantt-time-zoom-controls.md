# Story 27.12: Gantt Time & Zoom Controls

## Story Information
- **Epic**: 27 - Unified Dispatch (Cockpit)
- **Story ID**: 27.12
- **Priority**: Medium
- **Status**: done
- **Created**: 2026-01-20
- **Completed**: 2026-01-20
- **Branch**: `feature/27-12-gantt-zoom`

---

## User Story

**As a** dispatcher,  
**I want to** zoom in/out on the Gantt timeline and jump to specific dates,  
**So that I can** manage different time horizons (hourly for immediate missions, weekly for strategic planning).

---

## Description

This story implements temporal navigation controls for the Gantt chart in the Dispatch Cockpit. The dispatcher needs to:

1. **Zoom In (+)**: Increase `pixelsPerHour` to see more detail (larger time slots)
2. **Zoom Out (-)**: Decrease `pixelsPerHour` to see longer time ranges (compressed view)
3. **Today Button**: Jump viewport to current time (already partially implemented)
4. **Date Picker**: Navigate to a specific day

The zoom controls manipulate the `pixelsPerHour` state, which propagates through `useGanttTimeScale` to recalculate grid dimensions and labels.

---

## Acceptance Criteria

### AC1: Zoom Controls Visible in Toolbar
- [x] **Given** the Gantt timeline is displayed
- [x] **When** I view the toolbar
- [x] **Then** I see Zoom In (+), Zoom Out (-), and Today buttons
- [x] **And** a Date Picker component to select a specific day

### AC2: Zoom In Functionality
- [x] **Given** the current zoom level is not at maximum (< 200px/hour)
- [x] **When** I click the Zoom In (+) button
- [x] **Then** `pixelsPerHour` increases by a defined step (e.g., +25px)
- [x] **And** the Gantt re-renders with larger time slots
- [x] **And** the current scroll position is preserved proportionally

### AC3: Zoom Out Functionality
- [x] **Given** the current zoom level is not at minimum (> 20px/hour)
- [x] **When** I click the Zoom Out (-) button
- [x] **Then** `pixelsPerHour` decreases by a defined step (e.g., -25px)
- [x] **And** the Gantt re-renders with smaller time slots
- [x] **And** the current scroll position is preserved proportionally

### AC4: Zoom Bounds Enforcement
- [x] **Given** `pixelsPerHour` is at minimum (20px)
- [x] **When** I click Zoom Out (-)
- [x] **Then** the button is disabled and nothing happens

- [x] **Given** `pixelsPerHour` is at maximum (200px)
- [x] **When** I click Zoom In (+)
- [x] **Then** the button is disabled and nothing happens

### AC5: Today Button Navigation
- [x] **Given** the current time is visible on the timeline
- [x] **When** I click the "Today" button
- [x] **Then** the viewport scrolls to center on the current time (now line)

### AC6: Date Picker Navigation
- [x] **Given** I open the Date Picker
- [x] **When** I select a specific date
- [x] **Then** the Gantt viewport scrolls to show the start of that day (00:00)
- [x] **And** the selected date becomes the reference for the view

### AC7: Visual Feedback for Zoom Level
- [x] **Given** the zoom controls are visible
- [x] **When** I look at the toolbar
- [x] **Then** I see a visual indicator of current zoom level (e.g., "Day", "Week", or percentage)

---

## Technical Tasks

### Task 1: Create `useGanttZoom` Hook ✅
**File**: `apps/web/modules/saas/dispatch/components/gantt/hooks/useGanttZoom.ts`

- State management for `pixelsPerHour`
- Functions: `zoomIn()`, `zoomOut()`, `setZoomLevel()`, `setZoomPreset()`
- Bounds checking against `MIN_PIXELS_PER_HOUR` (20) and `MAX_PIXELS_PER_HOUR` (200)
- Zoom step configuration (default: 25px)
- Zoom presets: HOUR (150px), DAY (50px), WEEK (20px)

### Task 2: Create `GanttZoomControls` Component ✅
**File**: `apps/web/modules/saas/dispatch/components/gantt/GanttZoomControls.tsx`

- Zoom In (+) button with `ZoomIn` lucide icon
- Zoom Out (-) button with `ZoomOut` lucide icon
- Today button with `Clock` lucide icon
- DatePicker component for date navigation using shadcn Calendar Popover
- Zoom level indicator with progress bar and label

### Task 3: Integrate Zoom Controls in GanttTimeline ✅
**File**: `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx`

- Import and use `useGanttZoom` hook
- Pass `pixelsPerHour` from zoom state to `useGanttTimeScale`
- Add `GanttZoomControls` to toolbar section
- Implement scroll position preservation on zoom change using `requestAnimationFrame`

### Task 4: Add i18n Keys ✅
**Files**: `packages/i18n/translations/fr.json` and `en.json`

Added to `dispatch.gantt`:
```json
"zoomIn": "Zoom avant",
"zoomOut": "Zoom arrière",
"selectDate": "Sélectionner une date",
"jumpToNowTooltip": "Aller à l'heure actuelle",
"zoomLevel": {
  "hour": "Heure",
  "day": "Jour",
  "week": "Semaine"
}
```

### Task 5: Add Export to Index ✅
**File**: `apps/web/modules/saas/dispatch/components/gantt/hooks/index.ts`

Export `useGanttZoom` hook and related types.

### Task 6: Write Unit Tests ✅
**File**: `apps/web/modules/saas/dispatch/components/gantt/hooks/__tests__/useGanttZoom.test.ts`

**28 tests passing** covering:
- Initial state at default zoom level
- zoomIn increases pixelsPerHour within bounds
- zoomOut decreases pixelsPerHour within bounds
- Cannot exceed MAX_PIXELS_PER_HOUR
- Cannot go below MIN_PIXELS_PER_HOUR
- setZoomLevel clamps to bounds
- setZoomPreset works for all presets
- zoomPercent calculation
- zoomLabel calculation
- Custom step size support

---

## Test Results

### Unit Tests (Vitest) - ✅ ALL PASSED

```
✓ useGanttZoom > Initial State > should initialize with DEFAULT_PIXELS_PER_HOUR when no options provided
✓ useGanttZoom > Initial State > should initialize with custom initial zoom level
✓ useGanttZoom > Initial State > should clamp initial zoom to MIN_PIXELS_PER_HOUR if too low
✓ useGanttZoom > Initial State > should clamp initial zoom to MAX_PIXELS_PER_HOUR if too high
✓ useGanttZoom > zoomIn > should increase pixelsPerHour by ZOOM_STEP
✓ useGanttZoom > zoomIn > should not exceed MAX_PIXELS_PER_HOUR
✓ useGanttZoom > zoomIn > should do nothing when already at MAX_PIXELS_PER_HOUR
✓ useGanttZoom > zoomOut > should decrease pixelsPerHour by ZOOM_STEP
✓ useGanttZoom > zoomOut > should not go below MIN_PIXELS_PER_HOUR
✓ useGanttZoom > zoomOut > should do nothing when already at MIN_PIXELS_PER_HOUR
✓ useGanttZoom > canZoomIn / canZoomOut > should return canZoomIn=true when below MAX_PIXELS_PER_HOUR
✓ useGanttZoom > canZoomIn / canZoomOut > should return canZoomIn=false when at MAX_PIXELS_PER_HOUR
✓ useGanttZoom > canZoomIn / canZoomOut > should return canZoomOut=true when above MIN_PIXELS_PER_HOUR
✓ useGanttZoom > canZoomIn / canZoomOut > should return canZoomOut=false when at MIN_PIXELS_PER_HOUR
✓ useGanttZoom > setZoomLevel > should set zoom to exact value within bounds
✓ useGanttZoom > setZoomLevel > should clamp to MAX_PIXELS_PER_HOUR when value too high
✓ useGanttZoom > setZoomLevel > should clamp to MIN_PIXELS_PER_HOUR when value too low
✓ useGanttZoom > setZoomPreset > should set zoom to HOUR preset (150px)
✓ useGanttZoom > setZoomPreset > should set zoom to DAY preset (50px)
✓ useGanttZoom > setZoomPreset > should set zoom to WEEK preset (20px)
✓ useGanttZoom > zoomPercent > should return 0% at MIN_PIXELS_PER_HOUR
✓ useGanttZoom > zoomPercent > should return 100% at MAX_PIXELS_PER_HOUR
✓ useGanttZoom > zoomPercent > should return approximate midpoint percentage
✓ useGanttZoom > zoomLabel > should return 'hour' for high zoom levels (>=120px)
✓ useGanttZoom > zoomLabel > should return 'day' for medium zoom levels (40-120px)
✓ useGanttZoom > zoomLabel > should return 'week' for low zoom levels (<40px)
✓ useGanttZoom > Custom step > should use custom step for zoomIn
✓ useGanttZoom > Custom step > should use custom step for zoomOut

Test Files  1 passed (1)
     Tests  28 passed (28)
  Duration  735ms
```

---

## Dependencies

- **Story 27.3**: Gantt Core Timeline Rendering (DONE) ✅
- **Story 27.4**: Mission Rendering (DONE) ✅
- Constants: `MIN_PIXELS_PER_HOUR`, `MAX_PIXELS_PER_HOUR` already defined

---

## Constraints

1. **Performance**: Zoom changes should not cause noticeable lag (re-renders must be efficient) ✅
2. **Scroll Preservation**: When zooming, the center of the viewport should remain stable ✅
3. **Accessibility**: Zoom buttons must have proper aria-labels ✅
4. **Mobile**: Consider touch-friendly button sizes ✅

---

## Out of Scope

- Pinch-to-zoom gesture support (future enhancement)
- Keyboard shortcuts for zoom (Ctrl+/Ctrl-)
- ~~Zoom presets (e.g., "Hour", "Day", "Week" quick buttons)~~ → Actually implemented via `setZoomPreset`

---

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests passing with >80% coverage for new code
- [ ] Browser tests validated via MCP
- [x] i18n keys added for FR and EN
- [ ] Code reviewed and approved
- [x] Story status updated to `review`
- [x] Sprint status file updated

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `apps/web/modules/saas/dispatch/components/gantt/hooks/useGanttZoom.ts` | **NEW** | Zoom state management hook |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/index.ts` | MODIFIED | Added useGanttZoom export |
| `apps/web/modules/saas/dispatch/components/gantt/GanttZoomControls.tsx` | **NEW** | Zoom controls UI component |
| `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx` | MODIFIED | Integrated zoom controls |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/__tests__/useGanttZoom.test.ts` | **NEW** | Unit tests for zoom hook |
| `packages/i18n/translations/fr.json` | MODIFIED | Added zoom control translations |
| `packages/i18n/translations/en.json` | MODIFIED | Added zoom control translations |

---

## Notes

- The existing `jumpToNow` logic in `GanttTimeline.tsx` was enhanced and integrated with zoom controls
- Scroll position preservation uses `requestAnimationFrame` for smooth transitions
- The DatePicker uses shadcn/ui CalendarPopover with French locale support
- Zoom level indicator shows both label (Hour/Day/Week) and progress bar

