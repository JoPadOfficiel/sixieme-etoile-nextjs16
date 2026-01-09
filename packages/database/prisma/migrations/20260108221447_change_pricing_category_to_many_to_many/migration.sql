/*
  Warnings:

  - You are about to drop the column `vehicleCategoryId` on the `advanced_rate` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleCategoryId` on the `optional_fee` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleCategoryId` on the `promotion` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleCategoryId` on the `seasonal_multiplier` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "advanced_rate" DROP CONSTRAINT "advanced_rate_vehicleCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "optional_fee" DROP CONSTRAINT "optional_fee_vehicleCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "promotion" DROP CONSTRAINT "promotion_vehicleCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "seasonal_multiplier" DROP CONSTRAINT "seasonal_multiplier_vehicleCategoryId_fkey";

-- DropIndex
DROP INDEX "advanced_rate_vehicleCategoryId_idx";

-- DropIndex
DROP INDEX "optional_fee_vehicleCategoryId_idx";

-- DropIndex
DROP INDEX "promotion_vehicleCategoryId_idx";

-- DropIndex
DROP INDEX "seasonal_multiplier_vehicleCategoryId_idx";

-- AlterTable
ALTER TABLE "advanced_rate" DROP COLUMN "vehicleCategoryId";

-- AlterTable
ALTER TABLE "optional_fee" DROP COLUMN "vehicleCategoryId";

-- AlterTable
ALTER TABLE "promotion" DROP COLUMN "vehicleCategoryId";

-- AlterTable
ALTER TABLE "seasonal_multiplier" DROP COLUMN "vehicleCategoryId";

-- CreateTable
CREATE TABLE "_AdvancedRateToVehicleCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdvancedRateToVehicleCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SeasonalMultiplierToVehicleCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SeasonalMultiplierToVehicleCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_OptionalFeeToVehicleCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_OptionalFeeToVehicleCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PromotionToVehicleCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PromotionToVehicleCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AdvancedRateToVehicleCategory_B_index" ON "_AdvancedRateToVehicleCategory"("B");

-- CreateIndex
CREATE INDEX "_SeasonalMultiplierToVehicleCategory_B_index" ON "_SeasonalMultiplierToVehicleCategory"("B");

-- CreateIndex
CREATE INDEX "_OptionalFeeToVehicleCategory_B_index" ON "_OptionalFeeToVehicleCategory"("B");

-- CreateIndex
CREATE INDEX "_PromotionToVehicleCategory_B_index" ON "_PromotionToVehicleCategory"("B");

-- AddForeignKey
ALTER TABLE "_AdvancedRateToVehicleCategory" ADD CONSTRAINT "_AdvancedRateToVehicleCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "advanced_rate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvancedRateToVehicleCategory" ADD CONSTRAINT "_AdvancedRateToVehicleCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeasonalMultiplierToVehicleCategory" ADD CONSTRAINT "_SeasonalMultiplierToVehicleCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "seasonal_multiplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeasonalMultiplierToVehicleCategory" ADD CONSTRAINT "_SeasonalMultiplierToVehicleCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OptionalFeeToVehicleCategory" ADD CONSTRAINT "_OptionalFeeToVehicleCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "optional_fee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OptionalFeeToVehicleCategory" ADD CONSTRAINT "_OptionalFeeToVehicleCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromotionToVehicleCategory" ADD CONSTRAINT "_PromotionToVehicleCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromotionToVehicleCategory" ADD CONSTRAINT "_PromotionToVehicleCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
