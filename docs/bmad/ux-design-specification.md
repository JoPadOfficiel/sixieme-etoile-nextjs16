# sixieme-etoile-nextjs16 UX Design Specification

_Created on 2025-11-25 by JoPad_
_Generated using BMad Method – Create UX Design Workflow v1.0 (adapted to this project)_

---

## Executive Summary

This UX Design Specification defines the user experience and UI design for **sixieme-etoile-nextjs16**, a VTC / private hire ERP focused on pricing, dispatch, CRM and invoicing for a French operator.

The UX is optimised for **back‑office operators and dispatchers** working all day in the cockpit. It is:

- **Data‑dense but legible**: high information density with clear hierarchy.
- **Decision‑centric**: operators always see the impact of changes (price, cost, margin, compliance) while editing.
- **Consistent**: one design system (shadcn/ui + Tailwind) and shared patterns for tables, filters, panels and dialogs.
- **Transparent**: Trip Transparency and cost breakdowns are always one click away.
- **Dark/Light aware**: the interface supports both themes with the same layout and hierarchy.

The specification maps directly to the PRD and Technical Specification. It is written for frontend and product engineers who will implement the UI using **Next.js App Router**, **shadcn/ui**, and **Tailwind CSS**.

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Primary Design System: shadcn/ui + Tailwind CSS**

- **shadcn/ui**

  - Provides accessible, headless‑but‑styled components built on top of **Radix UI**.
  - Matches the “modern SaaS dashboard” aesthetic shown in the reference screenshots.
  - Enables easy theming for **light/dark mode** via CSS variables and `next-themes`.

- **Tailwind CSS**
  - Utility‑first styling for layout, spacing, typography and colour.
  - Used to compose page layouts, responsive grids, paddings, and gaps around shadcn components.

### 1.2 Iconography

- **Icon set**
  - Use **Lucide icons** via the official `lucide-react` package, as recommended in shadcn/ui examples.
  - Do not mix arbitrary icon packs (Font Awesome, random SVGs) unless there is a strong reason; consistency is key.
- **Usage guidelines**
  - Sidebar navigation: one Lucide icon per item (e.g. `Home`, `User`, `FileText`, `Car`, `Users`, `Map`, `Settings`).
  - Status indicators: small icons next to badges where meaningful (e.g. `CheckCircle2` for success, `AlertTriangle` for warnings, `XCircle` for errors).
  - Actions: use icons in buttons where it improves scanability (e.g. `Plus` for Add, `Download` for Export, `Send` for Send Quote, `Copy` for Duplicate).
  - Trip Transparency: use `Gauge`, `Clock3`, `Fuel`, `Euro` (or closest Lucide equivalents) as semantic icons for distance, duration, fuel, cost.
  - Dispatch map & missions: icons for pickup/dropoff markers, vehicle types and warnings (e.g. `MapPin`, `Bus`, `Truck`, `AlertOctagon`).
  - Keep icon size consistent (16–20px) and rely on tailwind utilities (`h-4 w-4` or `h-5 w-5`).

**Global Design Principles**

1. **Desktop‑first**: primary experience is 1280px+ desktop; responsive down to ~1024px tablets. Mobile support is secondary.
2. **Sidebar navigation**: persistent left sidebar with section groups (Contacts, Quotes, Invoices, Vehicles, Drivers, Fleet, Dispatch, Documents, Settings).
3. **Three‑zone mental model**:
   - **Navigation shell**: sidebar + top bar.
   - **Content header**: title, breadcrumbs, primary actions.
   - **Content body**: tables, forms, Trip Transparency, details.
4. **Consistent interaction patterns**:
   - Tables with consistent filters, bulk actions, and row actions.
   - Creation/edit flows use **right‑hand side drawers** or **centered dialogs** depending on complexity.
   - Trip Transparency and complex pricing views use **multi‑column layouts** with cards.

---

## 2. Core User Experience

### 2.1 Defining Experience

**Primary User:** Back‑office operator / dispatcher creating quotes, reviewing profitability and dispatching missions.

**Core Loop:**

1. Search/select a **Contact** (partner vs private).
2. Enter itinerary (pickup, dropoff, time) and constraints.
3. See **Trip Transparency**: distance, duration, internal cost (fuel, tolls, driver, wear) and margin.
4. Adjust price/fees/promotions and ensure compliance is respected.
5. Save/send quote, then later convert to invoice and dispatch.

The UI must make this loop **fast and safe**:

- All critical information visible on a single “Create Quote” screen (3‑column layout inspired by your captures).
- Errors (compliance, impossible trips) are surfaced as **blocking banners** with clear actions.
- Operators can drill from high‑level summary to detailed calculations without losing context.

### 2.2 Novel UX Patterns

Key UX patterns derived from the PRD and Tech Spec:

1. **Trip Transparency Panel**

   - Central widget combining **distance**, **duration**, **internal cost** and **margin**.
   - Tabbed sub‑views (Overview, Route, Fees, Tolls) for segment‑by‑segment breakdown.

2. **Vehicle & Driver Selection Assistant**

   - Recommends the optimal vehicle/base/driver pair and displays why (capacity, distance from base, RSE constraints).
   - Visual tags for “Perfect match”, “OK”, “Risky” based on constraints.

3. **Seasonal & Advanced Pricing Editors**

   - Config screens for **seasonal multipliers**, **advanced rate modifiers**, **optional fees** and **promotions**, using list views with status chips and modal editors (as in your screenshots).

4. **Dispatch View Without Calendar**
   - A dedicated **Dispatch** page (instead of a calendar) with:
     - Left column: list of missions, filters and status chips.
     - Right column: map (Google Maps) plus selected mission timeline.

---

## 3. Visual Foundation

### 3.1 Color System

Use shadcn/ui’s default colour tokens as a base, adapting for a **professional, neutral SaaS** look.

- **Primary colour**: Blue (used for primary actions, highlights and active states).
- **Accent colour**: Emerald/green for “profitable / healthy” indicators.
- **Warning colour**: Amber/orange for low‑margin or borderline compliance.
- **Error colour**: Red for violations and impossible trips.
- **Backgrounds**:
  - Light mode: `background` ≈ near‑white, cards with subtle borders.
  - Dark mode: `background` ≈ dark slate, cards slightly elevated.

**Semantic Usage**

- **Profitability lights**:
  - Green badge when margin >= target.
  - Orange when low but positive.
  - Red when negative.
- **Status labels** (Quote/Invoice/Vehicle/Driver): coloured `Badge` components with consistent mapping.

**Typography**

- Base font: system or Inter.
- Hierarchy:
  - `h1`/page title: 24px, semibold.
  - `h2`/section titles: 18–20px, semibold.
  - Table headers: 12–13px, uppercase or small caps.
  - Body: 14–15px.

**Interactive Visualizations**

- `ux-color-themes.html` is reserved as a future interactive colour showcase; this spec defines the token‑level design so front‑end devs can implement themes without that HTML yet being present.

---

## 4. Design Direction

### 4.1 Chosen Design Approach

The chosen design direction is **“Professional Data Cockpit”**:

- **Layout**: left sidebar navigation + top breadcrumb bar + data‑dense content area.
- **Density**: balanced–dense (similar to your quote/vehicles/seasonal multiplier screenshots).
- **Content style**: table‑heavy, with summary cards and detail panels.
- **Interaction style**:
  - Most edits happen **inline** (tables, chips, toggles) or in **card‑level forms**.
  - Creation of entities uses **modals** or **slideover drawers**.

**Key Screens** (detailed in next sections):

1. **Quotes List** – searchable table similar to your “Quotes” screenshot.
2. **Create Quote** – 3‑column layout with Basic Info, Trip Transparency and Pricing Options.
3. **Vehicles & Drivers** – management tables with filters, status chips and action menus.
4. **Dispatch** – mission list + Google Maps + Trip Transparency.
5. **Settings → Pricing** – Seasonal multipliers, advanced rates, optional fees, promotions.
6. **Settings → Integrations** – API keys for Google Maps and CollectAPI.

The **Design Direction Showcase** referenced by `ux-design-directions.html` is reserved for potential future HTML prototypes; this specification contains the canonical direction to follow.

---

## 5. User Journey Flows

### 5.1 Critical User Paths

This section describes the primary journeys the UI must support.

#### Journey 1 – Create and Send a Quote

1. **Entry**: operator clicks **Quotes → Add Quote** from sidebar.
2. **Screen**: `Create Quote` page with 3 main regions:

   - **Left column – Basic Information**
     - Contact selector with type badge (Partner / Private).
     - Trip Type (Transfer / Excursion / Dispo / Off‑grid).
     - Pickup & Destination (address autocomplete with Google Places).
     - Departure time (DateTime picker in Europe/Paris).
   - **Middle column – Trip Transparency**
     - Cards showing distance, duration, internal cost, margin %.
     - Tabs for Overview, Route, Fees, Tolls.
   - **Right column – Pricing & Options**
     - Suggested price vs final price.
     - Optional fees checklist.
     - Promotions selector.

3. **Flow**:

   - As soon as pickup/destination/time and vehicle category are set, backend runs pricing & shadow calc.
   - Trip Transparency area updates with skeleton loading → results.
   - Operator can override price, optional fees and promotion checkboxes.

4. **Completion**:
   - `Create Quote` button in the header (top‑right) validates required fields.
   - Success toast + redirect to **Quote Detail** or back to **Quotes List** with highlighted new row.

#### Journey 2 – Convert Accepted Quote to Invoice

1. From **Quotes List**, operator clicks row action (context menu) → **“Convert to Invoice”**.
2. Modal asks for confirmation (optional invoice metadata like PO number).
3. On success, UI navigates to **Invoice Detail** with:
   - Immutable commercial data (deep‑copy from quote).
   - Invoice number and status badge (`Draft` or `Issued`).

#### Journey 3 – Configure Seasonal Multipliers

1. Operator goes to **Settings → Pricing → Seasonal Multipliers**.
2. Page shows:
   - Summary cards: Currently active, Upcoming in next 30 days, Total configured.
   - A table of multipliers (Name, Period, Multiplier, Priority, Status, Actions) – matching your reference screenshot.
3. `Add Multiplier` button opens a dialog with:
   - Name, description, calculation method, date range.
   - Slider to pick multiplier (0.1–3.0x) with live percentage label.
   - Toggle to activate.

#### Journey 4 – Manage Vehicles and Drivers

1. Operator uses **Vehicles** page:
   - Data table of vehicles with columns: Vehicle, License Plate, Status, Category, Tags, Mileage, Pricing badges, Assigned Driver, Last Updated.
   - Filters at top (Active, In Maintenance, Out of Service, Sold, Inactive) as segmented controls.
   - Search field for make/model/license.
2. “Add Vehicle” opens a drawer with vehicle category, base, capacities, cost parameters.
3. **Drivers** page:
   - Top summary cards: total drivers, available, unavailable, active today.
   - Search & filter bar.
   - Driver list cards/rows with name, licence categories, contact info, availability.

#### Journey 5 – Dispatch Missions

1. Operator opens **Dispatch** from sidebar.
2. Layout:
   - Left: list of missions (filters by status, time window, vehicle type).
   - Right (top): Google Map showing current selection, bases and route.
   - Right (bottom): Trip Transparency panel + vehicle/driver assignment summary.
3. Operator can assign/reassign driver/vehicle from this screen using a `Drawer` with candidate list and suitability scores.

---

## 6. Component Library

### 6.1 Component Strategy

The UI should primarily reuse **shadcn/ui** components styled with Tailwind. Custom components are composed from these primitives.

#### 6.1.1 Global Shell Components

- **Sidebar Navigation**

  - Built with `ScrollArea`, `Button` (for icons), and `Link` components.
  - Groups:
    - Core: Home, Contacts, Quotes, Invoices.
    - Operations: Vehicles, Drivers, Fleet, Dispatch.
    - Administration: Documents, Settings.
  - Active item uses solid background in primary colour, subtle left border accent.

- **Top Bar**
  - Contains breadcrumbs (`Home / Quotes / Create`), page title, and right‑side actions:
    - Theme toggle (light/dark) using shadcn `Switch` or dedicated `ModeToggle`.
    - User avatar menu.

#### 6.1.2 Data Display Components

- **DataTable** (Quotes, Vehicles, Drivers, Seasonal Multipliers)

  - Based on shadcn `Table` with:
    - Sticky header, zebra rows optional.
    - Column sorting icons.
    - Row selection checkboxes.
  - Filters implemented via `Input`, `Select`, `DropdownMenu` in a toolbar row.

- **Cards & Summary Tiles**

  - shadcn `Card` for:
    - Trip Transparency summary metrics.
    - Seasonal multipliers summary (currently active, upcoming, total).
    - Driver statistics at top of Drivers page.

- **Badges & Status Chips**
  - `Badge` for statuses:
    - Quote status (Draft, Sent, Viewed, Accepted, Rejected, Expired).
    - Invoice status (Draft, Issued, Paid, Cancelled).
    - Vehicle status (Active, In Maintenance, Out of Service).
    - Seasonal multiplier status (Active, Upcoming, Expired).

#### 6.1.3 Form & Input Components

- **Inputs**: `Input`, `Textarea`, `Select`, `Combobox`.
- **Toggles**: `Switch` for boolean flags (e.g. “Active multiplier”).
- **Sliders**: `Slider` for multiplier (%) selection in seasonal multipliers.
- **Date/Time**: date picker built from `Popover` + `Calendar` + `Input`, with time selection pattern aligned to Europe/Paris business time.
- **Address Autocomplete**: custom component wrapping Google Places Autocomplete.

#### 6.1.4 Overlay Components

- **Dialogs**

  - For creating/editing seasonal multipliers, optional fees, promotions.
  - Centered modal with clear title, description and primary/secondary buttons.

- **Drawers/Sheets**

  - For creating vehicles, drivers, and possibly editing quote details from list pages.

- **Toasts**
  - For success and error feedback (e.g. quote created, invoice issued, dispatch assignment failed).

#### 6.1.5 Custom Domain Components

- **TripTransparencyPanel**

- Composite component rendered in Create Quote, Quote Detail and Dispatch.
- Contains:
  - Summary row: total distance, duration, internal cost, margin %, profitability light.
  - Tabs:
    - Overview: high‑level cost breakdown.
    - Route: segment‑by‑segment distances and durations.
    - Fees & Tolls: list of fuel, tolls, parking, extra costs.
- Uses Cards, Tabs, Table and Progress/Badges.

- **VehicleAssignmentPanel**

- Shows selected vehicle and driver with utilisation (pax/luggage/driver hours).
- Contains chips for licences and RSE indicators.

- **SeasonalMultiplierList** & **SeasonalMultiplierFormDialog**

- Implement Settings → Pricing → Seasonal Multipliers UI similar to reference.

- **OptionalFeesList** & **PromotionList**
- For Additional Pricing Options column in Create Quote.

#### 6.1.6 Profitability Indicator & Dispatch Badges

- **Profitability Indicator**

  - Visual pattern reused across TripTransparencyPanel, Quotes list, Dispatch and Reports.
  - Components:
    - Lucide icon (`ArrowUpRight` / `AlertTriangle` / `ArrowDownRight` or similar) + coloured dot.
    - Text label (e.g. `Profitable`, `Low margin`, `Loss`).
  - Thresholds (configurable but with UX defaults):
    - Margin ≥ target (e.g. ≥ 20%) → **Green** state.
    - 0% < Margin < target → **Orange** state.
    - Margin ≤ 0% → **Red** state.
  - Tooltip explains the rule: `Selling price vs internal cost` with actual % value and target.

- **Dispatch Badges**
  - Each mission row in Dispatch list shows compact badges:
    - Profitability (green/orange/red icon).
    - Compliance (OK / Warning / Violation) using Lucide icons (`ShieldCheck`, `AlertTriangle`, `XCircle`).
    - Assignment state (Unassigned / Assigned) using icons (`UserCircle2`, `UserX`).

---

## 7. UX Pattern Decisions

### 7.1 Navigation, Layout & Density

- The **three-zone layout** (sidebar shell, content header, content body) is reused on all main routes.
- High-density tables and side panels are preferred to modal-only flows so that operators keep context (aligned with FR42–FR44).
- Heavy workflows (Create Quote, Dispatch, Settings → Pricing) use **multi-column layouts**:
  - Left: context and primary inputs.
  - Center: Trip Transparency / operational impact.
  - Right: pricing options, actions, secondary controls.

### 7.2 Tables, Filters & Search

- Tables use a consistent pattern:
  - Sticky header, row hover, optional row selection.
  - Column sort icons on key columns (date, status, price, margin).
  - Top toolbar with search field, filters (Select/Combobox/DropdownMenu) and bulk actions.
- Filters always support at least:
  - **Status** (e.g. Quote status, Vehicle status, Driver availability).
  - **Date range** where relevant.
  - **Free-text search** on key identifiers (contact name, licence plate, mission ID).

### 7.3 Forms & Validation

- All forms follow shadcn/ui conventions:
  - Label, optional description, input, inline error.
  - Required fields marked with `*` and validated on blur and on submit.
- Blocking errors (e.g. impossible trip, regulatory violation) are shown as **page-level banners** with clear actions (FR46, FR47–FR48).
- Non-blocking warnings (e.g. low margin) use inline alerts in the TripTransparencyPanel and Dispatch badges.

### 7.4 Feedback, Toasts & Loading States

- Success/failure for async actions (save quote, issue invoice, assign driver) use toasts with concise messages.
- Skeleton loaders are used in:
  - Trip Transparency segment tables while routing/pricing runs.
  - Dispatch mission details while reloading assignment proposals.
- Long-running actions (e.g. recompute pricing with new config) show a progress bar in the header.

### 7.5 Integrations & External APIs

- External systems (Google Maps, CollectAPI) are surfaced in UI only where needed:
  - **Maps**: Create Quote, Dispatch, Operating Bases, Zones.
  - **Fuel prices**: Trip Transparency (fuel line), Settings → Integrations → CollectAPI.
- **Settings → Integrations** pattern:
  - One card per integration (Google Maps, CollectAPI).
  - Each card contains API key fields, `Test connection` button and a **status indicator** (e.g. `Connected`, `Invalid key`, `Unknown`).
  - Primary `Save changes` action at card level or global for the page.

---

## 8. Screen Specifications

This section lists the main application screens and ties them explicitly to PRD Functional Requirement groups.

### 8.1 Global Layout Shell

- **Route prefix**: all authenticated routes live under `/dashboard/...`.
- **Sidebar**: main sections – Home, Contacts, Quotes, Invoices, Vehicles, Drivers, Fleet/Bases, Dispatch, Documents, Settings.
- **Top bar**: breadcrumbs, page title, key primary action (e.g. `Add Quote`, `Add Vehicle`) and theme toggle.

### 8.2 Contacts / CRM

- **Route**: `/dashboard/contacts`.
- **Purpose**: implements CRM part of FR Group 5 (FR31–FR36) by managing contacts/partners used in quotes & invoices.
- **Contacts List**
  - Columns: Name, Type (Partner / Private), Company, Email, Phone, Last Activity, Quotes Count, Invoices Count, Status.
  - Filters: Type, Status, Text search.
  - Row actions: `View`, `Edit`, `Archive`.
- **Contact Detail Drawer/Page**
  - Left: identity (name, company, tags), contact details.
  - Center: timeline of quotes & missions.
  - Right: commercial settings (commissions for partners, default VAT regime where applicable).

### 8.3 Quotes

#### 8.3.1 Quotes List

- **Route**: `/dashboard/quotes`.
- **Columns**: Quote ID, Contact, Trip Summary (pickup → dropoff), Date/Time, Vehicle Category, Status (Draft/Sent/... per FR31), Price (EUR), Margin % (FR24), Profitability Indicator.
- **Filters**: Date range, Status, Client Type (Partner/Private), Vehicle Category.
- **Actions**:
  - Toolbar: `Add Quote`, `Export`, quick filters.
  - Row menu: `View / Edit`, `Duplicate`, `Convert to Invoice` (FR33), `Cancel`.

#### 8.3.2 Create Quote

- **Route**: `/dashboard/quotes/new`.
- **Layout**: 3 columns as described in Journey 1 (FR42–FR44):
  - Left – Basic Info: contact selector, trip type, pickup/destination (Google Places), datetime (Europe/Paris), vehicle category.
  - Center – Trip Transparency: cards for distance, duration, internal cost, margin %, tabs for Overview/Route/Fees/Tolls (FR21–FR24, FR55).
  - Right – Pricing & Options: suggested price vs final price, optional fees checklist (FR56), promotion code selector (FR57), notes.
- **Behaviour**:
  - When mandatory inputs are set, the backend runs pricing + shadow calculation (Appendix B) and updates the middle column.
  - Warnings for low margin use orange Profitability Indicator; blocking errors for impossible missions appear as banners (FR46).

#### 8.3.3 Quote Detail

- **Route**: `/dashboard/quotes/[id]`.
- **Sections**:
  - Header: status badge, main actions (`Send`, `Mark as Accepted`, `Convert to Invoice`).
  - Left: immutable commercial summary once Sent/Accepted (FR32, FR34).
  - Center: Trip Transparency with stored tripAnalysis JSON rendered as segments A/B/C.
  - Right: activity log (when sent/viewed/accepted), attachments, internal notes.

### 8.4 Invoices

#### 8.4.1 Invoices List

- **Route**: `/dashboard/invoices`.
- **Columns**: Invoice No, Client, Issue Date, Due Date, Total (EUR), VAT breakdown indicator, Status (Draft/Issued/Paid/Cancelled), Source Quote.
- **Filters**: Status, Date range, Client, Amount range.

#### 8.4.2 Invoice Detail

- **Route**: `/dashboard/invoices/[id]`.
- Uses a **two-column layout**:
  - Left: billing entity, addresses, invoice meta (PO number, payment terms).
  - Right: line items (transport, ancillaries), VAT breakdown per FR35, total + commission amounts (FR36).
- `Issue Invoice` button locks commercial values (FR34) and updates status.

### 8.5 Vehicles

- **Route**: `/dashboard/vehicles`.
- **Columns**: Vehicle (make/model), Licence Plate, Category, Status (Active/In Maintenance/Out of Service), Base, Seats, Luggage capacity, Mileage, Tags.
- **Filters**: Status, Category, Base, Heavy/Light flag (FR25).
- **Add/Edit Vehicle Drawer**:
  - Fields: registration, base, category, consumption, hourly cost, per-km cost, heavy/light flag, RSE-related notes.
  - Links vehicle to **Operating Base** (multi-base model, Appendix B).

### 8.6 Drivers

- **Route**: `/dashboard/drivers`.
- **Columns**: Name, Licence Categories, Primary Base, Availability (Available/On Mission/Unavailable), Daily amplitude used, Driving time used (FR25–FR30, FR47–FR49).
- **Driver Detail Drawer**:
  - Personal/contact info.
  - Licences list with validity dates.
  - Compliance snapshot (today's hours, this period's counters).
  - Future missions list.

### 8.7 Operating Bases / Garages

- **Route**: `/dashboard/fleet/bases` (or `/dashboard/fleet/garages`).
- **Purpose**: implements multi-base model from Appendix B and FR17–FR20.
- **Page Header**:
  - Title: `Operating Bases`.
  - Primary action: `Add Base`.
- **Map + List Layout**:
  - Top: compact map with base markers (`MapPin` Lucide) and clusters near Paris.
  - Bottom: table with columns Name, Type (Garage/Parking/Depot), Address, City, Linked Vehicles (count with `Car` icon), Notes, Actions.
  - Clicking a row opens a right-hand drawer for details.
- **Base Form Drawer**:
  - Sections: `Location`, `Operational Details`, `Notes`.
  - Fields: Name, Type, address fields, latitude/longitude (readonly post-geocoding), notes.

### 8.8 Dispatch

- **Route**: `/dashboard/dispatch`.
- **Layout** (FR43–FR46):
  - Left: missions list with filters (status, date/time, vehicle category, partner vs private).
  - Right-top: Google Map with current mission route, bases, and relevant nearby missions.
  - Right-bottom: TripTransparencyPanel + VehicleAssignmentPanel.
- **Mission Row Content**:
  - Time window, pickup/dropoff, client, vehicle/driver (if assigned), Dispatch Badges (profitability, compliance, assignment).
- **Assignment Drawer**:
  - List of candidate vehicles/drivers with suitability score, compliance indicator and estimated cost impact (FR20, FR50–FR52).

### 8.9 Settings – Pricing (Seasonal, Advanced, Optional Fees, Promotions)

- **Route**: `/dashboard/settings/pricing`.
- **Tabs or subsections**:
  - **Seasonal Multipliers** (FR59): summary cards + table (Name, Date range, Multiplier, Priority, Status) + `Add Multiplier` dialog.
  - **Advanced Rate Modifiers** (FR58): list of rules (Condition, Trigger, Adjustment type/value, Status) with modal editor.
  - **Optional Fees** (FR56): list of fees (Name, Type, Amount, Tax flag, Auto-trigger) with enable/disable switch.
  - **Promotions** (FR57): promo codes (Code, Value, Type, Validity, Usage counters, Status).

### 8.10 Settings – Fleet & Regulatory Configuration

- **Route**: `/dashboard/settings/fleet`.
- **Sections**:
  - Vehicle Categories: name, description, base multiplier (FR60).
  - Cost Parameters: default per-km, per-hour, fixed fees for reference category.
  - Regulatory Rules per licence type (FR26–FR29, FR47–FR49): max daily driving time, max amplitude, mandatory breaks, required rest.
- Validation summary at top shows whether configuration is consistent.

### 8.11 Settings – Integrations

- **Route**: `/dashboard/settings/integrations`.
- **Cards**:
  1. **Google Maps Integration**
     - Fields: `Google Maps API Key`, optional domain restriction info.
     - `Test connection` button.
     - Status indicator (`Connected` / `Invalid key` / `Unknown`).
  2. **CollectAPI Integration** (fuel prices, FR41)
     - Fields: `CollectAPI Key`, `Preferred Fuel Type` (select: gasoline/diesel/lpg), `Test Connection` button.
     - Status indicator with same visual pattern as Google Maps.
- Primary `Save changes` button at bottom or per card.

### 8.12 Settings – Zones & Routes Configuration

- **Route**: `/dashboard/settings/zones` and `/dashboard/settings/routes` (or combined `Zones & Routes`).

**Zones Screen**

- Layout:
  - Left panel: table of configured zones.
  - Right panel: map editor using Google Maps.
- Zones table columns:
  - Name (e.g. `Zone 0 – Paris Centre`).
  - Code.
  - Type (Polygon / Radius / Point).
  - Parent zone (optional).
  - Number of routes referencing this zone.
  - Actions: `Edit`, `Duplicate`, `Delete`.
- Map editor behaviour:
  - For polygon zones, operator can draw/adjust polygon vertices using Google Maps drawing tools.
  - For radius zones, operator sets a center point (click on map) and radius (slider or numeric field).
  - Use Lucide icons (`Map`, `Pen`, `Circle`, `Square`) in toolbar above map (e.g. `Draw polygon`, `Draw circle`, `Select`, `Delete shape`).
  - A small legend explains zone colours and types.

**Routes / Grid Screen**

- Layout similar to seasonal multipliers: header + summary + table.
- Routes table columns:
  - From Zone, To Zone.
  - Vehicle Category.
  - Direction (Bidirectional/A→B/B→A).
  - Fixed Price (EUR).
  - Engagement Rule flag (whether it is contractual for partners).
  - Status (Active/Inactive).
- `Add Route` button opens modal:
  - Fields: `From Zone`, `To Zone` (`Select`), `Vehicle Category`, `Direction`, `Fixed Price`, `Is Contractual` (`Switch`).
- These screens implement the PRD **zone engine** and **Engagement Rule** visually; operators can see exactly which zone-to-zone pairs are covered by fixed grids (FR37, Appendix A).

### 8.13 Documents & Reporting

- **Documents** (`/dashboard/documents`): basic list of generated invoices/quotes/attachments with filters by client/date/type.
- **Reporting** (MVP+): simple profitability report listing missions/quotes with margin, grouped by partner or vehicle category, using the same Profitability Indicator pattern (FR24, FR55–FR56).

---

## 9. PRD → UX Mapping

This section shows where each FR group is primarily surfaced in the UX.

- **FR Group 1–3 (Pricing Core, Zoning, Shadow Calculation)**
  - Create Quote (8.3.2) and Quote Detail (8.3.3).
  - TripTransparencyPanel (6.1.5) and Profitability Indicator (6.1.6).
  - Settings – Pricing (8.9) and Settings – Zones & Routes (8.12).
- **FR Group 4 – Fleet & Regulatory Compliance (FR25–FR30)**
  - Vehicles (8.5), Drivers (8.6), Settings – Fleet & Regulatory (8.10).
  - Dispatch badges and compliance indicators (6.1.6, 8.8).
- **FR Group 5 – CRM, Quote & Invoice Lifecycle (FR31–FR36)**
  - Contacts / CRM (8.2).
  - Quotes list/detail/create (8.3.1–8.3.3).
  - Invoices list/detail (8.4.1–8.4.2).
- **FR Group 6 – Configuration & Localisation (FR37–FR41)**
  - Settings – Pricing (8.9).
  - Settings – Fleet & Regulatory (8.10).
  - Settings – Integrations (8.11) for fuel cache source.
- **FR Group 7 – Operator Cockpit & UX (FR42–FR46)**
  - Core UX & journeys (Sections 2 and 5).
  - Screen specs for Create Quote (8.3.2) and Dispatch (8.8).
- **FR Group 8 – Strategic Optimisation, Yield & Advanced Pricing (FR47–FR60)**
  - Compliance validator surfaces in Dispatch and Drivers detail (8.6, 8.8).
  - Chaining and empty-leg opportunities appear as suggestions in Dispatch assignment drawer (8.8).
  - Advanced pricing tools (optional fees, promotions, advanced modifiers, seasonal multipliers) live in 8.9 and are reflected in Trip Transparency (6.1.5).

This mapping ensures every FR either has a direct UI surface or is a backend concern surfaced via existing components (e.g. validators and suggestions in Dispatch and Trip Transparency).

---

## 10. Responsive Design & Accessibility

- **Breakpoints**:
  - ≥1280px: full 3-column layouts for Create Quote, Dispatch and Settings pages.
  - ~1024–1279px: columns may stack into 2-column layouts; Trip Transparency remains visible above fold.
  - <1024px: simplified list-first views with key actions; detailed Trip Transparency accessible via tabs.
- **Tables**: horizontal scrolling enabled on small screens; critical columns pinned (ID, client, status, price/margin).
- **Accessibility**:
  - All icon-only buttons include `aria-label`.
  - Colour is never the only carrier of meaning; icons and text labels are used for status and profitability (aligns with PRD non-functional requirements).
  - Keyboard navigation: focus outlines, logical tab order, Enter/Space activation for main actions.

---

## Appendix

### Related Documents

- Product Requirements: `docs/bmad/prd.md`
- Technical Specification: `docs/bmad/tech-spec.md`

### Core Interactive Deliverables

The following HTML deliverables are reserved for potential future interactive prototypes:

- **Color Theme Visualizer**: `ux-color-themes.html`
- **Design Direction Mockups**: `ux-design-directions.html`

They are not yet implemented in this repository; this specification is the canonical source of truth for UX decisions.

### Next Steps & Follow-Up Workflows

- Use this UX Design Specification as input to implementation tasks and, if desired, to future workflows for wireframing or component showcases.
