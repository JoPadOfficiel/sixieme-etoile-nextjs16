# Story 6.4: Implement Quote Lifecycle & Status Transitions

**Epic:** 6 - Quotes & Operator Cockpit  
**Status:** done  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As an** operator,  
**I want** structured quote lifecycle states and transitions,  
**So that** I can manage quotes consistently from draft to acceptance.

---

## Related FRs

- **FR31**: Quotes shall follow a lifecycle with at least the states Draft, Sent, Viewed, Accepted, Rejected and Expired
- **FR32**: Draft quotes shall remain editable; Sent or Accepted quotes shall remain commercially fixed
- **FR33**: The system shall allow operators to convert an accepted quote or completed mission into an invoice

---

## Acceptance Criteria

### AC1: New Quote Status is DRAFT

**Given** a new quote is created  
**When** I first save it  
**Then** its status is `DRAFT` and it remains fully editable (prices, notes, dates can be modified)

### AC2: Send Quote Transitions to SENT

**Given** a DRAFT quote  
**When** I send the quote to a client (via Send Quote action)  
**Then**:

- The status becomes `SENT`
- `sentAt` timestamp is recorded
- Commercial values are frozen (no silent recomputes)

### AC3: Commercial Values Frozen After SENT

**Given** a quote with status SENT or ACCEPTED  
**When** I view or reload the quote  
**Then** the displayed prices, costs, and margins are the stored values, NOT recomputed from current configuration

### AC4: VIEWED Status on Client View

**Given** a SENT quote  
**When** a client views the quote (future: via public link)  
**Then**:

- The status can transition to `VIEWED`
- `viewedAt` timestamp is recorded

### AC5: Accept Quote Transitions to ACCEPTED

**Given** a SENT or VIEWED quote  
**When** I record client acceptance (Mark as Accepted action)  
**Then**:

- The status moves to `ACCEPTED`
- `acceptedAt` timestamp is recorded
- "Convert to Invoice" button becomes available

### AC6: Reject Quote Transitions to REJECTED

**Given** a SENT or VIEWED quote  
**When** I record client rejection (Mark as Rejected action)  
**Then**:

- The status moves to `REJECTED`
- `rejectedAt` timestamp is recorded

### AC7: Invalid Transitions are Blocked

**Given** a quote in any status  
**When** I attempt an invalid transition (e.g., ACCEPTED to DRAFT, REJECTED to SENT)  
**Then** the API returns a 400 error with a clear message explaining the invalid transition

### AC8: Automatic Expiration

**Given** a DRAFT or SENT quote with `validUntil` date in the past  
**When** the expiration job runs (or on next access)  
**Then**:

- The status transitions to `EXPIRED`
- `expiredAt` timestamp is recorded

### AC9: Status Transition Audit Trail

**Given** any status transition occurs  
**When** the transition completes  
**Then** an audit log entry is created with previous status, new status, timestamp, and user ID

---

## Status Transition Matrix

| Current Status | Valid Transitions                   | Actions                                              |
| -------------- | ----------------------------------- | ---------------------------------------------------- |
| DRAFT          | SENT, EXPIRED                       | Send Quote, Auto-expire                              |
| SENT           | VIEWED, ACCEPTED, REJECTED, EXPIRED | Client views, Mark as Accepted/Rejected, Auto-expire |
| VIEWED         | ACCEPTED, REJECTED, EXPIRED         | Mark as Accepted/Rejected, Auto-expire               |
| ACCEPTED       | (none - terminal)                   | Convert to Invoice (Epic 7)                          |
| REJECTED       | (none - terminal)                   | -                                                    |
| EXPIRED        | (none - terminal)                   | -                                                    |

---

## Technical Tasks

### 1. Update Prisma Schema with Timestamp Fields

Add to `Quote` model in `packages/database/prisma/schema.prisma`:

```prisma
// Status transition timestamps
sentAt     DateTime?
viewedAt   DateTime?
acceptedAt DateTime?
rejectedAt DateTime?
expiredAt  DateTime?
```

Run migration: `pnpm db:migrate`

### 2. Create QuoteStateMachine Service

Create `packages/api/src/services/quote-state-machine.ts`:

- Define valid transitions map
- `canTransition(from, to)`: Check if transition is valid
- `getValidTransitions(from)`: Get list of valid next states
- `validateTransition(from, to)`: Return validation result with error message
- `transition(quoteId, newStatus, userId)`: Execute transition with timestamp recording

### 3. Update Quotes API Endpoint

Modify `packages/api/src/routes/vtc/quotes.ts`:

- Import and use QuoteStateMachine in PATCH handler
- Validate status transitions before applying
- Record appropriate timestamp based on new status
- Return 400 error for invalid transitions with clear message

### 4. Create Quote Status Audit Log Model (Optional)

Add `QuoteStatusAuditLog` model for tracking transitions:

```prisma
model QuoteStatusAuditLog {
  id             String      @id @default(cuid())
  organizationId String
  quoteId        String
  previousStatus QuoteStatus
  newStatus      QuoteStatus
  userId         String?
  timestamp      DateTime    @default(now())

  @@index([quoteId])
  @@index([organizationId])
}
```

### 5. Update Frontend Types

Update `apps/web/modules/saas/quotes/types.ts`:

- Add timestamp fields to Quote interface
- Export QuoteStatus type if not already

### 6. Update QuoteActivityLog Component

Modify `apps/web/modules/saas/quotes/components/QuoteActivityLog.tsx`:

- Display status timestamps in timeline
- Show transition history from audit log (if implemented)

### 7. Update QuoteDetailPage for Status-Based Behavior

Modify `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx`:

- Disable editing for non-DRAFT quotes
- Show appropriate action buttons based on status
- Display "frozen" indicator for SENT/ACCEPTED quotes

### 8. Implement Expiration Logic

Option A: Background job (recommended for production)

- Create cron job to check and expire quotes with past `validUntil`

Option B: On-access check (simpler for MVP)

- Check `validUntil` when fetching quote
- Auto-transition to EXPIRED if past due

### 9. Add Translations

Extend translation files:

- `apps/web/content/locales/en/quotes.json`
- `apps/web/content/locales/fr/quotes.json`

Keys needed:

- `quotes.status.transition.invalidTransition`
- `quotes.status.transition.cannotTransitionFrom`
- `quotes.status.transition.success.*`
- `quotes.detail.frozen.title`
- `quotes.detail.frozen.description`

### 10. Write Tests

- **Vitest**: Unit tests for QuoteStateMachine
- **Vitest**: Integration tests for quotes API transitions
- **Playwright MCP**: E2E tests for full lifecycle flow
- **Curl + DB**: API endpoint tests with database verification

---

## Dependencies

- **Story 6.1** (done): QuotesTable, QuoteStatusBadge
- **Story 6.2** (done): CreateQuoteCockpit
- **Story 6.3** (done): QuoteDetailPage, QuoteHeader, QuoteActivityLog
- **Epic 7** (future): Invoice creation from ACCEPTED quotes

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-4-implement-quote-lifecycle-status-transitions.context.xml`

### Implementation Notes

- State machine pattern ensures consistent transitions across UI and API
- Timestamps provide audit trail without separate audit log table (minimal approach)
- Commercial value freezing is implicit: SENT/ACCEPTED quotes use stored values
- Expiration can be lazy (on-access) for MVP, background job for production
- All dates in Europe/Paris timezone (no conversion per Story 1.4)
- All prices in EUR (no currency conversion per Story 1.3)

### API Endpoints Used

- `PATCH /api/vtc/quotes/:id` - Update quote status (with state machine validation)
- `GET /api/vtc/quotes/:id` - Get quote detail (with expiration check)

### Component Structure

```
packages/api/src/services/
├── quote-state-machine.ts     # NEW: State machine logic
└── __tests__/
    └── quote-state-machine.test.ts  # NEW: Unit tests

packages/api/src/routes/vtc/
├── quotes.ts                  # MODIFY: Use state machine in PATCH
└── __tests__/
    └── quotes.test.ts         # EXTEND: Transition tests

apps/web/modules/saas/quotes/
├── components/
│   ├── QuoteDetailPage.tsx    # MODIFY: Status-based behavior
│   ├── QuoteActivityLog.tsx   # MODIFY: Show timestamps
│   └── QuoteHeader.tsx        # MODIFY: Disable invalid actions
└── types.ts                   # MODIFY: Add timestamp fields
```

### State Machine Implementation

```typescript
// Valid transitions map
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT", "EXPIRED"],
  SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
  VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [], // Terminal
  REJECTED: [], // Terminal
  EXPIRED: [], // Terminal
};

// Timestamp field mapping
const STATUS_TIMESTAMP_FIELD: Record<QuoteStatus, string | null> = {
  DRAFT: null,
  SENT: "sentAt",
  VIEWED: "viewedAt",
  ACCEPTED: "acceptedAt",
  REJECTED: "rejectedAt",
  EXPIRED: "expiredAt",
};
```

---

## Definition of Done

- [x] Prisma schema updated with timestamp fields
- [x] Migration applied successfully
- [x] QuoteStateMachine service created with full transition logic
- [x] PATCH endpoint uses state machine for validation
- [x] Invalid transitions return 400 with clear error message
- [x] Timestamps recorded for each status change
- [x] QuoteDetailPage shows status-based UI (editable vs readonly)
- [x] QuoteActivityLog displays status timestamps
- [x] Expiration logic implemented (on-access or background job)
- [x] Translations added (EN, FR)
- [x] Vitest unit tests for state machine passing
- [x] Vitest integration tests for API transitions passing
- [x] Playwright E2E tests for full lifecycle passing
- [x] Curl tests verified with DB state via MCP postgres
- [x] Code reviewed and merged
