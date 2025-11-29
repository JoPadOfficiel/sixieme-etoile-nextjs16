"use client";

/**
 * Shared Google Maps loader hook
 * Ensures Google Maps API is loaded only once across all components
 */

import { useEffect, useState } from "react";

// Global state to track loading
let isLoading = false;
let isLoaded = false;
const loadCallbacks: (() => void)[] = [];

export function useGoogleMaps(apiKey: string | null): boolean {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!apiKey) return;

		// Already loaded
		if (isLoaded || window.google?.maps?.drawing) {
			setIsReady(true);
			return;
		}

		// Add callback for when loading completes
		const callback = () => setIsReady(true);
		loadCallbacks.push(callback);

		// Already loading, wait for it
		if (isLoading) {
			return () => {
				const index = loadCallbacks.indexOf(callback);
				if (index > -1) loadCallbacks.splice(index, 1);
			};
		}

		// Check if script already exists
		const existingScript = document.querySelector(
			'script[src*="maps.googleapis.com"]'
		);
		if (existingScript) {
			// Script exists, wait for it to load
			isLoading = true;
			const checkLoaded = setInterval(() => {
				if (window.google?.maps?.drawing) {
					clearInterval(checkLoaded);
					isLoaded = true;
					isLoading = false;
					loadCallbacks.forEach((cb) => cb());
					loadCallbacks.length = 0;
				}
			}, 100);
			return () => {
				const index = loadCallbacks.indexOf(callback);
				if (index > -1) loadCallbacks.splice(index, 1);
			};
		}

		// Load the script
		isLoading = true;
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,drawing`;
		script.async = true;
		script.defer = true;
		script.onload = () => {
			isLoaded = true;
			isLoading = false;
			loadCallbacks.forEach((cb) => cb());
			loadCallbacks.length = 0;
		};
		script.onerror = () => {
			isLoading = false;
			console.error("Failed to load Google Maps API");
		};
		document.head.appendChild(script);

		return () => {
			const index = loadCallbacks.indexOf(callback);
			if (index > -1) loadCallbacks.splice(index, 1);
		};
	}, [apiKey]);

	return isReady;
}
