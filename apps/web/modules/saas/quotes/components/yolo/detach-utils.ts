/**
 * Story 26.9: Operational Detach Logic - Utility Functions
 *
 * Provides utilities for detecting sensitive field changes and calculating
 * label similarity to protect operational data integrity.
 */

/**
 * List of fields that are considered "sensitive" and require detach confirmation
 * when modified on a CALCULATED line.
 */
export const SENSITIVE_FIELDS = [
  'pickupAt',
  'dropoffAt',
  'startAt',
  'endAt',
  'origin',
  'destination',
  'pickupAddress',
  'dropoffAddress',
  'route',
  'distance',
  'duration',
] as const;

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

/**
 * Represents a field change event
 */
export interface FieldChangeEvent {
  /** Name of the field being changed */
  fieldName: string;
  /** Original value before change */
  originalValue: unknown;
  /** New value after change */
  newValue: unknown;
}

/**
 * Result of a detach check operation
 */
export interface DetachCheckResult {
  /** Whether the change requires a detach confirmation */
  requiresDetach: boolean;
  /** Whether the change is significant but doesn't require full detach */
  isSignificantChange: boolean;
  /** Reason for the result */
  reason: 'sensitive_field' | 'significant_label_change' | 'minor_change' | 'no_change';
  /** Human-readable message */
  message: string;
}

/**
 * Check if a field is considered sensitive for operational integrity
 *
 * @param fieldName - The name of the field to check
 * @returns true if the field is sensitive
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELDS.includes(fieldName as SensitiveField);
}

/**
 * Check if a field change is sensitive and requires detach confirmation
 *
 * @param change - The field change event
 * @returns true if the change requires detach confirmation
 */
export function isSensitiveFieldChange(change: FieldChangeEvent): boolean {
  // Check if the field itself is sensitive
  if (!isSensitiveField(change.fieldName)) {
    return false;
  }

  // Check if values are different
  const originalStr = String(change.originalValue ?? '');
  const newStr = String(change.newValue ?? '');

  return originalStr !== newStr;
}

/**
 * Calculate the similarity between two strings using Levenshtein distance
 * normalized to a 0-1 scale where 1 = identical, 0 = completely different
 *
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score between 0 and 1
 */
export function calculateLabelSimilarity(a: string, b: string): number {
  // Handle edge cases
  if (a === b) return 1;
  if (!a || !b) return 0;

  // Normalize strings for comparison
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();

  if (normalizedA === normalizedB) return 1;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  // Normalize to 0-1 scale (1 - normalized distance)
  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 * Uses dynamic programming approach for efficiency
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance between the strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Create matrix
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Threshold below which a label change is considered "significant"
 * 0.5 means less than 50% similar = significant change
 */
export const LABEL_SIMILARITY_THRESHOLD = 0.5;

/**
 * Check if a label change is significant enough to warrant a warning
 *
 * @param originalLabel - The original label value
 * @param newLabel - The new label value
 * @returns true if the change is significant
 */
export function isSignificantLabelChange(
  originalLabel: string,
  newLabel: string
): boolean {
  const similarity = calculateLabelSimilarity(originalLabel, newLabel);
  return similarity < LABEL_SIMILARITY_THRESHOLD;
}

/**
 * Comprehensive check for whether a change requires detach or warning
 *
 * @param change - The field change event
 * @param originalLabel - Original label for comparison (optional)
 * @returns DetachCheckResult with full details
 */
export function checkDetachRequirement(
  change: FieldChangeEvent,
  originalLabel?: string
): DetachCheckResult {
  // Check for sensitive field changes first
  if (isSensitiveFieldChange(change)) {
    return {
      requiresDetach: true,
      isSignificantChange: true,
      reason: 'sensitive_field',
      message: `Modifying "${change.fieldName}" will detach this line from the operational route.`,
    };
  }

  // Check for significant label changes
  if (change.fieldName === 'label' && originalLabel) {
    const newLabel = String(change.newValue ?? '');
    if (isSignificantLabelChange(originalLabel, newLabel)) {
      return {
        requiresDetach: false,
        isSignificantChange: true,
        reason: 'significant_label_change',
        message:
          'You have significantly modified the label. The operational data remains unchanged.',
      };
    }
  }

  // Check if there was any change at all
  const originalStr = String(change.originalValue ?? '');
  const newStr = String(change.newValue ?? '');

  if (originalStr === newStr) {
    return {
      requiresDetach: false,
      isSignificantChange: false,
      reason: 'no_change',
      message: 'No change detected.',
    };
  }

  // Minor change - no action needed
  return {
    requiresDetach: false,
    isSignificantChange: false,
    reason: 'minor_change',
    message: 'Minor change - operational data unaffected.',
  };
}

/**
 * Helper to extract the original label from sourceData
 *
 * @param sourceData - The source data object
 * @returns The original label or empty string
 */
export function getOriginalLabelFromSource(
  sourceData: Record<string, unknown> | null | undefined
): string {
  if (!sourceData) return '';

  // Try common label field names
  const labelFields = ['label', 'description', 'route', 'tripDescription'];
  for (const field of labelFields) {
    if (typeof sourceData[field] === 'string') {
      return sourceData[field] as string;
    }
  }

  // Try to construct from origin/destination
  if (sourceData.origin && sourceData.destination) {
    return `${sourceData.origin} → ${sourceData.destination}`;
  }

  return '';
}
