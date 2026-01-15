# Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI

**Epic:** Epic 7 – Invoicing & Documents  
**Status:** done
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2025-11-27

---

## User Story

**As a** finance user,  
**I want** a clear invoices list and detail view backed by proper models,  
**So that** I can manage issued invoices reliably.

---

## Description

Cette story implémente l'interface utilisateur complète pour la gestion des factures dans l'ERP VTC. Les modèles Prisma (`Invoice`, `InvoiceLine`) et l'API backend existent déjà. Cette story se concentre sur :

1. **Page liste des factures** (`/app/[organizationSlug]/invoices`)

   - Table avec colonnes : Invoice No, Client, Issue Date, Due Date, Total (EUR), VAT, Status, Source Quote
   - Filtres : statut, contact, plage de dates, recherche
   - Pagination
   - Actions : voir détail, changer statut

2. **Page détail facture** (`/app/[organizationSlug]/invoices/[id]`)

   - Layout deux colonnes
   - Gauche : informations client/facturation, métadonnées
   - Droite : lignes de facture, ventilation TVA, totaux

3. **Composants réutilisables**
   - `InvoiceStatusBadge` : badges colorés par statut
   - `InvoiceLinesList` : affichage des lignes avec calculs
   - Navigation vers quote source et contact

---

## Acceptance Criteria

### AC1: Invoices List Page

```gherkin
Given /dashboard/invoices
When I open the page
Then I see a table with columns:
  | Column          | Description                           |
  | Invoice No      | Format INV-YYYY-NNNN                  |
  | Client          | Contact name with partner/private badge|
  | Issue Date      | Date d'émission format fr-FR          |
  | Due Date        | Date d'échéance format fr-FR          |
  | Total (EUR)     | Montant TTC formaté €                  |
  | VAT             | Indicateur montant TVA                 |
  | Status          | Badge coloré (Draft/Issued/Paid/Cancelled)|
  | Source Quote    | Lien vers quote si existant            |
```

### AC2: Filters and Search

```gherkin
Given the invoices list
When I filter by status "ISSUED"
Then only invoices with status ISSUED are displayed

When I search for "INV-2025"
Then only matching invoices are displayed

When I filter by date range
Then only invoices in that range are displayed
```

### AC3: Invoice Detail Page

```gherkin
Given /dashboard/invoices/[id]
When I view an invoice
Then I see a two-column layout:
  - Left: billing entity (contact name, address, VAT number)
  - Right: line items table with columns (Description, Qty, Unit Price, VAT Rate, Total)
And I see totals section with:
  - Total HT (excl. VAT)
  - Total TVA (VAT amount)
  - Total TTC (incl. VAT)
```

### AC4: Navigation to Source Quote

```gherkin
Given an invoice linked to a quote
When I view the invoice detail
Then I see a "Source Quote" link
And clicking it navigates to /dashboard/quotes/[quoteId]
```

### AC5: Commission Display for Partners

```gherkin
Given an invoice for a partner contact with commission
When I view the invoice detail
Then I see the commission amount displayed in the metadata section
```

### AC6: Status Transitions

```gherkin
Given a DRAFT invoice
When I click "Issue Invoice" action
Then the status changes to ISSUED
And the badge updates to reflect the new status

Given an ISSUED invoice
When I click "Mark as Paid" action
Then the status changes to PAID
```

---

## Technical Implementation

### File Structure

```
apps/web/
├── app/(saas)/app/(organizations)/[organizationSlug]/invoices/
│   ├── page.tsx                    # Invoices list page
│   └── [id]/
│       └── page.tsx                # Invoice detail page
└── modules/saas/invoices/
    ├── components/
    │   ├── InvoicesTable.tsx       # Main table component
    │   ├── InvoiceDetail.tsx       # Detail view component
    │   ├── InvoiceStatusBadge.tsx  # Status badge component
    │   ├── InvoiceLinesList.tsx    # Lines table component
    │   └── InvoiceHeader.tsx       # Header with actions
    ├── hooks/
    │   ├── useInvoices.ts          # List query hook
    │   └── useInvoiceDetail.ts     # Detail query hook
    └── types.ts                    # TypeScript types
```

### API Integration

Utiliser l'API existante :

- `GET /api/vtc/invoices` - Liste avec filtres
- `GET /api/vtc/invoices/:id` - Détail complet
- `PATCH /api/vtc/invoices/:id` - Mise à jour statut

### Patterns à Suivre

1. **QuotesTable** pour le pattern de table avec filtres
2. **QuoteStatusBadge** pour le pattern de badge de statut
3. **QuoteDetailPage** pour le layout de page détail

### Traductions Requises

```json
{
  "invoices": {
    "title": "Factures",
    "addInvoice": "Nouvelle facture",
    "search": "Rechercher une facture...",
    "columns": {
      "number": "N° Facture",
      "client": "Client",
      "issueDate": "Date d'émission",
      "dueDate": "Date d'échéance",
      "total": "Total TTC",
      "vat": "TVA",
      "status": "Statut",
      "sourceQuote": "Devis source"
    },
    "status": {
      "draft": "Brouillon",
      "issued": "Émise",
      "paid": "Payée",
      "cancelled": "Annulée"
    },
    "filters": {
      "allStatuses": "Tous les statuts",
      "status": "Statut",
      "dateRange": "Période"
    },
    "detail": {
      "billingInfo": "Informations de facturation",
      "lines": "Lignes de facture",
      "totals": "Totaux",
      "totalExclVat": "Total HT",
      "totalVat": "TVA",
      "totalInclVat": "Total TTC",
      "commission": "Commission",
      "sourceQuote": "Devis source",
      "viewQuote": "Voir le devis"
    },
    "actions": {
      "issue": "Émettre la facture",
      "markPaid": "Marquer comme payée",
      "cancel": "Annuler",
      "download": "Télécharger PDF"
    },
    "empty": "Aucune facture",
    "noResults": "Aucun résultat"
  }
}
```

---

## Test Cases

### Unit Tests (Node.js native)

| Test ID  | Description                          | Expected Result                          |
| -------- | ------------------------------------ | ---------------------------------------- |
| UT-7.1.1 | InvoiceStatusBadge renders DRAFT     | Gray badge with "Brouillon"              |
| UT-7.1.2 | InvoiceStatusBadge renders ISSUED    | Blue badge with "Émise"                  |
| UT-7.1.3 | InvoiceStatusBadge renders PAID      | Green badge with "Payée"                 |
| UT-7.1.4 | InvoiceStatusBadge renders CANCELLED | Red badge with "Annulée"                 |
| UT-7.1.5 | InvoiceLinesList calculates totals   | Sum of line totals matches invoice total |
| UT-7.1.6 | formatPrice formats EUR correctly    | "1 234,56 €" format                      |

### E2E Tests (Playwright MCP)

| Test ID   | Description         | Steps                                       |
| --------- | ------------------- | ------------------------------------------- |
| E2E-7.1.1 | View invoices list  | Navigate to /invoices, verify table renders |
| E2E-7.1.2 | View invoice detail | Click row, verify detail page               |
| E2E-7.1.3 | Verify translations | Check EN translations                       |
| E2E-7.1.4 | Verify DB data      | Check PostgreSQL data consistency           |

---

## Dependencies

### Completed (Prerequisites)

- ✅ Story 1.1-1.3: Data model, EUR, tenancy
- ✅ Story 2.4: Link quotes/invoices to contacts
- ✅ Story 6.4: Quote lifecycle (ACCEPTED status)
- ✅ API /api/vtc/invoices fully implemented

### Blocking

- None

---

## Definition of Done

- [x] Invoices list page implemented with all columns
- [x] Filters (status, search, date range) working
- [x] Pagination working
- [x] Invoice detail page implemented with two-column layout
- [x] Invoice lines displayed with VAT breakdown
- [x] Totals (HT, TVA, TTC) displayed correctly
- [x] Status badge component created
- [x] Navigation to source quote working
- [x] Commission displayed for partner invoices
- [x] Status update actions working (Issue, Mark Paid)
- [x] Translations added (fr)
- [x] Unit tests passing
- [x] Integration tests passing
- [x] E2E tests passing
- [x] Code review completed

---

## Notes

- Les factures sont **immuables** après création (FR34) - seuls status/dueDate/notes peuvent être modifiés
- Le format de numéro de facture est `INV-YYYY-NNNN` (généré automatiquement par l'API)
- La TVA transport en France est de 10%
- Les commissions partenaires sont calculées automatiquement lors de la création depuis un devis
