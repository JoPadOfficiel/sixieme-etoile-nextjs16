# Story 2.1: Implement Contact Model & Basic CRM UI

Status: in-progress

## Story

As an **operator**,
I want to manage contacts with partner vs private classification,
So that I can quickly see how pricing and lifecycle should behave for each client.

## Acceptance Criteria

1. **Contacts list page** – Given the `Contact` model from the Tech Spec, when I open `/dashboard/contacts`, then I see a list of contacts with columns: Name, Type (Partner/Private), Company, Email, Phone, Quotes Count, Invoices Count, Status.

2. **Contact form** – Given I click `Add Contact` or edit an existing contact, when the contact drawer or page opens, then I can capture person fields (first/last name, email, phone) and company fields (company name, VAT, billing address) as applicable, and choose a type/flag corresponding to partner vs private.

3. **Contact persistence** – Given I save a new or edited contact, when the form is submitted, then the record is persisted with `organizationId` and correctly sets its partner/private classification.

4. **Multi-tenancy** – Given I am authenticated as a user in Organization A, when I view the contacts list, then I only see contacts belonging to Organization A.

5. **Search functionality** – Given the contacts list, when I use the search field, then the list filters by name, email, or company name.

6. **Counts display** – Given a contact with quotes and invoices, when I view the contacts list, then I see the correct counts for quotes and invoices.

## Tasks / Subtasks

- [ ] **Task 1: Enhance Contact API routes** (AC: 1, 3, 4, 5, 6)

  - [ ] Add pagination support (page, limit, total)
  - [ ] Add search functionality (name, email, company)
  - [ ] Include `_count` for quotes and invoices in list response
  - [ ] Add GET single contact endpoint with full details
  - [ ] Ensure all operations are scoped by organizationId

- [ ] **Task 2: Create API tests** (AC: 3, 4, 5, 6)

  - [ ] Create `packages/api/src/routes/vtc/__tests__/contacts.test.ts`
  - [ ] Test CRUD operations
  - [ ] Test multi-tenancy (cannot access other org's contacts)
  - [ ] Test search functionality
  - [ ] Test pagination
  - [ ] Test counts for quotes/invoices

- [ ] **Task 3: Create Contacts list page** (AC: 1, 5, 6)

  - [ ] Create `/dashboard/contacts/page.tsx`
  - [ ] Create `ContactsTable` component with columns
  - [ ] Implement search input
  - [ ] Implement pagination controls
  - [ ] Add "Add Contact" button

- [ ] **Task 4: Create Contact form/drawer** (AC: 2, 3)

  - [ ] Create `ContactForm` component
  - [ ] Create `ContactDrawer` component for quick edit
  - [ ] Implement person fields section
  - [ ] Implement company fields section
  - [ ] Implement partner/private toggle
  - [ ] Handle form submission with React Query mutation

- [ ] **Task 5: Add translations** (AC: 1, 2)

  - [ ] Add English translations for contacts UI
  - [ ] Add French translations for contacts UI

- [ ] **Task 6: Add navigation link** (AC: 1)

  - [ ] Add "Contacts" link to organization navigation menu

- [ ] **Task 7: Playwright UI tests** (AC: 1, 2, 3, 5)

  - [ ] Test contacts list page renders
  - [ ] Test contact creation flow
  - [ ] Test contact edit flow
  - [ ] Test search functionality

## Dev Notes

### PRD References

- **FR1**: Support at least two client types – partner agencies/organisations and private/one-off customers
- **FR2**: For each partner client, store contract data including billing details, payment terms
- **FR3**: For private clients, store a simplified profile focused on contact details
- **FR4**: Pricing engine shall read the client type to determine pricing method
- **FR6**: Each quote and invoice shall be linked to a client record

### Tech Spec Model (from schema.prisma)

```prisma
model Contact {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)

  type        ContactType @default(INDIVIDUAL)
  displayName String

  // Person fields
  firstName String?
  lastName  String?
  email     String?
  phone     String?

  // Company fields
  companyName    String?
  vatNumber      String?
  siret          String?
  billingAddress String?

  // Commercial flags
  isPartner         Boolean    @default(false)
  defaultClientType ClientType @default(PRIVATE)

  // Relations
  quotes   Quote[]
  invoices Invoice[]
}
```

### Key Implementation Decisions

1. **Model exists**: `Contact` already in schema.prisma with all required fields
2. **API exists**: Basic CRUD in `packages/api/src/routes/vtc/contacts.ts` - needs enhancement
3. **UI pattern**: Use ShadCN DataTable for list, Sheet/Drawer for quick edit
4. **Pagination**: Offset-based with page/limit parameters
5. **Search**: Server-side search on displayName, email, companyName

### File Structure

```
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/
├── contacts/
│   ├── page.tsx                    # NEW: Contacts list page
│   └── [contactId]/
│       └── page.tsx                # NEW: Contact detail page

apps/web/modules/saas/contacts/
├── components/
│   ├── ContactsTable.tsx           # NEW: Table component
│   ├── ContactForm.tsx             # NEW: Form component
│   └── ContactDrawer.tsx           # NEW: Drawer component

packages/api/src/routes/vtc/
├── contacts.ts                     # MODIFIED: Add pagination, search, counts
├── __tests__/
│   └── contacts.test.ts            # NEW: API tests
```

### Testing Strategy

1. **Vitest**: Test API endpoints (CRUD, pagination, search, multi-tenancy)
2. **Playwright MCP**: Test UI flows (list, create, edit, search)
3. **curl + DB**: Verify API responses and database state

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-1-implement-contact-model-basic-crm-ui.context.xml

### Agent Model Used

Cascade BMAD Dev Agent

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled upon completion)

### File List

(To be filled upon completion)
