# Brainstorming & Technical Analysis: Epic 28 Refactoring

## 1. Problem Confirmation (The "Smoking Gun")
We have analyzed the codebase and confirmed the root cause of the behavior described by the user.

### A. Backend Spawning Logic (`SpawnService`)
**File**: `packages/api/src/services/spawn-service.ts`
**Issue**: The `buildMissionData` method (lines 555-628) strongly couples a Mission's location data to the **Quote Header**.
```typescript
sourceData: {
    pickupAddress: quote.pickupAddress, // <--- ERROR: Always uses the Quote's main address
    // ...
}
```
**Consequence**: Even if a Quote contains 10 different lines representing different trips, the system spawns matches based on the `quote` header. This explains why "all courses look the same" or are incomplete.

### B. Frontend Cart Logic (`YoloQuoteEditor`)
**File**: `apps/web/modules/saas/quotes/components/yolo/YoloQuoteEditor.tsx`
**Issue**: The editor allows adding "Manual Lines" or "Groups" but lacks a robust "Add Trip to Cart" feature that pushes the full *Trip Source Data* (pick/drop/pax/vehicle) into the `QuoteLine` structure.
**Consequence**: The "Shopping Cart" is currently just a list of price items, not a list of operational trips.

## 2. Refactoring Plan (The "Fix")

### Phase 1: Backend Intelligence (The "Smart Spawn")
**Objective**: `SpawnService` must be smart enough to read trip data from `QuoteLine` if it exists.
**Action**:
1. Update `SpawnService.buildMissionData` to verify if `line.sourceData` contains valid trip properties (`pickupAddress`, `pickupAt`, etc.).
2. **Logic Override**:
   - IF `line.sourceData.hasTripData` THEN use `line.sourceData`.
   - ELSE use `quote.headerData` (Backward compatibility for legacy quotes).
3. **Data Model**: Ensure `QuoteLine.sourceData` schema in Zod matches the validation needs.

### Phase 2: Frontend "Real" Shopping Cart
**Objective**: The "Add to Cart" button in the Quote Builder must capture the *current* configuration state and push it to a new `QuoteLine`.
**Action**:
1. Modify `CreateQuoteCockpit` (or parent component).
2. When "Add to Cart" is clicked:
   - Capture `pickupAddress`, `dropoffAddress`, `date`, `vehicle` from the Form State.
   - Create a `QuoteLine` of type `CALCULATED`.
   - Inject the Form State into `sourceData`.
   - **Crucially**: Reset the Form State (allow user to configure Trip #2).
   - Display the new line in `YoloQuoteEditor` with a distinct icon indicating it's a "Full Trip".

### Phase 3: Order & Dispatch Alignment
**Objective**: Ensure the `Order` view understands that it contains multiple Missions.
**Action**:
1. The `Mission` entity already supports this (N missions per Order).
2. Once Phase 1 is fixed, `SpawnService` will distinct missions.
3. Verify `Dispatch` view correctly differentiates them (it should automaticall if `sourceData` is correct).

## 3. Immediate Next Steps (Proposed)
1.  **Refactor `SpawnService.ts`**: This is the critical fix to ensure backend logic is sound.
2.  **Create New Story**: `Story 29.1: Smart Shopping Cart Integration` to manage the Frontend "Add to Cart" logic.

## 4. Question Validation
-   Does the user agree to maintain `Quote.header` as a "fallback" or "summary" but allow `QuoteLine` to be the "Master" for multi-trip quotes? (Recommendation: **YES**).
