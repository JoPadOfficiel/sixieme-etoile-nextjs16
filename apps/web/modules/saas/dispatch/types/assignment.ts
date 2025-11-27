/**
 * Assignment Types
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 *
 * Type definitions for assignment candidates and related data structures.
 */

export interface ScoreBreakdown {
	licensesScore: number;
	availabilityScore: number;
	distanceScore: number;
	rseCapacityScore: number;
}

export interface CandidateCompliance {
	status: "OK" | "WARNING" | "VIOLATION";
	warnings: string[];
}

export interface CandidateCost {
	approach: number;
	service: number;
	return: number;
	total: number;
}

/**
 * Story 8.3: Route segment details for visualization
 */
export interface RouteSegment {
	distanceKm: number;
	durationMinutes: number;
	polyline?: string; // Encoded polyline (optional, for Google API routes)
}

/**
 * Story 8.3: All route segments for a candidate
 */
export interface CandidateSegments {
	approach: RouteSegment;
	service: RouteSegment;
	return: RouteSegment;
}

export interface AssignmentCandidate {
	vehicleId: string;
	vehicleName: string;
	vehicleCategory: {
		id: string;
		name: string;
		code: string;
	};
	baseId: string;
	baseName: string;
	baseDistanceKm: number;
	// Story 8.3: Base coordinates for map visualization
	baseLatitude: number;
	baseLongitude: number;
	driverId: string | null;
	driverName: string | null;
	driverLicenses: string[];
	flexibilityScore: number;
	scoreBreakdown: ScoreBreakdown;
	compliance: CandidateCompliance;
	estimatedCost: CandidateCost;
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
	// Story 8.3: Segment details for route visualization
	segments: CandidateSegments;
}

/**
 * Story 8.3: Candidate base for map visualization
 */
export interface CandidateBase {
	vehicleId: string;
	baseId: string;
	baseName: string;
	latitude: number;
	longitude: number;
	isSelected: boolean;
	isHovered: boolean;
	estimatedCost: number;
	segments: CandidateSegments;
}

export interface AssignmentCandidatesResponse {
	candidates: AssignmentCandidate[];
	mission: {
		id: string;
		pickupAddress: string;
		dropoffAddress: string;
		pickupAt: string;
		vehicleCategoryId: string;
		passengerCount: number;
		luggageCount: number;
	};
}

export interface AssignMissionRequest {
	vehicleId: string;
	driverId?: string;
}

export interface AssignMissionResponse {
	success: boolean;
	message: string;
	mission: {
		id: string;
		quoteId: string;
		pickupAt: string;
		pickupAddress: string;
		dropoffAddress: string;
		assignment: {
			vehicleId: string | null;
			vehicleName: string | null;
			baseName: string | null;
			driverId: string | null;
			driverName: string | null;
		};
		profitability: {
			marginPercent: number | null;
			level: "green" | "orange" | "red";
		};
		compliance: {
			status: "OK" | "WARNING" | "VIOLATION";
			warnings: string[];
		};
	};
}

export type CandidateSortBy = "score" | "cost" | "distance";
export type ComplianceFilter = "all" | "ok" | "warnings";
