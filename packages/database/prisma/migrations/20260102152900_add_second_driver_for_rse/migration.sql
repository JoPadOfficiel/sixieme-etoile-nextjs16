-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "secondDriverId" TEXT;

-- CreateIndex
CREATE INDEX "quote_secondDriverId_idx" ON "quote"("secondDriverId");

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_secondDriverId_fkey" FOREIGN KEY ("secondDriverId") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
