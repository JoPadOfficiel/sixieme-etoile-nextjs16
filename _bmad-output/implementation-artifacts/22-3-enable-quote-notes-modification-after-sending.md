# Story 22-3: Enable Quote Notes Modification After Sending

## Story Information

| Field                | Value                                                         |
| -------------------- | ------------------------------------------------------------- |
| **Story ID**         | 22-3                                                          |
| **Epic**             | Epic 22: VTC ERP Complete System Enhancement & Critical Fixes |
| **Title**            | Enable Quote Notes Modification After Sending                 |
| **Status**           | Ready for Development                                         |
| **Priority**         | High                                                          |
| **Estimated Points** | 3                                                             |
| **Created**          | 2026-01-03                                                    |

---

## Description

**As an** operator,  
**I want** to modify notes on sent quotes for driver communication,  
**So that** I can update operational instructions without changing commercial terms.

### Business Context

Currently, once a quote leaves DRAFT status, all fields including notes become frozen. This creates operational friction because:

- Operators need to add driver instructions after sending quotes to clients
- Pickup details or special requirements may need updates
- Client-provided information (flight numbers, hotel details) arrives after quote is sent

The notes field should remain editable for operational purposes while keeping commercial fields (price, vehicle, dates) frozen to maintain contractual integrity.

---

## Acceptance Criteria

### AC1: Notes Editable on Non-DRAFT Quotes

**Given** a quote with status SENT, ACCEPTED, or REJECTED  
**When** I view the quote detail page  
**Then** I can see an "Edit" button next to the notes section  
**And** clicking it allows me to modify the notes content

### AC2: Commercial Fields Remain Frozen

**Given** a quote with status SENT, ACCEPTED, or REJECTED  
**When** I edit the notes  
**Then** all commercial fields (price, vehicle category, dates, addresses) remain read-only  
**And** no commercial data is modified when saving notes

### AC3: Notes History Tracking

**Given** a quote with notes that have been modified  
**When** I view the quote activity section  
**Then** I see a "Notes updated" event with timestamp  
**And** the previous notes value is preserved in the audit log

### AC4: API Validation

**Given** an API request to update a non-DRAFT quote  
**When** the request contains only the `notes` field  
**Then** the update succeeds  
**But** if the request contains any commercial field, it fails with 400 error

### AC5: Dispatch Integration

**Given** a quote with updated notes  
**When** I view the quote in the dispatch screen  
**Then** the latest notes are displayed  
**And** driver instructions are visible in the mission details

---

## Test Cases

### TC1: Edit Notes on SENT Quote

1. Create a quote and send it (status = SENT)
2. Navigate to quote detail page
3. Click "Edit" button on notes section
4. Enter new notes text
5. Click "Save"
6. **Expected**: Notes are saved, success toast appears, notes display updated value

### TC2: Edit Notes on ACCEPTED Quote

1. Create a quote, send it, then accept it (status = ACCEPTED)
2. Navigate to quote detail page
3. Edit notes
4. **Expected**: Notes are saved successfully

### TC3: Edit Notes on REJECTED Quote

1. Create a quote, send it, then reject it (status = REJECTED)
2. Navigate to quote detail page
3. Edit notes
4. **Expected**: Notes are saved successfully

### TC4: Commercial Fields Remain Locked

1. Open a SENT quote detail page
2. Verify price field is read-only
3. Verify vehicle category is read-only
4. Verify pickup/dropoff addresses are read-only
5. Verify pickup date is read-only
6. **Expected**: All commercial fields are non-editable

### TC5: API Rejects Commercial Changes on Non-DRAFT

1. Send PATCH request to `/api/vtc/quotes/:id` with `{ finalPrice: 999 }` on a SENT quote
2. **Expected**: 400 error "Cannot modify commercial values for non-DRAFT quotes"

### TC6: API Accepts Notes-Only Update on Non-DRAFT

1. Send PATCH request to `/api/vtc/quotes/:id` with `{ notes: "New driver instructions" }` on a SENT quote
2. **Expected**: 200 OK, notes updated

### TC7: Notes History in Activity Log

1. Update notes on a SENT quote
2. Check activity log
3. **Expected**: "Notes updated" event appears with timestamp

### TC8: Notes Visible in Dispatch

1. Update notes on an ACCEPTED quote with assignment
2. Open dispatch screen
3. View mission details
4. **Expected**: Updated notes are visible

---

## Technical Implementation

### Files to Modify

#### 1. Backend API: `packages/api/src/routes/vtc/quotes.ts`

- Remove the block on notes modification for non-DRAFT quotes (lines 534-542)
- Add notes change audit logging
- Keep commercial field protection intact

#### 2. State Machine: `packages/api/src/services/quote-state-machine.ts`

- Add new method `isNotesEditable(status: QuoteStatus): boolean`
- Returns true for all statuses except EXPIRED

#### 3. Frontend Types: `apps/web/modules/saas/quotes/types.ts`

- Add `isNotesEditable(status: QuoteStatus): boolean` function
- Mirror backend logic

#### 4. UI Component: `apps/web/modules/saas/quotes/components/QuoteActivityLog.tsx`

- Change `isDraft` condition to allow notes editing for non-DRAFT statuses
- Add visual indicator that only notes are editable

#### 5. Prisma Schema: `packages/database/prisma/schema.prisma`

- Add `QuoteNotesAuditLog` model for tracking notes changes

#### 6. Translations: `apps/web/messages/fr.json` and `apps/web/messages/en.json`

- Add translation keys for notes update events

### Database Changes

```prisma
/// QuoteNotesAuditLog - Tracks quote notes changes for audit purposes
model QuoteNotesAuditLog {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  quoteId        String
  quote          Quote        @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  // Notes change details
  previousNotes String? @db.Text
  newNotes      String? @db.Text

  // Actor
  userId String?

  // Timestamp
  timestamp DateTime @default(now())

  @@index([organizationId])
  @@index([quoteId])
  @@index([timestamp])
  @@map("quote_notes_audit_log")
}
```

### API Changes

**PATCH /api/vtc/quotes/:id**

- Allow `notes` field update for statuses: SENT, VIEWED, ACCEPTED, REJECTED
- Block `notes` update only for EXPIRED status
- Create audit log entry when notes change

---

## Dependencies

- **Story 6.4**: Quote lifecycle status transitions (completed)
- **Story 6.3**: Quote detail page with activity log (completed)

---

## Constraints

1. **Immutability of Commercial Data**: Price, vehicle, dates, addresses must remain frozen after DRAFT
2. **Audit Trail**: All notes changes must be logged with timestamp and previous value
3. **No Breaking Changes**: Existing quotes and workflows must continue to work
4. **Performance**: Notes update should be fast (< 500ms)

---

## Out of Scope

- Rich text formatting for notes
- Notes versioning UI (showing all historical versions)
- Notes templates or snippets
- Notes sharing between quotes

---

## Definition of Done

- [ ] Notes editable on SENT, VIEWED, ACCEPTED, REJECTED quotes
- [ ] Notes NOT editable on EXPIRED quotes
- [ ] Commercial fields remain frozen for all non-DRAFT quotes
- [ ] Notes changes logged in QuoteNotesAuditLog
- [ ] Activity log shows "Notes updated" events
- [ ] API tests pass for all scenarios
- [ ] UI tests pass via Playwright MCP
- [ ] Translations added for FR and EN
- [ ] Sprint status updated to `done`
