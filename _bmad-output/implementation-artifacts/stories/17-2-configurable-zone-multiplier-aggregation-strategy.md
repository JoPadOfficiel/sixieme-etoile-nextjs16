# Story 17.2: Configurable Zone Multiplier Aggregation Strategy

Status: done

## Story

As an **administrator**,
I want to configure how pickup and dropoff zone multipliers are combined,
so that pricing behaviour is predictable and aligned with our business strategy.

## Business Context

Currently, the system uses `Math.max(pickupMultiplier, dropoffMultiplier)` as the only aggregation strategy. Different VTC operators may have different commercial strategies:

- **MAX** (current): Use the highest multiplier - favors revenue maximization
- **PICKUP_ONLY**: Only consider where the client is picked up - simpler for clients to understand
- **DROPOFF_ONLY**: Only consider destination - useful for destination-based pricing
- **AVERAGE**: Balance between pickup and dropoff - fairer for cross-zone trips

This story implements FR63 from the PRD.

## Acceptance Criteria

### AC1 - Zone Multiplier Aggregation Setting in UI

**Given** an organisation with pricing zones configured,
**When** an admin navigates to Organisation Pricing Settings (`/dashboard/settings/pricing`),
**Then** they shall see a "Zone Multiplier Aggregation" dropdown with options: MAX, PICKUP_ONLY, DROPOFF_ONLY, AVERAGE.

### AC2 - MAX Strategy (Default)

**Given** the zone multiplier aggregation strategy is set to MAX (or not configured),
**When** a quote is calculated with pickup zone multiplier 1.1 and dropoff zone multiplier 1.3,
**Then** the system shall use `Math.max(1.1, 1.3) = 1.3` as the effective multiplier.

### AC3 - PICKUP_ONLY Strategy

**Given** the zone multiplier aggregation strategy is set to PICKUP_ONLY,
**When** a quote is calculated with pickup zone multiplier 1.1 and dropoff zone multiplier 1.3,
**Then** the system shall use `1.1` (pickup only) as the effective multiplier.

### AC4 - DROPOFF_ONLY Strategy

**Given** the zone multiplier aggregation strategy is set to DROPOFF_ONLY,
**When** a quote is calculated with pickup zone multiplier 1.1 and dropoff zone multiplier 1.3,
**Then** the system shall use `1.3` (dropoff only) as the effective multiplier.

### AC5 - AVERAGE Strategy

**Given** the zone multiplier aggregation strategy is set to AVERAGE,
**When** a quote is calculated with pickup zone multiplier 1.1 and dropoff zone multiplier 1.3,
**Then** the system shall use `(1.1 + 1.3) / 2 = 1.2` as the effective multiplier.

### AC6 - Transparency in Applied Rules

**Given** any zone multiplier aggregation strategy,
**When** a quote is calculated,
**Then** the `appliedRules` shall include a `ZONE_MULTIPLIER` rule showing:

- The strategy used (MAX, PICKUP_ONLY, DROPOFF_ONLY, AVERAGE)
- Both pickup and dropoff zone multipliers
- The effective multiplier applied
- Price before and after application

### AC7 - Backward Compatibility

**Given** an organisation without explicit zone multiplier aggregation strategy configured (null),
**When** a quote is calculated,
**Then** the system shall use MAX as the default strategy (current behaviour preserved).

## Tasks / Subtasks

- [ ] **Task 1: Schema Updates** (AC: 1, 7)

  - [ ] 1.1 Add `ZoneMultiplierAggregationStrategy` enum to schema.prisma with values: MAX, PICKUP_ONLY, DROPOFF_ONLY, AVERAGE
  - [ ] 1.2 Add `zoneMultiplierAggregationStrategy` field to `OrganizationPricingSettings` model (default: null for backward compatibility)
  - [ ] 1.3 Run `prisma migrate dev` to create migration
  - [ ] 1.4 Run `prisma generate` to update client

- [ ] **Task 2: Update pricing-engine.ts** (AC: 2, 3, 4, 5, 6, 7)

  - [ ] 2.1 Add `ZoneMultiplierAggregationStrategy` type export
  - [ ] 2.2 Add `zoneMultiplierAggregationStrategy` to `OrganizationPricingSettings` interface
  - [ ] 2.3 Update `applyZoneMultiplier()` function signature to accept strategy parameter
  - [ ] 2.4 Implement MAX strategy logic (existing behaviour)
  - [ ] 2.5 Implement PICKUP_ONLY strategy logic
  - [ ] 2.6 Implement DROPOFF_ONLY strategy logic
  - [ ] 2.7 Implement AVERAGE strategy logic
  - [ ] 2.8 Update `appliedRule` to include strategy information
  - [ ] 2.9 Maintain backward compatibility when no strategy is provided (default to MAX)

- [ ] **Task 3: Update Pricing Calculation Flow** (AC: 2-7)

  - [ ] 3.1 Update `calculatePrice()` to read `zoneMultiplierAggregationStrategy` from `pricingSettings`
  - [ ] 3.2 Pass strategy to `applyZoneMultiplier()` calls

- [ ] **Task 4: Backend API** (AC: 1)

  - [ ] 4.1 Update pricing settings API to accept/return `zoneMultiplierAggregationStrategy`
  - [ ] 4.2 Add validation for strategy enum values

- [ ] **Task 5: Frontend - Pricing Settings UI** (AC: 1)

  - [ ] 5.1 Add "Zone Multiplier Aggregation" dropdown to pricing settings page
  - [ ] 5.2 Add help text explaining each strategy option
  - [ ] 5.3 Add translations for new UI elements (fr/en)

- [ ] **Task 6: Unit Tests** (AC: 2, 3, 4, 5, 6, 7)

  - [ ] 6.1 Add tests for MAX strategy in pricing-engine.test.ts
  - [ ] 6.2 Add tests for PICKUP_ONLY strategy
  - [ ] 6.3 Add tests for DROPOFF_ONLY strategy
  - [ ] 6.4 Add tests for AVERAGE strategy
  - [ ] 6.5 Add tests for backward compatibility (null strategy = MAX)
  - [ ] 6.6 Add tests for appliedRules transparency

- [ ] **Task 7: Integration Tests** (AC: 1-7)
  - [ ] 7.1 Add API tests for pricing settings update
  - [ ] 7.2 Add pricing calculation tests with different strategies

## Dev Notes

### Architecture Patterns

- **Prisma Schema**: Add enum and field following existing pattern from Story 17.1 (`ZoneConflictStrategy`)
- **API Layer**: Update routes in `packages/api/src/routes/vtc/pricing-settings.ts`
- **Pricing Engine**: Located at `packages/api/src/services/pricing-engine.ts`
- **Frontend**: Settings pages in `apps/web/app/[locale]/(app)/dashboard/settings/pricing/`
- **Translations**: `packages/i18n/translations/en.json` and `fr.json`

### Current Zone Multiplier Logic

The current `applyZoneMultiplier()` in `pricing-engine.ts` (lines 2145-2191) uses:

```typescript
const effectiveMultiplier = Math.max(pickupMultiplier, dropoffMultiplier);
```

This must be updated to support configurable strategies.

### Strategy Implementation Details

```typescript
export type ZoneMultiplierAggregationStrategy =
  | "MAX" // Math.max(pickup, dropoff) - current behaviour
  | "PICKUP_ONLY" // Use pickup zone multiplier only
  | "DROPOFF_ONLY" // Use dropoff zone multiplier only
  | "AVERAGE"; // (pickup + dropoff) / 2

function calculateEffectiveMultiplier(
  pickupMultiplier: number,
  dropoffMultiplier: number,
  strategy: ZoneMultiplierAggregationStrategy | null
): { multiplier: number; source: "pickup" | "dropoff" | "both" } {
  // Default to MAX for backward compatibility
  const effectiveStrategy = strategy ?? "MAX";

  switch (effectiveStrategy) {
    case "MAX":
      const isPickupHigher = pickupMultiplier >= dropoffMultiplier;
      return {
        multiplier: Math.max(pickupMultiplier, dropoffMultiplier),
        source: isPickupHigher ? "pickup" : "dropoff",
      };
    case "PICKUP_ONLY":
      return { multiplier: pickupMultiplier, source: "pickup" };
    case "DROPOFF_ONLY":
      return { multiplier: dropoffMultiplier, source: "dropoff" };
    case "AVERAGE":
      return {
        multiplier: (pickupMultiplier + dropoffMultiplier) / 2,
        source: "both",
      };
  }
}
```

### Updated AppliedRule Structure

```typescript
interface AppliedZoneMultiplierRule extends AppliedRule {
  type: "ZONE_MULTIPLIER";
  strategy: ZoneMultiplierAggregationStrategy; // NEW: Track which strategy was used
  pickupZone: { code: string; name: string; multiplier: number };
  dropoffZone: { code: string; name: string; multiplier: number };
  appliedMultiplier: number;
  source: "pickup" | "dropoff" | "both"; // UPDATED: Add "both" for AVERAGE
  priceBefore: number;
  priceAfter: number;
}
```

### Project Structure Notes

- Schema: `packages/database/prisma/schema.prisma`
- Pricing Engine: `packages/api/src/services/pricing-engine.ts`
- Pricing Engine Tests: `packages/api/src/services/__tests__/pricing-engine.test.ts`
- Pricing Settings Route: `packages/api/src/routes/vtc/pricing-settings.ts`
- Settings UI: `apps/web/app/[locale]/(app)/dashboard/settings/pricing/`
- Translations: `packages/i18n/translations/`

### References

- [Source: docs/bmad/prd.md#FR63] Zone multiplier aggregation requirements
- [Source: docs/bmad/epics.md#Story-17.2] Story definition and acceptance criteria
- [Source: packages/api/src/services/pricing-engine.ts#applyZoneMultiplier] Current implementation
- [Source: packages/database/prisma/schema.prisma#OrganizationPricingSettings] Settings model
- [Source: packages/database/prisma/schema.prisma#ZoneConflictStrategy] Pattern for enum (Story 17.1)

## Test Cases

### Unit Tests (pricing-engine.test.ts)

```typescript
describe("applyZoneMultiplier with aggregation strategy", () => {
  const pickupZone: ZoneData = {
    id: "z1",
    code: "PARIS_20",
    name: "Paris 20km",
    priceMultiplier: 1.1,
    zoneType: "RADIUS",
    isActive: true,
    centerLatitude: 48.8566,
    centerLongitude: 2.3522,
    radiusKm: 20,
    geometry: null,
  };
  const dropoffZone: ZoneData = {
    id: "z2",
    code: "CDG",
    name: "CDG Airport",
    priceMultiplier: 1.3,
    zoneType: "RADIUS",
    isActive: true,
    centerLatitude: 49.0097,
    centerLongitude: 2.5479,
    radiusKm: 5,
    geometry: null,
  };
  const basePrice = 100;

  it("MAX: should use highest multiplier (1.3)", () => {
    const result = applyZoneMultiplier(
      basePrice,
      pickupZone,
      dropoffZone,
      "MAX"
    );
    expect(result.adjustedPrice).toBe(130);
    expect(result.appliedMultiplier).toBe(1.3);
    expect(result.appliedRule.strategy).toBe("MAX");
    expect(result.appliedRule.source).toBe("dropoff");
  });

  it("PICKUP_ONLY: should use pickup multiplier (1.1)", () => {
    const result = applyZoneMultiplier(
      basePrice,
      pickupZone,
      dropoffZone,
      "PICKUP_ONLY"
    );
    expect(result.adjustedPrice).toBe(110);
    expect(result.appliedMultiplier).toBe(1.1);
    expect(result.appliedRule.strategy).toBe("PICKUP_ONLY");
    expect(result.appliedRule.source).toBe("pickup");
  });

  it("DROPOFF_ONLY: should use dropoff multiplier (1.3)", () => {
    const result = applyZoneMultiplier(
      basePrice,
      pickupZone,
      dropoffZone,
      "DROPOFF_ONLY"
    );
    expect(result.adjustedPrice).toBe(130);
    expect(result.appliedMultiplier).toBe(1.3);
    expect(result.appliedRule.strategy).toBe("DROPOFF_ONLY");
    expect(result.appliedRule.source).toBe("dropoff");
  });

  it("AVERAGE: should use average multiplier (1.2)", () => {
    const result = applyZoneMultiplier(
      basePrice,
      pickupZone,
      dropoffZone,
      "AVERAGE"
    );
    expect(result.adjustedPrice).toBe(120);
    expect(result.appliedMultiplier).toBe(1.2);
    expect(result.appliedRule.strategy).toBe("AVERAGE");
    expect(result.appliedRule.source).toBe("both");
  });

  it("null strategy: should default to MAX for backward compatibility", () => {
    const result = applyZoneMultiplier(
      basePrice,
      pickupZone,
      dropoffZone,
      null
    );
    expect(result.adjustedPrice).toBe(130);
    expect(result.appliedMultiplier).toBe(1.3);
    expect(result.appliedRule.strategy).toBe("MAX");
  });

  it("should handle missing zones gracefully", () => {
    const result = applyZoneMultiplier(
      basePrice,
      null,
      dropoffZone,
      "PICKUP_ONLY"
    );
    expect(result.adjustedPrice).toBe(100); // pickup multiplier = 1.0 (default)
    expect(result.appliedMultiplier).toBe(1.0);
  });
});
```

### API Tests (Curl)

```bash
# Update pricing settings with zone multiplier aggregation strategy
curl -X PATCH http://localhost:3000/api/vtc/pricing-settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"zoneMultiplierAggregationStrategy": "AVERAGE"}'

# Verify settings were updated
curl -X GET http://localhost:3000/api/vtc/pricing-settings \
  -H "Authorization: Bearer $TOKEN"

# Test pricing calculation with AVERAGE strategy
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "contactId": "...",
    "pickup": {"lat": 48.8566, "lng": 2.3522},
    "dropoff": {"lat": 49.0097, "lng": 2.5479},
    "vehicleCategoryId": "...",
    "tripType": "transfer"
  }'
# Expected: appliedRules should contain ZONE_MULTIPLIER with strategy: "AVERAGE"
```

### Playwright E2E Tests

```typescript
test("admin can configure zone multiplier aggregation strategy", async ({
  page,
}) => {
  // Navigate to pricing settings
  await page.goto("/dashboard/settings/pricing");

  // Find and click the zone multiplier aggregation dropdown
  await page.getByLabel(/zone multiplier aggregation/i).click();

  // Select AVERAGE strategy
  await page.getByRole("option", { name: /average/i }).click();

  // Save settings
  await page.getByRole("button", { name: /save/i }).click();

  // Verify success toast
  await expect(page.getByText(/settings saved/i)).toBeVisible();

  // Reload and verify persistence
  await page.reload();
  await expect(page.getByLabel(/zone multiplier aggregation/i)).toHaveValue(
    "AVERAGE"
  );
});
```

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (Cascade)

### Debug Log References

N/A

### Completion Notes List

- All 7 acceptance criteria implemented and tested
- 17 unit tests passing for Story 17.2
- Database migration successful
- Backward compatibility maintained (null strategy defaults to MAX)

### Change Log

- 2025-12-30: Initial implementation complete

### File List

**Schema:**

- `packages/database/prisma/schema.prisma` - Added `ZoneMultiplierAggregationStrategy` enum and field to `OrganizationPricingSettings`
- `packages/database/prisma/migrations/20251230212628_add_zone_multiplier_aggregation_strategy/migration.sql` - Migration file

**Backend:**

- `packages/api/src/services/pricing-engine.ts` - Added `ZoneMultiplierAggregationStrategy` type, `calculateEffectiveZoneMultiplier()` function, updated `applyZoneMultiplier()` to support strategy parameter
- `packages/api/src/routes/vtc/pricing-settings.ts` - Added validation and serialization for `zoneMultiplierAggregationStrategy`

**Frontend:**

- `apps/web/modules/saas/fleet/types.ts` - Added `ZoneMultiplierAggregationStrategy` type and fields to interfaces
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/page.tsx` - Added dropdown UI for strategy selection

**Translations:**

- `packages/i18n/translations/en.json` - Added English translations for field labels and strategy options
- `packages/i18n/translations/fr.json` - Added French translations for field labels and strategy options

**Tests:**

- `packages/api/src/services/__tests__/pricing-engine.test.ts` - Added 17 unit tests for Story 17.2
