# Story 11.2: Postal Code Zone Creation

## Story

**As an** operator  
**I want** to create zones by entering postal codes or zip codes  
**So that** I can quickly define geographic zones without manually drawing polygons

## Background

Currently, zones can only be created by drawing shapes (circles, polygons, rectangles) on the map. The user wants the ability to create zones by entering postal codes, which would automatically generate the zone boundaries based on postal code geographic data.

This feature is visible in the reference image where the user can select "Zip Codes" as a zone creation method and enter multiple postal codes to generate a zone.

## Tasks

1. **Research postal code boundary API** - Identify a service that provides postal code boundaries (e.g., OpenStreetMap Nominatim, GeoNames, or a commercial API)
2. **Create PostalCodeInput component** - Multi-select input for entering postal codes with validation
3. **Implement postal code geocoding service** - Backend service to fetch postal code boundaries
4. **Add postal code zone type** - Extend ZoneType enum or add a creation method field
5. **Create PostalCodeZoneForm** - Form variant for postal code-based zone creation
6. **Implement boundary merging** - Merge multiple postal code boundaries into a single polygon
7. **Add postal code preview on map** - Show postal code boundaries on map before confirming
8. **Store postal codes metadata** - Save the list of postal codes used to create the zone
9. **Add translations (EN/FR)** for new UI elements
10. **Write unit tests** for postal code service
11. **Write E2E tests** for postal code zone creation flow

## Acceptance Criteria

### AC1: Postal Code Creation Option

**Given** I am creating a new zone  
**When** I view the zone creation options  
**Then** I see a "Postal Codes" option alongside "Draw on Map"

### AC2: Postal Code Input

**Given** I select "Postal Codes" creation method  
**When** I view the form  
**Then** I see a multi-select input where I can:

- Type postal codes (e.g., "75001", "75002")
- Add multiple postal codes
- Remove individual postal codes
- See validation for invalid codes

### AC3: Postal Code Preview

**Given** I have entered one or more postal codes  
**When** the codes are validated  
**Then** the map shows the boundaries of the entered postal codes  
**And** the boundaries are highlighted

### AC4: Boundary Merging

**Given** I have entered multiple adjacent postal codes  
**When** I confirm the zone creation  
**Then** the boundaries are merged into a single polygon  
**And** the merged polygon is saved as the zone geometry

### AC5: Zone Metadata

**Given** I create a zone from postal codes  
**When** the zone is saved  
**Then** the postal codes used are stored in zone metadata  
**And** I can see the postal codes when viewing zone details

### AC6: Country/Region Support

**Given** I am entering postal codes  
**When** I use the input  
**Then** I can specify the country (default: France)  
**And** postal codes are validated against the selected country format

### AC7: Error Handling

**Given** I enter an invalid postal code  
**When** the system validates it  
**Then** I see an error message indicating the code is invalid  
**And** the invalid code is highlighted

## Technical Notes

### API Options for Postal Code Boundaries

1. **OpenStreetMap Nominatim** - Free, but rate-limited
2. **GeoNames** - Free tier available, good coverage
3. **Google Geocoding API** - Already integrated, but limited boundary data
4. **Mapbox Boundaries** - Commercial, excellent coverage
5. **French postal code data** - INSEE/La Poste open data for France

### Recommended Approach

For France (primary market), use La Poste open data or a dedicated French postal code API. Store boundaries as GeoJSON polygons.

### Schema Changes

```prisma
model PricingZone {
  // ... existing fields
  postalCodes String[] // Array of postal codes used to create zone
  creationMethod String? // "DRAW" | "POSTAL_CODE" | "COORDINATES"
}
```

### New Files

- `packages/api/src/services/postal-code-service.ts`
- `apps/web/modules/saas/pricing/components/PostalCodeInput.tsx`
- `apps/web/modules/saas/pricing/components/PostalCodeZoneForm.tsx`

### Dependencies

- Postal code boundary API (to be determined)
- Turf.js for polygon merging operations

## Out of Scope

- Real-time postal code autocomplete (stretch goal)
- Support for non-French postal codes in v1
- Editing postal codes after zone creation

## Risks

- **API availability** - Postal code boundary APIs may have rate limits or costs
- **Data accuracy** - Postal code boundaries may not be perfectly accurate
- **Performance** - Fetching and merging many postal codes may be slow

## Definition of Done

- [x] Postal code creation option available
- [x] Multi-select postal code input works
- [x] Postal code boundaries displayed on map
- [x] Boundary merging implemented
- [x] Postal codes stored in zone metadata
- [x] Error handling for invalid codes
- [x] Translations added (EN/FR)
- [x] Unit tests passing
- [ ] E2E tests passing
- [ ] Code reviewed and approved

## Implementation Details (Added 2025-11-29)

### Files Created

- `packages/api/src/services/postal-code-service.ts` - Service for geocoding French postal codes and merging boundaries using Turf.js
- `packages/api/src/routes/vtc/postal-codes.ts` - API endpoints for postal code validation and geometry fetching
- `apps/web/modules/saas/pricing/components/PostalCodeInput.tsx` - Multi-select input component with validation
- `packages/api/src/services/__tests__/postal-code-service.test.ts` - Unit tests for postal code service
- `docs/sprint-artifacts/11-2-postal-code-zone-creation.context.xml` - Story context document

### Files Modified

- `packages/database/prisma/schema.prisma` - Added `postalCodes` (String[]) and `creationMethod` (String?) to PricingZone model
- `packages/api/src/routes/vtc/pricing-zones.ts` - Updated create/update schemas to include postal code fields
- `packages/api/src/routes/vtc/router.ts` - Registered postalCodesRouter
- `packages/api/package.json` - Added @turf/turf and @types/geojson dependencies
- `apps/web/modules/saas/pricing/types.ts` - Added CreationMethod type and updated interfaces
- `apps/web/modules/saas/pricing/components/ZoneForm.tsx` - Added tabs for Draw/Postal Codes creation methods
- `packages/i18n/translations/en.json` - Added English translations for postal code UI
- `packages/i18n/translations/fr.json` - Added French translations for postal code UI

### Database Migration

- `20251129115001_add_postal_codes_to_pricing_zone` - Adds postalCodes and creationMethod columns

### API Endpoints

- `GET /api/vtc/postal-codes/validate` - Quick format validation
- `POST /api/vtc/postal-codes/validate` - Validate multiple codes with boundary data
- `POST /api/vtc/postal-codes/geometry` - Get merged geometry for postal codes
- `GET /api/vtc/postal-codes/search` - Search postal codes (autocomplete)
