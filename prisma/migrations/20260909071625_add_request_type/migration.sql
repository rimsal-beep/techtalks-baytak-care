/*
  Warnings:

  - Added the required column `requestType` to the `MaintenanceRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MaintenanceRequest" ADD COLUMN     "requestType" TEXT NOT NULL;
