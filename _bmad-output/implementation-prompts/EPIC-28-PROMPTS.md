# Epic 28 Implementation Prompts: Order Management & Intelligent Spawning

> **Context:** Epic 28 focuses on the "Dossier" lifecycle (Order Management), handling multi-mission groups, intelligent spawning from quotes, and flexible execution-aware invoicing. This epic bridges the Commercial (Quote) and Operational (Mission) worlds with a new parent entity: The Order.

---

## 🏗️ Phase 1: Infrastructure & Data Model

### Story 28.1: Order Entity & Prisma Schema

> **Goal:** Establish the database foundation for Orders (Dossiers).

**Prompt:**
```markdown
@_bmad-output/implementation-artifacts/planning-artifacts/prd.md @packages/database/prisma/schema.prisma

**ACT AS:** Senior Backend Architect.

**TASK:** Implement the `Order` entity and its relationships in the Prisma schema.

**CONTEXT:**
We are introducing a "Dossier" (Order) concept to group Quotes, Missions, and Invoices.
An Order represents the confirmed commercial agreement that spawns operational tasks.

**REQUIREMENTS:**
1.  **Modify `schema.prisma`:**
    *   Create model `Order`.
    *   Fields: `id` (CUID), `status` (Enum), `reference` (String, unique, e.g., "ORD-2024-001"), `clientId` (Relation), `createdAt`, `updatedAt`.
    *   Enum `OrderStatus`: `DRAFT`, `QUOTED`, `CONFIRMED`, `INVOICED`, `PAID`, `CANCELLED`.
    *   Update `Quote` model: Add `orderId` (optional relation).
    *   Update `Mission` model: Add `orderId` (optional relation).
    *   Update `Invoice` model: Add `orderId` (optional relation).
2.  **Migration:**
    *   Generate a migration `add_order_model`.
3.  **Seed Script:**
    *   Update `packages/database/prisma/seed.ts` to create a few sample Orders linking existing quotes.

**DELIVERABLES:**
*   Updated `schema.prisma`.
*   Migration file.
*   Updated seed script.
```

---

### Story 28.2: Order State Machine & API

> **Goal:** Create the API to manage Order lifecycle transitions.

**Prompt:**
```markdown
@packages/database/prisma/schema.prisma @apps/web/app/api/

**ACT AS:** Backend Developer.

**TASK:** Implement the API endpoints for Order management and state transitions.

**CONTEXT:**
The Order needs a robust state machine to handle transitions like `DRAFT` -> `CONFIRMED`.

**REQUIREMENTS:**
1.  **API Routes (`apps/web/app/api/vtc/orders/...`):**
    *   `POST /`: Create a new Order (optionally from a Quote).
    *   `GET /:id`: detailed view (with included Quote, Missions, Invoices).
    *   `PATCH /:id/status`: Update status.
2.  **Validation Logic (Zod):**
    *   Cannot confirm an order without a linked Client.
    *   Cannot invoice an order if it's not confirmed (flexible, but check business rules).
3.  **Audit Logs:**
    *   Log status changes (using existing or new audit pattern).

**DELIVERABLES:**
*   API Route Handlers.
*   Zod schemas for input validation.
```

---

## 🧠 Phase 2: Intelligent Spawning Engine

### Story 28.4: Spawning Engine - Trigger Logic

> **Goal:** Automatically create Missions when an Order is CONFIRMED.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/services/SpawnService.ts @packages/database/prisma/schema.prisma

**ACT AS:** Backend Developer (Business Logic Specialist).

**TASK:** Implement the `SpawnService` that converts QuoteLines into Missions.

**CONTEXT:**
When a user confirms an Order (Quote -> Order), the system must generate operational Missions.

**REQUIREMENTS:**
1.  **Trigger:**
    *   Create a service `SpawnService.execute(orderId)`.
    *   This usually runs when `PATCH /orders/:id/status` sets status to `CONFIRMED`.
2.  **Logic:**
    *   Fetch the linked `Quote` and `QuoteLines`.
    *   Iterate through lines.
    *   If `line.type` is `TRANSFER` or `DISPOSAL`, create a `Mission`.
    *   **Mapping:**
        *   `Mission.startAt` = `QuoteLine.date/time`.
        *   `Mission.pickup` = `QuoteLine.pickup`.
        *   `Mission.dropoff` = `QuoteLine.dropoff`.
        *   `Mission.vehicleCategory` = `QuoteLine.vehicleCategory`.
        *   `Mission.pax` = `Quote.pax`.
    *   Link `Mission.quoteLineId` and `Mission.orderId`.
    *   Set Mission status to `PENDING` (Backlog).

**DELIVERABLES:**
*   `SpawnService.ts` (or similar core logic file).
*   Unit tests for the spawning logic.
```

### Story 28.5: Group Spawning Logic (Multi-Day)

> **Goal:** Handle complex spawning where 1 QuoteLine = N Missions.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/services/SpawnService.ts

**ACT AS:** Backend Developer.

**TASK:** Extend `SpawnService` to handle `GROUP` lines and Multi-Day packs.

**CONTEXT:**
A "Wedding Pack 3 Days" is one line on the user's quote, but operationally it is 3 distinct days of work.

**REQUIREMENTS:**
1.  **Recursive Spawning:**
    *   If `QuoteLine.type` is `GROUP`:
    *   Check for `children` lines. If children exist, iterate and spawn them (if dispatchable).
2.  **Time-Block Spawning (The "Wedding" Case):**
    *   If a Group represents a time range (Start Date -> End Date) but has no children:
    *   Logic to spawn 1 Mission per day within the range.
    *   *Note: This might rely on specific "Product" metadata, assume a helper function `breakdownGroup(line)` exists or create a basic version.*
3.  **Linking:**
    *   All spawned missions link back to the parent `QuoteLine` id.

**DELIVERABLES:**
*   Updated `SpawnService.ts`.
*   Test cases for Group/Multi-day spawning.
```

### Story 28.6: Optional Dispatch & Force Enable

> **Goal:** Allow control over what gets sent to dispatch (e.g., ignore "Champagne", allow "Luggage Van").

**Prompt:**
```markdown
@packages/database/prisma/schema.prisma @apps/web/modules/saas/orders/services/SpawnService.ts

**ACT AS:** Full Stack Developer.

**TASK:** Implement `dispatchable` flag and manual override logic.

**CONTEXT:**
Not all quote lines need a driver. We need a flag to control this.

**REQUIREMENTS:**
1.  **Schema Update:**
    *   Add `dispatchable` (Boolean, default based on type) to `QuoteLine`.
    *   `TRANSFER`/`DISPOSAL` defaults to true.
    *   `MANUAL`/`PRODUCT` defaults to false.
2.  **Spawning Logic:**
    *   Update `SpawnService`: Only spawn if `line.dispatchable === true`.
3.  **UI (Order Dossier):**
    *   In the Commercial Tab (Quote Lines list), show a toggle or indicator for "Dispatch".
    *   Allow user to toggle this flag *before* spawning.

**DELIVERABLES:**
*   Schema migration.
*   Updated Service.
*   UI interaction to toggle dispatchable status.
```

---

## 🖥️ Phase 3: The Dossier UI (Cockpit)

### Story 28.3: Dossier View UI - Skeleton & Tabs

> **Goal:** Create the main container page for the Order Management.

**Prompt:**
```markdown
@apps/web/app/(app)/app/[slug]/orders/[id]/page.tsx @apps/web/modules/saas/orders/components/OrderLayout.tsx

**ACT AS:** Frontend Developer.

**TASK:** Build the Order Details page layout.

**CONTEXT:**
This page is the central hub. It needs to look like a "Dossier".

**REQUIREMENTS:**
1.  **Page Layout:**
    *   Header: Order Reference, Client Name (Link to CRM), Status Badge (with dropdown to change status).
    *   Summary Cards: Total Commercial ({price}), Total Invoiced, Missions Count.
2.  **Tabs:**
    *   Use Shadcn `Tabs` component.
    *   `Commercial` (The Quote view).
    *   `Operations` (The Missions list/status).
    *   `Financial` (The Invoices).
3.  **Detail Components:**
    *   Create placeholders for the tab contents.

**DELIVERABLES:**
*   `page.tsx` for the order route.
*   `OrderLayout` component.
*   Tab navigation structure.
```

### Story 28.7: Manual Item Handling UI

> **Goal:** Allow converting "Manual" lines into Missions from the UI.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/components/CommercialTab.tsx

**ACT AS:** Frontend Developer.

**TASK:** Implement UI to "Spawn Mission" from a manual line.

**CONTEXT:**
Sometimes a user adds "Extra Stop" as a manual text line $50. Operationally, this needs a driver assignment.

**REQUIREMENTS:**
1.  **UI Action:**
    *   In the Quote Line row (Commercial Tab), add a "Create Mission" button/icon (visible if no mission linked).
2.  **Modal:**
    *   Opens a small modal to confirm/fill missing details (Date, Time, Vehicle Type).
    *   Pre-fill from Quote Line data where possible.
3.  **Action:**
    *   Call API to manually trigger `spawnSingleMission(lineId, details)`.
    *   Refresh view to show specific Mission link.

**DELIVERABLES:**
*   `SpawnMissionModal` component.
*   Integration in Commercial Line list.
```

### Story 28.13: Ad-Hoc Free Missions

> **Goal:** Create non-billable missions linked to the dossier.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/components/OperationsTab.tsx

**ACT AS:** Frontend Developer.

**TASK:** Allow adding "Free Missions" in the Operations tab.

**CONTEXT:**
"Go wash the car" or "Pick up flowers" are tasks linked to the order but not billed to the client on the quote.

**REQUIREMENTS:**
1.  **UI:**
    *   In `OperationsTab`, add "Add Internal Task" button.
2.  **Form:**
    *   Standard Mission creation form (Pickup, Dropoff, Date).
    *   **Crucial:** This mission is NOT created from a QuoteLine (or creates a hidden 0-cost line).
    *   Flag it as `internal` or `non-billable`.
3.  **Display:**
    *   Show in the Missions list with a specific badge.

**DELIVERABLES:**
*   `AddInternalMissionDialog`.
*   Updates to `OperationsTab`.
```

---

## 💶 Phase 4: Flexible Invoicing (The Detached Snapshot)

### Story 28.8: Invoice Generation - Detached Snapshot

> **Goal:** Implement the "Generate Invoice" logic that deep-copies data.

**Prompt:**
```markdown
@apps/web/modules/saas/invoicing/services/InvoiceFactory.ts @packages/database/prisma/schema.prisma

**ACT AS:** Backend Developer.

**TASK:** Implement the `InvoiceFactory` to create detached invoices.

**CONTEXT:**
An invoice must be a snapshot. Changes to the Quote AFTER invoicing should NOT change the Invoice. Changes to the Invoice should NOT change the Quote.

**REQUIREMENTS:**
1.  **Factory Logic:**
    *   `createInvoiceFromOrder(orderId, selection)`:
    *   Create `Invoice` record.
    *   For each selected `QuoteLine`:
        *   Create `InvoiceLine`.
        *   **COPY** `description`, `quantity`, `unitPrice`, `vatRate` from QuoteLine to InvoiceLine.
        *   Do NOT just link to QuoteLine. The data must be duplicated physically in the DB.
2.  **Validation:**
    *   Ensure totals match exactly at moment of creation.

**DELIVERABLES:**
*   `InvoiceFactory.ts` service.
*   Unit tests verifying data independence (changing source doesn't change target).
```

### Story 28.9: Invoice UI - Full Editability

> **Goal:** Allow finance officers to edit the invoice draft freely.

**Prompt:**
```markdown
@apps/web/modules/saas/invoicing/components/InvoiceEditor.tsx

**ACT AS:** Frontend Developer.

**TASK:** Build the Inline Invoice Editor.

**CONTEXT:**
The Invoice is a document. The user must be able to click on "Description" and type new text, or change "Price" and hit enter.

**REQUIREMENTS:**
1.  **Component:**
    *   Use the `UniversalRow` (Epic 26) or similar component, but bound to `InvoiceLine` data.
2.  **Editability:**
    *   `Description`: Text input.
    *   `Quantity`: Number input.
    *   `Price`: Number input (recalculate Total).
    *   `VAT`: Dropdown.
3.  **State Management:**
    *   `useInvoiceStore` or local state.
    *   "Save Changes" button to persist to backend.

**DELIVERABLES:**
*   `InvoiceEditor` component.
*   Integration with `InvoiceAPI`.
```

### Story 28.10: Execution Feedback Loop (Placeholders)

> **Goal:** Inject real driver/mission data into invoice text.

**Prompt:**
```markdown
@apps/web/modules/saas/invoicing/utils/placeholderReplacer.ts

**ACT AS:** Typescript Developer.

**TASK:** Implement placeholder replacement logic for Invoices.

**CONTEXT:**
Users want to say: "Transfer with {{driver}}". If Driver is "John", invoice says "Transfer with John".

**REQUIREMENTS:**
1.  **Utility Function:**
    *   `replacePlaceholders(text: string, missionContext: any): string`.
    *   Supported Tokens: `{{driver}}`, `{{plate}}`, `{{start}}`, `{{end}}`, `{{pax}}`.
2.  **UI Integration:**
    *   In `InvoiceEditor`, add a "Preview/Render" toggle.
    *   When Render is ON, run the replacements using linked Mission data.
    *   Add a "Finalize Text" button that hard-codes the replaced values into the DB description.

**DELIVERABLES:**
*   `placeholderReplacer.ts`.
*   Unit tests for regex replacement.
*   UI button in Invoice Editor.
```

### Story 28.11: Partial Invoicing

> **Goal:** Support Deposit and Partial line workflows.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/components/GenerateInvoiceModal.tsx

**ACT AS:** Frontend Developer.

**TASK:** Create the "Generate Invoice" wizard.

**CONTEXT:**
We rarely invoice everything at once. We do deposits or partials.

**REQUIREMENTS:**
1.  **Wizard Steps:**
    *   **Step 1:** Select Type: "Full Balance", "Deposit %", "Select Specific Lines".
    *   **Step 2 (Deposit):** Input Percentage (e.g., 30%). Creates 1 generic line "Deposit 30% on Order #...".
    *   **Step 2 (Select):** Checkbox list of uninvoiced QuoteLines.
2.  **Backend Integration:**
    *   Pass the selection to `createInvoiceFromOrder`.

**DELIVERABLES:**
*   `GenerateInvoiceModal`.
*   Logic to handle the 3 modes.
```

### Story 28.12: Post-Mission Pending Charges

> **Goal:** Highlight up-sells from the field.

**Prompt:**
```markdown
@apps/web/modules/saas/orders/components/PendingChargesAlert.ts

**ACT AS:** Full Stack Developer.

**TASK:** Flag extra costs added during operations.

**CONTEXT:**
If a driver adds "Waiting Time: 1 hour" to the Mission in the app, the back-office must see this when invoicing.

**REQUIREMENTS:**
1.  **Detection:**
    *   Compare `Mission.executionData` (fees) with `InvoiceLines`.
    *   If a fee exists on Mission but is not linked to an invoice line, it is "Pending".
2.  **UI:**
    *   In `OrderLayout` or `FinancialTab`, show alert: "2 Pending Charges from Operations".
    *   "Review" button opens a list.
    *   "Add to Invoice" action creates a new `InvoiceLine` for that fee.

**DELIVERABLES:**
*   Detection utility.
*   UI Alert component.
```
