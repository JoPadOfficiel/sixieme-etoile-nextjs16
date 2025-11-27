-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedDriverId" TEXT,
ADD COLUMN     "assignedVehicleId" TEXT,
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- CreateIndex
CREATE INDEX "quote_assignedVehicleId_idx" ON "quote"("assignedVehicleId");

-- CreateIndex
CREATE INDEX "quote_assignedDriverId_idx" ON "quote"("assignedDriverId");

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
