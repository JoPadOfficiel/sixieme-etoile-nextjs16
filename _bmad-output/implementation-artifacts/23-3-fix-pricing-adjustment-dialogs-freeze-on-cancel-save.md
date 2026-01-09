---
id: "23-3-fix-pricing-adjustment-dialogs-freeze-on-cancel-save"
epic: "epic-23"
name: "Fix Pricing Adjustment Dialogs Freeze on Cancel/Save"
status: "done"
priority: "high"
complexity: "S"
---

## User Story

**As a** pricing administrator,
**I want** to be able to cancel or save changes in the Optional Fees, Seasonal Multipliers, and Promotions dialogs,
**So that** the interface remains responsive and I don't have to refresh the page to close a stuck dialog.

## Context & Problem

Users report that clicking "Cancel" (and sometimes "Save") in the pricing adjustment dialogs causes the UI to freeze or the dialog simply refuses to close. This affects:
1.  Optional Fees
2.  Seasonal Multipliers
3.  Promotions

These dialogs likely use a controlled `open` state, but the `onCancel` or `onSubmit` handlers might not be resetting this state correctly, or there is an infinite loop in the state update.

## Acceptance Criteria

1.  **Dialog Closing**:
    *   **Given** I have the "Add/Edit Fee" (or Multiplier/Promotion) dialog open,
    *   **When** I click "Cancel",
    *   **Then** the dialog closes immediately and the UI remains responsive.

2.  **Save & Close**:
    *   **Given** I have filled the form,
    *   **When** I click "Save",
    *   **Then** the data is saved (success toast) AND the dialog closes automatically.

3.  **Scope**:
    *   Apply fix to `OptionalFeeFormDialog`.
    *   Apply fix to `SeasonalMultiplierFormDialog`.
    *   Apply fix to `PromotionFormDialog`.

## Technical Notes

*   **Files**:
    *   `apps/web/modules/saas/settings/pricing/components/OptionalFeeFormDialog.tsx`
    *   `apps/web/modules/saas/settings/pricing/components/SeasonalMultiplierFormDialog.tsx`
    *   `apps/web/modules/saas/settings/pricing/components/PromotionFormDialog.tsx`
*   **Likely Cause**:
    *   The `onCancel` prop from the parent list component might not be wired to `setOpen(false)`.
    *   Or the internal `open` state of the dialog (if unchecked) is conflicting with the parent's controlled state.
    *   Check for `DialogPrimitive.Close` usage vs manual state updates.

## Testing Strategy

1.  **Manual/Browser Test**:
    *   Go to `/app/[org]/settings/pricing/adjustments`.
    *   Open "Optional Fees" tab. Click "Add Fee". Click "Cancel". Verify close.
    *   Repeat for Seasonal Multipliers and Promotions.
    *   Test "Save" action as well.
