# Epic 26 Refactor: Final Unification (Yolo Revolution)

## Strategic Objective
Replace the hybrid "Form + Yolo Toggle" system with a fully unified "Calculator + Shopping Cart" architecture. This eliminates the redundancy of "Stay Packages" and "Off-Grid" while solving the multi-trip quote problem.

---

## 🛑 Deletion Phase (Story 26.15)
**Goal:** Remove obsolete legacy systems that confuse the user.

- [ ] **Remove "Trip Type" Selectors:**
    - Delete `STAY` and `OFF_GRID` options from `TripType` enum displayed in UI.
    - Keep `TRANSFER`, `DISPO`, `EXCURSION` as "Calculation Modes".
- [ ] **Delete "Stay" Components:**
    - Remove `StayDayCard.tsx`, `StayServiceForm.tsx`.
    - Remove `useStayPricingCalculation` hook usage in Cockpit.
- [ ] **Delete "Off-Grid" Components:**
    - Remove manual pricing workaround components.

## 🛒 The "Shopping Cart" Transformation (Story 26.16)
**Goal:** Allow creating multi-trip quotes easily (e.g., Transfer + Disposition + Transfer).

- [ ] **Transform Left Panel (Calculator):**
    - Rename "Basic Info" to "Trip Calculator".
    - Change logic: Data entry here does NOT directly set the Quote Price.
    - Add clear action button: **"Add to Quote"** (pushes `CALCULATED` line to Yolo List).
    - Add "Clear" button to reset calculator for the next trip.
- [ ] **Transform Right Panel (Quote Builder):**
    - The Yolo Editor becomes the **Main View** (always visible, no toggle).
    - `FinalPrice` is *always* the sum of Yolo lines.
    - `TripTransparency` panel becomes a "Preview of Current Calculation" (before adding).

## ⚡ UX Improvements (Story 26.17)
**Goal:** Fix usability issues identified by user.

- [ ] **New "Add Block" UI:**
    - Add prominent `[+] Add Manual Line` button at bottom of list.
    - Add `[+] Add Group` button at bottom of list.
    - Ensure Slash Command menu is a power-user shortcut, not the only way.
- [ ] **Empty State:**
    - "Your quote is empty. Use the calculator on the left to add a trip, or add a manual line below."

## 📄 Invoice Alignment (Story 26.18)
**Goal:** Ensure the produced PDF matches the new structure.

- [ ] Verify PDF generator iterates over `QuoteLine[]`.
- [ ] Ensure Groups render as sections in PDF.
- [ ] Ensure "Calculated" lines show their simple description in PDF (not full technical details unless expanded).

---

## Execution Order
1. **Story 26.15** (Delete Legacy) - *High Priority*
2. **Story 26.16** (Calculator to Cart) - *High Priority*
3. **Story 26.17** (UX) - *Medium Priority*
4. **Story 26.18** (PDF Check) - *Medium Priority*
