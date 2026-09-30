-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_maintenanceRequestId_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" ALTER COLUMN "maintenanceRequestId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_maintenanceRequestId_fkey" FOREIGN KEY ("maintenanceRequestId") REFERENCES "MaintenanceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
