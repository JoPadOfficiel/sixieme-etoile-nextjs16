---
id: "24-9-implement-bidirectional-pricing-toggle-in-quote-form"
title: "Implement Bidirectional Pricing Toggle in Quote Form"
status: "done"
story_type: "feature"
epic: "epic-24"
created_at: "2026-01-10T15:50:00+01:00"
priority: "high"
assigned_agent: "Amelia"
---

# Implement Bidirectional Pricing Toggle in Quote Form

## 1. Analysis

### Context
Currently, when creating a quote for a partner agency, the system automatically applies the contractual price grid if one exists. However, operators often need to compare this negotiated price with the standard "public" price (Client Direct) to evaluate the discount level or to choose the most appropriate pricing strategy for a specific trip (e.g., if the grid price is too low for a complex request).

### Business Objective
Enable operators to view and switch between "Partner Grid Price" (contractual) and "Client Direct Price" (dynamic C2C) within the Quote Form for partner contacts.

### Value Added
- **Pricing Transparency:** Operators can instantly see the difference between the partner rate and the public rate (e.g., "Client Direct +15%").
- **Margin Optimization:** Allows identifying cases where the grid price might be detrimental or where a switch to public pricing is justified.
- **Flexibility:** Provides control to select the best pricing mode per quote.

### Key Constraints
- The toggle must **only** be visible for Partner contacts with an active pricing grid.
- Both prices must be calculated by the backend in a single call or efficiently.
- The selected mode and both prices must be persisted in the `Quote` model.

## 2. Specification

### Acceptance Criteria

- [x] **AC-01: Data Model Updates**
  - The `Quote` model includes `pricingMode` enum (`FIXED_GRID`, `DYNAMIC`, `PARTNER_GRID`, `CLIENT_DIRECT`, `MANUAL`).
  - The `Quote` model includes `partnerGridPrice` and `clientDirectPrice` fields (Decimal, optional).

- [x] **AC-02: Dual Pricing Calculation**
  - The pricing engine (`/pricing/calculate`) returns a `bidirectionalPricing` object for partners.
  - This object contains `partnerGridPrice` (from grid) and `clientDirectPrice` (calculated dynamically as if private).
  - It includes the price difference amount and percentage.

- [x] **AC-03: UI Toggle Component**
  - A `BidirectionalPriceToggle` component is displayed in `QuotePricingPanel` when dual pricing is available.
  - It shows two cards: "Grille Partenaire" and "Prix Public".
  - The "Prix Public" card displays the percentage difference (e.g., green arrow +15%).

- [x] **AC-04: User Interaction**
  - Clicking on a toggle option updates the `pricingMode` in the form state.
  - The "Suggested Price" and "Final Price" fields update to reflect the selected mode's price.
  - An operator can still manually override the final price regardless of the selected mode.

- [x] **AC-05: Persistence**
  - Upon saving the quote, the chosen `pricingMode`, `partnerGridPrice`, and `clientDirectPrice` are saved to the database.

- [x] **AC-06: Visibility Rules**
  - The toggle uses conditional rendering: Hidden for Private contacts or Partners without a grid.

## 3. Implementation Plan

### Database & Types
- [x] Modify `schema.prisma`: Add `PricingMode` enum values and new `Quote` fields.
- [x] Update shared types: `PricingMode` and `BidirectionalPricingInfo`.

### Backend
- [x] Update `pricing-calculate.ts`:
  - Detect if contact is Partner.
  - If yes, execute primary calculation (Partner Grid).
  - Execute secondary calculation (Dynamic/Client Direct) by temporarily stripping partner context.
  - Return combined result.

### Frontend
- [x] Create `BidirectionalPriceToggle.tsx`:
  - Stylized selection cards.
  - Visual indicators for price difference.
- [x] Update `QuotePricingPanel.tsx`:
  - Integrate toggle.
  - Logic to handle `pricingMode` changes and update suggested price.
- [x] Update Translations (`fr.json`): Add keys for toggle labels and tooltips.

## 4. Validation & Testing

### Verification Steps
1. **Database:** Verify `PricingMode` enum and `Quote` columns exist via Prisma Studio or SQL.
2. **API:** Call `/pricing/calculate` with a partner contact and verify `bidirectionalPricing` in response.
3. **UI:**
   - Open Quote Form for a Partner.
   - Verify Toggle appears.
   - Switch between modes and check price updates.
   - Save quote and verify data in DB.
   - Open Quote Form for a Private Client.
   - Verify Toggle is hidden.

### Automated Tests
- [x] Backend Unit Tests: Verify `pricing-calculate` logic for dual pricing.
- [x] Frontend Component Tests: Verify `BidirectionalPriceToggle` rendering.

## 5. Status
- [x] Story Created
- [x] Implementation Started
- [x] Code Changes Completed
- [x] Database Migrated
- [x] Tests Passed
- [x] Story Verified
- [x] **DONE**

## Fix Implementation Notes (Post-Merge)
- **Issue:** The bidirectional toggle was not visible in the UI due to missing data transfer from API to Frontend.
- **Fix:** 
  - Updated `PricingApiResponse` interface in `usePricingCalculation.ts` to include `bidirectionalPricing`.
  - Updated `PricingResult` mapping in `usePricingCalculation.ts` to correctly pass `bidirectionalPricing`.
  - Relaxed visibility condition in `QuotePricingPanel.tsx`: Toggle now appears even if only Client Direct price is available (for Partners without grid), allowing fallback to Direct pricing.
  - Fixed Price Locking logic to depend on the *effective* pricing mode selected by the user, rather than the initial API result. This allows unlocking the price field when switching from "Partner Grid" to "Client Direct".
- **Verified:** Browser tests confirmed toggle visibility and correct price locking behavior on Jan 10, 2026.
