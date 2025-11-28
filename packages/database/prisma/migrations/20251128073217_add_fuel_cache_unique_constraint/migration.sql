/*
  Warnings:

  - A unique constraint covering the columns `[countryCode,fuelType]` on the table `fuel_price_cache` will be added. If there are existing duplicate values, this will fail.

*/

-- First, delete duplicate entries keeping only the most recent one per (countryCode, fuelType)
DELETE FROM fuel_price_cache
WHERE id NOT IN (
  SELECT DISTINCT ON ("countryCode", "fuelType") id
  FROM fuel_price_cache
  ORDER BY "countryCode", "fuelType", "fetchedAt" DESC
);

-- DropIndex
DROP INDEX IF EXISTS "fuel_price_cache_countryCode_fuelType_idx";

-- CreateIndex
CREATE UNIQUE INDEX "fuel_price_cache_countryCode_fuelType_key" ON "fuel_price_cache"("countryCode", "fuelType");
