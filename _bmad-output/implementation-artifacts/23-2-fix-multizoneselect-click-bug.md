---
id: "23-2-fix-multizoneselect-click-bug"
epic: "epic-23"
name: "Fix MultiZoneSelect Component Click Interaction Bug"
status: "in-progress"
priority: "high"
complexity: "M"
---

## User Story

**As a** pricing administrator,
**I want** to select origin and destination zones using the mouse in excursion and route forms,
**So that** I can configure zone-based pricing without keyboard-only workarounds.

## Context & Problem

Currently, the `MultiZoneSelect` component (used in Excursion and Route configuration forms inside Drawers/Sheets) has a bug where mouse click interactions on the dropdown items are not registered. Users report they have to use keyboard navigation (arrows + enter) to select zones. This is likely due to a z-index stacking context issue or portal conflict between the parent Sheet/Dialog and the DropdownMenu's portal.

## Acceptance Criteria

1.  **Dropdown Interaction**:
    *   **Given** I open the Edit Excursion or Edit Route drawer/sheet,
    *   **When** I click on the "Select origin zones..." dropdown,
    *   **Then** the dropdown opens and displays the list of available zones.

2.  **Mouse Selection**:
    *   **Given** the zone dropdown is open,
    *   **When** I click on a zone item with the mouse,
    *   **Then** the zone is selected and added to the selection badges below the dropdown.

3.  **Badge Removal**:
    *   **Given** I have selected multiple zones,
    *   **When** I click the X button on a zone badge,
    *   **Then** the zone is removed from the selection.

4.  **Input Methods**:
    *   **And** all interactions must work with BOTH mouse clicks and keyboard navigation.

## Technical Notes

*   **Component Location**: `apps/web/modules/saas/settings/pricing/components/multi-zone-select.tsx` (or similar path, verify with search).
*   **Root Cause Analysis**:
    *   The component likely uses `DropdownMenu` or `Select` from shadcn/ui.
    *   When used inside a `Sheet` (which is a Dialog), the default Portal behavior of the dropdown might place it "behind" the Sheet's overlay in terms of event capture or z-index, or `modal={true}` (default) on the Dropdown might be conflicting with the Sheet's focus trap.
    *   **Suggested Fix**: Check `modal` prop on `DropdownMenu`. Trying `modal={false}` often fixes interaction issues when nested in another modal/sheet. Alternatively, check `PopOver` vs `DropdownMenu` usage.
*   **Verification**: Test in the Excursion or Route edition drawer (`/settings/pricing/routes` or `/settings/pricing/excursions`).

## Testing Strategy

1.  **Manual/Browser Test**:
    *   Go to `/app/[org]/settings/pricing/excursions`.
    *   Click "Add Excursion" or Edit an existing one.
    *   Try to select zones using ONLY the mouse.
2.  **Unit/Component Test**:
    *   Ensure existing tests pass.
