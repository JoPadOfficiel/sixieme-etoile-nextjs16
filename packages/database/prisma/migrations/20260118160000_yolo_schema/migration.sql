-- Story 26.1: Database Schema Update for Hybrid Blocks & Mission Model
-- Migration: yolo_schema
-- Date: 2026-01-18

-- CreateEnum "QuoteLineType"
CREATE TYPE "QuoteLineType" AS ENUM ('CALCULATED', 'MANUAL', 'GROUP');

-- CreateEnum "MissionStatus"
CREATE TYPE "MissionStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable "quote_line"
CREATE TABLE "quote_line" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" "QuoteLineType" NOT NULL DEFAULT 'CALCULATED',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sourceData" JSONB,
    "displayData" JSONB NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "parent_id" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable "mission"
CREATE TABLE "mission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "quoteLineId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "status" "MissionStatus" NOT NULL DEFAULT 'PENDING',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "sourceData" JSONB,
    "executionData" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mission_pkey" PRIMARY KEY ("id")
);

-- AlterTable "invoice_line" - Add Hybrid Blocks columns
ALTER TABLE "invoice_line" ADD COLUMN "blockType" "QuoteLineType" NOT NULL DEFAULT 'CALCULATED';
ALTER TABLE "invoice_line" ADD COLUMN "sourceData" JSONB;
ALTER TABLE "invoice_line" ADD COLUMN "displayData" JSONB;
ALTER TABLE "invoice_line" ADD COLUMN "parent_id" TEXT;

-- CreateIndex for quote_line
CREATE INDEX "quote_line_quoteId_idx" ON "quote_line"("quoteId");
CREATE INDEX "quote_line_parent_id_idx" ON "quote_line"("parent_id");
CREATE INDEX "quote_line_sortOrder_idx" ON "quote_line"("sortOrder");

-- CreateIndex for mission
CREATE INDEX "mission_organizationId_idx" ON "mission"("organizationId");
CREATE INDEX "mission_quoteId_idx" ON "mission"("quoteId");
CREATE INDEX "mission_quoteLineId_idx" ON "mission"("quoteLineId");
CREATE INDEX "mission_driverId_idx" ON "mission"("driverId");
CREATE INDEX "mission_vehicleId_idx" ON "mission"("vehicleId");
CREATE INDEX "mission_status_idx" ON "mission"("status");
CREATE INDEX "mission_startAt_idx" ON "mission"("startAt");

-- CreateIndex for invoice_line parent_id
CREATE INDEX "invoice_line_parent_id_idx" ON "invoice_line"("parent_id");

-- AddForeignKey for quote_line
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "quote_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for mission
ALTER TABLE "mission" ADD CONSTRAINT "mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mission" ADD CONSTRAINT "mission_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mission" ADD CONSTRAINT "mission_quoteLineId_fkey" FOREIGN KEY ("quoteLineId") REFERENCES "quote_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mission" ADD CONSTRAINT "mission_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mission" ADD CONSTRAINT "mission_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for invoice_line parent_id
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "invoice_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;
