/**
 * Settings Pricing Hooks
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
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

export {
	useOptionalFees,
	useOptionalFeeStats,
	useOptionalFee,
	useCreateOptionalFee,
	useUpdateOptionalFee,
	useDeleteOptionalFee,
	optionalFeeKeys,
} from "./useOptionalFees";
