-- AlterTable
ALTER TABLE "pricing_zone" ADD COLUMN     "fixedAccessFee" DECIMAL(10,2),
ADD COLUMN     "fixedParkingSurcharge" DECIMAL(10,2),
ADD COLUMN     "surchargeDescription" TEXT;
