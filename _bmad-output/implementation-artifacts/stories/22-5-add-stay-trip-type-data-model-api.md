# Story 22.5: Add STAY Trip Type - Data Model & API

**Epic:** Epic 22 – VTC ERP Complete System Enhancement & Critical Fixes  
**Status:** done  
**Created:** 2026-01-03  
**Priority:** High  
**Branch:** feature/22-5-stay-trip-type-data-model-api

---

## User Story

**As a** system architect,  
**I want** to add STAY trip type to support multi-day, multi-service packages,  
**So that** clients can book complete travel packages with detailed breakdowns.

---

## Description

This story extends the VTC ERP data model to support **STAY** trip type - a multi-day package system that combines multiple services (transfers, dispos, excursions) across multiple days with:

1. **Extended TripType Enum**: Add STAY to the existing TripType enum
2. **StayDay Model**: Individual days within a stay with date, services, and staffing requirements
3. **StayService Model**: Individual services within a day (TRANSFER, DISPO, EXCURSION)
4. **Quote Extension**: Link Quote to StayDays for STAY trip type
5. **API Endpoints**: CRUD operations for stay quotes with day/service management
6. **Pricing Integration**: Calculate costs per day and per service with RSE staffing

### Business Value

- **Complete Packages**: Clients can book multi-day travel programs with one quote
- **Detailed Pricing**: Each service and day has transparent cost breakdown
- **RSE Compliance**: Staffing costs (hotel, meals, second driver) calculated per day
- **Invoice Decomposition**: Each service becomes a separate invoice line

### Prerequisites

- Existing Quote model with TripType enum
- Pricing engine with RSE staffing calculations
- Invoice system with line items

---

## Acceptance Criteria

### AC1: TripType Enum Extension

```gherkin
Given the TripType enum in Prisma schema
When I add the STAY value
Then the enum contains: TRANSFER, EXCURSION, DISPO, OFF_GRID, STAY
And the migration runs successfully
And existing quotes are not affected
```

### AC2: StayDay Model Creation

```gherkin
Given a Quote with tripType = STAY
When I create StayDay records
Then each StayDay contains:
  | Field | Type | Description |
  | id | String | Primary key (cuid) |
  | quoteId | String | Foreign key to Quote |
  | dayNumber | Int | Day order (1, 2, 3...) |
  | date | DateTime | Specific date for this day |
  | hotelRequired | Boolean | Whether overnight stay is needed |
  | hotelCost | Decimal | Cost of hotel for this day |
  | mealCount | Int | Number of meals for this day |
  | mealCost | Decimal | Total meal cost for this day |
  | driverCount | Int | Number of drivers needed (1 or 2) |
  | driverOvernightCost | Decimal | Driver overnight premium if applicable |
  | notes | String? | Day-specific notes |
  | createdAt | DateTime | Creation timestamp |
  | updatedAt | DateTime | Update timestamp |
And the model has proper indexes on quoteId and date
```

### AC3: StayService Model Creation

```gherkin
Given a StayDay record
When I create StayService records
Then each StayService contains:
  | Field | Type | Description |
  | id | String | Primary key (cuid) |
  | stayDayId | String | Foreign key to StayDay |
  | serviceOrder | Int | Order within the day (1, 2, 3...) |
  | serviceType | StayServiceType | TRANSFER, DISPO, or EXCURSION |
  | pickupAt | DateTime | Pickup time for this service |
  | pickupAddress | String | Pickup location |
  | pickupLatitude | Decimal? | Pickup coordinates |
  | pickupLongitude | Decimal? | Pickup coordinates |
  | dropoffAddress | String? | Dropoff location (optional for DISPO) |
  | dropoffLatitude | Decimal? | Dropoff coordinates |
  | dropoffLongitude | Decimal? | Dropoff coordinates |
  | durationHours | Decimal? | Duration for DISPO services |
  | stops | Json? | Intermediate stops for EXCURSION |
  | distanceKm | Decimal? | Calculated distance |
  | durationMinutes | Int? | Calculated duration |
  | serviceCost | Decimal | Cost for this service |
  | serviceInternalCost | Decimal | Internal cost for this service |
  | tripAnalysis | Json? | Service-specific trip analysis |
  | notes | String? | Service-specific notes |
  | createdAt | DateTime | Creation timestamp |
  | updatedAt | DateTime | Update timestamp |
And the model has proper indexes on stayDayId and serviceOrder
```

### AC4: StayServiceType Enum

```gherkin
Given the need to classify services within a stay
When I create the StayServiceType enum
Then it contains: TRANSFER, DISPO, EXCURSION
And it is used by the StayService model
```

### AC5: Quote Model Extension

```gherkin
Given a Quote with tripType = STAY
When I view the quote
Then it has:
  - stayDays relation to StayDay[]
  - stayStartDate field (first day of stay)
  - stayEndDate field (last day of stay)
  - totalDays computed from stayDays count
And the existing Quote fields remain unchanged for other trip types
```

### AC6: API - Create Stay Quote

```gherkin
Given I am authenticated as an operator
When I POST to /api/vtc/quotes with:
  {
    "tripType": "STAY",
    "contactId": "valid-contact-id",
    "vehicleCategoryId": "valid-category-id",
    "passengerCount": 2,
    "stayDays": [
      {
        "date": "2026-01-15",
        "hotelRequired": true,
        "mealCount": 2,
        "driverCount": 1,
        "services": [
          {
            "serviceType": "TRANSFER",
            "pickupAt": "2026-01-15T10:00:00",
            "pickupAddress": "CDG Airport",
            "dropoffAddress": "Hotel Paris"
          },
          {
            "serviceType": "DISPO",
            "pickupAt": "2026-01-15T14:00:00",
            "pickupAddress": "Hotel Paris",
            "durationHours": 4
          }
        ]
      },
      {
        "date": "2026-01-16",
        "hotelRequired": false,
        "mealCount": 1,
        "driverCount": 1,
        "services": [
          {
            "serviceType": "TRANSFER",
            "pickupAt": "2026-01-16T10:00:00",
            "pickupAddress": "Hotel Paris",
            "dropoffAddress": "CDG Airport"
          }
        ]
      }
    ]
  }
Then a Quote is created with:
  - tripType = STAY
  - stayDays with 2 records
  - Each stayDay has its services
  - Total cost calculated from all services + staffing
And the response includes the complete quote with all days and services
```

### AC7: API - Get Stay Quote Details

```gherkin
Given a Stay quote exists
When I GET /api/vtc/quotes/:id
Then the response includes:
  - Quote base fields
  - stayDays array with all days
  - Each day includes services array
  - Cost breakdown per day and per service
  - Total staffing costs (hotels, meals, driver premiums)
```

### AC8: API - Update Stay Quote

```gherkin
Given a Stay quote in DRAFT status
When I PATCH /api/vtc/quotes/:id with updated stayDays
Then the quote is updated
And old stayDays and services are replaced
And costs are recalculated
And the response includes the updated quote
```

### AC9: Pricing Calculation for Stay

```gherkin
Given a Stay quote with multiple days and services
When pricing is calculated
Then:
  - Each service is priced independently (transfer, dispo, excursion pricing)
  - Hotel costs are added per day where hotelRequired = true
  - Meal costs are calculated as mealCount × mealCostPerDay
  - Driver overnight premium is added when applicable
  - Total internalCost = sum of all service internal costs + staffing costs
  - Total suggestedPrice = sum of all service costs + staffing costs + margin
And the tripAnalysis JSON contains breakdown by day and service
```

### AC10: Database Migration

```gherkin
Given the new models and enum changes
When I run prisma migrate dev
Then the migration creates:
  - StayServiceType enum
  - StayDay table with all fields and indexes
  - StayService table with all fields and indexes
  - Quote table alterations for stay fields
And existing data is preserved
And the migration is reversible
```

---

## Technical Implementation

### Files to Create

```
packages/database/prisma/migrations/YYYYMMDDHHMMSS_add_stay_trip_type/
├── migration.sql                    # Generated migration

packages/api/src/services/
├── stay-pricing-service.ts          # Stay-specific pricing calculations

packages/api/src/routes/vtc/
├── stay-quotes.ts                   # Stay quote specific endpoints (optional, can extend quotes.ts)
```

### Files to Modify

```
packages/database/prisma/schema.prisma
├── Add StayServiceType enum
├── Add StayDay model
├── Add StayService model
├── Extend TripType enum with STAY
├── Add stayDays relation to Quote
├── Add stayStartDate and stayEndDate to Quote

packages/api/src/routes/vtc/quotes.ts
├── Extend create quote to handle STAY type
├── Extend get quote to include stayDays
├── Extend update quote to handle stayDays

packages/api/src/services/pricing-service.ts
├── Add stay pricing calculation
├── Integrate with stay-pricing-service

packages/database/src/index.ts
├── Export new types
```

### Data Model

```prisma
/// Stay service type for services within a stay day
enum StayServiceType {
  TRANSFER
  DISPO
  EXCURSION
}

/// StayDay - Individual day within a STAY quote
model StayDay {
  id             String       @id @default(cuid())
  quoteId        String
  quote          Quote        @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  dayNumber      Int          // Order: 1, 2, 3...
  date           DateTime     // Specific date

  // Staffing costs for this day
  hotelRequired       Boolean  @default(false)
  hotelCost           Decimal  @default(0) @db.Decimal(10, 2)
  mealCount           Int      @default(0)
  mealCost            Decimal  @default(0) @db.Decimal(10, 2)
  driverCount         Int      @default(1)
  driverOvernightCost Decimal  @default(0) @db.Decimal(10, 2)

  // Day totals
  dayTotalCost         Decimal  @default(0) @db.Decimal(10, 2)
  dayTotalInternalCost Decimal  @default(0) @db.Decimal(10, 2)

  notes          String?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  // Relations
  services       StayService[]

  @@index([quoteId])
  @@index([date])
  @@unique([quoteId, dayNumber])
  @@map("stay_day")
}

/// StayService - Individual service within a stay day
model StayService {
  id             String          @id @default(cuid())
  stayDayId      String
  stayDay        StayDay         @relation(fields: [stayDayId], references: [id], onDelete: Cascade)

  serviceOrder   Int             // Order within day: 1, 2, 3...
  serviceType    StayServiceType

  // Pickup details
  pickupAt        DateTime
  pickupAddress   String
  pickupLatitude  Decimal?       @db.Decimal(10, 7)
  pickupLongitude Decimal?       @db.Decimal(10, 7)

  // Dropoff details (optional for DISPO)
  dropoffAddress   String?
  dropoffLatitude  Decimal?      @db.Decimal(10, 7)
  dropoffLongitude Decimal?      @db.Decimal(10, 7)

  // Service-specific fields
  durationHours    Decimal?      @db.Decimal(5, 2)  // For DISPO
  stops            Json?         // For EXCURSION - intermediate stops

  // Calculated fields
  distanceKm       Decimal?      @db.Decimal(10, 2)
  durationMinutes  Int?

  // Pricing
  serviceCost         Decimal    @default(0) @db.Decimal(10, 2)
  serviceInternalCost Decimal    @default(0) @db.Decimal(10, 2)

  // Analysis
  tripAnalysis     Json?         // Service-specific trip analysis

  notes            String?

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  @@index([stayDayId])
  @@unique([stayDayId, serviceOrder])
  @@map("stay_service")
}
```

### API Request/Response Types

```typescript
// Create Stay Quote Request
interface CreateStayQuoteRequest {
  contactId: string;
  vehicleCategoryId: string;
  passengerCount: number;
  luggageCount?: number;
  notes?: string;
  stayDays: CreateStayDayInput[];
}

interface CreateStayDayInput {
  date: string; // ISO date
  hotelRequired?: boolean;
  mealCount?: number;
  driverCount?: number;
  notes?: string;
  services: CreateStayServiceInput[];
}

interface CreateStayServiceInput {
  serviceType: "TRANSFER" | "DISPO" | "EXCURSION";
  pickupAt: string; // ISO datetime
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffAddress?: string;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  durationHours?: number; // For DISPO
  stops?: StopInput[]; // For EXCURSION
  notes?: string;
}

// Stay Quote Response
interface StayQuoteResponse extends QuoteResponse {
  stayDays: StayDayResponse[];
  stayStartDate: string;
  stayEndDate: string;
  totalDays: number;
  totalStaffingCost: number;
  totalServicesCost: number;
}

interface StayDayResponse {
  id: string;
  dayNumber: number;
  date: string;
  hotelRequired: boolean;
  hotelCost: number;
  mealCount: number;
  mealCost: number;
  driverCount: number;
  driverOvernightCost: number;
  dayTotalCost: number;
  dayTotalInternalCost: number;
  notes: string | null;
  services: StayServiceResponse[];
}

interface StayServiceResponse {
  id: string;
  serviceOrder: number;
  serviceType: "TRANSFER" | "DISPO" | "EXCURSION";
  pickupAt: string;
  pickupAddress: string;
  dropoffAddress: string | null;
  durationHours: number | null;
  stops: any[] | null;
  distanceKm: number | null;
  durationMinutes: number | null;
  serviceCost: number;
  serviceInternalCost: number;
  notes: string | null;
}
```

---

## Tasks / Subtasks

- [ ] Task 1: Extend Prisma Schema (AC: #1, #2, #3, #4, #5, #10)

  - [ ] Add StayServiceType enum
  - [ ] Add StayDay model with all fields and indexes
  - [ ] Add StayService model with all fields and indexes
  - [ ] Add STAY to TripType enum
  - [ ] Add stayStartDate and stayEndDate to Quote
  - [ ] Add stayDays relation to Quote
  - [ ] Run prisma migrate dev
  - [ ] Run prisma generate

- [ ] Task 2: Create Stay Pricing Service (AC: #9)

  - [ ] Create stay-pricing-service.ts
  - [ ] Implement calculateStayPricing function
  - [ ] Calculate service costs using existing pricing logic
  - [ ] Calculate staffing costs (hotel, meals, driver premium)
  - [ ] Generate tripAnalysis with day/service breakdown

- [ ] Task 3: Extend Quote API for STAY (AC: #6, #7, #8)

  - [ ] Extend POST /api/vtc/quotes to handle STAY type
  - [ ] Create StayDay and StayService records
  - [ ] Extend GET /api/vtc/quotes/:id to include stayDays
  - [ ] Extend PATCH /api/vtc/quotes/:id to update stayDays
  - [ ] Add validation for STAY-specific fields

- [ ] Task 4: Update Pricing Service Integration

  - [ ] Integrate stay-pricing-service with main pricing-service
  - [ ] Add STAY case to pricing calculation switch
  - [ ] Ensure cost breakdown includes stay details

- [ ] Task 5: Add Type Exports
  - [ ] Export new types from packages/database/src/index.ts
  - [ ] Update Zod schemas if needed

---

## Test Cases

### Unit Tests

```typescript
describe("Stay Pricing Service", () => {
  it("should calculate service costs for each service type", async () => {
    // Test TRANSFER, DISPO, EXCURSION pricing within stay
  });

  it("should calculate hotel costs when hotelRequired is true", async () => {
    // Verify hotel cost from organization settings
  });

  it("should calculate meal costs based on mealCount", async () => {
    // Verify meal cost = mealCount × mealCostPerDay
  });

  it("should calculate driver overnight premium", async () => {
    // Verify driver premium when overnight stay
  });

  it("should aggregate costs across all days", async () => {
    // Verify total = sum of all day costs
  });
});
```

### API Tests (Curl)

```bash
# Create Stay Quote
curl -X POST http://localhost:3000/api/vtc/quotes \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "tripType": "STAY",
    "contactId": "...",
    "vehicleCategoryId": "...",
    "passengerCount": 2,
    "stayDays": [...]
  }'

# Get Stay Quote
curl -X GET http://localhost:3000/api/vtc/quotes/:id \
  -H "Cookie: better-auth.session_token=..."

# Update Stay Quote
curl -X PATCH http://localhost:3000/api/vtc/quotes/:id \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{"stayDays": [...]}'
```

### Database Verification

```sql
-- Verify StayDay records
SELECT * FROM stay_day WHERE quote_id = '...';

-- Verify StayService records
SELECT * FROM stay_service WHERE stay_day_id = '...';

-- Verify Quote with STAY type
SELECT * FROM quote WHERE trip_type = 'STAY';
```

---

## Dev Notes

### Architecture Patterns

- Follow existing Quote API patterns in `packages/api/src/routes/vtc/quotes.ts`
- Use existing pricing service patterns for service-level pricing
- Leverage organization pricing settings for staffing costs
- Use cascade delete for StayDay and StayService when Quote is deleted

### Existing Code to Reuse

- `packages/api/src/services/pricing-service.ts` - Base pricing calculations
- `packages/api/src/services/rse-service.ts` - Staffing cost calculations
- `packages/database/prisma/schema.prisma` - Quote model structure
- Organization pricing settings for hotel/meal costs

### Important Considerations

1. **Backward Compatibility**: Existing quotes with other trip types must continue to work
2. **Cascade Delete**: When a Quote is deleted, all StayDays and StayServices must be deleted
3. **Pricing Consistency**: Each service within a stay should use the same pricing logic as standalone quotes
4. **RSE Integration**: Use existing staffing cost parameters from organization settings

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

N/A

### Completion Notes List

1. Extended TripType enum with STAY value
2. Created StayServiceType enum (TRANSFER, DISPO, EXCURSION)
3. Created StayDay model with staffing cost fields
4. Created StayService model with service-specific fields
5. Extended Quote model with stayStartDate, stayEndDate, and stayDays relation
6. Created stay-pricing.ts service for STAY pricing calculations
7. Created stay-quotes.ts API routes for CRUD operations
8. Registered stayQuotesRouter in VTC router
9. Migration applied successfully

### File List

**Created:**

- `packages/database/prisma/migrations/20260103225147_add_stay_trip_type/migration.sql`
- `packages/api/src/services/pricing/stay-pricing.ts`
- `packages/api/src/routes/vtc/stay-quotes.ts`

**Modified:**

- `packages/database/prisma/schema.prisma` - Added STAY to TripType, StayServiceType enum, StayDay model, StayService model, Quote extensions
- `packages/api/src/services/pricing/index.ts` - Exported stay pricing functions
- `packages/api/src/routes/vtc/router.ts` - Registered stayQuotesRouter

---

## Change Log

| Date       | Change                   | Author            |
| ---------- | ------------------------ | ----------------- |
| 2026-01-03 | Story created            | BMAD Orchestrator |
| 2026-01-03 | Implementation completed | BMAD Orchestrator |
