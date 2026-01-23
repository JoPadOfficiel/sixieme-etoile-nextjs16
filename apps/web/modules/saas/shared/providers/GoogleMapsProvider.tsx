"use client";

/**
 * GoogleMapsProvider
 *
 * Story 10.1: Fix Google Maps Integration for Quotes & Dispatch
 *
 * Central provider that loads Google Maps JavaScript API with all required
 * libraries (places, geometry, marker) and provides loading state to children.
 *
 * This provider should wrap organization-scoped pages to ensure Google Maps
 * is available for address autocomplete, map display, and routing.
 */

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import { useGoogleMapsApiKey } from "../hooks/useGoogleMapsApiKey";

interface GoogleMapsContextValue {
  /** Whether Google Maps API is fully loaded and ready */
  isLoaded: boolean;
  /** Whether the API key is being fetched */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** The API key (for components that need to load maps independently) */
  apiKey: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  isLoading: true,
  error: null,
  apiKey: null,
});

/**
 * Libraries to load with Google Maps
 * - places: For address autocomplete
 * - geometry: For distance calculations
 * - marker: For advanced markers
 * - drawing: For map drawing tools
 */
const GOOGLE_MAPS_LIBRARIES = ["places", "geometry", "marker", "drawing", "routes"];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

/**
 * Check if Google Maps core is loaded (minimum requirement for maps)
 */
function checkGoogleMapsCore(): boolean {
  return !!(typeof window !== "undefined" && window.google?.maps?.Map);
}


export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const { data: apiKey, isLoading: keyLoading, error: keyError } = useGoogleMapsApiKey();
  const [scriptState, setScriptState] = useState<{
    isLoaded: boolean;
    error: string | null;
  }>({
    isLoaded: false,
    error: null,
  });

  // Callback to check and update loaded state (deferred to avoid sync setState)
  const checkAndSetLoaded = useCallback(() => {
    if (checkGoogleMapsCore()) {
      window.setTimeout(() => {
        setScriptState({ isLoaded: true, error: null });
      }, 0);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    // Skip if no API key or still loading
    if (keyLoading) return;
    
    if (!apiKey) {
      // Use setTimeout to avoid synchronous setState in effect
      window.setTimeout(() => {
        setScriptState({ isLoaded: false, error: "Google Maps API key not configured" });
      }, 0);
      return;
    }

    // Already loaded - check synchronously but setState is deferred
    if (checkGoogleMapsCore()) {
      checkAndSetLoaded();
      return;
    }

    // Check if any Google Maps script already exists (with or without our ID)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      // Script exists, wait for it to load or check if already loaded
      const handleLoad = () => {
        // Give it a moment for libraries to initialize
        window.setTimeout(() => {
          if (!checkAndSetLoaded()) {
            setScriptState({ isLoaded: false, error: "Google Maps script loaded but Map class not available" });
          }
        }, 100);
      };

      // Check if already loaded
      if (checkGoogleMapsCore()) {
        checkAndSetLoaded();
        return;
      }

      existingScript.addEventListener("load", handleLoad);
      // Also set up a polling mechanism in case the event was missed
      const pollInterval = setInterval(() => {
        if (checkAndSetLoaded()) {
          clearInterval(pollInterval);
        }
      }, 200);

      return () => {
        existingScript.removeEventListener("load", handleLoad);
        clearInterval(pollInterval);
      };
    }

    // Create and load script with unique ID
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_LIBRARIES.join(",")}&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Give it a moment for libraries to initialize
      window.setTimeout(() => {
        if (!checkAndSetLoaded()) {
          setScriptState({ isLoaded: false, error: "Google Maps loaded but Map class not available" });
        }
      }, 100);
    };

    script.onerror = () => {
      setScriptState({ isLoaded: false, error: "Failed to load Google Maps script" });
    };

    document.head.appendChild(script);

    // Cleanup function - don't remove script as other components may use it
    return () => {
      // Cleanup is minimal since we keep the script loaded
    };
  }, [apiKey, keyLoading, checkAndSetLoaded]);

  // Compute error from multiple sources
  const computedError = useMemo(() => {
    if (keyError) return "Failed to fetch Google Maps API key";
    return scriptState.error;
  }, [keyError, scriptState.error]);

  const contextValue: GoogleMapsContextValue = useMemo(() => ({
    isLoaded: scriptState.isLoaded,
    isLoading: keyLoading && !scriptState.isLoaded,
    error: computedError,
    apiKey: apiKey ?? null,
  }), [scriptState.isLoaded, keyLoading, computedError, apiKey]);

  return (
    <GoogleMapsContext.Provider value={contextValue}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

/**
 * Hook to access Google Maps loading state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isLoaded, isLoading, error } = useGoogleMaps();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!isLoaded) return <Placeholder />;
 *
 *   // Google Maps is ready to use
 *   return <MapComponent />;
 * }
 * ```
 */
export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);

  if (context === undefined) {
    throw new Error("useGoogleMaps must be used within a GoogleMapsProvider");
  }

  return context;
}

export default GoogleMapsProvider;
