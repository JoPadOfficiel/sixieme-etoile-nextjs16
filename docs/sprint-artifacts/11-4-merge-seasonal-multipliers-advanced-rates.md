# Story 11.4: Merge Seasonal Multipliers & Advanced Rates Pages

## Story

**As an** operator  
**I want** Seasonal Multipliers and Advanced Rates combined into a single page  
**So that** I can manage all time-based and condition-based pricing adjustments from one place

## Status

- **Sprint**: 11
- **Priority**: High
- **Estimate**: 5 points
- **Related FRs**: FR58, FR59

## Background

Currently, pricing adjustments are split across two separate pages:

- **Seasonal Multipliers** (`/settings/pricing/seasonal-multipliers`) - Date-based multipliers
- **Advanced Rates** (`/settings/pricing/advanced-rates`) - Night, Weekend, and deprecated types

This separation creates unnecessary navigation and makes it harder to see the full picture of pricing adjustments. Additionally, several Advanced Rate types are now obsolete:

- **LONG_DISTANCE**: Replaced by zone-based pricing (Story 11.3)
- **ZONE_SCENARIO**: Replaced by `PricingZone.priceMultiplier` (Story 11.3)
- **HOLIDAY**: Not used in production, seasonal multipliers handle events better

## Tasks

1. **Remove deprecated Advanced Rate types from Prisma enum** - Remove LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY
2. **Update pricing engine** - Remove evaluation logic for deprecated types
3. **Update frontend types** - Remove deprecated types from TypeScript definitions
4. **Update UI components** - Remove deprecated type options from filters and forms
5. **Create unified PricingAdjustmentsPage** - New page combining both features
6. **Implement tabbed interface** - Tabs for "Seasonal" and "Time-Based"
7. **Create unified summary cards** - Show combined stats across all adjustment types
8. **Migrate seasonal multipliers components** - Move to new page structure
9. **Migrate advanced rates components** - Move to new page structure (NIGHT/WEEKEND only)
10. **Update navigation** - Replace two menu items with single "Pricing Adjustments" item
11. **Add redirects** - Redirect old URLs to new page
12. **Remove old pages** - Delete deprecated page files
13. **Update translations** - Consolidate and update translation keys
14. **Write E2E tests** for merged page

## Acceptance Criteria

### AC1: Single Page Access

**Given** I navigate to Settings → Pricing  
**When** I look for pricing adjustments  
**Then** I see a single "Pricing Adjustments" or "Rate Modifiers" menu item  
**And** clicking it takes me to the merged page

### AC2: Tabbed Interface

**Given** I am on the Pricing Adjustments page  
**When** I view the page  
**Then** I see tabs:

- "Seasonal" - Date-based multipliers (events, holidays, high season)
- "Time-Based" - Night rates, Weekend rates only (NIGHT, WEEKEND types)

### AC3: Unified Summary Cards

**Given** the Pricing Adjustments page  
**When** I view the summary section  
**Then** I see cards showing:

- Total Active Adjustments
- Currently Active (applying right now)
- Upcoming (scheduled to start)
- By Type breakdown

### AC4: Seasonal Tab Content

**Given** I am on the "Seasonal" tab  
**When** I view the content  
**Then** I see the existing Seasonal Multipliers functionality:

- List of seasonal multipliers
- Add/Edit/Delete actions
- Date range and multiplier value

### AC5: Time-Based Tab Content

**Given** I am on the "Time-Based" tab  
**When** I view the content  
**Then** I see Night and Weekend rate modifiers:

- List of time-based rates
- Add/Edit/Delete actions
- Time ranges and day selections

### AC6: URL Redirects

**Given** I have bookmarked the old URLs  
**When** I navigate to `/settings/pricing/seasonal-multipliers`  
**Then** I am redirected to `/settings/pricing/adjustments?tab=seasonal`

**When** I navigate to `/settings/pricing/advanced-rates`  
**Then** I am redirected to `/settings/pricing/adjustments?tab=time-based`

### AC7: Data Integrity

**Given** existing seasonal multipliers and advanced rates  
**When** the pages are merged  
**Then** all existing data is preserved and accessible  
**And** CRUD operations work as before

## Technical Notes

### New Page Structure

```
/settings/pricing/adjustments/
  page.tsx - Main page with tabs

/modules/saas/settings/pricing/components/
  PricingAdjustmentsPage.tsx - Main page component
  PricingAdjustmentsTabs.tsx - Tab navigation
  SeasonalMultipliersTab.tsx - Seasonal content (reuse existing components)
  TimeBasedRatesTab.tsx - Night/Weekend content (reuse existing components)
```

### Files to Modify

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/` - Add new page, remove old ones
- Navigation configuration (if applicable)
- Translation files

### Files to Delete (after migration)

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/seasonal-multipliers/page.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/advanced-rates/page.tsx`

### Redirect Implementation

Use Next.js redirects in `next.config.js` or middleware:

```javascript
{
  source: '/app/:slug/settings/pricing/seasonal-multipliers',
  destination: '/app/:slug/settings/pricing/adjustments?tab=seasonal',
  permanent: true,
}
```

### Component Reuse

Existing components can be reused with minimal changes:

- `SeasonalMultiplierList` → Use in Seasonal tab
- `SeasonalMultiplierFormDialog` → Use in Seasonal tab
- `AdvancedRateList` → Use in Time-Based tab (filter to NIGHT/WEEKEND only)
- `AdvancedRateFormDialog` → Use in Time-Based tab

## Out of Scope

- Zone multipliers (handled by Story 11.3 via PricingZone.priceMultiplier)
- Creating new adjustment types
- Modifying core pricing calculation logic

## Dependencies

- **Story 11.3** (Zone Pricing Multipliers) - Completed, provides zone-based pricing
- **Story 9.1** (Seasonal Multipliers) - Completed
- **Story 9.2** (Advanced Rate Modifiers) - Completed

## Test Cases

### TC1: Deprecated Types Removed from Pricing Engine

```bash
# Verify pricing calculation doesn't use deprecated types
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<token>" \
  -d '{"pickup": {...}, "dropoff": {...}, "vehicleCategoryId": "...", "pickupAt": "2025-12-01T23:00:00"}'
# Should only apply NIGHT/WEEKEND rates, not LONG_DISTANCE/ZONE_SCENARIO/HOLIDAY
```

### TC2: Tab Navigation

- Navigate to /settings/pricing/adjustments
- Verify "Seasonal" tab is default
- Click "Time-Based" tab
- Verify URL updates to ?tab=time-based
- Verify only NIGHT/WEEKEND rates shown

### TC3: URL Redirects

- Navigate to /settings/pricing/seasonal-multipliers
- Verify redirect to /settings/pricing/adjustments?tab=seasonal
- Navigate to /settings/pricing/advanced-rates
- Verify redirect to /settings/pricing/adjustments?tab=time-based

### TC4: CRUD Operations

- Create seasonal multiplier → Verify saved
- Edit seasonal multiplier → Verify updated
- Delete seasonal multiplier → Verify removed
- Create NIGHT rate → Verify saved
- Create WEEKEND rate → Verify saved
- Verify no option to create LONG_DISTANCE/ZONE_SCENARIO/HOLIDAY

## Definition of Done

- [x] Deprecated types (LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY) removed from Prisma enum
- [x] Pricing engine updated to only handle NIGHT/WEEKEND
- [x] Frontend types updated
- [x] UI components updated (filters, forms)
- [x] New unified page created at `/settings/pricing/adjustments`
- [x] Tabbed interface implemented
- [x] Unified summary cards showing combined stats
- [x] Seasonal tab functional with existing features
- [x] Time-Based tab functional with NIGHT/WEEKEND only
- [x] Old URLs redirect to new page
- [x] Old page files removed
- [x] Navigation updated
- [x] Translations updated
- [x] E2E tests passing
- [x] Code reviewed and approved
