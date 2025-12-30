# Story 2.4: Link Quotes and Invoices to Contacts & Partner Agencies

**Epic:** 2 - CRM & Partner Contracts  
**Status:** done  
**Priority:** High  
**Story Points:** 5

---

## User Story

**As a** finance user,  
**I want** each quote and invoice to be clearly linked to a contact (and partner agency where relevant),  
**So that** I can navigate from CRM to financial documents and back.

---

## Related Functional Requirements

- **FR6**: The system shall link quotes and invoices to contacts
- **FR31-FR36**: Quote and invoice lifecycle management

---

## Acceptance Criteria

### AC1: Quote-Contact Link

**Given** I create a quote from the Quotes cockpit,  
**When** I select a contact,  
**Then** the quote stores `contactId` (and, if appropriate, an agency or company reference) and the Quotes list shows the contact name and type in its columns.

### AC2: Invoice-Contact Link

**Given** I convert an accepted quote to an invoice,  
**When** the invoice is created,  
**Then** it copies the `contactId` (and partner agency context) from the quote and the Invoices list shows that client.

### AC3: Contact Timeline

**Given** a Contact detail screen,  
**When** I open it,  
**Then** I can see a timeline of related quotes and invoices, with links to open them.

### AC4: Invoices API

**Given** the invoices API,  
**When** I list or get invoices,  
**Then** they include contact information and can be filtered by contactId.

---

## Technical Tasks

### Task 1: Create Invoices API Route

- Create `packages/api/src/routes/vtc/invoices.ts`
- Implement CRUD operations with contact linking
- Include contact data in responses
- Add contactId filter to list endpoint

### Task 2: Add Contact Timeline Endpoint

- Add `GET /contacts/:id/timeline` endpoint
- Return combined quotes and invoices sorted by date
- Include status, amounts, and links

### Task 3: Create ContactTimeline Component

- Create `apps/web/modules/saas/contacts/components/ContactTimeline.tsx`
- Display quotes and invoices in chronological order
- Show status badges, amounts, and action links
- Integrate into ContactDrawer

### Task 4: Update ContactDrawer

- Add Timeline tab/section to ContactDrawer
- Fetch and display timeline data
- Add navigation links to quotes/invoices

### Task 5: Unit Tests

- Test invoices API endpoints
- Test timeline endpoint
- Test contact-quote-invoice referential integrity

---

## Dependencies

### Prerequisites (All DONE)

- Story 2.1: Contact Model & Basic CRM UI ✅
- Story 2.2: Partner Contract Data & Rate Grid Links ✅
- Story 2.3: Safe Reclassification Partner/Private ✅
- Story 6.1-6.4: Quotes functionality ✅

### Downstream Impact

- Story 2.5: Expose Commercial Context in CRM Views
- Story 7.1: Invoice & InvoiceLine Models and Invoices UI

---

## Definition of Done

- [x] Invoices API route created with CRUD operations
- [x] Contact timeline endpoint implemented
- [x] ContactTimeline component created
- [x] ContactDrawer updated with timeline section
- [x] Unit tests pass (15/15)
- [x] API tests pass (curl validated)
- [x] Multi-tenancy enforced on all endpoints
- [x] UI validated via Playwright
- [x] Database changes verified

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/2-4-link-quotes-invoices-to-contacts-partner-agencies.context.xml`

### Implementation Notes

**Completed: 2025-11-27**

#### API Implementation

- Created `packages/api/src/routes/vtc/invoices.ts` with full CRUD operations
- Added `POST /invoices/from-quote/:quoteId` for quote-to-invoice conversion
- Added `GET /contacts/:id/timeline` endpoint returning combined quotes/invoices
- Invoice number auto-generation: `INV-YYYY-NNNN` format
- Commission calculation for partner contacts
- Payment terms based on PartnerContract settings

#### Frontend Implementation

- Created `ContactTimeline.tsx` component with summary cards and timeline items
- Updated `ContactDrawer.tsx` with tabs: Details, Activity, Contract
- Added timeline types to `types.ts`
- Added EN/FR translations for timeline

#### Tests

- 15 unit tests for invoices API (all passing)
- Curl tests validated for timeline and invoices endpoints
- Playwright UI tests validated timeline display

#### Database Verification

- Invoice created successfully with contact link
- InvoiceLine created with SERVICE type
- Quote-Invoice relationship established via quoteId

### Files to Create/Modify

| File                                                            | Action | Description              |
| --------------------------------------------------------------- | ------ | ------------------------ |
| `packages/api/src/routes/vtc/invoices.ts`                       | CREATE | Invoices API route       |
| `packages/api/src/routes/vtc/contacts.ts`                       | MODIFY | Add timeline endpoint    |
| `packages/api/src/routes/vtc/index.ts`                          | MODIFY | Register invoices router |
| `apps/web/modules/saas/contacts/components/ContactTimeline.tsx` | CREATE | Timeline component       |
| `apps/web/modules/saas/contacts/components/ContactDrawer.tsx`   | MODIFY | Add timeline tab         |
| `apps/web/modules/saas/contacts/types.ts`                       | MODIFY | Add timeline types       |
| `packages/api/src/routes/vtc/__tests__/invoices.test.ts`        | CREATE | Invoices API tests       |

---

## Test Cases Summary

| Test ID | AC  | Description                         | Expected Result                  |
| ------- | --- | ----------------------------------- | -------------------------------- |
| T1      | AC1 | Create quote with contactId         | Quote linked to contact          |
| T2      | AC2 | Create invoice from quote           | Invoice has same contactId       |
| T3      | AC3 | Get contact timeline                | Returns quotes and invoices      |
| T4      | AC4 | List invoices with contactId filter | Only contact's invoices returned |
| T5      | AC4 | Get invoice includes contact        | Contact data in response         |
| T6      | AC3 | Timeline sorted by date             | Most recent first                |
| T7      | -   | Multi-tenancy on invoices           | Cross-org access blocked         |
