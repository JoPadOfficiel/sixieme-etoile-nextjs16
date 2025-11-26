export type ZoneType = "POLYGON" | "RADIUS" | "POINT";

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
