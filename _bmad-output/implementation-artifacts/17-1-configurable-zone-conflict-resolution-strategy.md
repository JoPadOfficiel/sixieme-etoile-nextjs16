# Story 17.1: Configurable Zone Conflict Resolution Strategy

Status: ready-for-dev

## Story

As an **administrator**,
I want to configure how the system resolves conflicts when a point falls within multiple overlapping zones,
so that pricing behaviour is predictable and aligned with our business strategy.

## Acceptance Criteria

### AC1 - Zone Conflict Resolution Strategy Setting

**Given** an organisation with overlapping pricing zones (e.g., PARIS_20 and CDG zones overlap near Roissy),
**When** an admin navigates to Organisation Pricing Settings,
**Then** they shall see a "Zone Conflict Resolution Strategy" dropdown with options: PRIORITY, MOST_EXPENSIVE, CLOSEST, COMBINED.

### AC2 - PRIORITY Strategy

**Given** the zone conflict resolution strategy is set to PRIORITY,
**When** a point falls within multiple zones,
**Then** the system shall resolve conflicts by selecting the zone with the highest `priority` field value.

### AC3 - MOST_EXPENSIVE Strategy

**Given** the zone conflict resolution strategy is set to MOST_EXPENSIVE,
**When** a point falls within multiple zones,
**Then** the system shall resolve conflicts by selecting the zone with the highest `priceMultiplier`.

### AC4 - CLOSEST Strategy

**Given** the zone conflict resolution strategy is set to CLOSEST,
**When** a point falls within multiple zones,
**Then** the system shall resolve conflicts by selecting the zone whose center/centroid is closest to the point.

### AC5 - COMBINED Strategy

**Given** the zone conflict resolution strategy is set to COMBINED,
**When** a point falls within multiple zones,
**Then** the system shall first filter by priority (highest priority zones), then by multiplier among equal-priority zones.

### AC6 - Priority Field on PricingZone

**Given** a pricing zone,
**When** an admin edits the zone configuration,
**Then** they shall see an optional `priority` field (integer, default 0) that is used when the zone conflict resolution strategy is PRIORITY or COMBINED.

### AC7 - Default Strategy

**Given** an organisation without explicit zone conflict resolution strategy configured,
**When** a point falls within multiple zones,
**Then** the system shall use the current default behaviour (most specific zone type: POINT > RADIUS > POLYGON).

## Tasks / Subtasks

- [ ] **Task 1: Schema Updates** (AC: 1, 6, 7)

  - [ ] 1.1 Add `ZoneConflictStrategy` enum to schema.prisma with values: PRIORITY, MOST_EXPENSIVE, CLOSEST, COMBINED
  - [ ] 1.2 Add `zoneConflictStrategy` field to `OrganizationPricingSettings` model (default: null for backward compatibility)
  - [ ] 1.3 Add `priority` Int field to `PricingZone` model (default: 0)
  - [ ] 1.4 Run `prisma migrate dev` to create migration
  - [ ] 1.5 Run `prisma generate` to update client

- [ ] **Task 2: Update geo-utils.ts** (AC: 2, 3, 4, 5, 7)

  - [ ] 2.1 Add `priority` field to `ZoneData` interface
  - [ ] 2.2 Create `resolveZoneConflict()` function that accepts strategy and matching zones
  - [ ] 2.3 Implement PRIORITY strategy logic
  - [ ] 2.4 Implement MOST_EXPENSIVE strategy logic
  - [ ] 2.5 Implement CLOSEST strategy logic (using haversineDistance to zone center)
  - [ ] 2.6 Implement COMBINED strategy logic
  - [ ] 2.7 Update `findZoneForPoint()` to accept optional strategy parameter
  - [ ] 2.8 Maintain backward compatibility when no strategy is provided

- [ ] **Task 3: Update Pricing Engine** (AC: 1-7)

  - [ ] 3.1 Update `calculatePrice()` to read `zoneConflictStrategy` from `pricingSettings`
  - [ ] 3.2 Pass strategy to zone resolution calls
  - [ ] 3.3 Ensure zones array includes `priority` field when fetched

- [ ] **Task 4: Backend API** (AC: 1, 6)

  - [ ] 4.1 Update pricing settings API to accept/return `zoneConflictStrategy`
  - [ ] 4.2 Update zone API to accept/return `priority` field
  - [ ] 4.3 Add validation for strategy enum values

- [ ] **Task 5: Frontend - Pricing Settings UI** (AC: 1)

  - [ ] 5.1 Add "Zone Conflict Resolution Strategy" dropdown to pricing settings page
  - [ ] 5.2 Add help text explaining each strategy option
  - [ ] 5.3 Add translations for new UI elements (fr/en)

- [ ] **Task 6: Frontend - Zone Editor UI** (AC: 6)

  - [ ] 6.1 Add `priority` input field to zone editor form
  - [ ] 6.2 Display priority in zones list table
  - [ ] 6.3 Add translations for priority field

- [ ] **Task 7: Unit Tests** (AC: 2, 3, 4, 5)

  - [ ] 7.1 Add tests for PRIORITY strategy in geo-utils.test.ts
  - [ ] 7.2 Add tests for MOST_EXPENSIVE strategy
  - [ ] 7.3 Add tests for CLOSEST strategy
  - [ ] 7.4 Add tests for COMBINED strategy
  - [ ] 7.5 Add tests for backward compatibility (no strategy)

- [ ] **Task 8: Integration Tests** (AC: 1-7)
  - [ ] 8.1 Add pricing engine tests with different strategies
  - [ ] 8.2 Test zone conflict scenarios with overlapping zones

## Dev Notes

### Architecture Patterns

- **Prisma Schema**: Add enum and fields following existing patterns in `packages/database/prisma/schema.prisma`
- **API Layer**: Update routes in `packages/api/src/routes/vtc/` following existing CRUD patterns
- **Pricing Engine**: Located at `packages/api/src/services/pricing-engine.ts`
- **Geo Utils**: Located at `packages/api/src/lib/geo-utils.ts`
- **Frontend**: Settings pages in `apps/web/app/[locale]/(app)/dashboard/settings/`

### Current Zone Resolution Logic

The current `findZoneForPoint()` in `geo-utils.ts` uses a specificity-based approach:

1. POINT zones (most specific)
2. RADIUS zones (sorted by radius, smaller first)
3. POLYGON zones (least specific)

This behaviour must be preserved as the default when no strategy is configured.

### Zone Data Structure

Current `ZoneData` interface in `geo-utils.ts`:

```typescript
export interface ZoneData {
  id: string;
  name: string;
  code: string;
  zoneType: ZoneType;
  geometry: GeoPolygon | null;
  centerLatitude: number | null;
  centerLongitude: number | null;
  radiusKm: number | null;
  isActive: boolean;
  priceMultiplier?: number;
}
```

Add `priority?: number` to this interface.

### Strategy Implementation Details

```typescript
enum ZoneConflictStrategy {
  PRIORITY = "PRIORITY",
  MOST_EXPENSIVE = "MOST_EXPENSIVE",
  CLOSEST = "CLOSEST",
  COMBINED = "COMBINED",
}

function resolveZoneConflict(
  point: GeoPoint,
  zones: ZoneData[],
  strategy: ZoneConflictStrategy | null
): ZoneData | null {
  if (!zones.length) return null;
  if (zones.length === 1) return zones[0];

  // Default: use existing specificity logic
  if (!strategy) {
    return findZonesForPoint(point, zones)[0] ?? null;
  }

  switch (strategy) {
    case "PRIORITY":
      return zones.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
    case "MOST_EXPENSIVE":
      return zones.sort(
        (a, b) => (b.priceMultiplier ?? 1) - (a.priceMultiplier ?? 1)
      )[0];
    case "CLOSEST":
      return zones.sort((a, b) => {
        const distA = haversineDistance(point, {
          lat: a.centerLatitude!,
          lng: a.centerLongitude!,
        });
        const distB = haversineDistance(point, {
          lat: b.centerLatitude!,
          lng: b.centerLongitude!,
        });
        return distA - distB;
      })[0];
    case "COMBINED":
      const maxPriority = Math.max(...zones.map((z) => z.priority ?? 0));
      const highPriorityZones = zones.filter(
        (z) => (z.priority ?? 0) === maxPriority
      );
      return highPriorityZones.sort(
        (a, b) => (b.priceMultiplier ?? 1) - (a.priceMultiplier ?? 1)
      )[0];
  }
}
```

### Existing Zone Pricing System (Memory Reference)

The system uses concentric circles around two centers:

- **PARIS** (Notre-Dame): base coefficient 1.0, increases with distance
- **BUSSY-SAINT-MARTIN** (Garage): coefficient 0.8, increases with distance

Special zones (CDG, ORLY, VERSAILLES, etc.) can overlap with these circles. The conflict resolution strategy determines which zone's multiplier is used when overlap occurs.

### Project Structure Notes

- Schema: `packages/database/prisma/schema.prisma`
- Geo Utils: `packages/api/src/lib/geo-utils.ts`
- Geo Utils Tests: `packages/api/src/lib/__tests__/geo-utils.test.ts`
- Pricing Engine: `packages/api/src/services/pricing-engine.ts`
- Pricing Engine Tests: `packages/api/src/services/__tests__/pricing-engine.test.ts`
- Pricing Settings Route: `packages/api/src/routes/vtc/pricing-settings.ts`
- Zone Routes: `packages/api/src/routes/vtc/zones.ts`
- Settings UI: `apps/web/app/[locale]/(app)/dashboard/settings/pricing/`
- Zone Editor UI: `apps/web/app/[locale]/(app)/dashboard/settings/zones/`
- Translations: `apps/web/content/locales/`

### References

- [Source: docs/bmad/prd.md#FR61-FR62] Zone conflict resolution requirements
- [Source: docs/bmad/epics.md#Story-17.1] Story definition and acceptance criteria
- [Source: packages/api/src/lib/geo-utils.ts] Current zone resolution implementation
- [Source: packages/database/prisma/schema.prisma#OrganizationPricingSettings] Settings model
- [Source: packages/database/prisma/schema.prisma#PricingZone] Zone model

## Test Cases

### Unit Tests (geo-utils.test.ts)

```typescript
describe("resolveZoneConflict", () => {
  const overlappingZones: ZoneData[] = [
    { id: "z1", code: "PARIS_20", priority: 1, priceMultiplier: 1.1, centerLatitude: 48.8566, centerLongitude: 2.3522, ... },
    { id: "z2", code: "CDG", priority: 5, priceMultiplier: 1.2, centerLatitude: 49.0097, centerLongitude: 2.5479, ... },
    { id: "z3", code: "BUSSY_10", priority: 3, priceMultiplier: 0.85, centerLatitude: 48.8495, centerLongitude: 2.6905, ... },
  ];

  it("PRIORITY: should select zone with highest priority", () => {
    const result = resolveZoneConflict(point, overlappingZones, "PRIORITY");
    expect(result?.code).toBe("CDG"); // priority 5
  });

  it("MOST_EXPENSIVE: should select zone with highest multiplier", () => {
    const result = resolveZoneConflict(point, overlappingZones, "MOST_EXPENSIVE");
    expect(result?.code).toBe("CDG"); // multiplier 1.2
  });

  it("CLOSEST: should select zone closest to point", () => {
    const point = { lat: 48.85, lng: 2.4 }; // Closer to PARIS_20
    const result = resolveZoneConflict(point, overlappingZones, "CLOSEST");
    expect(result?.code).toBe("PARIS_20");
  });

  it("COMBINED: should filter by priority then by multiplier", () => {
    // If CDG has highest priority, it wins
    const result = resolveZoneConflict(point, overlappingZones, "COMBINED");
    expect(result?.code).toBe("CDG");
  });

  it("null strategy: should use default specificity logic", () => {
    const result = resolveZoneConflict(point, overlappingZones, null);
    // Default: POINT > RADIUS (smaller) > POLYGON
  });
});
```

### API Tests (Curl)

```bash
# Update pricing settings with zone conflict strategy
curl -X PATCH http://localhost:3000/api/vtc/pricing-settings \
  -H "Content-Type: application/json" \
  -d '{"zoneConflictStrategy": "MOST_EXPENSIVE"}'

# Update zone with priority
curl -X PATCH http://localhost:3000/api/vtc/zones/{zoneId} \
  -H "Content-Type: application/json" \
  -d '{"priority": 5}'

# Test pricing calculation with overlapping zones
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "...",
    "pickup": {"lat": 49.0, "lng": 2.55},
    "dropoff": {"lat": 48.85, "lng": 2.35},
    "vehicleCategoryId": "...",
    "tripType": "transfer"
  }'
```

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List
