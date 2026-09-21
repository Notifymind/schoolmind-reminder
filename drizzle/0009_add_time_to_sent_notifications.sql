-- Add time field to sent_notifications to support per-minute scheduling
-- This allows multiple notifications on the same day at different times

ALTER TABLE "sent_notifications" ADD COLUMN "time" VARCHAR(5);

-- Backfill existing records with a default time (won't affect future notifications)
UPDATE "sent_notifications" SET "time" = '09:00' WHERE "time" IS NULL;

-- Make the column non-null after backfill
ALTER TABLE "sent_notifications" ALTER COLUMN "time" SET NOT NULL;

-- Add index for the new query pattern
CREATE INDEX "sent_notifications_time_idx" ON "sent_notifications" ("time");
