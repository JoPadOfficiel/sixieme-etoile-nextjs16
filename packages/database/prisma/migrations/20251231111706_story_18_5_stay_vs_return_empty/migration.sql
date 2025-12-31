-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "maxReturnEmptyDistanceKm" DECIMAL(10,2) DEFAULT 300.0,
ADD COLUMN     "minIdleDaysForComparison" INTEGER DEFAULT 1;
