import { z } from 'zod';

/**
 * Story 24.1: EndCustomer Zod Validation Schemas
 * Provides API-level validation for EndCustomer operations
 */

// Email validation schema (optional but valid format when provided)
const emailSchema = z.string().email('Invalid email format').optional();

// Phone validation schema (optional but basic validation)
const phoneSchema = z.string().min(1, 'Phone cannot be empty if provided').optional();

// Difficulty score validation (1-5 scale)
const difficultyScoreSchema = z
  .number()
  .int('Difficulty score must be an integer')
  .min(1, 'Difficulty score must be between 1 and 5')
  .max(5, 'Difficulty score must be between 1 and 5')
  .optional();

/**
 * Schema for creating a new EndCustomer
 * Required: firstName, lastName
 * Optional: email, phone, difficultyScore, notes
 */
export const createEndCustomerSchema = z.object({
  organizationId: z.string().cuid('Invalid organization ID'),
  contactId: z.string().cuid('Invalid contact ID'),
  firstName: z.string().min(1, 'First name is required').max(255, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(255, 'Last name is too long'),
  email: emailSchema,
  phone: phoneSchema,
  difficultyScore: difficultyScoreSchema,
  notes: z.string().optional(),
});

export type CreateEndCustomerInput = z.infer<typeof createEndCustomerSchema>;

/**
 * Schema for updating an existing EndCustomer
 * All fields optional (partial update)
 */
export const updateEndCustomerSchema = createEndCustomerSchema
  .omit({ organizationId: true, contactId: true })
  .partial();

export type UpdateEndCustomerInput = z.infer<typeof updateEndCustomerSchema>;

/**
 * Schema for EndCustomer API response
 * Includes all fields plus id and timestamps
 */
export const endCustomerResponseSchema = createEndCustomerSchema.extend({
  id: z.string().cuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z
    .object({
      quotes: z.number(),
    })
    .optional(),
});

export type EndCustomerResponse = z.infer<typeof endCustomerResponseSchema>;
