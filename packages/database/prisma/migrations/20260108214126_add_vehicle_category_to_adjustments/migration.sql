-- AlterTable
ALTER TABLE "advanced_rate" ADD COLUMN     "vehicleCategoryId" TEXT;

-- AlterTable
ALTER TABLE "optional_fee" ADD COLUMN     "vehicleCategoryId" TEXT;

-- AlterTable
ALTER TABLE "promotion" ADD COLUMN     "vehicleCategoryId" TEXT;

-- AlterTable
ALTER TABLE "seasonal_multiplier" ADD COLUMN     "vehicleCategoryId" TEXT;

-- CreateIndex
CREATE INDEX "advanced_rate_vehicleCategoryId_idx" ON "advanced_rate"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "optional_fee_vehicleCategoryId_idx" ON "optional_fee"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "promotion_vehicleCategoryId_idx" ON "promotion"("vehicleCategoryId");

-- CreateIndex
CREATE INDEX "seasonal_multiplier_vehicleCategoryId_idx" ON "seasonal_multiplier"("vehicleCategoryId");

-- AddForeignKey
ALTER TABLE "advanced_rate" ADD CONSTRAINT "advanced_rate_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasonal_multiplier" ADD CONSTRAINT "seasonal_multiplier_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optional_fee" ADD CONSTRAINT "optional_fee_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion" ADD CONSTRAINT "promotion_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
