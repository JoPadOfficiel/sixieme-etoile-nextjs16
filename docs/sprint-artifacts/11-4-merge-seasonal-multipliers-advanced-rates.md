# Story 11.4: Merge Seasonal Multipliers & Advanced Rates Pages

## Story

**As an** operator  
**I want** Seasonal Multipliers and Advanced Rates combined into a single page  
**So that** I can manage all time-based and condition-based pricing adjustments from one place

## Background

Currently, pricing adjustments are split across two separate pages:

- **Seasonal Multipliers** (`/settings/pricing/seasonal-multipliers`) - Date-based multipliers
- **Advanced Rates** (`/settings/pricing/advanced-rates`) - Night, Weekend, Long Distance rates

This separation creates unnecessary navigation and makes it harder to see the full picture of pricing adjustments. The user wants these merged into a single "Pricing Adjustments" or "Rate Modifiers" page with tabs or sections.

## Tasks

1. **Create unified PricingAdjustmentsPage** - New page combining both features
2. **Implement tabbed interface** - Tabs for "Seasonal", "Night/Weekend", "Other"
3. **Create unified summary cards** - Show combined stats across all adjustment types
4. **Migrate seasonal multipliers components** - Move to new page structure
5. **Migrate advanced rates components** - Move to new page structure (excluding deprecated types)
6. **Update navigation** - Replace two menu items with single "Pricing Adjustments" item
7. **Add redirects** - Redirect old URLs to new page
8. **Remove old pages** - Delete deprecated page files
9. **Update translations** - Consolidate and update translation keys
10. **Write E2E tests** for merged page

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
- "Time-Based" - Night rates, Weekend rates
- "Other" - Any remaining advanced rate types (if applicable)

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

- Removing deprecated advanced rate types (Story 11.7)
- Zone multipliers (Story 11.3)
- Creating new adjustment types

## Dependencies

- Story 11.7 (Remove Deprecated Advanced Rate Types) should be done first or in parallel

## Definition of Done

- [ ] New unified page created at `/settings/pricing/adjustments`
- [ ] Tabbed interface implemented
- [ ] Unified summary cards showing combined stats
- [ ] Seasonal tab functional with existing features
- [ ] Time-Based tab functional with existing features
- [ ] Old URLs redirect to new page
- [ ] Old page files removed
- [ ] Navigation updated
- [ ] Translations updated
- [ ] E2E tests passing
- [ ] Code reviewed and approved
