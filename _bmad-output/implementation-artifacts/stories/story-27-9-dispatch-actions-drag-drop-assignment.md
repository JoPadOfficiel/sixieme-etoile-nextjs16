---
id: "27.9"
epic: "27"
title: "Dispatch Actions - Drag & Drop Assignment"
status: "done"
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
This story implements the core interaction of the Unified Dispatch Cockpit: assigning missions via Drag & Drop. 
**UX Pivot:** The user requested that the Gantt chart display **Drivers** only. When a mission is dropped onto a driver, instead of immediately assigning a random vehicle, the **Assignment Drawer** should open, pre-filtered for that driver. This allows the dispatcher to select the specific vehicle/configuration for the mission before confirming.

## Acceptance Criteria

### AC1: Drag from Backlog
**Given** the Unassigned Backlog sidebar is open and populated,
**When** I click and drag a Mission Card,
**Then** the card becomes a draggable item and follows the cursor.
**And** valid drop zones (Driver Rows) are highlighted.

### AC2: Drop on Driver -> Open Drawer
**Given** I am dragging a mission,
**When** I drop it onto a Driver's Row in the Gantt chart,
**Then** the **Assignment Drawer** opens automatically.
**And** the drawer is **filtered** to show only the selected driver (and their available vehicles).
**And** the mission is NOT yet assigned (no API call yet).

### AC3: Confirm Assignment
**Given** the Assignment Drawer is open with a pre-selected driver,
**When** I select a vehicle/configuration and click "Confirm",
**Then** a `PATCH /missions/:id` request is sent with the chosen vehicle/driver.
**And** on success, the mission moves to the Driver's timeline.

### AC4: Visual Feedback
**Given** a drag operation is in progress,
**When** I hover over a driver row,
**Then** the row changes color (e.g., background highlight) to indicate it's a valid target.

## Technical Implementation
- **Libraries**: `@dnd-kit/core`, `@dnd-kit/modifiers`.
- **Components**:
    - `DispatchMain`: switched to fetch **Drivers** (not vehicles) for the Gantt rows.
    - `DispatchPage`: handles `onDragEnd`. Instead of mutating, it sets `preSelectedDriverId` and opens `AssignmentDrawer`.
    - `AssignmentDrawer`: accepts `preSelectedDriverId` and filters the candidate list.
- **Flow**:
    1. Drag Mission -> Drop on Driver ID.
    2. Open Drawer(missionId, driverId).
    3. User picks Vehicle from Drawer list (filtered by driver).
    4. User clicks Confirm -> `useAssignMission` mutation.

## Test Cases
1.  **TC1**: Drag mission -> Drop on Driver "John Doe".
2.  **TC2**: Verify Assignment Drawer opens.
3.  **TC3**: Verify Drawer list shows ONLY "John Doe" (with potentially multiple vehicles/options).
4.  **TC4**: Select vehicle -> Confirm -> Verify API payload has correct `missionId`, `driverId`, `vehicleId`.

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
  - [Verified] Explicit empty state implemented in `CandidatesList` when a driver is pre-selected but unavailable. (FIXED)
  - [Verified] Unit tests for `DraggableMissionRow` implemented and passing. (FIXED)
  - [Verified] Critical `400 Bad Request` issue fixed by fetching Drivers in `DispatchMain` and using Drawer flow.
  - [Verified] AC2 (Drop -> Drawer) implemented correctly.
  - [Verified] console.log removed from `DispatchMain.tsx`. (FIXED)

## Final Output
Story completed successfully with all ACs met and verified. The UX pivot to Driver-first Gantt with Assignment Drawer significantly improves usability and data accuracy.
