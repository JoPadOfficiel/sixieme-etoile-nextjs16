# Story 17.9: Configurable Time Buckets for MAD Pricing

Status: done

## Story

As an **administrator**,
I want to configure time buckets for mise-à-disposition pricing with interpolation strategies,
so that pricing is predictable for any requested duration.

## Related FRs

**FR71**: The system shall support configurable time buckets for mise-à-disposition pricing with interpolation strategies (ROUND_UP, ROUND_DOWN, PROPORTIONAL) for durations that fall between defined buckets.

## Business Context

Currently, MAD (mise-à-disposition) pricing uses a simple hourly rate calculation:

- `basePrice = hours × ratePerHour`
- Plus overage for km exceeding included distance

This story adds **time bucket pricing** which allows organizations to define fixed prices for specific duration ranges (e.g., 3h=150€, 4h=180€, 6h=250€, 8h=320€), with configurable interpolation for durations that fall between buckets.

### Value Proposition

1. **Commercial Clarity**: Clients see predictable prices for standard durations
2. **Margin Control**: Organizations can optimize pricing per duration tier
3. **Flexibility**: Three interpolation strategies accommodate different business models
4. **Backward Compatibility**: Organizations without time buckets continue using hourly rates

## Acceptance Criteria

### AC1: Time Bucket Configuration UI

**Given** an admin navigating to Organisation Pricing Settings,  
**When** they access the "Time Buckets" section,  
**Then** they shall see a configurable list of time buckets with:

- Duration (hours)
- Price per vehicle category (EUR)
- Active/inactive status

### AC2: Interpolation Strategy Selection

**Given** the Time Buckets configuration section,  
**When** the admin views the settings,  
**Then** they shall see an "Interpolation Strategy" dropdown with options:

- `ROUND_UP` - Use next higher bucket price
- `ROUND_DOWN` - Use previous lower bucket price
- `PROPORTIONAL` - Interpolate linearly between bucket prices

### AC3: ROUND_UP Behavior

**Given** time buckets configured as: 4h=180€, 6h=250€,  
**And** interpolation strategy is `ROUND_UP`,  
**When** a 5h dispo is requested,  
**Then** the system shall use the 6h bucket price (250€).

### AC4: ROUND_DOWN Behavior

**Given** time buckets configured as: 4h=180€, 6h=250€,  
**And** interpolation strategy is `ROUND_DOWN`,  
**When** a 5h dispo is requested,  
**Then** the system shall use the 4h bucket price (180€).

### AC5: PROPORTIONAL Behavior

**Given** time buckets configured as: 4h=180€, 6h=250€,  
**And** interpolation strategy is `PROPORTIONAL`,  
**When** a 5h dispo is requested,  
**Then** the system shall interpolate: 180 + ((5-4)/(6-4)) × (250-180) = 215€.

### AC6: Below Minimum Bucket

**Given** time buckets configured starting at 3h=150€,  
**When** a 2h dispo is requested,  
**Then** the system shall fall back to hourly rate calculation (existing behavior).

### AC7: Above Maximum Bucket

**Given** time buckets configured with max 10h=400€,  
**When** a 12h dispo is requested,  
**Then** the system shall:

- Use 10h bucket as base (400€)
- Add hourly rate for extra 2 hours

### AC8: Vehicle Category Support

**Given** time buckets are configured,  
**When** prices are set per bucket,  
**Then** each bucket shall support different prices per vehicle category.

### AC9: Overage Still Applies

**Given** a time bucket price is applied,  
**When** actual distance exceeds included km,  
**Then** overage charges shall still be added on top of bucket price.

### AC10: Pricing Transparency

**Given** time bucket pricing is applied,  
**When** the quote is calculated,  
**Then** the `appliedRules` shall include:

- Rule type: `TIME_BUCKET`
- Bucket used (or interpolation details)
- Strategy applied
- Base bucket price before overage

## Tasks / Subtasks

- [x] **Task 1: Database Schema** (AC: 1, 2, 8)

  - [x] 1.1: Add `TimeBucketInterpolationStrategy` enum to Prisma schema
  - [x] 1.2: Add `timeBucketInterpolationStrategy` field to `OrganizationPricingSettings`
  - [x] 1.3: Create `MadTimeBucket` model with duration, vehicleCategoryId, price
  - [x] 1.4: Create and run migration

- [x] **Task 2: Pricing Engine** (AC: 3, 4, 5, 6, 7, 9, 10)

  - [x] 2.1: Add `TimeBucketInterpolationStrategy` type to pricing-engine.ts
  - [x] 2.2: Add `madTimeBuckets` field to `OrganizationPricingSettings` interface
  - [x] 2.3: Create `calculateDispoPriceWithBuckets()` function
  - [x] 2.4: Implement ROUND_UP interpolation logic
  - [x] 2.5: Implement ROUND_DOWN interpolation logic
  - [x] 2.6: Implement PROPORTIONAL interpolation logic
  - [x] 2.7: Handle edge cases (below min, above max)
  - [x] 2.8: Add `TIME_BUCKET` rule type to `AppliedRule`
  - [x] 2.9: Update `calculateDispoPrice()` to use buckets when available
  - [x] 2.10: Ensure overage is still calculated and added

- [x] **Task 3: API Endpoints** (AC: 1, 2, 8)

  - [x] 3.1: Create GET `/api/vtc/pricing/time-buckets` endpoint
  - [x] 3.2: Create POST `/api/vtc/pricing/time-buckets` endpoint
  - [x] 3.3: Create PATCH `/api/vtc/pricing/time-buckets/:id` endpoint
  - [x] 3.4: Create DELETE `/api/vtc/pricing/time-buckets/:id` endpoint
  - [x] 3.5: Stats endpoint for summary cards

- [x] **Task 4: Translations** (AC: 1, 2)

  - [x] 4.1: Add French translations (fr.json)
  - [x] 4.2: Add English translations (en.json)
  - [ ] 4.3: Create `TimeBucketsTable` component (UI - future)
  - [ ] 4.4: Create `TimeBucketDrawer` for add/edit (UI - future)
  - [ ] 4.5: Add interpolation strategy dropdown to pricing settings (UI - future)

- [x] **Task 5: Tests** (AC: 3, 4, 5, 6, 7, 9, 10)
  - [x] 5.1: Unit tests for `calculateDispoPriceWithBuckets()`
  - [x] 5.2: Unit tests for each interpolation strategy
  - [x] 5.3: Unit tests for edge cases
  - [ ] 5.4: Integration test for API endpoints (future)
  - [ ] 5.5: E2E test for UI configuration (future)

## Dev Notes

### Architecture Patterns

**Pricing Engine Location**: `packages/api/src/services/pricing-engine.ts`

- Follow existing patterns from `calculateDispoPrice()` (lines 2949-2995)
- Use `TripTypePricingResult` return type for consistency
- Add new rule type to `AppliedRule` union

**Database Pattern**:

- New model `MadTimeBucket` similar to `SeasonalMultiplier` structure
- Enum `TimeBucketInterpolationStrategy` similar to `ZoneConflictStrategy`
- Link to `OrganizationPricingSettings` via `organizationId`

**API Pattern**: Follow existing CRUD patterns in `packages/api/src/routes/vtc/pricing/`

**UI Pattern**: Follow existing pricing settings pages (dispos, excursions, seasonal-multipliers)

### Key Files to Modify

| File                                                                           | Changes                  |
| ------------------------------------------------------------------------------ | ------------------------ |
| `packages/database/prisma/schema.prisma`                                       | Add enum + model + field |
| `packages/api/src/services/pricing-engine.ts`                                  | Add bucket pricing logic |
| `packages/api/src/routes/vtc/pricing/`                                         | New time-buckets routes  |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/` | New time-buckets page    |
| `apps/web/modules/saas/pricing/components/`                                    | New components           |
| `apps/web/modules/saas/pricing/types.ts`                                       | New types                |
| `packages/i18n/translations/fr.json`                                           | French translations      |
| `packages/i18n/translations/en.json`                                           | English translations     |

### Existing Dispo Pricing Logic (Reference)

```typescript
// Current implementation in pricing-engine.ts:2964-2994
export function calculateDispoPrice(
  durationMinutes: number,
  distanceKm: number,
  ratePerHour: number,
  settings: OrganizationPricingSettings
): TripTypePricingResult {
  const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
  const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.5;

  const hours = durationMinutes / 60;
  const basePrice = Math.round(hours * ratePerHour * 100) / 100;
  // ... overage calculation
}
```

### Interpolation Algorithm

```typescript
// PROPORTIONAL interpolation formula:
// price = lowerPrice + ((duration - lowerDuration) / (upperDuration - lowerDuration)) * (upperPrice - lowerPrice)

// Example: 4h=180€, 6h=250€, requested=5h
// price = 180 + ((5-4)/(6-4)) * (250-180)
// price = 180 + (1/2) * 70
// price = 180 + 35 = 215€
```

### Data Model Design

```prisma
enum TimeBucketInterpolationStrategy {
  ROUND_UP
  ROUND_DOWN
  PROPORTIONAL
}

model MadTimeBucket {
  id                String          @id @default(cuid())
  organizationId    String
  organization      Organization    @relation(...)

  durationHours     Int             // e.g., 3, 4, 6, 8, 10
  vehicleCategoryId String
  vehicleCategory   VehicleCategory @relation(...)
  price             Decimal         @db.Decimal(10, 2)

  isActive          Boolean         @default(true)
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([organizationId, durationHours, vehicleCategoryId])
  @@index([organizationId])
  @@map("mad_time_bucket")
}
```

### Project Structure Notes

- Pricing settings page: `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/`
- Components: `apps/web/modules/saas/pricing/components/`
- API routes: `packages/api/src/routes/vtc/pricing/`
- Tests: `packages/api/src/services/__tests__/`

### References

- [Source: docs/bmad/epics.md#Story-17.9]
- [Source: docs/bmad/prd.md#FR71]
- [Source: packages/api/src/services/pricing-engine.ts#calculateDispoPrice]
- [Source: packages/api/src/services/__tests__/dispo-pricing.test.ts]

## Test Cases

### Unit Tests (Vitest)

```typescript
describe("calculateDispoPriceWithBuckets", () => {
  // AC3: ROUND_UP
  it("should use next higher bucket when ROUND_UP", () => {
    const buckets = [
      { durationHours: 4, price: 180 },
      { durationHours: 6, price: 250 },
    ];
    const result = calculateDispoPriceWithBuckets(
      300,
      100,
      buckets,
      "ROUND_UP",
      settings
    );
    expect(result.price).toBe(250); // 5h → 6h bucket
  });

  // AC4: ROUND_DOWN
  it("should use previous lower bucket when ROUND_DOWN", () => {
    const buckets = [
      { durationHours: 4, price: 180 },
      { durationHours: 6, price: 250 },
    ];
    const result = calculateDispoPriceWithBuckets(
      300,
      100,
      buckets,
      "ROUND_DOWN",
      settings
    );
    expect(result.price).toBe(180); // 5h → 4h bucket
  });

  // AC5: PROPORTIONAL
  it("should interpolate linearly when PROPORTIONAL", () => {
    const buckets = [
      { durationHours: 4, price: 180 },
      { durationHours: 6, price: 250 },
    ];
    const result = calculateDispoPriceWithBuckets(
      300,
      100,
      buckets,
      "PROPORTIONAL",
      settings
    );
    expect(result.price).toBe(215); // 180 + (1/2) * 70
  });

  // AC6: Below minimum
  it("should fallback to hourly rate when below minimum bucket", () => {
    const buckets = [{ durationHours: 3, price: 150 }];
    const result = calculateDispoPriceWithBuckets(
      120,
      50,
      buckets,
      "ROUND_UP",
      settings
    );
    // 2h at hourly rate, not bucket
    expect(result.rule?.type).not.toBe("TIME_BUCKET");
  });

  // AC7: Above maximum
  it("should use max bucket + hourly for excess when above maximum", () => {
    const buckets = [{ durationHours: 10, price: 400 }];
    const result = calculateDispoPriceWithBuckets(
      720,
      300,
      buckets,
      "ROUND_UP",
      settings
    );
    // 12h = 10h bucket (400) + 2h × hourlyRate
    expect(result.price).toBeGreaterThan(400);
  });

  // AC9: Overage still applies
  it("should add overage on top of bucket price", () => {
    const buckets = [{ durationHours: 4, price: 180 }];
    const result = calculateDispoPriceWithBuckets(
      240,
      300,
      buckets,
      "ROUND_UP",
      settings
    );
    // 4h bucket = 180€, included = 200km, overage = 100km × 0.50 = 50€
    expect(result.price).toBe(230);
  });
});
```

### API Tests (Curl)

```bash
# Create time bucket
curl -X POST http://localhost:3000/api/vtc/pricing/time-buckets \
  -H "Content-Type: application/json" \
  -d '{"durationHours": 4, "vehicleCategoryId": "cat-id", "price": 180}'

# Get all time buckets
curl http://localhost:3000/api/vtc/pricing/time-buckets

# Update interpolation strategy
curl -X PATCH http://localhost:3000/api/vtc/pricing/settings \
  -H "Content-Type: application/json" \
  -d '{"timeBucketInterpolationStrategy": "PROPORTIONAL"}'
```

### E2E Tests (Playwright)

```typescript
test("admin can configure time buckets", async ({ page }) => {
  await page.goto("/app/org-slug/settings/pricing");
  await page.click('[data-testid="time-buckets-tab"]');
  await page.click('[data-testid="add-bucket"]');
  await page.fill('[name="durationHours"]', "4");
  await page.fill('[name="price"]', "180");
  await page.click('[data-testid="save-bucket"]');
  await expect(page.locator("text=4h - 180€")).toBeVisible();
});
```

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List
