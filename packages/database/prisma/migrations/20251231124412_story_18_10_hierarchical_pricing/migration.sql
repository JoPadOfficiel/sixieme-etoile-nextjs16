-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "hierarchicalPricingConfig" JSONB;

-- AlterTable
ALTER TABLE "pricing_zone" ADD COLUMN     "isCentralZone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "intra_central_flat_rate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pricingSettingsId" TEXT NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,
    "flatRate" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intra_central_flat_rate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intra_central_flat_rate_pricingSettingsId_idx" ON "intra_central_flat_rate"("pricingSettingsId");

-- CreateIndex
CREATE INDEX "intra_central_flat_rate_vehicleCategoryId_idx" ON "intra_central_flat_rate"("vehicleCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "intra_central_flat_rate_pricingSettingsId_vehicleCategoryId_key" ON "intra_central_flat_rate"("pricingSettingsId", "vehicleCategoryId");

-- AddForeignKey
ALTER TABLE "intra_central_flat_rate" ADD CONSTRAINT "intra_central_flat_rate_pricingSettingsId_fkey" FOREIGN KEY ("pricingSettingsId") REFERENCES "organization_pricing_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intra_central_flat_rate" ADD CONSTRAINT "intra_central_flat_rate_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
