-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('HOLIDAY', 'SICK', 'PERSONAL', 'TRAINING', 'OTHER');

-- CreateTable
CREATE TABLE "driver_calendar_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "eventType" "CalendarEventType" NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_calendar_event_organizationId_idx" ON "driver_calendar_event"("organizationId");

-- CreateIndex
CREATE INDEX "driver_calendar_event_driverId_idx" ON "driver_calendar_event"("driverId");

-- CreateIndex
CREATE INDEX "driver_calendar_event_startAt_endAt_idx" ON "driver_calendar_event"("startAt", "endAt");

-- AddForeignKey
ALTER TABLE "driver_calendar_event" ADD CONSTRAINT "driver_calendar_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_calendar_event" ADD CONSTRAINT "driver_calendar_event_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
