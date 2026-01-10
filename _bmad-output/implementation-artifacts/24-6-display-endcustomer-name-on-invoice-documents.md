# Story: 24-6-display-endcustomer-name-on-invoice-documents

## Status: DONE ✅

## Description
**As an** accountant/operator,
**I want** invoices to show the correct end-customer name with agency billing,
**So that** documents accurately reflect who received the service and who pays.

Currently, invoices only display the Partner Agency. We need to optionally include the End Customer (passenger) information if one was associated with the source Quote, clearly distinguishing between the "Billed To" entity and the "Service For" entity.

## Acceptance Criteria
- [x] **Invoice Generation**: When an invoice is created from a Quote with an `endCustomerId`, the End Customer's details must be preserved/linked on the Invoice.
- [x] **PDF Rendering**: The generated PDF Invoice must display:
    - "Facturé à :" (Billed To) -> The Partner Agency details (Name, Address, VAT).
    - "Prestation pour :" (Service For) -> The End Customer's Name (FirstName LastName).
- [x] **List View**: In the Invoices list table (`/billing/invoices`), the Client column should display "[EndCustomer Name] ([Agency Name])" if an end-customer exists, otherwise just "[Agency Name]".
- [x] **Backward Compatibility**: Existing invoices or invoices without end-customers must render exactly as before.
- [x] **Data Integrity**: The End Customer name on the invoice is linked via `endCustomerId` to the `EndCustomer` record, following the same pattern as Quotes.

## Technical Implementation
- **Schema**: Added `endCustomerId` to `Invoice` model and reverse relation to `EndCustomer`.
- **API**: 
    - Updated `GET /invoices` (list and detail) to include `endCustomer`.
    - Updated `POST /invoices` (manual) and `POST /invoices/from-quote/:quoteId` (auto-creation) to handle `endCustomerId`.
- **PDF**: Updated `generateInvoicePdf` in `pdf-generator.ts` to include the "Prestation pour:" section and `documents.ts` to include the relation in the data transformation.
- **UI**: Updated `InvoicesTable.tsx` to show the End Customer name alongside the Agency name in the Client column.

## Verification Summary
### Automated Tests
- Executed `packages/api/src/routes/vtc/__tests__/invoices-endcustomer.test.ts`
- **Result**: PASS (2 tests passed)
    - ✅ `should create invoice with endCustomer from quote`
    - ✅ `should include endCustomer in list invoices`

### Manual Verification
- Verified PDF layout matches the requirement ("Facturé à" vs "Prestation pour").
- Verified Invoices Table display for both agency-only and agency + end-customer cases.

## Modified Files
- `packages/database/prisma/schema.prisma`
- `packages/api/src/routes/vtc/invoices.ts`
- `packages/api/src/services/pdf-generator.ts`
- `packages/api/src/routes/vtc/documents.ts`
- `apps/web/modules/saas/invoices/types.ts`
- `apps/web/modules/saas/invoices/components/InvoicesTable.tsx`
- `packages/api/src/routes/vtc/__tests__/invoices-endcustomer.test.ts`
- `packages/database/prisma/migrations/20260110121142_add_end_customer_to_invoice/migration.sql`
