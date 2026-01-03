/**
 * Pricing Validation Module
 * Story 21.9: Real-time cost calculation validation
 * 
 * This module provides validation functions to verify pricing calculations
 * are consistent and within expected ranges.
 */

import type {
	PricingResult,
	ValidationResult,
	ValidationCheck,
	ValidationCheckStatus,
	ValidationOverallStatus,
	TripAnalysis,
	OrganizationPricingSettings,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

const VALIDATION_THRESHOLDS = {
	// Margin thresholds
	MIN_MARGIN_PERCENT: -50, // Allow negative for contract prices
	MAX_MARGIN_PERCENT: 200, // Warning if margin > 200%
	
	// Speed thresholds (km/h)
	MIN_AVG_SPEED: 20, // Minimum plausible average speed
	MAX_AVG_SPEED: 150, // Maximum plausible average speed
	
	// Component sum tolerance
	COMPONENT_SUM_TOLERANCE_PERCENT: 5, // 5% tolerance for rounding
	
	// Staffing cost thresholds
	MIN_DRIVER_HOURLY_RATE: 15, // Minimum €/h
	MAX_DRIVER_HOURLY_RATE: 100, // Maximum €/h
	MIN_HOTEL_NIGHTLY_RATE: 50, // Minimum €/night
	MAX_HOTEL_NIGHTLY_RATE: 300, // Maximum €/night
};

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a pricing result for consistency and reasonableness
 */
export function validatePricingResult(
	pricingResult: PricingResult,
	pricingSettings?: OrganizationPricingSettings,
): ValidationResult {
	const checks: ValidationCheck[] = [];
	const warnings: string[] = [];
	const errors: string[] = [];
	
	// Run all validation checks
	checks.push(validateMarginPositive(pricingResult));
	checks.push(validateMarginReasonable(pricingResult, pricingSettings));
	checks.push(validatePriceVsCost(pricingResult));
	checks.push(validateZoneMultiplier(pricingResult));
	checks.push(validateDurationPlausible(pricingResult.tripAnalysis));
	checks.push(validateStaffingProportional(pricingResult.tripAnalysis));
	checks.push(validateComponentsSum(pricingResult.tripAnalysis));
	
	// Collect warnings and errors
	for (const check of checks) {
		if (check.status === "WARNING") {
			warnings.push(check.message);
		} else if (check.status === "FAIL") {
			errors.push(check.message);
		}
	}
	
	// Determine overall status
	const hasErrors = checks.some(c => c.status === "FAIL");
	const hasWarnings = checks.some(c => c.status === "WARNING");
	
	let overallStatus: ValidationOverallStatus = "VALID";
	if (hasErrors) {
		overallStatus = "INVALID";
	} else if (hasWarnings) {
		overallStatus = "WARNING";
	}
	
	return {
		isValid: !hasErrors,
		overallStatus,
		checks,
		timestamp: new Date().toISOString(),
		warnings,
		errors,
	};
}

// ============================================================================
// Individual Validation Checks
// ============================================================================

/**
 * AC2: Check if margin is positive (or acceptable for contract prices)
 */
function validateMarginPositive(pricingResult: PricingResult): ValidationCheck {
	const { marginPercent, isContractPrice } = pricingResult;
	
	// Contract prices may have negative margins (Engagement Rule)
	if (isContractPrice && marginPercent < 0) {
		return {
			id: "margin-positive",
			name: "Margin Positive",
			status: "WARNING",
			message: `Negative margin (${marginPercent.toFixed(1)}%) - Contract price applies`,
			details: {
				marginPercent,
				isContractPrice: true,
				reason: "ENGAGEMENT_RULE",
			},
		};
	}
	
	if (marginPercent < 0) {
		return {
			id: "margin-positive",
			name: "Margin Positive",
			status: "FAIL",
			message: `Negative margin detected (${marginPercent.toFixed(1)}%)`,
			details: { marginPercent },
		};
	}
	
	return {
		id: "margin-positive",
		name: "Margin Positive",
		status: "PASS",
		message: `Margin positive (${marginPercent.toFixed(1)}%)`,
		details: { marginPercent },
	};
}

/**
 * AC2: Check if margin is within reasonable range
 */
function validateMarginReasonable(
	pricingResult: PricingResult,
	pricingSettings?: OrganizationPricingSettings,
): ValidationCheck {
	const { marginPercent } = pricingResult;
	
	// Get thresholds from settings or use defaults
	const greenThreshold = pricingSettings?.greenMarginThreshold ?? 20;
	const orangeThreshold = pricingSettings?.orangeMarginThreshold ?? 10;
	
	if (marginPercent > VALIDATION_THRESHOLDS.MAX_MARGIN_PERCENT) {
		return {
			id: "margin-reasonable",
			name: "Margin Reasonable",
			status: "WARNING",
			message: `Unusually high margin (${marginPercent.toFixed(1)}% > ${VALIDATION_THRESHOLDS.MAX_MARGIN_PERCENT}%)`,
			details: {
				marginPercent,
				maxThreshold: VALIDATION_THRESHOLDS.MAX_MARGIN_PERCENT,
			},
		};
	}
	
	if (marginPercent < orangeThreshold && marginPercent >= 0) {
		return {
			id: "margin-reasonable",
			name: "Margin Reasonable",
			status: "WARNING",
			message: `Low margin (${marginPercent.toFixed(1)}%) - below orange threshold (${orangeThreshold}%)`,
			details: {
				marginPercent,
				orangeThreshold,
				greenThreshold,
			},
		};
	}
	
	return {
		id: "margin-reasonable",
		name: "Margin Reasonable",
		status: "PASS",
		message: `Margin within expected range (${marginPercent.toFixed(1)}%)`,
		details: {
			marginPercent,
			greenThreshold,
			orangeThreshold,
		},
	};
}

/**
 * AC2: Check price vs internal cost relationship
 */
function validatePriceVsCost(pricingResult: PricingResult): ValidationCheck {
	const { price, internalCost, isContractPrice } = pricingResult;
	
	// Contract prices are exempt from this check
	if (isContractPrice && price < internalCost) {
		return {
			id: "price-vs-cost",
			name: "Price vs Cost",
			status: "WARNING",
			message: `Price below cost (Contract: ${price.toFixed(2)}€ < ${internalCost.toFixed(2)}€)`,
			details: {
				price,
				internalCost,
				difference: price - internalCost,
				isContractPrice: true,
			},
		};
	}
	
	if (price < internalCost) {
		return {
			id: "price-vs-cost",
			name: "Price vs Cost",
			status: "FAIL",
			message: `Selling price (${price.toFixed(2)}€) below internal cost (${internalCost.toFixed(2)}€)`,
			details: {
				price,
				internalCost,
				difference: price - internalCost,
			},
		};
	}
	
	// Check for unreasonably high markup
	const markup = internalCost > 0 ? (price / internalCost) : 1;
	if (markup > 10) {
		return {
			id: "price-vs-cost",
			name: "Price vs Cost",
			status: "WARNING",
			message: `Price is ${markup.toFixed(1)}x internal cost - verify pricing`,
			details: {
				price,
				internalCost,
				markup,
			},
		};
	}
	
	return {
		id: "price-vs-cost",
		name: "Price vs Cost",
		status: "PASS",
		message: `Price (${price.toFixed(2)}€) covers cost (${internalCost.toFixed(2)}€)`,
		details: {
			price,
			internalCost,
			markup: markup.toFixed(2),
		},
	};
}

/**
 * AC3: Validate zone multiplier consistency
 */
function validateZoneMultiplier(pricingResult: PricingResult): ValidationCheck {
	const { tripAnalysis, appliedRules } = pricingResult;
	
	// Find zone multiplier rule
	const zoneRule = appliedRules?.find(r => r.type === "ZONE_MULTIPLIER") as {
		type: string;
		multiplier?: number;
		appliedMultiplier?: number;
		pickupZone?: { multiplier: number };
		dropoffZone?: { multiplier: number };
		strategy?: string;
	} | undefined;
	
	if (!zoneRule) {
		return {
			id: "zone-multiplier",
			name: "Zone Multiplier",
			status: "PASS",
			message: "No zone multiplier applied",
			details: { applied: false },
		};
	}
	
	const appliedMultiplier = zoneRule.appliedMultiplier ?? zoneRule.multiplier ?? 1;
	const pickupMultiplier = zoneRule.pickupZone?.multiplier ?? 1;
	const dropoffMultiplier = zoneRule.dropoffZone?.multiplier ?? 1;
	
	// Verify multiplier is within expected range
	if (appliedMultiplier < 0.5 || appliedMultiplier > 3) {
		return {
			id: "zone-multiplier",
			name: "Zone Multiplier",
			status: "WARNING",
			message: `Zone multiplier (×${appliedMultiplier.toFixed(2)}) outside normal range (0.5-3.0)`,
			details: {
				appliedMultiplier,
				pickupMultiplier,
				dropoffMultiplier,
				strategy: zoneRule.strategy,
			},
		};
	}
	
	// Verify zone transparency data matches if available
	const zoneTransparency = tripAnalysis.zoneTransparency;
	if (zoneTransparency) {
		const transparencyMultiplier = zoneTransparency.multiplierApplication?.effectiveMultiplier;
		if (transparencyMultiplier && Math.abs(transparencyMultiplier - appliedMultiplier) > 0.01) {
			return {
				id: "zone-multiplier",
				name: "Zone Multiplier",
				status: "FAIL",
				message: `Zone multiplier mismatch: rule (×${appliedMultiplier.toFixed(2)}) vs transparency (×${transparencyMultiplier.toFixed(2)})`,
				details: {
					appliedMultiplier,
					transparencyMultiplier,
					difference: Math.abs(transparencyMultiplier - appliedMultiplier),
				},
			};
		}
	}
	
	return {
		id: "zone-multiplier",
		name: "Zone Multiplier",
		status: "PASS",
		message: `Zone multiplier correct (×${appliedMultiplier.toFixed(2)})`,
		details: {
			appliedMultiplier,
			pickupMultiplier,
			dropoffMultiplier,
			strategy: zoneRule.strategy,
		},
	};
}

/**
 * AC5: Validate duration is plausible for distance
 */
function validateDurationPlausible(tripAnalysis: TripAnalysis): ValidationCheck {
	const { totalDistanceKm, totalDurationMinutes } = tripAnalysis;
	
	if (totalDistanceKm <= 0 || totalDurationMinutes <= 0) {
		return {
			id: "duration-plausible",
			name: "Duration Plausible",
			status: "WARNING",
			message: "Missing distance or duration data",
			details: {
				totalDistanceKm,
				totalDurationMinutes,
			},
		};
	}
	
	// Calculate average speed
	const avgSpeedKmh = (totalDistanceKm / totalDurationMinutes) * 60;
	
	if (avgSpeedKmh < VALIDATION_THRESHOLDS.MIN_AVG_SPEED) {
		return {
			id: "duration-plausible",
			name: "Duration Plausible",
			status: "WARNING",
			message: `Very low average speed (${avgSpeedKmh.toFixed(1)} km/h) - verify duration`,
			details: {
				totalDistanceKm,
				totalDurationMinutes,
				avgSpeedKmh,
				minExpected: VALIDATION_THRESHOLDS.MIN_AVG_SPEED,
			},
		};
	}
	
	if (avgSpeedKmh > VALIDATION_THRESHOLDS.MAX_AVG_SPEED) {
		return {
			id: "duration-plausible",
			name: "Duration Plausible",
			status: "WARNING",
			message: `Very high average speed (${avgSpeedKmh.toFixed(1)} km/h) - verify distance`,
			details: {
				totalDistanceKm,
				totalDurationMinutes,
				avgSpeedKmh,
				maxExpected: VALIDATION_THRESHOLDS.MAX_AVG_SPEED,
			},
		};
	}
	
	return {
		id: "duration-plausible",
		name: "Duration Plausible",
		status: "PASS",
		message: `Duration plausible (${avgSpeedKmh.toFixed(1)} km/h avg)`,
		details: {
			totalDistanceKm,
			totalDurationMinutes,
			avgSpeedKmh,
		},
	};
}

/**
 * AC4: Validate staffing costs are proportional to trip duration
 */
function validateStaffingProportional(tripAnalysis: TripAnalysis): ValidationCheck {
	const { compliancePlan, totalDurationMinutes } = tripAnalysis;
	
	if (!compliancePlan || compliancePlan.planType === "NONE") {
		return {
			id: "staffing-proportional",
			name: "Staffing Proportional",
			status: "PASS",
			message: "No staffing costs applied",
			details: { hasStaffing: false },
		};
	}
	
	const costBreakdown = compliancePlan.costBreakdown;
	if (!costBreakdown) {
		return {
			id: "staffing-proportional",
			name: "Staffing Proportional",
			status: "PASS",
			message: "No staffing cost breakdown available",
			details: { hasStaffing: true, hasCosts: false },
		};
	}
	
	const totalHours = totalDurationMinutes / 60;
	const extraDriverCost = costBreakdown.extraDriverCost ?? 0;
	
	// Check if second driver cost is proportional to duration
	if (extraDriverCost > 0 && totalHours > 0) {
		const impliedHourlyRate = extraDriverCost / (totalHours / 2); // Assuming driver shares driving
		
		if (impliedHourlyRate < VALIDATION_THRESHOLDS.MIN_DRIVER_HOURLY_RATE) {
			return {
				id: "staffing-proportional",
				name: "Staffing Proportional",
				status: "WARNING",
				message: `Second driver rate seems low (${impliedHourlyRate.toFixed(2)}€/h)`,
				details: {
					extraDriverCost,
					totalHours,
					impliedHourlyRate,
					minExpected: VALIDATION_THRESHOLDS.MIN_DRIVER_HOURLY_RATE,
				},
			};
		}
		
		if (impliedHourlyRate > VALIDATION_THRESHOLDS.MAX_DRIVER_HOURLY_RATE) {
			return {
				id: "staffing-proportional",
				name: "Staffing Proportional",
				status: "WARNING",
				message: `Second driver rate seems high (${impliedHourlyRate.toFixed(2)}€/h)`,
				details: {
					extraDriverCost,
					totalHours,
					impliedHourlyRate,
					maxExpected: VALIDATION_THRESHOLDS.MAX_DRIVER_HOURLY_RATE,
				},
			};
		}
	}
	
	// Check hotel costs if present
	const hotelCost = costBreakdown.hotelCost ?? 0;
	const nights = compliancePlan.adjustedSchedule?.hotelNightsRequired ?? 0;
	const driverCount = compliancePlan.adjustedSchedule?.driversRequired ?? 1;
	
	if (hotelCost > 0 && nights > 0) {
		const impliedNightlyRate = hotelCost / (nights * driverCount);
		
		if (impliedNightlyRate < VALIDATION_THRESHOLDS.MIN_HOTEL_NIGHTLY_RATE ||
			impliedNightlyRate > VALIDATION_THRESHOLDS.MAX_HOTEL_NIGHTLY_RATE) {
			return {
				id: "staffing-proportional",
				name: "Staffing Proportional",
				status: "WARNING",
				message: `Hotel rate (${impliedNightlyRate.toFixed(2)}€/night) outside expected range`,
				details: {
					hotelCost,
					nights,
					driverCount,
					impliedNightlyRate,
					expectedRange: `${VALIDATION_THRESHOLDS.MIN_HOTEL_NIGHTLY_RATE}-${VALIDATION_THRESHOLDS.MAX_HOTEL_NIGHTLY_RATE}`,
				},
			};
		}
	}
	
	return {
		id: "staffing-proportional",
		name: "Staffing Proportional",
		status: "PASS",
		message: "Staffing costs proportional to trip duration",
		details: {
			planType: compliancePlan.planType,
			totalCost: compliancePlan.additionalCost,
			totalHours,
		},
	};
}

/**
 * AC5: Validate cost components sum to total
 */
function validateComponentsSum(tripAnalysis: TripAnalysis): ValidationCheck {
	const { costBreakdown, totalInternalCost } = tripAnalysis;
	
	if (!costBreakdown) {
		return {
			id: "components-sum",
			name: "Components Sum",
			status: "WARNING",
			message: "No cost breakdown available",
			details: { hasCostBreakdown: false },
		};
	}
	
	// Sum all components
	const componentsSum = 
		(costBreakdown.fuel?.amount ?? 0) +
		(costBreakdown.tolls?.amount ?? 0) +
		(costBreakdown.wear?.amount ?? 0) +
		(costBreakdown.driver?.amount ?? 0) +
		(costBreakdown.parking?.amount ?? 0) +
		(costBreakdown.zoneSurcharges?.total ?? 0) +
		(costBreakdown.tco?.amount ?? 0);
	
	const breakdownTotal = costBreakdown.total ?? componentsSum;
	
	// Check if components sum matches breakdown total
	const componentsDiff = Math.abs(componentsSum - breakdownTotal);
	const componentsDiffPercent = breakdownTotal > 0 ? (componentsDiff / breakdownTotal) * 100 : 0;
	
	if (componentsDiffPercent > VALIDATION_THRESHOLDS.COMPONENT_SUM_TOLERANCE_PERCENT) {
		return {
			id: "components-sum",
			name: "Components Sum",
			status: "WARNING",
			message: `Cost components (${componentsSum.toFixed(2)}€) don't match total (${breakdownTotal.toFixed(2)}€)`,
			details: {
				componentsSum,
				breakdownTotal,
				difference: componentsDiff,
				differencePercent: componentsDiffPercent,
			},
		};
	}
	
	// Check if breakdown total matches trip analysis total
	const totalDiff = Math.abs(breakdownTotal - totalInternalCost);
	const totalDiffPercent = totalInternalCost > 0 ? (totalDiff / totalInternalCost) * 100 : 0;
	
	if (totalDiffPercent > VALIDATION_THRESHOLDS.COMPONENT_SUM_TOLERANCE_PERCENT) {
		return {
			id: "components-sum",
			name: "Components Sum",
			status: "WARNING",
			message: `Breakdown total (${breakdownTotal.toFixed(2)}€) differs from internal cost (${totalInternalCost.toFixed(2)}€)`,
			details: {
				breakdownTotal,
				totalInternalCost,
				difference: totalDiff,
				differencePercent: totalDiffPercent,
			},
		};
	}
	
	return {
		id: "components-sum",
		name: "Components Sum",
		status: "PASS",
		message: `Components sum matches total (${breakdownTotal.toFixed(2)}€)`,
		details: {
			componentsSum,
			breakdownTotal,
			totalInternalCost,
			components: {
				fuel: costBreakdown.fuel?.amount ?? 0,
				tolls: costBreakdown.tolls?.amount ?? 0,
				wear: costBreakdown.wear?.amount ?? 0,
				driver: costBreakdown.driver?.amount ?? 0,
				parking: costBreakdown.parking?.amount ?? 0,
				zoneSurcharges: costBreakdown.zoneSurcharges?.total ?? 0,
				tco: costBreakdown.tco?.amount ?? 0,
			},
		},
	};
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an audit log entry from a pricing result and validation
 */
export function createAuditLogEntry(
	pricingResult: PricingResult,
	validation: ValidationResult,
	eventType: "INITIAL_CALC" | "RECALCULATE" | "PRICE_OVERRIDE",
	triggeredBy: "SYSTEM" | "USER",
	userId?: string,
): import("./types").AuditLogEntry {
	return {
		id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		timestamp: new Date().toISOString(),
		eventType,
		price: pricingResult.price,
		internalCost: pricingResult.internalCost,
		marginPercent: pricingResult.marginPercent,
		validationStatus: validation.overallStatus,
		warnings: validation.warnings,
		errors: validation.errors,
		triggeredBy,
		userId,
	};
}

/**
 * Get validation status icon for UI
 */
export function getValidationStatusIcon(status: ValidationCheckStatus): string {
	switch (status) {
		case "PASS":
			return "✅";
		case "WARNING":
			return "⚠️";
		case "FAIL":
			return "❌";
		default:
			return "❓";
	}
}

/**
 * Get overall validation status icon for UI
 */
export function getOverallStatusIcon(status: ValidationOverallStatus): string {
	switch (status) {
		case "VALID":
			return "✅";
		case "WARNING":
			return "⚠️";
		case "INVALID":
			return "❌";
		default:
			return "❓";
	}
}
