# Story 15.8 – Validate Pricing Consistency Across Application

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** 🔄 In Progress  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Stories 15.1-15.7 (All completed)

---

## User Story

**As a** QA engineer,  
**I want** comprehensive tests validating pricing consistency across quotes, invoices, and dispatch,  
**So that** all pricing paths produce identical results for the same inputs.

---

## Problem Statement

### Current Behavior

Stories 15.1-15.7 have implemented numerous pricing engine improvements:

- Real toll costs via Google Routes API
- Vehicle-specific fuel consumption
- Vehicle category price multipliers
- Category default rates
- Trip type differentiation
- Correct fuel type usage
- Cost breakdown propagation

However, there is no comprehensive test suite validating that all these changes work consistently across the application.

### Impact

| Risk     | Description                                                   |
| -------- | ------------------------------------------------------------- |
| Quality  | Regressions may go unnoticed without validation tests         |
| Business | Inconsistent prices between quote and invoice create disputes |
| Audit    | Cannot prove system correctness without tests                 |

---

## Solution Design

### Test Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Test Coverage Matrix                          │
│                                                                  │
│  1. Integration Tests (Vitest)                                  │
│     ├─ pricing-engine.test.ts                                   │
│     ├─ pricing-calculate.test.ts                                │
│     └─ quote-invoice-consistency.test.ts                        │
│                                                                  │
│  2. E2E Tests (Playwright MCP)                                  │
│     ├─ Quote creation flow                                      │
│     ├─ Quote → Invoice conversion                               │
│     └─ Cost breakdown display                                   │
│                                                                  │
│  3. API Tests (curl + DB verification)                          │
│     ├─ POST /pricing/calculate                                  │
│     ├─ POST /quotes                                             │
│     └─ POST /invoices/from-quote/:id                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Test Scenarios

| ID  | Type        | Scenario                            | Expected Result         |
| --- | ----------- | ----------------------------------- | ----------------------- |
| TS1 | Integration | Partner pricing uses FIXED_GRID     | pricingMode: FIXED_GRID |
| TS2 | Integration | Private client uses DYNAMIC         | All multipliers applied |
| TS3 | Integration | Vehicle category multiplier applied | Price × multiplier      |
| TS4 | Integration | Cost breakdown calculated           | All components present  |
| TS5 | E2E         | Quote creation via UI               | Quote saved correctly   |
| TS6 | E2E         | Quote → Invoice conversion          | costBreakdown identical |
| TS7 | E2E         | CostBreakdownDisplay renders        | All costs visible       |

---

## Acceptance Criteria

### AC1: Pricing Consistency Across Entry Points

**Given** identical inputs (contact, pickup, dropoff, vehicle category, pickup time)  
**When** pricing is calculated via quote creation, dispatch preview, and invoice recalculation  
**Then** all three produce the same price, internal cost, and profitability indicator

### AC2: Method 1 (FIXED_GRID) Consistency

**Given** a partner with assigned grid route  
**When** pricing is calculated  
**Then** Method 1 (FIXED_GRID) is used consistently across all entry points

### AC3: Method 2 (DYNAMIC) Consistency

**Given** a private client with no grid match  
**When** pricing is calculated  
**Then** Method 2 (DYNAMIC) is used with all multipliers applied consistently

### AC4: TripAnalysis Identical

**Given** a quote created and then converted to invoice  
**When** comparing tripAnalysis between quote and invoice  
**Then** the tripAnalysis and costBreakdown are identical

### AC5: E2E Quote to Invoice Flow

**Given** a user creates a quote via the UI  
**When** the quote is accepted and converted to invoice  
**Then** the invoice displays the same pricing and cost breakdown

---

## Technical Implementation

### 1. Test Data Requirements

Use existing seed data from `seed-vtc-complete.ts`:

```typescript
// Partner contacts with contracts
const PARTNER_CONTACTS = [
  "Hôtel Ritz Paris", // 10% commission, DAYS_30
  "Four Seasons George V", // 10% commission, DAYS_30
  "PARISCityVISION", // 15% commission, DAYS_15 (DMC)
];

// Vehicle categories with multipliers
const VEHICLE_CATEGORIES = {
  BERLINE: { multiplier: 1.0, ratePerKm: 1.8 },
  VAN_PREMIUM: { multiplier: 1.3, ratePerKm: 2.35 },
  LUXE: { multiplier: 1.9, ratePerKm: 3.4 },
  MINIBUS: { multiplier: 2.2, ratePerKm: 4.0 },
};

// Zone routes for testing
const TEST_ROUTES = [
  { from: "CDG", to: "PARIS_0", berlinePrice: 79.0 },
  { from: "ORLY", to: "PARIS_0", berlinePrice: 55.0 },
  { from: "BUSSY_0", to: "PARIS_0", berlinePrice: 79.0 },
];
```

### 2. Integration Tests

```typescript
// packages/api/src/routes/vtc/__tests__/pricing-consistency.test.ts

describe("Pricing Consistency", () => {
  describe("Method 1 - FIXED_GRID", () => {
    it("should use partner contract price for matching route", async () => {
      // Test with Hôtel Ritz Paris contact
      // Route: CDG → PARIS_0
      // Expected: FIXED_GRID with contract price
    });

    it("should apply partner discount to zone route", async () => {
      // Ritz has -9% on CDG_PARIS_0_BERLINE
      // Catalog: 79€, Partner: 72€
    });
  });

  describe("Method 2 - DYNAMIC", () => {
    it("should calculate dynamic price for private client", async () => {
      // Test with private contact (no contract)
      // Expected: DYNAMIC with all multipliers
    });

    it("should apply vehicle category multiplier", async () => {
      // LUXE category with 1.9× multiplier
      // Base price × 1.9
    });

    it("should apply zone multiplier", async () => {
      // Pickup in CDG (1.2×), Dropoff in PARIS_0 (1.0×)
      // Max(1.2, 1.0) = 1.2×
    });
  });

  describe("Quote to Invoice Consistency", () => {
    it("should deep-copy costBreakdown to invoice", async () => {
      // Create quote, accept, convert to invoice
      // Compare costBreakdown
    });

    it("should preserve tripAnalysis in invoice", async () => {
      // Verify tripAnalysis is identical
    });
  });
});
```

### 3. E2E Tests with Playwright MCP

```typescript
// Test flow:
// 1. Navigate to quotes page
// 2. Create new quote
// 3. Fill form with test data
// 4. Verify pricing calculation
// 5. Save quote
// 6. Accept quote
// 7. Convert to invoice
// 8. Verify costBreakdown display
```

### 4. API Tests with curl

```bash
# Test 1: Calculate pricing for partner
curl -X POST http://localhost:3000/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "<ritz-contact-id>",
    "vehicleCategoryId": "<berline-id>",
    "tripType": "TRANSFER",
    "pickupAddress": "Aéroport CDG",
    "pickupLatitude": 49.0097,
    "pickupLongitude": 2.5479,
    "dropoffAddress": "Paris Centre",
    "dropoffLatitude": 48.8566,
    "dropoffLongitude": 2.3522
  }'

# Expected: pricingMode: "FIXED_GRID", price: 72.0 (Ritz contract)

# Test 2: Create quote
curl -X POST http://localhost:3000/api/vtc/quotes \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{...}'

# Test 3: Convert to invoice
curl -X POST http://localhost:3000/api/vtc/invoices/from-quote/<quote-id> \
  -H "Cookie: better-auth.session_token=..."
```

---

## Test Cases

### Unit/Integration Tests

| Test ID | Description        | Input               | Expected                             |
| ------- | ------------------ | ------------------- | ------------------------------------ |
| TC1     | Partner FIXED_GRID | Ritz + CDG→Paris    | price: 72€, mode: FIXED_GRID         |
| TC2     | Private DYNAMIC    | Private + CDG→Paris | mode: DYNAMIC, multipliers applied   |
| TC3     | Vehicle multiplier | LUXE category       | price × 1.9                          |
| TC4     | Zone multiplier    | CDG pickup          | max(pickup, dropoff) zone multiplier |
| TC5     | Cost breakdown     | Any quote           | fuel, tolls, driver, wear present    |
| TC6     | Invoice deep-copy  | Quote→Invoice       | costBreakdown identical              |

### E2E Tests

| Test ID | Description            | Steps                     | Expected                     |
| ------- | ---------------------- | ------------------------- | ---------------------------- |
| E2E1    | Quote creation         | Navigate, fill form, save | Quote created with pricing   |
| E2E2    | Quote accept           | Open quote, click accept  | Status: ACCEPTED             |
| E2E3    | Convert to invoice     | Click convert             | Invoice created              |
| E2E4    | Cost breakdown display | View quote detail         | CostBreakdownDisplay visible |

---

## Files to Create/Modify

| File                                                                | Action | Description          |
| ------------------------------------------------------------------- | ------ | -------------------- |
| `packages/api/src/routes/vtc/__tests__/pricing-consistency.test.ts` | Create | Integration tests    |
| `apps/web/e2e/quote-invoice-flow.spec.ts`                           | Create | Playwright E2E tests |
| `docs/sprint-artifacts/15-8-pricing-consistency-validation.md`      | Update | Test results         |

---

## Definition of Done

- [ ] Integration tests created for pricing consistency
- [ ] E2E tests created with Playwright MCP
- [ ] All tests pass
- [ ] AC1-AC5 covered by tests
- [ ] Test results documented
- [ ] No regressions in existing functionality
- [ ] Code reviewed and approved

---

## Related Documentation

- [PRD FR7: Dual pricing modes](../bmad/prd.md)
- [PRD FR24: Profitability indicator](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 15.7: Cost Breakdown](./15-7-cost-breakdown-quotes-invoices.md)
