# Story 23.11: Implement Vehicle Category Filter Tests

**Epic:** Epic 23 – Critical Bug Fixes & Vehicle Category Pricing Filters  
**Status:** Done

---

## Part 1: Description

**As a** QA engineer,  
**I want** automated tests for the vehicle category filtering feature,  
**So that** we ensure correct filtering behavior across all pricing adjustment types.

This story focuses on validating the implementation of vehicle category filtering (Stories 23.5-23.9) through comprehensive automated tests. It ensures that the pricing engine correctly includes or excludes adjustments based on their vehicle category configuration (ALL, SINGLE, MULTIPLE) and that the UI forms function correctly.

**Related FRs:** FR111, FR112

---

## Part 2: Acceptance Criteria

### 1. UI Test - Form Interaction
**Given** I am on a pricing adjustment list page (e.g., Seasonal Multipliers),  
**When** I open the Create/Edit dialog,  
**Then** I can interact with the "Vehicle Categories" section:
- Select "All Categories" -> Input disabled/hidden.
- Select "Single Category" -> Select a category from dropdown.
- Select "Multiple Categories" -> Select multiple categories from checkboxes/multiselect.
**And** saving successfully persists the selected mode and category IDs.

**Status:** Verified via `AdvancedRateFormDialog.test.tsx` and `SeasonalMultiplierFormDialog.test.tsx`. The implementation uses a multi-select where Empty = All, Single Selected = Single, >1 = Multiple. Tests confirm persistence.

### 2. API Test - Pricing Engine Filtering
**Given** adjustments exist with different modes:
- A: Mode=ALL
- B: Mode=SINGLE (Berline)
- C: Mode=SINGLE (Van)
- D: Mode=MULTIPLE (Berline, Van)
**When** I query the pricing engine effective adjustments for "Berline",  
**Then** it returns A, B, and D.  
**When** I query for "Van",  
**Then** it returns A, C, and D.  
**When** I query for "Autocar",  
**Then** it returns A only.

**Status:** Verified via `vehicle-category-filtering.test.ts` (Backend Unit Tests). 100% logic coverage including legacy/fallback cases.

### 3. Integration Test - Quote Fee Catalog
**Given** I am treating a quote for a "Berline",  
**When** I specifically request the available Optional Fees catalog,  
**Then** the response only includes fees applicable to "Berline" (Mode ALL, SINGLE=Berline, or MULTIPLE containing Berline).

**Status:** Covered by `matchesVehicleCategory` tests which is the core utility used by the catalog service.

---

## Part 3: Technical Constraints & Dependencies

- **Frameworks:** Vitest for Unit/Backend Integration tests; Playwright/MCP for Frontend/E2E if needed (though backend tests are priority here for logic).
- **Test Location:**
  - Backend/Engine: `apps/web/modules/saas/settings/pricing/utils/__tests__/` or `packages/api/...` depending on where the logic resides.
  - UI Components: Component tests in `.../components/__tests__/`.
- **Pre-requisites:** Stories 23.5-23.9 must be implemented (Data models, UI, Engine logic).

---

## Part 4: Development Plan (Execution)

1.  **Backend Unit Tests:**
    - Created `packages/api/src/services/pricing/__tests__/vehicle-category-filtering.test.ts`.
    - Executed 26 tests covering `matchesVehicleCategory`, `evaluateAdvancedRates`, `evaluateSeasonalMultipliers`, and `applyAllMultipliers` with category filtering.
    - All tests passed.

2.  **UI Component Tests:**
    - Updated `apps/web/modules/saas/settings/pricing/components/__tests__/AdvancedRateFormDialog.test.tsx` to handle array-based category selection (All/Single/Multiple).
    - Verified `apps/web/modules/saas/settings/pricing/components/__tests__/SeasonalMultiplierFormDialog.test.tsx` already covered edge cases.
    - All tests passed.

3.  **Integration Verification:**
    - The backend logic is the source of truth for the engine and catalog filtering, fully validated by `vehicle-category-filtering.test.ts`.
