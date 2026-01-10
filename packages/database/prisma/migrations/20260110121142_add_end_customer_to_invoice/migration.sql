-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "endCustomerId" TEXT;

-- CreateIndex
CREATE INDEX "invoice_endCustomerId_idx" ON "invoice"("endCustomerId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "end_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
