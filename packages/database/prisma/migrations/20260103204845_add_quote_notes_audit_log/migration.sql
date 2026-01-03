-- AlterTable
ALTER TABLE "toll_cache" ADD COLUMN     "encodedPolyline" TEXT;

-- CreateTable
CREATE TABLE "quote_notes_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "previousNotes" TEXT,
    "newNotes" TEXT,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_notes_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quote_notes_audit_log_organizationId_idx" ON "quote_notes_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "quote_notes_audit_log_quoteId_idx" ON "quote_notes_audit_log"("quoteId");

-- CreateIndex
CREATE INDEX "quote_notes_audit_log_timestamp_idx" ON "quote_notes_audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "quote_notes_audit_log" ADD CONSTRAINT "quote_notes_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_notes_audit_log" ADD CONSTRAINT "quote_notes_audit_log_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
