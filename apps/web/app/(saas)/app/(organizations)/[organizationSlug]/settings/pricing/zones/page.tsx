"use client";

/**
 * Settings → Pricing → Zones Page
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Refactored to use the new two-panel layout with interactive map
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Lazy load the component to avoid SSR issues with Google Maps
const ZoneManagementLayout = dynamic(
() =>
		import("@saas/pricing/components/ZoneManagementLayout").then(
(mod) => mod.ZoneManagementLayout
		),
	{ ssr: false, loading: () => <div className="p-8">Loading zones...</div> }
);

export default function SettingsPricingZonesPage() {
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

	useEffect(() => {
		const fetchApiKey = async () => {
			try {
				const response = await fetch(
"/api/vtc/settings/integrations/google-maps-key"
);
				if (response.ok) {
					const data = await response.json();
					setGoogleMapsApiKey(data.key);
				}
			} catch {
				// Silently fail - map will show "no API key" message
			}
		};
		fetchApiKey();
	}, []);

	return <ZoneManagementLayout googleMapsApiKey={googleMapsApiKey} />;
}
