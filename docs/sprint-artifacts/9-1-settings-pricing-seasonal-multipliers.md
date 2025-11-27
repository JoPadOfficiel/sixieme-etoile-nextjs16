# Story 9.1: Settings → Pricing – Seasonal Multipliers

**Epic:** Epic 9 – Advanced Pricing Configuration & Reporting  
**Status:** done  
**Created:** 2025-11-27  
**Updated:** 2025-11-27  
**Priority:** High  
**Branch:** feature/9-1-seasonal-multipliers

---

## User Story

**As a** pricing manager,  
**I want** to configure seasonal multipliers for specific periods and events from the Settings UI,  
**So that** prices automatically adjust for peaks like Le Bourget Air Show or high season without manual intervention.

---

## Description

Seasonal multipliers allow pricing managers to define time-based price adjustments that are automatically applied by the pricing engine. This story implements the full UI and API for managing these multipliers.

### Key Features

1. **Summary Dashboard** - At-a-glance view of active, upcoming, and total multipliers
2. **Data Table** - Sortable, filterable list of all configured multipliers
3. **Create/Edit Dialog** - Form with slider for multiplier value and date range picker
4. **Priority Management** - Handle overlapping periods with explicit priority
5. **Status Indicators** - Visual badges for Active/Upcoming/Expired states

### Business Value

- **Revenue Optimization**: Capture additional revenue during high-demand periods
- **Operational Efficiency**: Eliminate manual price adjustments for recurring events
- **Planning Capability**: Configure multipliers in advance for known events
- **Transparency**: Clear visibility into which multipliers are active and when

---

## Acceptance Criteria

### AC1: Page Navigation & Layout

```gherkin
Given I am logged in as a pricing manager
When I navigate to Settings → Pricing → Seasonal Multipliers
Then I see the page at /app/{orgSlug}/settings/pricing/seasonal-multipliers
And the page displays:
  - Page title "Seasonal Multipliers"
  - "Add Multiplier" button in the header
  - Three summary cards (Currently Active, Upcoming, Total)
  - Data table with all configured multipliers
```

### AC2: Summary Cards Display

```gherkin
Given the Seasonal Multipliers page is loaded
When I view the summary cards
Then I see three cards:
  | Card | Description | Icon |
  | Currently Active | Count of multipliers where today is between startDate and endDate | CheckCircle2 (green) |
  | Upcoming | Count of multipliers starting within next 30 days | Calendar (blue) |
  | Total Configured | Total count of all multipliers | Settings (gray) |
And the counts are accurate based on current date (Europe/Paris)
```

### AC3: Data Table Display

```gherkin
Given multipliers exist for the organization
When I view the data table
Then I see columns:
  | Column | Content |
  | Name | Multiplier name |
  | Period | startDate - endDate formatted |
  | Multiplier | Value displayed as "1.30x" or "+30%" |
  | Priority | Numeric priority value |
  | Status | Badge: Active (green), Upcoming (blue), Expired (gray) |
  | Actions | Edit and Delete buttons |
And the table is sortable by Name, Period, Multiplier, Priority
And I can filter by Status (All, Active, Upcoming, Expired)
And I can search by name
```

### AC4: Create Multiplier Dialog

```gherkin
Given I click "Add Multiplier" button
When the dialog opens
Then I see a form with:
  | Field | Type | Validation |
  | Name | Text input | Required, max 100 chars |
  | Description | Textarea | Optional, max 500 chars |
  | Start Date | Date picker | Required, Europe/Paris |
  | End Date | Date picker | Required, must be >= Start Date |
  | Multiplier | Slider (0.1-3.0) | Required, shows live percentage |
  | Priority | Number input | Optional, default 0 |
  | Active | Toggle | Default true |
When I fill valid data and click "Create"
Then the multiplier is created
And the table refreshes with the new entry
And a success toast appears
```

### AC5: Edit Multiplier Dialog

```gherkin
Given I click Edit on an existing multiplier
When the dialog opens
Then all fields are pre-populated with current values
And the slider shows the current multiplier value
When I modify fields and click "Save"
Then the multiplier is updated
And the table refreshes with updated data
And a success toast appears
```

### AC6: Delete Multiplier

```gherkin
Given I click Delete on an existing multiplier
When the confirmation dialog appears
Then I see the multiplier name in the confirmation message
When I confirm deletion
Then the multiplier is removed from the database
And the table refreshes without the deleted entry
And a success toast appears
```

### AC7: API Endpoints

```gherkin
Given the seasonal multipliers API
When called with valid authentication and organization context
Then the following endpoints are available:
  | Method | Endpoint | Description |
  | GET | /api/vtc/seasonal-multipliers | List all multipliers |
  | GET | /api/vtc/seasonal-multipliers/:id | Get single multiplier |
  | POST | /api/vtc/seasonal-multipliers | Create multiplier |
  | PATCH | /api/vtc/seasonal-multipliers/:id | Update multiplier |
  | DELETE | /api/vtc/seasonal-multipliers/:id | Delete multiplier |
  | GET | /api/vtc/seasonal-multipliers/stats | Get summary stats |
```

### AC8: Multi-Tenancy Isolation

```gherkin
Given Organization A has multipliers [M1, M2]
And Organization B has multipliers [M3, M4]
When a user from Organization A lists multipliers
Then they only see [M1, M2]
And they cannot access M3 or M4 by ID
```

### AC9: Translations

```gherkin
Given the application language is set to English
When I view the Seasonal Multipliers page
Then all labels, buttons, and messages are in English

Given the application language is set to French
When I view the Seasonal Multipliers page
Then all labels, buttons, and messages are in French
```

---

## Technical Implementation

### Database Schema

The `SeasonalMultiplier` model already exists in Prisma (Story 1.1):

```prisma
model SeasonalMultiplier {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name        String
  description String?
  startDate   DateTime
  endDate     DateTime
  multiplier  Decimal  @db.Decimal(4, 2)
  priority    Int      @default(0)
  isActive    Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([startDate, endDate])
  @@map("seasonal_multiplier")
}
```

### Files to Create

```
packages/api/src/routes/vtc/
├── seasonal-multipliers.ts              # API routes
└── __tests__/
    └── seasonal-multipliers.test.ts     # Unit tests

apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/
└── seasonal-multipliers/
    └── page.tsx                         # Main page

apps/web/modules/saas/settings/pricing/
├── components/
│   ├── SeasonalMultiplierList.tsx       # Data table component
│   ├── SeasonalMultiplierFormDialog.tsx # Create/Edit dialog
│   └── SeasonalMultiplierSummaryCards.tsx # Summary cards
├── hooks/
│   └── useSeasonalMultipliers.ts        # React Query hooks
└── types/
    └── seasonal-multiplier.ts           # TypeScript types
```

### Files to Modify

```
packages/api/src/routes/vtc/router.ts    # Register routes
packages/i18n/translations/en.json       # English translations
packages/i18n/translations/fr.json       # French translations
```

### API Endpoints

```typescript
// GET /api/vtc/seasonal-multipliers
interface ListSeasonalMultipliersResponse {
  multipliers: SeasonalMultiplierListItem[];
  total: number;
}

interface SeasonalMultiplierListItem {
  id: string;
  name: string;
  description: string | null;
  startDate: string; // ISO date
  endDate: string; // ISO date
  multiplier: number;
  priority: number;
  isActive: boolean;
  status: "active" | "upcoming" | "expired";
  createdAt: string;
  updatedAt: string;
}

// GET /api/vtc/seasonal-multipliers/stats
interface SeasonalMultiplierStatsResponse {
  currentlyActive: number;
  upcoming: number;
  total: number;
}

// POST /api/vtc/seasonal-multipliers
interface CreateSeasonalMultiplierRequest {
  name: string;
  description?: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  multiplier: number; // 0.1 - 3.0
  priority?: number;
  isActive?: boolean;
}

// PATCH /api/vtc/seasonal-multipliers/:id
interface UpdateSeasonalMultiplierRequest {
  name?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  multiplier?: number;
  priority?: number;
  isActive?: boolean;
}
```

### Translations

```json
// packages/i18n/translations/en.json
{
  "settings": {
    "pricing": {
      "seasonalMultipliers": {
        "title": "Seasonal Multipliers",
        "description": "Configure price adjustments for specific periods and events",
        "addButton": "Add Multiplier",
        "stats": {
          "currentlyActive": "Currently Active",
          "upcoming": "Upcoming (30 days)",
          "total": "Total Configured"
        },
        "table": {
          "name": "Name",
          "period": "Period",
          "multiplier": "Multiplier",
          "priority": "Priority",
          "status": "Status",
          "actions": "Actions"
        },
        "status": {
          "active": "Active",
          "upcoming": "Upcoming",
          "expired": "Expired"
        },
        "form": {
          "createTitle": "Create Seasonal Multiplier",
          "editTitle": "Edit Seasonal Multiplier",
          "name": "Name",
          "namePlaceholder": "e.g., Le Bourget Air Show 2025",
          "description": "Description",
          "descriptionPlaceholder": "Optional description...",
          "startDate": "Start Date",
          "endDate": "End Date",
          "multiplier": "Multiplier",
          "multiplierHelp": "Price will be multiplied by this value",
          "priority": "Priority",
          "priorityHelp": "Higher priority takes precedence when periods overlap",
          "isActive": "Active",
          "create": "Create",
          "save": "Save Changes",
          "cancel": "Cancel"
        },
        "delete": {
          "title": "Delete Multiplier",
          "message": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
          "confirm": "Delete",
          "cancel": "Cancel"
        },
        "toast": {
          "createSuccess": "Multiplier created successfully",
          "updateSuccess": "Multiplier updated successfully",
          "deleteSuccess": "Multiplier deleted successfully",
          "error": "An error occurred"
        },
        "empty": {
          "title": "No multipliers configured",
          "description": "Create your first seasonal multiplier to adjust prices for specific periods."
        }
      }
    }
  }
}
```

```json
// packages/i18n/translations/fr.json
{
  "settings": {
    "pricing": {
      "seasonalMultipliers": {
        "title": "Multiplicateurs Saisonniers",
        "description": "Configurez les ajustements de prix pour des périodes et événements spécifiques",
        "addButton": "Ajouter un multiplicateur",
        "stats": {
          "currentlyActive": "Actuellement actifs",
          "upcoming": "À venir (30 jours)",
          "total": "Total configuré"
        },
        "table": {
          "name": "Nom",
          "period": "Période",
          "multiplier": "Multiplicateur",
          "priority": "Priorité",
          "status": "Statut",
          "actions": "Actions"
        },
        "status": {
          "active": "Actif",
          "upcoming": "À venir",
          "expired": "Expiré"
        },
        "form": {
          "createTitle": "Créer un multiplicateur saisonnier",
          "editTitle": "Modifier le multiplicateur saisonnier",
          "name": "Nom",
          "namePlaceholder": "ex: Salon du Bourget 2025",
          "description": "Description",
          "descriptionPlaceholder": "Description optionnelle...",
          "startDate": "Date de début",
          "endDate": "Date de fin",
          "multiplier": "Multiplicateur",
          "multiplierHelp": "Le prix sera multiplié par cette valeur",
          "priority": "Priorité",
          "priorityHelp": "La priorité la plus haute prévaut en cas de chevauchement",
          "isActive": "Actif",
          "create": "Créer",
          "save": "Enregistrer",
          "cancel": "Annuler"
        },
        "delete": {
          "title": "Supprimer le multiplicateur",
          "message": "Êtes-vous sûr de vouloir supprimer \"{{name}}\" ? Cette action est irréversible.",
          "confirm": "Supprimer",
          "cancel": "Annuler"
        },
        "toast": {
          "createSuccess": "Multiplicateur créé avec succès",
          "updateSuccess": "Multiplicateur mis à jour avec succès",
          "deleteSuccess": "Multiplicateur supprimé avec succès",
          "error": "Une erreur est survenue"
        },
        "empty": {
          "title": "Aucun multiplicateur configuré",
          "description": "Créez votre premier multiplicateur saisonnier pour ajuster les prix sur des périodes spécifiques."
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
// packages/api/src/routes/vtc/__tests__/seasonal-multipliers.test.ts
describe("SeasonalMultipliers API", () => {
  describe("GET /seasonal-multipliers", () => {
    it("returns all multipliers for the organization", () => {});
    it("filters by status when query param provided", () => {});
    it("returns empty array when no multipliers exist", () => {});
    it("does not return multipliers from other organizations", () => {});
  });

  describe("GET /seasonal-multipliers/stats", () => {
    it("returns correct counts for active, upcoming, total", () => {});
    it("calculates active based on current date", () => {});
    it("calculates upcoming based on next 30 days", () => {});
  });

  describe("GET /seasonal-multipliers/:id", () => {
    it("returns multiplier by ID", () => {});
    it("returns 404 for non-existent ID", () => {});
    it("returns 404 for ID from another organization", () => {});
  });

  describe("POST /seasonal-multipliers", () => {
    it("creates multiplier with valid data", () => {});
    it("validates required fields", () => {});
    it("validates multiplier range (0.1-3.0)", () => {});
    it("validates endDate >= startDate", () => {});
    it("sets default priority to 0", () => {});
    it("sets default isActive to true", () => {});
  });

  describe("PATCH /seasonal-multipliers/:id", () => {
    it("updates multiplier fields", () => {});
    it("allows partial updates", () => {});
    it("validates multiplier range on update", () => {});
    it("returns 404 for non-existent ID", () => {});
  });

  describe("DELETE /seasonal-multipliers/:id", () => {
    it("deletes multiplier", () => {});
    it("returns 404 for non-existent ID", () => {});
    it("returns success even if already deleted", () => {});
  });
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/settings-seasonal-multipliers.spec.ts
describe("Settings - Seasonal Multipliers", () => {
  beforeEach(async () => {
    await page.goto("/app/test-org/settings/pricing/seasonal-multipliers");
  });

  it("displays page with summary cards and table", async () => {
    await expect(page.locator("h1")).toContainText("Seasonal Multipliers");
    await expect(page.locator('[data-testid="stats-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-upcoming"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="multipliers-table"]')
    ).toBeVisible();
  });

  it("opens create dialog and creates multiplier", async () => {
    await page.click('[data-testid="add-multiplier-button"]');
    await expect(
      page.locator('[data-testid="multiplier-dialog"]')
    ).toBeVisible();

    await page.fill('[data-testid="name-input"]', "Test Multiplier");
    await page.fill('[data-testid="start-date-input"]', "2025-12-01");
    await page.fill('[data-testid="end-date-input"]', "2025-12-31");
    // Adjust slider to 1.5x
    await page.locator('[data-testid="multiplier-slider"]').fill("1.5");

    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("edits existing multiplier", async () => {
    await page.click('[data-testid="edit-button"]:first-child');
    await expect(
      page.locator('[data-testid="multiplier-dialog"]')
    ).toBeVisible();

    await page.fill('[data-testid="name-input"]', "Updated Name");
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("deletes multiplier with confirmation", async () => {
    await page.click('[data-testid="delete-button"]:first-child');
    await expect(page.locator('[data-testid="delete-dialog"]')).toBeVisible();

    await page.click('[data-testid="confirm-delete"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("filters table by status", async () => {
    await page.selectOption('[data-testid="status-filter"]', "active");
    // Verify only active multipliers are shown
  });
});
```

### API Tests (curl)

```bash
# List multipliers
curl -X GET "http://localhost:3000/api/vtc/seasonal-multipliers" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Get stats
curl -X GET "http://localhost:3000/api/vtc/seasonal-multipliers/stats" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Create multiplier
curl -X POST "http://localhost:3000/api/vtc/seasonal-multipliers" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Le Bourget Air Show 2025",
    "description": "Biennial aerospace event",
    "startDate": "2025-06-16",
    "endDate": "2025-06-22",
    "multiplier": 1.5,
    "priority": 10
  }'

# Update multiplier
curl -X PATCH "http://localhost:3000/api/vtc/seasonal-multipliers/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "multiplier": 1.6,
    "isActive": true
  }'

# Delete multiplier
curl -X DELETE "http://localhost:3000/api/vtc/seasonal-multipliers/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Verify in database via MCP @postgres_vtc_sixiemme_etoile
# SELECT * FROM "seasonal_multiplier" WHERE "organizationId" = 'vtc-qa-orga1';
```

---

## Dependencies

| Dependency                             | Type       | Status       |
| -------------------------------------- | ---------- | ------------ |
| Story 1.1 - SeasonalMultiplier model   | Schema     | ✅ Done      |
| Story 4.3 - Pricing engine integration | Service    | ✅ Done      |
| organizationMiddleware                 | Middleware | ✅ Done      |
| Settings layout                        | UI         | ✅ Done      |
| shadcn/ui components                   | UI Library | ✅ Available |

---

## Definition of Done

- [ ] API route GET /seasonal-multipliers implemented
- [ ] API route GET /seasonal-multipliers/stats implemented
- [ ] API route GET /seasonal-multipliers/:id implemented
- [ ] API route POST /seasonal-multipliers implemented
- [ ] API route PATCH /seasonal-multipliers/:id implemented
- [ ] API route DELETE /seasonal-multipliers/:id implemented
- [ ] Routes registered in vtc/router.ts
- [ ] Page /settings/pricing/seasonal-multipliers created
- [ ] SeasonalMultiplierSummaryCards component implemented
- [ ] SeasonalMultiplierList component implemented
- [ ] SeasonalMultiplierFormDialog component implemented
- [ ] useSeasonalMultipliers hooks implemented
- [ ] TypeScript types defined
- [ ] Translations added (en/fr)
- [ ] Unit tests passing (Vitest)
- [ ] E2E tests passing (Playwright MCP)
- [ ] API endpoints tested with curl
- [ ] Database state verified via MCP
- [ ] Code reviewed and merged

---

## Notes

- **Date Handling**: All dates are stored and displayed as Europe/Paris business times
- **Multiplier Range**: 0.1x to 3.0x (10% to 300% of base price)
- **Priority Logic**: When multiple multipliers overlap, the one with highest priority is applied
- **Status Calculation**:
  - Active: startDate <= today <= endDate AND isActive = true
  - Upcoming: startDate > today AND startDate <= today + 30 days
  - Expired: endDate < today
- **Pricing Engine**: Already integrates with SeasonalMultiplier (Story 4.3) - no changes needed

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/9-1-settings-pricing-seasonal-multipliers.context.xml

### Files Created

- `packages/api/src/routes/vtc/seasonal-multipliers.ts` - API routes CRUD
- `packages/api/src/routes/vtc/__tests__/seasonal-multipliers.test.ts` - Unit tests (19 tests)
- `apps/web/modules/saas/settings/pricing/types/seasonal-multiplier.ts` - TypeScript types
- `apps/web/modules/saas/settings/pricing/hooks/useSeasonalMultipliers.ts` - React Query hooks
- `apps/web/modules/saas/settings/pricing/hooks/index.ts` - Hooks exports
- `apps/web/modules/saas/settings/pricing/components/SeasonalMultiplierSummaryCards.tsx` - Summary cards
- `apps/web/modules/saas/settings/pricing/components/SeasonalMultiplierList.tsx` - Data table
- `apps/web/modules/saas/settings/pricing/components/SeasonalMultiplierFormDialog.tsx` - Create/Edit dialog
- `apps/web/modules/saas/settings/pricing/components/index.ts` - Components exports
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/seasonal-multipliers/page.tsx` - Settings page

### Files Modified

- `packages/api/src/routes/vtc/router.ts` - Registered seasonal-multipliers routes
- `packages/i18n/translations/en.json` - Added English translations
- `packages/i18n/translations/fr.json` - Added French translations

### Test Summary

- **Unit Tests (Vitest):** 19 tests passing
  - GET /pricing/seasonal-multipliers/stats: 1 test
  - GET /pricing/seasonal-multipliers: 5 tests
  - GET /pricing/seasonal-multipliers/:id: 2 tests
  - POST /pricing/seasonal-multipliers: 4 tests
  - PATCH /pricing/seasonal-multipliers/:id: 3 tests
  - DELETE /pricing/seasonal-multipliers/:id: 2 tests
  - Multi-tenancy: 2 tests

### Implementation Notes

- Used existing SeasonalMultiplier Prisma model from Story 1.1
- API follows existing VTC routes patterns (Hono, Zod validation, organizationMiddleware)
- UI uses shadcn/ui components (Card, Table, Dialog, Badge, etc.)
- Replaced Slider component with native range input (Slider not available in project)
- Status calculation based on current date (Europe/Paris business time)
- Priority field for handling overlapping multipliers
- Full multi-tenancy support via organizationId filtering
