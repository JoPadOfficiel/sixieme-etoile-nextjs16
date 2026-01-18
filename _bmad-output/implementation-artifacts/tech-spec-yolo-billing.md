---
title: 'Flexible "Yolo Mode" Billing & Advanced Invoicing'
slug: 'yolo-billing-system'
created: '2026-01-18'
status: 'ready-for-dev'
stepsCompleted: []
tech_stack: ['Next.js 16', 'Prisma', 'React Hook Form', 'Zod', 'TanStack Table']
files_to_modify: ['packages/database/prisma/schema.prisma', 'apps/web/modules/saas/quotes/components/QuoteBuilder.tsx', 'apps/web/modules/saas/invoicing/components/InvoiceEditor.tsx', 'packages/api/src/routes/vtc/quotes.ts', 'packages/api/src/routes/vtc/invoices.ts']
---

# Tech-Spec: Flexible "Yolo Mode" Billing (Epic 26)

**Created:** 2026-01-18

## 1. Overview

### Problem Statement
The current Quote & Invoice system is overly rigid, distinguishing strictly between "Standard Trips" (calculated by engine), "Excursions", "Dispos", and "Off-Grid". This makes it impossible to mix types easily (e.g., adding a "Luggage Truck" line to a Standard Transfer) or to manually override computed details (e.g., changing a VAT rate or adding a license plate to the description) without breaking the data model. Users need a system that combines the flexibility of Excel/Word with the rigorous data structure required for Dispatch and Accounting.

### Proposed Solution: The "Hybrid Block" Architecture
We will implement a **Universal Service Block** architecture. Every line item on a Quote or Invoice will be a "Block" that follows a specific protocol:
1.  **Block Protocol**: Every block has `sourceData` (Operational/Engine Truth) and `displayData` (Commercial/User Truth).
2.  **Full Editability**: Users can edit `displayData` (Label, Price, VAT, Quantity) at will.
3.  **Data Integrity**: `sourceData` remains immutable unless explicitly "Detached" or re-calculated.
4.  **Consolidation**: We will deprecate `STAY` and `OFF_GRID` models, replacing them with a purely block-based composition (Grouping).

## 2. Technical Architecture

### 2.1 Data Model Changes (Prisma)

We will introduce the "Mask Pattern" to `QuoteLine` and `InvoiceLine`.

#### `QuoteLine` & `InvoiceLine` Models
Update these models to include:

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | Enum | `CALCULATED` (linked to source), `MANUAL` (pure text), `GROUP` (container) |
| `sourceData` | Json? | The "Engine Truth". Stores `{ origin, destination, distance, duration, basePrice, ... }`. Null for MANUAL lines. |
| `displayData` | Json | The "Commercial Truth". Stores `{ label, quantity, unitPrice, vatRate, total }`. Defaults to values from `sourceData` but fully editable. |
| `sortOrder` | Int | To maintain the block order (already exists, but critical here). |
| `parentId` | String? | To support `GROUP` nesting (e.g. "Day 1" container). |

#### `TripType` Enum Cleanup
*   **Deprecate/Remove**: `OFF_GRID`, `STAY` (These concepts are now handled by the Block composition itself).

### 2.2 The "Mask" Logic (Business Rules)

*   **Initialization**: When a Trip is added (via Grid/Map), `sourceData` is populated with engine results. `displayData` is deeper-copied from `sourceData`.
*   **Editing**:
    *   **Safe Edit**: User changes `displayData.label` or `displayData.unitPrice`. -> No effect on `sourceData`. Dispatcher still sees the real Route from `sourceData`.
    *   **Destructive Edit**: User changes a field that conflicts with `sourceData` operational logic (e.g. changing the Date). -> System warns: *"This will detach the line from the Pricing Engine. Dispatch details may be lost."*
    *   **Detach**: If confirmed, `type` switches to `MANUAL`, `sourceData` is cleared (or archived), and the line becomes pure text.

### 2.3 UX/UI: The Universal Editor

A "Notion-like" or "Airtable-like" interface for the Quote/Invoice Builder.

*   **Visuals**: Clean table rows. No heavy forms for simple edits.
*   **Interactions**:
    *   **Click-to-Edit**: Click a Description cell -> Input appears.
    *   **Slash Command**: Type `/` to insert a new Block (Transfer, Text, Group, Break).
    *   **Drag & Drop**: Reorder blocks (lines) easily.
*   **Indicators**:
    *   **Green/Orange/Red badges**: For Profitability (Margin), calculated as `(displayData.total - sourceData.internalCost) / displayData.total`.
    *   **"Manual" Icon**: Indicates a line has been overridden (Display != Source).

## 3. Implementation Plan

### Phase 1: Database Migration
*   **Step 1.1**: Create migration to add `sourceData`, `displayData`, `type`, `parentId` to `QuoteLine` and `InvoiceLine`.
*   **Step 1.2**: Write a script to migrate existing `QuoteLine`/`InvoiceLine` data into the `displayData` format (for backward compatibility).

### Phase 2: API & Backend
*   **Step 2.1**: Update Zod schemas in `packages/api/src/zod` to validate the new JSON structures.
*   **Step 2.2**: Update `quotes.ts` and `invoices.ts` routers to handle the new fields (CRUD operations).
*   **Step 2.3**: Implement the "Profitability Calculator" utility that compares `displayData` revenue vs `sourceData` cost.

### Phase 3: Frontend Components (The Editor)
*   **Step 3.1**: Create `UniversalLineItemRow` component.
    *   Handles local state for `displayData`.
    *   Managed "dirty" state for save.
*   **Step 3.2**: Create `UniversalBlockList` component.
    *   Manages the list of rows.
    *   Handles Drag & Drop reordering.
    *   Implement "Add Block" menu.
*   **Step 3.3**: Refactor `QuoteBuilder.tsx` to use `UniversalBlockList` instead of the rigid `TripForm`.

### Phase 4: Invoice Generation & PDF
*   **Step 4.1**: Update `pdf-generator` to read exclusively from `displayData` for rendering the document table.
*   **Step 4.2**: Ensure `sourceData` is used (if present) for the "Mission Order" PDF (Operations view).

## 4. Acceptance Criteria

*   **AC1 (Flexibility)**: I can add a purely text-based line item ("Bottle of Champagne") to ANY quote, regardless of trip type.
*   **AC2 (Override)**: I can rename a calculated "Paris -> Orly" transfer to "VIP Departure" without breaking the GPS route used for dispatch.
*   **AC3 (Versioning)**: When I edit a Quote Line, the UI clearly indicates if it's "Synced" (Calculated) or "Manual" (Overridden).
*   **AC4 (Profitability)**: Profitability indicators (Margin %) update in real-time as I manually change the Unit Price.
*   **AC5 (Grouping)**: I can group lines under a header (e.g. "Day 1") for visual organization on the PDF.
