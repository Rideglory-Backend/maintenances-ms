-- Drop legacy columns no longer used
ALTER TABLE "Maintenance" DROP COLUMN IF EXISTS "date";
ALTER TABLE "Maintenance" DROP COLUMN IF EXISTS "maintanceMileage";
ALTER TABLE "Maintenance" DROP COLUMN IF EXISTS "isScheduled";
ALTER TABLE "Maintenance" DROP COLUMN IF EXISTS "nextMaintenanceDate";
ALTER TABLE "Maintenance" DROP COLUMN IF EXISTS "nextMaintenanceMileage";
