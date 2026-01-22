# Story 28.3: Dossier View UI - Skeleton & Tabs

## Story Info

| Field            | Value                                             |
| ---------------- | ------------------------------------------------- |
| **Story ID**     | 28.3                                              |
| **Epic**         | Epic 28 - Order Management & Intelligent Spawning |
| **Title**        | Dossier View UI - Skeleton & Tabs                 |
| **Status**       | done                                              |
| **Created**      | 2026-01-20                                        |
| **Priority**     | High                                              |
| **Story Points** | 3                                                 |
| **Related FRs**  | FR165, FR166                                      |

---

## User Story

**As a** back-office operator,
**I want to** view all aspects of an Order (Dossier) in a single, organized interface,
**So that** I can quickly access commercial, operational, and financial information without navigating between multiple pages.

---

## Description

This story creates the **central hub** for Order management - the Dossier View page. This page provides a unified view of an Order with three distinct tabs for different concerns:

1. **Commercial Tab**: Quotes and quote lines associated with the Order
2. **Operations Tab**: Missions spawned from the Order
3. **Financial Tab**: Invoices and payment status

### Key Concepts

- **Single Source of Truth**: All Order-related information accessible from one page
- **Tab-based Navigation**: Clean separation of concerns with URL-synced tabs
- **Header with KPIs**: Quick overview of Order status, reference, and key metrics
- **Placeholder Content**: Tabs contain placeholder content for future stories

### Technical Scope

1. Create Order detail page at `app/(saas)/app/(organizations)/[organizationSlug]/orders/[id]/page.tsx`
2. Implement Header with Order reference, status badge, and client info
3. Implement KPI Cards (Quote count, Mission count, Invoice count)
4. Implement Tabs navigation (Commercial, Operations, Financial)
5. Add placeholder content for each tab
6. Ensure responsive design for mobile

---

## Acceptance Criteria

### AC1: Order Detail Page Created

- [ ] Page exists at `/app/[organizationSlug]/orders/[id]`
- [ ] Page fetches Order data using the API from Story 28.2
- [ ] Page shows loading state while fetching
- [ ] Page shows 404 if Order not found

### AC2: Header Section

- [ ] Displays Order reference (e.g., "ORD-2026-001")
- [ ] Displays Order status with colored Badge
- [ ] Displays Client name (from Contact relation)
- [ ] Displays creation date
- [ ] Back button to Orders list

### AC3: KPI Cards Section

- [ ] Card showing Quote count with icon
- [ ] Card showing Mission count with icon
- [ ] Card showing Invoice count with icon
- [ ] Cards are responsive (stack on mobile, row on desktop)

### AC4: Tabs Navigation

- [ ] Three tabs: "Commercial", "Operations", "Financial"
- [ ] Tab state synced with URL query parameter (`?tab=commercial`)
- [ ] Default tab is "Commercial"
- [ ] Tabs use Shadcn UI `Tabs` component

### AC5: Tab Content - Placeholders

- [ ] Commercial tab shows placeholder: "Quote lines and commercial details will appear here"
- [ ] Operations tab shows placeholder: "Missions and operational status will appear here"
- [ ] Financial tab shows placeholder: "Invoices and payment tracking will appear here"
- [ ] Each placeholder has an appropriate icon

### AC6: Responsive Design

- [ ] Layout works on mobile (320px+)
- [ ] Layout works on tablet (768px+)
- [ ] Layout works on desktop (1024px+)
- [ ] Tabs stack or scroll horizontally on mobile

### AC7: Status Badge Colors

- [ ] DRAFT: Gray
- [ ] QUOTED: Blue
- [ ] CONFIRMED: Green
- [ ] INVOICED: Orange
- [ ] PAID: Emerald
- [ ] CANCELLED: Red

---

## Technical Details

### File Structure

```
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/
├── [id]/
│   └── page.tsx          # Order detail page (this story)
└── page.tsx              # Orders list (future story)
```

### Component Structure

```tsx
// page.tsx structure
export default async function OrderDetailPage({ params, searchParams }) {
  // 1. Fetch Order with relations
  // 2. Render Header
  // 3. Render KPI Cards
  // 4. Render Tabs with placeholders
}

// Client component for tabs (URL sync)
function OrderTabs({ order, defaultTab }) {
  // Tabs with URL sync
}
```

### API Usage

```typescript
// Fetch Order with relations
GET /api/vtc/orders/:id

// Response includes:
{
  id: string,
  reference: string,
  status: OrderStatus,
  contact: { id, name, email },
  quotes: Quote[],
  missions: Mission[],
  invoices: Invoice[],
  createdAt: string,
  updatedAt: string
}
```

### Status Badge Mapping

```typescript
const STATUS_COLORS: Record<OrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  QUOTED: "bg-blue-100 text-blue-800",
  CONFIRMED: "bg-green-100 text-green-800",
  INVOICED: "bg-orange-100 text-orange-800",
  PAID: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};
```

### Files to Create/Modify

| File                                                                              | Changes                       |
| --------------------------------------------------------------------------------- | ----------------------------- |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/[id]/page.tsx` | New file - Order detail page  |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/page.tsx`      | New file - Orders list (stub) |

---

## Test Cases

### TC1: Page Renders with Valid Order

- **Given**: Order with ID exists in database
- **When**: Navigating to `/app/[slug]/orders/[id]`
- **Then**: Page renders with Order header, KPIs, and tabs

### TC2: Page Shows 404 for Invalid Order

- **Given**: Order ID does not exist
- **When**: Navigating to `/app/[slug]/orders/invalid-id`
- **Then**: 404 page or error message displayed

### TC3: Tab Navigation Works

- **Given**: Order detail page is loaded
- **When**: Clicking on "Operations" tab
- **Then**: URL updates to `?tab=operations` and Operations content shown

### TC4: Tab State Persists on Reload

- **Given**: URL is `/app/[slug]/orders/[id]?tab=financial`
- **When**: Page is reloaded
- **Then**: Financial tab is active

### TC5: Status Badge Displays Correctly

- **Given**: Order with status CONFIRMED
- **When**: Page renders
- **Then**: Badge shows "CONFIRMED" with green styling

### TC6: KPI Cards Show Correct Counts

- **Given**: Order with 2 quotes, 3 missions, 1 invoice
- **When**: Page renders
- **Then**: KPI cards show "2 Quotes", "3 Missions", "1 Invoice"

### TC7: Responsive Layout - Mobile

- **Given**: Viewport width is 375px
- **When**: Page renders
- **Then**: KPI cards stack vertically, tabs are scrollable

### TC8: Back Button Navigation

- **Given**: Order detail page is loaded
- **When**: Clicking back button
- **Then**: Navigates to Orders list page

---

## Dependencies

### Upstream Dependencies

- **Story 28.1** (Order Entity & Prisma Schema) - ✅ DONE
- **Story 28.2** (Order State Machine & API) - ✅ DONE
- Shadcn UI components (Tabs, Card, Badge)
- Organization context from existing layout

### Downstream Dependencies

- **Story 28.4** (Spawning Engine) - will populate Operations tab
- **Story 28.7** (Manual Item Handling) - will add actions to Commercial tab
- **Story 28.8** (Invoice Generation) - will populate Financial tab
- **Story 28.9** (Invoice UI) - will enhance Financial tab

---

## Constraints

1. **Server Components**: Initial data fetch must use Server Components
2. **Client Components**: Tab navigation requires client-side state (URL sync)
3. **No Real Content**: Tabs contain placeholders only (content in future stories)
4. **Existing Patterns**: Follow patterns from `settings/fleet/page.tsx` for tabs
5. **Multi-tenant**: Order must belong to current organization

---

## Out of Scope

- Quote lines display (Story 28.7)
- Mission list display (Story 28.4+)
- Invoice list display (Story 28.8+)
- Order actions (edit, delete, status change)
- Real-time updates

---

## Dev Notes

### Pattern Reference

Follow the tab pattern from `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/fleet/page.tsx`:

- URL-synced tabs using `useSearchParams`
- `handleTabChange` function for navigation
- Tabs component from `@ui/components/tabs`

### Import Pattern

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
```

### Server/Client Split

```tsx
// page.tsx (Server Component)
export default async function OrderDetailPage({ params }) {
  const order = await fetchOrder(params.id);
  return <OrderDetailClient order={order} />;
}

// OrderDetailClient.tsx (Client Component)
("use client");
export function OrderDetailClient({ order }) {
  // Tabs with URL sync
}
```

---

## Checklist

- [x] Orders directory created
- [x] Order detail page created
- [x] Header section implemented
- [x] KPI cards implemented
- [x] Tabs navigation implemented
- [x] Placeholder content added
- [x] Responsive design verified
- [x] Browser test passed
- [x] Story file updated with completion notes

---

## Implementation Notes (2026-01-20)

### Files Created

| File                                                                              | Description                 |
| --------------------------------------------------------------------------------- | --------------------------- |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/[id]/page.tsx` | Order detail page with tabs |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/page.tsx`      | Orders list page            |

### Features Implemented

1. **Header Section**

   - Order reference (e.g., "ORD-2026-002")
   - Status badge with color coding (DRAFT=gray, QUOTED=blue, CONFIRMED=green, etc.)
   - Client name from Contact relation
   - Creation date formatted in French locale
   - Back button navigation

2. **KPI Cards**

   - Quote count with icon
   - Mission count with icon
   - Invoice count with icon
   - Responsive grid (1 col mobile, 3 cols desktop)

3. **Tabs Navigation**

   - Commercial, Operations, Financial tabs
   - URL-synced state (`?tab=commercial|operations|financial`)
   - Default tab: Commercial
   - Shadcn UI Tabs component

4. **Placeholder Content**

   - Each tab shows placeholder with icon and description
   - Ready for future stories to populate

5. **Notes Section**
   - Displays Order notes if present

### Tests Executed

| Test                               | Result  |
| ---------------------------------- | ------- |
| Page renders with valid Order      | ✅ PASS |
| Header displays reference & status | ✅ PASS |
| KPI cards show correct counts      | ✅ PASS |
| Tab navigation works (Commercial)  | ✅ PASS |
| Tab navigation works (Operations)  | ✅ PASS |
| Tab navigation works (Financial)   | ✅ PASS |
| URL updates with tab parameter     | ✅ PASS |
| Responsive layout (375px mobile)   | ✅ PASS |
| Notes section displays             | ✅ PASS |

### Git Commands

```bash
# Branch created
git checkout -b feature/28-3-dossier-ui

# Commit changes
git add apps/web/app/\(saas\)/app/\(organizations\)/\[organizationSlug\]/orders/
git add _bmad-output/implementation-artifacts/stories/story-28-3-dossier-view-ui-skeleton-tabs.md
git add _bmad-output/implementation-artifacts/sprint-status.yaml

git commit -m "feat(orders): add Dossier View UI with tabs for Story 28.3

- Create Order detail page at /orders/[id]
- Add header with reference, status badge, client info
- Add KPI cards (quotes, missions, invoices counts)
- Add tabs navigation (Commercial, Operations, Financial)
- Add placeholder content for each tab
- Add Orders list page at /orders
- URL-synced tab state
- Responsive design for mobile"

# Push to remote
git push -u origin feature/28-3-dossier-ui
```

### PR Information

- **Branch**: `feature/28-3-dossier-ui`
- **Target**: `main`
- **Title**: `feat(orders): Story 28.3 - Dossier View UI - Skeleton & Tabs`
- **Description**: Implements the central Order (Dossier) detail page with header, KPI cards, and tabbed navigation for Commercial, Operations, and Financial sections.

---

## Senior Developer Review (AI) - 2026-01-20

### Review Outcome: ✅ APPROVED (after fixes)

### Issues Found & Fixed

| #   | Severity | Issue                                                                        | Fix Applied                                               |
| --- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | HIGH     | Page was Client Component with React Query fetch instead of Server Component | Refactored to Server Component + Client Component pattern |
| 2   | HIGH     | OrdersResponse type mismatch with API (pagination structure)                 | Refactored to Server Component with direct Prisma fetch   |
| 3   | MEDIUM   | Back button navigated to /quotes instead of /orders                          | Fixed navigation to /orders                               |
| 4   | MEDIUM   | Session not synced showed false "not found" error                            | Handled by Server Component (no session dependency)       |
| 5   | MEDIUM   | Over-fetching full relations for KPI counts                                  | Using `_count` instead of full relations                  |
| 6   | LOW      | Hardcoded French strings (no i18n)                                           | Added next-intl translations (fr/en)                      |

### Files Modified

| File                                                                              | Changes                            |
| --------------------------------------------------------------------------------- | ---------------------------------- |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/[id]/page.tsx` | Server Component with Prisma fetch |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/orders/page.tsx`      | Server Component with Prisma fetch |
| `apps/web/modules/saas/orders/components/OrderDetailClient.tsx`                   | New client component with i18n     |
| `apps/web/modules/saas/orders/components/OrdersListClient.tsx`                    | New client component with i18n     |
| `apps/web/modules/saas/orders/components/index.ts`                                | Exports                            |
| `apps/web/modules/saas/orders/index.ts`                                           | Module export                      |
| `packages/i18n/translations/fr.json`                                              | Added orders translations          |
| `packages/i18n/translations/en.json`                                              | Added orders translations          |

### Verification

All issues have been addressed. The implementation now follows the project's established patterns:

- Server Components for initial data fetch (like quotes/[id]/page.tsx)
- Client Components for interactive UI (tabs, navigation)
- Proper i18n with next-intl
- Optimized queries using `_count` for KPIs

_Reviewer: Cascade AI on 2026-01-20_
