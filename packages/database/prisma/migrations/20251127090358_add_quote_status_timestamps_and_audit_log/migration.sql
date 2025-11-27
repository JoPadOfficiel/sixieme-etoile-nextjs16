-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "quote_status_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "previousStatus" "QuoteStatus" NOT NULL,
    "newStatus" "QuoteStatus" NOT NULL,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "quote_status_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_status_audit_log_organizationId_idx" ON "quote_status_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "quote_status_audit_log_quoteId_idx" ON "quote_status_audit_log"("quoteId");

-- CreateIndex
CREATE INDEX "quote_status_audit_log_timestamp_idx" ON "quote_status_audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "quote_status_audit_log" ADD CONSTRAINT "quote_status_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_status_audit_log" ADD CONSTRAINT "quote_status_audit_log_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
