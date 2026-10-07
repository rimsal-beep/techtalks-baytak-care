-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "propertyId" TEXT;

-- CreateIndex
CREATE INDEX "ActivityLog_propertyId_idx" ON "ActivityLog"("propertyId");

-- AddForeignKey
ALTER TABLE "ActivityLog"
ADD CONSTRAINT "ActivityLog_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
