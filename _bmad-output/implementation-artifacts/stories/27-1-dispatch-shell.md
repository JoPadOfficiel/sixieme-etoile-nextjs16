---
id: "27-1"
epic: "Epic 27 - Unified Dispatch (Cockpit)"
title: "Dispatch Shell & Navigation"
status: "done"
author: "Bob (Scrum Master)"
---

## 8. Code Review Fixes
- Added unit tests for `DispatchLayout` and `DispatchSidebar`.
- Added proper translation keys and accessibility attributes to sidebar.
- Created SQL migration for `MissionStatus` enum safety.

# Story 27.1: Dispatch Shell & Navigation

## 1. Description
As a **dispatcher**, I want a unified page layout that maximizes screen real estate and provides efficient navigation, so that I can see the timeline (Gantt) and map simultaneously without clutter or scrolling issues.

This story implements the empty shell of the new Dispatch Cockpit, featuring a responsive 3-column layout and URL-synced view state.

## 2. Acceptance Criteria

### AC1: Route & Layout Structure
- **Given** I navigate to `/dispatch`
- **Then** I see a full-viewport application shell (100vh) with no window-level scrollbars.
- **And** the layout is divided into 3 main areas:
  1.  **Sidebar (Left)**: Backlog of unassigned missions (approx 20% or 300px).
  2.  **Main Area (Center)**: The primary workspace (Gantt or Map).
  3.  **Inspector Panel (Right)**: Details panel (initially hidden or empty).

### AC2: Navigation Header
- **Given** the dispatch header
- **Then** I see a "View Mode" toggle (Segmented Control or Tabs) with options: `Gantt` / `List`.
- **And** I see a "Date Range Picker" (placeholder or basic implementation).
- **And** switching the View Mode updates the URL query parameter `?view=gantt` or `?view=list`.

### AC3: Collapsible Sidebar
- **Given** the Left Sidebar (Backlog)
- **When** I click a collapse/expand trigger (e.g., chevron icon)
- **Then** the sidebar collapses to a minimal width (icon only) or expands to full width.
- **And** the Main Area expands to fill the available space.

### AC4: Responsive Behavior
- **Given** I resize the browser window
- **Then** the layout adjusts using CSS Grid/Flexbox constraints.
- **And** the inner containers scroll independently if content overflows (internal scrolling), ensuring the header and shell remain fixed.
- **And** on Mobile, the layout adapts (e.g., Sidebar becomes a drawer or stacks), though primary target is Desktop.

### AC5: URL State Synchronization (nuqs)
- **Given** I am on `/dispatch`
- **When** I reload the page
- **Then** the `view` mode is restored from the URL.

## 3. Technical Design

### Components
- `DispatchPage.tsx`: Main route component.
- `DispatchLayout.tsx`: The grid shell component.
- `DispatchHeader.tsx`: Navigation and controls.
- `DispatchSidebar.tsx`: Collapsible left panel.
- `DispatchMain.tsx`: Container for Gantt/List views.
- `DispatchInspector.tsx`: Right panel placeholder.

### State Management
- Use `nuqs` (Next.js URL Query Strings) for `view` state (`gantt` | `list`).
- Local state for sidebar collapsed/expanded (can be synced to local storage implies).

### Styling
- **Tailwind CSS**.
- **Container**: `h-screen w-full flex flex-col overflow-hidden`.
- **Grid Lyaout**: `grid grid-cols-[auto_1fr_auto] h-full`.
- **Scroll Areas**: Use `flex-1 overflow-auto` for inner panels.

## 4. Test Plan

### Unit Tests (Vitest)
- Test `DispatchLayout` renders 3 sections.
- Test `DispatchHeader` updates URL on toggle click.
- Test Sidebar toggle handler.

### Visual/Browser Tests
- Verify 100vh layout with no body scroll.
- Verify sidebar collapse animation/state.
- Verify persistence of view mode on refresh.

## 5. Metadata
- **Agent**: Google Jules (UI)
- **Priority**: High
- **Complexity**: Medium

## 6. Implementation Notes
- **Implemented Components**:
  - `DispatchLayout`: Responsive 3-column layout using Grid.
  - `DispatchSidebar`: Collapsible sidebar populated with "Backlog" missions.
  - `DispatchHeader`: Contains view toggles (Gantt/List/Map) synced with URL via `nuqs`.
  - `DispatchMain`: Placeholder for main content views.
  - `DispatchInspector`: Right-side panel for mission details.
- **Seeding**: Updated `seed-vtc-complete.ts` to include 20 realistic test missions.
- **Testing**:
  - Validated visually using `browser_subagent`. Screenshots confirmed layout, sidebar interaction, and view switching.
  - Added unit tests for `DispatchHeader` proving URL update logic.

## 7. Test Results
- **Layout**: Verified 3-column layout and independent scrolling.
- **Navigation**: Verified view toggles update URL (`?view=list`, `?view=map`, `?view=gantt`).
- **Data**: Verified seeded missions appear in the sidebar list.
- **Responsiveness**: Verified sidebar collapsing and layout adjustment.
- **Pass Status**: ✅ All ACs met.
