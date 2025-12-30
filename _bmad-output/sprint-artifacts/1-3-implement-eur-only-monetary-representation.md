# Story 1.3: Implement EUR-Only Monetary Representation

Status: done

## Story

As a finance user,
I want all monetary amounts to be stored and displayed in EUR consistently,
so that pricing and invoicing behave predictably without FX complexity.

## Acceptance Criteria

1. **EUR-only monetary fields** – Given the VTC data model for quotes, invoices, invoice lines and pricing-related entities, when I inspect monetary fields (prices, internal costs, VAT amounts, commissions, optional fees, promotions), then each entity stores a `currency` field (where present) set to `"EUR"` and there is no code path that attempts to convert between currencies.

2. **Consistent EUR display in UI** – Given the Quotes, Invoices, or Settings → Pricing pages, when monetary values are rendered, then all amounts are displayed with a consistent EUR format (€ symbol, 2 decimal places) and no option is exposed to change currency.

3. **API contracts document EUR** – Given the VTC ERP API endpoints that return monetary values, when examining response types and OpenAPI documentation, then all amounts are explicitly documented as being in EUR with no currency parameter accepted in requests.

4. **Prisma schema validation** – Given the VTC ERP Prisma models, when inspecting monetary fields, then all use `Decimal` type with consistent precision, and models that have a `currency` field have it defaulting to `"EUR"`.

## Tasks / Subtasks

- [x] **Task 1: Audit and validate Prisma monetary fields** (AC: 1, 4)

  - [x] Review all VTC ERP models in `schema.prisma` for monetary field consistency
  - [x] Verify `Quote` model fields: `suggestedPrice`, `finalPrice`, `internalCost` are `Decimal`
  - [x] Verify `Invoice` model fields: `totalExclVat`, `totalVat`, `totalInclVat` are `Decimal` with `currency` defaulting to `"EUR"`
  - [x] Verify `InvoiceLine` fields: `unitPriceExclVat`, `totalExclVat`, `totalVat` are `Decimal`
  - [x] Verify pricing config fields: `OrganizationPricingSettings`, `ZoneRoute.fixedPrice`, `ExcursionPackage.price`, `DispoPackage.overageRate*`, `OptionalFee.amount`, `Promotion.value` are `Decimal`
  - [x] Add `@default("EUR")` to `currency` fields if not present (already present in Invoice model)

- [x] **Task 2: Create EUR formatting utilities** (AC: 2)

  - [x] Create `packages/api/src/lib/currency.ts` with:
    - `formatEUR(amount: Decimal | number): string` – returns formatted string like "150,00 €"
    - `parseEUR(input: string): Decimal` – parses user input to Decimal
    - `CURRENCY_CODE = "EUR" as const`
  - [x] Export types for use in frontend and API

- [x] **Task 3: Update API response types with EUR documentation** (AC: 3)

  - [x] Review VTC API routes (quotes, invoices, contacts) for monetary response fields
  - [x] Add Zod schema descriptions indicating "Amount in EUR" for all monetary fields
  - [x] Ensure OpenAPI spec (via describeRoute) documents currency as EUR
  - [x] Reject any request that attempts to specify a non-EUR currency (not applicable - no currency field in request)

- [x] **Task 4: Create frontend EUR formatting components** (AC: 2)

  - [x] Create `apps/web/app/_components/currency/EURDisplay.tsx`:
    - Display monetary values with € symbol
    - Use French locale formatting (1 234,56 €)
    - Handle null/undefined gracefully
  - [x] Create `apps/web/app/_components/currency/EURInput.tsx`:
    - Input component for monetary values
    - Validate numeric input
    - Format on blur, parse on focus
  - [x] Export from common components index

- [x] **Task 5: Validate no FX code paths exist** (AC: 1)

  - [x] Search codebase for any currency conversion logic
  - [x] Verify FuelPriceCache uses EUR as documented
  - [x] Document in Dev Notes that EUR-only is enforced by design

## Dev Notes

- **PRD Reference**: FR39 states "The system shall treat EUR as the base currency for pricing and ensure a consistent approach to currency representation in all financial records."

- **No multi-currency**: The VTC ERP is explicitly France-only and EUR-only. Any future multi-currency support would require a new epic, not modifications here.

- **Decimal precision**: Use `@db.Decimal(12, 2)` for amounts up to €9,999,999,999.99 which covers all realistic VTC pricing scenarios.

- **French locale**: Display should use French number formatting (comma as decimal separator, space as thousands separator) since all operators are in France.

### Learnings from Previous Story

**From Story 1-2-enforce-organization-level-multi-tenancy (Status: Done)**

- **API structure**: VTC routes established at `packages/api/src/routes/vtc/` with full CRUD patterns
- **Zod validation**: Request/response validation via Zod schemas already in place
- **OpenAPI docs**: Using `describeRoute` for API documentation
- **Type patterns**: Hono context variables typed for organizationId - can extend for currency context if needed
- **File created**: `packages/api/src/lib/tenant-prisma.ts` shows utility pattern to follow

[Source: docs/sprint-artifacts/1-2-enforce-organization-level-multi-tenancy.md#Dev-Agent-Record]

### Project Structure Notes

- Currency utilities: `packages/api/src/lib/currency.ts`
- Frontend components: `apps/web/app/_components/currency/`
- Schema: `packages/database/prisma/schema.prisma`

### References

- [Source: docs/bmad/epics.md#story-1.3]
- [Source: docs/bmad/tech-spec.md#FR39]
- [Source: docs/bmad/prd.md#FR35-FR36-FR39]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-3-implement-eur-only-monetary-representation.context.xml

### Agent Model Used

Cascade BMAD Dev Agent

### Debug Log References

- 2025-11-25: Prisma schema audit complete - all monetary fields use Decimal, Invoice.currency defaults to EUR
- 2025-11-25: No FX/currency conversion code found in codebase
- 2025-11-25: Pre-existing TypeScript errors in tenancy.test.ts and decimal.js dependency unrelated to this story

### Completion Notes List

- Created comprehensive EUR formatting utilities with `formatEUR`, `parseEUR`, `roundEUR`, `toEURAmount` functions
- All utilities use French locale (fr-FR) for consistent display: comma as decimal separator, space as thousands separator
- Created `EURDisplay` component with variants: `EURDisplayInline`, `EURDisplayLarge`, with color-coding support
- Created `EURInput` component with numeric validation, French locale parsing, and min/max constraints
- Updated Quotes API Zod schemas with `.describe()` annotations for EUR documentation
- Verified no currency conversion logic exists in codebase
- Prisma schema already correctly configured with Decimal types and Invoice.currency @default("EUR")

### File List

- NEW: `packages/api/src/lib/currency.ts` - EUR formatting and parsing utilities
- NEW: `apps/web/app/_components/currency/EURDisplay.tsx` - EUR display component
- NEW: `apps/web/app/_components/currency/EURInput.tsx` - EUR input component
- NEW: `apps/web/app/_components/currency/index.ts` - Currency components barrel export
- MODIFIED: `packages/api/src/routes/vtc/quotes.ts` - Added EUR documentation to Zod schemas
