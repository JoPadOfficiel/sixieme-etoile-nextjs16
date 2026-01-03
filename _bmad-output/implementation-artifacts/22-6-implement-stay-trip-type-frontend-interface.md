# Story 22.6: Implement STAY Trip Type Frontend Interface

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** in_progress  
**Created:** 2026-01-04  
**Priority:** High  
**Branch:** feature/22-6-stay-trip-type-frontend

---

## User Story

**As an** operator,  
**I want** to create and manage STAY quotes (multi-day packages) through the cockpit UI,  
**So that** I can offer complete travel packages to clients with detailed day-by-day breakdowns.

---

## Description

This story implements the frontend interface for the STAY trip type, building on the data model and API created in Story 22.5. The implementation includes:

1. **TripType Extension**: Add STAY to the TripType selector in the quote creation form
2. **StayFormFields Component**: Dynamic form for adding/removing days and services
3. **StayDayCard Component**: Card UI for each day with services management
4. **StayServiceForm Component**: Form for individual services (TRANSFER, DISPO, EXCURSION)
5. **StayQuoteSummary Component**: Summary panel showing total costs per day and service
6. **Type Extensions**: Update frontend types to include STAY and related interfaces
7. **Translations**: Add i18n keys for all STAY-related UI elements
8. **Integration**: Connect to the stay-quotes API endpoints

### Business Value

- **Complete Packages**: Operators can create multi-day travel programs with one quote
- **Visual Clarity**: Day-by-day breakdown with expandable service details
- **Cost Transparency**: Each service and day shows individual costs
- **Efficient Workflow**: Add/remove days and services dynamically without page reload

### Prerequisites

- Story 22.5: STAY trip type data model and API (completed)
- Existing quote creation cockpit UI
- TripTypeFormFields component pattern

---

## Acceptance Criteria

### AC1: TripType Selector Extension

```gherkin
Given I am on the Create Quote page
When I click on the Trip Type dropdown
Then I see STAY as an option alongside TRANSFER, EXCURSION, DISPO, OFF_GRID
And selecting STAY shows the STAY-specific form fields
```

### AC2: Stay Days Management

```gherkin
Given I have selected STAY as trip type
When the form renders
Then I see an "Add Day" button
And I can add multiple days to the stay package
And each day shows a date picker and service management controls
And I can remove days (except the last one)
```

### AC3: Stay Day Card UI

```gherkin
Given I have added a day to the stay
When I view the day card
Then I see:
  - Day number and date
  - Hotel required toggle
  - Meal count input
  - Driver count selector (1 or 2)
  - Services list with add/remove controls
  - Day notes field
  - Day cost summary (services + staffing)
```

### AC4: Stay Service Form

```gherkin
Given I am adding a service to a day
When I select service type
Then the form adapts based on type:
  - TRANSFER: Pickup address, Dropoff address, Pickup time
  - DISPO: Pickup address, Pickup time, Duration hours
  - EXCURSION: Pickup address, Dropoff address, Pickup time, Stops editor
And I can save the service to the day
```

### AC5: Stay Quote Summary Panel

```gherkin
Given I have configured a STAY quote with multiple days
When I view the summary panel
Then I see:
  - Total days count
  - Date range (start - end)
  - Total services count
  - Breakdown by day with costs
  - Total staffing costs (hotels, meals, driver premiums)
  - Total services cost
  - Grand total
```

### AC6: Form Validation

```gherkin
Given I am creating a STAY quote
When I try to save without required fields
Then validation errors are shown:
  - At least one day is required
  - Each day must have at least one service
  - Each service must have pickup address and time
  - TRANSFER services require dropoff address
  - DISPO services require duration hours
```

### AC7: API Integration

```gherkin
Given I have filled out a valid STAY quote form
When I click "Create Quote"
Then the form data is sent to POST /api/vtc/stay-quotes
And the response includes the created quote with all days and services
And I am redirected to the quote detail page
```

### AC8: Quote Detail View for STAY

```gherkin
Given a STAY quote exists
When I view the quote detail page
Then I see:
  - Standard quote header (contact, status, dates)
  - Stay-specific summary (days, date range)
  - Expandable day cards with services
  - TripTransparency panel with aggregated costs
  - Action buttons (Send, Edit, etc.)
```

### AC9: Translations (FR/EN)

```gherkin
Given the application supports French and English
When I view STAY-related UI elements
Then all labels, buttons, and messages are properly translated
Including:
  - Trip type name
  - Day management labels
  - Service type names
  - Staffing cost labels
  - Validation messages
```

### AC10: Responsive Design

```gherkin
Given I am using the application on different screen sizes
When I create or view a STAY quote
Then the UI adapts appropriately:
  - Desktop: Multi-column layout with side summary
  - Tablet: Stacked cards with collapsible sections
  - Mobile: Single column with accordion-style days
```

---

## Technical Implementation

### Files to Create

```
apps/web/modules/saas/quotes/components/
├── StayFormFields.tsx           # Main STAY form container
├── StayDayCard.tsx              # Individual day card component
├── StayServiceForm.tsx          # Service form within a day
├── StayQuoteSummary.tsx         # Summary panel for STAY quotes
├── StayQuoteDetailView.tsx      # Detail view for STAY quotes
```

### Files to Modify

```
apps/web/modules/saas/quotes/types.ts
├── Add STAY to TripType
├── Add StayDay, StayService interfaces
├── Add StayQuote interface
├── Add CreateStayQuoteFormData interface

apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx
├── Add STAY to TRIP_TYPES array

apps/web/modules/saas/quotes/components/TripTypeFormFields.tsx
├── Add STAY case with StayFormFields component

apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx
├── Handle STAY trip type in form submission
├── Use stay-quotes API for STAY type

apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts
├── Handle STAY pricing calculation (aggregate from services)

apps/web/content/locales/en.json
├── Add quotes.create.tripTypes.stay
├── Add quotes.stay.* keys

apps/web/content/locales/fr.json
├── Add quotes.create.tripTypes.stay
├── Add quotes.stay.* keys
```

### Type Definitions

```typescript
// Add to types.ts

export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID" | "STAY";

export type StayServiceType = "TRANSFER" | "DISPO" | "EXCURSION";

export interface StayService {
  id: string;
  stayDayId: string;
  serviceOrder: number;
  serviceType: StayServiceType;
  pickupAt: string;
  pickupAddress: string;
  pickupLatitude: string | null;
  pickupLongitude: string | null;
  dropoffAddress: string | null;
  dropoffLatitude: string | null;
  dropoffLongitude: string | null;
  durationHours: string | null;
  stops: QuoteStop[] | null;
  distanceKm: string | null;
  durationMinutes: number | null;
  serviceCost: string;
  serviceInternalCost: string;
  tripAnalysis: Record<string, unknown> | null;
  notes: string | null;
}

export interface StayDay {
  id: string;
  quoteId: string;
  dayNumber: number;
  date: string;
  hotelRequired: boolean;
  hotelCost: string;
  mealCount: number;
  mealCost: string;
  driverCount: number;
  driverOvernightCost: string;
  dayTotalCost: string;
  dayTotalInternalCost: string;
  notes: string | null;
  services: StayService[];
}

export interface StayQuote extends Quote {
  tripType: "STAY";
  stayStartDate: string | null;
  stayEndDate: string | null;
  stayDays: StayDay[];
}

// Form data types
export interface CreateStayServiceInput {
  id: string; // Temporary ID for React key
  serviceType: StayServiceType;
  pickupAt: Date | null;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  durationHours: number | null;
  stops: QuoteStop[];
  notes: string;
}

export interface CreateStayDayInput {
  id: string; // Temporary ID for React key
  date: Date | null;
  hotelRequired: boolean;
  mealCount: number;
  driverCount: number;
  notes: string;
  services: CreateStayServiceInput[];
}

export interface CreateStayQuoteFormData
  extends Omit<CreateQuoteFormData, "tripType"> {
  tripType: "STAY";
  stayDays: CreateStayDayInput[];
}
```

### Component Structure

```tsx
// StayFormFields.tsx - Main container
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <h3>Stay Package Configuration</h3>
    <Button onClick={addDay}>Add Day</Button>
  </div>

  {stayDays.map((day, index) => (
    <StayDayCard
      key={day.id}
      day={day}
      dayIndex={index}
      onUpdate={updateDay}
      onRemove={removeDay}
      canRemove={stayDays.length > 1}
    />
  ))}

  <StayQuoteSummary stayDays={stayDays} />
</div>

// StayDayCard.tsx - Individual day
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <span>Day {dayNumber}</span>
      <DatePicker value={date} onChange={setDate} />
      <Button onClick={onRemove} disabled={!canRemove}>Remove</Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-3 gap-4">
      <Switch label="Hotel Required" checked={hotelRequired} />
      <Input label="Meals" type="number" value={mealCount} />
      <Select label="Drivers" value={driverCount} options={[1, 2]} />
    </div>

    <Separator />

    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Services</span>
        <Button onClick={addService}>Add Service</Button>
      </div>
      {services.map((service, idx) => (
        <StayServiceForm
          key={service.id}
          service={service}
          onUpdate={updateService}
          onRemove={removeService}
        />
      ))}
    </div>

    <Textarea label="Day Notes" value={notes} onChange={setNotes} />
  </CardContent>
</Card>
```

---

## Tasks / Subtasks

- [ ] Task 1: Update Type Definitions (AC: #1, #9)

  - [ ] Add STAY to TripType enum
  - [ ] Add StayServiceType type
  - [ ] Add StayService interface
  - [ ] Add StayDay interface
  - [ ] Add StayQuote interface
  - [ ] Add form data interfaces

- [ ] Task 2: Create StayServiceForm Component (AC: #4)

  - [ ] Create component file
  - [ ] Implement service type selector
  - [ ] Implement TRANSFER fields
  - [ ] Implement DISPO fields
  - [ ] Implement EXCURSION fields with stops
  - [ ] Add validation

- [ ] Task 3: Create StayDayCard Component (AC: #3)

  - [ ] Create component file
  - [ ] Implement day header with date picker
  - [ ] Implement staffing controls (hotel, meals, drivers)
  - [ ] Implement services list management
  - [ ] Implement day notes
  - [ ] Add day cost summary

- [ ] Task 4: Create StayFormFields Component (AC: #2)

  - [ ] Create component file
  - [ ] Implement days management (add/remove)
  - [ ] Integrate StayDayCard components
  - [ ] Handle form state

- [ ] Task 5: Create StayQuoteSummary Component (AC: #5)

  - [ ] Create component file
  - [ ] Display date range
  - [ ] Display day-by-day breakdown
  - [ ] Display staffing costs
  - [ ] Display total costs

- [ ] Task 6: Integrate into Quote Creation Flow (AC: #1, #7)

  - [ ] Add STAY to TRIP_TYPES in QuoteBasicInfoPanel
  - [ ] Add STAY case in TripTypeFormFields
  - [ ] Update CreateQuoteCockpit for STAY submission
  - [ ] Connect to stay-quotes API

- [ ] Task 7: Create StayQuoteDetailView Component (AC: #8)

  - [ ] Create component file
  - [ ] Display stay summary
  - [ ] Display expandable day cards
  - [ ] Integrate with TripTransparency

- [ ] Task 8: Add Translations (AC: #9)

  - [ ] Add English translations
  - [ ] Add French translations

- [ ] Task 9: Implement Responsive Design (AC: #10)

  - [ ] Desktop layout
  - [ ] Tablet layout
  - [ ] Mobile layout

- [ ] Task 10: Add Form Validation (AC: #6)
  - [ ] Validate required fields
  - [ ] Validate service-specific requirements
  - [ ] Display validation errors

---

## Test Cases

### UI Tests (Playwright MCP)

```typescript
describe("STAY Quote Creation", () => {
  it("should show STAY option in trip type selector", async () => {
    // Navigate to create quote
    // Click trip type dropdown
    // Verify STAY option is visible
  });

  it("should show stay form fields when STAY is selected", async () => {
    // Select STAY trip type
    // Verify day management controls appear
    // Verify Add Day button is visible
  });

  it("should add and remove days", async () => {
    // Add multiple days
    // Verify day cards appear
    // Remove a day
    // Verify day is removed
  });

  it("should add services to a day", async () => {
    // Add a day
    // Add TRANSFER service
    // Add DISPO service
    // Verify services appear in day card
  });

  it("should validate required fields", async () => {
    // Try to submit without required fields
    // Verify validation errors appear
  });

  it("should create STAY quote successfully", async () => {
    // Fill complete form
    // Submit
    // Verify redirect to quote detail
  });
});
```

### API Tests (Curl)

```bash
# Create STAY Quote
curl -X POST http://localhost:3000/api/vtc/stay-quotes \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "...",
    "vehicleCategoryId": "...",
    "passengerCount": 2,
    "stayDays": [
      {
        "date": "2026-01-15",
        "hotelRequired": true,
        "mealCount": 2,
        "driverCount": 1,
        "services": [
          {
            "serviceType": "TRANSFER",
            "pickupAt": "2026-01-15T10:00:00Z",
            "pickupAddress": "CDG Airport",
            "dropoffAddress": "Hotel Paris"
          }
        ]
      }
    ]
  }'

# Get STAY Quote
curl -X GET http://localhost:3000/api/vtc/stay-quotes/:id \
  -H "Cookie: better-auth.session_token=..."
```

### Database Verification

```sql
-- Verify Quote with STAY type
SELECT id, trip_type, stay_start_date, stay_end_date
FROM quote WHERE trip_type = 'STAY';

-- Verify StayDay records
SELECT * FROM stay_day WHERE quote_id = '...';

-- Verify StayService records
SELECT * FROM stay_service WHERE stay_day_id = '...';
```

---

## Dev Notes

### Architecture Patterns

- Follow existing TripTypeFormFields pattern for conditional rendering
- Use React Hook Form or controlled components for form state
- Leverage existing AddressAutocomplete component for addresses
- Use existing Card/CardHeader/CardContent pattern for day cards

### Existing Code to Reuse

- `apps/web/modules/saas/quotes/components/TripTypeFormFields.tsx` - Pattern for trip-type-specific fields
- `apps/web/modules/saas/quotes/components/StopsEditor.tsx` - For EXCURSION stops
- `apps/web/modules/saas/quotes/components/AddressAutocomplete.tsx` - For address inputs
- `apps/web/modules/saas/quotes/types.ts` - Type definitions

### Important Considerations

1. **Form State Management**: Use unique IDs for days/services to handle React keys properly
2. **Date Handling**: Ensure dates are handled in Europe/Paris timezone
3. **Cost Calculation**: Costs are calculated server-side; frontend shows estimates
4. **Validation**: Validate before submission to avoid API errors
5. **Accessibility**: Ensure all form controls are keyboard accessible

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Completion Notes List

(To be filled during implementation)

### File List

**To Create:**

- `apps/web/modules/saas/quotes/components/StayFormFields.tsx`
- `apps/web/modules/saas/quotes/components/StayDayCard.tsx`
- `apps/web/modules/saas/quotes/components/StayServiceForm.tsx`
- `apps/web/modules/saas/quotes/components/StayQuoteSummary.tsx`

**To Modify:**

- `apps/web/modules/saas/quotes/types.ts`
- `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx`
- `apps/web/modules/saas/quotes/components/TripTypeFormFields.tsx`
- `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`
- `apps/web/content/locales/en.json`
- `apps/web/content/locales/fr.json`

---

## Change Log

| Date       | Change        | Author            |
| ---------- | ------------- | ----------------- |
| 2026-01-04 | Story created | BMAD Orchestrator |
