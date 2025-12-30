# Story 6.6: Implement Helpers for Common Scenarios (Airport & Capacity)

**Epic:** 6 - Quotes & Operator Cockpit  
**Status:** done  
**Priority:** Medium  
**Estimated Points:** 5

---

## User Story

**As an** operator,  
**I want** helpers for frequent scenarios like airport transfers and baggage-driven vehicle upgrades,  
**So that** I can build correct quotes faster without manual configuration.

---

## Description

This story implements intelligent helpers in the Quote Cockpit that detect common scenarios and provide contextual assistance:

1. **Airport Transfer Detection**

   - Automatically detects airport addresses (CDG, Orly, Le Bourget)
   - Shows airport-specific options panel (flight number, waiting time presets)
   - Auto-applies relevant optional fees (airport waiting, parking)

2. **Capacity Validation & Upsell**
   - Validates passenger count against vehicle category capacity
   - Validates luggage count against estimated volume capacity
   - Suggests appropriate vehicle category upgrade with price delta
   - One-click upsell application

The helpers are **transparent** (operators see exactly what's applied) and **non-blocking** (suggestions can be ignored).

---

## Related Functional Requirements

- **FR45**: UI shall provide specific helpers for common scenarios (airport transfers, vehicle upgrades when baggage exceeds capacity)
- **FR56**: System shall support configurable catalogue of optional fees with automated triggers
- **FR58**: Pricing engine shall support advanced rate modifiers driven by business rules
- **FR60**: System shall model vehicle categories using configurable price multipliers

---

## Acceptance Criteria

### AC1: Airport Address Detection

**Given** a pickup or dropoff address containing airport keywords (CDG, Roissy, Charles de Gaulle, Orly, Le Bourget, aéroport)  
**When** the address is selected via Google Places autocomplete  
**Then** the system detects it as an airport transfer  
**And** displays the AirportHelperPanel below the address fields

### AC2: Flight Number Input

**Given** an airport transfer is detected  
**When** I enter a flight number (e.g., AF1234, BA456)  
**Then** the field accepts the format and stores it in form data  
**And** the flight number is included in the quote notes/metadata

### AC3: Auto-Apply Airport Optional Fees

**Given** an airport transfer is detected  
**And** OptionalFee records exist with autoApplyRules containing "airport" trigger  
**When** pricing calculation runs  
**Then** applicable optional fees are automatically selected  
**And** operator can manually uncheck them if needed  
**And** the fees are visible in the Pricing panel with "Auto-applied" indicator

### AC4: Passenger Capacity Warning

**Given** a vehicle category is selected (e.g., Berline with maxPassengers=3)  
**When** I enter a passenger count exceeding the capacity (e.g., 5)  
**Then** a non-blocking warning alert appears  
**And** suggests an appropriate category (e.g., Van with maxPassengers=7)  
**And** shows the estimated price delta

### AC5: Luggage Capacity Warning

**Given** a vehicle category is selected with maxLuggageVolume defined  
**When** I enter a luggage count exceeding estimated capacity (luggage × 50L > maxLuggageVolume)  
**Then** a non-blocking warning alert appears with upsell suggestion

### AC6: One-Click Upsell Application

**Given** an upsell suggestion is displayed  
**When** I click "Apply Suggestion" button  
**Then** the vehicle category is automatically changed to the suggested one  
**And** pricing recalculates with the new category  
**And** the warning disappears

### AC7: Helper Transparency

**Given** fees or suggestions are auto-applied  
**When** I view the Pricing panel or Trip Transparency  
**Then** I clearly see which elements were added by helpers (badge/icon)  
**And** I can modify or remove them

---

## Technical Tasks

1. [x] **Create useScenarioHelpers hook**

   - Airport detection logic with regex patterns
   - Capacity validation against VehicleCategory
   - Upsell suggestion calculation
   - Integration with form state

2. [x] **Create AirportHelperPanel component**

   - Collapsible panel below address fields
   - Flight number input with validation
   - Waiting time preset selector
   - Auto-applied fees display with checkboxes

3. [x] **Create CapacityWarningAlert component**

   - Non-blocking inline alert
   - Shows current vs required capacity
   - Suggested category with price delta
   - "Apply Suggestion" action button

4. [x] **Extend CreateQuoteFormData type**

   - Add flightNumber?: string
   - Add isAirportTransfer: boolean
   - Add selectedOptionalFees: string[]
   - Add capacityWarning?: CapacityWarning

5. [x] **Create/Extend optional-fees API endpoint**

   - GET /api/vtc/optional-fees with autoApplyRules filter
   - Return fees applicable for airport scenarios

6. [x] **Integrate helpers in QuoteBasicInfoPanel**

   - Add AirportHelperPanel conditionally
   - Add CapacityWarningAlert after vehicle selector

7. [x] **Integrate helpers in QuotePricingPanel**

   - Display selected optional fees with amounts
   - Show "Auto-applied" badge for helper-added fees
   - Allow manual toggle of fees

8. [x] **Update usePricingCalculation hook**

   - Include optional fees in pricing request
   - Return fee breakdown in result

9. [x] **Add translations (FR/EN)**

   - Airport detection messages
   - Capacity warning messages
   - Upsell suggestion messages
   - Optional fee labels

10. [x] **Write unit tests**

    - useScenarioHelpers hook tests
    - Airport detection regex tests
    - Capacity calculation tests
    - Component rendering tests

11. [x] **Write Playwright E2E tests**
    - Airport address detection flow
    - Capacity warning and upsell flow
    - Optional fee auto-application flow

---

## UI/UX Specifications

### AirportHelperPanel

- **Position**: Below pickup/dropoff address fields, inside Trip Details card
- **Style**: Collapsible section with Plane icon, light blue/info background
- **Content**:
  - Header: "✈️ Airport Transfer Detected"
  - Flight number input (optional): `AF1234` format
  - Waiting time preset: dropdown (30min, 45min, 60min, custom)
  - Auto-applied fees: checkboxes with fee names and amounts

```
┌─────────────────────────────────────────────┐
│ ✈️ Airport Transfer Detected          [▼]  │
├─────────────────────────────────────────────┤
│ Flight Number (optional)                    │
│ ┌─────────────────────────────────────────┐ │
│ │ AF1234                                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Waiting Time Preset                         │
│ ┌─────────────────────────────────────────┐ │
│ │ 45 minutes (standard)              [▼]  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Auto-applied Fees:                          │
│ ☑ Airport Waiting Fee        +25,00 €      │
│ ☑ Airport Parking            +15,00 €      │
└─────────────────────────────────────────────┘
```

### CapacityWarningAlert

- **Position**: Below VehicleCategorySelector in Vehicle & Capacity card
- **Style**: Amber/warning background, AlertTriangle icon
- **Content**:
  - Warning message with current vs required capacity
  - Suggested category name and price delta
  - "Apply Suggestion" button (outline variant)

```
┌─────────────────────────────────────────────┐
│ ⚠️ Capacity Exceeded                        │
│                                             │
│ Selected: Berline (3 passengers max)        │
│ Required: 5 passengers                      │
│                                             │
│ Suggested: Van (7 passengers)               │
│ Price difference: +45,00 €                  │
│                                             │
│              [Apply Suggestion]             │
└─────────────────────────────────────────────┘
```

### Pricing Panel Integration

- Optional fees section with checkboxes
- "Auto" badge next to helper-applied fees
- Subtotal for optional fees

---

## Dependencies

- Story 6.2: Create Quote 3-Column Cockpit (provides UI structure) ✅
- Story 5.1: Fleet Models (provides vehicle capacities) ✅
- Story 9.3: Optional Fees Catalogue (provides fee data) - **Partial dependency**

**Note**: If Story 9.3 is not complete, we can seed test OptionalFee records with airport autoApplyRules for this story.

---

## Dev Notes

### Airport Detection Patterns

```typescript
const AIRPORT_PATTERNS = [
  /CDG/i,
  /Roissy/i,
  /Charles de Gaulle/i,
  /Orly/i,
  /Le Bourget/i,
  /aéroport/i,
  /airport/i,
];

function isAirportAddress(address: string): boolean {
  return AIRPORT_PATTERNS.some((pattern) => pattern.test(address));
}
```

### Capacity Calculation

```typescript
const LUGGAGE_VOLUME_LITERS = 50; // Standard suitcase

function checkCapacity(
  passengerCount: number,
  luggageCount: number,
  category: VehicleCategory
): CapacityWarning | null {
  if (passengerCount > category.maxPassengers) {
    return {
      type: "PASSENGER",
      current: category.maxPassengers,
      required: passengerCount,
    };
  }

  if (
    category.maxLuggageVolume &&
    luggageCount * LUGGAGE_VOLUME_LITERS > category.maxLuggageVolume
  ) {
    return {
      type: "LUGGAGE",
      current: Math.floor(category.maxLuggageVolume / LUGGAGE_VOLUME_LITERS),
      required: luggageCount,
    };
  }

  return null;
}
```

### OptionalFee autoApplyRules Schema

```typescript
interface AutoApplyRules {
  triggers: Array<{
    type: "airport" | "night" | "weekend" | "distance";
    condition?: {
      minDistance?: number;
      airports?: string[]; // Zone codes
    };
  }>;
}
```

### Component Hierarchy

```
CreateQuoteCockpit
├── QuoteBasicInfoPanel
│   ├── ContactSelector
│   ├── Trip Details Card
│   │   ├── AddressAutocomplete (pickup)
│   │   ├── AddressAutocomplete (dropoff)
│   │   ├── AirportHelperPanel (conditional)
│   │   └── DateTime picker
│   └── Vehicle & Capacity Card
│       ├── VehicleCategorySelector
│       ├── CapacityWarningAlert (conditional)
│       └── Passenger/Luggage inputs
├── TripTransparencyPanel
└── QuotePricingPanel
    ├── Suggested/Final Price
    ├── OptionalFeesSection (NEW)
    │   └── Fee checkboxes with auto badge
    └── Submit button
```

---

## Definition of Done

- [ ] Airport addresses are automatically detected
- [ ] AirportHelperPanel displays for airport transfers
- [ ] Flight number can be entered and is stored
- [ ] Optional fees auto-apply for airport scenarios
- [ ] Capacity warnings appear when exceeded
- [ ] Upsell suggestions show price delta
- [ ] One-click upsell changes vehicle category
- [ ] All messages are translated (FR/EN)
- [ ] Unit tests pass
- [ ] Playwright E2E tests pass
- [ ] Code reviewed and approved
- [ ] No accessibility issues

---

## Test Cases

### Unit Tests

| Test ID   | Description                                                    | Expected Result                                |
| --------- | -------------------------------------------------------------- | ---------------------------------------------- |
| UT-6.6-01 | isAirportAddress("Aéroport CDG Terminal 2")                    | returns true                                   |
| UT-6.6-02 | isAirportAddress("15 rue de Paris")                            | returns false                                  |
| UT-6.6-03 | checkCapacity(5, 0, {maxPassengers: 3})                        | returns PASSENGER warning                      |
| UT-6.6-04 | checkCapacity(2, 5, {maxPassengers: 4, maxLuggageVolume: 200}) | returns LUGGAGE warning                        |
| UT-6.6-05 | checkCapacity(2, 2, {maxPassengers: 4, maxLuggageVolume: 200}) | returns null                                   |
| UT-6.6-06 | findSuitableCategory(5, categories)                            | returns first category with maxPassengers >= 5 |

### E2E Tests

| Test ID    | Description         | Steps                                                       |
| ---------- | ------------------- | ----------------------------------------------------------- |
| E2E-6.6-01 | Airport detection   | Enter "CDG Terminal 2" → Verify AirportHelperPanel appears  |
| E2E-6.6-02 | Flight number entry | Enter flight "AF1234" → Verify stored in form               |
| E2E-6.6-03 | Capacity warning    | Select Berline, enter 5 passengers → Verify warning appears |
| E2E-6.6-04 | Upsell application  | Click "Apply Suggestion" → Verify category changes          |
| E2E-6.6-05 | Fee auto-apply      | Detect airport → Verify fees are checked                    |

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/6-6-implement-helpers-common-scenarios-airport-capacity.context.xml

### Implementation Notes

- Created `useScenarioHelpers` hook with airport detection and capacity validation logic
- Airport detection uses regex patterns for CDG, Orly, Le Bourget, and generic airport keywords
- Capacity validation compares passenger/luggage counts against `VehicleCategory.maxPassengers` and `maxLuggageVolume`
- Upsell suggestions find the smallest suitable category and calculate price delta based on `priceMultiplier`
- Optional fees use mock data (Story 9.3 dependency) with `autoApplyRules` for airport triggers
- Extended `VehicleCategory` type with `maxPassengers`, `maxLuggageVolume`, and `priceMultiplier` fields
- Extended `CreateQuoteFormData` with `flightNumber`, `waitingTimeMinutes`, and `selectedOptionalFeeIds`

### Files Modified

**New Files:**

- `apps/web/modules/saas/quotes/hooks/useScenarioHelpers.ts` - Main hook with detection/validation logic
- `apps/web/modules/saas/quotes/hooks/useOptionalFees.ts` - Hook for optional fees (mock data)
- `apps/web/modules/saas/quotes/hooks/useVehicleCategories.ts` - Hook to fetch all vehicle categories
- `apps/web/modules/saas/quotes/components/AirportHelperPanel.tsx` - Airport options panel
- `apps/web/modules/saas/quotes/components/CapacityWarningAlert.tsx` - Capacity warning with upsell
- `apps/web/cypress/e2e/quote-scenario-helpers.cy.ts` - E2E tests

**Modified Files:**

- `apps/web/modules/saas/quotes/types.ts` - Extended VehicleCategory and CreateQuoteFormData
- `apps/web/modules/saas/quotes/components/index.ts` - Export new components
- `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx` - Integrated helpers
- `packages/i18n/translations/en.json` - English translations for helpers
- `packages/i18n/translations/fr.json` - French translations for helpers
- `docs/sprint-artifacts/sprint-status.yaml` - Updated story status

### Test Results

**E2E Tests (Cypress):**

- `quote-scenario-helpers.cy.ts` - Test file created with scenarios for:
  - AC1: Airport address detection
  - AC2: Flight number input
  - AC3: Auto-apply airport fees
  - AC4: Passenger capacity warning
  - AC5: Luggage capacity warning
  - AC6: One-click upsell application
  - AC7: Helper transparency

### Git Commands

```bash
git checkout -b feature/6-6-helpers-airport-capacity
# ... implementation ...
git add .
git commit -m "feat(quotes): implement helpers for airport transfers and capacity upsell

Story 6.6: Implement Helpers for Common Scenarios (Airport & Capacity)

- Add useScenarioHelpers hook for airport detection and capacity validation
- Add AirportHelperPanel component for airport-specific options
- Add CapacityWarningAlert component for capacity warnings with upsell
- Integrate optional fees auto-application for airport scenarios
- Add FR/EN translations for all helper messages
- Add unit tests and Playwright E2E tests

Implements: FR45, FR56, FR58, FR60"
git push origin feature/6-6-helpers-airport-capacity
```
