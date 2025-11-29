# Story 11.3: Zone Pricing Multipliers Integration

## Story

**As an** operator  
**I want** to configure pricing multipliers directly within zone settings  
**So that** I can see and adjust zone-specific pricing without navigating to separate pages

## Background

Currently, zone-specific pricing adjustments are configured in the "Advanced Rate Modifiers" page under the "ZONE_SCENARIO" type. This is confusing because:

1. Zone pricing is separated from zone definition
2. Users must navigate to a different page to configure zone multipliers
3. The relationship between zones and their pricing is not immediately visible

The user wants to integrate pricing multipliers directly into the zone management interface, so when viewing or editing a zone, the pricing configuration is immediately accessible.

## Tasks

1. **Add multiplier field to PricingZone model** - Add `priceMultiplier` field to store zone-specific multiplier
2. **Create ZonePricingPanel component** - Panel showing zone pricing configuration
3. **Integrate pricing panel in zone details** - Show pricing when a zone is selected
4. **Add quick multiplier edit** - Allow editing multiplier directly from zone list
5. **Display multiplier on map** - Show multiplier value as label on zone overlay
6. **Migrate existing ZONE_SCENARIO rates** - Create migration to move zone-based rates to zone multipliers
7. **Update pricing engine** - Modify pricing engine to use zone multipliers from PricingZone
8. **Add multiplier validation** - Validate multiplier range (e.g., 0.5x to 3.0x)
9. **Add translations (EN/FR)** for new UI elements
10. **Write unit tests** for pricing integration
11. **Write E2E tests** for zone multiplier configuration

## Acceptance Criteria

### AC1: Zone Multiplier Field

**Given** I am viewing or editing a zone  
**When** I see the zone details  
**Then** I see a "Price Multiplier" field  
**And** the default value is 1.0 (no adjustment)

### AC2: Multiplier Configuration

**Given** I am editing a zone's multiplier  
**When** I change the value  
**Then** I can set values between 0.5x and 3.0x  
**And** the value is saved with the zone

### AC3: Multiplier Display on Map

**Given** zones are displayed on the map  
**When** I view a zone with a non-default multiplier  
**Then** I see the multiplier value displayed on the zone (e.g., "1.5x")  
**And** zones with higher multipliers have a different color intensity

### AC4: Quick Edit from List

**Given** the zone list in the sidebar  
**When** I view a zone row  
**Then** I see the current multiplier value  
**And** I can click to quickly edit it inline

### AC5: Pricing Engine Integration

**Given** a quote is being calculated  
**When** the pickup or dropoff is in a zone with a multiplier  
**Then** the zone multiplier is applied to the price  
**And** the multiplier is recorded in tripAnalysis

### AC6: Migration of Existing Data

**Given** existing ZONE_SCENARIO advanced rates  
**When** the migration runs  
**Then** zone-based rates are converted to zone multipliers  
**And** the original advanced rates are marked as migrated/inactive

### AC7: Multiplier Inheritance

**Given** a zone with a parent zone  
**When** calculating the effective multiplier  
**Then** child zone multiplier takes precedence  
**Or** multipliers are combined (configurable)

## Technical Notes

### Schema Changes

```prisma
model PricingZone {
  // ... existing fields
  priceMultiplier Decimal @default(1.0) @db.Decimal(4, 2)
  multiplierDescription String? // Optional description for the multiplier
}
```

### Files to Modify

- `packages/database/prisma/schema.prisma` - Add priceMultiplier field
- `packages/api/src/services/pricing-engine.ts` - Use zone multipliers
- `apps/web/modules/saas/pricing/components/ZoneForm.tsx` - Add multiplier input
- `apps/web/modules/saas/pricing/components/ZonesOverviewMap.tsx` - Display multiplier labels

### New Components

- `ZonePricingPanel.tsx` - Pricing configuration panel
- `MultiplierInput.tsx` - Slider/input for multiplier values

### Migration Script

Create a migration script that:

1. Finds all ZONE_SCENARIO advanced rates
2. For each rate, updates the corresponding zone's priceMultiplier
3. Marks the advanced rate as inactive or deletes it

### Pricing Engine Changes

```typescript
// In pricing-engine.ts
function applyZoneMultiplier(
  basePrice: number,
  pickupZone: PricingZone | null,
  dropoffZone: PricingZone | null
): { price: number; appliedMultiplier: number; zoneId: string | null } {
  // Apply the highest multiplier from pickup or dropoff zone
  const pickupMultiplier = pickupZone?.priceMultiplier ?? 1.0;
  const dropoffMultiplier = dropoffZone?.priceMultiplier ?? 1.0;
  const effectiveMultiplier = Math.max(pickupMultiplier, dropoffMultiplier);

  return {
    price: basePrice * effectiveMultiplier,
    appliedMultiplier: effectiveMultiplier,
    zoneId:
      pickupMultiplier > dropoffMultiplier ? pickupZone?.id : dropoffZone?.id,
  };
}
```

## Out of Scope

- Time-based zone multipliers (use Seasonal Multipliers for this)
- Vehicle category-specific zone multipliers
- Complex multiplier combination rules

## Dependencies

- Story 11.1 (Unified Zone Management Interface) should be completed first

## Definition of Done

- [ ] priceMultiplier field added to PricingZone model
- [ ] Multiplier editable in zone form
- [ ] Multiplier displayed on map overlays
- [ ] Quick edit from zone list works
- [ ] Pricing engine uses zone multipliers
- [ ] Migration script for existing ZONE_SCENARIO rates
- [ ] Translations added (EN/FR)
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Code reviewed and approved
