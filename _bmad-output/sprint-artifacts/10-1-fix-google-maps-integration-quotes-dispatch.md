# Story 10.1: Fix Google Maps Integration for Quotes & Dispatch

## Story Overview

**Epic**: 10 - Critical Bug Fixes & Integration Completion  
**Story ID**: 10-1  
**Priority**: CRITICAL  
**Estimated Effort**: 8 Story Points  
**Status**: Done

## Problem Statement

The Google Maps integration is broken across the application, causing multiple critical failures:

1. **Address Autocomplete Not Working**: The `AddressAutocomplete` component checks for `window.google?.maps?.places` but Google Maps JavaScript API is never loaded in the application
2. **Coordinates Not Captured**: All quotes have `NULL` values for `pickupLatitude`, `pickupLongitude`, `dropoffLatitude`, `dropoffLongitude`
3. **Dispatch Screen Empty**: No missions appear because coordinates are missing
4. **Map Not Displayed**: The quote detail page shows "Pas encore de données tarifaires" because there's no map integration
5. **Pricing Calculation Incomplete**: Without coordinates, the pricing engine cannot calculate distances/routes properly

## Root Cause Analysis

### Issue 1: Google Maps Script Not Loaded

- The `AddressAutocomplete` component expects `window.google.maps.places` to exist
- The Google Maps JavaScript API is never loaded globally in the app
- The API key exists in the database but is only fetched for specific map components, not for Places API

### Issue 2: Missing Places API Library

- Even when Google Maps is loaded (in `GoogleMap.tsx`, `DispatchMapGoogle.tsx`), only the `geometry` library is loaded
- The `places` library required for autocomplete is never loaded

### Issue 3: Seed Data Without Coordinates

- The seed script creates quotes with addresses but no coordinates
- Real quotes created via UI also have no coordinates because autocomplete doesn't work

## Acceptance Criteria

### AC1: Google Maps Places API Loading

- [ ] Create a `GoogleMapsProvider` component that loads Google Maps JS API with `places` library
- [ ] Provider fetches API key from `/api/vtc/settings/integrations/google-maps-key`
- [ ] Provider wraps the app layout for organization routes
- [ ] `AddressAutocomplete` works with real Google Places suggestions

### AC2: Address Autocomplete Functional

- [ ] When typing an address, Google Places suggestions appear
- [ ] Selecting a suggestion populates address AND coordinates (lat/lng)
- [ ] Coordinates are stored in form state and sent to API

### AC3: Quote Creation with Real Data

- [ ] Creating a quote captures pickup/dropoff coordinates
- [ ] Pricing calculation receives valid coordinates
- [ ] `tripAnalysis` includes real distance/duration from Google Directions API

### AC4: Dispatch Shows Missions

- [ ] Accepted quotes with future dates appear in dispatch
- [ ] Map displays pickup/dropoff markers with route
- [ ] Candidate bases are shown on map

### AC5: Seed Data Update

- [ ] Update seed script to include realistic coordinates for Paris area
- [ ] Ensure test quotes have valid lat/lng values

## Technical Implementation

### 1. Create GoogleMapsProvider

```typescript
// apps/web/modules/saas/shared/providers/GoogleMapsProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useGoogleMapsApiKey } from "../hooks/useGoogleMapsApiKey";

interface GoogleMapsContextValue {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  isLoading: true,
  error: null,
});

export function GoogleMapsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: apiKey, isLoading: keyLoading } = useGoogleMapsApiKey();
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || keyLoading) return;

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Load script with places library
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    document.head.appendChild(script);
  }, [apiKey, keyLoading]);

  return (
    <GoogleMapsContext.Provider
      value={{ isLoaded, isLoading: keyLoading, error }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const useGoogleMaps = () => useContext(GoogleMapsContext);
```

### 2. Update AddressAutocomplete

- Use `useGoogleMaps()` hook instead of checking `window.google` directly
- Show loading state while Google Maps loads
- Properly handle the case when API key is not configured

### 3. Update Seed Script

Add realistic Paris coordinates to all seed quotes:

```typescript
const PARIS_LOCATIONS = {
  cdgAirport: { lat: 49.0097, lng: 2.5479 },
  orlyAirport: { lat: 48.7262, lng: 2.3652 },
  tourEiffel: { lat: 48.8584, lng: 2.2945 },
  gareDeLyon: { lat: 48.8443, lng: 2.3739 },
  versailles: { lat: 48.8049, lng: 2.1204 },
  // ... more locations
};
```

### 4. Update Layout

Wrap organization routes with `GoogleMapsProvider`:

```typescript
// apps/web/app/(saas)/app/(organizations)/[organizationSlug]/layout.tsx
import { GoogleMapsProvider } from "@saas/shared/providers/GoogleMapsProvider";

export default function OrganizationLayout({ children }) {
  return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}
```

## Files to Modify

1. **Create**: `apps/web/modules/saas/shared/providers/GoogleMapsProvider.tsx`
2. **Modify**: `apps/web/modules/saas/shared/components/AddressAutocomplete.tsx`
3. **Modify**: `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/layout.tsx`
4. **Modify**: `packages/database/prisma/seed-vtc-complete.ts`
5. **Modify**: `apps/web/modules/saas/shared/components/GoogleMap.tsx` (add places library)
6. **Modify**: `apps/web/modules/saas/dispatch/components/DispatchMapGoogle.tsx` (add places library)

## Testing Checklist

- [ ] Address autocomplete shows suggestions when typing
- [ ] Selecting address fills in coordinates
- [ ] Quote creation saves coordinates to database
- [ ] Dispatch page shows accepted missions
- [ ] Map displays route between pickup and dropoff
- [ ] Pricing calculation works with real coordinates

## Dependencies

- Google Maps JavaScript API key configured in organization settings
- Google Maps API key must have Places API enabled
- Google Maps API key must have Directions API enabled (for routing)

## Notes

- The API key `***` is already configured and tested as "connected"
- CollectAPI for fuel prices is also configured and working
- The backend pricing engine already supports Google Maps routing via `vehicle-selection.ts`
