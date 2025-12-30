# Story 4.5: Implement Multi-Base Candidate Selection & Pre-Filter

**Epic:** 4 - Dynamic Pricing & Shadow Calculation (Method 2)  
**Story ID:** 4-5  
**Status:** done  
**Created:** 2025-11-26  
**Author:** Bob (Scrum Master)

---

## User Story

**As an** operations planner,  
**I want** the engine to select candidate bases and vehicles efficiently,  
**So that** quotes account for deadhead distance without calling routing APIs for hopeless candidates.

---

## Description

This story implements the multi-base vehicle selection algorithm that:

1. Filters vehicles by capacity and status
2. Uses Haversine distance as a mathematical pre-filter to eliminate distant bases
3. Calls Google Distance Matrix API only for viable candidates
4. Selects the optimal vehicle/base pair based on total internal cost

The "deadhead problem" is critical: a €50 ride becomes a loss if the driver must travel 50km to reach the pickup. This story ensures every quote accounts for the full operational loop: **approach → service → return**.

---

## Acceptance Criteria

### AC1: Capacity-Compatible Vehicle Filtering

**Given** a fleet with vehicles linked to OperatingBase records and a requested itinerary with passenger/luggage requirements  
**When** a quote is evaluated  
**Then** the engine filters vehicles that are capacity-compatible:

- `passengerCapacity >= requested passengerCount`
- `luggageCapacity >= requested luggageCount` (if specified)

### AC2: Haversine Pre-Filter

**Given** candidate vehicles/bases after capacity filtering  
**When** the pre-filter runs  
**Then** bases that are obviously too far from pickup (default: > 100km Haversine distance) are eliminated without calling external routing APIs

### AC3: Routing API for Remaining Candidates

**Given** remaining candidates after Haversine pre-filter  
**When** precise routing is needed  
**Then** the engine calls Google Distance Matrix API only for the top N candidates (default: 5) to compute precise approach, service, and return distances/durations

### AC4: Optimal Base/Vehicle Selection

**Given** routing results for all viable candidates  
**When** selection is made  
**Then** the engine selects the optimal vehicle/base pair according to configured criteria (default: minimal internal cost)

### AC5: Approach Segment Cost Calculation

**Given** a selected vehicle/base pair  
**When** internal cost is calculated  
**Then** the approach segment (base → pickup) distance and duration are included in the cost calculation

### AC6: Return Segment Cost Calculation

**Given** a selected vehicle/base pair  
**When** internal cost is calculated  
**Then** the return segment (dropoff → base) distance and duration are included in the cost calculation

### AC7: Selection Transparency in tripAnalysis

**Given** a quote with vehicle/base selection  
**When** the pricing result is returned  
**Then** `tripAnalysis` contains:

- Selected vehicle/base info
- Number of candidates considered at each stage
- Selection rationale

### AC8: Fallback When No Vehicles Available

**Given** no vehicles match capacity or distance requirements  
**When** selection fails  
**Then** the engine returns pricing with default estimates and a `fallbackUsed: true` flag with explanation

### AC9: Active Vehicle Status Filter

**Given** vehicles with different statuses (ACTIVE, MAINTENANCE, OUT_OF_SERVICE)  
**When** candidate selection runs  
**Then** only ACTIVE vehicles are considered as candidates

---

## Technical Design

### New Service: `vehicle-selection.ts`

```typescript
// packages/api/src/services/vehicle-selection.ts

interface VehicleCandidate {
  vehicleId: string;
  vehicleName: string;
  vehicleCategoryId: string;
  baseId: string;
  baseName: string;
  baseLocation: GeoPoint;
  passengerCapacity: number;
  luggageCapacity: number | null;
  consumptionLPer100Km: number | null;
  costPerKm: number | null;
  averageSpeedKmh: number | null;
}

interface CandidateWithDistance extends VehicleCandidate {
  haversineDistanceKm: number;
  isWithinThreshold: boolean;
}

interface CandidateWithRouting extends CandidateWithDistance {
  approachDistanceKm: number;
  approachDurationMinutes: number;
  serviceDistanceKm: number;
  serviceDurationMinutes: number;
  returnDistanceKm: number;
  returnDurationMinutes: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  internalCost: number;
}

interface VehicleSelectionResult {
  selectedCandidate: CandidateWithRouting | null;
  candidatesConsidered: number;
  candidatesAfterCapacityFilter: number;
  candidatesAfterHaversineFilter: number;
  candidatesWithRouting: number;
  selectionCriterion: "MINIMAL_COST" | "BEST_MARGIN";
  fallbackUsed: boolean;
  fallbackReason?: string;
}

interface VehicleSelectionInput {
  organizationId: string;
  pickup: GeoPoint;
  dropoff: GeoPoint;
  passengerCount: number;
  luggageCount?: number;
  vehicleCategoryId?: string;
  haversineThresholdKm?: number; // Default: 100
  maxCandidatesForRouting?: number; // Default: 5
  selectionCriterion?: "MINIMAL_COST" | "BEST_MARGIN";
}
```

### Algorithm Flow

```
1. Load all ACTIVE vehicles with their bases for organization
   ↓
2. Filter by capacity (passengerCapacity >= required)
   ↓
3. Filter by vehicle category (if specified)
   ↓
4. Calculate Haversine distance (base → pickup) for each
   ↓
5. Eliminate candidates beyond threshold (default 100km)
   ↓
6. Sort by Haversine distance, take top N (default 5)
   ↓
7. Call Google Distance Matrix for remaining candidates:
   - Approach: base → pickup
   - Service: pickup → dropoff
   - Return: dropoff → base
   ↓
8. Calculate internal cost for each using calculateCostBreakdown
   ↓
9. Select candidate with minimal internal cost
   ↓
10. Return result with transparency data
```

### Integration Points

1. **pricing-calculate.ts route**: Load vehicles/bases, call selection before pricing
2. **pricing-engine.ts**: Accept selected vehicle info, include in tripAnalysis
3. **geo-utils.ts**: Reuse existing `haversineDistance` function

---

## Test Cases

### Unit Tests (`vehicle-selection.test.ts`)

| Test ID | AC  | Description                           | Input                               | Expected                        |
| ------- | --- | ------------------------------------- | ----------------------------------- | ------------------------------- |
| T1      | AC1 | Capacity filter - reject insufficient | 5 pax requested, vehicle has 4      | Vehicle excluded                |
| T2      | AC1 | Capacity filter - accept sufficient   | 4 pax requested, vehicle has 4      | Vehicle included                |
| T3      | AC2 | Haversine filter - eliminate distant  | Base at 150km, threshold 100km      | Base eliminated                 |
| T4      | AC2 | Haversine filter - keep close         | Base at 50km, threshold 100km       | Base kept                       |
| T5      | AC3 | Routing API limit                     | 10 candidates, max 5                | Only 5 get routing              |
| T6      | AC4 | Optimal selection                     | 3 candidates with costs 100, 80, 90 | Cost 80 selected                |
| T7      | AC5 | Approach cost included                | Base 30km from pickup               | 30km in total distance          |
| T8      | AC6 | Return cost included                  | Dropoff 20km from base              | 20km in total distance          |
| T9      | AC7 | Transparency data                     | Any selection                       | tripAnalysis has selection info |
| T10     | AC8 | No vehicles fallback                  | Empty fleet                         | fallbackUsed=true               |
| T11     | AC9 | Status filter                         | MAINTENANCE vehicle                 | Vehicle excluded                |

### Integration Tests

| Test ID | Description                         | Endpoint                        | Expected                                          |
| ------- | ----------------------------------- | ------------------------------- | ------------------------------------------------- |
| IT1     | Full pricing with vehicle selection | POST /api/vtc/pricing/calculate | Response includes selectedVehicle in tripAnalysis |
| IT2     | Pricing without available vehicles  | POST /api/vtc/pricing/calculate | Response has fallbackUsed=true                    |

---

## Dependencies

### Prerequisites (Completed)

- Story 1.1: VTC ERP Prisma Models (Vehicle, OperatingBase) ✅
- Story 4.1: Base Dynamic Price Calculation ✅
- Story 4.2: Operational Cost Components ✅

### External Dependencies

- Google Distance Matrix API (optional - fallback to Haversine estimates)
- `haversineDistance` from `geo-utils.ts` ✅

### Downstream Dependencies

- Story 4.6: Shadow Calculation Segments A/B/C (will use this selection)
- Epic 8: Dispatch (will reuse vehicle-selection service)

---

## Constraints

1. **API Cost Optimization**: Haversine pre-filter MUST run before any Google API calls
2. **Default Thresholds**:
   - Haversine threshold: 100km
   - Max candidates for routing: 5
3. **Selection Criterion**: Default to minimal internal cost
4. **Vehicle Status**: Only ACTIVE vehicles eligible
5. **Fallback Behavior**: Never block quote - use estimates with warning if no vehicles

---

## Files to Create/Modify

### New Files

- `packages/api/src/services/vehicle-selection.ts` - Main selection service
- `packages/api/src/services/__tests__/vehicle-selection.test.ts` - Unit tests

### Modified Files

- `packages/api/src/routes/vtc/pricing-calculate.ts` - Load vehicles, integrate selection
- `packages/api/src/services/pricing-engine.ts` - Accept vehicle selection, update tripAnalysis
- `packages/api/src/lib/geo-utils.ts` - Export haversineDistance (already exists)

---

## Definition of Done

- [x] `vehicle-selection.ts` service created with all functions
- [x] Capacity filter implemented and tested
- [x] Haversine pre-filter implemented and tested
- [x] Google Distance Matrix integration (with mock fallback)
- [x] Optimal selection algorithm implemented
- [x] Integration with pricing-calculate route
- [x] tripAnalysis updated with selection transparency
- [x] Fallback behavior for no vehicles
- [x] Unit tests passing (41/41 tests, ≥90% coverage)
- [x] Integration tests passing
- [x] Code review approved
- [x] Documentation updated

---

## Estimation

**Story Points:** 8  
**Complexity:** High (new service, external API integration, algorithm design)  
**Risk:** Medium (Google API dependency - mitigated by fallback)
