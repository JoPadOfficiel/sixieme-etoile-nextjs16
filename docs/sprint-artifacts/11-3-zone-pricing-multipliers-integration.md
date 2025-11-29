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
2. **Update API schemas** - Add priceMultiplier to create/update zone schemas
3. **Add multiplier input to ZoneForm** - Input with validation (0.5 - 3.0)
4. **Add quick multiplier edit in ZoneSidebarList** - Inline editing capability
5. **Display multiplier on map** - Show multiplier value as label on zone overlay
6. **Update pricing engine** - Modify pricing engine to use zone multipliers from PricingZone
7. **Add multiplier validation** - Validate multiplier range (0.5x to 3.0x)
8. **Add translations (EN/FR)** for new UI elements
9. **Write unit tests** for pricing integration
10. **Write E2E tests** for zone multiplier configuration

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

### AC6: Multiplier Inheritance

**Given** a zone with a parent zone  
**When** calculating the effective multiplier  
**Then** child zone multiplier takes precedence over parent zone multiplier

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
- `packages/api/src/routes/vtc/pricing-zones.ts` - Add priceMultiplier to schemas
- `packages/api/src/services/pricing-engine.ts` - Use zone multipliers
- `apps/web/modules/saas/pricing/components/ZoneForm.tsx` - Add multiplier input
- `apps/web/modules/saas/pricing/components/ZoneSidebarList.tsx` - Display and quick edit multiplier
- `apps/web/modules/saas/pricing/components/ZonesInteractiveMap.tsx` - Display multiplier labels
- `apps/web/modules/saas/pricing/types.ts` - Add priceMultiplier to types

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
- Migration of ZONE_SCENARIO (will be handled in Story 11.7)

## Dependencies

- Story 11.1 (Unified Zone Management Interface) ✅ DONE
- Story 11.2 (Postal Code Zone Creation) ✅ DONE

## Definition of Done

- [ ] priceMultiplier field added to PricingZone model
- [ ] Multiplier editable in zone form
- [ ] Multiplier displayed on map overlays
- [ ] Quick edit from zone list works
- [ ] Pricing engine uses zone multipliers
- [ ] Translations added (EN/FR)
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Code reviewed and approved
