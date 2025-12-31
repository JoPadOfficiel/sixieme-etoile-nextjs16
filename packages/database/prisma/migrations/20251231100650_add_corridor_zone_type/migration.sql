-- AlterEnum
ALTER TYPE "ZoneType" ADD VALUE 'CORRIDOR';

-- AlterTable
ALTER TABLE "pricing_zone" ADD COLUMN     "corridorBufferMeters" INTEGER,
ADD COLUMN     "corridorPolyline" TEXT;
