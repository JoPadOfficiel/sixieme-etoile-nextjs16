---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments: []
session_topic: 'Universal "Yolo Mode" Billing System (Flexible Quotes & Invoices)'
session_goals: '1. UX/UI for Universal Line Item editor (Text, Price, VAT, Qty) for ALL trip types. 2. Data Strategy for Trip vs Line Item separation. 3. Profitability indicators with manual overrides. 4. Invoicing rules (Deep Copy vs Editability).'
selected_approach: 'ai-recommended'
techniques_used: ['Assumption Reversal', 'Metaphor Mapping', 'SCAMPER Method']
technique_execution_complete: true
facilitation_notes: "User confirmed 'Mask vs Face' architecture for data separation. Strong consensus on unifying 'Stay' and 'Off-Grid' into a single flexible block concepts. Use confirmed 'Universal Editor' direction."
---

# Brainstorming Session Results

**Facilitator:** JoPad
**Date:** 2026-01-18

## Session Overview

**Topic:** Universal "Yolo Mode" Billing System (Flexible Quotes & Invoices)
**Goals:** 
1. UX/UI for Universal Line Item editor (Text, Price, VAT, Qty) for ALL trip types.
2. Data Strategy for Trip vs Line Item separation.
3. Profitability indicators with manual overrides.
4. Invoicing rules (Deep Copy vs Editability).

### Context Guidance

We are moving away from a strict "Pricing Engine only" model to a flexible "Editor" model. 
This applies to **everything**, from a simple 50€ transfer to a 50k€ event. 
Users must be able to edit descriptions (e.g., add license plates), change VAT rates per line, and override prices at will.

### Session Setup

We have established that the core challenge is balancing this extreme flexibility with the rigour required for:
- Dispatch (Drivers need to know the *real* mission details, even if the Invoice line says "VIP Service").
- Accounting (VAT rates must be legally compliant, even if manually set).
- Profitability (We need to track margin even if the price is arbitrary).


## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Universal "Yolo Mode" Billing System (Flexible Quotes & Invoices) with focus on UX/UI for Universal Line Item editor, Data Strategy, Profitability indicators, and Invoicing rules.

**Recommended Techniques:**

- **Assumption Reversal:** To challenge the rigid link between computed data and user-facing documents.
- **Metaphor Mapping:** To find a conceptual model for managing "Operational Truth" vs "Commercial Fiction".
- **SCAMPER Method:** To systematically define the fields and UI elements needed for the new flexible system.

**AI Rationale:** The core challenge is the tension between rigid operational data and flexible commercial presentation. Reversing assumptions helps break the rigid model, Metaphors provide a new schema, and SCAMPER translates that into concrete features.

**[Deep #1]**: The Universal Service Line
*Concept*: Not every line is a "trip" (e.g. valet service, optional fees). We should treat "Trip" as just one *type* of Service Line, equal to "Fee", "Hourly Service", "Product".
*Novelty*: Instead of "Quote = Trips + Extras", it becomes "Quote = List of Services (some of which happen to be trips)".

**[Deep #2]**: The Off-Grid Everywhere
*Concept*: "Off-Grid" mode (complete flexibility) currently exists as a specific trip type. The inversion is to make "Off-Grid" the *default* behavior for the editor, and "On-Grid" (calculated) just a helper that fills in the fields.
*Novelty*: The editor is always in "Edit Mode", the Pricing Engine just makes suggestions.


**[Deep #3]**: The "Detach from Route" Warning
*Concept*: If a user tries to edit a "Calculated Line" beyond a certain point (e.g., changing the destination text), a popup asks: "Detach from Route? This will convert the line to a text-only item and remove dispatch details."
*Novelty*: Explicit UX check that allows flexibility but protects data integrity.

**[Deep #4]**: Quote Versioning (Forking)
*Concept*: Since Quotes lock upon sending, we need a "Create Revised Quote" button. This clones the current quote into a new Draft (V2) where edits are allowed again.
*Novelty*: Maintains the legal history of what was sent (V1) while allowing the negotiation dance (V2, V3) without starting from scratch.


**[Deep #5]**: Consolidate "Yolo" into "CustomTrip"
*Concept*:  and  are redundant in purpose (both mean "We define the rules"). We should consolidate them into a single flexibility layer.
*Novelty*: Simplifies the backend. A "Stay" is just a Custom Trip with multiple days content. An "Off-Grid" trip is just a Custom Trip with one day content.


**[Deep #5]**: Consolidate "Yolo" into "CustomTrip"
*Concept*: OFF_GRID and STAY are redundant in purpose. We should consolidate them into a single flexibility layer.
*Novelty*: Simplifies the backend. A "Stay" is just a Custom Trip with multiple days content. An "Off-Grid" trip is just a Custom Trip with one day content.


**[Deep #6]**: The Hybrid Block Architecture
*Concept*: A Quote is a list of "Service Blocks".
- **Block Type A (Auto)**: "Transfer" or "Dispo". Calculated by engine. User can apply a "Mask" to override Description/Price/VAT, but underlying data remains.
- **Block Type B (Manual)**: "Custom Item". Pure text/price/VAT. Used for "Luggage Truck", "Manutentionnaires", etc.
- **Block Type C (Composite)**: A "Container" that groups Type A and Type B (e.g., "Day 1 of Ambassador Visit").

*Novelty*: Removes the distinction between "Simple Quote" and "Stay Quote". *Every* quote is just a list of blocks. A simple transfer is just a list of 1 block.


**[Deep #7]**: Source vs Display Duality (The "Mask" Architecture)
*Concept*: DB Schema for all lines:
- **sourceData**: Immutable operational truth (Route, Base Price, Engine Logic).
- **displayData**: Mutable commercial fiction (Label, Final Price, Applied VAT).
- **Behavior**: Dispatch reads Source. Invoice reads Display. Profitability = Display Price - Source Cost.

*Novelty*: Solves the "Truth vs Story" conflict without losing data.


## Conclusions & Next Steps from Brainstorming

**Architecture Decision:**
1.  **Universal Line Item:** No more distinction between "Simple" and "Stay". Everything is a list of lines.
2.  **The Mask Pattern:**  (Operational) vs  (Commercial).
3.  **Yolo Editing:** Full editability of  allowed. Warnings only if "Detaching" from operational constraints.
4.  **Consolidation:** Merge  and  into a unified  or simply generic  with flexible lines.

**Action Plan:**
1.  Draft the  using the "Mask Pattern".
2.  Update Prisma Schema to introduce  and .
3.  Design the "Universal Editor" UI (React Table with editable cells).


## Conclusions & Next Steps from Brainstorming

**Architecture Decision:**
1.  **Universal Line Item:** No more distinction between "Simple" and "Stay". Everything is a list of lines.
2.  **The Mask Pattern:** sourceData (Operational) vs displayData (Commercial).
3.  **Yolo Editing:** Full editability of displayData allowed. Warnings only if "Detaching" from operational constraints.
4.  **Consolidation:** Merge OFF_GRID and STAY into a unified CustomMission or simply generic Quote with flexible lines.

**Action Plan:**
1.  Draft the tech-spec-yolo-billing.md using the "Mask Pattern".
2.  Update Prisma Schema to introduce InvoiceLine.sourceData and QuoteLine.sourceData.
3.  Design the "Universal Editor" UI (React Table with editable cells).


## Action Plan & Organization

**1. The Universal "Service Block"**
*   **Concept:** A unified model for  and  that replaces the fragmented  /  /  system.
*   **Structure:**
    *   : 'CALCULATED' | 'MANUAL' | 'GROUP'
    *    (JSON): Stores the "Engine Truth" (Distance, Duration, Waypoints). Immutable-ish.
    *    (JSON): Stores the "User Story" (Label, Qty, Unit Price, VAT). Fully Editable.

**2. Migration Strategy**
*   Deprecate  and  models.
*   Convert existing  segments into a  block containing multiple  or  lines.

**3. UX/UI Requirements**
*   **The Editor:** A "Notion-lite" table where clicking a cell edits  instantly.
*   **The Warning:** If potential conflict between  and  (e.g., date change), show a "Detach" warning.
*   **The Creator:** A "Slash Command" or "Add Block" menu to insert:
    *   Trip (opens Grid/Maps)
    *   Text Line (Empty)
    *   Group (Day separator)

**4. Next Steps (Actionable)**
*   **Task 1:** Create  detailing this Schema.
*   **Task 2:** Write the Prisma migration to add / columns.
*   **Task 3:** Update the  component to use this "Block Protocol".


## Action Plan & Organization

**1. The Universal "Service Block"**
*   **Concept:** A unified model for InvoiceLine and QuoteLine that replaces the fragmented Trip / Option / Package system.
*   **Structure:**
    *   type: 'CALCULATED' | 'MANUAL' | 'GROUP'
    *   sourceData (JSON): Stores the "Engine Truth" (Distance, Duration, Waypoints). Immutable-ish.
    *   displayData (JSON): Stores the "User Story" (Label, Qty, Unit Price, VAT). Fully Editable.

**2. Migration Strategy**
*   Deprecate OFF_GRID and STAY models.
*   Convert existing STAY segments into a GROUP block containing multiple MANUAL or CALCULATED lines.

**3. UX/UI Requirements**
*   **The Editor:** A "Notion-lite" table where clicking a cell edits displayData instantly.
*   **The Warning:** If potential conflict between sourceData and displayData (e.g., date change), show a "Detach" warning.
*   **The Creator:** A "Slash Command" or "Add Block" menu to insert:
    *   Trip (opens Grid/Maps)
    *   Text Line (Empty)
    *   Group (Day separator)

**4. Next Steps (Actionable)**
*   **Task 1:** Create tech-spec-yolo-billing.md detailing this Schema.
*   **Task 2:** Write the Prisma migration to add sourceData/displayData columns.
*   **Task 3:** Update the QuoteBuilder component to use this "Block Protocol".

