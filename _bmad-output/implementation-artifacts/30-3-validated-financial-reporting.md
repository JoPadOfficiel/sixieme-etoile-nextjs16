# Story 30.3: Validated Financial Reporting

## Story Information

- **Epic**: 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- **Story ID**: 30.3
- **Title**: Validated Financial Reporting
- **Status**: review
- **Created**: 2026-01-23
- **Branch**: `feature/30-3-financial-reporting`

---

## Description

### Business Context

Le système de reporting actuel (`reports.ts`) agrège les données de rentabilité depuis les **Quotes** (devis). Cela inclut des devis envoyés mais non facturés, ce qui fausse la vérité comptable.

### Objective

Migrer la source de données des rapports financiers de `Quote` vers `Invoice` pour garantir que seuls les montants **légalement facturés** apparaissent dans les indicateurs de revenu.

### Value Proposition

- **Conformité comptable** : Les rapports reflètent uniquement les factures émises
- **Fiabilité des KPIs** : Indicateurs exploitables pour la gestion financière
- **Audit-ready** : Données utilisables pour la comptabilité officielle

---

## Acceptance Criteria (AC)

### AC1: Invoice-Based Revenue Calculation

- [ ] Le rapport de rentabilité agrège les données depuis `Invoice` au lieu de `Quote`
- [ ] Seules les factures avec `status IN ('ISSUED', 'PARTIAL', 'PAID')` sont incluses
- [ ] Les factures `DRAFT` et `CANCELLED` sont **exclues**

### AC2: Correct Financial Indicators

- [ ] `totalRevenue` = `SUM(Invoice.totalExclVat)` (HT)
- [ ] `pendingAmount` = `SUM(Invoice.totalInclVat - Invoice.paidAmount)` (Reste à payer TTC)
- [ ] `paidAmount` = `SUM(Invoice.paidAmount)` (Montants encaissés)

### AC3: UI Label Updates

- [ ] Les labels "Quote Value" sont renommés en "Invoiced Revenue"
- [ ] Les traductions FR/EN sont mises à jour
- [ ] Le texte "from X quotes" devient "from X invoices"

### AC4: Graceful Empty State

- [ ] Le rapport affiche des valeurs à 0€ si aucune facture n'existe
- [ ] Les graphiques ne plantent pas avec des données vides
- [ ] Un message informatif est affiché si aucune donnée

### AC5: Backward Compatibility

- [ ] Les filtres existants (date, groupBy, profitabilityLevel) fonctionnent toujours
- [ ] L'API conserve la même structure de réponse
- [ ] Les tests existants sont mis à jour pour refléter la nouvelle source

---

## Technical Implementation

### Files to Modify

#### Backend

1. **`packages/api/src/routes/vtc/reports.ts`**

   - Remplacer `db.quote.findMany` par `db.invoice.findMany`
   - Filtrer par `status: { in: ['ISSUED', 'PARTIAL', 'PAID'] }`
   - Mapper les champs: `finalPrice` → `totalExclVat`, etc.

2. **`packages/api/src/routes/vtc/__tests__/reports.test.ts`**
   - Mettre à jour les mocks pour `db.invoice.findMany`
   - Adapter les assertions aux nouveaux champs

#### Frontend

3. **`apps/web/modules/saas/reports/components/ReportSummaryCards.tsx`**

   - Ajouter indicateur `paidAmount` et `pendingAmount`

4. **`apps/web/modules/saas/reports/types/index.ts`**

   - Ajouter `paidAmount` et `pendingAmount` aux types

5. **Translations** (si fichiers i18n existants)
   - `totalRevenue` → "Invoiced Revenue" / "Revenu Facturé"
   - `fromQuotes` → `fromInvoices`

### Data Mapping

| Current (Quote)     | New (Invoice)            | Description                |
| ------------------- | ------------------------ | -------------------------- |
| `finalPrice`        | `totalExclVat`           | Revenue HT                 |
| `internalCost`      | N/A (from costBreakdown) | Internal cost              |
| `marginPercent`     | Calculated               | (revenue - cost) / revenue |
| `pickupAt`          | `issueDate`              | Date for grouping          |
| `contactId`         | `contactId`              | Client grouping            |
| `vehicleCategoryId` | N/A (from lines)         | Category grouping          |

### Invoice Status Filter

```typescript
const validStatuses: InvoiceStatus[] = ["ISSUED", "PARTIAL", "PAID"];
// Exclude: 'DRAFT', 'CANCELLED'
```

---

## Test Cases

### TC1: Quote Without Invoice Shows 0€

**Given**: Un devis accepté à 1000€ sans facture générée
**When**: L'utilisateur consulte le rapport de rentabilité
**Then**: Le revenu affiché est 0€

### TC2: Issued Invoice Shows Correct Amount

**Given**: Une facture émise (ISSUED) de 500€ HT
**When**: L'utilisateur consulte le rapport de rentabilité
**Then**: Le revenu affiché est 500€

### TC3: Draft Invoice Excluded

**Given**: Une facture en brouillon (DRAFT) de 300€
**When**: L'utilisateur consulte le rapport de rentabilité
**Then**: Le revenu affiché est 0€ (facture non comptée)

### TC4: Cancelled Invoice Excluded

**Given**: Une facture annulée (CANCELLED) de 200€
**When**: L'utilisateur consulte le rapport de rentabilité
**Then**: Le revenu affiché est 0€

### TC5: Partial Payment Tracking

**Given**: Une facture de 1000€ TTC avec 400€ payés
**When**: L'utilisateur consulte le rapport
**Then**: `paidAmount` = 400€, `pendingAmount` = 600€

### TC6: Empty State Handling

**Given**: Aucune facture dans l'organisation
**When**: L'utilisateur consulte le rapport
**Then**: Tous les indicateurs affichent 0€, pas d'erreur

### TC7: Date Filtering Works

**Given**: Factures de janvier et février
**When**: L'utilisateur filtre sur janvier uniquement
**Then**: Seules les factures de janvier sont incluses

### TC8: Group By Client Works

**Given**: Factures pour Client A (500€) et Client B (300€)
**When**: L'utilisateur groupe par client
**Then**: Deux lignes: Client A = 500€, Client B = 300€

---

## Dependencies

- **Story 30.1** (done): Quote workflow fixes
- **Story 7.1** (done): Invoice model implementation
- **Story 25.6** (done): Payment tracking (paidAmount field)

---

## Out of Scope

- Modification du calcul de marge (conserve la logique existante si costBreakdown disponible)
- Ajout de nouveaux graphiques
- Export PDF des rapports

---

## Definition of Done

- [x] Code implémenté et fonctionnel
- [x] Tests unitaires mis à jour et passants (7/7 tests)
- [ ] Tests manuels validés (TC1-TC8)
- [x] Traductions mises à jour (EN + FR)
- [ ] PR créée et prête pour review
- [x] Sprint status mis à jour

---

## Notes

- Le champ `costBreakdown` de l'Invoice contient un snapshot des coûts au moment de la facturation
- Pour la marge, utiliser `costBreakdown.internalCost` si disponible, sinon afficher N/A
- Les factures partielles (PARTIAL) comptent pour leur montant total, pas le montant payé

---

## Implementation Results

### Files Modified

1. **`packages/api/src/routes/vtc/reports.ts`**

   - Changed data source from `Quote` to `Invoice`
   - Added status filter: `IN ('ISSUED', 'PARTIAL', 'PAID')`
   - Added `paidAmount` and `pendingAmount` to summary
   - Updated all grouping logic to use Invoice fields

2. **`packages/api/src/routes/vtc/__tests__/reports.test.ts`**

   - Rewrote all tests to mock `db.invoice.findMany`
   - Added tests for status filtering and payment tracking

3. **`apps/web/modules/saas/reports/types/index.ts`**

   - Added `paidAmount` and `pendingAmount` to `ProfitabilityReportSummary`
   - Updated `ProfitabilityReportRow` fields

4. **`apps/web/modules/saas/reports/components/ReportSummaryCards.tsx`**

   - Added "Paid Amount" and "Pending Amount" cards
   - Changed "fromQuotes" to "fromInvoices"
   - Updated grid layout for 6 cards

5. **`packages/i18n/translations/en.json`**

   - Added: `fromInvoices`, `paidAmount`, `pendingAmount`, `amountReceived`, `awaitingPayment`
   - Updated: `totalRevenue` → "Invoiced Revenue", `lossCount` → "Loss-Making Invoices"

6. **`packages/i18n/translations/fr.json`**
   - Added: `fromInvoices`, `paidAmount`, `pendingAmount`, `amountReceived`, `awaitingPayment`
   - Updated: `totalRevenue` → "Revenu facturé", `lossCount` → "Factures déficitaires"

### Tests Executed

```
✓ Reports API Routes (7 tests) 90ms
  ✓ should return profitability report with summary and data from invoices
  ✓ should filter invoices by status (only ISSUED, PARTIAL, PAID)
  ✓ should group by client
  ✓ should group by vehicle category (all categories)
  ✓ should return empty data when no invoices match
  ✓ should respect organization isolation (multi-tenancy)
  ✓ should exclude DRAFT and CANCELLED invoices from revenue

Test Files  1 passed (1)
     Tests  7 passed (7)
```

### Git Commands

```bash
# Push branch
git add -A
git commit -m "feat(reports): Story 30.3 - Invoice-based financial reporting

- Changed profitability report source from Quote to Invoice
- Only include ISSUED, PARTIAL, PAID invoices (exclude DRAFT, CANCELLED)
- Added paidAmount and pendingAmount tracking
- Updated UI with new payment status cards
- Updated translations (EN/FR)
- All tests passing (7/7)"

git push -u origin feature/30-3-financial-reporting
```

### PR Information

- **Branch**: `feature/30-3-financial-reporting`
- **Target**: `main`
- **Title**: `feat(reports): Story 30.3 - Validated Financial Reporting`
- **Description**: Invoice-based revenue reporting for accounting accuracy
