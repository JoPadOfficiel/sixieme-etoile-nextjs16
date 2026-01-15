# Story 25.2: EU-Compliant Invoice & Quote PDF Layout

## 📋 Story Overview
| Field | Value |
|-------|-------|
| **Epic** | 25 - Documents, Payments & Deep Linking Enhancements |
| **Story ID** | 25.2 |
| **Status** | review |
| **Priority** | HIGH - EU Legal/Tax Compliance Requirement |
| **Estimated Time** | 3-4h |
| **Branch** | `feature/25-2-compliant-pdf-layout` |
| **Agent Assignment** | Claude Sonnet |
| **Prerequisite** | Story 25.3 (Organisation Document Personalization) - ✅ review |

## 🎯 Business Objective

Implement EU-compliant PDF layouts for Quotes and Invoices that:
1. **Dynamically position Logo** based on organization settings (LEFT/RIGHT from Story 25.3)
2. **Follow EU/FR invoicing standards** with proper "From" and "Bill To" blocks
3. **Display all mandatory fields** including SIRET, VAT number, and legal mentions
4. **Add Trip Details section** for Quotes (Distance/Duration breakdown)
5. **Use proper table layout** for pricing (Description, Qty, Rate, Total)

## 📝 Description

As an **organization administrator**, I want my PDF documents to comply with EU invoicing regulations and reflect my branding configuration so that my documents are legally valid and professional.

### Current State
- `pdf-generator.ts` generates basic PDFs with hardcoded layouts
- Logo is always positioned on LEFT side (hardcoded)
- No brand color application on document titles
- No Trip Details section (Distance/Duration) on Quotes
- Basic table layout without proper columns alignment

### Target State
- PDF header dynamically positions logo based on `logoPosition` setting
- Brand color applied to document titles (DEVIS, FACTURE) and accents
- "From" block (organization) on LEFT, "Bill To" block (client) on RIGHT side
- Proper pricing table with aligned columns: Description, Qty, Rate, Total
- Footer with legal mentions (SIRET, VAT, payment terms, page numbering)
- Quote-specific "Trip Details" section with Distance and Duration

## ✅ Acceptance Criteria

### AC1: Dynamic Logo Positioning
- [ ] When `logoPosition` = "LEFT": Logo on left, Document Info block on right
- [ ] When `logoPosition` = "RIGHT": Document Info block on left, Logo on right
- [ ] Logo respects `showCompanyName` toggle (show/hide company name next to logo)
- [ ] Logo embedded from `documentLogoUrl` (with fallback to organization name)

### AC2: Brand Color Application
- [ ] Document title (DEVIS/FACTURE) uses `brandColor` from settings
- [ ] Accent lines and table headers use `brandColor`
- [ ] Fallback to default blue (#2563eb) if `brandColor` is null

### AC3: EU-Compliant Layout Structure
- [ ] **Header Row**: Logo/CompanyName + Document Title + Reference/Date
- [ ] **From Block (Left)**: Organization name, address, phone, email, SIRET, VAT#
- [ ] **Bill To Block (Right)**: Client name, company, billing address, VAT# if applicable
- [ ] **Main Body**: Pricing table with columns
- [ ] **Footer**: Legal mentions, page number (Page X/Y)

### AC4: Pricing Table Structure
- [ ] Column headers: Description | Qty | Unit Price (HT) | VAT % | Total (HT)
- [ ] Proper column alignment (left-aligned Description, right-aligned amounts)
- [ ] Subtotal row: Total HT
- [ ] VAT row: TVA
- [ ] Total row: **Total TTC** (highlighted)

### AC5: Quote-Specific Trip Details Section
- [ ] Section title: "Détails du trajet / Trip Details"
- [ ] Display: Departure address, Arrival address, Date/Time
- [ ] Display: Estimated Distance (km), Estimated Duration (minutes/hours)
- [ ] Display: Vehicle category, Passenger count, Luggage count
- [ ] Display: Trip type (TRANSFER, EXCURSION, DISPO, etc.)

### AC6: Invoice Footer Legal Mentions (FR)
- [ ] "En cas de retard de paiement, des pénalités de retard seront appliquées..."
- [ ] "Une indemnité forfaitaire de 40€ pour frais de recouvrement sera due..."
- [ ] IBAN and BIC if available
- [ ] Page numbering: "Page 1 / 1"

### AC7: Quote Footer
- [ ] Validity period: "Ce devis est valable 30 jours..."
- [ ] Acceptance clause: "Bon pour accord" signature area
- [ ] Page numbering

## 🧪 Test Cases

### Unit Tests (Vitest)
1. **Logo position LEFT test**: Generate PDF → Verify logo X position is at leftMargin
2. **Logo position RIGHT test**: Generate PDF → Verify logo X position is at rightSide
3. **Brand color test**: Generate PDF → Verify title color matches brandColor
4. **Table columns test**: Generate Invoice PDF → Verify all 5 columns present
5. **Trip details test**: Generate Quote PDF → Verify distance/duration section exists

### Integration Tests
1. **Full Quote PDF test**: Generate with all data → Verify PDF structure
2. **Full Invoice PDF test**: Generate with multiple lines → Verify totals correct

### Manual Verification
1. Generate Quote with Logo LEFT → Verify layout
2. Generate Quote with Logo RIGHT → Verify layout
3. Generate Invoice with multiple lines → Verify column alignment
4. Generate Invoice with commission → Verify partner info displayed

## 🔧 Technical Implementation

### Files to Modify

#### 1. `packages/api/src/services/pdf-generator.ts`

**Updated OrganizationPdfData interface:**
```typescript
export interface OrganizationPdfData {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  iban?: string | null;
  bic?: string | null;
  logo?: string | null;
  // Story 25.3: Branding settings
  documentLogoUrl?: string | null;
  brandColor?: string | null;
  logoPosition?: "LEFT" | "RIGHT";
  showCompanyName?: boolean;
}
```

**Updated QuotePdfData interface:**
```typescript
export interface QuotePdfData {
  // ... existing fields
  // Story 25.2: Trip Details for EU compliance
  estimatedDistanceKm?: number | null;
  estimatedDurationMins?: number | null;
  tripAnalysisSegments?: {
    type: string;
    distanceKm: number;
    durationMins: number;
  }[] | null;
}
```

**Refactored PDF generation functions:**
- `generateQuotePdf()` - Refactored with dynamic positioning
- `generateInvoicePdf()` - Refactored with EU-compliant table
- New helper: `drawHeader()` - Handles logo/title positioning
- New helper: `drawFromBlock()` - Organization details block
- New helper: `drawBillToBlock()` - Client details block
- New helper: `drawPricingTable()` - Aligned columns for Invoice
- New helper: `drawTripDetails()` - Quote-specific section
- New helper: `drawFooter()` - Legal mentions + page number

### Layout Specifications

#### A4 Page (595 x 842 points)
- Left margin: 50pt
- Right margin: 545pt (width - 50)
- Top margin: 50pt
- Content width: 495pt

#### Header Layout (Logo Position Logic)
```
When logoPosition = "LEFT":
┌──────────────────────────────────────────────────────────────┐
│ [LOGO] Company Name          │          DEVIS / FACTURE     │
│                              │          Ref: ABC123         │
│                              │          Date: 15/01/2026    │
└──────────────────────────────────────────────────────────────┘

When logoPosition = "RIGHT":
┌──────────────────────────────────────────────────────────────┐
│ DEVIS / FACTURE              │          [LOGO] Company Name │
│ Ref: ABC123                  │                              │
│ Date: 15/01/2026             │                              │
└──────────────────────────────────────────────────────────────┘
```

#### From / Bill To Blocks
```
┌─────────────────────────────┐ ┌─────────────────────────────┐
│ DE / FROM:                  │ │ À / BILL TO:                │
│ Sixième Étoile VTC          │ │ Client Name                 │
│ 123 Avenue Paris            │ │ Company XYZ                 │
│ 75008 Paris, France         │ │ 456 Client Street           │
│ Tél: +33 1 23 45 67 89      │ │ contact@client.com          │
│ SIRET: 123 456 789 00012    │ │ TVA: FR12345678901          │
│ TVA: FR12345678901          │ │                             │
└─────────────────────────────┘ └─────────────────────────────┘
```

#### Pricing Table (Invoice)
```
┌─────────────────────────┬─────┬───────────┬───────┬───────────┐
│ Description             │ Qté │ Prix HT   │ TVA % │ Total HT  │
├─────────────────────────┼─────┼───────────┼───────┼───────────┤
│ Transfer Aéroport CDG   │  1  │ 120,00 €  │ 10%   │ 120,00 €  │
│ Supplément nuit         │  1  │  20,00 €  │ 10%   │  20,00 €  │
├─────────────────────────┴─────┴───────────┴───────┼───────────┤
│                                       Total HT:   │ 140,00 €  │
│                                       TVA (10%):  │  14,00 €  │
│                                     **Total TTC:**│ **154,00€**│
└───────────────────────────────────────────────────┴───────────┘
```

## 🔗 Dependencies

- **Depends on**: Story 25.3 (Organization Document Personalization) ✅
- **Blocks**: None
- **Related**: Story 25.1 (Mission Sheets), Story 25.4 (B2C Invoicing)

## 📦 Deliverables

1. Refactored `pdf-generator.ts` with dynamic layout support
2. New helper functions for modular PDF construction
3. Updated TypeScript interfaces for branding settings
4. Unit tests for logo positioning (LEFT vs RIGHT)
5. Unit tests for table column validation
6. Visual verification with test PDFs

## 📊 Sprint Status Update

After completion:
```yaml
25-2-eu-compliant-invoice-quote-pdf-layout: review
```

## 📝 Implementation Notes

### Handling Logo Embedding (pdf-lib)
```typescript
// pdf-lib requires fetching and embedding images
async function embedLogoIfAvailable(
  pdfDoc: PDFDocument,
  logoUrl: string | null | undefined
): Promise<PDFImage | null> {
  if (!logoUrl) return null;
  try {
    const response = await fetch(logoUrl);
    const imageBytes = await response.arrayBuffer();
    
    // Detect image type and embed
    if (logoUrl.endsWith('.png')) {
      return await pdfDoc.embedPng(imageBytes);
    } else {
      return await pdfDoc.embedJpg(imageBytes);
    }
  } catch (error) {
    console.error('Failed to embed logo:', error);
    return null;
  }
}
```

### Brand Color Conversion (HEX to RGB)
```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.145, g: 0.388, b: 0.922 }; // Default blue
}
```

## 🔍 Review Findings & Action Items

### 🔴 Critical Issues
- **[RESOLVED] [AI-Review] Legal Non-Compliance (AC3)**: `transformOrganizationToPdfData` in `documents.ts` hardcodes `null` for mandatory fields: SIRET, VAT, Phone, Email.
  - *Context*: These are legally required on invoices in the EU/FR.
  - *Action*: Update `transformOrganizationToPdfData` to fetch these values from the Organization model or Settings. -> **Done** (Added fields to OrganizationPricingSettings + Documents.ts update)

### 🟡 Medium Issues
- **[RESOLVED] [AI-Review] DRY Violation**: The header logic (logo positioning, title, ref) is duplicated 3 times in `pdf-generator.ts` (Quote, Invoice, Mission Order).
  - *Action*: Refactor into a reusable `drawHeader` function as originally planned. -> **Done**
- **[RESOLVED] [AI-Review] Text Sanitization**: The `sanitizeText` function may be overly aggressive, potentially stripping legitimate characters from names/addresses.
  - *Action*: Review and improve sanitization logic or use a robust font that supports needed charsets. -> **Done** (Improved sanitizeText)

### 🟢 Low Issues
- **[AI-Review] Pagination**: Page numbering is hardcoded as "Page 1 / 1".
  - *Action*: Implement dynamic page numbering if multi-page documents are expected.
- **[RESOLVED] [AI-Review] Logo Fetch**: No timeout configured for logo fetching.
  - *Action*: Add a timeout to `fetch(logoUrl)` to prevent hanging PDF generation. -> **Done**

