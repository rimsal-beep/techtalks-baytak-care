/*
  Warnings:

  - Added the required column `requestType` to the `MaintenanceRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `caretakerName` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "estimatedCost" DECIMAL(65,30),
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "requestType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "caretakerName" TEXT NOT NULL,
ADD COLUMN     "ownerName" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "MaintenanceRequestStatus",
    "newStatus" "MaintenanceRequestStatus",
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maintenanceRequestId" TEXT NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
