# Adversarial Code Review: Story 28.13 - Ad-Hoc Free Missions

## 1. Review Summary
**Story:** Story 28.13 - Ad-Hoc Free Missions
**Reviewer:** Senior Developer Agent
**Date:** 2026-01-21
**Status:** 🔴 CHANGES REQUESTED

## 2. Git vs Story Discrepancies
| Status | File | Discrepancy |
| :--- | :--- | :--- |
| 🔴 | `apps/web/app/api/vtc/missions/create-internal/route.ts` | **MISSING**. Story claims this file should be created, but it does not exist. Implementation found in `packages/api/src/routes/vtc/missions.ts` (Hono). |
| 🟡 | `packages/api/src/routes/vtc/missions.ts` | **UNDOCUMENTED CHANGE**. File was modified to add the endpoint, but not listed in "Modified Files". |

## 3. Findings

### 🔴 CRITICAL ISSUES (Must Fix)

#### 1. Missing Unit Tests for `SpawnService.createInternal`
- **Severity**: Critical
- **Location**: `packages/api/src/services/spawn-service.ts`
- **Description**: The story Acceptance Criteria requires "Unit tests cover SpawnService.createInternal". No tests were found in `packages/api/src/__tests__/`. The implementation is completely untested.
- **Proof**: `ls packages/api/src/__tests__` shows only `partial-invoice.test.ts` and `pending-charges.test.ts`.

### 🟡 MEDIUM ISSUES (Should Fix)

#### 2. API Architecture Deviation
- **Severity**: Medium
- **Location**: `packages/api/src/routes/vtc/missions.ts` vs Story Spec
- **Description**: The story explicitly requested a Next.js API route (`apps/web/app/api/...`), but the implementation correctly used the Hono architecture in `packages/api`. While the implementation is architecturally superior, the story documentation is now incorrect and misleading.
- **Recommendation**: Update the story file to reflect the actual Hono implementation. Do NOT revert to Next.js API routes.

## 4. Acceptance Criteria Verification

| AC | Status | Notes |
| :--- | :--- | :--- |
| AC1: Add Internal Task Button | ✅ PASS | Implemented in `OperationsTabContent.tsx`. |
| AC2: Internal Mission Modal | ✅ PASS | Implemented in `InternalMissionModal.tsx`. |
| AC3: DB Schema Update | ✅ PASS | `isInternal` added to `Mission` model. |
| AC4: API Endpoint | ⚠️ PARTIAL | implemented in Hono, not Next.js. **Missing Validation Tests**. |
| AC5: Visual Badge | ✅ PASS | Implemented in `OperationsTabContent.tsx`. |
| AC6: Invoice Exclusion | ✅ PASS | Verified in `pending-charges.ts` (line 115) and implicitly via `quoteLineId: null`. |
| AC7: UI Refresh | ✅ PASS | Implemented in `OperationsTabContent.tsx` via `refetch()`. |

## 5. Decision
**🔴 CHANGES REQUESTED**

The implementation is functionally sound but lacks mandatory unit tests. The architectural deviation is acceptable (even preferred) but requires documentation updates to avoid confusion.

### Action Items
1. **Create Unit Tests**: Add `packages/api/src/__tests__/spawn-service.test.ts` to cover `createInternal`.
2. **Update Story**: Correct the "Files to Create/Modify" section to reflect the Hono implementation.
3. **Sync Sprint Status**: Ensure sprint status reflects the current state.
