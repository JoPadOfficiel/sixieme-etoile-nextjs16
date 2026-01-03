/**
 * Zone Resolver Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * Story 21.8: Enhanced with zone transparency data generation
 * 
 * This module handles zone-related pricing functions:
 * - Zone multiplier calculation and application
 * - Zone conflict resolution strategies
 * - Zone multiplier aggregation strategies
 * - Zone transparency data generation
 */

import type {
	ZoneData,
	ZoneMultiplierAggregationStrategy,
	ZoneMultiplierResult,
	AppliedRule,
	ZoneTransparencyInfo,
	ZoneDetectionInfo,
	ZoneCandidateInfo,
	ZoneConflictResolutionInfo,
	ZoneMultiplierApplicationInfo,
	ZoneSurchargesInfo,
	ZoneSurchargeInfo,
	ZoneConflictStrategy,
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

// ============================================================================
// Story 21.8: Zone Transparency Data Generation
// ============================================================================

/**
 * Build zone detection info for a single point (pickup or dropoff)
 * 
 * @param point - The geographic point
 * @param selectedZone - The zone that was selected
 * @param candidateZones - All zones that contained the point
 * @param strategy - The conflict resolution strategy used
 */
export function buildZoneDetectionInfo(
	point: { lat: number; lng: number },
	selectedZone: ZoneData | null,
	candidateZones: ZoneData[],
	strategy: ZoneConflictStrategy | null,
): ZoneDetectionInfo {
	const candidates: ZoneCandidateInfo[] = candidateZones.map((zone) => {
		const isSelected = zone.id === selectedZone?.id;
		let rejectionReason: string | undefined;
		
		if (!isSelected && candidateZones.length > 1) {
			// Determine why this zone was rejected based on strategy
			if (strategy === "PRIORITY" && selectedZone) {
				if ((zone.priority ?? 0) < (selectedZone.priority ?? 0)) {
					rejectionReason = `Lower priority (${zone.priority ?? 0} < ${selectedZone.priority ?? 0})`;
				}
			} else if (strategy === "MOST_EXPENSIVE" && selectedZone) {
				if ((zone.priceMultiplier ?? 1) < (selectedZone.priceMultiplier ?? 1)) {
					rejectionReason = `Lower multiplier (${zone.priceMultiplier ?? 1}× < ${selectedZone.priceMultiplier ?? 1}×)`;
				}
			} else if (strategy === "CLOSEST") {
				rejectionReason = "Further from point center";
			} else if (strategy === "COMBINED" && selectedZone) {
				const zonePriority = zone.priority ?? 0;
				const selectedPriority = selectedZone.priority ?? 0;
				if (zonePriority < selectedPriority) {
					rejectionReason = `Lower priority (${zonePriority} < ${selectedPriority})`;
				} else if (zonePriority === selectedPriority) {
					if ((zone.priceMultiplier ?? 1) < (selectedZone.priceMultiplier ?? 1)) {
						rejectionReason = `Same priority, lower multiplier`;
					}
				}
			} else {
				// Default specificity-based rejection
				rejectionReason = "Less specific zone type";
			}
		}
		
		return {
			id: zone.id,
			code: zone.code,
			name: zone.name,
			type: zone.zoneType,
			multiplier: zone.priceMultiplier ?? 1.0,
			priority: zone.priority,
			rejected: !isSelected,
			rejectionReason,
		};
	});
	
	return {
		selectedZone: selectedZone ? {
			id: selectedZone.id,
			code: selectedZone.code,
			name: selectedZone.name,
			type: selectedZone.zoneType,
		} : null,
		candidateZones: candidates,
		detectionCoordinates: point,
		detectionMethod: selectedZone?.zoneType ?? "NONE",
	};
}

/**
 * Build zone surcharge info for a zone
 */
export function buildZoneSurchargeInfo(zone: ZoneData | null): ZoneSurchargeInfo | null {
	if (!zone) return null;
	
	const parkingSurcharge = zone.fixedParkingSurcharge ?? 0;
	const accessFee = zone.fixedAccessFee ?? 0;
	
	if (parkingSurcharge === 0 && accessFee === 0) {
		return null;
	}
	
	return {
		zoneId: zone.id,
		zoneCode: zone.code,
		zoneName: zone.name,
		parkingSurcharge,
		accessFee,
		description: zone.surchargeDescription ?? null,
	};
}

/**
 * Build complete zone transparency info
 * 
 * Story 21.8: Generates comprehensive zone transparency data for display
 * in the TripTransparency panel.
 * 
 * @param pickupPoint - Pickup coordinates
 * @param dropoffPoint - Dropoff coordinates
 * @param pickupZone - Selected pickup zone
 * @param dropoffZone - Selected dropoff zone
 * @param pickupCandidates - All zones containing pickup point
 * @param dropoffCandidates - All zones containing dropoff point
 * @param conflictStrategy - Zone conflict resolution strategy
 * @param aggregationStrategy - Zone multiplier aggregation strategy
 * @param priceBefore - Price before zone multiplier
 * @param priceAfter - Price after zone multiplier
 */
export function buildZoneTransparencyInfo(
	pickupPoint: { lat: number; lng: number },
	dropoffPoint: { lat: number; lng: number },
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	pickupCandidates: ZoneData[],
	dropoffCandidates: ZoneData[],
	conflictStrategy: ZoneConflictStrategy | null,
	aggregationStrategy: ZoneMultiplierAggregationStrategy | null,
	priceBefore: number,
	priceAfter: number,
): ZoneTransparencyInfo {
	const effectiveAggregationStrategy = aggregationStrategy ?? "MAX";
	
	const pickupMultiplier = pickupZone?.priceMultiplier ?? 1.0;
	const dropoffMultiplier = dropoffZone?.priceMultiplier ?? 1.0;
	
	const { multiplier: effectiveMultiplier, source } = calculateEffectiveZoneMultiplier(
		pickupMultiplier,
		dropoffMultiplier,
		effectiveAggregationStrategy,
	);
	
	const pickupSurcharge = buildZoneSurchargeInfo(pickupZone);
	const dropoffSurcharge = buildZoneSurchargeInfo(dropoffZone);
	const totalSurcharges = 
		(pickupSurcharge?.parkingSurcharge ?? 0) + 
		(pickupSurcharge?.accessFee ?? 0) +
		(dropoffSurcharge?.parkingSurcharge ?? 0) + 
		(dropoffSurcharge?.accessFee ?? 0);
	
	return {
		pickup: buildZoneDetectionInfo(pickupPoint, pickupZone, pickupCandidates, conflictStrategy),
		dropoff: buildZoneDetectionInfo(dropoffPoint, dropoffZone, dropoffCandidates, conflictStrategy),
		conflictResolution: {
			strategy: conflictStrategy,
			pickupConflictResolved: pickupCandidates.length > 1,
			dropoffConflictResolved: dropoffCandidates.length > 1,
			pickupCandidateCount: pickupCandidates.length,
			dropoffCandidateCount: dropoffCandidates.length,
		},
		multiplierApplication: {
			pickupMultiplier,
			dropoffMultiplier,
			aggregationStrategy: effectiveAggregationStrategy,
			effectiveMultiplier,
			source,
			priceBefore,
			priceAfter,
		},
		surcharges: {
			pickup: pickupSurcharge,
			dropoff: dropoffSurcharge,
			total: totalSurcharges,
		},
	};
}
