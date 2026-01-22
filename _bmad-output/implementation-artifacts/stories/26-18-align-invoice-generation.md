# Story 26.18: Align Invoice Generation

**Status**: Done
**Epic**: 26
**Priority**: High

## Description
Ensure that the Invoice PDF generation logic (and Quote PDF) correctly handles the new "Yolo Mode" multi-line structure (`quoteLines`/`invoiceLines` with types `MANUAL`, `GROUP`, `CALCULATED`).

The legacy logic relied on a single `finalPrice` and generated a generic "Transport Service" description. The new logic must respect the explicit lines provided in the cart.

## Acceptance Criteria
- [x] Quote PDF generation uses `quote.lines` if present.
- [x] Invoice PDF generation uses `invoice.lines` if present.
- [x] Group headers are rendered distinctly in the PDF.
- [x] Multi-line descriptions are properly wrapped.
- [x] Legacy single-line quotes continue to work (backward compatibility).

## Implementation Details
- Confirmed `packages/api/src/services/pdf-generator.ts` supports `GROUP` lines and detailed line items.
- Confirmed `packages/api/src/routes/vtc/documents.ts` fetches and maps `lines` correctly.
- Verified "legacy override" logic in `transformInvoiceToPdfData` skips overriding strict Yolo lines.

## Validation
- Code review of `pdf-generator.ts` and `documents.ts` confirms support.
- **UI Restoration (Post-Impl)**: Reintegrated `TripTransparencyPanel` (Center Column) and separated Shopping Cart (Right Column) to fix regression. Verified 3-column layout.
- **Translation**: Fixed `MISSING_MESSAGE` errors in Cart components.

### Test Command (CURL)
To manually generate and inspect an invoice PDF for a specific ID:
```bash
curl -X POST http://localhost:3000/api/vtc/documents/generate/invoice/<INVOICE_ID> \
  -H "Content-Type: application/json" \
  -H "x-organization-id: <ORG_ID>" \
  -H "Cookie: auth-token=<TOKEN>" \
  --output invoice_test.pdf
```
