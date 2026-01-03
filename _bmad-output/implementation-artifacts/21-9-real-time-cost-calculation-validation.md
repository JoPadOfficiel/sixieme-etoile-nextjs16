# Story 21.9: Real-Time Cost Calculation Validation

## Story ID

`21-9-real-time-cost-calculation-validation`

## Epic

Epic 21 - Complete Pricing System Refactor with Full Transparency

## Status

**IN_PROGRESS**

## Description

**As an** operator,  
**I want** to validate pricing calculations in real-time,  
**So that** I can catch errors before sending quotes to clients.

This story implements a validation system that provides:

- Visual indicators showing calculation consistency (green check / red alert)
- Error detection when calculations don't match expected ranges
- Manual recalculation button to refresh all costs
- Audit trail logging all calculation changes with timestamps

## Related FRs

- **FR110**: Real-time cost calculation validation

## Prerequisites

- Story 21.1 (Staffing Costs Display) - ✅ Done
- Story 21.2 (Approach Fee Display) - ✅ Done
- Story 21.3 (Time Calculation Breakdown) - ✅ Done
- Story 21.4 (Pricing Segments Visualization) - ✅ Done
- Story 21.5 (RSE Staffing in Dispatch) - ✅ Done
- Story 21.6 (Automatic Empty Return) - ✅ Done
- Story 21.7 (Enhanced TripTransparency) - ✅ Done
- Story 21.8 (Zone-Based Cost Transparency) - ✅ Done

## Acceptance Criteria

### AC1: Calculation Validation Indicator

**Given** any quote in creation or edit mode,  
**When** pricing calculation completes,  
**Then** the system displays a validation indicator:

- ✅ Green check with "Calculations Valid" if all checks pass
- ⚠️ Amber warning with specific message if minor inconsistencies detected
- ❌ Red alert with error details if calculations fail validation

### AC2: Internal Cost vs Selling Price Sanity Check

**Given** a pricing result with internal cost and selling price,  
**When** validation runs,  
**Then** the system checks:

- Selling price >= internal cost (margin >= 0%)
- Margin is within configured thresholds (green/orange/red)
- Price is not unreasonably high (e.g., > 10x internal cost)
- Price is not below minimum threshold if configured

### AC3: Zone Multiplier Consistency Check

**Given** a pricing result with zone multipliers applied,  
**When** validation runs,  
**Then** the system verifies:

- Applied multiplier matches the zone configuration
- Pickup and dropoff zones are correctly identified
- Aggregation strategy (MAX, PICKUP_ONLY, etc.) is correctly applied
- Zone surcharges are correctly summed

### AC4: Staffing Cost Reasonableness Check

**Given** a pricing result with RSE staffing costs,  
**When** validation runs,  
**Then** the system validates:

- Second driver cost = hours × hourly rate (not fixed amount)
- Hotel cost = nights × drivers × nightly rate
- Meal cost = meals × unit price
- Total staffing cost is proportional to trip duration

### AC5: Time Calculation Plausibility Check

**Given** a pricing result with time analysis,  
**When** validation runs,  
**Then** the system checks:

- Total duration >= service segment duration
- Approach + service + return = total (within tolerance)
- Duration is plausible for distance (min 30km/h, max 130km/h average)
- RSE breaks are included for heavy vehicles on long trips

### AC6: Manual Recalculation Button

**Given** a quote with pricing displayed,  
**When** operator clicks "Recalculate" button,  
**Then** the system:

- Triggers a fresh pricing calculation with current parameters
- Shows loading state during calculation
- Updates all pricing displays with new values
- Re-runs validation checks on new results
- Logs the recalculation event

### AC7: Validation Audit Trail

**Given** any pricing calculation or validation event,  
**When** the event occurs,  
**Then** the system logs:

- Timestamp of the event
- Type of event (INITIAL_CALC, RECALCULATE, VALIDATION_PASS, VALIDATION_FAIL)
- Key values (price, internal cost, margin)
- Any validation warnings or errors
- User who triggered the action (if manual)

## Technical Implementation

### Files to Create

1. `apps/web/modules/saas/quotes/components/CalculationValidationSection.tsx`

   - New UI component for validation display
   - Shows validation status with icons and messages
   - Contains recalculate button
   - Displays audit trail

2. `packages/api/src/services/pricing/validation.ts`
   - Validation logic functions
   - Sanity check implementations
   - Validation result types

### Files to Modify

1. `packages/api/src/services/pricing/types.ts`

   - Add `ValidationResult` interface
   - Add `ValidationCheck` interface
   - Add `AuditLogEntry` interface

2. `packages/api/src/services/pricing/main-calculator.ts`

   - Integrate validation after price calculation
   - Add validation result to PricingResult

3. `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`

   - Integrate CalculationValidationSection
   - Pass validation data to component

4. `apps/web/modules/saas/quotes/types.ts`

   - Add frontend validation types

5. `apps/web/app/[locale]/(saas)/dashboard/quotes/create/page.tsx`
   - Add recalculate handler
   - Pass recalculate function to TripTransparencyPanel

### New Types

```typescript
// Validation check result
interface ValidationCheck {
  id: string;
  name: string;
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  details?: Record<string, unknown>;
}

// Overall validation result
interface ValidationResult {
  isValid: boolean;
  overallStatus: "VALID" | "WARNING" | "INVALID";
  checks: ValidationCheck[];
  timestamp: string;
}

// Audit log entry
interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType:
    | "INITIAL_CALC"
    | "RECALCULATE"
    | "VALIDATION_PASS"
    | "VALIDATION_FAIL"
    | "PRICE_OVERRIDE";
  price: number;
  internalCost: number;
  marginPercent: number;
  validationStatus: "VALID" | "WARNING" | "INVALID";
  warnings: string[];
  errors: string[];
  triggeredBy: "SYSTEM" | "USER";
  userId?: string;
}
```

### Validation Rules

| Check                 | Condition                  | Status               |
| --------------------- | -------------------------- | -------------------- |
| Margin Positive       | margin >= 0                | FAIL if negative     |
| Margin Reasonable     | margin <= 200%             | WARNING if > 200%    |
| Price vs Cost         | price >= internalCost      | FAIL if price < cost |
| Zone Multiplier       | applied == configured      | FAIL if mismatch     |
| Duration Plausible    | 30 <= avgSpeed <= 130 km/h | WARNING if outside   |
| Staffing Proportional | cost varies with duration  | WARNING if fixed     |
| Components Sum        | sum(components) ≈ total    | FAIL if > 5% diff    |

## Test Cases

### TC1: Valid Calculation Display

**Steps:**

1. Create a quote with valid parameters (Paris → CDG, Berline)
2. Wait for pricing calculation

**Expected:**

- Green check icon displayed
- "Calculations Valid" message
- All validation checks show PASS

### TC2: Negative Margin Warning

**Steps:**

1. Create a quote with partner grid price below internal cost
2. Wait for pricing calculation

**Expected:**

- Amber warning icon displayed
- "Negative margin detected" message
- Margin check shows WARNING (not FAIL for contract prices)

### TC3: Zone Multiplier Mismatch Detection

**Steps:**

1. Create a quote crossing multiple zones
2. Manually verify zone multiplier in database
3. Compare with applied multiplier

**Expected:**

- If mismatch: Red alert with "Zone multiplier inconsistency"
- If match: Green check

### TC4: Recalculate Button Function

**Steps:**

1. Create a quote and note the price
2. Click "Recalculate" button
3. Observe loading state
4. Verify new calculation completes

**Expected:**

- Loading spinner appears
- Price recalculates (may be same or different)
- Validation re-runs
- Audit log shows RECALCULATE event

### TC5: Staffing Cost Validation

**Steps:**

1. Create a long-distance quote (Paris → Nice)
2. Verify RSE staffing is applied
3. Check staffing cost breakdown

**Expected:**

- Second driver cost varies with trip duration
- Not a fixed amount (e.g., not always 123€)
- Validation passes if proportional

### TC6: Audit Trail Display

**Steps:**

1. Create a quote
2. Recalculate twice
3. Override price manually
4. View audit trail

**Expected:**

- 4 entries in audit trail
- Each entry shows timestamp, event type, values
- Most recent at top

## UI/UX Specifications

### Validation Section Layout

```
┌─────────────────────────────────────────────────────┐
│ Calculation Validation                    [Recalc] │
├─────────────────────────────────────────────────────┤
│ ✅ All checks passed                                │
│                                                     │
│ ├─ ✅ Margin positive (23.5%)                       │
│ ├─ ✅ Zone multiplier correct (×1.2)                │
│ ├─ ✅ Duration plausible (45 km/h avg)              │
│ ├─ ✅ Staffing costs proportional                   │
│ └─ ✅ Components sum matches total                  │
│                                                     │
│ ▼ Audit Trail (3 events)                           │
│   12:05:23 - INITIAL_CALC - 245€ - Valid           │
│   12:06:45 - RECALCULATE - 245€ - Valid            │
│   12:07:12 - PRICE_OVERRIDE - 260€ - Valid         │
└─────────────────────────────────────────────────────┘
```

### Warning State

```
┌─────────────────────────────────────────────────────┐
│ Calculation Validation                    [Recalc] │
├─────────────────────────────────────────────────────┤
│ ⚠️ 1 warning detected                               │
│                                                     │
│ ├─ ✅ Margin positive (5.2%)                        │
│ ├─ ✅ Zone multiplier correct (×1.0)                │
│ ├─ ⚠️ Low margin - below orange threshold (15%)    │
│ ├─ ✅ Duration plausible (52 km/h avg)              │
│ └─ ✅ Components sum matches total                  │
└─────────────────────────────────────────────────────┘
```

### Error State

```
┌─────────────────────────────────────────────────────┐
│ Calculation Validation                    [Recalc] │
├─────────────────────────────────────────────────────┤
│ ❌ Validation failed - 1 error                      │
│                                                     │
│ ├─ ❌ Negative margin (-8.3%)                       │
│ ├─ ✅ Zone multiplier correct (×1.1)                │
│ ├─ ✅ Duration plausible (48 km/h avg)              │
│ └─ ✅ Components sum matches total                  │
│                                                     │
│ ⚠️ Review pricing before sending to client          │
└─────────────────────────────────────────────────────┘
```

## Dependencies

- Epic 4 (Dynamic Pricing) - Pricing calculation functions
- Epic 17 (Zone Resolution) - Zone multiplier logic
- Epic 19 (RSE Staffing) - Staffing cost calculations
- Epic 20 (Bug Fixes) - Corrected calculation functions

## Constraints

- Validation must not block quote creation (warnings only)
- Contract prices may have negative margins (Engagement Rule)
- Recalculation should complete within 3 seconds
- Audit trail limited to last 10 events per quote session

## Out of Scope

- Persistent audit trail storage in database (session only)
- Automatic price correction
- Email alerts for validation failures
- Historical validation reports

## Translations Required

```json
{
  "quotes.create.validation.title": "Calculation Validation",
  "quotes.create.validation.recalculate": "Recalculate",
  "quotes.create.validation.valid": "All checks passed",
  "quotes.create.validation.warning": "{count} warning(s) detected",
  "quotes.create.validation.invalid": "Validation failed - {count} error(s)",
  "quotes.create.validation.checks.marginPositive": "Margin positive",
  "quotes.create.validation.checks.marginReasonable": "Margin reasonable",
  "quotes.create.validation.checks.zoneMultiplier": "Zone multiplier correct",
  "quotes.create.validation.checks.durationPlausible": "Duration plausible",
  "quotes.create.validation.checks.staffingProportional": "Staffing costs proportional",
  "quotes.create.validation.checks.componentsSum": "Components sum matches total",
  "quotes.create.validation.auditTrail": "Audit Trail",
  "quotes.create.validation.reviewWarning": "Review pricing before sending to client"
}
```

## Estimation

- **Effort**: Medium (M)
- **Complexity**: Medium
- **Risk**: Low

## Definition of Done

- [ ] CalculationValidationSection component created
- [ ] Validation logic implemented in pricing module
- [ ] All 6 validation checks implemented
- [ ] Recalculate button functional
- [ ] Audit trail displays in UI
- [ ] Translations added (EN/FR)
- [ ] Unit tests for validation functions
- [ ] E2E tests via Playwright MCP
- [ ] API tests via Curl
- [ ] Database verification via MCP Postgres
- [ ] Code review completed
- [ ] sprint-status.yaml updated to done
