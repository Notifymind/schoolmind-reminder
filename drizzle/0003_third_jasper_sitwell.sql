CREATE TABLE "codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(11) NOT NULL,
	"type" varchar(20) NOT NULL,
	"duration" varchar(20) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"seller_id" text NOT NULL,
	"redeemed_by" text,
	"redeemed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "balance" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "max_debt" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_redeemed_by_user_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codes_sellerId_idx" ON "codes" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "codes_code_idx" ON "codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "codes_redeemedBy_idx" ON "codes" USING btree ("redeemed_by");