-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "chainId" TEXT,
ADD COLUMN     "chainOrder" INTEGER,
ADD COLUMN     "chainedWithId" TEXT;

-- CreateIndex
CREATE INDEX "quote_chainId_idx" ON "quote"("chainId");

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_chainedWithId_fkey" FOREIGN KEY ("chainedWithId") REFERENCES "quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
