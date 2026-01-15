# Story 25.5: Deep Linking Navigation & CRM UX Improvements

## Status: ready-for-dev

## Story Overview

**Epic:** Epic 25 - Documents, Payments & Deep Linking Enhancements  
**Type:** Feature Enhancement  
**Priority:** High  
**Estimated Time:** 2-3 hours

## Business Objective

Enable users to share direct URLs to specific CRM views (e.g., opening a contact drawer with a specific tab selected). Improve overall UX by enlarging drawers/modals for better content visibility and adding invoice counts to the End Customer list for enhanced data transparency.

## Description

This story implements three distinct UX improvements:

1. **Deep Linking via URL Query Params**: Users can navigate directly to a specific contact's drawer with a specific tab open via URL query parameters (e.g., `/contacts?id=123&tab=end-customers`).

2. **Enlarged Modal/Sheet Widths**: Increase the maximum width of drawers (Sheets) from `sm:max-w-xl` to `sm:max-w-4xl` for better content display.

3. **Invoice Count Column**: Add an "Invoices" column to the End Customer list table showing the count of invoices linked to each end-customer.

## Acceptance Criteria

### AC1: Deep Linking Navigation
- [ ] The Contacts page reads `id` and `tab` query parameters from the URL on mount
- [ ] If `id` is present, the page fetches the contact and opens the drawer automatically
- [ ] If `tab` is present, the drawer opens with that tab selected (valid tabs: `details`, `timeline`, `commercial`, `end-customers`, `contract`)
- [ ] URL is updated when selecting a different contact or tab
- [ ] Sharing a URL like `/contacts?id=abc123&tab=invoices` opens that exact view

### AC2: Enlarged Drawers/Modals (4xl width)
- [ ] `ContactDrawer` uses `sm:max-w-4xl` instead of `sm:max-w-xl`
- [ ] `AssignmentDrawer` maintains its custom width `w-[650px]` (already larger)
- [ ] UI remains responsive and usable on smaller screens

### AC3: Invoice Count in End Customer List
- [ ] API returns `invoices` count alongside `quotes` count for End Customers
- [ ] End Customer list table displays an "Invoices" column with badge showing count
- [ ] Column header is translated via i18n key

## Technical Details

### Implementation Steps

1. **Update End Customers API** (`packages/api/src/routes/vtc/end-customers.ts`):
   - Add `invoices: true` to `_count.select` in all queries
   - Update types to include invoice count

2. **Update ContactDrawer** (`apps/web/modules/saas/contacts/components/ContactDrawer.tsx`):
   - Add props for `initialTab` 
   - Change width from `sm:max-w-xl` to `sm:max-w-4xl`

3. **Update Contacts Page** (`apps/web/app/(saas)/app/(organizations)/[organizationSlug]/contacts/page.tsx`):
   - Use `useSearchParams` to read `id` and `tab` from URL
   - Auto-open drawer with correct tab on mount if params present
   - Use `useRouter` to update URL when drawer/tab changes

4. **Update EndCustomerList** (`apps/web/modules/saas/contacts/components/EndCustomerList.tsx`):
   - Add "Invoices" column to table
   - Display invoice count badge

5. **Update Translations**:
   - Add `contacts.endCustomers.columns.invoices` translation key

## Dependencies

- Story 24.2 (EndCustomer CRUD API) - Completed
- Better Auth authentication middleware

## Test Cases

### TC1: Deep Linking - Contact Drawer
```
Given: User navigates to `/contacts?id=abc123&tab=timeline`
When: Page loads
Then: Contact drawer opens with Timeline tab selected
```

### TC2: Deep Linking - URL Update
```
Given: User is on Contacts page with drawer closed
When: User clicks a contact and selects "end-customers" tab
Then: URL updates to include `?id=contactId&tab=end-customers`
```

### TC3: Enlarged Drawer
```
Given: User opens ContactDrawer on desktop
When: Drawer animates in
Then: Drawer width is 4xl (896px max)
```

### TC4: Invoice Count Display
```
Given: End Customer has 3 linked invoices
When: User views End Customer list
Then: "3" badge appears in Invoices column
```

## Files to Modify

1. `packages/api/src/routes/vtc/end-customers.ts` - Add invoice count
2. `apps/web/modules/saas/contacts/components/ContactDrawer.tsx` - Width + initialTab
3. `apps/web/modules/saas/contacts/components/EndCustomerList.tsx` - Invoice column
4. `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/contacts/page.tsx` - Deep linking
5. `apps/web/modules/saas/contacts/types/index.ts` - Update types (if needed)
6. Translation files for i18n keys

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests pass
- [ ] Manual browser testing confirms deep linking works
- [ ] Code reviewed and approved
- [ ] Sprint status updated to `review`
