-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "costBreakdown" JSONB;

-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "costBreakdown" JSONB;

-- AlterTable
ALTER TABLE "vehicle_category" ADD COLUMN     "averageConsumptionL100km" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "toll_cache" (
    "id" TEXT NOT NULL,
    "originHash" TEXT NOT NULL,
    "destinationHash" TEXT NOT NULL,
    "tollAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "source" TEXT NOT NULL DEFAULT 'GOOGLE_API',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toll_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "toll_cache_expiresAt_idx" ON "toll_cache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "toll_cache_originHash_destinationHash_key" ON "toll_cache"("originHash", "destinationHash");
