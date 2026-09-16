/*
  Warnings:

  - The values [PENDING] on the enum `MaintenanceRequestStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `performedBy` on the `ActivityLog` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `MaintenanceRequest` table. All the data in the column will be lost.
  - You are about to alter the column `estimatedCost` on the `MaintenanceRequest` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - You are about to drop the column `caretakerName` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `ownerName` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `propertyId` on the `User` table. All the data in the column will be lost.
  - Added the required column `performedById` to the `ActivityLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportedById` to the `MaintenanceRequest` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `requestType` on the `MaintenanceRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `ownerId` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'APPLIANCE', 'PAINTING', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'LBP');

-- AlterEnum
BEGIN;
CREATE TYPE "MaintenanceRequestStatus_new" AS ENUM ('REPORTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED');
ALTER TABLE "public"."MaintenanceRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "status" TYPE "MaintenanceRequestStatus_new" USING ("status"::text::"MaintenanceRequestStatus_new");
ALTER TABLE "ActivityLog" ALTER COLUMN "previousStatus" TYPE "MaintenanceRequestStatus_new" USING ("previousStatus"::text::"MaintenanceRequestStatus_new");
ALTER TABLE "ActivityLog" ALTER COLUMN "newStatus" TYPE "MaintenanceRequestStatus_new" USING ("newStatus"::text::"MaintenanceRequestStatus_new");
ALTER TYPE "MaintenanceRequestStatus" RENAME TO "MaintenanceRequestStatus_old";
ALTER TYPE "MaintenanceRequestStatus_new" RENAME TO "MaintenanceRequestStatus";
DROP TYPE "public"."MaintenanceRequestStatus_old";
ALTER TABLE "MaintenanceRequest" ALTER COLUMN "status" SET DEFAULT 'REPORTED';
COMMIT;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_propertyId_fkey";

-- AlterTable
ALTER TABLE "ActivityLog" DROP COLUMN "performedBy",
ADD COLUMN     "performedById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MaintenanceRequest" DROP COLUMN "photoUrl",
ADD COLUMN     "actualCost" DECIMAL(10,2),
ADD COLUMN     "afterPhotoUrls" TEXT[],
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "beforePhotoUrls" TEXT[],
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "contractorContact" TEXT,
ADD COLUMN     "contractorName" TEXT,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "estimateNote" TEXT,
ADD COLUMN     "issuePhotoUrls" TEXT[],
ADD COLUMN     "priority" "RequestPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "reportedById" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'REPORTED',
ALTER COLUMN "estimatedCost" SET DATA TYPE DECIMAL(10,2),
DROP COLUMN "requestType",
ADD COLUMN     "requestType" "MaintenanceType" NOT NULL;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "caretakerName",
DROP COLUMN "ownerName",
ADD COLUMN     "caretakerId" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "propertyId",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "propertyId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_propertyId_idx" ON "Invitation"("propertyId");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "ActivityLog_maintenanceRequestId_idx" ON "ActivityLog"("maintenanceRequestId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceRequest_status_idx" ON "MaintenanceRequest"("status");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_caretakerId_idx" ON "Property"("caretakerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
