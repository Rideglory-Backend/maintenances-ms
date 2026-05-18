-- Add nextDate column (replaces dropped nextMaintenanceDate)
ALTER TABLE "Maintenance" ADD COLUMN IF NOT EXISTS "nextDate" TIMESTAMPTZ;
