-- Migration: maintenance_mode_workshop_fields
-- Adds MaintenanceMode enum, mode column, serviceDate, workshop, nextOdometer.
-- Backfills data from existing isScheduled/date/nextMaintenanceMileage columns.
-- NOTE: isScheduled, date, maintanceMileage columns are KEPT for backward compat.

-- Step 1: Create MaintenanceMode enum type
CREATE TYPE "MaintenanceMode" AS ENUM ('COMPLETED', 'SCHEDULED');

-- Step 2: Add new columns
ALTER TABLE "Maintenance"
  ADD COLUMN IF NOT EXISTS "mode"         "MaintenanceMode" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "serviceDate"  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "workshop"     TEXT,
  ADD COLUMN IF NOT EXISTS "nextOdometer" INTEGER;

-- Step 3: Backfill mode from isScheduled
UPDATE "Maintenance"
  SET "mode" = CASE
    WHEN "isScheduled" = true THEN 'SCHEDULED'::"MaintenanceMode"
    ELSE 'COMPLETED'::"MaintenanceMode"
  END;

-- Step 4: Backfill serviceDate from date for completed records
UPDATE "Maintenance"
  SET "serviceDate" = "date"
  WHERE "mode" = 'COMPLETED';

-- Step 5: Backfill nextOdometer from nextMaintenanceMileage (already absolute in legacy data)
UPDATE "Maintenance"
  SET "nextOdometer" = "nextMaintenanceMileage"
  WHERE "nextMaintenanceMileage" IS NOT NULL;
