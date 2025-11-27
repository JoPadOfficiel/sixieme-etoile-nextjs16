# Story 7.5: Implement Document Generation & Storage for Quotes, Invoices & Mission Orders

**Epic:** Epic 7 – Invoicing & Documents  
**Status:** in-progress  
**Priority:** High  
**Estimated Effort:** 8 Story Points  
**Created:** 2025-11-27

---

## User Story

**As an** operator,  
**I want** to generate and store PDFs for quotes, invoices and mission orders,  
**So that** I can send professional documents to clients and keep an auditable archive.

---

## Description

Cette story implémente la génération et le stockage de documents PDF pour les devis, factures et ordres de mission. L'objectif est de :

1. **Créer un service de génération PDF** : Templates React-PDF pour chaque type de document
2. **Implémenter l'API documents** : CRUD complet avec filtres et tenant isolation
3. **Ajouter les boutons de génération** : Sur les pages Quote et Invoice detail
4. **Créer la page Documents** : Liste de tous les documents générés avec filtres
5. **Seed les DocumentType** : QUOTE_PDF, INVOICE_PDF, MISSION_ORDER

### Architecture Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  QuoteHeader        InvoiceHeader       DocumentsTable          │
│  [Generate PDF]     [Download PDF]      [List + Filters]        │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Routes (Hono)                            │
│  POST /documents/generate/quote/:id                              │
│  POST /documents/generate/invoice/:id                            │
│  GET  /documents                                                 │
│  GET  /documents/:id                                             │
│  GET  /documents/:id/download                                    │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PDF Generator Service                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ QuoteTemplate│  │InvoiceTemplate│ │MissionOrder│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Storage Service                                │
│  Local (dev) → /tmp/documents/{orgId}/{filename}                │
│  Cloud (prod) → S3/R2 bucket                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC1: DocumentType Seed Data

```gherkin
Given the database is seeded
When I query DocumentType table
Then I find records for:
  | code          | name              |
  | QUOTE_PDF     | Quote PDF         |
  | INVOICE_PDF   | Invoice PDF       |
  | MISSION_ORDER | Mission Order PDF |
```

### AC2: Generate Quote PDF

```gherkin
Given a quote with status SENT or ACCEPTED
When I click "Generate PDF" on the quote detail page
Then a PDF is generated with:
  - Organization logo and contact details
  - Quote number and date
  - Client information
  - Trip details (pickup, dropoff, date/time)
  - Pricing breakdown (base price, fees, promotions)
  - Total amounts (HT, TVA, TTC)
  - Validity period
And a Document record is created linked to the quote
And the PDF is downloaded automatically
```

### AC3: Generate Invoice PDF

```gherkin
Given an invoice with status ISSUED or PAID
When I click "Download PDF" on the invoice detail page
Then a PDF is generated with:
  - Organization logo and contact details
  - Invoice number and dates (issue, due)
  - Client billing information
  - Line items with VAT breakdown
  - Total amounts (HT, TVA, TTC)
  - Payment terms and bank details
And a Document record is created linked to the invoice
And the PDF is downloaded automatically
```

### AC4: Documents List Page

```gherkin
Given /dashboard/documents
When I open the page
Then I see a table with columns:
  | Column        | Description                           |
  | Type          | Document type badge (Quote/Invoice)   |
  | Reference     | Quote # or Invoice #                  |
  | Client        | Contact name                          |
  | Created       | Generation date                       |
  | Actions       | Download button                       |

And I can filter by:
  - Document type
  - Date range
  - Search (reference, client name)
```

### AC5: Document Download

```gherkin
Given a document in the list
When I click the download button
Then the PDF file is downloaded with filename:
  - Quote: "QUOTE-{number}-{date}.pdf"
  - Invoice: "INV-{number}-{date}.pdf"
```

### AC6: Regenerate Document

```gherkin
Given a quote/invoice that already has a generated document
When I click "Generate PDF" again
Then a new document is created (preserving history)
And the new document is downloaded
```

### AC7: Multi-Tenancy

```gherkin
Given documents from multiple organizations
When I list documents for organization A
Then I only see documents belonging to organization A
And documents from organization B are not visible
```

### AC8: API Response

```gherkin
Given document generation via API
When I POST /api/vtc/documents/generate/invoice/:id
Then the response includes:
  - id: document ID
  - url: download URL
  - filename: generated filename
  - documentType: { code, name }
  - createdAt: timestamp
```

---

## Technical Implementation

### 1. Database Schema Update

Add Quote relation to Document model:

```prisma
model Document {
  // ... existing fields

  // Related entities (optional)
  quoteId   String?
  quote     Quote?   @relation(fields: [quoteId], references: [id])
  invoiceId String?
  invoice   Invoice? @relation(fields: [invoiceId], references: [id])

  // Add filename for download
  filename  String?

  @@index([quoteId])
}
```

### 2. Seed DocumentType

```typescript
// packages/database/prisma/seed.ts

const documentTypes = [
  {
    code: "QUOTE_PDF",
    name: "Quote PDF",
    description: "PDF document for quotes",
  },
  {
    code: "INVOICE_PDF",
    name: "Invoice PDF",
    description: "PDF document for invoices",
  },
  {
    code: "MISSION_ORDER",
    name: "Mission Order PDF",
    description: "PDF document for mission orders",
  },
];

for (const dt of documentTypes) {
  await prisma.documentType.upsert({
    where: { code: dt.code },
    update: {},
    create: dt,
  });
}
```

### 3. PDF Generator Service

```typescript
// packages/api/src/services/pdf-generator.ts

import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdfTemplate } from "./pdf-templates/quote-template";
import { InvoicePdfTemplate } from "./pdf-templates/invoice-template";

export interface PdfGeneratorOptions {
  type: "QUOTE_PDF" | "INVOICE_PDF" | "MISSION_ORDER";
  data: QuotePdfData | InvoicePdfData;
  organization: OrganizationData;
}

export async function generatePdf(
  options: PdfGeneratorOptions
): Promise<Buffer> {
  const { type, data, organization } = options;

  let template: React.ReactElement;

  switch (type) {
    case "QUOTE_PDF":
      template = (
        <QuotePdfTemplate
          data={data as QuotePdfData}
          organization={organization}
        />
      );
      break;
    case "INVOICE_PDF":
      template = (
        <InvoicePdfTemplate
          data={data as InvoicePdfData}
          organization={organization}
        />
      );
      break;
    default:
      throw new Error(`Unknown document type: ${type}`);
  }

  return renderToBuffer(template);
}
```

### 4. Storage Service

```typescript
// packages/api/src/services/storage-service.ts

import fs from "fs/promises";
import path from "path";

export interface StorageService {
  save(
    buffer: Buffer,
    filename: string,
    organizationId: string
  ): Promise<string>;
  getUrl(storagePath: string): string;
  getBuffer(storagePath: string): Promise<Buffer>;
}

// Local storage for development
export class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath = "/tmp/vtc-documents") {
    this.basePath = basePath;
  }

  async save(
    buffer: Buffer,
    filename: string,
    organizationId: string
  ): Promise<string> {
    const dir = path.join(this.basePath, organizationId);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  getUrl(storagePath: string): string {
    return `/api/vtc/documents/file/${encodeURIComponent(storagePath)}`;
  }

  async getBuffer(storagePath: string): Promise<Buffer> {
    return fs.readFile(storagePath);
  }
}
```

### 5. Documents API Route

```typescript
// packages/api/src/routes/vtc/documents.ts

export const documentsRouter = new Hono()
  .basePath("/documents")
  .use("*", organizationMiddleware)

  // List documents
  .get("/", ...)

  // Get document
  .get("/:id", ...)

  // Download document file
  .get("/:id/download", ...)

  // Generate quote PDF
  .post("/generate/quote/:quoteId", async (c) => {
    const organizationId = c.get("organizationId");
    const quoteId = c.req.param("quoteId");

    // Fetch quote with all details
    const quote = await db.quote.findFirst({
      where: withTenantId(quoteId, organizationId),
      include: { contact: true, vehicleCategory: true },
    });

    if (!quote) throw new HTTPException(404, { message: "Quote not found" });

    // Get organization details
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    // Get document type
    const documentType = await db.documentType.findUnique({
      where: { code: 'QUOTE_PDF' },
    });

    // Generate PDF
    const pdfBuffer = await generatePdf({
      type: 'QUOTE_PDF',
      data: transformQuoteToPdfData(quote),
      organization: transformOrgToPdfData(organization),
    });

    // Save to storage
    const filename = `QUOTE-${quote.id.slice(-8)}-${format(new Date(), 'yyyyMMdd')}.pdf`;
    const storagePath = await storageService.save(pdfBuffer, filename, organizationId);

    // Create document record
    const document = await db.document.create({
      data: {
        organizationId,
        documentTypeId: documentType.id,
        quoteId,
        storagePath,
        filename,
        url: storageService.getUrl(storagePath),
      },
    });

    return c.json(document, 201);
  })

  // Generate invoice PDF
  .post("/generate/invoice/:invoiceId", ...);
```

### 6. PDF Templates

```typescript
// packages/api/src/services/pdf-templates/invoice-template.tsx

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  logo: { width: 120, height: 40 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  // ... more styles
});

export function InvoicePdfTemplate({ data, organization }: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with logo */}
        <View style={styles.header}>
          {organization.logo && (
            <Image src={organization.logo} style={styles.logo} />
          )}
          <View>
            <Text style={styles.title}>FACTURE</Text>
            <Text>N° {data.number}</Text>
          </View>
        </View>

        {/* Organization info */}
        <View style={styles.orgInfo}>
          <Text>{organization.name}</Text>
          <Text>{organization.address}</Text>
          <Text>SIRET: {organization.siret}</Text>
          <Text>TVA: {organization.vatNumber}</Text>
        </View>

        {/* Client info */}
        <View style={styles.clientInfo}>
          <Text style={styles.sectionTitle}>Facturé à:</Text>
          <Text>{data.contact.displayName}</Text>
          <Text>{data.contact.billingAddress}</Text>
          {data.contact.vatNumber && <Text>TVA: {data.contact.vatNumber}</Text>}
        </View>

        {/* Invoice details */}
        <View style={styles.details}>
          <Text>Date d'émission: {format(data.issueDate, "dd/MM/yyyy")}</Text>
          <Text>Date d'échéance: {format(data.dueDate, "dd/MM/yyyy")}</Text>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>Prix HT</Text>
            <Text style={styles.colVat}>TVA</Text>
            <Text style={styles.colTotal}>Total HT</Text>
          </View>
          {data.lines.map((line, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDescription}>{line.description}</Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colPrice}>
                {formatPrice(line.unitPriceExclVat)}
              </Text>
              <Text style={styles.colVat}>{line.vatRate}%</Text>
              <Text style={styles.colTotal}>
                {formatPrice(line.totalExclVat)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Total HT</Text>
            <Text>{formatPrice(data.totalExclVat)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA</Text>
            <Text>{formatPrice(data.totalVat)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text>Total TTC</Text>
            <Text>{formatPrice(data.totalInclVat)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Conditions de paiement: {data.paymentTerms}</Text>
          <Text>IBAN: {organization.iban}</Text>
          <Text>BIC: {organization.bic}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

### File Structure

```
packages/api/src/
├── routes/vtc/
│   ├── documents.ts                    # NEW: Documents API
│   └── router.ts                       # UPDATE: Add documentsRouter
├── services/
│   ├── pdf-generator.ts                # NEW: PDF generation service
│   ├── storage-service.ts              # NEW: File storage abstraction
│   └── pdf-templates/
│       ├── quote-template.tsx          # NEW: Quote PDF template
│       ├── invoice-template.tsx        # NEW: Invoice PDF template
│       ├── mission-order-template.tsx  # NEW: Mission order template
│       └── shared-styles.ts            # NEW: Shared PDF styles

packages/database/prisma/
├── schema.prisma                       # UPDATE: Add quote relation to Document
└── seed.ts                             # UPDATE: Add DocumentType seeds

apps/web/
├── app/(saas)/app/(organizations)/[organizationSlug]/documents/
│   └── page.tsx                        # NEW: Documents list page
└── modules/saas/
    ├── documents/
    │   ├── components/
    │   │   └── DocumentsTable.tsx      # NEW: Documents table
    │   ├── hooks/
    │   │   └── useDocuments.ts         # NEW: Documents hooks
    │   └── types.ts                    # NEW: Document types
    ├── invoices/components/
    │   └── InvoiceHeader.tsx           # UPDATE: Add Download PDF button
    └── quotes/components/
        └── QuoteHeader.tsx             # UPDATE: Add Generate PDF button
```

### Translations Required

```json
{
  "documents": {
    "title": "Documents",
    "empty": "Aucun document",
    "noResults": "Aucun résultat",
    "columns": {
      "type": "Type",
      "reference": "Référence",
      "client": "Client",
      "createdAt": "Créé le",
      "actions": "Actions"
    },
    "types": {
      "QUOTE_PDF": "Devis PDF",
      "INVOICE_PDF": "Facture PDF",
      "MISSION_ORDER": "Ordre de mission"
    },
    "filters": {
      "allTypes": "Tous les types",
      "type": "Type de document",
      "dateRange": "Période"
    },
    "actions": {
      "download": "Télécharger",
      "generateQuotePdf": "Générer PDF",
      "downloadInvoicePdf": "Télécharger PDF"
    },
    "generating": "Génération en cours...",
    "generated": "Document généré",
    "error": "Erreur lors de la génération"
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID  | Description                                  | Expected Result                  |
| -------- | -------------------------------------------- | -------------------------------- |
| UT-7.5.1 | generatePdf creates valid buffer for quote   | Buffer.isBuffer(result) === true |
| UT-7.5.2 | generatePdf creates valid buffer for invoice | Buffer.isBuffer(result) === true |
| UT-7.5.3 | LocalStorageService.save creates file        | File exists at expected path     |
| UT-7.5.4 | LocalStorageService.getBuffer reads file     | Returns correct buffer content   |
| UT-7.5.5 | transformQuoteToPdfData formats correctly    | All required fields present      |
| UT-7.5.6 | transformInvoiceToPdfData formats correctly  | All required fields present      |
| UT-7.5.7 | formatPrice formats EUR correctly            | "1 234,56 €" format              |

### E2E Tests (Playwright MCP)

| Test ID   | Description                  | Steps                                                     |
| --------- | ---------------------------- | --------------------------------------------------------- |
| E2E-7.5.1 | Generate quote PDF           | Go to quote detail, click Generate PDF, verify download   |
| E2E-7.5.2 | Generate invoice PDF         | Go to invoice detail, click Download PDF, verify download |
| E2E-7.5.3 | View documents list          | Navigate to /documents, verify table renders              |
| E2E-7.5.4 | Filter documents by type     | Select type filter, verify filtered results               |
| E2E-7.5.5 | Download from documents list | Click download button, verify file downloads              |

### API Tests (Curl + DB)

| Test ID   | Description                      | Verification                                 |
| --------- | -------------------------------- | -------------------------------------------- |
| API-7.5.1 | POST /documents/generate/quote   | Returns 201, document record created in DB   |
| API-7.5.2 | POST /documents/generate/invoice | Returns 201, document record created in DB   |
| API-7.5.3 | GET /documents                   | Returns paginated list with tenant filtering |
| API-7.5.4 | GET /documents/:id/download      | Returns PDF file with correct content-type   |
| API-7.5.5 | Tenant isolation                 | Org A cannot access Org B documents          |

---

## Dependencies

### Completed (Prerequisites)

- ✅ Story 7.1: Invoice & InvoiceLine models and Invoices UI
- ✅ Story 7.2: Convert quote to invoice with deep-copy
- ✅ Story 7.3: VAT breakdown for transport & ancillary
- ✅ Story 7.4: Commission calculation into invoices
- ✅ Story 6.3: Quote detail with stored tripAnalysis

### New Dependencies

- `@react-pdf/renderer` - PDF generation with React components

### Blocking

- None

---

## Definition of Done

- [ ] Database schema updated (Document.quoteId relation, filename field)
- [ ] DocumentType seed data created
- [ ] PDF generator service implemented
- [ ] Storage service implemented (local for dev)
- [ ] Documents API routes implemented
- [ ] Quote PDF template created
- [ ] Invoice PDF template created
- [ ] Documents list page implemented
- [ ] Generate PDF button added to QuoteHeader
- [ ] Download PDF button added to InvoiceHeader
- [ ] Translations added (fr + en)
- [ ] Unit tests passing (Vitest)
- [ ] E2E tests passing (Playwright MCP)
- [ ] API tests passing (Curl + DB verification)
- [ ] Code review completed

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/7-5-implement-document-generation-storage.context.xml`

### Implementation Notes

- Use @react-pdf/renderer for PDF generation (React-based, deterministic)
- Storage abstraction allows easy switch from local to cloud storage
- PDFs are generated on-demand, not pre-generated
- Each generation creates a new Document record (history preserved)
- Filename format: `{TYPE}-{ID_SHORT}-{DATE}.pdf`

### Files Modified/Created

| File | Action | Description |
| ---- | ------ | ----------- |
| TBD  | TBD    | TBD         |

### Tests Executed

| Test Type | Count | Status |
| --------- | ----- | ------ |
| TBD       | TBD   | TBD    |

### Git Info

- **Branch**: `feature/7-5-document-generation`
- **Commit**: TBD

---

## Related FRs

- **FR31-FR36**: Documents as part of quote/invoice lifecycle
- **FR33**: Convert accepted quote to invoice (document generation trigger)
- **FR34**: Deep-copy semantics (PDF reflects values at generation time)
