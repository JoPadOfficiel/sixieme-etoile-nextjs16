-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "autoSwitchRoundTripToMAD" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxReturnDistanceKm" DECIMAL(10,2),
ADD COLUMN     "minWaitingTimeForSeparateTransfers" INTEGER DEFAULT 180,
ADD COLUMN     "roundTripBuffer" INTEGER DEFAULT 30;
