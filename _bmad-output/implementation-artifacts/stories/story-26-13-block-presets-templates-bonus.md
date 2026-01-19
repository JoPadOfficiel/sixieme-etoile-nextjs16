# Story 26.13: Block Presets / Templates (Bonus)

**Epic:** 26 - Flexible "Yolo Mode" Billing
**Agent:** Bob (Scrum Master)
**Status:** Done
**Priority:** Bonus (High Value for Productivity)

## Description
As an **operator**,  
I want **to save common text blocks (e.g., "Champagne Bottle", "Extra Waiting Time")**,  
So that **I can reuse them across multiple quotes without re-typing/configuring them manually.**

This story focuses on creating a lightweight "Templates" system for Yolo blocks (`QuoteLine`). It enables saving a configured line (label, amount, VAT, etc.) as a template and re-inserting it later via the Slash Command menu or a dedicated "Insert" action.

## Acceptance Criteria (AC)

### AC1: Block Template Data Model
- **Given** the database schema,
- **When** I check for a `BlockTemplate` table (or equivalent),
- **Then** it must exist with at least:
    - `id`: Unique identifier (CUID).
    - `organizationId`: For multi-tenancy.
    - `label`: Name of the template (e.g., "Champagne").
    - `data`: JSON field storing the `displayData` (price, unit, VAT rate) and optionally `type` (MANUAL vs CALCULATED - primarily MANUAL).
    - `createdAt/updatedAt`.

### AC2: "Save as Template" Action
- **Given** a `Manually` Typed or `Calculated` block in the Quote Editor,
- **When** I open the block's action menu (three dots / context menu),
- **Then** I see an option "Save as Template".
- **And** clicking it prompts for a Template Name (defaulting to the block's current label).
- **And** confirming saves the template to the database.

### AC3: "Insert Template" via Slash Menu
- **Given** I am in the Quote Editor (Yolo Mode) and type `/`,
- **When** the Slash Menu opens,
- **Then** I see a "Templates" section (or a specific command like `/template`).
- **And** selecting it shows a list of my organization's saved templates.
- **And** selecting a template inserts a NEW line item at the current position with the template's data (Label, Price, Qty=1, VAT).

### AC4: Template Management (Optional/Basic)
- **Given** the list of templates in the insertion menu,
- **When** I want to delete an old template,
- **Then** there is a way to remove it (e.g., a small "x" or Trash icon in the menu list, or via a simple settings modal).

## Technical Details NOT Specified in PRD
- **Storage:** Use a proper Postgres table `BlockTemplate` rather than local storage to ensuring sharing across the team.
- **Integration:** Hook into `UniversalLineItemRow`'s existing dropdown menu and `SlashMenu` component.
- **Server Actions:** Need `createBlockTemplate`, `getBlockTemplates`, `deleteBlockTemplate`.

## Test Guidelines

### Test Case 1: Create Template (Vitest/Integration)
- Create a dummy QuoteLine with specific data (Label="Test Item", Price=100).
- Call `saveAsTemplate` action.
- Verify `BlockTemplate` record is created with matching JSON data.

### Test Case 2: Insert Template (Browser/E2E)
- Open a Quote.
- Type `/` to open Slash Menu.
- Select a known Template.
- Verify a new row appears with the correct Label and Price.
- Verify the new row is independent (editing it does not change the template).

### Test Case 3: Persistence
- Reload the page after saving a template.
- Verify the template is still available in the Slash Menu.

## Constraints & Dependencies
- Depends on **Story 26.1** (Data Model) and **Story 26.8** (Slash Menu).
- The Slash Menu must be extensible to support dynamic data fetching (templates list).
- Must adhere to Organization Multi-tenancy rules.

## Implementation Notes
- **API Status:** implemented `packages/api/src/routes/vtc/block-templates.ts` with `create`, `list`, `delete` operations.
- **Frontend Status:**
    - Hook `useBlockTemplateActions` implemented for React Query interactions.
    - `UniversalLineItemRow` updated to include "Save as Template" action in dropdown.
    - `SlashMenu` updated to fetch and display templates dynamically.
    - Integration logic handles slash command trigger `/` on existing lines.
- **Tests:** Added `apps/web/modules/saas/quotes/components/yolo/__tests__/BlockTemplate.test.tsx` verifying logic flow (interactions mocked where necessary due to Dialog rendering issues in test env).
