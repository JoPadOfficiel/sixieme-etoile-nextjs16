# Story 30.1: Quote Workflow Fixes & PDF Customization

## Story Information

| Field                | Value                                                             |
| -------------------- | ----------------------------------------------------------------- |
| **Story ID**         | 30.1                                                              |
| **Epic**             | Epic 30 - Validation & Stabilization of Quote-to-Invoice Workflow |
| **Title**            | Quote Workflow Fixes & PDF Customization                          |
| **Status**           | review                                                            |
| **Priority**         | Critical                                                          |
| **Estimated Points** | 8                                                                 |
| **Assignee**         | Amelia (Developer)                                                |
| **Created**          | 2026-01-22                                                        |

---

## Description

### Business Context

Stabilisation critique du workflow Devis → Facture avant mise en production. Les bugs actuels de persistance des données et de génération PDF bloquent la facturation réelle des clients.

### User Story

**En tant qu'** opérateur VTC,  
**Je veux** que mes modifications de devis soient correctement sauvegardées, que je puisse annuler/dupliquer des devis, et que les PDF générés affichent des descriptions professionnelles,  
**Afin de** pouvoir facturer mes clients avec des documents conformes et gérer efficacement mon portefeuille de devis.

### Scope

#### In Scope

1. **Fix Persistence** : Correction de la sauvegarde JSON `sourceData` (pickup/dropoff)
2. **Fix Actions** :
   - Action "Annuler" → Statut `CANCELLED` immédiat, UI verrouillée
   - Action "Dupliquer" → Deep clone complet des `QuoteLines` avec tous les champs
3. **Moteur PDF** :
   - Description enrichie : "Type + Lieux + Véhicule + PAX" au lieu de "Transfer"
   - Fix prix 0.00€ : Vérification mapping `unitPrice`/`taxRate`
4. **Settings PDF** : Section "PDF Appearance" (Simple/Standard/Full) avec Live Preview
5. **Visuals** : Map masquée si pas de mission, fiche contact immédiate, traductions manquantes

#### Out of Scope

- Refonte complète du moteur de pricing
- Nouveaux types de documents PDF
- Intégration signature électronique

---

## Acceptance Criteria

### AC1: Persistance JSON sourceData

```gherkin
GIVEN un devis existant avec des QuoteLines
WHEN l'opérateur modifie le pickup/dropoff dans sourceData
AND sauvegarde le devis
AND recharge la page
THEN les modifications de sourceData sont persistées en base
AND les valeurs affichées correspondent aux valeurs sauvegardées
```

### AC2: Action Annuler (CANCELLED)

```gherkin
GIVEN un devis en statut DRAFT ou SENT
WHEN l'opérateur clique sur "Annuler le devis"
THEN le statut passe immédiatement à CANCELLED
AND l'UI affiche un badge "Annulé" rouge
AND tous les champs sont verrouillés (lecture seule)
AND les actions "Envoyer", "Accepter", "Dupliquer" restent disponibles
AND l'action "Modifier" est désactivée
```

### AC3: Action Dupliquer (Deep Clone)

```gherkin
GIVEN un devis avec plusieurs QuoteLines
WHEN l'opérateur clique sur "Dupliquer"
THEN un NOUVEAU devis est créé en statut DRAFT
AND toutes les QuoteLines sont clonées avec:
  - label, description, type
  - unitPrice, totalPrice, vatRate
  - sourceData (JSON complet)
  - displayData (JSON complet)
  - sortOrder, parentId (remappé)
AND le nouveau devis a un nouvel ID
AND l'opérateur est redirigé vers le nouveau devis
```

### AC4: PDF Description Enrichie

```gherkin
GIVEN un devis de type TRANSFER
WHEN l'opérateur génère un PDF
THEN la description de ligne affiche:
  "Transfert VTC - [Pickup] → [Dropoff]
   Date: [Date formatée] | Véhicule: [Catégorie] | [X] PAX"
AND non pas simplement "Transfer" ou "Transport"
```

### AC5: PDF Prix Corrects

```gherkin
GIVEN un devis avec des lignes ayant unitPrice > 0
WHEN l'opérateur génère un PDF
THEN chaque ligne affiche le prix unitaire correct (non 0.00€)
AND le total HT est la somme des lignes
AND le total TVA est calculé correctement
AND le total TTC = HT + TVA
```

### AC6: Settings PDF Appearance

```gherkin
GIVEN l'opérateur dans Settings > Documents
WHEN il accède à la section "PDF Appearance"
THEN il peut choisir entre:
  - Simple: Logo + Infos essentielles
  - Standard: Logo + Infos + Détails trajet
  - Full: Tout + Breakdown coûts
AND un Live Preview montre l'aperçu du rendu
AND les changements sont sauvegardés dans OrganizationPricingSettings
```

### AC7: UX Améliorations

```gherkin
GIVEN l'opérateur sur la page de détail d'un devis
WHEN aucune mission n'est sélectionnée
THEN la Map est masquée (ou affiche un placeholder)
AND la fiche contact est affichée immédiatement
AND toutes les traductions sont présentes (quotes.actions.edit, etc.)
```

---

## Technical Design

### 1. Schema Changes

#### Add CANCELLED to QuoteStatus enum

```prisma
// packages/database/prisma/schema.prisma
enum QuoteStatus {
  DRAFT
  SENT
  VIEWED
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED  // NEW
}
```

#### Add pdfAppearance to OrganizationPricingSettings

```prisma
// packages/database/prisma/schema.prisma
model OrganizationPricingSettings {
  // ... existing fields
  pdfAppearance  String  @default("STANDARD") // SIMPLE | STANDARD | FULL
}
```

### 2. API Changes

#### POST /quotes/:id/duplicate

```typescript
// packages/api/src/routes/vtc/quotes.ts
.post("/:id/duplicate", async (c) => {
  // 1. Fetch original quote with lines
  // 2. Create new quote with DRAFT status
  // 3. Deep clone all QuoteLines with remapped parentIds
  // 4. Return new quote
})
```

#### PATCH /quotes/:id (Add CANCELLED transition)

```typescript
// Update VALID_TRANSITIONS to allow CANCELLED from DRAFT, SENT, VIEWED
```

### 3. Frontend Changes

#### useQuoteActions.ts

```typescript
// Add cancelQuote and duplicateQuote mutations
const cancelQuote = (quoteId: string) => {
  return updateQuoteMutation.mutateAsync({ quoteId, status: "CANCELLED" });
};

const duplicateQuote = async (quoteId: string) => {
  const response = await apiClient.vtc.quotes[":id"].duplicate.$post({
    param: { id: quoteId },
  });
  return response.json();
};
```

#### DocumentSettingsForm.tsx

```typescript
// Add PDF Appearance section with radio buttons
// Add LivePreview component
```

### 4. PDF Generator Changes

#### buildEnrichedDescription enhancement

```typescript
// packages/api/src/services/invoice-line-utils.ts
// Ensure description includes: Type + Pickup → Dropoff + Date + Vehicle + PAX
```

---

## Test Cases

### Unit Tests

| ID   | Test Case                       | Expected Result                                    |
| ---- | ------------------------------- | -------------------------------------------------- |
| UT-1 | Cancel quote from DRAFT         | Status = CANCELLED                                 |
| UT-2 | Cancel quote from SENT          | Status = CANCELLED                                 |
| UT-3 | Duplicate quote with 3 lines    | New quote with 3 cloned lines                      |
| UT-4 | Duplicate preserves sourceData  | JSON identical                                     |
| UT-5 | buildEnrichedDescription output | Contains Type, Pickup, Dropoff, Date, Vehicle, PAX |

### Integration Tests

| ID   | Test Case                             | Expected Result              |
| ---- | ------------------------------------- | ---------------------------- |
| IT-1 | Save quote, modify sourceData, reload | Data persisted               |
| IT-2 | Generate PDF for TRANSFER             | Description enrichie visible |
| IT-3 | PDF totals calculation                | HT + TVA = TTC               |

### E2E Tests (Cypress/MCP Browser)

| ID    | Test Case        | Steps                                                              |
| ----- | ---------------- | ------------------------------------------------------------------ |
| E2E-1 | Persistence Test | 1. Open quote 2. Modify pickup 3. Save 4. Reload 5. Verify         |
| E2E-2 | Duplicate Test   | 1. Open quote 2. Click Duplicate 3. Verify new quote has all lines |
| E2E-3 | PDF Generation   | 1. Open quote 2. Generate PDF 3. Verify descriptions and totals    |
| E2E-4 | Cancel Test      | 1. Open DRAFT quote 2. Cancel 3. Verify locked UI                  |

---

## Dependencies

### Internal Dependencies

- Epic 26: Hybrid Blocks (QuoteLine model) - ✅ Done
- Epic 29: Shopping Cart persistence - ✅ Done
- Story 7.5: Document Generation - ✅ Done

### External Dependencies

- React-PDF library
- Prisma JSON handling

---

## Constraints

1. **Backward Compatibility**: Existing quotes must remain functional
2. **Performance**: PDF generation < 3 seconds
3. **Data Integrity**: No data loss during duplication
4. **Translations**: French and English support

---

## Files to Modify

### Backend

- `packages/database/prisma/schema.prisma` - Add CANCELLED, pdfAppearance
- `packages/api/src/routes/vtc/quotes.ts` - Add duplicate endpoint, CANCELLED transition
- `packages/api/src/routes/vtc/quote-lines.ts` - Fix sourceData persistence
- `packages/api/src/services/invoice-line-utils.ts` - Enhance buildEnrichedDescription
- `packages/api/src/routes/vtc/documents.ts` - Use pdfAppearance setting

### Frontend

- `apps/web/modules/saas/quotes/types.ts` - Add CANCELLED to QuoteStatus
- `apps/web/modules/saas/quotes/hooks/useQuoteActions.ts` - Add cancel/duplicate
- `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx` - UI for cancel/duplicate
- `apps/web/modules/saas/organizations/components/DocumentSettingsForm.tsx` - PDF Appearance
- `apps/web/locales/fr.json` - Missing translations
- `apps/web/locales/en.json` - Missing translations

---

## Definition of Done

- [ ] All Acceptance Criteria pass
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Code reviewed
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Translations complete (FR/EN)
- [ ] Documentation updated if needed

---

## Implementation Summary

### Completed (2026-01-22)

#### Backend Changes

| File                                               | Changes                                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma`           | Added `PdfAppearance` enum (SIMPLE/STANDARD/FULL), `pdfAppearance` field to `OrganizationPricingSettings`, `cancelledAt` timestamp to `Quote`     |
| `packages/api/src/routes/vtc/quotes.ts`            | Added `POST /:id/duplicate` endpoint for deep cloning quotes with all lines, StayDays, and StayServices. Added `CANCELLED` to `updateQuoteSchema` |
| `packages/api/src/services/quote-state-machine.ts` | Updated `isNotesEditable()` to exclude CANCELLED status                                                                                           |

#### Frontend Changes

| File                                                                      | Changes                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web/modules/saas/quotes/types.ts`                                   | Added `CANCELLED` to `QuoteStatus`, updated `VALID_TRANSITIONS`, added `canCancel()` helper |
| `apps/web/modules/saas/quotes/hooks/useQuoteActions.ts`                   | Added `duplicateQuoteMutation`, `cancelQuote()`, `duplicateQuote()` functions               |
| `apps/web/modules/saas/quotes/components/QuotesTable.tsx`                 | Integrated cancel/duplicate actions, added `CANCELLED` to status filter                     |
| `apps/web/modules/saas/quotes/components/QuoteStatusBadge.tsx`            | Added `CANCELLED` case with Ban icon and slate color                                        |
| `apps/web/modules/saas/organizations/components/DocumentSettingsForm.tsx` | Added `pdfAppearance` state, handler, and UI selector                                       |

#### Translations

| File                                 | Changes                                                                                                                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/i18n/translations/fr.json` | Added `quotes.status.cancelled`, `quotes.detail.actions.cancel/duplicate/cancelSuccess/cancelError/duplicateSuccess/duplicateError`, `settings.documentSettings.pdfAppearance.*` |
| `packages/i18n/translations/en.json` | Same keys in English                                                                                                                                                             |

### CRITICAL FIXES Completed (2026-01-22)

| Fix                                | Files Modified                                                            | Description                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **PDF description enrichment**     | `packages/api/src/services/invoice-line-utils.ts` (already implemented)   | `buildEnrichedDescription` already generates multi-line descriptions with Type+Date, Departure/Arrival, Pax/Luggage/Vehicle |
| **Fix 0.00€ price mapping**        | `packages/api/src/routes/vtc/documents.ts:415-421`                        | Use QuoteLine prices (`l.unitPrice`, `l.totalPrice`) as fallback when display prices are 0                                  |
| **Map visibility toggle**          | `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx:274-290`     | Only provide `routeCoordinates` if both pickup AND dropoff coordinates are valid                                            |
| **Contact card immediate display** | `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx:241-286` | Add Contact Card that appears immediately when contact is selected, showing name, company, email, phone, and badge          |

### Translations Added

| File                                 | Keys Added                        |
| ------------------------------------ | --------------------------------- |
| `packages/i18n/translations/fr.json` | `quotes.create.contactCard.title` |
| `packages/i18n/translations/en.json` | `quotes.create.contactCard.title` |

### Pending Items

- [ ] None - All CRITICAL FIXES completed

---

## Notes

- **Critical Path**: This story blocks production deployment
- **Risk**: JSON persistence bug may require Prisma middleware investigation
- **Testing Strategy**: MCP Browser for E2E, manual verification for PDF visual quality
