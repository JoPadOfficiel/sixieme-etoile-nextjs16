# Story 25.4: B2C Invoicing Address & Agency Transparency

## Context
Improve transparency in invoicing for B2C contacts and Agencies. Currently, standard B2C contacts may lack a specific billing address field distinct from their main address (or it's not exposed). For Agencies, when they book for a client, the invoice often lacks the end customer's name, making reconciliation difficult.

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
    - Verify one of the lines (or the main service line) contains `(End Customer: ...)`
