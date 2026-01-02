/**
 * Google Routes API Client
 *
 * Client for the new Google Routes API (replaces legacy DirectionsService)
 * Uses the Routes Preferred API for better routing capabilities.
 *
 * Documentation: https://developers.google.com/maps/documentation/routes
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Google Routes API base URL
 */
export const GOOGLE_ROUTES_API_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT_MS = 10000;

// ============================================================================
// Types
// ============================================================================

export interface RoutesWaypoint {
  location: {
    latLng?: {
      latitude: number;
      longitude: number;
    };
    address?: string;
  };
}

export interface RoutesRequest {
  origin: RoutesWaypoint;
  destination: RoutesWaypoint;
  intermediates?: RoutesWaypoint[];
  travelMode: "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";
  routingPreference?: "TRAFFIC_AWARE" | "TRAFFIC_UNAWARE";
  computeAlternativeRoutes?: boolean;
  routeModifiers?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
  };
  languageCode?: string;
  units?: "METRIC" | "IMPERIAL";
}

export interface RoutesLeg {
  distance: {
    meters: number;
    text: string;
  };
  duration: {
    seconds: number;
    text: string;
  };
  steps: RoutesStep[];
  startLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  endLocation: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface RoutesStep {
  distance?: {
    meters: number;
    text: string;
  };
  duration?: {
    seconds: number;
    text: string;
  };
  startLocation?: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  endLocation?: {
    latLng: {
      latitude: number;
      longitude: number;
    };
  };
  polyline?: {
    encodedPolyline: string;
  };
}

export interface RoutesRoute {
  distanceMeters: number;
  duration: string;
  staticDuration: string;
  polyline: {
    encodedPolyline: string;
  };
  description: string;
  legs: RoutesLeg[];
}

export interface RoutesResponse {
  routes: RoutesRoute[];
  fallbackInfo?: {
    reason: string;
  };
}

export interface RoutesErrorResponse {
  code?: number;
  message: string;
  status?: number;
  details?: any;
}

// ============================================================================
// Error Classes
// ============================================================================

export class RoutesError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "RoutesError";
  }
}

export class InvalidApiKeyError extends RoutesError {
  constructor(message = "Invalid Google Maps API key") {
    super(message, 401);
    this.name = "InvalidApiKeyError";
  }
}

export class QuotaExceededError extends RoutesError {
  constructor(message = "Google Routes API quota exceeded") {
    super(message, 429);
    this.name = "QuotaExceededError";
  }
}

export class TimeoutError extends RoutesError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert legacy coordinates to Routes API format
 */
export function toRoutesWaypoint(lat: number, lng: number, address?: string): RoutesWaypoint {
  return {
    location: {
      latLng: { latitude: lat, longitude: lng },
      ...(address && { address }),
    },
  };
}

/**
 * Convert Routes API response to legacy format for compatibility
 */
export function convertToLegacyFormat(response: RoutesResponse) {
  if (!response.routes || response.routes.length === 0) {
    return null;
  }

  const route = response.routes[0];
  
  // Convert polyline to path points
  const path = decodePolyline(route.polyline.encodedPolyline);
  
  return {
    routes: [{
      legs: route.legs.map(leg => ({
        distance: { text: leg.distance.text, value: leg.distance.meters },
        duration: { text: leg.duration.text, value: leg.duration.seconds },
        steps: leg.steps.map(step => ({
          path: step.startLocation && step.endLocation ? [
            { lat: step.startLocation.latLng.latitude, lng: step.startLocation.latLng.longitude },
            { lat: step.endLocation.latLng.latitude, lng: step.endLocation.latLng.longitude }
          ] : [],
          distance: step.distance ? { text: step.distance.text, value: step.distance.meters } : undefined,
          duration: step.duration ? { text: step.duration.text, value: step.duration.seconds } : undefined,
        })),
        start_location: leg.startLocation,
        end_location: leg.endLocation,
      })),
      overview_path: path,
      bounds: calculateBounds(path),
      warnings: [],
    }],
    status: "OK",
  };
}

/**
 * Decode Google polyline format
 */
function decodePolyline(encoded: string): Array<{lat: number; lng: number}> {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Calculate bounds from path points
 */
function calculateBounds(path: Array<{lat: number; lng: number}>) {
  if (path.length === 0) return null;

  let minLat = path[0].lat;
  let maxLat = path[0].lat;
  let minLng = path[0].lng;
  let maxLng = path[0].lng;

  for (const point of path) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
  };
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Compute routes using Google Routes API
 *
 * @param apiKey - The Google Maps API key
 * @param request - The routes request
 * @returns Promise<RoutesResponse> with routing results
 */
export async function computeRoutes(
  apiKey: string,
  request: RoutesRequest,
): Promise<RoutesResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(GOOGLE_ROUTES_API_URL);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline,routes.description,routes.legs",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData: RoutesErrorResponse = await response.json().catch(() => ({}));
      
      if (response.status === 401 || response.status === 403) {
        throw new InvalidApiKeyError(errorData.message || "Invalid API key");
      }
      if (response.status === 429) {
        throw new QuotaExceededError(errorData.message || "API quota exceeded");
      }
      
      throw new RoutesError(
        `HTTP error: ${response.status} ${response.statusText}`,
        response.status,
        errorData,
      );
    }

    const data: RoutesResponse = await response.json();
    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new TimeoutError("Request timed out");
    }

    if (error instanceof RoutesError) {
      throw error;
    }

    throw new RoutesError(
      "Failed to compute routes",
      undefined,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

/**
 * Compute routes with fallback to simple polyline
 *
 * @param apiKey - The Google Maps API key
 * @param request - The routes request
 * @returns Promise with routes or fallback polyline
 */
export async function computeRoutesWithFallback(
  apiKey: string,
  request: RoutesRequest,
): Promise<{ success: boolean; data?: any; fallback?: boolean }> {
  try {
    const response = await computeRoutes(apiKey, request);
    return { success: true, data: convertToLegacyFormat(response), fallback: false };
  } catch (error) {
    console.warn("[RoutesAPI] Failed to compute routes, using fallback:", error);
    
    // Create simple fallback polyline
    const path = [
      request.origin.location.latLng || { latitude: 48.8566, longitude: 2.3522 },
      ...(request.intermediates?.map(i => i.location.latLng || { latitude: 48.8566, longitude: 2.3522 }) || []),
      request.destination.location.latLng || { latitude: 48.8566, longitude: 2.3522 },
    ].map(p => ({ lat: p.latitude, lng: p.longitude }));

    return {
      success: false,
      fallback: true,
      data: {
        routes: [{
          legs: [{
            distance: { text: "Estimation", value: 0 },
            duration: { text: "Estimation", value: 0 },
            steps: [],
            start_location: path[0],
            end_location: path[path.length - 1],
          }],
          overview_path: path,
          bounds: calculateBounds(path),
          warnings: [],
        }],
        status: "OK",
      },
    };
  }
}
