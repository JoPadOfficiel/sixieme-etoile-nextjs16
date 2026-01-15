# Story 25.3: Organisation Document Personalization

## 📋 Story Overview
| Field | Value |
|-------|-------|
| **Epic** | 25 - Documents, Payments & Deep Linking Enhancements |
| **Story ID** | 25.3 |
| **Status** | in-progress |
| **Priority** | HIGH - Foundation for all PDF document branding |
| **Estimated Time** | 2-3h |
| **Branch** | `feature/25-3-org-personalization` |
| **Agent Assignment** | Claude Sonnet |

## 🎯 Business Objective

Enable organizations to personalize their PDF documents (Quotes, Invoices, Mission Sheets) with:
1. **Custom Logo** - Upload and store a document-specific logo (separate from avatar)
2. **Brand Color** - Define a brand color for document highlights (titles, accents)
3. **Logo Position** - Toggle logo placement (LEFT or RIGHT side of document header)

This is the **FOUNDATION STORY** that must be completed before Story 25.2 (EU-Compliant PDF Layout).

## 📝 Description

As an **organization administrator**, I want to configure my company's visual identity for PDF documents so that all generated documents (Quotes, Invoices, Mission Sheets) display my brand consistently.

### Current State
- `OrganizationLogoForm.tsx` exists for organization avatar (used in sidebar/menu)
- `organization_pricing_settings` table exists but lacks document branding fields
- `pdf-generator.ts` accepts `OrganizationPdfData.logo` but doesn't use position/color

### Target State
- New fields in `OrganizationPricingSettings`: `documentLogoUrl`, `brandColor`, `logoPosition`
- UI form in Settings → General to configure these fields
- PDF Generator reads and applies these settings dynamically

## ✅ Acceptance Criteria

### AC1: Database Schema Extension
- [ ] Add `documentLogoUrl` (String, nullable) to `OrganizationPricingSettings`
- [ ] Add `brandColor` (String, nullable, default: "#2563eb") to `OrganizationPricingSettings`
- [ ] Add `logoPosition` (Enum: LEFT/RIGHT, default: LEFT) to `OrganizationPricingSettings`
- [ ] Create and apply Prisma migration

### AC2: Logo Upload UI
- [ ] Add "Document Logo" section in `/settings/general` page
- [ ] Implement drag-and-drop upload (PNG/JPG, max 2MB)
- [ ] Store uploaded logo in Supabase Storage bucket `document-logos`
- [ ] Display preview of uploaded logo
- [ ] Allow removing/replacing logo

### AC3: Brand Color Configuration
- [ ] Add color picker input for brand color
- [ ] Show live preview of color selection
- [ ] Validate hex color format (#RRGGBB)

### AC4: Logo Position Toggle
- [ ] Add segmented control or toggle: "Left" / "Right"
- [ ] Show visual preview of logo position

### AC5: API Endpoint
- [ ] Extend `pricing-settings.ts` API to handle new fields
- [ ] Validate logo URL format
- [ ] Validate brand color hex format
- [ ] Validate logo position enum

### AC6: PDF Generator Integration
- [ ] Modify `pdf-generator.ts` to accept `logoPosition` and `brandColor`
- [ ] Update `OrganizationPdfData` interface with new fields
- [ ] Apply brand color to document titles (DEVIS, FACTURE)
- [ ] Position logo according to `logoPosition` setting
- [ ] Embed logo image in PDF if `documentLogoUrl` is provided

### AC7: Persistence Validation
- [ ] After uploading logo and saving → Refresh page → Settings persist
- [ ] Generate a Quote PDF → Logo and brand color are visible
- [ ] Change logo position to RIGHT → Generate PDF → Logo appears on right side

## 🧪 Test Cases

### Unit Tests
1. **Schema validation test**: Ensure Prisma schema compiles with new fields
2. **API validation test**: Test PATCH endpoint with valid/invalid data
3. **Color format test**: Validate hex color parsing

### Integration Tests
1. **Upload flow test**: Upload → Store → Retrieve → Display
2. **PDF generation test**: Generate PDF with custom logo/color/position

### Manual Verification
1. Navigate to Settings → General
2. Upload a logo (PNG)
3. Select brand color (e.g., #e11d48)
4. Toggle position to "Right"
5. Save settings
6. Navigate to Quotes → Generate PDF
7. Verify logo on right, brand color applied to titles

## 🔧 Technical Implementation

### Files to Modify

1. **Prisma Schema**
   ```prisma
   // packages/database/prisma/schema.prisma
   model OrganizationPricingSettings {
     // ... existing fields
     documentLogoUrl  String?
     brandColor       String?  @default("#2563eb")
     logoPosition     LogoPosition @default(LEFT)
   }
   
   enum LogoPosition {
     LEFT
     RIGHT
   }
   ```

2. **API Route**
   ```typescript
   // packages/api/src/routes/vtc/pricing-settings.ts
   // Add to updatePricingSettingsSchema
   documentLogoUrl: z.string().url().nullable().optional(),
   brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
   logoPosition: z.enum(['LEFT', 'RIGHT']).optional(),
   ```

3. **PDF Generator**
   ```typescript
   // packages/api/src/services/pdf-generator.ts
   export interface OrganizationPdfData {
     // ... existing
     documentLogoUrl?: string | null;
     brandColor?: string | null;
     logoPosition?: 'LEFT' | 'RIGHT';
   }
   ```

4. **Settings UI**
   ```tsx
   // New component: DocumentSettingsForm.tsx
   // Location: apps/web/modules/saas/organizations/components/
   ```

### Storage Configuration
- Bucket: `document-logos`
- Path format: `{organizationId}/{uuid}.{ext}`
- Max file size: 2MB
- Allowed types: PNG, JPG

## 🔗 Dependencies

- **Depends on**: Nothing (Foundation story)
- **Blocks**: Story 25.2 (EU-Compliant PDF Layout)
- **Related**: Story 25.1 (Mission Sheets), Story 25.4 (B2C Invoicing)

## 📦 Deliverables

1. Prisma migration for new fields
2. Updated API endpoint with validation
3. `DocumentSettingsForm.tsx` component
4. Updated PDF generator with branding support
5. Unit tests for validation logic
6. Updated translations (en/fr)

## 📊 Sprint Status Update

After completion:
```yaml
25-3-organisation-document-personalization: review
```
