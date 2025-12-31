/**
 * TCO (Total Cost of Ownership) Calculator Service
 * Story 17.14: Vehicle TCO Model Enrichment
 *
 * Calculates vehicle TCO including:
 * - Depreciation (linear or declining balance)
 * - Maintenance costs
 * - Insurance costs
 *
 * TCO replaces the generic "wear" cost when configured on a vehicle.
 */

// ============================================================================
// Types
// ============================================================================

export type DepreciationMethod = "LINEAR" | "DECLINING_BALANCE";

/**
 * TCO configuration from Vehicle or VehicleCategory
 */
export interface TcoConfig {
	purchasePrice: number; // EUR
	expectedLifespanKm: number; // km
	expectedLifespanYears: number; // years
	annualMaintenanceBudget: number; // EUR
	annualInsuranceCost: number; // EUR
	depreciationMethod: DepreciationMethod;
	currentOdometerKm?: number; // km (optional, for declining balance)
}

/**
 * Depreciation cost component
 */
export interface DepreciationComponent {
	amount: number;
	ratePerKm: number;
	method: DepreciationMethod;
}

/**
 * Maintenance cost component
 */
export interface MaintenanceComponent {
	amount: number;
	ratePerKm: number;
}

/**
 * Insurance cost component
 */
export interface InsuranceComponent {
	amount: number;
	ratePerKm: number;
}

/**
 * Complete TCO cost breakdown
 */
export interface TcoCostComponent {
	amount: number; // Total TCO cost for the trip
	distanceKm: number; // Distance used for calculation
	depreciation: DepreciationComponent;
	maintenance: MaintenanceComponent;
	insurance: InsuranceComponent;
	totalRatePerKm: number; // Sum of all rates per km
}

/**
 * Partial vehicle data for TCO check
 */
export interface VehicleForTco {
	purchasePrice?: number | null;
	expectedLifespanKm?: number | null;
	expectedLifespanYears?: number | null;
	annualMaintenanceBudget?: number | null;
	annualInsuranceCost?: number | null;
	depreciationMethod?: DepreciationMethod | null;
	currentOdometerKm?: number | null;
}

/**
 * Partial vehicle category data for TCO defaults
 */
export interface VehicleCategoryForTco {
	defaultPurchasePrice?: number | null;
	defaultExpectedLifespanKm?: number | null;
	defaultExpectedLifespanYears?: number | null;
	defaultAnnualMaintenanceBudget?: number | null;
	defaultAnnualInsuranceCost?: number | null;
	defaultDepreciationMethod?: DepreciationMethod | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default declining balance depreciation rate (20% per year)
 * Standard for vehicles in France
 */
export const DEFAULT_DECLINING_BALANCE_RATE = 0.20;

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if a vehicle has complete TCO configuration
 */
export function hasTcoConfig(vehicle: VehicleForTco): boolean {
	return (
		vehicle.purchasePrice != null &&
		vehicle.purchasePrice > 0 &&
		vehicle.expectedLifespanKm != null &&
		vehicle.expectedLifespanKm > 0 &&
		vehicle.expectedLifespanYears != null &&
		vehicle.expectedLifespanYears > 0 &&
		vehicle.annualMaintenanceBudget != null &&
		vehicle.annualInsuranceCost != null &&
		vehicle.depreciationMethod != null
	);
}

/**
 * Check if a vehicle category has TCO defaults
 */
export function hasCategoryTcoDefaults(category: VehicleCategoryForTco): boolean {
	return (
		category.defaultPurchasePrice != null &&
		category.defaultPurchasePrice > 0 &&
		category.defaultExpectedLifespanKm != null &&
		category.defaultExpectedLifespanKm > 0 &&
		category.defaultExpectedLifespanYears != null &&
		category.defaultExpectedLifespanYears > 0 &&
		category.defaultAnnualMaintenanceBudget != null &&
		category.defaultAnnualInsuranceCost != null &&
		category.defaultDepreciationMethod != null
	);
}

/**
 * Build TcoConfig from vehicle, with fallback to category defaults
 */
export function buildTcoConfig(
	vehicle: VehicleForTco,
	category?: VehicleCategoryForTco
): TcoConfig | null {
	// Try vehicle first
	if (hasTcoConfig(vehicle)) {
		return {
			purchasePrice: Number(vehicle.purchasePrice),
			expectedLifespanKm: vehicle.expectedLifespanKm!,
			expectedLifespanYears: vehicle.expectedLifespanYears!,
			annualMaintenanceBudget: Number(vehicle.annualMaintenanceBudget),
			annualInsuranceCost: Number(vehicle.annualInsuranceCost),
			depreciationMethod: vehicle.depreciationMethod!,
			currentOdometerKm: vehicle.currentOdometerKm ?? undefined,
		};
	}

	// Try category defaults
	if (category && hasCategoryTcoDefaults(category)) {
		return {
			purchasePrice: Number(category.defaultPurchasePrice),
			expectedLifespanKm: category.defaultExpectedLifespanKm!,
			expectedLifespanYears: category.defaultExpectedLifespanYears!,
			annualMaintenanceBudget: Number(category.defaultAnnualMaintenanceBudget),
			annualInsuranceCost: Number(category.defaultAnnualInsuranceCost),
			depreciationMethod: category.defaultDepreciationMethod!,
			currentOdometerKm: vehicle.currentOdometerKm ?? undefined,
		};
	}

	return null;
}

/**
 * Validate TCO configuration
 * @throws Error if configuration is invalid
 */
export function validateTcoConfig(config: TcoConfig): void {
	if (config.purchasePrice <= 0) {
		throw new Error("TCO: purchasePrice must be positive");
	}
	if (config.expectedLifespanKm <= 0) {
		throw new Error("TCO: expectedLifespanKm must be positive");
	}
	if (config.expectedLifespanYears <= 0) {
		throw new Error("TCO: expectedLifespanYears must be positive");
	}
	if (config.annualMaintenanceBudget < 0) {
		throw new Error("TCO: annualMaintenanceBudget cannot be negative");
	}
	if (config.annualInsuranceCost < 0) {
		throw new Error("TCO: annualInsuranceCost cannot be negative");
	}
	if (config.currentOdometerKm != null && config.currentOdometerKm < 0) {
		throw new Error("TCO: currentOdometerKm cannot be negative");
	}
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate depreciation rate per km using linear method
 * Formula: purchasePrice / expectedLifespanKm
 */
export function calculateLinearDepreciationPerKm(config: TcoConfig): number {
	return config.purchasePrice / config.expectedLifespanKm;
}

/**
 * Calculate depreciation rate per km using declining balance method
 * Formula:
 *   yearsOwned = currentOdometerKm / annualKm
 *   remainingValue = purchasePrice × (1 - rate)^yearsOwned
 *   totalDepreciation = purchasePrice - remainingValue
 *   depreciationPerKm = totalDepreciation / currentOdometerKm
 *
 * Falls back to linear if currentOdometerKm is not available or zero
 */
export function calculateDecliningBalanceDepreciationPerKm(
	config: TcoConfig,
	rate: number = DEFAULT_DECLINING_BALANCE_RATE
): number {
	const currentOdometer = config.currentOdometerKm ?? 0;

	// If no odometer reading, fall back to linear
	if (currentOdometer <= 0) {
		return calculateLinearDepreciationPerKm(config);
	}

	const annualKm = config.expectedLifespanKm / config.expectedLifespanYears;
	const yearsOwned = currentOdometer / annualKm;

	// Calculate remaining value using declining balance
	const remainingValue = config.purchasePrice * Math.pow(1 - rate, yearsOwned);
	const totalDepreciation = config.purchasePrice - remainingValue;

	// Depreciation per km based on actual km driven
	return totalDepreciation / currentOdometer;
}

/**
 * Calculate depreciation rate per km based on method
 */
export function calculateDepreciationPerKm(config: TcoConfig): number {
	if (config.depreciationMethod === "DECLINING_BALANCE") {
		return calculateDecliningBalanceDepreciationPerKm(config);
	}
	return calculateLinearDepreciationPerKm(config);
}

/**
 * Calculate maintenance rate per km
 * Formula: annualMaintenanceBudget / annualKm
 */
export function calculateMaintenancePerKm(config: TcoConfig): number {
	const annualKm = config.expectedLifespanKm / config.expectedLifespanYears;
	return config.annualMaintenanceBudget / annualKm;
}

/**
 * Calculate insurance rate per km
 * Formula: annualInsuranceCost / annualKm
 */
export function calculateInsurancePerKm(config: TcoConfig): number {
	const annualKm = config.expectedLifespanKm / config.expectedLifespanYears;
	return config.annualInsuranceCost / annualKm;
}

/**
 * Calculate total TCO rate per km
 */
export function getTcoPerKm(config: TcoConfig): number {
	const depreciation = calculateDepreciationPerKm(config);
	const maintenance = calculateMaintenancePerKm(config);
	const insurance = calculateInsurancePerKm(config);
	return depreciation + maintenance + insurance;
}

/**
 * Calculate complete TCO cost for a given distance
 */
export function calculateTcoCost(
	distanceKm: number,
	config: TcoConfig
): TcoCostComponent {
	validateTcoConfig(config);

	const depreciationPerKm = calculateDepreciationPerKm(config);
	const maintenancePerKm = calculateMaintenancePerKm(config);
	const insurancePerKm = calculateInsurancePerKm(config);
	const totalRatePerKm = depreciationPerKm + maintenancePerKm + insurancePerKm;

	const depreciationAmount = Math.round(distanceKm * depreciationPerKm * 100) / 100;
	const maintenanceAmount = Math.round(distanceKm * maintenancePerKm * 100) / 100;
	const insuranceAmount = Math.round(distanceKm * insurancePerKm * 100) / 100;
	const totalAmount = Math.round(distanceKm * totalRatePerKm * 100) / 100;

	return {
		amount: totalAmount,
		distanceKm,
		depreciation: {
			amount: depreciationAmount,
			ratePerKm: Math.round(depreciationPerKm * 10000) / 10000, // 4 decimal places
			method: config.depreciationMethod,
		},
		maintenance: {
			amount: maintenanceAmount,
			ratePerKm: Math.round(maintenancePerKm * 10000) / 10000,
		},
		insurance: {
			amount: insuranceAmount,
			ratePerKm: Math.round(insurancePerKm * 10000) / 10000,
		},
		totalRatePerKm: Math.round(totalRatePerKm * 10000) / 10000,
	};
}

/**
 * Get TCO source description for applied rules
 */
export function getTcoSource(
	vehicle: VehicleForTco,
	category?: VehicleCategoryForTco
): "VEHICLE" | "CATEGORY" | null {
	if (hasTcoConfig(vehicle)) {
		return "VEHICLE";
	}
	if (category && hasCategoryTcoDefaults(category)) {
		return "CATEGORY";
	}
	return null;
}
