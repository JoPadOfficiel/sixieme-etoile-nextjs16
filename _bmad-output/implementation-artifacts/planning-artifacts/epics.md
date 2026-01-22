---
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/implementation-artifacts/planning-artifacts/prd.md
  - _bmad-output/implementation-artifacts/planning-artifacts/tech-spec.md
  - _bmad-output/implementation-artifacts/planning-artifacts/ux-design-specification.md
  - docs/bmad/invoice_VTC-INV20260001_Anthony_Davis.pdf
  - docs/bmad/quote_VTC-QUO-2026-450_Anthony_Davis.pdf
  - docs/bmad/Billet Co_Exemple.pdf
---

# sixieme-etoile-nextjs16 - Epic Breakdown

**Author:** JoPad  
**Date:** 2025-11-25  
**Project Level:** VTC ERP – Pricing, Fleet, CRM & Invoicing  
**Target Scale:** B2B SaaS cockpit for enterprise VTC operators

---

## Overview

This document decomposes the VTC ERP PRD into **24 functional epics**, aligned with the Tech Spec and UX Design Specification. Each epic delivers recognisable business value and is traceable back to Functional Requirements (FR1–FR130).

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

- **Epic 10 – Google Maps Integration Fixes**  
  Fix critical Google Maps integration issues in quotes and dispatch screens.

- **Epic 11 – Zone Management Refactoring & UI Improvements**  
  Unified zone management with interactive maps, postal code creation, and responsive design.

- **Epic 12 – Partner-Specific Pricing & Contract Enhancements**  
  Implement partner-specific pricing schemas, override support, and contract management UI.

- **Epic 13 – Pricing UI Improvements & Partner Filtering**  
  Fix pricing UI translations and add partner filtering to pricing pages.

- **Epic 14 – Flexible Route Pricing System**  
  Extend the zone-to-zone pricing model to support multi-zone origins/destinations and specific address-based pricing with interactive map selection.

- **Epic 15 – Pricing Engine Accuracy & Real Cost Integration**  
  Fix pricing inconsistencies by integrating real toll costs, vehicle-specific fuel consumption, vehicle category multipliers, and trip-type differentiation.

- **Epic 16 – Quote System Refactoring by Trip Type**  
  Refactor the quote creation system to support different forms and pricing logic for each trip type (Transfer, Excursion, Dispo, Off-grid).

- **Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability**  
  Implement configurable zone conflict resolution, automatic compliance-driven staffing integration into pricing, driver calendar/availability model, weighted day/night rates, time buckets, zone surcharges, route segmentation, and TCO enrichment.

- **Epic 18 – Advanced Geospatial, Route Optimization & Yield Management**  
  Implement corridor zones, automatic transfer-to-MAD switching, loss of exploitation calculation, multi-scenario route optimization, transversal trip decomposition, shadow fleet integration, fixed temporal vectors, and hierarchical pricing algorithm.

- **Epic 21 – Complete Pricing System Refactor with Full Transparency**  
  Refactor the entire pricing calculation system to display ultra-detailed cost breakdown, complete calculation transparency, and full integration of RSE/staffing information in quotes and dispatch.

- **Epic 22 – STAY Trip Type, Subcontracting & Critical Fixes**  
  Implement multi-day STAY packages, enhanced subcontracting workflow, round-trip pricing corrections, staffing costs transparency, and notes management improvements.

- **Epic 23 – Critical Bug Fixes & Vehicle Category Pricing Filters**  
  Fix critical UI bugs (loading states, zone selection, dialog freeze, positioning costs) and implement vehicle category filtering for all pricing adjustment types.

- **Epic 24 – Agency Mini-CRM & Bidirectional Pricing**  
  Implement EndCustomer sub-contacts within agency profiles, integrate sub-contact selection in quotes and invoices, display end-customer names in dispatch, and add bidirectional pricing toggle for partner clients.

- **Epic 25 – Documents, Payments & Deep Linking Enhancements**
  Implement PDF mission sheets with editable fields, compliant invoice/quote layouts, document personalization settings, B2C invoicing address support, enhanced deep linking navigation, and multi-invoice payment tracking.

- **Epic 28 – Order Management & Intelligent Spawning (Dossier de Commande)**
  Implement the "Dossier" lifecycle to manage multi-mission orders, intelligent spawning from quotes, flexible execution-aware invoicing, and ad-hoc exceptions.

- **Epic 29 – Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)**
  Refactor and finalize the "Shopping Cart" quote system to ensure correct persistence, multi-trip visualization, lossless editing, and intelligent mission spawning.

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

- **FR Group 9 – Advanced Zone Resolution, Compliance Integration & Driver Availability:** FR61–FR77.  
  Configurable zone conflict resolution, automatic compliance-driven staffing integration, driver calendar/availability model, weighted day/night rates, time buckets, zone surcharges, route segmentation, and TCO enrichment.

- **FR Group 10 – Advanced Geospatial, Route Optimization & Yield Management:** FR78–FR88.  
  Corridor zones, automatic transfer-to-MAD switching, loss of exploitation calculation, multi-scenario route optimization, transversal trip decomposition, shadow fleet integration, fixed temporal vectors, and hierarchical pricing algorithm.

- **FR Group 11 – Complete Pricing System Refactor with Full Transparency:** FR89–FR110.  
  Ultra-detailed cost breakdown display, staffing costs transparency, detailed time calculation analysis, pricing segments visualization, dispatch staffing integration, automatic empty return calculation, enhanced TripTransparency interface, automated testing and validation, documentation and training, and production deployment with monitoring.

- **FR Group 12 – Vehicle Category Filtering, Bidirectional Pricing & Agency Sub-Contacts:** FR111–FR120.  
  Vehicle category filtering for pricing adjustments, automatic adjustment filtering in quote pricing, bidirectional client/agency price display, agency sub-contacts (end-customers) CRM, dispatch end-customer visibility, difficulty score on sub-contacts, pricing page loading state fixes, and dialog state management fixes.

- **FR Group 13 – Agency Mini-CRM, Bidirectional Pricing UX & Dispatch Enhancements:** FR121–FR130.  
  EndCustomer data model, Partner contact detail page with sub-contacts, quote end-customer selector, quote/invoice PDF enhancements, dispatch end-customer display, difficulty score integration, bidirectional pricing toggle UI, pricing mode logging, and end-customer search/filter.

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

- **FR Group 9 (FR61–FR77) – Advanced Zone Resolution, Compliance Integration & Driver Availability**

  - Primary epic: **Epic 17 – Advanced Zone Resolution, Compliance Integration & Driver Availability**
  - Secondary epics: **Epic 3 – Zone Engine & Fixed Grids**, **Epic 4 – Dynamic Pricing & Shadow Calculation**, **Epic 5 – Fleet & RSE Compliance Engine**, **Epic 8 – Dispatch & Strategic Optimisation**

- **FR Group 10 (FR78–FR88) – Advanced Geospatial, Route Optimization & Yield Management**

  - Primary epic: **Epic 18 – Advanced Geospatial, Route Optimization & Yield Management**
  - Secondary epics: **Epic 3 – Zone Engine & Fixed Grids**, **Epic 4 – Dynamic Pricing & Shadow Calculation**, **Epic 8 – Dispatch & Strategic Optimisation**, **Epic 14 – Flexible Route Pricing**, **Epic 17 – Advanced Zone Resolution**

- **FR Group 11 (FR89–FR110) – Complete Pricing System Refactor with Full Transparency**
  - Primary epic: **Epic 21 – Complete Pricing System Refactor with Full Transparency**
  - Secondary epics: **Epic 4 – Dynamic Pricing & Shadow Calculation**, **Epic 6 – Quotes & Operator Cockpit**, **Epic 8 – Dispatch & Strategic Optimisation**, **Epic 17 – Advanced Zone Resolution**, **Epic 20 – Critical Bug Fixes & Testing**

- **FR Group 12 (FR111–FR120) – Vehicle Category Filtering, Bidirectional Pricing & Agency Sub-Contacts**
  - Primary epic: **Epic 23 – Critical Bug Fixes & Vehicle Category Pricing Filters**
  - Secondary epics: **Epic 9 – Advanced Pricing Configuration & Reporting**, **Epic 6 – Quotes & Operator Cockpit**, **Epic 2 – CRM & Partner Contracts**

- **FR Group 13 (FR121–FR130) – Agency Mini-CRM, Bidirectional Pricing UX & Dispatch Enhancements**
  - Primary epic: **Epic 24 – Agency Mini-CRM & Bidirectional Pricing**
  - Secondary epics: **Epic 2 – CRM & Partner Contracts**, **Epic 6 – Quotes & Operator Cockpit**, **Epic 7 – Invoicing & Documents**, **Epic 8 – Dispatch & Strategic Optimisation**

- **FR Group 14 (FR131–FR139) – Mission Docs, PDF Compliance, Payment Tracking & Deep Linking**
  - Primary epic: **Epic 25 – Documents, Payments & Deep Linking Enhancements**
  - Secondary epics: **Epic 7 – Invoicing & Documents**, **Epic 8 – Dispatch**, **Epic 2 – CRM**

- **FR Group 13 (FR121–FR130) – Agency Mini-CRM, Bidirectional Pricing UX & Dispatch Enhancements**
  - Primary epic: **Epic 24 – Agency Mini-CRM & Bidirectional Pricing**
  - Secondary epics: **Epic 2 – CRM & Partner Contracts**, **Epic 6 – Quotes & Operator Cockpit**, **Epic 7 – Invoicing & Documents**, **Epic 8 – Dispatch & Strategic Optimisation**

- **FR Group 14 (FR131–FR139) – Mission Docs, PDF Compliance, Payment Tracking & Deep Linking**
  - Primary epic: **Epic 25 – Documents, Payments & Deep Linking Enhancements**
  - Secondary epics: **Epic 7 – Invoicing & Documents**, **Epic 8 – Dispatch**, **Epic 2 – CRM**

- **FR Group 17 (FR150–FR158) – Multi-Item Quote Cart & Revolutionary UX**
  - Primary epic: **Epic 29 – Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)**
  - Secondary epics: **Epic 6 – Quotes & Operator Cockpit**, **Epic 7 – Invoicing & Documents**

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

**Goal:** Provide a comprehensive "Unifed Cockpit" for dispatching that offers seamless toggling between Gantt, List, and Map views, with advanced visualization features (Continuous Axis, Zoom, Date Range) and strict separation between Orders and Operational Missions.

### Story 8.1: Implement Unified Cockpit Layout (Gantt/List/Map Toggles)

As a **dispatcher**,
I want a single page where I can switch between Gantt, List, and Map views instantly,
So that I can visualize my fleet's schedule in the most appropriate format for the task at hand.

**Related FRs:** FR140, FR140.1, FR50–FR51.

**Acceptance Criteria:**
- **View Toggles:** Distinct buttons to switch modes: "Gantt" (Planning), "List" (Tabular), "Map" (Geospatial).
- **State Persistence:** Switching views retains the currently selected Date Range and Filters.
- **List View Population:** The "List" mode must display the *exact same* set of missions as the Gantt (Assigned + Unassigned), in a sortable table. It must NEVER be empty if missions exist.
- **Backlog Pane:** A dedicated collapsible pane on the left shows *only* Unassigned Missions (Backlog), distinct from the main planning area.

**Prerequisites:** Stories 4.6–4.7, 5.1–5.2, 6.7, Maps integration.

**Technical Notes:**
- The "List" view currently appears empty in screenshots; ensure the data fetch strategy (React Query) is shared between Gantt and List components.

### Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers

As a **dispatcher**,
I want an assignment drawer that shows candidate vehicles/drivers with suitability scores,
So that I can quickly pick the best option.

**Related FRs:** FR50–FR51, FR17–FR20.

**Acceptance Criteria:**
- **Drawer:** Clicking a mission opens a drawer with candidates.
- **Scoring:** Candidates are ranked by distance, compliance, and schedule fit.
- **Feedback:** selecting a candidate updates the mission instantly.

### Story 8.3: Implement Multi-Base Optimisation

As an **operations lead**,
I want the dispatch engine to simulate the approach–service–return loop from multiple bases,
So that I can pick assignments that minimise deadhead cost.

**Related FRs:** FR17–FR20, FR51.

**Acceptance Criteria:**
- **Simulation:** Engine calculates costs (Segment A/B/C) for top candidates.
- **Visuals:** Map highlights approach paths for different bases.

### Story 8.4: Trip Chaining Opportunities

As a **dispatcher**,
I want the system to detect opportunities to chain trips to reduce deadhead,
So that I can optimize fleet usage.

**Related FRs:** FR52.

**Acceptance Criteria:**
- **Suggestions:** UI proposes "Chain with Mission X" if spatially/temporally close.
- **Linkage:** Accepting a chain links the missions operationally.

### Story 8.5: Empty-Leg Opportunities

As a **yield manager**,
I want empty-leg segments tracked and surfaced,
So that I can resell them.

**Related FRs:** FR53.

**Acceptance Criteria:**
- **Detection:** Automatic creation of `EmptyLegOpportunity` records for significant deadheads.
- **Visibility:** Filter to show empty legs on the Gantt/Map.

### Story 8.6: Subcontracting Integration

As an **operations manager**,
I want to subcontract trips that are structurally unprofitable for my fleet,
So that I can maintain service levels without losing money.

**Related FRs:** FR54.

**Acceptance Criteria:**
- **Suggestion:** System flags missions with negative internal margin.
- **Action:** "Subcontract" button allows assigning to a Partner from the directory.

### Story 8.7: Profitability & Compliance Badges

As a **dispatcher**,
I want to see status badges (Margin, RSE, Assignment) on every mission block,
So that I can spot issues at a glance.

**Related FRs:** FR24, FR47, FR50.

**Acceptance Criteria:**
- **Visuals:** Icons/Colors for Profit (Red/Green), Compliance (Warning), Status.
- **Updates:** Badges update in real-time upon reassignment.

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

## Epic 10: Google Maps Integration Fixes

**Goal:** Fix critical Google Maps integration issues in quotes and dispatch screens to ensure proper map functionality and user experience.

### Story 10.1: Fix Google Maps Integration in Quotes & Dispatch

As a **developer**,  
I want Google Maps to load and function correctly in quotes and dispatch screens,  
So that operators can see routes and use map-based features without errors.

**Related FRs:** Technical integration requirements.

**Acceptance Criteria:**

**Given** I open the Create Quote page,  
**When** the page loads,  
**Then** Google Maps loads without JavaScript errors and shows the route.

**Given** I open the Dispatch screen,  
**When** I view a mission,  
**Then** the map displays the route correctly with vehicle positions.

**Prerequisites:** Stories 1.1–1.2 (data model + tenancy), Story 1.5 (Maps integration settings).

**Technical Notes:**

- Fixed Google Maps API key configuration and loading sequence
- Resolved map initialization timing issues
- Ensured proper cleanup of map instances
- Created GoogleMapsProvider component for consistent API loading
- Updated AddressAutocomplete to use Places API library
- Added coordinate capture and storage in quote creation flow
- Updated seed data with realistic Paris coordinates

---

## Epic 11: Zone Management Refactoring & UI Improvements

**Goal:** Unified zone management with interactive maps, postal code creation, pricing multipliers integration, and responsive design improvements.

### Story 11.1: Implement Unified Zone Management with Interactive Map

As an **operator**,  
I want a unified zone management interface with interactive map capabilities,  
So that I can create and manage zones visually and efficiently.

**Related FRs:** FR8 (Geographic zones), FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I access `/dashboard/settings/zones`,  
**When** the page loads,  
**Then** I see a two-panel layout with zone list sidebar and interactive map showing all zones.

**Given** I click "Add Zone" or select a drawing tool,  
**When** I draw a polygon or circle on the map,  
**Then** the zone creation form opens with pre-filled geometry.

**Prerequisites:** Stories 1.1–1.2 (data model + tenancy), Story 1.5 (Maps integration settings), Story 10.1 (Google Maps fixes).

**Technical Notes:**

- Created ZoneManagementLayout with two-panel design
- Implemented ZonesInteractiveMap with Google Maps Drawing Tools
- Added ZoneSidebarList with search and filtering capabilities
- Created ZoneMapToolbar with Pan, Circle, and Polygon tools
- Added zone color coding and selection functionality
- Implemented responsive design for mobile devices

---

### Story 11.2: Implement Postal Code Zone Creation

As a **pricing administrator**,  
I want to create zones from postal codes,  
So that I can quickly define zones covering specific postal code areas.

**Related FRs:** FR8 (Geographic zones).

**Acceptance Criteria:**

**Given** I am creating a new zone,  
**When** I select "Postal Code" as zone type,  
**Then** I can enter one or multiple postal codes and the system creates the zone with appropriate boundaries.

**Prerequisites:** Story 11.1 (Zone management interface).

**Technical Notes:**

- Added postal code lookup functionality
- Integrated with postal code boundary APIs
- Auto-generated zone geometry from postal codes
- Added postal code validation and formatting

---

### Story 11.3: Integrate Zone Pricing Multipliers

As a **pricing engine**,  
I want zone multipliers to be integrated into the pricing calculation,  
So that geographic pricing variations are applied automatically.

**Related FRs:** FR15 (Configurable multipliers), FR8 (Geographic zones).

**Acceptance Criteria:**

**Given** a zone with multiplier 1.2×,  
**When** a trip starts or ends in this zone,  
**Then** the pricing engine applies the 1.2× multiplier.

**Given** pickup in zone PARIS_20 (1.1×) and dropoff in zone CDG (1.2×),  
**When** the pricing engine calculates,  
**Then** it uses Math.max(1.1, 1.2) = 1.2× as the zone multiplier.

**Prerequisites:** Stories 4.1–4.3 (Dynamic pricing), Story 11.1 (Zone management).

**Technical Notes:**

- Integrated zone multipliers into pricing engine
- Added priority handling for overlapping zones (special zones > concentric zones)
- Implemented multiplier caching for performance
- Added zone detection logic for pickup/dropoff coordinates

---

### Story 11.4: Merge Seasonal Multipliers & Advanced Rates UI

As a **pricing administrator**,  
I want seasonal multipliers and advanced rates to be managed in a unified interface,  
So that pricing rules are easier to configure and understand.

**Related FRs:** FR15 (Configurable multipliers), FR58 (Advanced rate modifiers).

**Acceptance Criteria:**

**Given** I access pricing settings,  
**When** I view the multipliers section,  
**Then** I see both seasonal multipliers and advanced rates in a unified table.

**Given** I create a new pricing rule,  
**When** I configure conditions and adjustments,  
**Then** the interface validates rule conflicts and priority order.

**Prerequisites:** Stories 9.1–9.2 (Pricing configuration), Story 11.1 (Zone management).

**Technical Notes:**

- Merged two separate UI components into one unified interface
- Unified data models for better maintainability
- Added bulk import/export functionality
- Implemented rule conflict detection and resolution

---

### Story 11.5: Merge Optional Fees & Promotions UI

As a **pricing administrator**,  
I want optional fees and promotions to be managed together,  
So that pricing adjustments are easier to configure and track.

**Related FRs:** FR56 (Optional fees), FR57 (Promotions).

**Acceptance Criteria:**

**Given** I access pricing settings,  
**When** I view the fees section,  
**Then** I see both optional fees and promotions in a unified interface.

**Given** I configure a new optional fee or promotion,  
**When** I set the conditions and amounts,  
**Then** the system shows the impact on pricing calculations.

**Prerequisites:** Stories 9.3–9.4 (Fees and promotions configuration).

**Technical Notes:**

- Combined fee management interfaces
- Unified validation rules and tax handling
- Added fee impact analysis and preview
- Implemented usage tracking for promotions

---

### Story 11.6: Implement Collapsible Main Sidebar

As a **user**,  
I want the main sidebar to be collapsible,  
So that I have more screen space for content.

**Related FRs:** UX improvement requirements.

**Acceptance Criteria:**

**Given** I am using the application,  
**When** I click the collapse button,  
**Then** the sidebar collapses and content expands to use the full width.

**Given** I refresh the page or navigate,  
**When** the page loads,  
**Then** the sidebar state persists from my previous choice.

**Prerequisites:** Core layout components.

**Technical Notes:**

- Added collapsible sidebar component with smooth animations
- Implemented persistent sidebar state using localStorage
- Added keyboard shortcuts for sidebar toggle
- Ensured responsive behavior on mobile devices

---

### Story 11.7: Remove Deprecated Advanced Rate Types

As a **system maintainer**,  
I want deprecated advanced rate types removed from the system,  
So that the codebase is cleaner and easier to maintain.

**Related FRs:** Code maintenance.

**Acceptance Criteria:**

**Given** deprecated rate types exist in the database,  
**When** the migration runs,  
**Then** all deprecated types are removed or converted to supported types.

**Given** I view advanced rate configuration,  
**When** I create or edit rates,  
**Then** only current, supported rate types are available.

**Prerequisites:** Stories 9.2 (Advanced rates), database migration framework.

**Technical Notes:**

- Identified and removed deprecated rate types from codebase
- Created migration scripts to handle existing data
- Updated documentation and UI components
- Added validation to prevent creation of deprecated types

---

### Story 11.8: Implement Full Responsive Design Mobile Sidebar

As a **mobile user**,  
I want the application to be fully responsive with a mobile-optimized sidebar,  
So that I can use the application effectively on mobile devices.

**Related FRs:** Mobile UX requirements.

**Acceptance Criteria:**

**Given** I access the application on a mobile device,  
**When** the page loads,  
**Then** the sidebar is optimized for mobile use with touch-friendly controls.

**Given** I navigate between pages on mobile,  
**When** I interact with the sidebar,  
**Then** all interactions work smoothly with touch gestures.

**Prerequisites:** Story 11.6 (Collapsible sidebar), responsive design framework.

**Technical Notes:**

- Implemented mobile-first responsive design
- Added touch gesture support for sidebar interactions
- Optimized sidebar for mobile screens with appropriate sizing
- Tested across various mobile device sizes

---

## Epic 12: Partner-Specific Pricing & Contract Enhancements

**Goal:** Implement partner-specific pricing schemas, override support, and contract management UI to handle complex B2B pricing arrangements.

### Story 12.1: Implement Partner-Specific Pricing Schema

As a **pricing manager**,  
I want to define specific pricing schemas for each partner,  
So that B2B contracts can be accommodated with custom pricing rules.

**Related FRs:** FR2 (Partner contracts), FR11 (Engagement Rule).

**Acceptance Criteria:**

**Given** I am editing a partner contact,  
**When** I access the pricing section,  
**Then** I can define custom pricing rules and overrides for this partner.

**Given** I create a quote for this partner,  
**When** the pricing engine runs,  
**Then** it applies the partner-specific rules before global rules.

**Prerequisites:** Stories 2.1–2.2 (Partner contacts and contracts), Stories 3.1–3.2 (Zone routes and grids).

**Technical Notes:**

- Extended Contact model with partner pricing schema
- Added validation for partner-specific rules
- Implemented priority handling between partner and global rules
- Created partner contract configuration data structures

---

### Story 12.2: Implement Pricing Engine Override Support

As a **pricing engine**,  
I want to support partner-specific pricing overrides,  
So that B2B pricing rules are applied correctly.

**Related FRs:** FR11 (Engagement Rule), FR16 (Operator override).

**Acceptance Criteria:**

**Given** a partner with specific pricing overrides,  
**When** a quote is created for this partner,  
**Then** the pricing engine applies the partner-specific rules.

**Given** conflicting rules exist,  
**When** the engine processes pricing,  
**Then** partner rules take priority over global organization rules.

**Prerequisites:** Stories 4.1–4.3 (Dynamic pricing), Story 12.1 (Partner schema).

**Technical Notes:**

- Modified pricing engine to check for partner overrides
- Added override priority logic and conflict resolution
- Implemented override tracking in appliedRules
- Created override validation and audit trail

---

### Story 12.3: Implement Partner Contract Override UI

As a **pricing administrator**,  
I want a user interface to manage partner contract overrides,  
So that I can easily configure and maintain B2B pricing agreements.

**Related FRs:** FR2 (Partner contracts), FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I access a partner's contract settings,  
**When** I configure pricing overrides,  
**Then** I can set custom prices, multipliers, and rules for this partner.

**Given** I assign rate grids to a partner,  
**When** I save the configuration,  
**Then** the assignments are visible in both CRM and pricing interfaces.

**Prerequisites:** Stories 12.1–12.2 (Partner schema and engine support), Stories 3.1–3.3 (Zone and grid management).

**Technical Notes:**

- Created partner contract configuration UI
- Added override validation and conflict detection
- Implemented bulk override operations
- Added bidirectional sync between CRM and pricing interfaces

---

## Epic 13: Pricing UI Improvements & Partner Filtering

**Goal:** Fix pricing UI translations and add partner filtering to pricing pages for better user experience and data management.

### Story 13.1: Fix Pricing UI Translations

As a **user**,  
I want all pricing UI elements to be properly translated,  
So that I can understand and use the pricing interface in my preferred language.

**Related FRs:** Localization requirements.

**Acceptance Criteria:**

**Given** I access any pricing page,  
**When** the page loads,  
**Then** all text elements are properly translated.

**Given** I switch between languages,  
**When** the page updates,  
**Then** all pricing-specific translations update correctly.

**Prerequisites:** Translation framework and internationalization setup.

**Technical Notes:**

- Fixed missing translation keys for pricing components
- Updated translation files with comprehensive pricing terminology
- Added translation validation for pricing forms and labels
- Implemented context-aware translations for pricing rules

---

### Story 13.2: Implement Pricing Pages Partner Filter

As a **pricing administrator**,  
I want to filter pricing configurations by partner,  
So that I can easily manage partner-specific pricing rules.

**Related FRs:** FR2 (Partner contracts), FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I access pricing configuration pages,  
**When** I apply a partner filter,  
**Then** only configurations for the selected partner are shown.

**Given** I view zone routes or pricing grids,  
**When** I select a partner,  
**Then** the display shows only routes/grids assigned to that partner.

**Prerequisites:** Stories 12.1–12.3 (Partner pricing and contracts), Stories 9.1–9.4 (Pricing configuration pages).

**Technical Notes:**

- Added partner filter components to pricing pages
- Implemented filter state management and persistence
- Added partner-specific configuration search functionality
- Created partner assignment indicators on pricing items

---

## Epic 14: Flexible Route Pricing System

**Goal:** Extend the zone-to-zone pricing model to support multi-zone origins/destinations and specific address-based pricing with interactive map selection.

### Story 14.1: Fix Vehicle Category Dropdown Bug

As a **pricing administrator**,  
I want the vehicle category dropdown to work correctly,  
So that I can create and edit routes with the proper vehicle category.

**Related FRs:** FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am on the pricing routes page,  
**When** I open the route creation/edit drawer,  
**Then** the vehicle category dropdown displays all available categories.

**Given** I select any category and save the route,  
**When** I view the route list,  
**Then** the route is saved with the correct vehicle category.

**Prerequisites:** Stories 1.1 (VehicleCategory model), 3.1 (Zone routes).

**Technical Notes:**

- Root cause: Frontend called `/api/vtc/vehicles/categories` but API is mounted at `/api/vtc/vehicle-categories`
- Fix applied to 4 files: routes page, settings/pricing/routes, dispos, excursions
- Updated API endpoint references in all pricing components

---

### Story 14.2: Extend ZoneRoute Schema for Multi-Zone & Address Support

As a **system architect**,  
I want the ZoneRoute schema to support multiple zones and specific addresses,  
So that the pricing engine can handle flexible route definitions.

**Related FRs:** FR8 (Geographic zones), FR9 (Route matrix).

**Acceptance Criteria:**

**Given** the new Prisma schema,  
**When** I create a route with multiple origin zones,  
**Then** the zones are stored in `ZoneRouteOriginZone` junction table.

**Given** I create a route with a specific address origin,  
**When** I save the route,  
**Then** `originType = ADDRESS` and address fields are populated.

**Given** existing routes in the database,  
**When** the migration runs,  
**Then** all existing routes are migrated to the new schema with backward compatibility.

**Prerequisites:** Stories 1.1 (Prisma models), 3.1 (ZoneRoute model), database migration framework.

**Technical Notes:**

- Added `OriginDestinationType` enum (ZONES, ADDRESS)
- Created `ZoneRouteOriginZone` and `ZoneRouteDestinationZone` junction tables
- Made `fromZoneId`/`toZoneId` nullable for backward compatibility
- Data migration script migrated 40 existing routes
- Added new address fields: `originPlaceId`, `originAddress`, `originLat`, `originLng`

---

### Story 14.3: Update Pricing UI for Flexible Routes

As a **pricing administrator**,  
I want the route creation UI to support multi-zone and address selection,  
So that I can configure flexible pricing routes.

**Related FRs:** FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am creating a new route,  
**When** I select "Zones" as origin type,  
**Then** I can select multiple zones from a multi-select dropdown.

**Given** I select "Address" as origin type,  
**When** I configure the route,  
**Then** I can search and select a specific address via Google Places autocomplete.

**Given** I configure both origin and destination,  
**When** I save the route,  
**Then** the route is created with the correct type and data structure.

**Prerequisites:** Stories 14.2 (Schema changes), 10.1 (Google Maps integration), 11.1 (Zone management).

**Technical Notes:**

- Created dynamic form components for origin/destination type selection
- Integrated Google Places Autocomplete for address selection
- Added multi-select zone dropdown with search functionality
- Implemented form validation for different route types

---

### Story 14.4: Implement Interactive Map for Zone Selection

As a **pricing administrator**,  
I want to select zones visually on an interactive map,  
So that I can easily identify and configure route pricing without memorizing zone names.

**Related FRs:** FR8 (Geographic zones).

**Acceptance Criteria:**

**Given** I am configuring a route origin or destination,  
**When** I click on "Select zones on map" button,  
**Then** a map dialog opens showing all existing zones with their boundaries.

**Given** the zone map dialog is open,  
**When** I click on zone polygons/areas on the map,  
**Then** I can select/deselect multiple zones visually (toggle selection).

**Given** I have selected zones on the map,  
**When** I click "Confirm",  
**Then** the selected zones are applied to the origin/destination field.

**Prerequisites:** Stories 11.1 (Interactive zone map), 14.3 (Route form UI), 10.1 (Google Maps integration).

**Technical Notes:**

- Created zone selection map dialog component
- Implemented visual zone highlighting and selection states
- Added zone boundary rendering from geometry data
- Integrated with existing zone management components
- Added zone information tooltips on hover

---

### Story 14.5: Update Pricing Engine for Multi-Zone Routes

As a **system**,  
I want the pricing engine to match trips against multi-zone routes,  
So that flexible pricing configurations are applied correctly.

**Related FRs:** FR9 (Route matrix), FR24 (Profitability calculation).

**Acceptance Criteria:**

**Given** a trip from Zone A to Zone B,  
**When** there exists a route with origin zones [A, C, D] and destination zone [B],  
**Then** the route matches and the fixed price is applied.

**Given** a trip from a specific address within Zone A to Zone B,  
**When** both an address-based route and a zone-based route exist,  
**Then** the address-based route takes priority over zone-based routes.

**Given** a bidirectional route with multi-zones,  
**When** a trip goes in reverse direction,  
**Then** the route matches correctly in both directions.

**Prerequisites:** Stories 14.2 (Schema), 14.3 (UI), 4.1–4.3 (Dynamic pricing engine).

**Technical Notes:**

- Extended `ZoneRouteAssignment` interface with multi-zone and address fields
- Updated `matchZoneRouteWithDetails` function for multi-zone matching
- Implemented priority order: ADDRESS > ZONES > Legacy
- Added address proximity matching with 100m threshold
- Maintained backward compatibility with legacy `fromZoneId`/`toZoneId` routes

---

### Story 14.6: Assign Rate Grids to Partners from Pricing UI

As a **pricing administrator**,  
I want to assign zone routes, excursion packages, and dispo packages to partners directly from the pricing configuration pages,  
So that I can efficiently manage which partners have access to which rate grids without navigating to each contact individually.

**Related FRs:** FR2 (Partner contracts), FR37 (Admin configuration).

**Acceptance Criteria:**

**Given** I am on `/settings/pricing/routes`,  
**When** I click the "Assign Partners" button on a route row,  
**Then** a dialog opens showing all available partners with checkboxes and optional override price inputs.

**Given** I save the assignments,  
**When** I view the pricing UI,  
**Then** the assignments are persisted and visible both in the pricing UI and in the partner's contact page.

**Given** I view excursion packages or dispo packages,  
**When** I access the assignment features,  
**Then** the same partner assignment functionality is available.

**Prerequisites:** Stories 12.1–12.3 (Partner pricing), 14.2–14.5 (Flexible routes), 3.3 (Excursion/Dispo packages).

**Technical Notes:**

- Created partner assignment dialog component for pricing items
- Added API endpoints for partner assignments by route/package ID
- Implemented bidirectional sync with existing PartnerContractForm
- Added partner count badges on pricing list items
- Created bulk assignment and removal operations

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

## Epic 17: Advanced Zone Resolution, Compliance Integration & Driver Availability

**Goal:** Implement the advanced pricing and operational features identified in the gap analysis: configurable zone conflict resolution strategies, automatic compliance-driven staffing integration into pricing, driver calendar/availability model, weighted day/night rates, time buckets for MAD pricing, zone surcharges, route segmentation, and TCO enrichment.

**Related FRs:** FR61–FR77.

**Dependencies:** Epic 3 (Zone Engine), Epic 4 (Dynamic Pricing), Epic 5 (Fleet & RSE Compliance), Epic 8 (Dispatch), Epic 15 (Pricing Engine Accuracy), Epic 16 (Quote System Refactoring).

---

### Story 17.1: Configurable Zone Conflict Resolution Strategy

As an **administrator**,  
I want to configure how the system resolves conflicts when a point falls within multiple overlapping zones,  
So that pricing behaviour is predictable and aligned with our business strategy.

**Related FRs:** FR61, FR62.

**Acceptance Criteria:**

**Given** an organisation with overlapping pricing zones (e.g., PARIS_20 and CDG zones overlap near Roissy),  
**When** an admin navigates to Organisation Pricing Settings,  
**Then** they shall see a "Zone Conflict Resolution Strategy" dropdown with options: PRIORITY, MOST_EXPENSIVE, CLOSEST, COMBINED.

**And** when PRIORITY is selected, the system shall resolve conflicts by selecting the zone with the highest `priority` field value.

**And** when MOST_EXPENSIVE is selected, the system shall resolve conflicts by selecting the zone with the highest `priceMultiplier`.

**And** when CLOSEST is selected, the system shall resolve conflicts by selecting the zone whose center/centroid is closest to the point.

**And** when COMBINED is selected, the system shall first filter by priority, then by multiplier among equal-priority zones.

**Technical Notes:**

- Add `zoneConflictStrategy` enum field to `OrganizationPricingSettings` in schema.prisma.
- Add optional `priority` Int field to `PricingZone`.
- Update `geo-utils.ts` zone resolution logic to respect the configured strategy.
- Add UI controls in pricing settings page.

**Prerequisites:** Epic 3 (Zone Engine), Epic 11 (Zone Management UI).

---

### Story 17.2: Configurable Zone Multiplier Aggregation Strategy

As an **administrator**,  
I want to configure how pickup and dropoff zone multipliers are combined,  
So that I can choose whether to use the maximum, average, or single-zone multiplier for pricing.

**Related FRs:** FR63.

**Acceptance Criteria:**

**Given** an organisation with pricing zones configured,  
**When** an admin navigates to Organisation Pricing Settings,  
**Then** they shall see a "Zone Multiplier Aggregation" dropdown with options: MAX, PICKUP_ONLY, DROPOFF_ONLY, AVERAGE.

**And** when MAX is selected (default), the system shall use `Math.max(pickupMultiplier, dropoffMultiplier)`.

**And** when PICKUP_ONLY is selected, the system shall use only the pickup zone multiplier.

**And** when DROPOFF_ONLY is selected, the system shall use only the dropoff zone multiplier.

**And** when AVERAGE is selected, the system shall use `(pickupMultiplier + dropoffMultiplier) / 2`.

**Technical Notes:**

- Add `zoneMultiplierAggregationStrategy` enum field to `OrganizationPricingSettings`.
- Update `applyZoneMultiplier` function in `pricing-engine.ts` to respect the configured strategy.
- Add UI controls in pricing settings page.

**Prerequisites:** Story 17.1.

---

### Story 17.3: Automatic Compliance-Driven Staffing Integration

As an **operator**,  
I want the system to automatically select the best compliant staffing plan when RSE violations are detected,  
So that I see the final price including all necessary staffing costs without manual intervention.

**Related FRs:** FR64, FR65.

**Acceptance Criteria:**

**Given** a quote request for a heavy vehicle trip that would violate RSE regulations (e.g., >10h driving),  
**When** the pricing engine calculates the quote,  
**Then** it shall automatically call the compliance validator to detect violations.

**And** when violations are detected, the system shall generate alternative staffing plans (double crew, relay driver, multi-day).

**And** the system shall automatically select the best plan according to the configured `staffingSelectionPolicy` (CHEAPEST, FASTEST, PREFER_INTERNAL).

**And** the selected plan's additional costs (second driver, hotel, meals, premiums) shall be added to the quote price.

**And** the selected staffing plan details shall be stored in `tripAnalysis.compliancePlan` for transparency.

**And** the quote UI shall display the staffing plan summary (e.g., "Double crew required: +€300").

**Technical Notes:**

- Add `staffingSelectionPolicy` enum field to `OrganizationPricingSettings`.
- Integrate `compliance-validator.ts` into `pricing-calculate.ts` flow.
- Add `compliancePlan` field to `TripAnalysis` interface.
- Update quote UI to display staffing plan when applicable.

**Prerequisites:** Epic 5 (Fleet & RSE Compliance Engine).

---

### Story 17.4: Configurable Staffing Cost Parameters

As an **administrator**,  
I want to configure all staffing-related cost parameters at the organisation level,  
So that pricing reflects our actual operational costs without hardcoded values.

**Related FRs:** FR66.

**Acceptance Criteria:**

**Given** an admin navigating to Organisation Pricing Settings,  
**When** they access the "Staffing Costs" section,  
**Then** they shall see editable fields for:

- Hotel cost per night (EUR)
- Meal cost per day (EUR)
- Driver overnight premium (EUR)
- Second driver hourly rate (EUR)
- Relay driver fixed fee (EUR)

**And** all fields shall have sensible defaults but no hardcoded business values in the code.

**And** the compliance validator shall read these values from settings when calculating staffing plan costs.

**Technical Notes:**

- Add staffing cost fields to `OrganizationPricingSettings` in schema.prisma.
- Update `compliance-validator.ts` to use settings instead of constants.
- Add UI section in pricing settings page.

**Prerequisites:** Story 17.3.

---

### Story 17.5: Quote Estimated End Time (estimatedEndAt)

As a **dispatcher**,  
I want each quote to store an estimated end time,  
So that driver availability can be accurately calculated based on mission windows.

**Related FRs:** FR67.

**Acceptance Criteria:**

**Given** a quote with `pickupAt` and calculated `totalDurationMinutes` from tripAnalysis,  
**When** the quote is created or updated,  
**Then** the system shall calculate and store `estimatedEndAt = pickupAt + totalDurationMinutes`.

**And** the `estimatedEndAt` field shall be visible in the quote detail view.

**And** the field shall be recalculated whenever the trip duration changes (route change, trip type change).

**Technical Notes:**

- Add `estimatedEndAt DateTime?` field to `Quote` model in schema.prisma.
- Update quote creation/update logic to calculate and persist this value.
- Update quote UI to display the estimated end time.

**Prerequisites:** Epic 16 (Quote System Refactoring).

---

### Story 17.6: Driver Calendar Events Model

As a **dispatcher**,  
I want to record driver unavailability periods (holidays, sick leave, personal time),  
So that the system knows when drivers are not available for missions.

**Related FRs:** FR68.

**Acceptance Criteria:**

**Given** a driver in the system,  
**When** a dispatcher or admin creates a calendar event for that driver,  
**Then** the event shall be stored with: driverId, startAt, endAt, eventType (HOLIDAY, SICK, PERSONAL, OTHER), and optional notes.

**And** the driver's profile or dispatch view shall display upcoming unavailability periods.

**And** calendar events shall be editable and deletable by authorised users.

**Technical Notes:**

- Add `DriverCalendarEvent` model to schema.prisma with fields: id, driverId, organizationId, startAt, endAt, eventType, notes, createdAt, updatedAt.
- Add API routes for CRUD operations on calendar events.
- Add UI for managing driver calendar events (can be integrated into driver detail page or dispatch).

**Prerequisites:** Epic 5 (Fleet & RSE Compliance Engine).

---

### Story 17.7: Driver Availability Overlap Detection

As a **dispatcher**,  
I want the system to automatically exclude unavailable drivers from vehicle selection,  
So that I only see drivers who are actually available for the proposed mission.

**Related FRs:** FR69.

**Acceptance Criteria:**

**Given** a quote with `pickupAt` and `estimatedEndAt` defining the mission window,  
**When** the vehicle selection algorithm runs,  
**Then** it shall exclude drivers who have:

- Existing missions whose `[pickupAt, estimatedEndAt]` overlaps with the proposed mission window.
- Calendar events whose `[startAt, endAt]` overlaps with the proposed mission window.

**And** the dispatch UI shall indicate why certain drivers are unavailable (mission conflict or calendar event).

**Technical Notes:**

- Update `vehicle-selection.ts` to query and filter by driver availability.
- Add overlap detection logic using `estimatedEndAt` from quotes and calendar events.
- Update dispatch UI to show availability status.

**Prerequisites:** Story 17.5, Story 17.6.

---

### Story 17.8: Weighted Day/Night Rate Application

As an **operator**,  
I want night rates to be applied proportionally for trips that span day and night periods,  
So that pricing is fair for trips that start during the day and end at night (or vice versa).

**Related FRs:** FR70.

**Acceptance Criteria:**

**Given** an organisation with night rate configured (e.g., 22:00-06:00, +20%),  
**When** a trip starts at 20:00 and ends at 23:00 (3 hours total, 1 hour in night period),  
**Then** the night rate shall be applied proportionally: 1/3 of the trip at night rate.

**And** the applied rules shall show the weighted calculation: "Night rate applied to 33% of trip duration".

**And** the calculation shall use `pickupAt` and `estimatedEndAt` to determine the overlap with night period.

**Technical Notes:**

- Update `isNightTime` logic in `pricing-engine.ts` to calculate overlap percentage.
- Add weighted multiplier calculation based on time overlap.
- Update `appliedRules` to show weighted calculation details.

**Prerequisites:** Story 17.5.

---

### Story 17.9: Configurable Time Buckets for MAD Pricing

As an **administrator**,  
I want to configure time buckets for mise-à-disposition pricing with interpolation strategies,  
So that pricing is predictable for any requested duration.

**Related FRs:** FR71.

**Acceptance Criteria:**

**Given** an admin navigating to Organisation Pricing Settings,  
**When** they access the "Time Buckets" section,  
**Then** they shall see a configurable list of time buckets (e.g., 3h, 4h, 6h, 8h, 10h) with prices per bucket.

**And** they shall see an "Interpolation Strategy" dropdown with options: ROUND_UP, ROUND_DOWN, PROPORTIONAL.

**And** when ROUND_UP is selected, a 5h request shall use the 6h bucket price.

**And** when ROUND_DOWN is selected, a 5h request shall use the 4h bucket price.

**And** when PROPORTIONAL is selected, a 5h request shall interpolate between 4h and 6h bucket prices.

**Technical Notes:**

- Add `TimeBucket` model or JSON field to `OrganizationPricingSettings`.
- Add `timeBucketInterpolationStrategy` enum field.
- Update MAD pricing logic in `pricing-engine.ts` to use buckets and interpolation.
- Add UI for managing time buckets.

**Prerequisites:** Epic 16 (Quote System Refactoring - Story 16.8 Dispo pricing).

---

### Story 17.10: Zone Fixed Surcharges (Friction Costs)

As an **administrator**,  
I want to configure fixed surcharges per zone (parking fees, access fees),  
So that operational costs are automatically included when trips involve zones with known friction costs.

**Related FRs:** FR72.

**Acceptance Criteria:**

**Given** a pricing zone (e.g., VERSAILLES),  
**When** an admin edits the zone configuration,  
**Then** they shall see optional fields for:

- Fixed parking surcharge (EUR)
- Fixed access fee (EUR)
- Surcharge description (text)

**And** when a trip involves this zone (pickup or dropoff), the surcharges shall be automatically added to the operational cost.

**And** the cost breakdown shall show the zone surcharges as separate line items.

**Technical Notes:**

- Add `fixedParkingSurcharge`, `fixedAccessFee`, `surchargeDescription` fields to `PricingZone`.
- Update `calculateCostBreakdown` in `pricing-engine.ts` to include zone surcharges.
- Update zone editor UI to include surcharge fields.

**Prerequisites:** Epic 11 (Zone Management UI).

---

### Story 17.11: Zone Topology Validation Tools

As an **administrator**,  
I want the system to detect and warn about zone configuration issues,  
So that I can ensure complete and consistent zone coverage.

**Related FRs:** FR73.

**Acceptance Criteria:**

**Given** an admin viewing the zone management page,  
**When** they click "Validate Zone Topology",  
**Then** the system shall analyse all zones and report:

- Overlapping zones (with details of which zones overlap)
- Coverage gaps (areas not covered by any zone)
- Zones with missing required fields (no multiplier, no priority when using PRIORITY strategy)

**And** warnings shall be displayed in a clear list with zone names and suggested actions.

**And** the validation shall be non-blocking (zones can still be saved with warnings).

**Technical Notes:**

- Add API endpoint for zone topology validation.
- Implement overlap detection using GeoJSON intersection.
- Add UI component for displaying validation results.

**Prerequisites:** Epic 11 (Zone Management UI).

---

### Story 17.12: Driver Home Location for Deadhead Calculations

As an **administrator**,  
I want to optionally configure driver home locations,  
So that deadhead calculations can use driver home instead of vehicle base when appropriate.

**Related FRs:** FR74.

**Acceptance Criteria:**

**Given** a driver profile,  
**When** an admin edits the driver,  
**Then** they shall see optional fields for home location (latitude, longitude, address).

**And** when configured, the vehicle selection algorithm shall offer an option to use driver home as the approach origin.

**And** the organisation settings shall include a toggle: "Use driver home for deadhead when available".

**Technical Notes:**

- Add `homeLat`, `homeLng`, `homeAddress` optional fields to `Driver` model.
- Update `vehicle-selection.ts` to optionally use driver home location.
- Add organisation setting for this behaviour.
- Update driver edit UI.

**Prerequisites:** Epic 5 (Fleet & RSE Compliance Engine).

---

### Story 17.13: Route Segmentation for Multi-Zone Trips

As an **operator**,  
I want the system to calculate pricing based on the actual distance spent in each zone along the route,  
So that pricing accurately reflects the geographic complexity of multi-zone trips.

**Related FRs:** FR75.

**Acceptance Criteria:**

**Given** a trip that crosses multiple pricing zones (e.g., PARIS_0 → PARIS_20 → CDG),  
**When** the pricing engine calculates the quote,  
**Then** it shall decode the route polyline and calculate the distance/duration spent in each zone.

**And** zone-specific multipliers and surcharges shall be applied proportionally based on segment lengths.

**And** the tripAnalysis shall include a `zoneSegments` array showing each zone crossed with distance and duration.

**And** the applied rules shall show the segmented calculation for transparency.

**Technical Notes:**

- Add polyline decoding utility (Google Polyline format).
- Implement route segmentation logic that intersects polyline with zone geometries.
- Update pricing calculation to apply zone rules per segment.
- Add `zoneSegments` field to `TripAnalysis` interface.

**Prerequisites:** Story 17.1, Story 17.2.

---

### Story 17.14: Vehicle TCO Model Enrichment

As an **administrator**,  
I want to configure detailed vehicle cost parameters (depreciation, maintenance, energy),  
So that shadow cost calculations reflect true total cost of ownership.

**Related FRs:** FR76.

**Acceptance Criteria:**

**Given** a vehicle in the fleet,  
**When** an admin edits the vehicle,  
**Then** they shall see optional TCO fields:

- Purchase price (EUR)
- Expected lifespan (km or years)
- Annual maintenance budget (EUR)
- Insurance cost per year (EUR)
- Depreciation method (LINEAR, DECLINING_BALANCE)

**And** the shadow cost calculation shall include a TCO component based on distance driven.

**And** the cost breakdown shall show TCO as a separate line item when configured.

**Technical Notes:**

- Add TCO fields to `Vehicle` or `VehicleCategory` model.
- Add TCO calculation logic to `pricing-engine.ts`.
- Update vehicle edit UI.
- This is an enrichment of the existing `wear` cost component.

**Prerequisites:** Epic 5 (Fleet & RSE Compliance Engine).

---

### Story 17.15: Client Difficulty Score (Patience Tax)

As an **administrator**,  
I want to configure difficulty scores for clients that trigger automatic price adjustments,  
So that pricing reflects the additional operational burden of difficult clients.

**Related FRs:** FR77.

**Acceptance Criteria:**

**Given** a contact in the CRM,  
**When** an admin edits the contact,  
**Then** they shall see an optional "Difficulty Score" field (1-5 scale or similar).

**And** the organisation settings shall include a "Difficulty Multiplier Table" mapping scores to price multipliers (e.g., score 5 = +10%).

**And** when a quote is created for a client with a difficulty score, the multiplier shall be applied automatically.

**And** the applied rules shall show "Client difficulty adjustment: +X%".

**Technical Notes:**

- Add `difficultyScore` optional Int field to `Contact` model.
- Add difficulty multiplier configuration to `OrganizationPricingSettings`.
- Update pricing engine to apply difficulty multiplier.
- Update contact edit UI.

**Prerequisites:** Epic 2 (CRM & Partner Contracts).

---

### Story 17.16: FR Group 9 Settings UI Integration

As an **administrator**,  
I want all Epic 17 configuration options to be accessible from a unified settings interface,  
So that I can manage advanced pricing and operational settings in one place.

**Related FRs:** FR61–FR77 (all).

**Acceptance Criteria:**

**Given** an admin navigating to Organisation Settings,  
**When** they access the "Advanced Pricing & Operations" section,  
**Then** they shall see organised subsections for:

- Zone Resolution (conflict strategy, multiplier aggregation)
- Compliance & Staffing (staffing policy, cost parameters)
- Time-Based Pricing (day/night weighting, time buckets)
- Zone Surcharges (link to zone editor)
- TCO & Costs (link to vehicle settings)
- Client Scoring (difficulty multipliers)

**And** all settings shall have clear labels, help text, and validation.

**And** changes shall be saved and applied immediately to new quotes.

**Prerequisites:** All previous Story 17.x stories.

---

### Summary

Epic 17 addresses the gaps identified in the pricing gap analysis by:

1. **Zone conflict resolution** (Stories 17.1-17.2): Configurable strategies for handling overlapping zones and combining multipliers.
2. **Compliance integration** (Stories 17.3-17.4): Automatic staffing plan selection with configurable costs.
3. **Driver availability** (Stories 17.5-17.7): Mission windows and calendar events for accurate availability.
4. **Advanced pricing rules** (Stories 17.8-17.9): Weighted day/night rates and time bucket interpolation.
5. **Zone enrichment** (Stories 17.10-17.11, 17.13): Surcharges, topology validation, and route segmentation.
6. **Operational cost enrichment** (Stories 17.12, 17.14): Driver home location and vehicle TCO.
7. **CRM enrichment** (Story 17.15): Client difficulty scoring.
8. **Settings integration** (Story 17.16): Unified configuration UI.

This epic depends on and extends the work done in Epics 3, 4, 5, 8, 11, 15, and 16.

---

## Epic 18: Advanced Geospatial, Route Optimization & Yield Management

**Goal:** Implement the advanced geospatial and yield management features from the Neural-Fleet architecture: corridor zones, automatic transfer-to-MAD switching, loss of exploitation calculation, multi-scenario route optimization, transversal trip decomposition, shadow fleet integration, and fixed temporal vectors.

**Related FRs:** FR78–FR88.

**Dependencies:** Epic 3 (Zone Engine), Epic 4 (Dynamic Pricing), Epic 8 (Dispatch), Epic 14 (Flexible Routes), Epic 17 (Advanced Zone Resolution).

---

### Story 18.1: Corridor Zone Type (Highway Buffers)

As an **administrator**,  
I want to define corridor zones as buffer areas around specific road polylines (highways, ring roads),  
So that trips using these corridors can be priced differently from trips on alternative routes.

**Related FRs:** FR78.

**Acceptance Criteria:**

**Given** an admin in the zone management interface,  
**When** they create a new zone and select type "CORRIDOR",  
**Then** they shall be able to draw or import a polyline representing the road axis.

**And** they shall specify a buffer distance (in meters) to create the corridor zone geometry.

**And** the system shall generate the zone geometry using ST_Buffer on the polyline.

**And** trips whose route polyline intersects the corridor zone shall have the corridor's pricing rules applied to the intersecting segment.

**Technical Notes:**

- Add `CORRIDOR` to PricingZone.type enum in schema.prisma.
- Store the source polyline and buffer distance alongside the generated geometry.
- Update geo-utils.ts to handle corridor intersection detection.
- Update zone editor UI to support polyline drawing for corridors.

**Prerequisites:** Epic 11 (Zone Management UI), Story 17.13 (Route Segmentation).

---

### Story 18.2: Automatic Transfer-to-MAD Detection (Dense Zone)

As an **operator**,  
I want the system to automatically suggest switching to MAD pricing when a trip is within a dense zone,  
So that I don't lose money on distance-based pricing when commercial speed is too low.

**Related FRs:** FR79.

**Acceptance Criteria:**

**Given** a quote request for a transfer within the central dense zone (Z_0),  
**When** the pricing engine calculates the quote,  
**Then** it shall estimate the commercial speed based on distance and duration.

**And** if the commercial speed is below a configurable threshold (e.g., 15 km/h),  
**Then** the system shall flag the quote with a suggestion: "Consider MAD pricing for better profitability".

**And** the operator shall see a comparison: transfer price vs. equivalent MAD price.

**And** the organisation settings shall include a toggle to enable automatic switching (vs. suggestion only).

**Technical Notes:**

- Add `denseZoneSpeedThreshold` and `autoSwitchToMAD` fields to OrganizationPricingSettings.
- Update pricing-calculate.ts to detect dense zone trips and calculate commercial speed.
- Add UI alert/suggestion component in quote creation.

**Prerequisites:** Epic 16 (Quote System Refactoring).

---

### Story 18.3: Round-Trip to MAD Automatic Detection

As an **operator**,  
I want the system to automatically detect when a round-trip should be priced as MAD instead of two transfers,  
So that I don't undercharge for trips where the driver is effectively blocked on-site.

**Related FRs:** FR80, FR88.

**Acceptance Criteria:**

**Given** a quote request for a round-trip (outbound and return on the same day),  
**When** the pricing engine calculates the quote,  
**Then** it shall calculate the waiting time on-site between outbound arrival and return departure.

**And** it shall calculate the time required for the driver to return to base and come back.

**And** if `waitingTime < returnTime + configuredBuffer`, the system shall flag: "Driver blocked on-site, recommend MAD pricing".

**And** the system shall show a comparison: 2x transfer price vs. MAD price for the total duration.

**And** the organisation settings shall include configurable thresholds: minimum waiting time, maximum return distance.

**Technical Notes:**

- Add `minWaitingTimeForSeparateTransfers` and `maxReturnDistanceKm` to OrganizationPricingSettings.
- Update quote creation logic to detect round-trip patterns.
- Add comparison UI showing both pricing options.

**Prerequisites:** Story 18.2.

---

### Story 18.4: Loss of Exploitation (Opportunity Cost) Calculation

As an **operator**,  
I want the system to calculate and include loss of exploitation for multi-day missions,  
So that the quote reflects the true cost of immobilizing a vehicle at a remote location.

**Related FRs:** FR81.

**Acceptance Criteria:**

**Given** a multi-day mission where the vehicle is immobilized at a remote location for one or more days,  
**When** the pricing engine calculates the quote,  
**Then** it shall identify the "idle days" (days where the vehicle is on-site but not working).

**And** it shall calculate the daily reference revenue for the vehicle category (e.g., 8h MAD price).

**And** it shall apply a seasonality coefficient: high season (configurable, e.g., 80%), low season (e.g., 50%).

**And** the loss of exploitation shall be added to the quote: `idleDays × dailyRevenue × seasonalityCoefficient`.

**And** the tripAnalysis shall show the loss of exploitation as a separate cost component.

**Technical Notes:**

- Add `dailyReferenceRevenue` per vehicle category and `seasonalityCoefficients` (by date range) to settings.
- Update compliance-validator.ts or pricing-engine.ts to detect idle days in multi-day missions.
- Add loss of exploitation to cost breakdown.

**Prerequisites:** Story 17.3 (Compliance Integration).

---

### Story 18.5: Stay vs. Return Empty Scenario Comparison

As an **operator**,  
I want the system to compare "stay on-site" vs. "return empty" scenarios for multi-day missions,  
So that I can choose the most economical option for the client and the company.

**Related FRs:** FR82.

**Acceptance Criteria:**

**Given** a multi-day mission with idle days at a remote location,  
**When** the pricing engine calculates the quote,  
**Then** it shall calculate two scenarios:

**Scenario A (Stay on-site):**

- Hotel cost × nights
- Meal cost × days
- Driver overnight premium × nights
- Loss of exploitation × idle days

**Scenario B (Return empty):**

- Empty return trip cost (fuel, tolls, driver time)
- Empty outbound trip cost for pickup day
- No hotel/meal/premium costs

**And** the system shall recommend the cheaper option with a clear cost comparison.

**And** the operator shall be able to override and select either option.

**Technical Notes:**

- Implement scenario comparison logic in pricing-engine.ts.
- Add UI component showing both scenarios with costs.
- Store selected scenario in quote for transparency.

**Prerequisites:** Story 18.4.

---

### Story 18.6: Multi-Scenario Route Optimization (min(T), min(D), min(TCO))

As an **operator**,  
I want the system to simulate three route scenarios and recommend the optimal one,  
So that I can balance speed, distance, and total cost for each trip.

**Related FRs:** FR83.

**Acceptance Criteria:**

**Given** a quote request with pickup and dropoff locations,  
**When** the pricing engine calculates the quote,  
**Then** it shall request three route scenarios from the routing API:

**Scenario min(T):** Fastest route (pessimistic traffic model).
**Scenario min(D):** Shortest distance route.
**Scenario min(TCO):** Route optimizing total cost (time × driver rate + distance × km rate + tolls + fuel).

**And** the system shall display all three scenarios with their respective: duration, distance, toll cost, fuel cost, total internal cost.

**And** the system shall recommend the min(TCO) scenario by default but allow operator selection.

**And** the selected scenario shall be used for the quote price calculation.

**Technical Notes:**

- Update toll-service.ts to support multiple route requests.
- Add route scenario comparison logic to pricing-engine.ts.
- Add UI component for scenario selection.
- Cache route scenarios to avoid repeated API calls.

**Prerequisites:** Epic 15 (Pricing Engine Accuracy).

---

### Story 18.7: Transversal Trip Decomposition

As an **operator**,  
I want the system to automatically decompose transversal trips crossing multiple zones,  
So that pricing accurately reflects the complexity of multi-zone journeys.

**Related FRs:** FR84.

**Acceptance Criteria:**

**Given** a trip that crosses multiple zones (e.g., Versailles → Disney via Paris),  
**When** the pricing engine calculates the quote,  
**Then** it shall detect zone transitions along the route polyline.

**And** it shall decompose the trip into logical segments (e.g., Versailles→Paris, Paris→Disney).

**And** it shall apply the hierarchical pricing algorithm to each segment.

**And** it shall optionally apply a transit discount for the intermediate zone (configurable).

**And** the final price shall be the sum of segment prices minus any transit discounts.

**And** the tripAnalysis shall show the decomposition with segment-by-segment pricing.

**Technical Notes:**

- Extend route segmentation logic from Story 17.13.
- Add transit discount configuration to OrganizationPricingSettings.
- Update pricing-engine.ts to apply hierarchical algorithm per segment.

**Prerequisites:** Story 17.13 (Route Segmentation).

---

### Story 18.8: Fixed Temporal Vectors (Classic Destinations)

As an **administrator**,  
I want to configure fixed temporal vectors for classic destinations,  
So that excursions to well-known destinations have guaranteed minimum durations and predictable pricing.

**Related FRs:** FR85.

**Acceptance Criteria:**

**Given** an admin in the excursion package configuration,  
**When** they create a "Temporal Vector" package,  
**Then** they shall specify:

- Destination name (e.g., "Normandy D-Day Beaches")
- Fixed duration (e.g., 12h)
- Minimum price
- Included kilometers
- Allowed origin zones

**And** when a quote request matches a temporal vector (destination within the vector's zone),  
**Then** the system shall automatically apply the fixed duration and minimum price.

**And** the quote shall show: "Temporal Vector: Normandy (12h minimum)".

**Technical Notes:**

- Extend ExcursionPackage model to support temporal vector type.
- Add destination zone matching logic.
- Update pricing-engine.ts to detect and apply temporal vectors.

**Prerequisites:** Epic 3 (Zone Engine), Epic 16 (Quote System - Excursion pricing).

---

### Story 18.9: Shadow Fleet Integration (Subcontractors)

As a **dispatcher**,  
I want to see available subcontractor vehicles alongside internal fleet,  
So that I can handle peak demand by leveraging external capacity.

**Related FRs:** FR86.

**Acceptance Criteria:**

**Given** a configured list of subcontractor partners with their zones and indicative pricing,  
**When** a dispatcher views available vehicles for a mission,  
**Then** they shall see subcontractor vehicles as "Shadow Fleet" entries (visually distinct).

**And** each shadow vehicle shall show: partner name, vehicle category, indicative price, availability status.

**And** when a shadow vehicle is selected, the system shall calculate the margin comparison: internal cost vs. subcontractor price.

**And** the dispatcher shall be able to assign the mission to a subcontractor with explicit margin visibility.

**Technical Notes:**

- Add SubcontractorPartner and SubcontractorVehicle models to schema.prisma.
- Add API for subcontractor availability (manual entry or API integration).
- Update dispatch UI to show shadow fleet.
- Add margin comparison logic.

**Prerequisites:** Epic 8 (Dispatch & Strategic Optimisation).

---

### Story 18.10: Hierarchical Pricing Algorithm Implementation

As a **backend engineer**,  
I want the pricing engine to implement a strict hierarchical pricing algorithm,  
So that pricing decisions follow a predictable priority order.

**Related FRs:** FR87.

**Acceptance Criteria:**

**Given** a quote request with pickup and dropoff locations,  
**When** the pricing engine calculates the quote,  
**Then** it shall evaluate pricing methods in strict priority order:

**Priority 1:** If both points are in the central zone (Z_0) and a flat rate exists, apply the flat rate.
**Priority 2:** If a defined inter-zone forfait exists between the zones, apply the forfait.
**Priority 3:** If both points are in the same outer ring, apply dynamic pricing with the ring's multiplier.
**Priority 4:** Fallback to horokilometric calculation.

**And** the appliedRules shall clearly indicate which priority level was used.

**And** the algorithm shall be configurable to skip certain priority levels if needed.

**Technical Notes:**

- Refactor pricing-engine.ts to implement explicit priority chain.
- Add priority level to appliedRules for transparency.
- Add configuration to enable/disable priority levels.

**Prerequisites:** Epic 4 (Dynamic Pricing), Epic 14 (Flexible Routes).

---

### Story 18.11: Configurable Transfer-to-MAD Thresholds

As an **administrator**,  
I want to configure the thresholds that trigger automatic transfer-to-MAD suggestions,  
So that the system's behavior matches our operational reality.

**Related FRs:** FR88.

**Acceptance Criteria:**

**Given** an admin in Organisation Pricing Settings,  
**When** they access the "Transfer/MAD Thresholds" section,  
**Then** they shall see configurable fields for:

- Minimum waiting time for separate transfers (hours)
- Maximum return distance for separate transfers (km)
- Dense zone speed threshold (km/h)
- Enable automatic switching (toggle)

**And** changes shall be applied immediately to new quotes.

**And** the system shall use these thresholds in Stories 18.2 and 18.3.

**Technical Notes:**

- Add threshold fields to OrganizationPricingSettings.
- Add UI section in pricing settings page.
- Ensure Stories 18.2 and 18.3 read from these settings.

**Prerequisites:** Stories 18.2, 18.3.

---

### Summary

Epic 18 implements the advanced Neural-Fleet architecture features:

1. **Corridor zones** (Story 18.1): Highway buffer zones for differentiated pricing.
2. **Dense zone detection** (Story 18.2): Automatic MAD suggestion when commercial speed is low.
3. **Round-trip detection** (Story 18.3): Automatic MAD suggestion when driver is blocked.
4. **Loss of exploitation** (Story 18.4): Opportunity cost for idle days.
5. **Stay vs. return comparison** (Story 18.5): Scenario optimization for multi-day missions.
6. **Multi-scenario routing** (Story 18.6): min(T), min(D), min(TCO) comparison.
7. **Transversal decomposition** (Story 18.7): Multi-zone trip segmentation with transit discounts.
8. **Temporal vectors** (Story 18.8): Fixed duration packages for classic destinations.
9. **Shadow fleet** (Story 18.9): Subcontractor integration for elastic capacity.
10. **Hierarchical algorithm** (Story 18.10): Strict priority pricing chain.
11. **Configurable thresholds** (Story 18.11): Admin control over MAD switching behavior.

This epic depends on and extends the work done in Epics 3, 4, 8, 11, 14, 15, 16, and 17.

---

## Epic 19: Pricing Engine Critical Fixes & Quote System Stabilization

**Goal:** Fix critical pricing calculation bugs causing prices 5-10× higher than expected, implement automatic RSE-compliant staffing (double driver), fix UI/UX issues in quote creation, and ensure all trip types calculate correctly.

**Priority:** CRITICAL - Blocking production use

**Root Cause Analysis:**
The pricing engine currently applies BOTH category-specific rates (e.g., Autocar at 4.50€/km vs base 1.80€/km) AND the category price multiplier (2.5× for Autocar), resulting in a ~6× price inflation instead of the intended ~2.5× premium. Additionally, the RSE compliance system blocks long trips instead of automatically adding a second driver.

---

### Story 19.1: Fix Double Application of Category Pricing

As a **pricing engineer**,  
I want the pricing engine to apply EITHER category-specific rates OR the category multiplier, not both,  
So that vehicle category pricing is applied correctly without double inflation.

**Related FRs:** FR13, FR15, FR58.

**Acceptance Criteria:**

**Given** a vehicle category with `defaultRatePerKm = 4.50€`, `defaultRatePerHour = 120€`, and `priceMultiplier = 2.50`,  
**When** the pricing engine calculates a dynamic price,  
**Then** it shall use the category rates (4.50€/km, 120€/h) WITHOUT also applying the 2.5× multiplier.

**Or alternatively:**

**Given** a vehicle category with `priceMultiplier = 2.50` and organization base rates (1.80€/km, 45€/h),  
**When** the pricing engine calculates a dynamic price,  
**Then** it shall use organization rates × category multiplier (1.80 × 2.5 = 4.50€/km).

**And** the `appliedRules` shall clearly indicate which pricing method was used (category rates OR base rates × multiplier).

**And** for a Paris → Marseille trip (~780km, ~8h) with Autocar category, the suggested price shall be approximately 2,500-4,000€, not 19,000€+.

**Technical Notes:**

- Modify `resolveRates()` in `pricing-engine.ts` to return a flag indicating if category rates were used.
- Modify `applyVehicleCategoryMultiplier()` to skip application if category rates were already used.
- Add unit tests with expected price ranges for common long-distance scenarios.
- File: `packages/api/src/services/pricing-engine.ts` lines 718-740 and 5507-5540.

**Prerequisites:** None (critical bug fix).

---

### Story 19.2: Implement Automatic RSE-Compliant Staffing for Long Trips

As an **operator**,  
I want the system to automatically add a second driver for trips exceeding RSE limits,  
So that long trips are quoted with compliant staffing instead of being blocked.

**Related FRs:** FR25-FR30, FR47-FR49.

**Acceptance Criteria:**

**Given** a trip where driving time exceeds 9 hours OR work amplitude exceeds 13 hours,  
**When** the pricing engine calculates the quote,  
**Then** it shall automatically:

1. Detect the RSE violation
2. Calculate the cost of a second driver (using `secondDriverHourlyRate` from settings)
3. Add the second driver cost to `internalCost`
4. Include the second driver cost in the suggested price
5. Mark the quote as "Double Crew" in `tripAnalysis.staffingMode`

**And** the quote shall NOT be blocked with "Trajet impossible" when double crew resolves the violation.

**And** the Trip Transparency panel shall show:

- Staffing mode: "Double Crew" / "Single Driver" / "Relay" / "Multi-Day"
- Additional staffing cost breakdown

**And** the `appliedRules` shall include a rule of type `RSE_STAFFING_ADJUSTMENT` with details.

**Technical Notes:**

- Add `staffingMode` enum: `SINGLE_DRIVER`, `DOUBLE_CREW`, `RELAY`, `MULTI_DAY`.
- Modify compliance validation to suggest solutions instead of just blocking.
- Use `secondDriverHourlyRate` (30€/h), `driverOvernightPremium` (75€), `hotelCostPerNight` (150€), `mealCostPerDay` (40€) from settings.
- File: `packages/api/src/services/pricing-engine.ts` and `packages/api/src/routes/vtc/compliance.ts`.

**Prerequisites:** Story 19.1.

---

### Story 19.3: Fix Excursion Pricing to Include Return Trip Cost

As an **operator**,  
I want excursion quotes to include the cost of the return trip,  
So that excursions are priced higher than one-way transfers as expected.

**Related FRs:** FR10, FR12.

**Acceptance Criteria:**

**Given** an excursion trip type with a return date specified,  
**When** the pricing engine calculates the quote,  
**Then** the price shall include:

1. Outbound trip cost
2. Waiting/activity time at destination (if applicable)
3. Return trip cost
4. Any overnight costs if multi-day

**And** an excursion Paris → Marseille with return shall cost MORE than a simple transfer Paris → Marseille.

**And** the `tripAnalysis` shall show separate segments for outbound, activity, and return.

**Technical Notes:**

- Modify `applyTripTypePricing()` to properly calculate excursion costs.
- Ensure `returnDate` is used to calculate multi-day costs.
- File: `packages/api/src/services/pricing-engine.ts` function `applyTripTypePricing`.

**Prerequisites:** Story 19.1.

---

### Story 19.4: Fix DISPO (Mise à Disposition) Pricing Formula

As an **operator**,  
I want DISPO quotes to use the correct hourly-based pricing formula,  
So that mise à disposition trips are priced appropriately.

**Related FRs:** FR10, FR12.

**Acceptance Criteria:**

**Given** a DISPO trip type with `durationHours` specified,  
**When** the pricing engine calculates the quote,  
**Then** the price shall be calculated as:

- Base: `durationHours × ratePerHour`
- Plus: included kilometers overage if exceeded
- Plus: applicable multipliers (category, zone, time-based)

**And** a 10-hour DISPO with Autocar shall cost approximately 1,200-1,800€, not 10,000€+.

**And** the `tripAnalysis` shall show the DISPO-specific breakdown (hours, included km, overage).

**Technical Notes:**

- Review `calculateDispoPrice()` function.
- Ensure DISPO doesn't apply distance-based pricing on top of hourly pricing.
- File: `packages/api/src/services/pricing-engine.ts`.

**Prerequisites:** Story 19.1.

---

### Story 19.5: Fix OFF_GRID Trip Type to Show Manual Pricing UI

As an **operator**,  
I want OFF_GRID trips to show a manual pricing interface,  
So that I can enter custom prices for non-standard trips.

**Related FRs:** FR16.

**Acceptance Criteria:**

**Given** an OFF_GRID trip type selected,  
**When** the quote form is displayed,  
**Then** the "Prix suggéré" field shall show "Manuel" or "—" (not 0€).

**And** the operator shall be able to enter any final price without validation errors.

**And** the quote shall be saveable with the manually entered price.

**Technical Notes:**

- Modify `usePricingCalculation.ts` to handle OFF_GRID correctly.
- Update UI to show appropriate messaging for manual pricing mode.
- File: `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts`.

**Prerequisites:** None.

---

### Story 19.6: Implement Automatic Vehicle Category Selection Based on Capacity

As an **operator**,  
I want the system to automatically select the appropriate vehicle category based on passenger count,  
So that I don't have to manually match capacity requirements.

**Related FRs:** FR17, FR42.

**Acceptance Criteria:**

**Given** a quote form with passenger count entered,  
**When** the passenger count changes,  
**Then** the system shall automatically select the smallest vehicle category that can accommodate the passengers:

- 1-4 passengers → Berline (maxPassengers: 4)
- 5-7 passengers → Van Premium (maxPassengers: 7)
- 8-16 passengers → Minibus (maxPassengers: 16)
- 17-50 passengers → Autocar (maxPassengers: 50)

**And** if luggage count is high, the system may suggest upgrading to a larger category.

**And** the operator can override the automatic selection.

**Technical Notes:**

- Add auto-selection logic to `CreateQuoteCockpit.tsx`.
- Query vehicle categories sorted by `maxPassengers`.
- File: `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`.

**Prerequisites:** None.

---

### Story 19.7: Fix Route Trace Display on Quote Map

As an **operator**,  
I want the map in the quote form to show the actual route trace,  
So that I can visualize the trip path.

**Related FRs:** FR42, FR43.

**Acceptance Criteria:**

**Given** a quote with pickup and dropoff addresses with valid coordinates,  
**When** the map is displayed in the "Itinéraire" tab,  
**Then** the map shall show:

1. Pickup marker (green)
2. Dropoff marker (red)
3. Route polyline connecting them (blue line following roads)

**And** the route shall be fetched from Google Directions API.

**And** if the API fails, a straight line shall be shown as fallback.

**Technical Notes:**

- Check `QuoteMapPanel.tsx` or similar component.
- Ensure Google Directions API is called with the route.
- Use the `encodedPolyline` from toll calculation if available.
- File: `apps/web/modules/saas/quotes/components/` map components.

**Prerequisites:** Story 1.5 (Google Maps integration).

---

### Story 19.8: Fix Vehicle/Driver Assignment in Dispatch

As a **dispatcher**,  
I want to be able to assign vehicles and drivers to missions,  
So that I can complete the dispatch workflow.

**Related FRs:** FR50-FR54.

**Acceptance Criteria:**

**Given** a mission in the dispatch screen,  
**When** I click "Assigner Véhicule & Chauffeur",  
**Then** the assignment panel shall show available vehicles and drivers.

**And** if no candidates are shown ("Aucun candidat disponible"), the system shall explain why:

- No vehicles of required category
- All drivers busy at that time
- RSE constraints preventing assignment

**And** the assignment shall be saveable when a valid vehicle/driver combination is selected.

**Technical Notes:**

- Debug the vehicle/driver availability query.
- Check RSE counter validation in assignment flow.
- File: `apps/web/modules/saas/dispatch/` components.

**Prerequisites:** Epic 5 (Fleet & RSE Compliance).

---

### Story 19.9: Enlarge Assignment and Detail Panels in Dispatch

As a **dispatcher**,  
I want the assignment and detail panels to be wider,  
So that I can see all information without scrolling or truncation.

**Related FRs:** FR42 (UX).

**Acceptance Criteria:**

**Given** the dispatch screen,  
**When** I open the vehicle/driver assignment panel,  
**Then** the panel shall be at least 400px wide (similar to the contact panel width).

**And** all form fields and information shall be visible without horizontal scrolling.

**And** the same width shall apply to:

- Vehicle detail panels
- Quote detail panels
- Driver assignment panels

**Technical Notes:**

- Modify Sheet/Drawer component width in dispatch components.
- Use consistent width across all detail panels.
- File: `apps/web/modules/saas/dispatch/components/`.

**Prerequisites:** None.

---

### Story 19.10: Move UI Blocks for Better Quote Layout

As an **operator**,  
I want the quote detail layout to be better organized,  
So that related information is grouped together.

**Related FRs:** FR42 (UX).

**Acceptance Criteria:**

**Given** the quote creation form,  
**When** displayed,  
**Then** the "Véhicule & Capacité" section shall be positioned just above "Transparence du trajet".

**Given** the quote detail view,  
**When** displayed,  
**Then** the "Détails du trajet" section shall be positioned below the "Tarification" section (where price and margins are shown).

**And** the "Détail des coûts" section shall be positioned below "Activité" in the quote detail view.

**Technical Notes:**

- Reorder components in `CreateQuoteCockpit.tsx`.
- Reorder components in quote detail page.
- File: `apps/web/modules/saas/quotes/components/` and `apps/web/app/[locale]/(saas)/app/[slug]/quotes/[id]/page.tsx`.

**Prerequisites:** None.

---

### Story 19.11: Add Address Field to Operating Base Form

As an **administrator**,  
I want to enter an address for operating bases instead of just GPS coordinates,  
So that I can easily set up bases without looking up coordinates manually.

**Related FRs:** FR17, FR37.

**Acceptance Criteria:**

**Given** the operating base creation/edit form,  
**When** I enter an address in the address field,  
**Then** the system shall:

1. Autocomplete the address using Google Places API
2. Automatically fill in the GPS coordinates (latitude/longitude)
3. Automatically fill in the city and postal code

**And** the GPS coordinates fields shall still be editable for fine-tuning.

**Technical Notes:**

- Add Google Places autocomplete to base form.
- Auto-populate lat/lng from selected place.
- File: `apps/web/modules/saas/fleet/components/` base form components.

**Prerequisites:** Story 1.5 (Google Maps integration).

---

### Story 19.12: Display Driver Missions in Driver Calendar

As a **dispatcher**,  
I want to see driver missions in their calendar view,  
So that I can see their complete schedule including assigned trips.

**Related FRs:** FR50, FR51.

**Acceptance Criteria:**

**Given** a driver with assigned missions,  
**When** I view their calendar,  
**Then** I shall see:

1. Manual calendar events (congé, maladie, formation, etc.)
2. Assigned missions with:
   - Date and time
   - Pickup → Dropoff locations
   - Client name
   - Mission status (confirmed, in progress, completed)

**And** missions shall be visually distinct from manual events (different color/icon).

**And** clicking a mission shall open the mission/quote detail.

**Technical Notes:**

- Query quotes/missions assigned to the driver.
- Add mission events to calendar component.
- File: `apps/web/modules/saas/drivers/components/` calendar components.

**Prerequisites:** Epic 5 (Fleet), Epic 8 (Dispatch).

---

### Story 19.13: Validate Zone Conflict Resolution for Concentric Circles

As a **pricing engineer**,  
I want the zone conflict resolution to work correctly with concentric circles,  
So that overlapping zones (PARIS_0 inside PARIS_10 inside PARIS_20, etc.) are resolved properly.

**Related FRs:** FR8, FR61-FR63.

**Acceptance Criteria:**

**Given** a point that falls within multiple concentric zones (e.g., Paris center is in PARIS_0, PARIS_10, PARIS_20, PARIS_30, PARIS_40, PARIS_60, PARIS_100),  
**When** the zone resolution runs,  
**Then** it shall select the MOST SPECIFIC zone (smallest radius that contains the point).

**And** for a point in Paris center, it shall return PARIS_0 (5km radius), not PARIS_100 (100km radius).

**And** special zones (CDG, ORLY, LA_DEFENSE) shall take priority over concentric circles when the point is within them.

**And** the `zoneConflictStrategy` setting shall be respected:

- `SMALLEST_RADIUS`: Select smallest zone (most specific)
- `HIGHEST_MULTIPLIER`: Select zone with highest price multiplier
- `PRIORITY`: Select zone with highest explicit priority

**Technical Notes:**

- Review `findZoneForPoint()` function.
- Ensure zones are sorted by radius before selection.
- Add priority field to zones if not present.
- File: `packages/api/src/services/pricing-engine.ts` and `packages/api/src/lib/geo-utils.ts`.

**Prerequisites:** None.

---

### Story 19.14: Add Comprehensive Pricing Tests

As a **QA engineer**,  
I want comprehensive tests for all pricing scenarios,  
So that pricing bugs are caught before deployment.

**Related FRs:** All pricing FRs.

**Acceptance Criteria:**

**Given** the pricing engine test suite,  
**When** tests are run,  
**Then** the following scenarios shall be covered:

1. **Transfer Paris → Marseille (Berline):** Expected ~1,500-2,000€
2. **Transfer Paris → Marseille (Autocar):** Expected ~2,500-4,000€
3. **Excursion Paris → Versailles with return:** Expected > one-way transfer
4. **DISPO 8 hours (Van Premium):** Expected ~500-800€
5. **Night transfer (22:00-06:00):** Expected +25% vs day
6. **Weekend transfer:** Expected +15% vs weekday
7. **Long trip requiring double crew:** Expected to include 2nd driver cost
8. **Zone multiplier application:** Verify correct zone selected

**And** each test shall assert price is within expected range (±20%).

**And** tests shall run in CI/CD pipeline.

**Technical Notes:**

- Add test file: `packages/api/src/services/__tests__/pricing-scenarios.test.ts`.
- Use realistic distance/duration values from Google Maps.
- Mock external APIs for deterministic tests.

**Prerequisites:** Stories 19.1-19.4.

---

### Story 19.15: Decompose pricing-engine.ts into Modular Architecture

As a **backend engineer**,  
I want the pricing-engine.ts file (7300+ lines) to be decomposed into smaller, focused modules,  
So that the codebase is maintainable, debuggable, and scalable.

**Related FRs:** All pricing FRs (maintainability requirement).

**Acceptance Criteria:**

**Given** the current monolithic `pricing-engine.ts` file with 7300+ lines,  
**When** the refactoring is complete,  
**Then** the pricing engine shall be split into the following modules:

1. **`pricing-engine/index.ts`** (~100 lines)

   - Main entry point
   - Exports public API: `calculatePrice()`, `PricingResult`, `PricingRequest`
   - Orchestrates module calls

2. **`pricing-engine/types.ts`** (~300 lines)

   - All TypeScript interfaces and types
   - `PricingRequest`, `PricingResult`, `TripAnalysis`, `AppliedRule`, etc.
   - Enums: `PricingMode`, `TripType`, `StaffingMode`, `RateSource`

3. **`pricing-engine/dynamic-pricing.ts`** (~400 lines)

   - `calculateDynamicBasePrice()`
   - `calculateDynamicPrice()`
   - `buildDynamicResult()`
   - Base price calculation logic

4. **`pricing-engine/grid-pricing.ts`** (~300 lines)

   - `matchZoneRoute()`
   - `matchExcursionPackage()`
   - `matchDispoPackage()`
   - `buildGridResult()`
   - Partner contract grid matching

5. **`pricing-engine/multipliers.ts`** (~400 lines)

   - `applyVehicleCategoryMultiplier()`
   - `applyZoneMultiplier()`
   - `applyAllMultipliers()`
   - `applyRoundTripMultiplier()`
   - `applyClientDifficultyMultiplier()`
   - All multiplier application logic

6. **`pricing-engine/trip-type-pricing.ts`** (~300 lines)

   - `applyTripTypePricing()`
   - `calculateDispoPrice()`
   - `calculateExcursionPrice()`
   - Trip-type specific pricing formulas

7. **`pricing-engine/cost-calculation.ts`** (~400 lines)

   - `calculateShadowSegments()`
   - `calculateInternalCost()`
   - `calculateCostBreakdown()`
   - Fuel, tolls, wear, driver costs

8. **`pricing-engine/zone-resolution.ts`** (~200 lines)

   - `findZoneForPoint()` (move from geo-utils)
   - `resolveZoneConflict()`
   - `calculateZoneSurcharges()`
   - Zone matching and conflict resolution

9. **`pricing-engine/profitability.ts`** (~150 lines)

   - `calculateProfitabilityIndicator()`
   - `getProfitabilityIndicatorData()`
   - `getThresholdsFromSettings()`
   - Margin and profitability calculations

10. **`pricing-engine/commission.ts`** (~150 lines)

    - `calculateCommission()`
    - `calculateEffectiveMargin()`
    - `getCommissionData()`
    - Partner commission logic

11. **`pricing-engine/rse-staffing.ts`** (~250 lines)

    - `detectRSEViolation()`
    - `calculateStaffingOption()`
    - `applyDoubleCrewCost()`
    - RSE compliance and staffing automation

12. **`pricing-engine/constants.ts`** (~100 lines)
    - `DEFAULT_PRICING_SETTINGS`
    - Default values and constants

**And** all existing tests shall pass without modification (backward compatibility).

**And** each module shall have its own test file in `__tests__/pricing-engine/`.

**And** the main `calculatePrice()` function shall work exactly as before.

**Technical Notes:**

- Use barrel exports (`index.ts`) for clean imports.
- Maintain backward compatibility: existing imports from `pricing-engine` must work.
- Create folder: `packages/api/src/services/pricing-engine/`
- Move current file to `pricing-engine.legacy.ts` temporarily during migration.
- Each module should be independently testable.
- Use dependency injection pattern where appropriate.

**File Structure After Refactoring:**

```
packages/api/src/services/
├── pricing-engine/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # All types and interfaces
│   ├── constants.ts          # Default values
│   ├── dynamic-pricing.ts    # Dynamic pricing logic
│   ├── grid-pricing.ts       # Partner grid matching
│   ├── multipliers.ts        # All multipliers
│   ├── trip-type-pricing.ts  # Trip type specific
│   ├── cost-calculation.ts   # Internal cost
│   ├── zone-resolution.ts    # Zone matching
│   ├── profitability.ts      # Margin calculations
│   ├── commission.ts         # Partner commissions
│   ├── rse-staffing.ts       # RSE compliance
│   └── __tests__/
│       ├── dynamic-pricing.test.ts
│       ├── grid-pricing.test.ts
│       ├── multipliers.test.ts
│       └── ...
└── pricing-engine.ts         # Re-export for backward compat
```

**Prerequisites:** None (can be done in parallel with other stories).

**Priority:** HIGH - Enables faster debugging and maintenance of all other pricing stories.

---

### Story 19.16: Implement Mandatory Testing Protocol for All Stories

As a **QA engineer**,  
I want every story implementation to include mandatory tests via cURL, Playwright, and database verification,  
So that all features are validated before being marked complete.

**Related FRs:** All FRs (quality assurance).

**Acceptance Criteria:**

**Given** any story in Epic 19 being implemented,  
**When** the implementation is complete,  
**Then** the following tests MUST be executed and documented:

1. **cURL API Tests:**

   - Test all affected API endpoints
   - Verify response structure and values
   - Test error cases and edge cases
   - Document request/response in story artifact

2. **Playwright MCP Tests:**

   - Test UI interactions end-to-end
   - Verify visual elements are correct
   - Test user workflows (create quote, assign vehicle, etc.)
   - Take screenshots of key states

3. **Database Verification:**

   - Query database after each API call
   - Verify data is correctly persisted
   - Check relationships and foreign keys
   - Validate calculated fields

4. **Unit Tests (Vitest):**
   - Add/update unit tests for modified functions
   - Ensure >80% coverage for new code
   - Test edge cases and error handling

**And** each story artifact shall include a "Test Results" section with:

- cURL commands executed and responses
- Playwright test results
- Database query results
- Unit test coverage report

**Technical Notes:**

- Use session cookie from user for authenticated requests:
  ```
  Cookie: better-auth.session_token=O90mxkdZ7xPfu8VV1j_6Mub5GwlbEgTo...
  ```
- Base URL: `http://localhost:3000`
- Organization slug: `sixieme-etoile-vtc`
- Use MCP postgres tool for DB verification
- Use MCP playwright for UI tests

**Prerequisites:** None.

---

### Summary

Epic 19 addresses critical pricing and quote system issues:

1. **Double pricing fix** (Story 19.1): Eliminate category rate + multiplier double application.
2. **RSE staffing** (Story 19.2): Auto-add second driver instead of blocking.
3. **Excursion pricing** (Story 19.3): Include return trip in excursion cost.
4. **DISPO pricing** (Story 19.4): Fix hourly-based pricing formula.
5. **OFF_GRID handling** (Story 19.5): Enable manual pricing mode.
6. **Auto category selection** (Story 19.6): Match vehicle to passenger count.
7. **Route trace** (Story 19.7): Display route on map.
8. **Dispatch assignment** (Story 19.8): Fix vehicle/driver assignment.
9. **Panel sizing** (Story 19.9): Enlarge detail panels.
10. **Layout improvements** (Story 19.10): Reorganize quote UI blocks.
11. **Base address** (Story 19.11): Add address autocomplete to bases.
12. **Driver calendar** (Story 19.12): Show missions in driver calendar.
13. **Zone resolution** (Story 19.13): Fix concentric circle conflicts.
14. **Pricing tests** (Story 19.14): Comprehensive test coverage.
15. **Modular architecture** (Story 19.15): Decompose pricing-engine.ts into 12 focused modules.
16. **Testing protocol** (Story 19.16): Mandatory cURL, Playwright, DB verification for all stories.

This epic is CRITICAL priority and should be completed before any new feature development.

---

## Epic 20: Critical Bug Fixes, Google Maps Migration & Comprehensive Testing

**Goal:** Fix critical runtime errors, migrate from legacy Google Maps DirectionsService to the new Routes API, correct pricing calculation bugs (RSE staffing costs, toll calculation, fixed Berline price), and implement comprehensive end-to-end testing across all quote types and dispatch scenarios.

**Priority:** CRITICAL - Blocking production deployment

**Related FRs:** FR17-FR24 (Routing & Shadow Calculation), FR25-FR30 (Fleet & Compliance), FR31-FR36 (Quote Lifecycle), FR47-FR49 (RSE Compliance), FR55-FR60 (Cost Components)

### Problem Summary

The following critical issues have been identified:

1. **Runtime Error on Quote Detail** - `tripAnalysis.segments.approach` is undefined causing TypeError
2. **Legacy Google Maps API** - DirectionsService triggers "LegacyApiNotActivatedMapError"
3. **Toll Calculation Bug** - Tolls calculated by km×rate instead of real route data from Google Routes API
4. **RSE Second Driver Cost Fixed at 123€** - Always shows 123€ regardless of actual calculation
5. **CollectAPI Diesel Not Used** - Fuel price cache not integrated into cost calculations
6. **Berline Price Fixed at 87€** - Vehicle category pricing not applied correctly
7. **Route Map Not Displaying** - Itinerary not rendered on quote detail view
8. **Dual Driver Assignment** - Cannot assign two drivers for RSE-required trips

---

### FR89: Fix TripTransparencyPanel Segments Null Safety

**Description:** The TripTransparencyPanel crashes when `tripAnalysis.segments` is undefined or when accessing `segments.approach` on a trip that has no approach segment (e.g., excursions, DISPO).

**Root Cause:** Line 437 in `TripTransparencyPanel.tsx` accesses `tripAnalysis.segments.approach` without checking if `segments` exists first.

**Acceptance Criteria:**

- **AC1:** Add null safety check for `tripAnalysis.segments` before accessing segment properties
- **AC2:** Handle cases where segments structure differs by trip type (excursion legs vs standard segments)
- **AC3:** No runtime TypeError when opening any quote detail page
- **AC4:** Display appropriate fallback UI when segment data is unavailable

**Technical Notes:**

- File: `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`
- Check `tripAnalysis?.segments` before accessing `segments.approach`, `segments.service`, `segments.return`
- Excursion trips use `tripAnalysis.excursionLegs` instead of `segments`

---

### FR90: Migrate Google Maps from Legacy DirectionsService to Routes API

**Description:** The application uses the deprecated `google.maps.DirectionsService` which triggers console errors about legacy API not being activated. Must migrate to the new Google Routes API (v2) with `computeRoutes`.

**Root Cause:** `RoutePreviewMap.tsx` uses `new google.maps.DirectionsService()` which is the legacy API.

**Acceptance Criteria:**

- **AC1:** Replace all DirectionsService usage with Routes API `computeRoutes` method
- **AC2:** Use `google.maps.importLibrary("routes")` to load the Routes library
- **AC3:** Request `ComputeRoutesExtraComputation.TOLLS` for toll information
- **AC4:** No console errors about legacy API
- **AC5:** Route polyline displays correctly on map
- **AC6:** Maintain fallback to simple polyline when API fails

**Technical Notes:**

- Files affected:
  - `apps/web/modules/saas/quotes/components/RoutePreviewMap.tsx`
  - `apps/web/modules/saas/quotes/components/ModernRouteMap.tsx`
  - `apps/web/lib/google-routes-client.ts`
- Use existing `computeRoutes` function from `google-routes-client.ts`
- Add field mask for `routes.travelAdvisory.tollInfo` to get toll data

---

### FR91: Integrate Real Toll Costs from Google Routes API

**Description:** Toll costs are currently calculated as `distanceKm × tollCostPerKm` (estimate) instead of using real toll data from Google Routes API.

**Root Cause:** `calculateTollCost` in `cost-calculator.ts` uses a simple per-km rate. The `getTollCost` function exists but is not consistently called with proper route data.

**Acceptance Criteria:**

- **AC1:** Call Google Routes API with `TOLLS` extra computation for all route calculations
- **AC2:** Extract `tollInfo` from Routes API response and use actual toll amounts
- **AC3:** Fall back to per-km estimate only when API fails or returns no toll data
- **AC4:** Display toll source in TripTransparency (GOOGLE_API vs ESTIMATE)
- **AC5:** Cache toll results to avoid repeated API calls for same route

**Technical Notes:**

- Files affected:
  - `packages/api/src/services/pricing/cost-calculator.ts`
  - `packages/api/src/services/toll-service.ts`
  - `packages/api/src/services/pricing-engine.ts`
- Routes API toll response format: `routes[0].travelAdvisory.tollInfo.estimatedPrice`
- Must pass vehicle emission type for accurate toll calculation (Class 1-5)

---

### FR92: Fix RSE Second Driver Cost Calculation

**Description:** When RSE compliance requires a second driver (DOUBLE_CREW), the additional cost always shows 123€ instead of calculating based on actual driving hours and configured hourly rate.

**Root Cause:** The `extraDriverCost` calculation in `compliance-validator.ts` uses `DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost` (25€/h) but the organization's `secondDriverHourlyRate` setting is not being loaded correctly from the database.

**Acceptance Criteria:**

- **AC1:** Load `secondDriverHourlyRate` from `OrganizationPricingSettings` when calculating staffing costs
- **AC2:** Calculate second driver cost as: `(totalDrivingHours / 2) × secondDriverHourlyRate`
- **AC3:** Display correct cost breakdown in TripTransparency compliance section
- **AC4:** If org setting is null, fall back to default (25€/h) but log a warning
- **AC5:** Cost varies based on trip duration, not fixed amount

**Technical Notes:**

- Files affected:
  - `packages/api/src/services/compliance-validator.ts` (lines 846-904)
  - `packages/api/src/services/pricing-engine.ts` (lines 6150-6156)
- Current formula: `extraDriverHours × costParameters.driverHourlyCost`
- Issue: `costParameters` not populated from org settings, uses defaults
- Function `buildCostParametersFromSettings` exists but may not be called with correct settings

---

### FR93: Integrate CollectAPI Diesel Price into Fuel Cost Calculation

**Description:** The fuel price cache from CollectAPI is not being used in cost calculations. The system uses hardcoded `DEFAULT_FUEL_PRICES.DIESEL = 1.789€/L` instead of live prices.

**Root Cause:** `FuelPriceCache` table exists but `calculateFuelCost` in `cost-calculator.ts` doesn't query it.

**Acceptance Criteria:**

- **AC1:** Query `FuelPriceCache` for current fuel price before calculating fuel cost
- **AC2:** Use cached price if less than 24 hours old
- **AC3:** Fall back to default price if cache is stale or empty
- **AC4:** Display fuel price source in TripTransparency (COLLECTAPI vs DEFAULT)
- **AC5:** Implement cache refresh mechanism (daily cron or on-demand)

**Technical Notes:**

- Files affected:
  - `packages/api/src/services/pricing/cost-calculator.ts`
  - `packages/api/src/services/fuel-price-service.ts`
- CollectAPI endpoint: `https://api.collectapi.com/gasPrice/europeanCountries`
- Cache table: `FuelPriceCache` with `fuelType`, `pricePerLiter`, `fetchedAt`, `organizationId`

---

### FR94: Fix Vehicle Category Price Multiplier Application

**Description:** Berline category always shows 87€ regardless of trip distance/duration. The vehicle category `priceMultiplier` is not being applied correctly.

**Root Cause:** When category-specific rates (`defaultRatePerKm`, `defaultRatePerHour`) are set, the `priceMultiplier` should NOT be applied (Story 19.1 fix). However, if rates are NOT set, the multiplier should be applied to org base rates. The logic may be inverted or not working.

**Acceptance Criteria:**

- **AC1:** If category has `defaultRatePerKm` AND `defaultRatePerHour` set → use those rates, skip multiplier
- **AC2:** If category rates are null → use org rates × `priceMultiplier`
- **AC3:** Price varies correctly based on distance/duration for all categories
- **AC4:** Berline, Van, Minibus show different prices for same route
- **AC5:** Add debug logging to trace rate resolution path

**Technical Notes:**

- Files affected:
  - `packages/api/src/services/pricing-engine.ts` (function `resolveRates`)
  - `packages/api/src/services/pricing/dynamic-pricing.ts`
- Check `VehicleCategory.defaultRatePerKm` and `defaultRatePerHour` values in database
- Verify `priceMultiplier` values: Berline=1.0, Van=1.2, Minibus=1.5, etc.

---

### FR95: Fix Route Display on Quote Detail Map

**Description:** When viewing a quote detail, the map does not display the route itinerary. Only markers appear but no polyline connecting them.

**Root Cause:** The DirectionsService request may be failing silently, or the DirectionsRenderer is not properly attached to the map after the API response.

**Acceptance Criteria:**

- **AC1:** Route polyline displays between pickup and dropoff markers
- **AC2:** Waypoints (for excursions) are connected in order
- **AC3:** Fallback polyline (straight lines) shows if API fails
- **AC4:** Console logs indicate success or failure of route request
- **AC5:** Map bounds adjust to fit entire route

**Technical Notes:**

- Files affected:
  - `apps/web/modules/saas/quotes/components/RoutePreviewMap.tsx`
  - `apps/web/modules/saas/quotes/components/ModernRouteMap.tsx`
- Check `directionsRendererRef.current.setDirections(result)` is called
- Verify `directionsRendererRef.current.setMap(map)` is called before setting directions
- Add error handling for DirectionsStatus !== OK

---

### FR96: Implement Dual Driver Assignment for RSE Trips

**Description:** When a trip requires two drivers (DOUBLE_CREW staffing plan), the dispatch assignment drawer should allow selecting two drivers for the same vehicle.

**Root Cause:** Current assignment UI only supports single driver selection per mission.

**Acceptance Criteria:**

- **AC1:** Detect when mission has `compliancePlan.planType === "DOUBLE_CREW"`
- **AC2:** Show "Second Driver" field in assignment drawer for DOUBLE_CREW missions
- **AC3:** Both drivers must have valid licenses for the vehicle category
- **AC4:** Both drivers added to mission record and their calendars
- **AC5:** Validate no scheduling conflicts for either driver
- **AC6:** Display both driver names in mission list and detail views

**Technical Notes:**

- Files affected:
  - `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`
  - `packages/api/src/routes/missions.ts`
  - `packages/database/prisma/schema.prisma` (may need `secondDriverId` field)
- Consider `MissionDriver` junction table for many-to-many relationship
- Update driver calendar events to include both drivers

---

### FR97: Comprehensive End-to-End Testing Suite

**Description:** Implement comprehensive E2E tests covering all quote types, pricing scenarios, dispatch operations, and report generation.

**Test Scenarios Required:**

1. **Quote Creation Tests:**

   - Transfer (one-way) with dynamic pricing
   - Transfer (round-trip) with grid pricing
   - Excursion with multiple stops
   - DISPO (mise à disposition) with hourly pricing
   - OFF_GRID with manual pricing

2. **Pricing Calculation Tests:**

   - Zone multiplier application (PARIS_0 vs BUSSY_0)
   - Vehicle category multiplier (Berline vs Van vs Minibus)
   - Night rate application (22:00-06:00)
   - Weekend rate application
   - RSE staffing cost addition (DOUBLE_CREW, RELAY, MULTI_DAY)

3. **Dispatch Tests:**

   - Single driver assignment
   - Dual driver assignment (RSE)
   - Driver calendar conflict detection
   - Vehicle availability check

4. **Report Tests:**
   - Daily revenue report accuracy
   - Driver activity report
   - Profitability by route report

**Acceptance Criteria:**

- **AC1:** Playwright test suite covers all scenarios above
- **AC2:** Tests run against staging environment with test data
- **AC3:** Test results documented with screenshots
- **AC4:** CI/CD pipeline includes E2E test stage
- **AC5:** Test coverage report generated

**Technical Notes:**

- Use MCP Playwright for browser automation
- Use MCP Postgres for database verification
- Create test fixtures for consistent test data
- Implement test cleanup to reset state between runs

---

### FR98: Validate Reports Page Functionality

**Description:** Verify that all reports on the Reports page function correctly with accurate data.

**Reports to Validate:**

1. Revenue by period (daily, weekly, monthly)
2. Profitability by route/zone
3. Driver utilization
4. Vehicle utilization
5. Quote conversion rate
6. Partner commission summary

**Acceptance Criteria:**

- **AC1:** Each report loads without errors
- **AC2:** Data matches database records (spot check)
- **AC3:** Filters work correctly (date range, vehicle, driver)
- **AC4:** Export to CSV/PDF functions
- **AC5:** Charts render correctly

---

### Story Breakdown (Suggested)

| Story | Title                                          | Priority | Effort |
| ----- | ---------------------------------------------- | -------- | ------ |
| 20.1  | Fix TripTransparencyPanel Segments Null Safety | CRITICAL | S      |
| 20.2  | Migrate to Google Routes API                   | HIGH     | L      |
| 20.3  | Integrate Real Toll Costs                      | HIGH     | M      |
| 20.4  | Fix RSE Second Driver Cost Calculation         | CRITICAL | M      |
| 20.5  | Integrate CollectAPI Diesel Price              | MEDIUM   | M      |
| 20.6  | Fix Vehicle Category Price Multiplier          | CRITICAL | M      |
| 20.7  | Fix Route Display on Quote Detail              | HIGH     | M      |
| 20.8  | Implement Dual Driver Assignment               | HIGH     | L      |
| 20.9  | Comprehensive E2E Testing Suite                | HIGH     | XL     |
| 20.10 | Validate Reports Page                          | MEDIUM   | M      |

---

### Dependencies

- **Epic 19** (RSE Compliance & Pricing Fixes) - Some fixes may overlap
- **Epic 15** (Pricing Engine Accuracy) - Real cost integration
- **Epic 17** (Compliance Integration) - Staffing cost parameters

### Success Metrics

- Zero runtime errors on quote detail pages
- Toll costs within 10% of actual toll booth prices
- RSE staffing costs vary by trip duration (not fixed)
- All vehicle categories show different prices
- Route displays on 100% of quote detail views
- E2E test suite passes with >95% success rate

---

## Epic 21: Complete Pricing System Refactor with Full Transparency

**Goal:** Refactor the entire pricing calculation system to display ultra-detailed cost breakdown, complete calculation transparency, and full integration of RSE/staffing information in quotes and dispatch.

**Related FRs:** FR89–FR110.

**Dependencies:** Epic 4 (Dynamic Pricing), Epic 6 (Quotes & Operator Cockpit), Epic 8 (Dispatch & Strategic Optimisation), Epic 17 (Advanced Zone Resolution), Epic 20 (Critical Bug Fixes & Testing).

---

### Story 21.1: Ultra-Detailed Staffing Costs Display in TripTransparency

**As an** operator,  
**I want** to see the complete staffing cost breakdown in quotes,  
**So that** I can understand and validate each pricing component.

**Related FRs:** FR89, FR90.

**Acceptance Criteria:**

**Given** a quote with RSE staffing (double driver, hotel, meals),  
**When** I display the TripTransparency panel,  
**Then** I see a "Staffing Costs" section with:

- **Second Driver Cost**: Hourly rate × hours worked
- **Hotel Cost**: Price per night × number of nights × number of drivers
- **Meal Costs**:
  - Driver 1 meals: Count × unit price
  - Driver 2 meals: Count × unit price (if applicable)
  - Total meals
- **Daily Breakdown**: Day-by-day breakdown for long trips

**And** each cost displays:

- Explicit icon (👥 for driver, 🏨 for hotel, 🍽️ for meals)
- Detailed calculation (ex: "2 drivers × 85€/night × 2 nights = 340€")
- Source of parameter (org config, vehicle, etc.)

**Prerequisites:** Epic 17 (staffing integration), Epic 5 (fleet models).

---

### Story 21.2: Detailed Approach Fee and Empty Return Display

**As an** operator,  
**I want** to see detailed approach and empty return costs in quotes,  
**So that** I understand how the total price is constructed.

**Related FRs:** FR91, FR92.

**Acceptance Criteria:**

**Given** a quote with approach fee from garage,  
**When** I display TripTransparency,  
**Then** I see a "Positioning Costs" section:

- **Approach Fee**: Distance garage → departure × rate/km + time × rate/h
- **Empty Return**: Distance arrival → garage × rate/km (if applicable)
- **Availability Fee**: Hourly cost × waiting hours (if applicable)

**And** each element displays:

- Calculated distance and duration
- Applied rates
- Map visualization of approach route

**Prerequisites:** Epic 4 (shadow calculation), Epic 8 (dispatch).

---

### Story 21.3: Ultra-Detailed Travel Time Calculation Breakdown

**As an** operator,  
**I want** to understand how travel time is calculated,  
**So that** I can explain differences with Google Maps and validate estimates.

**Related FRs:** FR93, FR94.

**Acceptance Criteria:**

**Given** a travel time calculation (ex: Paris-Nice = 17h34),  
**When** I display TripTransparency,  
**Then** I see a "Time Analysis" section:

- **Base Google Maps Time**: 10h00 (reference)
- **Vehicle Surcharge**: +40% (coach vs car)
- **Traffic Surcharge**: +15% (rush hour)
- **Pause Conduite**: +2h30 (mandatory breaks)
- **Temps Total**: 17h34

**And** each component displays:

- Percentage and hour value
- Applied calculation rule
- Source (vehicle config, regulation, etc.)

**Prerequisites:** Epic 4 (dynamic pricing), Epic 20 (Google Routes API).

---

### Story 21.4: Pricing Segments and Traversed Zones Visualization

**As an** operator,  
**I want** to see trip breakdown by segments and zones,  
**So that** I understand how each zone impacts the price.

**Related FRs:** FR95, FR96.

**Acceptance Criteria:**

**Given** a multi-zone trip (ex: Paris → Lyon → Marseille),  
**When** I display TripTransparency,  
**Then** I see a "Pricing Segments" section:

- **Segment 1**: Paris → Lyon (120km, 1h30, zones: PARIS_20 → LYON_0)
  - Distance: 120km
  - Time: 1h30
  - Traversed zones: PARIS_20, PARIS_40, LYON_0
  - Segment cost: 145€
- **Segment 2**: Lyon → Marseille (320km, 3h15, zones: LYON_0 → MARSEILLE_0)
  - Distance: 320km
  - Time: 3h15
  - Traversed zones: LYON_0, MARSEILLE_10, MARSEILLE_0
  - Segment cost: 380€

**And** each segment displays:

- Map visualization
- Applied zone multipliers
- Detailed segment cost

**Prerequisites:** Epic 3 (zone engine), Epic 14 (flexible routes).

---

### Story 21.5: RSE Staffing Integration in Dispatch

**As a** dispatcher,  
**I want** to see all RSE staffing information in the dispatch screen,  
**So that** I can assign drivers and see associated costs.

**Related FRs:** FR97, FR98.

**Acceptance Criteria:**

**Given** a mission with RSE staffing in dispatch screen,  
**When** I display mission details,  
**Then** I see:

- **Staffing Section**:
  - Icon 👥 with required driver count
  - Detail: "2 drivers (RSE 13h amplitude)"
  - Total staffing cost: 450€
- **Hotel Section**:
  - Icon 🏨 with night count
  - Detail: "2 nights × 2 drivers × 85€ = 340€"
- **Meals Section**:
  - Icon 🍽️ with meal count
  - Detail: "4 meals × 25€ = 100€"

**And** each information is:

- Clickable for detail view
- Colored by status (green/red)
- Integrated in dispatch interface

**Prerequisites:** Epic 8 (dispatch), Epic 17 (staffing integration).

---

### Story 21.6: Automatic Empty Return and Availability Calculation

**As an** operator,  
**I want** the system to automatically calculate empty return and availability,  
**So that** the final price includes all operational costs.

**Related FRs:** FR99, FR100.

**Acceptance Criteria:**

**Given** a created quote,  
**When** the pricing engine calculates the price,  
**Then** it automatically determines:

- **Empty Return Required**: Yes/No based on trip type
- **Empty Return Cost**: Distance × rate/km if applicable
- **Availability**: Waiting hours × rate/h if applicable
- **Approach Fee**: Distance garage → departure × rate/km

**And** these costs are:

- Added to total price
- Displayed in TripTransparency
- Included in profitability calculations

**Prerequisites:** Epic 4 (pricing engine), Epic 8 (dispatch).

---

### Story 21.7: Enhanced TripTransparency Interface with Detailed Calculation

**As an** operator,  
**I want** a completely redesigned TripTransparency interface,  
**So that** I can see all pricing information clearly and structured.

**Related FRs:** FR101, FR102.

**Acceptance Criteria:**

**Given** the new TripTransparency component,  
**When** I display a quote,  
**Then** I see organized sections:

1. **Trip Summary**: Distance, duration, total price, margin
2. **Price Breakdown**:
   - Base price
   - Surcharges (zones, night, weekend)
   - Staffing costs
   - Positioning costs
3. **Time Analysis**: Detailed time calculation
4. **Pricing Segments**: Segment/zone breakdown
5. **Operational Costs**: Vehicle, fuel, tolls detail
6. **RSE Compliance**: Staffing plan and associated costs

**And** each section is:

- Collapsible/expandable
- With consistent icons and colors
- PDF exportable for customer

**Prerequisites:** Stories 21.1-21.6.

---

### Story 21.8: Automated Testing and API Validation

**As a** developer,  
**I want** comprehensive tests to validate all pricing calculations,  
**So that** I ensure the system works correctly.

**Related FRs:** FR103, FR104.

**Acceptance Criteria:**

**Given** the automated test suite,  
**When** I execute tests,  
**Then** they validate:

- **Unit Tests**: Each calculation function
- **Integration Tests**: Complete pricing API
- **E2E Tests**: Visual interface + Curl API
- **Database Tests**: Correct persistence

**And** tests cover:

- Paris-Nice (long trip with staffing)
- Paris-CDG (short with approach fee)
- Excursion multi-stops
- Availability
- All vehicle types

**Prerequisites:** Stories 21.1-21.7.

---

### Story 21.8: Zone-Based Cost Transparency Enhancement

**As an** operator,  
**I want** to see exactly how zones affect pricing calculations,  
**So that** I can explain zone-based pricing to clients.

**Related FRs:** FR109.

**Acceptance Criteria:**

**Given** a trip crossing multiple zones,  
**When** I view TripTransparency,  
**Then** I see:

- **Zone Detection Logic**: Which algorithm selected pickup/dropoff zones
- **Zone Priority Rules**: How conflicts were resolved
- **Zone Multiplier Application**: Exact multiplier applied and why
- **Zone Surcharges**: Any fixed fees per zone

**And** each zone decision shows:

- Geographic coordinates used
- Zone boundaries considered
- Alternative zones that were rejected
- Business rule applied

**Prerequisites:** Story 17.1 (zone conflict resolution), Story 21.4.

---

### Story 21.9: Real-Time Cost Calculation Validation

**As an** operator,  
**I want** to validate pricing calculations in real-time,  
**So that** I can catch errors before sending quotes to clients.

**Related FRs:** FR110.

**Acceptance Criteria:**

**Given** any quote in creation or edit mode,  
**When** pricing parameters change,  
**Then** the system shows:

- **Calculation Validation**: Green check if calculations are consistent
- **Error Detection**: Red alert if calculations don't match expected ranges
- **Recalculation Button**: Manual trigger to recalculate all costs
- **Audit Trail**: Log of all calculation changes with timestamps

**And** validation includes:

- Internal cost vs selling price sanity checks
- Zone multiplier consistency
- Staffing cost reasonableness
- Time calculation plausibility

**Prerequisites:** Stories 21.1-21.8.

---

### Summary

Epic 21 addresses the complete transparency and detail requirements for the pricing system:

1. **Staffing Cost Transparency** (Stories 21.1-21.2): Ultra-detailed breakdown of all staffing-related costs with icons and calculations.
2. **Time Calculation Analysis** (Story 21.3): Complete explanation of how travel time is calculated vs Google Maps.
3. **Zone and Segment Transparency** (Story 21.4): Visual breakdown of pricing by segments and zones traversed.
4. **Dispatch Integration** (Story 21.5): Full staffing information displayed in dispatch interface.
5. **Automated Calculations** (Story 21.6): Automatic determination of positioning costs.
6. **Enhanced Interface** (Story 21.7): Completely redesigned TripTransparency with organized sections.
7. **Quality Assurance** (Story 21.8): Comprehensive testing and validation.
8. **Advanced Features** (Stories 21.9): Zone transparency and real-time validation.

This epic ensures that operators can see and understand every component of pricing calculations, addressing the core business need for complete transparency in the VTC pricing system.

---

## Epic 22: VTC ERP Complete System Enhancement & Critical Fixes

**Goal:** Implement critical fixes, new advanced features, and system enhancements to make the VTC ERP fully functional with robust pricing, comprehensive trip management, and complete subcontracting capabilities.

### Story 22.1: Fix Round Trip Pricing Calculation

**As a** pricing engineer,  
**I want** round trip pricing to calculate segments correctly instead of applying a simple ×2 multiplier,  
**So that** round trip prices reflect the actual operational costs without double-counting empty returns.

**Related FRs:** FR7, FR13, FR15.

**Acceptance Criteria:**

**Given** a round trip quote (isRoundTrip = true),  
**When** pricing is calculated,  
**Then** the system calculates:

- **Segment A**: Base → Pickup (positioning cost)
- **Segment B**: Pickup → Dropoff (service cost)
- **Segment C**: Dropoff → Base (empty return cost)
- **Segment D**: Base → Pickup (return positioning for second leg)
- **Segment E**: Dropoff → Pickup (return service)
- **Segment F**: Pickup → Base (final empty return)

**And** the total price equals: Segment A + B + C + D + E + F, NOT (A + B + C) × 2.

**Prerequisites:** Existing pricing engine, shadow calculation system.

**Technical Notes:**

- Refactor `applyRoundTripMultiplier()` to use segment-based calculation
- Update `calculateShadowSegments()` to handle round trip segments correctly
- Maintain backward compatibility for existing quotes

---

### Story 22.2: Display Staffing Costs in Quote Creation

**As an** operator,  
**I want** to see meal and hotel costs directly in the quote creation interface,  
**So that** I can understand the complete cost breakdown before sending quotes to clients.

**Related FRs:** FR47, FR48, FR89, FR90.

**Acceptance Criteria:**

**Given** a quote with long duration or overnight requirements,  
**When** I create or edit a quote,  
**Then** the TripTransparencyPanel shows:

- **Meal Costs**: Number of meals × rate per meal × drivers
- **Hotel Costs**: Number of nights × rate per night × drivers
- **Second Driver Costs**: Hours × hourly rate (if applicable)
- **Total Staffing Cost**: Sum of all staffing-related expenses

**And** the calculation rules are:

- **1 meal per 6 hours** (max 2 per day: lunch + dinner)
- **1 hotel night** when trip ends after 20:00 or exceeds 12 hours
- **Double all costs** when second driver required
- **Hotel always includes 1 meal allowance**

**Prerequisites:** Story 21.1 (StaffingCostsSection exists), TripTransparencyPanel.

**Technical Notes:**

- Import and integrate existing `StaffingCostsSection` into `TripTransparencyPanel`
- Ensure calculations match dispatch staffing logic
- Add meal/hotel calculation rules to compliance engine

---

### Story 22.3: Enable Quote Notes Modification After Sending

**As an** operator,  
**I want** to modify notes on sent quotes for driver communication,  
**So that** I can update operational instructions without changing commercial terms.

**Related FRs:** FR31, FR32.

**Acceptance Criteria:**

**Given** a quote with status SENT, ACCEPTED, or REJECTED,  
**When** I view the quote detail page,  
**Then** I can:

- **Edit notes** in the activity section (not commercial fields)
- **Add driver instructions** that appear in dispatch
- **Update operational details** without affecting pricing
- **See note history** with timestamps of changes

**And** the restrictions are:

- **Commercial fields** (price, vehicle, dates) remain frozen
- **Only notes field** is editable after DRAFT status
- **All note changes** are logged in audit trail

**Prerequisites:** Quote detail page, notes system, audit logging.

**Technical Notes:**

- Modify `isEditable()` function to allow notes editing
- Update `QuoteActivityLog` to support post-DRAFT note editing
- Add note change tracking to audit system

---

### Story 22.4: Implement Complete Subcontracting System

**As a** dispatcher,  
**I want** a complete subcontracting management system,  
**So that** I can effectively outsource missions when internal resources are unavailable.

**Related FRs:** FR50, FR51, FR52.

**Acceptance Criteria:**

**Given** the subcontracting module,  
**When** I need to outsource a mission,  
**Then** I can:

- **Manage subcontractor profiles** with vehicle fleets and operating zones
- **View subcontracting suggestions** based on profitability analysis
- **Compare internal vs subcontractor costs** with detailed breakdowns
- **Assign missions to subcontractors** with proper documentation
- **Track subcontracted missions** in dispatch interface

**And** the subcontractor profiles include:

- **Company information** and contact details
- **Vehicle fleet** with categories and capacities
- **Operating zones** and service areas
- **Pricing rates** and minimum fares
- **Availability status** and response times

**Prerequisites:** SubcontractorProfile model exists, basic dispatch interface.

**Technical Notes:**

- Complete the subcontracting workflow in dispatch
- Integrate subcontractor suggestions with mission assignment
- Add subcontractor management UI for profiles
- Implement subcontractor mission tracking

---

### Story 22.5: Add STAY Trip Type - Data Model & API

**As a** system architect,  
**I want** to add STAY trip type to support multi-day, multi-service packages,  
**So that** clients can book complete travel packages with detailed breakdowns.

**Related FRs:** FR31, FR32, FR33, FR34.

**Acceptance Criteria:**

**Given** the extended data model,  
**When** I create a STAY quote,  
**Then** the system supports:

- **Stay Quote Structure**: Container for multiple services across multiple days
- **Stay Day Components**: Individual days with date, services, and requirements
- **Stay Service Types**: TRANSFER, DISPO, EXCURSION within stay
- **RSE Integration**: Staffing costs calculated per day and service
- **Invoice Decomposition**: Each service becomes separate invoice line

**And** the data model includes:

```typescript
interface StayQuote {
  id: string;
  organizationId: string;
  contactId: string;
  stayDays: StayDay[];
  totalCost: number;
  totalInternalCost: number;
  notes: string;
}

interface StayDay {
  date: DateTime;
  services: StayService[];
  hotelRequired: boolean;
  mealCount: number;
  driverCount: number;
}

interface StayService {
  type: "TRANSFER" | "DISPO" | "EXCURSION";
  details: ServiceDetails;
  cost: number;
  internalCost: number;
}
```

**Prerequisites:** Existing Quote model, pricing engine.

**Technical Notes:**

- Add STAY to TripType enum
- Create new tables for StayQuote, StayDay, StayService
- Extend pricing API to handle stay calculations
- Update quote creation workflow for stays

---

### Story 22.6: Implement STAY Trip Type - Frontend Interface

**As a** commercial operator,  
**I want** an intuitive interface to create multi-day stay packages,  
**So that** I can easily configure complex travel itineraries for clients.

**Related FRs:** FR42, FR43, FR44.

**Acceptance Criteria:**

**Given** the STAY trip type selected,  
**When** I create a quote,  
**Then** the interface provides:

- **Multi-Day Calendar**: Visual date picker for stay duration
- **Service Configuration Panel**: Add/edit services per day
- **Flexible Time Inputs**: Different times for each service
- **Cost Summary**: Real-time cost breakdown by day and service
- **RSE Indicators**: Staffing requirements per day

**And** for each day I can configure:

- **Multiple Services**: Transfer + Dispo + Excursion combinations
- **Custom Times**: Different pickup/dropoff times per service
- **Intermediate Stops**: Multi-stop excursions within stay
- **Staffing Options**: Single driver, double crew, or relay

**Prerequisites:** Story 22.5 (data model), TripTypeFormFields component.

**Technical Notes:**

- Extend TripTypeFormFields with STAY-specific UI
- Create StayDayEditor component for daily configuration
- Implement StayServiceSelector for service types
- Add StayCostSummary for real-time calculations

---

### Story 22.7: Implement STAY Trip Type - Pricing Engine

**As a** pricing specialist,  
**I want** accurate pricing calculations for complex stay packages,  
**So that** multi-day quotes reflect true operational costs and appropriate margins.

**Related FRs:** FR7, FR12, FR13, FR14, FR15.

**Acceptance Criteria:**

**Given** a stay quote with multiple services and days,  
**When** pricing is calculated,  
**Then** the engine computes:

- **Service Pricing**: Each service priced independently (transfer, dispo, excursion)
- **Day-Specific Costs**: Hotel and meal costs per day based on duration
- **RSE Integration**: Staffing costs calculated per day and service combination
- **Margin Calculation**: Total margin across entire stay package
- **Transparency**: Complete breakdown by day and service type

**And** the pricing logic handles:

- **Multi-Service Discounts**: Optimized pricing for combined services
- **Day-Overnight Costs**: Hotel costs when services span multiple days
- **Staffing Optimization**: Most efficient driver allocation across stay
- **Zone Pricing**: Appropriate zone multipliers for each service segment

**Prerequisites:** Story 22.5 (data model), existing pricing engine.

**Technical Notes:**

- Extend pricing API to handle stay requests
- Implement stay-specific pricing algorithms
- Add stay cost breakdown to trip analysis
- Integrate with existing multiplier and zone systems

---

### Story 22.8: Implement STAY Trip Type - Invoice Integration

**As a** finance administrator,  
**I want** stay quotes to generate detailed invoices with line-item breakdown,  
**So that** clients receive clear, itemized billing for multi-day packages.

**Related FRs:** FR34, FR35, FR36.

**Acceptance Criteria:**

**Given** an accepted stay quote converted to invoice,  
**When** the invoice is generated,  
**Then** it contains:

- **Service Line Items**: Each service as separate line with description
- **Daily Breakdown**: Hotel and meal costs per day
- **Staffing Costs**: Driver costs separated by day and service
- **Package Summary**: Total stay cost with clear grouping
- **VAT Calculation**: Proper VAT applied to each line item

**And** the invoice structure shows:

```
Line 1: Transfer - Day 1 - Airport to Hotel
Line 2: Disposition - Day 1 - City Tour (4 hours)
Line 3: Hotel - Day 1 - Overnight stay
Line 4: Meals - Day 1 - Lunch + Dinner
Line 5: Transfer - Day 2 - Hotel to Airport
```

**Prerequisites:** Story 22.7 (pricing), existing invoice system.

**Technical Notes:**

- Extend InvoiceLineType enum for stay-specific lines
- Implement stay-to-invoice conversion logic
- Add stay invoice templates and formatting
- Update invoice generation workflow

---

### Story 22.9: Enhance Dispatch with Staffing Information Display

**As a** dispatcher,  
**I want** to see complete staffing details when assigning missions,  
**So that** I can make informed decisions about driver allocation and costs.

**Related FRs:** FR47, FR48, FR89, FR90.

**Acceptance Criteria:**

**Given** a mission in the dispatch interface,  
**When** I view mission details,  
**Then** I see:

- **Staffing Requirements**: Number of drivers, overnight stays, meals
- **Cost Breakdown**: Detailed staffing costs with calculations
- **RSE Compliance**: Staffing plan and any regulatory requirements
- **Driver Availability**: Which drivers can fulfill staffing requirements
- **Alternative Options**: Other staffing configurations if needed

**And** the display includes:

- **Visual Indicators**: Icons for hotels, meals, second driver
- **Cost Calculations**: Clear breakdown of how costs are derived
- **Timeline View**: Daily staffing requirements for multi-day missions
- **Flexibility Options**: Alternative staffing with cost implications

**Prerequisites:** Existing dispatch interface, StaffingCostsSection component.

**Technical Notes:**

- Integrate StaffingCostsSection into dispatch mission details
- Add staffing information to mission cards and lists
- Implement staffing requirement indicators
- Connect with driver availability system

---

### Story 22.10: Implement Advanced Subcontracting Workflow

**As a** fleet manager,  
**I want** a complete subcontracting workflow from suggestion to execution,  
**So that** I can efficiently manage outsourced missions and maintain quality control.

**Related FRs:** FR50, FR51, FR52.

**Acceptance Criteria:**

**Given** the subcontracting system,  
**When** I need to outsource a mission,  
**Then** the workflow provides:

- **Automatic Suggestions**: AI-powered recommendations based on cost and availability
- **Subcontractor Matching**: Filter by vehicle type, zone, and availability
- **Cost Comparison**: Detailed breakdown of internal vs subcontractor costs
- **Contract Management**: Digital agreements and terms with subcontractors
- **Quality Tracking**: Performance metrics and feedback system

**And** the workflow includes:

- **Suggestion Engine**: Analyzes profitability and recommends outsourcing
- **Matching Algorithm**: Finds best-fit subcontractors for specific missions
- **Negotiation Tools**: Cost optimization and terms management
- **Execution Tracking**: Real-time status of subcontracted missions
- **Performance Analytics**: Subcontractor reliability and quality metrics

**Prerequisites:** Story 22.4 (basic subcontracting), dispatch system.

**Technical Notes:**

- Implement subcontracting suggestion algorithms
- Create subcontractor matching and filtering system
- Add subcontractor management UI
- Integrate with dispatch and mission tracking

---

### Story 22.11: Fix Quote Notes Display in Dispatch

**As a** dispatcher,  
**I want** quote notes to be clearly visible when assigning missions,  
**So that** drivers receive all important operational instructions.

**Related FRs:** FR31, FR32.

**Acceptance Criteria:**

**Given** a mission assigned from a quote,  
**When** I view the mission in dispatch,  
**Then** the quote notes are:

- **Prominently Displayed**: Visible in mission details without scrolling
- **Formatted for Clarity**: Properly formatted with line breaks and emphasis
- **Driver-Focused**: Instructions specifically relevant to drivers
- **Searchable**: Can find specific notes across missions
- **Editable**: Can update notes if operational details change

**And** the notes integration includes:

- **Automatic Sync**: Notes from quotes appear in dispatch automatically
- **Version Control**: Track note changes with timestamps
- **Categorization**: Different types of notes (operational, client, special requests)
- **Alerts**: Highlight critical notes or special requirements

**Prerequisites:** Quote notes system, dispatch interface.

**Technical Notes:**

- Add quote notes to mission data model
- Implement notes display in dispatch mission details
- Create notes editing and management interface
- Add notes search and filtering capabilities

---

### Story 22.12: Implement Comprehensive Testing Suite

**As a** QA engineer,  
**I want** comprehensive tests for all new features and fixes,  
**So that** the enhanced system remains stable and reliable.

**Related FRs:** Quality assurance requirements.

**Acceptance Criteria:**

**Given** the enhanced VTC ERP system,  
**When** I run the test suite,  
**Then** it validates:

- **Round Trip Pricing**: Correct segment calculations vs ×2 multiplier
- **Staffing Costs Display**: Accurate meal/hotel costs in quotes and dispatch
- **Notes Modification**: Post-DRAFT note editing functionality
- **Subcontracting System**: Complete workflow from suggestion to execution
- **STAY Trip Type**: Multi-day pricing, UI, and invoice integration
- **Dispatch Enhancements**: Staffing information display and notes visibility

**And** the test coverage includes:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoints and data flow testing
- **E2E Tests**: Complete user workflows from quote to invoice
- **Performance Tests**: System performance with large datasets
- **Regression Tests**: Ensure existing features remain functional

**Prerequisites:** All previous stories in Epic 22.

**Technical Notes:**

- Create test cases for each new feature
- Implement automated testing pipelines
- Add performance benchmarks
- Create regression test suites
- Document testing procedures and results

---

### Story 22.13: Update Documentation and Training Materials

**As a** product manager,  
**I want** updated documentation reflecting all new features,  
**So that** users can effectively utilize the enhanced VTC ERP system.

**Related FRs:** Documentation and training requirements.

**Acceptance Criteria:**

**Given** the completed Epic 22 implementation,  
**When** users access documentation,  
**Then** it includes:

- **User Guides**: Step-by-step instructions for new features
- **API Documentation**: Updated endpoints for stays and subcontracting
- **Training Materials**: Videos and tutorials for complex workflows
- **Release Notes**: Detailed changelog with new capabilities
- **Troubleshooting Guides**: Common issues and solutions

**And** documentation covers:

- **STAY Trip Type**: Complete guide for multi-day package creation
- **Subcontracting System**: Workflow and management procedures
- **Enhanced Pricing**: Round trip corrections and staffing transparency
- **Notes Management**: Post-DRAFT editing and dispatch integration
- **Best Practices**: Recommended workflows for different scenarios

**Prerequisites:** All features in Epic 22 completed and tested.

**Technical Notes:**

- Update existing documentation files
- Create new documentation for complex features
- Record video tutorials for key workflows
- Prepare training materials for different user roles
- Update help system and in-app guidance

---

### Summary

Epic 22 addresses critical system enhancements and fixes to make the VTC ERP fully functional:

1. **Critical Fixes** (Stories 22.1-22.3): Round trip pricing, staffing costs display, notes modification
2. **Subcontracting System** (Stories 22.4, 22.10): Complete workflow from management to execution
3. **STAY Trip Type** (Stories 22.5-22.8): Multi-day package system with pricing and invoicing
4. **Enhanced Dispatch** (Stories 22.9, 22.11): Staffing information and notes integration
5. **Quality & Documentation** (Stories 22.12-22.13): Testing, documentation, and training

This epic ensures the VTC ERP system provides complete functionality for complex travel packages, accurate pricing, efficient subcontracting, and comprehensive operational management.

---

## Summary

This document now defines the **24-epic structure**, summarises the **FR inventory and coverage** and provides **detailed stories** per epic with:

- User stories (As a / I want / So that).
- BDD-style acceptance criteria (Given / When / Then / And).
- Prerequisites and technical notes.
- Explicit references to related FRs for traceability.

The 24 epics cover the complete VTC ERP system:

**Core Foundation (Epics 1-2):** Data model, multi-tenancy, CRM, and partner contracts
**Pricing Engine (Epics 3-4, 14-18, 21):** Zone management, dynamic pricing, flexible routes, engine accuracy, quote system refactoring, advanced zone/compliance/availability features, advanced geospatial/yield management, and complete pricing transparency refactor  
**Fleet & Operations (Epics 5-8):** Vehicle management, compliance, quotes lifecycle, and dispatch optimization
**Configuration & Reporting (Epic 9):** Advanced pricing configuration and profitability reporting
**Platform Improvements (Epics 10-13):** Maps integration, zone management UI, partner pricing, and UX improvements
**Critical Fixes & Enhancements (Epics 19-20, 22-24):** Pricing engine bug fixes, RSE staffing automation, quote system stabilization, Google Maps API migration, toll/fuel integration, STAY trip type, subcontracting, vehicle category filtering, critical UI bug fixes, agency mini-CRM, and bidirectional pricing

It is intended as the canonical epic and story breakdown for implementation and sprint planning, following the BMad `create-epics-and-stories` workflow.

---

## Epic 23: Critical Bug Fixes & Vehicle Category Pricing Filters

**Goal:** Fix critical UI bugs blocking pricing configuration and quote creation, and implement vehicle category filtering for all pricing adjustment types to enable differentiated pricing per vehicle type.

**Priority:** Critical – Blocking issues preventing normal operation

**Related FRs:** FR111, FR112, FR119, FR120

---

### Story 23.1: Fix Pricing Routes/Excursions/Disposals Loading State Bug

**As a** pricing administrator,  
**I want** the pricing configuration pages to load correctly without getting stuck,  
**So that** I can configure routes, excursions, and disposals without manually refreshing the page.

**Related FRs:** FR119

**Acceptance Criteria:**

**Given** I navigate to `/settings/pricing/routes`,  
**When** the page loads,  
**Then** the route list or matrix view displays within 3 seconds without remaining in a perpetual loading state.

**Given** I switch between "Liste" and "Matrice" views,  
**When** I click on the view toggle,  
**Then** the view changes immediately and displays the correct data without a grey overlay or spinner remaining visible.

**Given** I navigate to `/settings/pricing/excursions` or `/settings/pricing/disposals`,  
**When** the page loads,  
**Then** the data displays correctly and the loading indicator disappears once data is fetched.

**Prerequisites:** Access to pricing settings pages.

**Technical Notes:**

- Investigate the loading state management in the route/excursion/disposal list components
- Check for race conditions between view toggle state and data fetching
- Ensure `isLoading` state is properly reset after successful or failed API calls
- Add error boundary to prevent silent failures
- Test with Playwright MCP to validate fix

---

### Story 23.2: Fix MultiZoneSelect Component Click Interaction Bug

**As a** pricing administrator,  
**I want** to select origin and destination zones using the mouse in excursion and route forms,  
**So that** I can configure zone-based pricing without keyboard-only workarounds.

**Related FRs:** FR119

**Acceptance Criteria:**

**Given** I open the Edit Excursion or Edit Route drawer/sheet,  
**When** I click on the "Select origin zones..." dropdown,  
**Then** the dropdown opens and displays the list of available zones.

**Given** the zone dropdown is open,  
**When** I click on a zone item,  
**Then** the zone is selected and added to the selection badges below the dropdown.

**Given** I have selected multiple zones,  
**When** I click the X button on a zone badge,  
**Then** the zone is removed from the selection.

**And** all interactions work with both mouse clicks and keyboard navigation.

**Prerequisites:** Story 23.1 (pages must load correctly first).

**Technical Notes:**

- The `MultiZoneSelect` component uses `DropdownMenu` with `modal={false}` (line 88)
- Issue may be related to Sheet/Dialog portal conflicts with dropdown portals
- Investigate z-index stacking context between Sheet and DropdownMenuContent
- Consider using Radix Popover instead of DropdownMenu for better Sheet compatibility
- Test in both create and edit modes
- Verify with Playwright MCP that clicks are registered correctly

---

### Story 23.3: Fix Pricing Adjustment Dialogs Freeze on Cancel/Save

**As a** pricing administrator,  
**I want** pricing adjustment dialogs to close properly when I cancel or save,  
**So that** the application remains responsive and I can continue working without refreshing.

**Related FRs:** FR120

**Acceptance Criteria:**

**Given** I open the Time-Based Rate edit dialog,  
**When** I click the "Cancel" button,  
**Then** the dialog closes, the overlay disappears, and the page is fully interactive.

**Given** I open the Seasonal Multiplier edit dialog and make changes,  
**When** I click the "Save" button and the save succeeds,  
**Then** the dialog closes, the list refreshes, and the page is fully interactive.

**Given** I open the Optional Fee or Promotion edit dialog,  
**When** I perform any cancel or save action,  
**Then** the application does not freeze and remains fully functional.

**And** this fix applies to all four dialog types: `AdvancedRateFormDialog`, `SeasonalMultiplierFormDialog`, `OptionalFeeFormDialog`, `PromotionFormDialog`.

**Prerequisites:** None.

**Technical Notes:**

- Investigate `onOpenChange` handlers in all four dialog components
- Check if parent state (e.g., `editingItem`, `isDialogOpen`) is properly reset
- Look for potential infinite re-render loops triggered by state updates
- Ensure the Dialog component's `open` prop is controlled correctly
- Consider using `key` prop to force remount on close
- Add `useEffect` cleanup to reset form state on unmount
- Test each dialog type individually with Playwright

---

### Story 23.4: Fix Positioning Costs Display in Quote Trip Transparency

**As a** dispatcher/operator,  
**I want** to see accurate positioning costs (approach fee, empty return) in the quote transparency panel,  
**So that** I can understand the true cost breakdown and make informed pricing decisions.

**Related FRs:** FR91, FR92 (from Epic 21)

**Acceptance Criteria:**

**Given** I create a new quote with pickup and dropoff addresses,  
**When** the trip analysis runs,  
**Then** the Positioning Costs section displays non-zero values for:
- Empty Return cost with distance and calculation breakdown
- Base information (To: [Base Name])

**Given** the quote has a valid pickup location,  
**When** no vehicle is yet assigned,  
**Then** the system shows an informative message: "Retour à vide sera calculé au dispatch (dépend de la base du véhicule)" instead of 0.00€ placeholders.

**Given** a vehicle/base is selected for the quote,  
**When** the positioning costs are calculated,  
**Then** the costs reflect the actual distance from dropoff back to the selected vehicle's home base.

**Prerequisites:** Valid routing data from Google Maps API.

**Technical Notes:**

- Check if `tripAnalysis.segments.approach` and `tripAnalysis.segments.return` are being populated
- Verify the shadow calculation service is running for new quotes
- The `PositioningCostsSection` component correctly handles null segments but may need fallback UI
- Ensure `vehicleSelection.selectedVehicle.baseName` is populated
- May need to trigger positioning calculation on address change, not just on save
- Investigate if the pricing engine is being called with incomplete data

---

### Story 23.5: Add Vehicle Category Field to Pricing Adjustment Data Models

**As a** backend engineer,  
**I want** to extend the pricing adjustment data models to support vehicle category filtering,  
**So that** each adjustment can be configured to apply to specific vehicle categories.

**Related FRs:** FR111

**Acceptance Criteria:**

**Given** the Prisma schema for `AdvancedRate`, `SeasonalMultiplier`, `OptionalFee`, and `Promotion`,  
**When** I review the models,  
**Then** each model includes:
- `vehicleCategoryMode` enum field: `ALL`, `SINGLE`, `MULTIPLE`
- `vehicleCategoryId` optional foreign key (for SINGLE mode)
- `vehicleCategoryIds` array/relation (for MULTIPLE mode)

**Given** I run `prisma migrate dev`,  
**Then** the migration applies successfully without data loss to existing records.

**And** existing records default to `vehicleCategoryMode = ALL` to maintain backward compatibility.

**Prerequisites:** None.

**Technical Notes:**

- Create a new enum `VehicleCategoryFilterMode` with values: ALL, SINGLE, MULTIPLE
- Add fields to all four models: AdvancedRate, SeasonalMultiplier, OptionalFee, Promotion
- For MULTIPLE mode, consider using a JSON array of IDs or a junction table
- Ensure indexes are created for efficient filtering
- Update TypeScript types in the frontend modules

---

### Story 23.6: Implement Vehicle Category Filter UI in Pricing Adjustment Forms

**As a** pricing administrator,  
**I want** to select which vehicle categories each pricing adjustment applies to,  
**So that** I can configure different rates for different vehicle types (e.g., different overtime fees per vehicle).

**Related FRs:** FR111

**Acceptance Criteria:**

**Given** I open the Time-Based Rate create/edit dialog,  
**When** I view the form,  
**Then** I see a new "Vehicle Categories" section with three options:
- "All Categories" (default, radio button)
- "Single Category" (radio button + dropdown selector)
- "Multiple Categories" (radio button + multi-select)

**Given** I select "Single Category",  
**When** I choose a vehicle category from the dropdown,  
**Then** the selected category is displayed and will be saved with the rate.

**Given** I select "Multiple Categories",  
**When** I check multiple categories from the multi-select,  
**Then** all selected categories are displayed as badges and will be saved.

**And** this UI pattern is consistent across all four dialog types: Time-Based Rates, Seasonal Multipliers, Optional Fees, and Promotions.

**Prerequisites:** Story 23.5 (data model changes).

**Technical Notes:**

- Create a reusable `VehicleCategoryFilter` component
- Use RadioGroup for mode selection
- Use Select for single category, MultiSelect/Checkbox group for multiple
- Fetch vehicle categories from existing API endpoint
- Update all four form dialog components to include this section
- Place the section logically after the value/adjustment fields

---

### Story 23.7: Update Pricing Engine to Filter by Vehicle Category

**As a** pricing engine,  
**I want** to filter applicable adjustments based on the quote's selected vehicle category,  
**So that** only relevant rates, fees, and promotions are applied to each quote.

**Related FRs:** FR112

**Acceptance Criteria:**

**Given** a quote with vehicle category "Berline" selected,  
**When** the pricing engine calculates applicable Time-Based Rates,  
**Then** it only applies rates where:
- `vehicleCategoryMode = ALL`, OR
- `vehicleCategoryMode = SINGLE` AND `vehicleCategoryId = quote.vehicleCategoryId`, OR
- `vehicleCategoryMode = MULTIPLE` AND `vehicleCategoryIds` contains `quote.vehicleCategoryId`

**Given** a quote with vehicle category "Minivan",  
**When** the pricing engine fetches applicable Optional Fees for display,  
**Then** the catalog only shows fees configured for Minivan or for all categories.

**Given** a quote switches vehicle category from "Berline" to "Van VIP",  
**When** the pricing is recalculated,  
**Then** the applicable adjustments update to reflect the new category's configuration.

**Prerequisites:** Stories 23.5, 23.6.

**Technical Notes:**

- Update the pricing service functions: `getApplicableAdvancedRates`, `getApplicableSeasonalMultipliers`, `getApplicableOptionalFees`, `getApplicablePromotions`
- Add `vehicleCategoryId` parameter to these functions
- Create a shared filter utility function for the category matching logic
- Update the quote pricing calculation flow to pass vehicle category
- Ensure backward compatibility with existing adjustments (ALL mode)

---

### Story 23.8: Display Vehicle Category Column in Pricing Adjustment Lists

**As a** pricing administrator,  
**I want** to see which vehicle categories each adjustment applies to in the list view,  
**So that** I can quickly understand the scope of each configuration.

**Related FRs:** FR111

**Acceptance Criteria:**

**Given** the Time-Based Rates list (`/settings/pricing/adjustments?tab=time-based`),  
**When** I view the table,  
**Then** I see a "Categories" column showing:
- "All" for adjustments with `vehicleCategoryMode = ALL`
- The category name for SINGLE mode
- "2 categories" (or count) with tooltip listing names for MULTIPLE mode

**Given** I hover over a "2 categories" badge,  
**When** the tooltip appears,  
**Then** it shows the list of category names (e.g., "Berline, Minivan").

**And** this column appears in all four lists: Time-Based, Seasonal, Optional Fees, Promotions.

**Prerequisites:** Stories 23.5, 23.6.

**Technical Notes:**

- Add `Categories` column to all four list components
- Create a `VehicleCategoryBadge` component for consistent display
- Use Tooltip component for showing full list on hover
- Ensure column is sortable/filterable if other columns support it
- Keep the column width reasonable (not too wide)

---

### Story 23.9: Add Vehicle Category Filter to Quote Fee/Promotion Catalog

**As an** operator creating a quote,  
**I want** the fee and promotion catalog to only show items applicable to my selected vehicle,  
**So that** I don't accidentally add fees that shouldn't apply to this vehicle type.

**Related FRs:** FR112

**Acceptance Criteria:**

**Given** I am creating a quote with a "Berline" vehicle selected,  
**When** I open "Add a fee or promotion" dialog and view "From Catalog",  
**Then** only Optional Fees configured for "Berline" or "All categories" are shown.

**Given** I change the vehicle category in the quote to "Autocar 57p",  
**When** I reopen the fee catalog,  
**Then** the list updates to show only fees applicable to "Autocar 57p" or "All categories".

**Given** a fee "Heure Supplémentaire Berline (70€)" is configured for Berline only,  
**When** I am creating a quote for a Minivan,  
**Then** this fee does not appear in the catalog.

**Prerequisites:** Story 23.7.

**Technical Notes:**

- Update the `useOptionalFees` hook to accept `vehicleCategoryId` parameter
- Filter the catalog results in the API call or frontend
- Ensure the quote form passes the current `vehicleCategoryId` to the catalog
- Handle the case where no category is selected yet (show all? show message?)
- Update the Promotions catalog similarly

---

### Story 23.10: Implement Automated E2E Tests for Bug Fixes

**As a** QA engineer,  
**I want** automated E2E tests covering all bug fixes in this epic,  
**So that** we can prevent regressions and validate fixes work correctly.

**Related FRs:** FR119, FR120

**Acceptance Criteria:**

**Given** the Cypress/Playwright test suite,  
**When** I run the Epic 23 test file,  
**Then** it validates:

1. **Loading State Test:**
   - Navigate to `/settings/pricing/routes`
   - Assert page loads within 5 seconds
   - Assert no loading spinner is visible
   - Switch to matrix view, assert it renders

2. **Zone Selection Test:**
   - Navigate to Excursions, click edit on an item
   - Click origin zone dropdown, assert it opens
   - Click a zone item, assert it's selected
   - Assert badge appears with zone name

3. **Dialog Cancel Test:**
   - Navigate to Time-Based Rates
   - Click edit on a rate
   - Click Cancel
   - Assert dialog is closed
   - Assert page is interactive (click another element)

4. **Positioning Costs Test:**
   - Create a new quote with valid addresses
   - Navigate to Costs tab
   - Assert positioning section is visible
   - Assert values are not all 0.00€ or show informative message

**Prerequisites:** Stories 23.1-23.4 completed.

**Technical Notes:**

- Use Playwright MCP for browser automation
- Create test file: `cypress/e2e/epic-23-bug-fixes.cy.ts`
- Include proper waits and assertions
- Test on both French and English locales if applicable
- Add to CI pipeline

---

### Story 23.11: Implement Vehicle Category Filter Tests

**As a** QA engineer,  
**I want** automated tests for the vehicle category filtering feature,  
**So that** we ensure correct filtering behavior across all pricing adjustment types.

**Related FRs:** FR111, FR112

**Acceptance Criteria:**

**Given** the test suite,  
**When** I run vehicle category filter tests,  
**Then** it validates:

1. **UI Test - Form:**
   - Open Time-Based Rate dialog
   - Select "Single Category" mode
   - Choose "Berline" from dropdown
   - Save and verify the rate shows "Berline" in list

2. **API Test - Filtering:**
   - Create test rates with different category modes
   - Call pricing engine with specific vehicle category
   - Assert only matching rates are returned

3. **Integration Test - Quote:**
   - Create quote with Berline vehicle
   - Open fee catalog
   - Assert only Berline-applicable fees shown

**Prerequisites:** Stories 23.5-23.9 completed.

**Technical Notes:**

- Create unit tests for the category filter logic
- Create integration tests for the pricing engine
- Create E2E tests for the UI flow
- Test all three modes: ALL, SINGLE, MULTIPLE
- Test edge cases: no category selected, category deleted

---

### Story 23.12: Update Documentation and User Guide

**As a** product manager,  
**I want** updated documentation covering the new features and bug fixes,  
**So that** operators can understand and use the vehicle category filtering feature.

**Related FRs:** Documentation requirements

**Acceptance Criteria:**

**Given** the completed Epic 23,  
**When** users access documentation,  
**Then** it includes:

1. **Release Notes:**
   - List of bug fixes with before/after descriptions
   - New vehicle category filtering feature overview

2. **User Guide - Vehicle Category Filtering:**
   - How to configure a rate for specific vehicle categories
   - Examples: night overtime fees per vehicle type
   - Impact on quote creation and fee catalogs

3. **Admin Guide:**
   - Migration notes for existing configurations
   - Troubleshooting common issues

**Prerequisites:** All Epic 23 stories completed.

**Technical Notes:**

- Update CHANGELOG.md with release notes
- Create/update user guide section in docs
- Include screenshots of new UI elements
- Document the data model changes for developers

---

### Epic 23 Summary

Epic 23 addresses critical blocking issues and implements an important pricing flexibility feature:

**Bug Fixes (Stories 23.1-23.4):**
- Loading state issues on pricing configuration pages
- Zone selection component not responding to clicks
- Application freeze after dialog cancel/save
- Positioning costs not displaying in quotes

**Feature: Vehicle Category Filtering (Stories 23.5-23.9):**
- Data model extension for category filtering
- UI implementation in all pricing forms
- Pricing engine filtering logic
- Quote catalog integration

**Quality Assurance (Stories 23.10-23.12):**
- Automated E2E tests for bug fixes
- Automated tests for new feature
- Documentation updates

This epic is critical for unblocking pricing configuration and enabling differentiated pricing per vehicle type as requested by the operator.

---

## Epic 24: Agency Mini-CRM & Bidirectional Pricing

**Goal:** Implement a sub-contact management system (Mini-CRM) for agency/partner contacts, enabling operators to track individual end-customers, attribute difficulty scores, and display end-customer names on quotes, invoices, and dispatch. Also implement bidirectional pricing display to compare client vs agency prices.

**Priority:** High – Improves CRM granularity and dispatch clarity

**Related FRs:** FR121, FR122, FR123, FR124, FR125, FR126, FR127, FR128, FR129, FR130

---

### Story 24.1: Create EndCustomer Data Model

**As a** backend engineer,  
**I want** to create an EndCustomer model linked to Partner contacts,  
**So that** operators can store and manage individual end-customers within agency profiles.

**Related FRs:** FR121

**Acceptance Criteria:**

**Given** the Prisma schema,  
**When** I review the EndCustomer model,  
**Then** it includes:
- `id` (cuid, primary key)
- `organizationId` (foreign key to Organization)
- `contactId` (foreign key to Contact, the parent agency)
- `firstName` (required string)
- `lastName` (required string)
- `email` (optional string)
- `phone` (optional string)
- `difficultyScore` (optional Int, 1-5 scale)
- `notes` (optional string)
- `createdAt`, `updatedAt` timestamps

**Given** I run `prisma migrate dev`,  
**Then** the migration applies successfully.

**And** the Contact model has a new `endCustomers EndCustomer[]` relation.

**Prerequisites:** None.

**Technical Notes:**

```prisma
model EndCustomer {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  contactId      String
  contact        Contact      @relation(fields: [contactId], references: [id], onDelete: Cascade)

  firstName       String
  lastName        String
  email           String?
  phone           String?
  difficultyScore Int?    // 1-5 scale for "patience tax"
  notes           String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  quotes Quote[]

  @@index([organizationId])
  @@index([contactId])
  @@map("end_customer")
}
```

- Add `endCustomers EndCustomer[]` to Contact model
- Add `endCustomerId` optional foreign key to Quote model
- Create Zod schemas for API validation

---

### Story 24.2: Implement EndCustomer CRUD API

**As a** backend engineer,  
**I want** API endpoints for managing end-customers,  
**So that** the frontend can create, read, update, and delete sub-contacts.

**Related FRs:** FR121, FR122

**Acceptance Criteria:**

**Given** the API routes,  
**When** I call `GET /api/contacts/:contactId/end-customers`,  
**Then** I receive a list of all end-customers for that contact.

**Given** a valid payload with firstName and lastName,  
**When** I call `POST /api/contacts/:contactId/end-customers`,  
**Then** a new end-customer is created and linked to the contact.

**Given** an existing end-customer,  
**When** I call `PATCH /api/end-customers/:id`,  
**Then** the end-customer is updated with the provided fields.

**Given** an end-customer with no linked quotes,  
**When** I call `DELETE /api/end-customers/:id`,  
**Then** the end-customer is deleted.

**And** attempting to delete an end-customer with linked quotes returns an error with guidance.

**Prerequisites:** Story 24.1.

**Technical Notes:**

- Create server actions in `apps/web/modules/saas/crm/actions/end-customer-actions.ts`
- Use Zod validation for input schemas
- Include `_count: { quotes: true }` in responses for mission count display
- Apply organization access control

---

### Story 24.3: Add EndCustomer Section to Partner Contact Detail Page

**As a** CRM user,  
**I want** to see and manage end-customers directly on the Partner contact detail page,  
**So that** I can maintain a list of individual clients for each agency.

**Related FRs:** FR122

**Acceptance Criteria:**

**Given** I view a Partner contact's detail page,  
**When** the page loads,  
**Then** I see a "Clients Finaux" (End Customers) section below the contact information.

**Given** the End Customers section,  
**When** I view the list,  
**Then** each row displays:
- Full name (lastName, firstName)
- Difficulty score badge (1-5 stars or "N/A")
- Mission count (number of linked quotes)
- Actions: Edit, Delete

**Given** I click "Ajouter un client",  
**When** the form opens,  
**Then** I can enter firstName, lastName, email (optional), phone (optional), difficulty score (1-5 dropdown), and notes.

**Given** I click "Modifier" on an end-customer,  
**When** the edit form opens,  
**Then** it is pre-filled with the existing data.

**Prerequisites:** Stories 24.1, 24.2.

**Technical Notes:**

- Create `EndCustomerList` component in `apps/web/modules/saas/crm/components/`
- Create `EndCustomerFormDialog` component for create/edit
- Use React Query for data fetching with optimistic updates
- Add empty state with call-to-action
- Display only for contacts where `isPartner = true`

---

### Story 24.4: Add EndCustomer Selector to Quote Creation Form

**As a** quote operator,  
**I want** to select an end-customer when creating a quote for a Partner contact,  
**So that** the quote is attributed to the correct individual client.

**Related FRs:** FR123, FR124

**Acceptance Criteria:**

**Given** I am creating a quote and select a Partner contact,  
**When** the contact has end-customers,  
**Then** a new "Client Final" dropdown appears after the contact selector.

**Given** the Client Final dropdown,  
**When** I click it,  
**Then** I see a list of end-customers for this agency with their names and difficulty scores.

**Given** no suitable end-customer exists,  
**When** I click "Créer un nouveau client",  
**Then** an inline form allows me to create a new end-customer without leaving the quote form.

**Given** I select an end-customer,  
**When** the quote is saved,  
**Then** the `endCustomerId` is stored on the Quote record.

**And** the quote summary displays: "Client: [LastName FirstName] (via [Agency Name])"

**Prerequisites:** Stories 24.1-24.3.

**Technical Notes:**

- Modify Quote model to add `endCustomerId String?` and relation
- Add `EndCustomerSelector` component to quote form
- Show only when selected contact is a partner
- Include inline creation option using `EndCustomerFormDialog`
- Automatically apply end-customer's difficulty score to quote pricing if configured

---

### Story 24.5: Display EndCustomer Name on Quote Summary and PDF

**As a** client/operator,  
**I want** the end-customer name to appear prominently on quotes and PDFs,  
**So that** individual clients are correctly identified on documents.

**Related FRs:** FR124, FR125

**Acceptance Criteria:**

**Given** a quote with an end-customer selected,  
**When** I view the quote summary,  
**Then** the client section displays:
- "Client: [FirstName] [LastName]"
- "Agence: [Agency Name]" (smaller text below)

**Given** I generate a PDF quote,  
**When** the document renders,  
**Then** the header shows the end-customer's name as the recipient.

**And** the billing section shows the agency name and billing address.

**Given** a quote without an end-customer,  
**When** I view the quote,  
**Then** the display uses the agency name as before (backward compatible).

**Prerequisites:** Story 24.4.

**Technical Notes:**

- Update quote summary component to conditionally display end-customer
- Modify PDF generation template (react-pdf or similar)
- Add `endCustomerFullName` computed field to quote API responses
- Ensure invoice PDF follows same pattern (Story 24.6)

---

### Story 24.6: Display EndCustomer Name on Invoice Documents

**As an** accountant/operator,  
**I want** invoices to show the correct end-customer name with agency billing,  
**So that** documents accurately reflect who received the service and who pays.

**Related FRs:** FR125

**Acceptance Criteria:**

**Given** an invoice generated from a quote with an end-customer,  
**When** the PDF is generated,  
**Then** the document shows:
- "Prestation pour: [EndCustomer FirstName LastName]"
- "Facturé à: [Agency Name]"
- "[Agency Billing Address]"

**Given** the invoice list view,  
**When** the invoice has an end-customer,  
**Then** the client column shows "[EndCustomer Name] ([Agency])".

**Prerequisites:** Story 24.5.

**Technical Notes:**

- Add `endCustomerId` to Invoice model or fetch from related Quote
- Update invoice PDF template
- Update invoice list component
- Maintain backward compatibility for invoices without end-customers

---

### Story 24.7: Integrate EndCustomer in Dispatch Interface

**As a** dispatcher,  
**I want** to see the end-customer name in the dispatch mission list,  
**So that** I can easily differentiate between multiple missions from the same agency.

**Related FRs:** FR126

**Acceptance Criteria:**

**Given** the dispatch mission list,  
**When** a mission has an end-customer,  
**Then** the client column displays: "[FirstName] [LastName] ([Agency Name])"

**Given** a mission without an end-customer,  
**When** I view the list,  
**Then** the display shows the agency name only (backward compatible).

**Given** I click on a mission to view details,  
**When** the detail panel opens,  
**Then** I see the end-customer's full details including:
- Name
- Phone (if available)
- Difficulty score (with visual badge)
- Agency name

**Prerequisites:** Story 24.4.

**Technical Notes:**

- Update dispatch mission card component
- Add end-customer info to mission detail panel
- Include `endCustomer` relation when fetching missions
- Display difficulty score with color-coded badge (1-2: green, 3: yellow, 4-5: red)

---

### Story 24.8: Link Difficulty Score to EndCustomer for Pricing

**As a** pricing engine,  
**I want** to use the end-customer's difficulty score for "patience tax" calculation,  
**So that** pricing adjustments are based on individual client behavior, not agency-level scores.

**Related FRs:** FR127

**Acceptance Criteria:**

**Given** a quote with an end-customer selected,  
**When** the pricing engine calculates the quote,  
**Then** it uses the end-customer's `difficultyScore` for any configured patience tax multipliers.

**Given** an end-customer with `difficultyScore = 5`,  
**When** patience tax is configured as "5% per point above 3",  
**Then** the quote price includes a 10% surcharge ((5-3) × 5%).

**Given** an end-customer with no difficulty score,  
**When** the pricing runs,  
**Then** no patience tax is applied (falls back to agency score or none).

**Prerequisites:** Stories 24.4, existing patience tax configuration.

**Technical Notes:**

- Modify pricing engine to check `quote.endCustomer?.difficultyScore` first
- Fall back to `quote.contact.difficultyScore` if no end-customer or no score
- Log which score source was used in TripAnalysis for transparency
- Update quote creation to copy end-customer difficulty score to quote

---

### Story 24.9: Implement Bidirectional Pricing Toggle in Quote Form

**As a** quote operator,  
**I want** to see and switch between client price and agency price,  
**So that** I can choose the best price for loyal private clients of partners.

**Related FRs:** FR128, FR129

**Acceptance Criteria:**

**Given** a quote for a Partner contact,  
**When** the pricing is calculated,  
**Then** I see both prices displayed:
- "Prix Grille Agence: €XXX" (from partner grid)
- "Prix Client Direct: €YYY" (C2C dynamic calculation)

**Given** a price difference exists,  
**When** I view the comparison,  
**Then** I see a visual indicator:
- 📈 "Prix Client +15%" if higher
- 📉 "Prix Agence -10%" if lower

**Given** I click the toggle button,  
**When** I switch from "Grille Agence" to "Client Direct",  
**Then** the selected price updates and is clearly marked as "Custom Pricing Mode".

**And** both calculated prices are stored in the quote record for auditing.

**Prerequisites:** Existing dynamic pricing and partner grid pricing.

**Technical Notes:**

- Add `pricingMode` enum field to Quote: PARTNER_GRID, CLIENT_DIRECT, MANUAL
- Add `partnerGridPrice` and `clientDirectPrice` Decimal fields to Quote
- Create `BidirectionalPriceToggle` component
- Calculate both prices in parallel during quote creation
- Display toggle only for partner contacts with grid pricing configured

---

### Story 24.10: Add EndCustomer Search and Filtering

**As a** CRM user with many end-customers,  
**I want** to search and filter the end-customer list,  
**So that** I can quickly find specific clients in large agency databases.

**Related FRs:** FR130

**Acceptance Criteria:**

**Given** the End Customers section on a partner contact,  
**When** there are more than 10 end-customers,  
**Then** a search bar appears above the list.

**Given** I type in the search bar,  
**When** I enter a partial name,  
**Then** the list filters to show matching end-customers (firstName or lastName contains search term).

**Given** filter options are available,  
**When** I filter by difficulty score,  
**Then** only end-customers with matching scores are shown.

**Given** I view an end-customer,  
**When** I look at their row,  
**Then** I see "Dernière mission: [date]" if they have linked quotes.

**Prerequisites:** Stories 24.2, 24.3.

**Technical Notes:**

- Add search input with debouncing (300ms)
- Implement client-side filtering for small lists (<100)
- Implement server-side filtering for large lists
- Add filter chips for difficulty score ranges
- Include mission statistics in API response

---

### Story 24.11: Implement Automated E2E Tests for Mini-CRM

**As a** QA engineer,  
**I want** automated tests covering the Mini-CRM feature,  
**So that** we can prevent regressions in end-customer management.

**Related FRs:** Testing requirements

**Acceptance Criteria:**

**Given** the E2E test suite,  
**When** I run Mini-CRM tests,  
**Then** it validates:

1. **EndCustomer CRUD:**
   - Navigate to partner contact detail
   - Create new end-customer with all fields
   - Edit end-customer
   - Delete end-customer (without quotes)
   - Verify delete blocked with quotes

2. **Quote Integration:**
   - Create quote for partner
   - Select end-customer
   - Verify name appears in summary
   - Generate PDF and verify content

3. **Dispatch Display:**
   - View dispatch list
   - Verify end-customer format "[Name] ([Agency])"
   - Open mission detail
   - Verify end-customer info visible

**Prerequisites:** Stories 24.1-24.10.

**Technical Notes:**

- Create test file: `cypress/e2e/epic-24-mini-crm.cy.ts`
- Use test fixtures for partner contacts and end-customers
- Include visual regression tests for key displays
- Test difficulty score badge rendering

---

### Story 24.12: Update Documentation for Mini-CRM Feature

**As a** product manager,  
**I want** complete documentation for the Mini-CRM feature,  
**So that** operators understand how to use end-customer management effectively.

**Related FRs:** Documentation requirements

**Acceptance Criteria:**

**Given** the completed Epic 24,  
**When** users access documentation,  
**Then** it includes:

1. **User Guide - Clients Finaux:**
   - What are end-customers and why use them
   - How to add/edit/delete end-customers
   - How to use difficulty scores
   - How to select end-customers in quotes

2. **User Guide - Bidirectional Pricing:**
   - Understanding price modes (grid vs client)
   - When to use each pricing mode
   - How to switch between modes

3. **Admin Guide:**
   - Data model overview
   - Migration notes
   - API reference

**Prerequisites:** All Epic 24 stories completed.

**Technical Notes:**

- Create user guide section in docs
- Include annotated screenshots
- Document API endpoints for developers
- Add FAQ section for common questions

---

### Epic 24 Summary

Epic 24 implements a comprehensive Mini-CRM for agency sub-contacts and bidirectional pricing:

**Data Model (Story 24.1):**
- EndCustomer entity linked to Partner contacts
- Quote and Invoice integration

**CRM Features (Stories 24.2-24.3, 24.10):**
- CRUD API for end-customers
- Partner contact detail page integration
- Search and filtering for large lists

**Quote & Invoice Integration (Stories 24.4-24.6):**
- End-customer selector in quote form
- Name display on summaries and PDFs
- Proper billing attribution

**Dispatch Enhancement (Story 24.7):**
- "[EndCustomer] ([Agency])" display format
- End-customer details in mission panel

**Pricing Integration (Stories 24.8-24.9):**
- Difficulty score from end-customer
- Bidirectional pricing toggle (grid vs client)

**Quality Assurance (Stories 24.11-24.12):**
- Automated E2E tests
- Complete documentation

This epic enables operators to manage individual clients within agency accounts, providing granular CRM data, accurate quoting, and improved dispatch clarity.

---

## Epic 25: Documents, Payments & Deep Linking Enhancements

**Goal:** Implement PDF mission sheets with editable fields, compliant invoice/quote layouts, document personalization settings, B2C invoicing address support, enhanced deep linking navigation, and multi-invoice payment tracking.

### Story 25.1: Generate & Manage Mission Sheets (Fiche Mission)

As a **dispatcher or driver**,
I want **to generate a PDF Mission Sheet with auto-filled operational data and editable fields**,
So that **I have a compliant transport order that can be enriched manually with actual execution details.**

**Acceptance Criteria:**

**Given** a confirmed dispatch mission or quote,
**When** I click "Generate Mission Sheet",
**Then** a preview opens pre-filled with: Date, Mission Ref, Client (Name/Phone), Driver (Name/Phone), Vehicle (Type/Plate), Service details, Passenger list (Names, Phones, Counts), and Notes (Internal/Driver/Passenger).

**And** the "Dossier créé le" timestamp shows the exact creation date/time of the file.

**And** the fields "Km départ/arrivée", "Heure départ/arrivée garage", "Péage/Parking/Divers" are cleanly displayed but **left empty** (or as fillable form fields) to allow the driver to enter actual values manually.

**Given** the preview (before final generation),
**When** I edit any field manually (e.g. updating a specialized note or correcting a time),
**Then** the final generated PDF reflects these manual overrides.

**Given** a generated sheet,
**When** it is finalized,
**Then** it is automatically saved in the Driver's activity history (`Contact.Activity`) and can be retrieved later from the CRM.

### Story 25.2: EU-Compliant Invoice & Quote PDF Layout

As an **accountant or admin**,
I want **PDF documents to strictly follow a specific compliant layout (Logo right, Sender left, Recipient right, Tabular breakdown)**,
So that **my documents are professional and legally compliant with FR/EU standards.**

**Acceptance Criteria:**

**Given** any Quote or Invoice PDF generation intent,
**When** the PDF is rendered,
**Then** the header structure strictly follows the configured "Logo Position" (Left or Right):

*   **IF Logo Position = LEFT (Default):**
    *   **Top Left:** The Company Logo.
    *   **Top Right:** Quote/Invoice Number, Date, Valid Until.
*   **IF Logo Position = RIGHT:**
    *   **Top Right:** The Company Logo.
    *   **Top Left:** Quote/Invoice Number, Date, Valid Until.

**And** regardless of logo position, the address blocks follow:
- **Below Header Left:** "From" block with Company Name, Address, Phone, Email, SIRET, VAT.
- **Below Header Right (aligned):** "Bill To" block with Client Name, Address, Contact Info.

**And** the main body uses a strict table format with columns: **Description, Qty, Rate, Total**.

**And** if applicable (Quotes), a "Trip Details" block summary (Distance, Duration, Estimated Fuel Cost) is included clearly below the line items.

**And** the legal footer includes the configured SIRET, VAT, Address, and Page Numbers.

### Story 25.3: Organisation Document Personalization

As an **admin**,
I want **to upload my Logo and set display preferences (Color, Legal Metadata, CGV)**,
So that **all generated documents reflect my specific brand identity without code changes.**

**Acceptance Criteria:**

**Given** `/dashboard/settings/organization`,
**When** I upload a high-quality Logo (SVG, PNG) and set a "Primary Brand Color",
**Then** these assets serve as the source of truth for all PDF headers and borders.

**And** I can select a "Logo Position" preference (Left or Right) that immediately updates the document layout logic.

**And** I can edit "Legal Mentions" (SIRET, VAT, Address) and "Terms & Conditions" text fields.

**And** these settings immediately apply to the next generated PDF for any user in the organization.

### Story 25.4: B2C Invoicing Address & Agency Transparency

As an **operator**,
I want **to specify billing addresses for private clients and see end-customer names on agency invoices**,
So that **billing is accurate for all client types and transparent for partners.**

**Acceptance Criteria:**

**Given** a Private Contact (B2C) profile,
**When** I edit their profile,
**Then** I can add a specific "Billing Address" distinct from their physical/home address.

**Given** an Agency Quote or Invoice involving a sub-contact (End Customer),
**When** it is generated,
**Then** the description line of the service explicitly includes the text `(End Customer: {Name})` to identify who the ride was for.

### Story 25.5: Deep Linking Navigation & CRM UX Improvements

As an **operator**,
I want **to navigate directly to specific resource states via URL and have a wider workspace**,
So that **I can share links to specific issues and work more comfortably.**

**Acceptance Criteria:**

**Given** I access a URL like `/dashboard/contacts/123/invoices` or `/dashboard/quotes/456?view=preview`,
**Then** the application navigates directly to that state (e.g., opens the Contact Drawer immediately on the "Invoices" tab).

**Given** the Contact Drawer or Modal,
**When** it opens,
**Then** the width is increased (e.g., `max-w-4xl` or `w-3/4`) to comfortable show multiple columns of data without cramping.

**Given** an Agency Contact view,
**When** I view the "End Customers" tab/list,
**Then** I see a "Invoices Count" column for each sub-contact to quickly spot activity volume.

### Story 25.6: Multi-Invoice Payment Tracking (Lettrage)

As a **finance user**,
I want **to select multiple unpaid invoices for a client and apply a single payment**,
So that **I can handle bulk virements from large agencies efficiently and track remaining balances.**

**Acceptance Criteria:**

**Given** a Contact's "Invoices" tab,
**When** I filter for status="Unpaid" or "Partial", and multi-select several invoices,
**Then** a "Register Payment" action appears.

**Given** I click "Register Payment",
**When** I enter a total payment amount (e.g., 5000€),
**Then** the system applies the amount to the **oldest selected invoices first** (chronological order) until the amount is exhausted.

**And** the "Remaining to Pay" status is updated dynamically for the client and for each specific invoice (showing Partial or Paid).

**And** a global "Remaining Balance" indicator is visible in the Contact header.



## Epic 26: Flexible "Yolo Mode" Billing (Universal Blocks)

**Goal:** Implement the "Hybrid Block" architecture to allow mixing calculated trips, manual text lines, and groups in Quotes and Invoices, enabling full editability ("Notion-like") while preserving operational data.

### Story 26.1: Database Schema Update for Hybrid Blocks & Mission Model

As a **backend engineer**,
I want to restructure the database to support "Service Blocks" and "Missions",
So that we can decouple the Commercial Quote (flexible) from the Operational Mission (strict).

**Related FRs:** FR143, FR144.

**Acceptance Criteria:**
- **Create `QuoteLine` model**: `type` (CALCULATED, MANUAL, GROUP), `sourceData` (Json - Immutable Operational Truth), `displayData` (Json - Mutable Commercial Truth), `parentId` (Nest), `sortOrder`.
- **Create `Mission` model**: As per Epic 27 requirements (`driverId`, `vehicleId`, `sourceData`, `status`). Link to `Quote` (or `QuoteLine` if granular tracking is needed).
- Update `InvoiceLine` to match the new `QuoteLine` structure.
- Deprecate `TripType` enum (replaced by `QuoteLine.type`).

### Story 26.2: Backward Compatibility Migration Script

As a **backend engineer**,
I want to migrate existing Quotes to the Service Block structure,
So that historic data is preserved and accessible in the new editor.

**Related FRs:** FR143.

**Acceptance Criteria:**
- Script iterates all existing `Quote` records.
- **Standard Trips**: Create a single `QuoteLine` (Type: `CALCULATED`) with `sourceData` from Quote fields.
- **STAY Trips**:
    - Create a root `GROUP` line for the Stay.
    - Iterate `Quote.stayDays` (if exists) or generate days between start/end.
    - Create nested `GROUP` lines for each "Day".
    - Move services into respective Days.
- **Mission Creation**: Generate `Mission` records for all resulting lines.
- Verify total amounts match pre-migration values exactly.
- **Validation**: Run against a production dump before applying.

### Story 26.3: Hybrid Block Validation Layer (Zod)

As a **backend developer**,
I want strict validation for the nested block structure,
So that the API rejects malformed trees or groups nested too deep.

**Related FRs:** FR146.

**Acceptance Criteria:**
- Update `quoteSchema` and `invoiceSchema` to accept `lines` as a recursive or flat-with-parent array.
- Validate that `GROUP` lines cannot have a `parentId` that is also a `GROUP` (max depth 1).
- Validate that `CALCULATED` lines MUST have valid `sourceData` matching the pricing engine schema.

### Story 26.4: Backend API - CRUD for Nested Lines & Totals

As a **frontend developer**,
I want the API to handle batch updates of lines including re-parenting and auto-calculation,
So that when I drag a line or change a price, the Quote Total reflects reality.

**Related FRs:** FR146.

**Acceptance Criteria:**
- `PATCH /quotes/:id` accepts the full list of lines.
- **Aggregation**: Triggers a recalculation of `Quote.finalPrice` and `Quote.internalCost` (Sum of all lines) and updates the parent Quote record.
- The service handles diffing or delete-and-replace to update `parentId` and `sortOrder`.
- Ensure transaction safety (all lines update or fail).

### Story 26.5: UI - Universal Block Row Component

As a **frontend developer**,
I want a versatile row component that changes appearance based on block type,
So that I don't need multiple table components.

**Related FRs:** FR146.

**Acceptance Criteria:**
- If type=`CALCULATED`: Render "Linked" icon, show Route summary in tooltip.
- If type=`MANUAL`: Render "Text" icon, show simple inputs.
- If type=`GROUP`: Render as a Section Header with a "Collapse/Expand" toggle.
- Inputs for Qty/Price/VAT are auto-sized to content.

### Story 26.6: UI - Click-to-Edit & Inline Forms

As an **operator**,
I want to click text to edit it immediately,
So that I can work fast without opening modals.

**Related FRs:** FR146.

**Acceptance Criteria:**
- Clicking `displayData.label` transforms `<span>` into `<input autoFocus>`.
- Blurring the input saves the local state.
- Pressing `Enter` commits the change and moves focus to the next line.

### Story 26.7: UI - Drag & Drop Reordering & Grouping

As an **operator**,
I want to drag lines to reorder them or drop them into groups,
So that I can organize the quote logically (e.g., by Day).

**Related FRs:** FR146, FR148.

**Acceptance Criteria:**
- Use `dnd-kit` (sortable).
- Dragging a line changes its `sortOrder`.
- Dragging a line *under* a Group Header sets its `parentId` to that Group.
- Dragging a Group moves the group and all its children.

### Story 26.8: UI - Slash Commands Menu

As an **power user**,
I want to type `/` to see a menu of block types,
So that I can quickly add headers or text lines.

**Related FRs:** FR146 (Notion-like).

**Acceptance Criteria:**
- Typing `/` in the Label input opens a Popover.
- Options: "Text Block", "Heading (Group)", "Service", "Discount".
- Selecting an option changes the current line's type or inserts a new one.

### Story 26.9: Operational "Detach" Logic

As an **operator**,
I want protection against invalidating the operational route,
So that I don't accidentally sell a "Paris Trip" as a "London Trip".

**Related FRs:** FR145, FR147.

**Acceptance Criteria:**
- If user edits `label` significantly (heuristic?) -> Warning toast.
- If user edits `Date/Time` (if exposed in line) -> Modal: "Detach from Route logic?".
- Confirming "Detach" clears `sourceData`, sets type to `MANUAL`, and removes the "Linked" icon.

### Story 26.10: Real-Time Profitability Computation

As a **finance user**,
I want to see the specific margin for each line item,
So that I can spot under-priced custom items.

**Related FRs:** FR149.

**Acceptance Criteria:**
- `QuoteBuilder` computes `(displayPrice - internalCost) / displayPrice` for every line.
- `internalCost` comes from `sourceData` (Calculated) or user input (Manual).
- Margin is displayed as a colored badge (Green > 30%, Red < 0%) on the far right of the row.

### Story 26.11: PDF Generator - pure Display Mode

As a **developer**,
I want the PDF to respect my manual edits strictly,
So that the customer gets exactly what I prepared.

**Related FRs:** FR144.

**Acceptance Criteria:**
- The PDF renderer maps `displayData` to the pricing table.
- `sourceData` is ignored for the Commercial Invoice/Quote.
- Groups are rendered as Sub-headers in the PDF table (breaking the grid).

### Story 26.12: PDF Generator - Mission Order (Operational Mode)

As a **dispatcher**,
I want the Mission Order to show the implementation details,
So that the driver knows the real route, not the "Commercial Label".

**Related FRs:** FR144.

**Acceptance Criteria:**
- The Mission Order PDF reads `sourceData` (Origin/Dest/Times).
- If a line is `MANUAL` (no source), it prints the `displayData.label` with a "See Notes" warning.

### Story 26.13: Block Presets / Templates (Bonus)

As an **operator**,
I want to save common text blocks (e.g., "Champagne Bottle"),
So that I can reuse them without re-typing.

**Related FRs:** FR146.

**Acceptance Criteria:**
- "Save as Template" action on a row.
- "Insert Template" option in the Slash Menu.
- Templates are stored in a simple `BlockTemplate` table.

### Story 26.14: Undo/Redo History support

As an **operator**,
I want to undo my last action if I made a mistake,
So that I don't lose work during complex editing.

**Related FRs:** FR146.

**Acceptance Criteria:**
- `useTemporalStore` (Zustand) tracks the state of the line items array.
- `Cmd+Z` reverts the last change (text edit, reorder, or delete).

### Story 26.15: Remove Legacy Modes (Stay & Off-Grid)

As a **developer**,
I want **to remove obsolete Stay and Off-Grid modes**,
So that **the codebase is simplified and unified under the new Yolo/Shopping Cart model.**

**Related FRs:** FR150.

**Acceptance Criteria:**
- User CANNOT select "Stay" or "Off-Grid" in trip type selector.
- Obsolete components (`StayDayCard`, `StayServiceForm`) are removed.
- `useStayPricingCalculation` logic is removed from Cockpit.

### Story 26.16: Multi-Trip Calculation Flow (Shopping Cart)

As a **Quote Creator**,
I want **to add multiple calculated trips to a single quote**,
So that **I can build complex itineraries (Transfer + return + disposal) in one session.**

**Related FRs:** FR150, FR151, FR152.

**Acceptance Criteria:**
- "Add to Quote" button pushes the current configuration to the Cart line items.
- Quote total updates in real-time as items are added.
- Form inputs can be reset or reused for the next item.
- Supports mixing transfers and disposals in the same quote.

### Story 26.17: UX Improvements

As an **operator**,
I want **a smooth and intuitive interface for the quote cart**,
So that **I can manage complex quotes without confusion.**

**Related FRs:** FR155, FR156.

**Acceptance Criteria:**
- Cart items are displayed with clear summaries (Route, Vehicle, Price).
- Visual feedback (toast/animation) when adding items.
- Layout optimized for 3-column or Drawer view.

### Story 26.18: Align Invoice Generation

As a **finance user**,
I want **invoices generated from multi-item quotes to respect the cart structure**,
So that **the final document matches what was sold.**

**Related FRs:** FR148 (implicit), FR158.

**Acceptance Criteria:**
- Invoice generation reads `QuoteLines` array.
- VAT breakdown respects individual line item settings.
- PDF generation handles multiple pages if lines exceed space.

### Story 26.19: Enhanced Quote Cart Interactions (Edit & Duplicate)

As an **operator**,
I want **to edit, duplicate, or remove items in the cart**,
So that **I can refine the quote without starting over.**

**Related FRs:** FR153, FR154.

**Acceptance Criteria:**
- Clicking an item in the cart repopulates the configuration form ("Edit Mode").
- "Update Item" saves changes back to the cart.
- "Duplicate" action creates a copy of the selected item.
- "Remove" action deletes the item and updates the total.

### Story 26.20: Visual Polish & Glassmorphism

As a **user**,
I want **a premium "Glassmorphism" aesthetic for the quote cart**,
So that **the experience feels revolutionary and high-end.**

**Related FRs:** FR155.

**Acceptance Criteria:**
- Cart panels use glass/blur effects (`backdrop-blur`).
- Animated transitions for adding/removing items (framermotion).
- Price changes trigger number rolling animations.
- Modern typography and spacing usage.

### Story 26.21: Template Saving for Multi-Item Quotes

As an **operator**,
I want **to save a complex quote structure as a Template**,
So that **I can re-use it for recurring similar requests (e.g. "Fashion Week Package").**

**Related FRs:** FR157.

**Acceptance Criteria:**
- "Save as Template" button on the Quote Cart.
- Template stores all line items and their configurations (excluding specific dates if needed).
- "Load Template" allows creating a new quote from a saved structure.

---

## Epic 27: Unified Dispatch (Cockpit) & Live Operations

**Goal:** Consolidate the dispatch system into a single "Command Center" (`/dispatch`) featuring a synchronized Gantt, Live Map, and Unassigned Backlog, replacing the legacy list view while maintaining its functionality.

### Story 27.1: Dispatch Shell & Navigation

As a **dispatcher**,
I want a unified page layout that maximizes screen real estate,
So that I can see the timeline and map simultaneously.

**Related FRs:** FR140.

**Acceptance Criteria:**
- `/dispatch` route loads the shell.
- Header contains "View Mode" (Gantt/List) and "Date Range Picker".
- Sidebar (Backlog) is collapsible.
- Layout uses CSS Grid/Flex to adapt to window height (no double scrollbars).

### Story 27.2: Backend - Mission Synchronization Service

As a **backend engineer**,
I want a service that automatically syncs Quote Lines to Missions,
So that any change in the Commercial Quote (Date, Time, new Line) is instantly reflected in Dispatch.

**Related FRs:** FR141 (Multi-leg).

**Acceptance Criteria:**
- **Sync Logic**:
    - On `Quote` Create/Update: Identify `CALCULATED` or time-bound `GROUP` lines.
    - Create/Update/Delete corresponding `Mission` records.
- **Handling Deletions**: If a Quote Line is removed, the associated Mission is removed (unless it was already Started/Done -> Error or Archive?).
    - *Decision*: If Mission is `ASSIGNED` or deeper, block deletion of Quote Line or warn user.
- **Independence**: `Mission` has its own `driverId` and `status` which are NOT overwritten by Quote updates (unless the Date changes completely).

### Story 27.3: Gantt - Core Timeline Rendering

As a **dispatcher**,
I want to see a timeline with hours and days,
So that I have a temporal reference.

**Related FRs:** FR141.

**Acceptance Criteria:**
- Render Svar Gantt (or Dnd-Kit timeline).
- X-Axis: Time (Zoomable: Day, Week).
- Y-Axis: Drivers (Grouped by Base/Vehicle Type optional).
- Current time indicator (Vertical red line).

### Story 27.4: Gantt - Mission Rendering (Hybrid)

As a **dispatcher**,
I want to see both standard transfers and manual "Yolo" missions,
So that no job is hidden.

**Related FRs:** FR141.

**Acceptance Criteria:**
- `CALCULATED` missions: Render exact duration from `sourceData`.
- `MANUAL` missions: Render using `startAt` and default duration (1h), with "Dashed" visual style to indicate "No GPS".
- Labels on bars show "Client Name - Trip Type".

### Story 27.5: Unassigned Backlog - Sidebar Logic

As a **dispatcher**,
I want to filter the unassigned jobs to find what I need,
So that the list isn't overwhelming.

**Related FRs:** FR144.

**Acceptance Criteria:**
- Sidebar lists unassigned missions.
- Sort by: Time (soonest first).
- Filter by: Zone, Vehicle Category.
- Search: Client Name.

### Story 27.6: Live Map - Driver Locations Layer

As a **dispatcher**,
I want to see where my drivers are right now,
So that I can make informed decisions.

**Related FRs:** FR142.

**Acceptance Criteria:**
- Fetch latest GPS coordinates from `DriverPosition` (or Mock for now).
- Render Pins on Map.
- Color code pins by Status (Green=Active, Grey=Off).

### Story 27.7: Live Map - Mission Context Layer

As a **dispatcher**,
I want to see the route of the selected mission on the map,
So that I understand the geography.

**Related FRs:** FR142.

**Acceptance Criteria:**
- When a Mission is clicked (Gantt or Backlog), Map clears.
- Map renders the Route Polyline (from `sourceData`).
- Map fits bounds to the route.

### Story 27.8: Map - Smart Assignment Suggestions

As a **dispatcher**,
I want the map to highlight the best drivers for a selected unassigned job,
So that I minimize deadhead.

**Related FRs:** FR142.

**Acceptance Criteria:**
- When Unassigned Mission is selected:
- Calculate distance from each Available Driver to Mission Pickup.
- Highlight the 3 closest drivers on the map.
- Show "Estimated Approach Time" in tooltip.

### Story 27.9: Dispatch Actions - Drag & Drop Assignment

As a **dispatcher**,
I want to drag a job onto a driver to assign it,
So that scheduling is tactile and fast.

**Related FRs:** FR144.

**Acceptance Criteria:**
- Drag card from Backlog -> Drop on Driver Row -> `PATCH /missions/:id` with `driverId`.
- Drag bar from status "Unassigned" -> Drop on Driver -> Same effect.
- Revert drop if backend returns error.

### Story 27.10: Conflict Detection - RSE & Calendar

As a **dispatcher**,
I want the system to refuse or warn about illegal assignments,
So that I stay compliant.

**Related FRs:** FR143.

**Acceptance Criteria:**
- Check overlap with `DriverCalendarEvent` (Holiday). -> Block assignment.
- Check RSE (Max driving time). -> Warn assignment (Red Shake).
- Check overlap with another Mission. -> Warn assignment.

### Story 27.11: Inspector Panel - Quick Actions

As a **dispatcher**,
I want to resolve issues quickly from the details panel,
So that I don't have to navigate away.

**Related FRs:** FR140.

**Acceptance Criteria:**
- Right Panel shows selected mission.
- Actions: "Unassign", "Edit Route", "Contact Driver", "Cancel".
- Edit Route opens the Yolo Editor (Epic 26 components) in a Modal.

### Story 27.12: Gantt - Time & Zoom Controls

As a **dispatcher**,
I want to zoom out to see the week or zoom in to see the hour,
So that I can manage different horizons.

**Related FRs:** FR140.

**Acceptance Criteria:**
- Zoom Controls (+/-).
- "Today" button jumps to current time.
- Date Picker jumps to specific day.

### Story 27.13: Real-Time Updates (Polling/Socket)

As a **dispatcher**,
I want the screen to update if another dispatcher triggers a change,
So that we don't double-book.

**Related FRs:** FR140.

**Acceptance Criteria:**
- Use TanStack Query polling (e.g. 10s) or WebSocket subscription.
- If a mission state changes (e.g. becomes assigned), it moves from Backlog to Timeline automatically.

### Story 27.14: Export Schedule

As a **dispatcher**,
I want to print the daily schedule for the wall,
So that we have a backup.

**Related FRs:** FR140 (Legacy).

**Acceptance Criteria:**
- "Export PDF" button.
- Generates a linear list or simplified Gantt image for the current view.
- Includes Driver Names and assigned Missions.

---

## Epic 28: Order Management & Intelligent Spawning (Dossier de Commande)

**Goal:** Implement the "Dossier" lifecycle to manage multi-mission orders, intelligent spawning from quotes, and flexible execution-aware invoicing.
**FRs Covered:** FR160-FR173.

### Story 28.1: Order Entity & Prisma Schema

As a **developer**,
I want to establish the Order (Dossier) data model and its workflow states,
So that we can link Quotes and Invoices under a single parent entity.

**Related FRs:** FR160, FR161.

**Acceptance Criteria:**
- Create `Order` model in Prisma with relations to `Quote`, `Invoice`, `Mission`.
- Define `OrderStatus` enum: `DRAFT`, `QUOTED`, `CONFIRMED`, `INVOICED`, `PAID`, `CANCELLED`.
- Migration script to create tables.
- Seed data for testing.
- Ensure `QuoteLine` and `Mission` relate correctly to `Order` (optional direct link or via Quote).

### Story 28.2: Order State Machine & API

As a **developer**,
I want an API to manage Order transitions,
So that the frontend can move an order from Draft to Confirmed.

**Related FRs:** FR161.

**Acceptance Criteria:**
- API `POST /api/orders` to create a dossier from a Quote (or empty).
- API `PATCH /api/orders/:id/status` with validation logic.
- Ensure state transitions are technically valid (e.g. can't confirm without a customer).
- Audit logging for status changes.

### Story 28.3: Dossier View UI - Skeleton & Tabs

As an **operator**,
I want a unified "Dossier" view with tabs for Commercial, Operational, and Financial data,
So that I can see the whole picture.

**Related FRs:** FR162.

**Acceptance Criteria:**
- New page `/app/orders/:id`.
- Header: Order ID, Status Badge, Client Name, Aggregate Total.
- Tabs Navigation: Commercial, Operations, Financial.
- Empty states for each tab.

### Story 28.4: Spawning Engine - Trigger Logic

As a **system**,
I want to automatically spawn missions when an Order is CONFIRMED,
So that the dispatch team creates tasks without manual entry.

**Related FRs:** FR163, FR164.

**Acceptance Criteria:**
- Backend event listener on `CONFIRMED` transition.
- Iterate through `QuoteLine` items.
- Logic: If type is `TRANSFER` or `DISPOSAL`, create 1 `Mission`.
- Mission inherits: Date, Addresses, Passenger Count, Vehicle Category.
- Mission status: `PENDING` (Backlog).

### Story 28.5: Group Spawning Logic (Multi-Day)

As a **system**,
I want to spawn multiple missions if the Quote Line is a GROUP (e.g. Wedding Pack),
So that each day/segment becomes a dispatchable item.

**Related FRs:** FR165.

**Acceptance Criteria:**
- Identify `QuoteLine` of specific group types.
- If Group contains sub-lines (children), spawn missions for children.
- If Group is a time-block (e.g. 3 days), generate N missions (1 per day) based on logic.
- Ensure proper linking (QuoteLineId on Mission).

### Story 28.6: Optional Dispatch & Force Enable

As an **operator**,
I want to decide which quote lines become missions,
So that I don't clutter dispatch with "Champagne" lines, but CAN dispatch "Luggage Van".

**Related FRs:** FR166, FR167.

**Acceptance Criteria:**
- Schema: Add `dispatchable` boolean to `QuoteLine`.
- Spawning Engine checks `dispatchable` flag.
- UI Action: "Create Mission" on a non-dispatchable line in the Dossier view to override.

### Story 28.7: Manual Item Handling

As an **operator**,
I want to manually convert a free-text line into a mission,
So that unique requests are handled.

**Related FRs:** FR167.

**Acceptance Criteria:**
- In "Commercial" tab, for `MANUAL` lines: Show "Spawn Mission" button.
- Opens modal to define Mission details (Time, Vehicle Category) if missing.
- Creates linked Mission.

### Story 28.8: Invoice Generation - Detached Snapshot

As a **system**,
I want generated invoices to be a copy of the quote data but independent,
So that editing the invoice doesn't break the quote history.

**Related FRs:** FR168.

**Acceptance Criteria:**
- "Generate Invoice" action duplicates `QuoteLine` data to `InvoiceLine`.
- `InvoiceLine` must have its own `description`, `quantity`, `price` fields.
- Ensure `Invoice` is structurally independent of `Quote`.

### Story 28.9: Invoice UI - Full Editability

As a **finance officer**,
I want to edit every field on the invoice draft,
So that I can fix typos or adjust prices before sending.

**Related FRs:** FR169.

**Acceptance Criteria:**
- Invoice Editor allows inline editing of Description, Qty, Unit Price, VAT.
- "Save Draft" updates the `Invoice` entity.
- Recalculate totals on the fly (Client-side and Server-side validation).

### Story 28.10: Execution Feedback Loop (Placeholders)

As an **operator**,
I want to use placeholders like `{{driver}}` in my invoice lines,
So that the final invoice automatically shows who did the job.

**Related FRs:** FR170.

**Acceptance Criteria:**
- Support placeholders: `{{mission.driverName}}`, `{{mission.vehiclePlate}}`, `{{mission.startAt}}`.
- "Render/Preview" button replaces placeholders with actual Mission data.
- "Finalize" permanently substitutes text.

### Story 28.11: Partial Invoicing

As an **operator**,
I want to invoice only specific lines or a percentage (Deposit),
So that I can bill progressively.

**Related FRs:** FR171.

**Acceptance Criteria:**
- "Create Invoice" modal selection: "Full", "Deposit %", "Select Lines".
- If "Deposit", create a single line invoice definition.
- If "Select Lines", allow picking which `QuoteLines` to include.

### Story 28.12: Post-Mission Pending Charges

As an **operator**,
I want to see waiting time added by drivers as "Pending Charges",
So I can decide to bill them.

**Related FRs:** FR172.

**Acceptance Criteria:**
- Dispatch side: Driver/Dispatcher adds "Extra Fee" (Wait time) to Mission.
- Dossier View: Shows "Pending Ops Charges" notification.
- Action: "Add to Invoice" or "Dismiss".

### Story 28.13: Ad-Hoc Free Missions

As a **dispatcher**,
I want to create a mission linked to a dossier but with 0 cost,
So that I can track "Wash Car" or "Courtesy Ride" tasks.

**Related FRs:** FR173.

**Acceptance Criteria:**
- "Add Mission" in Dossier View (Operational tab).
- Option "Non-Billable" / "Internal".
- Does not create a QuoteLine (or creates a 0€ hidden one).
- Appears in Dispatch.

---

## Epic 29: Complete Multi-Mission Quote Lifecycle (Yolo Mode V2)

**Goal:** Provide a robust, end-to-end "Shopping Cart" experience where multi-item quotes are persisted correctly, visualized as distinct trips (not just one), editable without data loss, and spawned into individual missions per line item.

### Story 29.1: Fix Shopping Cart Persistence & Pricing Aggregation

As a **User**,
I want my multi-item quote to be saved with all individual line items and a correct total price,
So that I don't lose the details of my "Shopping Cart" when I save or reload.

**Related FRs:** FR150, FR152, FR156.

**Acceptance Criteria:**
- **Persistence:** Saving a quote with N items persists N distinct `QuoteLine` records in the database.
- **Aggregation:** The `Quote` header `finalPrice` must equal the sum of all `QuoteLine.sellingPrice` values.
- **Display:** The UI must display the correct aggregated total in the list view, not just the price of the last item.
- **Data Integrity:** `QuoteLine` stores full context (pickup, dropoff, vehicle) in `sourceData` JSON to be independent.

### Story 29.2: Implement Multi-Mission Quote Detail View

As a **Sales User**,
I want to view a saved multi-mission quote and see *all* the trips on the map and in the list,
So that I can verify the full itinerary before sending it to the client.

**Related FRs:** FR158, FR159 (New).

**Acceptance Criteria:**
- **List View:** The Quote Detail page lists all line items (Travel, Disposal, etc.) clearly.
- **Map Visualization:** The map displays markers/paths for ALL travel lines, not just the first one. (Focus on selected line, or fit bounds to all).
- **Expand/Collapse:** Users can expand a line item to see its specific details (distance, duration, vehicle).
- **"No Pricing Data" Fix:** The view never shows empty/broken states for valid saved quotes.

### Story 29.3: Ensure Lossless Quote Editing (Hydration)

As a **User**,
I want to edit an existing multi-item quote and have my "Shopping Cart" fully restored,
So that I can add or remove a trip without re-typing the whole quote.

**Related FRs:** FR153, FR160.

**Acceptance Criteria:**
- **Hydration:** Clicking "Edit" on a Quote loads the `CreateQuoteCockpit` and repopulates the "Shopping Cart" with all existing lines.
- **State/React Sync:** The internal React state (Zustand/Context) is correctly initialized from the DB `QuoteLine` records.
- **Pricing Context:** Each restored line retains its pricing data (margin, costs) so the profitability indicator remains accurate.
- **Add/Remove:** I can add a new line to the restored cart and save, updating the existing Quote (or creating a version).

### Story 29.4: Implement Intelligent Multi-Mission Spawning (The "Launch")

As an **Operations Manager**,
I want a confirmed multi-item quote to generate separate Operational Missions for each line item via a specific "Launch" action,
So that distinct dispatch tasks are created without duplicating the commercial Order data.

### Story 29.6: Upgrade Unified Dispatch Visualization (Gantt Zoom & Axis)

As a **Dispatcher**,
I want a powerful Gantt chart that supports zooming, continuous time axes, and custom date ranges,
So that I can manage schedules spanning multiple days or nights without visual breaks.

**Related FRs:** FR140, FR141 (Unified Dispatch Improvements).

**Acceptance Criteria:**
- **Date Range Picker:** The Dispatch Header must include a robust selector for arbitrary periods (e.g., "Jan 10 - Jan 15") or presets ("Today", "This Week").
- **Zoom Levels:**
    -   **Day View:** High detail (hour-by-hour), showing Day Numbers in headers.
    -   **3-Day View:** Mid-level overview.
    -   **Week View:** Low detail (7-10 days), showing clearly labeled Day Names/Dates (e.g., "Mon 12").
- **Continuous Axis:** The timeline must flow clearly from 22h -> 23h -> 00h -> 01h -> ... without "hard stops" or visual gaps.
- **Virtualization:** Ensure performance remains high even with continuous scroll.

### Story 29.7: Dispatch List Integrity & Backlog Separation

As a **Dispatcher**,
I want a strict separation between "Backlog" (Unassigned) and "Planned" (Assigned) missions in the List View,
So that I never see duplicates or "Order Containers" cluttering my dispatch operations.

**Related FRs:** FR140.2 (Data Separation), FR144 (Backlog).

**Acceptance Criteria:**
- **Strict Filtering:** The "List" mode must display *only* `Mission` entities (operational tasks). It must NEVER display `Quote` or `Order` entities (commercial containers).
- **Matching Gantt:** The Planned List (Main Table) must query `missions where driverId IS NOT NULL` (or all if filtered), showing exactly the same dataset as the Gantt rows.
- **Backlog Pane:** The side pane must query *only* `missions where driverId IS NULL`.
- **Ad-Hoc Integrity:** "Free Missions" (Ad-hoc) created directly in Dispatch must appear in these lists, distinguished by a "Non-Billable" badge if necessary, effectively treating them as first-class citizens alongside commercial missions.


### Story 29.8: Revamp Mission Sheet PDF Generation (Per-Mission)

As a **Dispatcher/Driver**,
I want a generated PDF Mission Sheet that is specific to the individual mission (not the whole quote), with a unique ID and correct service type,
So that I have a clear, distinct work order for each leg of a complex itinerary.

**Related FRs:** FR120, FR120.1, FR121, FR122, FR123 (Group 14).

**Acceptance Criteria:**
- **Granularity:** The system generates 1 PDF per `Mission`. If an Order has 5 missions, I can download 5 distinct PDFs.
- **Header info:**
    -   **ID:** Displays `Mission.ref` (e.g., `M-12345`) or `Order.ref` + Index (e.g., `Q-999-01`). MUST NOT be the generic Quote ref.
    -   **Type:** CLEARLY states "TRANSFER", "DISPOSAL", or "EXCURSION" in large type, derived from the `Mission.type`.
- **Content Scope:** The "Itinerary" section shows *only* the waypoints for this specific mission.
- **Context:**
    -   Displays the assigned Driver(s) and Vehicle (if assigned).
    -   Displays Client Platform info (if applicable).
- **Access:** "Download Mission Sheet" button available on the Mission Card in Dispatch and in the Dossier Mission list.
