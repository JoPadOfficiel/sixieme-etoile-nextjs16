# Story 26.5: UI - Universal Block Row Component

## Story Info

| Field | Value |
|-------|-------|
| **ID** | 26-5 |
| **Epic** | 26 - Flexible "Yolo Mode" Billing |
| **Title** | UI - Universal Block Row Component |
| **Status** | review |
| **Priority** | P0 - High (Foundation for Yolo Mode UI) |
| **Points** | 3 |
| **Assigned To** | Amelia (Developer) |
| **Branch** | `feature/26-5-ui-universal-row` |
| **Created** | 2026-01-18 |
| **Updated** | 2026-01-19 |

---

## Description

### Business Context

As an **operator**,  
I want a **versatile row component that changes appearance based on block type (CALCULATED, MANUAL, GROUP)**,  
So that **I can view and edit quote lines in a unified, dense interface similar to Notion/spreadsheets, without needing multiple table components.**

### Technical Summary

This story creates the `UniversalLineItemRow` component - the visual building block of the "Yolo Mode" quote editor. This component:
- Receives data and callbacks via props
- Renders differently based on `line.type`
- Handles visual presentation with inline editing
- Supports indentation for hierarchical display
- Integrates with SlashMenu for quick block insertion
- Supports detach logic for CALCULATED lines

### Why This Matters

- **Foundation**: This component is required before `SortableQuoteLinesList` (Story 26.7) and all other Yolo UI stories
- **Unified Experience**: Replaces fragmented UI patterns (separate STAY, OFF_GRID, Transfer views)
- **Operator Efficiency**: Dense, inline editing reduces clicks and improves workflow

---

## Acceptance Criteria

### AC1: Component Structure Created & Exported ✅
- [x] Component `UniversalLineItemRow` exists at `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx`
- [x] Component is properly exported via `components/yolo/index.ts`
- [x] TypeScript types are strictly defined (`LineItemType`, `DisplayData`, `SourceData`)

### AC2: Type-Based Rendering (CALCULATED) ✅
- [x] If `line.type === "CALCULATED"`:
  - Renders a **LinkIcon** (lucide) in green to indicate linked data
  - Tooltip provider shows "Linked to pricing engine" or route summary from `sourceData`
  - Standard inputs for Label, Qty, Unit Price, VAT are visible

### AC3: Type-Based Rendering (MANUAL) ✅
- [x] If `line.type === "MANUAL"`:
  - Renders an **UnlinkIcon** (lucide) in gray
  - Standard inputs identical to CALCULATED but no "linked" indicator
  - Visually simpler/lighter appearance

### AC4: Type-Based Rendering (GROUP) ✅
- [x] If `line.type === "GROUP"`:
  - Renders as a **Section Header** with distinct muted background
  - Shows **ChevronDown/Right** toggle icon for expand/collapse
  - Label is semibold
  - Displays group total
  - `onToggleExpand` callback fires when toggle clicked
  - Children render when expanded, hidden when collapsed

### AC5: Indentation Based on Depth ✅
- [x] Component accepts `depth: number` prop (0 = root level)
- [x] Left padding calculated as `depth * 24px` (INDENT_SIZE_PX constant)
- [x] Visual hierarchy is immediately clear

### AC6: Input Fields Present & Functional ✅
- [x] Label field (InlineInput - editable text)
- [x] Quantity field (InlineInput - number, right-aligned)
- [x] Unit Price field (InlineInput - number with currency formatting)
- [x] VAT Rate field (InlineInput - number with % suffix)
- [x] Total Price (read-only display, formatted)
- [x] All inputs trigger `onDisplayDataChange(field, value)` on change

### AC7: Drag Handle Visible on Hover ✅
- [x] GripVerticalIcon appears on row hover
- [x] Cursor changes on hover (`cursor-grab`)
- [x] dragHandleProps spread onto handle element for dnd-kit integration

---

## Props Interface

```typescript
/** Line item type enum matching Prisma schema */
export type LineItemType = "CALCULATED" | "MANUAL" | "GROUP";

/** Display data structure for line items */
export interface DisplayData {
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

/** Source data structure (operational truth) */
export interface SourceData {
  origin?: string;
  destination?: string;
  distance?: number;
  duration?: number;
  basePrice?: number;
  internalCost?: number;
  pickupAt?: string;
  dropoffAt?: string;
  [key: string]: unknown;
}

/** Props for UniversalLineItemRow */
export interface UniversalLineItemRowProps {
  id: string;
  type: LineItemType;
  displayData: DisplayData;
  sourceData?: SourceData | null;
  depth?: number;
  isExpanded?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  currency?: string;
  onDisplayDataChange?: (field: keyof DisplayData, value: string | number) => void;
  onToggleExpand?: () => void;
  onDetach?: () => void;
  onInsert?: (type: LineItemType, data?: Record<string, unknown>) => void;
  dragHandleProps?: Record<string, unknown>;
  children?: React.ReactNode;
}
```

---

## Test Results

### Unit Tests (Vitest + React Testing Library)

**File:** `apps/web/modules/saas/quotes/components/yolo/__tests__/UniversalLineItemRow.test.tsx`

| Test | Status |
|------|--------|
| should render MANUAL type correctly | ✅ PASS |
| should render CALCULATED type with link icon | ✅ PASS |
| should render GROUP type with expand/collapse | ✅ PASS |
| should allow editing label via InlineInput | ✅ PASS |
| should not allow editing when disabled | ✅ PASS |
| should convert numeric strings correctly | ✅ PASS |
| should prevent negative values | ✅ PASS |
| should handle French decimal format (comma) | ✅ PASS |
| should call onToggleExpand when clicking expand button | ✅ PASS |
| should render children when expanded | ✅ PASS |
| should NOT render children when collapsed | ✅ PASS |
| should show warning toast when label is significantly changed | ✅ PASS |
| should NOT show warning toast for minor label changes | ✅ PASS |

**Total: 13/13 tests passing**

---

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx` | EXISTS | Main component (630 lines) |
| `apps/web/modules/saas/quotes/components/yolo/__tests__/UniversalLineItemRow.test.tsx` | MODIFIED | Fixed QueryClient mock |
| `apps/web/modules/saas/quotes/components/yolo/index.ts` | EXISTS | Exports component |
| `apps/web/modules/saas/quotes/components/UniversalLineItemRow.tsx` | DELETED | Removed legacy duplicate |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | UPDATED | Status → review |

---

## Definition of Done

- [x] Component implemented with all AC met
- [x] All test cases pass (13/13 Vitest)
- [x] No TypeScript errors
- [x] Exports added to module index
- [x] Story file updated with implementation details
- [x] Duplicate legacy component removed
- [x] Sprint status updated to `review`
- [ ] Code reviewed and approved

---

## Implementation Log

| Date | Author | Action |
|------|--------|--------|
| 2026-01-18 | Bob (SM) | Story created from Epic 26 |
| 2026-01-19 | Amelia (Dev) | Implementation verified, tests fixed |
| 2026-01-19 | Amelia (Dev) | Legacy duplicate removed, story marked review |

---

## Integration Notes

### Component Already Integrates With:
- **Story 26.6** (Click-to-Edit): Uses `InlineInput` component
- **Story 26.8** (Slash Menu): Integrates `SlashMenu` on `/` trigger
- **Story 26.9** (Detach Logic): Uses `DetachWarningModal` and `detach-utils`
- **Story 26.13** (Templates): Uses `useBlockTemplateActions` for "Save as Template"

### Used By:
- `SortableQuoteLine.tsx` - Wraps this component for drag-drop
- `SortableQuoteLinesList.tsx` - Renders list of these components
- `YoloQuoteEditor.tsx` - Main editor using this component

---

## Git Commands

```bash
# Current branch
git branch
# feature/26-5-ui-universal-row

# Stage changes
git add -A

# Commit
git commit -m "feat(quotes): Story 26.5 - Universal Block Row Component

- UniversalLineItemRow component with type-based rendering (CALCULATED/MANUAL/GROUP)
- InlineInput integration for label, qty, price, VAT fields
- Indentation support via depth prop
- Drag handle integration for dnd-kit
- SlashMenu integration for quick block insertion
- Detach logic for CALCULATED lines
- 13/13 unit tests passing

Refs: #26-5"

# Push
git push -u origin feature/26-5-ui-universal-row
```
