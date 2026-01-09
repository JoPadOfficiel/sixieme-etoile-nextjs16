# Release Notes - Epic 23: Critical Bug Fixes & Vehicle Category Pricing Filters

## Overview
This release addresses several critical UI bugs that were blocking pricing configuration and quote creation. It also introduces a major enhancement to the pricing engine: **Vehicle Category Filtering for Pricing Adjustments**.

## New Feature: Vehicle Category Filtering
You can now configure pricing adjustments (Advanced Rates, Seasonal Multipliers, Optional Fees, and Promotions) to apply only to specific vehicle categories.

### Key Capabilities:
- **All Categories (Default):** The adjustment applies to every ride regardless of the vehicle type.
- **Single Category:** Target a specific vehicle type (e.g., a special "Airport Transfer" surcharge only for Berlines).
- **Multiple Categories:** Select a specific group of vehicle categories (e.g., a "VIP Service" fee applicable only to Van VIP and Berline VIP).

### Impact:
- **Quote Catalog:** When adding an optional fee or promotion to a quote, the catalog will automatically filter and show only the items applicable to the selected vehicle category.
- **Automatic Calculation:** The pricing engine automatically filters applicable advanced rates and seasonal multipliers based on the quote's vehicle.

## Critical Bug Fixes
We have resolved the following blocking issues:
- **Dialog Freezes:** Fixed an issue where the application would become unresponsive after closing pricing adjustment dialogs.
- **MultiZone Selector:** Clicks are now correctly registered when selecting zones in Excursion and Route forms.
- **Loading States:** Fixed "infinite loading" spinners on the Routes, Excursions, and Disposals setup pages.
- **Positioning Costs:** Approach and Empty Return costs are now correctly displayed in the Quote Trip Transparency panel, including a helper message when no vehicle is yet assigned.

---
*Date: January 9, 2026*
