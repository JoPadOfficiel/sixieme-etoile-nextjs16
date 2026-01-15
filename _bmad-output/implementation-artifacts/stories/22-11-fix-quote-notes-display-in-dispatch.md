# Story 22.11: Fix Quote Notes Display in Dispatch

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** done  
**Created:** 2026-01-04  
**Priority:** Medium  
**Branch:** feature/22-11-fix-quote-notes-display-dispatch

---

## User Story

**As a** dispatcher,  
**I want** quote notes to be clearly visible when assigning missions,  
**So that** drivers receive all important operational instructions.

---

## Description

This story ensures that quote notes are prominently displayed in the dispatch interface. Currently, the `MissionDetail` type includes a `notes` field, but it is not rendered in the dispatch UI. Dispatchers need to see these notes to communicate special instructions to drivers (VIP clients, special access requirements, luggage handling, etc.).

### Business Value

- **Operational Clarity**: Drivers receive all critical information before starting missions
- **Error Reduction**: Prevents missed instructions that could impact service quality
- **Client Satisfaction**: Special requests are properly communicated and fulfilled
- **Audit Trail**: Notes are visible and editable with proper tracking

### Current State Analysis

1. **MissionDetail type** (`apps/web/modules/saas/dispatch/types/mission.ts:113`): Already has `notes: string | null`
2. **useMissionDetail hook** (`apps/web/modules/saas/dispatch/hooks/useMissions.ts`): Fetches mission detail including notes
3. **DispatchPage** (`apps/web/modules/saas/dispatch/components/DispatchPage.tsx`): Does NOT display notes anywhere
4. **QuoteActivityLog** (`apps/web/modules/saas/quotes/components/QuoteActivityLog.tsx`): Has notes editing UI that can be reused

---

## Acceptance Criteria

### AC1: Notes Display in Mission Detail Panel

```gherkin
Given I am viewing a mission in dispatch
When the mission has notes attached
Then I see a "Notes" section prominently displayed
And the notes are formatted with proper line breaks
And critical keywords are highlighted (VIP, URGENT, etc.)
And the section is visible without scrolling in the detail panel
```

### AC2: Notes Indicator in Mission List

```gherkin
Given I am viewing the missions list
When a mission has notes
Then I see a notes indicator icon on the mission card
And hovering the icon shows a tooltip with notes preview (first 100 chars)
And clicking the icon scrolls to the notes section in detail panel
```

### AC3: Notes Editing in Dispatch

```gherkin
Given I am viewing a mission with notes
When I click the "Edit" button on the notes section
Then I can modify the notes content
And saving updates the quote record
And a success notification is shown
And the notes are immediately refreshed in the UI
```

### AC4: Notes Categories and Highlighting

```gherkin
Given notes contain special keywords
When the notes are displayed
Then the following keywords are highlighted:
  | Keyword | Style |
  | VIP | Gold badge |
  | URGENT | Red badge |
  | FRAGILE | Orange badge |
  | WHEELCHAIR | Blue badge |
  | CHILD SEAT | Blue badge |
And other text is displayed normally
```

### AC5: Notes Search in Missions Filter

```gherkin
Given I am on the dispatch page
When I use the search filter
Then the search includes notes content
And missions with matching notes are included in results
```

### AC6: Notes Sync from Quote

```gherkin
Given a quote is converted to a mission (accepted)
When I view the mission in dispatch
Then the notes from the quote are automatically visible
And any updates to notes in dispatch are synced back to the quote
```

---

## Technical Implementation

### Files to Create

```
apps/web/modules/saas/dispatch/components/
├── MissionNotesSection.tsx       # Notes display and edit component
├── NotesIndicator.tsx            # Icon indicator for mission list
```

### Files to Modify

```
apps/web/modules/saas/dispatch/components/DispatchPage.tsx
  - Add MissionNotesSection after TripTransparencyPanel
  - Pass notes and update handler

apps/web/modules/saas/dispatch/components/MissionsList.tsx
  - Add NotesIndicator to mission cards

apps/web/modules/saas/dispatch/hooks/useMissions.ts
  - Ensure notes field is included in mission list response

packages/api/src/routes/vtc/missions.ts
  - Ensure notes are included in mission detail response
  - Add PATCH endpoint for notes update if not exists

packages/i18n/translations/en.json
packages/i18n/translations/fr.json
  - Add dispatch.notes.* translations
```

### Component Architecture

```typescript
// MissionNotesSection.tsx
interface MissionNotesSectionProps {
  notes: string | null;
  missionId: string;
  onUpdateNotes: (notes: string | null) => Promise<void>;
  isUpdating: boolean;
  className?: string;
}

// NotesIndicator.tsx
interface NotesIndicatorProps {
  notes: string | null;
  onClick?: () => void;
}
```

### Keyword Highlighting Logic

```typescript
const HIGHLIGHT_KEYWORDS = {
  VIP: { className: "bg-amber-100 text-amber-800 border-amber-300" },
  URGENT: { className: "bg-red-100 text-red-800 border-red-300" },
  FRAGILE: { className: "bg-orange-100 text-orange-800 border-orange-300" },
  WHEELCHAIR: { className: "bg-blue-100 text-blue-800 border-blue-300" },
  "CHILD SEAT": { className: "bg-blue-100 text-blue-800 border-blue-300" },
  "SIÈGE ENFANT": { className: "bg-blue-100 text-blue-800 border-blue-300" },
  "FAUTEUIL ROULANT": {
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
};

function highlightKeywords(text: string): React.ReactNode[] {
  // Split text and wrap keywords in Badge components
}
```

### API Integration

The notes update should use the existing quote update endpoint:

- `PATCH /api/vtc/quotes/:id` with `{ notes: string | null }`

The mission detail endpoint already returns notes from the quote.

---

## Test Cases

### Unit Tests

| Test ID | Description                              | Expected Result              |
| ------- | ---------------------------------------- | ---------------------------- |
| UT-1    | highlightKeywords with VIP               | Returns text with VIP badge  |
| UT-2    | highlightKeywords with multiple keywords | Returns text with all badges |
| UT-3    | highlightKeywords with no keywords       | Returns plain text           |
| UT-4    | NotesIndicator with null notes           | Returns null (no indicator)  |
| UT-5    | NotesIndicator with notes                | Returns icon with tooltip    |

### Integration Tests (API)

| Test ID | Description                      | Expected Result               |
| ------- | -------------------------------- | ----------------------------- |
| IT-1    | GET /missions/:id includes notes | Response contains notes field |
| IT-2    | PATCH /quotes/:id updates notes  | Notes updated successfully    |
| IT-3    | Search missions by notes content | Matching missions returned    |

### E2E Tests (Playwright MCP)

| Test ID | Description             | Steps                                                                     |
| ------- | ----------------------- | ------------------------------------------------------------------------- |
| E2E-1   | View notes in dispatch  | Navigate to dispatch → Select mission with notes → Verify notes displayed |
| E2E-2   | Edit notes in dispatch  | Select mission → Edit notes → Save → Verify update                        |
| E2E-3   | Notes indicator in list | View missions list → Verify indicator on missions with notes              |
| E2E-4   | Keyword highlighting    | View mission with VIP in notes → Verify VIP badge displayed               |

---

## Tasks / Subtasks

- [ ] Task 1: Create MissionNotesSection Component (AC: #1, #3, #4)

  - [ ] Create component with notes display
  - [ ] Add edit mode with textarea
  - [ ] Implement keyword highlighting
  - [ ] Add save/cancel buttons

- [ ] Task 2: Create NotesIndicator Component (AC: #2)

  - [ ] Create icon component with tooltip
  - [ ] Add hover preview (first 100 chars)
  - [ ] Handle click to scroll

- [ ] Task 3: Integrate into DispatchPage (AC: #1, #6)

  - [ ] Add MissionNotesSection after TripTransparencyPanel
  - [ ] Wire up notes update mutation
  - [ ] Handle loading and error states

- [ ] Task 4: Add Notes Indicator to MissionsList (AC: #2)

  - [ ] Add NotesIndicator to mission cards
  - [ ] Position appropriately in card layout

- [ ] Task 5: Verify API Returns Notes (AC: #6)

  - [ ] Confirm mission detail includes notes
  - [ ] Confirm notes update works via quote endpoint

- [ ] Task 6: Add Translations (AC: All)

  - [ ] Add English translations
  - [ ] Add French translations

- [ ] Task 7: Testing (AC: All)
  - [ ] E2E tests via Playwright MCP
  - [ ] API tests via curl
  - [ ] Database verification

---

## Dev Notes

### Architecture Patterns

- Follow existing dispatch module patterns
- Use React Query for data fetching and mutations
- Use shadcn/ui components (Card, Button, Textarea, Badge, Tooltip)
- Use next-intl for translations
- Use Lucide icons (FileTextIcon, EditIcon, SaveIcon)

### Existing Code to Reuse

- `QuoteActivityLog` component has similar notes editing UI
- `useQuoteActions.updateNotes()` hook for notes mutation
- `apiClient.vtc.quotes[":id"].$patch()` for API call

### Testing Standards

- E2E tests via Playwright MCP for UI workflows
- API tests via curl for endpoints
- Database verification after each operation

### Project Structure Notes

- Component location: `apps/web/modules/saas/dispatch/components/`
- Hook location: `apps/web/modules/saas/dispatch/hooks/`
- Types already defined in `apps/web/modules/saas/dispatch/types/mission.ts`

### References

- [Source: apps/web/modules/saas/dispatch/types/mission.ts:107-116] - MissionDetail type with notes field
- [Source: apps/web/modules/saas/dispatch/components/DispatchPage.tsx:240-272] - Current detail panel layout
- [Source: apps/web/modules/saas/quotes/components/QuoteActivityLog.tsx:199-264] - Notes editing UI reference
- [Source: docs/bmad/epics.md:5804-5839] - Story 22.11 requirements

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
| 2026-01-04 | Story created | BMAD Orchestrator |
