# Story 27.10: Conflict Detection RSE & Calendar

## Description
As a **dispatcher**, I want the system to refuse or warn about illegal assignments so that I stay compliant with regulations (RSE) and avoid booking unavailable drivers.

The system must check for conflicts **before** and **during** the assignment process (Drag & Drop).

## Acceptance Criteria

### AC1: Driver Calendar Conflict (Block)
- **Given** a driver has a `DriverCalendarEvent` (Holiday, Sick, Unavailable) for a specific time range.
- **When** a dispatcher tries to assign a Mission that overlaps with this event.
- **Then** the assignment is **BLOCKED**.
- **And** the UI shows an error toast: "Impossible: Chauffeur en congés/absent".
- **And** the Gantt card snaps back to its original position (if drag & drop).

### AC2: Mission Overlap (Warn)
- **Given** a driver already has an assigned Mission A [10:00 - 12:00].
- **When** a dispatcher assigns Mission B [11:00 - 13:00] to the same driver.
- **Then** the assignment is **PERMITTED** (with warning).
- **And** the UI shows a visual conflict indicator (Red Border / Shake animation) on both overlapping missions in the Gantt.
- **And** a warning toast appears: "Attention: Chevauchement de missions détecté".

### AC3: RSE Compliance Warning (Warn)
- **Given** RSE rules (Max driving time, Minimum break).
- **When** a dispatcher assigns a mission that would cause the driver to exceed daily limits (e.g. > 10h driving).
- **Then** the assignment is **PERMITTED** (with warning).
- **And** the UI triggers the "Shake" animation on the assigned mission.
- **And** a specific warning toast appears: "Attention: Risque dépassement RSE".

### AC4: Visual Feedback
- **Conflict State**: Conflicting missions on the Gantt should have a distinct visual style (e.g., Red Border `border-red-500` or a warning icon).
- **Shake Animation**: CSS keyframe animation `shake` applied when a warning is triggered.

## Technical Details
- **Utility Function**: `checkCompliance(mission, driver, existingMissions, calendarEvents)` returns `{ valid: boolean, level: 'BLOCK' | 'WARN' | 'OK', reason?: string }`.
- **Integration**: Call this function in `onDragEnd` (Gantt/Backlog) and `InspectorPanel` assign action.
- **RSE Note**: For this story, implement a simplified RSE check (e.g., if total assigned hours > 10h).

## Constraints
- Must be instant (client-side check preferred for immediate feedback, validated by server).
- Use `date-fns` for time comparisons.
- `DriverCalendarEvent` must be fetched or available in the store.

## Implementation Details
- **Utility**: `apps/web/modules/saas/dispatch/utils/checkCompliance.ts` implements the core logic (Calendar check, Overlap check, RSE check).
- **Integration**: `DispatchPage.tsx` now fetches drivers and mocked calendar events, and performs `checkCompliance` in `handleDragEnd`.
- **UI**: 
    - `GanttMission` type extended with `isConflict`.
    - `MissionGanttCard` displays `border-red-600` and `animate-pulse` when `isConflict` is true.
    - Toast notifications added for BLOCK and WARN scenarios.
- **Testing**: 
    - Unit tests in `checkCompliance.test.ts` verify all conflict scenarios (Holiday, Overlap, RSE).
    - Manual verification via mock data in `DispatchPage`.

## Validation Logic
- **BLOCK**: If `calendarEvents` overlap with mission duration.
- **WARN**: If `existingMissions` overlap with mission duration.
- **WARN**: If total daily duration > 10 hours.

## Modified Files
- `apps/web/modules/saas/dispatch/utils/checkCompliance.ts`
- `apps/web/modules/saas/dispatch/utils/checkCompliance.test.ts`
- `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`
- `apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx`
- `apps/web/modules/saas/dispatch/components/gantt/MissionGanttCard.tsx`
- `apps/web/modules/saas/dispatch/components/gantt/types.ts`
