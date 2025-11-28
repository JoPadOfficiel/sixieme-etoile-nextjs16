"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Loader2, MapIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { useGoogleMaps } from "@saas/shared/providers/GoogleMapsProvider";

const MAP_HEIGHT = "h-[300px]"; // Increased from 200px for better visibility

interface RoutePreviewMapProps {
  pickup?: { lat: number; lng: number; address: string };
  dropoff?: { lat: number; lng: number; address: string };
  className?: string;
}

const COLORS = {
  pickup: "#22c55e", // green-500
  dropoff: "#ef4444", // red-500
  route: "#3b82f6", // blue-500
};

/**
 * RoutePreviewMap Component
 * 
 * Displays a simple Google Map with pickup and dropoff markers
 * and a polyline route between them.
 * 
 * Story 10.1: Route visualization for quotes
 */
export function RoutePreviewMap({ pickup, dropoff, className }: RoutePreviewMapProps) {
  const { isLoaded: isMapReady, error: mapError } = useGoogleMaps();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [mapContainerReady, setMapContainerReady] = useState(false);

  // Callback ref for container
  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapContainerRef.current = node;
      setMapContainerReady(true);
    } else {
      // Cleanup
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
      directionsService.route(
        {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: dropoff.lat, lng: dropoff.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result);
          } else {
            // Fallback to simple polyline if directions fail
            console.warn("[RoutePreviewMap] Directions request failed, using fallback polyline");
            const polyline = new google.maps.Polyline({
              map,
              path: [
                { lat: pickup.lat, lng: pickup.lng },
                { lat: dropoff.lat, lng: dropoff.lng },
              ],
              strokeColor: COLORS.route,
              strokeOpacity: 0.7,
              strokeWeight: 3,
              geodesic: true,
              zIndex: 50,
            });
            polylineRef.current = polyline;
          }
        }
      );
    }
  }, [pickup, dropoff, isMapReady]);

  // No coordinates
  if (!pickup && !dropoff) {
    return (
      <div className={cn(MAP_HEIGHT, "bg-muted/50 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <MapIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No route coordinates available</p>
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
          <p className="text-sm">Unable to load map</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div ref={mapRef} className={cn(MAP_HEIGHT, "w-full rounded-lg overflow-hidden")} />
      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 rounded text-xs flex gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.pickup }} />
          Pickup
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.dropoff }} />
          Dropoff
        </span>
      </div>
    </div>
  );
}

export default RoutePreviewMap;
