# Story 20.2: Migrate to Google Routes API

**Epic:** 20 - Critical Bug Fixes, Google Maps Migration & Comprehensive Testing  
**Status:** done  
**Priority:** HIGH  
**Effort:** L (Large)  
**Date:** 2026-01-02  
**Branch:** `feature/20-2-migrate-to-google-routes-api`

---

## Story

As a **VTC operator**,  
I want the application to use the modern Google Routes API instead of the legacy DirectionsService,  
So that I no longer see console errors about legacy API and can benefit from better routing capabilities including toll information.

## Context & Problem

The application currently uses `google.maps.DirectionsService` (legacy API) in `RoutePreviewMap.tsx` which triggers console errors:

```
"Legacy DirectionsService API is not activated for this project"
```

The new Google Routes API (v2) with `computeRoutes` provides:

- Better performance and reliability
- Access to toll information via `ComputeRoutesExtraComputation.TOLLS`
- More accurate traffic-aware routing
- Modern REST API instead of JavaScript SDK

## Acceptance Criteria

| AC# | Critère                                                                      | Status |
| --- | ---------------------------------------------------------------------------- | ------ |
| AC1 | Replace all `DirectionsService` usage with Routes API `computeRoutes` method | ✅     |
| AC2 | Use existing `google-routes-client.ts` functions for route computation       | ✅     |
| AC3 | Request toll information via field mask for future Story 20.3                | ✅     |
| AC4 | No console errors about legacy API                                           | ✅     |
| AC5 | Route polyline displays correctly on map                                     | ✅     |
| AC6 | Maintain fallback to simple polyline when API fails                          | ✅     |
| AC7 | Waypoints for excursions continue to work                                    | ✅     |

## Technical Analysis

### Current State

1. **`RoutePreviewMap.tsx`** (lines 246-325):

   - Uses `new google.maps.DirectionsService()` - LEGACY
   - Uses `new google.maps.DirectionsRenderer()` - LEGACY
   - Has fallback polyline mechanism

2. **`ModernRouteMap.tsx`**:

   - Already uses Routes API via `computeRoutesWithFallback()`
   - Uses `google-routes-client.ts`
   - **NOT currently used anywhere** (orphan component)

3. **`TripTransparencyPanel.tsx`** (line 339):

   - Imports and uses `RoutePreviewMap` (legacy)

4. **`google-routes-client.ts`**:
   - Complete Routes API client already implemented
   - Has `computeRoutes()` and `computeRoutesWithFallback()` functions
   - Has polyline decoding and legacy format conversion

### Solution Options

**Option A: Replace RoutePreviewMap with ModernRouteMap**

- Change import in `TripTransparencyPanel.tsx`
- Delete or deprecate `RoutePreviewMap.tsx`
- Pros: Clean, uses already-tested code
- Cons: Need to verify ModernRouteMap has all features

**Option B: Migrate RoutePreviewMap to use Routes API**

- Update `RoutePreviewMap.tsx` to use `computeRoutesWithFallback()`
- Remove DirectionsService/DirectionsRenderer code
- Pros: Minimal changes to consumers
- Cons: Duplicates logic from ModernRouteMap

**Recommended: Option A** - Replace with ModernRouteMap since it's already implemented correctly.

## Tasks / Subtasks

- [ ] **Task 1: Update TripTransparencyPanel to use ModernRouteMap** (AC: 1, 2, 5, 7)

  - [ ] Change import from `RoutePreviewMap` to `ModernRouteMap`
  - [ ] Update component usage (props are identical)
  - [ ] Verify waypoints prop is passed correctly

- [ ] **Task 2: Update google-routes-client.ts field mask for tolls** (AC: 3)

  - [ ] Add `routes.travelAdvisory.tollInfo` to X-Goog-FieldMask header
  - [ ] This prepares for Story 20.3 (Integrate Real Toll Costs)

- [ ] **Task 3: Deprecate RoutePreviewMap.tsx** (AC: 1, 4)

  - [ ] Add deprecation comment to RoutePreviewMap
  - [ ] Or delete if no other usages exist

- [ ] **Task 4: Verify GoogleMapsProvider exposes apiKey** (AC: 2)

  - [ ] Confirm `useGoogleMaps()` hook returns `apiKey`
  - [ ] ModernRouteMap requires `apiKey` for Routes API calls

- [ ] **Task 5: Test route display** (AC: 5, 6, 7)
  - [ ] Test with simple pickup/dropoff
  - [ ] Test with excursion waypoints
  - [ ] Test fallback when API fails
  - [ ] Verify no console errors

## Dev Notes

### Files to Modify

1. **`apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`**

   - Line 33: Change import
   - Line 339: Change component usage

2. **`apps/web/lib/google-routes-client.ts`**

   - Line 313: Add toll info to field mask

3. **`apps/web/modules/saas/quotes/components/RoutePreviewMap.tsx`**
   - Add deprecation notice or delete

### Key Code Changes

#### TripTransparencyPanel.tsx - Import Change

```typescript
// Before
import { RoutePreviewMap } from "./RoutePreviewMap";

// After
import { ModernRouteMap } from "./ModernRouteMap";
```

#### TripTransparencyPanel.tsx - Component Change

```typescript
// Before
<RoutePreviewMap
  pickup={routeCoordinates.pickup}
  dropoff={routeCoordinates.dropoff}
  waypoints={routeCoordinates.waypoints}
/>

// After
<ModernRouteMap
  pickup={routeCoordinates.pickup}
  dropoff={routeCoordinates.dropoff}
  waypoints={routeCoordinates.waypoints}
/>
```

#### google-routes-client.ts - Field Mask Update

```typescript
// Before (line 313)
"X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline,routes.description,routes.legs",

// After
"X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline,routes.description,routes.legs,routes.travelAdvisory.tollInfo",
```

### Architecture Compliance

- Uses existing `google-routes-client.ts` (no new dependencies)
- Uses existing `GoogleMapsProvider` context
- Follows existing component patterns
- No database changes required
- No API route changes required

### Testing Requirements

1. **Manual UI Testing (Playwright MCP)**

   - Navigate to quote creation
   - Enter pickup and dropoff addresses
   - Verify route displays on map
   - Verify no console errors about legacy API

2. **Edge Cases**
   - Test with excursion (multiple waypoints)
   - Test with API failure (should show fallback polyline)
   - Test with missing coordinates (should show placeholder)

### Dependencies

- **Prerequisite:** Story 20.1 (TripTransparencyPanel null safety) - ✅ Done
- **Enables:** Story 20.3 (Integrate Real Toll Costs)

## References

- [Source: docs/bmad/epics.md#FR90]
- [Source: docs/bmad/prd.md#FR17-FR24]
- [Google Routes API Documentation](https://developers.google.com/maps/documentation/routes)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Completion Notes List

- Replaced `RoutePreviewMap` import with `ModernRouteMap` in `TripTransparencyPanel.tsx`
- Added toll info field mask to `google-routes-client.ts` for Story 20.3 preparation
- Added deprecation notice to `RoutePreviewMap.tsx`
- Tested via Playwright MCP: map displays correctly, no legacy API errors in console

### File List

1. `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx` - Changed import and usage from RoutePreviewMap to ModernRouteMap
2. `apps/web/lib/google-routes-client.ts` - Added `routes.travelAdvisory.tollInfo` to field mask
3. `apps/web/modules/saas/quotes/components/RoutePreviewMap.tsx` - Added @deprecated JSDoc comment
