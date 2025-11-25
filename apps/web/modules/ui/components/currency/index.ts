/**
 * EUR Currency Components
 *
 * Components for displaying and inputting EUR monetary values.
 * The VTC ERP is EUR-only by design (FR39).
 *
 * @see docs/bmad/prd.md#FR39
 */

export {
  EURDisplay,
  EURDisplayInline,
  EURDisplayLarge,
  type EURDisplayProps,
} from "./EURDisplay";

export { EURInput, type EURInputProps } from "./EURInput";

/**
 * Currency constants
 */
export const CURRENCY_CODE = "EUR" as const;
export const CURRENCY_SYMBOL = "€" as const;
export const EUR_LOCALE = "fr-FR" as const;
