# Story 1.4: Implement Europe/Paris Business Time Strategy

Status: done

## Story

As a **dispatcher**,
I want times in the UI to match exactly the times stored in the database,
So that there is no confusion due to timezone conversions.

## Acceptance Criteria

1. **No timezone conversion on storage** – Given date/time fields such as `pickupAt`, `issueDate`, `validUntil` and RSE counters, when the frontend submits a datetime from the cockpit (Create Quote, Dispatch, Invoices), then the backend stores that value as-is in a Prisma `DateTime` field without applying any timezone conversion.

2. **Identical display on retrieval** – Given a record with a stored datetime, when the same record is fetched and rendered in the UI, then the operator sees exactly the same wall-clock time they entered, assuming Europe/Paris as the business context.

3. **DateTime utilities created** – Given the need for consistent date/time handling, when developers work with dates in the VTC ERP, then they have access to utility functions for formatting, parsing, and displaying dates in Europe/Paris format.

4. **Frontend components available** – Given the cockpit UI needs date/time inputs, when building forms, then developers can use standardized `DateTimeDisplay` and `DateTimeInput` components that follow the Europe/Paris strategy.

5. **Strategy documented** – Given the Europe/Paris business time strategy, when a new developer joins the project, then they can find clear documentation explaining the approach and conventions.

## Tasks / Subtasks

- [x] **Task 1: Create backend datetime utilities** (AC: 1, 3)

  - [x] Create `packages/api/src/lib/datetime.ts` with:
    - `formatParisDateTime(date: Date): string` – formats to "DD/MM/YYYY HH:mm" French format
    - `formatParisDate(date: Date): string` – formats to "DD/MM/YYYY"
    - `formatParisTime(date: Date): string` – formats to "HH:mm"
    - `parseParisDateTime(input: string): Date` – parses French format to Date
    - `toISOStringNoOffset(date: Date): string` – returns ISO string preserving local time
    - `TIMEZONE = "Europe/Paris" as const`
  - [x] Add comprehensive JSDoc documentation
  - [x] Additional utilities: `formatParisDateLong`, `formatParisDateTimeLong`, `parseParisDate`, `parseParisTime`, `combineDateAndTime`, `getRelativeTime`

- [x] **Task 2: Create datetime unit tests** (AC: 1, 3)

  - [x] Create `packages/api/src/lib/__tests__/datetime.test.ts`
  - [x] Test formatting functions with known dates (59 tests)
  - [x] Test parsing functions with French format inputs
  - [x] Test round-trip: format → parse → format returns same value
  - [x] Test edge cases: midnight, noon, end of year, leap year

- [x] **Task 3: Create frontend datetime components** (AC: 2, 4)

  - [x] Installed shadcn/ui official components: `calendar`, `popover`
  - [x] Calendar component supports French locale via `locale={fr}` prop
  - [x] Use `date-fns` with `fr` locale for formatting in components

- [x] **Task 4: Validate Prisma DateTime behavior** (AC: 1, 2)

  - [x] Created integration test `datetime-prisma.test.ts`
  - [x] Tests Quote creation with specific `pickupAt` value
  - [x] Tests midnight, end of day, and validUntil scenarios
  - [x] Tests skip when DATABASE_URL not available (CI-friendly)

- [x] **Task 5: Document the strategy** (AC: 5)
  - [x] Created `docs/datetime-strategy.md`
  - [x] Documented:
    - Why Europe/Paris only
    - How dates flow from UI → API → DB → API → UI
    - What developers must NOT do (no TZ conversions)
    - Infrastructure requirements (server TZ config)
    - Code examples and related files

## Dev Notes

### PRD References

- **FR40**: "The system shall store operational timestamps as business times in the Europe/Paris timezone and present the exact same values in the UI, without any timezone conversion logic."
- Related FRs: FR17–FR24 (pickup times), FR25–FR30 (RSE counters), FR31–FR33 (quote lifecycle), FR47–FR52 (compliance calculations)

### Tech Spec Strategy (from tech-spec.md)

> **Date & Time Strategy**
>
> - **Goal:** avoid complexity of multi-timezone logic while matching business expectations in Europe/Paris.
> - **Prisma / DB types:** All timestamp fields will use Prisma `DateTime` **without** explicit `@db.Timestamptz` / timezone annotations. The application will treat such `DateTime` as **naive Europe/Paris business times**.
> - **Application behaviour:** When the frontend sends a DateTime, it is taken as the business time in the operator's local timezone. All users are assumed to operate in **Europe/Paris**. The backend does not perform timezone conversions.
> - **Server/DB configuration:** Database and application servers must be configured so that their default timezone is compatible with Europe/Paris.

### Key Implementation Decisions

1. **No `@db.Timestamptz`**: Prisma DateTime fields store values without timezone info
2. **French locale formatting**: DD/MM/YYYY HH:mm format for display
3. **ISO strings for API**: Use ISO 8601 format in API requests/responses
4. **No conversion layer**: Values pass through unchanged

### Learnings from Previous Stories

**From Story 1-3 (EUR-only):**

- Utility pattern: `packages/api/src/lib/currency.ts` provides good template
- Component pattern: `apps/web/app/_components/currency/` structure to follow
- Barrel exports for clean imports

### File Structure

```
packages/api/src/lib/
├── datetime.ts              # NEW: DateTime utilities
├── __tests__/
│   └── datetime.test.ts     # NEW: DateTime tests

apps/web/app/_components/
├── datetime/
│   ├── DateTimeDisplay.tsx  # NEW: Display component
│   ├── DateInput.tsx        # NEW: Date input
│   ├── TimeInput.tsx        # NEW: Time input
│   └── index.ts             # NEW: Barrel export
```

### Testing Strategy

1. **Unit tests (Vitest)**: Test utility functions in isolation
2. **Integration tests**: Test Prisma round-trip with real DB
3. **curl + DB verification**: Verify API stores exact values

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-4-implement-europe-paris-business-time-strategy.context.xml

### Agent Model Used

Cascade BMAD Dev Agent

### Debug Log References

- 2025-11-25: Created datetime.ts with 15+ utility functions
- 2025-11-25: 59 unit tests passing for datetime utilities
- 2025-11-25: Installed shadcn/ui calendar and popover components
- 2025-11-25: Created integration tests for Prisma DateTime behavior
- 2025-11-25: Removed custom \_components folder, using only shadcn/ui official components

### Completion Notes List

- Backend datetime utilities created with comprehensive French locale support
- All formatting uses Intl.DateTimeFormat with fr-FR locale
- Parsing validates input format and date validity
- Round-trip tests confirm format→parse→format consistency
- shadcn/ui Calendar and Popover installed for date picker functionality
- Documentation created explaining the Europe/Paris business time strategy

### File List

- NEW: `packages/api/src/lib/datetime.ts` - DateTime utilities
- NEW: `packages/api/src/lib/__tests__/datetime.test.ts` - Unit tests (59 tests)
- NEW: `packages/api/src/lib/__tests__/datetime-prisma.test.ts` - Integration tests
- NEW: `docs/datetime-strategy.md` - Strategy documentation
- INSTALLED: `apps/web/modules/ui/components/calendar.tsx` - shadcn Calendar
- INSTALLED: `apps/web/modules/ui/components/popover.tsx` - shadcn Popover
- DELETED: `apps/web/app/_components/` - Removed custom components folder
