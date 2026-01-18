/**
 * Story 26.3: Hybrid Block Validation Layer (Zod)
 * 
 * Comprehensive API validation schemas for the Hybrid Blocks architecture.
 * Validates quote and invoice line items with type-specific rules:
 * - CALCULATED: requires sourceData (GPS/pricing engine traceability)
 * - MANUAL: allows null sourceData (user-entered values)
 * - GROUP: cannot be nested (max depth = 1), top-level only
 * 
 * NOTE: This file imports and re-exports Prisma-generated Zod enums to ensure
 * consistency with the database schema. Do not manually redefine enums here.
 */

import { z } from 'zod';

// =============================================================================
// ENUMS (re-exported from Prisma-generated Zod schemas for consistency)
// =============================================================================

// Import generated enums from zod-prisma-types to ensure sync with Prisma schema
import {
  QuoteLineTypeSchema,
  MissionStatusSchema,
  PricingModeSchema,
  TripTypeSchema,
  type QuoteLineTypeType,
  type MissionStatusType,
  type PricingModeType,
  type TripTypeType,
} from '../zod';

// Re-export with Input suffix for API validation consistency
export const QuoteLineTypeInputSchema = QuoteLineTypeSchema;
export type QuoteLineTypeInput = QuoteLineTypeType;

export const MissionStatusInputSchema = MissionStatusSchema;
export type MissionStatusInput = MissionStatusType;

export const PricingModeInputSchema = PricingModeSchema;
export type PricingModeInput = PricingModeType;

export const TripTypeInputSchema = TripTypeSchema;
export type TripTypeInput = TripTypeType;

// =============================================================================
// DECIMAL HELPERS
// =============================================================================

/**
 * Accepts number, string (parseFloat), or Decimal-like object
 * Coerces to number for validation, Prisma handles Decimal conversion
 */
export const DecimalInputSchema = z.union([
  z.number(),
  z.string().refine(
    (val) => !isNaN(parseFloat(val)),
    { message: 'Must be a valid numeric string' }
  ).transform((val) => parseFloat(val)),
]);

export const PositiveDecimalSchema = DecimalInputSchema.refine(
  (val) => val > 0,
  { message: 'Must be greater than 0' }
);

export const NonNegativeDecimalSchema = DecimalInputSchema.refine(
  (val) => val >= 0,
  { message: 'Must be greater than or equal to 0' }
);

// =============================================================================
// QUOTE LINE SOURCE DATA SCHEMA
// =============================================================================

/**
 * Source data for CALCULATED quote/invoice lines
 * Stores the original pricing engine output for traceability
 * Based on QuoteLineSourceData interface from Story 26.1
 */
export const QuoteLineSourceDataSchema = z.object({
  // Pricing context - REQUIRED for CALCULATED lines
  pricingMode: PricingModeInputSchema,
  tripType: TripTypeInputSchema,
  calculatedAt: z.string().datetime({ message: 'Must be ISO datetime string' }),

  // Trip details - optional
  pickupAddress: z.string().optional(),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  dropoffAddress: z.string().optional(),
  dropoffLatitude: z.number().optional(),
  dropoffLongitude: z.number().optional(),

  // Distance and duration
  distanceKm: z.number().nonnegative().optional(),
  durationMinutes: z.number().nonnegative().optional(),

  // Pricing breakdown
  basePrice: z.number().nonnegative().optional(),
  fuelCost: z.number().nonnegative().optional(),
  tollCost: z.number().nonnegative().optional(),
  driverCost: z.number().nonnegative().optional(),
  wearCost: z.number().nonnegative().optional(),

  // Applied rules and multipliers
  appliedZoneMultiplier: z.number().optional(),
  appliedAdvancedRates: z.array(z.string()).optional(),
  appliedPromotions: z.array(z.string()).optional(),
  appliedOptionalFees: z.array(z.string()).optional(),

  // Vehicle category
  vehicleCategoryId: z.string().optional(),
  vehicleCategoryCode: z.string().optional(),
}).strict();

export type QuoteLineSourceDataInput = z.infer<typeof QuoteLineSourceDataSchema>;

// =============================================================================
// QUOTE LINE DISPLAY DATA SCHEMA
// =============================================================================

/**
 * Display data for quote/invoice lines
 * User-editable values that can override source data for display
 * Based on QuoteLineDisplayData interface from Story 26.1
 */
export const QuoteLineDisplayDataSchema = z.object({
  // Display label - REQUIRED
  label: z.string().min(1, { message: 'Label is required and cannot be empty' }),

  // Extended description - optional
  description: z.string().optional(),

  // Unit label for quantity (e.g., "trajet", "heure", "jour")
  unitLabel: z.string().optional(),

  // Optional grouped total (for GROUP type lines)
  groupSubtotal: z.number().nonnegative().optional(),
}).strict();

export type QuoteLineDisplayDataInput = z.infer<typeof QuoteLineDisplayDataSchema>;

// =============================================================================
// QUOTE LINE INPUT SCHEMA (Base - without id for creation)
// =============================================================================

/**
 * Base schema for a single quote line item (without array validation)
 * Type-specific validation is handled via refinements
 */
export const QuoteLineInputBaseSchema = z.object({
  // Optional tempId for frontend reference before persistence
  tempId: z.string().optional(),
  
  // If updating, the actual id
  id: z.string().cuid().optional(),
  
  // Type is REQUIRED
  type: QuoteLineTypeInputSchema,

  // Label is REQUIRED
  label: z.string().min(1, { message: 'Label is required' }),

  // Description is optional
  description: z.string().nullable().optional(),

  // sourceData - type-specific validation done in refinement
  sourceData: QuoteLineSourceDataSchema.nullable().optional(),

  // displayData - REQUIRED
  displayData: QuoteLineDisplayDataSchema,

  // Pricing fields
  quantity: PositiveDecimalSchema.default(1),
  unitPrice: NonNegativeDecimalSchema,
  totalPrice: NonNegativeDecimalSchema,
  vatRate: z.number().min(0).max(100).default(10),

  // Hierarchy
  parentId: z.string().cuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

/**
 * Quote Line Input Schema with type-specific refinements
 */
export const QuoteLineInputSchema = QuoteLineInputBaseSchema.superRefine((data, ctx) => {
  // Rule 1: CALCULATED lines MUST have sourceData
  if (data.type === 'CALCULATED' && !data.sourceData) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CALCULATED lines require sourceData with pricing engine output',
      path: ['sourceData'],
    });
  }

  // Rule 2: GROUP lines CANNOT have a parentId (top-level only)
  if (data.type === 'GROUP' && data.parentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GROUP lines cannot be nested - they must be top-level (no parentId)',
      path: ['parentId'],
    });
  }
});

export type QuoteLineInput = z.infer<typeof QuoteLineInputSchema>;

// =============================================================================
// QUOTE LINES ARRAY SCHEMA (with hierarchical validation)
// =============================================================================

/**
 * Validates an array of quote lines with hierarchical rules:
 * - All parentId references must exist in the array
 * - Only GROUP type lines can be parents
 * - GROUP cannot be nested (GROUP cannot have parentId pointing to GROUP)
 */
export const QuoteLinesArraySchema = z.array(QuoteLineInputSchema).superRefine((lines, ctx) => {
  // Build a map of all line identifiers (id or tempId)
  const lineMap = new Map<string, QuoteLineInput>();

  lines.forEach((line) => {
    const lineId = line.id || line.tempId;
    if (lineId) {
      lineMap.set(lineId, line);
    }
  });

  // Validate each line's parentId
  lines.forEach((line, index) => {
    if (line.parentId) {
      // Rule 1: parentId must reference an existing line
      if (!lineMap.has(line.parentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `parentId "${line.parentId}" references a non-existent line`,
          path: [index, 'parentId'],
        });
        return;
      }

      const parent = lineMap.get(line.parentId)!;

      // Rule 2: Parent must be of type GROUP
      if (parent.type !== 'GROUP') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `parentId references a "${parent.type}" line, but only GROUP lines can be parents`,
          path: [index, 'parentId'],
        });
      }

      // Rule 3: GROUP cannot be nested (handled in individual schema, but double-check)
      if (line.type === 'GROUP') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GROUP lines cannot have a parent - nesting is not allowed (max depth = 1)',
          path: [index, 'parentId'],
        });
      }
    }
  });

  // Additional: Check for circular references (paranoid check)
  const visited = new Set<string>();
  const checkCycle = (lineId: string, path: string[]): boolean => {
    if (path.includes(lineId)) return true; // Cycle detected
    const line = lineMap.get(lineId);
    if (!line || !line.parentId) return false;
    return checkCycle(line.parentId, [...path, lineId]);
  };

  lines.forEach((line, index) => {
    const lineId = line.id || line.tempId;
    if (lineId && line.parentId && checkCycle(lineId, [])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Circular parentId reference detected',
        path: [index, 'parentId'],
      });
    }
  });
});

export type QuoteLinesArrayInput = z.infer<typeof QuoteLinesArraySchema>;

// =============================================================================
// INVOICE LINE INPUT SCHEMA
// =============================================================================

/**
 * Invoice line input - mirrors quote line with additional invoice-specific fields
 */
export const InvoiceLineInputBaseSchema = z.object({
  // Optional tempId for frontend reference
  tempId: z.string().optional(),
  
  // If updating
  id: z.string().cuid().optional(),
  
  // Invoice reference
  invoiceId: z.string().cuid().optional(), // Optional for creation via array

  // Block type (from Quote conversion)
  blockType: QuoteLineTypeInputSchema.default('CALCULATED'),

  // Description (maps to 'description' column)
  description: z.string().min(1, { message: 'Description is required' }),

  // sourceData and displayData (hybrid blocks)
  sourceData: QuoteLineSourceDataSchema.nullable().optional(),
  displayData: QuoteLineDisplayDataSchema.nullable().optional(),

  // Pricing fields
  quantity: PositiveDecimalSchema.default(1),
  unitPriceExclVat: NonNegativeDecimalSchema,
  vatRate: z.number().min(0).max(100).default(10),
  totalExclVat: NonNegativeDecimalSchema,
  totalVat: NonNegativeDecimalSchema,

  // Hierarchy
  parentId: z.string().cuid().nullable().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
});

/**
 * Invoice Line Input Schema with type-specific refinements
 */
export const InvoiceLineInputSchema = InvoiceLineInputBaseSchema.superRefine((data, ctx) => {
  // Rule 1: CALCULATED lines SHOULD have sourceData (warning, not error for invoices)
  // Invoices can be created manually, so we're more lenient

  // Rule 2: GROUP lines CANNOT have a parentId (top-level only)
  if (data.blockType === 'GROUP' && data.parentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'GROUP lines cannot be nested - they must be top-level (no parentId)',
      path: ['parentId'],
    });
  }
});

export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

// =============================================================================
// INVOICE LINES ARRAY SCHEMA
// =============================================================================

/**
 * Validates an array of invoice lines with same hierarchical rules as quotes
 */
export const InvoiceLinesArraySchema = z.array(InvoiceLineInputSchema).superRefine((lines, ctx) => {
  const lineMap = new Map<string, InvoiceLineInput>();

  lines.forEach((line) => {
    const lineId = line.id || line.tempId;
    if (lineId) {
      lineMap.set(lineId, line);
    }
  });

  lines.forEach((line, index) => {
    if (line.parentId) {
      if (!lineMap.has(line.parentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `parentId "${line.parentId}" references a non-existent line`,
          path: [index, 'parentId'],
        });
        return;
      }

      const parent = lineMap.get(line.parentId)!;

      if (parent.blockType !== 'GROUP') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `parentId references a "${parent.blockType}" line, but only GROUP lines can be parents`,
          path: [index, 'parentId'],
        });
      }

      if (line.blockType === 'GROUP') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GROUP lines cannot have a parent - nesting is not allowed (max depth = 1)',
          path: [index, 'parentId'],
        });
      }
    }
  });
});

export type InvoiceLinesArrayInput = z.infer<typeof InvoiceLinesArraySchema>;

// =============================================================================
// MISSION SOURCE DATA SCHEMA
// =============================================================================

/**
 * Source data for Mission model
 * Operational context copied from quote at mission creation
 * Based on MissionSourceData interface from Story 26.1
 */
export const MissionSourceDataSchema = z.object({
  // Trip details from quote - REQUIRED
  pickupAddress: z.string().min(1, { message: 'Pickup address is required' }),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  dropoffAddress: z.string().optional(),
  dropoffLatitude: z.number().optional(),
  dropoffLongitude: z.number().optional(),

  // Timing - REQUIRED
  scheduledPickupAt: z.string().datetime({ message: 'Must be ISO datetime string' }),
  estimatedDuration: z.number().nonnegative().optional(), // minutes
  estimatedDistance: z.number().nonnegative().optional(), // km

  // Passenger info
  passengerCount: z.number().int().positive().optional(),
  passengerName: z.string().optional(),
  passengerPhone: z.string().optional(),

  // Special requirements
  flightNumber: z.string().optional(),
  trainNumber: z.string().optional(),
  specialRequests: z.string().optional(),
}).strict();

export type MissionSourceDataInput = z.infer<typeof MissionSourceDataSchema>;

// =============================================================================
// MISSION EXECUTION DATA SCHEMA
// =============================================================================

/**
 * Execution data for Mission model
 * Runtime data recorded during mission execution
 * Based on MissionExecutionData interface from Story 26.1
 */
/**
 * Schema for mission incidents during execution
 * Exported for frontend validation of incident forms
 */
export const MissionIncidentSchema = z.object({
  timestamp: z.string().datetime(),
  type: z.string(),
  description: z.string(),
});

export type MissionIncidentInput = z.infer<typeof MissionIncidentSchema>;

export const MissionExecutionDataSchema = z.object({
  // Actual times
  actualPickupAt: z.string().datetime().optional(),
  actualDropoffAt: z.string().datetime().optional(),

  // Actual metrics
  actualDistanceKm: z.number().nonnegative().optional(),
  actualDurationMinutes: z.number().nonnegative().optional(),

  // Driver notes
  driverNotes: z.string().optional(),

  // Issues/events
  incidents: z.array(MissionIncidentSchema).optional(),

  // Signature/confirmation
  passengerSignature: z.string().optional(), // base64 or URL
  completionPhoto: z.string().optional(), // URL
}).strict();

export type MissionExecutionDataInput = z.infer<typeof MissionExecutionDataSchema>;

// =============================================================================
// MISSION INPUT SCHEMA
// =============================================================================

/**
 * Mission input schema for API validation
 */
export const MissionInputSchema = z.object({
  // If updating
  id: z.string().cuid().optional(),

  // Required references
  quoteId: z.string().cuid({ message: 'Valid quoteId is required' }),
  
  // Optional references
  quoteLineId: z.string().cuid().nullable().optional(),
  driverId: z.string().cuid().nullable().optional(),
  vehicleId: z.string().cuid().nullable().optional(),

  // Status
  status: MissionStatusInputSchema.default('PENDING'),

  // Timing
  startAt: z.coerce.date({ message: 'startAt must be a valid date' }),
  endAt: z.coerce.date().nullable().optional(),

  // Data
  sourceData: MissionSourceDataSchema.nullable().optional(),
  executionData: MissionExecutionDataSchema.nullable().optional(),

  // Notes
  notes: z.string().nullable().optional(),
});

export type MissionInput = z.infer<typeof MissionInputSchema>;

// =============================================================================
// BULK UPDATE SCHEMAS (for API endpoints)
// =============================================================================

/**
 * Schema for updating quote lines in bulk
 * Used by PATCH /api/quotes/:id/lines
 */
export const UpdateQuoteLinesSchema = z.object({
  quoteId: z.string().cuid(),
  lines: QuoteLinesArraySchema,
  recalculateTotals: z.boolean().default(true),
});

export type UpdateQuoteLinesInput = z.infer<typeof UpdateQuoteLinesSchema>;

/**
 * Schema for updating invoice lines in bulk
 * Used by PATCH /api/invoices/:id/lines
 */
export const UpdateInvoiceLinesSchema = z.object({
  invoiceId: z.string().cuid(),
  lines: InvoiceLinesArraySchema,
  recalculateTotals: z.boolean().default(true),
});

export type UpdateInvoiceLinesInput = z.infer<typeof UpdateInvoiceLinesSchema>;

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates quote lines and returns a structured result
 */
export function validateQuoteLines(lines: unknown): {
  success: boolean;
  data?: QuoteLinesArrayInput;
  errors?: z.ZodIssue[];
} {
  const result = QuoteLinesArraySchema.safeParse(lines);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Validates invoice lines and returns a structured result
 */
export function validateInvoiceLines(lines: unknown): {
  success: boolean;
  data?: InvoiceLinesArrayInput;
  errors?: z.ZodIssue[];
} {
  const result = InvoiceLinesArraySchema.safeParse(lines);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

/**
 * Validates mission input and returns a structured result
 */
export function validateMissionInput(input: unknown): {
  success: boolean;
  data?: MissionInput;
  errors?: z.ZodIssue[];
} {
  const result = MissionInputSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
