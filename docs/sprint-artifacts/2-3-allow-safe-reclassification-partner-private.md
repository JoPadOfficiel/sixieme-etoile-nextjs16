# Story 2.3: Allow Safe Reclassification Between Partner and Private

Status: done

## Story

**As an** operator,  
**I want** to reclassify a client between Partner and Private,  
**So that** I can correct mistakes without losing historical quotes and invoices.

## Acceptance Criteria

### AC1: Partner → Private with Existing Quotes/Invoices

- **Given** a Partner contact with linked quotes and invoices
- **When** I change its type to Private and confirm
- **Then** the contact becomes Private, all existing quotes and invoices remain linked with unchanged commercial values, and the associated PartnerContract is deleted

### AC2: Private → Partner with Existing Quotes

- **Given** a Private contact with linked quotes
- **When** I change its type to Partner and confirm
- **Then** the contact becomes Partner, all existing quotes remain linked with unchanged values, and I can subsequently create a PartnerContract

### AC3: Warning Dialog Before Reclassification

- **Given** I attempt to reclassify a contact
- **When** I toggle the Partner/Private switch
- **Then** a warning dialog appears explaining the impact (e.g., "Future quotes will use dynamic pricing instead of grid pricing")

### AC4: New Quotes Use New Classification (Partner → Private)

- **Given** a contact reclassified from Partner to Private
- **When** I create a new quote for this contact
- **Then** the pricing engine uses Method 2 (dynamic pricing)

### AC5: New Quotes Use New Classification (Private → Partner)

- **Given** a contact reclassified from Private to Partner with a configured contract
- **When** I create a new quote for this contact
- **Then** the pricing engine attempts Method 1 (grid pricing) if a matching route exists

## Technical Tasks

### Task 1: API Enhancement

- [x] Update `PATCH /api/vtc/contacts/:id` to handle `isPartner` changes
- [x] If changing Partner → Private and PartnerContract exists, delete it in the same transaction
- [x] Return a flag indicating if a contract was deleted
- [x] Add validation to prevent invalid state transitions

### Task 2: Frontend Warning Dialog

- [x] Create `ReclassificationWarningDialog` component
- [x] Show dialog when `isPartner` toggle changes
- [x] Display appropriate warning message based on direction (Partner→Private vs Private→Partner)
- [x] Include information about PartnerContract deletion if applicable
- [x] Require explicit confirmation before submitting

### Task 3: ContactForm Integration

- [x] Integrate warning dialog with existing ContactForm
- [x] Handle the confirmation flow before API call
- [x] Show success/error toast after reclassification

### Task 4: Tests

- [x] Vitest: API tests for reclassification scenarios
- [x] Vitest: Verify quotes/invoices remain unchanged after reclassification
- [x] Playwright MCP: UI tests for warning dialog and flow
- [x] curl + DB verification: End-to-end API tests

## API Contract

### PATCH /api/vtc/contacts/:id

Request (reclassification):

```json
{
  "isPartner": false
}
```

Response:

```json
{
  "id": "cuid",
  "displayName": "Partner Agency",
  "isPartner": false,
  "type": "AGENCY",
  "...": "other contact fields",
  "_meta": {
    "partnerContractDeleted": true,
    "reclassifiedFrom": "PARTNER",
    "reclassifiedTo": "PRIVATE"
  }
}
```

## UI Behavior

### Warning Dialog Content

**Partner → Private:**

```
⚠️ Reclassify to Private Client

You are about to change this contact from Partner to Private.

This will:
• Delete the associated commercial contract (billing, payment terms, commission)
• Future quotes will use dynamic pricing (Method 2) instead of grid pricing

Existing quotes and invoices will NOT be affected.

[Cancel] [Confirm Reclassification]
```

**Private → Partner:**

```
ℹ️ Reclassify to Partner Client

You are about to change this contact from Private to Partner.

This will:
• Enable grid-based pricing (Method 1) for future quotes
• Allow you to configure commercial settings (billing, payment terms, commission)

Existing quotes and invoices will NOT be affected.

[Cancel] [Confirm Reclassification]
```

## Dev Notes

- The `isPartner` flag determines pricing mode selection in the pricing engine
- PartnerContract has `onDelete: Cascade` from Contact, but we handle deletion explicitly for better control
- Quotes store `pricingMode` at creation time, so historical quotes are not affected
- Invoices deep-copy commercial values at creation, so they are immutable per FR34

## Testing Strategy

### Vitest (Unit/Integration)

- Test PATCH endpoint with isPartner change
- Test PartnerContract deletion when Partner → Private
- Test that quotes/invoices are not modified
- Test validation (e.g., cannot delete contract if in use by active quotes?)

### Playwright MCP (E2E/UI)

- Test warning dialog appears on toggle
- Test dialog content matches direction
- Test confirmation flow
- Test cancellation flow
- Test success toast after reclassification

### curl + DB Verification

- Create Partner with contract, reclassify to Private, verify contract deleted
- Create Private, reclassify to Partner, verify can create contract
- Verify quotes/invoices unchanged after reclassification

## Dependencies

- Story 2.1: Contact Model & Basic CRM UI ✅ Done
- Story 2.2: Store Partner Contract Data & Rate Grid Links ✅ Done

## Files to Modify/Create

### API

- `packages/api/src/routes/vtc/contacts.ts` - Update PATCH handler

### Frontend

- `apps/web/modules/saas/contacts/components/ReclassificationWarningDialog.tsx` - New component
- `apps/web/modules/saas/contacts/components/ContactForm.tsx` - Integrate dialog
- `apps/web/modules/saas/contacts/components/index.ts` - Export new component

### Translations

- `apps/web/locales/en.json` - Add reclassification messages
- `apps/web/locales/fr.json` - Add reclassification messages

### Tests

- `packages/api/src/routes/vtc/__tests__/contacts.test.ts` - Add reclassification tests
