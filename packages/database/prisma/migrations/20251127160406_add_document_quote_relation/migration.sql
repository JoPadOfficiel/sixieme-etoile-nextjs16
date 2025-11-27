-- AlterTable
ALTER TABLE "document" ADD COLUMN     "filename" TEXT;

-- CreateIndex
CREATE INDEX "document_quoteId_idx" ON "document"("quoteId");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
