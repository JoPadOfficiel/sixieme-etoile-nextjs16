# Story 26.16: Multi-Trip Calculation Flow (Shopping Cart)

## Description
Transform the quote creation workflow from "One Quote = One Trip" to "One Quote = Multiple Trips".
The left panel becomes a "Calculator". When a price is calculated, the user clicks "Add to Quote", which pushes a line to the Yolo Editor.

## Tasks
- [ ] **UI Refresh:**
    - Rename "Prix Final" panel to "Calculateur".
    - Change "Créer le devis" (Submit) button to "Ajouter au devis" (Add Line).
    - Add a global "Enregistrer le Devis" button that is separate from the calculator.
- [ ] **Logic Change:**
    - `pricingResult` should NOT automatically overwrite `finalPrice` of the *whole quote*.
    - It should only display "Suggested Price: X €" in the calculator area.
    - Clicking "Add" -> Pushes `CALCULATED` line to `quoteLines` state.
- [ ] **Reset logic:**
    - After adding, offer to "Reset Calculator" or "Add Return Trip" (which pre-fills reverse addresses).

## Acceptance Criteria
- [ ] User can calculate a Transfer (A->B) and click "Add". Line appears in Yolo List.
- [ ] User can then calculate a Dispo (4h) and click "Add". Second line appears in Yolo List.
- [ ] The Quote Final Price is the sum of Line 1 + Line 2.
- [ ] Quote submission sends all lines.
