# Story 19.15: Decompose Pricing Engine into Modular Architecture

Status: ready-for-dev

## Story

As a **developer**,
I want **the pricing engine decomposed into smaller, focused modules**,
so that **the codebase is more maintainable, testable, and easier to extend with new features**.

## Context

The current `pricing-engine.ts` file has grown to **7569 lines** and contains:

- Type definitions (~500 lines)
- Cost calculation functions (~400 lines)
- Zone resolution and multiplier logic (~300 lines)
- Grid matching (ZoneRoute, Excursion, Dispo) (~600 lines)
- Dynamic pricing calculation (~500 lines)
- Multiplier application (advanced rates, seasonal) (~400 lines)
- Shadow calculation (segments A/B/C) (~300 lines)
- Profitability indicators (~200 lines)
- Trip type specific pricing (~300 lines)
- RSE compliance integration (~200 lines)
- Main calculatePrice function and helpers (~2000+ lines)
- Various utility functions (~1500+ lines)

This monolithic structure makes it difficult to:

1. Locate specific functionality
2. Write focused unit tests
3. Understand dependencies between components
4. Add new features without risk of regression

## Acceptance Criteria

### AC1: Module Structure Created

- [ ] New directory `packages/api/src/services/pricing/` created
- [ ] All modules follow single-responsibility principle
- [ ] No circular dependencies between modules

### AC2: Type Definitions Extracted

- [ ] All types, interfaces, and enums moved to `types.ts`
- [ ] All constants and default values moved to `constants.ts`
- [ ] Types are properly exported and importable

### AC3: Cost Calculator Module

- [ ] `cost-calculator.ts` contains all cost calculation functions:
  - `calculateFuelCost`
  - `calculateTollCost`
  - `calculateWearCost`
  - `calculateDriverCost`
  - `calculateCostBreakdown`
  - `calculateCostBreakdownWithTolls`
  - `calculateCostBreakdownWithTco`
  - `calculateInternalCost`

### AC4: Zone Resolver Module

- [ ] `zone-resolver.ts` contains zone-related functions:
  - `applyZoneMultiplier`
  - `calculateEffectiveZoneMultiplier`
  - `calculateZoneSurcharges`
  - Zone conflict resolution logic

### AC5: Grid Matcher Module

- [ ] `grid-matcher.ts` contains grid matching functions:
  - `matchZoneRoute` / `matchZoneRouteWithDetails`
  - `matchExcursionPackage` / `matchExcursionPackageWithDetails`
  - `matchDispoPackage` / `matchDispoPackageWithDetails`
  - `getRouteDisplayName`

### AC6: Dynamic Pricing Module

- [ ] `dynamic-pricing.ts` contains:
  - `calculateDynamicBasePrice`
  - `calculateDynamicPrice`
  - `resolveRates`
  - Rate fallback chain logic

### AC7: Multiplier Engine Module

- [ ] `multiplier-engine.ts` contains:
  - `applyAllMultipliers`
  - `applyAdvancedRate`
  - `applySeasonalMultiplier`
  - `applyVehicleCategoryMultiplier`
  - `applyClientDifficultyMultiplier`
  - `applyRoundTripMultiplier`

### AC8: Shadow Calculator Module

- [ ] `shadow-calculator.ts` contains:
  - `calculateShadowSegments`
  - Segment A/B/C calculation logic
  - `ShadowCalculationInput` handling

### AC9: Profitability Module

- [ ] `profitability.ts` contains:
  - `calculateProfitabilityIndicator`
  - `getProfitabilityIndicatorData`
  - `getThresholdsFromSettings`
  - Margin calculation utilities

### AC10: Trip Type Pricing Module

- [ ] `trip-type-pricing.ts` contains:
  - `applyTripTypePricing`
  - `calculateExcursionReturnCost`
  - Transfer, Excursion, Dispo specific logic

### AC11: Main Engine Module

- [ ] `main-engine.ts` contains:
  - `calculatePrice` (main function)
  - `buildDynamicResult`
  - `buildGridResult`
  - `validatePriceOverride`
  - `applyPriceOverride`

### AC12: Backward Compatibility

- [ ] `index.ts` re-exports all public functions and types
- [ ] Original `pricing-engine.ts` replaced with re-export from new module
- [ ] All existing imports continue to work without changes
- [ ] No breaking changes to API routes

### AC13: Tests Pass

- [ ] All existing pricing tests pass without modification
- [ ] New module imports work correctly
- [ ] TypeScript compilation succeeds with no errors

## Tasks / Subtasks

- [ ] **Task 1: Create Module Directory Structure** (AC: #1)

  - [ ] Create `packages/api/src/services/pricing/` directory
  - [ ] Create empty module files with proper headers

- [ ] **Task 2: Extract Types and Constants** (AC: #2)

  - [ ] Move all type definitions to `types.ts`
  - [ ] Move all constants to `constants.ts`
  - [ ] Update imports in original file

- [ ] **Task 3: Extract Cost Calculator** (AC: #3)

  - [ ] Move cost calculation functions to `cost-calculator.ts`
  - [ ] Add proper imports from types
  - [ ] Export all public functions

- [ ] **Task 4: Extract Zone Resolver** (AC: #4)

  - [ ] Move zone multiplier functions to `zone-resolver.ts`
  - [ ] Move zone surcharge calculation
  - [ ] Handle dependencies on geo-utils

- [ ] **Task 5: Extract Grid Matcher** (AC: #5)

  - [ ] Move grid matching functions to `grid-matcher.ts`
  - [ ] Include route, excursion, and dispo matchers
  - [ ] Handle partner contract data types

- [ ] **Task 6: Extract Dynamic Pricing** (AC: #6)

  - [ ] Move dynamic pricing functions to `dynamic-pricing.ts`
  - [ ] Include rate resolution logic
  - [ ] Handle category rate fallback

- [ ] **Task 7: Extract Multiplier Engine** (AC: #7)

  - [ ] Move all multiplier functions to `multiplier-engine.ts`
  - [ ] Include advanced rates, seasonal, category, difficulty
  - [ ] Handle round trip multiplier

- [ ] **Task 8: Extract Shadow Calculator** (AC: #8)

  - [ ] Move shadow calculation to `shadow-calculator.ts`
  - [ ] Include segment A/B/C logic
  - [ ] Handle routing source tracking

- [ ] **Task 9: Extract Profitability** (AC: #9)

  - [ ] Move profitability functions to `profitability.ts`
  - [ ] Include indicator calculation
  - [ ] Include threshold management

- [ ] **Task 10: Extract Trip Type Pricing** (AC: #10)

  - [ ] Move trip type logic to `trip-type-pricing.ts`
  - [ ] Include excursion return cost
  - [ ] Handle transfer/excursion/dispo differentiation

- [ ] **Task 11: Create Main Engine** (AC: #11)

  - [ ] Move calculatePrice to `main-engine.ts`
  - [ ] Move result builders
  - [ ] Import from all other modules

- [ ] **Task 12: Create Index with Re-exports** (AC: #12)

  - [ ] Create `index.ts` with all public exports
  - [ ] Update original `pricing-engine.ts` to re-export
  - [ ] Verify backward compatibility

- [ ] **Task 13: Verify and Test** (AC: #13)
  - [ ] Run TypeScript compilation
  - [ ] Run existing pricing tests
  - [ ] Verify no circular dependencies

## Dev Notes

### Architecture Patterns

- **Single Responsibility**: Each module handles one concern
- **Dependency Injection**: Pass dependencies explicitly, avoid global state
- **Re-export Pattern**: Use barrel exports for backward compatibility

### File Dependencies (Dependency Graph)

```
types.ts ← (no dependencies)
constants.ts ← types.ts
cost-calculator.ts ← types.ts, constants.ts
zone-resolver.ts ← types.ts, geo-utils
grid-matcher.ts ← types.ts
dynamic-pricing.ts ← types.ts, constants.ts
multiplier-engine.ts ← types.ts
shadow-calculator.ts ← types.ts, cost-calculator.ts
profitability.ts ← types.ts, constants.ts
trip-type-pricing.ts ← types.ts
main-engine.ts ← ALL modules
index.ts ← ALL modules (re-exports only)
```

### Testing Standards

- Existing tests in `pricing-comprehensive.test.ts` must pass
- No new tests required for this refactoring story
- Focus on maintaining exact same behavior

### Project Structure Notes

- **Path**: `packages/api/src/services/pricing/`
- **Naming**: kebab-case for files, PascalCase for types
- **Exports**: Named exports only (no default exports)

### References

- [Source: packages/api/src/services/pricing-engine.ts] - Original monolithic file
- [Source: packages/api/src/services/__tests__/pricing-comprehensive.test.ts] - Existing tests
- [Source: docs/bmad/prd.md#FR-Group-2] - Pricing modes requirements

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

**Files to Create:**

- `packages/api/src/services/pricing/index.ts`
- `packages/api/src/services/pricing/types.ts`
- `packages/api/src/services/pricing/constants.ts`
- `packages/api/src/services/pricing/cost-calculator.ts`
- `packages/api/src/services/pricing/zone-resolver.ts`
- `packages/api/src/services/pricing/grid-matcher.ts`
- `packages/api/src/services/pricing/dynamic-pricing.ts`
- `packages/api/src/services/pricing/multiplier-engine.ts`
- `packages/api/src/services/pricing/shadow-calculator.ts`
- `packages/api/src/services/pricing/profitability.ts`
- `packages/api/src/services/pricing/trip-type-pricing.ts`
- `packages/api/src/services/pricing/main-engine.ts`

**Files to Modify:**

- `packages/api/src/services/pricing-engine.ts` (replace with re-export)
