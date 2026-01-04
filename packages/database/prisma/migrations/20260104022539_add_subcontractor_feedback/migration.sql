-- CreateTable
CREATE TABLE "subcontractor_feedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subcontractorProfileId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "punctuality" INTEGER,
    "vehicleCondition" INTEGER,
    "driverProfessionalism" INTEGER,
    "communication" INTEGER,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "subcontractor_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subcontractor_feedback_organizationId_idx" ON "subcontractor_feedback"("organizationId");

-- CreateIndex
CREATE INDEX "subcontractor_feedback_subcontractorProfileId_idx" ON "subcontractor_feedback"("subcontractorProfileId");

-- CreateIndex
CREATE INDEX "subcontractor_feedback_quoteId_idx" ON "subcontractor_feedback"("quoteId");

-- AddForeignKey
ALTER TABLE "subcontractor_feedback" ADD CONSTRAINT "subcontractor_feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_feedback" ADD CONSTRAINT "subcontractor_feedback_subcontractorProfileId_fkey" FOREIGN KEY ("subcontractorProfileId") REFERENCES "subcontractor_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_feedback" ADD CONSTRAINT "subcontractor_feedback_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
