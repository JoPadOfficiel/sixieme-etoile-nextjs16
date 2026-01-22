# Story 26.15: Remove Legacy Modes (Stay & Off-Grid)

## Story Info
| Field | Value |
|-------|-------|
| **ID** | 26-15 |
| **Epic** | 26 - Unified Yolo Billing |
| **Status** | done |
| **Priority** | High |
| **Assigned To** | Startupper (JoPad) |

## Description
The introduction of "Yolo Mode" renders the distinct "Stay" and "Off-Grid" trip types obsolete.
- **Stay Packages** are now just **Groups** of trips in Yolo Mode.
- **Off-Grid** trips are now just **Manual Lines** in Yolo Mode.

We have removed these options to force the usage of the unified system and simplify the codebase.

## Acceptance Criteria
- [x] User CANNOT select "Stay" or "Off-Grid" in the trip type selector (`QuoteBasicInfoPanel`).
- [x] The "Stay" specific form fields (days, hotel, etc.) are removed from the main view (`CreateQuoteCockpit`).
- [x] Logic for `useStayPricingCalculation` is removed from `CreateQuoteCockpit`.
- [x] Components `StayDayCard`, `StayServiceForm`, `StayFormFields` and hook `useStayPricingCalculation` are deleted.
- [x] The code compiles without errors.

## Implementation Details
- Modified `QuoteBasicInfoPanel.tsx` to filter `TRIP_TYPES` constant.
- Refactored `CreateQuoteCockpit.tsx` to remove `stayPricingResult`, `stayPricingError`, and dead conditional blocks.
- Cleaned up `TripTypeFormFields.tsx` to remove `switch` cases for removed types.
- Deleted obsolete files.

## Verification
- Verified compilation with `tsc`.
- Verified file deletion.
