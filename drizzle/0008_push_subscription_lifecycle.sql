-- Keep the most recent registration before enforcing one owner per endpoint.
DELETE FROM "push_subscriptions" older
USING "push_subscriptions" newer
WHERE older."endpoint" = newer."endpoint"
  AND (older."created_at", older."id") < (newer."created_at", newer."id");
--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint");
--> statement-breakpoint
CREATE TABLE "push_deliveries" (
  "id" text PRIMARY KEY NOT NULL,
  "subscription_id" text NOT NULL REFERENCES "push_subscriptions"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "payload" text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "push_deliveries_due_idx" ON "push_deliveries" ("next_attempt_at");
