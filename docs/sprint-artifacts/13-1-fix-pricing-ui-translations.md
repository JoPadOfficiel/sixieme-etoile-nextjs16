# Story 13.1: Fix Pricing UI Translations - Consistent i18n

**Epic:** 13 - Pricing UI Improvements & Partner Filtering  
**Status:** drafted  
**Priority:** High  
**Estimate:** 2 SP

---

## User Story

**As a** User  
**I want** all pricing UI labels to be displayed in my selected language (EN or FR) consistently  
**So that** I have a coherent user experience without mixed language labels

---

## Problem Statement

The Partner Contract UI and Price Override components display mixed French/English labels. Labels like "Trajet", "Catégorie", "Prix catalogue", "Prix négocié", "Négocié", "Catalogue" are hardcoded in French instead of using the i18n translation system.

### Current State

```
TrajetCatégoriePrix cataloguePrix négocié
Bussy-Saint-Martin → Zone Premium Paris
Berline
85.00 €
75.00 €
Négocié
```

### Expected State

All labels should use `t()` function with proper translation keys, displaying in the user's selected locale.

---

## Acceptance Criteria

### AC1: Table Headers Use Translation Keys

**Given** the PriceOverrideTable component  
**When** rendered in any locale  
**Then** all table headers (Route, Category, Catalog Price, Negotiated Price) use `t()` with translation keys

### AC2: Status Badges Use Translation Keys

**Given** a price cell with negotiated or catalog status  
**When** rendered in any locale  
**Then** the badge text ("Negotiated"/"Catalog") uses `t()` with translation keys

### AC3: Tooltips and Buttons Use Translation Keys

**Given** action buttons (Edit, Reset to catalog)  
**When** rendered in any locale  
**Then** all tooltips and aria-labels use `t()` with translation keys

### AC4: English Translations Complete

**Given** the en.json translation file  
**When** all pricing components are rendered  
**Then** no missing translation warnings appear in console

### AC5: French Translations Complete

**Given** the fr.json translation file  
**When** all pricing components are rendered in French locale  
**Then** no missing translation warnings appear in console

### AC6: No Hardcoded Strings

**Given** a grep search for French/English strings in pricing components  
**When** searching for common pricing terms  
**Then** no hardcoded strings are found (all use t())

---

## Technical Tasks

### Task 1: Audit Current Hardcoded Strings

- [ ] Search PriceOverrideTable.tsx for hardcoded strings
- [ ] Search PriceOverrideCell.tsx for hardcoded strings
- [ ] Document all strings that need translation keys

### Task 2: Add Translation Keys to en.json

- [ ] Add `contacts.contract.priceOverride.route` = "Route"
- [ ] Add `contacts.contract.priceOverride.category` = "Category"
- [ ] Add `contacts.contract.priceOverride.catalogPrice` = "Catalog Price"
- [ ] Add `contacts.contract.priceOverride.negotiatedPrice` = "Negotiated Price"
- [ ] Add `contacts.contract.priceOverride.negotiated` = "Negotiated"
- [ ] Add `contacts.contract.priceOverride.catalog` = "Catalog"
- [ ] Add `contacts.contract.priceOverride.edit` = "Edit"
- [ ] Add `contacts.contract.priceOverride.resetToCatalog` = "Reset to catalog price"
- [ ] Add `contacts.contract.priceOverride.setNegotiated` = "Set negotiated price"
- [ ] Add `contacts.contract.priceOverride.noRoutes` = "No zone routes assigned"
- [ ] Add `contacts.contract.priceOverride.noExcursions` = "No excursion packages assigned"
- [ ] Add `contacts.contract.priceOverride.noDispos` = "No dispo packages assigned"
- [ ] Add `contacts.contract.priceOverride.countNegotiated` = "{count} negotiated"

### Task 3: Add Translation Keys to fr.json

- [ ] Add `contacts.contract.priceOverride.route` = "Trajet"
- [ ] Add `contacts.contract.priceOverride.category` = "Catégorie"
- [ ] Add `contacts.contract.priceOverride.catalogPrice` = "Prix catalogue"
- [ ] Add `contacts.contract.priceOverride.negotiatedPrice` = "Prix négocié"
- [ ] Add `contacts.contract.priceOverride.negotiated` = "Négocié"
- [ ] Add `contacts.contract.priceOverride.catalog` = "Catalogue"
- [ ] Add `contacts.contract.priceOverride.edit` = "Modifier"
- [ ] Add `contacts.contract.priceOverride.resetToCatalog` = "Réinitialiser au prix catalogue"
- [ ] Add `contacts.contract.priceOverride.setNegotiated` = "Définir un prix négocié"
- [ ] Add `contacts.contract.priceOverride.noRoutes` = "Aucune route de zone assignée"
- [ ] Add `contacts.contract.priceOverride.noExcursions` = "Aucun forfait excursion assigné"
- [ ] Add `contacts.contract.priceOverride.noDispos` = "Aucun forfait dispo assigné"
- [ ] Add `contacts.contract.priceOverride.countNegotiated` = "{count} négocié"

### Task 4: Update PriceOverrideTable.tsx

- [ ] Import useTranslations hook
- [ ] Replace all hardcoded strings with t() calls
- [ ] Update table headers
- [ ] Update empty state messages
- [ ] Update section titles

### Task 5: Update PriceOverrideCell.tsx

- [ ] Import useTranslations hook
- [ ] Replace badge text with t() calls
- [ ] Replace tooltip text with t() calls
- [ ] Replace button aria-labels with t() calls

### Task 6: Verify and Test

- [ ] Run grep to confirm no hardcoded strings remain
- [ ] Test in English locale
- [ ] Test in French locale
- [ ] Verify no console warnings

---

## Files to Modify

| File                                                               | Action | Description                        |
| ------------------------------------------------------------------ | ------ | ---------------------------------- |
| `packages/i18n/translations/en.json`                               | Modify | Add priceOverride translation keys |
| `packages/i18n/translations/fr.json`                               | Modify | Add priceOverride translation keys |
| `apps/web/modules/saas/contacts/components/PriceOverrideTable.tsx` | Modify | Replace hardcoded strings with t() |
| `apps/web/modules/saas/contacts/components/PriceOverrideCell.tsx`  | Modify | Replace hardcoded strings with t() |

---

## Testing Strategy

### Unit Tests

- Verify translation keys exist in both locale files
- Verify no hardcoded strings in components

### Playwright MCP Tests

1. Navigate to partner contract in EN locale
2. Verify all labels are in English
3. Switch to FR locale
4. Verify all labels are in French

### Manual Verification

- Visual inspection of UI in both locales
- Console check for missing translation warnings

---

## Definition of Done

- [ ] All hardcoded strings replaced with t() calls
- [ ] Translation keys added to en.json
- [ ] Translation keys added to fr.json
- [ ] No console warnings for missing translations
- [ ] Playwright tests pass
- [ ] Code review approved
- [ ] Merged to main

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/13-1-fix-pricing-ui-translations.context.xml`

### Implementation Log

_To be filled during development_
