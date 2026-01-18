---
id: "26-5"
title: "UI - Universal Block Row Component"
epicId: "26"
status: "todo"
original_status: "todo"
story_type: "feature"
priority: "high"
estimation: 3
assigned_to: "Amelia"
created_at: "2026-01-18"
updated_at: "2026-01-18"
tags:
  - "ui"
  - "react"
  - "yolo-mode"
---

## Description

This story covers the creation of the `UniversalLineItemRow` component, the visual building block of the new "Yolo Mode" quote editor. This component must be polymorphic, rendering differently based on the `line.type` (CALCULATED, MANUAL, or GROUP). It is a "dumb" UI component that receives data and callbacks, handling the visual presentation of indentation, icons, and input fields.

## Context

The "Yolo Mode" editor replaces the rigid table structure with a flexible, Notion-like block editor. This allows operators to group items, add manual text lines, and mix them with calculated trips. This component is the row that appears in the list.

## Requirements

### Visual States by Type

1.  **CALCULATED**:

    - **Icon**: "Linked" / "Link" style icon (e.g., Lucide `Link` or `Car`).
    - **Appearance**: Standard inputs for Price/Qty. Visual indicator that it is data-backed.
    - **Tooltip**: Hovering icon shows "Calculated from Route: Paris -> Lyon".
    - **Editability**: Label is editable but might trigger "Detach" warning (handled by parent, here just an input).

2.  **MANUAL**:

    - **Icon**: "Text" / "AlignLeft" style icon.
    - **Appearance**: Standard inputs. Looks like a simple text row.

3.  **GROUP**:
    - **Icon**: "Folder" / "ChevronDown" (toggle).
    - **Appearance**: Bold background or distinct header styling.
    - **Behavior**: Collapsible toggle button.

### Props Interface

```typescript
interface UniversalLineItemRowProps {
  line: QuoteLine; // The data object
  depth: number; // For indentation (0 = root)
  index: number; // Position in list
  onUpdate: (id: string, data: Partial<QuoteLine>) => void;
  onToggleExpand?: (id: string) => void;
  isExpanded?: boolean;
}
```

### Styling

- **Indentation**: `padding-left` or `margin-left` calculated as `depth * spacer` (e.g., 24px).
- **TailwindCSS**: Use widely for layout (Flexbox) and typography.
- **Inputs**: "Invisible" inputs that look like text until focused (or minimal borders).

## Acceptance Criteria

- [ ] **Component Structure**: `UniversalLineItemRow` is created and exported.
- [ ] **Type Rendering**: Component correctly applies specific styles/icons for CALCULATED, MANUAL, and GROUP types.
- [ ] **Indentation**: Visual hierarchy is clear based on the `depth` prop.
- [ ] **Inputs**: Label, Quantity, Unit Price, and VAT fields are present and trigger `onUpdate`.
- [ ] **Calculated Indicator**: A specific icon/tooltip renders for CALCULATED lines to indicate source data presence.
- [ ] **Group Header**: GROUP lines render as section headers with visually distinct styling.

## Technical Notes

- Use `lucide-react` for icons.
- This component should NOT contain business logic (e.g., calculating totals).
- Mock `QuoteLine` type if not available in the codebase yet for the implementation.
- Path: `apps/web/modules/saas/quotes/components/UniversalLineItemRow.tsx`

## Test Plan

- **Unit/Snapshot Test**:
  - Render with `type="CALCULATED"`, assert "Link" icon.
  - Render with `type="MANUAL"`, assert "Text" icon.
  - Render with `type="GROUP"`, assert bold style and depth indentation.
- **Storybook/Manual**: Visual check of the indentation hierarchy.
