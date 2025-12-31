# Story 18-10: Hierarchical Pricing Algorithm Implementation

**Story ID:** 18-10  
**Epic:** Epic 18 – Advanced Geospatial, Route Optimization & Yield Management  
**Status:** Done  
**Date:** 2025-12-31

---

## Description

**As a** backend engineer,  
**I want** the pricing engine to implement a strict hierarchical pricing algorithm,  
**So that** pricing decisions follow a predictable priority order and operators can understand exactly which pricing method was applied.

---

## Related FRs

- **FR87:** The system shall implement a hierarchical pricing algorithm that evaluates each trip request in strict priority order.

---

## Implementation Summary

### Schema Changes

1. **`PricingZone` model** - Added `isCentralZone` boolean field to explicitly mark central zones for Priority 1 pricing.

2. **`OrganizationPricingSettings` model** - Added:

   - `hierarchicalPricingConfig` JSON field for algorithm configuration
   - `intraCentralFlatRates` relation for Priority 1 flat rates

3. **New `IntraCentralFlatRate` model** - Stores flat rates for intra-central zone trips by vehicle category.

### Core Functions Added

| Function                         | Purpose                                           |
| -------------------------------- | ------------------------------------------------- |
| `isCentralZone()`                | Check if a zone is central (flag or code pattern) |
| `checkSameRing()`                | Detect if two zones are in the same ring          |
| `findIntraCentralFlatRate()`     | Find flat rate for vehicle category               |
| `evaluateHierarchicalPricing()`  | Main algorithm - evaluates all 4 priority levels  |
| `buildHierarchicalPricingRule()` | Build transparency rule for appliedRules          |

### Algorithm Priority Order

1. **Priority 1 - INTRA_CENTRAL_FLAT_RATE**: Both points in central zone + flat rate exists
2. **Priority 2 - INTER_ZONE_FORFAIT**: Defined forfait between zones
3. **Priority 3 - SAME_RING_DYNAMIC**: Both points in same outer ring (e.g., PARIS_20)
4. **Priority 4 - HOROKILOMETRIC_FALLBACK**: Standard dynamic pricing

### New Types

```typescript
interface HierarchicalPricingConfig {
  enabled: boolean;
  skipLevel1?: boolean;
  skipLevel2?: boolean;
  skipLevel3?: boolean;
  centralZoneCodes?: string[];
}

interface HierarchicalPricingResult {
  level: 1 | 2 | 3 | 4;
  levelName: HierarchicalPricingLevelName;
  reason: string;
  skippedLevels: SkippedLevel[];
  appliedPrice: number;
  details?: { flatRateId?; forfaitId?; ringMultiplier?; ringCode? };
}

interface IntraCentralFlatRateData {
  id: string;
  vehicleCategoryId: string;
  flatRate: number;
  description: string | null;
  isActive: boolean;
}
```

---

## Files Modified

| File                                                         | Changes                                                                                                                                                        |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma`                     | Added `isCentralZone` to PricingZone, `hierarchicalPricingConfig` and `intraCentralFlatRates` to OrganizationPricingSettings, new `IntraCentralFlatRate` model |
| `packages/api/src/services/pricing-engine.ts`                | Added hierarchical pricing types and functions (~270 lines)                                                                                                    |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Added 27 comprehensive tests for hierarchical pricing                                                                                                          |

---

## Tests

### Unit Tests (Vitest) - 27 tests passing

| Test Suite                     | Tests                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| `isCentralZone`                | 5 tests - flag detection, code matching, null handling         |
| `checkSameRing`                | 4 tests - ring detection, mismatch, null handling              |
| `findIntraCentralFlatRate`     | 3 tests - find active, non-existent, inactive                  |
| `evaluateHierarchicalPricing`  | 12 tests - all priority levels, config options, priority order |
| `buildHierarchicalPricingRule` | 1 test - rule building                                         |

### Test Command

```bash
pnpm vitest run src/services/__tests__/pricing-engine.test.ts -t "Story 18.10"
```

---

## Acceptance Criteria Status

| AC  | Description                               | Status |
| --- | ----------------------------------------- | ------ |
| AC1 | Priority 1 - Intra-Central Zone Flat Rate | ✅     |
| AC2 | Priority 2 - Inter-Zone Forfait           | ✅     |
| AC3 | Priority 3 - Same-Ring Dynamic Pricing    | ✅     |
| AC4 | Priority 4 - Horokilometric Fallback      | ✅     |
| AC5 | Priority Level Transparency               | ✅     |
| AC6 | Configurable Priority Levels              | ✅     |
| AC7 | Central Zone Detection                    | ✅     |

---

## Migration

```sql
-- Migration: 20251231124412_story_18_10_hierarchical_pricing
ALTER TABLE "pricing_zone" ADD COLUMN "isCentralZone" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organization_pricing_settings" ADD COLUMN "hierarchicalPricingConfig" JSONB;

CREATE TABLE "intra_central_flat_rate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pricingSettingsId" TEXT NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,
    "flatRate" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "intra_central_flat_rate_pkey" PRIMARY KEY ("id")
);
```

---

## Notes

- The hierarchical pricing algorithm is designed to be **backward compatible** - when disabled, it falls through to standard dynamic pricing.
- Central zones can be identified by either the `isCentralZone` flag OR by matching `centralZoneCodes` in the config.
- The `skippedLevels` array provides full transparency on why each level was not applied.
- Ring detection uses zone code patterns (e.g., `PARIS_20`, `BUSSY_10`) to identify same-ring trips.
