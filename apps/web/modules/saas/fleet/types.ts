/**
 * Fleet types for the VTC ERP module
 */

// Enums matching Prisma schema
export type VehicleRegulatoryCategory = "LIGHT" | "HEAVY";
export type VehicleStatus = "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";

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

// License Category (for vehicle requirements)
export interface LicenseCategory {
	id: string;
	organizationId: string;
	code: string;
	name: string;
	description: string | null;
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
