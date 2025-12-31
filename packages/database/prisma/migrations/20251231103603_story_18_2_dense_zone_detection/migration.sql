-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "autoSwitchToMAD" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "denseZoneCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "denseZoneSpeedThreshold" DECIMAL(5,2);
