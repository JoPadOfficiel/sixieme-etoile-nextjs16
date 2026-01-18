---
id: "story-27-11"
epic: "epic-27"
title: "Story 27.11 - Inspector Panel Quick Actions"
description: "Implement the right-side inspector panel (Shadcn Sheet) in the Dispatch Cockpit. This panel appears when a mission is selected from the Gantt chart or list view, displaying mission details and providing quick actions: Unassign, Edit Route (via Yolo modal), and Cancel."
status: "review"
priority: "high"
assignments:
  - "Amelia (Developer)"
estimation: 2
acceptance_criteria:
  - "AC1: The inspector panel renders as a right-side sheet when a mission is selected."
  - "AC2: The panel displays key mission details: Client, Date/Time, Status, Vehicle/Driver (if assigned), Pick-up/Drop-off addresses."
  - "AC3: The 'Unassign' button is available for assigned missions. Clicking it triggers the unassign mutation, updates the mission status to 'UNASSIGNED', removes it from the Gantt timeline, and returns it to the Backlog."
  - "AC4: The 'Edit Route' button is available. Clicking it opens the existing Yolo editing modal for the selected mission."
  - "AC5: The 'Cancel' button is available. Clicking it triggers a confirmation dialog and then the cancel mutation, updating mission status to 'CANCELLED'."
technical_notes:
  - "Use Shadcn UI `Sheet` component for the panel."
  - "Sync open/closed state with `missionId` in URL query parameters or global dispatch store."
  - "Use TRPC mutations for `unassign` and `cancel` actions."
  - "Integrate with the existing 'Edit' modal logic used elsewhere in the app."
tests:
  - "Vitest: Verify QuickActions component renders correct buttons based on mission status."
  - "Vitest: Verify click handlers trigger appropriate callbacks/mutations."
  - "MCP Browser: Select a mission on Gantt, click 'Unassign', verify mission disappears from Gantt row and appears in Backlog."
  - "MCP Browser: Verify DB state reflects 'UNASSIGNED' status after action."
---

# Story 27.11 - Inspector Panel Quick Actions

## Context
The Dispatch Cockpit needs a way to quickly view details and perform actions on a mission without leaving the main view. The Inspector Panel provides this context-sensitive overlay.

## Design
- **UI Component**: Right-sided Sheet (Drawer) from Shadcn UI or equivalent.
- **Trigger**: Clicking a mission card on the Gantt chart or a row in the Mission List.
- **Content**:
  - Header: Mission Reference & Status Badge.
  - Body: Summary of Route (Map snapshot optional), Client Info, Timing.
  - Footer: Action Buttons (Unassign, Edit, Cancel).

## Technical Implementation
- **File**: `apps/web/modules/saas/dispatch/components/InspectorPanel.tsx` (proposed).
- **State**: Controlled by `missionId` query param or DispatchContext.
- **Mutations**:
  - `unassignDriver`: Sets `driverId` and `vehicleId` to null, status to `UNASSIGNED`.
  - `cancelMission`: Sets status to `CANCELLED`.
  - `updateMission`: Handled via the Yolo Modal (reuse existing).

## Verification Plan
1.  **Automated Tests**:
    - Unit tests for the Panel component.
    - Integration tests for the unassign flow.
2.  **Manual Verification**:
    - Open Dispatch view.
    - Click a mission.
    - Verify Panel opens.
    - Test actions.

## Implementation Results
- Created `InspectorPanel.tsx` using Shadcn Sheet.
- Implemented `useMissionActions` hook for Unassign and Cancel operations.
- Updated API routes in `missions.ts` to support `unassign` and `cancel` endpoints.
- Updated `InspectorPanel` to include `TripTransparencyPanel`, `MissionContactPanel`, `VehicleAssignmentPanel`, and `StaffingCostsSection` for full context.
- Added `InspectorPanel.test.tsx` for unit testing.
- Manual verification via MCP Browser pending validation.
