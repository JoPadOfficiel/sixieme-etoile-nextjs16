# Story 24.1: Create EndCustomer Data Model

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,  
I want to create an EndCustomer model linked to Partner contacts,  
so that operators can store and manage individual end-customers within agency profiles.

## Related FRs

- **FR121**: End-customer management system for agency contacts

## Acceptance Criteria

**AC1 - Prisma Schema Extension:**

**Given** the Prisma schema file (`packages/database/prisma/schema.prisma`),  
**When** I add the EndCustomer model,  
**Then** it includes:
- `id` (String, cuid, primary key)
- `organizationId` (String, foreign key to Organization, with Cascade delete)
- `contactId` (String, foreign key to Contact, with Cascade delete)
- `firstName` (String, required)
- `lastName` (String, required)
- `email` (String?, optional)
- `phone` (String?, optional)
- `difficultyScore` (Int?, optional, 1-5 scale for "patience tax")
- `notes` (String?, optional)
- `createdAt` (DateTime, @default(now()))
- `updatedAt` (DateTime, @updatedAt)
- Indexes on `organizationId` and `contactId`
- Table mapping to `"end_customer"`

**AC2 - Contact Model Relation:**

**Given** the existing Contact model,  
**When** I extend it with the EndCustomer relation,  
**Then** the Contact model has:
- `endCustomers EndCustomer[]` relation field

**AC3 - Quote Model Extension:**

**Given** the existing Quote model,  
**When** I extend it to support end-customer attribution,  
**Then** the Quote model has:
- `endCustomerId String?` (optional foreign key)
- `endCustomer EndCustomer?` relation referencing `endCustomerId`
- An index on `endCustomerId`

**AC4 - Organization Relation:**

**Given** the Organization model,  
**When** the EndCustomer model is created,  
**Then** the Organization model has:
- `endCustomers EndCustomer[]` relation added to its relations section

**AC5 - Migration Success:**

**Given** the complete schema changes,  
**When** I run `pnpm prisma:migrate:dev` from the project root,  
**Then** the migration generates successfully without errors,  
**And** the migration file is created in `packages/database/prisma/migrations/`,  
**And** Prisma Client is regenerated with the new EndCustomer type.

**AC6 - Zod Validation Schemas:**

**Given** the API validation requirements,  
**When** I create Zod schemas for EndCustomer,  
**Then** I create schemas for:
- `CreateEndCustomerSchema` (firstName, lastName required; email, phone, difficultyScore, notes optional)
- `UpdateEndCustomerSchema` (all fields optional using .partial())
- `EndCustomerResponseSchema` (full model with id, timestamps, relations)
- Difficulty score validation (min: 1, max: 5)
- Email validation (optional but valid format when provided)
- Phone validation (optional but valid format when provided)

## Tasks / Subtasks

- [x] Task 1: Extend Prisma Schema with EndCustomer Model (AC: #1, #2, #3, #4)
  - [x] 1.1: Add EndCustomer model to `packages/database/prisma/schema.prisma`
  - [x] 1.2: Add `endCustomers EndCustomer[]` to Contact model
  - [x] 1.3: Add `endCustomerId` and `endCustomer` relation to Quote model
  - [x] 1.4: Add `endCustomers EndCustomer[]` to Organization model relations
  - [x] 1.5: Verify all field types, constraints, and cascades match specification

- [x] Task 2: Generate and Apply Migration (AC: #5)
  - [x] 2.1: Run `pnpm prisma:migrate:dev --name add-endcustomer-model` from project root
  - [x] 2.2: Verify migration file is generated correctly
  - [x] 2.3: Verify Prisma Client regenerates successfully
  - [x] 2.4: Test migration applies cleanly to database

- [x] Task 3: Create Zod Validation Schemas (AC: #6)
  - [x] 3.1: Create `packages/database/src/schemas/end-customer.ts`
  - [x] 3.2: Implement `createEndCustomerSchema` with required firstName, lastName
  - [x] 3.3: Implement `updateEndCustomerSchema` with all fields optional
  - [x] 3.4: Add difficulty score validation (1-5 range)
  - [x] 3.5: Add email and phone optional validation
  - [x] 3.6: Export all schemas for API use

- [x] Task 4: Unit Tests for Zod Schemas (AC: #6)
  - [x] 4.1: Create `packages/database/src/schemas/end-customer.test.ts`
  - [x] 4.2: Test valid createEndCustomerSchema inputs
  - [x] 4.3: Test invalid difficultyScore values (0, 6, -1)
  - [x] 4.4: Test invalid email formats
  - [x] 4.5: Test updateEndCustomerSchema allows partial updates

## Dev Notes

### Architecture Compliance

**Project Structure:**
- This is a **monorepo** using pnpm workspaces
- Prisma schema location: `packages/database/prisma/schema.prisma`
- Database package: `packages/database/`
- All migrations run through database package scripts

**Multi-tenancy Pattern:**
- CRITICAL: **All models MUST have `organizationId`** and cascade delete from Organization
- EndCustomer follows the established pattern: belongs to Organization, scoped by org
- Cascade delete ensures data integrity when Contact or Organization is deleted

**Naming Conventions:**
- Model names: **PascalCase** (EndCustomer)
- Field names: **camelCase** (firstName, contactId)
- Table mapping: **snake_case** (`@@map("end_customer")`)
- Relation fields: descriptive names matching referenced model

### Technical Requirements

**Prisma Best Practices:**
- Use `@id @default(cuid())` for all primary keys (consistent with existing models)
- Use `@db.Decimal` for monetary values (not applicable here)
- Always add indexes on foreign keys for query performance
- Use `onDelete: Cascade` for organizational data (Contact, Organization)
- Use `@updatedAt` for automatic timestamp management

**Data Integrity:**
- difficultyScore range: 1-5 (validated at API level via Zod)
- Email and phone are optional but should be validated when provided
- firstName and lastName are required (core identity fields)
- Notes field is unbounded text (String? in Prisma)

**Migration Strategy:**
- Migration naming: `add-endcustomer-model` (descriptive, kebab-case)
- Run migrations from project root: `pnpm prisma:migrate:dev`
- Always regenerate Prisma Client after schema changes
- Test migrations in development before committing

### File Structure Requirements

**Files to Create:**
1. Migration file (auto-generated): `packages/database/prisma/migrations/<timestamp>_add_endcustomer_model/migration.sql`
2. Zod schemas: `packages/database/src/schemas/end-customer.ts`
3. Zod tests: `packages/database/src/schemas/end-customer.test.ts`

**Files to Modify:**
1. `packages/database/prisma/schema.prisma`:
   - Add EndCustomer model (~40 lines)
   - Update Contact model (+1 line for endCustomers relation)
   - Update Quote model (+3 lines for endCustomerId, relation, index)
   - Update Organization model (+1 line for endCustomers relation)

### Testing Requirements

**Unit Tests (Vitest):**
- Location: `packages/database/src/schemas/end-customer.test.ts`
- Framework: Vitest (already configured in database package)
- Coverage required:
  - Valid create inputs (firstName, lastName, optional fields)
  - Invalid difficultyScore (0, 6, 7, -1, null is valid)
  - Invalid email formats (when provided)
  - Partial updates (all fields optional in update schema)
  - Required field validation (firstName, lastName)

**Database Validation:**
- After migration: verify `end_customer` table exists in database
- Verify foreign key constraints are created
- Verify indexes are created on `organizationId` and `contactId`
- Verify cascade delete behavior (delete Contact → EndCustomer deleted)

**Integration Verification (for Story 24.2):**
- Prisma Client should expose `prisma.endCustomer` operations
- TypeScript types should be generated for EndCustomer model
- Relations should be queryable (.endCustomers, .contact, .organization, .quotes)

### Dependencies

**No Blocking Dependencies:**
- Contact model

 already exists ✅
- Quote model already exists ✅
- Organization model already exists ✅
- Prisma setup complete ✅

**Tool Versions:**
- Prisma: ^5.x (verify in `package/database/package.json`)
- Zod: ^3.x (verify in `packages/database/package.json`)
- Vitest: Latest (configured in workspace)

### Project Context Reference

**Related Patterns from Existing Code:**
- Examine `SubcontractorProfile` model for similar organization-scoped entity pattern
- Examine `PartnerContract` model for 1:1 Contact extension pattern  
- Examine existing Zod schemas in `packages/database/src/schemas/` for validation patterns
- Follow existing migration naming in `packages/database/prisma/migrations/`

**Critical Reminders:**
- **NEVER** hardcode business values in code
- **ALWAYS** use organization-level multi-tenancy
- **ALWAYS** cascade delete from Organization and Contact
- **ALWAYS** generate Prisma Client after schema changes
- **ALWAYS** write descriptive migration names

## Dev Agent Record

### Agent Model Used

claude-3-7-sonnet-20250219 (Antigravity)

### Debug Log References

No debugging required - implementation completed successfully on first attempt.

### Completion Notes List

✅ **Story 24.1 Implementation Complete - 2026-01-09**

**Implementation Summary:**
- Created `EndCustomer` Prisma model with all required fields and relations
- Extended `Organization`, `Contact`, and `Quote` models with EndCustomer relations
- Generated and applied database migration `20260109125853_add_endcustomer_model`
- Created comprehensive Zod validation schemas for API operations
- Wrote and executed 20 unit tests - all passing ✅

**Key Technical Decisions:**
1. Inserted EndCustomer model between Contact and PartnerContract in schema for logical grouping
2. Used sed command to insert model snippet to avoid replacement tool errors
3. Implemented strict difficulty score validation (1-5 range) with clear error messages
4. Made email and phone optional but with format validation when provided
5. Followed existing patterns: cuid IDs, cascade delete, proper indexing

**Testing Results:**
- Vitest unit tests: 20/20 passing
- Database verification via MCP confirmed table structure
- All foreign key constraints and indexes verified
- Migration applied cleanly without errors

**Code Quality:**
- Zero hardcoded values
- Full multi-tenancy support with cascade deletes
- Consistent naming conventions (PascalCase models, camelCase fields, snake_case tables)
- Comprehensive test coverage including edge cases

### File List

**Files Created:**
- [x] `packages/database/src/schemas/end-customer.ts` (Zod validation schemas)
- [x] `packages/database/src/schemas/end-customer.test.ts` (20 comprehensive unit tests)
- [x] `packages/database/prisma/migrations/20260109125853_add_endcustomer_model/migration.sql` (Auto-generated migration)

**Files Modified:**
- [x] `packages/database/prisma/schema.prisma` (Added EndCustomer model + relations on Organization, Contact, Quote)

**Commands Executed:**
- [x] `git checkout -b feature/24-1-endcustomer-model` (Created feature branch)
- [x] `pnpm migrate -- --name add-endcustomer-model` (from packages/database - generated and applied migration)
- [x] `pnpm dlx vitest run packages/database/src/schemas/end-customer.test.ts` (20/20 tests passed)
- [x] MCP Postgres verification: `describe_table end_customer` (Confirmed table structure)
- [x] MCP Postgres verification: Query for `endCustomerId` column in Quote table (Confirmed FK added)
