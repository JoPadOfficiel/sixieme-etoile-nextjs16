# Story 28.7: Manual Item Handling UI

## Story Information

| Field                | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Story ID**         | 28-7                                              |
| **Epic**             | Epic 28 - Order Management & Intelligent Spawning |
| **Title**            | Manual Item Handling UI                           |
| **Status**           | ready-for-dev                                     |
| **Created**          | 2026-01-20                                        |
| **Priority**         | High                                              |
| **Estimated Points** | 5                                                 |

## Description

As an **operator**, I want to **manually create missions from quote lines that were not automatically spawned** (manual lines, extras, or items with `dispatchable: false`), so that I can **handle unforeseen operational needs** without being blocked by the automatic spawning logic.

### Business Context

The automatic spawning engine (Story 28.4-28.6) only creates missions for `CALCULATED` lines with `dispatchable: true`. However, operators need flexibility to:

- Create missions from `MANUAL` lines (e.g., "Extra Stop", "Parking Fee")
- Create missions from lines that were marked `dispatchable: false` but now need operational handling
- Complete missing information (date/time/vehicle) that manual lines may not have

### User Story

```
GIVEN I am viewing an Order in the Commercial tab
WHEN I see a quote line without a linked mission
THEN I should see a "Create Mission" button on that line
AND clicking it opens a modal to specify date/time/vehicle
AND submitting creates a mission linked to that line
```

## Acceptance Criteria

### AC1: Create Mission Button Visibility

- [ ] A "Create Mission" button appears on quote lines that:
  - Have no linked mission (`missionId` is null)
  - Are of type `MANUAL` OR have `dispatchable: false`
- [ ] Button is NOT shown on lines that already have a linked mission
- [ ] Button uses appropriate icon (e.g., `PlusCircle` or `Rocket`)

### AC2: SpawnMissionModal Form

- [ ] Modal opens when clicking "Create Mission"
- [ ] Form includes:
  - **Date** (DatePicker, required)
  - **Time** (TimePicker, required)
  - **Vehicle Category** (Select dropdown, required)
  - **Notes** (Textarea, optional)
- [ ] Form pre-fills with quote data if available (pickup date, vehicle category)
- [ ] Cancel button closes modal without action
- [ ] Submit button is disabled until required fields are filled

### AC3: API Endpoint

- [ ] `POST /api/vtc/missions/spawn-manual` endpoint created
- [ ] Request body includes: `quoteLineId`, `orderId`, `startAt`, `vehicleCategoryId`, `notes`
- [ ] Validates that the line exists and belongs to the order
- [ ] Validates that no mission already exists for this line
- [ ] Creates mission with status `PENDING`
- [ ] Links mission to `quoteLineId` and `orderId`
- [ ] Returns created mission data

### AC4: UI Refresh After Creation

- [ ] After successful creation, modal closes
- [ ] Toast notification confirms success
- [ ] The quote line row updates to show the linked mission
- [ ] The "Create Mission" button is replaced with a link to the mission
- [ ] KPI card for missions count updates

### AC5: Error Handling

- [ ] API errors display in toast notification
- [ ] Duplicate creation attempt shows appropriate error message
- [ ] Network errors are handled gracefully

## Technical Implementation

### Files to Create/Modify

#### New Files

1. `apps/web/modules/saas/orders/components/SpawnMissionModal.tsx`

   - Modal component with form
   - Uses Shadcn Dialog, DatePicker, Select, Textarea

2. `apps/web/app/api/vtc/missions/spawn-manual/route.ts`
   - POST handler for manual mission creation
   - Zod validation schema

#### Modified Files

1. `apps/web/modules/saas/orders/components/OrderDetailClient.tsx`

   - Add Commercial tab content with quote lines
   - Integrate SpawnMissionModal
   - Add refresh logic after mission creation

2. `packages/api/src/services/spawn-service.ts`
   - Add `spawnManual()` static method for single-line spawning

### API Schema

```typescript
// Request
const SpawnManualRequestSchema = z.object({
  quoteLineId: z.string().cuid(),
  orderId: z.string().cuid(),
  startAt: z.string().datetime(),
  vehicleCategoryId: z.string().cuid(),
  notes: z.string().optional(),
});

// Response
interface SpawnManualResponse {
  success: boolean;
  mission?: {
    id: string;
    status: string;
    startAt: string;
    quoteLineId: string;
  };
  error?: string;
}
```

### Component Structure

```tsx
// SpawnMissionModal.tsx
interface SpawnMissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteLine: {
    id: string;
    label: string;
    sourceData: unknown;
  };
  orderId: string;
  defaultDate?: Date;
  defaultVehicleCategoryId?: string;
  onSuccess: (mission: Mission) => void;
}
```

## Test Cases

### Unit Tests (Vitest)

#### TC1: SpawnService.spawnManual()

```typescript
describe("SpawnService.spawnManual", () => {
  it("should create a mission for a manual line", async () => {
    // Given a manual quote line without a mission
    // When spawnManual is called
    // Then a mission is created with PENDING status
  });

  it("should reject if line already has a mission", async () => {
    // Given a line with an existing mission
    // When spawnManual is called
    // Then it throws an error
  });

  it("should reject if line does not belong to order", async () => {
    // Given a line from a different order
    // When spawnManual is called
    // Then it throws an error
  });
});
```

### E2E Tests (Browser MCP)

#### TC2: Create Mission from Manual Line

1. Navigate to Order detail page
2. Go to Commercial tab
3. Find a manual line without mission
4. Click "Create Mission" button
5. Fill in date, time, vehicle category
6. Submit form
7. **Verify**: Toast shows success
8. **Verify**: Line now shows mission link
9. **Verify**: Missions KPI count increments

#### TC3: UI Refresh After Creation

1. Create a mission via modal
2. **Verify**: Modal closes automatically
3. **Verify**: Button changes to mission link
4. **Verify**: No page reload required (optimistic update)

## Dependencies

- **Story 28.6** (done): `dispatchable` field on QuoteLine
- **Story 28.4** (done): SpawnService base implementation
- **Story 28.3** (done): Dossier View UI with tabs

## Constraints

- Must use existing Shadcn UI components (Dialog, DatePicker, Select)
- Must follow existing API patterns (Zod validation, tenant scoping)
- Must be responsive (mobile-friendly modal)
- Must handle concurrent creation attempts gracefully

## Out of Scope

- Bulk mission creation (multiple lines at once)
- Mission editing (separate story)
- Driver/vehicle assignment (handled in Dispatch)

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests passing
- [ ] E2E test passing (Browser MCP)
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] Translations added for new UI strings
- [ ] sprint-status.yaml updated to `review`

---

## Implementation Notes

### SpawnService Extension

Add to `packages/api/src/services/spawn-service.ts`:

```typescript
/**
 * Story 28.7: Manual Mission Spawning
 * Creates a single mission from a quote line that wasn't auto-spawned
 */
static async spawnManual(params: {
  quoteLineId: string;
  orderId: string;
  organizationId: string;
  startAt: Date;
  vehicleCategoryId: string;
  notes?: string;
}): Promise<Mission> {
  // Implementation here
}
```

### Commercial Tab Enhancement

The Commercial tab currently shows a placeholder. It needs to:

1. Fetch quote lines for the order
2. Display them in a table/list
3. Show mission link status per line
4. Render "Create Mission" button for eligible lines
