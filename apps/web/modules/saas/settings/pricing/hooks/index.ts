/**
 * Settings Pricing Hooks
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 */

export {
	useSeasonalMultipliers,
	useSeasonalMultiplierStats,
	useSeasonalMultiplier,
	useCreateSeasonalMultiplier,
	useUpdateSeasonalMultiplier,
	useDeleteSeasonalMultiplier,
	seasonalMultiplierKeys,
} from "./useSeasonalMultipliers";

export {
	useAdvancedRates,
	useAdvancedRateStats,
	useAdvancedRate,
	useCreateAdvancedRate,
	useUpdateAdvancedRate,
	useDeleteAdvancedRate,
	advancedRatesKeys,
} from "./useAdvancedRates";
