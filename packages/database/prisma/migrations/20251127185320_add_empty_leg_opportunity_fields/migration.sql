-- AlterTable
ALTER TABLE "empty_leg_opportunity" ADD COLUMN     "estimatedDistanceKm" DECIMAL(8,2),
ADD COLUMN     "estimatedDurationMins" INTEGER,
ADD COLUMN     "fromAddress" TEXT,
ADD COLUMN     "fromLatitude" DECIMAL(10,7),
ADD COLUMN     "fromLongitude" DECIMAL(10,7),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sourceMissionId" TEXT,
ADD COLUMN     "toAddress" TEXT,
ADD COLUMN     "toLatitude" DECIMAL(10,7),
ADD COLUMN     "toLongitude" DECIMAL(10,7);

-- CreateIndex
CREATE INDEX "empty_leg_opportunity_isActive_idx" ON "empty_leg_opportunity"("isActive");
