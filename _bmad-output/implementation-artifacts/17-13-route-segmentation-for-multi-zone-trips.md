# Story 17.13: Route Segmentation for Multi-Zone Trips

**Epic:** Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability  
**Status:** In Progress  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2025-12-31  
**Author:** BMad Orchestrator

---

## User Story

**As an** operator,  
**I want** the system to calculate pricing based on the actual distance spent in each zone along the route,  
**So that** pricing accurately reflects the geographic complexity of multi-zone trips.

---

## Related Functional Requirements

- **FR75:** The system shall support route segmentation for multi-zone trips, calculating the distance and duration spent in each zone along the route polyline and applying zone-specific pricing rules proportionally.

---

## Business Value

- **Précision tarifaire** : Les trajets traversant plusieurs zones (ex: Paris → Versailles via différentes zones) seront facturés proportionnellement au temps/distance passé dans chaque zone.
- **Transparence** : Le client et l'opérateur voient exactement comment le prix est construit par segment de zone.
- **Équité** : Évite de sur-facturer ou sous-facturer les trajets transversaux.

---

## Acceptance Criteria

### AC1 - Polyline Decoding

**Given** a route with an encoded polyline from Google Routes API,  
**When** the pricing engine processes the route,  
**Then** it shall decode the polyline into an array of lat/lng coordinates using the Google Polyline Algorithm.

### AC2 - Zone Intersection Detection

**Given** a decoded polyline crossing multiple pricing zones (e.g., PARIS_0 → PARIS_20 → CDG),  
**When** the pricing engine calculates the quote,  
**Then** it shall detect each zone boundary crossing along the polyline.

### AC3 - Segment Distance/Duration Calculation

**Given** a route crossing zones [PARIS_0, PARIS_20, CDG],  
**When** the pricing engine calculates,  
**Then** it shall compute the distance (km) and estimated duration (minutes) spent in each zone,  
**And** the sum of segment distances shall equal the total route distance (within 1% tolerance).

### AC4 - Proportional Zone Multiplier Application

**Given** a route with segments:

- PARIS_0: 5km (multiplier 1.0×)
- PARIS_20: 15km (multiplier 1.1×)
- CDG: 10km (multiplier 1.2×)

**When** the pricing engine applies zone multipliers,  
**Then** it shall calculate a weighted average multiplier: `(5×1.0 + 15×1.1 + 10×1.2) / 30 = 1.1×`,  
**And** apply this weighted multiplier to the base price.

### AC5 - Zone Surcharges Per Segment

**Given** a route passing through a zone with fixed surcharges (e.g., VERSAILLES with parking fee),  
**When** the pricing engine calculates,  
**Then** the zone surcharge shall be added once (not proportionally) if the route enters that zone.

### AC6 - TripAnalysis zoneSegments Storage

**Given** a calculated quote with route segmentation,  
**When** the quote is saved,  
**Then** `tripAnalysis.zoneSegments` shall contain an array with:

```typescript
{
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  distanceKm: number;
  durationMinutes: number;
  priceMultiplier: number;
  surchargesApplied: number; // Sum of parking + access fees
  entryPoint: {
    lat: number;
    lng: number;
  }
  exitPoint: {
    lat: number;
    lng: number;
  }
}
```

### AC7 - Applied Rules Transparency

**Given** a quote with route segmentation,  
**When** I view the applied rules,  
**Then** I shall see a `ROUTE_SEGMENTATION` rule showing:

- Number of zones crossed
- Weighted multiplier calculation
- Per-zone breakdown

### AC8 - Fallback for Missing Polyline

**Given** a quote without polyline data (e.g., Haversine estimate),  
**When** the pricing engine calculates,  
**Then** it shall fall back to the existing pickup/dropoff zone multiplier logic (Story 17.2),  
**And** `tripAnalysis.zoneSegments` shall be null or empty.

### AC9 - Performance Constraint

**Given** a polyline with up to 1000 points,  
**When** the pricing engine processes route segmentation,  
**Then** the calculation shall complete in under 100ms.

---

## Technical Notes

### 1. Polyline Decoding Utility

Create a new utility in `packages/api/src/lib/polyline-utils.ts`:

```typescript
/**
 * Decode a Google Encoded Polyline into an array of coordinates
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(
  encoded: string
): Array<{ lat: number; lng: number }>;

/**
 * Calculate the distance between two points using Haversine formula
 */
export function segmentDistance(p1: GeoPoint, p2: GeoPoint): number;
```

### 2. Route Segmentation Logic

Create `packages/api/src/services/route-segmentation.ts`:

```typescript
export interface ZoneSegment {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  distanceKm: number;
  durationMinutes: number;
  priceMultiplier: number;
  surchargesApplied: number;
  entryPoint: GeoPoint;
  exitPoint: GeoPoint;
}

export interface RouteSegmentationResult {
  segments: ZoneSegment[];
  weightedMultiplier: number;
  totalSurcharges: number;
  zonesTraversed: string[]; // Zone codes in order
}

export function segmentRouteByZones(
  polyline: string,
  zones: ZoneData[],
  totalDurationMinutes: number
): RouteSegmentationResult;
```

### 3. Integration Points

- **pricing-engine.ts**: Call `segmentRouteByZones()` when polyline is available
- **TripAnalysis interface**: Add `zoneSegments?: ZoneSegment[]` field
- **AppliedRule**: Add `ROUTE_SEGMENTATION` type
- **pricing-calculate.ts**: Pass polyline from Google Routes API response

### 4. Algorithm Overview

```
1. Decode polyline → points[]
2. For each consecutive pair (p1, p2):
   a. Find zone containing p1
   b. Calculate segment distance
   c. If zone changes, record boundary crossing
3. Aggregate by zone → ZoneSegment[]
4. Calculate weighted multiplier = Σ(distance_i × multiplier_i) / total_distance
5. Collect unique zone surcharges (parking, access fees)
6. Return RouteSegmentationResult
```

### 5. Edge Cases

- **Point exactly on zone boundary**: Use the zone of the previous point
- **Point in no zone**: Use multiplier 1.0 and mark as "OUTSIDE_ZONES"
- **Very short segments**: Aggregate consecutive points in same zone before calculating
- **Circular zones overlap**: Use zone conflict resolution strategy (Story 17.1)

---

## Prerequisites

- Story 17.1: Configurable Zone Conflict Resolution Strategy ✅
- Story 17.2: Configurable Zone Multiplier Aggregation Strategy ✅
- Story 17.10: Zone Fixed Surcharges (Friction Costs) ✅
- Epic 11: Zone Management with geometry data ✅

---

## Dependencies

- `packages/api/src/lib/geo-utils.ts` - Zone matching functions
- `packages/api/src/services/pricing-engine.ts` - Main pricing engine
- `packages/api/src/routes/vtc/pricing-calculate.ts` - API route
- Google Routes API polyline response

---

## Test Cases

### Unit Tests (Vitest)

1. **Polyline Decoding**

   - Decode simple polyline → correct coordinates
   - Decode empty string → empty array
   - Decode invalid polyline → throw error

2. **Zone Intersection**

   - Route entirely within one zone → single segment
   - Route crossing 2 zones → 2 segments with correct distances
   - Route crossing 5 zones → 5 segments
   - Route through zone with surcharge → surcharge included once

3. **Weighted Multiplier**

   - Equal distances, different multipliers → correct weighted average
   - All same multiplier → returns that multiplier
   - Empty segments → returns 1.0

4. **Edge Cases**
   - Point outside all zones → uses 1.0 multiplier
   - Very short route (< 100m) → handles gracefully
   - Polyline with 1000+ points → completes in < 100ms

### Integration Tests (API)

1. **POST /api/vtc/pricing/calculate** with polyline
   - Returns zoneSegments in tripAnalysis
   - Weighted multiplier applied to price
   - Applied rules include ROUTE_SEGMENTATION

### E2E Tests (Playwright)

1. **Quote Creation with Multi-Zone Route**
   - Create quote Paris → CDG
   - Verify TripTransparency shows zone breakdown
   - Verify price reflects weighted multiplier

---

## Files to Create/Modify

### New Files

- `packages/api/src/lib/polyline-utils.ts` - Polyline decoding utility
- `packages/api/src/services/route-segmentation.ts` - Route segmentation service
- `packages/api/src/services/__tests__/polyline-utils.test.ts` - Unit tests
- `packages/api/src/services/__tests__/route-segmentation.test.ts` - Unit tests

### Modified Files

- `packages/api/src/services/pricing-engine.ts` - Add ZoneSegment type, integrate segmentation
- `packages/api/src/routes/vtc/pricing-calculate.ts` - Pass polyline to pricing engine
- `packages/api/src/lib/geo-utils.ts` - Export types needed by segmentation

---

## Definition of Done

- [ ] Polyline decoding utility implemented and tested
- [ ] Route segmentation service implemented and tested
- [ ] TripAnalysis.zoneSegments populated when polyline available
- [ ] Weighted zone multiplier applied to pricing
- [ ] Zone surcharges collected from traversed zones
- [ ] ROUTE_SEGMENTATION applied rule added for transparency
- [ ] Fallback to pickup/dropoff logic when no polyline
- [ ] Performance: < 100ms for 1000-point polylines
- [ ] Unit tests passing (Vitest)
- [ ] Integration tests passing (API)
- [ ] E2E tests passing (Playwright)
- [ ] Story file updated with implementation details

---

## Implementation Notes

### Files Created

- `packages/api/src/lib/polyline-utils.ts` - Polyline decoding utility with Haversine distance calculation
- `packages/api/src/services/route-segmentation.ts` - Route segmentation service with zone intersection detection
- `packages/api/src/lib/__tests__/polyline-utils.test.ts` - 19 unit tests for polyline utilities
- `packages/api/src/services/__tests__/route-segmentation.test.ts` - 16 unit tests for route segmentation

### Files Modified

- `packages/api/src/services/pricing-engine.ts` - Added `ZoneSegmentInfo` interface and `zoneSegments`/`routeSegmentation` fields to `TripAnalysis`
- `packages/api/src/services/toll-service.ts` - Modified to request and return `encodedPolyline` from Google Routes API
- `packages/api/src/routes/vtc/pricing-calculate.ts` - Integrated route segmentation into pricing calculation flow

### Key Implementation Details

1. **Polyline Decoding**: Implemented Google Polyline Algorithm decoder with 1e5 precision
2. **Zone Intersection**: Uses binary search to find precise zone boundary crossing points
3. **Weighted Multiplier**: Calculates `Σ(distance_i × multiplier_i) / total_distance`
4. **Surcharges**: Applied once per zone traversed (not proportionally)
5. **Fallback**: Uses pickup/dropoff zone 50/50 split when no polyline available
6. **Performance**: Polyline simplification (50m threshold) for efficiency

### Test Results

- **35 unit tests passing** (19 polyline + 16 segmentation)
- Performance: < 100ms for 1000-point polylines

---

## Changelog

| Date       | Author            | Change        |
| ---------- | ----------------- | ------------- |
| 2025-12-31 | BMad Orchestrator | Story created |
