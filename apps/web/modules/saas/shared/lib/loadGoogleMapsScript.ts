"use client";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js";
const GOOGLE_MAPS_LIBS = ["places", "geometry", "drawing", "marker"];

declare global {
	interface Window {
		__googleMapsScriptPromise?: Promise<void>;
	}
}

export async function loadGoogleMapsScript(apiKey?: string | null) {
	if (typeof window === "undefined") {
		throw new Error("Google Maps can only be loaded in the browser");
	}

	if (window.google?.maps?.Map) {
		return;
	}

	if (!apiKey) {
		throw new Error("Google Maps API key is missing");
	}

	if (window.__googleMapsScriptPromise) {
		return window.__googleMapsScriptPromise;
	}

	window.__googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
		const existingScript = document.getElementById(
			GOOGLE_MAPS_SCRIPT_ID,
		) as HTMLScriptElement | null;

		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(), { once: true });
			existingScript.addEventListener(
				"error",
				() => reject(new Error("Failed to load Google Maps script")),
				{ once: true },
			);
			return;
		}

		const script = document.createElement("script");
		script.id = GOOGLE_MAPS_SCRIPT_ID;
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_MAPS_LIBS.join(",")}&loading=async`;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Failed to load Google Maps script"));
		document.head.appendChild(script);
	}).catch((error) => {
		delete window.__googleMapsScriptPromise;
		throw error;
	});

	return window.__googleMapsScriptPromise;
}
