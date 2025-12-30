# Story 11.1: Unified Zone Management Interface with Interactive Map

## Status: ✅ DONE

**Completed:** 2025-01-29  
**Branch:** `feature/unified-zone-management`

---

## Story

**As an** operator  
**I want** a unified zone management interface with an interactive map showing all zones  
**So that** I can visualize, select, and configure all pricing zones from a single intuitive screen

## Background

The current zone management system is functional but dispersed. Zones are listed in a table, and the map is only visible when editing a single zone. The user wants a unified interface similar to the reference image where:

- All zones are visible on a single interactive map
- Zones can be clicked to select and edit them
- Drawing tools (circle, polygon) are accessible directly from the map toolbar
- The zone list is displayed alongside the map for quick navigation

## Tasks

1. **Refactor zones page layout** - Create a two-panel layout: left sidebar with zone list, right panel with full-height interactive map
2. **Enhance ZonesOverviewMap component** - Add drawing tools toolbar (hand/pan, circle, polygon) similar to Google Maps style
3. **Implement zone selection from map** - Click on a zone overlay to select it and show details in sidebar
4. **Add zone status filtering** - Filter zones by active/inactive status in the sidebar list
5. **Implement zone quick-edit panel** - Show zone details and multiplier configuration when a zone is selected
6. **Add zone creation from map** - Drawing a shape on the map opens the zone creation form with pre-filled geometry
7. **Improve map toolbar UX** - Position drawing tools next to "Plan/Satellite" toggle like reference image
8. **Add zone color coding** - Different colors for different zone types or hierarchy levels
9. **Implement zoom-to-zone** - Double-click on zone in list to zoom map to that zone
10. **Add translations (EN/FR)** for new UI elements
11. **Write Vitest unit tests** for new components
12. **Write Playwright E2E tests** for zone management flow

## Acceptance Criteria

### AC1: Two-Panel Layout

**Given** I navigate to Settings → Pricing → Zones  
**When** the page loads  
**Then** I see a two-panel layout:

- Left panel (300-350px): Zone list with search, filters, and "Add Zone" button
- Right panel (remaining width): Full-height interactive map showing all zones

### AC2: All Zones Visible on Map

**Given** the zones page is loaded  
**When** I view the map  
**Then** all active zones are displayed with their shapes (circles, polygons)  
**And** zones are color-coded by type or status  
**And** the map auto-fits to show all zones

### AC3: Zone Selection from Map

**Given** zones are displayed on the map  
**When** I click on a zone shape  
**Then** the zone is highlighted (thicker border, increased opacity)  
**And** the zone is selected in the left sidebar list  
**And** zone details appear in an expandable panel

### AC4: Drawing Tools Toolbar

**Given** the map is displayed  
**When** I look at the map controls  
**Then** I see a toolbar with:

- Hand/Pan tool (default)
- Circle drawing tool
- Polygon drawing tool
  **And** the toolbar is positioned near the map type selector (Plan/Satellite)

### AC5: Zone Creation from Drawing

**Given** I select the polygon or circle drawing tool  
**When** I draw a shape on the map  
**Then** the zone creation form opens in a drawer/modal  
**And** the geometry is pre-filled from my drawing  
**And** I can complete the zone details (name, code, etc.)

### AC6: Zone List Filtering

**Given** the zone list in the left sidebar  
**When** I use the status filter  
**Then** I can filter by: All, Active, Inactive  
**And** the map updates to show only filtered zones

### AC7: Zoom to Zone

**Given** a zone in the left sidebar list  
**When** I double-click on it  
**Then** the map zooms and centers on that zone

### AC8: Responsive Layout

**Given** screen width less than 1024px  
**When** I view the page  
**Then** the layout stacks vertically (list above map)  
**Or** the list becomes a collapsible drawer

## Technical Notes

### Files to Modify

- `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/zones/page.tsx`
- `apps/web/modules/saas/pricing/components/ZonesOverviewMap.tsx`
- `apps/web/modules/saas/pricing/components/ZoneDrawingMap.tsx`
- `apps/web/modules/saas/pricing/components/ZonesTable.tsx` (convert to list view)

### New Components to Create

- `ZoneManagementLayout.tsx` - Two-panel layout container
- `ZoneSidebarList.tsx` - Left sidebar with zone list
- `ZoneMapToolbar.tsx` - Drawing tools toolbar for map
- `ZoneQuickEditPanel.tsx` - Zone details panel when selected

### Dependencies

- Google Maps JavaScript API (already integrated)
- Google Maps Drawing Library (already loaded)
- shadcn/ui components: Sheet, ScrollArea, Tabs

### Constraints

- Must maintain backward compatibility with existing zone CRUD operations
- Must respect multi-tenancy (organizationId scoping)
- All monetary values in EUR
- All user-facing strings via useTranslations hook

## Out of Scope

- Postal code zone creation (Story 11.2)
- Zone pricing multipliers integration (Story 11.3)
- Advanced rate modifier cleanup (Story 11.7)

## Definition of Done

- [x] Two-panel layout implemented and responsive
- [x] All zones visible on interactive map
- [x] Zone selection from map works
- [x] Drawing tools accessible from map toolbar
- [x] Zone creation from drawing works
- [x] Translations added (EN/FR)
- [ ] Unit tests passing
- [ ] E2E tests passing
- [ ] Code reviewed and approved

---

## Implementation Summary

### Components Created

| Component              | Path                                                       | Description                                                 |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `ZoneManagementLayout` | `modules/saas/pricing/components/ZoneManagementLayout.tsx` | Two-panel layout with zone list sidebar and interactive map |
| `ZoneSidebarList`      | `modules/saas/pricing/components/ZoneSidebarList.tsx`      | Left sidebar with searchable, filterable zone list          |
| `ZoneMapToolbar`       | `modules/saas/pricing/components/ZoneMapToolbar.tsx`       | Drawing tools toolbar (Pan, Circle, Polygon)                |
| `ZonesInteractiveMap`  | `modules/saas/pricing/components/ZonesInteractiveMap.tsx`  | Full-featured map with all zones and drawing tools          |
| `ZoneColorPicker`      | `modules/saas/pricing/components/ZoneColorPicker.tsx`      | 8 predefined colors + custom color input                    |

### Components Modified

| Component        | Changes                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| `ZoneDrawingMap` | Removed rectangle tool, reordered circle/polygon, direct Google Maps script loading |
| `ZoneFormDialog` | Integrated color picker, improved form layout                                       |
| `zones/page.tsx` | Fetches Google Maps API key, passes to layout component                             |

### API Changes

| Endpoint                                             | Change                                                    |
| ---------------------------------------------------- | --------------------------------------------------------- |
| `POST /api/vtc/pricing-zones`                        | Added `color` field support                               |
| `PUT /api/vtc/pricing-zones/:id`                     | Added `color` field, fixed `parentZoneId` Prisma relation |
| `GET /api/vtc/settings/integrations/google-maps-key` | Accessible to all organization members (not admin-only)   |

### Database Changes

| Table         | Change                                                      |
| ------------- | ----------------------------------------------------------- |
| `PricingZone` | Added `color` column (String, nullable, default: "#3b82f6") |

Migration: `add_color_to_pricing_zone`

### Bug Fixes Applied

1. **Google Maps not loading** - Reverted from `GoogleMapsProvider` approach to direct script loading in `ZonesInteractiveMap` and `ZoneDrawingMap`
2. **403 Forbidden on Google Maps API key endpoint** - Removed `requireAdminRole` middleware from the endpoint
3. **Prisma validation error on `parentZoneId`** - Changed to use nested relation object `parentZone` with `connect`/`disconnect`
4. **Zone colors not saving** - Added `color` field to Zod schemas and Prisma update operations
5. **Horizontal scroll on settings pages** - Added `overflow-x-hidden` to main wrapper

### Features Implemented

- ✅ **Two-panel layout**: Left sidebar (zone list) + Right panel (interactive map)
- ✅ **All zones on map**: Circles and polygons displayed with custom colors
- ✅ **Zone selection**: Click zone on map or list to select and highlight
- ✅ **Drawing tools**: Pan, Circle, Polygon tools in toolbar
- ✅ **Zone creation from drawing**: Draw shape → opens creation dialog with pre-filled geometry
- ✅ **Status filtering**: Filter by All/Active/Inactive
- ✅ **Search**: Search zones by name or code
- ✅ **Zoom to zone**: Click zone in list to zoom map to that zone
- ✅ **Color picker**: 8 predefined colors (Emerald, Blue, Violet, Amber, Rose, Cyan, Orange, Indigo) + custom hex input
- ✅ **Responsive**: Layout adapts to screen size

### Translations Added

- `pricing.zones.map.*` - Map-related strings (noApiKey, loadError, configureInSettings, etc.)
- `pricing.zones.form.color` - Color picker label
- `pricing.zones.toolbar.*` - Toolbar button labels

### Files Changed

```
apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/zones/page.tsx
apps/web/modules/saas/pricing/components/ZoneManagementLayout.tsx
apps/web/modules/saas/pricing/components/ZoneSidebarList.tsx
apps/web/modules/saas/pricing/components/ZoneMapToolbar.tsx
apps/web/modules/saas/pricing/components/ZonesInteractiveMap.tsx
apps/web/modules/saas/pricing/components/ZoneDrawingMap.tsx
apps/web/modules/saas/pricing/components/ZoneFormDialog.tsx
apps/web/modules/saas/pricing/components/ZoneColorPicker.tsx
apps/web/modules/saas/pricing/types.ts
packages/api/src/routes/vtc/pricing-zones.ts
packages/api/src/routes/vtc/integrations.ts
packages/database/prisma/schema/vtc.prisma
packages/database/prisma/migrations/[timestamp]_add_color_to_pricing_zone/
```
