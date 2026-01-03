-- CreateEnum
CREATE TYPE "StayServiceType" AS ENUM ('TRANSFER', 'DISPO', 'EXCURSION');

-- AlterEnum
ALTER TYPE "TripType" ADD VALUE 'STAY';

-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "stayEndDate" TIMESTAMP(3),
ADD COLUMN     "stayStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "stay_day" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hotelRequired" BOOLEAN NOT NULL DEFAULT false,
    "hotelCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mealCount" INTEGER NOT NULL DEFAULT 0,
    "mealCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "driverCount" INTEGER NOT NULL DEFAULT 1,
    "driverOvernightCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dayTotalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dayTotalInternalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stay_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stay_service" (
    "id" TEXT NOT NULL,
    "stayDayId" TEXT NOT NULL,
    "serviceOrder" INTEGER NOT NULL,
    "serviceType" "StayServiceType" NOT NULL,
    "pickupAt" TIMESTAMP(3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DECIMAL(10,7),
    "pickupLongitude" DECIMAL(10,7),
    "dropoffAddress" TEXT,
    "dropoffLatitude" DECIMAL(10,7),
    "dropoffLongitude" DECIMAL(10,7),
    "durationHours" DECIMAL(5,2),
    "stops" JSONB,
    "distanceKm" DECIMAL(10,2),
    "durationMinutes" INTEGER,
    "serviceCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceInternalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tripAnalysis" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stay_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stay_day_quoteId_idx" ON "stay_day"("quoteId");

-- CreateIndex
CREATE INDEX "stay_day_date_idx" ON "stay_day"("date");

-- CreateIndex
CREATE UNIQUE INDEX "stay_day_quoteId_dayNumber_key" ON "stay_day"("quoteId", "dayNumber");

-- CreateIndex
CREATE INDEX "stay_service_stayDayId_idx" ON "stay_service"("stayDayId");

-- CreateIndex
CREATE UNIQUE INDEX "stay_service_stayDayId_serviceOrder_key" ON "stay_service"("stayDayId", "serviceOrder");

-- CreateIndex
CREATE INDEX "quote_stayStartDate_idx" ON "quote"("stayStartDate");

-- AddForeignKey
ALTER TABLE "stay_day" ADD CONSTRAINT "stay_day_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stay_service" ADD CONSTRAINT "stay_service_stayDayId_fkey" FOREIGN KEY ("stayDayId") REFERENCES "stay_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;
