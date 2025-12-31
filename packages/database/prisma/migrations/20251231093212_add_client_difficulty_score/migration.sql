-- AlterTable
ALTER TABLE "contact" ADD COLUMN     "difficultyScore" INTEGER;

-- AlterTable
ALTER TABLE "organization_pricing_settings" ADD COLUMN     "difficultyMultipliers" JSONB;
