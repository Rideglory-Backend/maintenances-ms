-- Add odometerAtService column (replaces dropped maintanceMileage)
ALTER TABLE "Maintenance" ADD COLUMN IF NOT EXISTS "odometerAtService" INTEGER;
