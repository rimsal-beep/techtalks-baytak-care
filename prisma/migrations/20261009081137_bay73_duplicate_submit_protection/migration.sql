
BEGIN;

-- 1. Add the columns as nullable first.
ALTER TABLE "ChecklistItem"
ADD COLUMN "monthKey" TEXT;

ALTER TABLE "MaintenanceRequest"
ADD COLUMN "idempotencyKey" TEXT;

-- 2. Backfill existing checklist rows.
UPDATE "ChecklistItem"
SET "monthKey" = TO_CHAR(
  COALESCE("completedAt", "createdAt"),
  'YYYY-MM'
)
WHERE "monthKey" IS NULL;

-- 3. Give existing requests unique legacy keys.
UPDATE "MaintenanceRequest"
SET "idempotencyKey" = 'legacy-' || "id"
WHERE "idempotencyKey" IS NULL;

-- 4. Normalize invitation emails.
UPDATE "Invitation"
SET "email" = LOWER("email")
WHERE "email" <> LOWER("email");

-- 5. Keep only the newest pending invitation for each
-- property and normalized email before creating the index.
WITH ranked_pending_invitations AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "propertyId", "email"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_num
  FROM "Invitation"
  WHERE "status" = 'PENDING'
)
DELETE FROM "Invitation" AS invitation
USING ranked_pending_invitations AS ranked
WHERE invitation."id" = ranked."id"
  AND ranked.row_num > 1;

-- 6. Make the new fields required.
ALTER TABLE "ChecklistItem"
ALTER COLUMN "monthKey" SET NOT NULL;

ALTER TABLE "MaintenanceRequest"
ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- 7. Enforce one checklist row per property/item/month.
CREATE UNIQUE INDEX "ChecklistItem_propertyId_text_monthKey_key"
ON "ChecklistItem" ("propertyId", "text", "monthKey");

-- 8. Enforce one pending invitation per property/email.
CREATE UNIQUE INDEX "Invitation_one_pending_per_property_email_key"
ON "Invitation" ("propertyId", "email")
WHERE "status" = 'PENDING';

-- 9. Enforce one request per creator/idempotency key.
CREATE UNIQUE INDEX "MaintenanceRequest_reportedById_idempotencyKey_key"
ON "MaintenanceRequest" ("reportedById", "idempotencyKey");

COMMIT;
