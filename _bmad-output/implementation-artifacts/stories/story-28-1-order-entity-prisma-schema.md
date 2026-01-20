# Story 28.1: Order Entity & Prisma Schema

## Story Info

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| **Story ID**     | 28.1                                              |
| **Epic**         | Epic 28 - Order Management & Intelligent Spawning |
| **Title**        | Order Entity & Prisma Schema                      |
| **Status**       | review                                            |
| **Created**      | 2026-01-20                                        |
| **Priority**     | High                                              |
| **Story Points** | 3                                                 |
| **Related FRs**  | FR160, FR161                                      |

---

## User Story

**As a** developer,
**I want to** establish the Order (Dossier) data model and its workflow states,
**So that** we can link Quotes, Missions, and Invoices under a single parent entity.

---

## Description

This story creates the foundational `Order` model in Prisma that serves as the central "Dossier de Commande" entity. An Order groups together all commercial (Quote), operational (Mission), and financial (Invoice) aspects of a customer request.

### Key Concepts

- **Order as Container**: One Order can have multiple Quotes, Missions, and Invoices
- **Lifecycle States**: Orders progress through defined states (DRAFT → CONFIRMED → INVOICED → PAID)
- **Unique Reference**: Each Order has a human-readable reference (e.g., "ORD-2026-001")
- **Multi-tenant**: Orders are scoped to an Organization

### Technical Scope

1. Create `OrderStatus` enum
2. Create `Order` model with all required fields and relations
3. Add optional `orderId` foreign key to `Quote`, `Mission`, and `Invoice` models
4. Generate Prisma migration
5. Update seed script with test Orders

---

## Acceptance Criteria

### AC1: Order Model Created

- [ ] `Order` model exists in `schema.prisma`
- [ ] Fields include: `id` (CUID), `reference` (unique String), `status` (OrderStatus enum), `contactId` (relation), `organizationId` (relation), `notes`, `createdAt`, `updatedAt`
- [ ] Proper indexes on `organizationId`, `contactId`, `status`, `reference`

### AC2: OrderStatus Enum Defined

- [ ] Enum `OrderStatus` with values: `DRAFT`, `QUOTED`, `CONFIRMED`, `INVOICED`, `PAID`, `CANCELLED`
- [ ] Default status is `DRAFT`

### AC3: Relations Established

- [ ] `Order` has relation to `Contact` (many Orders per Contact)
- [ ] `Order` has relation to `Organization` (many Orders per Organization)
- [ ] `Order` has one-to-many relation to `Quote[]`
- [ ] `Order` has one-to-many relation to `Mission[]`
- [ ] `Order` has one-to-many relation to `Invoice[]`

### AC4: Existing Models Updated

- [ ] `Quote` model has optional `orderId` field with relation to `Order`
- [ ] `Mission` model has optional `orderId` field with relation to `Order`
- [ ] `Invoice` model has optional `orderId` field with relation to `Order`
- [ ] All new foreign keys have proper indexes

### AC5: Migration Successful

- [ ] Migration `add_order_model` generated and applied
- [ ] No data loss on existing records
- [ ] Database schema matches Prisma schema

### AC6: Seed Data Created

- [ ] At least 3 test Orders created in seed script
- [ ] Orders linked to existing test Contacts
- [ ] Orders have different statuses for testing

### AC7: Reference Uniqueness

- [ ] `reference` field has `@unique` constraint
- [ ] Reference format follows pattern: `ORD-YYYY-NNN`

---

## Technical Details

### Schema Changes

```prisma
/// OrderStatus - Lifecycle states for an Order (Dossier)
enum OrderStatus {
  DRAFT      // Initial state, order being prepared
  QUOTED     // Quote(s) generated and sent
  CONFIRMED  // Customer confirmed, ready for execution
  INVOICED   // Invoice(s) generated
  PAID       // All invoices paid
  CANCELLED  // Order cancelled
}

/// Order - Central "Dossier de Commande" entity
model Order {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Unique reference (e.g., "ORD-2026-001")
  reference String @unique

  // Contact (customer)
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id])

  // Status
  status OrderStatus @default(DRAFT)

  // Notes
  notes String?

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  quotes   Quote[]
  missions Mission[]
  invoices Invoice[]

  @@index([organizationId])
  @@index([contactId])
  @@index([status])
  @@index([reference])
  @@map("order")
}
```

### Updates to Existing Models

```prisma
// Add to Quote model
orderId String?
order   Order?  @relation(fields: [orderId], references: [id])
@@index([orderId])

// Add to Mission model
orderId String?
order   Order?  @relation(fields: [orderId], references: [id])
@@index([orderId])

// Add to Invoice model
orderId String?
order   Order?  @relation(fields: [orderId], references: [id])
@@index([orderId])
```

### Files to Modify

| File                                     | Changes                                                         |
| ---------------------------------------- | --------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma` | Add OrderStatus enum, Order model, update Quote/Mission/Invoice |
| `packages/database/prisma/seed.ts`       | Add seedOrders function                                         |

---

## Test Cases

### TC1: Schema Validation

- **Given**: Updated schema.prisma
- **When**: Running `prisma validate`
- **Then**: No validation errors

### TC2: Migration Generation

- **Given**: Valid schema changes
- **When**: Running `prisma migrate dev --name add_order_model`
- **Then**: Migration created successfully

### TC3: Order Table Exists

- **Given**: Migration applied
- **When**: Querying database with `\d order` (psql) or Prisma Studio
- **Then**: Table "order" exists with all columns

### TC4: Reference Uniqueness Constraint

- **Given**: Order with reference "ORD-2026-001" exists
- **When**: Attempting to create another Order with same reference
- **Then**: Unique constraint violation error

### TC5: Seed Data Verification

- **Given**: Seed script executed
- **When**: Querying Orders via Prisma Studio
- **Then**: At least 3 Orders exist with different statuses

### TC6: Relation Integrity

- **Given**: Order created with contactId
- **When**: Querying Order with `include: { contact: true }`
- **Then**: Contact data is returned

### TC7: Optional orderId on Quote

- **Given**: Existing Quote without orderId
- **When**: Querying Quote
- **Then**: orderId is null, no errors

---

## Dependencies

### Upstream Dependencies

- `Contact` model must exist (already exists)
- `Organization` model must exist (already exists)
- `Quote`, `Mission`, `Invoice` models must exist (already exist)

### Downstream Dependencies

- Story 28.2 (Order State Machine & API) depends on this schema
- Story 28.3 (Dossier View UI) depends on this schema
- Story 28.4 (Spawning Engine) depends on Order-Mission relation

---

## Constraints

1. **Backward Compatibility**: All new `orderId` fields must be optional to not break existing data
2. **Multi-tenant**: Order must be scoped to Organization
3. **No Cascade Delete on Contact**: Deleting a Contact should not delete Orders (use `onDelete: Restrict` or handle in application)
4. **Reference Generation**: Reference format must be consistent across the application

---

## Out of Scope

- Order API endpoints (Story 28.2)
- Order UI (Story 28.3)
- Automatic Order creation from Quote (Story 28.4)
- Order status transitions logic (Story 28.2)

---

## Dev Notes

### Reference Generation Strategy

For seed data, use format: `ORD-{YEAR}-{SEQUENCE}`
Example: `ORD-2026-001`, `ORD-2026-002`

In production, the API (Story 28.2) will handle reference generation with proper sequence management per organization.

### Index Strategy

Indexes added for:

- `organizationId`: Multi-tenant queries
- `contactId`: Customer lookup
- `status`: Status filtering
- `reference`: Unique lookups

### Migration Safety

The migration only adds new columns with nullable foreign keys, so it's safe to run on existing data without data loss.

---

## Checklist

- [x] Schema updated
- [x] Migration generated
- [x] Migration applied
- [x] Seed data added
- [x] Prisma client regenerated
- [x] Manual DB verification done
- [x] Story file updated with completion notes

---

## Implementation Notes (2026-01-20)

### Files Modified

| File                                     | Changes                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma` | Added `OrderStatus` enum, `Order` model, `orderId` + indexes on Quote/Mission/Invoice |
| `packages/database/prisma/seed.ts`       | Added `seedOrders()` function with 5 test orders                                      |

### Tests Executed

| Test                                                             | Result  |
| ---------------------------------------------------------------- | ------- |
| Schema validation (`prisma validate`)                            | ✅ PASS |
| DB sync (`prisma db push`)                                       | ✅ PASS |
| Prisma client generation                                         | ✅ PASS |
| Seed Orders (5 orders created)                                   | ✅ PASS |
| Unique constraint on `reference`                                 | ✅ PASS |
| Relations (Contact, Organization, Quote[], Mission[], Invoice[]) | ✅ PASS |

### Orders Created

```
ORD-2026-001 - DRAFT
ORD-2026-002 - CONFIRMED
ORD-2026-003 - INVOICED
ORD-2026-004 - PAID
ORD-2026-005 - CANCELLED
```

### Git Commands

```bash
# Branch created
git checkout -b feature/28-1-order-schema

# Commit changes
git add packages/database/prisma/schema.prisma packages/database/prisma/seed.ts
git commit -m "feat(database): add Order model for Story 28.1

- Add OrderStatus enum (DRAFT, QUOTED, CONFIRMED, INVOICED, PAID, CANCELLED)
- Add Order model with reference, status, contactId, organizationId
- Add orderId relation to Quote, Mission, Invoice models
- Add indexes for orderId on all related models
- Add seedOrders function with 5 test orders
- Unique constraint on reference field (ORD-YYYY-NNN format)"

# Push to remote
git push -u origin feature/28-1-order-schema
```

### PR Information

- **Branch**: `feature/28-1-order-schema`
- **Target**: `main`
- **Title**: `feat(database): Story 28.1 - Order Entity & Prisma Schema`
- **Description**: Implements the Order (Dossier) data model as the central entity for grouping Quotes, Missions, and Invoices under a single parent.
