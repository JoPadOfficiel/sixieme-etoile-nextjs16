-- CreateTable
CREATE TABLE "driver_rse_counter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "regulatoryCategory" "VehicleRegulatoryCategory" NOT NULL,
    "licenseCategoryId" TEXT,
    "drivingMinutes" INTEGER NOT NULL DEFAULT 0,
    "amplitudeMinutes" INTEGER NOT NULL DEFAULT 0,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "restMinutes" INTEGER NOT NULL DEFAULT 0,
    "workStartTime" TIMESTAMP(3),
    "workEndTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_rse_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT,
    "missionId" TEXT,
    "vehicleCategoryId" TEXT,
    "regulatoryCategory" "VehicleRegulatoryCategory" NOT NULL,
    "decision" TEXT NOT NULL,
    "violations" JSONB,
    "warnings" JSONB,
    "reason" TEXT NOT NULL,
    "countersSnapshot" JSONB,

    CONSTRAINT "compliance_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_rse_counter_organizationId_idx" ON "driver_rse_counter"("organizationId");

-- CreateIndex
CREATE INDEX "driver_rse_counter_driverId_idx" ON "driver_rse_counter"("driverId");

-- CreateIndex
CREATE INDEX "driver_rse_counter_date_idx" ON "driver_rse_counter"("date");

-- CreateIndex
CREATE UNIQUE INDEX "driver_rse_counter_organizationId_driverId_date_regulatoryC_key" ON "driver_rse_counter"("organizationId", "driverId", "date", "regulatoryCategory");

-- CreateIndex
CREATE INDEX "compliance_audit_log_organizationId_idx" ON "compliance_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "compliance_audit_log_driverId_idx" ON "compliance_audit_log"("driverId");

-- CreateIndex
CREATE INDEX "compliance_audit_log_timestamp_idx" ON "compliance_audit_log"("timestamp");

-- AddForeignKey
ALTER TABLE "driver_rse_counter" ADD CONSTRAINT "driver_rse_counter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_rse_counter" ADD CONSTRAINT "driver_rse_counter_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_rse_counter" ADD CONSTRAINT "driver_rse_counter_licenseCategoryId_fkey" FOREIGN KEY ("licenseCategoryId") REFERENCES "license_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_audit_log" ADD CONSTRAINT "compliance_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_audit_log" ADD CONSTRAINT "compliance_audit_log_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
