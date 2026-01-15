# Story 17.4: Configurable Staffing Cost Parameters

**Epic:** Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability  
**Status:** Ready for Development  
**Priority:** High  
**Estimated Effort:** 3 Story Points  
**Sprint:** Current  
**Created:** 2025-12-30

---

## Description

**As an** administrator,  
**I want** to configure all staffing-related cost parameters at the organisation level,  
**So that** pricing reflects our actual operational costs without hardcoded values in the code.

### Business Value

- **Flexibilité** : Chaque organisation peut définir ses propres coûts de staffing selon sa réalité opérationnelle
- **Précision** : Les devis incluent des coûts de conformité RSE basés sur des données réelles de l'organisation
- **Conformité FR66** : Tous les paramètres de coûts de staffing sont configurables via l'interface (zéro hardcoding)
- **Transparence** : Les opérateurs comprennent exactement comment les coûts de staffing sont calculés

### Related FRs

- **FR66:** All staffing-related cost parameters (hotel cost per night, meal cost per day, driver overnight premium, second driver hourly rate) shall be configurable at the organisation level with no hardcoded business values.

---

## Acceptance Criteria (BDD Format)

### AC1: Schema Extension for Staffing Cost Parameters

**Given** the `OrganizationPricingSettings` model in Prisma schema,  
**When** the migration is applied,  
**Then** the model shall include the following new optional fields:

- `hotelCostPerNight` (Decimal, EUR) - Cost of one hotel night for driver
- `mealCostPerDay` (Decimal, EUR) - Daily meal allowance for driver
- `driverOvernightPremium` (Decimal, EUR) - Premium paid to driver for overnight missions
- `secondDriverHourlyRate` (Decimal, EUR) - Hourly rate for second driver (double crew/relay)
- `relayDriverFixedFee` (Decimal, EUR) - Fixed fee for arranging a relay driver

**And** all fields shall be nullable with sensible defaults in the application layer.

### AC2: Settings UI Section for Staffing Costs

**Given** an admin navigating to Organisation Pricing Settings (`/settings/pricing`),  
**When** they access the page,  
**Then** they shall see a "Staffing Costs" section (collapsible card) with editable fields for:

- Hotel cost per night (EUR) - default display: 100€
- Meal cost per day (EUR) - default display: 30€
- Driver overnight premium (EUR) - default display: 50€
- Second driver hourly rate (EUR) - default display: 25€
- Relay driver fixed fee (EUR) - default display: 150€

**And** each field shall have a placeholder showing the default value.

### AC3: API Endpoint for Staffing Cost Settings

**Given** an authenticated admin user,  
**When** they submit the staffing cost settings form,  
**Then** the API shall validate and persist the values to `OrganizationPricingSettings`,  
**And** return the updated settings with a success message.

### AC4: Compliance Validator Uses Organization Settings

**Given** a quote calculation for a heavy vehicle trip requiring staffing alternatives,  
**When** the compliance validator generates alternative options (DOUBLE_CREW, RELAY_DRIVER, MULTI_DAY),  
**Then** it shall read staffing cost parameters from `OrganizationPricingSettings` for that organization,  
**And** use `DEFAULT_ALTERNATIVE_COST_PARAMETERS` only when organization-specific values are not set.

### AC5: Cost Breakdown Reflects Configured Values

**Given** an organization with custom staffing costs configured (e.g., hotelCostPerNight = 150€),  
**When** a MULTI_DAY alternative is generated for a 2-day mission,  
**Then** the cost breakdown shall show `hotelCost: 150€` (not the default 100€),  
**And** the total additional cost shall reflect the configured values.

### AC6: Backward Compatibility with Existing Data

**Given** existing organizations without staffing cost settings configured,  
**When** the compliance validator calculates staffing alternatives,  
**Then** it shall use the default values from `DEFAULT_ALTERNATIVE_COST_PARAMETERS`:

- `driverHourlyCost`: 25€/hour
- `hotelCostPerNight`: 100€/night
- `mealAllowancePerDay`: 30€/day

**And** no errors shall occur due to null values.

### AC7: Validation Rules for Staffing Costs

**Given** an admin entering staffing cost values,  
**When** they submit values,  
**Then** the system shall validate:

- All values must be >= 0 (no negative costs)
- All values must be <= 10000 (reasonable upper limit)
- Values are stored with 2 decimal precision

**And** display appropriate error messages for invalid inputs.

### AC8: Translations for Staffing Cost Fields

**Given** the application in French or English locale,  
**When** the staffing costs section is displayed,  
**Then** all labels, placeholders, and help texts shall be properly translated.

---

## Test Cases

### Unit Tests (Vitest)

#### TC1: Compliance Validator with Custom Cost Parameters

```typescript
describe("Compliance Validator with Organization Settings", () => {
  it("should use organization-specific hotel cost when configured", async () => {
    const orgSettings = {
      hotelCostPerNight: 150,
      mealCostPerDay: 40,
      driverOvernightPremium: 75,
      secondDriverHourlyRate: 30,
      relayDriverFixedFee: 200,
    };
    // Generate MULTI_DAY alternative with 1 hotel night
    // Assert: hotelCost = 150 (not default 100)
  });

  it("should fall back to defaults when org settings are null", async () => {
    const orgSettings = {
      hotelCostPerNight: null,
      mealCostPerDay: null,
    };
    // Generate MULTI_DAY alternative
    // Assert: uses DEFAULT_ALTERNATIVE_COST_PARAMETERS values
  });

  it("should use secondDriverHourlyRate for DOUBLE_CREW calculations", async () => {
    const orgSettings = { secondDriverHourlyRate: 35 };
    // Generate DOUBLE_CREW alternative with 6 extra hours
    // Assert: extraDriverCost = 6 * 35 = 210
  });

  it("should include relayDriverFixedFee in RELAY_DRIVER calculations", async () => {
    const orgSettings = { relayDriverFixedFee: 200 };
    // Generate RELAY_DRIVER alternative
    // Assert: otherCosts includes 200 fixed fee
  });

  it("should calculate correct total with all custom parameters", async () => {
    const orgSettings = {
      hotelCostPerNight: 120,
      mealCostPerDay: 35,
      secondDriverHourlyRate: 28,
    };
    // Generate MULTI_DAY alternative for 2-day mission
    // Assert: total = 120 (hotel) + 70 (meals 2 days) + 224 (8h * 28)
  });
});
```

#### TC2: Settings API Validation

```typescript
describe("Staffing Cost Settings API", () => {
  it("should accept valid staffing cost values", async () => {
    const input = {
      hotelCostPerNight: 150.0,
      mealCostPerDay: 40.0,
    };
    // Assert: returns success, values persisted
  });

  it("should reject negative values", async () => {
    const input = { hotelCostPerNight: -50 };
    // Assert: validation error
  });

  it("should reject values exceeding maximum", async () => {
    const input = { hotelCostPerNight: 15000 };
    // Assert: validation error
  });

  it("should allow partial updates", async () => {
    const input = { hotelCostPerNight: 120 };
    // Assert: only hotelCostPerNight updated, others unchanged
  });
});
```

### API Tests (Curl)

#### TC3: Update Staffing Cost Settings

```bash
# Test: Update staffing cost settings
curl -X PATCH http://localhost:3000/api/vtc/settings/pricing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hotelCostPerNight": 150,
    "mealCostPerDay": 40,
    "driverOvernightPremium": 75,
    "secondDriverHourlyRate": 30,
    "relayDriverFixedFee": 200
  }'
# Expected: 200 OK with updated settings
```

#### TC4: Get Settings with Staffing Costs

```bash
# Test: Retrieve pricing settings including staffing costs
curl -X GET http://localhost:3000/api/vtc/settings/pricing \
  -H "Authorization: Bearer $TOKEN"
# Expected: Response includes all staffing cost fields
```

### E2E Tests (Playwright)

#### TC5: Staffing Costs UI Section

```typescript
test("should display staffing costs section in pricing settings", async ({
  page,
}) => {
  await page.goto("/settings/pricing");

  // Assert: Staffing costs section is visible
  await expect(page.getByText("Coûts de staffing")).toBeVisible();

  // Assert: All fields are present
  await expect(page.getByLabel("Coût hôtel par nuit")).toBeVisible();
  await expect(page.getByLabel("Coût repas par jour")).toBeVisible();
  await expect(page.getByLabel("Prime de nuit conducteur")).toBeVisible();
  await expect(page.getByLabel("Tarif horaire 2ème conducteur")).toBeVisible();
  await expect(page.getByLabel("Frais fixes conducteur relais")).toBeVisible();
});

test("should save staffing cost settings", async ({ page }) => {
  await page.goto("/settings/pricing");

  // Fill in values
  await page.getByLabel("Coût hôtel par nuit").fill("150");
  await page.getByLabel("Coût repas par jour").fill("40");

  // Save
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Assert: Success message
  await expect(page.getByText("Paramètres enregistrés")).toBeVisible();
});

test("should show validation error for negative values", async ({ page }) => {
  await page.goto("/settings/pricing");

  await page.getByLabel("Coût hôtel par nuit").fill("-50");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Assert: Error message
  await expect(page.getByText("doit être positif")).toBeVisible();
});
```

### Database Verification

#### TC6: Verify Staffing Cost Storage

```sql
-- After updating staffing costs via API
SELECT
  id,
  "organizationId",
  "hotelCostPerNight",
  "mealCostPerDay",
  "driverOvernightPremium",
  "secondDriverHourlyRate",
  "relayDriverFixedFee"
FROM organization_pricing_settings
WHERE "organizationId" = 'org-id';
-- Expected: All configured values stored correctly
```

---

## Technical Notes

### Schema Changes (schema.prisma)

```prisma
model OrganizationPricingSettings {
  // ... existing fields ...

  // Story 17.4: Staffing cost parameters (configurable, no hardcoding)
  hotelCostPerNight       Decimal? @db.Decimal(8, 2) // EUR per night (default: 100)
  mealCostPerDay          Decimal? @db.Decimal(8, 2) // EUR per day (default: 30)
  driverOvernightPremium  Decimal? @db.Decimal(8, 2) // EUR premium (default: 50)
  secondDriverHourlyRate  Decimal? @db.Decimal(8, 2) // EUR per hour (default: 25)
  relayDriverFixedFee     Decimal? @db.Decimal(8, 2) // EUR fixed fee (default: 150)
}
```

### Compliance Validator Updates

```typescript
// In compliance-validator.ts

/**
 * Build AlternativeCostParameters from organization settings
 * Falls back to defaults for any null values
 */
export function buildCostParametersFromSettings(
  settings: OrganizationPricingSettings | null
): AlternativeCostParameters {
  return {
    driverHourlyCost:
      settings?.secondDriverHourlyRate?.toNumber() ??
      DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost,
    hotelCostPerNight:
      settings?.hotelCostPerNight?.toNumber() ??
      DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight,
    mealAllowancePerDay:
      settings?.mealCostPerDay?.toNumber() ??
      DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay,
  };
}
```

### Extended Cost Parameters Interface

```typescript
// Extended interface to include all staffing costs
export interface ExtendedStaffingCostParameters
  extends AlternativeCostParameters {
  driverOvernightPremium: number; // EUR premium for overnight missions
  relayDriverFixedFee: number; // EUR fixed fee for relay driver arrangement
}

export const DEFAULT_EXTENDED_STAFFING_COSTS: ExtendedStaffingCostParameters = {
  ...DEFAULT_ALTERNATIVE_COST_PARAMETERS,
  driverOvernightPremium: 50,
  relayDriverFixedFee: 150,
};
```

### Files to Modify/Create

**Schema & Migration:**

1. `packages/database/prisma/schema.prisma` - Add staffing cost fields
2. `packages/database/prisma/migrations/YYYYMMDDHHMMSS_add_staffing_cost_parameters/` - Migration

**Backend:** 3. `packages/api/src/services/compliance-validator.ts` - Add `buildCostParametersFromSettings()` function 4. `packages/api/src/services/pricing-engine.ts` - Update to load org settings for compliance 5. `packages/api/src/routes/vtc/settings.ts` - Add staffing cost fields to settings endpoint

**Frontend:** 6. `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/page.tsx` - Add staffing costs section 7. `apps/web/components/vtc/settings/staffing-costs-form.tsx` - New form component

**Translations:** 8. `apps/web/messages/fr.json` - French translations for staffing cost labels 9. `apps/web/messages/en.json` - English translations for staffing cost labels

**Tests:** 10. `packages/api/src/services/__tests__/compliance-validator-settings.test.ts` - New test file 11. `apps/web/e2e/settings-staffing-costs.spec.ts` - E2E tests

---

## Dependencies

- **Story 17.3:** Automatic Compliance-Driven Staffing Integration (✅ Done) - Provides the staffing plan selection logic that uses these parameters
- **Story 5.4:** Alternative Staffing Options Generation (✅ Done) - Provides the alternative generation functions

## Blocked By

None

## Blocks

- **Story 17.5:** Quote Estimated End Time (may use staffing plan duration)

---

## Definition of Done

- [x] Schema migration created and applied with new staffing cost fields
- [x] `buildCostParametersFromSettings()` function implemented in compliance-validator.ts
- [ ] Pricing engine loads org settings and passes to compliance validator
- [x] Settings API endpoint updated to handle staffing cost fields
- [ ] UI form component created for staffing costs section
- [x] Translations added for FR and EN
- [x] All unit tests pass (Vitest) - 136/136 tests passing
- [ ] All E2E tests pass (Playwright)
- [x] API tests verified with curl + DB check
- [ ] Code reviewed and merged

---

## Dev Notes

### Architecture Patterns

- Follow existing pattern in `OrganizationPricingSettings` for optional Decimal fields
- Use `Decimal` type from Prisma with `@db.Decimal(8, 2)` for monetary values
- Implement fallback logic using nullish coalescing (`??`) for backward compatibility

### Testing Standards

- Unit tests in `packages/api/src/services/__tests__/`
- E2E tests in `apps/web/e2e/`
- Use existing test utilities and mocks from Story 17.3

### UI Patterns

- Use existing Card/Collapsible pattern from other settings sections
- Follow form validation patterns from existing pricing settings
- Use `react-hook-form` with Zod validation

### References

- [Source: docs/bmad/prd.md#FR66] - Configurable staffing cost parameters requirement
- [Source: docs/bmad/epics.md#Story-17.4] - Story definition
- [Source: packages/api/src/services/compliance-validator.ts] - Current hardcoded defaults at lines 631-635

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Completion Notes List

1. **Schema Migration** - Added 5 new fields to `OrganizationPricingSettings`: `hotelCostPerNight`, `mealCostPerDay`, `driverOvernightPremium`, `secondDriverHourlyRate`, `relayDriverFixedFee`
2. **Compliance Validator** - Added `buildCostParametersFromSettings()` and `buildExtendedCostParametersFromSettings()` functions with full fallback logic
3. **API Endpoint** - Updated `pricing-settings.ts` to handle all new staffing cost fields with validation (min 0, max 10000)
4. **Frontend Types** - Updated `OrganizationPricingSettings` and `PricingSettingsFormData` interfaces
5. **UI Form** - Added "RSE Staffing Costs" section with all 5 cost fields + staffing selection policy dropdown
6. **Translations** - Added FR and EN translations for all new fields, labels, and help texts
7. **Unit Tests** - Created 18 new tests for `buildCostParametersFromSettings` functions, all passing
8. **DB Verification** - Confirmed columns exist and data persists correctly via MCP PostgreSQL

### File List

**Schema & Migration:**

- `packages/database/prisma/schema.prisma` - Added 5 staffing cost fields
- `packages/database/prisma/migrations/20251230220802_add_staffing_cost_parameters/migration.sql` - Migration file

**Backend:**

- `packages/api/src/services/compliance-validator.ts` - Added `buildCostParametersFromSettings()`, `buildExtendedCostParametersFromSettings()`, `ExtendedStaffingCostParameters` interface
- `packages/api/src/routes/vtc/pricing-settings.ts` - Added staffing cost fields to validation schema and serialization

**Frontend:**

- `apps/web/modules/saas/fleet/types.ts` - Added staffing cost fields to `OrganizationPricingSettings` and `PricingSettingsFormData`
- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/page.tsx` - Added RSE Staffing Costs section UI

**Translations:**

- `packages/i18n/translations/fr.json` - Added French translations for staffing costs
- `packages/i18n/translations/en.json` - Added English translations for staffing costs

**Tests:**

- `packages/api/src/services/__tests__/compliance-validator-settings.test.ts` - 18 new unit tests
