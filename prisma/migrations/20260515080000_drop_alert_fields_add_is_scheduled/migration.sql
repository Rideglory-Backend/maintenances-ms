-- AlterTable
ALTER TABLE "Maintenance"
  DROP COLUMN "receiveAlert",
  DROP COLUMN "receiveMileageAlert",
  DROP COLUMN "receiveDateAlert",
  ADD COLUMN "isScheduled" BOOLEAN NOT NULL DEFAULT false;
