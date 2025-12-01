-- CreateEnum
CREATE TYPE "OriginDestinationType" AS ENUM ('ZONES', 'ADDRESS');

-- DropForeignKey
ALTER TABLE "zone_route" DROP CONSTRAINT "zone_route_fromZoneId_fkey";

-- DropForeignKey
ALTER TABLE "zone_route" DROP CONSTRAINT "zone_route_toZoneId_fkey";

-- AlterTable
ALTER TABLE "zone_route" ADD COLUMN     "destAddress" TEXT,
ADD COLUMN     "destLat" DOUBLE PRECISION,
ADD COLUMN     "destLng" DOUBLE PRECISION,
ADD COLUMN     "destPlaceId" TEXT,
ADD COLUMN     "destinationType" "OriginDestinationType" NOT NULL DEFAULT 'ZONES',
ADD COLUMN     "originAddress" TEXT,
ADD COLUMN     "originLat" DOUBLE PRECISION,
ADD COLUMN     "originLng" DOUBLE PRECISION,
ADD COLUMN     "originPlaceId" TEXT,
ADD COLUMN     "originType" "OriginDestinationType" NOT NULL DEFAULT 'ZONES',
ALTER COLUMN "fromZoneId" DROP NOT NULL,
ALTER COLUMN "toZoneId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "zone_route_origin_zone" (
    "id" TEXT NOT NULL,
    "zoneRouteId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "pricingZoneId" TEXT,

    CONSTRAINT "zone_route_origin_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_route_destination_zone" (
    "id" TEXT NOT NULL,
    "zoneRouteId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "pricingZoneId" TEXT,

    CONSTRAINT "zone_route_destination_zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zone_route_origin_zone_zoneRouteId_idx" ON "zone_route_origin_zone"("zoneRouteId");

-- CreateIndex
CREATE INDEX "zone_route_origin_zone_zoneId_idx" ON "zone_route_origin_zone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "zone_route_origin_zone_zoneRouteId_zoneId_key" ON "zone_route_origin_zone"("zoneRouteId", "zoneId");

-- CreateIndex
CREATE INDEX "zone_route_destination_zone_zoneRouteId_idx" ON "zone_route_destination_zone"("zoneRouteId");

-- CreateIndex
CREATE INDEX "zone_route_destination_zone_zoneId_idx" ON "zone_route_destination_zone"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "zone_route_destination_zone_zoneRouteId_zoneId_key" ON "zone_route_destination_zone"("zoneRouteId", "zoneId");

-- CreateIndex
CREATE INDEX "zone_route_originType_idx" ON "zone_route"("originType");

-- CreateIndex
CREATE INDEX "zone_route_destinationType_idx" ON "zone_route"("destinationType");

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_fromZoneId_fkey" FOREIGN KEY ("fromZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route" ADD CONSTRAINT "zone_route_toZoneId_fkey" FOREIGN KEY ("toZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_origin_zone" ADD CONSTRAINT "zone_route_origin_zone_zoneRouteId_fkey" FOREIGN KEY ("zoneRouteId") REFERENCES "zone_route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_origin_zone" ADD CONSTRAINT "zone_route_origin_zone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "pricing_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_origin_zone" ADD CONSTRAINT "zone_route_origin_zone_pricingZoneId_fkey" FOREIGN KEY ("pricingZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_destination_zone" ADD CONSTRAINT "zone_route_destination_zone_zoneRouteId_fkey" FOREIGN KEY ("zoneRouteId") REFERENCES "zone_route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_destination_zone" ADD CONSTRAINT "zone_route_destination_zone_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "pricing_zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_route_destination_zone" ADD CONSTRAINT "zone_route_destination_zone_pricingZoneId_fkey" FOREIGN KEY ("pricingZoneId") REFERENCES "pricing_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
