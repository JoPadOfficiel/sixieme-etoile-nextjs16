-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "isSubcontractor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "isSubcontracted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subcontractedAt" TIMESTAMP(3),
ADD COLUMN     "subcontractedPrice" DECIMAL(10,2),
ADD COLUMN     "subcontractingNotes" TEXT,
ADD COLUMN     "subcontractorId" TEXT;

-- CreateTable
CREATE TABLE "subcontractor_profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ratePerKm" DECIMAL(8,2),
    "ratePerHour" DECIMAL(8,2),
    "minimumFare" DECIMAL(8,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_zone" (
    "id" TEXT NOT NULL,
    "subcontractorProfileId" TEXT NOT NULL,
    "pricingZoneId" TEXT NOT NULL,

    CONSTRAINT "subcontractor_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_vehicle_category" (
    "id" TEXT NOT NULL,
    "subcontractorProfileId" TEXT NOT NULL,
    "vehicleCategoryId" TEXT NOT NULL,

    CONSTRAINT "subcontractor_vehicle_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_profile_contactId_key" ON "subcontractor_profile"("contactId");

-- CreateIndex
CREATE INDEX "subcontractor_profile_organizationId_idx" ON "subcontractor_profile"("organizationId");

-- CreateIndex
CREATE INDEX "subcontractor_profile_contactId_idx" ON "subcontractor_profile"("contactId");

-- CreateIndex
CREATE INDEX "subcontractor_profile_isActive_idx" ON "subcontractor_profile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_zone_subcontractorProfileId_pricingZoneId_key" ON "subcontractor_zone"("subcontractorProfileId", "pricingZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "subcontractor_vehicle_category_subcontractorProfileId_vehic_key" ON "subcontractor_vehicle_category"("subcontractorProfileId", "vehicleCategoryId");

-- CreateIndex
CREATE INDEX "contact_isSubcontractor_idx" ON "contact"("isSubcontractor");

-- CreateIndex
CREATE INDEX "quote_isSubcontracted_idx" ON "quote"("isSubcontracted");

-- CreateIndex
CREATE INDEX "quote_subcontractorId_idx" ON "quote"("subcontractorId");

-- AddForeignKey
ALTER TABLE "subcontractor_profile" ADD CONSTRAINT "subcontractor_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_profile" ADD CONSTRAINT "subcontractor_profile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_zone" ADD CONSTRAINT "subcontractor_zone_subcontractorProfileId_fkey" FOREIGN KEY ("subcontractorProfileId") REFERENCES "subcontractor_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_zone" ADD CONSTRAINT "subcontractor_zone_pricingZoneId_fkey" FOREIGN KEY ("pricingZoneId") REFERENCES "pricing_zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_vehicle_category" ADD CONSTRAINT "subcontractor_vehicle_category_subcontractorProfileId_fkey" FOREIGN KEY ("subcontractorProfileId") REFERENCES "subcontractor_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_vehicle_category" ADD CONSTRAINT "subcontractor_vehicle_category_vehicleCategoryId_fkey" FOREIGN KEY ("vehicleCategoryId") REFERENCES "vehicle_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractor_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
