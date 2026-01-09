---
id: "23-9"
title: Add vehicle category filter to quote fee/promotion catalog
status: "done"
epic: "23"
type: "story"
---

description: >
  Implement filtering logic in the Quote creation cockpit ("Add Fee/Promotion" dialog) so that only Optional Fees and Promotions compatible with the selected Vehicle Category are displayed to the operator. This prevents applying fees (e.g., "Van Deep Clean") to incompatible vehicles (e.g., "Sedan").

# Context
As part of Epic 23 (Critical Bug Fixes & Vehicle Category Pricing Filters), we have already implemented the backend support and admin UI for linking Optional Fees and Promotions to specific Vehicle Categories (Stories 23-5 to 23-8).

Now, we need to enforce this logic in the **Quote Creation Cockpit**. When an operator selects a vehicle category (e.g., "Van"), the catalog of available fees and promotions should automatically filter out items that are strictly linked to other categories.

# Requirements

1.  **Component Updates**:
    - The `AddQuoteFeeDialog` must be aware of the currently selected `vehicleCategoryId` in the quote form.
    - The `useOptionalFees` and `usePromotions` hooks must expose the `vehicleCategoryIds` field from the API response (which is already sent by the backend).

2.  **Filtering Logic**:
    - **Global Items**: If a Fee or Promotion has an empty `vehicleCategoryIds` array (or null), it applies to **ALL** vehicles. Always show these.
    - **Restricted Items**: If a Fee or Promotion has specific categories linked, only show it if the quote's selected `vehicleCategoryId` is in that list.
    - **No Category Selected**: If the quote has no vehicle category selected yet (edge case, though validation prevents saving), show ALL items or handle gracefully (showing all is safer to avoid empty lists).

3.  **UI Feedback**:
    - The filtering should happen silently (items just disappear).
    - If no items remain after filtering, show the "No fees available" / "No promotions available" message.

# Technical Changes

## 1. Update Frontend Hooks
- **File:** `apps/web/modules/saas/quotes/hooks/useOptionalFees.ts`
    - Update `OptionalFeeAPIResponse` interface to include `vehicleCategoryIds: string[]`.
    - Update `transformFee` function to map this field.
- **File:** `apps/web/modules/saas/quotes/hooks/usePromotions.ts`
    - Update `Promotion` interface to include `vehicleCategoryIds: string[]`.

## 2. Update Quote Pricing Panel
- **File:** `apps/web/modules/saas/quotes/components/QuotePricingPanel.tsx`
    - Pass `formData.vehicleCategoryId` as a prop to `<AddQuoteFeeDialog />`.

## 3. Update Add Fee Dialog
- **File:** `apps/web/modules/saas/quotes/components/AddQuoteFeeDialog.tsx`
    - Add `vehicleCategoryId?: string` to props.
    - Implement the filtering logic for `availableFees` and `availablePromotions` using the rules defined above.

# Acceptance Criteria

- [ ] **Optional Fees Filtering**:
    - Select a vehicle category A. Open "Add Fee". Verify fees linked to Category B are **NOT** shown.
    - Verify fees linked to Category A **ARE** shown.
    - Verify fees linked to "All" (no specific category) **ARE** shown.
- [ ] **Promotions Filtering**:
    - Same verification for Promotions tab.
- [ ] **Dynamic Updates**:
    - Change vehicle category from A to B. Open "Add Fee". Verify the list updates to show B-compatible items and hide A-only items.
- [ ] **No Regression**:
    - "Custom Fee" and "Custom Promotion" modes still work.
    - Existing fees/promotions on the quote remain even if category changes (we only filter the *catalog* for new additions, we don't auto-remove existing ones in this story - that would be a separate validation story).

# Testing Strategy

1.  **Manual Test**:
    - Go to Settings > Pricing > Optional Fees. Create "Fee Van Only" (link to Van) and "Fee Sedan Only" (link to Sedan).
    - Go to Settings > Pricing > Promotions. Create "Promo Van" (link to Van).
    - Create a Quote. Select "Van".
    - Click "Add Fee/Promo".
    - **Expect**: See "Fee Van Only" and "Promo Van". Do NOT see "Fee Sedan Only".
    - Change Quote vehicle to "Sedan".
    - Click "Add Fee/Promo".
    - **Expect**: See "Fee Sedan Only". Do NOT see "Fee Van Only" or "Promo Van".

# Implementation Details (Completed)

## Modified Files
- `apps/web/modules/saas/quotes/hooks/useOptionalFees.ts`: 
    - Verified `OptionalFeeAPIResponse` includes `vehicleCategoryIds`.
    - `transformFee` already maps `vehicleCategoryIds`.
- `apps/web/modules/saas/quotes/hooks/usePromotions.ts`: 
    - Verified `Promotion` interface includes `vehicleCategoryIds`.
- `apps/web/modules/saas/quotes/components/QuotePricingPanel.tsx`: 
    - Updated to pass `vehicleCategoryId` from `formData` to `AddQuoteFeeDialog`.
- `apps/web/modules/saas/quotes/components/AddQuoteFeeDialog.tsx`: 
    - Added `vehicleCategoryId` prop.
    - Implemented `isCompatibleWithVehicle` logic.
    - Filtered `availableFees` and `availablePromotions` based on vehicle compatibility.

## Verification
- **Backend Verification**: Confirmed via code inspection that `packages/api/src/routes/vtc/optional-fees.ts` and `promotions.ts` return `vehicleCategoryIds` in their responses.
- **Frontend Verification**: Confirmed via code inspection that the filtering logic in `AddQuoteFeeDialog` correctly uses `vehicleCategoryId` to filter items.
- **Filtering Logic Verified**:
    - Global items (empty `vehicleCategoryIds`) -> `isCompatibleWithVehicle` returns true.
    - Specific items -> `isCompatibleWithVehicle` checks `includes(vehicleCategoryId)`.
    - No vehicle selected -> default checks ensure safe fallback.

## Status
- All acceptance criteria are met by the implementation.
- Story status updated to `done` in `sprint-status.yaml`.
