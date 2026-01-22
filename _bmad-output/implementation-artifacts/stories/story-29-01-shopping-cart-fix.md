# Story 29.1: Fix Shopping Cart Persistence & Pricing Aggregation

**Epic:** Epic 29 – Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)  
**Author:** JoPad (via BMAD Orchestrator)  
**Status:** Done  
**Priority:** Critical (P0 - Foundation)  
**Estimated Points:** 5  
**Branch:** `feature/29-1-cart-persistence`

---

## Goal

Ensure that multi-item quotes (Shopping Cart / Yolo Mode) are correctly persisted in the database as **distinct `QuoteLine` items**, with **complete operational metadata** in `sourceData`, and that the **total price is accurately aggregated** at the Quote header level.

This is the **data foundation** for Epic 29. If this fails, all downstream features (Gantt, Invoices, Missions) will be incorrect.

---

## Problem Statement

Currently, saving a multi-item quote via `POST /api/vtc/quotes` results in:

1. **Single Line Saved:** Only the "primary" trip data is stored; additional cart items are ignored.
2. **Price Mismatch:** `Quote.finalPrice` reflects only the primary item, not the sum of all cart items.
3. **Lost Metadata:** Waypoints, distances, and durations for non-primary items are not persisted.
4. **"No Pricing Data" Errors:** When viewing the quote later, `sourceData` is missing or malformed for lines.

**Root Cause:** The `quotes.ts` POST handler ignores the `lines` array sent by the frontend and only creates the Quote header from `formData`.

---

## Requirements (Functional)

| ID        | Requirement                                             |
| --------- | ------------------------------------------------------- |
| **FR150** | Shopping Cart model - Multiple items in a single quote  |
| **FR152** | Real-time Total Price - Sum of all line items           |
| **FR156** | Full persistence of cart state - All metadata preserved |

---

## Acceptance Criteria

### AC1: Database Persistence - Distinct Lines

- [x] **AC1.1:** When a quote with N items is saved, the `QuoteLine` table MUST contain N distinct records linked to the `quoteId`.
- [x] **AC1.2:** Each `QuoteLine.sourceData` MUST contain the complete operational context:
  - `origin` (pickup address)
  - `destination` (dropoff address)
  - `pickupLatitude`, `pickupLongitude`
  - `dropoffLatitude`, `dropoffLongitude`
  - `distance` (km)
  - `duration` (minutes)
  - `pickupAt` (ISO datetime)
  - `vehicleCategoryId`
  - `tripType`
  - `formData` (full snapshot for hydration)
  - `pricingResult` (calculation details)
- [x] **AC1.3:** Lines MUST be persisted with correct `sortOrder` to maintain visual sequence.

### AC2: Price Aggregation

- [x] **AC2.1:** `Quote.finalPrice` = Σ(`QuoteLine.totalPrice`) for all lines.
- [x] **AC2.2:** `Quote.internalCost` = Σ(`QuoteLine` internal costs from sourceData) if available.
- [x] **AC2.3:** `Quote.marginPercent` = calculated from aggregated values.
- [x] **AC2.4:** The Quotes list view displays the correct aggregated total.

### AC3: Data Integrity

- [x] **AC3.1:** Legacy single-item quotes (no `lines` array) continue to work as 1-line quotes.
- [x] **AC3.2:** API auto-calculates header totals from lines (no manual mismatch possible).
- [x] **AC3.3:** Transaction ensures atomicity: Quote + all Lines created together or none.

### AC4: API Contract

- [x] **AC4.1:** `POST /api/vtc/quotes` accepts `lines[]` array in payload.
- [x] **AC4.2:** Response includes the created `lines` with their generated IDs.
- [x] **AC4.3:** `GET /api/vtc/quotes/:id` returns Quote with `lines` relation populated.

---

## Technical Design

### Files to Modify

| File                                                 | Changes                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| `packages/api/src/routes/vtc/quotes.ts`              | Modify POST handler to process `lines` array |
| `packages/database/src/schemas/hybrid-blocks.ts`     | Verify `sourceData` schema (already exists)  |

### Implementation Steps

1. **Modify `createQuoteSchema`** in `quotes.ts`:

   - The `lines` field already exists but is typed as `z.array(z.record(z.unknown()))`.
   - Keep it flexible but document expected structure.

2. **Modify POST handler** in `quotes.ts`:

   ```typescript
   // Inside the POST handler, after creating the Quote header:

   // If lines provided (Yolo Mode), create them
   if (data.lines && data.lines.length > 0) {
     const linesToCreate = data.lines.map((line, index) => ({
       quoteId: quote.id,
       type: line.type || "CALCULATED",
       label: line.label,
       description: line.description,
       sourceData: line.sourceData, // CRITICAL: Full operational metadata
       displayData: line.displayData,
       quantity: line.quantity || 1,
       unitPrice: line.unitPrice || line.totalPrice,
       totalPrice: line.totalPrice,
       vatRate: line.vatRate || 10,
       sortOrder: index,
       dispatchable: line.dispatchable ?? true,
     }));

     await db.quoteLine.createMany({ data: linesToCreate });

     // Recalculate Quote totals from lines
     const totalPrice = linesToCreate.reduce((sum, l) => sum + l.totalPrice, 0);
     await db.quote.update({
       where: { id: quote.id },
       data: { finalPrice: totalPrice },
     });
   }
   ```

3. **Ensure GET handler** includes lines:
   ```typescript
   include: {
     lines: { orderBy: { sortOrder: 'asc' } },
     // ... other relations
   }
   ```

### Data Flow

```
Frontend (CreateQuoteCockpit)
    │
    ├── User adds items to cart (quoteLines state)
    │
    ├── handleSaveQuote() → createQuoteMutation.mutate(linesToSubmit)
    │
    └── POST /api/vtc/quotes { ...formData, lines: [...] }
            │
            ▼
Backend (quotes.ts POST handler)
    │
    ├── 1. Create Quote header (container)
    │
    ├── 2. Loop over lines[]
    │       └── Create QuoteLine with full sourceData
    │
    ├── 3. Calculate totals: finalPrice = Σ(line.totalPrice)
    │
    └── 4. Update Quote with aggregated totals
            │
            ▼
Database
    ├── Quote { id, finalPrice: 450, ... }
    └── QuoteLine[]
        ├── { id: 1, totalPrice: 150, sourceData: {...} }
        ├── { id: 2, totalPrice: 200, sourceData: {...} }
        └── { id: 3, totalPrice: 100, sourceData: {...} }
```

---

## Test Cases

### TC1: Multi-Item Quote Creation

**Given:** User creates a quote with 3 items (Transfer + Dispo + Excursion)  
**When:** POST /api/vtc/quotes with `lines: [item1, item2, item3]`  
**Then:**

- 3 `QuoteLine` records created in DB
- Each line has complete `sourceData`
- `Quote.finalPrice` = sum of 3 line prices

### TC2: Single-Item Quote (Legacy)

**Given:** User creates a quote without `lines` array  
**When:** POST /api/vtc/quotes with only formData  
**Then:**

- Quote created successfully (backward compatible)
- No QuoteLines created (or 1 implicit line)

### TC3: Price Aggregation Accuracy

**Given:** Lines with prices [150€, 200€, 100€]  
**When:** Quote is saved  
**Then:** `Quote.finalPrice` = 450€ exactly

### TC4: SourceData Completeness

**Given:** A Transfer item with pickup CDG, dropoff Paris  
**When:** Line is saved  
**Then:** `sourceData` contains:

- `origin: "Aéroport CDG..."`
- `destination: "Paris..."`
- `pickupLatitude`, `pickupLongitude`
- `dropoffLatitude`, `dropoffLongitude`
- `distance`, `duration`
- `formData` snapshot

### TC5: Quote Detail View

**Given:** A saved multi-item quote  
**When:** GET /api/vtc/quotes/:id  
**Then:** Response includes `lines[]` with all data

---

## Out of Scope

- UI changes to CreateQuoteCockpit (already sends lines correctly)
- Edit mode hydration (Story 29.3)
- Mission spawning (Story 29.4)
- Invoice generation (Story 29.5)

---

## Dependencies

- **Upstream:** None (this is the foundation)
- **Downstream:** Stories 29.2 through 29.8 depend on correct line persistence

---

## Definition of Done

- [x] All Acceptance Criteria verified
- [x] All Test Cases pass (5/5 tests passing - TC5 added in code review)
- [x] Code reviewed (Story 29.1 code review completed 2026-01-22)
- [x] No regressions in existing quote functionality
- [x] sprint-status.yaml updated to `done`

---

## Implementation Summary

### Files Modified

- `packages/api/src/routes/vtc/quotes.ts` - POST handler with QuoteLine creation and price aggregation

### Files Created

- `packages/api/src/routes/vtc/__tests__/quotes-cart-persistence.test.ts` - Unit tests for Story 29.1

### Key Changes

1. **Transaction-based creation**: Quote + QuoteLines created atomically using `db.$transaction`
2. **Price aggregation**: `finalPrice` calculated from sum of line `totalPrice` values
3. **Internal cost aggregation**: Extracted from `sourceData.pricingResult.internalCost` if available
4. **Margin calculation**: Auto-calculated from aggregated values
5. **Lines in response**: GET single quote now includes `lines` relation

### Tests Executed

- TC1: Multi-item quote creation (3 lines) ✅
- TC2: Legacy single-item quote ✅
- TC3: Price aggregation accuracy ✅
- TC4: SourceData completeness ✅
