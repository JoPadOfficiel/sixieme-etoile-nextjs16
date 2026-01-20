# Story 28.13: Ad-Hoc Free Missions

## Story Information

| Field                | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Story ID**         | 28-13                                             |
| **Epic**             | Epic 28 - Order Management & Intelligent Spawning |
| **Title**            | Ad-Hoc Free Missions                              |
| **Status**           | review                                            |
| **Created**          | 2026-01-20                                        |
| **Priority**         | Medium                                            |
| **Estimated Points** | 5                                                 |

## Description

As an **operator**, I want to **create internal/non-billable missions directly from the Operations tab** of an order, so that I can **track internal tasks** (vehicle washing, repositioning, maintenance) that are associated with a client dossier but should **never appear on invoices**.

### Business Context

While the spawning engine (Stories 28.4-28.7) creates missions from quote lines, operators often need to track **internal operational tasks** that:

- Are related to a specific order/dossier (e.g., washing the car before a VIP pickup)
- Have no commercial value (non-billable)
- Should be visible in dispatch for scheduling
- Must NEVER appear on client invoices

### User Story

```
GIVEN I am viewing an Order in the Operations tab
WHEN I click the "Add Internal Task" button
THEN a modal opens to create a new mission WITHOUT a quote line source
AND the mission is flagged as "internal" (non-billable)
AND it appears in dispatch with an "Internal" badge
AND it is excluded from all invoice generation logic
```

## Acceptance Criteria

### AC1: Add Internal Task Button in Operations Tab

- [ ] Operations tab shows list of existing missions for the order
- [ ] A prominent "Add Internal Task" button is displayed
- [ ] Button uses appropriate icon (`Wrench` or `Plus`)
- [ ] Button is always visible (not conditional on other state)

### AC2: Internal Mission Creation Modal (InternalMissionModal)

- [ ] Modal opens when clicking "Add Internal Task"
- [ ] Form includes:
  - **Task Label** (Input text, required) - e.g., "Lavage Voiture"
  - **Date** (DatePicker, required)
  - **Time** (TimePicker, required)
  - **Vehicle Category** (Select dropdown, optional - can be unassigned)
  - **Notes** (Textarea, optional)
- [ ] Cancel button closes modal without action
- [ ] Submit button is disabled until required fields are filled

### AC3: Database Schema Update

- [ ] Add `isInternal` (Boolean, default: false) field to `Mission` model
- [ ] Create migration: `add_is_internal_to_mission`
- [ ] Regenerate Prisma client

### AC4: API Endpoint for Internal Mission Creation

- [ ] `POST /api/vtc/missions/create-internal` endpoint created
- [ ] Request body includes: `orderId`, `label`, `startAt`, `vehicleCategoryId?`, `notes?`
- [ ] Validates that the order exists and belongs to the organization
- [ ] Creates mission with:
  - `status: PENDING`
  - `isInternal: true`
  - `quoteLineId: null` (no source line)
  - `orderId: [orderId]`
  - `sourceData: { label: [label], isInternal: true }`
- [ ] Returns created mission data

### AC5: Visual Badge for Internal Missions

- [ ] Internal missions display an "Internal" badge (purple/gray)
- [ ] Badge appears in:
  - Operations tab mission list
  - Dispatch Gantt chart (if shown)
  - Mission detail views
- [ ] Badge clearly distinguishes from billable missions

### AC6: Invoice Exclusion Logic

- [ ] Internal missions (`isInternal: true`) are EXCLUDED from:
  - Invoice generation modal line selection
  - `GenerateInvoiceModal` available items
  - Any pending charges detection
- [ ] InvoiceFactory skips missions with `isInternal: true`

### AC7: UI Refresh After Creation

- [ ] After successful creation, modal closes
- [ ] Toast notification confirms success
- [ ] Missions list in Operations tab refreshes
- [ ] KPI card for missions count updates

## Technical Implementation

### Files to Create/Modify

#### New Files

1. `apps/web/modules/saas/orders/components/InternalMissionModal.tsx`
   - Modal component for creating internal missions
   - Uses Shadcn Dialog, Input, DatePicker, Select, Textarea
   - Adapted from SpawnMissionModal

2. `apps/web/modules/saas/orders/components/OperationsTabContent.tsx`
   - Extracted component for Operations tab logic
   - Displays missions list with badges
   - Integrates InternalMissionModal

#### Modified Files

1. `packages/database/prisma/schema.prisma`
   - Add `isInternal Boolean @default(false)` to Mission model

2. `apps/web/modules/saas/orders/components/OrderDetailClient.tsx`
   - Replace placeholder Operations tab with OperationsTabContent

3. `apps/web/app/api/vtc/missions/create-internal/route.ts`
   - New API endpoint for internal mission creation

4. `packages/i18n/translations/fr.json` & `en.json`
   - Add translation keys for new UI elements

### Database Migration

```prisma
// schema.prisma - Mission model addition
model Mission {
  // ... existing fields ...
  
  // Story 28.13: Internal (non-billable) missions
  isInternal Boolean @default(false)
  
  // ... rest of model ...
}
```

### API Schema

```typescript
// Request
const CreateInternalMissionSchema = z.object({
  orderId: z.string().cuid(),
  label: z.string().min(1).max(200),
  startAt: z.string().datetime(),
  vehicleCategoryId: z.string().cuid().optional(),
  notes: z.string().optional(),
});

// Response
interface CreateInternalMissionResponse {
  success: boolean;
  mission?: {
    id: string;
    status: string;
    startAt: string;
    isInternal: boolean;
    notes: string | null;
  };
  error?: string;
}
```

### Component Structure

```tsx
// InternalMissionModal.tsx
interface InternalMissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: (mission: Mission) => void;
}

// OperationsTabContent.tsx
interface OperationsTabContentProps {
  orderId: string;
}
```

## Test Cases

### Unit Tests (Vitest)

#### TC1: Internal Mission Creation Service

```typescript
describe("CreateInternalMission", () => {
  it("should create an internal mission with isInternal=true", async () => {
    // Given valid order data
    // When creating internal mission
    // Then mission.isInternal === true
    // And mission.quoteLineId === null
  });

  it("should reject if order does not exist", async () => {
    // Given invalid orderId
    // When creating internal mission
    // Then throws 404 error
  });
});
```

### E2E Tests (Browser MCP)

#### TC2: Create Internal Mission "Lavage Voiture"

1. Navigate to Order detail page
2. Go to Operations tab
3. Click "Add Internal Task" button
4. Fill in:
   - Label: "Lavage Voiture"
   - Date: tomorrow
   - Time: 09:00
5. Submit form
6. **Verify**: Toast shows success
7. **Verify**: Mission appears in list with "Internal" badge
8. **Verify**: Missions KPI count increments

#### TC3: Internal Mission NOT on Invoice

1. Create an internal mission
2. Go to Financial tab
3. Click "Generate Invoice"
4. **Verify**: Internal mission is NOT in selectable items
5. **Verify**: Only billable quote lines are available

## Dependencies

- **Story 28.3** (done): Dossier View UI with tabs (Operations tab skeleton)
- **Story 28.7** (done): SpawnMissionModal pattern to adapt
- **Story 28.8** (done): InvoiceFactory (to add exclusion logic)
- **Quote required**: Mission needs at least a default quote for the order

## Constraints

- Must use existing Shadcn UI components
- Must follow existing API patterns (Zod validation, tenant scoping)
- Must be responsive (mobile-friendly modal)
- Internal missions MUST be excluded from invoice generation
- Badge style must be consistent with existing badges

## Out of Scope

- Bulk internal mission creation
- Internal mission templates/presets
- Cost tracking for internal tasks (future enhancement)
- Integration with fleet maintenance module

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Prisma schema updated with migration
- [ ] API endpoint created and validated
- [ ] UI components implemented
- [ ] Translations added (fr/en)
- [ ] E2E test passing (Browser MCP)
- [ ] Invoice exclusion verified
- [ ] No TypeScript errors
- [ ] sprint-status.yaml updated to `review`

---

## Implementation Notes

### Operations Tab Enhancement

The Operations tab currently shows a placeholder. It needs to:

1. Fetch all missions for the order (including internal ones)
2. Display them in a table with:
   - Label (from sourceData or quoteLine.label)
   - Date/Time
   - Status badge
   - Internal badge (if isInternal)
   - Driver/Vehicle (if assigned)
3. Show "Add Internal Task" button
4. Link to dispatch for mission details

### Badge Styling

```tsx
// Internal mission badge
<Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
  {t("orders.operations.internalBadge")}
</Badge>
```

### Invoice Exclusion

In `GenerateInvoiceModal.tsx` or invoice line selection, filter out:

```typescript
// Exclude internal missions from invoice generation
const billableMissions = missions.filter(m => !m.isInternal);
```
