/**
 * Hook to fetch Google Maps API key from organization settings
 *
 * @see Story 1.5: Integration Settings Storage
 */

import { useQuery } from "@tanstack/react-query";

interface GoogleMapsKeyResponse {
	key: string;
}

/**
 * Fetches the Google Maps API key for the current organization
 * Returns null if not configured
 */
export function useGoogleMapsApiKey() {
	return useQuery({
		queryKey: ["google-maps-api-key"],
		queryFn: async (): Promise<string | null> => {
			try {
				const response = await fetch("/api/vtc/settings/integrations/google-maps-key");
				if (!response.ok) {
					if (response.status === 404) {
						return null; // Key not configured
					}
					throw new Error("Failed to fetch Google Maps API key");
				}
				const data: GoogleMapsKeyResponse = await response.json();
				return data.key;
			} catch {
				return null;
			}
		},
		staleTime: 1000 * 60 * 60, // Cache for 1 hour
		retry: false,
	});
}
