# Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions

**Epic:** Epic 8 – Dispatch & Strategic Optimisation  
**Status:** in-progress  
**Created:** 2025-11-27  
**Updated:** 2025-11-27  
**Priority:** High  
**Branch:** feature/8-6-subcontractor-suggestions

---

## User Story

**As an** operations manager,  
**I want** to register subcontractor partners with their operating zones and indicative price levels, and get suggestions when internal trips are structurally unprofitable,  
**So that** I can decide to subcontract with full margin visibility and avoid losses on unprofitable missions.

---

## Description

When a mission is structurally unprofitable for the internal fleet (negative margin or below threshold), the system should:

1. **Subcontractor Directory** - Manage a list of subcontractor partners with their operating zones and pricing
2. **Unprofitable Detection** - Automatically detect missions that are unprofitable for internal execution
3. **Subcontracting Suggestions** - Suggest subcontractors that can serve the mission's zones
4. **Margin Comparison** - Show clear comparison between internal cost and subcontractor cost
5. **Decision Logging** - Track all subcontracting decisions for analysis

### Key Concepts

- **Subcontractor**: External partner who can execute missions on behalf of the organization
- **Operating Zones**: Geographic areas where a subcontractor typically operates
- **Indicative Pricing**: Rate per km, rate per hour, or minimum fare used to estimate subcontractor cost
- **Structurally Unprofitable**: Mission where internal cost exceeds selling price (margin ≤ 0%)

### Business Value

- **Loss Prevention**: Avoid executing missions at a loss
- **Capacity Extension**: Serve areas where internal fleet is inefficient
- **Transparency**: Clear visibility into subcontracting economics
- **Audit Trail**: Track all subcontracting decisions

---

## Acceptance Criteria

### AC1: Subcontractor Directory Display

```gherkin
Given the Contacts area with subcontractor filter
When I filter contacts by "Subcontractors"
Then I see a list of registered subcontractor partners with:
  - Company name and contact details
  - Operating zones (list of PricingZones)
  - Indicative price levels (per km, per hour, minimum fare)
  - Vehicle categories they serve
  - Status (Active/Inactive)
And subcontractors are sorted by name
```

### AC2: Subcontractor Registration

```gherkin
Given the contact creation form
When I toggle "Is Subcontractor" to true
Then additional fields appear:
  | Field | Type |
  | Operating Zones | Multi-select from PricingZones |
  | Rate per km (EUR) | Decimal input |
  | Rate per hour (EUR) | Decimal input |
  | Minimum fare (EUR) | Decimal input |
  | Vehicle Categories | Multi-select |
When I save the contact
Then a SubcontractorProfile is created linked to the contact
And the subcontractor appears in the directory
```

### AC3: Unprofitable Mission Detection

```gherkin
Given a mission with calculated internal cost and selling price
When the margin is below the configured threshold (default: 0%)
Then the mission is flagged as "structurally unprofitable"
And the system searches for subcontractors covering the mission's zones
And suggestions are generated if matching subcontractors exist
```

### AC4: Subcontracting Suggestions in Dispatch

```gherkin
Given a structurally unprofitable mission in the Dispatch screen
When I view the mission details
Then I see a "Subcontracting" section showing:
  - Alert: "This mission is unprofitable for internal execution"
  - List of suggested subcontractors with:
    - Subcontractor name
    - Estimated price
    - Resulting margin if subcontracted
    - Zone match indicator (pickup/dropoff)
And suggestions are sorted by resulting margin (highest first)
```

### AC5: Margin Comparison Display

```gherkin
Given a subcontracting suggestion
When I click to expand the suggestion details
Then I see a comparison table:
  | Metric | Internal | Subcontractor |
  | Selling Price | €X | €X |
  | Cost | €Y | €Z |
  | Margin | €M1 (P1%) | €M2 (P2%) |
  | Recommendation | ❌ Loss | ✅ Profit |
And the recommendation is based on which option has better margin
```

### AC6: Subcontracting Decision & Logging

```gherkin
Given a subcontracting suggestion I want to accept
When I click "Subcontract to [Name]"
Then a confirmation dialog appears with agreed price input
When I confirm with the agreed price
Then the mission status changes to "SUBCONTRACTED"
And the subcontractorId is stored on the mission
And an audit log entry is created with:
  - Mission ID, Subcontractor ID
  - Agreed price, Margin at decision time
  - Operator ID, Timestamp
```

### AC7: API Endpoints

```gherkin
Given the subcontractor API endpoints
When called with valid authentication and organization context
Then they support:
  | Method | Endpoint | Description |
  | GET | /api/vtc/subcontractors | List subcontractors |
  | GET | /api/vtc/subcontractors/:id | Get subcontractor detail |
  | POST | /api/vtc/subcontractors | Create subcontractor profile |
  | PATCH | /api/vtc/subcontractors/:id | Update subcontractor |
  | DELETE | /api/vtc/subcontractors/:id | Delete subcontractor |
  | GET | /api/vtc/missions/:id/subcontracting-suggestions | Get suggestions |
  | POST | /api/vtc/missions/:id/subcontract | Mark as subcontracted |
```

### AC8: Zone Matching Logic

```gherkin
Given a subcontractor with operating zones [Zone A, Zone B]
When a mission has pickup in Zone A and dropoff in Zone C
Then the subcontractor is suggested with zoneMatch: { pickup: true, dropoff: false }
When a mission has pickup in Zone D and dropoff in Zone E
Then the subcontractor is NOT suggested (no zone match)
```

---

## Technical Implementation

### Database Schema

Extend the existing schema with SubcontractorProfile:

```prisma
// Add to Contact model
model Contact {
  // ... existing fields ...

  // Subcontractor flag
  isSubcontractor Boolean @default(false)

  // Subcontractor profile (1:1)
  subcontractorProfile SubcontractorProfile?
}

// New model for subcontractor details
model SubcontractorProfile {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Link to Contact (1:1)
  contactId String  @unique
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  // Indicative pricing (EUR)
  ratePerKm   Decimal? @db.Decimal(8, 2)
  ratePerHour Decimal? @db.Decimal(8, 2)
  minimumFare Decimal? @db.Decimal(8, 2)

  // Status
  isActive Boolean @default(true)
  notes    String?

  // Metadata
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  operatingZones    SubcontractorZone[]
  vehicleCategories SubcontractorVehicleCategory[]

  @@index([organizationId])
  @@index([contactId])
  @@index([isActive])
  @@map("subcontractor_profile")
}

// Junction: SubcontractorProfile <-> PricingZone
model SubcontractorZone {
  id                     String               @id @default(cuid())
  subcontractorProfileId String
  subcontractorProfile   SubcontractorProfile @relation(fields: [subcontractorProfileId], references: [id], onDelete: Cascade)
  pricingZoneId          String
  pricingZone            PricingZone          @relation(fields: [pricingZoneId], references: [id], onDelete: Cascade)

  @@unique([subcontractorProfileId, pricingZoneId])
  @@map("subcontractor_zone")
}

// Junction: SubcontractorProfile <-> VehicleCategory
model SubcontractorVehicleCategory {
  id                     String               @id @default(cuid())
  subcontractorProfileId String
  subcontractorProfile   SubcontractorProfile @relation(fields: [subcontractorProfileId], references: [id], onDelete: Cascade)
  vehicleCategoryId      String
  vehicleCategory        VehicleCategory      @relation(fields: [vehicleCategoryId], references: [id], onDelete: Cascade)

  @@unique([subcontractorProfileId, vehicleCategoryId])
  @@map("subcontractor_vehicle_category")
}

// Add to Quote model for subcontracting
model Quote {
  // ... existing fields ...

  // Subcontracting
  isSubcontracted    Boolean  @default(false)
  subcontractorId    String?
  subcontractedPrice Decimal? @db.Decimal(10, 2)
  subcontractedAt    DateTime?
}
```

### Files to Create/Modify

```
packages/database/prisma/
├── schema.prisma                    # MODIFY: Add SubcontractorProfile and relations

packages/api/src/
├── services/
│   ├── subcontractor-service.ts     # NEW: Subcontractor detection and suggestions
│   └── __tests__/
│       └── subcontractor-service.test.ts # NEW: Unit tests
├── routes/vtc/
│   ├── subcontractors.ts            # NEW: Subcontractor API routes
│   └── router.ts                    # MODIFY: Register subcontractors routes

apps/web/modules/saas/
├── contacts/
│   └── components/
│       └── SubcontractorFields.tsx  # NEW: Subcontractor form fields
├── dispatch/
│   ├── components/
│   │   ├── SubcontractingSuggestions.tsx  # NEW: Suggestions panel
│   │   └── SubcontractingDialog.tsx       # NEW: Confirmation dialog
│   ├── hooks/
│   │   └── useSubcontracting.ts           # NEW: API hooks
│   └── types/
│       └── subcontractor.ts               # NEW: Type definitions

packages/i18n/translations/
├── en.json                          # MODIFY: Add translations
└── fr.json                          # MODIFY: Add translations
```

### API Endpoints

```typescript
// GET /api/vtc/subcontractors
interface ListSubcontractorsResponse {
  subcontractors: SubcontractorListItem[];
  total: number;
}

interface SubcontractorListItem {
  id: string;
  contact: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    companyName: string | null;
  };
  operatingZones: { id: string; name: string; code: string }[];
  vehicleCategories: { id: string; name: string; code: string }[];
  ratePerKm: number | null;
  ratePerHour: number | null;
  minimumFare: number | null;
  isActive: boolean;
}

// POST /api/vtc/subcontractors
interface CreateSubcontractorRequest {
  contactId: string;
  operatingZoneIds: string[];
  vehicleCategoryIds: string[];
  ratePerKm?: number;
  ratePerHour?: number;
  minimumFare?: number;
  notes?: string;
}

// GET /api/vtc/missions/:id/subcontracting-suggestions
interface SubcontractingSuggestionsResponse {
  mission: {
    id: string;
    sellingPrice: number;
    internalCost: number;
    marginPercent: number;
  };
  isUnprofitable: boolean;
  unprofitableThreshold: number;
  suggestions: SubcontractingSuggestion[];
}

interface SubcontractingSuggestion {
  subcontractorId: string;
  subcontractor: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
  };
  estimatedPrice: number;
  marginIfSubcontracted: number;
  marginPercentIfSubcontracted: number;
  comparison: {
    internalCost: number;
    subcontractorCost: number;
    savings: number;
    savingsPercent: number;
    recommendation: "SUBCONTRACT" | "INTERNAL" | "REVIEW";
  };
  zoneMatch: {
    pickup: boolean;
    dropoff: boolean;
    score: number; // 0-100
  };
}

// POST /api/vtc/missions/:id/subcontract
interface SubcontractMissionRequest {
  subcontractorId: string;
  agreedPrice: number;
  notes?: string;
}

interface SubcontractMissionResponse {
  success: boolean;
  mission: {
    id: string;
    isSubcontracted: boolean;
    subcontractorId: string;
    subcontractedPrice: number;
  };
}
```

### Subcontractor Service

```typescript
// packages/api/src/services/subcontractor-service.ts

export interface SubcontractorConfig {
  unprofitableThresholdPercent: number; // Default: 0
  maxSuggestions: number; // Default: 5
}

export const DEFAULT_SUBCONTRACTOR_CONFIG: SubcontractorConfig = {
  unprofitableThresholdPercent: 0,
  maxSuggestions: 5,
};

/**
 * Check if a mission is structurally unprofitable
 */
export function isStructurallyUnprofitable(
  sellingPrice: number,
  internalCost: number,
  thresholdPercent: number = 0
): boolean;

/**
 * Find subcontractors that can serve a mission based on zones
 */
export async function findSubcontractorsForMission(
  missionId: string,
  organizationId: string,
  db: PrismaClient
): Promise<SubcontractorWithMatch[]>;

/**
 * Calculate estimated subcontractor price for a mission
 */
export function calculateSubcontractorPrice(
  subcontractor: SubcontractorProfile,
  distanceKm: number,
  durationMinutes: number
): number;

/**
 * Generate subcontracting suggestions for a mission
 */
export async function generateSubcontractingSuggestions(
  missionId: string,
  organizationId: string,
  db: PrismaClient,
  config?: SubcontractorConfig
): Promise<SubcontractingSuggestion[]>;

/**
 * Mark a mission as subcontracted
 */
export async function subcontractMission(
  missionId: string,
  subcontractorId: string,
  agreedPrice: number,
  operatorId: string,
  organizationId: string,
  db: PrismaClient
): Promise<void>;
```

### Translations

```json
// packages/i18n/translations/en.json
{
  "dispatch": {
    "subcontracting": {
      "title": "Subcontracting Options",
      "unprofitableAlert": "This mission is unprofitable for internal execution",
      "marginBelow": "Margin is {{percent}}% (below {{threshold}}% threshold)",
      "noSuggestions": "No subcontractors available for this route",
      "suggestion": {
        "estimatedPrice": "Est. price: €{{price}}",
        "resultingMargin": "Resulting margin: {{percent}}%",
        "zoneMatch": {
          "full": "Full zone match",
          "pickup": "Pickup zone match",
          "dropoff": "Dropoff zone match"
        }
      },
      "comparison": {
        "title": "Margin Comparison",
        "internal": "Internal",
        "subcontractor": "Subcontractor",
        "sellingPrice": "Selling Price",
        "cost": "Cost",
        "margin": "Margin",
        "recommendation": "Recommendation",
        "loss": "Loss",
        "profit": "Profit",
        "review": "Review"
      },
      "action": {
        "subcontract": "Subcontract to {{name}}",
        "confirm": "Confirm Subcontracting",
        "cancel": "Cancel"
      },
      "dialog": {
        "title": "Confirm Subcontracting",
        "description": "You are about to subcontract this mission to {{name}}",
        "agreedPrice": "Agreed Price (EUR)",
        "notes": "Notes (optional)",
        "success": "Mission subcontracted successfully",
        "error": "Failed to subcontract mission"
      }
    }
  },
  "contacts": {
    "subcontractor": {
      "toggle": "Is Subcontractor",
      "section": "Subcontractor Details",
      "operatingZones": "Operating Zones",
      "operatingZonesPlaceholder": "Select zones...",
      "vehicleCategories": "Vehicle Categories",
      "vehicleCategoriesPlaceholder": "Select categories...",
      "ratePerKm": "Rate per km (EUR)",
      "ratePerHour": "Rate per hour (EUR)",
      "minimumFare": "Minimum fare (EUR)",
      "notes": "Notes"
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

```typescript
// packages/api/src/services/__tests__/subcontractor-service.test.ts
describe("SubcontractorService", () => {
  describe("isStructurallyUnprofitable", () => {
    it("returns true when margin is negative", () => {});
    it("returns true when margin equals threshold", () => {});
    it("returns false when margin is above threshold", () => {});
    it("handles zero selling price", () => {});
  });

  describe("calculateSubcontractorPrice", () => {
    it("calculates price based on distance and rate per km", () => {});
    it("calculates price based on duration and rate per hour", () => {});
    it("uses maximum of distance and duration pricing", () => {});
    it("applies minimum fare when calculated price is lower", () => {});
    it("handles missing rates gracefully", () => {});
  });

  describe("findSubcontractorsForMission", () => {
    it("finds subcontractors matching pickup zone", () => {});
    it("finds subcontractors matching dropoff zone", () => {});
    it("excludes inactive subcontractors", () => {});
    it("excludes subcontractors without matching vehicle category", () => {});
    it("returns empty array when no matches", () => {});
  });

  describe("generateSubcontractingSuggestions", () => {
    it("generates suggestions for unprofitable mission", () => {});
    it("returns empty for profitable mission", () => {});
    it("sorts suggestions by resulting margin", () => {});
    it("limits suggestions to maxSuggestions", () => {});
    it("calculates comparison correctly", () => {});
  });

  describe("subcontractMission", () => {
    it("updates mission with subcontractor info", () => {});
    it("creates audit log entry", () => {});
    it("throws if mission not found", () => {});
    it("throws if subcontractor not found", () => {});
  });
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/dispatch-subcontracting.spec.ts
describe("Dispatch Subcontracting", () => {
  beforeEach(async () => {
    await page.goto("/app/test-org/dispatch");
  });

  it("displays subcontracting suggestions for unprofitable mission", async () => {
    // Select an unprofitable mission
    await page.click('[data-testid="mission-row-unprofitable"]');
    // Check suggestions panel appears
    await expect(
      page.locator('[data-testid="subcontracting-suggestions"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="unprofitable-alert"]')
    ).toBeVisible();
  });

  it("shows margin comparison when expanding suggestion", async () => {
    await page.click('[data-testid="mission-row-unprofitable"]');
    await page.click('[data-testid="suggestion-row"]:first-child');
    await expect(
      page.locator('[data-testid="margin-comparison"]')
    ).toBeVisible();
  });

  it("opens confirmation dialog when clicking subcontract", async () => {
    await page.click('[data-testid="mission-row-unprofitable"]');
    await page.click('[data-testid="subcontract-button"]:first-child');
    await expect(
      page.locator('[data-testid="subcontract-dialog"]')
    ).toBeVisible();
  });

  it("subcontracts mission successfully", async () => {
    await page.click('[data-testid="mission-row-unprofitable"]');
    await page.click('[data-testid="subcontract-button"]:first-child');
    await page.fill('[data-testid="agreed-price-input"]', "150");
    await page.click('[data-testid="confirm-subcontract"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });
});
```

### API Tests (curl)

```bash
# List subcontractors
curl -X GET "http://localhost:3000/api/vtc/subcontractors" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Create subcontractor
curl -X POST "http://localhost:3000/api/vtc/subcontractors" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "contact-123",
    "operatingZoneIds": ["zone-cdg", "zone-orly"],
    "vehicleCategoryIds": ["cat-sedan", "cat-van"],
    "ratePerKm": 2.50,
    "ratePerHour": 45.00,
    "minimumFare": 50.00
  }'

# Get subcontracting suggestions for mission
curl -X GET "http://localhost:3000/api/vtc/missions/mission-123/subcontracting-suggestions" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Subcontract a mission
curl -X POST "http://localhost:3000/api/vtc/missions/mission-123/subcontract" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "subcontractorId": "subcontractor-456",
    "agreedPrice": 150.00,
    "notes": "Urgent transfer"
  }'

# Verify in database via MCP @postgres_vtc_sixiemme_etoile
# SELECT * FROM "subcontractor_profile" WHERE "organizationId" = 'vtc-qa-orga1';
# SELECT * FROM "quote" WHERE "isSubcontracted" = true AND "organizationId" = 'vtc-qa-orga1';
```

---

## Dependencies

| Dependency                            | Type   | Status    |
| ------------------------------------- | ------ | --------- |
| Story 2.1-2.2 - Contact Model         | Story  | ✅ Done   |
| Story 3.1 - PricingZone Model         | Story  | ✅ Done   |
| Story 4.2-4.7 - Pricing/Profitability | Story  | ✅ Done   |
| Story 8.1 - Dispatch Screen Layout    | Story  | ✅ Done   |
| Story 8.2 - Assignment Drawer         | Story  | ✅ Done   |
| Contact model                         | Schema | ✅ Exists |
| PricingZone model                     | Schema | ✅ Exists |
| VehicleCategory model                 | Schema | ✅ Exists |

---

## Definition of Done

- [ ] Database schema updated with SubcontractorProfile and relations
- [ ] Prisma migration created and applied
- [ ] SubcontractorService implemented with all functions
- [ ] API endpoint GET /subcontractors implemented
- [ ] API endpoint GET /subcontractors/:id implemented
- [ ] API endpoint POST /subcontractors implemented
- [ ] API endpoint PATCH /subcontractors/:id implemented
- [ ] API endpoint DELETE /subcontractors/:id implemented
- [ ] API endpoint GET /missions/:id/subcontracting-suggestions implemented
- [ ] API endpoint POST /missions/:id/subcontract implemented
- [ ] SubcontractorFields component for contact form implemented
- [ ] SubcontractingSuggestions component implemented
- [ ] SubcontractingDialog component implemented
- [ ] useSubcontracting hooks implemented
- [ ] DispatchPage updated to include SubcontractingSuggestions
- [ ] Translations added (en/fr)
- [ ] Unit tests passing (Vitest)
- [ ] E2E tests passing (Playwright MCP)
- [ ] API endpoints tested with curl
- [ ] Database state verified via MCP
- [ ] Code reviewed and merged

---

## Notes

- **Unprofitable Threshold**: Default 0%, configurable per organization
- **Zone Matching**: Subcontractor is suggested if they cover pickup OR dropoff zone
- **Price Calculation**: MAX(distance × ratePerKm, duration × ratePerHour), with minimumFare floor
- **Audit Logging**: All subcontracting decisions logged for compliance and analysis
- **Recommendation Logic**: SUBCONTRACT if margin improves, INTERNAL if internal is better, REVIEW if close

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/8-6-integrate-subcontractor-directory-subcontracting-suggestions.context.xml

### Files Modified/Created

(To be filled during implementation)

### Test Summary

(To be filled during implementation)

### Implementation Notes

(To be filled during implementation)
