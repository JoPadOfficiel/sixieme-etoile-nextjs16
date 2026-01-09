import { describe, it, expect } from 'vitest';
import {
  createEndCustomerSchema,
  updateEndCustomerSchema,
  endCustomerResponseSchema,
  type CreateEndCustomerInput,
  type UpdateEndCustomerInput,
} from './end-customer';

describe('EndCustomer Zod Schemas', () => {
  describe('createEndCustomerSchema', () => {
    it('should validate valid create input with all fields', () => {
      const validInput: CreateEndCustomerInput = {
        organizationId: 'clxyz1234567890abcdefg',
        contactId: 'clxyz1234567890abcdefh',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678',
        difficultyScore: 3,
        notes: 'VIP customer',
      };

      const result = createEndCustomerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate with only required fields (firstName, lastName)', () => {
      const minimalInput = {
        organizationId: 'clxyz1234567890abcdefg',
        contactId: 'clxyz1234567890abcdefh',
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = createEndCustomerSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject when firstName is missing', () => {
      const invalidInput = {
        organizationId: 'clxyz1234567890abcdefg',
        contactId: 'clxyz1234567890abcdefh',
        lastName: 'Smith',
      };

      const result = createEndCustomerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod shows "Required" for missing required fields
        expect(result.error.issues[0].message).toBe('Required');
      }
    });

    it('should reject when lastName is missing', () => {
      const invalidInput = {
        organizationId: 'clxyz1234567890abcdefg',
        contactId: 'clxyz1234567890abcdefh',
        firstName: 'John',
      };

      const result = createEndCustomerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod shows "Required" for missing required fields
        expect(result.error.issues[0].message).toBe('Required');
      }
    });

    describe('difficultyScore validation', () => {
      it('should accept valid difficulty scores (1-5)', () => {
        for (const score of [1, 2, 3, 4, 5]) {
          const input = {
            organizationId: 'clxyz1234567890abcdefg',
            contactId: 'clxyz1234567890abcdefh',
            firstName: 'John',
            lastName: 'Doe',
            difficultyScore: score,
          };

          const result = createEndCustomerSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      });

      it('should reject difficulty score of 0', () => {
        const input = {
          organizationId: 'clxyz1234567890abcdefg',
          contactId: 'clxyz1234567890abcdefh',
          firstName: 'John',
          lastName: 'Doe',
          difficultyScore: 0,
        };

        const result = createEndCustomerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('must be between 1 and 5');
        }
      });

      it('should reject difficulty score of 6', () => {
        const input = {
          organizationId: 'clxyz1234567890abcdefg',
          contactId: 'clxyz1234567890abcdefh',
          firstName: 'John',
          lastName: 'Doe',
          difficultyScore: 6,
        };

        const result = createEndCustomerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('must be between 1 and 5');
        }
      });

      it('should reject negative difficulty scores', () => {
        const input = {
          organizationId: 'clxyz1234567890abcdefg',
          contactId: 'clxyz1234567890abcdefh',
          firstName: 'John',
          lastName: 'Doe',
          difficultyScore: -1,
        };

        const result = createEndCustomerSchema.safeParse(input);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('must be between 1 and 5');
        }
      });

      it('should accept undefined/null difficultyScore (optional field)', () => {
        const input = {
          organizationId: 'clxyz1234567890abcdefg',
          contactId: 'clxyz1234567890abcdefh',
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = createEndCustomerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('email validation', () => {
      it('should accept valid email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'admin+tag@company.org',
        ];

        for (const email of validEmails) {
          const input = {
            organizationId: 'clxyz1234567890abcdefg',
            contactId: 'clxyz1234567890abcdefh',
            firstName: 'John',
            lastName: 'Doe',
            email,
          };

          const result = createEndCustomerSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com'];

        for (const email of invalidEmails) {
          const input = {
            organizationId: 'clxyz1234567890abcdefg',
            contactId: 'clxyz1234567890abcdefh',
            firstName: 'John',
            lastName: 'Doe',
            email,
          };

          const result = createEndCustomerSchema.safeParse(input);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('Invalid email format');
          }
        }
      });

      it('should accept undefined email (optional field)', () => {
        const input = {
          organizationId: 'clxyz1234567890abcdefg',
          contactId: 'clxyz1234567890abcdefh',
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = createEndCustomerSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateEndCustomerSchema', () => {
    it('should allow partial updates with any combination of fields', () => {
      const partialUpdate: UpdateEndCustomerInput = {
        firstName: 'UpdatedFirstName',
      };

      const result = updateEndCustomerSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only email', () => {
      const emailUpdate: UpdateEndCustomerInput = {
        email: 'newemail@example.com',
      };

      const result = updateEndCustomerSchema.safeParse(emailUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only difficultyScore', () => {
      const scoreUpdate: UpdateEndCustomerInput = {
        difficultyScore: 5,
      };

      const result = updateEndCustomerSchema.safeParse(scoreUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update object (no fields)', () => {
      const emptyUpdate: UpdateEndCustomerInput = {};

      const result = updateEndCustomerSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should still validate difficulty score range in updates', () => {
      const invalidScoreUpdate = {
        difficultyScore: 10,
      };

      const result = updateEndCustomerSchema.safeParse(invalidScoreUpdate);
      expect(result.success).toBe(false);
    });

    it('should still validate email format in updates', () => {
      const invalidEmailUpdate = {
        email: 'invalid-email',
      };

      const result = updateEndCustomerSchema.safeParse(invalidEmailUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('endCustomerResponseSchema', () => {
    it('should validate complete response with all fields', () => {
      const completeResponse = {
        id: 'clxyz1234567890abcdefg',
        organizationId: 'clorg1234567890abcdefg',
        contactId: 'clcon1234567890abcdefg',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678',
        difficultyScore: 3,
        notes: 'VIP customer',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          quotes: 5,
        },
      };

      const result = endCustomerResponseSchema.safeParse(completeResponse);
      expect(result.success).toBe(true);
    });

    it('should validate response without optional _count field', () => {
      const response = {
        id: 'clxyz1234567890abcdefg',
        organizationId: 'clorg1234567890abcdefg',
        contactId: 'clcon1234567890abcdefg',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = endCustomerResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});
