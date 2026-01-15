# Story 24.3: Add EndCustomer Section to Partner Contact Detail Page

**Status:** done

### Modified Files
- `apps/web/modules/saas/contacts/types.ts`
- `packages/i18n/translations/fr.json`
- `packages/i18n/translations/en.json`
- `apps/web/modules/saas/contacts/components/EndCustomerList.tsx` (New)
- `apps/web/modules/saas/contacts/components/EndCustomerFormDialog.tsx` (New)
- `apps/web/modules/saas/contacts/components/index.ts`
- `apps/web/modules/saas/contacts/components/ContactDrawer.tsx`


As a **CRM user**,
I want to see and manage end-customers directly on the Partner contact detail page,
So that I can maintain a list of individual clients for each agency.

## Related FRs

- **FR122**: manage end-customers (CRUD) linked to partner contacts.

## Acceptance Criteria

**AC1 - End Customers Tab/Section**
**Given** I view a Contact detail drawer/page,
**When** the contact is a Partner (`isPartner = true`),
**Then** I see a new tab "Clients Finaux" (End Customers).
**And** this tab is NOT visible for non-partner contacts.

**AC2 - End Customers List**
**Given** I am on the "Clients Finaux" tab,
**When** I view the list,
**Then** I see a table/list of end-customers linked to this partner.
**And** each row displays:
- Full Name (Last First)
- Email (if set)
- Difficulty Score badge (if set)
- Number of quotes (mission count)
- Actions (Edit, Delete)

**AC3 - Add End Customer**
**Given** I am on the "Clients Finaux" tab,
**When** I click "Ajouter un client",
**Then** a dialog/form opens to create a new end-customer.
**And** I can enter:
- First Name (required)
- Last Name (required)
- Email (optional)
- Phone (optional)
- Difficulty Score (1-5 star rating)
- Notes (optional)
**And** on save, the list refreshes.

**AC4 - Edit End Customer**
**Given** an existing end-customer in the list,
**When** I click "Modifier" (Edit),
**Then** the form opens pre-filled with existing data.
**And** on save, the list updates.

**AC5 - Delete End Customer**
**Given** an end-customer in the list,
**When** I click "Supprimer" (Delete),
**Then** I am asked for confirmation.
**And** if confirmed, the customer is deleted and list refreshes.
**And** if deletion fails (e.g. linked quotes), an error message is shown.

## Technical Notes

- **Components:**
  - Create `EndCustomerList.tsx`: Handles the list display and delete action.
  - Create `EndCustomerFormDialog.tsx`: Handles Create/Edit form.
  - Update `ContactDrawer.tsx`: Add the "End Customers" tab.
- **Data Fetching:**
  - Use `apiClient.vtc.contacts[':contactId']['end-customers'].$get` for fetching list.
  - Use `apiClient.vtc.contacts[':contactId']['end-customers'].$post` for create.
  - Use `apiClient.vtc['end-customers'][':id'].$patch` for update.
  - Use `apiClient.vtc['end-customers'][':id'].$delete` for delete.
- **State Management:**
  - Use React Query for data fetching/invalidation.
- **Translations:**
  - Add keys to `packages/i18n/translations/fr.json` for "Clients Finaux", "Ajouter un client", etc.
