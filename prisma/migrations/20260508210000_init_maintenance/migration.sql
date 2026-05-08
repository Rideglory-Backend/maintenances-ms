-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'PREVENTIVE');

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "nextMaintenanceDate" TIMESTAMP(3),
    "maintanceMileage" INTEGER NOT NULL,
    "receiveAlert" BOOLEAN NOT NULL,
    "receiveMileageAlert" BOOLEAN NOT NULL DEFAULT false,
    "receiveDateAlert" BOOLEAN NOT NULL DEFAULT false,
    "nextMaintenanceMileage" INTEGER,
    "cost" DOUBLE PRECISION,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);
