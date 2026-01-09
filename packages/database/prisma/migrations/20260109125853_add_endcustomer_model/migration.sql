-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "endCustomerId" TEXT;

-- CreateTable
CREATE TABLE "end_customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "difficultyScore" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "end_customer_organizationId_idx" ON "end_customer"("organizationId");

-- CreateIndex
CREATE INDEX "end_customer_contactId_idx" ON "end_customer"("contactId");

-- CreateIndex
CREATE INDEX "quote_endCustomerId_idx" ON "quote"("endCustomerId");

-- AddForeignKey
ALTER TABLE "end_customer" ADD CONSTRAINT "end_customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_customer" ADD CONSTRAINT "end_customer_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_endCustomerId_fkey" FOREIGN KEY ("endCustomerId") REFERENCES "end_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
