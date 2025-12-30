-- CreateEnum
CREATE TYPE "ZoneConflictStrategy" AS ENUM ('PRIORITY', 'MOST_EXPENSIVE', 'CLOSEST', 'COMBINED');

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "zoneConflictStrategy" "ZoneConflictStrategy";

-- AlterTable
ALTER TABLE "pricing_zone" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;
