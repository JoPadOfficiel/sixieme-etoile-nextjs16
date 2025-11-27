# Story 9.2: Settings → Pricing – Advanced Rate Modifiers

**Epic:** Epic 9 – Advanced Pricing Configuration & Reporting  
**Status:** ready-for-dev  
**Created:** 2025-11-27  
**Updated:** 2025-11-27  
**Priority:** High  
**Branch:** feature/9-2-advanced-rate-modifiers

---

## User Story

**As a** pricing manager,  
**I want** to configure advanced rate modifiers (night, weekend, long-distance, zone-specific) from the Settings UI,  
**So that** complex business rules can be expressed without code changes and prices automatically adjust based on configurable conditions.

---

## Description

Advanced rate modifiers allow pricing managers to define business rule-driven price adjustments that are automatically applied by the pricing engine. This story implements the full UI and API for managing these modifiers.

### Key Features

1. **Summary Dashboard** - At-a-glance view of modifiers by type (Night, Weekend, Long Distance, Zone, Holiday)
2. **Data Table** - Sortable, filterable list of all configured rate modifiers
3. **Create/Edit Dialog** - Dynamic form with conditional fields based on modifier type
4. **Type-Specific Conditions** - Time ranges, days of week, distance thresholds, or zone selection
5. **Adjustment Types** - Support for both percentage and fixed amount adjustments
6. **Priority Management** - Handle stacking with explicit priority

### Business Value

- **Pricing Flexibility**: Express complex pricing rules without code changes
- **Operational Efficiency**: Automatic price adjustments for night/weekend/distance scenarios
- **Revenue Optimization**: Capture additional revenue during premium periods
- **Transparency**: Clear visibility into which modifiers are active and their conditions

### Rate Modifier Types

| Type          | Description               | Conditions                               |
| ------------- | ------------------------- | ---------------------------------------- |
| NIGHT         | Night-time surcharge      | Start time, End time (e.g., 22:00-06:00) |
| WEEKEND       | Weekend surcharge         | Start time, End time, Days of week       |
| LONG_DISTANCE | Distance-based adjustment | Min distance (km), Max distance (km)     |
| ZONE_SCENARIO | Zone-specific pricing     | Linked zone                              |
| HOLIDAY       | Holiday surcharge         | Start time, End time, Days of week       |

---

## Acceptance Criteria

### AC1: Page Navigation & Layout

```gherkin
Given I am logged in as a pricing manager
When I navigate to Settings → Pricing → Advanced Rates
Then I see the page at /app/{orgSlug}/settings/pricing/advanced-rates
And the page displays:
  - Page title "Advanced Rate Modifiers"
  - "Add Rate Modifier" button in the header
  - Summary cards showing counts by type
  - Data table with all configured rate modifiers
```

### AC2: Summary Cards Display

```gherkin
Given the Advanced Rates page is loaded
When I view the summary cards
Then I see cards showing counts by type:
  | Card | Description | Icon |
  | Night Rates | Count of NIGHT type modifiers | Moon |
  | Weekend Rates | Count of WEEKEND type modifiers | Calendar |
  | Long Distance | Count of LONG_DISTANCE type modifiers | Route |
  | Zone-Based | Count of ZONE_SCENARIO type modifiers | MapPin |
  | Total Active | Total count of active modifiers | Settings |
And the counts are accurate based on current data
```

### AC3: Data Table Display

```gherkin
Given rate modifiers exist for the organization
When I view the data table
Then I see columns:
  | Column | Content |
  | Name | Rate modifier name |
  | Type | NIGHT, WEEKEND, LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY badge |
  | Conditions | Time range, days, distance, or zone displayed |
  | Adjustment | Value displayed as "+20%" or "+15.00€" |
  | Priority | Numeric priority value |
  | Status | Badge: Active (green), Inactive (gray) |
  | Actions | Edit and Delete buttons |
And the table is sortable by Name, Type, Priority
And I can filter by Type (All, Night, Weekend, Long Distance, Zone, Holiday)
And I can filter by Status (All, Active, Inactive)
And I can search by name
```

### AC4: Create Rate Modifier Dialog

```gherkin
Given I click "Add Rate Modifier" button
When the dialog opens
Then I see a form with:
  | Field | Type | Validation |
  | Name | Text input | Required, max 100 chars |
  | Type | Select | Required: NIGHT, WEEKEND, LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY |
  | Start Time | Time picker | Conditional: Required for NIGHT/WEEKEND/HOLIDAY |
  | End Time | Time picker | Conditional: Required for NIGHT/WEEKEND/HOLIDAY |
  | Days of Week | Multi-select checkboxes | Conditional: Required for WEEKEND/HOLIDAY |
  | Min Distance (km) | Number input | Conditional: Required for LONG_DISTANCE |
  | Max Distance (km) | Number input | Conditional: Optional for LONG_DISTANCE |
  | Zone | Select (zones list) | Conditional: Required for ZONE_SCENARIO |
  | Adjustment Type | Select | Required: PERCENTAGE, FIXED_AMOUNT |
  | Value | Number input | Required |
  | Priority | Number input | Optional, default 0 |
  | Active | Toggle | Default true |
When I fill valid data and click "Create"
Then the rate modifier is created
And the table refreshes with the new entry
And a success toast appears
```

### AC5: Edit Rate Modifier Dialog

```gherkin
Given I click Edit on an existing rate modifier
When the dialog opens
Then all fields are pre-populated with current values
And the type-specific fields are shown based on the modifier type
When I modify fields and click "Save"
Then the rate modifier is updated
And the table refreshes with updated data
And a success toast appears
```

### AC6: Delete Rate Modifier

```gherkin
Given I click Delete on an existing rate modifier
When the confirmation dialog appears
Then I see the rate modifier name in the confirmation message
When I confirm deletion
Then the rate modifier is removed from the database
And the table refreshes without the deleted entry
And a success toast appears
```

### AC7: API Endpoints

```gherkin
Given the advanced rates API
When called with valid authentication and organization context
Then the following endpoints are available:
  | Method | Endpoint | Description |
  | GET | /api/vtc/pricing/advanced-rates | List all rate modifiers |
  | GET | /api/vtc/pricing/advanced-rates/:id | Get single rate modifier |
  | POST | /api/vtc/pricing/advanced-rates | Create rate modifier |
  | PATCH | /api/vtc/pricing/advanced-rates/:id | Update rate modifier |
  | DELETE | /api/vtc/pricing/advanced-rates/:id | Delete rate modifier |
  | GET | /api/vtc/pricing/advanced-rates/stats | Get summary stats by type |
```

### AC8: Multi-Tenancy Isolation

```gherkin
Given Organization A has rate modifiers [R1, R2]
And Organization B has rate modifiers [R3, R4]
When a user from Organization A lists rate modifiers
Then they only see [R1, R2]
And they cannot access R3 or R4 by ID
```

### AC9: Conditional Form Fields

```gherkin
Given I am creating a rate modifier
When I select Type = NIGHT
Then Start Time and End Time fields are shown and required
And Days of Week, Distance, and Zone fields are hidden

When I select Type = WEEKEND
Then Start Time, End Time, and Days of Week fields are shown
And Distance and Zone fields are hidden

When I select Type = LONG_DISTANCE
Then Min Distance field is shown and required
And Max Distance field is shown (optional)
And Time, Days, and Zone fields are hidden

When I select Type = ZONE_SCENARIO
Then Zone select field is shown and required
And Time, Days, and Distance fields are hidden

When I select Type = HOLIDAY
Then Start Time, End Time, and Days of Week fields are shown
And Distance and Zone fields are hidden
```

### AC10: Translations

```gherkin
Given the application language is set to English
When I view the Advanced Rates page
Then all labels, buttons, and messages are in English

Given the application language is set to French
When I view the Advanced Rates page
Then all labels, buttons, and messages are in French
```

---

## Technical Implementation

### Database Schema

The `AdvancedRate` model already exists in Prisma (Story 1.1):

```prisma
model AdvancedRate {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name String

  appliesTo AdvancedRateAppliesTo

  // Time conditions (for NIGHT, WEEKEND, HOLIDAY)
  startTime  String? // HH:MM format
  endTime    String? // HH:MM format
  daysOfWeek String? // e.g. "1,2,3,4,5" for weekdays

  // Distance conditions (for LONG_DISTANCE)
  minDistanceKm Decimal? @db.Decimal(8, 2)
  maxDistanceKm Decimal? @db.Decimal(8, 2)

  // Zone conditions (for ZONE_SCENARIO)
  zoneId String?
  zone   PricingZone? @relation(fields: [zoneId], references: [id])

  // Adjustment
  adjustmentType AdjustmentType
  value          Decimal        @db.Decimal(10, 4)

  priority Int @default(0)

  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([organizationId])
  @@index([appliesTo])
  @@map("advanced_rate")
}

enum AdvancedRateAppliesTo {
  NIGHT
  WEEKEND
  LONG_DISTANCE
  ZONE_SCENARIO
  HOLIDAY
}

enum AdjustmentType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

### Files to Create

```
packages/api/src/routes/vtc/
├── advanced-rates.ts                    # API routes
└── __tests__/
    └── advanced-rates.test.ts           # Unit tests

apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/
└── advanced-rates/
    └── page.tsx                         # Main page

apps/web/modules/saas/settings/pricing/
├── components/
│   ├── AdvancedRateSummaryCards.tsx     # Summary cards component
│   ├── AdvancedRateList.tsx             # Data table component
│   └── AdvancedRateFormDialog.tsx       # Create/Edit dialog
├── hooks/
│   └── useAdvancedRates.ts              # React Query hooks
└── types/
    └── advanced-rate.ts                 # TypeScript types
```

### Files to Modify

```
packages/api/src/routes/vtc/router.ts    # Register routes
packages/i18n/translations/en.json       # English translations
packages/i18n/translations/fr.json       # French translations
apps/web/modules/saas/settings/pricing/components/index.ts  # Export new components
apps/web/modules/saas/settings/pricing/hooks/index.ts       # Export new hooks
```

### API Endpoints

```typescript
// GET /api/vtc/pricing/advanced-rates
interface ListAdvancedRatesResponse {
  data: AdvancedRateListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AdvancedRateListItem {
  id: string;
  name: string;
  appliesTo:
    | "NIGHT"
    | "WEEKEND"
    | "LONG_DISTANCE"
    | "ZONE_SCENARIO"
    | "HOLIDAY";
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string | null;
  minDistanceKm: number | null;
  maxDistanceKm: number | null;
  zoneId: string | null;
  zoneName: string | null; // Joined from PricingZone
  adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// GET /api/vtc/pricing/advanced-rates/stats
interface AdvancedRateStatsResponse {
  night: number;
  weekend: number;
  longDistance: number;
  zoneScenario: number;
  holiday: number;
  totalActive: number;
}

// POST /api/vtc/pricing/advanced-rates
interface CreateAdvancedRateRequest {
  name: string;
  appliesTo:
    | "NIGHT"
    | "WEEKEND"
    | "LONG_DISTANCE"
    | "ZONE_SCENARIO"
    | "HOLIDAY";
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  daysOfWeek?: string; // "0,6" for weekend
  minDistanceKm?: number;
  maxDistanceKm?: number;
  zoneId?: string;
  adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  priority?: number;
  isActive?: boolean;
}

// PATCH /api/vtc/pricing/advanced-rates/:id
interface UpdateAdvancedRateRequest {
  name?: string;
  appliesTo?:
    | "NIGHT"
    | "WEEKEND"
    | "LONG_DISTANCE"
    | "ZONE_SCENARIO"
    | "HOLIDAY";
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: string | null;
  minDistanceKm?: number | null;
  maxDistanceKm?: number | null;
  zoneId?: string | null;
  adjustmentType?: "PERCENTAGE" | "FIXED_AMOUNT";
  value?: number;
  priority?: number;
  isActive?: boolean;
}
```

### Translations

```json
// packages/i18n/translations/en.json (to add)
{
  "settings": {
    "pricing": {
      "advancedRates": {
        "title": "Advanced Rate Modifiers",
        "description": "Configure price adjustments based on time, distance, or zone conditions",
        "addButton": "Add Rate Modifier",
        "stats": {
          "night": "Night Rates",
          "weekend": "Weekend Rates",
          "longDistance": "Long Distance",
          "zoneScenario": "Zone-Based",
          "holiday": "Holiday Rates",
          "totalActive": "Total Active"
        },
        "table": {
          "name": "Name",
          "type": "Type",
          "conditions": "Conditions",
          "adjustment": "Adjustment",
          "priority": "Priority",
          "status": "Status",
          "actions": "Actions"
        },
        "types": {
          "NIGHT": "Night",
          "WEEKEND": "Weekend",
          "LONG_DISTANCE": "Long Distance",
          "ZONE_SCENARIO": "Zone",
          "HOLIDAY": "Holiday"
        },
        "status": {
          "all": "All",
          "active": "Active",
          "inactive": "Inactive"
        },
        "conditions": {
          "timeRange": "{start} - {end}",
          "days": "Days: {days}",
          "distance": "{min}km - {max}km",
          "distanceMin": "≥ {min}km",
          "zone": "Zone: {zone}"
        },
        "form": {
          "createTitle": "Create Rate Modifier",
          "editTitle": "Edit Rate Modifier",
          "name": "Name",
          "namePlaceholder": "e.g., Night Surcharge",
          "type": "Type",
          "typePlaceholder": "Select type...",
          "startTime": "Start Time",
          "endTime": "End Time",
          "daysOfWeek": "Days of Week",
          "days": {
            "0": "Sunday",
            "1": "Monday",
            "2": "Tuesday",
            "3": "Wednesday",
            "4": "Thursday",
            "5": "Friday",
            "6": "Saturday"
          },
          "minDistance": "Minimum Distance (km)",
          "maxDistance": "Maximum Distance (km)",
          "maxDistanceHelp": "Leave empty for no upper limit",
          "zone": "Zone",
          "zonePlaceholder": "Select zone...",
          "adjustmentType": "Adjustment Type",
          "adjustmentTypes": {
            "PERCENTAGE": "Percentage",
            "FIXED_AMOUNT": "Fixed Amount (€)"
          },
          "value": "Value",
          "valueHelp": "Enter percentage (e.g., 20 for +20%) or amount in EUR",
          "priority": "Priority",
          "priorityHelp": "Higher priority takes precedence when multiple modifiers apply",
          "isActive": "Active",
          "create": "Create",
          "save": "Save Changes",
          "cancel": "Cancel"
        },
        "delete": {
          "title": "Delete Rate Modifier",
          "message": "Are you sure you want to delete \"{name}\"? This action cannot be undone.",
          "confirm": "Delete",
          "cancel": "Cancel"
        },
        "toast": {
          "createSuccess": "Rate modifier created successfully",
          "updateSuccess": "Rate modifier updated successfully",
          "deleteSuccess": "Rate modifier deleted successfully",
          "error": "An error occurred"
        },
        "empty": {
          "title": "No rate modifiers configured",
          "description": "Create your first rate modifier to adjust prices based on conditions."
        },
        "actions": {
          "edit": "Edit",
          "delete": "Delete"
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
      "advancedRates": {
        "title": "Modificateurs de Tarifs Avancés",
        "description": "Configurez les ajustements de prix selon les conditions de temps, distance ou zone",
        "addButton": "Ajouter un modificateur",
        "stats": {
          "night": "Tarifs Nuit",
          "weekend": "Tarifs Week-end",
          "longDistance": "Longue Distance",
          "zoneScenario": "Par Zone",
          "holiday": "Jours Fériés",
          "totalActive": "Total Actifs"
        },
        "table": {
          "name": "Nom",
          "type": "Type",
          "conditions": "Conditions",
          "adjustment": "Ajustement",
          "priority": "Priorité",
          "status": "Statut",
          "actions": "Actions"
        },
        "types": {
          "NIGHT": "Nuit",
          "WEEKEND": "Week-end",
          "LONG_DISTANCE": "Longue Distance",
          "ZONE_SCENARIO": "Zone",
          "HOLIDAY": "Jour Férié"
        },
        "status": {
          "all": "Tous",
          "active": "Actif",
          "inactive": "Inactif"
        },
        "conditions": {
          "timeRange": "{start} - {end}",
          "days": "Jours: {days}",
          "distance": "{min}km - {max}km",
          "distanceMin": "≥ {min}km",
          "zone": "Zone: {zone}"
        },
        "form": {
          "createTitle": "Créer un modificateur de tarif",
          "editTitle": "Modifier le modificateur de tarif",
          "name": "Nom",
          "namePlaceholder": "ex: Majoration Nuit",
          "type": "Type",
          "typePlaceholder": "Sélectionner le type...",
          "startTime": "Heure de début",
          "endTime": "Heure de fin",
          "daysOfWeek": "Jours de la semaine",
          "days": {
            "0": "Dimanche",
            "1": "Lundi",
            "2": "Mardi",
            "3": "Mercredi",
            "4": "Jeudi",
            "5": "Vendredi",
            "6": "Samedi"
          },
          "minDistance": "Distance minimum (km)",
          "maxDistance": "Distance maximum (km)",
          "maxDistanceHelp": "Laisser vide pour aucune limite",
          "zone": "Zone",
          "zonePlaceholder": "Sélectionner une zone...",
          "adjustmentType": "Type d'ajustement",
          "adjustmentTypes": {
            "PERCENTAGE": "Pourcentage",
            "FIXED_AMOUNT": "Montant fixe (€)"
          },
          "value": "Valeur",
          "valueHelp": "Entrez le pourcentage (ex: 20 pour +20%) ou le montant en EUR",
          "priority": "Priorité",
          "priorityHelp": "La priorité la plus haute prévaut quand plusieurs modificateurs s'appliquent",
          "isActive": "Actif",
          "create": "Créer",
          "save": "Enregistrer",
          "cancel": "Annuler"
        },
        "delete": {
          "title": "Supprimer le modificateur",
          "message": "Êtes-vous sûr de vouloir supprimer \"{name}\" ? Cette action est irréversible.",
          "confirm": "Supprimer",
          "cancel": "Annuler"
        },
        "toast": {
          "createSuccess": "Modificateur créé avec succès",
          "updateSuccess": "Modificateur mis à jour avec succès",
          "deleteSuccess": "Modificateur supprimé avec succès",
          "error": "Une erreur est survenue"
        },
        "empty": {
          "title": "Aucun modificateur configuré",
          "description": "Créez votre premier modificateur de tarif pour ajuster les prix selon des conditions."
        },
        "actions": {
          "edit": "Modifier",
          "delete": "Supprimer"
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
// packages/api/src/routes/vtc/__tests__/advanced-rates.test.ts
describe("AdvancedRates API", () => {
  describe("GET /pricing/advanced-rates/stats", () => {
    it("returns correct counts by type", () => {});
  });

  describe("GET /pricing/advanced-rates", () => {
    it("returns all rate modifiers for the organization", () => {});
    it("filters by type when query param provided", () => {});
    it("filters by status when query param provided", () => {});
    it("searches by name", () => {});
    it("returns empty array when no modifiers exist", () => {});
    it("does not return modifiers from other organizations", () => {});
    it("includes zone name when zoneId is set", () => {});
  });

  describe("GET /pricing/advanced-rates/:id", () => {
    it("returns rate modifier by ID", () => {});
    it("returns 404 for non-existent ID", () => {});
    it("returns 404 for ID from another organization", () => {});
  });

  describe("POST /pricing/advanced-rates", () => {
    it("creates NIGHT rate modifier with time conditions", () => {});
    it("creates WEEKEND rate modifier with time and days", () => {});
    it("creates LONG_DISTANCE rate modifier with distance conditions", () => {});
    it("creates ZONE_SCENARIO rate modifier with zone", () => {});
    it("creates HOLIDAY rate modifier with time and days", () => {});
    it("validates required fields", () => {});
    it("validates time format (HH:MM)", () => {});
    it("validates days of week format", () => {});
    it("validates zone exists for ZONE_SCENARIO", () => {});
    it("sets default priority to 0", () => {});
    it("sets default isActive to true", () => {});
  });

  describe("PATCH /pricing/advanced-rates/:id", () => {
    it("updates rate modifier fields", () => {});
    it("allows partial updates", () => {});
    it("clears conditional fields when type changes", () => {});
    it("returns 404 for non-existent ID", () => {});
  });

  describe("DELETE /pricing/advanced-rates/:id", () => {
    it("deletes rate modifier", () => {});
    it("returns 404 for non-existent ID", () => {});
  });

  describe("Multi-tenancy", () => {
    it("isolates data between organizations", () => {});
    it("prevents cross-organization access by ID", () => {});
  });
});
```

### E2E Tests (Playwright)

```typescript
// apps/web/e2e/settings-advanced-rates.spec.ts
describe("Settings - Advanced Rate Modifiers", () => {
  beforeEach(async () => {
    await page.goto("/app/test-org/settings/pricing/advanced-rates");
  });

  it("displays page with summary cards and table", async () => {
    await expect(page.locator("h1")).toContainText("Advanced Rate Modifiers");
    await expect(page.locator('[data-testid="stats-night"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-weekend"]')).toBeVisible();
    await expect(page.locator('[data-testid="stats-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="rates-table"]')).toBeVisible();
  });

  it("creates NIGHT rate modifier", async () => {
    await page.click('[data-testid="add-rate-button"]');
    await expect(page.locator('[data-testid="rate-dialog"]')).toBeVisible();

    await page.fill('[data-testid="name-input"]', "Night Surcharge");
    await page.selectOption('[data-testid="type-select"]', "NIGHT");
    await page.fill('[data-testid="start-time-input"]', "22:00");
    await page.fill('[data-testid="end-time-input"]', "06:00");
    await page.selectOption(
      '[data-testid="adjustment-type-select"]',
      "PERCENTAGE"
    );
    await page.fill('[data-testid="value-input"]', "20");

    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("shows conditional fields based on type", async () => {
    await page.click('[data-testid="add-rate-button"]');

    // Select NIGHT - should show time fields
    await page.selectOption('[data-testid="type-select"]', "NIGHT");
    await expect(
      page.locator('[data-testid="start-time-input"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="end-time-input"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="min-distance-input"]')
    ).not.toBeVisible();

    // Select LONG_DISTANCE - should show distance fields
    await page.selectOption('[data-testid="type-select"]', "LONG_DISTANCE");
    await expect(
      page.locator('[data-testid="min-distance-input"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="start-time-input"]')
    ).not.toBeVisible();
  });

  it("edits existing rate modifier", async () => {
    await page.click('[data-testid="edit-button"]:first-child');
    await expect(page.locator('[data-testid="rate-dialog"]')).toBeVisible();

    await page.fill('[data-testid="name-input"]', "Updated Name");
    await page.click('[data-testid="submit-button"]');

    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("deletes rate modifier with confirmation", async () => {
    await page.click('[data-testid="delete-button"]:first-child');
    await expect(page.locator('[data-testid="delete-dialog"]')).toBeVisible();

    await page.click('[data-testid="confirm-delete"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  it("filters table by type", async () => {
    await page.selectOption('[data-testid="type-filter"]', "NIGHT");
    // Verify only NIGHT modifiers are shown
  });

  it("filters table by status", async () => {
    await page.selectOption('[data-testid="status-filter"]', "active");
    // Verify only active modifiers are shown
  });
});
```

### API Tests (curl)

```bash
# List rate modifiers
curl -X GET "http://localhost:3000/api/vtc/pricing/advanced-rates" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Get stats
curl -X GET "http://localhost:3000/api/vtc/pricing/advanced-rates/stats" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Create NIGHT rate modifier
curl -X POST "http://localhost:3000/api/vtc/pricing/advanced-rates" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Night Surcharge",
    "appliesTo": "NIGHT",
    "startTime": "22:00",
    "endTime": "06:00",
    "adjustmentType": "PERCENTAGE",
    "value": 20,
    "priority": 10
  }'

# Create LONG_DISTANCE rate modifier
curl -X POST "http://localhost:3000/api/vtc/pricing/advanced-rates" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Long Distance Discount",
    "appliesTo": "LONG_DISTANCE",
    "minDistanceKm": 100,
    "maxDistanceKm": 500,
    "adjustmentType": "PERCENTAGE",
    "value": -10,
    "priority": 5
  }'

# Update rate modifier
curl -X PATCH "http://localhost:3000/api/vtc/pricing/advanced-rates/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "value": 25,
    "isActive": true
  }'

# Delete rate modifier
curl -X DELETE "http://localhost:3000/api/vtc/pricing/advanced-rates/{id}" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Verify in database via MCP @postgres_vtc_sixiemme_etoile
# SELECT * FROM "advanced_rate" WHERE "organizationId" = 'vtc-qa-orga1';
```

---

## Dependencies

| Dependency                             | Type       | Status       |
| -------------------------------------- | ---------- | ------------ |
| Story 1.1 - AdvancedRate model         | Schema     | ✅ Done      |
| Story 4.3 - Pricing engine integration | Service    | ✅ Done      |
| organizationMiddleware                 | Middleware | ✅ Done      |
| Settings layout                        | UI         | ✅ Done      |
| PricingZone model (for ZONE_SCENARIO)  | Schema     | ✅ Done      |
| shadcn/ui components                   | UI Library | ✅ Available |

---

## Definition of Done

- [ ] API route GET /pricing/advanced-rates implemented
- [ ] API route GET /pricing/advanced-rates/stats implemented
- [ ] API route GET /pricing/advanced-rates/:id implemented
- [ ] API route POST /pricing/advanced-rates implemented
- [ ] API route PATCH /pricing/advanced-rates/:id implemented
- [ ] API route DELETE /pricing/advanced-rates/:id implemented
- [ ] Routes registered in vtc/router.ts
- [ ] Page /settings/pricing/advanced-rates created
- [ ] AdvancedRateSummaryCards component implemented
- [ ] AdvancedRateList component implemented
- [ ] AdvancedRateFormDialog component with conditional fields implemented
- [ ] useAdvancedRates hooks implemented
- [ ] TypeScript types defined
- [ ] Translations added (en/fr)
- [ ] Unit tests passing (Vitest)
- [ ] E2E tests passing (Playwright MCP)
- [ ] API endpoints tested with curl
- [ ] Database state verified via MCP
- [ ] Code reviewed and merged

---

## Notes

- **Time Format**: Times are stored as HH:MM strings (e.g., "22:00", "06:00")
- **Days of Week**: Stored as comma-separated string (e.g., "0,6" for Sunday and Saturday)
- **Value Interpretation**:
  - For PERCENTAGE: value of 20 means +20%, value of -10 means -10%
  - For FIXED_AMOUNT: value in EUR (e.g., 15.00 for +15€)
- **Priority Logic**: When multiple modifiers apply, they are stacked by priority (highest first)
- **Zone Validation**: For ZONE_SCENARIO, the zoneId must reference an existing PricingZone
- **Pricing Engine**: Already integrates with AdvancedRate (Story 4.3) - no changes needed

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/9-2-settings-pricing-advanced-rate-modifiers.context.xml

### Files Created

(To be filled during implementation)

### Files Modified

(To be filled during implementation)

### Test Summary

(To be filled during implementation)

### Implementation Notes

(To be filled during implementation)
