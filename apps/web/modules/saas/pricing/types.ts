export type ZoneType = "POLYGON" | "RADIUS" | "POINT";
export type RouteDirection = "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
export type CreationMethod = "DRAW" | "POSTAL_CODE" | "COORDINATES";

// Predefined zone colors (8 colors)
export const ZONE_COLORS = [
	{ name: "emerald", value: "#10b981", label: "Emerald" },
	{ name: "blue", value: "#3b82f6", label: "Blue" },
	{ name: "violet", value: "#8b5cf6", label: "Violet" },
	{ name: "amber", value: "#f59e0b", label: "Amber" },
	{ name: "rose", value: "#f43f5e", label: "Rose" },
	{ name: "cyan", value: "#06b6d4", label: "Cyan" },
	{ name: "orange", value: "#f97316", label: "Orange" },
	{ name: "indigo", value: "#6366f1", label: "Indigo" },
] as const;

export type ZoneColor = (typeof ZONE_COLORS)[number]["value"];

export interface PricingZone {
	id: string;
	organizationId: string;
	name: string;
	code: string;
	zoneType: ZoneType;
	geometry: unknown | null;
	centerLatitude: number | null;
	centerLongitude: number | null;
	radiusKm: number | null;
	parentZoneId: string | null;
	parentZone: {
		id: string;
		name: string;
		code: string;
	} | null;
	isActive: boolean;
	color?: string | null;
	// Story 11.2: Postal code zone creation
	postalCodes?: string[];
	creationMethod?: CreationMethod | null;
	// Story 11.3: Zone pricing multiplier
	priceMultiplier?: number;
	multiplierDescription?: string | null;
	routesCount?: number;
	childZonesCount?: number;
	createdAt: string;
	updatedAt: string;
}

export interface PricingZoneFormData {
	name: string;
	code: string;
	zoneType: ZoneType;
	geometry?: unknown | null;
	centerLatitude?: number | null;
	centerLongitude?: number | null;
	radiusKm?: number | null;
	parentZoneId?: string | null;
	isActive: boolean;
	color?: string | null;
	// Story 11.2: Postal code zone creation
	postalCodes?: string[];
	creationMethod?: CreationMethod | null;
	// Story 11.3: Zone pricing multiplier
	priceMultiplier?: number;
	multiplierDescription?: string | null;
}

export interface PricingZonesListResponse {
	data: PricingZone[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Vehicle Category (simplified for route form)
export interface VehicleCategory {
	id: string;
	name: string;
	code: string;
	maxPassengers: number;
	priceMultiplier: number | null;
	defaultRatePerKm: number | null;
	defaultRatePerHour: number | null;
}

// Zone Route types
export interface ZoneRoute {
	id: string;
	organizationId: string;
	fromZone: {
		id: string;
		name: string;
		code: string;
		zoneType: ZoneType;
		centerLatitude: number | null;
		centerLongitude: number | null;
		radiusKm: number | null;
	};
	toZone: {
		id: string;
		name: string;
		code: string;
		zoneType: ZoneType;
		centerLatitude: number | null;
		centerLongitude: number | null;
		radiusKm: number | null;
	};
	vehicleCategory: VehicleCategory;
	direction: RouteDirection;
	fixedPrice: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	// Story 13.2: Partner-specific override price (when partnerId filter is used)
	overridePrice?: number | null;
	hasOverride?: boolean;
}

export interface ZoneRouteFormData {
	fromZoneId: string;
	toZoneId: string;
	vehicleCategoryId: string;
	direction: RouteDirection;
	fixedPrice: number;
	isActive: boolean;
}

export interface ZoneRoutesListResponse {
	data: ZoneRoute[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		// Story 13.2: Partner filter info
		partnerId?: string | null;
	};
}

// Story 13.2: Partner contact for filter dropdown
export interface PartnerContact {
	id: string;
	displayName: string;
	companyName?: string | null;
}

// Excursion Package types
export interface ExcursionPackage {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	originZone: {
		id: string;
		name: string;
		code: string;
		zoneType: ZoneType;
		centerLatitude: number | null;
		centerLongitude: number | null;
		radiusKm: number | null;
	} | null;
	destinationZone: {
		id: string;
		name: string;
		code: string;
		zoneType: ZoneType;
		centerLatitude: number | null;
		centerLongitude: number | null;
		radiusKm: number | null;
	} | null;
	vehicleCategory: VehicleCategory;
	includedDurationHours: number;
	includedDistanceKm: number;
	price: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ExcursionPackageFormData {
	name: string;
	description?: string | null;
	originZoneId?: string | null;
	destinationZoneId?: string | null;
	vehicleCategoryId: string;
	includedDurationHours: number;
	includedDistanceKm: number;
	price: number;
	isActive: boolean;
}

export interface ExcursionPackagesListResponse {
	data: ExcursionPackage[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Dispo Package types
export interface DispoPackage {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	vehicleCategory: VehicleCategory;
	includedDurationHours: number;
	includedDistanceKm: number;
	basePrice: number;
	overageRatePerKm: number;
	overageRatePerHour: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DispoPackageFormData {
	name: string;
	description?: string | null;
	vehicleCategoryId: string;
	includedDurationHours: number;
	includedDistanceKm: number;
	basePrice: number;
	overageRatePerKm: number;
	overageRatePerHour: number;
	isActive: boolean;
}

export interface DispoPackagesListResponse {
	data: DispoPackage[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
