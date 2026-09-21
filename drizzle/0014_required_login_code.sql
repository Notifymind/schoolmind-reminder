ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE "two_factor" (
  "id" text PRIMARY KEY NOT NULL,
  "secret" text NOT NULL,
  "backup_codes" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor" ("user_id");
