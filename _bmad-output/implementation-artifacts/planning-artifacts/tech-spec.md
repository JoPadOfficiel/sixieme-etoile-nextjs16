# VTC ERP Pricing & Operations – Technical Specification

**Author:** BMad System (assisted)
**Date:** {{date}}
**Project Level:** Full feature module (Pricing, CRM, Invoicing, Fleet)
**Change Type:** New domain implementation on existing SaaS core
**Development Context:** Brownfield: existing auth/organization core + new VTC ERP modules

---

## Context

### Available Documents

- `docs/bmad/prd.md` – VTC ERP Product Requirements Document (canonical functional spec)
- `docs/VTC-Analyse-approfondie-Systeme-Pricing-Complexe.md` – deep-dive pricing analysis
- Existing SaaS core schema – `packages/database/prisma/schema.prisma` (auth, organizations, purchases)
- Existing pricing & cost implementation:
  - `packages/api/src/services/pricing-engine.ts`
  - `packages/api/src/services/fuel-price-service.ts`
  - `packages/api/src/services/toll-service.ts`
  - `packages/api/src/services/compliance-validator.ts`

### Project Stack

- **Frontend**

  - Next.js (App Router), TypeScript
  - ShadCN UI component library
  - React Query / SWR (for data fetching, caching) – to be confirmed

- **Backend**

  - Node.js (same runtime as existing app)
  - API layer in `packages/api` (tRPC / HTTP handlers – follow existing patterns)
  - Prisma ORM (`packages/database`)
  - PostgreSQL as primary database

- **External Services**
  - **Google Maps APIs**
    - JavaScript Maps API for interactive map display in the cockpit
    - Routes / Distance Matrix APIs for travel distance & time calculations
    - Toll-aware route computation when available
  - **CollectAPI – Gas Prices API**
    - `GET /gasPrice/fromCoordinates` endpoint
    - Used to retrieve real-time or near-real-time fuel prices for given coordinates

### Existing Codebase Structure

- `apps/web` – Next.js app (UI, pages, ShadCN components)
- `packages/api` – shared backend / API logic
- `packages/database` – Prisma schema and generated client
- `docs/bmad` – PRD and tech-spec documentation

Existing `schema.prisma` contains:

- Generic SaaS core: `User`, `Session`, `Account`, `Verification`, `Passkey`
- Tenant model: `Organization`, `Member`, `Invitation`
- Subscription/purchase core: `Purchase`, `PurchaseType`

The VTC ERP modules (pricing, CRM, invoices, vehicles, drivers, fuel, documents) will be added on top of this in a focused way, **without introducing marketing/campaign/audience/email/workflow models.**

---

## The Change

### Problem Statement

We need to implement a **VTC ERP system for the French market (EUR only)**, focused on:

- Complex pricing engine (fixed grids + dynamic pricing) with internal cost "shadow" calculations
- Fleet management (vehicles, categories, bases) and driver/RSE compliance
- CRM and lifecycle from quote to invoice
- Real-time operational cockpit with map and profitability view
- Pricing refinement requirements:
  - Configurable **zone conflict resolution** strategy (priority / closest / most expensive)
  - Configurable **pickup+dropoff zone multiplier aggregation** strategy
  - Automatic compliance-driven staffing selection (double crew / relay / multi-day) with costs included in pricing
  - Persisted `estimatedEndAt` to support dispatch availability overlap checks
  - Toll and fuel cost computation integrated as first-class internal cost components

Constraints:

- **France only**, **EUR only**
- **No AI agents involved in the pricing system** (deterministic rules only)
- **No multi-currency**, no FX conversion logic
- **No multi-country timezone model**
- **No marketing/automation stack** (campaigns, audiences, email templates, workflows) for this ERP
- Dates and times must be treated as **business times in Europe/Paris**, with **no conversion** between storage and display

### Proposed Solution

Implement a set of VTC-specific bounded contexts on top of the existing SaaS core:

- **Fleet & Operations Context**

  - Vehicle categories, vehicles, bases/garages, availability
  - Driver profiles, licences, RSE limits (amplitude, driving time, breaks)

- **Pricing & Costing Context**

  - Dual pricing method: partner fixed grids vs dynamic pricing
  - Zone model, route types, exceptions (e.g. Versailles)
  - Shadow calculation engine: approach / service / return segments
  - Integration with fuel prices, tolls, and distance/time from external APIs
  - Deterministic compliance-driven staffing selection integrated into pricing

- **Commercial & CRM Context**

  - Contacts (individuals, businesses, agencies)
  - Quotes (with pricing breakdown, applied rules, transparency)
  - Promotions, optional fees, advanced rates, seasonal multipliers

- **Billing & Documents Context**

  - Invoices, statuses, numbering rules
  - Document types (quote PDF, invoice PDF, mission order, etc.)

- **Configuration & Settings Context**
  - Settings models used by all other contexts
  - API keys stored and managed from UI (with env-var fallback)
  - Pricing refinement settings (zone conflict strategy, zone multiplier aggregation, staffing selection policy)

### Scope

**In Scope:**

- VTC-specific data models and APIs for:
  - Vehicles, vehicle categories, bases, drivers, licences
  - Quotes and invoices (including statuses and numbering)
  - Fuel price cache and linkage to CollectAPI
  - Pricing engine (fixed grids + dynamic) and shadow calculation
  - Operational cockpit UI with map and timeline using ShadCN
  - Settings pages to configure:
    - Google Maps API key
    - CollectAPI key
    - Global financial parameters (margins, minimum fare, etc.)
  - Date/time handling strategy: business time in Europe/Paris, no conversion

**Out of Scope:**

- Marketing stack: campaigns, audiences, segmentations, email templates, marketing workflows
- Automation engines unrelated to VTC operations (generic workflow builders, drip campaigns)
- Payment processing (Stripe or similar) and subscription billing UX
- Multi-currency or FX conversion
- Multi-country timezone model

---

## Implementation Details

### Source Tree Changes

High-level structure (to be refined as we implement):

- `packages/database/prisma/schema.prisma`

  - Add VTC ERP models: vehicles, categories, drivers, licences, quotes, invoices, documents, pricing rules, fuel cache, settings
  - Keep existing auth/organization models as-is (no marketing models added)

- `packages/api` (or equivalent backend package)

  - New modules/services per bounded context:
    - `pricing/` – pricing engine & shadow calculation
    - `fleet/` – vehicles, bases, drivers
    - `crm/` – contacts, quotes
    - `billing/` – invoices, documents
    - `settings/` – global/org-level configuration including API keys
    - `integrations/` – Google Maps & CollectAPI clients

- `apps/web/app` (Next.js routes)
  - `/pricing` – tools for quote creation, fare simulation, transparency
  - `/dispatch` – operational cockpit (missions with map and profitability)
  - `/admin/fleet` – vehicles, categories, drivers, licences
  - `/admin/config` – financial/configuration parameters
  - `/admin/integrations` – Google Maps & CollectAPI API keys management

### Technical Approach

#### Bounded Contexts and Domain Modules

- **Fleet & Operations**

  - Encapsulate the notion of vehicle (capacity, consumption, speed, licence requirements, base) and driver (licences, availability, RSE metrics).

- **Pricing & Costing**

  - Encapsulate the pricing logic described in the PRD:
    - Zone engine and route types
    - Dual strategy: fixed grids vs dynamic
    - Shadow calculation on three segments (approach, service, return)
    - Integration of fuel cost and tolls

- **CRM & Quotes**

  - Contacts and organizations (client companies and agencies)
  - Quotes as first-class entities with full pricing context

- **Billing & Documents**

  - Invoices derived from quotes (deep copy semantics)
  - Document generation mapping (quote => PDF, invoice => PDF, etc.)

- **Configuration & Settings**
  - Settings models used by all other contexts
  - API keys stored and managed from UI (with env-var fallback)

#### Date & Time Strategy

- **Goal:** avoid complexity of multi-timezone logic while matching business expectations in Europe/Paris.

- **Prisma / DB types**

  - All timestamp fields will use Prisma `DateTime` **without** explicit `@db.Timestamptz` / timezone annotations.
  - The application will treat such `DateTime` as **naive Europe/Paris business times**.

- **Application behaviour**

  - When the frontend sends a DateTime (e.g. mission start, quote validity), it is taken as the business time in the operator's local timezone.
  - All users of the system are assumed to operate in **Europe/Paris**.
  - The backend does not perform timezone conversions when reading/writing these fields; values are stored and read "as-is".

- **Server/DB configuration**
  - Database and application servers must be configured so that their default timezone is compatible with Europe/Paris or at least does not perform automatic conversions.
  - No explicit conversion logic is implemented at the ORM layer.

This makes the behaviour predictable: **the time seen by the dispatcher in the UI is the same as the time stored in the database.**

#### API Key Configuration

- **Requirement:** Operators must be able to configure API keys for Google Maps and CollectAPI **from the application settings**, without editing env files.

- **Design:**

  - Introduce a settings model (exact Prisma model will be added later), e.g. `OrganizationIntegrationSettings`:
    - `organizationId` (FK to `Organization`)
    - `googleMapsApiKey` (string, encrypted at rest)
    - `collectApiKey` (string, encrypted at rest)
    - Timestamps (`createdAt`, `updatedAt`)
  - For a given organization, the backend resolves keys as follows:
    1. If an org-specific key is present in DB settings, use it.
    2. Otherwise, fall back to environment variable (global default).
  - Admin-only UI under `/admin/integrations` allows:
    - Viewing current integration status
    - Entering or updating the Google Maps API key
    - Entering or updating the CollectAPI key

- **Security considerations:**
  - Keys stored encrypted or at minimum hashed+obfuscated in DB, never logged in plain text.
  - Only super-admin / org-admin roles can read or modify these fields.
  - HTTP responses and logs must redact keys.

#### External Services

- **Google Maps**

  - **Frontend:**
    - Use a small wrapper component around the Maps JavaScript API to display:
      - Pickup/drop markers
      - Route polyline
      - Bases/garages markers
    - Component configured with the Google Maps API key obtained from the backend.
  - **Backend:**

    - Service module for:
      - Route calculation between A and B (with possible waypoints)
      - Travel time & distance estimation
      - Toll-aware route computation when applicable
    - Receives purely geographical inputs (lat/lng pairs).

  - **CollectAPI – Gas Prices**

  - Use the `GET /gasPrice/fromCoordinates` endpoint:
    - Parameters:
      - `lat` – latitude of a reference point
      - `lng` – longitude of a reference point
      - `currency` – always set to `"EUR"` to request prices directly in EUR
      - Optionally `type` to indicate fuel type (gasoline/diesel/lpg)
  - For VTC ERP, we will:

    - Focus on **European/French** context
    - Ensure all internal amounts are stored in **EUR**
    - Always request prices from CollectAPI in **EUR** when calling the API (using the appropriate currency parameter), so the API already returns values in EUR
    - Do **not** implement any internal FX conversion layer inside the ERP; if CollectAPI behaviour changes, only the integration adapter is updated, not the domain logic

  - Introduce a `FuelPriceCache`-like model that keeps:
    - `country`
    - `fuelType`
    - `price` (in EUR)
    - `currency` (redundant, but stored as `"EUR"` for clarity)
    - `lat`, `lng`
    - `fetchedAt`
  - The pricing engine will read from that cache and only refresh via CollectAPI when necessary.

---

## Development Context

### Relevant Existing Code

- Existing auth and organization models in `schema.prisma`
- Existing Next.js app structure in `apps/web`
- Existing configuration and tooling in `config/`, `tooling/`

### Dependencies

**Framework/Libraries:**

- Next.js (App Router)
- React + TypeScript
- Prisma ORM
- ShadCN UI
- HTTP client library for backend calls to Google Maps & CollectAPI (native `fetch` or a small wrapper)

**Internal Modules:**

- `packages/database` – Prisma client
- `packages/api` – to host VTC-specific services and routes

### Configuration Changes

- New application configuration to support:
  - Integration settings persistence (API keys per organization)
  - Default values for financial parameters (margins, minimum fare)

### Existing Conventions (Brownfield)

- Follow existing patterns for auth and organizations
- Follow existing code style and configuration from `tooling/` (TypeScript, Tailwind, etc.)

### Test Framework & Standards

- Use the same testing framework as existing project (e.g. Jest/Testing Library/Playwright) for:
  - Unit tests (pricing engine, shadow calculations)
  - Integration tests (API endpoints)
  - E2E tests (critical user flows)

---

## Implementation Stack

- **Frontend**: Next.js + ShadCN UI, TypeScript
- **Backend**: Node.js, API layer in `packages/api`
- **Database**: PostgreSQL via Prisma
- **External APIs**: Google Maps, CollectAPI (Gas Prices)

---

## Technical Details

This section documents the target data model and runtime behaviour.

The codebase already contains a significant portion of the VTC domain in `schema.prisma` and `packages/api/src/services/pricing-engine.ts`. This Tech Spec focuses on:

- Clarifying the authoritative runtime behaviour (pricing, costs, transparency)
- Defining additions required by the pricing refinement (zone conflict strategies, compliance-driven staffing, driver availability, `estimatedEndAt`)

### 1. Domain Overview

At a high level, the VTC ERP model is organised into the following areas:

- **Core tenancy & CRM** – organisations, contacts/clients
- **Fleet & RSE** – vehicles, categories, bases, drivers, licences, regulatory rules
- **Pricing & Zones** – zones, routes, grids, dynamic pricing rules, advanced modifiers
- **Quotes, Invoices & Documents** – lifecycle from quote to invoice and generated artefacts
- **Fuel & Integrations** – fuel price cache, external API settings
- **Shared enums & value objects** – small types that keep the model expressive and consistent

All date/time fields are `DateTime` values interpreted as **Europe/Paris business times**, with no timezone conversion layer.

### 2. Core Tenancy & CRM

- **Organization** (existing)

  - Purpose: tenant for one VTC company.
  - Key fields (existing + conceptual use):
    - `id`, `name`, `slug`, `logo`, `createdAt`.
  - Relationships:
    - `members` → `Member` (existing auth membership).
    - New models below reference `organizationId` for multi-tenancy.

- **Contact** (new)

  - Purpose: unify private customers, corporate clients, agencies.
  - Key fields:
    - `id`, `organizationId` (FK → `Organization`).
    - `type` (enum `INDIVIDUAL | BUSINESS | AGENCY`).
    - `displayName` (computed from person / company fields).
    - Person fields: `firstName`, `lastName`, `email`, `phone`.
    - Company fields: `companyName`, `vatNumber`, `siret`, `billingAddress`.
    - Commercial flags: `isPartner` (maps to PRD “partner vs private”), `defaultClientType`.
  - Relationships:
    - `quotes` → `Quote[]`.
    - `invoices` → `Invoice[]`.
    - `endCustomers` → `EndCustomer[]` (Mini-CRM).

- **EndCustomer** (new, Mini-CRM)

  - Purpose: Represent the actual beneficiary/passenger when the Contact is an Agency/Partner.
  - Key fields:
    - `id`, `organizationId`.
    - `contactId` (Parent Contact FK).
    - `firstName`, `lastName`, `email`, `phone`, `companyName`.
    - `difficultyScore` (1-10) for "Patience Tax" pricing logic.
    - `notes`.
  - Relationships:
    - `parentContact` → `Contact`.
    - `quotes` → `Quote[]` (linked as beneficiary).

### 3. Fleet & Regulatory Models

- **VehicleCategory** (new)

  - Purpose: group vehicles by commercial and regulatory category (e.g. Sedan, Van, Minicar, Bus).
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `code` (e.g. `SEDAN`, `VAN`, `BUS_49`).
    - `regulatoryCategory` enum: `LIGHT | HEAVY` (maps to PRD LIGHT/HEAVY).
    - Capacity: `maxPassengers`, `maxLuggageVolume`.
    - Pricing: `priceMultiplier` (relative to a reference category), optional defaults `defaultRatePerKm`, `defaultRatePerHour`.
  - Relationships:
    - `vehicles` → `Vehicle[]`.

- **OperatingBase** (new)

  - Purpose: physical bases/garages anchoring vehicles.
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `addressLine1`, `city`, `postalCode`, `countryCode`.
    - `latitude`, `longitude` (for pre-filtering + Google Maps).
  - Relationships:
    - `vehicles` → `Vehicle[]`.

- **Vehicle** (new)

  - Purpose: individual fleet vehicles.
  - Key fields:
    - `id`, `organizationId`.
    - `vehicleCategoryId` (FK → `VehicleCategory`).
    - `operatingBaseId` (FK → `OperatingBase`).
    - Identification: `registrationNumber`, `internalName`, `vin` (optional).
    - Capacity: `passengerCapacity`, `luggageCapacity`.
    - Cost drivers: `consumptionLPer100Km`, `averageSpeedKmh`, `costPerKm`.
    - Regulatory: `requiredLicenseCategoryId` (FK → `LicenseCategory`).
    - Status: `status` enum (e.g. `ACTIVE | MAINTENANCE | OUT_OF_SERVICE`).

- **LicenseCategory** (new)

  - Purpose: model licence categories (e.g. B, D, CMI) with attached RSE constraints.
  - Key fields:
    - `id`, `organizationId` (or global if shared across orgs).
    - `code` (e.g. `B`, `D`, `D_CMI`).
    - `description`.
  - Relationships:
    - `organizationRules` → `OrganizationLicenseRule[]`.
    - `vehiclesRequiringThis` → `Vehicle[]`.

- **OrganizationLicenseRule** (new)

  - Purpose: store legal/RSE limits per licence type (zero-hardcoding, see PRD Appendix C).
  - Key fields:
    - `id`, `organizationId`, `licenseCategoryId`.
    - `maxDailyDrivingHours` (e.g. 10h).
    - `maxDailyAmplitudeHours` (e.g. 14h, 18h with double crew).
    - `breakMinutesPerDrivingBlock` (e.g. 45).
    - `drivingBlockHoursForBreak` (e.g. 4.5h).
    - `cappedAverageSpeedKmh` for heavy vehicles (e.g. 85 km/h).

- **Driver** (new)

  - Purpose: model drivers and their cost profiles.
  - Key fields:
    - `id`, `organizationId`.
    - Person data: `firstName`, `lastName`, `email`, `phone`.
    - HR: `employmentStatus`, `hourlyCost`, `notes`.
  - Relationships:
    - `driverLicences` → `DriverLicense[]` (multi-licence support).

- **DriverLicense** (new, junction)

  - Purpose: link drivers to one or more licence categories.
  - Key fields:
    - `id`, `driverId`, `licenseCategoryId`.
    - `licenseNumber`, `validFrom`, `validTo`.

### 4. Pricing, Zones & Grids

- **PricingZone** (new)

  - Purpose: represent geographic zones (central Paris, inner ring, satellites, etc.).
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `code`.
    - `zoneType` enum: `POLYGON | RADIUS | POINT`.
    - `geometry` (JSON – polygon or circle definition; potential future PostGIS).
    - `centerLatitude`, `centerLongitude` (for fast lookups and distance-to-zone evaluation).
    - `priority` (int, default 0) for conflict resolution (higher wins).
    - Optional `parentZoneId` for hierarchy (e.g. satellite zones).

- **ZoneRoute** (new)

  - Purpose: Method 1 zone-to-zone fixed pricing for transfers.
  - Key fields:
    - `id`, `organizationId`.
    - `fromZoneId`, `toZoneId` (FK → `PricingZone`).
    - `vehicleCategoryId`.
    - `direction` enum: `BIDIRECTIONAL | A_TO_B | B_TO_A`.
    - `fixedPrice` (EUR).
    - `isActive`.
  - Used when client is a partner and a matching route exists (Engagement Rule).

- **ExcursionPackage** (new)

  - Purpose: forfaits for excursions (Normandy, Loire Valley, etc.).
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `description`.
    - `originZoneId` (e.g. Paris) and optional `destinationZoneId` or key POI.
    - `vehicleCategoryId`.
    - Included service: `includedDurationHours`, `includedDistanceKm`.
    - `price` (EUR).

- **DispoPackage** (new)

  - Purpose: forfaits de mise à disposition (hourly dispos with included distance).
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `description`.
    - `vehicleCategoryId`.
    - `includedDurationHours`, `includedDistanceKm`.
    - `overageRatePerKm`, `overageRatePerHour`.

- **OrganizationPricingSettings** (new)

  - Purpose: store base commercial parameters per organisation.
  - Key fields:
    - `id`, `organizationId`.
    - `baseRatePerKm`, `baseRatePerHour`.
    - `defaultMarginPercent`.
    - `minimumFare`.
    - Optional `roundingRule` (e.g. to nearest 5€).
    - Operational cost parameters:
      - `fuelConsumptionL100km`, `fuelPricePerLiter`
      - `tollCostPerKm`, `wearCostPerKm`, `driverHourlyCost`
    - Pricing refinement settings:
      - `zoneConflictStrategy` (enum)
      - `zoneMultiplierAggregationStrategy` (enum)
      - `staffingSelectionPolicy` (enum)
      - Staffing cost parameters (hotel/meals/driver premiums)

- **AdvancedRate** (new)

  - Purpose: advanced modifiers (night, weekend, long-distance thresholds, zone-based multipliers) per FR58.
  - Key fields:
    - `id`, `organizationId`.
    - `appliesTo` enum (e.g. `NIGHT`, `WEEKEND`, `LONG_DISTANCE`, `ZONE_SCENARIO`).
    - Time conditions: `startTime`, `endTime`, `daysOfWeek`.
    - Distance threshold: `minDistanceKm`, `maxDistanceKm` (optional).
    - Zone conditions: `zoneId` or `routeType`.
    - Adjustment: `adjustmentType` enum (`PERCENTAGE | FIXED_AMOUNT`), `value`.

- **SeasonalMultiplier** (new)

  - Purpose: seasonal or event-based multipliers per FR59.
  - Key fields:
    - `id`, `organizationId`.
    - `name` (e.g. "Le Bourget Air Show").
    - `startDate`, `endDate` (DateTime business time, Europe/Paris).
    - `multiplier` (numeric, e.g. 1.3).

- **OptionalFee** (new)

  - Purpose: catalogue of optional fees (baby seat, waiting time, cleaning, etc.) per FR56.
  - Key fields:
    - `id`, `organizationId`.
    - `name`, `description`.
    - `amountType` enum: `FIXED | PERCENTAGE`.
    - `amount` (EUR or %).
    - `isTaxable`, `vatRate`.
    - `autoApplyRules` (JSON – conditions such as airport pickup, baggage > capacity).

- **Promotion** (new)

  - Purpose: promo codes and discounts per FR57.
  - Key fields:
    - `id`, `organizationId`.
    - `code` (unique per org), `description`.
    - `discountType` enum: `FIXED | PERCENTAGE`.
    - `value`.
    - `validFrom`, `validTo`.
    - `maxTotalUses`, `maxUsesPerContact`.

- **EmptyLegOpportunity** (new)

  - Purpose: represent empty-leg segments that can be sold at special conditions per FR53.
  - Key fields:
    - `id`, `organizationId`.
    - `vehicleId`.
    - `fromZoneId`, `toZoneId` or approximate coordinates.
    - `windowStart`, `windowEnd`.
    - `pricingStrategy` (JSON or enum indicating the special rules).

### 5. Quotes, Invoices & Documents

- **Quote** (new)

  - Purpose: central commercial object for pricing and feasibility.
  - Key fields:
    - `id`, `organizationId`, `contactId`.
    - `status` enum: `DRAFT | SENT | VIEWED | ACCEPTED | REJECTED | EXPIRED`.
    - `pricingMode` enum: `FIXED_GRID | DYNAMIC` (maps to Method 1/2).
    - `tripType` enum: `TRANSFER | EXCURSION | DISPO | OFF_GRID`.
    - `pickupAt` (DateTime Europe/Paris business time).
    - `estimatedEndAt` (DateTime Europe/Paris business time) computed from pricing analysis to enable availability checks (Option 1).
    - `pickupAddress`, `dropoffAddress` (+ lat/lng).
    - `passengerCount`, `luggageCount`.
    - `vehicleCategoryId` (chosen category).
    - Monetary fields:
      - `suggestedPrice`, `finalPrice` (EUR).
      - `internalCost` (EUR), `marginPercent`.
    - JSON context:
      - `tripAnalysis` (shadow calc: segments A/B/C, distances, durations, cost breakdown).
      - `appliedRules` (which grids, multipliers, promotions, optional fees were used).
  - Relationships:
    - `contact` → `Contact`.
    - `invoice` → `Invoice?`.
    - `endCustomer` → `EndCustomer?` (optional link to specific beneficiary).

### 6. Bidirectional Pricing (Partner vs Direct)

- **Concept**: For a given Quote, if the Client is a Partner with a Fixed Grid (Method 1), the system calculates _both_:
  1.  **Grid Price**: The contractual price.
  2.  **Direct Price**: The dynamic shadow price (Method 2) as if they were a public client.
- **UI**: A toggle allows the operator to choose which price to apply (`pricingMode` switch).
- **Storage**: The `Quote` stores the final selected mode/price, but `tripAnalysis` may contain details on the alternative calculation for reporting.

---

## Pricing Engine – Zone Resolution & Conflict Strategy

### Goals

- Resolve _a single_ pickup zone and dropoff zone from potentially overlapping `PricingZone`s.
- Make conflict resolution deterministic and **configurable by organization**.
- Provide transparency (debug information) so operators can understand why a zone was selected.

### Data prerequisites

- For `CLOSEST` strategy to work across all zone types (including `POLYGON`), each `PricingZone` must have a reference point:
  - `POINT`/`RADIUS`: use `centerLatitude/centerLongitude`.
  - `POLYGON`: `centerLatitude/centerLongitude` must be populated (UI should require it or compute it at creation time).

### Proposed settings

- `OrganizationPricingSettings.zoneConflictStrategy`:
  - `SPECIFICITY` (current behaviour: `POINT > RADIUS (smallest radius) > POLYGON`)
  - `PRIORITY`
  - `MOST_EXPENSIVE` (highest `priceMultiplier` wins)
  - `CLOSEST` (smallest distance between point and zone reference point wins)
  - `PRIORITY_THEN_MOST_EXPENSIVE`
  - `PRIORITY_THEN_CLOSEST`

### Resolution algorithm (high-level)

- Collect all zones that match the point.
- Apply the organization-selected strategy to choose the winner.
- Return both:
  - `selectedZone`
  - `candidates[]` with scoring fields (for audit/UI transparency)

## Pricing Engine – Pickup/Dropoff Zone Multiplier Aggregation

### Goal

Convert pickup/dropoff zone multipliers into a single multiplier applied to the base price.

### Current behaviour

The dynamic engine applies a zone multiplier after vehicle category multiplier.

### Proposed setting

- `OrganizationPricingSettings.zoneMultiplierAggregationStrategy`:
  - `MAX` (current behaviour)
  - `PICKUP_ONLY`
  - `DROPOFF_ONLY`
  - `AVERAGE`

## Trip Analysis, `estimatedEndAt`, and Dispatch Availability (Option 1)

### Why

Dispatch needs an explicit window `[pickupAt, estimatedEndAt]` to:

- compute driver availability
- detect overlaps against missions and unavailability events

### Storage

- Add `Quote.estimatedEndAt`.
- It is set when:
  - a quote is created / re-priced
  - mission legs are recalculated (vehicle selection impacts durations)

### Computation (deterministic)

- Default: `estimatedEndAt = pickupAt + tripAnalysis.totalDurationMinutes`.
- When compliance-driven staffing is enabled, use the _amplitude-aware_ duration (includes mandatory breaks and rest planning) as the authoritative duration for `estimatedEndAt`.

## Toll (péage) & Fuel (essence/carburant) During Route

### Fuel price resolution

Fuel is integrated as an internal cost component.

- The API uses `packages/api/src/services/fuel-price-service.ts` to resolve **real-time** fuel prices from CollectAPI using route coordinates.
- Fallback chain:
  - real-time CollectAPI (if key is available)
  - DB cache (`FuelPriceCache`)
  - default price from `pricing-engine.ts`.

### Fuel consumption resolution

Fuel consumption uses a deterministic fallback chain:

- Vehicle (if selected) → Category → Organization settings → Defaults.

### Toll cost resolution

Tolls are integrated as an internal cost component.

- Baseline: the pricing engine computes `tolls` using `tollCostPerKm`.
- Enhancement: the API route `POST /api/vtc/pricing/calculate` calls `packages/api/src/services/toll-service.ts` to fetch **real** toll costs from Google Routes API and adjusts the `tripAnalysis.costBreakdown.tolls` accordingly.
- Fallback: if Google Routes is unavailable, mark `tollSource = ESTIMATE` and keep the baseline estimate.

### Transparency

The pricing response must include:

- `tripAnalysis.costBreakdown` (fuel/tolls/wear/driver/parking)
- `tripAnalysis.fuelPriceSource` and `tripAnalysis.tollSource`
- Optional manual overrides are supported via `/quotes/:quoteId/costs`.

## Compliance-Driven Automatic Staffing (RSE) Integrated Into Pricing

### Goal

When a mission would violate RSE constraints, pricing must _automatically_ pick a feasible staffing/scheduling plan and include its incremental costs.

### Core rule

- This is deterministic, rule-based (no AI).
- The engine always returns a single selected plan for pricing (plus a list of rejected alternatives for transparency/audit).

### Runtime integration

- Use `packages/api/src/services/compliance-validator.ts` to:
  - validate feasibility
  - generate alternatives (`DOUBLE_CREW`, `RELAY_DRIVER`, `MULTI_DAY`)
- The pricing engine must:
  - select the best plan via an organization-configured policy
  - add staffing costs to internal cost (and therefore impact margin)
  - persist selected plan in `tripAnalysis` for dispatch.

### Proposed settings

- `OrganizationPricingSettings.staffingSelectionPolicy`:
  - `PREFER_SAME_DAY_IF_POSSIBLE_THEN_MIN_EXTRA_COST`
  - `MIN_EXTRA_COST`

### Cost parameters

All staffing-related amounts must be configurable (no hardcoding), e.g.:

- hotel per night
- meal allowance per day
- second driver hourly rate / premium

## Driver Availability / Calendar (Minimal Integration)

### Goal

Compute _real_ driver availability by combining:

- assigned missions (quotes)
- explicit calendar blocks (vacation/off/other)

### Proposed model (to add)

- `DriverCalendarEvent`:
  - `organizationId`, `driverId`
  - `startAt`, `endAt`
  - `type` (enum)
  - `notes`

### Availability check

- A driver is unavailable if any `DriverCalendarEvent` overlaps `[pickupAt, estimatedEndAt]`.
- A driver is also unavailable if any assigned mission overlaps the same window.

- **Invoice** (new)

  - Purpose: immutable financial document derived from accepted quotes per FR33–FR36.
  - Key fields:
    - `id`, `organizationId`, `quoteId?`, `contactId`.
    - `number` (string, unique per org).
    - `status` enum: `DRAFT | ISSUED | PAID | CANCELLED`.
    - `issueDate`, `dueDate`.
    - Totals: `totalExclVat`, `totalVat`, `totalInclVat`, `currency` (`"EUR"`).
  - Relationships:
    - `lines` → `InvoiceLine[]`.

- **InvoiceLine** (new)

  - Purpose: line items for services, optional fees, discounts.
  - Key fields:
    - `id`, `invoiceId`.
    - `lineType` enum: `SERVICE | OPTIONAL_FEE | PROMOTION_ADJUSTMENT | OTHER`.
    - `description`.
    - `quantity`, `unitPriceExclVat`, `vatRate`.
    - Derived: `totalExclVat`, `totalVat`.

- **DocumentType** (new)

  - Purpose: classify generated documents.
  - Key fields:
    - `id`, `code` (`QUOTE_PDF`, `INVOICE_PDF`, `MISSION_ORDER`, ...).
    - `name`, `description`.

- **Document** (new)

  - Purpose: store generated artefacts (PDFs, etc.).
  - Key fields:
    - `id`, `organizationId`.
    - `documentTypeId`.
    - `quoteId?`, `invoiceId?`.
    - `storagePath` or `url`.
    - `createdAt`.

### 6. Fuel & Integrations

- **FuelPriceCache** (new)

  - Purpose: cache layer for fuel prices from CollectAPI per FR41.
  - Key fields:
    - `id`.
    - `countryCode` (e.g. `"FR"`).
    - `fuelType` enum: `GASOLINE | DIESEL | LPG`.
    - `pricePerLitre` (EUR).
    - `currency` (`"EUR"`).
    - `latitude`, `longitude` (reference point for the quote base/zone).
    - `source` (e.g. `COLLECT_API`).
    - `fetchedAt`.

- **OrganizationIntegrationSettings** (new)

  - Purpose: store per-organisation integration settings and API keys.
  - Key fields:
    - `id`, `organizationId`.
    - `googleMapsApiKey` (encrypted at rest).
    - `collectApiKey` (encrypted at rest).
    - `createdAt`, `updatedAt`.
  - Behaviour:
    - Resolved at runtime with env-vars as fallback.

### 7. Enums & Shared Value Objects

Indicative enums to keep the schema expressive and aligned with the PRD:

- `ClientType` – `PARTNER | PRIVATE`.
- `VehicleRegulatoryCategory` – `LIGHT | HEAVY`.
- `QuoteStatus` – `DRAFT | SENT | VIEWED | ACCEPTED | REJECTED | EXPIRED`.
- `InvoiceStatus` – `DRAFT | ISSUED | PAID | CANCELLED`.
- `PricingMode` – `FIXED_GRID | DYNAMIC`.
- `TripType` – `TRANSFER | EXCURSION | DISPO | OFF_GRID`.
- `AmountType` – `FIXED | PERCENTAGE`.
- `AdjustmentType` – `PERCENTAGE | FIXED_AMOUNT`.

These enums will guide the future Prisma implementation and ensure the codebase mirrors the business language used in the PRD.

---

## Development Setup

- Use existing project setup documented in `README.md`
- Ensure Google Maps and CollectAPI API keys are provisioned either via:
  - Initial environment variables (global defaults)
  - Then override from the `/admin/integrations` UI

---

## Implementation Guide

### Setup Steps

- Ensure PostgreSQL database is available and Prisma migrations are up-to-date
- Provision Google Maps and CollectAPI credentials
- Implement and run Prisma migrations for new VTC models

### Implementation Steps

- Implement new Prisma models and migrations
- Implement backend services for pricing, fleet, CRM, billing, settings, integrations
- Implement frontend pages using ShadCN components for:
  - Pricing/quoting
  - Dispatch cockpit with map
  - Admin fleet
  - Admin config
  - Integrations settings (API keys)

### Testing Strategy

- Unit tests for pricing engine and shadow calculations
- Integration tests for API endpoints (pricing, quotes, invoices)
- E2E tests for core flows (create quote → price calculation → convert to invoice)

### Acceptance Criteria

- All FRs related to pricing, fleet, CRM, and invoicing from the PRD are supported by the implemented models and APIs
- Dates/times behave consistently as business times (no unexpected conversion)
- API keys for Google Maps and CollectAPI are configurable from the UI

---

## Developer Resources

### File Paths Reference

- `apps/web/app/**` – Next.js routes
- `packages/api/**` – backend services & routes
- `packages/database/prisma/schema.prisma` – data model definitions
- `docs/bmad/prd.md` – functional requirements
- `docs/bmad/tech-spec.md` – this technical spec

### Key Code Locations

- Pricing engine and shadow calculation implementation in `packages/api/pricing/**`
- Integrations to Google Maps and CollectAPI in `packages/api/integrations/**`

### Testing Locations

- Frontend tests in `apps/web/*/__tests__` (to be aligned with existing structure)
- Backend tests in `packages/api/*/__tests__`

### Documentation to Update

- `README.md` for setup changes
- Any deployment documentation that references environment variables / configuration

---

## UX/UI Considerations

- Use ShadCN UI for consistent styling and UX (tables, dialogs, forms)
- Pricing cockpit should:
  - Show routes on a Google Map
  - Present cost and margin breakdown clearly (approach vs service vs return)
  - Allow operators to see which rules were applied (zone, grids, promotions, etc.)

---

## Testing Approach

- Incremental, TDD-friendly where possible for pricing logic
- Regression tests for critical pricing scenarios from the PRD (multi-zone, long-distance, heavy vehicles, etc.)

---

## Deployment Strategy

### Deployment Steps

- Apply Prisma migrations
- Deploy API and frontend using existing CI/CD pipeline
- Verify configuration for Google Maps and CollectAPI keys

### Rollback Plan

- Maintain prior DB schema migrations for rollback
- Disable new UI routes if necessary (feature flags)

### Monitoring

- Log and monitor errors for:
  - Pricing failures
  - External API failures (Google Maps, CollectAPI)
- Add health checks for integrations
