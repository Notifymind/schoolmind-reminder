DELETE FROM "codes" WHERE "type" = 'trial';--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "last_trial";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "last_trial_code_generated";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "max_trial_codes";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "trial_codes_generated";
