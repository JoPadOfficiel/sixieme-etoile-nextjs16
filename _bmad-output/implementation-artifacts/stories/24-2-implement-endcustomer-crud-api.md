# Story 24.2: Implement EndCustomer CRUD API

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **backend engineer**,  
I want API endpoints for managing end-customers,  
so that the frontend can create, read, update, and delete sub-contacts for partner agencies.

## Related FRs

- **FR121**: End-customer management system for agency contacts
- **FR122**: CRUD operations for end-customers

## Acceptance Criteria

**AC1 - List EndCustomers API:**

**Given** a valid authenticated request with organizationId,  
**When** I call `GET /api/vtc/contacts/:contactId/end-customers`,  
**Then** I receive a JSON response containing:
- A paginated list of all end-customers linked to that contact
- Each item includes: id, firstName, lastName, email, phone, difficultyScore, notes, createdAt, updatedAt
- A `_count.quotes` field showing the number of linked quotes per end-customer
- Pagination metadata (page, limit, total, totalPages)

**AC2 - Get Single EndCustomer API:**

**Given** a valid end-customer ID,  
**When** I call `GET /api/vtc/end-customers/:id`,  
**Then** I receive the full end-customer record with all fields and relations,  
**And** the response includes the `_count.quotes` field,  
**And** a 404 error is returned if the end-customer does not exist or belongs to another organization.

**AC3 - Create EndCustomer API:**

**Given** a valid payload with `firstName`, `lastName`, and `contactId`,  
**When** I call `POST /api/vtc/contacts/:contactId/end-customers`,  
**Then** a new end-customer is created and linked to the specified contact,  
**And** the `organizationId` is automatically set from the authenticated context,  
**And** the response includes the created end-customer with a 201 status code,  
**And** validation errors are returned for missing required fields (firstName, lastName),  
**And** difficultyScore is validated to be between 1-5 if provided,  
**And** email format is validated if provided.

**AC4 - Update EndCustomer API:**

**Given** an existing end-customer ID,  
**When** I call `PATCH /api/vtc/end-customers/:id` with partial data,  
**Then** the end-customer is updated with only the provided fields,  
**And** validation rules apply (difficultyScore 1-5, email format),  
**And** a 404 error is returned if the end-customer does not exist or belongs to another organization.

**AC5 - Delete EndCustomer API:**

**Given** an end-customer with no linked quotes,  
**When** I call `DELETE /api/vtc/end-customers/:id`,  
**Then** the end-customer is soft-deleted or removed successfully,  
**And** a 200 response with `{ success: true }` is returned.

**Given** an end-customer with linked quotes,  
**When** I call `DELETE /api/vtc/end-customers/:id`,  
**Then** a 400 error is returned with a clear message explaining:
- The end-customer cannot be deleted because it has X linked quotes
- Guidance on how to proceed (reassign quotes or archive instead)

**AC6 - Search EndCustomers API:**

**Given** a contact with multiple end-customers,  
**When** I call `GET /api/vtc/contacts/:contactId/end-customers?search=dupont`,  
**Then** the results are filtered to include only end-customers where:
- `firstName` contains "dupont" (case-insensitive), OR
- `lastName` contains "dupont" (case-insensitive), OR
- `email` contains "dupont" (case-insensitive)

**AC7 - Multi-tenancy Enforcement:**

**Given** any API call,  
**When** the request is processed,  
**Then** the `organizationId` filter is always applied,  
**And** users cannot access end-customers from other organizations,  
**And** cascade delete behavior is respected for Contact and Organization deletion.

## Tasks / Subtasks

- [x] Task 1: Create EndCustomer Router File (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 1.1: Create `packages/api/src/routes/vtc/end-customers.ts`
  - [x] 1.2: Import dependencies (Hono, db, zod, middleware, tenant helpers)
  - [x] 1.3: Apply organization middleware to all routes
  - [x] 1.4: Implement validation schemas using existing Zod schemas from Story 24.1

- [x] Task 2: Implement List EndCustomers Endpoint (AC: #1, #6, #7)
  - [x] 2.1: Create `GET /contacts/:contactId/end-customers` route
  - [x] 2.2: Add search parameter filtering (firstName, lastName, email)
  - [x] 2.3: Add pagination (page, limit) with default values
  - [x] 2.4: Include `_count: { quotes: true }` in response
  - [x] 2.5: Apply tenant filter using `withTenantFilter`

- [x] Task 3: Implement Get Single EndCustomer Endpoint (AC: #2, #7)
  - [x] 3.1: Create `GET /end-customers/:id` route
  - [x] 3.2: Verify tenant access using `withTenantId`
  - [x] 3.3: Include `_count: { quotes: true }` in response
  - [x] 3.4: Return 404 if not found or wrong tenant

- [x] Task 4: Implement Create EndCustomer Endpoint (AC: #3, #7)
  - [x] 4.1: Create `POST /contacts/:contactId/end-customers` route
  - [x] 4.2: Validate input using createEndCustomerSchema (from Story 24.1)
  - [x] 4.3: Verify contact exists and belongs to tenant
  - [x] 4.4: Verify contact is a partner (`isPartner === true`)
  - [x] 4.5: Use `withTenantCreate` for organizationId injection
  - [x] 4.6: Return 201 with created end-customer

- [x] Task 5: Implement Update EndCustomer Endpoint (AC: #4, #7)
  - [x] 5.1: Create `PATCH /end-customers/:id` route
  - [x] 5.2: Validate input using updateEndCustomerSchema (from Story 24.1)
  - [x] 5.3: Verify tenant access
  - [x] 5.4: Apply partial update
  - [x] 5.5: Return updated end-customer

- [x] Task 6: Implement Delete EndCustomer Endpoint (AC: #5, #7)
  - [x] 6.1: Create `DELETE /end-customers/:id` route
  - [x] 6.2: Verify tenant access
  - [x] 6.3: Check for linked quotes using `_count.quotes`
  - [x] 6.4: Block deletion if quotes exist (400 error with guidance)
  - [x] 6.5: Delete if no quotes linked
  - [x] 6.6: Return `{ success: true }`

- [x] Task 7: Register Router in API Application (AC: all)
  - [x] 7.1: Export `endCustomersRouter` from end-customers.ts
  - [x] 7.2: Import and register in `packages/api/src/routes/vtc/index.ts`
  - [x] 7.3: Verify route registration with describeRoute for OpenAPI

- [x] Task 8: Write Unit Tests (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] 8.1: Create `packages/api/src/routes/vtc/__tests__/end-customers.test.ts`
  - [x] 8.2: Test list endpoint with pagination and search
  - [x] 8.3: Test get single endpoint (found and not found)
  - [x] 8.4: Test create endpoint (valid, invalid, non-partner contact)
  - [x] 8.5: Test update endpoint (valid, invalid, not found)
  - [x] 8.6: Test delete endpoint (with and without linked quotes)
  - [x] 8.7: Test multi-tenancy isolation

## Dev Notes

### Architecture Compliance

**Project Structure (Monorepo):**
- API package: `packages/api/`
- Database package: `packages/database/`
- Routes location: `packages/api/src/routes/vtc/`
- Tests location: `packages/api/src/routes/vtc/__tests__/`

**Framework Pattern:**
- Use Hono router (same as contacts.ts, promotions.ts, etc.)
- Apply `organizationMiddleware` for tenant context
- Use `hono-openapi` with `describeRoute` for API documentation
- Use `validator` from `hono-openapi/zod` for request validation

**Multi-tenancy Pattern (CRITICAL):**
- Import `withTenantCreate`, `withTenantFilter`, `withTenantId` from `../../lib/tenant-prisma`
- Always apply `organizationId` filter on queries
- Use `c.get("organizationId")` to retrieve tenant from context
- Never allow cross-tenant data access

### Technical Requirements

**Validation Schemas (from Story 24.1):**
```typescript
import {
  createEndCustomerSchema,
  updateEndCustomerSchema,
  type CreateEndCustomerInput,
  type UpdateEndCustomerInput,
} from "@repo/database/schemas/end-customer";
```

**API Response Patterns:**
- List: `{ data: [], meta: { page, limit, total, totalPages } }`
- Single: Full entity object
- Create: Entity with 201 status
- Update: Updated entity
- Delete: `{ success: true }` or error with guidance

**Error Handling:**
- Use `HTTPException` from `hono/http-exception`
- 400 for validation errors and blocked operations
- 404 for not found
- Include clear error messages in French for user-facing errors

### File Structure Requirements

**Files to Create:**
1. `packages/api/src/routes/vtc/end-customers.ts` - Router implementation
2. `packages/api/src/routes/vtc/__tests__/end-customers.test.ts` - Unit tests

**Files to Modify:**
1. `packages/api/src/routes/vtc/index.ts` - Register new router

### Testing Requirements

**Unit Tests (Vitest):**
- Location: `packages/api/src/routes/vtc/__tests__/end-customers.test.ts`
- Mock Prisma client using existing patterns from `contacts.test.ts`
- Test all CRUD operations
- Test validation errors
- Test multi-tenancy isolation
- Test delete with linked quotes blocking

**API Testing (Curl):**
- Test all endpoints via curl commands
- Verify proper headers and authentication
- Validate response structure

**Database Verification (MCP):**
- Use `@postgres_vtc_sixiemme_etoile` MCP to verify database state after each operation
- Confirm cascade behaviors
- Verify indexes are used for queries

### Dependencies

**Blocking Dependencies:**
- Story 24.1 (EndCustomer model and Zod schemas) ✅ COMPLETED

**Non-Blocking Dependencies:**
- Contact model and API already exist ✅
- Organization middleware already exists ✅
- Tenant helpers already exist ✅

### Project Context Reference

**Related Patterns from Existing Code:**
- `packages/api/src/routes/vtc/contacts.ts` - Primary reference for CRUD pattern
- `packages/api/src/routes/vtc/promotions.ts` - Reference for nested resources
- `packages/api/src/routes/vtc/__tests__/contacts.test.ts` - Reference for testing pattern
- `packages/api/src/lib/tenant-prisma.ts` - Tenant helper functions

**Critical Reminders:**
- **NEVER** hardcode business values in code
- **ALWAYS** use organization-level multi-tenancy
- **ALWAYS** validate contactId belongs to tenantorganization
- **ALWAYS** verify contact is a partner before allowing end-customer creation
- **ALWAYS** use OpenAPI descriptions for API documentation

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
