# Story 24.5: Display EndCustomer Name on Quote Summary and PDF

**Status:** done
**Created:** 2026-01-10
**Epic:** 24 - Agency Mini-CRM & Bidirectional Pricing

---

## Story

**As a** client/operator,  
**I want** the end-customer name to appear prominently on quotes and PDFs,  
**So that** individual clients are correctly identified on documents.

## Related Functional Requirements

- **FR124**: Quote end-customer display on summaries
- **FR125**: End-customer name on quote/invoice PDF documents

## Prerequisites

- ✅ Story 24.1: EndCustomer data model
- ✅ Story 24.2: EndCustomer CRUD API
- ✅ Story 24.3: EndCustomer section in contact detail page
- ✅ Story 24.4: EndCustomer selector in quote creation form

---

## Acceptance Criteria

### AC1: Quote Summary Display with EndCustomer
**Given** a quote with an end-customer selected,  
**When** I view the quote summary (QuoteCommercialSummary),  
**Then** the client section displays:
- "Client: [FirstName] [LastName]"
- "Agence: [Agency Name]" (smaller text below)

### AC2: Quote PDF Generation with EndCustomer
**Given** a quote with an end-customer selected,  
**When** I generate a PDF quote,  
**Then** the document header shows:
- The end-customer's name as the recipient
- The agency name and billing address in billing section

### AC3: Backward Compatibility (No EndCustomer)
**Given** a quote without an end-customer,  
**When** I view the quote or generate a PDF,  
**Then** the display uses the agency/contact name as before (existing behavior maintained)

### AC4: Quote Detail Page EndCustomer Display
**Given** a quote with an end-customer,  
**When** I view the quote detail page,  
**Then** the commercial summary shows the end-customer name with agency attribution

### AC5: API Response Enhancement
**Given** a quote API response,  
**When** the quote has an end-customer linked,  
**Then** the response includes the full `endCustomer` object with firstName, lastName, email, phone, and difficultyScore

---

## Tasks / Subtasks

- [x] **Task 1: Update Quote API to include EndCustomer (AC: #5)**
  - [x] 1.1 Modify `packages/api/src/routes/vtc/quotes.ts` - GET by ID endpoint
  - [x] 1.2 Add `endCustomer: { select: { id, firstName, lastName, email, phone, difficultyScore } }` to include
  - [x] 1.3 Update quotes list endpoint to include endCustomer relation
  - [x] 1.4 Write unit tests for endpoint with endCustomer data

- [x] **Task 2: Update Quote type definitions (AC: #1, #4)**
  - [x] 2.1 Add `endCustomer` field to Quote interface in `apps/web/modules/saas/quotes/types.ts`
  - [x] 2.2 Add `getEndCustomerDisplayName(quote)` helper function
  - [x] 2.3 Add `getQuoteClientDisplay(quote)` helper for dual-line display

- [x] **Task 3: Update QuoteCommercialSummary component (AC: #1, #3, #4)**
  - [x] 3.1 Add client section to QuoteCommercialSummary.tsx after pricing card
  - [x] 3.2 Conditionally display end-customer name when present
  - [x] 3.3 Display agency name on second line for partner contacts with end-customer
  - [x] 3.4 Handle backward compatibility - show contact name when no end-customer

- [x] **Task 4: Update PDF Generator for Quote (AC: #2, #3)**
  - [x] 4.1 Extend `QuotePdfData` interface with endCustomer fields
  - [x] 4.2 Modify `generateQuotePdf` function in `packages/api/src/services/pdf-generator.ts`
  - [x] 4.3 Add end-customer section in PDF client area
  - [x] 4.4 Show "Prestation pour: [EndCustomer Name]" when end-customer exists
  - [x] 4.5 Show "Facturé à: [Agency Name]" with billing address below
  - [x] 4.6 Maintain existing display when no end-customer

- [x] **Task 5: Update Documents API endpoint (AC: #2)**
  - [x] 5.1 Modify `packages/api/src/routes/vtc/documents.ts` quote PDF generation
  - [x] 5.2 Include endCustomer data in pdfData object passed to generator
  - [x] 5.3 Format end-customer name for PDF display

- [x] **Task 6: Add translations (AC: #1, #2)**
  - [x] 6.1 Add French translations for end-customer display labels
  - [x] 6.2 Add English translations for end-customer display labels
  - [x] 6.3 Keys: `quotes.detail.client`, `quotes.detail.agency`, `quotes.pdf.serviceFor`, `quotes.pdf.billedTo`

- [x] **Task 7: Unit and Integration Tests (AC: All)**
  - [x] 7.1 Test QuoteCommercialSummary with end-customer
  - [x] 7.2 Test QuoteCommercialSummary without end-customer (backward compatibility)
  - [x] 7.3 Test PDF generator with end-customer data
  - [x] 7.4 Test PDF generator without end-customer (backward compatibility)

- [x] **Task 8: Dispatch Interface Enhancements (Verification Fixes)**
  - [x] 8.1 Integrate EndCustomer name and phone in MissionRow.tsx
  - [x] 8.2 Fix "Assignment failed" 400 error in API and AssignmentDrawer.tsx
  - [x] 8.3 Restructure badges layout in MissionCard for improved aesthetics

---

## Dev Notes

### Architecture Compliance

1. **PDF Generator Pattern**: The `packages/api/src/services/pdf-generator.ts` uses `pdf-lib` for server-side generation. Text must be sanitized with `sanitizeText()` function to handle French accents.

2. **Quote Type Extension**: The `Quote` interface in `apps/web/modules/saas/quotes/types.ts` needs to include the optional `endCustomer` field.

3. **API Response Structure**: The quotes API already returns nested relations (contact, vehicleCategory). Add endCustomer as another nested include.

### File Structure Notes

Key files to modify:
```
packages/api/src/routes/vtc/quotes.ts          # Add endCustomer include
packages/api/src/routes/vtc/documents.ts       # Pass endCustomer to PDF generator
packages/api/src/services/pdf-generator.ts     # Add end-customer section to PDF
apps/web/modules/saas/quotes/types.ts          # Add endCustomer to Quote type
apps/web/modules/saas/quotes/components/QuoteCommercialSummary.tsx  # Add client display
packages/i18n/translations/fr.json             # Add translations
packages/i18n/translations/en.json             # Add translations
```

### Database Schema Reference

From `schema.prisma`:
```prisma
model Quote {
  endCustomerId String?
  endCustomer   EndCustomer? @relation(fields: [endCustomerId], references: [id])
  // ... other fields
}

model EndCustomer {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  email           String?
  phone           String?
  difficultyScore Int?
  contactId       String
  contact         Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  quotes          Quote[]
  // ...
}
```

### PDF Expected Layout

**With EndCustomer:**
```
Client
------
Jean DUPONT                    <- EndCustomer name (bold, larger)
Agence: Voyages Express        <- Agency/Contact name (smaller, gray)
voyages@express.com            <- Agency email
```

**Without EndCustomer (backward compatible):**
```
Client
------
Voyages Express                <- Contact displayName
10 Rue de Paris                <- Billing address
voyages@express.com            <- Email
```

### Existing Code Patterns

From Story 24.4 implementation:
- `EndCustomer` type already exists in `types.ts` (lines 162-169)
- `endCustomerId` and `endCustomer` fields exist in `CreateQuoteFormData` (lines 420-421)
- Contact display already shows `contact.displayName` in `QuoteCommercialSummary` (line 216)

### Testing Strategy

1. **Vitest Unit Tests**:
   - PDF generator functions with mock data
   - Helper function for display name formatting

2. **Browser MCP Tests**:
   - Navigate to quote detail with end-customer
   - Verify client section displays correctly
   - Generate PDF and verify download

3. **Curl API Tests**:
   - GET /api/quotes/:id with end-customer
   - POST /api/documents/quote-pdf with end-customer data

4. **Database Verification**:
   - Confirm endCustomerId is correctly stored on Quote
   - Verify endCustomer relation is properly fetched

### References

- [Source: docs/bmad/epics.md#Story 24.5]
- [Source: _bmad-output/implementation-artifacts/24-4-add-endcustomer-selector-to-quote-creation-form.md]
- [Source: packages/api/src/services/pdf-generator.ts#generateQuotePdf]
- [Source: apps/web/modules/saas/quotes/components/QuoteCommercialSummary.tsx]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List
- Successfully integrated EndCustomer data in Quote Summary and PDF document.
- Fixed 400 Bad Request error on mission assignment by allowing optional driver IDs and normalizing payloads.
- Added EndCustomer name and phone number to Dispatch mission cards.
- Restructured Dispatch badges (Profitability, Compliance, Assignment) into a single scrollable row for better aesthetics.
- Verified backward compatibility for quotes without an end-customer.

### File List
- `packages/api/src/routes/vtc/quotes.ts`
- `packages/api/src/routes/vtc/documents.ts`
- `packages/api/src/routes/vtc/missions.ts`
- `packages/api/src/services/pdf-generator.ts`
- `apps/web/modules/saas/quotes/types.ts`
- `apps/web/modules/saas/quotes/components/QuoteCommercialSummary.tsx`
- `apps/web/modules/saas/dispatch/components/MissionRow.tsx`
- `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`
- `apps/web/modules/saas/dispatch/types/mission.ts`
- `packages/i18n/translations/fr.json`
- `packages/i18n/translations/en.json`
