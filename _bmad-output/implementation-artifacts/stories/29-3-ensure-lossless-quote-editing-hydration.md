---

# Story 29.3: Ensure Lossless Quote Editing (Hydration)

**Epic:** Epic 29 - Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)  
**Status:** ready-for-dev  
**Priority:** High  
**Story Key:** 29-3  
**Created:** 2026-01-22T11:12:00+01:00  
**Updated:** 2026-01-22T11:12:00+01:00

## User Story

As a **User**,
I want to edit an existing multi-item quote and have my "Shopping Cart" fully restored,
So that I can add or remove a trip without re-typing the whole quote.

**Related FRs:** FR153, FR160.

## Acceptance Criteria

### AC1: Hydration from Quote Lines

- **Given:** I have a saved multi-item quote with multiple line items
- **When:** I click "Edit" on the Quote in the list view
- **Then:** The `CreateQuoteCockpit` loads and the "Shopping Cart" is repopulated with all existing lines
- **And:** Each line item appears exactly as it was saved (pickup, dropoff, vehicle, price)

### AC2: State/React Sync

- **Given:** The Quote Detail page loads with existing line items
- **When:** The edit functionality hydrates the form
- **Then:** The internal React state (Zustand/Context) is correctly initialized from the DB `QuoteLine` records
- **And:** The `useQuoteLinesStore` contains all the original line items in the correct order

### AC3: Pricing Context Preservation

- **Given:** A quote line has stored pricing data (margin, costs, profitability)
- **When:** The line is hydrated for editing
- **Then:** Each restored line retains its pricing data
- **And:** The profitability indicator remains accurate
- **And:** The TripTransparencyPanel shows the correct cost breakdown

### AC4: Individual Line Editing

- **Given:** The shopping cart is hydrated with multiple lines
- **When:** I click the "Edit" button on any individual line item
- **Then:** The main trip configuration form is populated with that line's data
- **And:** All form fields (pickup, dropoff, vehicle, dates, etc.) are pre-filled
- **And:** I can modify any field and save changes to update that specific line

### AC5: Add/Remove Operations

- **Given:** I'm editing a hydrated quote with existing lines
- **When:** I add a new line to the cart
- **Then:** The new line is added alongside the existing lines
- **When:** I remove an existing line
- **Then:** Only that specific line is removed, others remain intact
- **And:** The total price is recalculated correctly

### AC6: Data Integrity and Validation

- **Given:** I'm editing a hydrated quote
- **When:** I modify line data
- **Then:** All data is properly validated and sanitized
- **And:** Type safety is maintained throughout the editing process
- **And:** Error handling prevents data corruption

## Technical Requirements

### TR1: Line to Form Data Conversion

- Implement `lineToFormData()` utility function to convert `QuoteLine` objects back to `CreateQuoteFormData`
- Handle all trip types: TRANSFER, EXCURSION, DISPO, OFF_GRID
- Preserve source data context for pricing calculations

### TR2: Form Hydration

- Update `CreateQuoteCockpit` and `EditQuoteCockpit` to support line editing
- Add `handleEditLine` callback to populate form with selected line data
- Ensure form state is properly updated without mutation issues

### TR3: Type Safety

- Add proper TypeScript types for all editing operations
- Implement type guards for data validation
- Prevent runtime errors with safe data handling

### TR4: Error Handling

- Add comprehensive error handling for invalid line data
- Provide user feedback when editing fails
- Graceful fallbacks for missing or corrupted data

### TR5: UI Integration

- Add "Edit" button to line item dropdown menu
- Add bulk edit action to SelectionToolbar (single selection only)
- Ensure accessibility compliance with proper labels

## Implementation Details

### Components Modified

- `UniversalLineItemRow.tsx` - Add edit button and callback
- `SelectionToolbar.tsx` - Add bulk edit for single selection
- `CreateQuoteCockpit.tsx` - Add line editing handler
- `EditQuoteCockpit.tsx` - Add line editing handler
- `YoloQuoteEditor.tsx` - Pass edit callbacks through component tree

### New Utilities

- `lineToFormData.ts` - Convert QuoteLine to CreateQuoteFormData
- `typeGuards.ts` - Type safety validation functions
- `validateFormData.ts` - Form data validation and safe merging

### Testing Requirements

- Unit tests for `lineToFormData()` function
- Integration tests for complete edit workflow
- Error handling tests for invalid data scenarios
- Type safety validation tests

## Definition of Done

- [x] All acceptance criteria implemented and passing
- [x] Type safety violations fixed
- [x] Error handling implemented with user feedback
- [x] State mutation issues resolved
- [x] Comprehensive test coverage (85%+)
- [x] Conditional logic fixed in SelectionToolbar
- [x] Code review completed and critical issues resolved
- [x] Feature tested in both CreateQuoteCockpit and EditQuoteCockpit
- [x] Documentation updated

## Notes

This story implements the shopping cart line editing functionality that allows users to:

1. Click "Edit" on any line item to populate the main form
2. Modify trip details and save back to the cart
3. Use bulk actions when exactly one line is selected
4. Maintain data integrity and type safety throughout

The implementation includes comprehensive error handling, validation, and test coverage to ensure robust production deployment.

## Related Files

- `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx`
- `apps/web/modules/saas/quotes/components/yolo/SelectionToolbar.tsx`
- `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`
- `apps/web/modules/saas/quotes/components/EditQuoteCockpit.tsx`
- `apps/web/modules/saas/quotes/utils/lineToFormData.ts`
- `apps/web/modules/saas/quotes/utils/typeGuards.ts`
- `apps/web/modules/saas/quotes/utils/validateFormData.ts`
