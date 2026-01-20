/**
 * Placeholder replacement utilities for invoice descriptions
 * Story 28.10: Execution Feedback Loop (Placeholders)
 *
 * Supports dynamic tokens that are replaced with mission execution data:
 * - {{driver}} - Driver name
 * - {{plate}} - Vehicle license plate
 * - {{start}} - Mission start time
 * - {{end}} - Mission end time
 */

export interface MissionContext {
  driverName: string | null;
  vehiclePlate: string | null;
  startAt: string | null;
  endAt: string | null;
}

/**
 * Placeholder tokens supported by the system
 */
export const PLACEHOLDER_TOKENS = [
  "{{driver}}",
  "{{plate}}",
  "{{start}}",
  "{{end}}",
] as const;

export type PlaceholderToken = (typeof PLACEHOLDER_TOKENS)[number];

/**
 * Default value shown when a placeholder cannot be resolved
 */
const UNASSIGNED_VALUE = "[Non assigné]";

/**
 * Format a date string for display
 */
function formatDateTime(isoString: string | null): string {
  if (!isoString) return UNASSIGNED_VALUE;
  try {
    const date = new Date(isoString);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return UNASSIGNED_VALUE;
  }
}

/**
 * Replace placeholders in text with actual mission context values
 *
 * @param text - The text containing placeholders like {{driver}}
 * @param context - The mission context with actual values
 * @returns The text with placeholders replaced by actual values
 *
 * @example
 * ```ts
 * const result = replacePlaceholders(
 *   "Transfert par {{driver}} avec {{plate}}",
 *   { driverName: "John Doe", vehiclePlate: "AB-123-CD", startAt: null, endAt: null }
 * );
 * // Returns: "Transfert par John Doe avec AB-123-CD"
 * ```
 */
export function replacePlaceholders(
  text: string,
  context: MissionContext
): string {
  if (!text) return text;

  // Build replacement map
  const replacements: Record<PlaceholderToken, string> = {
    "{{driver}}": context.driverName || UNASSIGNED_VALUE,
    "{{plate}}": context.vehiclePlate || UNASSIGNED_VALUE,
    "{{start}}": formatDateTime(context.startAt),
    "{{end}}": formatDateTime(context.endAt),
  };

  // Replace all placeholders using regex
  let result = text;
  for (const [token, value] of Object.entries(replacements)) {
    // Escape special regex characters in token
    const escapedToken = token.replace(/[{}]/g, "\\$&");
    const regex = new RegExp(escapedToken, "g");
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Check if a text contains any placeholders
 *
 * @param text - The text to check
 * @returns true if the text contains at least one placeholder
 */
export function hasPlaceholders(text: string): boolean {
  if (!text) return false;
  return PLACEHOLDER_TOKENS.some((token) => text.includes(token));
}

/**
 * Get all placeholders found in a text
 *
 * @param text - The text to scan
 * @returns Array of placeholder tokens found in the text
 */
export function findPlaceholders(text: string): PlaceholderToken[] {
  if (!text) return [];
  return PLACEHOLDER_TOKENS.filter((token) => text.includes(token));
}

/**
 * Replace placeholders in multiple invoice line descriptions
 *
 * @param lines - Array of objects with description field
 * @param context - The mission context
 * @returns New array with descriptions replaced (immutable)
 */
export function replaceAllPlaceholders<T extends { description: string }>(
  lines: T[],
  context: MissionContext
): T[] {
  return lines.map((line) => ({
    ...line,
    description: replacePlaceholders(line.description, context),
  }));
}
