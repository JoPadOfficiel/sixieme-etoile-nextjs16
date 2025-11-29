-- AlterTable
ALTER TABLE "pricing_zone" ADD COLUMN     "multiplierDescription" TEXT,
ADD COLUMN     "priceMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0;
