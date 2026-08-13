CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seasons_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX "uniq_active_application";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "match_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "season_id" integer;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "season_id" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_active_season_application" ON "applications" USING btree ("phone","season_id","type") WHERE season_id is not null and status in ('otp_verified','awaiting_review','approved','awaiting_payment','paid','checked_in');--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_season_type" ON "inventory" USING btree ("season_id","type") WHERE season_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_active_application" ON "applications" USING btree ("phone","match_id","type") WHERE match_id is not null and status in ('otp_verified','awaiting_review','approved','awaiting_payment','paid','checked_in');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "application_scope" CHECK ((match_id is not null) <> (season_id is not null));--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_scope" CHECK ((match_id is not null) <> (season_id is not null));