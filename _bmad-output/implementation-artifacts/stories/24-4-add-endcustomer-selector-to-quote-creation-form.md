# Story 24.4: Add EndCustomer Selector to Quote Creation Form

**Status:** done
**Implemented:** 2026-01-10

## Story

**As a** quote operator,  
**I want** to select an end-customer when creating a quote for a Partner contact,  
**So that** the quote is attributed to the correct individual client.

## Related Functional Requirements

- **FR123**: Quote end-customer selector for partner contacts
- **FR124**: End-customer display on quote summaries

## Prerequisites

- Story 24.1: EndCustomer data model ✅
- Story 24.2: EndCustomer CRUD API ✅
- Story 24.3: EndCustomer section in contact detail page ✅

## Implementation Summary

### Changes Made

1. **Types Updated (`apps/web/modules/saas/quotes/types.ts`)**:
   - Added `EndCustomer` interface for quote form usage
   - Added `endCustomerId` and `endCustomer` fields to `CreateQuoteFormData`
   - Updated `initialCreateQuoteFormData` with defaults

2. **EndCustomerSelector Component Created (`apps/web/modules/saas/quotes/components/EndCustomerSelector.tsx`)**:
   - Select dropdown for end-customers
   - Fetches end-customers via API for selected partner contact
   - Inline creation option ("+ Créer un nouveau client")
   - Auto-selects newly created end-customer
   - Displays difficulty score as stars

3. **Quote Form Integration (`apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx`)**:
   - Added EndCustomerSelector import
   - Added `handleEndCustomerChange` handler
   - Clears end-customer when contact changes
   - Conditionally renders selector for partner contacts only

4. **Quote Creation API Update (`apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`)**:
   - Added `endCustomerId` to quote creation payload

5. **Backend API Update (`packages/api/src/routes/vtc/quotes.ts`)**:
   - Added `endCustomerId` to `createQuoteSchema`
   - Added `endCustomerId` to quote creation data

6. **Edit Quote Support (`apps/web/modules/saas/quotes/components/EditQuoteCockpit.tsx`)**:
   - Added `endCustomerId` and `endCustomer` to form initialization

7. **Translations (`packages/i18n/translations/`)**:
   - Added `quotes.end_customer.*` keys in both `fr.json` and `en.json`

8. **Bug Fix (`apps/web/modules/saas/contacts/components/EndCustomerList.tsx`)**:
   - Fixed API call missing `query` parameter

## Files Modified

| File | Changes |
|------|---------|
| `apps/web/modules/saas/quotes/types.ts` | Added `EndCustomer` type, `endCustomerId`/`endCustomer` to form data |
| `apps/web/modules/saas/quotes/components/EndCustomerSelector.tsx` | **NEW** - Complete component |
| `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx` | Integration with EndCustomerSelector |
| `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx` | Added `endCustomerId` to API payload |
| `apps/web/modules/saas/quotes/components/EditQuoteCockpit.tsx` | Added `endCustomerId`/`endCustomer` to form init |
| `packages/api/src/routes/vtc/quotes.ts` | Added `endCustomerId` to schema and create logic |
| `packages/i18n/translations/fr.json` | Added `quotes.end_customer` translations |
| `packages/i18n/translations/en.json` | Added `quotes.end_customer` translations |
| `apps/web/modules/saas/contacts/components/EndCustomerList.tsx` | Fixed API query parameter |

## Acceptance Criteria Status

| AC | Description | Status |
|----|-------------|--------|
| AC1 | EndCustomer dropdown visibility for partner contacts | ✅ Implemented |
| AC2 | EndCustomer list display with name and difficulty badge | ✅ Implemented |
| AC3 | Inline EndCustomer creation | ✅ Implemented |
| AC4 | EndCustomer storage on Quote | ✅ Implemented |
| AC5 | Quote summary display | ⏳ Deferred to Story 24.5 |
| AC6 | EndCustomer selection reset on contact change | ✅ Implemented |

## Test Results

### Browser Tests (MCP Browser)

| ID | Test Case | Result |
|----|-----------|--------|
| TC3.1 | Select partner contact → EndCustomer dropdown appears | ✅ Pass |
| TC3.2 | Dropdown shows end-customer list and create option | ✅ Pass |
| TC3.3 | EndCustomer selector hidden for non-partner contacts | ✅ Pass |
| TC3.4 | Change contact → EndCustomer cleared | ✅ Pass |

### TypeScript Compilation

- ✅ No compilation errors related to EndCustomerSelector
- ✅ Types correctly propagated through form

## Notes

- AC5 (Quote summary display) was deferred to Story 24.5 as it involves PDF generation
- The `endCustomerDifficultyScore` copy to Quote pricing will be addressed in Story 24.8
- The existing Quote model already has `endCustomerId` from Story 24.1 migration
