-- Story 4.7: Add configurable profitability thresholds to OrganizationPricingSettings
-- These thresholds determine when a quote is classified as green/orange/red

-- Add greenMarginThreshold column with default 20%
ALTER TABLE "organization_pricing_settings" ADD COLUMN "greenMarginThreshold" DECIMAL(5,2) NOT NULL DEFAULT 20.00;

-- Add orangeMarginThreshold column with default 0%
ALTER TABLE "organization_pricing_settings" ADD COLUMN "orangeMarginThreshold" DECIMAL(5,2) NOT NULL DEFAULT 0.00;
