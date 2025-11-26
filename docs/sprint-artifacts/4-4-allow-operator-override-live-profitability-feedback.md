# Story 4.4: Allow Operator Override with Live Profitability Feedback

Status: done

## Story

**As an** operator,  
**I want** to override the suggested price while seeing updated profitability,  
**So that** I can adjust quotes within commercial and operational constraints.

## Acceptance Criteria

### AC1: Live Profitability Update on Override

- **Given** a computed quote with suggested price, internal cost and margin
- **When** I manually edit the final selling price in the cockpit's Pricing column
- **Then** the margin percentage and profitability indicator (green/orange/red) update immediately
- **And** the edited price is persisted as `finalPrice` distinct from `suggestedPrice`

### AC2: Override Constraints Enforcement

- **Given** constraints on overrides (e.g. minimum margin or role-based limits)
- **When** an operator attempts to override the price
- **Then** constraints are enforced with clear error messages when an override is not permitted

### AC3: Override Tracking in appliedRules

- **Given** a price override is applied
- **When** the pricing result is returned
- **Then** `appliedRules` contains a `MANUAL_OVERRIDE` entry with:
  - `previousPrice`: the price before override
  - `newPrice`: the overridden price
  - `priceChange`: absolute change in EUR
  - `priceChangePercent`: percentage change
  - `reason`: optional reason provided by operator
  - `overriddenAt`: ISO datetime of override

### AC4: Profitability Recalculation

- **Given** a new `finalPrice` different from `suggestedPrice`
- **When** profitability is recalculated
- **Then** `margin = finalPrice - internalCost`
- **And** `marginPercent = (margin / finalPrice) × 100`
- **And** `profitabilityIndicator` is correctly updated:
  - Green: marginPercent ≥ 20%
  - Orange: 0% ≤ marginPercent < 20%
  - Red: marginPercent < 0%

## Technical Tasks

### Task 1: Create ManualOverrideRule Type

- [x] Define `ManualOverrideRule` interface extending `AppliedRule`
- [x] Add fields: `previousPrice`, `newPrice`, `priceChange`, `priceChangePercent`, `reason`, `overriddenAt`
- [x] Export type from `pricing-engine.ts`

### Task 2: Create Profitability Recalculation Function

- [x] Create `recalculateProfitability()` function in pricing engine
- [x] Input: `newPrice`, `internalCost`, `previousPrice`, `appliedRules`
- [x] Output: updated `price`, `margin`, `marginPercent`, `profitabilityIndicator`, `appliedRules`
- [x] Add `MANUAL_OVERRIDE` rule to `appliedRules`
- [x] Ensure calculation matches existing profitability logic

### Task 3: Create Override Validation Function

- [x] Create `validatePriceOverride()` function
- [x] Check minimum margin constraint (configurable per organization)
- [x] Check role-based limits (future: admin can override anything, operator has limits)
- [x] Return validation result with error message if invalid

### Task 4: Create API Endpoint for Price Override

- [x] Add `POST /api/vtc/pricing/override` endpoint to `pricing-calculate.ts`
- [x] Request schema: `{ pricingResult: PricingResult, newPrice: number, reason?: string }`
- [x] Response: updated `PricingResult` with override tracking
- [x] Include `overrideApplied`, `previousPrice`, `priceChange`, `priceChangePercent` in response

### Task 5: Update PricingResult Response Type

- [x] Add optional `overrideApplied?: boolean` field
- [x] Add optional `previousPrice?: number` field (only present after override)
- [x] Ensure backward compatibility with existing consumers

### Task 6: Unit Tests

- [x] Test `recalculateProfitability()` with various price changes
- [x] Test margin calculation: `margin = finalPrice - internalCost`
- [x] Test marginPercent calculation: `(margin / finalPrice) × 100`
- [x] Test profitability indicator transitions (green→orange→red)
- [x] Test `MANUAL_OVERRIDE` rule is added to `appliedRules`
- [x] Test `validatePriceOverride()` with valid and invalid prices
- [x] Test idempotence: multiple overrides produce consistent results

### Task 7: Integration Tests

- [x] Test `POST /api/vtc/pricing/override` endpoint
- [x] Test override with valid price returns updated profitability
- [x] Test override with invalid price returns error
- [x] Test `appliedRules` contains `MANUAL_OVERRIDE` entry
- [x] Test response structure matches expected format

## Data Types

### ManualOverrideRule Interface

```typescript
interface ManualOverrideRule extends AppliedRule {
  type: "MANUAL_OVERRIDE";
  previousPrice: number;
  newPrice: number;
  priceChange: number; // newPrice - previousPrice
  priceChangePercent: number; // (priceChange / previousPrice) × 100
  reason?: string;
  overriddenAt: string; // ISO datetime
}
```

### RecalculateProfitabilityInput

```typescript
interface RecalculateProfitabilityInput {
  newPrice: number;
  internalCost: number;
  previousPrice: number;
  previousAppliedRules: AppliedRule[];
  reason?: string;
}
```

### RecalculateProfitabilityResult

```typescript
interface RecalculateProfitabilityResult {
  price: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityIndicator;
  appliedRules: AppliedRule[];
  overrideApplied: boolean;
  priceChange: number;
  priceChangePercent: number;
}
```

### Override Validation Result

```typescript
interface OverrideValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorCode?: "BELOW_MINIMUM_MARGIN" | "EXCEEDS_ROLE_LIMIT" | "INVALID_PRICE";
}
```

## API Contract

### POST /api/vtc/pricing/override

Request:

```json
{
  "pricingResult": {
    "pricingMode": "DYNAMIC",
    "price": 90.00,
    "currency": "EUR",
    "internalCost": 44.70,
    "margin": 45.30,
    "marginPercent": 50.33,
    "profitabilityIndicator": "green",
    "matchedGrid": null,
    "fallbackReason": "PRIVATE_CLIENT",
    "appliedRules": [...],
    "isContractPrice": false,
    "tripAnalysis": {...}
  },
  "newPrice": 75.00,
  "reason": "Customer loyalty discount"
}
```

Response (Success):

```json
{
  "pricingMode": "DYNAMIC",
  "price": 75.00,
  "currency": "EUR",
  "internalCost": 44.70,
  "margin": 30.30,
  "marginPercent": 40.40,
  "profitabilityIndicator": "green",
  "matchedGrid": null,
  "fallbackReason": "PRIVATE_CLIENT",
  "appliedRules": [
    ...previousRules,
    {
      "type": "MANUAL_OVERRIDE",
      "previousPrice": 90.00,
      "newPrice": 75.00,
      "priceChange": -15.00,
      "priceChangePercent": -16.67,
      "reason": "Customer loyalty discount",
      "overriddenAt": "2025-11-26T17:30:00+01:00"
    }
  ],
  "isContractPrice": false,
  "tripAnalysis": {...},
  "overrideApplied": true,
  "previousPrice": 90.00,
  "priceChange": -15.00,
  "priceChangePercent": -16.67
}
```

Response (Validation Error):

```json
{
  "error": "BELOW_MINIMUM_MARGIN",
  "message": "Price override rejected: resulting margin (5.3%) is below minimum threshold (10%)",
  "details": {
    "requestedPrice": 50.0,
    "internalCost": 44.7,
    "resultingMargin": 5.3,
    "resultingMarginPercent": 10.6,
    "minimumMarginPercent": 10
  }
}
```

## Test Scenarios

### Scenario 1: Standard Price Override

```typescript
const pricingResult = {
  price: 90.00,
  internalCost: 44.70,
  marginPercent: 50.33,
  profitabilityIndicator: "green",
  appliedRules: [...],
};

const result = recalculateProfitability({
  newPrice: 75.00,
  internalCost: 44.70,
  previousPrice: 90.00,
  previousAppliedRules: pricingResult.appliedRules,
  reason: "Customer discount",
});

// Expected:
// margin = 75 - 44.70 = 30.30
// marginPercent = 30.30 / 75 × 100 = 40.4%
// profitabilityIndicator = "green" (≥20%)

expect(result.price).toBe(75);
expect(result.margin).toBeCloseTo(30.3, 2);
expect(result.marginPercent).toBeCloseTo(40.4, 1);
expect(result.profitabilityIndicator).toBe("green");
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "MANUAL_OVERRIDE",
    previousPrice: 90,
    newPrice: 75,
  })
);
```

### Scenario 2: Override Causing Orange Indicator

```typescript
const result = recalculateProfitability({
  newPrice: 52.0,
  internalCost: 44.7,
  previousPrice: 90.0,
  previousAppliedRules: [],
});

// margin = 52 - 44.70 = 7.30
// marginPercent = 7.30 / 52 × 100 = 14.04%
// profitabilityIndicator = "orange" (0-20%)

expect(result.marginPercent).toBeCloseTo(14.04, 1);
expect(result.profitabilityIndicator).toBe("orange");
```

### Scenario 3: Override Causing Red Indicator (Loss)

```typescript
const result = recalculateProfitability({
  newPrice: 40.0,
  internalCost: 44.7,
  previousPrice: 90.0,
  previousAppliedRules: [],
});

// margin = 40 - 44.70 = -4.70
// marginPercent = -4.70 / 40 × 100 = -11.75%
// profitabilityIndicator = "red" (<0%)

expect(result.margin).toBeCloseTo(-4.7, 2);
expect(result.marginPercent).toBeCloseTo(-11.75, 1);
expect(result.profitabilityIndicator).toBe("red");
```

### Scenario 4: Override Validation - Below Minimum Margin

```typescript
const validation = validatePriceOverride({
  newPrice: 45.0,
  internalCost: 44.7,
  minimumMarginPercent: 10, // Organization setting
});

// margin = 45 - 44.70 = 0.30
// marginPercent = 0.30 / 45 × 100 = 0.67%
// Below 10% minimum → rejected

expect(validation.isValid).toBe(false);
expect(validation.errorCode).toBe("BELOW_MINIMUM_MARGIN");
expect(validation.errorMessage).toContain("below minimum threshold");
```

### Scenario 5: Grid Pricing Override with Warning

```typescript
const gridPricingResult = {
  pricingMode: "FIXED_GRID",
  price: 150.0,
  isContractPrice: true,
  // ...
};

const result = recalculateProfitability({
  newPrice: 130.0,
  internalCost: 44.7,
  previousPrice: 150.0,
  previousAppliedRules: gridPricingResult.appliedRules,
});

// Override is allowed but warning should be included
expect(result.appliedRules).toContainEqual(
  expect.objectContaining({
    type: "MANUAL_OVERRIDE",
    description: expect.stringContaining("Contract price overridden"),
  })
);
```

## Dependencies

- Story 4.1: Implement Base Dynamic Price Calculation ✅ Done
- Story 4.2: Add Operational Cost Components to Internal Cost ✅ Done
- Story 4.3: Apply Multipliers and Target Margins ✅ Done

## Files to Create/Modify

### Modified Files

| File                                                         | Change                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Add `ManualOverrideRule` type, `recalculateProfitability()`, `validatePriceOverride()` |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Add `POST /pricing/override` endpoint                                                  |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Add override tests                                                                     |

## Dev Notes

### Calculation Must Stay in Backend

The margin and profitability calculation MUST remain in the pricing engine service, not in React components. This ensures:

- Consistent calculations across all consumers
- Single source of truth for business logic
- Easier testing and validation

### Override Tracking

Every override MUST be tracked in `appliedRules` with the `MANUAL_OVERRIDE` type. This provides:

- Full audit trail of price changes
- Transparency for finance review
- Ability to analyze override patterns

### Idempotence

Multiple overrides should produce consistent results:

- Each override replaces the previous `MANUAL_OVERRIDE` rule
- The `previousPrice` always refers to the price before the current override
- Timestamps track when each override occurred

### Grid Pricing Override

When overriding a `FIXED_GRID` price:

- The override is allowed (operators may need flexibility)
- A warning is included in the `MANUAL_OVERRIDE` rule description
- The `isContractPrice` flag remains `true` for audit purposes

### Future Enhancements

- Role-based override limits (admin vs operator)
- Override approval workflow for large discounts
- Override analytics and reporting

## Related PRD Sections

- **FR16:** Operators can override suggested price with profitability feedback
- **FR24:** Profitability indicator (green/orange/red) based on margin
- **FR55:** Trip Transparency allows manual adjustments with live margin recalculation

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/4-4-allow-operator-override-live-profitability-feedback.context.xml`

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

### Completion Notes List

### File List

| File                                                         | Action   | Description                      |
| ------------------------------------------------------------ | -------- | -------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Modified | Add override types and functions |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Modified | Add override endpoint            |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Modified | Add override tests               |
