/**
 * Story 26.1: Type definitions for Hybrid Blocks JSON fields
 * These interfaces document the expected structure of the Json fields
 * in QuoteLine, InvoiceLine, and Mission models
 */

import type { PricingModeType, TripTypeType } from '../zod';

/**
 * Source data for CALCULATED quote/invoice lines
 * Stores the original pricing engine output for traceability
 */
export interface QuoteLineSourceData {
  // Pricing context
  pricingMode: PricingModeType;
  tripType: TripTypeType;
  calculatedAt: string; // ISO timestamp

  // Trip details
  pickupAddress?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  
  // Distance and duration
  distanceKm?: number;
  durationMinutes?: number;
  
  // Pricing breakdown
  basePrice?: number;
  fuelCost?: number;
  tollCost?: number;
  driverCost?: number;
  wearCost?: number;
  
  // Applied rules and multipliers
  appliedZoneMultiplier?: number;
  appliedAdvancedRates?: string[];
  appliedPromotions?: string[];
  appliedOptionalFees?: string[];
  
  // Vehicle category
  vehicleCategoryId?: string;
  vehicleCategoryCode?: string;
}

/**
 * Display data for quote/invoice lines
 * User-editable values that can override source data for display
 */
export interface QuoteLineDisplayData {
  // Display label (e.g., "Transfert CDG → Paris")
  label: string;
  
  // Extended description (optional)
  description?: string;
  
  // Unit label for quantity (e.g., "trajet", "heure", "jour")
  unitLabel?: string;
  
  // Optional grouped total (for GROUP type lines)
  groupSubtotal?: number;
}

/**
 * Source data for Mission model
 * Operational context copied from quote at mission creation
 */
export interface MissionSourceData {
  // Trip details from quote
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  
  // Timing
  scheduledPickupAt: string; // ISO timestamp
  estimatedDuration?: number; // minutes
  estimatedDistance?: number; // km
  
  // Passenger info
  passengerCount?: number;
  passengerName?: string;
  passengerPhone?: string;
  
  // Special requirements
  flightNumber?: string;
  trainNumber?: string;
  specialRequests?: string;
}

/**
 * Execution data for Mission model
 * Runtime data recorded during mission execution
 */
export interface MissionExecutionData {
  // Actual times
  actualPickupAt?: string; // ISO timestamp
  actualDropoffAt?: string; // ISO timestamp
  
  // Actual metrics
  actualDistanceKm?: number;
  actualDurationMinutes?: number;
  
  // Driver notes
  driverNotes?: string;
  
  // Issues/events
  incidents?: Array<{
    timestamp: string;
    type: string;
    description: string;
  }>;
  
  // Signature/confirmation
  passengerSignature?: string; // base64 or URL
  completionPhoto?: string; // URL
}

/**
 * Type guards for runtime validation
 * 
 * NOTE: These type guards now delegate to Zod schemas from Story 26.3
 * for validation consistency. The schemas are the single source of truth.
 */

// Import Zod schemas for validation (Story 26.3)
import {
  QuoteLineSourceDataSchema,
  QuoteLineDisplayDataSchema,
  MissionSourceDataSchema,
  MissionExecutionDataSchema,
} from '../schemas/hybrid-blocks';

export function isQuoteLineSourceData(data: unknown): data is QuoteLineSourceData {
  return QuoteLineSourceDataSchema.safeParse(data).success;
}

export function isQuoteLineDisplayData(data: unknown): data is QuoteLineDisplayData {
  return QuoteLineDisplayDataSchema.safeParse(data).success;
}

export function isMissionSourceData(data: unknown): data is MissionSourceData {
  return MissionSourceDataSchema.safeParse(data).success;
}

export function isMissionExecutionData(data: unknown): data is MissionExecutionData {
  // ExecutionData is always optional/partial, empty object is valid
  if (data === null || data === undefined) return true;
  return MissionExecutionDataSchema.safeParse(data).success;
}

