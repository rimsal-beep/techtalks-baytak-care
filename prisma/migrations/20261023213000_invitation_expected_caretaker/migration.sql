-- Record the caretaker assigned when an invitation is created.
-- Used to prevent stale invitations from replacing a newer caretaker.
ALTER TABLE "Invitation"
ADD COLUMN "expectedCaretakerId" TEXT;
