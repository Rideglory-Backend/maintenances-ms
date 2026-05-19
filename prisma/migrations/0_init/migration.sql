-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'BRAKE_CHECK', 'TIRE_CHANGE', 'PREVENTIVE', 'AIR_FILTER', 'CHAIN_SPROCKET', 'ELECTRICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceMode" AS ENUM ('COMPLETED', 'SCHEDULED');

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "mode" "MaintenanceMode" NOT NULL DEFAULT 'COMPLETED',
    "serviceDate" TIMESTAMP(3),
    "odometerAtService" INTEGER,
    "workshop" TEXT,
    "notes" TEXT,
    "nextDate" TIMESTAMP(3),
    "nextOdometer" INTEGER,
    "cost" DOUBLE PRECISION,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

