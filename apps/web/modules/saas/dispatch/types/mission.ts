/**
 * Mission Types
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Type definitions for missions (accepted quotes with future pickup dates)
 * used in the Dispatch screen.
 */

export interface MissionAssignment {
	vehicleId: string | null;
	vehicleName: string | null;
	baseName: string | null;
	driverId: string | null;
	driverName: string | null;
	// Story 20.8: Second driver for RSE double crew missions
	secondDriverId: string | null;
	secondDriverName: string | null;
}

export interface MissionProfitability {
	marginPercent: number | null;
	level: "green" | "orange" | "red";
}

export interface MissionCompliance {
	status: "OK" | "WARNING" | "VIOLATION";
	warnings: string[];
}

export interface MissionContact {
	id: string;
	displayName: string;
	isPartner: boolean;
	email?: string | null;
	phone?: string | null;
}

export interface MissionEndCustomer {
	id: string;
	firstName: string;
	lastName: string;
	email?: string | null;
	phone?: string | null;
}

export interface MissionVehicleCategory {
	id: string;
	name: string;
	code: string;
}

export interface MissionListItem {
	id: string;
	quoteId: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	passengerCount: number;
	luggageCount: number;
	finalPrice: number;
	contact: MissionContact;
	vehicleCategory: MissionVehicleCategory;
	// Story 24.5: End Customer display for partner missions
	endCustomer?: MissionEndCustomer | null;
	assignment: MissionAssignment | null;
	profitability: MissionProfitability;
	compliance: MissionCompliance;
	// Story 22.4: Subcontracting fields
	isSubcontracted: boolean;
	subcontractor: MissionSubcontractor | null;
	// Story 22.9: Staffing information display
	staffingSummary?: StaffingSummary | null;
	tripType?: "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID" | "STAY";
	stayDays?: StayDayListItem[];
	// Story 22.11: Notes for dispatch display
	notes?: string | null;
}

// Story 22.4: Subcontractor info for subcontracted missions
export interface MissionSubcontractor {
	id: string;
	companyName: string;
	contactName: string | null;
	phone: string | null;
	agreedPrice: number;
	subcontractedAt: string;
}

/**
 * Story 22.9: Staffing summary for mission list display
 * Compact staffing information shown in mission rows
 */
export interface StaffingSummary {
	driverCount: number;
	hotelNights: number;
	mealCount: number;
	totalStaffingCost: number;
	planType: "SINGLE_DRIVER" | "DOUBLE_CREW" | "RELAY" | "MULTI_DAY";
	isRSERequired: boolean;
}

/**
 * Story 22.9: STAY day summary for list display
 */
export interface StayDayListItem {
	dayNumber: number;
	date: string;
	serviceCount: number;
	hotelRequired: boolean;
	mealCount: number;
	driverCount: number;
}

export interface MissionDetail extends MissionListItem {
	internalCost: number | null;
	marginPercent: number | null;
	suggestedPrice: number;
	pricingMode: "FIXED_GRID" | "DYNAMIC";
	tripType: "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID" | "STAY";
	notes: string | null;
	tripAnalysis: { encodedPolyline?: string; [key: string]: unknown };
	appliedRules: unknown;
}

/**
 * Story 5.6: Surface Compliance Statuses & Logs in UI
 *
 * Detailed compliance information for a mission
 */

export type VehicleRegulatoryCategory = "LIGHT" | "HEAVY";
export type ComplianceDecision = "APPROVED" | "BLOCKED" | "WARNING";

export interface ComplianceViolation {
	type:
		| "DRIVING_TIME_EXCEEDED"
		| "AMPLITUDE_EXCEEDED"
		| "BREAK_REQUIRED"
		| "SPEED_LIMIT_EXCEEDED";
	message: string;
	actual: number;
	limit: number;
	unit: "hours" | "minutes" | "km/h";
	severity: "BLOCKING";
}

export interface ComplianceWarning {
	type: "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";
	message: string;
	actual: number;
	limit: number;
	percentOfLimit: number;
}

export interface AppliedComplianceRule {
	ruleId: string;
	ruleName: string;
	threshold: number;
	unit: string;
	result: "PASS" | "FAIL" | "WARNING";
}

export interface AdjustedDurations {
	totalDrivingMinutes: number;
	totalAmplitudeMinutes: number;
	injectedBreakMinutes: number;
	cappedSpeedApplied: boolean;
}

export interface ComplianceValidationResult {
	isCompliant: boolean;
	regulatoryCategory: VehicleRegulatoryCategory;
	violations: ComplianceViolation[];
	warnings: ComplianceWarning[];
	adjustedDurations: AdjustedDurations;
	rulesApplied: AppliedComplianceRule[];
}

export interface MissionComplianceAuditLog {
	id: string;
	timestamp: string;
	decision: ComplianceDecision;
	reason: string;
	regulatoryCategory: VehicleRegulatoryCategory;
	violations: ComplianceViolation[] | null;
	warnings: ComplianceWarning[] | null;
	quoteId: string | null;
	missionId: string | null;
	countersSnapshot: unknown | null;
}

export interface MissionComplianceDetails {
	missionId: string;
	vehicleRegulatoryCategory: VehicleRegulatoryCategory;
	validationResult: ComplianceValidationResult | null;
	auditLogs: MissionComplianceAuditLog[];
}

export interface MissionsFilters {
	dateFrom?: string;
	dateTo?: string;
	vehicleCategoryId?: string;
	clientType?: "PARTNER" | "PRIVATE" | "ALL";
	search?: string;
	// Story 22.4: Filter for subcontracted missions
	subcontracted?: "ALL" | "SUBCONTRACTED" | "INTERNAL";
	// Story 27.5: Filter for unassigned missions
	unassignedOnly?: boolean;
}

export interface MissionsListResponse {
	data: MissionListItem[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}
