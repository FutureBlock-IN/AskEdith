-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"badge_icon" varchar(50),
	"badge_color" varchar(50),
	"criteria" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewee_id" text NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_public" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"client_id" text,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"scheduled_at_timezone" text DEFAULT 'UTC' NOT NULL,
	"duration" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" integer NOT NULL,
	"platform_fee" integer NOT NULL,
	"expert_earnings" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_connect_account_id" text,
	"meeting_link" text,
	"cancelled_at" timestamp,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"start_date_time" timestamp NOT NULL,
	"end_date_time" timestamp NOT NULL,
	"reason" text,
	"is_all_day" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurrence_rule" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"calendar_id" text,
	"calendar_name" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"sync_errors" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"slug" varchar(100) NOT NULL,
	"color" varchar(50) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"post_count" integer DEFAULT 0,
	"parent_id" integer,
	"level" integer DEFAULT 0,
	"order_index" integer DEFAULT 0,
	"is_official" boolean DEFAULT false,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"post_id" integer NOT NULL,
	"parent_id" integer,
	"helpful_votes" integer DEFAULT 0,
	"is_expert_response" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"rate" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"stripe_payment_intent_id" varchar,
	"payment_status" varchar(20) DEFAULT 'pending',
	"booking_status" varchar(20) DEFAULT 'scheduled',
	"meeting_link" varchar,
	"notes" text,
	"cancelled_at" timestamp,
	"cancelled_by" varchar,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" varchar(50) NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"embed_code" text,
	"website_url" varchar(500),
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"expert_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expert_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"profession" varchar(100),
	"expertise_area" varchar,
	"credentials" text,
	"professional_title" varchar,
	"company" varchar,
	"company_address" text,
	"company_website" varchar,
	"company_email" varchar,
	"website" varchar,
	"linkedin_url" varchar,
	"blog_url" varchar,
	"books_url" varchar,
	"articles_url" varchar,
	"profile_image_url" varchar,
	"license_file_url" varchar,
	"bio" text,
	"years_experience" integer,
	"license_number" varchar,
	"stripe_payment_intent_id" varchar,
	"verification_fee_status" varchar(20) DEFAULT 'pending',
	"verification_fee_paid_at" timestamp,
	"verification_status" varchar(20) DEFAULT 'pending',
	"verified_at" timestamp,
	"verified_by" varchar,
	"featured_expert" boolean DEFAULT false,
	"consultation_rate" integer,
	"consultation_enabled" boolean DEFAULT false,
	"availability_schedule" text,
	"stripe_connect_account_id" varchar,
	"hourly_rate" integer DEFAULT 10000,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moderation_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" varchar NOT NULL,
	"content_type" varchar NOT NULL,
	"moderation_score" real NOT NULL,
	"flagged_categories" text[],
	"moderation_status" varchar DEFAULT 'approved' NOT NULL,
	"ai_response" text,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"appointment_reminders" boolean DEFAULT true,
	"reminder_time_minutes" integer DEFAULT 60,
	"booking_confirmations" boolean DEFAULT true,
	"cancellation_notifications" boolean DEFAULT true,
	"phone_number" text,
	"timezone" text DEFAULT 'America/New_York',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_title" varchar,
	"source_url" varchar,
	"publication_date" timestamp,
	"publisher" varchar,
	"isbn" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"category_id" integer NOT NULL,
	"helpful_votes" integer DEFAULT 0,
	"comment_count" integer DEFAULT 0,
	"is_resolved" boolean DEFAULT false,
	"is_sticky" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qa_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"qa_id" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" text,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qa_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100),
	"keywords" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"answer" text NOT NULL,
	"user_id" text,
	"source" text DEFAULT 'landing' NOT NULL,
	"result_found" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_phrases" (
	"id" serial PRIMARY KEY NOT NULL,
	"phrase" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_media_embeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"embed_code" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorite_content_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_source_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_favorite_content_sources_user_id_content_source_id_unique" UNIQUE("user_id","content_source_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorite_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"post_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_favorite_posts_user_id_post_id_unique" UNIQUE("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"community_name" varchar,
	"profile_image_url" varchar,
	"default_profile_type" varchar DEFAULT 'daisy',
	"city" varchar,
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"state" varchar,
	"timezone" varchar(100) DEFAULT 'UTC',
	"introduction" text,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"is_premium" boolean DEFAULT false,
	"email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"post_id" integer,
	"comment_id" integer,
	"vote_type" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "qa_embeddings" ADD CONSTRAINT "qa_embeddings_qa_id_qa_knowledge_id_fk" FOREIGN KEY ("qa_id") REFERENCES "public"."qa_knowledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint


CREATE INDEX IF NOT EXISTS "qa_embeddings_embedding_idx" ON "qa_embeddings" USING btree ("embedding");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qa_embeddings_qa_id_idx" ON "qa_embeddings" USING btree ("qa_id");--> statement-breakpoint
