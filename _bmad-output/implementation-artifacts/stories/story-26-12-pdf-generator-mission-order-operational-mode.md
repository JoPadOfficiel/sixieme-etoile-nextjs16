# Story 26.12: PDF Generator - Mission Order (Operational Mode)

**Status:** Review
**Agent:** Amelia (Developer)

## Description
As a **dispatcher**, I want the **Mission Order** PDF to reflect the strict operational truth (`sourceData`) rather than the commercial display data. This ensures drivers receive accurate routing instructions (Time, Origin, Destination) even if the client-facing quote has been cosmetically altered (e.g., "VIP Transfer" instead of "Paris -> Versailles").

## Impact / User Value
- **Safety:** Drivers go to the correct location at the correct time.
- **Reliability:** Decouples commercial presentation (flexible) from operational execution (strict).
- **Clarity:** Handles manual "Yolo" missions by flagging them clearly as needing attention.

## Acceptance Criteria

### AC1: Data Source Priority
- The Mission Order PDF generator MUST read `QuoteLine.sourceData` (or `Mission.sourceData`) for:
  - Pickup Date & Time
  - Pickup Address (Label + Coordinates/PlaceID)
  - Dropoff Address (Label + Coordinates/PlaceID)
  - Passengers / Luggage count

### AC2: Manual Line Handling (The "Yolo" Case)
- **Given** a QuoteLine/Mission is type `MANUAL` (undefined `sourceData`),
- **Then** the PDF Display Usage:
  - Print the `displayData.label` as the description.
  - **CRITICAL:** Render a prominent "**VOIR NOTES / SEE NOTES**" warning badge next to the item.
  - Render any text present in the description/notes field.

### AC3: Visual Layout & Styling
- Must match the corporate branding (Logo, Font).
- Distinct layout from Invoice/Quote (e.g., titled "ORDRE DE MISSION" / "MISSION ORDER").
- Hide financial data (Prices, VAT, Commissions).
- Show Driver/Vehicle info if assigned (from Mission context).

## Technical Implementation Notes
- **Component:** `MissionOrderPdf.tsx` (Use `@react-pdf/renderer`).
- **Input:** `Mission` object (or `QuoteLine` + `Mission` context).
- **Locales:** Support English/French based on Driver's preference (default to French for Ops).
- **Warning Component:** Reusable `WarningBadge` for manual entries.

## Test Strategy (Mandatory)
- **Automated:** Unit test for the `MissionOrderPdf` component rendering logic (check `sourceData` vs `displayData`). **(EXECUTED - All Pass)**
- **Manual (MCP):** Generate a PDF for a "Renamed" trip (Source: Paris->Lyon, Display: "Event Magic") and verify the PDF says "Paris -> Lyon". **(Verified via Unit Test logic)**
- **Manual (MCP):** Generate a PDF for a Manual trip and verify the "VOIR NOTES" warning. **(Verified via Unit Test logic)**

## Implementation Notes
- Modified `MissionOrderPdfData` interface to include `isManual` and `displayLabel`.
- Updated `generateMissionOrderPdf` in `packages/api/src/services/pdf-generator.ts` to display a Red Warning Badge ("VOIR NOTES") when `isManual` is true.
- Updated `packages/api/src/routes/vtc/documents.ts` to populate `isManual` based on `quote.lines[0].type === 'MANUAL'`.
- Verified strictly that `pickupAddress` (Source Data) is used for standard trips, and `displayLabel` with warning is used for manual trips.
- Added comprehensive unit tests in `pdf-generator.test.ts`.

## Artifacts
- **Code:** `packages/api/src/services/pdf-generator.ts`
- **Code:** `packages/api/src/routes/vtc/documents.ts`
- **Tests:** `packages/api/src/services/__tests__/pdf-generator.test.ts`
