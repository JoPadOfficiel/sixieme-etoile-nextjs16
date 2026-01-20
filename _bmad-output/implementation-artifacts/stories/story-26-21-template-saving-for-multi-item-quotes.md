# Story 26.21: Template Saving for Multi-Item Quotes

**Epic:** 26 - Flexible "Yolo Mode" Billing
**Agent:** Bob (Scrum Master)
**Status:** done
**Priority:** High (Productivity Feature)
**Branch:** `feature/26-21-save-cart-template`

## Description

As an **operator**,  
I want **to save a complex quote structure (with all its groups and line items) as a complete Template**,  
So that **I can re-use it for recurring similar requests (e.g., "Fashion Week Package", "Loire Châteaux Tour") without manually recreating the entire structure.**

This story extends the existing `BlockTemplate` system (Story 26.13) to support **full quote templates** containing multiple lines and group hierarchies. While Story 26.13 handles single-block templates (e.g., "Champagne Bottle"), this story enables saving and loading entire cart structures.

**Business Value:**
- **Time savings** for operators dealing with complex recurring quotes (multi-day tours, event packages)
- **Consistency** in commercial offerings across the team
- **Reduced errors** by eliminating manual re-entry of complex structures

## Acceptance Criteria (AC)

### AC1: Schema Extension for Full Quote Templates
- **Given** the existing `BlockTemplate` model in Prisma,
- **When** I check the schema,
- **Then** it must include a new field `isFullQuote: Boolean @default(false)` to distinguish single-block templates from full quote templates.
- **And** the `data` field for full quote templates contains an array of `QuoteLine` structures with their complete hierarchy (parentId relationships preserved but with placeholder IDs).

### AC2: "Save Quote as Template" Button
- **Given** I have a populated quote cart with multiple line items (including groups),
- **When** I look at the Quote Editor interface,
- **Then** I see a "Save as Template" button (with appropriate icon like `BookmarkPlus`).
- **And** clicking it opens a dialog prompting for a **template name** (required, max 100 chars).
- **And** confirming saves all current cart lines (preserving group structure) to a new `BlockTemplate` record with `isFullQuote: true`.

### AC3: Template Hierarchy Serialization
- **Given** a cart with groups containing nested lines,
- **When** saving as template,
- **Then** the `data` JSON preserves:
  - Line `type` (CALCULATED, MANUAL, GROUP)
  - `displayData` (label, quantity, unitPrice, vatRate)
  - `parentId` relationships (converted to temporary IDs for reconstruction)
  - `sortOrder`
- **And** `sourceData` is cleared (templates are for structure, not specific trip data).

### AC4: "Load Template" Option in UI
- **Given** I am in the Quote Editor,
- **When** I click a "Load Template" button or access it via the existing Slash Menu (`/template`),
- **Then** I see a list of templates filtered by `isFullQuote: true` (full templates) distinctly presented from single-block templates.
- **And** selecting a full template shows a confirmation with two options:
  - **"Replace Cart"**: Clears current lines and loads template lines.
  - **"Add to Cart"**: Appends template lines to existing cart (at the end).

### AC5: ID Regeneration on Import
- **Given** I load a full quote template into the cart,
- **When** the lines are inserted,
- **Then** all `id`/`tempId` values are regenerated (using `Date.now()` or CUID patterns) to avoid conflicts.
- **And** `parentId` references are correctly mapped to the new IDs.
- **And** `sortOrder` values are recalculated based on insertion position.

### AC6: Template Management
- **Given** the template list (via Slash Menu or dedicated modal),
- **When** I want to manage templates,
- **Then** I can delete a template (with confirmation).
- **And** full quote templates are visually distinguished (e.g., folder icon vs document icon).

### AC7: API Endpoints
- **Given** the API at `/api/vtc/quotes/block-templates`,
- **When** creating a full quote template,
- **Then** the POST body includes `isFullQuote: true` and `data` contains the lines array.
- **And** the GET endpoint supports an optional `?isFullQuote=true|false` filter.

## Technical Specifications

### Database Changes

```prisma
model BlockTemplate {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  label       String   // Name of the template in the UI
  isFullQuote Boolean  @default(false) // NEW: Distinguishes full quote templates
  data        Json     // Template data (lines array for isFullQuote=true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([isFullQuote]) // NEW: For filtered queries
  @@map("block_template")
}
```

### Data Structure for Full Quote Template

```typescript
interface FullQuoteTemplateData {
  lines: Array<{
    tempId: string;          // Placeholder ID (e.g., "tpl-1", "tpl-2")
    type: "CALCULATED" | "MANUAL" | "GROUP";
    label: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
    parentId: string | null; // References another tempId or null
    sortOrder: number;
    displayData: {
      label: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      total: number;
    };
    // sourceData is NOT saved (cleared on template save)
  }>;
  version: 1;  // Schema version for future compatibility
}
```

### Utility Functions

```typescript
// Serialize cart lines to template format
function serializeCartToTemplate(lines: QuoteLine[]): FullQuoteTemplateData;

// Deserialize template to cart lines with new IDs
function deserializeTemplateToCart(
  templateData: FullQuoteTemplateData,
  startSortOrder: number // For "Add to Cart" mode
): QuoteLine[];
```

## Test Guidelines

### Test Case 1: Serialize/Deserialize Round-Trip (Vitest)
- Create a mock cart with 3 top-level lines + 1 GROUP containing 2 children.
- Call `serializeCartToTemplate()`.
- Verify `sourceData` is cleared.
- Call `deserializeTemplateToCart()`.
- Verify:
  - All lines have new unique IDs.
  - Parent-child relationships are preserved.
  - `sortOrder` is sequential.

### Test Case 2: API Create Full Template (Integration)
- POST to `/api/vtc/quotes/block-templates` with `isFullQuote: true` and lines data.
- Verify response status 201.
- Verify record in database has `isFullQuote: true`.

### Test Case 3: API Filter by isFullQuote (Integration)
- Create 2 templates: one single-block, one full-quote.
- GET `/api/vtc/quotes/block-templates?isFullQuote=true`.
- Verify only full-quote template is returned.

### Test Case 4: Browser - Save and Load Template (MCP Browser)
- Navigate to Quote Editor with 3 lines.
- Click "Save as Template", enter name "Test Package".
- Clear the cart.
- Open template menu, select "Test Package".
- Choose "Replace Cart".
- Verify 3 lines appear with correct labels.

### Test Case 5: Add to Cart Mode (Browser)
- Load an existing quote with 2 lines.
- Load a template with 3 lines using "Add to Cart".
- Verify cart now has 5 lines.
- Verify no ID conflicts.

## Constraints & Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Story 26.13 (Block Templates) | ✅ Done | Base template CRUD infrastructure |
| Story 26.7 (Drag & Drop) | ✅ Done | Hierarchy support |
| Story 26.5 (Universal Block Row) | ✅ Done | Line item rendering |
| Story 26.14 (Undo/Redo) | ✅ Done | History integration |

## UI Components to Create/Modify

1. **`SaveQuoteTemplateDialog.tsx`** (NEW)
   - Dialog with name input
   - Triggered from YoloQuoteEditor toolbar

2. **`LoadQuoteTemplateDialog.tsx`** (NEW)
   - Template list with preview
   - Replace/Add to Cart options
   - Filter for `isFullQuote: true`

3. **`YoloQuoteEditor.tsx`** (MODIFY)
   - Add "Save as Template" button in toolbar
   - Add "Load Template" button

4. **`useBlockTemplateActions.ts`** (MODIFY)
   - Add `isFullQuote` parameter to create mutation
   - Add filter support to query

5. **`block-templates.ts` API** (MODIFY)
   - Add `isFullQuote` to schema
   - Add query filter

## i18n Keys Required

```json
{
  "quotes": {
    "templates": {
      "saveQuoteAsTemplate": "Save quote as template",
      "loadTemplate": "Load template",
      "templateName": "Template name",
      "templateNamePlaceholder": "e.g., Fashion Week Package",
      "replaceCart": "Replace current cart",
      "addToCart": "Add to current cart",
      "confirmReplace": "This will replace all current items. Continue?",
      "fullQuoteTemplates": "Quote Templates",
      "singleBlockTemplates": "Line Templates",
      "noFullQuoteTemplates": "No quote templates saved yet",
      "loadSuccess": "Template loaded successfully",
      "saveSuccess": "Quote saved as template"
    }
  }
}
```


## Tasks

- [x] Phase 1: Schema & API
  - [x] Add Prisma migration for `isFullQuote` field
  - [x] Update API route validation schemas
  - [x] Add filter support to GET endpoint
- [x] Phase 2: Utility Functions
  - [x] Create `cartTemplateUtils.ts` with serialize/deserialize
  - [x] Add comprehensive unit tests
- [x] Phase 3: UI Components
  - [x] Implement `SaveQuoteTemplateDialog`
  - [x] Implement `LoadQuoteTemplateDialog`
  - [x] Integrate into `YoloQuoteEditor`
- [x] Phase 4: Integration & Polish
  - [x] Add i18n keys
  - [x] Browser testing
  - [x] Code review
  - [x] Add API Integration Tests (AI Code Review Follow-up)

## Dev Agent Record

### File List

- `packages/database/prisma/schema.prisma`
- `packages/api/src/routes/vtc/block-templates.ts`
- `apps/web/modules/saas/quotes/hooks/useBlockTemplateActions.ts`
- `apps/web/modules/saas/quotes/utils/cartTemplateUtils.ts`
- `apps/web/modules/saas/quotes/components/yolo/SaveQuoteTemplateDialog.tsx`
- `apps/web/modules/saas/quotes/components/yolo/LoadQuoteTemplateDialog.tsx`
- `apps/web/modules/saas/quotes/components/yolo/YoloQuoteEditor.tsx`
- `packages/i18n/translations/fr.json`
- `apps/web/modules/saas/quotes/utils/__tests__/cartTemplateUtils.test.ts`
- `packages/api/src/routes/vtc/__tests__/block-templates.test.ts`

### Change Log

- **2026-01-20**: Implemented full quote template schema, API updates, utility functions with unit tests, and UI components (Save/Load dialogs). Added integration in YoloQuoteEditor.
- **2026-01-20**: (AI Review) Added missing integration tests for the API and verified i18n keys.

---

**Story Done** ✅
