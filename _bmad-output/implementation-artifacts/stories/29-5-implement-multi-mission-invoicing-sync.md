# Story 29.5: Implement Multi-Mission Invoicing & Sync

Status: review

## Story

As an **operator/commercial**,
I want to generate an invoice from a multi-mission Order that faithfully copies all QuoteLines to InvoiceLines with full traceability,
so that the invoice accurately reflects each service (date, route) and maintains a link to the original quote for audit purposes.

## Acceptance Criteria

### AC1: Deep Copy QuoteLines to InvoiceLines

- When generating an invoice from an Order, each `QuoteLine` MUST be copied to a corresponding `InvoiceLine`
- The copy MUST be a **deep copy** (values copied, not referenced) to ensure fiscal immutability
- N QuoteLines → N InvoiceLines (1:1 mapping)

### AC2: Traceability Link via quoteLineId

- Each `InvoiceLine` MUST store a reference to its source `QuoteLine.id` in a new field `quoteLineId`
- This link is for **traceability only** - the InvoiceLine data is independent (deep copy principle)
- The link enables future sync detection and audit trails

### AC3: Enriched Invoice Line Descriptions

- Each `InvoiceLine.description` MUST include:
  - Service type (Transfer, Dispo, Excursion)
  - Date/time of the service (from `sourceData.pickupAt` or equivalent)
  - Route summary (pickup → dropoff addresses)
- Format: `"[Type] - [Date] - [Pickup] → [Dropoff]"`

### AC4: Invoice PDF/HTML Multi-Line Display

- The invoice document MUST display each line clearly with:
  - Line number
  - Description with date and route
  - Quantity, unit price, VAT, total
- Lines MUST be ordered by `sortOrder` (chronological)

### AC5: Correct Totals Aggregation

- Invoice totals MUST be calculated from the sum of all InvoiceLines:
  - `totalExclVat = SUM(lines.totalExclVat)`
  - `totalVat = SUM(lines.totalVat)`
  - `totalInclVat = totalExclVat + totalVat`

### AC6 (Stretch): Out-of-Sync Detection Flag

- If a Mission linked to a QuoteLine is modified after invoice creation:
  - The corresponding InvoiceLine should display an "Out of Sync" warning badge in the UI
  - Detection based on comparing `Mission.updatedAt > Invoice.createdAt`
- This is a **stretch goal** - implement if time permits

## Tasks / Subtasks

- [ ] **Task 1: Schema Migration** (AC: 2)

  - [ ] Add `quoteLineId String?` field to `InvoiceLine` model
  - [ ] Add relation `quoteLine QuoteLine? @relation(fields: [quoteLineId], references: [id])`
  - [ ] Add `invoiceLines InvoiceLine[]` relation to `QuoteLine` model
  - [ ] Run `pnpm db:migrate` to apply changes
  - [ ] Run `pnpm db:generate` to update Prisma client

- [ ] **Task 2: Update InvoiceFactory.deepCopyQuoteLinesToInvoiceLines** (AC: 1, 2, 3)

  - [ ] Modify method to accept full QuoteLine objects (with id)
  - [ ] Extract date/time from `sourceData.pickupAt` or `displayData`
  - [ ] Extract route from `sourceData.pickupAddress` / `sourceData.dropoffAddress`
  - [ ] Build enriched description: `"[Type] - [Date] - [Route]"`
  - [ ] Return `quoteLineId` in the output structure

- [ ] **Task 3: Update Invoice Creation Transaction** (AC: 1, 2, 5)

  - [ ] Modify `InvoiceFactory.createInvoiceFromOrder` to pass `quoteLineId` to `createMany`
  - [ ] Ensure totals are correctly aggregated from lines
  - [ ] Add logging for multi-line invoice creation

- [ ] **Task 4: Update Invoice PDF Template** (AC: 4)

  - [ ] Ensure PDF generator iterates over all InvoiceLines
  - [ ] Display line number, description, quantity, unit price, VAT rate, total
  - [ ] Order lines by `sortOrder`

- [ ] **Task 5: Unit Tests** (AC: 1, 2, 3, 5)

  - [ ] Test: N QuoteLines → N InvoiceLines
  - [ ] Test: quoteLineId is correctly stored
  - [ ] Test: Description contains date and route
  - [ ] Test: Totals are correctly aggregated

- [ ] **Task 6 (Stretch): Out-of-Sync Detection** (AC: 6)
  - [ ] Add query to detect modified missions post-invoice
  - [ ] Add `isOutOfSync` computed field to invoice line response
  - [ ] Add warning badge in invoice detail UI

## Dev Notes

### Architecture Patterns

- **Deep Copy Principle**: InvoiceLines are fiscally immutable snapshots. The `quoteLineId` is for traceability only, not for data fetching.
- **Existing Infrastructure**: `InvoiceFactory` already has `deepCopyQuoteLinesToInvoiceLines()` - extend it, don't replace.
- **Transaction Safety**: All invoice creation happens in a Prisma `$transaction` block.

### Source Tree Components

```
packages/database/prisma/schema.prisma          # Add quoteLineId to InvoiceLine
packages/api/src/services/invoice-factory.ts    # Extend deepCopy method
packages/api/src/services/invoice-line-builder.ts # Update types if needed
apps/web/modules/saas/invoices/                 # PDF template updates
```

### Testing Standards

- **Unit Tests**: Vitest in `packages/api/src/services/__tests__/`
- **E2E Tests**: Browser MCP validation
- **Test Data**: Use existing multi-line Order from Story 29.1-29.4

### Project Structure Notes

- Follows existing `InvoiceFactory` patterns from Story 28.8
- Uses `@repo/database` for Prisma client
- PDF generation uses existing template system

### References

- [Source: packages/api/src/services/invoice-factory.ts] - Existing InvoiceFactory
- [Source: packages/database/prisma/schema.prisma#InvoiceLine] - Current schema
- [Source: EPIC-29-PROMPTS.md#Story-29.5] - Original requirements
- [Source: Story 28.8] - Invoice Generation - Detached Snapshot

## Test Cases

### TC-29.5.1: Multi-Line Invoice Creation

**Given** an Order with 3 QuoteLines (Transfer, Dispo, Excursion)
**When** I click "Generate Invoice"
**Then** the Invoice has exactly 3 InvoiceLines
**And** each InvoiceLine.quoteLineId matches the source QuoteLine.id

### TC-29.5.2: Enriched Description Format

**Given** a QuoteLine with:

- type: TRANSFER
- sourceData.pickupAt: "2026-01-25T10:00:00"
- sourceData.pickupAddress: "CDG Terminal 2E"
- sourceData.dropoffAddress: "Hotel Ritz Paris"
  **When** the InvoiceLine is created
  **Then** description contains "Transfer - 25/01/2026 10:00 - CDG Terminal 2E → Hotel Ritz Paris"

### TC-29.5.3: Deep Copy Immutability

**Given** an Invoice created from an Order
**When** the original QuoteLine.unitPrice is modified
**Then** the InvoiceLine.unitPriceExclVat remains unchanged

### TC-29.5.4: Totals Aggregation

**Given** 3 InvoiceLines with totalExclVat: 100€, 150€, 200€
**When** the Invoice is created
**Then** Invoice.totalExclVat = 450€
**And** Invoice.totalVat = 45€ (10% VAT)
**And** Invoice.totalInclVat = 495€

### TC-29.5.5: PDF Display

**Given** an Invoice with 3 lines
**When** I view/download the PDF
**Then** all 3 lines are displayed with date and route details

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

- Unit tests: `pnpm --filter @repo/api test -- --run src/services/__tests__/invoice-factory.test.ts` - 13 tests passed
- Browser MCP: Invoice generation tested via UI - INV-2026-0001 created successfully

### Completion Notes List

1. **Schema Migration**: Added `quoteLineId` field to `InvoiceLine` model with relation to `QuoteLine`
2. **InvoiceFactory Enhancement**: Updated `deepCopyQuoteLinesToInvoiceLines` to include `quoteLineId` and enriched descriptions with date/route
3. **New Method**: Added `buildEnrichedDescription()` for formatting invoice line descriptions with type, date, and route
4. **Transaction Updates**: Both `createInvoiceFromOrder` and `createPartialInvoice` now pass `quoteLineId` to `createMany`
5. **Interface Update**: Added `quoteLineId?: string` to `InvoiceLineInput` interface

### File List

- `packages/database/prisma/schema.prisma` - Added quoteLineId field and index to InvoiceLine
- `packages/api/src/services/invoice-factory.ts` - Enhanced deepCopyQuoteLinesToInvoiceLines, added buildEnrichedDescription
- `packages/api/src/services/invoice-line-builder.ts` - Added quoteLineId to InvoiceLineInput interface
- `_bmad-output/implementation-artifacts/stories/29-5-implement-multi-mission-invoicing-sync.md` - Story file
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated status to review
