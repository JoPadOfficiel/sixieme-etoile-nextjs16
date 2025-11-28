-- AlterTable
ALTER TABLE "organization_integration_settings" ADD COLUMN     "collectApiStatus" TEXT,
ADD COLUMN     "collectApiTestedAt" TIMESTAMP(3),
ADD COLUMN     "googleMapsStatus" TEXT,
ADD COLUMN     "googleMapsTestedAt" TIMESTAMP(3),
ADD COLUMN     "preferredFuelType" TEXT DEFAULT 'DIESEL';
