/**
 * Fleet types for the VTC ERP module
 */

// Enums matching Prisma schema
export type VehicleRegulatoryCategory = "LIGHT" | "HEAVY";
export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";
export type DriverEmploymentStatus = "EMPLOYEE" | "CONTRACTOR" | "FREELANCE";

// Vehicle Category
export interface VehicleCategory {
	id: string;
	organizationId: string;
	name: string;
	code: string;
	regulatoryCategory: VehicleRegulatoryCategory;
	maxPassengers: number;
	maxLuggageVolume: number | null;
	priceMultiplier: string; // Decimal as string from API
	defaultRatePerKm: string | null;
	defaultRatePerHour: string | null;
	description: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface VehicleCategoryWithCount extends VehicleCategory {
	_count: {
		vehicles: number;
	};
}

export interface VehicleCategoriesResponse {
	data: VehicleCategoryWithCount[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Operating Base
export interface OperatingBase {
	id: string;
	organizationId: string;
	name: string;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	postalCode: string;
	countryCode: string;
	latitude: string; // Decimal as string from API
	longitude: string; // Decimal as string from API
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface OperatingBaseWithCount extends OperatingBase {
	_count: {
		vehicles: number;
	};
}

export interface OperatingBaseWithVehicles extends OperatingBaseWithCount {
	vehicles: VehicleWithRelations[];
}

export interface BasesResponse {
	data: OperatingBaseWithCount[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// License Category (for vehicle requirements and driver licenses)
export interface LicenseCategory {
	id: string;
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface LicenseCategoryWithCount extends LicenseCategory {
	_count: {
		driverLicenses: number;
		vehiclesRequiringThis: number;
		organizationRules: number;
	};
}

export interface LicenseCategoriesResponse {
	data: LicenseCategoryWithCount[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Organization License Rule (RSE constraints per license type)
export interface OrganizationLicenseRule {
	id: string;
	organizationId: string;
	licenseCategoryId: string;
	maxDailyDrivingHours: string; // Decimal as string
	maxDailyAmplitudeHours: string; // Decimal as string
	breakMinutesPerDrivingBlock: number;
	drivingBlockHoursForBreak: string; // Decimal as string
	cappedAverageSpeedKmh: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface OrganizationLicenseRuleWithCategory extends OrganizationLicenseRule {
	licenseCategory: LicenseCategory;
}

export interface LicenseRulesResponse {
	data: OrganizationLicenseRuleWithCategory[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Driver License (junction between Driver and LicenseCategory)
export interface DriverLicense {
	id: string;
	driverId: string;
	licenseCategoryId: string;
	licenseNumber: string;
	validFrom: string;
	validTo: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DriverLicenseWithCategory extends DriverLicense {
	licenseCategory: LicenseCategory;
}

// Driver
export interface Driver {
	id: string;
	organizationId: string;
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	employmentStatus: DriverEmploymentStatus;
	hourlyCost: string | null; // Decimal as string
	isActive: boolean;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DriverWithLicenses extends Driver {
	driverLicenses: DriverLicenseWithCategory[];
}

export interface DriversResponse {
	data: DriverWithLicenses[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Vehicle
export interface Vehicle {
	id: string;
	organizationId: string;
	vehicleCategoryId: string;
	operatingBaseId: string;
	registrationNumber: string;
	internalName: string | null;
	vin: string | null;
	passengerCapacity: number;
	luggageCapacity: number | null;
	consumptionLPer100Km: string | null; // Decimal as string
	averageSpeedKmh: number | null;
	costPerKm: string | null; // Decimal as string
	requiredLicenseCategoryId: string | null;
	status: VehicleStatus;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface VehicleWithRelations extends Vehicle {
	vehicleCategory: VehicleCategory;
	operatingBase: OperatingBase;
	requiredLicenseCategory: LicenseCategory | null;
}

export interface VehiclesResponse {
	data: VehicleWithRelations[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// Form data types
export interface VehicleCategoryFormData {
	name: string;
	code: string;
	regulatoryCategory: VehicleRegulatoryCategory;
	maxPassengers: number;
	maxLuggageVolume: number | null;
	priceMultiplier: number;
	defaultRatePerKm: number | null;
	defaultRatePerHour: number | null;
	description: string | null;
	isActive: boolean;
}

export interface OperatingBaseFormData {
	name: string;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	postalCode: string;
	countryCode: string;
	latitude: number;
	longitude: number;
	isActive: boolean;
}

export interface VehicleFormData {
	vehicleCategoryId: string;
	operatingBaseId: string;
	registrationNumber: string;
	internalName: string | null;
	vin: string | null;
	passengerCapacity: number;
	luggageCapacity: number | null;
	consumptionLPer100Km: number | null;
	averageSpeedKmh: number | null;
	costPerKm: number | null;
	requiredLicenseCategoryId: string | null;
	status: VehicleStatus;
	notes: string | null;
}

// Driver form data
export interface DriverFormData {
	firstName: string;
	lastName: string;
	email: string | null;
	phone: string | null;
	employmentStatus: DriverEmploymentStatus;
	hourlyCost: number | null;
	isActive: boolean;
	notes: string | null;
}

export interface DriverLicenseFormData {
	licenseCategoryId: string;
	licenseNumber: string;
	validFrom: Date;
	validTo: Date | null;
}

// License Category form data
export interface LicenseCategoryFormData {
	code: string;
	name: string;
	description: string | null;
}

// Organization License Rule form data (RSE constraints)
export interface LicenseRuleFormData {
	licenseCategoryId: string;
	maxDailyDrivingHours: number;
	maxDailyAmplitudeHours: number;
	breakMinutesPerDrivingBlock: number;
	drivingBlockHoursForBreak: number;
	cappedAverageSpeedKmh: number | null;
}

// ============================================================================
// RSE Counters & Compliance (Story 5.5)
// ============================================================================

export type ComplianceDecision = "APPROVED" | "BLOCKED" | "WARNING";
export type ComplianceStatus = "OK" | "WARNING" | "VIOLATION";

// RSE Counter for a driver on a specific date and regime
export interface DriverRSECounter {
	id: string;
	organizationId: string;
	driverId: string;
	date: string; // ISO date
	regulatoryCategory: VehicleRegulatoryCategory;
	licenseCategoryId: string | null;
	drivingMinutes: number;
	amplitudeMinutes: number;
	breakMinutes: number;
	restMinutes: number;
	workStartTime: string | null;
	workEndTime: string | null;
	createdAt: string;
	updatedAt: string;
	licenseCategory?: LicenseCategory | null;
}

// Compliance violation
export interface ComplianceViolation {
	type: "DRIVING_TIME_EXCEEDED" | "AMPLITUDE_EXCEEDED" | "BREAK_REQUIRED" | "SPEED_LIMIT_EXCEEDED";
	message: string;
	actual: number;
	limit: number;
	unit: "hours" | "minutes" | "km/h";
	severity: "BLOCKING";
}

// Compliance warning
export interface ComplianceWarning {
	type: "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";
	message: string;
	actual: number;
	limit: number;
	percentOfLimit: number;
}

// RSE Rules
export interface RSERules {
	licenseCategoryId: string;
	licenseCategoryCode: string;
	maxDailyDrivingHours: number;
	maxDailyAmplitudeHours: number;
	breakMinutesPerDrivingBlock: number;
	drivingBlockHoursForBreak: number;
	cappedAverageSpeedKmh: number | null;
}

// Compliance audit log entry
export interface ComplianceAuditLog {
	id: string;
	organizationId: string;
	driverId: string;
	timestamp: string;
	quoteId: string | null;
	missionId: string | null;
	vehicleCategoryId: string | null;
	regulatoryCategory: VehicleRegulatoryCategory;
	decision: ComplianceDecision;
	violations: ComplianceViolation[] | null;
	warnings: ComplianceWarning[] | null;
	reason: string;
	countersSnapshot: DriverRSECounterData | null;
}

// Counter data (without Prisma metadata)
export interface DriverRSECounterData {
	drivingMinutes: number;
	amplitudeMinutes: number;
	breakMinutes: number;
	restMinutes: number;
	workStartTime?: string | null;
	workEndTime?: string | null;
}

// Compliance snapshot for UI display
export interface ComplianceSnapshot {
	date: string;
	counters: {
		light: DriverRSECounter | null;
		heavy: DriverRSECounter | null;
	};
	limits: {
		light: RSERules | null;
		heavy: RSERules | null;
	};
	status: {
		light: ComplianceStatus;
		heavy: ComplianceStatus;
	};
}

// API Response types
export interface RSECountersResponse {
	date: string;
	counters: DriverRSECounter[];
}

export interface RSECounterByRegimeResponse {
	date: string;
	regime: VehicleRegulatoryCategory;
	counter: DriverRSECounter | null;
}

export interface ComplianceLogsResponse {
	data: ComplianceAuditLog[];
	meta: {
		limit: number;
		count: number;
	};
}

export interface CumulativeComplianceResult {
	isCompliant: boolean;
	currentCounters: DriverRSECounterData;
	projectedCounters: DriverRSECounterData;
	violations: ComplianceViolation[];
	warnings: ComplianceWarning[];
	rules: RSERules | null;
	decision: ComplianceDecision;
	decisionLogged: boolean;
}
