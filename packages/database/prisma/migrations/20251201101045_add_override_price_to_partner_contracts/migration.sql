/*
  Warnings:

  - The values [LONG_DISTANCE,ZONE_SCENARIO,HOLIDAY] on the enum `AdvancedRateAppliesTo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdvancedRateAppliesTo_new" AS ENUM ('NIGHT', 'WEEKEND');
ALTER TABLE "advanced_rate" ALTER COLUMN "appliesTo" TYPE "AdvancedRateAppliesTo_new" USING ("appliesTo"::text::"AdvancedRateAppliesTo_new");
ALTER TYPE "AdvancedRateAppliesTo" RENAME TO "AdvancedRateAppliesTo_old";
ALTER TYPE "AdvancedRateAppliesTo_new" RENAME TO "AdvancedRateAppliesTo";
DROP TYPE "AdvancedRateAppliesTo_old";
COMMIT;

-- AlterTable
ALTER TABLE "partner_contract_dispo_package" ADD COLUMN     "overridePrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "partner_contract_excursion_package" ADD COLUMN     "overridePrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "partner_contract_zone_route" ADD COLUMN     "overridePrice" DECIMAL(10,2);
