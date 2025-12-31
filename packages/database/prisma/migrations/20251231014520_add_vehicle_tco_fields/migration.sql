-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('LINEAR', 'DECLINING_BALANCE');

-- AlterTable
ALTER TABLE "vehicle" ADD COLUMN     "annualInsuranceCost" DECIMAL(10,2),
ADD COLUMN     "annualMaintenanceBudget" DECIMAL(10,2),
ADD COLUMN     "currentOdometerKm" INTEGER,
ADD COLUMN     "depreciationMethod" "DepreciationMethod",
ADD COLUMN     "expectedLifespanKm" INTEGER,
ADD COLUMN     "expectedLifespanYears" INTEGER,
ADD COLUMN     "purchasePrice" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "vehicle_category" ADD COLUMN     "defaultAnnualInsuranceCost" DECIMAL(10,2),
ADD COLUMN     "defaultAnnualMaintenanceBudget" DECIMAL(10,2),
ADD COLUMN     "defaultDepreciationMethod" "DepreciationMethod",
ADD COLUMN     "defaultExpectedLifespanKm" INTEGER,
ADD COLUMN     "defaultExpectedLifespanYears" INTEGER,
ADD COLUMN     "defaultPurchasePrice" DECIMAL(12,2);
