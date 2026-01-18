---
title: 'Dispatch Gantt & Mission Hub System'
slug: 'dispatch-gantt-mission-hub'
created: '2026-01-18'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 (App Router)', 'Prisma', 'TailwindCSS', 'Radix UI / Shadcn', 'TanStack Query (React Query)', 'Zod', '@react-pdf/renderer', 'Svar React Gantt (or Dnd-Kit fallback)', 'React Leaflet / Google Maps']
files_to_modify: ['packages/database/prisma/schema.prisma', 'packages/api/src/routes/vtc/missions.ts', 'packages/api/src/services/mission-splitter.ts', 'apps/web/modules/saas/dispatch/components/DispatchPage.tsx', 'apps/web/modules/saas/dispatch/components/GanttView.tsx', 'apps/web/modules/saas/missions/MissionHubPage.tsx']
code_patterns: ['Feature-based modules in `apps/web/modules/saas`', 'API routes in `packages/api/src/routes/vtc`', 'Zod schemas for validation', 'Prisma for ORM', 'Nuqs for URL state management in UI']
test_patterns: ['Unit tests for Mission Splitter logic', 'API integration tests for Mission CRUD', 'Compliance Validator Unit Tests']
---

# Tech-Spec: Dispatch Gantt & Mission Hub System

**Created:** 2026-01-18

## 1. Overview

### Problem Statement
The current Dispatch system (List View) is functional but redundant with the planned "Gantt Scheduler". Maintaining two separate pages (`/dispatch` and `/scheduler`) creates confusion ("Doublon"). Furthermore, the system lacks "Live Operations" capabilities (seeing where drivers are right now vs where they should be) and struggles with multi-leg quotes ("Yolo Mode").

### Solution: The "Unified Cockpit"
We will consolidate the Dispatch experience into a single page (`/dispatch`) with a **View Switcher**.
1.  **View A (The Command Center)**: The primary operational view.
    *   **Left Pane**: Backlog of Unassigned Missions (Replacing the old List).
    *   **Center Pane**: Gantt Timeline (Visual Planning).
    *   **Right Pane**: Mission Inspector (Details).
    *   **Map Layer**: A "Live Map" showing real-time driver positions and mission vectors, integrated with the Gantt selection.
2.  **View B (The Master List)**: A secondary full-width table view for bulk operations/search (retaining legacy functionality).
3.  **Yolo Compatibility**: The Gantt reads the `sourceData` (Operational Truth) of the new "Hybrid Blocks", ensuring that even "Custom Text" missions have a visualized duration/location if defined.

## 2. Technical Architecture

### 2.1 View Strategy (Zero-Based Design)
The `DispatchPage.tsx` will be a stateful container managing two modes:
*   `viewMode`: 'GANTT' | 'LIST'
*   `selectedMissionId`: Shared state. Clicking a row in List OR a bar in Gantt opens the *same* Inspector Panel.

### 2.2 Data Integration (Yolo Support)
*   **Source of Truth**: The Gantt visualization MUST read from `Mission.sourceData` (as defined in `tech-spec-yolo-billing.md`).
*   **Logic**:
    *   If `Mission.type` == `CALCULATED`: Use `sourceData.startAt`, `sourceData.endAt`, `sourceData.origin`.
    *   If `Mission.type` == `MANUAL`: Use `Mission.startAt` (generic timestamp) and show as a "Floating Block" with no map vector unless coordinates are manually provided.

### 2.3 The "Live Map" Layer
*   **Tech**: Leaflet (OpenStreetMap) or Google Maps Embed.
*   **Reactive Logic**:
    *   **Selection**: Click a Mission -> Map zooms to Trip Vector.
    *   **Proximity**: Click an Unassigned Mission -> Map highlights Drivers who are (a) Available at that time AND (b) GPS-close to the pickup.

## 3. Implementation Plan

### Tasks

- [ ] Task 1: Prisma Schema Update - `Mission` & Availability
  - File: `packages/database/prisma/schema.prisma`
  - Action: Define `Mission` model: `type` (COMMERCIAL, INTERNAL, MAINTENANCE), `quoteId` (nullable), `subcontractorId` (nullable), `complianceStatus`, `driverId`, `vehicleId`, `startAt`, `endAt`.
  - Action: Ensure `DriverCalendarEvent` model exists (type: UNAVAILABLE, SICK, HOLIDAY, etc.).
  - Note: Align fields with `tech-spec-yolo-billing.md` (sourceData).

- [ ] Task 2: API & Validation Services
  - File: `packages/api/src/routes/vtc/missions.ts`
  - Action: Create CRUD routes with `ComplianceValidator` and `AvailabilityValidator`.
  - Action: Implement `MissionSplitter` service to break Multi-Leg Quotes (Quotes with groups/multiple days) into discrete `Mission` records.

- [ ] Task 3: Unified Dispatch Page Shell
  - File: `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`
  - Action: Create the Shell with "View Toggle" (Gantt/List).
  - Action: Refactor existing List code into `DispatchListView.tsx`.
  - Action: Create `DispatchGanttView.tsx`.

- [ ] Task 4: The Gantt Implementation
  - File: `apps/web/modules/saas/dispatch/components/GanttView.tsx`
  - Action: Implement Svar React Gantt (or Dnd-Kit).
  - Logic: Render Missions as blocks. Handle Drag & Drop for assignment.
  - Integration: Visual "Red Shake" on RSE violation.

- [ ] Task 5: The "Live Map" & Inspector
  - File: `apps/web/modules/saas/dispatch/components/DispatchMap.tsx`
  - Action: Component that accepts `selectedMission` and `driversList`.
  - Logic: Display vectors and pins.

- [ ] Task 6: Unassigned Backlog (Left Pane)
  - File: `apps/web/modules/saas/dispatch/components/UnassignedDrawer.tsx`
  - Action: List of `Mission` where `driverId` is NULL.
  - Filter: Show only `ACCEPTED` quotes or `READY` missions.

### Acceptance Criteria

- [ ] AC 1 (Consolidation): The `/dispatch` page allows toggling between Gantt and List. No separate `/scheduler` page exists.
- [ ] AC 2 (Yolo Support): A "Custom Manual Mission" (Yolo) appears on the Gantt at the correct time, even if it has no GPS route.
- [ ] AC 3 (Multi-Leg): A single Quote with 5 trips results in 5 distinct bars on the Gantt.
- [ ] AC 4 (Live Map): Clicking an unassigned mission shows which drivers are nearby on the Map.
- [ ] AC 5 (RSE): Dragging a mission onto a driver with a "Holiday" event is visually blocked or warned.

## 4. Comprehensive System Summary

**The "Mission Control" System: End-to-End Flow**

### 1. The Input (Yolo Aware)
*   The system consumes  generated by the .
*   Crucial: It handles **Multi-Leg Quotes**. If a client signs a single Quote for "3 Days in Paris + Airport Transfer", the system generates **4 distinct Mission Cards**:
    *   Mission 1: Airport Transfer (Calculated)
    *   Mission 2: Day 1 Disposal (Manual/Group)
    *   Mission 3: Day 2 Disposal (Manual/Group)
    *   Mission 4: Return Transfer (Calculated)
*   These appear in the **Backlog (Left Pane)** individually, allowing different drivers for each leg if needed.

### 2. The Visualization (Gantt + Map)
*   **The Gantt** is the primary truth. It shows time slots.
*   **The Map** is the spatial verification.
    *   *Scenario:* You select "Mission 1" (Airport) in the Backlog.
    *   *System Action:* The Map zooms to CDG Airport. It shows icons for Driver A and Driver B who are currently nearby.
    *   *Decision:* You see Driver A has a gap in the Gantt. You drag Mission 1 onto Driver A's row.

### 3. The Live Ops (Real Time)
*   When a driver starts a mission, the status updates to  (Green bar).
*    GPS positions update on the Map layer.
*   If a timeline delay occurs, the bar extends, potentially triggering a "Conflict Alert" for the *next* mission.

### 4. Integration with Billing
*   Since the  is linked to the  (via ), any operational change (e.g., Driver A drives an extra 20km) is logged.
*   This does *not* automatically change the Invoice (Commercial Mask), but it flags a "Profitability Alert" (Cost > Price).

**This architecture guarantees:**
1.  **No Doublon:** One page for everything.
2.  **Total Visibility:** Time (Gantt) + Space (Map) + Status (Backlog).
3.  **Yolo Compatibility:** Customizable blocks are just "Missions with variable constraints".

