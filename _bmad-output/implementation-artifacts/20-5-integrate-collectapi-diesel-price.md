# Story 20.5: Integrate CollectAPI Diesel Price

## Story Information

- **Epic**: 20 - Critical Bug Fixes, Google Maps Migration & Comprehensive Testing
- **Story ID**: 20-5
- **Title**: Integrate CollectAPI Diesel Price
- **Status**: In Progress
- **Created**: 2026-01-02
- **Priority**: High

## Description

**En tant que** gestionnaire de flotte VTC,  
**Je veux** que le moteur de pricing utilise les prix réels du carburant depuis CollectAPI,  
**Afin que** les calculs de coûts internes et l'indicateur de rentabilité reflètent les conditions réelles du marché.

### Contexte Métier

Actuellement, le moteur de pricing utilise des prix de carburant hardcodés (`DEFAULT_FUEL_PRICES.DIESEL = 1.789€/L`) dans `cost-calculator.ts`. Bien que l'infrastructure CollectAPI soit en place (`collectapi-client.ts`, `fuel-price-service.ts`, `FuelPriceCache`), elle n'est **pas connectée** au calcul des coûts.

Cette story vise à :

1. Connecter le service `fuel-price-service.ts` au `cost-calculator.ts`
2. Utiliser les prix réels (REALTIME) ou en cache (CACHE) avec fallback sur DEFAULT
3. Propager la source du prix carburant dans le `tripAnalysis` pour transparence

### Valeur Ajoutée

- **Précision financière** : Coûts basés sur les prix réels du marché français
- **Rentabilité fiable** : Indicateur vert/orange/rouge plus précis
- **Transparence** : Source du prix visible dans TripTransparencyPanel
- **Conformité PRD** : Respect de FR41 (prix carburant depuis fournisseur externe)

## Acceptance Criteria (AC)

### AC1: Intégration du prix carburant réel dans le calcul des coûts

**Given** une requête de pricing avec des coordonnées pickup/dropoff  
**When** le moteur calcule le coût interne  
**Then** le prix du carburant est récupéré via `getFuelPrice()` du `fuel-price-service.ts`  
**And** la source (REALTIME/CACHE/DEFAULT) est stockée dans `tripAnalysis.fuelPriceSource`

### AC2: Fallback chain fonctionnel

**Given** une requête de pricing  
**When** CollectAPI n'est pas disponible ou pas configuré  
**Then** le système utilise le cache DB (`FuelPriceCache`)  
**And** si le cache est vide/stale, utilise `DEFAULT_FUEL_PRICES` (1.789€/L pour DIESEL)

### AC3: Support multi-types de carburant

**Given** un véhicule avec un type de carburant spécifique (DIESEL, GASOLINE, LPG, ELECTRIC)  
**When** le coût carburant est calculé  
**Then** le prix correspondant au type de carburant du véhicule est utilisé

### AC4: Propagation de la source dans tripAnalysis

**Given** un devis créé avec calcul de coûts  
**When** le tripAnalysis est généré  
**Then** il contient `fuelPriceSource: "REALTIME" | "CACHE" | "DEFAULT"`  
**And** il contient `fuelPricePerLiter: number` (le prix utilisé)

### AC5: Affichage dans TripTransparencyPanel

**Given** un devis affiché dans le cockpit  
**When** l'utilisateur consulte le panneau Trip Transparency  
**Then** le coût carburant affiche la source du prix  
**And** le prix par litre utilisé est visible

### AC6: Configuration API Key

**Given** une organisation avec une clé CollectAPI configurée  
**When** le pricing est calculé  
**Then** la clé de l'organisation est utilisée en priorité  
**And** fallback sur `COLLECTAPI_KEY` env var si non configurée

## Test Cases

### TC1: Prix réel depuis CollectAPI (AC1)

```gherkin
Scenario: Fetch real-time fuel price from CollectAPI
  Given COLLECTAPI_KEY is configured
  And CollectAPI returns diesel price 1.65€/L for Paris coordinates
  When I calculate pricing for a 100km trip
  Then fuel cost = 100km × 8L/100km × 1.65€/L = 13.20€
  And tripAnalysis.fuelPriceSource = "REALTIME"
  And tripAnalysis.fuelPricePerLiter = 1.65
```

### TC2: Fallback sur cache (AC2)

```gherkin
Scenario: Fallback to cached fuel price
  Given COLLECTAPI_KEY is not configured
  And FuelPriceCache contains diesel price 1.70€/L for FR
  When I calculate pricing for a 100km trip
  Then fuel cost = 100km × 8L/100km × 1.70€/L = 13.60€
  And tripAnalysis.fuelPriceSource = "CACHE"
```

### TC3: Fallback sur default (AC2)

```gherkin
Scenario: Fallback to default fuel price
  Given COLLECTAPI_KEY is not configured
  And FuelPriceCache is empty
  When I calculate pricing for a 100km trip
  Then fuel cost = 100km × 8L/100km × 1.789€/L = 14.31€
  And tripAnalysis.fuelPriceSource = "DEFAULT"
```

### TC4: Support GASOLINE (AC3)

```gherkin
Scenario: Calculate fuel cost for gasoline vehicle
  Given a vehicle category with fuelType = "GASOLINE"
  And FuelPriceCache contains gasoline price 1.85€/L
  When I calculate pricing for a 100km trip
  Then fuel cost uses gasoline price 1.85€/L
  And tripAnalysis.costBreakdown.fuel.fuelType = "GASOLINE"
```

### TC5: Affichage UI (AC5)

```gherkin
Scenario: Display fuel price source in Trip Transparency
  Given a quote with tripAnalysis.fuelPriceSource = "REALTIME"
  When I view the quote detail page
  Then Trip Transparency panel shows "Prix carburant: 1.65€/L (temps réel)"
```

### TC6: Organisation API Key priority (AC6)

```gherkin
Scenario: Use organization-specific API key
  Given organization has collectApiKey configured in IntegrationSettings
  And COLLECTAPI_KEY env var is also set
  When pricing is calculated for this organization
  Then the organization-specific key is used (not env var)
```

## Technical Implementation

### Files to Modify

1. **`packages/api/src/services/pricing/cost-calculator.ts`**

   - Add async version `calculateCostBreakdownWithFuelPrice()`
   - Integrate `getFuelPrice()` from fuel-price-service

2. **`packages/api/src/services/pricing/main-calculator.ts`**

   - Update `calculatePriceWithRealTolls()` to also fetch real fuel prices
   - Create new `calculatePriceWithRealCosts()` combining tolls + fuel

3. **`packages/api/src/services/pricing/types.ts`**

   - Add `fuelPriceSource` and `fuelPricePerLiter` to `TripAnalysis`

4. **`apps/web/app/[locale]/(app)/dashboard/quotes/[id]/components/trip-transparency-panel.tsx`**
   - Display fuel price source in UI

### API Changes

None - internal refactoring only.

### Database Changes

None - uses existing `FuelPriceCache` table.

## Dependencies

- **Story 20-3** (done): Integrate Real Toll Costs - provides async pricing pattern
- **Story 9.7** (done): Fuel Price Cache Refresh - provides cache infrastructure
- **Story 1.5** (done): Integration Settings Storage - provides API key resolution

## Constraints

1. **Performance**: Real-time API calls should not block UI - use cache when available
2. **Backward Compatibility**: Existing quotes must continue to work
3. **No Breaking Changes**: `calculateCostBreakdown()` sync version must remain for non-async contexts

## Definition of Done

- [ ] AC1-AC6 all passing
- [ ] TC1-TC6 all passing
- [ ] Unit tests for fuel price integration
- [ ] E2E test via Playwright MCP
- [ ] API test via curl with DB verification
- [ ] TripTransparencyPanel displays fuel source
- [ ] No regression on existing pricing tests
- [ ] sprint-status.yaml updated to `done`

## Notes

- Le service `fuel-price-service.ts` est déjà complet et testé
- Le client `collectapi-client.ts` gère la conversion USD→EUR
- Le cache a une durée de staleness de 48h (configurable)
