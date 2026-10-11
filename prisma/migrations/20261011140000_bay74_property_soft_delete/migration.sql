-- Preserve the property and all related history.
ALTER TABLE "Property" ADD COLUMN "deletedAt" TIMESTAMP(3);
