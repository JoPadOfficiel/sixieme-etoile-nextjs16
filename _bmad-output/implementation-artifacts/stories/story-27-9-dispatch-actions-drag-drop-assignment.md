---
id: "27.9"
epic: "27"
title: "Dispatch Actions - Drag & Drop Assignment"
status: "review"
priority: "high"
complexity: "medium"
assigned_agent: "Amelia"
dependencies:
  - "27.3" # Gantt Core
  - "27.5" # Backlog
tags:
  - "dispatch"
  - "dnd"
  - "gantt"
files_to_modify:
  - "apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx"
  - "apps/web/modules/saas/dispatch/components/DispatchPage.tsx"
  - "apps/web/modules/saas/dispatch/components/MissionsList.tsx"
  - "apps/web/modules/saas/dispatch/components/gantt/GanttDriverRow.tsx"
  - "apps/web/modules/saas/dispatch/components/DraggableMissionRow.tsx"
---

# Dispatch Actions - Drag & Drop Assignment

**As a** dispatcher,
**I want** to drag a job onto a driver to assign it,
**So that** scheduling is tactile, fast, and efficient.

## Description
This story implements the core interaction of the Unified Dispatch Cockpit: assigning missions via Drag & Drop. The dispatcher should be able to pick a mission from the "Unassigned Backlog" sidebar and drop it onto a specific driver's timeline row in the Gantt chart. This action triggers an API call to assign the driver and updates the visual state immediately (Optimistic UI). If the API call fails, the change must be reverted.

## Acceptance Criteria

### AC1: Drag from Backlog
**Given** the Unassigned Backlog sidebar is open and populated,
**When** I click and drag a Mission Card,
**Then** the card becomes a draggable item and follows the cursor.
**And** valid drop zones (Driver Rows) are highlighted.

### AC2: Drop on Driver
**Given** I am dragging a mission,
**When** I drop it onto a Driver's Row in the Gantt chart,
**Then** the mission is immediately removed from the Backlog.
**And** the mission appears on the Driver's timeline at its scheduled time.
**And** a `PATCH /missions/:id` request is sent with `driverId`.

### AC3: Optimistic Update & Revert
**Given** I have dropped a mission on a driver,
**When** the API request is pending,
**Then** the UI shows the assignment as successful.
**And** if the API fails (e.g. 500 Error), the mission is removed from the timeline and returns to the Backlog.
**And** an error toast is displayed.

### AC4: Visual Feedback
**Given** a drag operation is in progress,
**When** I hover over a driver row,
**Then** the row changes color (e.g., background highlight) to indicate it's a valid target.

## Technical Implementation
- **Libraries**: `@dnd-kit/core`, `@dnd-kit/modifiers`.
- **Components**:
    - `DispatchMain`: wrapper context for DnD.
    - `UnassignedBacklog`: Draggable Source (Backlog Items).
    - `GanttTimeline`: Droppable Target (Driver Rows).
    - `DragOverlay`: Custom preview of the dragged mission.
- **State Management**:
    - Use `useMutation` from TanStack Query for the `PATCH` request.
    - Implement `onMutate` for optimistic updates.
    - Implement `onError` for rollback.

## Test Cases
1.  **TC1**: Drag a mission from Backlog and drop on "Driver A". Verify API call payload contains Driver A's ID.
2.  **TC2**: Drag a mission and drop it inside the Backlog (cancel). Verify no API call.
3.  **TC3**: Drop outside valid area. Verify item returns to original position.
4.  **TC4**: Simulate API Failure. Verify item returns to Backlog after momentary appearance on Timeline.

## Dependencies
- Story 27.3 (Gantt Core) must be ready to accept drops.
- Story 27.5 (Backlog) must be ready to provide draggables.

## Validation Review
- **Status:** Review
- **Branch:** `feature/27-9-dnd-assignment`
- **Changes:**
  - `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`: Integrated `DndContext`, `DragOverlay`, and mutation logic to wrap both Sidebar and Main content.
  - `apps/web/modules/saas/dispatch/components/shell/DispatchMain.tsx`: Removed temporary DnD logic.
  - `apps/web/modules/saas/dispatch/components/MissionsList.tsx`: Replaced items with `DraggableMissionRow`.
  - `apps/web/modules/saas/dispatch/components/gantt/GanttDriverRow.tsx`: Added `useDroppable` interaction.
  - `apps/web/modules/saas/dispatch/components/DraggableMissionRow.tsx`: Created new component for draggable behavior.
- **Tests:**
  - **Browser Test**: Validated Drag & Drop interaction across the layout.
    - **Backlog**: Dragging initiated successfully.
    - **Drop**: Logic triggered on drop.
    - **Revert**: Confirmed error handling correctly reverts changes when API fails (current mock state).
    - **Fix**: Moved `DndContext` to `DispatchPage` to resolve cross-container drag issues.

## Code Review
- **Reviewer:** BMM-Workflow-Reviewer
- **Date:** 2026-01-19
- **Findings:**
  - [High] `useAssignMission` lacks true optimistic updates (`onMutate` is missing). It currently relies on `invalidateQueries` which results in a UI delay, violating AC3. (FIXED: Implemented `onMutate` with cache snapshot and rollback)
  - [High] `DispatchPage.tsx` uses `any` type for `activeDragMission` state initialization (`useState<any | null>`). (FIXED: Added `MissionListItem` type)
  - [Medium] `console.log` statements left in `DispatchPage.tsx`. (FIXED: Removed)
  - [Medium] `DraggableMissionRow` is not memoized, potentially causing performance issues during drag operations in large lists. (FIXED: Wrapped in `memo`)
  - [Low] No unit tests implemented for `DraggableMissionRow` or the drag integration logic.
