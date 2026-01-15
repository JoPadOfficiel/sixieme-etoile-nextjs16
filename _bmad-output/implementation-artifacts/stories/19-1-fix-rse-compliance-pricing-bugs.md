# Story 19.1: Fix RSE Compliance & Pricing Critical Bugs

**Epic:** Epic 19 – Critical Bug Fixes & Pricing Engine Stabilization  
**Status:** done  
**Priority:** Critical  
**Estimated Effort:** 8 Story Points  
**Sprint:** Current  
**Created:** 2026-01-02

---

## Description

**As an** operator,  
**I want** the pricing engine to correctly calculate RSE compliance, automatically add a second driver when needed, use real toll costs from Google Routes API, and fetch real fuel prices from CollectAPI,  
**So that** I can create valid quotes for long-distance trips without false "Trajet impossible" errors.

### Business Value

- **Déblocage des devis longue distance** : Les trajets Paris → Lyon (10h+) ne sont plus bloqués incorrectement
- **Conformité RSE automatique** : Le système ajoute automatiquement un 2e chauffeur au lieu de bloquer
- **Coûts réels** : Péages via Google Routes API, carburant via CollectAPI
- **Capacité passagers correcte** : Prise en compte de la place occupée par le 2e chauffeur
- **Pauses réglementaires** : Calcul correct de la durée totale incluant les pauses obligatoires

### Related FRs

- **FR26:** RSE rules (amplitude, driving time, breaks) must be read from configuration, not hardcoded
- **FR64:** Automatic staffing selection when RSE violations detected
- **FR14:** Toll costs from Google Routes API (not flat rate per km)
- **FR41:** Fuel prices from CollectAPI in real-time

---

## Bugs to Fix

### BUG-1: "Trajet impossible" affiché incorrectement

**Symptôme:** Un trajet Paris → Lyon (526km, 10h32) en minibus affiche "Trajet impossible - Temps de conduite maximum dépassé" alors qu'il devrait automatiquement ajouter un 2e chauffeur.

**Cause racine:** Le système bloque le trajet au lieu d'appliquer automatiquement la solution de staffing (DOUBLE_CREW).

**Correction:** Quand RSE est violé, ne pas bloquer mais sélectionner automatiquement le meilleur plan de staffing et l'inclure dans le prix.

### BUG-2: Confusion Amplitude vs Temps de conduite

**Symptôme:** Le système affiche "vous approchez de la conformité à 12h" pour un trajet de 10h32.

**Cause racine:** Confusion entre:

- **Amplitude** (13h max) = temps total de la journée de travail (pauses comprises)
- **Temps de conduite** (9h max poids lourds, 10h max 2x/semaine) = temps effectif au volant

**Correction:** Calculer séparément amplitude et temps de conduite, appliquer les bonnes limites.

### BUG-3: Double chauffeur non automatique

**Symptôme:** Le système ne propose pas automatiquement le double équipage.

**Cause racine:** `integrateComplianceIntoPricing` ne sélectionne pas automatiquement le plan quand des violations sont détectées.

**Correction:** Quand `isCompliant = false`, sélectionner automatiquement le meilleur plan selon la politique (CHEAPEST par défaut) et l'ajouter au prix.

### BUG-4: Péage calculé avec taux fixe au lieu de Google Routes API

**Symptôme:** Le péage est calculé comme `distanceKm × tauxParKm` au lieu d'utiliser l'API Google Routes.

**Cause racine:** Le toll-service n'est pas appelé correctement ou l'API key n'est pas configurée.

**Correction:** S'assurer que `getTollCost()` est appelé avec les bonnes coordonnées et que le résultat est utilisé.

### BUG-5: Carburant n'utilise pas CollectAPI

**Symptôme:** Le prix du carburant utilise une valeur par défaut au lieu de CollectAPI.

**Cause racine:** `getFuelPrice()` n'est pas appelé avec les coordonnées du trajet ou l'API key n'est pas configurée.

**Correction:** Appeler `getFuelPrice()` avec pickup/dropoff coordinates et organizationId.

### BUG-6: Place passager avec double chauffeur

**Symptôme:** Quand 2 chauffeurs sont requis, la capacité passagers n'est pas réduite.

**Cause racine:** Le système ne tient pas compte de la place occupée par le 2e chauffeur.

**Correction:** Quand `compliancePlan.driversRequired > 1`, réduire la capacité passagers de 1.

### BUG-7: Pauses chauffeur non calculées dans la durée

**Symptôme:** La durée totale n'inclut pas les pauses obligatoires (45min toutes les 4h30).

**Cause racine:** `calculateInjectedBreakMinutes()` est calculé mais pas ajouté à la durée affichée.

**Correction:** Ajouter les pauses injectées à la durée totale dans tripAnalysis.

### BUG-8: pricing-engine.ts non décomposé

**Symptôme:** Le fichier pricing-engine.ts fait 7569 lignes et devait être décomposé.

**Cause racine:** La décomposition a été commencée mais le fichier original n'a pas été nettoyé.

**Correction:** Vérifier que tous les modules sont correctement exportés depuis `packages/api/src/services/pricing/index.ts` et supprimer le code dupliqué.

---

## Acceptance Criteria (BDD Format)

### AC1: Automatic Staffing Selection for RSE Violations

**Given** a quote request for a heavy vehicle trip that violates RSE (e.g., 10h32 driving time > 9h limit),  
**When** the pricing engine calculates the quote,  
**Then** it shall NOT display "Trajet impossible",  
**And** it shall automatically select the best staffing plan (DOUBLE_CREW, RELAY_DRIVER, or MULTI_DAY),  
**And** the additional staffing cost shall be added to the price,  
**And** the UI shall display a staffing badge (e.g., "Double équipage requis +300€").

### AC2: Correct Amplitude vs Driving Time Calculation

**Given** a trip with 10h32 of driving time,  
**When** compliance is validated,  
**Then** the system shall correctly identify:

- Driving time = 10h32 (exceeds 9h limit for single driver)
- Amplitude = driving time + breaks + waiting = calculated separately
  **And** violations shall reference the correct limit (9h driving, not 13h amplitude).

### AC3: Passenger Capacity Reduction with Double Crew

**Given** a minibus with 12 passenger seats and a trip requiring double crew,  
**When** the quote is displayed,  
**Then** the available passenger capacity shall be 11 (12 - 1 for second driver),  
**And** the UI shall indicate "Capacité réduite: 2e chauffeur".

### AC4: Real Toll Costs from Google Routes API

**Given** a trip from Paris to Lyon,  
**When** the pricing engine calculates costs,  
**Then** it shall call Google Routes API with `extraComputations: ["TOLLS"]`,  
**And** the toll cost shall reflect the actual toll amount (not distance × rate),  
**And** the cost breakdown shall show `source: "GOOGLE_API"`.

### AC5: Real Fuel Prices from CollectAPI

**Given** a trip with pickup coordinates in France,  
**When** the pricing engine calculates fuel costs,  
**Then** it shall call CollectAPI to fetch current fuel prices,  
**And** the fuel cost shall use the real price per liter,  
**And** the cost breakdown shall show `source: "REALTIME"` or `source: "CACHE"`.

### AC6: Break Time Included in Total Duration

**Given** a trip with 10h of driving time,  
**When** the total duration is calculated,  
**Then** it shall include mandatory breaks (45min per 4h30 driving block),  
**And** the UI shall display the total duration including breaks,  
**And** tripAnalysis shall include `injectedBreakMinutes`.

### AC7: No "Trajet impossible" for Solvable RSE Violations

**Given** any RSE violation that can be solved by staffing alternatives,  
**When** the quote is calculated,  
**Then** the system shall NEVER display "Trajet impossible",  
**And** it shall automatically apply the solution and show the adjusted price.

---

## Test Cases

### Unit Tests (Vitest)

#### TC1: Automatic Staffing Selection

```typescript
describe("Automatic RSE Staffing Selection", () => {
  it("should NOT block trip when RSE violation can be solved by double crew", async () => {
    const tripAnalysis = createTripAnalysisWithDuration(632); // 10h32 in minutes

    const result = integrateComplianceIntoPricing({
      organizationId: "org-1",
      vehicleCategoryId: "minibus",
      regulatoryCategory: "HEAVY",
      tripAnalysis,
      pickupAt: new Date("2026-01-15T06:00:00"),
    });

    // Should NOT be blocked
    expect(result.tripAnalysis.compliancePlan?.planType).not.toBe("BLOCKED");
    // Should select DOUBLE_CREW
    expect(result.tripAnalysis.compliancePlan?.planType).toBe("DOUBLE_CREW");
    // Should have additional cost
    expect(result.additionalStaffingCost).toBeGreaterThan(0);
  });

  it("should calculate correct driving time vs amplitude", async () => {
    // 10h32 driving + 2x45min breaks = 12h02 amplitude
    const tripAnalysis = createTripAnalysisWithDuration(632);

    const result = validateCompliance({
      tripAnalysis,
      regulatoryCategory: "HEAVY",
    });

    expect(result.adjustedDurations.totalDrivingMinutes).toBe(632);
    expect(result.adjustedDurations.injectedBreakMinutes).toBe(90); // 2 breaks
    expect(result.adjustedDurations.totalAmplitudeMinutes).toBe(722); // 632 + 90
  });
});
```

#### TC2: Toll Cost from Google API

```typescript
describe("Toll Cost Integration", () => {
  it("should use Google Routes API for toll costs", async () => {
    const result = await getTollCost(
      { lat: 48.8566, lng: 2.3522 }, // Paris
      { lat: 45.764, lng: 4.8357 }, // Lyon
      { apiKey: "test-key", fallbackRatePerKm: 0.12 }
    );

    expect(result.source).toBe("GOOGLE_API");
    expect(result.amount).toBeGreaterThan(0);
  });
});
```

#### TC3: Fuel Price from CollectAPI

```typescript
describe("Fuel Price Integration", () => {
  it("should fetch real-time fuel price from CollectAPI", async () => {
    const result = await getFuelPrice({
      pickup: { lat: 48.8566, lng: 2.3522 },
      dropoff: { lat: 45.764, lng: 4.8357 },
      organizationId: "org-1",
    });

    expect(result.source).toBe("REALTIME");
    expect(result.pricePerLitre).toBeGreaterThan(0);
  });
});
```

### API Tests (Curl)

#### TC4: Quote Creation with Long Trip

```bash
# Test: Create quote for Paris → Lyon (should NOT be blocked)
curl -X POST http://localhost:3000/api/vtc/quotes/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=..." \
  -d '{
    "contactId": "...",
    "vehicleCategoryId": "minibus-id",
    "pickupAddress": "Paris, France",
    "dropoffAddress": "Lyon, France",
    "pickupAt": "2026-01-15T06:00:00",
    "tripType": "transfer",
    "passengerCount": 12
  }'
# Expected:
# - NOT "Trajet impossible"
# - compliancePlan.planType = "DOUBLE_CREW"
# - additionalStaffingCost > 0
# - tollCost.source = "GOOGLE_API"
```

### E2E Tests (Playwright MCP)

#### TC5: Quote Creation UI - Long Trip

```
1. Navigate to /app/sixieme-etoile-vtc/quotes/new
2. Select "Transport Express Paris" as contact
3. Select "Minibus" as vehicle category
4. Enter "Paris" as pickup
5. Enter "Lyon" as dropoff
6. Set pickup time to 06:00
7. Set passenger count to 12
8. Click "Calculer"

Expected:
- NO "Trajet impossible" error
- Staffing badge visible: "Double équipage requis"
- Price includes staffing cost
- Passenger capacity shows 11 (not 12)
```

### Database Verification

#### TC6: Verify Quote with Compliance Plan

```sql
SELECT
  id,
  "tripAnalysis"->>'compliancePlan' as compliance_plan,
  "tripAnalysis"->'costBreakdown'->'tolls'->>'source' as toll_source,
  "tripAnalysis"->'costBreakdown'->'fuel'->>'source' as fuel_source
FROM quote
WHERE id = 'quote-id';
-- Expected:
-- compliance_plan contains planType, additionalCost
-- toll_source = "GOOGLE_API"
-- fuel_source = "REALTIME" or "CACHE"
```

---

## Technical Notes

### Files to Modify

**Backend - Compliance Validator:**

1. `packages/api/src/services/compliance-validator.ts`
   - Fix amplitude vs driving time calculation
   - Ensure breaks are correctly injected
   - Return `isBlocked: false` when staffing can solve violation

**Backend - Pricing Engine:** 2. `packages/api/src/services/pricing-engine.ts`

- Ensure `integrateComplianceIntoPricing` automatically selects staffing plan
- Add staffing cost to price (not just internal cost)
- Include `injectedBreakMinutes` in displayed duration

**Backend - Toll Service:** 3. `packages/api/src/services/toll-service.ts`

- Verify Google Routes API is called correctly
- Log API calls for debugging

**Backend - Fuel Price Service:** 4. `packages/api/src/services/fuel-price-service.ts`

- Ensure CollectAPI is called with coordinates
- Log API calls for debugging

**Frontend - Quote Form:** 5. `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/quotes/new/page.tsx`

- Display staffing badge when `compliancePlan.planType !== "NONE"`
- Show reduced passenger capacity when double crew required
- Remove "Trajet impossible" blocking when staffing solution exists

**Frontend - Trip Transparency:** 6. `apps/web/components/vtc/trip-transparency-panel.tsx`

- Show toll source (GOOGLE_API vs ESTIMATE)
- Show fuel source (REALTIME vs CACHE vs DEFAULT)
- Show break time in duration

### Key Code Changes

#### 1. Fix integrateComplianceIntoPricing to NOT block

```typescript
// In pricing-engine.ts
export function integrateComplianceIntoPricing(
  input: ComplianceIntegrationInput
): ComplianceIntegrationResult {
  // ... existing validation ...

  // If violations exist but can be solved, DO NOT BLOCK
  if (!complianceResult.isCompliant && staffingSelection.selectedPlan) {
    // Apply the staffing plan automatically
    return {
      tripAnalysis: {
        ...input.tripAnalysis,
        compliancePlan: {
          planType: staffingSelection.selectedPlan.type,
          isRequired: true,
          additionalCost: staffingSelection.selectedPlan.additionalCost,
          // ... rest of plan details
        },
        // NOT blocked - solution applied
        isBlocked: false,
      },
      additionalStaffingCost: staffingSelection.selectedPlan.additionalCost,
      appliedRule: createStaffingAppliedRule(staffingSelection),
    };
  }

  // Only block if NO solution exists (e.g., trip > 24h)
  // ...
}
```

#### 2. Fix amplitude vs driving time

```typescript
// In compliance-validator.ts
export function validateCompliance(
  input: ComplianceValidationInput
): ComplianceValidationResult {
  const rules = input.rules ?? DEFAULT_HEAVY_VEHICLE_RSE_RULES;

  // Calculate DRIVING TIME (time at the wheel only)
  const drivingMinutes = calculateTotalDrivingMinutes(input.tripAnalysis);

  // Calculate BREAKS (45min per 4h30 block)
  const breakMinutes = calculateInjectedBreakMinutes(drivingMinutes, rules);

  // Calculate AMPLITUDE (driving + breaks + waiting)
  const amplitudeMinutes = drivingMinutes + breakMinutes;

  // Check violations against CORRECT limits
  const violations: ComplianceViolation[] = [];

  // Driving time limit: 9h (540min) for single driver
  if (drivingMinutes > rules.maxDailyDrivingHours * 60) {
    violations.push({
      type: "DRIVING_TIME_EXCEEDED",
      message: `Temps de conduite (${formatHours(
        drivingMinutes
      )}) dépasse la limite de ${rules.maxDailyDrivingHours}h`,
      actual: drivingMinutes / 60,
      limit: rules.maxDailyDrivingHours,
      unit: "hours",
      severity: "BLOCKING",
    });
  }

  // Amplitude limit: 13h (780min) for single driver, 18h with double crew
  if (amplitudeMinutes > rules.maxDailyAmplitudeHours * 60) {
    violations.push({
      type: "AMPLITUDE_EXCEEDED",
      message: `Amplitude (${formatHours(
        amplitudeMinutes
      )}) dépasse la limite de ${rules.maxDailyAmplitudeHours}h`,
      actual: amplitudeMinutes / 60,
      limit: rules.maxDailyAmplitudeHours,
      unit: "hours",
      severity: "BLOCKING",
    });
  }

  return {
    isCompliant: violations.length === 0,
    violations,
    adjustedDurations: {
      totalDrivingMinutes: drivingMinutes,
      totalAmplitudeMinutes: amplitudeMinutes,
      injectedBreakMinutes: breakMinutes,
      // ...
    },
    // ...
  };
}
```

---

## Dependencies

- **Story 17.3:** Automatic Compliance-Driven Staffing Integration (✅ Done - but buggy)
- **Story 17.4:** Configurable Staffing Cost Parameters (✅ Done)
- **Story 15.1:** Google Routes API for Toll Costs (✅ Done - but not used correctly)

## Blocked By

None

## Blocks

- All future quote/pricing features depend on this fix

---

## Definition of Done

- [ ] BUG-1: "Trajet impossible" no longer shown for solvable RSE violations
- [ ] BUG-2: Amplitude and driving time calculated separately with correct limits
- [ ] BUG-3: Double crew automatically selected and cost added to price
- [ ] BUG-4: Toll costs fetched from Google Routes API (not flat rate)
- [ ] BUG-5: Fuel prices fetched from CollectAPI
- [ ] BUG-6: Passenger capacity reduced when double crew required
- [ ] BUG-7: Break time included in total duration display
- [ ] BUG-8: pricing-engine.ts cleaned up (no duplicate code)
- [ ] All unit tests pass (Vitest)
- [ ] All E2E tests pass (Playwright MCP)
- [ ] API tests verified with curl + DB check
- [ ] Paris → Lyon quote works without "Trajet impossible"
- [ ] sprint-status.yaml updated to `status: done`

---

## Dev Notes

### Testing Strategy

1. **Unit tests** for compliance calculation fixes
2. **Integration tests** for toll/fuel API calls
3. **E2E tests via Playwright MCP** for full quote flow
4. **Manual verification** with Paris → Lyon trip in UI

### Debugging Tips

- Add console.log in `getTollCost()` to verify API is called
- Add console.log in `getFuelPrice()` to verify CollectAPI is called
- Check browser network tab for API calls
- Verify API keys are configured in organization settings

### Rollback Plan

If issues arise, the previous behavior can be restored by:

1. Reverting changes to `integrateComplianceIntoPricing`
2. Keeping the blocking behavior for RSE violations

---
