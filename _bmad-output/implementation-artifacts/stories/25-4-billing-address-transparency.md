# Story 25.4: B2C Invoicing Address & Agency Transparency

## Context
Improve transparency in invoicing for B2C contacts and Agencies. Currently, standard B2C contacts may lack a specific billing address field distinct from their main address (or it's not exposed). For Agencies, when they book for a client, the invoice often lacks the end customer's name, making reconciliation difficult.

Status: Done

## Requirements

### 1. B2C Billing Address
- **Goal**: Allow defining a specific `billingAddress` for B2C (Individual) contacts.
- **AC**: Ensure the `billingAddress` field is editable in the Contact form for `INDIVIDUAL` type contacts.
- **Technical**:
    - Field existence: `Contact.billingAddress` (already in schema).
    - UI: Add input field in `ContactForm` (or equivalent) if missing for B2C.

### 2. Agency Invoice Transparency
- **Goal**: Automatically indicate the end customer on Agency invoices.
- **AC**: When generating an invoice for an Agency (Type = AGENCY), if the quote/invoice refers to a mission with a passenger/end-customer, append `(End Customer: {Name})` to the description of the corresponding `InvoiceLine`.
- **Technical**:
    - Logic location: Invoice generation / synchronization service.
    - Trigger: When converting Quote to Invoice or syncing InvoiceLines.
    - Format: `Service Description... (End Customer: John Doe)`

## Test Plan
1. **B2C Billing Address**:
    - Go to Contacts.
    - Create/Edit an "Individual" contact.
    - Fill "Billing Address".
    - Save and Verify persistence.

2. **Agency Invoice**:
    - Create a Quote for an Agency Contact.
    - Add a passenger/end-customer name to the quote/mission.
    - Convert Quote to Invoice (or generate invoice).
    - Check the Invoice Lines.

## File List
- `apps/web/modules/saas/contacts/components/ContactForm.tsx`: Added `billingAddress` field for Individual contacts.
- `packages/api/src/services/invoice-line-builder.ts`: Updated logic to accept and append `endCustomerName` to descriptions.
- `packages/api/src/routes/vtc/invoices.ts`: Updated quote-to-invoice conversion to fetch end customer and pass it to line builder.
- `packages/api/src/routes/vtc/__tests__/invoices.test.ts`: Added unit test for Agency invoice transparency.

## Dev Agent Record
- **2026-01-15**: Implemented B2C billing address field in ContactForm.
- **2026-01-15**: Implemented Agency invoice transparency logic in backend service and route.
- **2026-01-15**: Added automated test case for Agency invoice transparency.

## Senior Developer Review (AI)
- **Date**: 2026-01-15
- **Outcome**: Approve
- **Notes**:
    - Critical Issue Fixed: Added missing unit test coverage for agency invoice transparency logic.
    - Medium Issue Fixed: Updated story documentation with missing file tracking.
    - Code quality looks good. Implementation follows patterns used in `invoices.ts` and `invoice-line-builder.ts`.
