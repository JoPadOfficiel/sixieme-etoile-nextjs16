-- CreateEnum
CREATE TYPE "ZoneMultiplierAggregationStrategy" AS ENUM ('MAX', 'PICKUP_ONLY', 'DROPOFF_ONLY', 'AVERAGE');

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "zoneMultiplierAggregationStrategy" "ZoneMultiplierAggregationStrategy";
