# Story 11.7: Remove Deprecated Advanced Rate Types

## Story

**As an** operator  
**I want** deprecated advanced rate types removed from the system  
**So that** the pricing configuration is cleaner and less confusing

## Background

The user has identified several advanced rate types that should be removed:

- **LONG_DISTANCE** - Not needed, distance-based pricing handled differently
- **ZONE_SCENARIO** - Moving to zone-level multipliers (Story 11.3)
- **HOLIDAY** - Will use Seasonal Multipliers with specific dates instead

After cleanup, only **NIGHT** and **WEEKEND** rate types should remain in the Advanced Rates section.

## Tasks

1. **Audit existing data** - Check if any organizations have these rate types configured
2. **Create data migration plan** - Document how to handle existing data
3. **Update AdvancedRateAppliesTo enum** - Remove deprecated types from Prisma schema
4. **Update API validation** - Remove deprecated types from Zod schemas
5. **Update UI components** - Remove deprecated options from forms and filters
6. **Update pricing engine** - Remove handling for deprecated types
7. **Create migration script** - Migrate or archive existing deprecated rates
8. **Update translations** - Remove unused translation keys
9. **Update documentation** - Update any docs referencing deprecated types
10. **Write tests** to verify deprecated types are rejected

## Acceptance Criteria

### AC1: Types Removed from UI

**Given** I am creating or editing an Advanced Rate  
**When** I view the "Type" dropdown  
**Then** I only see: NIGHT, WEEKEND  
**And** LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY are not available

### AC2: Types Removed from Filters

**Given** I am on the Advanced Rates list  
**When** I view the type filter dropdown  
**Then** I only see: All, Night, Weekend  
**And** Long Distance, Zone-Based, Holiday are not available

### AC3: API Rejects Deprecated Types

**Given** I try to create an advanced rate via API  
**When** I send `appliesTo: "LONG_DISTANCE"`  
**Then** the API returns a 400 validation error  
**And** the error message indicates the type is not valid

### AC4: Existing Data Handled

**Given** existing advanced rates with deprecated types  
**When** the migration runs  
**Then** ZONE_SCENARIO rates are migrated to zone multipliers (Story 11.3)  
**And** LONG_DISTANCE rates are archived or deleted (with notification)  
**And** HOLIDAY rates are converted to Seasonal Multipliers (if applicable)

### AC5: Pricing Engine Updated

**Given** the pricing engine  
**When** calculating a price  
**Then** it no longer checks for LONG_DISTANCE, ZONE_SCENARIO, or HOLIDAY advanced rates  
**And** zone multipliers are applied from PricingZone model instead

### AC6: Summary Cards Updated

**Given** the Advanced Rates page  
**When** I view the summary cards  
**Then** I only see cards for Night Rates and Weekend Rates  
**And** Long Distance, Zone-Based, Holiday cards are removed

### AC7: Database Schema Updated

**Given** the Prisma schema  
**When** I view the AdvancedRateAppliesTo enum  
**Then** it only contains: NIGHT, WEEKEND

## Technical Notes

### Schema Changes

```prisma
// Before
enum AdvancedRateAppliesTo {
  NIGHT
  WEEKEND
  LONG_DISTANCE
  ZONE_SCENARIO
  HOLIDAY
}

// After
enum AdvancedRateAppliesTo {
  NIGHT
  WEEKEND
}
```

### Migration Strategy

#### For ZONE_SCENARIO rates:

1. For each ZONE_SCENARIO rate, find the associated zone
2. Set the zone's `priceMultiplier` to the rate's value
3. Mark the advanced rate as migrated (soft delete or archive)

#### For LONG_DISTANCE rates:

1. Log the rates that will be removed
2. Notify organization admins (optional)
3. Soft delete or archive the rates

#### For HOLIDAY rates:

1. Convert to Seasonal Multipliers with the same date ranges
2. Mark the advanced rate as migrated

### Files to Modify

- `packages/database/prisma/schema.prisma` - Update enum
- `packages/api/src/routes/vtc/advanced-rates.ts` - Update validation
- `packages/api/src/services/pricing-engine.ts` - Remove deprecated logic
- `apps/web/modules/saas/settings/pricing/types/advanced-rate.ts` - Update types
- `apps/web/modules/saas/settings/pricing/components/AdvancedRateFormDialog.tsx` - Update form
- `apps/web/modules/saas/settings/pricing/components/AdvancedRateList.tsx` - Update filters
- `apps/web/modules/saas/settings/pricing/components/AdvancedRateSummaryCards.tsx` - Update cards
- Translation files - Remove unused keys

### Migration Script Location

`packages/database/prisma/migrations/YYYYMMDD_remove_deprecated_rate_types/`

### Rollback Plan

1. Keep deprecated rates in an archive table for 30 days
2. Provide a rollback script if needed
3. Document the rollback process

## Risks

- **Data loss** - Existing configurations may be lost
- **Breaking changes** - External integrations may break

## Mitigation

- Audit all organizations before migration
- Notify affected users
- Provide migration path for each deprecated type
- Keep archived data for rollback

## Dependencies

- Story 11.3 (Zone Pricing Multipliers) should be completed first for ZONE_SCENARIO migration

## Out of Scope

- Adding new rate types
- Modifying NIGHT or WEEKEND behavior
- Creating a rate type management UI

## Definition of Done

- [ ] Deprecated types removed from enum
- [ ] UI updated to show only NIGHT/WEEKEND
- [ ] API rejects deprecated types
- [ ] Migration script created and tested
- [ ] Existing data migrated or archived
- [ ] Pricing engine updated
- [ ] Summary cards updated
- [ ] Translations cleaned up
- [ ] Documentation updated
- [ ] Tests passing
- [ ] Code reviewed and approved
