/**
 * Zone Resolver Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles zone-related pricing functions:
 * - Zone multiplier calculation and application
 * - Zone conflict resolution strategies
 * - Zone multiplier aggregation strategies
 */

import type {
	ZoneData,
	ZoneMultiplierAggregationStrategy,
	ZoneMultiplierResult,
	AppliedRule,
} from "./types";

// ============================================================================
// Zone Multiplier Calculation
// ============================================================================

/**
 * Story 17.2: Calculate effective multiplier based on aggregation strategy
 * 
 * @param pickupMultiplier - The pickup zone multiplier
 * @param dropoffMultiplier - The dropoff zone multiplier
 * @param strategy - The aggregation strategy to use (null = MAX for backward compatibility)
 * @returns Effective multiplier and source information
 */
export function calculateEffectiveZoneMultiplier(
	pickupMultiplier: number,
	dropoffMultiplier: number,
	strategy: ZoneMultiplierAggregationStrategy | null,
): { multiplier: number; source: "pickup" | "dropoff" | "both" } {
	const effectiveStrategy = strategy ?? "MAX";

	switch (effectiveStrategy) {
		case "MAX": {
			const isPickupHigher = pickupMultiplier >= dropoffMultiplier;
			return {
				multiplier: Math.max(pickupMultiplier, dropoffMultiplier),
				source: isPickupHigher ? "pickup" : "dropoff",
			};
		}
		case "PICKUP_ONLY":
			return { multiplier: pickupMultiplier, source: "pickup" };
		case "DROPOFF_ONLY":
			return { multiplier: dropoffMultiplier, source: "dropoff" };
		case "AVERAGE":
			return {
				multiplier: Math.round(((pickupMultiplier + dropoffMultiplier) / 2) * 1000) / 1000,
				source: "both",
			};
		default:
			return {
				multiplier: Math.max(pickupMultiplier, dropoffMultiplier),
				source: pickupMultiplier >= dropoffMultiplier ? "pickup" : "dropoff",
			};
	}
}

/**
 * Apply zone pricing multiplier based on pickup and dropoff zones
 * 
 * Story 16.3: Always includes ZONE_MULTIPLIER rule for transparency
 * Story 17.2: Added configurable aggregation strategy support
 * 
 * @param basePrice - The base price before zone multiplier
 * @param pickupZone - The pickup zone data (may include priceMultiplier)
 * @param dropoffZone - The dropoff zone data (may include priceMultiplier)
 * @param strategy - The aggregation strategy to use (null = MAX for backward compatibility)
 * @returns Zone multiplier result with adjusted price and applied rule
 */
export function applyZoneMultiplier(
	basePrice: number,
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	strategy?: ZoneMultiplierAggregationStrategy | null,
): ZoneMultiplierResult {
	const pickupMultiplier = pickupZone?.priceMultiplier ?? 1.0;
	const dropoffMultiplier = dropoffZone?.priceMultiplier ?? 1.0;
	
	const { multiplier: effectiveMultiplier, source } = calculateEffectiveZoneMultiplier(
		pickupMultiplier,
		dropoffMultiplier,
		strategy ?? null,
	);
	
	const sourceZone = source === "pickup" ? pickupZone : 
		source === "dropoff" ? dropoffZone : null;
	
	const adjustedPrice = Math.round(basePrice * effectiveMultiplier * 100) / 100;
	
	const effectiveStrategy: ZoneMultiplierAggregationStrategy = strategy ?? "MAX";
	
	let description: string;
	if (effectiveMultiplier === 1.0) {
		description = `Zone multiplier: no adjustment (${pickupZone?.code ?? "UNKNOWN"} → ${dropoffZone?.code ?? "UNKNOWN"})`;
	} else if (source === "both") {
		description = `Zone multiplier applied: average of ${pickupZone?.name ?? "Unknown"} (${pickupMultiplier}×) and ${dropoffZone?.name ?? "Unknown"} (${dropoffMultiplier}×) = ${effectiveMultiplier}×`;
	} else {
		description = `Zone multiplier applied: ${sourceZone?.name ?? "Unknown"} (${effectiveMultiplier}×) [${effectiveStrategy}]`;
	}
	
	const appliedRule: AppliedRule = {
		type: "ZONE_MULTIPLIER",
		description,
		strategy: effectiveStrategy,
		pickupZone: {
			code: pickupZone?.code ?? "UNKNOWN",
			name: pickupZone?.name ?? "Unknown",
			multiplier: pickupMultiplier,
		},
		dropoffZone: {
			code: dropoffZone?.code ?? "UNKNOWN",
			name: dropoffZone?.name ?? "Unknown",
			multiplier: dropoffMultiplier,
		},
		appliedMultiplier: effectiveMultiplier,
		source,
		priceBefore: basePrice,
		priceAfter: adjustedPrice,
	};
	
	return {
		adjustedPrice,
		appliedMultiplier: effectiveMultiplier,
		appliedRule,
	};
}
