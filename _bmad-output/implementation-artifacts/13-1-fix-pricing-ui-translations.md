# Story 13.1: Fix Pricing UI Translations - Consistent i18n

**Epic:** 13 - Pricing UI Improvements & Partner Filtering  
**Status:** done  
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

- [x] Search PriceOverrideTable.tsx for hardcoded strings
- [x] Search PriceOverrideCell.tsx for hardcoded strings
- [x] Document all strings that need translation keys

### Task 2: Add Translation Keys to en.json

- [x] Add `contacts.contract.priceOverride.route` = "Route"
- [x] Add `contacts.contract.priceOverride.category` = "Category"
- [x] Add `contacts.contract.priceOverride.catalogPrice` = "Catalog Price"
- [x] Add `contacts.contract.priceOverride.negotiatedPrice` = "Negotiated Price"
- [x] Add `contacts.contract.priceOverride.negotiated` = "Negotiated"
- [x] Add `contacts.contract.priceOverride.catalog` = "Catalog"
- [x] Add `contacts.contract.priceOverride.edit` = "Edit"
- [x] Add `contacts.contract.priceOverride.resetToCatalog` = "Reset to catalog price"
- [x] Add `contacts.contract.priceOverride.setNegotiated` = "Set negotiated price"
- [x] Add `contacts.contract.priceOverride.noRoutes` = "No zone routes assigned"
- [x] Add `contacts.contract.priceOverride.noExcursions` = "No excursion packages assigned"
- [x] Add `contacts.contract.priceOverride.noDispos` = "No dispo packages assigned"
- [x] Add `contacts.contract.priceOverride.countNegotiated` = "{count} negotiated"

### Task 3: Add Translation Keys to fr.json

- [x] Add `contacts.contract.priceOverride.route` = "Trajet"
- [x] Add `contacts.contract.priceOverride.category` = "Catégorie"
- [x] Add `contacts.contract.priceOverride.catalogPrice` = "Prix catalogue"
- [x] Add `contacts.contract.priceOverride.negotiatedPrice` = "Prix négocié"
- [x] Add `contacts.contract.priceOverride.negotiated` = "Négocié"
- [x] Add `contacts.contract.priceOverride.catalog` = "Catalogue"
- [x] Add `contacts.contract.priceOverride.edit` = "Modifier"
- [x] Add `contacts.contract.priceOverride.resetToCatalog` = "Réinitialiser au prix catalogue"
- [x] Add `contacts.contract.priceOverride.setNegotiated` = "Définir un prix négocié"
- [x] Add `contacts.contract.priceOverride.noRoutes` = "Aucune route de zone assignée"
- [x] Add `contacts.contract.priceOverride.noExcursions` = "Aucun forfait excursion assigné"
- [x] Add `contacts.contract.priceOverride.noDispos` = "Aucun forfait dispo assigné"
- [x] Add `contacts.contract.priceOverride.countNegotiated` = "{count} négocié"

### Task 4: Update PriceOverrideTable.tsx

- [x] Import useTranslations hook
- [x] Replace all hardcoded strings with t() calls
- [x] Update table headers
- [x] Update empty state messages
- [x] Update section titles

### Task 5: Update PriceOverrideCell.tsx

- [x] Import useTranslations hook
- [x] Replace badge text with t() calls
- [x] Replace tooltip text with t() calls
- [x] Replace button aria-labels with t() calls

### Task 6: Verify and Test

- [x] Run grep to confirm no hardcoded strings remain
- [x] Test in English locale
- [x] Test in French locale
- [x] Verify no console warnings

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

- [x] All hardcoded strings replaced with t() calls
- [x] Translation keys added to en.json
- [x] Translation keys added to fr.json
- [x] No console warnings for missing translations
- [x] Playwright tests pass
- [x] Code review approved
- [x] Merged to main

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/13-1-fix-pricing-ui-translations.context.xml`

### Implementation Log

_To be filled during development_
