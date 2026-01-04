# Story 22.7: Implement STAY Trip Type Pricing Engine

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** in_progress  
**Created:** 2026-01-04  
**Priority:** High  
**Branch:** feature/22-7-stay-trip-type-pricing-engine

---

## User Story

**As an** operator,  
**I want** the STAY trip type to use the full pricing engine with zones, multipliers, and RSE compliance,  
**So that** multi-day packages are priced accurately with transparent cost breakdowns.

---

## Description

This story enhances the STAY pricing engine to integrate with the existing modular pricing architecture. Currently, `stay-pricing.ts` uses basic calculations. This story upgrades it to:

1. **Reuse Trip Type Pricing Functions**: Use `calculateExcursionPrice`, `calculateDispoPrice`, `calculateSmartDispoPrice` for each service
2. **Zone Multiplier Integration**: Apply zone multipliers based on pickup/dropoff locations for each service
3. **Seasonal Multiplier Support**: Apply seasonal multipliers when stay dates fall within configured seasons
4. **Shadow Calculation per Service**: Calculate approach/service/return segments for TRANSFER services
5. **RSE Compliance Integration**: Validate multi-day staffing requirements and include compliance costs
6. **Real Toll Costs**: Use Google Routes API for toll estimates when available
7. **Vehicle Category Multipliers**: Apply category-specific pricing multipliers
8. **Enhanced TripAnalysis**: Generate detailed breakdown per day and per service

### Business Value

- **Accurate Pricing**: Each service within a stay uses the same pricing logic as standalone quotes
- **Zone-Aware**: Services in premium zones (CDG, Versailles) get appropriate multipliers
- **Compliance-First**: RSE rules enforced for multi-day driver assignments
- **Transparent Costs**: Full cost breakdown visible in TripTransparency panel

### Prerequisites

- Story 22.5: STAY data model and basic API (completed)
- Story 22.6: STAY frontend interface (completed)
- Existing pricing modules: trip-type-pricing.ts, zone-resolver.ts, multiplier-engine.ts

---

## Acceptance Criteria

### AC1: Service-Level Pricing Integration

```gherkin
Given a STAY quote with services of different types
When pricing is calculated
Then each service uses the appropriate pricing function:
  - TRANSFER: max(distance × ratePerKm, duration × ratePerHour)
  - DISPO: calculateSmartDispoPrice with time buckets if configured
  - EXCURSION: calculateExcursionPrice with minimum hours and surcharge
And each service has its own tripAnalysis with cost breakdown
```

### AC2: Zone Multiplier Application

```gherkin
Given a STAY service with pickup in zone CDG (multiplier 1.2)
When pricing is calculated
Then the zone multiplier is applied to the service price
And the appliedRules array includes the zone multiplier rule
And services in different zones get different multipliers
```

### AC3: Seasonal Multiplier Application

```gherkin
Given a STAY quote spanning dates in a configured high season
When pricing is calculated
Then seasonal multipliers are applied to each day's services
And multi-day stays spanning multiple seasons get proportional multipliers
And the appliedRules array includes seasonal multiplier rules
```

### AC4: Shadow Calculation for TRANSFER Services

```gherkin
Given a STAY with TRANSFER services
When pricing is calculated
Then each TRANSFER service has shadow calculation with:
  - Approach segment (if vehicle base is known)
  - Service segment (pickup to dropoff)
  - Return segment (to next service pickup or base)
And the internal cost includes all segments
```

### AC5: RSE Compliance Integration

```gherkin
Given a STAY quote with multiple days requiring driver overnight
When pricing is calculated
Then RSE compliance is validated for total driving time
And if violations detected, alternative staffing is suggested:
  - Double crew option with cost
  - Relay driver option with cost
And selected staffing plan costs are included in the quote
```

### AC6: Real Toll Cost Integration

```gherkin
Given a STAY service with coordinates available
When pricing is calculated with toll integration enabled
Then Google Routes API is called for toll estimates
And real toll costs are used instead of estimates
And the tripAnalysis shows toll source as "GOOGLE_ROUTES_API"
```

### AC7: Vehicle Category Multiplier

```gherkin
Given a STAY quote with a premium vehicle category (multiplier 1.3)
When pricing is calculated
Then the vehicle category multiplier is applied to all services
And the appliedRules array includes the category multiplier rule
```

### AC8: Enhanced TripAnalysis Structure

```gherkin
Given a STAY quote is created
When I view the tripAnalysis
Then it contains:
  - stayBreakdown: totalDays, totalServices, totalHotelNights, totalMeals
  - costBreakdown: services, hotels, meals, driverPremiums, tolls, fuel
  - days[]: array with per-day breakdown
  - days[].services[]: array with per-service tripAnalysis
  - appliedRules: all pricing rules applied
  - complianceResult: RSE validation result if applicable
```

### AC9: API Response with Full Pricing

```gherkin
Given I create a STAY quote via API
When the response is returned
Then it includes:
  - suggestedPrice: total with all multipliers applied
  - internalCost: total internal cost
  - marginPercent: calculated margin
  - tripAnalysis: full breakdown as per AC8
  - stayDays[]: each day with dayTotalCost and services
```

### AC10: Pricing Consistency Validation

```gherkin
Given a STAY with a single TRANSFER service
When compared to a standalone TRANSFER quote with same parameters
Then the pricing should be identical (within rounding tolerance)
And the cost breakdown should match
```

---

## Technical Implementation

### Files to Modify

```
packages/api/src/services/pricing/stay-pricing.ts
├── Refactor calculateStayServicePricing to use trip-type-pricing functions
├── Add zone multiplier integration
├── Add seasonal multiplier integration
├── Add shadow calculation for TRANSFER services
├── Add RSE compliance integration
├── Add real toll cost support
├── Add vehicle category multiplier
├── Enhance tripAnalysis structure

packages/api/src/routes/vtc/stay-quotes.ts
├── Pass zone data to pricing function
├── Include vehicle category multiplier
├── Handle RSE compliance results
```

### Files to Create

```
packages/api/src/services/pricing/stay-pricing-enhanced.ts (optional, can modify existing)
```

### Key Functions to Implement

```typescript
// Enhanced stay service pricing
export async function calculateEnhancedStayServicePricing(
  service: StayServiceInput,
  serviceOrder: number,
  settings: OrganizationPricingSettings,
  vehicleCategory: VehicleCategory,
  zones: { pickup?: PricingZone; dropoff?: PricingZone },
  seasonalMultipliers: SeasonalMultiplier[],
  organizationId: string
): Promise<EnhancedStayServicePricingResult>;

// Enhanced stay day pricing with RSE
export async function calculateEnhancedStayDayPricing(
  day: StayDayInput,
  dayNumber: number,
  settings: OrganizationPricingSettings,
  vehicleCategory: VehicleCategory,
  zones: Map<string, PricingZone>,
  seasonalMultipliers: SeasonalMultiplier[],
  organizationId: string
): Promise<EnhancedStayDayPricingResult>;

// Full stay pricing with compliance
export async function calculateEnhancedStayPricing(
  input: StayPricingInput,
  settings: OrganizationPricingSettings,
  vehicleCategory: VehicleCategory,
  organizationId: string
): Promise<EnhancedStayPricingResult>;
```

### Type Extensions

```typescript
export interface EnhancedStayServicePricingResult
  extends StayServicePricingResult {
  zoneMultiplier?: number;
  seasonalMultiplier?: number;
  categoryMultiplier?: number;
  appliedRules: AppliedRule[];
  tollSource?: "ESTIMATE" | "GOOGLE_ROUTES_API";
}

export interface EnhancedStayDayPricingResult extends StayDayPricingResult {
  seasonalMultiplier?: number;
  services: EnhancedStayServicePricingResult[];
}

export interface EnhancedStayPricingResult extends StayPricingResult {
  appliedRules: AppliedRule[];
  complianceResult?: ComplianceValidationResult;
  vehicleCategoryMultiplier?: number;
}
```

---

## Tasks / Subtasks

- [ ] Task 1: Refactor Service Pricing to Use Trip Type Functions (AC: #1)

  - [ ] Import trip-type-pricing functions
  - [ ] Update TRANSFER pricing to use max(distance, duration) formula
  - [ ] Update DISPO pricing to use calculateSmartDispoPrice
  - [ ] Update EXCURSION pricing to use calculateExcursionPrice
  - [ ] Add excursion return cost calculation

- [ ] Task 2: Integrate Zone Multipliers (AC: #2)

  - [ ] Add zone lookup for service pickup/dropoff
  - [ ] Apply calculateEffectiveZoneMultiplier
  - [ ] Include zone rules in appliedRules

- [ ] Task 3: Integrate Seasonal Multipliers (AC: #3)

  - [ ] Fetch seasonal multipliers for organization
  - [ ] Apply evaluateSeasonalMultipliers for each service date
  - [ ] Handle multi-day stays spanning seasons

- [ ] Task 4: Add Shadow Calculation for TRANSFER (AC: #4)

  - [ ] Calculate approach segment from vehicle base
  - [ ] Calculate service segment
  - [ ] Calculate return segment to next service or base
  - [ ] Include positioning costs in internal cost

- [ ] Task 5: Integrate RSE Compliance (AC: #5)

  - [ ] Calculate total driving time across all days
  - [ ] Validate against RSE thresholds
  - [ ] Generate alternative staffing options
  - [ ] Include compliance costs in pricing

- [ ] Task 6: Add Real Toll Cost Support (AC: #6)

  - [ ] Check if coordinates available
  - [ ] Call toll service for each TRANSFER service
  - [ ] Update tripAnalysis with toll source

- [ ] Task 7: Apply Vehicle Category Multiplier (AC: #7)

  - [ ] Get category multiplier from vehicleCategory
  - [ ] Apply to all service prices
  - [ ] Include in appliedRules

- [ ] Task 8: Enhance TripAnalysis Structure (AC: #8)

  - [ ] Add appliedRules array
  - [ ] Add complianceResult
  - [ ] Add per-service tripAnalysis
  - [ ] Add toll breakdown

- [ ] Task 9: Update API Response (AC: #9)

  - [ ] Include full tripAnalysis in response
  - [ ] Include appliedRules
  - [ ] Include compliance information

- [ ] Task 10: Add Pricing Consistency Tests (AC: #10)
  - [ ] Test single TRANSFER matches standalone quote
  - [ ] Test single DISPO matches standalone quote
  - [ ] Test single EXCURSION matches standalone quote

---

## Test Cases

### API Tests (Curl)

```bash
# Create STAY Quote with zone multipliers
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
            "pickupAddress": "CDG Airport Terminal 2E",
            "pickupLatitude": 49.0097,
            "pickupLongitude": 2.5479,
            "dropoffAddress": "Hotel Paris Opera",
            "dropoffLatitude": 48.8738,
            "dropoffLongitude": 2.3318,
            "distanceKm": 35,
            "durationMinutes": 45
          }
        ]
      }
    ]
  }'

# Verify zone multiplier applied (CDG = 1.2)
# Expected: serviceCost includes zone multiplier
```

### Database Verification

```sql
-- Verify STAY quote with enhanced pricing
SELECT
  q.id,
  q.trip_type,
  q.suggested_price,
  q.internal_cost,
  q.margin_percent,
  q.trip_analysis->'appliedRules' as applied_rules
FROM quote q
WHERE q.trip_type = 'STAY'
ORDER BY q.created_at DESC
LIMIT 1;

-- Verify service-level pricing
SELECT
  ss.service_type,
  ss.service_cost,
  ss.service_internal_cost,
  ss.trip_analysis->'zoneMultiplier' as zone_multiplier
FROM stay_service ss
JOIN stay_day sd ON ss.stay_day_id = sd.id
WHERE sd.quote_id = '...';
```

### UI Tests (Playwright MCP)

```typescript
describe("STAY Enhanced Pricing", () => {
  it("should display zone multiplier in cost breakdown", async () => {
    // Create STAY quote with CDG pickup
    // Verify zone multiplier shown in TripTransparency
  });

  it("should show seasonal multiplier when applicable", async () => {
    // Create STAY quote during high season
    // Verify seasonal multiplier in applied rules
  });

  it("should display RSE compliance warning for long stays", async () => {
    // Create 3-day STAY with long driving
    // Verify compliance warning shown
  });
});
```

---

## Dev Notes

### Architecture Patterns

- Follow existing pricing module patterns
- Use async functions for database/API calls
- Maintain backward compatibility with basic pricing

### Existing Code to Reuse

- `packages/api/src/services/pricing/trip-type-pricing.ts` - Trip type calculations
- `packages/api/src/services/pricing/zone-resolver.ts` - Zone multipliers
- `packages/api/src/services/pricing/multiplier-engine.ts` - All multipliers
- `packages/api/src/services/pricing/shadow-calculator.ts` - Shadow calculation
- `packages/api/src/services/compliance-validator.ts` - RSE compliance
- `packages/api/src/services/toll-service.ts` - Real toll costs

### Important Considerations

1. **Performance**: Cache zone lookups to avoid repeated DB queries
2. **Backward Compatibility**: Existing STAY quotes should still work
3. **Error Handling**: Graceful fallback if external APIs fail
4. **Rounding**: Consistent 2 decimal places for all monetary values

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Completion Notes List

1. **stay-pricing.ts**: Added enhanced pricing functions with zone multipliers, seasonal multipliers, advanced rates, and vehicle category multipliers
2. **stay-quotes.ts**: Updated API routes to use enhanced pricing with zone lookup and multiplier integration
3. **index.ts**: Exported new enhanced functions and types

### Verification Summary

- **TypeScript Compilation**: Code compiles without errors in stay-pricing.ts and stay-quotes.ts
- **Database Schema**: Verified zones exist with correct multipliers (CDG=1.2×, BUSSY_15=0.9×, etc.)
- **API Integration**: Enhanced pricing integrated into create and update routes

### File List

**Modified:**

- `packages/api/src/services/pricing/stay-pricing.ts` - Added 430+ lines with enhanced pricing functions
- `packages/api/src/routes/vtc/stay-quotes.ts` - Added zone/multiplier integration (~150 lines)
- `packages/api/src/services/pricing/index.ts` - Added exports for new functions/types

---

## Change Log

| Date       | Change        | Author            |
| ---------- | ------------- | ----------------- |
| 2026-01-04 | Story created | BMAD Orchestrator |
