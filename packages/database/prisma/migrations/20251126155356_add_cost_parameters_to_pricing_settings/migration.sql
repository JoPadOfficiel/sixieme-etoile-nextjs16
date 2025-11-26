-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "driverHourlyCost" DECIMAL(8,2),
ADD COLUMN     "fuelConsumptionL100km" DECIMAL(5,2),
ADD COLUMN     "fuelPricePerLiter" DECIMAL(5,2),
ADD COLUMN     "tollCostPerKm" DECIMAL(5,4),
ADD COLUMN     "wearCostPerKm" DECIMAL(5,4);
