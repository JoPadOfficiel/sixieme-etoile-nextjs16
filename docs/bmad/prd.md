# sixieme-etoile-nextjs16 - Product Requirements Document

**Author:** JoPad  
**Date:** 2025-11-25  
**Version:** 1.0

---

## Executive Summary

This PRD defines the pricing, CRM and operational core of a VTC / private hire ERP used by an enterprise operator in France. The product provides a unified engine for quoting, dispatching and invoicing trips for both B2B partners and B2C/private clients.

At the heart of the system is a dual-mode pricing strategy:

- Method 1  contract-based fixed pricing for partner agencies, implemented through geographic zone grids, route matrices and standardized excursions.
- Method 2  dynamic cost-based pricing for private and off-grid trips, built from physical distance/duration, operational costs and configurable margins.

The platform combines this pricing logic with a "shadow calculation" engine that simulates real operational cost over three segments (approach, service, return) using a multi-base fleet model. Dispatch, profitability and compliance decisions are grounded in these simulations, not just in nominal tariffs.

CRM, invoicing and an operator "cockpit" UI turn this engine into a full workflow: from first quote, through profitability analysis and regulatory checks, to immutable invoices while preserving transparency for operators and partners.

### What Makes This Special

- Dual-mode pricing that correctly models the real commercial split between contract partners and one-off customers.
- A multi-base, cost-first dispatch model that makes deadhead distance and driver constraints explicit in every quote.
- A compliance engine for heavy vehicles that embeds RSE regulations directly into the feasibility of trips.
- A "glass box" cockpit that exposes internal costs and profitability instead of hiding them behind a black-box meter.
- A configuration-first philosophy ("zero hardcoding") so business rules, grids and regulatory thresholds live in data, not code.

---

## Project Classification

**Technical Type:** SaaS B2B web application + API backend  
**Domain:** VTC / private hire ERP  pricing, dispatch, CRM and invoicing  
**Complexity:** High (regulatory, financial and optimization constraints)

The system is primarily used by back-office operators and dispatchers who create quotes, manage fleets and issue invoices on behalf of a VTC company. It exposes:

- An operator-facing web application (cockpit).
- Backend services and APIs for pricing, routing, CRM and invoicing.
- Background jobs for data refresh (fuel, maps) and consistency checks.

The domain mixes financial, regulatory and logistics concerns. A mistake in configuration or pricing can cause direct financial loss, legal risk or failed operations, so requirements emphasize correctness and transparency over experimentation.

### Domain Context

The domain analysis (VTC  Analyse approfondie, Syst00e8me Pricing  Complexit00e9) highlights several key realities:

- B2B partners (agencies, hotels, corporate accounts) work on pre-negotiated grids and expect fixed, immutable prices for standard transfers and excursions. For them, the grid is a contractual commitment, even when a specific ride is unprofitable.
- Private and "one-off" customers behave differently: they accept variable pricing, are sensitive to timing and special constraints, and may generate highly bespoke routes.
- Many profitable missions are long, multi-hour excursions (Normandy beaches, Loire Valley, Champagne, etc.) where distance, overnights and driver comfort matter as much as simple transfer distance.
- Operational cost is heavily affected by "hidden" factors such as deadhead distance, hotel and meal costs, parking, and driver fatigue, especially for heavy vehicles.
- Demand varies with seasonality and a small number of truly critical events (e.g. Le Bourget Air Show), which should be handled with explicit configuration instead of ad-hoc improvisation.

This context drives the need for a pricing and dispatch system that models the real economics and constraints of the business instead of just reproducing a simplified taxi meter.

---

## Success Criteria

- Ensure every quote explicitly exposes its internal cost and profitability (green / orange / red) to operators.
- Guarantee that partner contracts using grids are always honored at the agreed price, even when a specific ride is temporarily unprofitable.
- Make it easy for operators to build accurate, justifiable dynamic quotes for complex or "off-grid" scenarios without ad-hoc spreadsheets.
- Avoid regulatory violations for heavy vehicles by enforcing legal driving, amplitude and rest constraints at quote time.
- Provide a single source of truth for customer data, contracts, rate grids and configuration so that pricing behaviour is predictable and auditable.

### Business Metrics

- Increase average gross margin on dynamic (Method 2) trips compared to the legacy workflow, while preserving competitive pricing.
- Reduce the proportion of trips executed at an unintended loss due to missing deadhead or compliance considerations.
- Reduce manual rework and corrections on invoices by making prices and VAT rules deterministic and traceable.
- Improve conversion rate from quote to accepted booking by giving operators better tools to explain and adjust prices.

---

## Product Scope

### MVP  Minimum Viable Product

The MVP focuses on making core pricing, CRM and invoicing safe and usable for a single VTC operator:

- CRM with partner vs private profiles, attached rate grids and commissions.
- Zone and route engine with fixed grids for airports, classic excursions and standard dispos.
- Dynamic pricing engine with distance/duration base, operational costs and configurable margins.
- Shadow calculation and profitability indicator for every quote.
- Basic multi-base fleet model and optimal base/vehicle selection for quotes.
- Quote lifecycle (Draft  Sent  Accepted / Rejected  Expired).
- Invoice creation with deep-copy rule, VAT breakdown and immutable commercial data.
- Admin configuration for regulatory thresholds, grids, margins and key cost parameters.
- Operator cockpit UI for building and sending quotes.

### Growth Features (Post-MVP)

Post-MVP features build on the same engine:

- Advanced excursion and multi-day program management (multi-stop itineraries, tours, festivals).
- Multi-currency contracts and fixed contractual FX rates for certain partners.
- Deeper reporting and analytics on profitability by client, grid, vehicle type and driver.
- More sophisticated dispatch integration and near-real-time driver assignment.
- Scenario simulation tools (e.g. "what if" analysis when changing margins or vehicle classes).

### Vision (Future)

Longer term, the product can evolve into a decision-support and automation platform:

- Agent-based assistants that propose prices, vehicles and schedules automatically from high-level intents.
- Cross-organisation fleets and subcontracting networks, while keeping each organisations economics and regulations separate.
- Automated monitoring of regulatory changes and guided updates of configuration.
- Deeper integrations with travel platforms, CRM systems and accounting tools.

---

## Domain-Specific Requirements

- Pricing logic must encode the "Engagement Rule": for partner agencies bound by a grid, the agreed grid price is always applied when a matching route/forfait exists, regardless of internal profitability.
- The system must differentiate between grid-based forfaits (transfers, excursions, dispos) and bespoke "hors grille" scenarios and guide the operator towards the right method.
- Heavy-vehicle regulations (maximum driving time, amplitude, rest times, mandatory breaks) must be treated as hard constraints that shape which itineraries and staffing options are feasible.
- The model of cost must include deadhead segments, driver hotels and meals, parking and other non-obvious costs, not just fuel and tolls.
- Seasonality and rare "super-peak" events must be expressible as configuration (multipliers, special dates), not embedded logic.

---

## Innovation & Novel Patterns

- **Shadow calculation engine:** every quote simulates the full operational loop (approach, service, return) to compute internal cost and feasibility before a price is shown.
- **Multi-base dispatch:** vehicles are anchored in real garages and bases; base selection is an optimisation problem, not an implicit assumption that vehicles appear at pickup points for free.
- **Glass-box pricing:** operators and potentially partners can see how a price is built (cost layers and multipliers), which supports trust and internal decision making.
- **Compliance-aware pricing:** for heavy vehicles, legal constraints are first-class; the system proactively proposes options (relay, double crew) instead of leaving this to manual judgement.
- **Config-first grids:** zone polygons, routes, forfaits and multipliers live in data and can evolve without code changes.

### Validation Approach

- Use historical scenarios from the analysis document (Versailles parking, Normandy beaches, Mont-Saint-Michel, festivals, overnight programs) as regression cases.
- Compare legacy spreadsheet-based quotes with system-generated quotes to ensure parity or justified differences.
- Run targeted simulations of heavy-vehicle trips (e.g. long-distance day returns) to verify regulatory checks and alternative suggestions.
- Validate performance and usability of the cockpit with operators on real-world quoting tasks.

---

## SaaS / API Backend Specific Requirements

The product is delivered as a multi-tenant SaaS for one or more VTC organisations.

### API Specification

At a high level the system exposes APIs (and/or internal services) for:

- Client and partner management (create/update clients, assign grids, manage commissions).
- Pricing requests (submit route, time, resources and client; receive detailed price, cost and feasibility information).
- Quote management (CRUD on quotes, status transitions, sending to client).
- Invoicing (generate invoices from accepted quotes or missions, retrieve issued invoices).
- Fleet and base management (vehicles, drivers, garages/bases, availability).
- Configuration (zones, routes, grids, regulatory and financial settings).

All external or internal clients calling pricing APIs should receive both commercial and operational results (price, internal cost, margin, key flags) so downstream workflows can reason on them.

### Authentication & Authorization

- All APIs and the cockpit must require authenticated access.
- Role-based access control must distinguish at least: operator/dispatcher, finance, administrator and read-only roles.
- Access to configuration and regulatory settings is restricted to admin/owner roles.

### Platform Support

- Web-based cockpit for desktop browsers for back-office operators.
- Backend services exposed over HTTP APIs, suitable for integration with other internal tools and automations.

### Multi-Tenancy Architecture

- Each organisation has its own configuration (zones, grids, fleets, costs, regulations) and financial data.
- Quotes, trips, invoices and configuration are always partitioned by organisation.
- Global defaults may exist but are overridden by organisation-specific configuration.

### Permissions & Roles

- Operators can create and manage quotes but cannot change global financial or regulatory settings.
- Finance roles can manage invoices, VAT configuration and partner commissions.
- Admin roles can manage users, roles, organisations and all configuration areas.

---

## User Experience Principles

The operator interface is a "cockpit" rather than a simple form. It should:

- Present all relevant context (client, itinerary, timing, resources) in one place.
- Make the internal economics of each quote visible and understandable.
- Support fast iteration on scenarios (vehicle type, timing, margins) without losing track of feasibility and compliance.
- Prevent operators from accidentally committing to impossible or severely unprofitable trips.

### Key Interactions

- Search and select clients with clear identification of partners vs private customers.
- Enter and adjust route details with address auto-complete and clear visualization of pickup and dropoff.
- See segment-by-segment cost breakdown and a clear profitability indicator.
- Manually adjust price and immediately see the impact on margin and partner commissions.
- Trigger creation of invoices and communications (email, export) from accepted quotes.
- Receive blocking alerts for "impossible trips" (e.g. heavy-vehicle regulation violations) and guided suggestions for fixes.

---

## Functional Requirements

Functional requirements are grouped by capability area and numbered sequentially.

### FR Group 1  Client Segmentation & CRM

- **FR1:** The system shall support at least two client types  partner agencies/organisations and private/one-off customers  with the client type stored in each client profile.
- **FR2:** For each partner client, the system shall store contract data including billing details, payment terms, assigned rate grid(s) and optional commission percentage.
- **FR3:** For private clients, the system shall store a simplified profile focused on contact details and default preferences.
- **FR4:** The pricing engine shall read the client type and attached configuration to determine whether to prioritise grid-based pricing or dynamic pricing for a given quote.
- **FR5:** The system shall allow reclassifying a client between partner and private while preserving existing quotes and invoices.
- **FR6:** Each quote and invoice shall be linked to a client record and, when applicable, to a specific partner agency.

### FR Group 2  Pricing Modes & Zone Engine

- **FR7:** The system shall implement two pricing modes: Method 1 (fixed grid pricing) and Method 2 (dynamic cost-based pricing).
- **FR8:** The system shall model geographic zones using polygons and/or radius-based definitions and map pickup and dropoff points to zones.
- **FR9:** For Method 1, the system shall support a route matrix between zones with fixed prices per vehicle category.
- **FR10:** For Method 1, the system shall support excursion and "mise  e0 disposition" forfaits defined by duration and included distance per vehicle category.
- **FR11:** When a partner client requests a trip that matches a configured grid route or forfait, the selling price shall be taken from the grid and shall not be modified by profitability checks (Engagement Rule).
- **FR12:** When no grid match exists or the client is not a partner, the system shall use Method 2 dynamic pricing.
- **FR13:** For Method 2, the system shall estimate distance and duration using a routing source and compute a base price as the maximum of (distance  d7 rate_per_km) and (duration  d7 rate_per_hour).
- **FR14:** The dynamic pricing engine shall add operational cost components (fuel, tolls, parking and other configured costs) to the base price.
- **FR15:** The dynamic pricing engine shall apply configurable multipliers (e.g. zone-based, seasonal or event-based) and target margin settings to produce a suggested selling price.
- **FR16:** Operators shall be able to override the suggested selling price within permissions constraints, while seeing updated profitability feedback.

### FR Group 3  Routing, Base Selection & Shadow Calculation

- **FR17:** The system shall model vehicles, drivers and garages/bases, with each vehicle linked to a default base.
- **FR18:** For each quote, the system shall identify candidate vehicles and bases that are compatible with requested capacity and availability.
- **FR19:** Before calling external routing APIs, the system shall use a mathematical pre-filter (e.g. Haversine distance) to eliminate bases that are too far from pickup.
- **FR20:** For the remaining candidates, the system shall use a routing API to estimate travel times and costs and select an optimal vehicle/base combination according to configured criteria.
- **FR21:** For every quote, the system shall run a shadow calculation that simulates Segment A (approach), Segment B (service) and Segment C (return) for the selected vehicle.
- **FR22:** The shadow calculation shall compute internal cost per segment using configured cost parameters (fuel, driver time, wear, tolls and other costs).
- **FR23:** The full trip analysis (segments, distances, durations, costs and key decisions) shall be stored in a structured field associated with the quote.
- **FR24:** The system shall compute and display a profitability indicator (e.g. green/orange/red) based on selling price vs internal cost, including margin percentage.

### FR Group 4  Fleet & Regulatory Compliance

- **FR25:** The system shall classify vehicles into at least LIGHT and HEAVY regulatory categories and apply heavy-vehicle rules where required.
- **FR26:** Regulatory constraints such as maximum daily driving time, maximum work amplitude and mandatory breaks shall be stored in configuration by license type, not hard-coded.
- **FR27:** For HEAVY vehicles, the system shall validate proposed itineraries and schedules against configured regulations before a quote can be accepted.
- **FR28:** When regulations would be violated for a requested mission, the system shall propose compliant alternatives such as a second driver or relay driver where applicable.
- **FR29:** The system shall support drivers with multiple licenses and ensure that assigned drivers hold the required license for the selected vehicle.
- **FR30:** Compliance checks and decisions (including violations prevented) shall be logged for audit purposes.

### FR Group 5  CRM, Quote & Invoice Lifecycle

- **FR31:** Quotes shall follow a lifecycle with at least the states Draft, Sent, Viewed, Accepted, Rejected and Expired.
- **FR32:** Draft quotes shall remain editable and may optionally refresh certain dynamic data (such as fuel price) according to configuration, while Sent or Accepted quotes shall remain commercially fixed.
- **FR33:** The system shall allow operators to convert an accepted quote or completed mission into an invoice.
- **FR34:** When creating an invoice, the system shall deep-copy all relevant commercial values (prices, surcharges, VAT amounts, commissions) into the invoice record so later configuration changes do not alter past invoices.
- **FR35:** The system shall support distinct VAT rates for transport and ancillary services and display VAT breakdown on invoices.
- **FR36:** For partner contracts with commissions, the system shall calculate commission amounts and incorporate them into profitability calculations and invoice data.

### FR Group 6  Configuration & Localisation

- **FR37:** An admin configuration area shall allow authorised users to manage zones, routes, grids, forfaits, margins and multipliers.
- **FR38:** Admins shall be able to configure vehicle categories, cost parameters and mapped regulatory rules per licence type.
- **FR39:** The system shall treat EUR as the base currency for pricing and ensure a consistent approach to currency representation in all financial records.
- **FR40:** The system shall store operational timestamps in UTC in the database while presenting service times in the relevant local timezone (e.g. Europe/Paris) in the UI.
- **FR41:** The system shall maintain a cache of fuel prices sourced from an external provider and ensure pricing calculations use cached values rather than real-time API calls.

### FR Group 7  Operator Cockpit & UX

- **FR42:** The quote builder UI shall present client, itinerary, timing and resource inputs in a structured, easy-to-scan layout.
- **FR43:** The UI shall display a visual representation of the trip including approach, main service and return segments where routing data is available.
- **FR44:** The UI shall show a transparent breakdown of internal cost components (fuel, tolls, driver, other) alongside the selling price and profitability indicator.
- **FR45:** The UI shall provide specific helpers for common scenarios such as airport transfers (flight number, waiting rules) and suggested vehicle upgrades when baggage exceeds capacity.
- **FR46:** The UI shall provide blocking alerts when a requested trip is operationally or regulatorily impossible and guide the operator to adjust parameters or staffing.

### FR Group 8  Strategic Optimisation, Yield & Advanced Pricing

- **FR47:** The system shall provide a heavy-vehicle compliance validator that checks daily amplitude, total driving time, mandatory breaks and mandatory daily rest against configurable legal thresholds and blocks non-compliant missions with explicit error reasons.
- **FR48:** When heavy-vehicle compliance validation fails, the system shall be able to generate and present alternative, legally compliant staffing or scheduling options (for example double crew, relay driver or converting a one-day trip to a multi-day mission) together with the additional cost impact for each option.
- **FR49:** The system shall track service time separately for each relevant regulation regime (for example heavy vs light vehicles) per driver and per day, so that multi-licence drivers can operate under different rules in the same day without violating any legal counters.
- **FR50:** The driver and vehicle assignment engine shall take driver flexibility into account by computing a score (for example based on number of licences and schedule slack) and shall surface higher-flexibility options to the operator when this reduces operational risk or cost.
- **FR51:** For each quote, the system shall be able to simulate the full approach1service1return loop from multiple candidate bases and select an optimal base/vehicle pair by comparing total internal cost and margin.
- **FR52:** The planning engine shall detect opportunities to chain trips (where the drop-off of one mission is close in time and space to the pick-up of another) and shall propose such chains as preferred assignments to reduce or eliminate deadhead segments.
- **FR53:** The planning engine shall detect confirmed empty-leg segments (for example return legs after a one-way charter) and allow the operator to define and apply special "empty leg" pricing strategies for new requests that match these corridors.
- **FR54:** The system shall support managing a directory of subcontractor partners with their typical operating zones and indicative price levels and, when a trip is structurally unprofitable with the internal fleet, shall suggest subcontracting options with an explicit margin comparison.
- **FR55:** The Trip Transparency module shall expose and separately store core cost components such as base price, fuel cost, tolls and other operational fees, and shall allow authorised users to adjust these values manually while continuously recomputing the resulting margin and profitability indicator.
- **FR56:** The system shall support a configurable catalogue of optional fees (for example baby seat, airport waiting, premium cleaning) with fixed or percentage-based amounts, taxation flags and automated triggers, and shall add the corresponding line items to quotes and invoices when applicable.
- **FR57:** The system shall support promotional discounts via promo codes with configurable values (fixed or percentage), eligibility rules and usage limits, and shall apply them transparently to quotes and invoices while keeping original price and discount traceable.
- **FR58:** The pricing engine shall support advanced rate modifiers driven by business rules (for example night hours, weekends, long-distance thresholds) that automatically adjust the base price using percentage or fixed adjustments according to configurable triggers.
- **FR59:** The pricing engine shall support seasonal multipliers that adjust prices for configured date ranges and optionally handle multi-day trips proportionally when they span multiple seasons.
- **FR60:** The system shall model vehicle categories using configurable price multipliers relative to a reference category so that once a base price is computed for a standard category, prices for economy, premium or luxury variants are derived automatically.

---

## Non-Functional Requirements

### Performance

- Pricing requests, including shadow calculation, shall be fast enough for interactive use in a call-centre workflow, using pre-filtering, caching and background updates to minimise external API latency.
- Background jobs (e.g. fuel price refresh) shall not block interactive pricing and shall be designed to fail safely with clear fallbacks.

### Security

- All external access to APIs and the cockpit shall require authentication over encrypted connections.
- Role-based access control shall restrict access to financial data, invoices and configuration, with sensible defaults.
- Sensitive data (client contact details, financial records) shall be stored and processed according to good security practice.

### Scalability

- The system architecture shall support multiple organisations, fleets and operators without cross-contamination of data.
- Pricing and routing services shall be deployable in a way that allows horizontal scaling as traffic grows.

### Accessibility & UX Quality

- The cockpit shall use clear text labels and iconography in addition to colour so that status indicators remain understandable to users with colour-vision deficiencies.
- Key workflows (quote creation, price adjustment, invoice generation) shall be optimised for keyboard-driven operation where possible.

### Integration

- Integrations with external services (routing APIs, fuel price providers) shall be abstracted behind interfaces with configurable timeouts and retry policies.
- The system shall provide structured logs and/or events for pricing, compliance and lifecycle actions so that other systems can consume them if needed.

---

_This PRD captures the essence of sixieme-etoile-nextjs16  a VTC ERP focused on transparent, contract-respecting pricing and compliance-first dispatch._  
_Created through collaborative discovery between JoPad and AI facilitator._

---

## Appendices  Source Domain Notes

### Appendix A  Pricing Logic & Zone Engine

1. Core Pricing Philosophy

The system implements a Profitability-First engine. Unlike standard taxi meters, it calculates the Internal Cost (what it costs the company) separately from the Selling Price (what the client pays).

1.1 The Dual-Mode Strategy

Every quote request falls into one of two categories. The system must automatically detect the mode based on the Client Profile and Route.

| Mode | Target Audience | Pricing Logic | Priority |
| MODE A: FIXED (Partners) | B2B Agencies, Hotels, Corporate contracts. | Grid-Based. Price is read from a pre-negotiated rate table (Zones or Routes). | HIGH. Overrides profitability warnings. "Engagement Rule". |
| MODE B: DYNAMIC (Private) | B2C, One-off clients, "Off-grid" trips. | Constructed. Price = Cost + Margin + Contextual Multipliers. | LOW. Subject to profitability checks. |

2. The Zoning Engine (Geographic Logic)

The system relies on a hierarchical zone model to determine fixed prices and multipliers.

2.1 Zone Definitions (PricingZone)

Type: Polygons (complex shapes) or Radius (circles).

Hierarchy:

Zone 0 (Central): Paris Intra-Muros.

Zone 1 (Inner Ring): Petite Couronne.

Zone 2 (Outer Ring): Grande Couronne.

Satellite Zones: Specific POIs (CDG, Orly, Versailles, Disney).

2.2 Route Scenarios (The Logic Tree)

When a user enters Pickup (A) and Dropoff (B), the engine runs this logic:

Is Client.isPartner == true? -> Check Fixed Grids first.

Identify Zones: Map A and B to Zones.

Scenario: Intra-Zone Central (Paris -> Paris)

Condition: A & B in Zone 0.

Result: Apply Flat Rate (e.g., 80€).

Scenario: Radial Transfer (Paris <-> Satellite)

Condition: One point in Zone 0, the other in a Satellite (e.g., CDG).

Result: Apply Fixed Route Rate (e.g., 150€).

Scenario: Circular Suburban (Banlieue -> Banlieue)

Condition: A & B in Zone 1 (Inner Ring).

Result: Dynamic Calculation + Multiplier.

Since distance varies wildly in suburbs, fixed price is unfair.

Logic: BasePrice \* Zone1.innerRideMultiplier (e.g., x1.2).

Scenario: The "Versailles Exception"

Condition: Pickup or Dropoff in "Versailles" Zone.

Result: Add mandatory Parking Surcharge (e.g., +40€) to the Operational Cost layer automatically.

3. Dynamic Calculation Algorithm (Method B)

If no Fixed Rate applies, the system builds the price:

Physical Base: MAX(Distance _ RatePerKm, Duration _ RatePerHour).

Note: For Heavy Vehicles, Duration is calculated at 85 km/h avg, not map speed.

Operational Add-ons:

Estimated Tolls (Google Maps).

Fuel Cost (Distance _ Consumption _ CollectAPI Price).

Modifiers:

Night Surcharge (e.g., 20% if 22h-06h).

Weekend Surcharge.

Margin Target:

Apply target margin (e.g., 20%) to reach Suggested Price.

4. Localization Rules

Currency: EUR (€) Hardcoded. No conversions.

Time: Europe/Paris. All rules (Night shift starts at 22h Paris time) respect this timezone regardless of where the operator is sitting.

PRD Part 2: The Operational Cost & Profitability Engine

### Appendix B  Operational Cost & Profitability Engine

1. The Concept: Shadow Calculation

For every quote (even fixed price ones), the system calculates the True Operational Cost in the background. This data is stored in the Quote.tripAnalysis JSON field.

1.1 The "Deadhead" Problem

A 50€ ride is a loss if the driver has to drive 50km to get to the pickup. The system must account for this.

2. The Multi-Base Model

Vehicles are physically anchored.

Entity: OperatingBase (Garages, Parking spots).

Logic: Every vehicle has a homeBaseId.

2.1 Optimization Algorithm (Best Driver Selection)

When a quote is requested, the system simulates dispatch:

Filter: Find vehicles compatible with request (Pax/Luggage capacity).

Distance Check: Calculate distance from each Vehicle's Base to Pickup Point (A).

Selection: Select the Vehicle/Base that minimizes the Approach (Deadhead) distance/time.

3. The Cost Formula

The Total Internal Cost is the sum of three segments:

Segment A (Approach): Best Base -> Pickup.

Segment B (Service): Pickup -> Dropoff.

Segment C (Return): Dropoff -> Home Base.

Cost Factors per Segment:

Fuel: Distance (km) _ Vehicle.consumption (L/100km) _ FuelPrice (EUR/L).

Wages: Duration (h) \* Driver.hourlyCost (EUR/h).

Tolls: Real-time toll data from Google Maps (or estimated per km).

Wear: Distance (km) \* Vehicle.costPerKm.

4. Profitability Indicator (UI Feedback)

The system compares Selling Price vs Total Internal Cost.

Green (🟢): Margin > Target (e.g., 20%).

Orange (🟠): Positive Margin but low (0-20%).

Red (🔴): Negative Margin (Loss).

Strategic Logic:

Partner (Mode A): If Red, allow the quote (Contract priority), but log the "Loss Opportunity".

Private (Mode B): If Red, the system suggests a price increase to turn it Green.

5. Data Integrations

5.1 Google Maps API Strategy

To save costs while maintaining accuracy:

Rough Filter: Use Haversine (math) distance to filter out bases > 100km away.

Precision: Call Google Matrix API only for the top 3 candidates to get real traffic data.

5.2 CollectAPI (Fuel)

Frequency: Once daily (Cron job at 04:00 Paris time).

Storage: Update FuelPriceCache table.

Usage: Calculator reads from DB (fast), never calls API in real-time.

PRD Part 3: Fleet Management & Regulatory Compliance

### Appendix C  Fleet Management & Regulatory Compliance

1. Vehicle Classes & Logic

The fleet is split into two regulatory categories handled by the VehicleType enum:

LIGHT (VL): Sedans, Vans (< 9 seats). Standard labor laws.

HEAVY (PL): Minicars, Buses, VIP Vans > 3.5T. Strict RSE Regulations apply.

2. The RSE Compliance Engine (Heavy Vehicles)

If Vehicle.type == HEAVY, the system activates the Compliance Validator before allowing a quote.

Zero Hardcoding: All thresholds below are stored in LicenseType in the DB.

2.1 Speed Calculation Rule

Rule: Heavy vehicles cannot drive at car speeds.

Logic: Travel time is calculated using a Capped Average Speed of 85 km/h, ignoring Google Maps' "car" estimate if it's faster.

2.2 The 10h Driving Limit

Constraint: Max 10h driving / day.

Check: (Segment A + B + C) Duration <= 10h.

Action: If > 10h, block quote or suggest Relay.

2.3 The 14h Amplitude Limit

Constraint: Max 14h work day (Start to Finish).

Check: DropoffTime - PickupTime + ApproachTime + ReturnTime <= 14h.

Action: If > 14h, suggest Double Crew (extends to 18h).

2.4 Mandatory Breaks

Constraint: 45min break every 4h30.

Logic: The calculator MUST inject a 45min duration buffer for every 4.5h of driving block.

3. Driver Management

3.1 Multi-License Support

Model: Driver has DriverLicense[].

Scenario: A driver can drive a Bus in the morning (License D) and a Sedan in the evening (License B).

Optimization: The Scheduler prioritizes multi-license drivers for complex mixed schedules to save costs.

3.2 Cost Profiles

Each driver has a hourlyCost (Loaded salary).

Premiums like "Decoucher" (Sleepover fee) are added as fixed costs if the trip spans > 24h or ends far from base at night.

PRD Part 4: The Operator Cockpit & UX

### Appendix D  Operator Cockpit & UX

1. The "Cockpit" Philosophy

The Quote Creation screen is not a form; it's a decision dashboard. It is split into 3 columns.

Column 1: Context & Input

Client Search: Type-ahead. Badges for "Partner" vs "Private".

Route: Pickup/Dropoff (Google Autocomplete).

Time: Date/Time picker (Browser local time = Paris).

Resources: Pax/Luggage count + Size selector (S/M/L).

Auto-Upsell: If luggage exceeds Sedan capacity, auto-select Van.

Column 2: Trip Transparency (The "Glass Box")

This section visualizes the internal "Shadow Calculation" (Part 2).

Map: Shows Approach (Grey), Trip (Blue), Return (Grey).

Cost Breakdown (Editable):

Fuel: [ Calculated € ] [ Edit Icon ]

Tolls: [ Calculated € ] [ Edit Icon ]

Driver: [ Calculated € ]

Profitability Light: Traffic light indicator (Red/Orange/Green).

Tooltip: Shows exact margin percentage.

Column 3: Pricing & Action

Suggested Price: Large display. Derived from Grid (Partner) or Dynamic (Private).

Manual Override: Input field to force a price (e.g., round to 200€).

Add-ons (Checkboxes):

"Baby Seat" (+15€).

"Night Surcharge" (Auto-checked if time applies, but toggleable).

"Airport Waiting" (Auto-added logic below).

Action Buttons:

"Save Quote"

"Convert to Invoice" (Direct)

"Send Email"

2. Specific UX Features

2.1 Airport Waiting Automation

Trigger: Pickup is an Airport POI.

UI: "Flight Number" field appears.

Logic:

System monitors arrival.

Franchise: 60 min free after landing.

Billing: After 60 min, auto-add "Waiting Fee" line items (e.g., 15€/15min).

2.2 The "Impossible Trip" Alert

If Heavy Vehicle & Regulations exceeded (Part 3):

Blocking Modal: "⚠️ RSE Alert: Driving time > 10h".

Options:

"Add 2nd Driver (+300€)" -> Recalculate.

"Add Relay" -> Recalculate.

### Appendix D  CRM, Invoicing & System Configuration

1. Introduction

This document defines the supporting infrastructure for the VTC ERP: managing Client relationships (CRM), finalizing financial transactions (Invoicing), and configuring the global system rules (Admin Settings).

Core Principle: This module ensures that the commercial strategy (B2B contracts) is enforced and that financial data is immutable once generated.

2. CRM (Customer Relationship Management)

The CRM is the driver of the Method 1 (Fixed Price) logic. It distinguishes between casual customers and contractual partners.

2.1 Customer Profiles

The system must support two distinct entities:

Private Individual (B2C):

Default Pricing Mode: DYNAMIC (Method 2).

Data: Name, Email, Phone, Payment Method.

Logic: Prices are calculated based on profitability + market demand.

Partner / Agency (B2B):

Default Pricing Mode: FIXED_GRID (Method 1).

Data: Company Name, Billing Address, VAT Number, Payment Terms (e.g., 30 Days).

Contract Settings:

Assigned Rate Grid: Links to specific Route Rates (e.g., "VAP 2025 Rates").

Commission: Optional % deducted from public price.

Logic: The system forces the application of the grid price, even if the profitability indicator is Red.

3. The Quote-to-Invoice Lifecycle

This lifecycle manages the transition from a mutable proposal to an immutable fiscal document.

3.1 Quote (Devis) - Mutable

Status Workflow: Draft -> Sent -> Viewed -> Accepted -> Rejected -> Expired.

Data: Stores references to dynamic variables. If the admin changes the fuel price in settings, a Draft quote might update (configurable), but a Sent quote must remain fixed.

Validity: Quotes have an expiration date (e.g., 7 days).

3.2 Invoice (Facture) - Immutable "Snapshot"

Trigger: Converting an Accepted Quote or completing a Mission.

The "Deep Copy" Rule (CRITICAL):

When an Invoice is created, the system must COPY all calculated values (Price, Fuel Surcharge, Tolls, VAT amounts) into the Invoice record.

It must NOT reference the dynamic calculation engine anymore.

Reasoning: If the "Winter Surcharge" is disabled in the Admin panel next month, past invoices must not change.

VAT Handling:

Transport Service: 10% VAT (Default).

Ancillary Services: 20% VAT (e.g., Premium Cleaning fee).

The Invoice must display the VAT breakdown.

4. System Configuration (Admin Panel)

This section enforces the "Zero Hardcoding" rule. All business logic variables must be editable via this UI.

4.1 Regulatory Settings (License Types)

Purpose: Allow the admin to update legal constraints without a developer.

Editable Fields (per License Type, e.g., "Permis D"):

Max Daily Driving Hours (Input: 10).

Max Amplitude Hours (Input: 14).

Mandatory Break Duration (Input: 45 min).

Break Frequency (Input: 4.5 hours).

4.2 Financial & Fleet Settings

Fuel Prices:

Source: CollectAPI (Auto-update daily via Cron).

Manual Override: Input field to force a fixed price if the API fails or market is volatile.

Vehicle Categories:

Define categories (Sedan, Van, Bus).

Set Price Multiplier (e.g., Van = 1.5x Sedan).

Set Consumption Average (L/100km).

Global Margins:

Define the thresholds for the Profitability Indicator (e.g., <10% = Red, >30% = Green).

4.3 Zone & Route Management

Zone Editor:

Interactive Map to draw Polygons or set Radius for Zones.

Define Inner Ride Multiplier for each zone (e.g., x1.2 for Banlieue).

Route Grid Matrix:

Table view to set Fixed Prices between defined Zones.

Rows: Departure Zones / Columns: Arrival Zones.

Cells: Input fields for fixed prices per vehicle category.

5. Localization & Standards

Currency: Strictly EUR (€). No multi-currency conversion logic to avoid forex risk on margins.

Timezone: Strictly Europe/Paris. All operational times (pickups, shifts) are processed in this timezone.

Language: Backend/Data in English (for code quality), Frontend UI translated to French (via i18n).

### Appendix F  Strategic Profitability & Competition with On-Demand VTC Platforms

This appendix summarises how the system should help the operator remain profitable in the face of short-trip competition from on-demand VTC platforms.

- Centralised planned transport with depots and deadhead segments is structurally different from decentralised platform fleets and must be modelled explicitly.
- The system must recognise that very short inner-city trips can be structurally unprofitable once approach and return are included, even when the grid price looks acceptable.
- The profitability engine must therefore always work on the full loop (Approach + Service + Return) and compare selling price vs total internal cost instead of looking only at Segment B.
- For partner grid trips, the system still applies contractual prices but must surface when a specific job is loss-making so the business can react strategically (for example using subcontractors or adjusting future grids).

The following strategic optimisation modules derive from this analysis:

- **Real profitability calculator:** Simulate the loop from all relevant bases, compute cost and margin for each, and present a clear indicator plus decomposed values to the operator.
- **Chaining optimisation:** Detect opportunities to chain missions so that a vehicle finishing near a new pickup can take it, effectively removing approach cost and improving margin.
- **Smart subcontracting:** When internal execution is structurally unprofitable, propose subcontracting to configured partners with an explicit comparison of internal vs subcontracted margin.
- **Empty-leg yield management:** Detect planned empty return legs and treat matching requests as opportunities to sell "empty leg" trips at attractive prices that still represent high margin.

---

### Appendix G  Zone-Based Tariff System & Scenario Catalogue

This appendix refines the zone-based tariff model and shows how different request patterns map to the correct pricing method.

**Zone configuration highlights:**

- Zones may be defined by radius around a point, by sets of postal codes or by arbitrary polygons drawn on a map.
- The Paris-oriented reference model uses concentric rings (Zone 0 centre, Zone 1, Zone 2, etc.) plus satellite zones (airports, Versailles, Disneyland, etc.).
- For each connection between zones, the operator may configure fixed route prices and, for concentric rings, inner-ride multipliers for dynamic pricing.

**Hierarchical decision process for transfers:**

1. Determine origin and destination zones.
2. If both are inside the central zone, apply the central intra-zone flat rate (classic Paris grid transfers).
3. If the trip is between the centre and a satellite, apply the configured centre1satellite route rate.
4. If both points are in the same outer ring, use dynamic pricing with that rings multiplier instead of a flat rate.
5. For transversal or multi-zone trips, either decompose the route into known segments with combined forfaits or fall back to dynamic pricing.

**Example scenario types (from the catalogue):**

- Intra-zone central transfers (classic short Paris rides) priced by grid.
- Centre-to-airport routes priced by specific route entries.
- Circular suburban trips priced dynamically with zone multipliers to avoid unfair flat rates.
- Transversal satellite-to-satellite trips decomposed into centre segments (for example Versailles 1 Paris + Paris 1 Disney) with optional combo discounts.
- Inter-airport connections either configured as explicit routes or priced dynamically with the highest encountered multiplier when configuration is missing.
- Short "normally unprofitable" trips that become attractive when chained with existing missions or when a vehicle is already stranded on site.

These scenarios ensure that every combination of origin/destination has a predictable path through the pricing engine and that the choice between grid, hybrid and dynamic methods is always explicit.

---

### Appendix H  Advanced Pricing Modules & Final Orchestration

This appendix consolidates the advanced modules that adjust and explain the computed price and describes the final orchestration order of calculations.

**Trip Transparency module:**

- Breaks down each quote into base price, fuel, tolls and other operational components.
- Allows manual adjustment of each component while recalculating the profitability indicator in real time.
- Provides operators with a clear justification of the final price and the ability to fine-tune it without losing control of margin.

**Additional charges & promotions:**

- Configurable optional services such as airport waiting, baby seats or premium cleaning, with fixed or percentage values and VAT flags.
- Automation of airport waiting fees based on live or near-live tracking of arrival times and configurable free franchises.
- Promotion and promo code support with eligibility rules and usage limits for loyalty programmes or acquisition campaigns.

**Advanced rate modifiers and seasonal multipliers:**

- Time-of-day, day-of-week and distance-based rules that automatically adjust price for nights, weekends or very long trips.
- Seasonal multipliers that raise or lower prices for specific calendar periods, with options for handling multi-day missions fairly when they cross seasons.

**Vehicle category multipliers:**

- Reference prices defined for a standard category, with other categories (economy, premium, luxury, VIP) expressed as configurable multipliers.
- Ensures consistent relative pricing between categories without duplicating every grid entry.

**End-to-end orchestration order:**

1. Determine the base price using the appropriate method (zones, classic forfaits or dynamic calculation).
2. Apply the vehicle category multiplier to obtain a price for the chosen vehicle type.
3. Apply automatic rate modifiers and seasonal multipliers according to configured rules.
4. Run the full-loop profitability calculation (Approach + Service + Return) and compare price vs internal cost.
5. Allow the operator to review and, if needed, manually adjust price and cost components via Trip Transparency.
6. Add optional charges and promotions, then present the final client price and profitability summary.
