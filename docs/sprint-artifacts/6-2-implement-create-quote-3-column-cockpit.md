# Story 6.2: Implement Create Quote 3-Column Cockpit

**Epic:** 6 - Quotes & Operator Cockpit  
**Status:** done  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As an** operator,  
**I want** a three-column cockpit for quote creation,  
**So that** I can see client context, trip transparency and pricing options at the same time.

---

## Related FRs

- **FR17-FR24**: Routing, Base Selection & Shadow Calculation
- **FR42-FR45**: Operator Cockpit & UX (structured quote builder, trip visualization, cost breakdown)
- **FR55-FR56**: Trip Transparency editing, optional fees

---

## Acceptance Criteria

### AC1: 3-Column Layout Display

**Given** `/dashboard/quotes/new` page  
**When** I open the page  
**Then** I see three columns as per UX spec 8.3.2:

- **Left Column - Basic Info:**

  - Contact selector with Partner/Private type badge
  - Trip type selector (Transfer/Excursion/Dispo/Off-grid)
  - Pickup address with Google Places autocomplete
  - Dropoff address with Google Places autocomplete
  - Pickup datetime picker (Europe/Paris)
  - Vehicle category selector
  - Passenger count input
  - Luggage count input

- **Center Column - Trip Transparency:**

  - Summary cards: distance (km), duration (min), internal cost (EUR), margin (%)
  - Profitability indicator (green/orange/red)
  - Tabs: Overview, Route (segments A/B/C), Fees & Tolls
  - Map visualization (optional for MVP)

- **Right Column - Pricing & Options:**
  - Suggested price display (EUR)
  - Final price input (editable)
  - Optional fees checklist (future)
  - Promotion code selector (future)
  - Notes textarea
  - Validity date picker

### AC2: Pricing Calculation Trigger

**Given** mandatory inputs are filled (contact, pickup, dropoff, datetime, vehicle category)  
**When** I complete the required fields  
**Then** the backend runs pricing + shadow calculation and the center column updates with a skeleton→result pattern

### AC3: Contact Selector with Type Badge

**Given** the contact selector in left column  
**When** I search and select a contact  
**Then** the contact displays with Partner/Private badge and the pricing mode is determined accordingly (FIXED_GRID for partners with grids, DYNAMIC otherwise)

### AC4: Address Autocomplete

**Given** pickup and dropoff address fields  
**When** I type an address  
**Then** Google Places autocomplete suggestions appear and selecting one populates lat/lng coordinates

### AC5: Trip Transparency Panel

**Given** pricing calculation has completed  
**When** I view the center column  
**Then** I see:

- Summary cards with distance, duration, internal cost, margin %
- Profitability indicator using ProfitabilityIndicator component
- Tabs switching between Overview, Route, Fees & Tolls
- Cost breakdown per segment (approach, service, return) when available

### AC6: Price Override with Live Feedback

**Given** a computed quote with suggested price  
**When** I manually edit the final price in the right column  
**Then** the margin percentage and profitability indicator update immediately without API call

### AC7: Quote Creation

**Given** all required fields are filled and valid  
**When** I click "Create Quote" button  
**Then**:

- The quote is created via POST /api/vtc/quotes with status DRAFT
- Success toast is displayed
- I am redirected to the quotes list with the new quote highlighted

### AC8: Responsive Layout

**Given** screen width less than 1280px  
**When** I view the page  
**Then** columns stack appropriately (2 columns at 1024-1279px, stacked at <1024px) with Trip Transparency remaining visible

---

## Technical Tasks

### 1. Create Page Route

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/quotes/new/page.tsx`
- Import and render CreateQuoteCockpit component

### 2. Create CreateQuoteCockpit Component

- `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`
- 3-column responsive grid layout using Tailwind CSS
- State management for form data
- Pricing calculation trigger on field changes (debounced)

### 3. Create QuoteBasicInfoPanel Component (Left Column)

- `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx`
- ContactSelector with search and type badge
- TripTypeSelector (Transfer/Excursion/Dispo/Off-grid)
- AddressAutocomplete for pickup/dropoff
- DateTimePicker for pickupAt
- VehicleCategorySelector
- PassengerCount and LuggageCount inputs

### 4. Create TripTransparencyPanel Component (Center Column)

- `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`
- Summary cards (distance, duration, cost, margin)
- ProfitabilityIndicator integration
- Tabs component (Overview, Route, Fees & Tolls)
- SegmentBreakdown sub-component for A/B/C segments
- CostBreakdown sub-component for fuel/tolls/wear/driver

### 5. Create QuotePricingPanel Component (Right Column)

- `apps/web/modules/saas/quotes/components/QuotePricingPanel.tsx`
- Suggested price display (readonly)
- Final price input (editable with live margin recalculation)
- Notes textarea
- ValidUntil date picker
- Create Quote button with loading state

### 6. Create AddressAutocomplete Component

- `apps/web/modules/saas/shared/components/AddressAutocomplete.tsx`
- Google Places Autocomplete integration
- Returns address string + lat/lng coordinates
- Fallback to manual input if Google API unavailable

### 7. Create ContactSelector Component

- `apps/web/modules/saas/quotes/components/ContactSelector.tsx`
- Combobox with search functionality
- Displays contact name with Partner/Private badge
- Fetches contacts via API with debounced search

### 8. Create VehicleCategorySelector Component

- `apps/web/modules/saas/quotes/components/VehicleCategorySelector.tsx`
- Select dropdown with vehicle categories
- Shows regulatory category (LIGHT/HEAVY) indicator

### 9. Implement Pricing Calculation Hook

- `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`
- Debounced API call to calculate pricing
- Returns pricing result with loading/error states
- Triggers on form field changes

### 10. Add Translations

- Extend `apps/web/content/locales/en/quotes.json`
- Extend `apps/web/content/locales/fr/quotes.json`
- Keys for all new UI elements

### 11. Update Component Exports

- Update `apps/web/modules/saas/quotes/components/index.ts`

### 12. Write Tests

- Vitest: Component unit tests
- Playwright MCP: E2E quote creation flow

---

## Dependencies

- **Story 6.1** (done): QuotesTable, ProfitabilityIndicator, QuoteStatusBadge
- **Epic 4** (done): Pricing engine, shadow calculation, profitability indicator
- **Epic 5** (done): Vehicle categories, fleet data
- **Epic 2** (done): Contacts with partner/private classification
- **Story 1.5** (done): Google Maps integration settings

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/6-2-implement-create-quote-3-column-cockpit.context.xml`

### Implementation Notes

- Use existing `apiClient.vtc.quotes.$post` for quote creation
- Follow ContactForm pattern for form state management
- Use React Query mutations with optimistic updates
- Debounce pricing calculation (300-500ms) to avoid excessive API calls
- ProfitabilityIndicator already exists in shared components
- All dates in Europe/Paris timezone (no conversion per Story 1.4)
- All prices in EUR (no currency conversion per Story 1.3)

### API Endpoints Used

- `POST /api/vtc/quotes` - Create quote
- `GET /api/vtc/contacts` - Search contacts
- `GET /api/vtc/vehicle-categories` - List vehicle categories
- `POST /api/vtc/pricing/calculate` - Calculate pricing (to be created or use existing)

### Component Structure

```
apps/web/modules/saas/quotes/
├── components/
│   ├── CreateQuoteCockpit.tsx      # Main 3-column layout
│   ├── QuoteBasicInfoPanel.tsx     # Left column
│   ├── TripTransparencyPanel.tsx   # Center column
│   ├── QuotePricingPanel.tsx       # Right column
│   ├── ContactSelector.tsx         # Contact search/select
│   ├── VehicleCategorySelector.tsx # Vehicle category select
│   └── index.ts                    # Exports
├── hooks/
│   └── usePricingCalculation.ts    # Pricing calculation hook
└── types.ts                        # Extended types
```

---

## Definition of Done

- [x] Page route `/quotes/new` created and accessible
- [x] 3-column layout renders correctly on desktop (≥1280px)
- [x] Responsive layout works at tablet (1024-1279px) and mobile (<1024px)
- [x] Contact selector with search and Partner/Private badge
- [x] Address autocomplete with Google Places (or fallback)
- [x] Vehicle category selector populated from API
- [x] Pricing calculation triggers on form changes with skeleton loading
- [x] TripTransparencyPanel displays all cost components
- [x] Profitability indicator updates based on margin
- [x] Price override updates margin in real-time
- [x] Quote creation via API with success redirect
- [x] Translations added (EN, FR)
- [x] Vitest unit tests passing
- [x] Playwright E2E tests passing
- [x] Code reviewed and merged
