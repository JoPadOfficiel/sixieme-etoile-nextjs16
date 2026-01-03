/**
 * Subcontractors Module Types
 * Story 22.4: Implement Complete Subcontracting System
 * Refactored: Subcontractor is now an independent company entity (not linked to Contact)
 */

export interface SubcontractorListItem {
	id: string;
	// Company information
	companyName: string;
	siret: string | null;
	vatNumber: string | null;
	// Contact details
	contactName: string | null;
	email: string | null;
	phone: string | null;
	address: string | null;
	// Coverage
	allZones: boolean;
	operatingZones: Array<{ id: string; name: string; code: string }>;
	vehicleCategories: Array<{ id: string; name: string; code: string }>;
	// Pricing
	ratePerKm: number | null;
	ratePerHour: number | null;
	minimumFare: number | null;
	// Status
	isActive: boolean;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SubcontractorFormData {
	// Company information (required)
	companyName: string;
	siret?: string;
	vatNumber?: string;
	// Contact details
	contactName?: string;
	email?: string;
	phone?: string;
	address?: string;
	// Coverage
	allZones: boolean;
	operatingZoneIds: string[];
	vehicleCategoryIds: string[];
	// Pricing
	ratePerKm: number | null;
	ratePerHour: number | null;
	minimumFare: number | null;
	notes: string | null;
	isActive?: boolean;
}

export interface ListSubcontractorsResponse {
	subcontractors: SubcontractorListItem[];
	total: number;
}

export interface ZoneOption {
	id: string;
	name: string;
	code: string;
}

export interface VehicleCategoryOption {
	id: string;
	name: string;
	code: string;
}
