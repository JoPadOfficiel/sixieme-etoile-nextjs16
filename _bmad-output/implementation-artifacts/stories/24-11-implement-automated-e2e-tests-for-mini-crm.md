# Story 24.11: Implement Automated E2E Tests for Mini-CRM

Status: done

## Story

As a **QA engineer**,  
I want automated tests covering the Mini-CRM feature,  
so that we can prevent regressions in end-customer management and bidirectional pricing.

## Related FRs

- **Testing Requirements**: Story 24.11 from the product roadmap.

## Acceptance Criteria

**AC1 - EndCustomer CRUD:**
- **Given** a partner contact with end-customers,
- **When** I perform CRUD operations via API,
- **Then** they succeed for valid data and respect multi-tenancy.
- **And** deleting an end-customer linked to a quote is blocked with a 400 error.

**AC2 - Search and Filtering:**
- **Given** multiple end-customers,
- **When** I search by name or filter by difficulty score,
- **Then** the API returns the correctly filtered subset.

**AC3 - Dispatch and Quote Integration:**
- **Given** a mission from an accepted quote with an end-customer,
- **When** I fetch mission details or the dispatch list,
- **Then** the end-customer identity and details are correctly included.

**AC4 - Bidirectional Pricing Validation:**
- **Given** a quote for a partner contact,
- **When** pricing is calculated,
- **Then** both `partnerGridPrice` and `clientDirectPrice` are correctly computed and stored.

## Tasks / Subtasks

- [x] Task 1: API Unit Tests for EndCustomer CRUD (AC: #1)
  - [x] 1.1: Create `packages/api/src/routes/vtc/__tests__/end-customers.test.ts`
  - [x] 1.2: Implement tests for create, update, delete operations
  - [x] 1.3: Verify multi-tenancy isolation
- [x] Task 2: Integration Tests for Search and Filtering (AC: #2)
  - [x] 2.1: Create `packages/api/src/routes/vtc/__tests__/quotes-search.test.ts`
  - [x] 2.2: Verify search by end-customer firstName and lastName
- [x] Task 3: Dispatch Integration Tests (AC: #3)
  - [x] 3.1: Create `packages/api/src/routes/vtc/__tests__/dispatch-endcustomer.test.ts`
  - [x] 3.2: Verify end-customer JSON format in missions API
- [x] Task 4: Pricing & Lifecycle Regression Tests (AC: #4)
  - [x] 4.1: Update `packages/api/src/routes/vtc/__tests__/quotes.test.ts`
  - [x] 4.2: Add test for DRAFT -> ACCEPTED transition fix
  - [x] 4.3: Add test for data persistence of status and notes

## Dev Notes

### Testing Infrastructure
- Uses Vitest for fast, isolated API route testing.
- Mocks Prisma and organization middleware to simulate tenant context.
- Uses `hono/testing` for typed client requests.

### Key Validation Logic
- **Deletion Protection**: Logic in `invoices.ts` and `quotes.ts` prevents deleting EndCustomers that are referenced as foreign keys.
- **Search Logic**: Prisma `OR` queries across `contact` and `endCustomer` fields.

## Dev Agent Record

### Agent Model Used
- Antigravity (claude-3-7-sonnet-20250219)

### Completion Notes List
- [2026-01-10] Story implemented and validated. All API tests passed.
- [2026-01-10] Manual E2E validation confirmed the correct UI behavior for story 24.11.

## File List

**Tests Created/Modified:**
- `packages/api/src/routes/vtc/__tests__/end-customers.test.ts`
- `packages/api/src/routes/vtc/__tests__/dispatch-endcustomer.test.ts`
- `packages/api/src/routes/vtc/__tests__/invoices-endcustomer.test.ts`
- `packages/api/src/routes/vtc/__tests__/quotes-search.test.ts`
- `packages/api/src/routes/vtc/__tests__/quotes.test.ts`
- `packages/api/src/routes/vtc/__tests__/pricing-bidirectional.test.ts`
