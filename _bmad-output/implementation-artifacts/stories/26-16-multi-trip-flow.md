# Story 26.16: Multi-Trip Calculation Flow (Shopping Cart)

## Story Info
| Field | Value |
|-------|-------|
| **ID** | 26-16 |
| **Epic** | 26 - Unified Yolo Billing |
| **Status** | done |
| **Priority** | High |

## Description
Transform the quote creation workflow from "One Quote = One Trip" to "One Quote = Multiple Trips".
The left panel creates a **Calculation Context**. The user configures a trip, sees the price, and clicks "Add to Quote" to push it as a line item into the **Yolo Editor** (Shopping Cart).

## User Experience Changes
1. **Left Panel (Inputs)**: Remains mostly the same, but now acts as a "Calculator Input".
2. **Right Panel (Pricing)**:
   - Header changes from "Total Devis" to "Estimation Trajet".
   - "Créer le devis" button is removed/moved.
   - New Action: "Ajouter au Panier" (Add to Quote).
3. **Center Panel (Cart)**:
   - Displays the list of added trips.
   - Shows the *Real* Global Total of the Quote.
   - Contains the final "Enregistrer le Devis" button.

## Technical Tasks
- [x] **Decouple Pricing from Final Price:**
    - Stop `pricingResult` from automatically updating `formData.finalPrice`.
    - `formData.finalPrice` must be strictly equal to `yoloTotal` (sum of lines).
- [x] **Update Helper Panel:**
    - `AirportHelperPanel` should apply fees to the *current calculation* only, not global quote fees. (Note: Kept simple for now, we will just copy selected fees to the line item).
- [x] **Implement `addCalculationToQuote`:**
    - Function to convert current form state + pricing result into a `CALCULATED` line.
    - Must snapshot: Origin, Dest, Distance, Duration, Price, VAT, Selected Options.
    - Must reset relevant form fields after adding (optional, maybe keep for return trip?).
- [x] **Update UI:**
    - Modify `QuotePricingPanel` to show "Add" button instead of "Submit" when in Calculator mode.
    - Move "Submit Quote" button to the Yolo Editor footer or a global sticky footer.
    - Add "Clear" button to reset calculator.

## Acceptance Criteria
- [x] User can calculate a trip (e.g. Paris->Lyon, 500€).
- [x] Clicking "Ajouter" adds a line "Paris->Lyon" (500€) to the list.
- [x] The global quote total updates to 500€.
- [x] User can calculate another trip (e.g. Lyon->Marseille, 300€).
- [x] Clicking "Ajouter" adds a second line.
- [x] The global quote total updates to 800€.
- [x] User can manually add a "Bottle of Champagne" (50€) via manual line.
- [x] Global total is 850€.
- [x] Saving the quote sends all 3 lines to the backend.

## Implementation Notes
- `CreateQuoteCockpit` heavily refactored.
- Legacy `TripTransparencyPanel` removed (logic moved to Shopping Cart flow).
- `createQuoteMutation` updated to use the first line of the cart as the "Main Trip" payload for legacy API compatibility.
