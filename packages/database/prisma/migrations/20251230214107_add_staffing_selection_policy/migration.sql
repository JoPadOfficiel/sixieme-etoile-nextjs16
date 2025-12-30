-- CreateEnum
CREATE TYPE "StaffingSelectionPolicy" AS ENUM ('CHEAPEST', 'FASTEST', 'PREFER_INTERNAL');

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "staffingSelectionPolicy" "StaffingSelectionPolicy";
