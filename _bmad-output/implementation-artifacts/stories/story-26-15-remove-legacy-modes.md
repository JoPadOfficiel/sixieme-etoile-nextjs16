# Story 26.15: Remove Legacy Modes (Stay & Off-Grid)

## Description
The introduction of "Yolo Mode" renders the distinct "Stay" and "Off-Grid" trip types obsolete.
- **Stay Packages** are now just **Groups** of trips in Yolo Mode.
- **Off-Grid** trips are now just **Manual Lines** in Yolo Mode.

We must remove these options to force the usage of the unified system and simplify the codebase.

## Tasks
- [ ] Remove `STAY` and `OFF_GRID` from the `TripType` dropdown in `CreateQuoteCockpit` (or filter them out).
- [ ] Remove `useStayPricingCalculation` logic from the main pricing calculation flow (except if needed for migration).
- [ ] Hide/Remove the `StayDayCard` and `StayServiceForm` components if they are not reused.
- [ ] Verify that selecting `TRANSFER`, `DISPO`, `EXCURSION` correctly defaults to the standard calculator.

## Acceptance Criteria
- [ ] User CANNOT select "Stay" or "Off-Grid" in the trip type selector.
- [ ] The "Stay" specific form fields (days, hotel, etc.) are removed from the main view.
- [ ] The code compiles without errors after removal.
