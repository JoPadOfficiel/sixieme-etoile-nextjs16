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
	driverId: string | null;
	driverName: string | null;
	driverLicenses: string[];
	flexibilityScore: number;
	scoreBreakdown: ScoreBreakdown;
	compliance: CandidateCompliance;
	estimatedCost: CandidateCost;
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
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
