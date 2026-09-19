ALTER TABLE "user" ADD COLUMN "wallet_balance" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_plan" varchar(20);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_auto_renew" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "wallet_balance_nonnegative" CHECK ("wallet_balance" >= 0);
--> statement-breakpoint
ALTER TABLE "codes" ADD COLUMN "seller_cost" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
-- Preserve original seller cost for refunds. Admin codes were issued for free.
UPDATE "codes" SET "seller_cost" = CASE WHEN EXISTS (
  SELECT 1 FROM "user" WHERE "user"."id" = "codes"."seller_id"
  AND 'admin' = ANY(string_to_array("user"."role", ','))
) THEN 0 ELSE "value" END;
--> statement-breakpoint
-- Unused Pro codes retain their advertised plan's purchasing power.
UPDATE "codes" SET "type" = 'balance', "value" = CASE
  WHEN "duration" = 'month' THEN 3 WHEN "duration" = 'school_year' THEN 24 END,
  "duration" = 'once'
WHERE "type" = 'pro' AND "duration" IN ('month', 'school_year')
  AND "was_redeemed_at" IS NULL AND "redeemed_at" IS NULL AND "redeemed_by" IS NULL;
