-- AlterTable
ALTER TABLE "quote" ADD COLUMN     "durationHours" DECIMAL(5,2),
ADD COLUMN     "isRoundTrip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxKilometers" DECIMAL(8,2),
ADD COLUMN     "returnDate" TIMESTAMP(3),
ADD COLUMN     "stops" JSONB,
ALTER COLUMN "dropoffAddress" DROP NOT NULL;
