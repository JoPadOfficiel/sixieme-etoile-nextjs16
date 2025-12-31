-- AlterTable
ALTER TABLE "excursion_package" ADD COLUMN     "destinationDescription" TEXT,
ADD COLUMN     "destinationName" TEXT,
ADD COLUMN     "isTemporalVector" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumDurationHours" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "excursion_package_origin_zone" (
    "id" TEXT NOT NULL,
    "excursionPackageId" TEXT NOT NULL,
    "pricingZoneId" TEXT NOT NULL,

    CONSTRAINT "excursion_package_origin_zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "excursion_package_origin_zone_excursionPackageId_pricingZon_key" ON "excursion_package_origin_zone"("excursionPackageId", "pricingZoneId");

-- CreateIndex
CREATE INDEX "excursion_package_isTemporalVector_idx" ON "excursion_package"("isTemporalVector");

-- AddForeignKey
ALTER TABLE "excursion_package_origin_zone" ADD CONSTRAINT "excursion_package_origin_zone_excursionPackageId_fkey" FOREIGN KEY ("excursionPackageId") REFERENCES "excursion_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "excursion_package_origin_zone" ADD CONSTRAINT "excursion_package_origin_zone_pricingZoneId_fkey" FOREIGN KEY ("pricingZoneId") REFERENCES "pricing_zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
