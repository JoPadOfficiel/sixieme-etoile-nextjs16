# Story 29.6: Upgrade Unified Dispatch Visualization (Gantt Zoom & Axis)

## Story Information

| Field                | Value                                                      |
| -------------------- | ---------------------------------------------------------- |
| **Story ID**         | 29.6                                                       |
| **Epic**             | Epic 29 - Complete Multi-Mission Quote Lifecycle           |
| **Title**            | Upgrade Unified Dispatch Visualization (Gantt Zoom & Axis) |
| **Status**           | done                                                    |
| **Priority**         | High                                                       |
| **Estimated Points** | 5                                                          |
| **Assignee**         | Amelia (Developer)                                         |
| **Created**          | 2026-01-22                                                 |
| **Branch**           | `feature/29-6-gantt-v2`                                    |

---

## Description

As a **dispatcher working night shifts**, I need **a continuous timeline visualization that spans multiple days without visual resets at midnight**, so that **I can efficiently plan and monitor missions that cross day boundaries (e.g., 23h Monday to 01h Tuesday)**.

### Business Context

Night dispatchers currently struggle with the Gantt view because:

1. The timeline "resets" visually at 00h00, creating a jarring discontinuity
2. Only a single day can be viewed at a time
3. Missions spanning midnight appear disconnected
4. Zoom levels don't provide enough flexibility for different planning horizons

### Technical Context

The current implementation in `GanttTimeline.tsx` uses `startOfDay(today)` and `endOfDay(today)` hardcoded in `DispatchMain.tsx`, limiting the view to 24 hours. The zoom controls exist but lack preset buttons for common views (Day/3 Days/Week).

---

## Acceptance Criteria

### AC1: Continuous Linear Time Axis

- [x] The X-axis displays time continuously without visual "reset" at 00h00
- [x] Hour labels flow naturally: ...22h, 23h, 00h, 01h, 02h...
- [x] Date labels appear at midnight transitions and at the start of the range
- [x] A mission at 23h Monday and one at 01h Tuesday appear visually adjacent (not separated)

### AC2: Zoom Preset Buttons

- [x] Three preset buttons are available: `Day`, `3 Days`, `Week`
- [x] `Day` preset: High detail (~100-150 px/hour), shows ~24h
- [x] `3 Days` preset: Medium detail (~40-50 px/hour), shows ~72h
- [x] `Week` preset: Low detail (~15-20 px/hour), shows ~168h
- [x] Clicking a preset adjusts both `pixelsPerHour` and the date range
- [x] Current zoom level is visually indicated (active button state)

### AC3: Date Range Picker

- [x] Replace the single date picker with a date range picker (Start Date - End Date)
- [x] Default range: Today 00h00 to Tomorrow 23h59 (48h view)
- [x] User can select any date range up to 14 days
- [x] Range selection updates the Gantt view immediately
- [x] Range is synchronized with zoom presets (selecting "Week" adjusts range to 7 days)

### AC4: Multi-Day Data Fetching

- [x] `DispatchProvider` fetches missions between `rangeStart` and `rangeEnd`
- [x] API query includes date range parameters
- [x] Missions outside the visible range are not fetched (performance)
- [x] Real-time polling respects the selected date range

### AC5: Visual Continuity

- [x] Grid lines are consistent across day boundaries
- [x] The "Now" indicator works correctly across multi-day views
- [x] Scroll position is preserved when changing zoom levels
- [x] Date separators are subtle but visible (vertical line at midnight)

---

## Technical Specifications

### Files to Modify

| File                                                                         | Changes                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx`           | Replace hardcoded `startOfDay`/`endOfDay` with range state       |
| `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx`          | Accept `dateRange` prop, update time calculations                |
| `apps/web/modules/saas/dispatch/components/gantt/GanttZoomControls.tsx`      | Add preset buttons, replace single date picker with range picker |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/useGanttZoom.ts`      | Add preset functions, link zoom to range                         |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/useGanttTimeScale.ts` | Ensure multi-day calculations work correctly                     |
| `apps/web/modules/saas/dispatch/components/gantt/GanttHeader.tsx`            | Update to show continuous hours with date labels at midnight     |
| `apps/web/modules/saas/dispatch/components/gantt/GanttGrid.tsx`              | Add midnight separator lines                                     |
| `apps/web/modules/saas/dispatch/components/gantt/types.ts`                   | Add `DateRange` type, update props                               |
| `apps/web/modules/saas/dispatch/hooks/useDriversForGantt.ts`                 | Accept date range for API query                                  |

### New Types

```typescript
// types.ts
export interface DateRange {
  start: Date;
  end: Date;
}

export type ZoomPreset = "day" | "3days" | "week";

export interface ZoomPresetConfig {
  pixelsPerHour: number;
  rangeDays: number;
  label: string;
}

export const ZOOM_PRESETS: Record<ZoomPreset, ZoomPresetConfig> = {
  day: { pixelsPerHour: 120, rangeDays: 1, label: "Day" },
  "3days": { pixelsPerHour: 45, rangeDays: 3, label: "3 Days" },
  week: { pixelsPerHour: 18, rangeDays: 7, label: "Week" },
};
```

### Key Implementation Details

1. **Continuous Hour Labels**: Use `addHours()` from `date-fns` to generate labels across the entire range, not per-day
2. **Midnight Detection**: Check `hour === 0` to show date label
3. **Range Picker**: Use `@ui/components/calendar` with `mode="range"`
4. **Preset Sync**: When user clicks preset, update both zoom AND range
5. **URL State**: Consider using `nuqs` to persist range in URL for sharing

### Dependencies

- `date-fns`: Already installed, use for date calculations
- `@tanstack/react-virtual`: Already in use for virtualization
- `nuqs`: Already in use for URL state

---

## Test Cases

### TC1: Continuous Timeline Rendering

**Given** the dispatcher selects a 3-day range (Monday-Wednesday)
**When** the Gantt timeline renders
**Then** the X-axis shows 72 continuous hours without visual breaks

### TC2: Midnight Mission Adjacency

**Given** a mission ends at 23:30 Monday
**And** another mission starts at 00:30 Tuesday
**When** viewing the Gantt in 3-day mode
**Then** the two missions appear visually close (within ~1 hour width)

### TC3: Zoom Preset Day

**Given** the dispatcher clicks the "Day" preset button
**When** the view updates
**Then** the range adjusts to 24 hours
**And** pixelsPerHour is set to ~120

### TC4: Zoom Preset Week

**Given** the dispatcher clicks the "Week" preset button
**When** the view updates
**Then** the range adjusts to 7 days
**And** pixelsPerHour is set to ~18

### TC5: Date Range Selection

**Given** the dispatcher opens the date range picker
**When** they select January 20-25
**Then** the Gantt displays missions from Jan 20 00:00 to Jan 25 23:59
**And** the API fetches only missions in that range

### TC6: Now Indicator Multi-Day

**Given** the current time is Tuesday 14:00
**And** the range is Monday-Wednesday
**When** viewing the Gantt
**Then** the "Now" indicator appears at the correct position (~38 hours from start)

### TC7: Scroll Position Preservation

**Given** the dispatcher is scrolled to Tuesday 10:00
**When** they change zoom from "3 Days" to "Day"
**Then** the view remains centered on Tuesday 10:00

---

## Constraints & Dependencies

### Dependencies

- Story 27.3 (Gantt Core Timeline Rendering) - **Done**
- Story 27.12 (Gantt Time & Zoom Controls) - **Done**
- Story 27.13 (Real-Time Updates) - **Done**

### Constraints

- Must maintain backward compatibility with existing Gantt functionality
- Performance: Must handle 100+ missions without lag
- Accessibility: Zoom controls must be keyboard accessible
- i18n: All labels must use `next-intl` translations

### Out of Scope

- Drag-and-drop across days (existing functionality preserved)
- Custom zoom levels beyond presets (can use +/- buttons)
- Print/export of multi-day view

---

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests for `useGanttZoom` hook with presets
- [x] Browser MCP test: 3-day view with missions at 23h and 01h
- [x] No TypeScript errors
- [x] No console errors
- [x] Translations added for FR/EN
- [x] Code reviewed
- [x] Story status updated to `review`

---

## Implementation Notes

### Recommended Approach

1. **Start with types**: Define `DateRange`, `ZoomPreset` in `types.ts`
2. **Update hooks**: Modify `useGanttZoom` to support presets
3. **Update DispatchMain**: Add range state, pass to GanttTimeline
4. **Update GanttHeader**: Continuous hour rendering with midnight labels
5. **Update GanttZoomControls**: Add preset buttons and range picker
6. **Update GanttGrid**: Add midnight separator lines
7. **Test**: Use MCP browser to verify visual continuity

### Code Quality

- Follow existing patterns in the codebase
- Use `memo` for performance-critical components
- Add JSDoc comments for new functions
- Maintain existing virtualization logic

---

## Changelog

| Date       | Author   | Change        |
| ---------- | -------- | ------------- |
| 2026-01-22 | Bob (SM) | Story created |
| 2026-01-22 | AI Agent | Implementation completed, code review fixes applied |

---

## Dev Agent Record

### File List

| File | Action | Description |
| ---- | ------ | ----------- |
| `apps/web/modules/saas/dispatch/components/DispatchPage.tsx` | Modified | Lifted dateRange state from DispatchMain, integrated date range params in API query |
| `apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx` | Modified | Receives dateRange and handlers as props instead of managing internal state |
| `apps/web/modules/saas/dispatch/components/gantt/GanttTimeline.tsx` | Modified | Added multi-day view support, preset sync, drag-to-scroll |
| `apps/web/modules/saas/dispatch/components/gantt/GanttZoomControls.tsx` | Modified | Added preset buttons (Day/3Days/Week) and date range picker |
| `apps/web/modules/saas/dispatch/components/gantt/GanttHeader.tsx` | Modified | Continuous hour labels with midnight date labels |
| `apps/web/modules/saas/dispatch/components/gantt/GanttGrid.tsx` | Modified | Midnight separator lines for multi-day views |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/useGanttZoom.ts` | Modified | Added setZoomPreset function |
| `apps/web/modules/saas/dispatch/components/gantt/types.ts` | Modified | Added DateRange, ZoomPreset, ZoomPresetConfig types |
| `apps/web/modules/saas/dispatch/components/gantt/constants.ts` | Modified | Added ZOOM_PRESETS configuration |
| `apps/web/modules/saas/dispatch/components/gantt/hooks/__tests__/useGanttZoom.test.ts` | Modified | Added tests for preset functions |
| `packages/i18n/translations/fr.json` | Modified | Added translations for presets and zoom controls |
| `packages/i18n/translations/en.json` | Modified | Added translations for presets and zoom controls |
| `apps/web/modules/saas/dispatch/hooks/useDriversForGantt.ts` | Deleted | Removed unused/confusing hook |
| `apps/web/modules/saas/dispatch/hooks/index.ts` | Modified | Removed export of useDriversForGantt |

### Change Log

- **2026-01-22**: Initial implementation of multi-day Gantt view
- **2026-01-22**: Code review fix - lifted dateRange state to DispatchPage for proper API integration (AC4 fix)
- **2026-01-22**: Code review fix - deleted unused `useDriversForGantt` hook and cleaned up references
