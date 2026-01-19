# Story 26.16: Multi-Trip Calculation Flow (Shopping Cart)

## Story Info
| Field | Value |
|-------|-------|
| **ID** | 26-16 |
| **Epic** | 26 - Unified Yolo Billing |
| **Status** | done |
| **Priority** | High |
| **Assigned To** | Startupper (JoPad) |

## Description
Transform the quote creation workflow from "One Quote = One Trip" to "One Quote = Multiple Trips".
The left panel becomes a "Calculator". When a price is calculated, the user clicks "Add to Quote", which pushes a line to the Yolo Editor.

## Acceptance Criteria
- [x] **Decoupled Pricing:** The calculator result (`pricingResult`) no longer overwrites the global quote `finalPrice`.
- [x] **Add to Quote:** The "Pricing Panel" submit button now triggers `handleAddPricingLine` instead of creating the quote immediately.
- [x] **Global Checkout:** A new "Global Actions Bar" is added at the bottom of the screen to display the Total Yolo Amount and the "Create Quote" button.
- [x] **Manual Override:** If the user edits the price in the Pricing Panel, that manual price is used when adding the line to the cart.
- [x] **Yolo Integration:** Added lines appear immediately in the Yolo Editor (middle panel).

## Implementation Details
- **CreateQuoteCockpit.tsx**:
    - Removed `useEffect` that synced `pricingResult.price` to `formData.finalPrice`.
    - Modified `handleAddPricingLine` to take the current `formData.finalPrice` as the unit price.
    - Repurposed `QuotePricingPanel` to act as the "Add to Cart" interface.
    - Added a sticky `GlobalActionsBar` footer components with the final Total and Submit button.

## Verification
- Compilation passed.
- Logic flow verified: Calculate -> Edit Price -> Add to Cart -> Global Submit.
