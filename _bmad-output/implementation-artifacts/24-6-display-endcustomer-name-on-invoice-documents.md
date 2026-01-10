# Story: 24-6-display-endcustomer-name-on-invoice-documents

## Description
**As an** accountant/operator,
**I want** invoices to show the correct end-customer name with agency billing,
**So that** documents accurately reflect who received the service and who pays.

Currently, invoices only display the Partner Agency. We need to optionally include the End Customer (passenger) information if one was associated with the source Quote, clearly distinguishing between the "Billed To" entity and the "Service For" entity.

## Acceptance Criteria
- [ ] **Invoice Generation**: When an invoice is created from a Quote with an `endCustomerId`, the End Customer's details must be preserved/linked on the Invoice.
- [ ] **PDF Rendering**: The generated PDF Invoice must display:
    - "Facturé à :" (Billed To) -> The Partner Agency details (Name, Address, VAT).
    - "Prestation pour :" (Service For) -> The End Customer's Name (FirstName LastName).
- [ ] **List View**: In the Invoices list table (`/billing/invoices`), the Client column should display "[EndCustomer Name] ([Agency Name])" if an end-customer exists, otherwise just "[Agency Name]".
- [ ] **Backward Compatibility**: Existing invoices or invoices without end-customers must render exactly as before.
- [ ] **Data Integrity**: The End Customer name on the invoice should ideally be immutable or at least reference the snapshot from the time of creation (FR34 "Deep Copy" principle applies - though strictly specifically to commercial values, good practice extends to identity snapshots).

## Technical Specifications
- **Data Model**: Ensure `Invoice` model has an `endCustomerId` field (or `endCustomerSnapshot` JSON if we strictly follow deep copy, though linking to `EndCustomer` entity is acceptable per current simplified arch, provided we accept name changes reflect on old invoices, OR we snapshotted it. *Decision given FR34 context*: Use `endCustomerId` FK for now for simplicity, matching Quote pattern, unless `invoice_snapshots` are used).
- **Components**: 
    - Update `InvoicePdfTemplate` to conditionally render the "Prestation pour" section.
    - Update `InvoicesTable` columns definition.
- **Backend**: 
    - Ensure `POST /api/invoices` (conversion from quote) copies the `endCustomerId`.
    - Ensure `GET /api/invoices` includes the `endCustomer` relation.

## Test Cases
1. **Creation from Quote**:
   - Create a Quote for Partner A with EndCustomer B.
   - Convert Quote to Invoice.
   - Verify API response for Invoice allows retrieving EndCustomer B.
2. **PDF Verification**:
   - Generate PDF for the new Invoice.
   - Visually confirm "Prestation pour: B" appears below/near "Facturé à: A".
3. **List View**:
   - Go to `/billing/invoices`.
   - Verify the row shows "B (A)".
4. **No End Customer**:
   - Verify an invoice for Partner A (no sub-contact) shows only "A" and PDF has no "Prestation pour" section.

## Constraints / Dependencies
- Depends on **Story 24.1** (Model) and **Story 24.5** (Quote Integration - as source).
- Must use existing PDF generation library (`react-pdf` or similar used in project).
