import { z } from "zod";

/**
 * Story 29.3: Zod schema for QuoteLine.sourceData validation
 *
 * This schema validates the sourceData JSON field stored in QuoteLine.
 * It uses passthrough() to allow extra fields for forward compatibility.
 */

export const sourceDataSchema = z
	.object({
		origin: z.string().optional(),
		destination: z.string().optional(),
		distance: z.number().optional(),
		duration: z.number().optional(),
		basePrice: z.number().optional(),
		pickupAt: z.string().optional(),
		formData: z.record(z.unknown()).optional(),
		pricingResult: z.record(z.unknown()).optional(),
	})
	.passthrough();

export type SourceData = z.infer<typeof sourceDataSchema>;

/**
 * Safely parse sourceData with fallback to empty object
 */
export function parseSourceData(data: unknown): SourceData {
	const result = sourceDataSchema.safeParse(data);
	return result.success ? result.data : {};
}
