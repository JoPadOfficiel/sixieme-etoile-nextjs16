/**
 * Route Colors Utility
 * 
 * Story 8.3: Multi-Base Optimisation & Visualisation
 * 
 * Defines consistent colors and styles for route segments
 * on the dispatch map.
 */

/**
 * Route segment types
 */
export type RouteSegmentType = "approach" | "service" | "return" | "preview";

/**
 * Route color configuration
 */
export interface RouteColorConfig {
	stroke: string;
	strokeOpacity: number;
	strokeWeight: number;
	dashPattern: number[] | null;
}

/**
 * Route colors for different segment types
 * 
 * - Approach: Gray dashed (base → pickup)
 * - Service: Blue solid (pickup → dropoff)
 * - Return: Gray dashed (dropoff → base)
 * - Preview: Light gray dashed (hover preview)
 */
export const ROUTE_COLORS: Record<RouteSegmentType, RouteColorConfig> = {
	approach: {
		stroke: "#6B7280", // Gray-500
		strokeOpacity: 0.8,
		strokeWeight: 3,
		dashPattern: [8, 8],
	},
	service: {
		stroke: "#2563EB", // Blue-600
		strokeOpacity: 1,
		strokeWeight: 4,
		dashPattern: null, // Solid line
	},
	return: {
		stroke: "#6B7280", // Gray-500
		strokeOpacity: 0.6,
		strokeWeight: 3,
		dashPattern: [8, 8],
	},
	preview: {
		stroke: "#9CA3AF", // Gray-400
		strokeOpacity: 0.5,
		strokeWeight: 2,
		dashPattern: [4, 4],
	},
};

/**
 * Marker colors for different types
 */
export const MARKER_COLORS = {
	pickup: {
		background: "#22C55E", // Green-500
		icon: "#FFFFFF",
	},
	dropoff: {
		background: "#EF4444", // Red-500
		icon: "#FFFFFF",
	},
	candidateBase: {
		background: "#3B82F6", // Blue-500
		icon: "#FFFFFF",
	},
	selectedBase: {
		background: "#1D4ED8", // Blue-700
		icon: "#FFFFFF",
	},
	hoveredBase: {
		background: "#60A5FA", // Blue-400
		icon: "#FFFFFF",
	},
	otherBase: {
		background: "#9CA3AF", // Gray-400
		icon: "#FFFFFF",
	},
};

/**
 * Get Tailwind CSS classes for route segment colors
 */
export function getRouteColorClasses(type: RouteSegmentType): string {
	switch (type) {
		case "approach":
			return "text-gray-500 border-gray-500";
		case "service":
			return "text-blue-600 border-blue-600";
		case "return":
			return "text-gray-500 border-gray-500";
		case "preview":
			return "text-gray-400 border-gray-400";
		default:
			return "text-gray-500 border-gray-500";
	}
}

/**
 * Get background color class for segment type
 */
export function getSegmentBgClass(type: RouteSegmentType): string {
	switch (type) {
		case "approach":
			return "bg-gray-500/10";
		case "service":
			return "bg-blue-600/10";
		case "return":
			return "bg-gray-500/10";
		case "preview":
			return "bg-gray-400/10";
		default:
			return "bg-gray-500/10";
	}
}

/**
 * Get icon color class for segment type
 */
export function getSegmentIconClass(type: RouteSegmentType): string {
	switch (type) {
		case "approach":
			return "text-gray-600";
		case "service":
			return "text-blue-600";
		case "return":
			return "text-gray-600";
		case "preview":
			return "text-gray-400";
		default:
			return "text-gray-600";
	}
}
