"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, MapIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { useGoogleMaps } from "@saas/shared/providers/GoogleMapsProvider";
import { useTranslations } from "next-intl";
import { computeRoutesWithFallback, toRoutesWaypoint, type RoutesRequest } from "../../../../lib/google-routes-client";

// Types for Routes API response
interface RoutesApiResponse {
  success: boolean;
  data?: {
    routes: Array<{
      overview_path?: Array<{ lat: number; lng: number }>;
    }>;
  };
  fallback?: boolean;
}

interface RoutesApiError {
  message?: string;
  code?: number;
}

const MAP_HEIGHT = "h-[300px]";

interface ModernRouteMapProps {
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
 * ModernRouteMap Component
 * 
 * Uses the new Google Routes API instead of legacy DirectionsService
 * Provides better performance and reliability.
 * 
 * Story 19.7: Modern map component with Routes API integration
 * Story 20.7: Fix route display - always show polyline (API or fallback)
 */
export function ModernRouteMap({ pickup, dropoff, waypoints, className }: ModernRouteMapProps) {
  const t = useTranslations("quotes.create.tripTransparency.routeMap");
  const { isLoaded: isMapReady, error: mapError, apiKey } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapContainerReady, setMapContainerReady] = useState(false);
  const requestIdRef = useRef(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Callback ref for container
  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapContainerRef.current = node;
      setMapContainerReady(true);
    } else {
      // Complete cleanup on unmount
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      mapInstanceRef.current = null;
      mapContainerRef.current = null;
      setMapContainerReady(false);
    }
  }, []);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, []);

  // Story 20.7: Helper function to create fallback polyline
  // Defined before useEffect to avoid "accessed before declaration" error
  const createFallbackPolyline = useCallback((
    map: google.maps.Map,
    pickupPoint: { lat: number; lng: number },
    dropoffPoint: { lat: number; lng: number },
    waypointsList?: Array<{ lat: number; lng: number }>
  ) => {
    // Clear any existing polyline first
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    
    const path = [
      { lat: pickupPoint.lat, lng: pickupPoint.lng },
      ...(waypointsList?.map(wp => ({ lat: wp.lat, lng: wp.lng })) ?? []),
      { lat: dropoffPoint.lat, lng: dropoffPoint.lng },
    ];
    
    const polyline = new google.maps.Polyline({
      map,
      path,
      strokeColor: COLORS.route,
      strokeOpacity: 0,  // Hide the main line
      strokeWeight: 3,
      geodesic: true,
      zIndex: 50,
      icons: [
        {
          // Dashed line effect for fallback indication
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: 0.7,
            strokeColor: COLORS.route,
            scale: 3,
          },
          offset: "0",
          repeat: "15px",
        },
        {
          // Arrow at 50%
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: COLORS.route,
            fillColor: COLORS.route,
            fillOpacity: 1,
          },
          offset: "50%",
        },
      ],
    });
    polylineRef.current = polyline;
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
      console.error("[ModernRouteMap] Error creating map:", error);
    }
  }, [isMapReady, mapContainerReady]);

  // Update markers and route when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    const currentRequestId = ++requestIdRef.current;
    
    // Story 20.7: Log debug info for troubleshooting
    console.log("[ModernRouteMap] Updating route", { 
      hasApiKey: !!apiKey, 
      hasPickup: !!pickup, 
      hasDropoff: !!dropoff,
      waypointsCount: waypoints?.length ?? 0 
    });

    // Clear existing markers and polyline
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

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

    // Add waypoint markers for excursions
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

    // Use Routes API for route rendering
    if (pickup && dropoff) {
      // Story 20.7: Always create immediate fallback polyline for instant visual feedback
      createFallbackPolyline(map, pickup, dropoff, waypoints);
      console.log("[ModernRouteMap] Fallback polyline created for immediate display");
      
      // Story 20.7: Only attempt Routes API if we have an API key
      if (!apiKey) {
        console.warn("[ModernRouteMap] No API key available, keeping fallback polyline");
        return;
      }
      
      const routesRequest: RoutesRequest = {
        origin: toRoutesWaypoint(pickup.lat, pickup.lng, pickup.address),
        destination: toRoutesWaypoint(dropoff.lat, dropoff.lng, dropoff.address),
        intermediates: waypoints?.map(wp => toRoutesWaypoint(wp.lat, wp.lng, wp.address)),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        languageCode: "fr",
        units: "METRIC",
      };

      // Add timeout to prevent hanging requests
      timeoutIdRef.current = setTimeout(() => {
        if (currentRequestId === requestIdRef.current) {
          console.warn("[ModernRouteMap] Routes request timed out, keeping fallback polyline");
        }
      }, 5000); // 5 second timeout (increased from 3s)

      computeRoutesWithFallback(apiKey, routesRequest)
        .then((result: RoutesApiResponse) => {
          if (currentRequestId !== requestIdRef.current) return;
          
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
            timeoutIdRef.current = null;
          }

          if (result.success && result.data) {
            // Use Routes API result - replace fallback with real route
            const route = result.data.routes[0];
            if (route && route.overview_path && route.overview_path.length > 0) {
              // Clear fallback polyline
              if (polylineRef.current) {
                polylineRef.current.setMap(null);
              }
              
              const polyline = new google.maps.Polyline({
                map,
                path: route.overview_path,
                strokeColor: COLORS.route,
                strokeOpacity: 1,
                strokeWeight: 4,
                geodesic: true,
                zIndex: 50,
              });
              polylineRef.current = polyline;
              
              // Story 20.7: Fit bounds to the actual route
              const routeBounds = new google.maps.LatLngBounds();
              route.overview_path.forEach((point: { lat: number; lng: number }) => {
                routeBounds.extend(point);
              });
              map.fitBounds(routeBounds, 40);
              
              console.log("[ModernRouteMap] Routes API successful - route displayed with", route.overview_path.length, "points");
            } else {
              console.warn("[ModernRouteMap] Routes API returned empty path, keeping fallback");
            }
          } else {
            // Keep fallback polyline (already displayed)
            console.warn("[ModernRouteMap] Routes API failed, keeping fallback polyline");
          }
        })
        .catch((error: RoutesApiError) => {
          console.error("[ModernRouteMap] Routes API error:", error);
          // Keep fallback polyline (already displayed)
        });
    }

  }, [pickup, dropoff, waypoints, isMapReady, apiKey, createFallbackPolyline]);

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
      {/* Translated legend */}
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

export default ModernRouteMap;
