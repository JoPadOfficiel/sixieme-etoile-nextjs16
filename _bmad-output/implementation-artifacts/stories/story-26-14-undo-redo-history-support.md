---
title: "Story 26.14 - Undo Redo History Support"
description: "Implement Undo/Redo functionality for the Yolo Mode quote editor using Zustand and Zundo."
status: "review"
priority: "High"
---

## Description
As an **operator**, I want to undo my last action if I made a mistake (text edit, reorder, block deletion), so that I don't lose work during complex editing sessions.

This story implements the state management layer for the "Yolo" flexible billing blocks, utilizing **Zustand** for state and **Zundo** for temporal (undo/redo) capability. It essentially wraps the `QuoteLine[]` state.

## Acceptance Criteria

### AC1: State Management with History
- **Given** the quote editor is active,
- **When** I make a change (edit text, move line, delete line, add line),
- **Then** the new state is pushed to the history stack.
- **And** the history stack is limited to **50 steps** to prevent memory issues.

### AC2: Undo Action
- **Given** I have made at least one change,
- **When** I press `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux) OR click an "Undo" button,
- **Then** the state reverts to the previous version.
- **And** the UI updates instantly.

### AC3: Redo Action
- **Given** I have undone a change,
- **When** I press `Cmd+Shift+Z` (Mac) or `Ctrl+Y` (Windows) OR click a "Redo" button,
- **Then** the state reapplies the change.

### AC4: Integration with Dnd & Inputs
- **Given** the `SortableQuoteLinesList` component,
- **When** the `onLinesChange` callback fires,
- **Then** the store updates and a history snapshot is taken.
- **Note**: Zundo handles this automatically if configured correctly.

## Technical Details
- **Library**: `zustand` (State), `zundo` (Middleware).
- **Store Path**: `apps/web/modules/saas/quotes/stores/useQuoteLinesStore.ts`
- **Hook**: `useQuoteLinesStore`
- **Actions**:
  - `setLines(lines: QuoteLine[])`
  - `updateLine(id, data)`
  - `undo()` (from middleware)
  - `redo()` (from middleware)

## Implementation Notes
- Created `useQuoteLinesStore` with `zundo` middleware (max 50 steps).
- Created `YoloQuoteEditor` component acting as the controller for `SortableQuoteLinesList`.
- Implemented keyboard shortcuts (Cmd+Z, Cmd+Shift+Z, Ctrl+Y) in `YoloQuoteEditor`.
- Added visual Undo/Redo buttons in `YoloQuoteEditor` toolbar.
- Verified logic with Vitest unit tests.

## Test Strategy
- **Unit Tests (Vitest)**:
  - `apps/web/modules/saas/quotes/stores/__tests__/useQuoteLinesStore.test.ts`
  - Tests initialization, update history tracking, undo, redo, and history limit.
  - **Status**: PASSED
