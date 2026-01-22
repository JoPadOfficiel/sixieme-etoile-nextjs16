"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Loader2, MapIcon, EyeIcon } from "lucide-react";
import { cn } from "@ui/lib";
import { Button } from "@ui/components/button";
import { useGoogleMaps } from "@saas/shared/providers/GoogleMapsProvider";
import { useTranslations } from "next-intl";
import { useQuoteLineSelection } from "../contexts/QuoteLineSelectionContext";
import type { Quote } from "../types";

/**
 * Story 29.2: MultiMissionMap Component
 * 
 * Displays multiple missions on a single Google Map.
 * Each mission shows pickup (green) and dropoff (red) markers.
 * Supports interactive selection via QuoteLineSelectionContext.
 */

const MAP_HEIGHT = "h-[400px]";

const COLORS = {
  pickup: "#22c55e", // green-500
  dropoff: "#ef4444", // red-500
  route: "#3b82f6", // blue-500
  selectedPickup: "#16a34a", // green-600 (darker for selected)
  selectedDropoff: "#dc2626", // red-600 (darker for selected)
};

interface SourceData {
  origin?: string;
  destination?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  encodedPolyline?: string;
}

interface MultiMissionMapProps {
  lines: Quote["lines"];
  className?: string;
}

interface MissionMarker {
  lineId: string;
  lineIndex: number;
  type: "pickup" | "dropoff";
  position: { lat: number; lng: number };
  label: string;
  title: string;
}

export function MultiMissionMap({ lines, className }: MultiMissionMapProps) {
  const t = useTranslations("quotes.detail.map");
  const { isLoaded: isMapReady, error: googleMapsError } = useGoogleMaps();
  const { selectedLineId, setSelectedLineId } = useQuoteLineSelection();
  
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [mapContainerReady, setMapContainerReady] = useState(false);
  const [mapError, setMapError] = useState<Error | null>(null);

  // Extract valid lines with coordinates - memoized to prevent re-renders
  const validLines = useMemo(() => {
    return lines?.filter(line => {
      const sourceData = line.sourceData as SourceData | undefined;
      return sourceData?.pickupLatitude && sourceData?.pickupLongitude &&
             sourceData?.dropoffLatitude && sourceData?.dropoffLongitude;
    }) || [];
  }, [lines]);

  // Extract markers from valid lines - memoized
  const missionMarkers = useMemo<MissionMarker[]>(() => {
    const markers: MissionMarker[] = [];
    
    validLines.forEach((line, index) => {
      const sourceData = line.sourceData as SourceData;
      const lineIndex = index + 1;
      
      markers.push({
        lineId: line.id,
        lineIndex,
        type: "pickup",
        position: { lat: sourceData.pickupLatitude!, lng: sourceData.pickupLongitude! },
        label: `${lineIndex}A`,
        title: sourceData.origin || `Mission ${lineIndex} - Pickup`,
      });
      
      markers.push({
        lineId: line.id,
        lineIndex,
        type: "dropoff",
        position: { lat: sourceData.dropoffLatitude!, lng: sourceData.dropoffLongitude! },
        label: `${lineIndex}B`,
        title: sourceData.destination || `Mission ${lineIndex} - Dropoff`,
      });
    });
    
    return markers;
  }, [validLines]);

  // Error state effect
  useEffect(() => {
    if (googleMapsError) {
      console.error("[MultiMissionMap] Google Maps API error:", googleMapsError);
      setMapError(new Error(googleMapsError));
    }
  }, [googleMapsError]);

  // Callback ref for container
  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      mapContainerRef.current = node;
      setMapContainerReady(true);
      setMapError(null);
      
      if (mapInstanceRef.current) {
        setTimeout(() => {
          if (mapInstanceRef.current) {
            google.maps.event.trigger(mapInstanceRef.current, 'resize');
          }
        }, 100);
      }
    } else {
      // Cleanup on unmount
      markersRef.current.forEach((m) => {
        try { m.setMap(null); } catch { /* ignore */ }
      });
      markersRef.current = [];
      
      polylinesRef.current.forEach((p) => {
        try { p.setMap(null); } catch { /* ignore */ }
      });
      polylinesRef.current = [];
      
      mapInstanceRef.current = null;
      mapContainerRef.current = null;
      setMapContainerReady(false);
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => {
        try { m.setMap(null); } catch { /* ignore */ }
      });
      markersRef.current = [];
      
      polylinesRef.current.forEach((p) => {
        try { p.setMap(null); } catch { /* ignore */ }
      });
      polylinesRef.current = [];
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
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
        gestureHandling: 'auto',
        clickableIcons: false,
      });
      
      google.maps.event.trigger(map, 'resize');
      mapInstanceRef.current = map;
      console.log("[MultiMissionMap] Map initialized");
    } catch (error) {
      console.error("[MultiMissionMap] Error creating map:", error);
      setTimeout(() => setMapError(error as Error), 0);
    }
  }, [isMapReady, mapContainerReady]);

  // Fit all markers in bounds
  const fitAllMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || missionMarkers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    missionMarkers.forEach(marker => {
      bounds.extend(marker.position);
    });

    setTimeout(() => {
      if (map) {
        map.fitBounds(bounds, 50);
      }
    }, 100);
  }, [missionMarkers]);

  // Fit selected line in bounds
  const fitSelectedLine = useCallback((lineId: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lineMarkers = missionMarkers.filter(m => m.lineId === lineId);
    if (lineMarkers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    lineMarkers.forEach(marker => {
      bounds.extend(marker.position);
    });

    setTimeout(() => {
      if (map) {
        map.fitBounds(bounds, 100);
      }
    }, 100);
  }, [missionMarkers]);

  // Update markers when lines or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach((m) => {
      try { m.setMap(null); } catch { /* ignore */ }
    });
    markersRef.current = [];

    // Clear existing polylines
    polylinesRef.current.forEach((p) => {
      try { p.setMap(null); } catch { /* ignore */ }
    });
    polylinesRef.current = [];

    if (missionMarkers.length === 0) return;

    // Create markers for each mission
    missionMarkers.forEach((markerData) => {
      const isSelected = selectedLineId === markerData.lineId;
      const isOtherSelected = selectedLineId !== null && selectedLineId !== markerData.lineId;
      
      const baseColor = markerData.type === "pickup" 
        ? (isSelected ? COLORS.selectedPickup : COLORS.pickup)
        : (isSelected ? COLORS.selectedDropoff : COLORS.dropoff);
      
      const opacity = isOtherSelected ? 0.4 : 1;
      const scale = isSelected ? 14 : 10;
      const zIndex = isSelected ? 200 : 100;

      const marker = new google.maps.Marker({
        map,
        position: markerData.position,
        title: markerData.title,
        label: {
          text: markerData.label,
          color: "#ffffff",
          fontSize: isSelected ? "12px" : "10px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale,
          fillColor: baseColor,
          fillOpacity: opacity,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex,
        opacity,
      });

      // Click handler to select/deselect line
      marker.addListener("click", () => {
        if (selectedLineId === markerData.lineId) {
          setSelectedLineId(null);
        } else {
          setSelectedLineId(markerData.lineId);
        }
      });

      markersRef.current.push(marker);
    });

    // Create polylines connecting pickup to dropoff for each mission ONLY if encodedPolyline exists
    validLines.forEach((line) => {
      const sourceData = line.sourceData as SourceData;
      const isSelected = selectedLineId === line.id;
      const isOtherSelected = selectedLineId !== null && selectedLineId !== line.id;
      
      // Only draw polyline if encodedPolyline exists in sourceData
      if (!sourceData?.encodedPolyline) {
        return;
      }

      const path = [
        { lat: sourceData.pickupLatitude!, lng: sourceData.pickupLongitude! },
        { lat: sourceData.dropoffLatitude!, lng: sourceData.dropoffLongitude! },
      ];

      const polyline = new google.maps.Polyline({
        map,
        path,
        strokeColor: COLORS.route,
        strokeOpacity: isOtherSelected ? 0.2 : (isSelected ? 1 : 0.6),
        strokeWeight: isSelected ? 4 : 2,
        geodesic: true,
        zIndex: isSelected ? 60 : 50,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: isSelected ? 4 : 3,
              strokeColor: COLORS.route,
              fillColor: COLORS.route,
              fillOpacity: isOtherSelected ? 0.2 : 1,
            },
            offset: "50%",
          },
        ],
      });

      polylinesRef.current.push(polyline);
    });

    // Fit bounds based on selection
    if (selectedLineId) {
      fitSelectedLine(selectedLineId);
    } else {
      fitAllMarkers();
    }
  }, [missionMarkers, selectedLineId, isMapReady, fitAllMarkers, fitSelectedLine, setSelectedLineId, validLines]);

  // Handle view all button
  const handleViewAll = () => {
    setSelectedLineId(null);
  };

  // Handle click outside map (click on map background)
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    // Check if click is on map background (not on markers or polylines)
    if (event.domEvent) {
      setSelectedLineId(null);
    }
  }, [setSelectedLineId]);

  // Add click handler to map container
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    google.maps.event.addListener(map, 'click', handleMapClick);
  }, [handleMapClick]);

  // No valid lines with coordinates
  if (validLines.length === 0) {
    return (
      <div className={cn(MAP_HEIGHT, "bg-muted/50 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground">
          <MapIcon className="size-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("noMissions")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("noCoordinatesHint")}
          </p>
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
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-background/90 px-3 py-2 rounded-lg text-xs flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pickup }} />
            {t("pickup")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.dropoff }} />
            {t("dropoff")}
          </span>
        </div>
        <div className="text-muted-foreground">
          {t("missionsCount", { count: validLines.length })}
        </div>
      </div>

      {/* View All button when a line is selected */}
      {selectedLineId && (
        <div className="absolute top-2 right-2">
          <Button variant="secondary" size="sm" onClick={handleViewAll}>
            <EyeIcon className="size-4 mr-1" />
            {t("viewAll")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MultiMissionMap;
