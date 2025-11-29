# Story 11.5: Merge Optional Fees & Promotions Pages

## Story

**As an** operator  
**I want** Optional Fees and Promotions combined into a single page  
**So that** I can manage all quote add-ons and discounts from one place

## Background

Currently, quote extras are split across two separate pages:

- **Optional Fees** (`/settings/pricing/optional-fees`) - Add-on charges (baby seat, waiting time, etc.)
- **Promotions** (`/settings/pricing/promotions`) - Promo codes and discounts

These are related concepts (both affect the final quote price) and should be managed together. The user wants these merged into a single "Extras & Promotions" or "Add-ons" page.

## Tasks

1. **Create unified ExtrasPromotionsPage** - New page combining both features
2. **Implement tabbed interface** - Tabs for "Optional Fees" and "Promotions"
3. **Create unified summary cards** - Show combined stats
4. **Migrate optional fees components** - Move to new page structure
5. **Migrate promotions components** - Move to new page structure
6. **Update navigation** - Replace two menu items with single item
7. **Add redirects** - Redirect old URLs to new page
8. **Remove old pages** - Delete deprecated page files
9. **Update translations** - Consolidate and update translation keys
10. **Write E2E tests** for merged page

## Acceptance Criteria

### AC1: Single Page Access

**Given** I navigate to Settings → Pricing  
**When** I look for extras and promotions  
**Then** I see a single "Extras & Promotions" menu item  
**And** clicking it takes me to the merged page

### AC2: Tabbed Interface

**Given** I am on the Extras & Promotions page  
**When** I view the page  
**Then** I see tabs:

- "Optional Fees" - Add-on charges
- "Promotions" - Promo codes and discounts

### AC3: Unified Summary Cards

**Given** the Extras & Promotions page  
**When** I view the summary section  
**Then** I see cards showing:

- Active Optional Fees count
- Active Promotions count
- Total Promo Uses (this period)
- Revenue from Fees (optional)

### AC4: Optional Fees Tab Content

**Given** I am on the "Optional Fees" tab  
**When** I view the content  
**Then** I see the existing Optional Fees functionality:

- List of optional fees
- Add/Edit/Delete actions
- Fee type (fixed/percentage), amount, VAT settings

### AC5: Promotions Tab Content

**Given** I am on the "Promotions" tab  
**When** I view the content  
**Then** I see the existing Promotions functionality:

- List of promo codes
- Add/Edit/Delete actions
- Code, discount type, validity period, usage limits

### AC6: URL Redirects

**Given** I have bookmarked the old URLs  
**When** I navigate to `/settings/pricing/optional-fees`  
**Then** I am redirected to `/settings/pricing/extras?tab=fees`

**When** I navigate to `/settings/pricing/promotions`  
**Then** I am redirected to `/settings/pricing/extras?tab=promotions`

### AC7: Data Integrity

**Given** existing optional fees and promotions  
**When** the pages are merged  
**Then** all existing data is preserved and accessible  
**And** CRUD operations work as before

## Technical Notes

### New Page Structure

```
/settings/pricing/extras/
  page.tsx - Main page with tabs

/modules/saas/settings/pricing/components/
  ExtrasPromotionsPage.tsx - Main page component
  ExtrasPromotionsTabs.tsx - Tab navigation
  OptionalFeesTab.tsx - Fees content (reuse existing components)
  PromotionsTab.tsx - Promotions content (reuse existing components)
```

### Files to Modify

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/` - Add new page, remove old ones
- Navigation configuration (if applicable)
- Translation files

### Files to Delete (after migration)

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/optional-fees/page.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/promotions/page.tsx`

### Redirect Implementation

Use Next.js redirects in `next.config.js` or middleware:

```javascript
{
  source: '/app/:slug/settings/pricing/optional-fees',
  destination: '/app/:slug/settings/pricing/extras?tab=fees',
  permanent: true,
},
{
  source: '/app/:slug/settings/pricing/promotions',
  destination: '/app/:slug/settings/pricing/extras?tab=promotions',
  permanent: true,
}
```

### Component Reuse

Existing components can be reused with minimal changes:

- `OptionalFeeList` → Use in Optional Fees tab
- `OptionalFeeFormDialog` → Use in Optional Fees tab
- `OptionalFeeSummaryCards` → Adapt for unified summary
- `PromotionList` → Use in Promotions tab
- `PromotionFormDialog` → Use in Promotions tab
- `PromotionSummaryCards` → Adapt for unified summary

## Out of Scope

- Creating new fee or promotion types
- Combining fees and promotions into a single list
- Auto-apply rules configuration

## Definition of Done

- [ ] New unified page created at `/settings/pricing/extras`
- [ ] Tabbed interface implemented
- [ ] Unified summary cards showing combined stats
- [ ] Optional Fees tab functional with existing features
- [ ] Promotions tab functional with existing features
- [ ] Old URLs redirect to new page
- [ ] Old page files removed
- [ ] Navigation updated
- [ ] Translations updated
- [ ] E2E tests passing
- [ ] Code reviewed and approved
