# Story 26.17: UX Improvements (Add Line/Group Buttons)

## Story Info
| Field | Value |
|-------|-------|
| **ID** | 26-17 |
| **Epic** | 26 - Unified Yolo Billing |
| **Status** | done |
| **Priority** | Medium |

## Description
Unlock the full potential of "Yolo Mode" (Flexible Billing) by allowing users to structure their quote directly in the cart, not just by feeding it from the calculator.
Users need to be able to:
- Add a manual line (e.g. "Bottle of Champagne", "Waiting Time") without using the calculator.
- Create Groups (previously "Stay Packages") to organize trips (e.g. "Day 1", "Day 2").

## User Experience Changes
- **Empty State**: If cart is empty, show "Start by calculating a trip OR Add a manual line".
- **Action Bar**: Below the list of lines, add buttons:
  - `[+ Add Manual Line]`
  - `[+ Create Group]`
- **Group Actions**: Inside a group, allow dropping items or "Add Line to Group".

## Technical Tasks
- [x] **Update YoloQuoteEditor**:
    - Add `onAddLine` prop/handler.
    - Add `onAddGroup` prop/handler.
- [x] **Implement Action Buttons**:
    - Add button row at bottom of list.
    - Add "Empty State" placeholder.
- [x] **Implement Logic**:
    - `addLine`: Adds a `type: "MANUAL"` line with default values.
    - `addGroup`: Adds a `type: "GROUP"` line.
- [x] **Keybindings**: Optional hotkeys (cmd+enter to add line?).

## Acceptance Criteria
- [x] Button "Add Manual Line" adds a robust editable line at the end.
- [x] Button "Add Group" adds a new Group container.
- [x] User can drag a calculated trip into a created group.
- [x] User can rename the group.

## Implementation Details
- Modified `YoloQuoteEditor.tsx` to include `handleAddGroup` and render buttons for adding lines/groups.
- Used lucide icons (`PlusIcon`, `FolderPlusIcon`) for better affordance.
