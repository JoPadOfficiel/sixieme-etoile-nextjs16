# sixieme-etoile-nextjs16 - Epic Breakdown

**Author:** JoPad  
**Date:** 2025-11-25  
**Project Level:** VTC ERP – Pricing, Fleet, CRM & Invoicing  
**Target Scale:** B2B SaaS cockpit for enterprise VTC operators

---

## Overview

This document decomposes the VTC ERP PRD into **9 functional epics**, aligned with the Tech Spec and UX Design Specification. Each epic delivers recognisable business value and is traceable back to Functional Requirements (FR1–FR60).

### Epic List (High Level)

- **Epic 1 – VTC ERP Foundation & Data Model Setup**  
  Establish the Prisma data model, tenancy, EUR-only financial representation and Europe/Paris time semantics that underpin all VTC ERP features.

- **Epic 2 – CRM & Partner Contracts**  
  Implement contacts, partner vs private segmentation, contract data and links between clients, quotes and invoices.

- **Epic 3 – Zone Engine & Partner Fixed Grids (Method 1)**  
  Implement the geographic zoning model, zone-to-zone grids, excursions and the Engagement Rule for partner contracts.

- **Epic 4 – Dynamic Pricing & Shadow Calculation (Method 2)**  
  Implement dynamic pricing based on distance/duration and operational costs, plus the shadow calculation engine and profitability indicator.

- **Epic 5 – Fleet & RSE Compliance Engine**  
  Implement vehicles, bases, drivers, licence categories and the heavy-vehicle compliance validator with RSE counters.

- **Epic 6 – Quotes & Operator Cockpit**  
  Implement the quote lifecycle and the three‑column cockpit UI that exposes Trip Transparency, pricing and compliance feedback.

- **Epic 7 – Invoicing & Documents**  
  Implement immutable invoices, VAT & commissions and document generation from accepted quotes.

- **Epic 8 – Dispatch & Strategic Optimisation**  
  Implement the dispatch screen, base/vehicle assignment assistant, chaining, empty legs and subcontracting suggestions.

- **Epic 9 – Advanced Pricing Configuration & Reporting**  
  Implement admin configuration for pricing (zones, grids, modifiers, seasonal multipliers, optional fees, promotions, fuel cache) and profitability reporting.

- **Epic 14 – Flexible Route Pricing System**  
  Extend the zone-to-zone pricing model to support multi-zone origins/destinations and specific address-based pricing with interactive map selection.

---

## Functional Requirements Inventory (Summary)

Canonical FR definitions are in `docs/bmad/prd.md`. This section summarises FR groups and ranges for traceability.

- **FR Group 1 – Client Segmentation & CRM:** FR1–FR6.  
  Client types (partner/private), partner contract data, client reclassification, links between clients, quotes and invoices.

- **FR Group 2 – Pricing Modes & Zone Engine:** FR7–FR16.  
  Dual pricing modes, zones, zone routes, forfaits, Engagement Rule, dynamic pricing base, cost components and multipliers.

- **FR Group 3 – Routing, Base Selection & Shadow Calculation:** FR17–FR24.  
  Vehicles/bases model, candidate selection, pre-filter, routing, shadow calculation segments A/B/C, internal cost and profitability.

- **FR Group 4 – Fleet & Regulatory Compliance:** FR25–FR30.  
  LIGHT/HEAVY categories, licence-based RSE rules, heavy-vehicle validator, alternative proposals, multi-licence drivers and audit logs.

- **FR Group 5 – CRM, Quote & Invoice Lifecycle:** FR31–FR36.  
  Quote lifecycle states, draft vs sent behaviour, conversion to invoice, deep-copy rules, VAT breakdown and commissions.

- **FR Group 6 – Configuration & Localisation:** FR37–FR41.  
  Admin configuration for zones, routes, grids, margins; vehicle categories & cost parameters; EUR-only currency; Europe/Paris time; fuel price cache.

- **FR Group 7 – Operator Cockpit & UX:** FR42–FR46.  
  Structured quote builder UI, trip visualisation, cost breakdown, helpers for typical scenarios, blocking alerts and guidance.

- **FR Group 8 – Strategic Optimisation, Yield & Advanced Pricing:** FR47–FR60.  
  Heavy-vehicle compliance validator, alternative staffing options, RSE counters, driver flexibility scoring, multi-base optimisation, chaining, empty legs, subcontracting, Trip Transparency editing, optional fees, promotions, advanced modifiers, seasonal multipliers, vehicle category multipliers.

---

## FR Coverage Map (High Level)

- **FR Group 1 (FR1–FR6) – Client Segmentation & CRM**

  - Primary epic: **Epic 2 – CRM & Partner Contracts**
  - Secondary epics: **Epic 6 – Quotes & Operator Cockpit**, **Epic 7 – Invoicing & Documents**

- **FR Group 2 (FR7–FR16) – Pricing Modes & Zone Engine**

  - Primary epics: **Epic 3 – Zone Engine & Partner Fixed Grids**, **Epic 4 – Dynamic Pricing & Shadow Calculation**
  - Secondary epics: **Epic 6 – Quotes & Operator Cockpit**, **Epic 9 – Advanced Pricing Configuration & Reporting**

- **FR Group 3 (FR17–FR24) – Routing, Base Selection & Shadow Calculation**

  - Primary epic: **Epic 4 – Dynamic Pricing & Shadow Calculation**
  - Secondary epics: **Epic 5 – Fleet & RSE Compliance Engine**, **Epic 8 – Dispatch & Strategic Optimisation**, **Epic 6 – Quotes & Operator Cockpit**

- **FR Group 4 (FR25–FR30) – Fleet & Regulatory Compliance**

  - Primary epic: **Epic 5 – Fleet & RSE Compliance Engine**
  - Secondary epics: **Epic 8 – Dispatch & Strategic Optimisation**, **Epic 6 – Quotes & Operator Cockpit**

- **FR Group 5 (FR31–FR36) – CRM, Quote & Invoice Lifecycle**

  - Primary epics: **Epic 6 – Quotes & Operator Cockpit** (FR31–FR33), **Epic 7 – Invoicing & Documents** (FR34–FR36)
  - Secondary epic: **Epic 2 – CRM & Partner Contracts**

- **FR Group 6 (FR37–FR41) – Configuration & Localisation**

  - Primary epic: **Epic 9 – Advanced Pricing Configuration & Reporting**
  - Secondary epics: **Epic 1 – Foundation & Data Model**, **Epic 3 – Zone Engine & Fixed Grids**, **Epic 5 – Fleet & Compliance**, **Epic 4 – Dynamic Pricing & Shadow Calculation** (fuel cache usage)

- **FR Group 7 (FR42–FR46) – Operator Cockpit & UX**

  - Primary epic: **Epic 6 – Quotes & Operator Cockpit**
  - Secondary epics: **Epic 8 – Dispatch & Strategic Optimisation**, **Epic 4 – Dynamic Pricing & Shadow Calculation** (Trip Transparency data)

- **FR Group 8 (FR47–FR60) – Strategic Optimisation, Yield & Advanced Pricing**
  - Primary epics: **Epic 5 – Fleet & RSE Compliance Engine** (FR47–FR49), **Epic 8 – Dispatch & Strategic Optimisation** (FR50–FR54), **Epic 9 – Advanced Pricing Configuration & Reporting** (FR55–FR60)
  - Secondary epics: **Epic 6 – Quotes & Operator Cockpit**, **Epic 4 – Dynamic Pricing & Shadow Calculation**

---

## Epic 1: VTC ERP Foundation & Data Model Setup

**Goal:** Provide a coherent VTC ERP data model (Prisma), multi-tenant partitioning, EUR-only monetary representation and Europe/Paris business time semantics so that all higher-level features can be implemented safely.

### Story 1.1: Define VTC ERP Prisma Models

As a **backend engineer**,  
I want a coherent set of Prisma models for contacts, fleet, pricing, quotes, invoices, fuel cache and settings,  
So that the VTC ERP can store all required data with clear relationships and multi-tenancy.

**Related FRs:** FR17, FR25–FR30, FR31–FR36, FR37–FR41, FR55–FR60 (data model foundation).

**Acceptance Criteria:**

**Given** the Technical Specification domain model (Tech Spec Sections 3–7),  
**When** I update `packages/database/prisma/schema.prisma` to add the VTC ERP models,  
**Then** the schema shall contain models for, at minimum, `Contact`, `VehicleCategory`, `Vehicle`, `OperatingBase`, `Driver`, `DriverLicense`, `LicenseCategory`, `OrganizationLicenseRule`, `Quote`, `Invoice`, `InvoiceLine`, `PricingZone`, `ZoneRoute`, `ExcursionPackage`, `DispoPackage`, `OrganizationPricingSettings`, `AdvancedRate`, `SeasonalMultiplier`, `OptionalFee`, `Promotion`, `EmptyLegOpportunity`, `FuelPriceCache` and `OrganizationIntegrationSettings`, each scoped by `organizationId` where applicable.

**And** `prisma format`, `prisma generate` and an initial `prisma migrate dev` all succeed without errors and without altering existing core SaaS tables (auth/organisation, purchases).

**Prerequisites:** None (first VTC ERP schema change after existing SaaS core).

**Technical Notes:**

- Follow naming and field structure from `docs/bmad/tech-spec.md` (Technical Details section).
- Ensure all VTC models that belong to a tenant include `organizationId` and appropriate foreign keys.
- This story creates the structural basis required by all other epics; later stories will add constraints, indices and seed data where necessary.

### Story 1.2: Enforce Organization-Level Multi-Tenancy

As an **administrator**,  
I want all VTC ERP records to be partitioned by organisation,  
So that multiple VTC companies can safely share the same SaaS instance.

**Related FRs:** All FRs indirectly (multi-tenancy safety), especially FR31–FR36, FR37–FR41.

**Acceptance Criteria:**

**Given** an authenticated user associated with an `Organization`,  
**When** they create or query VTC entities (contacts, vehicles, bases, drivers, quotes, invoices, pricing config, fuel cache, settings),  
**Then** all writes automatically set `organizationId` to the current organisation and all reads are filtered so that only records for that organisation are returned.

**And** any attempt to access an entity belonging to another organisation is rejected at the API layer (e.g. 404 / forbidden) and never leaked in list endpoints.

**Prerequisites:** Story 1.1 (VTC models exist with `organizationId`).

**Technical Notes:**

- Reuse existing tenancy middleware / patterns from the brownfield core (auth + organisations).
- Apply organisation scoping consistently in `packages/api` for all new VTC routes (pricing, fleet, CRM, billing, settings).
- Multi-tenancy rules must be covered by integration tests on key endpoints.

### Story 1.3: Implement EUR-Only Monetary Representation

As a **finance user**,  
I want all monetary amounts to be stored and displayed in EUR consistently,  
So that pricing and invoicing behave predictably without FX complexity.

**Related FRs:** FR35, FR36, FR39, FR55–FR60.

**Acceptance Criteria:**

**Given** the VTC data model for quotes, invoices, invoice lines and pricing-related entities,  
**When** I inspect monetary fields (prices, internal costs, VAT amounts, commissions, optional fees, promotions),  
**Then** each entity stores a `currency` (where present) set to `"EUR"` and there is no code path that attempts to convert between currencies.

**And** in the UI (Quotes, Invoices, Settings → Pricing), all monetary values are rendered with a consistent EUR format and no option is exposed to change currency.

**Prerequisites:** Story 1.1.

**Technical Notes:**

- Implements FR39 from the PRD (EUR as base currency, no multi-currency).
- API contracts should document that all amounts are in EUR; any future multi-currency work would require a new epic, not silent changes here.

### Story 1.4: Implement Europe/Paris Business Time Strategy

As a **dispatcher**,  
I want times in the UI to match exactly the times stored in the database,  
So that there is no confusion due to timezone conversions.

**Related FRs:** FR40 (time handling), plus all FRs that depend on pickup/mission times (FR17–FR24, FR25–FR30, FR31–FR33, FR47–FR52).

**Acceptance Criteria:**

**Given** date/time fields such as `pickupAt`, `issueDate`, `validUntil` and RSE counters,  
**When** the frontend submits a datetime from the cockpit (Create Quote, Dispatch, Invoices),  
**Then** the backend stores that value as-is in a Prisma `DateTime` field without applying any timezone conversion.

**And** when the same record is fetched and rendered in the UI, the operator sees exactly the same wall-clock time they entered, assuming Europe/Paris as the business context.

**Prerequisites:** Story 1.1 (timestamp fields defined in Prisma), environment aligned with Europe/Paris strategy.

**Technical Notes:**

- Follow the Tech Spec Date & Time Strategy: use `DateTime` without `@db.Timestamptz` annotations and avoid implicit conversions in the ORM layer.
- Document expectations for infrastructure (DB and app servers) so DevOps config matches the intended behaviour.

### Story 1.5: Integration Settings Storage for Google Maps & CollectAPI

As an **organisation admin**,  
I want to store API keys for Google Maps and CollectAPI in a secure settings model,  
So that operators can configure integrations from the UI instead of editing environment variables.

**Related FRs:** FR37–FR41 indirectly (configuration & fuel cache), plus Tech Spec “API Key Configuration”.

**Acceptance Criteria:**

**Given** an organisation with access to `/dashboard/settings/integrations`,  
**When** I enter or update Google Maps and CollectAPI keys in the form and save,  
**Then** an `OrganizationIntegrationSettings` record is created or updated with encrypted `googleMapsApiKey` and `collectApiKey` fields and timestamps.

**And** when the backend resolves integration keys for that organisation, it first checks the settings record and only falls back to environment variables when no org-specific key is present.

**Prerequisites:** Stories 1.1 (settings model), 1.2 (organisation scoping).

**Technical Notes:**

- Keys must be encrypted or at minimum obfuscated at rest and never logged in plain text.
- This story does not implement the full Integrations UI (that belongs to Epic 9) but provides the data layer and resolution logic used by pricing and routing services.

## Epic 2: CRM & Partner Contracts

**Goal:** Provide CRM capabilities to manage contacts, distinguish partner vs private clients, store contract data and connect clients with quotes and invoices.

### Story 2.1: Implement Contact Model & Basic CRM UI

As an **operator**,  
I want to manage contacts with partner vs private classification,  
So that I can quickly see how pricing and lifecycle should behave for each client.

**Related FRs:** FR1–FR3, FR6, FR31–FR36.

**Acceptance Criteria:**

**Given** the `Contact` model from the Tech Spec,  
**When** I open `/dashboard/contacts`,  
**Then** I see a list of contacts with columns at least: Name, Type (Partner/Private), Company, Email, Phone, Last Activity, Quotes Count, Invoices Count, Status (as per UX spec 8.2).

**Given** I click `Add Contact` or edit an existing contact,  
**When** the contact drawer or page opens,  
**Then** I can capture person fields (first/last name, email, phone) and company fields (company name, VAT, billing address) as applicable, and choose a `type`/flag corresponding to partner vs private.

**And** saving a new or edited contact persists the record with `organizationId` and correctly sets its partner/private classification.

**Prerequisites:** Stories 1.1–1.2 (data model + multi-tenancy).

**Technical Notes:**

- Use `Contact` as defined in `tech-spec.md` (Core Tenancy & CRM).
- Implement list + detail UI in line with UX spec section 8.2 (Contacts / CRM).
- Ensure queries are scoped by `organizationId` and paginated for large client lists.

### Story 2.2: Store Partner Contract Data & Rate Grid Links

As a **commercial manager**,  
I want to attach contract details and rate grids to partner contacts,  
So that the pricing engine can apply contractual prices automatically for Method 1.

**Related FRs:** FR2, FR4, FR11, FR36.

**Acceptance Criteria:**

**Given** a `Partner` contact in the CRM,  
**When** I open its detail view,  
**Then** I see a "Commercial settings" section where I can configure billing details, payment terms, assigned grid(s) (zone routes, excursions, dispos) and an optional commission percentage.

**Given** a quote created for this partner contact,  
**When** the pricing engine runs,  
**Then** it reads the attached grid configuration and, if a matching grid route or forfait exists (Epic 3), it attempts Method 1 pricing first, marking the quote as `pricingMode = FIXED_GRID`.

**Prerequisites:** Story 2.1, Epic 3 basic grid structures (PricingZone, ZoneRoute, ExcursionPackage, DispoPackage).

**Technical Notes:**

- Extend the `Contact` model or link to a dedicated `PartnerContract` entity to store payment terms, rate grid references and commission percentage.
- Make sure commission settings are accessible later to Epic 7 (Invoicing) and to profitability calculations.

### Story 2.3: Allow Safe Reclassification Between Partner and Private

As an **operator**,  
I want to reclassify a client between partner and private,  
So that I can correct mistakes without losing historical data.

**Related FRs:** FR5, FR4, FR31–FR33.

**Acceptance Criteria:**

**Given** an existing contact with quotes and invoices linked,  
**When** I change its type from Partner to Private or from Private to Partner and save,  
**Then** all existing quotes and invoices remain linked to that contact and retain their stored commercial values.

**And** future quotes for that contact use the new classification when deciding whether to prioritise grids (Method 1) or dynamic pricing (Method 2).

**Prerequisites:** Stories 2.1–2.2, Epic 6 (quotes) and Epic 7 (invoices) basic models.

**Technical Notes:**

- Reclassification should not trigger retroactive price changes; issued invoices are immutable per FR34.
- UI must warn operators about behavioural impact (e.g. "Future quotes will use dynamic pricing instead of grids").

### Story 2.4: Link Quotes and Invoices to Contacts & Partner Agencies

As a **finance user**,  
I want each quote and invoice to be clearly linked to a contact (and partner agency where relevant),  
So that I can navigate from CRM to financial documents and back.

**Related FRs:** FR6, FR31–FR36.

**Acceptance Criteria:**

**Given** I create a quote from the Quotes cockpit,  
**When** I select a contact,  
**Then** the quote stores `contactId` (and, if appropriate, an agency or company reference) and the Quotes list shows the contact name and type in its columns.

**Given** I convert an accepted quote to an invoice,  
**When** the invoice is created,  
**Then** it copies the `contactId` (and partner agency context) from the quote and the Invoices list shows that client.

**And** from a Contact detail screen, I can see a timeline of related quotes and invoices, with links to open them.

**Prerequisites:** Stories 2.1–2.3, Epic 6 (quotes list/detail), Epic 7 (invoices list/detail).

**Technical Notes:**

- Enforce referential integrity between `Contact`, `Quote` and `Invoice` at the Prisma level.
- Make sure any future anonymisation / GDPR work considers these links.

### Story 2.5: Expose Commercial Context in CRM Views

As a **commercial manager**,  
I want CRM views that show key commercial metrics per client,  
So that I can see which partners are most active and drive revenue.

**Related FRs:** FR1–FR6 (CRM context), FR24 (profitability indicator reused for reporting), FR55–FR56 (cost breakdown feeding later reports).

**Acceptance Criteria:**

**Given** the Contacts list,  
**When** I view a row,  
**Then** I see counters such as Quotes count, Invoices count and possibly average margin band (e.g. profitability light reused from quotes) for that contact.

**Given** a Contact detail view,  
**When** I open it,  
**Then** I see a timeline of recent quotes and missions plus a panel summarising commissions, typical grids used and overall profitability trend.

**Prerequisites:** Stories 2.1–2.4, Epic 6 (profitability indicators on quotes), Epic 7 (invoice totals).

**Technical Notes:**

- Use lightweight aggregation queries to display counts and basic metrics; full analytics/reporting belongs in Epic 9.
- Metrics are advisory and do not need to be 100% real-time; caching is acceptable.

## Epic 3: Zone Engine & Partner Fixed Grids (Method 1)

**Goal:** Implement the geographic zone engine and partner fixed grids so that partner contracts are honoured via Method 1 pricing (Engagement Rule).

### Story 3.1: Implement PricingZone Model & Zones Editor UI

As an **admin**,  
I want to create and edit geographic pricing zones on a map,  
So that I can model central Paris, rings and satellite areas used by pricing and grids.

**Related FRs:** FR7, FR8, FR37; Appendix A (zoning engine).

**Acceptance Criteria:**

**Given** `/dashboard/settings/zones`,  
**When** I open the page,  
**Then** I see a table of existing zones with columns Name, Code, Type (Polygon/Radius/Point), Parent Zone, Routes Count and Actions, plus a map editor panel as described in UX spec 8.12.

**Given** I click `Add Zone`,  
**When** I draw a polygon or radius on the map, set name, code and optional parent zone,  
**Then** a `PricingZone` record is created with geometry data, `organizationId` and metadata.

**And** editing or deleting a zone updates or removes the underlying record, with validation that prevents removal if still referenced by active routes unless explicitly confirmed.

**Prerequisites:** Stories 1.1–1.2 (data model + tenancy), Story 1.5 (Maps integration settings), basic Google Maps integration.

**Technical Notes:**

- Implement `PricingZone` exactly as in Tech Spec (geometry JSON, center lat/lng, optional hierarchy).
- Use Google Maps drawing tools via a React wrapper; persist shapes as GeoJSON-like structures.

### Story 3.2: Implement ZoneRoute Model & Grid Routes Editor

As an **admin**,  
I want to define fixed zone-to-zone routes per vehicle category,  
So that partner transfers can be priced from contractual grids.

**Related FRs:** FR7, FR9, FR11, FR37.

**Acceptance Criteria:**

**Given** `/dashboard/settings/routes` (or Zones & Routes combined),  
**When** I view the routes table,  
**Then** I see columns: From Zone, To Zone, Vehicle Category, Direction (Bidirectional/A→B/B→A), Fixed Price (EUR), Engagement flag, Status.

**Given** I click `Add Route`,  
**When** I select From/To zones, vehicle category, direction, fixed price, and mark whether it is contractual,  
**Then** a `ZoneRoute` record is created and visible in the table.

**And** when pricing a partner quote whose pickup/dropoff zones exactly match a configured route, the pricing engine reads the matching `ZoneRoute` and sets the selling price from its `fixedPrice`.

**Prerequisites:** Stories 3.1, 2.2 (partner has assigned grids), 1.1 (VehicleCategory).

**Technical Notes:**

- Implement `ZoneRoute` as per Tech Spec, including direction enum and `isActive` flag.
- Add indices for (fromZoneId, toZoneId, vehicleCategoryId) lookups.

### Story 3.3: Implement Excursion & Dispo Forfait Configuration

As an **admin**,  
I want to configure excursion and "mise à disposition" forfaits by vehicle category,  
So that partners can buy standardised packages for common programmes.

**Related FRs:** FR7, FR10, FR11, FR37.

**Acceptance Criteria:**

**Given** Settings → Pricing → Excursions & Dispos,  
**When** I create a new excursion package,  
**Then** I can set origin zone, optional destination/POI, vehicle category, included duration, included distance and package price, and the package is persisted in `ExcursionPackage`.

**Given** I create a dispo package,  
**When** I configure included hours, kilometres and overage rates,  
**Then** the configuration is persisted in `DispoPackage` and available to the pricing engine.

**Prerequisites:** Stories 3.1–3.2, Story 2.2 (partner contract can reference grids/forfaits).

**Technical Notes:**

- Mirror attributes described in the Tech Spec (includedDurationHours, includedDistanceKm, overageRatePerKm, etc.).
- UI should resemble other pricing config tables (seasonal multipliers, optional fees) for consistency.

### Story 3.4: Apply Engagement Rule for Partner Grid Trips

As a **commercial manager**,  
I want the Engagement Rule to guarantee contractual prices for partner grid trips,  
So that operators cannot accidentally override binding contracts.

**Related FRs:** FR11, FR24, Appendix A (Engagement Rule).

**Acceptance Criteria:**

**Given** a partner contact with an attached grid and a quote whose itinerary matches a configured `ZoneRoute` or forfait,  
**When** pricing is computed,  
**Then** the selling price is taken from the grid route or forfait and is not modified by profitability checks, even if internal cost is high or negative margin results.

**And** the Trip Transparency panel shows profitability (including red/orange states) but the UI explains that the grid price is contractually enforced (e.g. badge `Contract price`).

**Prerequisites:** Stories 2.2, 3.2–3.3, Epic 4 shadow calculation (internal cost available).

**Technical Notes:**

- Implement pricing mode selection logic that prioritises Method 1 when a grid match exists for a partner (per PRD logic tree).
- Log loss-making partner trips for later analysis (Epic 9 reporting) rather than blocking them.

### Story 3.5: Fallback to Dynamic Pricing When No Grid Match Exists

As an **operator**,  
I want the system to automatically fall back to dynamic pricing when no grid applies,  
So that I can still quote off-grid scenarios without manual calculations.

**Related FRs:** FR7, FR12, FR13–FR16.

**Acceptance Criteria:**

**Given** a quote for a partner or private client where no `ZoneRoute`, excursion or dispo package matches the requested itinerary,  
**When** pricing runs,  
**Then** the engine selects Method 2 (dynamic) and marks the quote `pricingMode = DYNAMIC`, clearly indicated in the cockpit UI.

**And** the operator sees which checks were attempted (grid search, forfait search) in the `appliedRules` context and why the engine fell back to dynamic.

**Prerequisites:** Stories 3.2–3.3, Epic 4 base dynamic pricing.

**Technical Notes:**

- Implement a clear decision flow: client type + grid search → if no match or non-partner, use Method 2.
- This behaviour must be deterministic and test-covered for common scenarios (Intra-Zone, Radial, Circular Suburban, Versailles exception).

### Story 3.6: Visualise Grid Coverage and Gaps

As an **admin**,  
I want to see which zone pairs and scenarios are covered by grids,  
So that I can identify missing coverage and prioritise new contracts.

**Related FRs:** FR7–FR12, FR37; Appendix A scenarios.

**Acceptance Criteria:**

**Given** the Routes/Grid screen,  
**When** I filter by From/To zone, vehicle category or status,  
**Then** I can easily see which combinations have active grids and which are missing.

**And** the UI highlights important scenarios from Appendix A (Intra-Zone Central, Radial Transfers, Circular Suburban, Versailles exception) so I can verify that expected grids exist for partners.

**Prerequisites:** Stories 3.1–3.2.

**Technical Notes:**

- Reuse table and filter components from the UX spec (Seasonal multipliers style) to keep admin screens consistent.
- This story mainly improves operator/admin visibility; the core pricing logic is handled in previous stories.

## Epic 4: Dynamic Pricing & Shadow Calculation (Method 2)

**Goal:** Implement Method 2 dynamic pricing based on distance/duration and operational costs, plus the shadow calculation engine and profitability indicator used across cockpit and dispatch.

### Story 4.1: Implement Base Dynamic Price Calculation

As a **pricing engineer**,  
I want a base dynamic price computed from distance and duration,  
So that dynamic quotes are grounded in physical trip characteristics.

**Related FRs:** FR7, FR12, FR13.

**Acceptance Criteria:**

**Given** an organisation with `OrganizationPricingSettings` (`baseRatePerKm`, `baseRatePerHour`),  
**When** a quote is created without a matching grid/forfait (see Epic 3),  
**Then** the pricing engine computes `basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)` using distance/duration from the routing layer.

**And** the base price and underlying inputs (distance, duration, rates used) are stored in the quote’s `tripAnalysis` / `appliedRules` context for later inspection.

**Prerequisites:** Stories 1.1–1.3 (data model + EUR), Story 3.5 (fallback to dynamic pricing), basic routing integration (distance/duration available).

**Technical Notes:**

- Implement as a pure function in the pricing engine module; keep it deterministic and testable.
- Align with PRD Appendix A Section 3 (Dynamic Calculation Algorithm).

### Story 4.2: Add Operational Cost Components to Internal Cost

As a **finance user**,  
I want internal cost to include fuel, tolls, parking and other configured costs,  
So that profitability reflects real operations, not just base distance/duration.

**Related FRs:** FR14, FR22, FR55.

**Acceptance Criteria:**

**Given** cost parameters configured for an organisation (fuel consumption, toll behaviour, parking rules, cost per km, driver hourly cost),  
**When** a quote is priced dynamically or via a grid,  
**Then** the `internalCost` field includes at least the sum of: fuel, tolls, parking and other configured costs for segments A/B/C, and these components are individually visible in Trip Transparency.

**And** the quote’s `tripAnalysis` JSON stores cost per segment and cost per component, in a structure that can be rendered in the Trip Transparency "Fees & Tolls" tab.

**Prerequisites:** Stories 1.1, 1.3, 4.1, 5.1 (vehicle cost parameters), 9.1/9.2 (cost config).

**Technical Notes:**

- Follow PRD Appendix B "The Cost Formula" (fuel, wages, tolls, wear).
- Internal cost must be computed for both grid and dynamic prices so profit analysis works everywhere.

### Story 4.3: Apply Multipliers and Target Margins

As a **pricing manager**,  
I want configurable multipliers and target margins applied on top of base cost,  
So that the system can propose commercially viable prices in different contexts.

**Related FRs:** FR15, FR58, FR59.

**Acceptance Criteria:**

**Given** configured advanced rates (night/weekend/long-distance rules) and seasonal multipliers,  
**When** a dynamic quote is computed,  
**Then** the pricing engine applies all applicable rules in a defined order (e.g. base price → advanced rate modifiers → seasonal multiplier → margin), and the final suggested selling price is stored in the quote.

**And** the `appliedRules` context lists each rule (ID, type, adjustment, before/after amounts) so operators can understand how the price was constructed.

**Prerequisites:** Story 4.1, Epic 9 configuration stories (AdvancedRate, SeasonalMultiplier).

**Technical Notes:**

- Order of operations and combination logic should be documented and covered by unit tests with scenarios from Appendix A (night, weekend, events like Le Bourget).
- Avoid double-applying multipliers; use idempotent rule evaluation.

### Story 4.4: Allow Operator Override with Live Profitability Feedback

As an **operator**,  
I want to override the suggested price while seeing updated profitability,  
So that I can adjust quotes within commercial and operational constraints.

**Related FRs:** FR16, FR24, FR55.

**Acceptance Criteria:**

**Given** a computed quote with suggested price, internal cost and margin,  
**When** I manually edit the final selling price in the cockpit’s Pricing column,  
**Then** the margin percentage and profitability indicator (green/orange/red) update immediately, and the edited price is persisted as `finalPrice` distinct from `suggestedPrice`.

**And** any constraints on overrides (e.g. minimum margin or role-based limits) are enforced, with clear error messages when an override is not permitted.

**Prerequisites:** Stories 4.1–4.3, Epic 6 (TripTransparencyPanel & Profitability Indicator UI).

**Technical Notes:**

- Keep the calculation of margin in the pricing engine (not in the React component) to avoid discrepancies.
- Overrides should be tracked in `appliedRules` (e.g. flag `manualOverride` with previous value).

### Story 4.5: Implement Multi-Base Candidate Selection & Pre-Filter

As an **operations planner**,  
I want the engine to select candidate bases and vehicles efficiently,  
So that quotes account for deadhead distance without calling routing APIs for hopeless candidates.

**Related FRs:** FR17–FR20, FR51.

**Acceptance Criteria:**

**Given** a fleet with vehicles linked to `OperatingBase` records and a requested itinerary,  
**When** a quote is evaluated,  
**Then** the engine first filters vehicles/bases that are capacity-compatible and not obviously too far using a Haversine pre-filter on base → pickup distance.

**And** only for the remaining candidates does it call the routing API (Google Distance Matrix) to compute precise approach, service and return durations and distances, then selects an optimal base/vehicle pair according to configured criteria (e.g. minimal internal cost or best margin).

**Prerequisites:** Stories 1.1, 5.1 (vehicles/bases), 5.2 (drivers optional), Maps integration.

**Technical Notes:**

- Follow PRD Appendix B Sections 2 and 5 for multi-base and routing strategy.
- Candidate selection logic is shared with Epic 8 (Dispatch); factor reusable services accordingly.

### Story 4.6: Implement Shadow Calculation Segments A/B/C & tripAnalysis Storage

As a **product owner**,  
I want every quote to run a shadow calculation over segments A/B/C,  
So that internal cost and feasibility are always known, even for fixed-price trips.

**Related FRs:** FR21–FR23, FR14, Appendix B.

**Acceptance Criteria:**

**Given** a priced quote (grid or dynamic) and a selected vehicle/base,  
**When** the shadow calculation runs,  
**Then** it computes Segment A (approach), Segment B (service) and Segment C (return) with distances, durations and costs per segment, using the cost formula from Appendix B.

**And** the result is stored in `Quote.tripAnalysis` as structured JSON, including segment breakdown and cost components, and is re-used for Trip Transparency in the UI.

**Prerequisites:** Stories 4.1–4.5, Stories 5.1–5.2 (vehicle/driver data), 9.1/9.2 (cost config).

**Technical Notes:**

- The shadow calculation must run for both Mode A (grid) and Mode B (dynamic) quotes (per PRD).
- Pay attention to heavy-vehicle average speed and injected breaks; heavy-vehicle specifics are completed in Epic 5.

### Story 4.7: Compute & Expose Profitability Indicator

As an **operator**,  
I want a clear profitability indicator for each quote and mission,  
So that I can immediately see whether a trip is acceptable, borderline or loss-making.

**Related FRs:** FR24, FR55; UX spec profitability indicator.

**Acceptance Criteria:**

**Given** a quote with final selling price and internal cost,  
**When** the pricing engine computes margin,  
**Then** it classifies the quote into at least three bands (e.g. Green/Orange/Red) based on configured target margin thresholds and stores both `marginPercent` and a symbolic state.

**And** the Quotes list, Create Quote screen, Quote detail and Dispatch mission list display this indicator consistently using the Profitability Indicator component (colour + icon + label + tooltip with % and thresholds).

**Prerequisites:** Stories 4.1–4.6, Epic 6 (UI components), baseline configuration for `defaultMarginPercent` (Epic 9).

**Technical Notes:**

- Defaults can follow PRD (e.g. ≥20% green, 0–20% orange, ≤0% red) but values should ultimately come from configuration.
- Indicator should be computed centrally (backend or shared domain library) to avoid divergences.

### Story 4.8: Use Fuel Price Cache in Pricing Engine

As a **backend engineer**,  
I want the pricing engine to consume fuel prices from a cache,  
So that quotes do not depend on real-time external API calls.

**Related FRs:** FR14, FR41; Tech Spec fuel cache section.

**Acceptance Criteria:**

**Given** a `FuelPriceCache` table periodically refreshed via CollectAPI,  
**When** the pricing engine needs a fuel price for a quote (given a base/zone and fuel type),  
**Then** it reads the best matching cached entry in EUR and uses it in fuel cost calculations, without calling CollectAPI in real time.

**And** if no recent cache entry is available according to configured staleness rules, the engine either uses a safe fallback value or fails gracefully with a clear error, but never blocks on external API latency inside the quote request.

**Prerequisites:** Story 1.5 (integration settings), Epic 9 story for background fuel cache refresh.

**Technical Notes:**

- Pricing logic should abstract fuel price resolution behind a small interface to keep CollectAPI-specific details out of domain code.
- This story is about consumption of the cache; population and refresh cadence are handled in Epic 9.

## Epic 5: Fleet & RSE Compliance Engine

**Goal:** Model vehicles, bases, drivers and licence categories, and implement the heavy-vehicle compliance engine and RSE counters so that only legally feasible missions are accepted.

### Story 5.1: Implement Fleet Models & Fleet/Bases UI

As a **fleet manager**,  
I want to manage vehicles and operating bases in the system,  
So that pricing and dispatch always know where vehicles are anchored and what they can do.

**Related FRs:** FR17, FR25, FR37–FR38; Appendix B multi-base model.

**Acceptance Criteria:**

**Given** the Vehicles screen `/dashboard/vehicles`,  
**When** I open it,  
**Then** I see a table with at least: Vehicle (make/model), Licence Plate, Category (LIGHT/HEAVY, commercial class), Status, Base, Seats, Luggage capacity, Mileage, Tags (UX spec 8.5).

**Given** I click `Add Vehicle`,  
**When** the drawer opens,  
**Then** I can set vehicle category, base, registration, capacity (passengers/luggage), consumption, average speed, cost per km and required licence category, and saving persists a `Vehicle` linked to a `VehicleCategory` and `OperatingBase`.

**Given** the Bases screen `/dashboard/fleet/bases`,  
**When** I open it,  
**Then** I see a map with base markers and a list of bases (name, address, type, linked vehicles count) as in UX spec 8.7, and I can add/edit bases with geocoded lat/lng.

**Prerequisites:** Stories 1.1–1.2 (models + tenancy), Story 3.1 (zones map integration optional).

**Technical Notes:**

- Implement `VehicleCategory`, `Vehicle` and `OperatingBase` models exactly as in Tech Spec Section 3.
- These entities are used by pricing (Epic 4) and dispatch (Epic 8) for multi-base selection.

### Story 5.2: Implement Drivers, Licence Categories & RSE Rules

As an **HR/compliance manager**,  
I want to manage drivers, their licences and RSE rules per licence category,  
So that heavy-vehicle constraints can be enforced correctly.

**Related FRs:** FR25–FR26, FR29, FR38, FR47–FR49; Appendix C.

**Acceptance Criteria:**

**Given** `/dashboard/drivers`,  
**When** I open the screen,  
**Then** I see a table or cards with Name, Licence Categories, Primary Base, Availability, Daily amplitude used, Driving time used and key compliance indicators (UX spec 8.6).

**Given** I add or edit a driver,  
**When** the drawer opens,  
**Then** I can set personal details, hourly cost and attach one or more `DriverLicense` entries (licence category, number, validity dates).

**Given** `/dashboard/settings/fleet`,  
**When** I edit regulatory rules for a licence type,  
**Then** I can set max daily driving hours, max amplitude, break rules and capped average speed, which are stored in `OrganizationLicenseRule` per FR26.

**Prerequisites:** Stories 1.1–1.2, 5.1, Epic 9 settings UI for fleet/regulatory.

**Technical Notes:**

- Implement `LicenseCategory`, `OrganizationLicenseRule`, `Driver` and `DriverLicense` as per Tech Spec.
- RSE rules will be used by the heavy-vehicle validator and by RSE counters.

### Story 5.3: Implement Heavy-Vehicle Compliance Validator

As a **compliance officer**,  
I want a validator that checks heavy-vehicle missions against legal thresholds,  
So that non-compliant trips are blocked before confirmation.

**Related FRs:** FR25–FR27, FR47; Appendix C (10h driving, 14h amplitude, breaks, capped speed).

**Acceptance Criteria:**

**Given** a quote involving a HEAVY vehicle category,  
**When** the shadow calculation has produced segments A/B/C with durations,  
**Then** the validator checks at least: total driving time per day, total amplitude (start→end), injected breaks and mandatory rest, using the `OrganizationLicenseRule` thresholds for the driver’s licence.

**And** if any rule is violated, the quote or mission is marked non-compliant, a blocking error is raised (for quotes) and explicit error reasons are logged (FR47).

**Prerequisites:** Stories 5.1–5.2, 4.6 (shadow calculation), 1.4 (time strategy).

**Technical Notes:**

- Implement heavy-vehicle-specific speed rules (e.g. 85 km/h cap) and break injection exactly as in Appendix C.
- The validator service will also be reused by Epic 8 (Dispatch) to check assignment changes.

### Story 5.4: Suggest Alternative Staffing & Scheduling Options

As a **dispatcher**,  
I want the system to propose compliant alternatives when a heavy-vehicle mission is illegal as requested,  
So that I can still offer feasible options to clients.

**Related FRs:** FR28, FR48.

**Acceptance Criteria:**

**Given** a heavy-vehicle mission request that fails compliance checks,  
**When** the validator runs,  
**Then** it generates at least one alternative scenario where possible (e.g. double crew, relay driver, converting to multi-day mission with hotel stop), including an approximate additional cost for each option.

**And** these alternatives are surfaced in the cockpit/dispatch UI as suggestions with labels and cost deltas, allowing the operator to pick one and recompute pricing.

**Prerequisites:** Story 5.3, Stories 4.2–4.6 (cost and shadow calculation), 5.2 (licence data).

**Technical Notes:**

- Alternatives can initially be limited to a small set of patterns (extendable later).
- Clearly flag that these are suggestions and may require manual fine-tuning before presenting to the client.

### Story 5.5: Track RSE Counters Per Driver & Licence Regime

As a **scheduler**,  
I want RSE counters (driving time, amplitude, breaks, rest) tracked per driver and licence regime,  
So that I can avoid cumulative violations across the planning horizon.

**Related FRs:** FR29–FR30, FR49; Appendix C 3.1, 3.2.

**Acceptance Criteria:**

**Given** a driver with multiple licences,  
**When** they are assigned to missions throughout a day,  
**Then** the system tracks their driving and amplitude per relevant regulation regime (e.g. LIGHT vs HEAVY), and stores counters in a way that can be read by the validator and by the Drivers UI.

**And** historical decisions (violations prevented, borderline cases) are logged with timestamps and reasons for audit.

**Prerequisites:** Stories 5.1–5.3, initial dispatch/assignment flows (Epic 8).

**Technical Notes:**

- Exact storage format (aggregated table vs derived from missions) can be decided at implementation time, but must support per-day, per-driver queries efficiently.
- Consider background jobs to reconcile counters from mission history for robustness.

### Story 5.6: Surface Compliance Statuses & Logs in UI

As an **operator**,  
I want clear compliance statuses and logs surfaced in Dispatch and Drivers views,  
So that I understand why a mission is blocked or risky.

**Related FRs:** FR30, FR46, FR47–FR49; UX dispatch badges.

**Acceptance Criteria:**

**Given** the Dispatch screen,  
**When** I look at the missions list,  
**Then** each mission shows a compliance badge (OK / Warning / Violation) with Lucide icons as per UX spec, and clicking the mission reveals details of which rules were checked and any warnings.

**Given** the Drivers detail drawer,  
**When** I open it,  
**Then** I see a compliance snapshot (today’s hours, amplitude, rest status) and a list of recent validation decisions with reasons.

**Prerequisites:** Stories 5.3–5.5, Epic 8 basic Dispatch UI, Epic 6 alert patterns.

**Technical Notes:**

- Reuse the Dispatch Badges pattern from the UX spec (Profitability + Compliance + Assignment).
- Ensure logs are accessible but do not overload the main screen; use drawers or expandable sections.

## Epic 6: Quotes & Operator Cockpit

**Goal:** Provide the core cockpit experience to create, visualise and manage quotes with full Trip Transparency, price and compliance feedback.

### Story 6.1: Implement Quotes List with Status & Profitability

As an **operator**,  
I want a quotes list with statuses and profitability indicators,  
So that I can quickly find and prioritise quotes to work on.

**Related FRs:** FR31–FR33, FR24, FR42.

**Acceptance Criteria:**

**Given** `/dashboard/quotes`,  
**When** I open the page,  
**Then** I see a table with columns: Quote ID, Contact, Trip Summary, Date/Time, Vehicle Category, Status, Price (EUR), Margin %, Profitability Indicator (UX spec 8.3.1).

**And** I can filter by date range, status, client type and vehicle category; sorting and search behave as expected.

**Prerequisites:** Epic 2 (contacts), Epic 4 (profitability indicator), Epic 1 (time/currency).

**Technical Notes:**

- Use the shared DataTable & Profitability Indicator components defined in the UX spec.
- Respect multi-tenancy and role-based access in listing queries.

### Story 6.2: Implement Create Quote 3-Column Cockpit

As an **operator**,  
I want a three-column cockpit for quote creation,  
So that I can see client context, trip transparency and pricing options at the same time.

**Related FRs:** FR17–FR24, FR42–FR45, FR55–FR56; Appendices B & D.

**Acceptance Criteria:**

**Given** `/dashboard/quotes/new`,  
**When** I open the page,  
**Then** I see three columns as in UX spec 8.3.2:

- Left: basic info (contact selector with type badge, trip type, pickup/destination via Google Places, datetime, vehicle category).
- Centre: TripTransparencyPanel (distance, duration, internal cost, margin %, tabs for Overview/Route/Fees/Tolls, map).
- Right: pricing & options (suggested price vs final price, optional fees checklist, promotion code selector, notes).

**And** when I fill in mandatory inputs (contact, itinerary, time, vehicle category), the backend runs pricing + shadow calculation and the middle column updates with a skeleton→result pattern.

**Prerequisites:** Stories 4.1–4.7 (pricing & shadow), 5.1 (vehicles/bases), 2.1–2.2 (contact & partner data), Maps integration.

**Technical Notes:**

- Follow the UX layout precisely for consistency with other screens.
- Ensure the screen gracefully handles long-running pricing operations with skeletons and spinners.

### Story 6.3: Implement Quote Detail with Stored tripAnalysis

As an **operator**,  
I want a quote detail screen that shows stored analysis and history,  
So that I can understand exactly how a quote was built and evolved.

**Related FRs:** FR21–FR24, FR31–FR33.

**Acceptance Criteria:**

**Given** `/dashboard/quotes/[id]`,  
**When** I open an existing quote,  
**Then** I see:

- Header with status badge and main actions (Send, Mark as Accepted, Convert to Invoice).
- Left: immutable commercial summary once Sent/Accepted (prices, surcharges, applied promos).
- Centre: TripTransparencyPanel rendering stored `tripAnalysis` (segments A/B/C, costs).
- Right: activity log (when created/sent/viewed/accepted), internal notes.

**Prerequisites:** Stories 4.6 (tripAnalysis), 4.7, 2.4, 6.2.

**Technical Notes:**

- Do not recompute pricing silently on load for Sent/Accepted quotes; use stored values per FR32.
- Activity log should be designed to be extendable (e.g. later email events).

### Story 6.4: Implement Quote Lifecycle & Status Transitions

As an **operator**,  
I want structured quote lifecycle states and transitions,  
So that I can manage quotes consistently from draft to acceptance.

**Related FRs:** FR31–FR33.

**Acceptance Criteria:**

**Given** a new quote,  
**When** I first save it,  
**Then** its status is `DRAFT` and it remains fully editable.

**Given** I send a quote to a client (via email/export),  
**When** the send action succeeds,  
**Then** the status becomes `SENT` and commercial values are frozen (no silent recomputes), and any subsequent client view can set status to `VIEWED`.

**Given** a client accepts or rejects a quote,  
**When** I record that decision,  
**Then** the status moves to `ACCEPTED` or `REJECTED`, and I can convert `ACCEPTED` quotes to invoices.

**Prerequisites:** Stories 6.1–6.3, Epic 7 (invoice creation flow).

**Technical Notes:**

- Implement lifecycle transitions in backend domain code (state machine-like) to ensure consistency across UI and APIs.
- Optionally support `EXPIRED` based on validity dates and background jobs.

### Story 6.5: Implement Blocking & Non-Blocking Alerts for Impossible or Risky Trips

As an **operator**,  
I want clear blocking and non-blocking alerts for impossible or risky trips,  
So that I do not accidentally confirm illegal or extremely unprofitable missions.

**Related FRs:** FR24, FR46, FR25–FR30, FR47–FR48.

**Acceptance Criteria:**

**Given** a quote that fails hard constraints (e.g. heavy-vehicle regulations, impossible schedule),  
**When** pricing/validation runs,  
**Then** a page-level blocking banner appears with explicit reasons and the create/send actions are disabled until the issue is resolved.

**Given** a quote that is legal but low-margin or unusual,  
**When** I view it,  
**Then** non-blocking inline alerts (e.g. orange profitability indicator, warnings in TripTransparencyPanel) inform me but do not block sending.

**Prerequisites:** Stories 4.6–4.7, 5.3–5.4, 5.6.

**Technical Notes:**

- Reuse alert and banner patterns defined in the UX spec.
- Make sure backend signals distinguish `BLOCKING` vs `WARNING` conditions to keep UI logic simple.

### Story 6.6: Implement Helpers for Common Scenarios (Airport & Capacity)

As an **operator**,  
I want helpers for frequent scenarios like airport transfers and baggage-driven vehicle upgrades,  
So that I can build correct quotes faster.

**Related FRs:** FR45, FR58, FR60.

**Acceptance Criteria:**

**Given** I enter an airport pickup/dropoff and a flight number,  
**When** I configure waiting rules,  
**Then** the UI guides me with presets (typical waiting times, optional fees) and automatically adds appropriate optional fees when configured.

**Given** I enter passenger and luggage counts that exceed a sedan’s capacity,  
**When** I tab out of the field,  
**Then** the system proposes an upsell to a larger vehicle category and updates pricing accordingly.

**Prerequisites:** Stories 6.2, 9.3 (optional fees catalogue), 5.1 (vehicle capacities).

**Technical Notes:**

- Implement as small domain-specific helpers rather than hardcoded airport names; rely on zones and optional fee rules where possible.
- Keep helpers transparent: operators should see exactly which fees/rules were applied.

### Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens

As a **dispatcher or operator**,  
I want Trip Transparency and profitability visuals reused consistently,  
So that I can read pricing and cost information the same way everywhere.

**Related FRs:** FR21–FR24, FR42–FR44, FR55.

**Acceptance Criteria:**

**Given** the Quotes list, Create Quote page, Quote detail and Dispatch screen,  
**When** I view them,  
**Then** they all use the same TripTransparencyPanel and Profitability Indicator components for segment breakdown, cost components and margin states, as defined in the UX spec.

**And** any change in pricing or configuration that affects internal cost or price triggers a consistent update in these components.

**Prerequisites:** Stories 4.6–4.7, 6.1–6.3, Epic 8 basic Dispatch UI.

**Technical Notes:**

- Implement these components in a shared UI library within the Next.js app so multiple pages can consume them.
- Keep them data-driven (props from API) with minimal embedded business logic.

### Story 6.8: Manual Editing of Cost Components in Trip Transparency

As a **senior operator or manager**,  
I want to manually edit key internal cost components on a quote (base cost, fuel, tolls),  
So that I can correct or refine the cost model while still getting an accurate margin calculation.

**Related FRs:** FR55, FR14, FR24.

**Acceptance Criteria:**

**Given** a quote with computed internal cost and a populated TripTransparencyPanel,  
**When** I have a role with permission to edit cost components,  
**Then** in the Trip Transparency "Fees & Tolls" / cost tab of the quote cockpit I can see editable fields for at least: base cost, fuel cost and tolls cost.

**Given** I change one or more of these values and confirm the edit,  
**When** the update is saved,  
**Then** the system recomputes the total `internalCost`, the margin percentage and the profitability indicator, and marks the quote as having a manual cost override in its `appliedRules` / `tripAnalysis` context.

**And** users without the appropriate permission can see the detailed cost breakdown but all cost fields are read-only for them.

**Prerequisites:** Stories 4.2 (cost components), 4.7 (profitability indicator), 6.2 (Create Quote cockpit), 6.7 (TripTransparencyPanel integration).

**Technical Notes:**

- Persist edited values and overrides in a structured way inside `tripAnalysis` or a sibling field, so that recalculation is deterministic and auditable. At minimum store: original component values, edited values, user ID, timestamp and reason/comment.
- The primary editable fields are the internal cost components used in Story 4.2: `baseCost`, `fuelCost`, `tollsCost` (and optionally `parkingCost` / `otherCost` when present). The sum of these drives `internalCost`.
- Restrict edit capability to a small set of roles (for example pricing managers and org admins) via the existing RBAC system; other roles always see the same panel in read-only mode. The exact roles can be configured per organisation, but must be enforced server-side.
- Ensure that later automatic recomputations (e.g. configuration changes or re-run of the pricing engine) do not silently overwrite manual cost edits without explicit operator action (e.g. an explicit "Recompute from config" action that warns about losing manual overrides).

## Epic 7: Invoicing & Documents

**Goal:** Implement invoice creation from accepted quotes with deep-copy semantics, VAT breakdown, commissions and generated documents.

### Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI

As a **finance user**,  
I want a clear invoices list and detail view backed by proper models,  
So that I can manage issued invoices reliably.

**Related FRs:** FR31–FR36.

**Acceptance Criteria:**

**Given** `/dashboard/invoices`,  
**When** I open the page,  
**Then** I see a table with at least: Invoice No, Client, Issue Date, Due Date, Total (EUR), VAT breakdown indicator, Status, Source Quote (UX spec 8.4.1).

**Given** I open `/dashboard/invoices/[id]`,  
**When** I view an invoice,  
**Then** I see a two-column layout: billing entity and metadata on the left, line items and VAT breakdown on the right, and totals for excl. VAT, VAT and incl. VAT.

**Prerequisites:** Stories 1.1–1.3, 2.4, 6.4.

**Technical Notes:**

- Implement `Invoice` and `InvoiceLine` as per Tech Spec Section 5.
- Ensure `Invoice` references `organizationId`, `contactId` and optionally `quoteId`.

### Story 7.2: Convert Accepted Quote to Invoice with Deep-Copy Semantics

As an **operator**,  
I want to convert an accepted quote into an invoice with deep-copied commercial values,  
So that later configuration changes do not alter past invoices.

**Related FRs:** FR33–FR34.

**Acceptance Criteria:**

**Given** an `ACCEPTED` quote,  
**When** I trigger "Convert to Invoice" from the quotes list or detail,  
**Then** an `Invoice` is created that copies prices, surcharges, VAT amounts, commissions and any discounts from the quote into immutable invoice fields and lines.

**And** subsequent changes to grids, VAT rates, commissions or pricing rules do not change previously issued invoices when re-loaded.

**Prerequisites:** Story 6.4 (lifecycle), 7.1 (invoice models/UI).

**Technical Notes:**

- Implement deep-copy at creation time only; avoid lazy recomputation from the quote.
- Clearly distinguish invoice fields from quote fields in the schema to enforce immutability.

### Story 7.3: Implement VAT Breakdown for Transport & Ancillary Services

As a **finance user**,  
I want VAT to be broken down per line type (transport vs ancillaries),  
So that invoices meet accounting and regulatory expectations.

**Related FRs:** FR35.

**Acceptance Criteria:**

**Given** an invoice with multiple lines (transport, optional fees, promotions adjustments),  
**When** I view the invoice detail,  
**Then** I see VAT amounts per line based on `vatRate`, and a summary section showing totals per VAT rate and per category.

**And** totals (excl. VAT, VAT, incl. VAT) add up correctly and are stored on the invoice record.

**Prerequisites:** Stories 7.1–7.2, Epic 9 (optional fees/promos config) to ensure correct line classification.

**Technical Notes:**

- VAT logic should be driven by configuration on OptionalFee/Promotion, not hardcoded.
- Take care to preserve rounding behaviour and document it.

### Story 7.4: Integrate Commission Calculation into Invoices

As a **finance user**,  
I want partner commissions to be reflected in invoices and profitability,  
So that B2B contracts are correctly accounted for.

**Related FRs:** FR2, FR36.

**Acceptance Criteria:**

**Given** a partner contact with a configured commission percentage,  
**When** an invoice is created from an accepted quote,  
**Then** commission amounts are computed and stored in invoice data (either as dedicated fields or derived from lines), and can be surfaced in reports and exports.

**Prerequisites:** Story 2.2 (partner commissions), 7.2 (invoice creation).

**Technical Notes:**

- Avoid double-dipping: commission logic should be centralised, ideally reused from pricing/profitability calculations.
- Decide whether commissions appear as explicit lines or only as metadata, based on accounting needs.

### Story 7.5: Implement Document Generation & Storage for Quotes, Invoices & Mission Orders

As an **operator**,  
I want to generate and store PDFs for quotes, invoices and mission orders,  
So that I can send professional documents to clients and keep an auditable archive.

**Related FRs:** FR31–FR36 (documents as part of lifecycle), non-functional PRD docs section.

**Acceptance Criteria:**

**Given** a quote or invoice,  
**When** I click `Generate PDF` or `Download`,  
**Then** a PDF is generated using a consistent template (logo, contact details, pricing details) and stored as a `Document` linked to the quote or invoice.

**And** a documents list `/dashboard/documents` shows generated artefacts with filters by client, date and type, matching UX spec 8.13.

**Prerequisites:** Stories 7.1–7.3, Epic 2 (contact data), Epic 1 (document models).

**Technical Notes:**

- Implement `DocumentType` and `Document` models as per Tech Spec.
- Actual PDF generation stack (e.g. headless browser vs template renderer) can be decided at implementation but must be deterministic and reproducible.

## Epic 8: Dispatch & Strategic Optimisation

**Goal:** Provide a dispatch screen and optimisation features (multi-base selection, chaining, empty legs, subcontracting) to support profitable and compliant assignment decisions.

### Story 8.1: Implement Dispatch Screen Layout (Missions List + Map + Transparency)

As a **dispatcher**,  
I want a dedicated Dispatch screen with mission list, map and transparency panel,  
So that I can take assignment decisions with full context.

**Related FRs:** FR50–FR51, FR42–FR44, FR24; UX spec 8.8.

**Acceptance Criteria:**

**Given** `/dashboard/dispatch`,  
**When** I open the page,  
**Then** I see:

- Left: missions list with filters by status, time window, vehicle category, partner/private.
- Right-top: Google Map showing the selected mission’s route and relevant bases.
- Right-bottom: TripTransparencyPanel + VehicleAssignmentPanel showing current assignment, profitability and compliance.

**Prerequisites:** Stories 4.6–4.7, 5.1–5.2, 6.7, Maps integration.

**Technical Notes:**

- Follow the three-zone layout from the UX spec, optimised for wide screens.
- Missions are typically derived from accepted quotes and/or external scheduling data.

### Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score

As a **dispatcher**,  
I want an assignment drawer that shows candidate vehicles/drivers with suitability scores,  
So that I can quickly pick the best option.

**Related FRs:** FR50–FR51, FR17–FR20, FR25–FR30.

**Acceptance Criteria:**

**Given** I click `Assign` or `Change assignment` on a mission,  
**When** the drawer opens,  
**Then** I see a list of candidate vehicle/driver pairs with a flexibility/fitness score (based on number of licences, schedule slack, distance from base, RSE counters), compliance indicator and estimated internal cost.

**And** selecting a candidate updates the mission assignment, reruns shadow calculation if needed and updates profitability and compliance badges.

**Prerequisites:** Stories 5.1–5.5, 4.5–4.7, 8.1.

**Technical Notes:**

- Flexibility score computation can be simple initially (weighted sum) but must use real data (licences, availability).
- Assignment actions should be undoable where feasible (e.g. simple reversion).

### Story 8.3: Implement Multi-Base Optimisation & Visualisation

As an **operations lead**,  
I want the dispatch engine to simulate the approach–service–return loop from multiple bases,  
So that I can pick assignments that minimise deadhead cost and preserve profit.

**Related FRs:** FR17–FR20, FR51.

**Acceptance Criteria:**

**Given** a mission with multiple feasible bases/vehicles,  
**When** I open its assignment drawer,  
**Then** the engine has evaluated candidate bases using the same pre-filter + routing logic as pricing (Story 4.5) and shows for each option total internal cost and resulting margin.

**And** the map can highlight alternative bases/routes to visually compare options.

**Prerequisites:** Stories 4.5, 5.1, 8.1–8.2.

**Technical Notes:**

- Share multi-base evaluation logic with pricing engine to avoid divergence.
- Consider caching route evaluations to avoid repeated external API calls.

### Story 8.4: Detect & Suggest Trip Chaining Opportunities

As a **dispatcher**,  
I want the system to detect opportunities to chain trips,  
So that I can reduce or eliminate deadhead segments.

**Related FRs:** FR52.

**Acceptance Criteria:**

**Given** a set of confirmed missions in a time window,  
**When** the planning engine runs,  
**Then** it detects where the drop-off of one mission is close in time and space to the pickup of another, and proposes chain suggestions in the Dispatch UI (e.g. "Chain with Mission #1234"), with estimated savings.

**Prerequisites:** Stories 4.5–4.6, 5.1–5.5, 8.1.

**Technical Notes:**

- Initial implementation can focus on simple heuristics (distance/time thresholds) and reuse existing routing data.
- Chaining decisions should update shadow calculations and profitability when applied.

### Story 8.5: Model & Surface Empty-Leg Opportunities

As a **yield manager**,  
I want empty-leg segments tracked and surfaced as sellable opportunities,  
So that we can monetise return trips.

**Related FRs:** FR53.

**Acceptance Criteria:**

**Given** missions that create known empty-leg legs (e.g. one-way charters),  
**When** they are confirmed,  
**Then** corresponding `EmptyLegOpportunity` records are created with corridor information and time windows.

**And** the Dispatch/Planning UI can filter and show these empty legs, and pricing can apply special empty-leg pricing strategies when new requests match these corridors.

**Prerequisites:** Stories 1.1 (EmptyLegOpportunity model), 4.5–4.7, 8.1.

**Technical Notes:**

- Keep the first version simple (manual marking or rule-based detection); more advanced logic can come later.
- Ensure empty-leg pricing rules sit in the same domain as other advanced pricing rules.

### Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions

As an **operations manager**,  
I want to register subcontractor partners and get suggestions when internal trips are structurally unprofitable,  
So that I can decide to subcontract with full margin visibility.

**Related FRs:** FR54.

**Acceptance Criteria:**

**Given** a directory of subcontractor partners with operating zones and indicative price levels,  
**When** a mission is structurally unprofitable for the internal fleet,  
**Then** the planning engine proposes subcontracting options with estimated subcontractor price and resulting margin, and the Dispatch UI surfaces these options clearly.

**Prerequisites:** Stories 2.1–2.2 (contacts extended for partners), 4.2–4.7, 8.1–8.3.

**Technical Notes:**

- A minimal first version can reuse `Contact` with extra fields (subcontractor flag, zone preferences).
- Subcontracting decisions should be logged for later analysis.

### Story 8.7: Surface Profitability & Compliance Badges for Missions

As a **dispatcher**,  
I want profitability and compliance badges visible on each mission,  
So that I can spot problematic assignments at a glance.

**Related FRs:** FR24, FR47–FR49, FR50; UX dispatch badges.

**Acceptance Criteria:**

**Given** the missions list in Dispatch,  
**When** I view it,  
**Then** each row shows a profitability badge (green/orange/red), a compliance badge (OK/Warning/Violation) and an assignment badge (Unassigned/Assigned) using Lucide icons and colour coding as in the UX spec.

**And** clicking a mission reveals more detail on both profitability (TripTransparencyPanel) and compliance (decisions from Epic 5).

**Prerequisites:** Stories 4.7, 5.3–5.6, 8.1.

**Technical Notes:**

- Reuse the same visual patterns as the quotes list for profitability to keep mental models aligned.
- Make sure badge states are updated in near real time after assignment, pricing or configuration changes.

## Epic 9: Advanced Pricing Configuration & Reporting

**Goal:** Provide configuration screens for pricing rules (zones, routes, grids, advanced rates, seasonal multipliers, optional fees, promotions, fuel cache) and basic profitability reporting.

### Story 9.1: Implement Settings → Pricing – Seasonal Multipliers

As a **pricing manager**,  
I want to configure seasonal multipliers for specific periods and events,  
So that prices automatically adjust for peaks like Le Bourget or high season.

**Related FRs:** FR15, FR59.

**Acceptance Criteria:**

**Given** `/dashboard/settings/pricing` with a Seasonal Multipliers tab,  
**When** I open it,  
**Then** I see summary cards (Active, Upcoming, Total) and a table listing multipliers (Name, Date range, Multiplier, Priority, Status) as in UX spec 8.9.

**Given** I click `Add Multiplier`,  
**When** I fill in name, description, date range and multiplier (via a slider or input),  
**Then** a `SeasonalMultiplier` is saved and applied by the pricing engine (Story 4.3) when the trip date falls in that range.

**Prerequisites:** Stories 1.1–1.2, 4.3.

**Technical Notes:**

- Respect Europe/Paris time semantics for date ranges.
- Handle overlapping multipliers deterministically (e.g. by priority).

### Story 9.2: Implement Settings → Pricing – Advanced Rate Modifiers

As a **pricing manager**,  
I want to configure advanced rate modifiers (night, weekend, long-distance, zone-specific),  
So that complex business rules can be expressed without code.

**Related FRs:** FR15, FR58.

**Acceptance Criteria:**

**Given** an Advanced Rates section under Settings → Pricing,  
**When** I create or edit a rule,  
**Then** I can define conditions (time of day, days of week, distance thresholds, zones) and adjustments (fixed or percentage) as stored in `AdvancedRate`.

**And** when pricing runs, Story 4.3 applies these rules and `appliedRules` shows which modifiers fired.

**Prerequisites:** Stories 1.1, 4.3, 9.1.

**Technical Notes:**

- Provide a compact but expressive condition editor; internal representation can be more flexible (JSON) than UI.
- Start with a limited set of conditions and extend later if needed.

### Story 9.3: Implement Settings → Pricing – Optional Fees Catalogue

As an **operator**,  
I want a catalogue of optional fees configurable from the UI,  
So that I can add typical extras (baby seat, airport waiting, cleaning) consistently.

**Related FRs:** FR56, FR35 (tax flags).

**Acceptance Criteria:**

**Given** an Optional Fees section under Settings → Pricing,  
**When** I add or edit a fee,  
**Then** I can set name, description, amount type (fixed/percentage), amount, taxability, VAT rate and auto-apply rules, which are stored in `OptionalFee`.

**And** Create Quote and Invoice UIs can list these fees as checkboxes or automatic additions when conditions match.

**Prerequisites:** Stories 1.1, 4.2, 6.2, 7.1.

**Technical Notes:**

- Auto-apply rules can initially support simple triggers (airport pickup, baggage over capacity).
- Ensure fees map cleanly to invoice lines for VAT compliance.

### Story 9.4: Implement Settings → Pricing – Promotions & Promo Codes

As a **marketing/commerce owner**,  
I want to configure promo codes and discounts,  
So that promotions are applied consistently and remain traceable.

**Related FRs:** FR57.

**Acceptance Criteria:**

**Given** a Promotions tab under Settings → Pricing,  
**When** I add a promotion,  
**Then** I can set code, description, discount type (fixed/percentage), value, validity dates and usage limits, stored in `Promotion`.

**And** when operators apply a promo code on a quote/invoice, the discount is applied transparently with original price and discount amount traceable in Trip Transparency and invoices.

**Prerequisites:** Stories 1.1, 4.3, 6.2, 7.1.

**Technical Notes:**

- Enforce uniqueness of promo codes per organisation.
- Track usage counts to support maxTotalUses/maxUsesPerContact.

### Story 9.5: Implement Settings → Fleet & Regulatory Configuration

As a **fleet/compliance manager**,  
I want a central screen for vehicle categories, base cost parameters and RSE rules,  
So that pricing and compliance share a single source of truth.

**Related FRs:** FR38, FR60, FR25–FR30.

**Acceptance Criteria:**

**Given** `/dashboard/settings/fleet`,  
**When** I open it,  
**Then** I see sections for Vehicle Categories (name, description, base multiplier), Cost Parameters (default per-km/per-hour) and Regulatory Rules per licence type, as per UX spec 8.10.

**And** changes saved here update underlying `VehicleCategory`, `OrganizationPricingSettings` and `OrganizationLicenseRule` records, and are reflected in subsequent pricing and compliance checks.

**Prerequisites:** Stories 1.1, 5.1–5.2, 4.1–4.3.

**Technical Notes:**

- Implement validation to catch obviously inconsistent configurations (e.g. zero thresholds) and surface a configuration health summary at the top of the page.

### Story 9.6: Implement Settings → Integrations (Google Maps & CollectAPI)

As an **organisation admin**,  
I want a UI to manage Google Maps and CollectAPI keys and test their connectivity,  
So that operators can keep integrations healthy without touching environment variables.

**Related FRs:** FR41 (fuel cache source), configuration context.

**Acceptance Criteria:**

**Given** `/dashboard/settings/integrations`,  
**When** I open it,  
**Then** I see cards for Google Maps and CollectAPI with fields for API keys, optional fuel type preference, a `Test connection` button and status indicators (Connected/Invalid/Unknown).

**And** saving changes updates `OrganizationIntegrationSettings` (Story 1.5) and the test connection uses these values to verify connectivity.

**Prerequisites:** Story 1.5, Maps/CollectAPI integration clients.

**Technical Notes:**

- Keys must be redacted in logs and never exposed in client-side code beyond what is necessary for Maps JS initialisation.

### Story 9.7: Implement Fuel Price Cache Refresh & Staleness Rules

As a **backend engineer**,  
I want a background job to refresh fuel prices into a cache with clear staleness rules,  
So that pricing always uses up-to-date but non-real-time data.

**Related FRs:** FR41, FR14.

**Acceptance Criteria:**

**Given** scheduled background jobs (e.g. daily at 04:00 Europe/Paris),  
**When** the job runs,  
**Then** it calls CollectAPI with EUR currency for relevant coordinates/zones, updates `FuelPriceCache` entries and records `fetchedAt`.

**And** when pricing queries the cache (Story 4.8), it respects staleness rules (e.g. max age) and falls back gracefully if data is too old.

**Prerequisites:** Stories 1.5, 4.8, CollectAPI client implemented.

**Technical Notes:**

- Use idempotent jobs where possible to avoid duplicate entries.
- Log failures and provide observability for integration health.

### Story 9.8: Implement Basic Profitability & Yield Reporting

As a **business owner**,  
I want simple profitability and yield reports using Trip Transparency data,  
So that I can see which clients, grids and vehicle categories perform best.

**Related FRs:** FR24, FR55–FR56, FR37 (config-driven engine).

**Acceptance Criteria:**

**Given** a Reporting or Documents area,  
**When** I open a profitability report,  
**Then** I can see a table or chart of missions/quotes with margin, grouped by client, grid, vehicle category or period, using the same Profitability Indicator patterns for quick scanning.

**And** filters allow me to isolate loss-making trips, heavily discounted promos or specific partners.

**Prerequisites:** Stories 4.6–4.7, 2.5, 7.1, 6.1.

**Technical Notes:**

- Start with simple aggregate queries using `tripAnalysis`, margins and invoice totals; more advanced analytics can be a later epic.
- Export to CSV/Excel can be a stretch goal but is not required for initial completion of FRs.

---

## Epic 14 – Flexible Route Pricing System

**Status:** In Progress  
**Created:** 2025-12-01  
**Related FRs:** FR8, FR9, FR37

### Epic Overview

#### Problem Statement

Le système actuel de tarification par routes (`/settings/pricing/routes`) présente plusieurs limitations critiques :

1. **Rigidité Zone → Zone** : Chaque route ne peut avoir qu'une seule zone d'origine et une seule zone de destination
2. **Impossibilité de regrouper** : Pas de moyen de définir un prix unique pour "toutes les zones Paris" → CDG
3. **Pas d'adresses spécifiques** : Impossible de définir un prix pour un hôtel ou lieu précis
4. **Bug Vehicle Category** : Le dropdown de sélection des catégories de véhicules ne fonctionne pas

#### Business Value

- **Flexibilité tarifaire** : Permet de créer des grilles de prix plus adaptées aux besoins métier
- **Gain de temps** : Évite de créer N routes pour N zones avec le même prix
- **Précision** : Permet des tarifs spécifiques pour des lieux stratégiques (hôtels partenaires, etc.)
- **Expérience utilisateur** : Interface plus intuitive avec carte interactive

### Stories

#### Story 14.1 – Fix Vehicle Category Dropdown Bug

**Status:** Done

**As a** pricing administrator,  
**I want** the vehicle category dropdown to work correctly,  
**So that** I can create and edit routes with the proper vehicle category.

**Related FRs:** FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am on the pricing routes page,  
**When** I open the route creation/edit drawer,  
**Then** the vehicle category dropdown displays all available categories.

**And** I can select any category and save the route successfully.

**Technical Notes:**

- Root cause: Frontend called `/api/vtc/vehicles/categories` but API is mounted at `/api/vtc/vehicle-categories`
- Fix applied to 4 files: routes page, settings/pricing/routes, dispos, excursions

---

#### Story 14.2 – Extend ZoneRoute Schema for Multi-Zone & Address Support

**Status:** Done

**As a** system architect,  
**I want** the ZoneRoute schema to support multiple zones and specific addresses,  
**So that** the pricing engine can handle flexible route definitions.

**Related FRs:** FR8 (Geographic zones), FR9 (Route matrix).

**Acceptance Criteria:**

**Given** the new Prisma schema,  
**When** I create a route with multiple origin zones,  
**Then** the zones are stored in `ZoneRouteOriginZone` junction table.

**And** when I create a route with a specific address origin,  
**Then** `originType = ADDRESS` and address fields are populated.

**And** existing routes are migrated to the new schema with backward compatibility.

**Technical Notes:**

- Added `OriginDestinationType` enum (ZONES, ADDRESS)
- Created `ZoneRouteOriginZone` and `ZoneRouteDestinationZone` junction tables
- Made `fromZoneId`/`toZoneId` nullable for backward compatibility
- Data migration script migrated 40 existing routes

---

#### Story 14.3 – Update Pricing UI for Flexible Routes

**Status:** Pending

**As a** pricing administrator,  
**I want** the route creation UI to support multi-zone and address selection,  
**So that** I can configure flexible pricing routes.

**Related FRs:** FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am creating a new route,  
**When** I select "Zones" as origin type,  
**Then** I can select multiple zones from a multi-select dropdown.

**And** when I select "Address" as origin type,  
**Then** I can search and select a specific address via Google Places autocomplete.

**Prerequisites:** Story 14.2.

---

#### Story 14.4 – Interactive Map for Zone Selection

**Status:** In Progress

**As a** pricing administrator,  
**I want** to select zones visually on an interactive map,  
**So that** I can easily identify and configure route pricing without memorizing zone names.

**Related FRs:** FR8 (Geographic zones).

**Acceptance Criteria:**

**AC1 - Visual Zone Selection:**  
**Given** I am configuring a route origin or destination,  
**When** I click on "Select zones on map" button,  
**Then** a map dialog opens showing all existing zones with their boundaries.

**AC2 - Multi-Zone Selection:**  
**Given** the zone map dialog is open,  
**When** I click on zone polygons/areas on the map,  
**Then** I can select/deselect multiple zones visually (toggle selection).

**AC3 - Zone Highlighting:**  
**Given** zones are displayed on the map,  
**When** I hover over a zone,  
**Then** the zone name is displayed and the zone is highlighted.

**AC4 - Selection Confirmation:**  
**Given** I have selected one or more zones on the map,  
**When** I click "Confirm",  
**Then** the selected zones are applied to the origin/destination field.

**AC5 - Quick Zone Creation (Optional):**  
**Given** I need a specific zone that doesn't exist,  
**When** I click "Create zone" in the map dialog,  
**Then** I can draw a new zone polygon and save it directly.

**Prerequisites:** Story 14.3, Story 11.1 (Zone management with interactive map).

---

#### Story 14.5 – Update Pricing Engine for Multi-Zone Routes

**Status:** Pending

**As a** system,  
**I want** the pricing engine to match trips against multi-zone routes,  
**So that** flexible pricing configurations are applied correctly.

**Related FRs:** FR9 (Route matrix), FR24 (Profitability calculation).

**Acceptance Criteria:**

**Given** a trip from Zone A to Zone B,  
**When** there exists a route with origin zones [A, C, D] and destination zone [B],  
**Then** the route matches and the fixed price is applied.

**And** when the origin is a specific address within a zone,  
**Then** the address-based route takes priority over zone-based routes.

**Prerequisites:** Stories 14.2, 14.3.

---

#### Story 14.6 – Assign Rate Grids to Partners from Pricing UI

**Status:** In Progress

**As a** pricing administrator,  
**I want** to assign zone routes, excursion packages, and dispo packages to partners directly from the pricing configuration pages,  
**So that** I can efficiently manage which partners have access to which rate grids without navigating to each contact individually.

**Related FRs:** FR2 (Partner contracts), FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am on `/settings/pricing/routes`,  
**When** I click the "Assign Partners" button on a route row,  
**Then** a dialog opens showing all available partners with checkboxes and optional override price inputs.

**And** when I save the assignments, they are persisted and visible both in the pricing UI and in the partner's contact page.

**And** the same functionality applies to excursion packages and dispo packages.

**Prerequisites:** Stories 12.1, 12.3, 14.2.

**Technical Notes:**

- New API endpoints for partner assignments by route/package ID
- Bidirectional consistency with existing PartnerContractForm
- Partner count badge on each pricing list item

---

## Epic 15: Pricing Engine Accuracy & Real Cost Integration

**Goal:** Fix all pricing inconsistencies by integrating real toll costs from Google Routes API, using vehicle-specific fuel consumption, applying vehicle category multipliers, and ensuring pricing varies correctly by trip type and vehicle selection.

### Story 15.1 – Integrate Google Routes API for Real Toll Costs

**Status:** Pending

**As a** pricing engine,  
**I want** to fetch real toll costs from Google Routes API instead of using a flat rate per km,  
**So that** quotes reflect actual highway toll costs for each specific route.

**Related FRs:** FR14 (Operational cost components), FR22 (Shadow calculation costs).

**Acceptance Criteria:**

**Given** a trip from Paris to Lyon (465km via A6),  
**When** the pricing engine calculates toll costs,  
**Then** it calls Google Routes API with `computeAlternativeRoutes: false` and `routingPreference: TRAFFIC_AWARE`,  
**And** extracts the `tollInfo.estimatedPrice` from the response,  
**And** stores the real toll amount (≈35€) instead of the flat rate (55.80€).

**Given** a trip within Paris (no highways),  
**When** the pricing engine calculates toll costs,  
**Then** the toll cost is 0€ as returned by Google Routes API.

**Given** Google Routes API is unavailable or returns an error,  
**When** the pricing engine calculates toll costs,  
**Then** it falls back to the configured `tollCostPerKm` rate with a warning flag in `tripAnalysis`.

**Prerequisites:** Story 1.5 (Integration settings for Google Maps API key).

**Technical Notes:**

- Use Google Routes API v2 (`routes.googleapis.com/v2:computeRoutes`)
- Request `routes.travelAdvisory.tollInfo` in the field mask
- Cache toll results for identical origin-destination pairs (24h TTL)
- Add `tollSource: "GOOGLE_API" | "ESTIMATE"` to TripAnalysis

---

### Story 15.2 – Use Vehicle-Specific Fuel Consumption in All Pricing Paths

**Status:** Pending

**As a** pricing engine,  
**I want** to always use the vehicle's specific fuel consumption rate when a vehicle category is selected,  
**So that** fuel costs are accurate for each vehicle type (Berline 5.5L vs Autocar 18L).

**Related FRs:** FR14 (Fuel cost), FR22 (Cost breakdown per segment).

**Acceptance Criteria:**

**Given** a quote for vehicle category "Autocar" with average consumption 18L/100km,  
**When** the pricing engine calculates fuel cost for a 100km trip,  
**Then** it uses 18L × 1.789€/L = 32.20€ (not 8.5L × 1.789€ = 15.21€).

**Given** a quote with `enableVehicleSelection: false`,  
**When** the pricing engine calculates fuel cost,  
**Then** it looks up the average consumption for the selected `vehicleCategoryId` from VehicleCategory or Vehicle table.

**Given** a VehicleCategory without any vehicles,  
**When** the pricing engine calculates fuel cost,  
**Then** it falls back to `OrganizationPricingSettings.fuelConsumptionL100km`.

**Prerequisites:** Story 4.2 (Operational cost components).

**Technical Notes:**

- Add `averageConsumptionL100km` field to VehicleCategory model
- Modify `calculateCostBreakdown()` to accept optional `vehicleCategoryId`
- Load vehicle category data in `pricing-calculate.ts` and pass to engine

---

### Story 15.3 – Apply Vehicle Category Price Multipliers in Dynamic Pricing

**Status:** Pending

**As a** pricing engine,  
**I want** to apply the `VehicleCategory.priceMultiplier` to dynamic pricing calculations,  
**So that** premium vehicles (Luxe 2.0×, Autocar 2.5×) are priced appropriately higher than standard vehicles.

**Related FRs:** FR60 (Vehicle category multipliers), FR15 (Configurable multipliers).

**Acceptance Criteria:**

**Given** a dynamic pricing calculation for category "Luxe" with `priceMultiplier: 2.0`,  
**When** the base price is calculated as 100€,  
**Then** the final price before other multipliers is 200€,  
**And** an `appliedRule` of type `VEHICLE_CATEGORY_MULTIPLIER` is added to the result.

**Given** a dynamic pricing calculation for category "Berline" with `priceMultiplier: 1.0`,  
**When** the base price is calculated,  
**Then** no vehicle category multiplier rule is applied (multiplier is neutral).

**Given** a FIXED_GRID pricing (Method 1),  
**When** the route matches a partner contract,  
**Then** the vehicle category multiplier is NOT applied (contract price is fixed).

**Prerequisites:** Story 4.1 (Base dynamic price calculation).

**Technical Notes:**

- Add `AppliedVehicleCategoryMultiplierRule` type to pricing-engine.ts
- Apply multiplier AFTER base price, BEFORE zone/advanced/seasonal multipliers
- Load VehicleCategory.priceMultiplier in pricing-calculate.ts

---

### Story 15.4 – Use Vehicle Category Default Rates for Dynamic Pricing

**Status:** Pending

**As a** pricing engine,  
**I want** to use `VehicleCategory.defaultRatePerKm` and `defaultRatePerHour` instead of organization-wide rates,  
**So that** each vehicle category has appropriate base rates (Autocar 4.50€/km vs Berline 1.80€/km).

**Related FRs:** FR13 (Dynamic pricing base), FR60 (Vehicle category configuration).

**Acceptance Criteria:**

**Given** a dynamic pricing calculation for category "Autocar" with `defaultRatePerKm: 4.50`,  
**When** the base price is calculated using MAX(distance×rate, duration×rate),  
**Then** it uses 4.50€/km (not the organization default 1.80€/km).

**Given** a VehicleCategory with `defaultRatePerKm: null`,  
**When** the base price is calculated,  
**Then** it falls back to `OrganizationPricingSettings.baseRatePerKm`.

**Given** a FIXED_GRID pricing (Method 1),  
**When** the route matches,  
**Then** the category rates are NOT used (contract price applies).

**Prerequisites:** Story 15.3 (Vehicle category multipliers).

**Technical Notes:**

- Modify `calculateDynamicBasePrice()` to accept category rates
- Pass VehicleCategory data to pricing engine
- Update `DynamicBaseCalculationRule` to show which rates were used

---

### Story 15.5 – Differentiate Pricing by Trip Type (Transfer/Excursion/Dispo)

**Status:** Pending

**As a** pricing engine,  
**I want** to apply different pricing logic based on trip type,  
**So that** excursions and mise-à-disposition have appropriate pricing models.

**Related FRs:** FR10 (Excursion and dispo forfaits), FR12 (Dynamic pricing fallback).

**Acceptance Criteria:**

**Given** a trip type "excursion" with no matching ExcursionPackage,  
**When** dynamic pricing is calculated,  
**Then** it uses duration-based pricing with a minimum duration threshold (e.g., 4 hours),  
**And** applies an excursion surcharge multiplier from settings.

**Given** a trip type "dispo" with no matching DispoPackage,  
**When** dynamic pricing is calculated,  
**Then** it uses hourly rate × requested hours,  
**And** adds overage rates for distance exceeding included km.

**Given** a trip type "transfer",  
**When** dynamic pricing is calculated,  
**Then** it uses the standard MAX(distance×rate, duration×rate) formula.

**Prerequisites:** Story 4.1 (Base dynamic price calculation).

**Technical Notes:**

- Add `excursionSurchargePercent` and `dispoMinimumHours` to OrganizationPricingSettings
- Modify `buildDynamicResult()` to branch by tripType
- Add `TripTypeRule` to appliedRules for transparency

---

### Story 15.6 – Use Correct Fuel Type from Vehicle/Category

**Status:** Pending

**As a** pricing engine,  
**I want** to use the correct fuel type (DIESEL, GASOLINE, LPG) based on the vehicle,  
**So that** fuel costs reflect actual fuel prices (DIESEL 1.789€ vs LPG 0.999€).

**Related FRs:** FR14 (Fuel cost), FR41 (Fuel price cache).

**Acceptance Criteria:**

**Given** a vehicle with fuel type "LPG" and LPG price 0.999€/L in cache,  
**When** the pricing engine calculates fuel cost,  
**Then** it uses 0.999€/L (not the default DIESEL 1.789€/L).

**Given** a vehicle category without explicit fuel type,  
**When** the pricing engine calculates fuel cost,  
**Then** it defaults to DIESEL.

**Prerequisites:** Story 15.2 (Vehicle-specific consumption).

**Technical Notes:**

- Add `fuelType: FuelType` field to Vehicle and VehicleCategory models
- Modify `getFuelPrice()` to accept fuelType parameter
- Pass fuel type through pricing calculation chain

---

### Story 15.7 – Propagate Cost Breakdown to Quotes and Invoices

**Status:** Pending

**As a** finance user,  
**I want** quotes and invoices to store the detailed cost breakdown (fuel, tolls, driver, wear),  
**So that** I can audit pricing decisions and understand profitability.

**Related FRs:** FR34 (Deep-copy rule for invoices), FR55 (Trip Transparency).

**Acceptance Criteria:**

**Given** a quote is created with tripAnalysis containing cost breakdown,  
**When** I view the quote detail,  
**Then** I see the breakdown: Fuel X€, Tolls Y€, Driver Z€, Wear W€.

**Given** a quote is converted to an invoice,  
**When** the invoice is created,  
**Then** the cost breakdown is deep-copied to the invoice record,  
**And** later changes to pricing settings do not affect the stored breakdown.

**Given** a quote with `tollSource: "GOOGLE_API"`,  
**When** I view the quote,  
**Then** I see an indicator that real toll data was used.

**Prerequisites:** Story 15.1 (Real toll costs), Story 7.1 (Invoice creation).

**Technical Notes:**

- Add `costBreakdown: Json` field to Invoice model
- Copy tripAnalysis.costBreakdown during invoice creation
- Add UI component to display breakdown in quote/invoice detail

---

### Story 15.8 – Validate Pricing Consistency Across Application

**Status:** Pending

**As a** QA engineer,  
**I want** comprehensive tests validating pricing consistency across quotes, invoices, and dispatch,  
**So that** all pricing paths produce identical results for the same inputs.

**Related FRs:** FR7 (Dual pricing modes), FR24 (Profitability indicator).

**Acceptance Criteria:**

**Given** identical inputs (contact, pickup, dropoff, vehicle category, pickup time),  
**When** pricing is calculated via quote creation, dispatch preview, and invoice recalculation,  
**Then** all three produce the same price, internal cost, and profitability indicator.

**Given** a partner with assigned grid route,  
**When** pricing is calculated,  
**Then** Method 1 (FIXED_GRID) is used consistently across all entry points.

**Given** a private client with no grid match,  
**When** pricing is calculated,  
**Then** Method 2 (DYNAMIC) is used with all multipliers applied consistently.

**Prerequisites:** All previous Story 15.x stories.

**Technical Notes:**

- Create integration test suite covering all pricing entry points
- Add Playwright E2E tests for quote → invoice flow
- Verify tripAnalysis is identical across paths

---

## Epic 16: Refactorisation du Système de Devis par Type de Trajet

**Goal:** Refactoriser complètement le système de création de devis pour que chaque type de trajet (Transfer, Excursion, Mise à disposition, Off-grid) ait un formulaire adapté avec les champs spécifiques nécessaires, et que le calcul des prix intègre correctement les zones, les multiplicateurs, et la différenciation partenaire/privé.

**Status:** Pending  
**Created:** 2025-12-02  
**Related FRs:** FR7-FR16, FR42-FR46, FR55

### Epic Overview

#### Problem Statement

Le système actuel de création de devis présente plusieurs problèmes critiques :

1. **Formulaire identique pour tous les types de trajets** : Le `QuoteBasicInfoPanel` utilise le même formulaire (pickup, dropoff, date) pour tous les types alors que chaque type a des besoins différents :

   - **Transfer** : Devrait avoir une option aller-retour
   - **Excursion** : Devrait permettre plusieurs arrêts et des dates aller/retour différentes
   - **Mise à disposition** : Devrait demander la durée en heures et le km max, pas de dropoff obligatoire
   - **Off-grid** : Devrait permettre de ne pas avoir de destination obligatoire

2. **Schéma Quote incomplet** : Le modèle Prisma `Quote` n'a pas les champs nécessaires pour stocker les données spécifiques à chaque type de trajet.

3. **Calcul des prix non intégré avec les zones** : Les multiplicateurs de zones (système de cercles concentriques Paris/Bussy) ne sont pas appliqués correctement dans le calcul dynamique.

4. **Prix non bloqués pour les agences** : L'Engagement Rule est implémentée mais les prix ne sont pas visuellement "bloqués" pour les partenaires avec grilles contractuelles.

5. **Doublon potentiel TripTransparency** : L'utilisateur signale un doublon dans l'affichage des coûts.

#### Business Value

- **Expérience utilisateur** : Formulaires adaptés à chaque type de trajet
- **Précision des prix** : Calcul correct avec zones et multiplicateurs
- **Conformité contractuelle** : Prix bloqués pour les agences partenaires
- **Flexibilité** : Support de tous les cas d'usage métier (aller-retour, excursions multi-arrêts, mises à disposition)

### Stories

---

#### Story 16.1 – Étendre le Schéma Quote pour les Types de Trajets

**Status:** Pending  
**Priority:** High  
**Estimated Effort:** 3 Story Points

**As a** backend engineer,  
**I want** the Quote model to have fields specific to each trip type,  
**So that** the system can store all necessary data for transfers, excursions, dispos, and off-grid trips.

**Related FRs:** FR10 (Excursion and dispo forfaits), FR42 (Quote builder UI).

**Acceptance Criteria:**

**AC1 - Transfer Fields:**  
**Given** a quote with `tripType = TRANSFER`,  
**When** I create or update the quote,  
**Then** I can set `isRoundTrip: Boolean` to indicate if it's a round-trip transfer,  
**And** if `isRoundTrip = true`, the pricing engine doubles the base price.

**AC2 - Excursion Fields:**  
**Given** a quote with `tripType = EXCURSION`,  
**When** I create or update the quote,  
**Then** I can set:

- `stops: Json` - Array of intermediate stops with addresses and coordinates
- `returnDate: DateTime` - Optional return date different from pickup date
  **And** the pricing engine calculates based on total distance including all stops.

**AC3 - Dispo Fields:**  
**Given** a quote with `tripType = DISPO`,  
**When** I create or update the quote,  
**Then** I can set:

- `durationHours: Decimal` - Duration of the mise à disposition
- `maxKilometers: Decimal` - Maximum kilometers included (calculated dynamically)
  **And** `dropoffAddress` is optional (can be null),  
  **And** the pricing engine uses hourly rate × duration + overage if applicable.

**AC4 - Off-grid Fields:**  
**Given** a quote with `tripType = OFF_GRID`,  
**When** I create or update the quote,  
**Then** `dropoffAddress` is optional,  
**And** `notes` is required to describe the trip.

**AC5 - Migration:**  
**Given** existing quotes in the database,  
**When** the migration runs,  
**Then** all existing quotes have default values for new fields,  
**And** no data is lost.

**Technical Notes:**

```prisma
// Add to Quote model in schema.prisma
model Quote {
  // ... existing fields ...

  // Story 16.1: Trip type specific fields
  isRoundTrip     Boolean   @default(false)  // For TRANSFER
  stops           Json?                       // For EXCURSION - array of stops
  returnDate      DateTime?                   // For EXCURSION
  durationHours   Decimal?  @db.Decimal(5, 2) // For DISPO
  maxKilometers   Decimal?  @db.Decimal(8, 2) // For DISPO (calculated)

  // Make dropoffAddress optional for DISPO and OFF_GRID
  dropoffAddress   String?  // Changed from String to String?
}
```

**Prerequisites:** None (first story in epic).

---

#### Story 16.2 – Formulaire Dynamique par Type de Trajet

**Status:** Pending  
**Priority:** High  
**Estimated Effort:** 5 Story Points

**As an** operator,  
**I want** the quote creation form to adapt based on the selected trip type,  
**So that** I only see and fill in the fields relevant to that trip type.

**Related FRs:** FR42 (Quote builder UI), FR45 (Helpers for common scenarios).

**Acceptance Criteria:**

**AC1 - Transfer Form:**  
**Given** I select trip type "Transfer",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- Dropoff address (required)
- Pickup date/time (required)
- **NEW:** Checkbox "Aller-retour" (Round trip)
  **And** if I check "Aller-retour", the pricing doubles.

**AC2 - Excursion Form:**  
**Given** I select trip type "Excursion",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- **NEW:** "Add stop" button to add intermediate stops (dynamic list)
- **NEW:** Return date picker (optional, defaults to same day)
- Pickup date/time (required)
  **And** I can add/remove stops dynamically,  
  **And** each stop has an address autocomplete field.

**AC3 - Mise à Disposition Form:**  
**Given** I select trip type "Mise à disposition",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- **NO** Dropoff address field
- Pickup date/time (required)
- **NEW:** Duration in hours (required, number input)
- **NEW:** Max kilometers (calculated automatically: duration × 50km/h, editable)
  **And** the pricing uses hourly rate × duration.

**AC4 - Off-grid Form:**  
**Given** I select trip type "Off-grid",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- Dropoff address (optional)
- Pickup date/time (required)
- Notes (required, with placeholder "Describe the trip...")
  **And** the pricing is fully manual (operator sets final price).

**AC5 - Form Validation:**  
**Given** any trip type,  
**When** I try to submit without required fields,  
**Then** validation errors are shown for missing fields specific to that trip type.

**Technical Notes:**

- Create `TripTypeFormFields` component that renders different fields based on `tripType`
- Update `CreateQuoteFormData` type to include new fields
- Update `QuoteBasicInfoPanel` to use conditional rendering
- Add translations for new field labels

**Prerequisites:** Story 16.1 (Schema changes).

---

#### Story 16.3 – Intégration des Zones dans le Calcul Dynamique

**Status:** Pending  
**Priority:** High  
**Estimated Effort:** 5 Story Points

**As a** pricing engine,  
**I want** to apply zone multipliers to dynamic pricing calculations,  
**So that** trips to/from distant zones are priced appropriately higher.

**Related FRs:** FR8 (Geographic zones), FR15 (Configurable multipliers).

**Acceptance Criteria:**

**AC1 - Zone Detection:**  
**Given** a trip with pickup and dropoff coordinates,  
**When** the pricing engine runs,  
**Then** it detects which zone each point falls into using the concentric circles system (Paris center, Bussy garage, special zones).

**AC2 - Max Zone Multiplier:**  
**Given** pickup in zone PARIS_20 (1.1×) and dropoff in zone CDG (1.2×),  
**When** the pricing engine calculates the zone multiplier,  
**Then** it uses `Math.max(1.1, 1.2) = 1.2×` as the zone multiplier.

**AC3 - Special Zones Priority:**  
**Given** a point that falls within both a special zone (CDG) and a concentric zone (PARIS_30),  
**When** the zone is detected,  
**Then** the special zone takes priority (CDG 1.2× is used, not PARIS_30 1.2×).

**AC4 - Applied Rule Transparency:**  
**Given** a zone multiplier is applied,  
**When** the pricing result is returned,  
**Then** `appliedRules` contains a `ZONE_MULTIPLIER` rule with:

- `pickupZone`: zone name and multiplier
- `dropoffZone`: zone name and multiplier
- `appliedMultiplier`: the max of the two
- `priceBefore` and `priceAfter`

**AC5 - Bussy Discount:**  
**Given** a trip starting from zone BUSSY_0 (0.8×),  
**When** the pricing engine calculates,  
**Then** the zone multiplier is 0.8× (discount for trips from the garage).

**Technical Notes:**

- Use the zone definitions from `seed-vtc-complete.ts`
- Implement `findZoneForPoint()` with priority: Special zones > Concentric zones
- Apply zone multiplier AFTER base price and trip type adjustments, BEFORE vehicle category multiplier
- Add `AppliedZoneMultiplierRule` to pricing engine types

**Prerequisites:** Story 15.3 (Vehicle category multipliers), Zone data seeded.

---

#### Story 16.4 – Prix Bloqués pour Agences Partenaires

**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 3 Story Points

**As an** operator,  
**I want** partner contract prices to be visually locked and non-editable,  
**So that** I cannot accidentally change contractually agreed prices.

**Related FRs:** FR11 (Engagement Rule), FR16 (Operator override).

**Acceptance Criteria:**

**AC1 - Visual Lock Indicator:**  
**Given** a quote for a partner with a matching grid route,  
**When** the pricing result shows `pricingMode = FIXED_GRID`,  
**Then** the final price field displays a lock icon 🔒,  
**And** a badge "Contract Price" is shown next to the price.

**AC2 - Price Field Disabled:**  
**Given** a quote with `pricingMode = FIXED_GRID`,  
**When** I view the pricing panel,  
**Then** the final price input is disabled (read-only),  
**And** the "Use Suggested" button is hidden.

**AC3 - Override Warning:**  
**Given** a quote with `pricingMode = FIXED_GRID`,  
**When** an admin with override permission tries to change the price,  
**Then** a confirmation dialog appears: "This is a contractual price. Are you sure you want to override?",  
**And** the override is logged in `appliedRules` with `isContractPriceOverride: true`.

**AC4 - Profitability Still Visible:**  
**Given** a quote with `pricingMode = FIXED_GRID` and negative margin,  
**When** I view the TripTransparencyPanel,  
**Then** the profitability indicator shows red (loss),  
**And** a tooltip explains "Contract price - profitability cannot be adjusted".

**Technical Notes:**

- Add `isContractPrice` prop to `QuotePricingPanel`
- Modify `handleFinalPriceChange` to check for contract price
- Add lock icon and badge components
- Implement admin override flow with confirmation dialog

**Prerequisites:** Story 3.4 (Engagement Rule), Story 12.2 (Partner contract prices).

---

#### Story 16.5 – Simplifier l'Affichage TripTransparency

**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 2 Story Points

**As an** operator,  
**I want** the TripTransparency panel to show cost details with info icons instead of a separate Costs tab,  
**So that** the interface is cleaner and less redundant.

**Related FRs:** FR44 (Transparent cost breakdown), FR55 (Trip Transparency).

**Acceptance Criteria:**

**AC1 - Info Icons on Overview:**  
**Given** the TripTransparencyPanel Overview tab,  
**When** I view the internal cost summary,  
**Then** each cost component (fuel, tolls, driver, wear) has an info icon (ℹ️),  
**And** hovering shows a tooltip with the calculation details.

**AC2 - Costs Tab Simplified:**  
**Given** the Costs tab in TripTransparencyPanel,  
**When** I open it,  
**Then** it shows a compact table with just the cost components and amounts,  
**And** the detailed breakdown (distance × rate) is shown in tooltips, not inline.

**AC3 - No Duplicate Information:**  
**Given** the Overview and Costs tabs,  
**When** I compare them,  
**Then** there is no duplicate display of the same information,  
**And** each tab has a distinct purpose (Overview = summary, Costs = details).

**Technical Notes:**

- Add `Tooltip` components to cost rows in Overview tab
- Simplify `EditableCostRow` to show details in tooltip
- Review and remove any duplicate cost displays

**Prerequisites:** Story 6.7 (TripTransparencyPanel integration).

---

#### Story 16.6 – Calcul Prix Aller-Retour pour Transfer

**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 2 Story Points

**As a** pricing engine,  
**I want** to correctly calculate round-trip transfer prices,  
**So that** aller-retour transfers are priced at 2× the one-way price.

**Related FRs:** FR13 (Dynamic pricing), FR7 (Pricing modes).

**Acceptance Criteria:**

**AC1 - Round Trip Pricing:**  
**Given** a transfer quote with `isRoundTrip = true`,  
**When** the pricing engine calculates,  
**Then** the base price is doubled,  
**And** an `appliedRule` of type `ROUND_TRIP` is added with `multiplier: 2`.

**AC2 - Internal Cost Doubled:**  
**Given** a round-trip transfer,  
**When** the shadow calculation runs,  
**Then** the internal cost includes both directions (approach + service + return × 2).

**AC3 - Grid Price Doubled:**  
**Given** a partner with a grid route and `isRoundTrip = true`,  
**When** the pricing engine matches the route,  
**Then** the fixed price is doubled (contract price × 2).

**AC4 - UI Display:**  
**Given** a round-trip quote,  
**When** I view the TripTransparencyPanel,  
**Then** the route tab shows "Aller" and "Retour" segments separately.

**Technical Notes:**

- Add `isRoundTrip` check in `buildDynamicResult()` and `buildGridResult()`
- Create `AppliedRoundTripRule` type
- Update shadow calculation to compute both directions

**Prerequisites:** Story 16.1 (Schema), Story 16.2 (Form).

---

#### Story 16.7 – Calcul Prix Excursion Multi-Arrêts

**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 3 Story Points

**As a** pricing engine,  
**I want** to calculate excursion prices based on total distance including all stops,  
**So that** multi-stop excursions are priced accurately.

**Related FRs:** FR10 (Excursion forfaits), FR13 (Dynamic pricing).

**Acceptance Criteria:**

**AC1 - Multi-Stop Distance:**  
**Given** an excursion with stops [A → B → C → D],  
**When** the pricing engine calculates distance,  
**Then** it sums: distance(A→B) + distance(B→C) + distance(C→D).

**AC2 - Minimum Duration Applied:**  
**Given** an excursion with total duration 2 hours,  
**When** the pricing engine calculates,  
**Then** it uses the minimum duration (4 hours) per Story 15.5,  
**And** the `TRIP_TYPE` rule shows `minimumApplied: true`.

**AC3 - Stops in Trip Analysis:**  
**Given** an excursion with multiple stops,  
**When** the quote is saved,  
**Then** `tripAnalysis.segments` includes each leg as a separate segment.

**AC4 - Return Date Handling:**  
**Given** an excursion with `returnDate` different from `pickupAt`,  
**When** the pricing engine calculates,  
**Then** it considers the multi-day nature and may apply overnight surcharges.

**Technical Notes:**

- Modify routing calculation to handle array of waypoints
- Update `TripAnalysis.segments` to support N segments (not just A/B/C)
- Call Google Routes API with waypoints for accurate distance

**Prerequisites:** Story 16.1 (Schema), Story 16.2 (Form), Story 15.5 (Trip type pricing).

---

#### Story 16.8 – Calcul Prix Mise à Disposition

**Status:** Pending  
**Priority:** Medium  
**Estimated Effort:** 3 Story Points

**As a** pricing engine,  
**I want** to calculate mise à disposition prices based on duration and included kilometers,  
**So that** hourly rentals are priced correctly with overage fees.

**Related FRs:** FR10 (Dispo forfaits), FR13 (Dynamic pricing).

**Acceptance Criteria:**

**AC1 - Hourly Pricing:**  
**Given** a dispo quote with `durationHours = 4`,  
**When** the pricing engine calculates,  
**Then** the base price is `4 × ratePerHour`.

**AC2 - Included Kilometers:**  
**Given** a dispo quote with `durationHours = 4`,  
**When** the form displays,  
**Then** `maxKilometers` is automatically calculated as `4 × 50 = 200 km`,  
**And** the operator can override this value.

**AC3 - Overage Calculation:**  
**Given** a dispo quote with `durationHours = 4` and actual distance 250 km,  
**When** the pricing engine calculates,  
**Then** overage is `(250 - 200) × overageRatePerKm = 50 × 0.50 = 25€`,  
**And** total price is `basePrice + 25€`.

**AC4 - No Dropoff Required:**  
**Given** a dispo quote,  
**When** I create the quote,  
**Then** `dropoffAddress` is optional and can be left empty,  
**And** the quote is valid without a dropoff address.

**AC5 - Partner Dispo Packages:**  
**Given** a partner with a matching DispoPackage,  
**When** the pricing engine runs,  
**Then** it uses the package price (Method 1) instead of dynamic calculation.

**Technical Notes:**

- Modify form validation to make `dropoffAddress` optional for DISPO
- Implement dynamic `maxKilometers` calculation in form
- Use Story 15.5 `calculateDispoPrice()` function

**Prerequisites:** Story 16.1 (Schema), Story 16.2 (Form), Story 15.5 (Trip type pricing).

---

#### Story 16.9 – Support Off-Grid avec Notes Obligatoires

**Status:** Pending  
**Priority:** Low  
**Estimated Effort:** 2 Story Points

**As an** operator,  
**I want** to create off-grid quotes with just a pickup address and description,  
**So that** I can handle non-standard trips that don't fit other categories.

**Related FRs:** FR12 (Dynamic pricing fallback), FR42 (Quote builder).

**Acceptance Criteria:**

**AC1 - Minimal Required Fields:**  
**Given** an off-grid quote,  
**When** I create the quote,  
**Then** only these fields are required:

- Contact
- Pickup address
- Pickup date/time
- Vehicle category
- Notes (description of the trip)
- Final price (manual entry)

**AC2 - No Automatic Pricing:**  
**Given** an off-grid quote,  
**When** I fill in the form,  
**Then** no automatic pricing calculation is triggered,  
**And** the suggested price shows "—" (not calculated),  
**And** I must manually enter the final price.

**AC3 - Notes Validation:**  
**Given** an off-grid quote with empty notes,  
**When** I try to submit,  
**Then** validation fails with "Notes are required for off-grid trips".

**AC4 - Profitability Calculation:**  
**Given** an off-grid quote with manual price,  
**When** I enter the final price,  
**Then** the profitability indicator updates based on estimated internal cost,  
**And** internal cost is estimated from pickup address only (approach segment).

**Technical Notes:**

- Disable pricing calculation for OFF_GRID trip type
- Make notes field required only for OFF_GRID
- Calculate minimal internal cost from approach segment only

**Prerequisites:** Story 16.1 (Schema), Story 16.2 (Form).

---

#### Story 16.10 – Tests E2E pour Tous les Types de Trajets

**Status:** Pending  
**Priority:** High  
**Estimated Effort:** 3 Story Points

**As a** QA engineer,  
**I want** comprehensive E2E tests for all trip types,  
**So that** the quote creation flow works correctly for each type.

**Related FRs:** All FR7-FR16.

**Acceptance Criteria:**

**AC1 - Transfer Tests:**  
**Given** the quote creation page,  
**When** I create a simple transfer and a round-trip transfer,  
**Then** both are saved correctly with appropriate pricing.

**AC2 - Excursion Tests:**  
**Given** the quote creation page,  
**When** I create an excursion with 3 stops,  
**Then** all stops are saved and the total distance is calculated correctly.

**AC3 - Dispo Tests:**  
**Given** the quote creation page,  
**When** I create a 4-hour mise à disposition,  
**Then** the duration, max km, and pricing are correct.

**AC4 - Off-grid Tests:**  
**Given** the quote creation page,  
**When** I create an off-grid quote with notes,  
**Then** the quote is saved without dropoff address.

**AC5 - Partner Grid Tests:**  
**Given** a partner with assigned grid routes,  
**When** I create a quote matching a route,  
**Then** the contract price is used and locked.

**Technical Notes:**

- Use Playwright MCP for E2E tests
- Test each trip type with various scenarios
- Verify pricing calculations match expected values
- Test form validation for each type

**Prerequisites:** All previous Story 16.x stories.

---

### Summary

Epic 16 addresses the fundamental issues with the quote creation system by:

1. **Extending the data model** (Story 16.1) to support trip-type-specific fields
2. **Creating dynamic forms** (Story 16.2) that adapt to each trip type
3. **Integrating zone pricing** (Story 16.3) for accurate geographic multipliers
4. **Locking partner prices** (Story 16.4) to enforce the Engagement Rule
5. **Simplifying the UI** (Story 16.5) to remove redundancy
6. **Implementing type-specific pricing** (Stories 16.6-16.9) for each trip type
7. **Comprehensive testing** (Story 16.10) to ensure quality

This epic depends on and extends the work done in Epic 15 (Pricing Engine Accuracy) and Epic 14 (Flexible Route Pricing).

---

## Summary

This document now defines the **16-epic structure**, summarises the **FR inventory and coverage** and provides **detailed stories** per epic with:

- User stories (As a / I want / So that).
- BDD-style acceptance criteria (Given / When / Then / And).
- Prerequisites and technical notes.
- Explicit references to related FRs for traceability.

It is intended as the canonical epic and story breakdown for implementation and sprint planning, following the BMad `create-epics-and-stories` workflow.
