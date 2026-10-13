-- Allow invitations to be declined.
ALTER TYPE "InvitationStatus" ADD VALUE 'DECLINED';

-- Allow one caretaker to manage multiple properties.
DROP INDEX "Property_caretakerId_key";

-- Keep caretaker property lookups efficient.
CREATE INDEX "Property_caretakerId_idx" ON "Property"("caretakerId");