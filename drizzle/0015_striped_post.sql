-- Add time field to sent_notifications to support per-minute scheduling
-- Step 1: Add nullable column first
ALTER TABLE "sent_notifications" ADD COLUMN "time" varchar(5);

-- Step 2: Backfill existing records with a default time (won't affect future notifications)
UPDATE "sent_notifications" SET "time" = '09:00' WHERE "time" IS NULL;

-- Step 3: Make the column non-null after backfill
ALTER TABLE "sent_notifications" ALTER COLUMN "time" SET NOT NULL;

-- Step 4: Add index for the new query pattern
CREATE INDEX "sent_notifications_time_idx" ON "sent_notifications" USING btree ("time");
