/**
 * Pricing Engine - Re-export Module
 * 
 * Story 19-15: This file has been decomposed into modular components.
 * It now re-exports from the pricing/ directory for backward compatibility.
 * 
 * Architecture:
 * - pricing/types.ts: All type definitions
 * - pricing/constants.ts: All constants
 * - pricing/cost-calculator.ts: Cost calculation functions
 * - pricing/zone-resolver.ts: Zone resolution
 * - pricing/dynamic-pricing.ts: Dynamic pricing
 * - pricing/multiplier-engine.ts: Multiplier application
 * - pricing/profitability.ts: Profitability indicators
 * - pricing/shadow-calculator.ts: Shadow calculation
 * - pricing/trip-type-pricing.ts: Trip type specific pricing
 * 
 * @deprecated Import from "./pricing" instead
 */

// Re-export everything from the modular pricing directory
export * from "./pricing";

// Re-export compliance integration from compliance-validator
export {
	integrateComplianceInPricing,
	type ComplianceValidationInput,
	type ComplianceValidationResult,
	type RSERules,
	type AlternativeCostParameters,
	type StaffingSelectionPolicy,
} from "./compliance-validator";

// Alias for backward compatibility
export { integrateComplianceInPricing as integrateComplianceIntoPricing } from "./compliance-validator";
