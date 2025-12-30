-- CreateEnum
CREATE TYPE "TimeBucketInterpolationStrategy" AS ENUM ('ROUND_UP', 'ROUND_DOWN', 'PROPORTIONAL');

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "timeBucketInterpolationStrategy" "TimeBucketInterpolationStrategy";

-- CreateTable
CREATE TABLE "mad_time_bucket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pricingSettingsId" TEXT NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mad_time_bucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mad_time_bucket_pricingSettingsId_idx" ON "mad_time_bucket"("pricingSettingsId");

-- CreateIndex
CREATE INDEX "mad_time_bucket_vehicleCategoryId_idx" ON "mad_time_bucket"("vehicleCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "mad_time_bucket_pricingSettingsId_durationHours_vehicleCate_key" ON "mad_time_bucket"("pricingSettingsId", "durationHours", "vehicleCategoryId");

-- AddForeignKey
ALTER TABLE "mad_time_bucket" ADD CONSTRAINT "mad_time_bucket_pricingSettingsId_fkey" FOREIGN KEY ("pricingSettingsId") REFERENCES "organization_pricing_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mad_time_bucket" ADD CONSTRAINT "mad_time_bucket_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
