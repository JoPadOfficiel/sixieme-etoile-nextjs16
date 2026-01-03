# Story 22.4: Implement Complete Subcontracting System

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** ready-for-dev  
**Created:** 2026-01-03  
**Priority:** High  
**Branch:** feature/22-4-complete-subcontracting-system

---

## User Story

**As a** dispatcher,  
**I want** a complete subcontracting management system,  
**So that** I can effectively outsource missions when internal resources are unavailable.

---

## Description

This story completes the subcontracting system started in Story 8.6 by adding:

1. **Subcontractor Management UI** - Dedicated page to manage subcontractor profiles
2. **Contact Form Integration** - SubcontractorFields component in contact creation/edit
3. **Subcontracted Missions Tracking** - Filter and display subcontracted missions in dispatch
4. **Availability Status** - Track subcontractor availability and response times

### Business Value

- **Centralized Management**: Single place to manage all subcontractor partners
- **Streamlined Workflow**: Create subcontractors directly from contacts
- **Mission Visibility**: Track all subcontracted missions in dispatch
- **Operational Efficiency**: Quick access to subcontractor availability

### Prerequisites (Already Implemented in Story 8.6)

- SubcontractorProfile model with zones and vehicle categories
- API endpoints for CRUD operations
- SubcontractingSuggestions component in dispatch
- Hooks for subcontracting operations

---

## Acceptance Criteria

### AC1: Subcontractor Management Page

```gherkin
Given I am logged in as an operator
When I navigate to /settings/fleet/subcontractors
Then I see a page with:
  - Page title "Subcontractors" with description
  - "Add Subcontractor" button
  - Table of existing subcontractors with columns:
    | Column | Description |
    | Name | Company name or contact display name |
    | Contact | Email and phone |
    | Operating Zones | List of zones (badges) |
    | Vehicle Categories | List of categories (badges) |
    | Rates | Rate per km / Rate per hour / Minimum fare |
    | Status | Active/Inactive badge |
    | Actions | Edit, Delete buttons |
And the table supports:
  - Sorting by name, status
  - Filtering by status (Active/Inactive/All)
  - Search by name
```

### AC2: Create Subcontractor Dialog

```gherkin
Given I am on the Subcontractors page
When I click "Add Subcontractor"
Then a dialog opens with:
  - Contact selector (dropdown of contacts not yet subcontractors)
  - Operating Zones multi-select
  - Vehicle Categories multi-select
  - Rate per km input (EUR)
  - Rate per hour input (EUR)
  - Minimum fare input (EUR)
  - Notes textarea
  - Cancel and Create buttons
When I fill the form and click Create
Then the subcontractor is created
And the dialog closes
And the table refreshes with the new subcontractor
And a success toast is shown
```

### AC3: Edit Subcontractor Dialog

```gherkin
Given I am on the Subcontractors page
When I click Edit on a subcontractor row
Then a dialog opens pre-filled with:
  - Contact info (read-only display)
  - Operating Zones multi-select (current values selected)
  - Vehicle Categories multi-select (current values selected)
  - Rate inputs with current values
  - Notes with current value
  - Active/Inactive toggle
When I modify values and click Save
Then the subcontractor is updated
And the dialog closes
And the table refreshes
And a success toast is shown
```

### AC4: Delete Subcontractor Confirmation

```gherkin
Given I am on the Subcontractors page
When I click Delete on a subcontractor row
Then a confirmation dialog appears with:
  - Warning message about deletion
  - Subcontractor name displayed
  - Cancel and Delete buttons
When I click Delete
Then the subcontractor is deleted
And the table refreshes
And a success toast is shown
```

### AC5: Contact Form Integration

```gherkin
Given I am creating or editing a contact
When I toggle "Is Subcontractor" to true
Then additional fields appear:
  | Field | Type |
  | Operating Zones | Multi-select from PricingZones |
  | Vehicle Categories | Multi-select from VehicleCategories |
  | Rate per km (EUR) | Decimal input |
  | Rate per hour (EUR) | Decimal input |
  | Minimum fare (EUR) | Decimal input |
  | Notes | Textarea |
When I save the contact
Then a SubcontractorProfile is created/updated linked to the contact
And the contact is marked as isSubcontractor = true
```

### AC6: Subcontracted Missions Filter in Dispatch

```gherkin
Given I am on the Dispatch page
When I view the missions filters
Then I see a "Subcontracted" filter option with values:
  - All (default)
  - Subcontracted only
  - Internal only
When I select "Subcontracted only"
Then only missions with isSubcontracted = true are shown
And each mission row shows:
  - Subcontractor badge with company name
  - Subcontracted price
  - Original internal cost (for comparison)
```

### AC7: Subcontracted Mission Badge in Dispatch

```gherkin
Given a mission that has been subcontracted
When I view the mission in the dispatch list
Then I see a "Subcontracted" badge on the mission row
And the badge shows the subcontractor company name
And clicking the badge shows subcontracting details:
  - Subcontractor name and contact
  - Agreed price
  - Subcontracting date
  - Notes (if any)
```

### AC8: Navigation Integration

```gherkin
Given the settings sidebar
When I view the Fleet section
Then I see a "Subcontractors" menu item
And clicking it navigates to /settings/fleet/subcontractors
```

---

## Technical Implementation

### Files to Create

```
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/subcontractors/
├── page.tsx                           # Subcontractors management page
├── loading.tsx                        # Loading skeleton

apps/web/modules/saas/subcontractors/
├── components/
│   ├── SubcontractorsPage.tsx         # Main page component
│   ├── SubcontractorsTable.tsx        # Data table with sorting/filtering
│   ├── SubcontractorRow.tsx           # Table row component
│   ├── CreateSubcontractorDialog.tsx  # Create dialog
│   ├── EditSubcontractorDialog.tsx    # Edit dialog
│   ├── DeleteSubcontractorDialog.tsx  # Delete confirmation
│   ├── SubcontractorForm.tsx          # Shared form fields
│   └── index.ts                       # Exports
├── hooks/
│   ├── useSubcontractorsPage.ts       # Page state management
│   └── index.ts
└── types/
    └── index.ts                       # Type definitions

apps/web/modules/saas/contacts/components/
├── SubcontractorFields.tsx            # Subcontractor fields for contact form
```

### Files to Modify

```
apps/web/modules/saas/dispatch/components/
├── MissionsFilters.tsx                # Add subcontracted filter
├── MissionRow.tsx                     # Add subcontracted badge
├── DispatchBadges.tsx                 # Add SubcontractedBadge

apps/web/modules/saas/contacts/components/
├── ContactForm.tsx                    # Integrate SubcontractorFields

packages/i18n/translations/
├── en.json                            # Add subcontractors.* keys
└── fr.json                            # Add subcontractors.* keys

apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/
├── layout.tsx                         # Add subcontractors to nav (if needed)
```

### API Endpoints (Already Exist)

| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| GET    | /api/vtc/subcontractors     | List subcontractors          |
| GET    | /api/vtc/subcontractors/:id | Get subcontractor detail     |
| POST   | /api/vtc/subcontractors     | Create subcontractor profile |
| PATCH  | /api/vtc/subcontractors/:id | Update subcontractor         |
| DELETE | /api/vtc/subcontractors/:id | Delete subcontractor         |

### Component Architecture

```typescript
// SubcontractorsPage.tsx
interface SubcontractorsPageProps {}

// Uses existing hooks from dispatch/hooks/useSubcontracting.ts:
// - useSubcontractors()
// - useCreateSubcontractor()
// - useUpdateSubcontractor()
// - useDeleteSubcontractor()

// SubcontractorForm.tsx
interface SubcontractorFormProps {
  mode: "create" | "edit";
  initialData?: SubcontractorFormData;
  onSubmit: (data: SubcontractorFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface SubcontractorFormData {
  contactId?: string; // Only for create
  operatingZoneIds: string[];
  vehicleCategoryIds: string[];
  ratePerKm: number | null;
  ratePerHour: number | null;
  minimumFare: number | null;
  notes: string | null;
  isActive?: boolean; // Only for edit
}
```

### Translations

```json
{
  "subcontractors": {
    "title": "Subcontractors",
    "description": "Manage your subcontractor partners for mission outsourcing",
    "addSubcontractor": "Add Subcontractor",
    "table": {
      "name": "Name",
      "contact": "Contact",
      "operatingZones": "Operating Zones",
      "vehicleCategories": "Vehicle Categories",
      "rates": "Rates",
      "status": "Status",
      "actions": "Actions",
      "noSubcontractors": "No subcontractors found",
      "noSubcontractorsDescription": "Add your first subcontractor partner to start outsourcing missions"
    },
    "form": {
      "selectContact": "Select Contact",
      "selectContactPlaceholder": "Choose a contact...",
      "operatingZones": "Operating Zones",
      "operatingZonesPlaceholder": "Select zones...",
      "vehicleCategories": "Vehicle Categories",
      "vehicleCategoriesPlaceholder": "Select categories...",
      "ratePerKm": "Rate per km (EUR)",
      "ratePerHour": "Rate per hour (EUR)",
      "minimumFare": "Minimum fare (EUR)",
      "notes": "Notes",
      "notesPlaceholder": "Additional notes about this subcontractor...",
      "isActive": "Active",
      "isActiveDescription": "Inactive subcontractors won't appear in suggestions"
    },
    "dialog": {
      "createTitle": "Add Subcontractor",
      "editTitle": "Edit Subcontractor",
      "deleteTitle": "Delete Subcontractor",
      "deleteDescription": "Are you sure you want to delete this subcontractor? This action cannot be undone.",
      "create": "Create",
      "save": "Save Changes",
      "delete": "Delete",
      "cancel": "Cancel"
    },
    "toast": {
      "createSuccess": "Subcontractor created successfully",
      "updateSuccess": "Subcontractor updated successfully",
      "deleteSuccess": "Subcontractor deleted successfully",
      "error": "An error occurred"
    },
    "status": {
      "active": "Active",
      "inactive": "Inactive"
    },
    "filter": {
      "all": "All",
      "active": "Active",
      "inactive": "Inactive"
    },
    "rates": {
      "perKm": "{{rate}}/km",
      "perHour": "{{rate}}/h",
      "minimum": "Min: {{rate}}"
    }
  },
  "dispatch": {
    "filters": {
      "subcontracted": "Subcontracted",
      "subcontractedAll": "All",
      "subcontractedOnly": "Subcontracted only",
      "internalOnly": "Internal only"
    },
    "badges": {
      "subcontracted": "Subcontracted",
      "subcontractedTo": "Subcontracted to {{name}}"
    }
  }
}
```

---

## Tasks / Subtasks

- [ ] Task 1: Create Subcontractors Management Page (AC: #1, #8)

  - [ ] Create page route at `/settings/fleet/subcontractors`
  - [ ] Create `SubcontractorsPage.tsx` component
  - [ ] Create `SubcontractorsTable.tsx` with sorting and filtering
  - [ ] Create `SubcontractorRow.tsx` component
  - [ ] Add navigation link in settings sidebar

- [ ] Task 2: Implement Create Subcontractor Dialog (AC: #2)

  - [ ] Create `CreateSubcontractorDialog.tsx`
  - [ ] Create `SubcontractorForm.tsx` shared form component
  - [ ] Implement contact selector (filter out existing subcontractors)
  - [ ] Implement zones and categories multi-selects
  - [ ] Add form validation and error handling
  - [ ] Connect to `useCreateSubcontractor` hook

- [ ] Task 3: Implement Edit Subcontractor Dialog (AC: #3)

  - [ ] Create `EditSubcontractorDialog.tsx`
  - [ ] Reuse `SubcontractorForm.tsx` in edit mode
  - [ ] Add Active/Inactive toggle
  - [ ] Connect to `useUpdateSubcontractor` hook

- [ ] Task 4: Implement Delete Confirmation Dialog (AC: #4)

  - [ ] Create `DeleteSubcontractorDialog.tsx`
  - [ ] Add confirmation message with subcontractor name
  - [ ] Connect to `useDeleteSubcontractor` hook

- [ ] Task 5: Integrate SubcontractorFields in Contact Form (AC: #5)

  - [ ] Create `SubcontractorFields.tsx` component
  - [ ] Integrate into `ContactForm.tsx`
  - [ ] Handle create/update of SubcontractorProfile with contact

- [ ] Task 6: Add Subcontracted Filter in Dispatch (AC: #6)

  - [ ] Modify `MissionsFilters.tsx` to add subcontracted filter
  - [ ] Update missions query to support isSubcontracted filter
  - [ ] Display subcontractor info on filtered missions

- [ ] Task 7: Add Subcontracted Badge in Dispatch (AC: #7)

  - [ ] Create `SubcontractedBadge.tsx` component
  - [ ] Modify `MissionRow.tsx` to show badge
  - [ ] Add popover with subcontracting details

- [ ] Task 8: Add Translations (AC: All)
  - [ ] Add English translations
  - [ ] Add French translations

---

## Dev Notes

### Architecture Patterns

- Follow existing patterns from `/settings/fleet/vehicles` and `/settings/fleet/drivers`
- Use shadcn/ui components: Dialog, Table, Badge, Button, Form, Select
- Use React Query hooks from `dispatch/hooks/useSubcontracting.ts`
- Use `useTranslations` from next-intl for all text

### Existing Code to Reuse

- `useSubcontractors()`, `useCreateSubcontractor()`, `useUpdateSubcontractor()`, `useDeleteSubcontractor()` from `dispatch/hooks/useSubcontracting.ts`
- `SubcontractorListItem` type from `dispatch/types/subcontractor.ts`
- Zone and VehicleCategory selectors from pricing settings pages

### Testing Standards

- Unit tests for form validation
- E2E tests via Playwright MCP for full workflow
- API tests via curl for all endpoints

### Project Structure Notes

- New page at `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/subcontractors/page.tsx`
- New module at `apps/web/modules/saas/subcontractors/`
- Reuse hooks from `apps/web/modules/saas/dispatch/hooks/useSubcontracting.ts`

### References

- [Source: _bmad-output/implementation-artifacts/8-6-integrate-subcontractor-directory-subcontracting-suggestions.md]
- [Source: packages/api/src/services/subcontractor-service.ts]
- [Source: packages/api/src/routes/vtc/subcontractors.ts]
- [Source: apps/web/modules/saas/dispatch/hooks/useSubcontracting.ts]

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

### Completion Notes List

### File List

---

## Change Log

| Date       | Change        | Author            |
| ---------- | ------------- | ----------------- |
| 2026-01-03 | Story created | BMAD Orchestrator |
