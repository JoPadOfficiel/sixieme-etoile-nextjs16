PRD Part 1: Core Pricing & Financial Engine

Status: APPROVED
Version: 2.0
Language: English
Source: VTC Analysis - Deep Dive

1. Introduction & Vision

This document defines the core mathematical and logical engine for the VTC Pricing System. The system acts as a profitability-first decision engine, handling complex scenarios like "deadhead" (empty return trips), heavy vehicle regulations, and a dual pricing strategy (B2B fixed vs. B2C dynamic).

2. The Dual Pricing Strategy

The system must support two mutually exclusive pricing methods.

2.1 Method A: Contractual Commitment (B2B / Partners)

Target: Agencies (e.g., "Travel Live", "VAP"), Hotels.

Logic: Fixed Price based on a pre-negotiated Rate Grid.

The "Engagement" Rule: If the client is a Partner, the system MUST apply the grid price, even if the internal profitability calculation shows a loss.

Implementation: Client.pricingMode = FIXED.

2.2 Method B: Dynamic Profitability (B2C / Occasional)

Target: Private Individuals, "Off-Grid" trips.

Logic: Constructed Price to guarantee margin.

Formula: MAX(Distance _ PricePerKm, Duration _ PricePerHour) + Operational Costs + Margin.

3. The Zone Engine (Geographic Logic)

3.1 Zone Configuration

Types: Polygon, Radius, Zip Codes.

Hierarchy:

Zone 0: Paris Central (Intra-muros).

Zone 1: Inner Ring (Petite Couronne).

Zone 2: Outer Ring (Grande Couronne).

Satellites: Airports (CDG, Orly), Versailles, Disney.

3.2 Pricing Scenarios

Scenario 7.1 (Intra-Zone Central): Zone 0 -> Zone 0. Action: Apply Flat Rate (e.g., 80€).

Scenario 7.2 (Radial): Zone 0 -> Satellite. Action: Apply Fixed Route Rate.

Scenario 7.3 (Circular Suburban - CRITICAL): Zone 1 -> Zone 1.

Action: Dynamic Calculation + Multiplier.

Logic: Distance varies too much for a flat rate. Apply Zone.innerRideMultiplier (e.g., x1.2).

Scenario 7.8 (Transversal): Satellite A -> Satellite B via Center. Action: Sum of Price(A->Center) + Price(Center->B).

4. Financial Standards

Currency: Strictly EUR (€). No conversions.

Timezone: Strictly Europe/Paris.

PRD Part 2: The Operational Cost & Profitability Engine

Status: APPROVED
Version: 2.0
Language: English

1. The Multi-Base Model (Physical Anchoring)

Vehicles are not floating entities; they have physical anchor points to calculate "Deadhead" (approach cost).

1.1 Operating Bases

Main Base (Garage): Primary depot.

Sub-Bases: Strategic parking spots or Driver homes.

Logic: Every vehicle has a currentBaseId.

1.2 The "Optimal Base Selection" Algorithm

For every quote request:

Filter: Identify vehicles with sufficient capacity.

Pre-Selection: Haversine distance filter (<100km).

Simulation: Calculate Approach Cost from all valid bases using Google Maps.

Selection: Choose the base with the lowest Approach Cost for the Shadow Calculation.

2. The "Shadow Calculation" Workflow

The system simulates the full mission lifecycle in the background to determine the Internal Cost.

2.1 The Three Segments

Segment A (Approach): Optimal Base -> Pickup Location.

Segment B (The Ride): Pickup -> Dropoff.

Segment C (Return): Dropoff -> Home Base.

2.2 Internal Cost Formula

Total Internal Cost = Cost(A) + Cost(B) + Cost(C)

Distance Cost: Km \* Vehicle.costPerKm (Wear & Tear).

Time Cost: Duration \* Driver.hourlyCost (Wages).

Direct Costs: Tolls + Estimated Fuel.

2.3 Profitability Indicator

Metric: Margin = Selling Price - Total Internal Cost.

UI: Traffic Light system (Red/Orange/Green).

3. Data Integration

Google Maps API: Used for real-time traffic estimation (Directions/Matrix).

CollectAPI: Daily cron job to update fuel prices in FuelPriceCache.

PRD Part 3: Fleet Management & Regulatory Compliance

Status: APPROVED
Version: 2.0
Language: English

1. Vehicle Categorization

Light Vehicles (VL): Sedans, Vans. Standard labor laws. Speed: Normal limits.

Heavy Vehicles (PL): Minicars, Coaches. Strict RSE Regulations apply.

2. RSE Compliance Engine (Heavy Vehicles)

Zero Hardcoding Rule: All thresholds must be fetched from LicenseType configuration in DB.

2.1 Speed Calculation Rule

Logic: Heavy vehicles are capped.

Algorithm: Travel Time = Distance / 85 km/h. NOT standard Google Maps time.

2.2 Regulatory Constraints

Max Driving Time: 10 hours/day (strict).

Max Amplitude: 14 hours/day (start to finish).

Mandatory Breaks: 45 minutes every 4.5 hours.

System Action: Automatically inject 45min into duration if driving > 4.5h.

2.3 Violation Handling

If a quote violates these rules (e.g., Scenario 7.11: 18h amplitude):

Blocking Alert: "INFRACTION_AMPLITUDE".

Suggested Solutions:

Double Crew: Add cost of 2nd driver.

Relay Driver: Suggest relay point.

3. Multi-License Drivers (Scenario 15)

Logic: Drivers can hold multiple licenses (B, D).

Optimization: The scheduler should prioritize dual-license drivers for mixed shifts (e.g., Bus in morning, Car in evening) to optimize costs.

4. The Versailles Exception

Rule: Versailles is a satellite zone with a specific surcharge.

Logic: If Zone == Versailles, add Parking Surcharge (e.g., +40€) to Operational Costs.

PRD Part 4: The Operator Cockpit & UX

Status: APPROVED
Version: 2.0
Language: English
UI Framework: ShadCN UI + Tailwind

1. The Quote Builder Interface

The screen is divided into 3 logical columns: Input -> Analysis -> Decision.

1.1 Column 1: Context (Inputs)

Client: Selector with badges (Partner/Private).

Trip: Google Places Autocomplete inputs, Date/Time picker.

Resources: Passengers/Luggage counts with Capacity Validation.

1.2 Column 2: Trip Transparency (The Black Box)

Displays the Shadow Calculation. Read-only by default, but overrideable.

Map: Visualizing Segments A, B, C.

Cost Stack:

Fuel Cost: Calculated via CollectAPI data. Editable.

Tolls: From Google Maps. Editable.

Base Cost: The system-calculated price. Editable Override.

Profitability: Red/Green indicator with exact margin display.

1.3 Column 3: The Output (Pricing)

Suggested Price: Large display.

Final Price Input: Manual field for the operator to define the agreed price (e.g., rounding).

Add-ons: Checkboxes for Baby Seat, Premium Cleaning, Night Surcharge.

2. Specific UX Modules

2.1 Airport Waiting Automation

Logic: First 60 mins free. Afterward, auto-add waiting fees in 15-min blocks.

UI: Flight Number input field if Pickup is Airport.

2.2 Time Display

Constraint: Single Timezone (Paris).

UI: Display "Local Service Time" and "Operator Time" clearly to avoid confusion, even if they are currently identical (future-proofing).

PRD Part 5: CRM, Invoicing & System Configuration

Status: APPROVED
Version: 2.0
Language: English

1. CRM Logic

1.1 Partner Management (B2B)

Profile: Needs pricingMode = FIXED and isPartner = true.

Logic: Forces the application of Rate Grids over dynamic calculation.

2. Invoicing Lifecycle

2.1 The "Snapshot" Rule (Critical)

Constraint: Invoices must be immutable history.

Logic: Converting a Quote to an Invoice triggers a DEEP COPY.

Copy FinalPrice, FuelCost, TollCost, VAT amounts into the Invoice record.

Disconnect from the dynamic calculation engine. Changing fuel prices tomorrow must NOT change today's invoice.

2.2 VAT & Currency

Currency: Hardcoded EUR.

VAT: Transport (10%) vs Services (20%). Invoice must show breakdown.

3. System Configuration (Zero Hardcoding)

3.1 Admin Panel

All business variables must be editable via UI:

RSE Rules: Max Driving Hours, Amplitude.

Financials: Fuel Prices (Manual Override), Vehicle Cost/Km.

Zones: Polygon editor, Inner Ride Multipliers.

Route Rates: Matrix for Fixed Prices between Zones.
