-- CreateEnum
CREATE TYPE "SubcontractorAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- AlterTable
ALTER TABLE "subcontractor_profile" ADD COLUMN     "availabilityNotes" TEXT,
ADD COLUMN     "availabilityStatus" "SubcontractorAvailability" NOT NULL DEFAULT 'AVAILABLE';
