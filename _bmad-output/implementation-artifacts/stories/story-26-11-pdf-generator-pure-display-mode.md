---
id: "26.11"
epicId: "26"
title: "PDF Generator pure Display Mode"
type: "story"
status: "review"
priority: "high"
complexity: "medium"
assignedTo: "Antigravity"
---

## Description
Implement the PDF generation logic for Quotes and Invoices that relies exclusively on the `displayData` JSON field of the `QuoteLine` / `InvoiceLine` models. This ensures that any manual edits, reordering, or grouping done by the operator in the Universal Block editor are exactly reproduced in the final document, ignoring the underlying `sourceData` which is reserved for operational use.

## User Story
**As a** Developer,
**I want** the PDF generator to respect my manual edits strictly and ignore source data for the commercial view,
**So that** the customer receives a document that matches exactly what I prepared in the editor (WYSIWYG).

## Acceptance Criteria
- [ ] **Source Data Isolation**: The PDF renderer must NOT read or display any values from `sourceData` (e.g., calculated distances, original times) in the commercial pricing table.
- [ ] **Display Data Mapping**: The rendering loop must strictly iterate over the `displayData` array/structure. `displayData.label`, `displayData.quantity`, `displayData.unitPrice`, `displayData.vatRate`, and `displayData.totalPrice` must be the only values used.
- [ ] **Group Rendering**: Line items with type `GROUP` must be rendered as distinct sub-headers within or breaking the pricing table, clearly separating the sections.
- [ ] **Visual Fidelity**: The order of items in the PDF must match the `sortOrder` defined in the quote/invoice.
- [ ] **Compliance**: The resulting table must strictly adhere to EU/FR compliance layouts (Description, Qty, Unit Price, VAT %, Total).

## Technical Implementation
- Modify the React-PDF templates (`QuotePdf`, `InvoicePdf`) to use `line.displayData` instead of `line.sourceData` or mixed logic.
- Implement conditional rendering for `line.type === 'GROUP'` to show a section header styling instead of a standard row.
- Ensure the `lines` array is sorted by `sortOrder` before rendering.

## Test Cases
- **TC1: Manual Override**: Create a Calculated line, change its label in `displayData`. Generate PDF. Verify PDF shows new label.
- **TC2: Grouping**: Create a Group "Day 1" with 2 child lines. Generate PDF. Verify "Day 1" appears as a header.
- **TC3: Mixed Types**: Verify a table with Manual, Calculated, and Group lines renders consistently.

## Constraints
- Must use `displayData` exclusively.
- Must maintain existing PDF styling for standard rows.
