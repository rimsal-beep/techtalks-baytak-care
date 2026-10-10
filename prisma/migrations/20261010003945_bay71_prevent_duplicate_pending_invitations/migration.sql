-- Keep only the newest pending invitation for each property/email.
-- Older duplicates are revoked, not deleted.
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "propertyId", lower("email")
           ORDER BY "createdAt" DESC, "id" DESC
         ) AS rn
  FROM "Invitation"
  WHERE "status" = 'PENDING'
)
UPDATE "Invitation"
SET "status" = 'REVOKED',
    "revokedAt" = NOW()
WHERE "id" IN (
  SELECT "id" FROM ranked WHERE rn > 1
);

-- Prevent concurrent duplicate pending invitations.
CREATE UNIQUE INDEX "Invitation_one_pending_per_property_email"
ON "Invitation" ("propertyId", lower("email"))
WHERE "status" = 'PENDING';
