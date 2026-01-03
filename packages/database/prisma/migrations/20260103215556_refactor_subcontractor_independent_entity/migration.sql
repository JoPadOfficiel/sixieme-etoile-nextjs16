/*
  Warnings:

  - You are about to drop the column `isSubcontractor` on the `contact` table. All the data in the column will be lost.
  - You are about to drop the column `contactId` on the `subcontractor_profile` table. All the data in the column will be lost.
  - Added the required column `companyName` to the `subcontractor_profile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subcontractor_profile" DROP CONSTRAINT "subcontractor_profile_contactId_fkey";

-- DropIndex
DROP INDEX "contact_isSubcontractor_idx";

-- DropIndex
DROP INDEX "subcontractor_profile_contactId_idx";

-- DropIndex
DROP INDEX "subcontractor_profile_contactId_key";

-- AlterTable
ALTER TABLE "contact" DROP COLUMN "isSubcontractor",
ADD COLUMN     "subcontractorProfileId" TEXT;

-- AlterTable
ALTER TABLE "subcontractor_profile" DROP COLUMN "contactId",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "allZones" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "companyName" VARCHAR(255) NOT NULL,
ADD COLUMN     "contactName" VARCHAR(255),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "phone" VARCHAR(50),
ADD COLUMN     "siret" VARCHAR(20),
ADD COLUMN     "vatNumber" VARCHAR(50);

-- CreateIndex
CREATE INDEX "subcontractor_profile_companyName_idx" ON "subcontractor_profile"("companyName");

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_subcontractorProfileId_fkey" FOREIGN KEY ("subcontractorProfileId") REFERENCES "subcontractor_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
