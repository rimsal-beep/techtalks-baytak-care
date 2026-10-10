/*
  Warnings:

  - A unique constraint covering the columns `[caretakerId]` on the table `Property` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Property_caretakerId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Property_caretakerId_key" ON "Property"("caretakerId");
