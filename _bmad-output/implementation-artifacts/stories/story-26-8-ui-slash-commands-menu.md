---
id: "26.8"
epicId: "26"
title: "UI - Slash Commands Menu"
description: "Implement a Notion-like slash command menu that appears when a user types '/' in a line item label, allowing quick insertion of different block types (Text, Heading, Service, Discount)."
status: "review"
assignedTo: "UI/UX Developer"
priority: "Medium"
complexity: "Medium"
---

# Story 26.8: UI - Slash Commands Menu

**As a** power user,  
**I want** to type `/` to see a menu of block types,  
**So that** I can quickly add headers or text lines without using the mouse.

## Acceptance Criteria

### AC1: Slash Trigger
- **Given** the user is editing the label of a Quote Line,
- **When** the user types the `/` character,
- **Then** a popover menu should appear near the cursor.
- **And** the `/` character should remain visible until an option is selected (or removed if the user deletes it).

### AC2: Menu Options
- **Given** the slash menu is open,
- **Then** the following options should be available:
  - **Text Block** (Type: MANUAL, Icon: Text)
  - **Heading** (Type: GROUP, Icon: Heading)
  - **Service** (Type: CALCULATED, Icon: Car/Map) - *Note: Might strictly switch type or insert new row*
  - **Discount** (Type: CALCULATED/MANUAL, Icon: Percent)

### AC3: Selection Behavior
- **Given** the menu is open,
- **When** the user selects an option (Click or Enter),
- **Then** the current line's type should be updated to the selected type OR a new line of that type should be inserted (depending on context - usually "Change Type" if line is empty, "Insert" otherwise).
- **And** the `/` character should be removed from the text.
- **And** the menu should close.

### AC4: Keyboard Navigation
- **Given** the menu is open,
- **When** the user presses Up/Down arrows,
- **Then** the selection highlight should move.
- **When** the user presses Enter,
- **Then** the highlighted option is selected.
- **When** the user presses Escape,
- **Then** the menu closes without making changes.

## Technical Implementation Plan

1.  **Component Creation**: Create `SlashMenu` using Radix UI `Popover` and `CMDK` (or `Command` from `shadcn/ui`).
2.  **Integration**:
    - Modify `UniversalLineItemRow` (or the specific input component for the label).
    - Add `onKeyDown` or `onChange` handler to detect `/`.
    - Track cursor position for popover positioning (or use a floating-ui anchor).
3.  **State Management**:
    - Manage open/close state.
    - Handle selection actions (update usage of `useQuoteStore` or local state).

## Test Strategy

-   **Unit Tests (Vitest)**:
    -   Verify standard rendering of the menu options.
    -   Test keyboard navigation logic (mocking component interactions).
-   **Browser Tests**:
    -   Simulate typing `/`.
    -   Verify popover visibility.
    -   Verify selection functionality.
-   **Constraints**:
    -   Must work within the existing table structure (beware of z-index/overflow clipping).
    -   Must be responsive and accessible.

## Implementation Notes (Amelia)

- **SlashMenu Component**: Created using Radix UI Popover and `cmdk`. Matches Notion-style interaction.
- **Integration**: Integrated into `UniversalLineItemRow`. Triggers on typing `/` at the end of the label.
- **Tests**: Added unit test in `UniversalLineItemRow.test.tsx` verifying menu opening and option presence.
- **Dependencies**: Added `cmdk` and updated `popover.tsx` to export `PopoverAnchor` for precise positioning.
