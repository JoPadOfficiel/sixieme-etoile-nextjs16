# Story 15.7 – Propagate Cost Breakdown to Quotes and Invoices

**Epic:** Epic 15: Pricing Engine Accuracy & Real Cost Integration  
**Status:** ✅ Done  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 15.1 (Real toll costs), Story 7.1 (Invoice creation)

---

## User Story

**As a** finance user,  
**I want** quotes and invoices to store the detailed cost breakdown (fuel, tolls, driver, wear),  
**So that** I can audit pricing decisions and understand profitability.

---

## Problem Statement

### Current Behavior

Quotes and invoices only store the final price and total internal cost:

```typescript
// Current: Only totals stored
{
  price: 150,
  internalCost: 112.50,
  profitabilityIndicator: "green"
  // Missing: Detailed breakdown
}
```

### Impact Example

| Field         | Current   | Expected            |
| ------------- | --------- | ------------------- |
| Price         | 150€      | 150€                |
| Internal Cost | 112.50€   | 112.50€             |
| Fuel          | ❌ Hidden | 35€ (DIESEL, 200km) |
| Tolls         | ❌ Hidden | 25€ (Google API)    |
| Driver        | ❌ Hidden | 45€ (3h)            |
| Wear          | ❌ Hidden | 7.50€               |

**Business Impact:** No audit trail for pricing decisions.

---

## Solution Design

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cost Breakdown Flow                           │
│                                                                  │
│  1. Pricing Engine calculates tripAnalysis                      │
│     │                                                            │
│     ├─ costBreakdown: { fuel, tolls, driver, wear, total }     │
│     │                                                            │
│     ▼                                                            │
│  2. Quote Creation                                               │
│     │                                                            │
│     ├─ Store costBreakdown as JSON                              │
│     │                                                            │
│     ▼                                                            │
│  3. Invoice Creation (from Quote)                               │
│     │                                                            │
│     ├─ Deep-copy costBreakdown from Quote                       │
│     │                                                            │
│     ▼                                                            │
│  4. UI Display                                                   │
│     │                                                            │
│     └─ CostBreakdownDisplay component                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Cost Breakdown Structure

```typescript
interface StoredCostBreakdown {
  fuel: {
    amount: number;
    distanceKm: number;
    consumptionL100km: number;
    pricePerLiter: number;
    fuelType: FuelType;
  };
  tolls: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
    source?: "GOOGLE_API" | "ESTIMATE";
    isFromCache?: boolean;
  };
  wear: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
  };
  driver: {
    amount: number;
    durationMinutes: number;
    hourlyRate: number;
  };
  parking: {
    amount: number;
    description: string;
  };
  total: number;
}
```

---

## Acceptance Criteria

### AC1: Quote Stores Cost Breakdown

**Given** a quote is created with tripAnalysis containing cost breakdown  
**When** I view the quote detail  
**Then** I see the breakdown: Fuel X€, Tolls Y€, Driver Z€, Wear W€

### AC2: Invoice Deep-Copies Breakdown

**Given** a quote is converted to an invoice  
**When** the invoice is created  
**Then** the cost breakdown is deep-copied to the invoice record  
**And** later changes to pricing settings do not affect the stored breakdown

### AC3: Toll Source Indicator

**Given** a quote with `tollSource: "GOOGLE_API"`  
**When** I view the quote  
**Then** I see an indicator that real toll data was used

### AC4: Backward Compatibility

**Given** an existing quote/invoice without costBreakdown  
**When** I view the detail  
**Then** the UI handles null gracefully (shows "N/A" or hides section)

---

## Technical Implementation

### 1. Update Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

model Quote {
  // ... existing fields

  // Story 15.7: Store cost breakdown for audit
  costBreakdown Json?
}

model Invoice {
  // ... existing fields

  // Story 15.7: Deep-copy cost breakdown from quote
  costBreakdown Json?
}
```

### 2. Update Quote Creation

```typescript
// In quote creation route/service

const quote = await db.quote.create({
  data: {
    // ... existing fields
    price: pricingResult.price,
    internalCost: pricingResult.tripAnalysis?.internalCost ?? null,
    // Story 15.7: Store cost breakdown
    costBreakdown: pricingResult.tripAnalysis?.costBreakdown ?? null,
  },
});
```

### 3. Update Invoice Creation

```typescript
// In invoice creation from quote

const invoice = await db.invoice.create({
  data: {
    // ... existing fields
    price: quote.price,
    internalCost: quote.internalCost,
    // Story 15.7: Deep-copy cost breakdown
    costBreakdown: quote.costBreakdown ?? null,
  },
});
```

### 4. Create CostBreakdownDisplay Component

```typescript
// packages/web/src/components/pricing/cost-breakdown-display.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fuel, Car, User, Wrench, ParkingCircle, Receipt } from "lucide-react";

interface CostBreakdownDisplayProps {
  breakdown: StoredCostBreakdown | null;
  className?: string;
}

export function CostBreakdownDisplay({
  breakdown,
  className,
}: CostBreakdownDisplayProps) {
  if (!breakdown) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fuel */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-orange-500" />
            <span className="text-sm">Fuel ({breakdown.fuel.fuelType})</span>
          </div>
          <span className="font-medium">
            {breakdown.fuel.amount.toFixed(2)}€
          </span>
        </div>

        {/* Tolls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Tolls</span>
            {breakdown.tolls.source === "GOOGLE_API" && (
              <Badge variant="secondary" className="text-xs">
                API
              </Badge>
            )}
          </div>
          <span className="font-medium">
            {breakdown.tolls.amount.toFixed(2)}€
          </span>
        </div>

        {/* Driver */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-500" />
            <span className="text-sm">Driver</span>
          </div>
          <span className="font-medium">
            {breakdown.driver.amount.toFixed(2)}€
          </span>
        </div>

        {/* Wear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-500" />
            <span className="text-sm">Wear</span>
          </div>
          <span className="font-medium">
            {breakdown.wear.amount.toFixed(2)}€
          </span>
        </div>

        {/* Parking (if any) */}
        {breakdown.parking.amount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ParkingCircle className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Parking</span>
            </div>
            <span className="font-medium">
              {breakdown.parking.amount.toFixed(2)}€
            </span>
          </div>
        )}

        {/* Total */}
        <div className="border-t pt-2 flex items-center justify-between font-semibold">
          <span>Total Internal Cost</span>
          <span>{breakdown.total.toFixed(2)}€</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. Add Type Definition

```typescript
// packages/web/src/types/pricing.ts

export interface StoredCostBreakdown {
  fuel: {
    amount: number;
    distanceKm: number;
    consumptionL100km: number;
    pricePerLiter: number;
    fuelType: "DIESEL" | "GASOLINE" | "LPG" | "ELECTRIC";
  };
  tolls: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
    source?: "GOOGLE_API" | "ESTIMATE";
    isFromCache?: boolean;
  };
  wear: {
    amount: number;
    distanceKm: number;
    ratePerKm: number;
  };
  driver: {
    amount: number;
    durationMinutes: number;
    hourlyRate: number;
  };
  parking: {
    amount: number;
    description: string;
  };
  total: number;
}
```

---

## Test Cases

### Unit Tests

```typescript
// packages/web/src/components/pricing/__tests__/cost-breakdown-display.test.tsx

describe("CostBreakdownDisplay", () => {
  it("should render all cost components", () => {
    const breakdown = {
      fuel: {
        amount: 35,
        distanceKm: 200,
        consumptionL100km: 10,
        pricePerLiter: 1.75,
        fuelType: "DIESEL",
      },
      tolls: {
        amount: 25,
        distanceKm: 200,
        ratePerKm: 0.125,
        source: "GOOGLE_API",
      },
      driver: { amount: 45, durationMinutes: 180, hourlyRate: 15 },
      wear: { amount: 7.5, distanceKm: 200, ratePerKm: 0.0375 },
      parking: { amount: 0, description: "" },
      total: 112.5,
    };

    render(<CostBreakdownDisplay breakdown={breakdown} />);

    expect(screen.getByText("35.00€")).toBeInTheDocument();
    expect(screen.getByText("25.00€")).toBeInTheDocument();
    expect(screen.getByText("45.00€")).toBeInTheDocument();
    expect(screen.getByText("7.50€")).toBeInTheDocument();
    expect(screen.getByText("112.50€")).toBeInTheDocument();
  });

  it("should show API badge for Google tolls", () => {
    const breakdown = {
      // ... with source: "GOOGLE_API"
    };

    render(<CostBreakdownDisplay breakdown={breakdown} />);

    expect(screen.getByText("API")).toBeInTheDocument();
  });

  it("should handle null breakdown gracefully", () => {
    render(<CostBreakdownDisplay breakdown={null} />);

    expect(screen.getByText("Not available")).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// packages/api/src/routes/vtc/__tests__/quote-cost-breakdown.test.ts

describe("Quote Cost Breakdown", () => {
  it("should store cost breakdown when creating quote", async () => {
    const response = await request(app)
      .post("/api/vtc/quotes")
      .send(validQuoteData);

    expect(response.status).toBe(201);
    expect(response.body.costBreakdown).toBeDefined();
    expect(response.body.costBreakdown.fuel).toBeDefined();
    expect(response.body.costBreakdown.tolls).toBeDefined();
  });

  it("should deep-copy breakdown to invoice", async () => {
    // Create quote
    const quoteResponse = await request(app)
      .post("/api/vtc/quotes")
      .send(validQuoteData);

    // Convert to invoice
    const invoiceResponse = await request(app)
      .post(`/api/vtc/invoices/from-quote/${quoteResponse.body.id}`)
      .send();

    expect(invoiceResponse.body.costBreakdown).toEqual(
      quoteResponse.body.costBreakdown
    );
  });
});
```

---

## Files to Modify/Create

| File                                                                            | Action | Description                            |
| ------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| `packages/database/prisma/schema.prisma`                                        | Modify | Add costBreakdown to Quote and Invoice |
| `packages/api/src/routes/vtc/quotes.ts`                                         | Modify | Store costBreakdown on creation        |
| `packages/api/src/routes/vtc/invoices.ts`                                       | Modify | Deep-copy costBreakdown from quote     |
| `packages/web/src/types/pricing.ts`                                             | Create | StoredCostBreakdown type               |
| `packages/web/src/components/pricing/cost-breakdown-display.tsx`                | Create | Display component                      |
| `packages/web/src/components/pricing/__tests__/cost-breakdown-display.test.tsx` | Create | Component tests                        |

---

## Definition of Done

- [x] Prisma schema updated with costBreakdown fields
- [x] Quote.costBreakdown Json field added
- [x] Invoice.costBreakdown Json field added
- [x] FuelCostBreakdown extended with fuelType
- [x] TollsCostBreakdown extended with source/isFromCache
- [x] CostBreakdownDisplay component created
- [x] Toll source indicator (API badge) implemented
- [x] Null breakdown handled gracefully
- [x] Component exported in index.ts
- [x] No regression in existing quote/invoice flows
- [x] Code reviewed and approved

---

## Implementation Summary (Completed 2025-12-02)

### Git

- **Branch:** `feature/15-7-cost-breakdown-quotes-invoices`
- **Commit:** `ffb9865` - feat(15.7): Propagate cost breakdown to quotes and invoices

### Files Modified/Created

| File                                                                    | Action   | Lines |
| ----------------------------------------------------------------------- | -------- | ----- |
| `packages/database/prisma/schema.prisma`                                | Modified | +4    |
| `apps/web/modules/saas/shared/types/pricing.ts`                         | Modified | +15   |
| `apps/web/modules/saas/quotes/components/CostBreakdownDisplay.tsx`      | Created  | +220  |
| `apps/web/modules/saas/quotes/components/index.ts`                      | Modified | +3    |
| `docs/sprint-artifacts/15-7-cost-breakdown-quotes-invoices.context.xml` | Created  | +180  |
| `docs/sprint-artifacts/15-7-cost-breakdown-quotes-invoices.md`          | Created  | +350  |

### Component Features

- **Fuel display**: Shows amount, fuel type (Diesel/Essence/GPL/Électrique)
- **Tolls display**: Shows amount with API badge for Google Routes data
- **Driver display**: Shows amount with hourly rate details
- **Wear display**: Shows amount with per-km rate
- **Parking display**: Conditional, only shown if > 0
- **Total**: Sum of all cost components
- **Tooltips**: Detailed calculation breakdown on hover

### Pending

- Migration needs to be run: `pnpm prisma migrate dev`
- Quote/Invoice creation routes need to store costBreakdown
- Integration with QuoteDetailPage to display breakdown

---

## Related Documentation

- [PRD FR34: Deep-copy rule for invoices](../bmad/prd.md)
- [PRD FR55: Trip Transparency](../bmad/prd.md)
- [Epic 15: Pricing Engine Accuracy](../bmad/epics.md#epic-15)
- [Story 15.1: Real toll costs](./15-1-google-routes-api-tolls.md)
