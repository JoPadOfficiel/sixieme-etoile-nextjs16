# Story 17.10: Zone Fixed Surcharges (Friction Costs)

Status: done

## Story

As an **administrator**,
I want to configure fixed surcharges per zone (parking fees, access fees),
so that operational costs are automatically included when trips involve zones with known friction costs.

## Related FRs

**FR72**: Each pricing zone shall support optional fixed surcharges (parking fees, access fees, friction costs) that are automatically added to the operational cost when the zone is involved in a trip.

## Business Context

Certain zones have known "friction costs" that are not captured by distance/duration calculations:

- **Versailles**: Mandatory parking fees (~40€) for chauffeurs waiting during palace visits
- **CDG/Orly**: Airport access fees, parking during passenger pickup
- **La Défense**: Expensive parking in business district
- **Disneyland**: Parking fees for extended waits

Currently, operators must manually add these costs or remember to include them. This story automates the inclusion of zone-specific surcharges in the operational cost calculation.

### Value Proposition

1. **Accuracy**: Real operational costs are captured automatically
2. **Consistency**: No more forgotten parking fees affecting profitability
3. **Transparency**: Surcharges appear as separate line items in cost breakdown
4. **Configurability**: Each zone can have its own surcharge amounts

## Acceptance Criteria

### AC1: Zone Surcharge Fields in Database

**Given** the `PricingZone` model in Prisma schema,  
**When** the migration is applied,  
**Then** the model shall have new optional fields:

- `fixedParkingSurcharge` (Decimal, nullable) - Parking fee in EUR
- `fixedAccessFee` (Decimal, nullable) - Access/entry fee in EUR
- `surchargeDescription` (String, nullable) - Description of the surcharges

### AC2: Zone Editor UI Surcharge Fields

**Given** an admin editing a zone in `/dashboard/settings/zones`,  
**When** they view the zone edit form,  
**Then** they shall see a "Surcharges" section with:

- Parking surcharge input (EUR, optional)
- Access fee input (EUR, optional)
- Description textarea (optional)

### AC3: Surcharges Added to Operational Cost

**Given** a trip with pickup in zone "VERSAILLES" (fixedParkingSurcharge=40€),  
**When** the pricing engine calculates the cost breakdown,  
**Then** the `costBreakdown.zoneSurcharges` shall include:

- Zone name: "VERSAILLES"
- Parking: 40€
- Access: 0€
- Total: 40€

**And** `costBreakdown.total` shall include this 40€.

### AC4: Both Pickup and Dropoff Surcharges

**Given** a trip with:

- Pickup in zone "CDG" (fixedAccessFee=15€)
- Dropoff in zone "VERSAILLES" (fixedParkingSurcharge=40€)

**When** the pricing engine calculates the cost breakdown,  
**Then** both surcharges shall be included:

- CDG access fee: 15€
- VERSAILLES parking: 40€
- Total zone surcharges: 55€

### AC5: No Double-Counting for Same Zone

**Given** a round-trip where pickup and dropoff are both in zone "CDG",  
**When** the pricing engine calculates the cost breakdown,  
**Then** the CDG surcharges shall only be applied once (not doubled).

### AC6: Surcharges in Applied Rules

**Given** zone surcharges are applied,  
**When** the pricing result is returned,  
**Then** `appliedRules` shall include a `ZONE_SURCHARGE` rule with:

- `pickupZone`: zone name and surcharges
- `dropoffZone`: zone name and surcharges
- `totalSurcharge`: combined amount
- `description`: explanation of charges

### AC7: Surcharges in TripTransparency

**Given** a quote with zone surcharges applied,  
**When** the operator views the TripTransparencyPanel,  
**Then** the cost breakdown shall show zone surcharges as a separate line item with tooltip showing breakdown by zone.

### AC8: API Endpoint for Zone Surcharges

**Given** an admin with appropriate permissions,  
**When** they call PATCH `/api/vtc/zones/:id` with surcharge fields,  
**Then** the zone surcharges shall be updated,  
**And** the response shall include the updated surcharge values.

### AC9: Backward Compatibility

**Given** existing zones without surcharge values,  
**When** the pricing engine runs,  
**Then** zones with null surcharges shall contribute 0€ to the cost breakdown,  
**And** no errors shall occur.

### AC10: Seed Data with Example Surcharges

**Given** the VTC seed data,  
**When** the seed is run,  
**Then** key zones shall have example surcharges:

- VERSAILLES: parking=40€, description="Parking château"
- CDG: access=15€, description="Frais d'accès aéroport"
- ORLY: access=12€, description="Frais d'accès aéroport"

## Technical Design

### Database Schema Changes

```prisma
model PricingZone {
  // ... existing fields ...

  // Story 17.10: Zone fixed surcharges (friction costs)
  fixedParkingSurcharge  Decimal? @db.Decimal(10, 2) // Parking fee in EUR
  fixedAccessFee         Decimal? @db.Decimal(10, 2) // Access/entry fee in EUR
  surchargeDescription   String?                      // Description of surcharges
}
```

### New Types in Pricing Engine

```typescript
// Zone surcharge component for cost breakdown
export interface ZoneSurchargeComponent {
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  parkingSurcharge: number;
  accessFee: number;
  total: number;
  description: string | null;
}

// Extended ZoneData interface
export interface ZoneData {
  // ... existing fields ...
  fixedParkingSurcharge?: number | null;
  fixedAccessFee?: number | null;
  surchargeDescription?: string | null;
}

// Extended CostBreakdown interface
export interface CostBreakdown {
  // ... existing fields ...
  zoneSurcharges: {
    pickup: ZoneSurchargeComponent | null;
    dropoff: ZoneSurchargeComponent | null;
    total: number;
  };
}
```

### Pricing Engine Integration

The surcharges should be calculated in `calculateCostBreakdown()` or a new helper function `calculateZoneSurcharges()` that is called during trip analysis.

```typescript
export function calculateZoneSurcharges(
  pickupZone: ZoneData | null,
  dropoffZone: ZoneData | null
): {
  pickup: ZoneSurchargeComponent | null;
  dropoff: ZoneSurchargeComponent | null;
  total: number;
} {
  const pickup = pickupZone ? createZoneSurchargeComponent(pickupZone) : null;

  // Avoid double-counting if same zone
  const dropoff =
    dropoffZone && dropoffZone.id !== pickupZone?.id
      ? createZoneSurchargeComponent(dropoffZone)
      : null;

  const total = (pickup?.total ?? 0) + (dropoff?.total ?? 0);

  return { pickup, dropoff, total };
}
```

## Tasks / Subtasks

- [x] **Task 1: Database Schema** (AC: 1, 9)

  - [x] 1.1: Add `fixedParkingSurcharge`, `fixedAccessFee`, `surchargeDescription` fields to `PricingZone` model
  - [x] 1.2: Create and run migration
  - [x] 1.3: Update Prisma client types

- [x] **Task 2: Seed Data** (AC: 10)

  - [x] 2.1: Update `seed-vtc-complete.ts` to add surcharges to VERSAILLES, CDG, ORLY zones

- [x] **Task 3: Pricing Engine** (AC: 3, 4, 5, 6, 9)

  - [x] 3.1: Add `ZoneSurchargeComponent` type to pricing-engine.ts
  - [x] 3.2: Extend `ZoneData` interface with surcharge fields
  - [x] 3.3: Extend `CostBreakdown` interface with `zoneSurcharges` field
  - [x] 3.4: Create `calculateZoneSurcharges()` function
  - [x] 3.5: Update `calculateCostBreakdown()` to accept zone surcharges
  - [x] 3.6: Add `ZONE_SURCHARGE` rule type to `AppliedRule`
  - [x] 3.7: Update `buildTripAnalysis()` to include zone surcharges
  - [x] 3.8: Update `calculateDynamicPrice()` to pass zones for surcharge calculation

- [x] **Task 4: API Endpoints** (AC: 8)

  - [x] 4.1: Update zone PATCH endpoint to accept surcharge fields
  - [x] 4.2: Update zone GET endpoint to return surcharge fields

- [x] **Task 5: Zone Editor UI** (AC: 2, 7)

  - [x] 5.1: Add surcharge fields to zone edit form/drawer
  - [x] 5.2: Add translations for surcharge labels (fr.json, en.json)
  - [x] 5.3: Update TripTransparencyPanel to show zone surcharges

- [x] **Task 6: Tests** (AC: 3, 4, 5, 6, 9)
  - [x] 6.1: Unit tests for `calculateZoneSurcharges()`
  - [x] 6.2: Unit tests for same-zone no-double-counting
  - [x] 6.3: Integration test for pricing with zone surcharges
  - [x] 6.4: API test for zone surcharge CRUD

## Dev Notes

### Key Files to Modify

| File                                            | Changes                             |
| ----------------------------------------------- | ----------------------------------- |
| `packages/database/prisma/schema.prisma`        | Add surcharge fields to PricingZone |
| `packages/database/prisma/seed-vtc-complete.ts` | Add example surcharges              |
| `packages/api/src/lib/geo-utils.ts`             | Extend ZoneData interface           |
| `packages/api/src/services/pricing-engine.ts`   | Add surcharge calculation           |
| `packages/api/src/routes/vtc/zones.ts`          | Update PATCH endpoint               |
| `apps/web/modules/saas/zones/components/`       | Add surcharge fields to UI          |
| `packages/i18n/translations/fr.json`            | French translations                 |
| `packages/i18n/translations/en.json`            | English translations                |

### Existing Patterns to Follow

- **Cost Components**: Follow pattern of `ParkingCostComponent` in pricing-engine.ts
- **Applied Rules**: Follow pattern of `ZONE_MULTIPLIER` rule type
- **Zone UI**: Follow existing zone editor patterns in zones module

### Edge Cases

1. **Null surcharges**: Treat as 0€
2. **Same pickup/dropoff zone**: Apply surcharges only once
3. **No zone match**: No surcharges applied
4. **Multiple zones (conflict)**: Use resolved zone's surcharges

## Test Cases

### Unit Tests (Vitest)

```typescript
describe("calculateZoneSurcharges", () => {
  // AC3: Basic surcharge calculation
  it("should calculate pickup zone surcharges", () => {
    const pickupZone = {
      id: "versailles",
      name: "Versailles",
      code: "VERSAILLES",
      fixedParkingSurcharge: 40,
      fixedAccessFee: null,
      surchargeDescription: "Parking château",
    };

    const result = calculateZoneSurcharges(pickupZone, null);

    expect(result.pickup?.total).toBe(40);
    expect(result.total).toBe(40);
  });

  // AC4: Both pickup and dropoff
  it("should combine pickup and dropoff surcharges", () => {
    const pickupZone = { id: "cdg", fixedAccessFee: 15 };
    const dropoffZone = { id: "versailles", fixedParkingSurcharge: 40 };

    const result = calculateZoneSurcharges(pickupZone, dropoffZone);

    expect(result.pickup?.total).toBe(15);
    expect(result.dropoff?.total).toBe(40);
    expect(result.total).toBe(55);
  });

  // AC5: No double-counting
  it("should not double-count same zone", () => {
    const zone = { id: "cdg", fixedAccessFee: 15, fixedParkingSurcharge: 10 };

    const result = calculateZoneSurcharges(zone, zone);

    expect(result.pickup?.total).toBe(25);
    expect(result.dropoff).toBeNull();
    expect(result.total).toBe(25);
  });

  // AC9: Null surcharges
  it("should handle null surcharges gracefully", () => {
    const zone = {
      id: "paris",
      fixedParkingSurcharge: null,
      fixedAccessFee: null,
    };

    const result = calculateZoneSurcharges(zone, null);

    expect(result.pickup?.total).toBe(0);
    expect(result.total).toBe(0);
  });
});
```

### API Tests (Curl)

```bash
# Update zone with surcharges
curl -X PATCH http://localhost:3000/api/vtc/zones/versailles-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "fixedParkingSurcharge": 40,
    "fixedAccessFee": 0,
    "surchargeDescription": "Parking château de Versailles"
  }'

# Verify zone has surcharges
curl http://localhost:3000/api/vtc/zones/versailles-id \
  -H "Authorization: Bearer $TOKEN"

# Create quote and verify surcharges in cost breakdown
curl -X POST http://localhost:3000/api/vtc/quotes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "tripType": "TRANSFER",
    "pickupAddress": "Paris",
    "pickupLat": 48.8566,
    "pickupLng": 2.3522,
    "dropoffAddress": "Château de Versailles",
    "dropoffLat": 48.8049,
    "dropoffLng": 2.1204,
    "pickupAt": "2025-01-15T10:00:00Z",
    "vehicleCategoryId": "cat-id"
  }'
```

### Database Verification

```sql
-- Verify surcharge fields exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pricing_zone'
AND column_name IN ('fixed_parking_surcharge', 'fixed_access_fee', 'surcharge_description');

-- Check zones with surcharges
SELECT name, code, fixed_parking_surcharge, fixed_access_fee, surcharge_description
FROM pricing_zone
WHERE fixed_parking_surcharge IS NOT NULL OR fixed_access_fee IS NOT NULL;
```

## References

- [Source: docs/bmad/epics.md#Story-17.10]
- [Source: docs/bmad/prd.md#FR72]
- [Source: packages/api/src/services/pricing-engine.ts#calculateCostBreakdown]
- [Source: packages/api/src/lib/geo-utils.ts#ZoneData]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List
