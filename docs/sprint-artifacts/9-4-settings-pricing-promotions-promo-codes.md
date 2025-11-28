# Story 9.4: Settings → Pricing – Promotions & Promo Codes

**Epic:** Epic 9 – Advanced Pricing Configuration & Reporting  
**Status:** done  
**Created:** 2025-11-28  
**Updated:** 2025-11-28 04:02  
**Priority:** High  
**Branch:** feature/9-4-promotions-promo-codes

---

## User Story

**As a** marketing/commerce owner,  
**I want** to configure promo codes and discounts,  
**So that** promotions are applied consistently and remain traceable on quotes and invoices.

---

## Description

Promotions allow operators to define promo codes with configurable discounts that can be applied to quotes and invoices. This story implements the full UI and API for managing promotions.

### Key Features

1. **Summary Dashboard** - At-a-glance view of promotions by status (Active, Expired, Upcoming) and total usage
2. **Data Table** - Sortable, filterable list of all configured promotions
3. **Create/Edit Dialog** - Form with code uniqueness validation, discount configuration, validity period, and usage limits
4. **Usage Tracking** - Display current uses vs maximum allowed uses
5. **Validity Period** - Date range picker with automatic status derivation

### Business Value

- **Revenue Control**: Manage discounts with clear limits and validity periods
- **Traceability**: Original price and discount amount visible on quotes/invoices
- **Marketing Support**: Enable promotional campaigns with unique codes
- **Fraud Prevention**: Usage limits prevent abuse of promo codes

### Discount Types

| Discount Type | Description              | Example     |
| ------------- | ------------------------ | ----------- |
| FIXED         | Fixed EUR discount       | -20.00€ off |
| PERCENTAGE    | Percentage of base price | -15% off    |

### Promotion Status Logic

A promotion is considered **active** when ALL of these conditions are true:

- `isActive = true`
- `now() >= validFrom`
- `now() <= validTo`
- `currentUses < maxTotalUses` (if maxTotalUses is set)

---

## Acceptance Criteria

### AC1: Page Navigation & Layout

```gherkin
Given I am logged in as a pricing manager
When I navigate to Settings → Pricing → Promotions
Then I see the page at /app/{orgSlug}/settings/pricing/promotions
And the page displays:
  - Page title "Promotions"
  - "Add Promotion" button in the header
  - Summary cards showing counts by status
  - Data table with all configured promotions
```

### AC2: Summary Cards Display

```gherkin
Given the Promotions page is loaded
When I view the summary cards
Then I see cards showing:
  | Card | Description | Icon |
  | Active | Count of currently active promotions | Tag |
  | Expired | Count of expired promotions | Calendar |
  | Upcoming | Count of future promotions (validFrom > now) | Clock |
  | Total Uses | Sum of currentUses across all promotions | Users |
And the counts are accurate based on current data and time
```

### AC3: Data Table Display

```gherkin
Given promotions exist for the organization
When I view the data table
Then I see columns:
  | Column | Content |
  | Code | Promo code (uppercase) |
  | Description | Optional description |
  | Type | FIXED or PERCENTAGE badge |
  | Value | Displayed as "-20.00€" or "-15%" |
  | Valid From | Start date formatted |
  | Valid To | End date formatted |
  | Usage | "5/100" or "5/∞" format |
  | Status | Badge: Active (green), Expired (gray), Upcoming (blue), Inactive (red) |
  | Actions | Edit and Delete buttons |
And the table is sortable by Code, Value, Valid From, Valid To
And I can filter by Type (All, Fixed, Percentage)
And I can filter by Status (All, Active, Expired, Upcoming, Inactive)
And I can search by code or description
```

### AC4: Create Promotion Dialog

```gherkin
Given I click "Add Promotion" button
When the dialog opens
Then I see a form with:
  | Field | Type | Validation |
  | Code | Text input | Required, uppercase, unique per org, max 50 chars |
  | Description | Textarea | Optional, max 500 chars |
  | Discount Type | Select | Required: FIXED, PERCENTAGE |
  | Value | Number input | Required, positive number |
  | Valid From | Date picker | Required, default today |
  | Valid To | Date picker | Required, must be >= validFrom |
  | Max Total Uses | Number input | Optional, positive integer |
  | Max Uses Per Contact | Number input | Optional, positive integer |
  | Active | Toggle | Default true |
When I fill valid data and click "Create"
Then the promotion is created
And the table refreshes with the new entry
And a success toast appears
```

### AC5: Edit Promotion Dialog

```gherkin
Given I click Edit on an existing promotion
When the dialog opens
Then all fields are pre-populated with current values
And the Code field shows current uses count if > 0
When I modify fields and click "Save"
Then the promotion is updated
And the table refreshes with updated data
And a success toast appears
```

### AC6: Delete Promotion

```gherkin
Given I click Delete on an existing promotion
When the confirmation dialog appears
Then I see the promo code in the confirmation message
And I see a warning if currentUses > 0
When I confirm deletion
Then the promotion is removed from the database
And the table refreshes without the deleted entry
And a success toast appears
```

### AC7: API Endpoints

```gherkin
Given the promotions API
When called with valid authentication and organization context
Then the following endpoints are available:
  | Method | Endpoint | Description |
  | GET | /api/vtc/pricing/promotions | List all promotions |
  | GET | /api/vtc/pricing/promotions/stats | Get summary stats |
  | GET | /api/vtc/pricing/promotions/:id | Get single promotion |
  | POST | /api/vtc/pricing/promotions | Create promotion |
  | PATCH | /api/vtc/pricing/promotions/:id | Update promotion |
  | DELETE | /api/vtc/pricing/promotions/:id | Delete promotion |
  | GET | /api/vtc/pricing/promotions/validate/:code | Validate promo code |
```

### AC8: Multi-Tenancy Isolation

```gherkin
Given Organization A has promotions [P1, P2]
And Organization B has promotions [P3, P4]
When a user from Organization A lists promotions
Then they only see [P1, P2]
And they cannot access P3 or P4 by ID
```

### AC9: Code Uniqueness

```gherkin
Given Organization A has a promotion with code "SUMMER2024"
When I try to create another promotion with code "SUMMER2024" in Organization A
Then the creation fails with error "Promo code already exists"

Given Organization B does not have code "SUMMER2024"
When I create a promotion with code "SUMMER2024" in Organization B
Then the creation succeeds (codes are unique per organization, not globally)
```

### AC10: Usage Tracking

```gherkin
Given a promotion with maxTotalUses = 100 and currentUses = 45
When I view the promotion in the table
Then the Usage column shows "45/100"

Given a promotion with maxTotalUses = null (unlimited)
When I view the promotion in the table
Then the Usage column shows "45/∞"
```

### AC11: Validity Period

```gherkin
Given I am creating a promotion
When I select validFrom = "2024-12-01" and validTo = "2024-12-31"
Then the dates are stored as Europe/Paris business time

Given a promotion with validFrom = future date
When I view it in the table
Then the Status badge shows "Upcoming" (blue)

Given a promotion with validTo = past date
When I view it in the table
Then the Status badge shows "Expired" (gray)
```

### AC12: Translations

```gherkin
Given the application language is set to English
When I view the Promotions page
Then all labels, buttons, and messages are in English

Given the application language is set to French
When I view the Promotions page
Then all labels, buttons, and messages are in French
```

---

## Technical Implementation

### Database Schema

The `Promotion` model already exists in Prisma (Story 1.1):

```prisma
model Promotion {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Identification
  code        String
  description String?

  // Discount
  discountType AmountType
  value        Decimal    @db.Decimal(10, 4) // EUR or percentage

  // Validity
  validFrom DateTime
  validTo   DateTime

  // Usage limits
  maxTotalUses      Int?
  maxUsesPerContact Int?
  currentUses       Int  @default(0)

  // Status
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([organizationId, code])
  @@index([organizationId])
  @@index([validFrom, validTo])
  @@map("promotion")
}
```

### Files to Create

```
packages/api/src/routes/vtc/
├── promotions.ts                        # API routes
└── __tests__/
    └── promotions.test.ts               # Unit tests

apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/
└── promotions/
    └── page.tsx                         # Main page

apps/web/modules/saas/settings/pricing/
├── components/
│   ├── PromotionSummaryCards.tsx        # Summary cards component
│   ├── PromotionList.tsx                # Data table component
│   └── PromotionFormDialog.tsx          # Create/Edit dialog
├── hooks/
│   └── usePromotions.ts                 # React Query hooks
└── types/
    └── promotion.ts                     # TypeScript types
```

### Files to Modify

```
packages/api/src/routes/vtc/router.ts    # Register routes
packages/i18n/translations/en.json       # English translations
packages/i18n/translations/fr.json       # French translations
apps/web/modules/saas/settings/pricing/components/index.ts  # Export new components
apps/web/modules/saas/settings/pricing/hooks/index.ts       # Export new hooks
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/layout.tsx  # Add nav item
```

### API Endpoints

```typescript
// GET /api/vtc/pricing/promotions
interface ListPromotionsResponse {
  data: PromotionListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PromotionListItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "FIXED" | "PERCENTAGE";
  value: number;
  validFrom: string; // ISO date
  validTo: string; // ISO date
  maxTotalUses: number | null;
  maxUsesPerContact: number | null;
  currentUses: number;
  isActive: boolean;
  status: "active" | "expired" | "upcoming" | "inactive"; // Computed
  createdAt: string;
  updatedAt: string;
}

// GET /api/vtc/pricing/promotions/stats
interface PromotionStatsResponse {
  active: number;
  expired: number;
  upcoming: number;
  totalUses: number;
}

// POST /api/vtc/pricing/promotions
interface CreatePromotionRequest {
  code: string;
  description?: string;
  discountType: "FIXED" | "PERCENTAGE";
  value: number;
  validFrom: string; // ISO date
  validTo: string; // ISO date
  maxTotalUses?: number;
  maxUsesPerContact?: number;
  isActive?: boolean;
}

// PATCH /api/vtc/pricing/promotions/:id
interface UpdatePromotionRequest {
  code?: string;
  description?: string | null;
  discountType?: "FIXED" | "PERCENTAGE";
  value?: number;
  validFrom?: string;
  validTo?: string;
  maxTotalUses?: number | null;
  maxUsesPerContact?: number | null;
  isActive?: boolean;
  // Note: currentUses is NOT updatable via API
}

// GET /api/vtc/pricing/promotions/validate/:code
interface ValidatePromoCodeResponse {
  valid: boolean;
  promotion?: PromotionListItem;
  reason?:
    | "NOT_FOUND"
    | "EXPIRED"
    | "NOT_STARTED"
    | "USAGE_LIMIT_REACHED"
    | "INACTIVE";
}
```

### Translations

```json
// packages/i18n/translations/en.json (to add)
{
  "settings": {
    "pricing": {
      "promotions": {
        "title": "Promotions",
        "description": "Configure promo codes and discounts for quotes and invoices",
        "addButton": "Add Promotion",
        "stats": {
          "active": "Active",
          "expired": "Expired",
          "upcoming": "Upcoming",
          "totalUses": "Total Uses"
        },
        "table": {
          "code": "Code",
          "description": "Description",
          "type": "Type",
          "value": "Value",
          "validFrom": "Valid From",
          "validTo": "Valid To",
          "usage": "Usage",
          "status": "Status",
          "actions": "Actions"
        },
        "types": {
          "FIXED": "Fixed",
          "PERCENTAGE": "Percentage"
        },
        "status": {
          "all": "All",
          "active": "Active",
          "expired": "Expired",
          "upcoming": "Upcoming",
          "inactive": "Inactive"
        },
        "form": {
          "createTitle": "Create Promotion",
          "editTitle": "Edit Promotion",
          "code": "Promo Code",
          "codePlaceholder": "e.g., SUMMER2024",
          "codeHelp": "Unique code that customers will enter",
          "description": "Description",
          "descriptionPlaceholder": "Optional description...",
          "discountType": "Discount Type",
          "discountTypePlaceholder": "Select type...",
          "value": "Value",
          "valueHelp": "Enter amount in EUR for fixed, or percentage value",
          "validFrom": "Valid From",
          "validTo": "Valid To",
          "validityHelp": "Promotion is only valid during this period",
          "maxTotalUses": "Max Total Uses",
          "maxTotalUsesHelp": "Leave empty for unlimited uses",
          "maxUsesPerContact": "Max Uses Per Contact",
          "maxUsesPerContactHelp": "Limit uses per customer",
          "isActive": "Active",
          "currentUses": "Current Uses",
          "create": "Create",
          "save": "Save Changes",
          "cancel": "Cancel"
        },
        "delete": {
          "title": "Delete Promotion",
          "message": "Are you sure you want to delete promo code \"{code}\"? This action cannot be undone.",
          "usageWarning": "This promotion has been used {count} times.",
          "confirm": "Delete",
          "cancel": "Cancel"
        },
        "toast": {
          "createSuccess": "Promotion created successfully",
          "updateSuccess": "Promotion updated successfully",
          "deleteSuccess": "Promotion deleted successfully",
          "error": "An error occurred",
          "codeExists": "Promo code already exists"
        },
        "empty": {
          "title": "No promotions configured",
          "description": "Create your first promo code to offer discounts."
        },
        "actions": {
          "edit": "Edit",
          "delete": "Delete"
        },
        "usage": {
          "unlimited": "∞"
        }
      }
    }
  }
}
```

```json
// packages/i18n/translations/fr.json (to add)
{
  "settings": {
    "pricing": {
      "promotions": {
        "title": "Promotions",
        "description": "Configurez les codes promo et réductions pour les devis et factures",
        "addButton": "Ajouter une promotion",
        "stats": {
          "active": "Actives",
          "expired": "Expirées",
          "upcoming": "À venir",
          "totalUses": "Utilisations totales"
        },
        "table": {
          "code": "Code",
          "description": "Description",
          "type": "Type",
          "value": "Valeur",
          "validFrom": "Valide du",
          "validTo": "Valide jusqu'au",
          "usage": "Utilisation",
          "status": "Statut",
          "actions": "Actions"
        },
        "types": {
          "FIXED": "Fixe",
          "PERCENTAGE": "Pourcentage"
        },
        "status": {
          "all": "Tous",
          "active": "Actif",
          "expired": "Expiré",
          "upcoming": "À venir",
          "inactive": "Inactif"
        },
        "form": {
          "createTitle": "Créer une promotion",
          "editTitle": "Modifier la promotion",
          "code": "Code promo",
          "codePlaceholder": "ex: ETE2024",
          "codeHelp": "Code unique que les clients saisiront",
          "description": "Description",
          "descriptionPlaceholder": "Description optionnelle...",
          "discountType": "Type de réduction",
          "discountTypePlaceholder": "Sélectionner le type...",
          "value": "Valeur",
          "valueHelp": "Entrez le montant en EUR pour fixe, ou la valeur en pourcentage",
          "validFrom": "Valide du",
          "validTo": "Valide jusqu'au",
          "validityHelp": "La promotion n'est valide que pendant cette période",
          "maxTotalUses": "Utilisations max totales",
          "maxTotalUsesHelp": "Laisser vide pour illimité",
          "maxUsesPerContact": "Utilisations max par contact",
          "maxUsesPerContactHelp": "Limiter les utilisations par client",
          "isActive": "Actif",
          "currentUses": "Utilisations actuelles",
          "create": "Créer",
          "save": "Enregistrer",
          "cancel": "Annuler"
        },
        "delete": {
          "title": "Supprimer la promotion",
          "message": "Êtes-vous sûr de vouloir supprimer le code promo \"{code}\" ? Cette action est irréversible.",
          "usageWarning": "Cette promotion a été utilisée {count} fois.",
          "confirm": "Supprimer",
          "cancel": "Annuler"
        },
        "toast": {
          "createSuccess": "Promotion créée avec succès",
          "updateSuccess": "Promotion mise à jour avec succès",
          "deleteSuccess": "Promotion supprimée avec succès",
          "error": "Une erreur est survenue",
          "codeExists": "Ce code promo existe déjà"
        },
        "empty": {
          "title": "Aucune promotion configurée",
          "description": "Créez votre premier code promo pour offrir des réductions."
        },
        "actions": {
          "edit": "Modifier",
          "delete": "Supprimer"
        },
        "usage": {
          "unlimited": "∞"
        }
      }
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

```typescript
// packages/api/src/routes/vtc/__tests__/promotions.test.ts
describe("Promotions API", () => {
  describe("GET /pricing/promotions/stats", () => {
    it("returns correct counts by status", () => {});
    it("calculates totalUses as sum of currentUses", () => {});
  });

  describe("GET /pricing/promotions", () => {
    it("returns all promotions for the organization", () => {});
    it("filters by discountType when query param provided", () => {});
    it("filters by status (active/expired/upcoming/inactive)", () => {});
    it("searches by code and description", () => {});
    it("returns empty array when no promotions exist", () => {});
    it("does not return promotions from other organizations", () => {});
    it("computes status correctly based on dates and isActive", () => {});
  });

  describe("GET /pricing/promotions/:id", () => {
    it("returns promotion by ID", () => {});
    it("returns 404 for non-existent ID", () => {});
    it("returns 404 for ID from another organization", () => {});
  });

  describe("POST /pricing/promotions", () => {
    it("creates FIXED promotion with valid data", () => {});
    it("creates PERCENTAGE promotion with valid data", () => {});
    it("validates required fields", () => {});
    it("validates value is positive", () => {});
    it("validates validTo >= validFrom", () => {});
    it("rejects duplicate code within same organization", () => {});
    it("allows same code in different organizations", () => {});
    it("sets default isActive to true", () => {});
    it("sets default currentUses to 0", () => {});
    it("converts code to uppercase", () => {});
  });

  describe("PATCH /pricing/promotions/:id", () => {
    it("updates promotion fields", () => {});
    it("allows partial updates", () => {});
    it("validates code uniqueness on update", () => {});
    it("does not allow updating currentUses", () => {});
    it("returns 404 for non-existent ID", () => {});
  });

  describe("DELETE /pricing/promotions/:id", () => {
    it("deletes promotion", () => {});
    it("returns 404 for non-existent ID", () => {});
  });

  describe("GET /pricing/promotions/validate/:code", () => {
    it("returns valid=true for active promotion", () => {});
    it("returns valid=false with reason NOT_FOUND", () => {});
    it("returns valid=false with reason EXPIRED", () => {});
    it("returns valid=false with reason NOT_STARTED", () => {});
    it("returns valid=false with reason USAGE_LIMIT_REACHED", () => {});
    it("returns valid=false with reason INACTIVE", () => {});
  });

  describe("Multi-tenancy", () => {
    it("isolates data between organizations", () => {});
    it("prevents cross-organization access by ID", () => {});
    it("enforces code uniqueness per organization only", () => {});
  });
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/settings-promotions.spec.ts
describe("Settings - Promotions", () => {
  beforeEach(async () => {
    await page.goto("/app/test-org/settings/pricing/promotions");
  });

  it("displays page with summary cards and table", async () => {
    await expect(page.locator("h1")).toContainText("Promotions");
    await expect(page.locator('[data-testid="stats-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-expired"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-upcoming"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="stats-total-uses"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="promotions-table"]')
    ).toBeVisible();
  });

  it("creates FIXED promotion", async () => {
    await page.click('[data-testid="add-promotion-button"]');
    await expect(
      page.locator('[data-testid="promotion-dialog"]')
    ).toBeVisible();

    await page.fill('[data-testid="code-input"]', "SUMMER2024");
    await page.selectOption('[data-testid="discount-type-select"]', "FIXED");
    await page.fill('[data-testid="value-input"]', "20");
    await page.fill('[data-testid="valid-from-input"]', "2024-06-01");
    await page.fill('[data-testid="valid-to-input"]', "2024-08-31");

    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("creates PERCENTAGE promotion with usage limits", async () => {
    await page.click('[data-testid="add-promotion-button"]');

    await page.fill('[data-testid="code-input"]', "VIP15");
    await page.selectOption(
      '[data-testid="discount-type-select"]',
      "PERCENTAGE"
    );
    await page.fill('[data-testid="value-input"]', "15");
    await page.fill('[data-testid="valid-from-input"]', "2024-01-01");
    await page.fill('[data-testid="valid-to-input"]', "2024-12-31");
    await page.fill('[data-testid="max-total-uses-input"]', "100");
    await page.fill('[data-testid="max-uses-per-contact-input"]', "1");

    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("rejects duplicate promo code", async () => {
    // First create a promotion
    await page.click('[data-testid="add-promotion-button"]');
    await page.fill('[data-testid="code-input"]', "UNIQUE123");
    await page.selectOption('[data-testid="discount-type-select"]', "FIXED");
    await page.fill('[data-testid="value-input"]', "10");
    await page.fill('[data-testid="valid-from-input"]', "2024-01-01");
    await page.fill('[data-testid="valid-to-input"]', "2024-12-31");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Try to create another with same code
    await page.click('[data-testid="add-promotion-button"]');
    await page.fill('[data-testid="code-input"]', "UNIQUE123");
    await page.selectOption('[data-testid="discount-type-select"]', "FIXED");
    await page.fill('[data-testid="value-input"]', "20");
    await page.fill('[data-testid="valid-from-input"]', "2024-01-01");
    await page.fill('[data-testid="valid-to-input"]', "2024-12-31");
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
  });

  it("edits existing promotion", async () => {
    await page.click('[data-testid="edit-button"]:first-child');
    await expect(
      page.locator('[data-testid="promotion-dialog"]')
    ).toBeVisible();

    await page.fill('[data-testid="value-input"]', "25");
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("deletes promotion with confirmation", async () => {
    await page.click('[data-testid="delete-button"]:first-child');
    await expect(page.locator('[data-testid="delete-dialog"]')).toBeVisible();

    await page.click('[data-testid="confirm-delete"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("filters table by status", async () => {
    await page.selectOption('[data-testid="status-filter"]', "active");
    // Verify only active promotions are shown
  });

  it("displays usage correctly", async () => {
    // Verify usage column shows "X/Y" or "X/∞" format
  });
});
```

### API Tests (curl)

```bash
# List promotions
curl -X GET "http://localhost:3000/api/vtc/pricing/promotions" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Get stats
curl -X GET "http://localhost:3000/api/vtc/pricing/promotions/stats" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Create FIXED promotion
curl -X POST "http://localhost:3000/api/vtc/pricing/promotions" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2024",
    "description": "Summer discount campaign",
    "discountType": "FIXED",
    "value": 20.00,
    "validFrom": "2024-06-01T00:00:00.000Z",
    "validTo": "2024-08-31T23:59:59.000Z",
    "maxTotalUses": 100,
    "isActive": true
  }'

# Create PERCENTAGE promotion with per-contact limit
curl -X POST "http://localhost:3000/api/vtc/pricing/promotions" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "code": "VIP15",
    "description": "VIP 15% discount",
    "discountType": "PERCENTAGE",
    "value": 15,
    "validFrom": "2024-01-01T00:00:00.000Z",
    "validTo": "2024-12-31T23:59:59.000Z",
    "maxTotalUses": null,
    "maxUsesPerContact": 1,
    "isActive": true
  }'

# Validate promo code
curl -X GET "http://localhost:3000/api/vtc/pricing/promotions/validate/SUMMER2024" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Update promotion
curl -X PATCH "http://localhost:3000/api/vtc/pricing/promotions/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "value": 25.00,
    "maxTotalUses": 200
  }'

# Delete promotion
curl -X DELETE "http://localhost:3000/api/vtc/pricing/promotions/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Verify in database via MCP @postgres_vtc_sixiemme_etoile
# SELECT * FROM "promotion" WHERE "organizationId" = 'vtc-qa-orga1';
```

---

## Dependencies

| Dependency                             | Type       | Status       |
| -------------------------------------- | ---------- | ------------ |
| Story 1.1 - Promotion model            | Schema     | ✅ Done      |
| Story 4.3 - Pricing engine integration | Service    | ✅ Done      |
| organizationMiddleware                 | Middleware | ✅ Done      |
| Settings layout                        | UI         | ✅ Done      |
| shadcn/ui components                   | UI Library | ✅ Available |
| Story 9.3 - Optional Fees (reference)  | Reference  | ✅ Done      |

---

## Definition of Done

- [x] API route GET /pricing/promotions implemented
- [x] API route GET /pricing/promotions/stats implemented
- [x] API route GET /pricing/promotions/:id implemented
- [x] API route POST /pricing/promotions implemented
- [x] API route PATCH /pricing/promotions/:id implemented
- [x] API route DELETE /pricing/promotions/:id implemented
- [x] API route GET /pricing/promotions/validate/:code implemented
- [x] Routes registered in vtc/router.ts
- [x] Page /settings/pricing/promotions created
- [x] PromotionSummaryCards component implemented
- [x] PromotionList component implemented
- [x] PromotionFormDialog component implemented
- [x] usePromotions hooks implemented
- [x] TypeScript types defined
- [x] Translations added (en/fr)
- [x] Settings navigation updated
- [x] Unit tests passing (Vitest)
- [x] E2E tests passing (Playwright MCP)
- [x] API endpoints tested with curl
- [x] Database state verified via MCP
- [x] Code reviewed and merged

---

## Notes

- **Code Format**: Promo codes should be stored and displayed in uppercase
- **Value Interpretation**:
  - For FIXED: value in EUR (e.g., 20.00 for -20€)
  - For PERCENTAGE: value as percentage (e.g., 15 for -15%)
- **Status Derivation**: Computed field based on isActive, validFrom, validTo, currentUses, maxTotalUses
- **currentUses**: Read-only from UI, incremented by pricing engine when promo is applied to a quote
- **Pricing Engine Integration**: Already integrates with Promotion (Story 4.3) - no changes needed
- **Invoice Integration**: Promotions map to InvoiceLine with lineType = PROMOTION_ADJUSTMENT

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/9-4-settings-pricing-promotions-promo-codes.context.xml

### Files Created

- `packages/api/src/routes/vtc/promotions.ts`
- `packages/api/src/routes/vtc/__tests__/promotions.test.ts`
- `apps/web/modules/saas/settings/pricing/types/promotion.ts`
- `apps/web/modules/saas/settings/pricing/hooks/usePromotions.ts`
- `apps/web/modules/saas/settings/pricing/components/PromotionSummaryCards.tsx`
- `apps/web/modules/saas/settings/pricing/components/PromotionList.tsx`
- `apps/web/modules/saas/settings/pricing/components/PromotionFormDialog.tsx`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/promotions/page.tsx`

### Files Modified

- `packages/api/src/routes/vtc/router.ts`
- `packages/i18n/translations/en.json`
- `packages/i18n/translations/fr.json`
- `apps/web/modules/saas/settings/pricing/components/index.ts`
- `apps/web/modules/saas/settings/pricing/hooks/index.ts`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/layout.tsx`
- `docs/sprint-artifacts/sprint-status.yaml`

### Test Summary

- `pnpm vitest run packages/api/src/routes/vtc/__tests__/promotions.test.ts`
- Manual verification via Playwright MCP of `/settings/pricing/promotions` navigation & CRUD UI
- API smoke checks via curl (authenticated) and DB verification through MCP

### Implementation Notes

- Followed Optional Fees (Story 9.3) patterns for hooks/components.
- Enforced promo code uniqueness per organization with uppercase normalization.
- Added comprehensive EN/FR translations covering stats, filters, form, and toast messaging.
