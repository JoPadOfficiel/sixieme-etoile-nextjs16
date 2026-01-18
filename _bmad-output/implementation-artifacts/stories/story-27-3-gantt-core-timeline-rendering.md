# Story 27.3: Gantt Core Timeline Rendering

## Story Information

- **Epic**: Epic 27 - Unified Dispatch (Cockpit)
- **Story ID**: 27.3
- **Priority**: High (Core UI Component)
- **Status**: done
- **Estimated Effort**: 6-8 hours
- **Actual Effort**: TBD
- **Branch**: `feature/27-3-gantt-core`

---

## User Story

**As a** dispatcher,  
**I want** a Gantt timeline view showing all drivers on the Y-axis and time on the X-axis,  
**So that** I can visualize driver schedules at a glance and identify availability windows for mission assignment.

---

## Description

The Gantt Core Timeline is the foundational visualization component for the new Unified Dispatch Cockpit. It provides:

1. **Y-Axis (Rows)**: Each row represents a driver with their name and current status
2. **X-Axis (Timeline)**: Horizontal time axis showing hours/days with proper scaling
3. **Current Time Indicator**: A vertical red line showing "now" that updates in real-time
4. **Horizontal Scrolling**: Users can scroll through time to view past and future periods
5. **Grid Structure**: Visual grid to help align missions with time slots

This component will serve as the container for:

- Story 27.4: Mission cards rendered as blocks on the timeline
- Story 27.9: Drag & Drop target zones for assignment
- Story 27.12: Zoom controls for time scale adjustment

**Technical Approach**: Custom React implementation using CSS Grid/Flexbox for maximum control and performance. Virtualization via `@tanstack/react-virtual` for handling 50+ drivers efficiently.

---

## Acceptance Criteria

### AC1: Driver Rows Rendering

**Given** a list of drivers from the organization  
**When** the Gantt component loads  
**Then** each driver is displayed as a row with:

- Driver name (left sidebar, fixed position)
- Driver avatar/initials
- Driver status indicator (Available, On Mission, Unavailable)
- Consistent row height (60px recommended)

### AC2: Time Axis Header

**Given** the Gantt view is rendered  
**When** looking at the top header  
**Then** I see:

- Time labels showing hours (e.g., "08:00", "09:00", ...)
- Date labels for multi-day views
- Grid lines extending down through all driver rows
- Fixed header that stays visible during vertical scroll

### AC3: Horizontal Time Scrolling

**Given** the Gantt timeline is displayed  
**When** I scroll horizontally (mouse wheel + shift, or trackpad gesture, or scrollbar)  
**Then** the timeline scrolls smoothly through time  
**And** the driver name sidebar remains fixed (sticky left)  
**And** the time header scrolls with the content

### AC4: Current Time Indicator (Now Line)

**Given** the Gantt is displaying a time range that includes the current time  
**When** the view is rendered  
**Then** a vertical red/orange line is displayed at the current time position  
**And** the line updates every minute to stay accurate  
**And** if current time is outside visible range, a button appears to "Jump to Now"

### AC5: Time Scale Configuration

**Given** the Gantt component  
**When** initialized with default settings  
**Then** it displays:

- Default scale: 50 pixels per hour
- Visible range: 24 hours from current time minus 2 hours
- Configurable via props: `pixelsPerHour`, `startTime`, `endTime`

### AC6: Empty State for No Drivers

**Given** an organization with no drivers configured  
**When** the Gantt loads  
**Then** an empty state is displayed with message "No drivers configured"  
**And** a link to the Fleet Settings page is provided

### AC7: Performance with 50+ Drivers

**Given** an organization with 50 or more drivers  
**When** the Gantt loads and user scrolls vertically  
**Then** only visible rows are rendered (virtualization)  
**And** scroll performance remains smooth (no jank)  
**And** memory usage stays reasonable

---

## Technical Specifications

### Component Structure

```
/apps/web/modules/saas/dispatch/components/gantt/
├── GanttTimeline.tsx          # Main container component
├── GanttHeader.tsx            # Time axis header with hours/dates
├── GanttDriverRow.tsx         # Single driver row component
├── GanttDriverSidebar.tsx     # Fixed left sidebar with driver names
├── GanttNowIndicator.tsx      # Current time vertical line
├── GanttGrid.tsx              # Background grid lines
├── types.ts                   # TypeScript interfaces
├── constants.ts               # Time scale constants
├── hooks/
│   ├── useGanttTimeScale.ts   # Time calculation hook
│   ├── useGanttScroll.ts      # Scroll synchronization hook
│   └── useNowIndicator.ts     # Real-time "now" position hook
└── __tests__/
    └── GanttTimeline.test.tsx # Component tests
```

### Key Interfaces

```typescript
interface GanttTimelineProps {
  drivers: GanttDriver[];
  startTime: Date;
  endTime: Date;
  pixelsPerHour?: number; // Default: 50
  onDriverClick?: (driverId: string) => void;
  className?: string;
}

interface GanttDriver {
  id: string;
  name: string;
  avatar?: string;
  status: "AVAILABLE" | "ON_MISSION" | "UNAVAILABLE";
  missions?: GanttMission[]; // For Story 27.4
}

interface GanttMission {
  id: string;
  startAt: Date;
  endAt: Date;
  title: string;
  type: "CALCULATED" | "MANUAL";
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
}

interface TimeScaleConfig {
  pixelsPerHour: number;
  totalHours: number;
  startTime: Date;
  endTime: Date;
}
```

### Styling Requirements

- Use Tailwind CSS for all styling
- Dark mode support via `dark:` variants
- Colors:
  - Now line: `bg-red-500` / `bg-orange-500`
  - Grid lines: `border-gray-200 dark:border-gray-700`
  - Driver sidebar: `bg-white dark:bg-gray-900`
  - Header: `bg-gray-50 dark:bg-gray-800`
- Responsive: Minimum width 768px (desktop-focused component)

### Dependencies

- `@tanstack/react-virtual` for row virtualization
- `date-fns` for time calculations (already in project)
- No external Gantt library - custom implementation for control

---

## Test Cases

### TC1: Basic Rendering

- **Precondition**: 5 mock drivers with various statuses
- **Action**: Render GanttTimeline component
- **Expected**: All 5 driver rows visible with correct names and status indicators

### TC2: Horizontal Scroll

- **Precondition**: Gantt rendered with 48-hour range
- **Action**: Scroll horizontally using mouse wheel + shift
- **Expected**: Timeline content scrolls, driver sidebar stays fixed

### TC3: Now Indicator Position

- **Precondition**: Current time is 14:30, Gantt shows 00:00-24:00
- **Action**: Render Gantt and check now indicator
- **Expected**: Red line positioned at ~60% from left (14.5/24)

### TC4: Now Indicator Update

- **Precondition**: Gantt rendered, observe for 60+ seconds
- **Action**: Wait and observe
- **Expected**: Now indicator moves slightly as time passes

### TC5: Empty State

- **Precondition**: Empty drivers array
- **Action**: Render GanttTimeline with `drivers={[]}`
- **Expected**: Empty state message displayed, no errors

### TC6: Virtualization Performance

- **Precondition**: 100 mock drivers
- **Action**: Render and scroll vertically rapidly
- **Expected**: No dropped frames, smooth scroll, only ~20 rows in DOM at once

### TC7: Time Scale Accuracy

- **Precondition**: pixelsPerHour = 100
- **Action**: Measure rendered width for a 1-hour block
- **Expected**: Block width equals 100px exactly

---

## Dependencies

### Requires (Blocking)

- Story 27.2: MissionSyncService (DONE ✅) - Provides Mission data
- Driver API endpoint for fetching organization drivers

### Enables (Blocked by this)

- Story 27.4: Gantt Mission Rendering (Hybrid) - Renders mission blocks on rows
- Story 27.9: Drag & Drop Assignment - Uses Gantt rows as drop targets
- Story 27.12: Gantt Time & Zoom Controls - Controls this component's scale

---

## Out of Scope

- Mission block rendering (Story 27.4)
- Drag & Drop functionality (Story 27.9)
- Zoom controls UI (Story 27.12)
- Real-time WebSocket updates (Story 27.13)
- Map integration (Story 27.6, 27.7)

---

## Definition of Done

- [x] GanttTimeline component renders driver rows and time axis
- [x] Horizontal scrolling works with fixed driver sidebar
- [x] Now indicator displays and updates in real-time
- [x] Virtualization enabled for 50+ drivers
- [x] Empty state handled gracefully
- [x] Component integrated into Dispatch page (view=gantt mode) - Test page at /dispatch/gantt
- [x] Browser MCP test: scroll and time scale verified
- [x] Code follows project conventions (Biome lint, TypeScript strict)
- [x] Story status updated to `review`

---

## Implementation Notes

### Performance Considerations

1. **Virtualization**: Use `@tanstack/react-virtual` with `useVirtualizer` hook
2. **Memoization**: Memoize driver rows and time calculations with `useMemo`
3. **Debounced Scroll**: Consider debouncing scroll handlers if needed
4. **RAF for Now Indicator**: Use `requestAnimationFrame` for smooth updates

### Integration Points

```typescript
// In DispatchPage.tsx, when viewMode === 'gantt'
<GanttTimeline
  drivers={drivers}
  startTime={dayStart}
  endTime={dayEnd}
  pixelsPerHour={50}
  onDriverClick={handleDriverSelect}
/>
```

### API Requirements

Existing endpoint should work:

```
GET /api/vtc/drivers?organizationId={orgId}
```

May need new endpoint for driver status:

```
GET /api/vtc/dispatch/drivers-status?date={date}
```

---

**Created**: 2026-01-18  
**Author**: BMAD Scrum Master (Bob)  
**Version**: 1.0
