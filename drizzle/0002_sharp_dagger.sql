CREATE TABLE "exam_notification_meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"preset_id" integer NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_one_time" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"preset_id" integer NOT NULL,
	"days_before" integer NOT NULL,
	"time" varchar(5) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"exam_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"notification_time_id" integer NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" varchar(50) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "exam_notification_meta" ADD CONSTRAINT "exam_notification_meta_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notification_meta" ADD CONSTRAINT "exam_notification_meta_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_notification_meta" ADD CONSTRAINT "exam_notification_meta_preset_id_notification_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."notification_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_presets" ADD CONSTRAINT "notification_presets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_times" ADD CONSTRAINT "notification_times_preset_id_notification_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."notification_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_notification_time_id_notification_times_id_fk" FOREIGN KEY ("notification_time_id") REFERENCES "public"."notification_times"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_notification_meta_examId_idx" ON "exam_notification_meta" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_notification_meta_userId_idx" ON "exam_notification_meta" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_presets_userId_idx" ON "notification_presets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_times_presetId_idx" ON "notification_times" USING btree ("preset_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_examId_idx" ON "scheduled_notifications" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_userId_idx" ON "scheduled_notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scheduled_notifications_scheduledFor_idx" ON "scheduled_notifications" USING btree ("scheduled_for");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "plan";--> statement-breakpoint
DROP TYPE "public"."plan";