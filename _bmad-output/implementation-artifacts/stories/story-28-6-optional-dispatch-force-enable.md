# Story 28.6: Optional Dispatch & Force Enable

## Story Info

- **Epic**: 28 - Order Management & Intelligent Spawning
- **Story ID**: 28-6
- **Title**: Optional Dispatch & Force Enable
- **Status**: in-progress
- **Branch**: `feature/28-6-optional-dispatch`
- **Created**: 2026-01-20
- **Agent**: Amelia (Developer)

---

## Description

As a **dispatcher/commercial user**, I want to **control which quote lines spawn operational missions** so that **I can exclude purely financial items (fees, supplements) from the dispatch workflow**.

This story adds a `dispatchable` boolean flag to `QuoteLine` that controls whether the SpawnService creates a Mission for that line when the Order is confirmed.

---

## Acceptance Criteria

### AC1: Schema Migration

- [ ] `QuoteLine` model has new field `dispatchable Boolean @default(true)`
- [ ] Migration runs without errors
- [ ] Existing QuoteLines default to `dispatchable: true` (backward compatible)

### AC2: SpawnService Filter

- [ ] `SpawnService.execute()` only spawns missions for lines where `dispatchable === true`
- [ ] Lines with `dispatchable: false` are logged as skipped
- [ ] GROUP lines: children inherit parent's dispatchable logic (if parent is false, skip all children)

### AC3: UI Toggle

- [ ] Quote line row displays a "Dispatch" toggle (Switch component)
- [ ] Toggle is visible for CALCULATED and GROUP lines (not MANUAL)
- [ ] Toggle state persists when saving the quote
- [ ] Toggle is disabled in read-only mode

### AC4: Visual Feedback

- [ ] Lines with `dispatchable: false` have visual indicator (muted style or badge)
- [ ] Tooltip explains the toggle purpose

---

## Technical Tasks

### T1: Prisma Schema Update

```prisma
model QuoteLine {
  // ... existing fields
  dispatchable Boolean @default(true) // Story 28.6: Control mission spawning
}
```

### T2: SpawnService Update

- Add filter: `where: { dispatchable: true }` in query
- Log skipped lines: `[SPAWN] Skipping line ${id}: dispatchable=false`

### T3: UI Component Update

- Add Switch to `UniversalLineItemRow` or `SortableQuoteLinesList`
- Wire to `onLineUpdate(id, { dispatchable: value })`
- Style: muted opacity when `dispatchable: false`

### T4: API/Store Update

- Ensure `dispatchable` is included in quote line mutations
- Update `useQuoteLinesStore` if needed

---

## Test Cases

### Unit Tests (Vitest)

1. **TC1**: SpawnService skips line with `dispatchable: false`

   - Input: Order with 2 lines (one dispatchable, one not)
   - Expected: Only 1 mission created

2. **TC2**: GROUP line with `dispatchable: false` skips all children

   - Input: GROUP line (dispatchable: false) with 2 CALCULATED children
   - Expected: 0 missions created

3. **TC3**: Default value is true
   - Input: New QuoteLine without explicit dispatchable
   - Expected: `dispatchable === true`

### E2E Tests (Browser MCP)

1. **TC4**: Toggle dispatch flag in UI
   - Navigate to quote editor
   - Toggle dispatch off for a line
   - Save and confirm order
   - Verify mission not created for that line

---

## Dependencies

- Story 28.4: SpawnService (✅ Done)
- Story 28.5: Group Spawning (✅ Done)
- Epic 26: Quote Lines UI (✅ Done)

---

## Files to Modify

- `packages/database/prisma/schema.prisma`
- `packages/api/src/services/spawn-service.ts`
- `apps/web/modules/saas/quotes/components/yolo/SortableQuoteLinesList.tsx`
- `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx`
- `apps/web/modules/saas/quotes/components/yolo/dnd-utils.ts`
- `apps/web/modules/saas/dispatch/services/SpawnService.test.ts`

---

## Definition of Done

- [ ] Schema migrated and deployed
- [ ] SpawnService respects dispatchable flag
- [ ] UI toggle functional
- [ ] Unit tests pass
- [ ] E2E test pass
- [ ] Code reviewed
- [ ] Documentation updated

---

## Implementation Log

### 2026-01-20 - Implementation Started

- Story created and specification complete
- Branch: `feature/28-6-optional-dispatch`

### 2026-01-20 - Implementation Complete

**Files Modified:**

1. `packages/database/prisma/schema.prisma` - Added `dispatchable Boolean @default(true)` to QuoteLine model
2. `packages/api/src/services/spawn-service.ts` - Added `dispatchable: true` filter in query
3. `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx` - Added Switch toggle for dispatch control
4. `apps/web/modules/saas/quotes/components/yolo/SortableQuoteLinesList.tsx` - Wired dispatchable props to UniversalLineItemRow
5. `apps/web/modules/saas/quotes/components/yolo/dnd-utils.ts` - Added dispatchable field to QuoteLine interface
6. `apps/web/modules/saas/dispatch/services/SpawnService.test.ts` - Added 2 unit tests for dispatchable behavior

**Tests Added:**

- TC1: `should skip lines with dispatchable: false` - Verifies non-dispatchable lines don't spawn missions
- TC2: `should default dispatchable to true when not specified` - Verifies backward compatibility

**Status:** Review
