"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, MapIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { useGoogleMaps } from "@saas/shared/providers/GoogleMapsProvider";
import { useTranslations } from "next-intl";

const MAP_HEIGHT = "h-[300px]";

interface RoutePreviewMapProps {
  pickup?: { lat: number; lng: number; address: string };
  dropoff?: { lat: number; lng: number; address: string };
  /** Story 19.7: Support for excursion waypoints */
  waypoints?: Array<{ lat: number; lng: number; address: string }>;
  className?: string;
}

const COLORS = {
  pickup: "#22c55e", // green-500
  dropoff: "#ef4444", // red-500
  waypoint: "#f97316", // orange-500
  route: "#3b82f6", // blue-500
};

/**
 * RoutePreviewMap Component
 * 
 * Displays a Google Map with pickup/dropoff markers and route trace.
 * 
 * Story 10.1: Route visualization for quotes
 * Story 19.7: Fix route trace display with proper cleanup and waypoint support
 */
export function RoutePreviewMap({ pickup, dropoff, waypoints, className }: RoutePreviewMapProps) {
  const t = useTranslations("quotes.create.tripTransparency.routeMap");
  const { isLoaded: isMapReady, error: mapError } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [mapContainerReady, setMapContainerReady] = useState(false);
  // Story 19.7: Track if we're using fallback polyline
  const isUsingFallbackRef = useRef(false);
  // Story 19.7: Track request ID to prevent race conditions
  const requestIdRef = useRef(0);
  // Story 19.7: Track timeout ID for cleanup
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Callback ref for container
  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapContainerRef.current = node;
      setMapContainerReady(true);
    } else {
      // Story 19.7: Complete cleanup on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      mapInstanceRef.current = null;
      mapContainerRef.current = null;
      setMapContainerReady(false);
    }
  }, []);

  // Story 19.7: Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup all Google Maps resources on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapReady || !mapContainerReady || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 48.8566, lng: 2.3522 }, // Paris default
        zoom: 10,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
    } catch (error) {
      console.error("[RoutePreviewMap] Error creating map:", error);
    }
  }, [isMapReady, mapContainerReady]);

  // Update markers and route when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    // Story 19.7: Increment request ID to track current request
    const currentRequestId = ++requestIdRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    
    // Story 19.7: Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    
    // Story 19.7: Clear previous DirectionsRenderer result (not the renderer itself)
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
    
    // Reset fallback state
    isUsingFallbackRef.current = false;

    if (!pickup && !dropoff) return;

    const bounds = new google.maps.LatLngBounds();

    // Add pickup marker
    if (pickup) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: pickup.lat, lng: pickup.lng },
        title: pickup.address,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: COLORS.pickup,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 100,
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
    }

    // Story 19.7: Add waypoint markers for excursions
    if (waypoints && waypoints.length > 0) {
      waypoints.forEach((wp, index) => {
        const marker = new google.maps.Marker({
          map,
          position: { lat: wp.lat, lng: wp.lng },
          title: wp.address,
          label: {
            text: String(index + 1),
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "bold",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: COLORS.waypoint,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          zIndex: 90,
        });
        markersRef.current.push(marker);
        bounds.extend({ lat: wp.lat, lng: wp.lng });
      });
    }

    // Add dropoff marker
    if (dropoff) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: dropoff.lat, lng: dropoff.lng },
        title: dropoff.address,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: COLORS.dropoff,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 100,
      });
      markersRef.current.push(marker);
      bounds.extend({ lat: dropoff.lat, lng: dropoff.lng });
    }

    // Fit bounds first for immediate visual feedback
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 40);
    }

    // Use Directions API for real route rendering
    if (pickup && dropoff) {
      // Initialize DirectionsRenderer if needed
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map,
          suppressMarkers: true, // We use our own markers
          polylineOptions: {
            strokeColor: COLORS.route,
            strokeOpacity: 1,
            strokeWeight: 4,
            zIndex: 50,
          },
        });
      } else {
        directionsRendererRef.current.setMap(map);
      }

      const directionsService = new google.maps.DirectionsService();
      
      // Story 19.7: Build waypoints for Directions API
      const directionsWaypoints = waypoints?.map(wp => ({
        location: { lat: wp.lat, lng: wp.lng },
        stopover: true,
      })) ?? [];

      // Check for legacy API issues by monitoring console errors
      const originalError = console.error;
      console.error = (...args) => {
        const message = args.join(' ');
        if (message.includes('Directions Service') && message.includes('legacy API')) {
          // Legacy API error detected, use fallback immediately
          if (currentRequestId === requestIdRef.current && !isUsingFallbackRef.current) {
            console.warn("[RoutePreviewMap] Legacy API detected, using fallback polyline immediately");
            isUsingFallbackRef.current = true;
            
            // Build path including waypoints
            const path = [
              { lat: pickup.lat, lng: pickup.lng },
              ...(waypoints?.map(wp => ({ lat: wp.lat, lng: wp.lng })) ?? []),
              { lat: dropoff.lat, lng: dropoff.lng },
            ];
            
            const polyline = new google.maps.Polyline({
              map,
              path,
              strokeColor: COLORS.route,
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
              zIndex: 50,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: COLORS.route,
                },
                offset: "50%",
              }],
            });
            polylineRef.current = polyline;
          }
        }
        originalError.apply(console, args);
      };

      // Add timeout to prevent hanging requests
      timeoutIdRef.current = setTimeout(() => {
        // Check if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          console.warn("[RoutePreviewMap] Directions request timed out, using fallback polyline");
          isUsingFallbackRef.current = true;
          
          // Build path including waypoints
          const path = [
            { lat: pickup.lat, lng: pickup.lng },
            ...(waypoints?.map(wp => ({ lat: wp.lat, lng: wp.lng })) ?? []),
            { lat: dropoff.lat, lng: dropoff.lng },
          ];
          
          const polyline = new google.maps.Polyline({
            map,
            path,
            strokeColor: COLORS.route,
            strokeOpacity: 0.7,
            strokeWeight: 3,
            geodesic: true,
            zIndex: 50,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: COLORS.route,
              },
              offset: "50%",
            }],
          });
          polylineRef.current = polyline;
          
          // Restore console.error
          console.error = originalError;
        }
      }, 3000); // Reduced timeout to 3 seconds for faster fallback

      directionsService.route(
        {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: dropoff.lat, lng: dropoff.lng },
          waypoints: directionsWaypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          // Restore console.error
          console.error = originalError;
          
          // Clear timeout since we got a response
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }
          
          // Story 19.7: Check if this is still the current request (prevent race conditions)
          if (currentRequestId !== requestIdRef.current) {
            return;
          }
          
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
            isUsingFallbackRef.current = false;
          } else {
            // Fallback to simple polyline if directions fail
            console.warn("[RoutePreviewMap] Directions request failed, using fallback polyline:", status);
            isUsingFallbackRef.current = true;
            
            // Build path including waypoints
            const path = [
              { lat: pickup.lat, lng: pickup.lng },
              ...(waypoints?.map(wp => ({ lat: wp.lat, lng: wp.lng })) ?? []),
              { lat: dropoff.lat, lng: dropoff.lng },
            ];
            
            const polyline = new google.maps.Polyline({
              map,
              path,
              strokeColor: COLORS.route,
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
              zIndex: 50,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: COLORS.route,
                },
                offset: "50%",
              }],
            });
            polylineRef.current = polyline;
          }
        }
      );
    }
  }, [pickup, dropoff, waypoints, isMapReady]);

  // No coordinates
  if (!pickup && !dropoff) {
    return (
      <div className={cn(MAP_HEIGHT, "bg-muted/50 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <MapIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("noCoordinates")}</p>
        </div>
      </div>
    );
  }

  // Loading
  if (!isMapReady) {
    return (
      <div className={cn(MAP_HEIGHT, "bg-muted/50 rounded-lg flex items-center justify-center", className)}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error
  if (mapError) {
    return (
      <div className={cn(MAP_HEIGHT, "bg-muted/50 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <MapIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("loadError")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div ref={mapRef} className={cn(MAP_HEIGHT, "w-full rounded-lg overflow-hidden")} />
      {/* Story 19.7: Translated legend */}
      <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded text-xs flex gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pickup }} />
          {t("pickup")}
        </span>
        {waypoints && waypoints.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.waypoint }} />
            {t("waypoint")} ({waypoints.length})
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.dropoff }} />
          {t("dropoff")}
        </span>
      </div>
    </div>
  );
}

export default RoutePreviewMap;
