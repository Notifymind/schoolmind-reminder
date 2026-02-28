CREATE TABLE "assignment_notification_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"preset_id" integer NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "balance_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"admin_id" text NOT NULL,
	"type" varchar(10) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"previous_balance" numeric(10, 2) NOT NULL,
	"new_balance" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ALTER COLUMN "exam_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_presets" ADD COLUMN "is_active_for_exams" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_presets" ADD COLUMN "is_active_for_assignments" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD COLUMN "assignment_id" integer;--> statement-breakpoint
ALTER TABLE "assignment_notification_meta" ADD CONSTRAINT "assignment_notification_meta_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_notification_meta" ADD CONSTRAINT "assignment_notification_meta_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_notification_meta" ADD CONSTRAINT "assignment_notification_meta_preset_id_notification_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."notification_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_history" ADD CONSTRAINT "balance_history_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_history" ADD CONSTRAINT "balance_history_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignment_notification_meta_assignmentId_idx" ON "assignment_notification_meta" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_notification_meta_userId_idx" ON "assignment_notification_meta" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "balance_history_sellerId_idx" ON "balance_history" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "balance_history_adminId_idx" ON "balance_history" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "balance_history_createdAt_idx" ON "balance_history" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_notifications_assignmentId_idx" ON "scheduled_notifications" USING btree ("assignment_id");