-- Enable SHA-256 hashing in PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Preserve existing invitations by hashing their tokens
ALTER TABLE "Invitation"
RENAME COLUMN "token" TO "tokenHash";

UPDATE "Invitation"
SET "tokenHash" = encode(
  digest("tokenHash", 'sha256'),
  'hex'
);

-- Add invitation tracking fields
ALTER TABLE "Invitation"
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "emailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastEmailAt" TIMESTAMP(3),
ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- Rename existing unique index
ALTER INDEX "Invitation_token_key"
RENAME TO "Invitation_tokenHash_key";

-- Add lookup index
CREATE INDEX "Invitation_email_status_idx"
ON "Invitation"("email", "status");