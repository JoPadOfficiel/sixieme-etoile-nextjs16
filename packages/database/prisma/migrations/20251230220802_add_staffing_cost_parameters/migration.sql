-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "driverOvernightPremium" DECIMAL(8,2),
ADD COLUMN     "hotelCostPerNight" DECIMAL(8,2),
ADD COLUMN     "mealCostPerDay" DECIMAL(8,2),
ADD COLUMN     "relayDriverFixedFee" DECIMAL(8,2),
ADD COLUMN     "secondDriverHourlyRate" DECIMAL(8,2);
