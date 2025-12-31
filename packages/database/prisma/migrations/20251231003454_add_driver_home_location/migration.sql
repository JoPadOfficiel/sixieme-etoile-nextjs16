-- AlterTable
ALTER TABLE "driver" ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "homeLat" DECIMAL(10,7),
ADD COLUMN     "homeLng" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "useDriverHomeForDeadhead" BOOLEAN NOT NULL DEFAULT false;
