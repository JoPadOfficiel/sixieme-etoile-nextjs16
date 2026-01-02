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
	// Story 17.12: Home location for deadhead calculations
	homeLat: string | null; // Decimal as string
	homeLng: string | null; // Decimal as string
	homeAddress: string | null;
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

// Story 17.14: Depreciation method for TCO calculation
export type DepreciationMethod = "LINEAR" | "DECLINING_BALANCE";

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
	// Story 17.14: TCO fields
	purchasePrice: string | null; // Decimal as string
	expectedLifespanKm: number | null;
	expectedLifespanYears: number | null;
	annualMaintenanceBudget: string | null; // Decimal as string
	annualInsuranceCost: string | null; // Decimal as string
	depreciationMethod: DepreciationMethod | null;
	currentOdometerKm: number | null;
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
	// Story 17.14: TCO fields
	purchasePrice: number | null;
	expectedLifespanKm: number | null;
	expectedLifespanYears: number | null;
	annualMaintenanceBudget: number | null;
	annualInsuranceCost: number | null;
	depreciationMethod: DepreciationMethod | null;
	currentOdometerKm: number | null;
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
	// Story 17.12: Home location for deadhead calculations
	homeLat: number | null;
	homeLng: number | null;
	homeAddress: string | null;
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

// ============================================================================
// Organization Pricing Settings (Story 9.5)
// ============================================================================

// Story 17.1: Zone conflict resolution strategy
export type ZoneConflictStrategy = "PRIORITY" | "MOST_EXPENSIVE" | "CLOSEST" | "COMBINED";

// Story 17.2: Zone multiplier aggregation strategy
export type ZoneMultiplierAggregationStrategy = "MAX" | "PICKUP_ONLY" | "DROPOFF_ONLY" | "AVERAGE";

export interface OrganizationPricingSettings {
	id: string;
	organizationId: string;
	baseRatePerKm: number;
	baseRatePerHour: number;
	defaultMarginPercent: number;
	greenMarginThreshold: number;
	orangeMarginThreshold: number;
	minimumFare: number;
	roundingRule: string | null;
	fuelConsumptionL100km: number | null;
	fuelPricePerLiter: number | null;
	tollCostPerKm: number | null;
	wearCostPerKm: number | null;
	driverHourlyCost: number | null;
	// Story 17.1: Zone conflict resolution strategy
	zoneConflictStrategy: ZoneConflictStrategy | null;
	// Story 17.2: Zone multiplier aggregation strategy
	zoneMultiplierAggregationStrategy: ZoneMultiplierAggregationStrategy | null;
	// Story 17.3: Staffing selection policy
	staffingSelectionPolicy: "CHEAPEST" | "FASTEST" | "PREFER_INTERNAL" | null;
	// Story 17.4: Staffing cost parameters
	hotelCostPerNight: number | null;
	mealCostPerDay: number | null;
	driverOvernightPremium: number | null;
	secondDriverHourlyRate: number | null;
	relayDriverFixedFee: number | null;
	createdAt: string;
	updatedAt: string;
}

// Story 17.3: Staffing selection policy
export type StaffingSelectionPolicy = "CHEAPEST" | "FASTEST" | "PREFER_INTERNAL";

export interface PricingSettingsFormData {
	baseRatePerKm: number;
	baseRatePerHour: number;
	defaultMarginPercent: number;
	greenMarginThreshold: number;
	orangeMarginThreshold: number;
	minimumFare: number;
	roundingRule: string | null;
	fuelConsumptionL100km: number | null;
	fuelPricePerLiter: number | null;
	tollCostPerKm: number | null;
	wearCostPerKm: number | null;
	driverHourlyCost: number | null;
	// Story 17.1: Zone conflict resolution strategy
	zoneConflictStrategy: ZoneConflictStrategy | null;
	// Story 17.2: Zone multiplier aggregation strategy
	zoneMultiplierAggregationStrategy: ZoneMultiplierAggregationStrategy | null;
	// Story 17.3: Staffing selection policy
	staffingSelectionPolicy: StaffingSelectionPolicy | null;
	// Story 17.4: Staffing cost parameters
	hotelCostPerNight: number | null;
	mealCostPerDay: number | null;
	driverOvernightPremium: number | null;
	secondDriverHourlyRate: number | null;
	relayDriverFixedFee: number | null;
}

export type ConfigHealthStatus = "ok" | "warning" | "error";

export interface ConfigHealthResponse {
	status: ConfigHealthStatus;
	errors: string[];
	warnings: string[];
	details: {
		hasPricingSettings: boolean;
		vehicleCategoriesCount: number;
	};
}

// ============================================================================
// Driver Calendar Events (Story 17.6)
// ============================================================================

export type CalendarEventType = "HOLIDAY" | "SICK" | "PERSONAL" | "TRAINING" | "OTHER";

export interface DriverCalendarEvent {
	id: string;
	organizationId: string;
	driverId: string;
	eventType: CalendarEventType;
	title: string | null;
	notes: string | null;
	startAt: string;
	endAt: string;
	createdAt: string;
	updatedAt: string;
}

export interface CalendarEventsResponse {
	data: DriverCalendarEvent[];
	meta: {
		count: number;
		limit: number;
	};
}

export interface CalendarEventFormData {
	eventType: CalendarEventType;
	title: string | null;
	notes: string | null;
	startAt: Date;
	endAt: Date;
}

// ============================================================================
// Driver Missions (Story 19.12)
// ============================================================================

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID";

export interface DriverMission {
	id: string;
	pickupAt: string;
	estimatedEndAt: string | null;
	pickupAddress: string;
	dropoffAddress: string | null;
	status: QuoteStatus;
	tripType: TripType;
	contact: {
		id: string;
		name: string;
	};
	vehicleCategory: {
		id: string;
		name: string;
	};
}

export interface DriverMissionsResponse {
	data: DriverMission[];
	meta: {
		count: number;
		limit: number;
	};
}

// Unified calendar item for displaying both events and missions
export type CalendarItemType = "event" | "mission";

export interface CalendarItem {
	type: CalendarItemType;
	id: string;
	startAt: string;
	endAt: string;
	title: string;
	subtitle?: string;
	// For events
	eventType?: CalendarEventType;
	notes?: string | null;
	// For missions
	quoteId?: string;
	status?: QuoteStatus;
	tripType?: TripType;
	pickupAddress?: string;
	dropoffAddress?: string | null;
	contactName?: string;
	vehicleCategoryName?: string;
}
