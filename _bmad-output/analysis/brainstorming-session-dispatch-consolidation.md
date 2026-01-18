---
stepsCompleted: [1]
inputDocuments: []
session_topic: ''
session_goals: ''
selected_approach: 'kill-the-old-system'
techniques_used: ['Feature Mapping Matrix', 'Zero-Based Design']
technique_execution_complete: true
facilitation_notes: "Advised user to consolidate List and Gantt into a single page with a View Toggle (Command Center vs Table Mode). User aligned on killing the separate scheduler concept."
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** JoPad
**Date:** 2026-01-18

## Session Overview
**Topic:** Unified Dispatch Architecture (Refactoring Existing List vs New Gantt)
**Goals:** Eliminate redundancy. Merge the existing Dispatch system capabilities into the new Gantt Scheduler to create a single, powerful "Mission Control".
**Context:** User identified that building a separate Gantt is a duplicate effort. We need to replace/upgrade the current implementation, not add side-by-side.

## Technique: "Kill the Old System" Matrix (Feature Mapping)

**Goal:** Ensure 100% functional parity (or upgrade) when moving from "List Dispatch" to "Gantt Scheduler".

**Existing Feature Analysis vs Gantt Replacement:**

1.  **Feature: List of Unassigned Missions**
    *   *Old Way:* A long scrollable list or table.
    *   *New Way (Gantt):* **The "Mission Drawer"**. A collapsible sidebar (Left or Bottom) containing "Unplanned Cards".
    *   *Interaction:* Drag & Drop from Drawer -> Gantt Row (Driver/Vehicle).

2.  **Feature: Filtering (By Date, Zone, Status)**
    *   *Old Way:* Dropdowns above the list.
    *   *New Way (Gantt):* "Viewport Controls".
        *   Date -> Time Scale Zoom (Day/Week).
        *   Zone -> Filter Rows (Show only "Paris Drivers").
        *   Status -> Color coding of Gantt bars (Planned=Blue, Active=Green, Done=Gray).

3.  **Feature: Mission Details (Address, Pax, Notes)**
    *   *Old Way:* Click row -> Full page or Modal.
    *   *New Way (Gantt):* **"Pop-over" & "Context Panel"**.
        *   Hover: Quick tooltip (Time + Address).
        *   Click: Opens "Mission Hub" Panel (Right side). Contains Map, Price, Chat with Driver, Link to Invoice.

4.  **Feature: Conflict Detection**
    *   *Old Way:* Often manual or simple error on save.
    *   *New Way (Gantt):* **Visual Overlap**.
        *   If drag causes overlap -> Bar turns Red + "Shake" animation.
        *   Immediate visual feedback of "Double Booking".

5.  **Feature: Empty Legs (New Requirement)**
    *   *Old Way:* Didn't exist / mental math.
    *   *New Way (Gantt):* **"Ghost Bars"**.
        *   System calculates travel from "Dropoff A" to "Pickup B".
        *   Displays a gray "Transit Bar" between the two real missions.
        *   If Transit > Gap, show warning.


## Technique: "Zero-Based Design" for the Ultimate Dispatch Cockpit

**The "Three-Pane Cockpit" becomes "The Four-Dimension Cockpit":**

1.  **Pane 1 (Left): The Backlog (The Source)**
    *   **Content:** Unassigned Missions.
    *   **Filter Logic:** Only status  (Quotes signed) or  (Missions validated). Defaults to hiding  (but toggle available).
    *   **Sort:** Urgency (Time to pickup).

2.  **Pane 2 (Center): The Timeline (The Plan)**
    *   **View:** Gantt Chart (Rows = Drivers).
    *   **Function:** Allocation & Conflict Management. Drag & Drop.

3.  **Pane 3 (Right): The Inspector (The Detail)**
    *   **Content:** Selected Mission details, Client info, Price.

4.  **The "Live Map" Layer (The Reality)**
    *   **Concept:** A toggle or split-view mode (e.g., "Map/Gantt" switch or "Dual Monitor" style).
    *   **Features:**
        *   **Real-Time Positions:** Pins for every driver (if GPS active).
        *   **Mission Vectors:** Lines showing current active trips.
        *   **Proximity Logic:** When clicking an unassigned mission in Pane 1, the Map highlights the *closest* available drivers in real-time.

**Feature Integration:**
- **Status Rules:** Strict logic that only  quotes enter the Dispatch pipeline.
- **Optimization:** "Who is closest?" feature. Click a mission -> Gantt highlights drivers with "Empty Slots" + Map highlights drivers physically near.


## Technique: "Zero-Based Design" for the Ultimate Dispatch Cockpit

**The "Three-Pane Cockpit" becomes "The Four-Dimension Cockpit":**

1.  **Pane 1 (Left): The Backlog (The Source)**
    *   **Content:** Unassigned Missions.
    *   **Filter Logic:** Only status ACCEPTED (Quotes signed) or READY (Missions validated). Defaults to hiding DRAFT (but toggle available).
    *   **Sort:** Urgency (Time to pickup).

2.  **Pane 2 (Center): The Timeline (The Plan)**
    *   **View:** Gantt Chart (Rows = Drivers).
    *   **Function:** Allocation & Conflict Management. Drag & Drop.

3.  **Pane 3 (Right): The Inspector (The Detail)**
    *   **Content:** Selected Mission details, Client info, Price.

4.  **The "Live Map" Layer (The Reality)**
    *   **Concept:** A toggle or split-view mode (e.g., "Map/Gantt" switch or "Dual Monitor" style).
    *   **Features:**
        *   **Real-Time Positions:** Pins for every driver (if GPS active).
        *   **Mission Vectors:** Lines showing current active trips.
        *   **Proximity Logic:** When clicking an unassigned mission in Pane 1, the Map highlights the closest available drivers in real-time.

**Feature Integration:**
- **Status Rules:** Strict logic that only ACCEPTED quotes enter the Dispatch pipeline.
- **Optimization:** "Who is closest?" feature. Click a mission -> Gantt highlights drivers with "Empty Slots" + Map highlights drivers physically near.


## Strategic Advice: The "Dual Mode" Transition

**The Risk:** Jumping straight to a heavy "Command Center" can be overwhelming and performance-heavy for users just wanting to do a quick check.
**The Advice:** Keep the "List Mode" but integrate it.

**Recommended UX Strategy:**
1.  **Default View:** The "Command Center" (Gantt + Backlog). This is where the work happens.
2.  **Toggle Button:** A clear "List View" / "Calendar View" toggle at the top right.
    *   *List View:* The legacy full-width table (for bulk exports, searching old history, etc.).
    *   *Calendar View:* The new Gantt Cockpit.
3.  **Why?**
    *   **Performance:** Sometimes you need to see 500 missions at once (List is better).
    *   **Simplicity:** Sometimes you just want to find "Invoice #123" (List is faster).
    *   **Power:** When you are *dispatching* (allocating), you use the Gantt.

**Conclusion:**
Don't *delete* the List code. Refactor it to be just another "View Mode" of the same  component.
The "Mission Hub" (Right Panel) logic remains shared between both views.

**Final Recommendation:**
Build the Gantt as the **primary** view, but keep the Table as a **secondary** view option. Do not maintain them as separate pages ( vs ). Consolidate them into  with a view switcher.


## Strategic Advice: The "Dual Mode" Transition

**The Risk:** Jumping straight to a heavy "Command Center" can be overwhelming and performance-heavy for users just wanting to do a quick check.
**The Advice:** Keep the "List Mode" but integrate it.

**Recommended UX Strategy:**
1.  **Default View:** The "Command Center" (Gantt + Backlog). This is where the work happens.
2.  **Toggle Button:** A clear "List View" / "Calendar View" toggle at the top right.
    *   *List View:* The legacy full-width table (for bulk exports, searching old history, etc.).
    *   *Calendar View:* The new Gantt Cockpit.
3.  **Why?**
    *   **Performance:** Sometimes you need to see 500 missions at once (List is better).
    *   **Simplicity:** Sometimes you just want to find "Invoice #123" (List is faster).
    *   **Power:** When you are dispatching (allocating), you use the Gantt.

**Conclusion:**
Don't delete the List code. Refactor it to be just another "View Mode" of the same DispatchPage component.
The "Mission Hub" (Right Panel) logic remains shared between both views.

**Final Recommendation:**
Build the Gantt as the **primary** view, but keep the Table as a **secondary** view option. Do not maintain them as separate pages (/dispatch vs /scheduler). Consolidate them into /dispatch with a view switcher.

