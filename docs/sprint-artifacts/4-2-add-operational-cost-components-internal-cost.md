# Story 4.2: Add Operational Cost Components to Internal Cost

Status: ready-for-dev

## Story

**As a** finance user,  
**I want** internal cost to include fuel, tolls, parking and other configured costs,  
**So that** profitability reflects real operations, not just base distance/duration.

## Acceptance Criteria

### AC1: Complete Cost Calculation

- **Given** a pricing request with distance 50km and duration 60min
- **When** the internal cost is calculated
- **Then** it includes: fuel cost, toll estimate, wear cost, and driver cost

### AC2: Cost Breakdown in tripAnalysis

- **Given** a dynamic pricing result
- **When** the response is returned
- **Then** tripAnalysis includes a costBreakdown with:
  - fuelCost, tollCost, wearCost, driverCost, parkingCost
  - totalInternalCost
  - Each component with amount and calculation details

### AC3: Custom Cost Parameters

- **Given** an organisation with custom cost parameters
- **When** internal cost is calculated
- **Then** the custom parameters are used instead of defaults

### AC4: Margin Calculation

- **Given** a pricing result with internal cost and selling price
- **When** margin is calculated
- **Then** marginPercent = (price - internalCost) / price × 100
- **And** profitabilityIndicator is correctly set (green/orange/red)

### AC5: Grid Pricing with Cost Analysis

- **Given** a grid-based pricing result (FIXED_GRID mode)
- **When** the response is returned
- **Then** tripAnalysis still includes costBreakdown for profitability analysis

## Technical Tasks

### Task 1: Extend OrganizationPricingSettings

- [ ] Add fuelConsumptionL100km field (default 8.0)
- [ ] Add fuelPricePerLiter field (default 1.80)
- [ ] Add tollCostPerKm field (default 0.15)
- [ ] Add wearCostPerKm field (default 0.10)
- [ ] Add driverHourlyCost field (default 25.0)

### Task 2: Create Cost Calculation Functions

- [ ] Create `calculateFuelCost()` function
- [ ] Create `calculateTollCost()` function
- [ ] Create `calculateWearCost()` function
- [ ] Create `calculateDriverCost()` function
- [ ] Create `calculateTotalInternalCost()` function

### Task 3: Define TripAnalysis Structure

- [ ] Define CostBreakdown interface
- [ ] Define CostComponent interface
- [ ] Add tripAnalysis to PricingResult

### Task 4: Update Pricing Engine

- [ ] Integrate cost calculation in `calculatePrice()`
- [ ] Generate costBreakdown for both DYNAMIC and FIXED_GRID modes
- [ ] Update margin calculation to use new internal cost

### Task 5: Update API Response

- [ ] Include tripAnalysis in pricing response
- [ ] Ensure backward compatibility

### Task 6: Unit Tests

- [ ] Test fuel cost calculation
- [ ] Test toll cost calculation
- [ ] Test wear cost calculation
- [ ] Test driver cost calculation
- [ ] Test total internal cost
- [ ] Test custom parameters
- [ ] Test margin calculation
- [ ] Test grid pricing with cost analysis

## Data Types

### Cost Parameters (OrganizationPricingSettings)

```typescript
interface CostParameters {
  // Fuel
  fuelConsumptionL100km: number; // Liters per 100km (default 8.0)
  fuelPricePerLiter: number; // EUR per liter (default 1.80)

  // Tolls
  tollCostPerKm: number; // EUR per km (default 0.15)

  // Vehicle wear
  wearCostPerKm: number; // EUR per km (default 0.10)

  // Driver
  driverHourlyCost: number; // EUR per hour (default 25.0)
}
```

### Cost Breakdown Structure

```typescript
interface CostBreakdown {
  fuel: {
    amount: number;
    distanceKm: number;
    consumptionL100km: number;
    pricePerLiter: number;
  };
  tolls: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
  };
  wear: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
  };
  driver: {
    amount: number;
    durationMinutes: number;
    hourlyRate: number;
  };
  parking: {
    amount: number;
    description: string;
  };
  total: number;
}
```

### TripAnalysis Structure

```typescript
interface TripAnalysis {
  costBreakdown: CostBreakdown;
  // Future: segments for shadow calculation (Story 4.6)
  segments?: {
    approach?: SegmentCost;
    service?: SegmentCost;
    return?: SegmentCost;
  };
}

interface SegmentCost {
  distanceKm: number;
  durationMinutes: number;
  cost: number;
}
```

### Updated PricingResult

```typescript
interface PricingResult {
  pricingMode: PricingMode;
  price: number;
  currency: "EUR";
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityIndicator;
  matchedGrid: MatchedGrid | null;
  appliedRules: AppliedRule[];
  isContractPrice: boolean;
  fallbackReason: FallbackReason;
  gridSearchDetails: GridSearchDetails | null;
  // NEW
  tripAnalysis: TripAnalysis;
}
```

## API Contract

### POST /api/vtc/pricing/calculate

Response (with tripAnalysis):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 125.0,
  "currency": "EUR",
  "internalCost": 72.50,
  "margin": 52.50,
  "marginPercent": 42.0,
  "profitabilityIndicator": "green",
  "matchedGrid": null,
  "fallbackReason": "NO_ROUTE_MATCH",
  "appliedRules": [...],
  "isContractPrice": false,
  "tripAnalysis": {
    "costBreakdown": {
      "fuel": {
        "amount": 7.20,
        "distanceKm": 50,
        "consumptionL100km": 8.0,
        "pricePerLiter": 1.80
      },
      "tolls": {
        "amount": 7.50,
        "distanceKm": 50,
        "ratePerKm": 0.15
      },
      "wear": {
        "amount": 5.00,
        "distanceKm": 50,
        "ratePerKm": 0.10
      },
      "driver": {
        "amount": 25.00,
        "durationMinutes": 60,
        "hourlyRate": 25.0
      },
      "parking": {
        "amount": 0,
        "description": ""
      },
      "total": 44.70
    }
  }
}
```

## Cost Formulas

### Fuel Cost

```
fuelCost = distanceKm × (fuelConsumptionL100km / 100) × fuelPricePerLiter

Example: 50km × (8.0 / 100) × 1.80 = 50 × 0.08 × 1.80 = 7.20 EUR
```

### Toll Cost

```
tollCost = distanceKm × tollCostPerKm

Example: 50km × 0.15 = 7.50 EUR
```

### Wear Cost

```
wearCost = distanceKm × wearCostPerKm

Example: 50km × 0.10 = 5.00 EUR
```

### Driver Cost

```
driverCost = (durationMinutes / 60) × driverHourlyCost

Example: 60min × (25.0 / 60) = 1.0 × 25.0 = 25.00 EUR
```

### Total Internal Cost

```
internalCost = fuelCost + tollCost + wearCost + driverCost + parkingCost

Example: 7.20 + 7.50 + 5.00 + 25.00 + 0 = 44.70 EUR
```

## Test Scenarios

### Scenario 1: Standard Trip Cost Calculation

```typescript
const request = {
  distanceKm: 50,
  durationMinutes: 60,
};

const costParams = {
  fuelConsumptionL100km: 8.0,
  fuelPricePerLiter: 1.8,
  tollCostPerKm: 0.15,
  wearCostPerKm: 0.1,
  driverHourlyCost: 25.0,
};

// Expected:
// fuelCost = 50 × 0.08 × 1.80 = 7.20
// tollCost = 50 × 0.15 = 7.50
// wearCost = 50 × 0.10 = 5.00
// driverCost = 1.0 × 25.0 = 25.00
// total = 44.70

expect(result.tripAnalysis.costBreakdown.total).toBeCloseTo(44.7, 2);
```

### Scenario 2: Custom Cost Parameters

```typescript
const customParams = {
  fuelConsumptionL100km: 10.0, // Van consumes more
  fuelPricePerLiter: 1.9,
  tollCostPerKm: 0.2, // More tolls
  wearCostPerKm: 0.15,
  driverHourlyCost: 30.0,
};

// Expected:
// fuelCost = 50 × 0.10 × 1.90 = 9.50
// tollCost = 50 × 0.20 = 10.00
// wearCost = 50 × 0.15 = 7.50
// driverCost = 1.0 × 30.0 = 30.00
// total = 57.00

expect(result.tripAnalysis.costBreakdown.total).toBeCloseTo(57.0, 2);
```

### Scenario 3: Grid Pricing with Cost Analysis

```typescript
// Grid price = 150 EUR (fixed)
// Internal cost = 44.70 EUR (calculated)
// Margin = 150 - 44.70 = 105.30 EUR
// MarginPercent = 105.30 / 150 × 100 = 70.2%

expect(result.pricingMode).toBe("FIXED_GRID");
expect(result.price).toBe(150);
expect(result.internalCost).toBeCloseTo(44.7, 2);
expect(result.marginPercent).toBeCloseTo(70.2, 1);
expect(result.profitabilityIndicator).toBe("green");
```

### Scenario 4: Low Margin Trip

```typescript
// Price = 50 EUR
// Internal cost = 44.70 EUR
// Margin = 5.30 EUR
// MarginPercent = 10.6%

expect(result.marginPercent).toBeCloseTo(10.6, 1);
expect(result.profitabilityIndicator).toBe("orange");
```

### Scenario 5: Loss-Making Trip

```typescript
// Price = 40 EUR
// Internal cost = 44.70 EUR
// Margin = -4.70 EUR
// MarginPercent = -11.75%

expect(result.marginPercent).toBeCloseTo(-11.75, 1);
expect(result.profitabilityIndicator).toBe("red");
```

## Dependencies

- Story 1.1: Define VTC ERP Prisma Models ✅ Done
- Story 1.3: Implement EUR-Only Monetary Representation ✅ Done
- Story 4.1: Implement Base Dynamic Price Calculation ✅ Done

## Files to Create/Modify

### Modified Files

| File                                                         | Change                                        |
| ------------------------------------------------------------ | --------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Add cost calculation functions, tripAnalysis  |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Add tests for cost components                 |
| `packages/database/prisma/schema.prisma`                     | Extend OrganizationPricingSettings (optional) |

## Default Cost Parameters

Based on Paris VTC market analysis:

| Parameter             | Default Value | Description                      |
| --------------------- | ------------- | -------------------------------- |
| fuelConsumptionL100km | 8.0 L/100km   | Average for berline/van          |
| fuelPricePerLiter     | 1.80 EUR      | Current diesel price in France   |
| tollCostPerKm         | 0.15 EUR/km   | Average autoroute toll           |
| wearCostPerKm         | 0.10 EUR/km   | Maintenance, tires, depreciation |
| driverHourlyCost      | 25.0 EUR/h    | Gross salary + employer charges  |

## Dev Notes

- Cost calculation is applied to both DYNAMIC and FIXED_GRID pricing modes
- For FIXED_GRID, the price is fixed but internal cost is calculated for profitability analysis
- The tripAnalysis structure is designed to be extended in Story 4.6 (Shadow Calculation)
- Parking cost is set to 0 by default, will be enhanced when zone-specific rules are added
- Toll cost uses a simple per-km estimate; real toll calculation will come with Google Maps integration

## Related PRD Sections

- **FR14:** Internal cost with fuel, tolls, parking, other costs
- **FR22:** tripAnalysis with cost per segment and component
- **FR55:** Profitability indicator based on real costs
- **Appendix:** Cost Formula (fuel, wages, tolls, wear)
